import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import {
  type AuditUserSnapshot,
  logAudit,
  sanitizeAuditValue,
} from "@/lib/server/audit";

const handlers = toNextJsHandler(auth);

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readRequestBody(request: Request): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") return null;
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) return await request.json();
    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      return Object.fromEntries((await request.formData()).entries());
    }
    const text = await request.text();
    return text || null;
  } catch {
    return "[UNREADABLE_BODY]";
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 304) return null;
  const contentType = response.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) return await response.json();
    const text = await response.text();
    return text || null;
  } catch {
    return "[UNREADABLE_RESPONSE]";
  }
}

function userFromPayload(payload: unknown): AuditUserSnapshot | null {
  if (!isRecord(payload) || !isRecord(payload.user)) return null;
  const user = payload.user;
  return {
    id: typeof user.id === "string" ? user.id : null,
    email: typeof user.email === "string" ? user.email : null,
    name: typeof user.name === "string" ? user.name : null,
    username: typeof user.username === "string" ? user.username : null,
  };
}

function attemptedUser(body: unknown): AuditUserSnapshot | null {
  if (!isRecord(body)) return null;
  const email = typeof body.email === "string" ? body.email : null;
  const username = typeof body.username === "string" ? body.username : null;
  if (!email && !username) return null;
  return {
    email,
    name: username,
    username,
  };
}

async function auditedAuthHandler(
  request: Request,
  handler: (request: Request) => Promise<Response>
): Promise<Response> {
  const url = new URL(request.url);
  const authPath = url.pathname.replace(/^\/api\/auth/, "") || "/";
  const isLogin =
    authPath === "/sign-in/email" || authPath === "/sign-in/username";
  const isLogout = authPath === "/sign-out";

  // ไม่บันทึก GET session/cookie และ auth utility routes เพื่อลด log รบกวน
  if (!isLogin && !isLogout) {
    return handler(request);
  }

  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const requestBody = await readRequestBody(request.clone());
  let sessionBefore: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  if (isLogout) {
    try {
      sessionBefore = await auth.api.getSession({ headers: request.headers });
    } catch {
      sessionBefore = null;
    }
  }

  try {
    const response = await handler(request);
    const responseBody = await readResponseBody(response.clone());
    const responseUser = userFromPayload(responseBody);
    const user =
      responseUser ??
      (sessionBefore?.user as AuditUserSnapshot | undefined) ??
      attemptedUser(requestBody);
    const action = isLogin
      ? response.ok && responseUser
        ? "LOGIN"
        : "LOGIN_FAILED"
      : response.ok
        ? "LOGOUT"
        : "AUTH_ERROR";

    await logAudit({
      action,
      entityType: isLogin || isLogout ? "session" : "auth",
      entityId: responseUser?.id ?? sessionBefore?.user.id ?? authPath,
      user,
      request,
      details: {
        requestId,
        authRoute: authPath,
        request: {
          method: request.method,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams.entries()),
          body: sanitizeAuditValue(requestBody),
        },
        response: {
          status: response.status,
          outcome: response.ok ? "success" : "error",
          body: sanitizeAuditValue(responseBody),
        },
        durationMs: Date.now() - startedAt,
        occurredAt: new Date().toISOString(),
      },
    });

    return response;
  } catch (error) {
    await logAudit({
      action: isLogin ? "LOGIN_FAILED" : "AUTH_ERROR",
      entityType: isLogin || isLogout ? "session" : "auth",
      entityId: authPath,
      user:
        (sessionBefore?.user as AuditUserSnapshot | undefined) ??
        attemptedUser(requestBody),
      request,
      details: {
        requestId,
        authRoute: authPath,
        request: {
          method: request.method,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams.entries()),
          body: sanitizeAuditValue(requestBody),
        },
        response: {
          status: 500,
          outcome: "error",
          error:
            error instanceof Error
              ? { name: error.name, message: error.message }
              : String(error),
        },
        durationMs: Date.now() - startedAt,
        occurredAt: new Date().toISOString(),
      },
    });
    throw error;
  }
}

export function GET(request: Request): Promise<Response> {
  return auditedAuthHandler(request, handlers.GET);
}

export function POST(request: Request): Promise<Response> {
  return auditedAuthHandler(request, handlers.POST);
}
