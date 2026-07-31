import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import {
  type AuditAction,
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
    return (await request.text()) || null;
  } catch {
    return "[UNREADABLE_BODY]";
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 304) return null;
  try {
    const contentType = response.headers.get("content-type") ?? "";
    return contentType.includes("application/json")
      ? await response.json()
      : (await response.text()) || null;
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
    role: typeof user.role === "string" ? user.role : null,
  };
}

function attemptedUser(body: unknown): AuditUserSnapshot | null {
  if (!isRecord(body)) return null;
  const email = typeof body.email === "string" ? body.email : null;
  const username = typeof body.username === "string" ? body.username : null;
  return email || username
    ? { email, name: username, username, role: null }
    : null;
}

function resolveAuthAction(
  authPath: string,
  responseOk: boolean,
  hasResponseUser: boolean
): AuditAction | null {
  if (authPath === "/sign-in/email" || authPath === "/sign-in/username") {
    return responseOk && hasResponseUser ? "LOGIN" : "LOGIN_FAILED";
  }
  if (authPath === "/sign-out") return responseOk ? "LOGOUT" : "AUTH_ERROR";
  if (authPath === "/sign-up/email") {
    return responseOk ? "USER_CREATE" : "AUTH_ERROR";
  }
  if (authPath === "/update-user") {
    return responseOk ? "USER_UPDATE" : "AUTH_ERROR";
  }
  if (authPath === "/change-password") {
    return responseOk ? "USER_PASSWORD_CHANGE" : "AUTH_ERROR";
  }
  if (authPath === "/delete-user") {
    return responseOk ? "USER_DELETE" : "AUTH_ERROR";
  }
  return null;
}

async function auditedAuthHandler(
  request: Request,
  handler: (request: Request) => Promise<Response>
): Promise<Response> {
  const url = new URL(request.url);
  const authPath = url.pathname.replace(/^\/api\/auth/, "") || "/";
  const trackedPaths = new Set([
    "/sign-in/email",
    "/sign-in/username",
    "/sign-out",
    "/sign-up/email",
    "/update-user",
    "/change-password",
    "/delete-user",
  ]);
  if (!trackedPaths.has(authPath)) return handler(request);

  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const requestBody = await readRequestBody(request.clone());
  let sessionBefore: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    sessionBefore = await auth.api.getSession({ headers: request.headers });
  } catch {
    sessionBefore = null;
  }

  try {
    const response = await handler(request);
    const responseBody = await readResponseBody(response.clone());
    const responseUser = userFromPayload(responseBody);
    const actor =
      (sessionBefore?.user as AuditUserSnapshot | undefined) ??
      responseUser ??
      attemptedUser(requestBody);
    const action = resolveAuthAction(authPath, response.ok, !!responseUser);
    if (action) {
      await logAudit({
        action,
        entityType:
          authPath.startsWith("/sign-in") || authPath === "/sign-out"
            ? "session"
            : "user",
        entityId: actor?.id ?? authPath,
        user: actor,
        request,
        details: {
          requestId,
          authRoute: authPath,
          durationMs: Date.now() - startedAt,
          occurredAt: new Date().toISOString(),
        },
        payload: sanitizeAuditValue(requestBody),
        response: sanitizeAuditValue(responseBody),
        responseStatus: response.status,
      });
    }
    return response;
  } catch (error) {
    await logAudit({
      action: "AUTH_ERROR",
      entityType: "auth",
      entityId: authPath,
      user:
        (sessionBefore?.user as AuditUserSnapshot | undefined) ??
        attemptedUser(requestBody),
      request,
      details: {
        requestId,
        authRoute: authPath,
        durationMs: Date.now() - startedAt,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : String(error),
      },
      payload: sanitizeAuditValue(requestBody),
      responseStatus: 500,
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
