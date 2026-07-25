import { Elysia } from "elysia";
import { headers as nextHeaders } from "next/headers";
import { auth } from "@/lib/auth";
import {
  logAudit,
  type AuditAction,
  type AuditEntityType,
} from "@/lib/server/audit";

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
        const userRole = ((user as { role?: string }).role ?? "member").toLowerCase();
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

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const READ_ONLY_POST_PATHS = new Set([
  "/api/v0/auth/resolve",
  "/api/v1/profile/unique",
]);

function classifyMutation(
  method: string,
  path: string
): { action: AuditAction; entityType: AuditEntityType } {
  const operation =
    method === "POST" ? "CREATE" : method === "DELETE" ? "DELETE" : "UPDATE";

  if (/\/products(?:\/|$)/.test(path)) {
    return {
      action: `PRODUCT_${operation}` as AuditAction,
      entityType: "product",
    };
  }
  if (/\/users(?:\/|$)/.test(path)) {
    return {
      action: `USER_${operation}` as AuditAction,
      entityType: "user",
    };
  }
  if (/\/(?:setting\/)?banners?(?:\/|$)/.test(path)) {
    return {
      action: `BANNER_${operation}` as AuditAction,
      entityType: "banner",
    };
  }
  if (/\/(?:setting\/)?reviews?(?:\/|$)/.test(path)) {
    return {
      action: `REVIEW_${operation}` as AuditAction,
      entityType: "review",
    };
  }
  if (/\/setting\/normal(?:\/|$)|\/config(?:\/|$)/.test(path)) {
    return { action: "CONFIG_UPDATE", entityType: "config" };
  }
  return { action: "API_MUTATION", entityType: "api" };
}

function firstRouteParam(params: unknown): string | number | null {
  if (!params || typeof params !== "object") return null;
  for (const value of Object.values(params as Record<string, unknown>)) {
    if (typeof value === "string" || typeof value === "number") return value;
  }
  return null;
}

export const loggerPlugin = new Elysia({ name: "logger" })
  .onRequest(({ request }) => {
    (request as Request & { _t?: number })._t = Date.now();
  })
  .onAfterResponse(async (context) => {
    const {
      request,
      set,
      body,
      params,
      query,
      responseValue,
    } = context;
    const start = (request as Request & { _t?: number })._t ?? Date.now();
    const ms = Date.now() - start;
    const path = new URL(request.url).pathname;
    const status = typeof set.status === "number" ? set.status : 200;
    console.log(
      `[${new Date().toISOString()}] ${request.method} ${path} → ${status} (${ms}ms)`
    );

    const trackedRequest = request as Request & { _auditLogged?: boolean };
    if (
      !MUTATION_METHODS.has(request.method) ||
      trackedRequest._auditLogged ||
      READ_ONLY_POST_PATHS.has(path) ||
      path.startsWith("/api/v1/audit")
    ) {
      return;
    }

    const { action, entityType } = classifyMutation(request.method, path);
    const actor = (
      context as typeof context & {
        user?: {
          id?: string | null;
          email?: string | null;
          name?: string | null;
          username?: string | null;
        } | null;
      }
    ).user;
    const entityId = firstRouteParam(params);

    await logAudit({
      action,
      entityType,
      entityId,
      details: {
        source: "automatic-api-audit",
        success: status < 400,
        durationMs: ms,
      },
      payload: { params, query, body },
      response: responseValue,
      responseStatus: status,
      user: actor ?? null,
      request,
    });
  })
  .as("global");

export const errorPlugin = new Elysia({ name: "error" })
  .onError(({ code, error, set }) => {
    // Validation error จาก Elysia t.Object
    if (code === "VALIDATION") {
      set.status = 422;
      return {
        ok: false,
        code: "VALIDATION",
        message: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
        issues:
          (error as unknown as { all?: unknown[] }).all ?? [],
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
