import { Elysia } from "elysia";
import { headers as nextHeaders } from "next/headers";
import { auth } from "@/lib/auth";
import { type AuditUserSnapshot } from "@/lib/server/audit";

type AuditedRequest = Request & {
  _auditStartedAt?: number;
  _auditRequestId?: string;
  _auditUser?: AuditUserSnapshot | null;
  _domainAuditLogged?: boolean;
};

function numericStatus(status: number | string | undefined): number {
  if (typeof status === "number") return status;
  if (typeof status === "string") {
    const parsed = Number.parseInt(status, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 200;
}

export const authPlugin = new Elysia({ name: "auth" })
  .derive({ as: "global" }, async ({ request }) => {
    const requestHeaders = new Headers(request.headers);

    if (!requestHeaders.has("cookie")) {
      let cookie: string | null = null;
      try {
        cookie = (await nextHeaders()).get("cookie");
      } catch {
        cookie = null;
      }
      if (cookie) requestHeaders.set("cookie", cookie);
    }

    const session = await auth.api.getSession({
      headers: requestHeaders,
    });
    (request as AuditedRequest)._auditUser = session?.user ?? null;

    return {
      session: session?.session ?? null,
      user: session?.user ?? null,
    };
  });

export const authMacros = new Elysia({ name: "auth-macros" })
  .use(authPlugin)
  .macro({
    requireAuth: {
      resolve({ user, status }) {
        if (!user) {
          return status(401, { ok: false, message: "กรุณาเข้าสู่ระบบ" });
        }
        return { user };
      },
    },
    requireRole: (role: "admin" | "agent" | Array<"admin" | "agent">) => ({
      resolve({ user, status }) {
        if (!user) {
          return status(401, { ok: false, message: "กรุณาเข้าสู่ระบบ" });
        }
        const allowed = Array.isArray(role) ? role : [role];
        const userRole = (
          (user as { role?: string }).role ?? "member"
        ).toLowerCase();
        if (!allowed.includes(userRole as "admin" | "agent")) {
          return status(403, {
            ok: false,
            message: "คุณไม่มีสิทธิ์เข้าถึง endpoint นี้",
          });
        }
        return { user };
      },
    }),
  });

/* ─────────────────────────────────────────────
 * 3) LOGGER PLUGIN — log ทุก request พร้อม duration
 * ───────────────────────────────────────────── */

export const loggerPlugin = new Elysia({ name: "logger" })
  .onRequest(({ request }) => {
    const auditedRequest = request as AuditedRequest;
    auditedRequest._auditStartedAt = Date.now();
    auditedRequest._auditRequestId =
      request.headers.get("x-request-id") || crypto.randomUUID();
  })
  .onAfterResponse(({ request, set }) => {
    const auditedRequest = request as AuditedRequest;
    const start = auditedRequest._auditStartedAt ?? Date.now();
    const ms = Date.now() - start;
    const url = new URL(request.url);
    const status = numericStatus(set.status);

    console.log(
      `[${new Date().toISOString()}] ${request.method} ${url.pathname} → ${status} (${ms}ms)`
    );
  });

export const errorPlugin = new Elysia({ name: "error" })
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 422;
      return {
        ok: false,
        code: "VALIDATION",
        message: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
        issues: (error as unknown as { all?: unknown[] }).all ?? [],
      };
    }
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { ok: false, code: "NOT_FOUND", message: "ไม่พบ endpoint นี้" };
    }
    if (code === "PARSE") {
      set.status = 400;
      return { ok: false, code: "PARSE", message: "JSON body ไม่ถูกต้อง" };
    }
    set.status = 500;
    return {
      ok: false,
      code: "INTERNAL",
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในระบบ",
    };
  });
