import { Elysia } from "elysia";
import { headers as nextHeaders } from "next/headers";
import { auth } from "@/lib/auth";

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

export const loggerPlugin = new Elysia({ name: "logger" })
  .onRequest(({ request }) => {
    (request as Request & { _t?: number })._t = Date.now();
  })
  .onAfterResponse(({ request, set }) => {
    const start = (request as Request & { _t?: number })._t ?? Date.now();
    const ms = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${request.method} ${new URL(request.url).pathname} → ${set.status ?? 200} (${ms}ms)`
    );
  });

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
