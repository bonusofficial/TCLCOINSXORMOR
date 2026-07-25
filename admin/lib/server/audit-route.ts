import { auth } from "@/lib/auth";
import {
  type AuditAction,
  type AuditEntityType,
  logAudit,
  sanitizeAuditValue,
} from "@/lib/server/audit";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

interface AuditRouteOptions {
  entityType: AuditEntityType;
  entityId?: string | number | null;
  captureRequestBody?: boolean;
  successAction?: AuditAction;
}

interface AuditRouteContext {
  session: AuthSession;
  user: AuthSession extends null | undefined
    ? never
    : NonNullable<AuthSession>["user"] | null;
}

type NextRouteHandler = (request: Request) => Promise<Response>;

function getEntityType(pathname: string): AuditEntityType {
  if (pathname.includes("/audit")) return "audit";
  if (pathname.includes("/bookings")) return "booking";
  if (pathname.includes("/products")) return "product";
  if (pathname.includes("/accounts")) return "account";
  if (pathname.includes("/users") || pathname.includes("/profile")) return "user";
  if (pathname.includes("/banner")) return "banner";
  if (pathname.includes("/review")) return "review";
  if (pathname.includes("/setting") || pathname.includes("/config")) return "config";
  if (pathname.includes("/upload")) return "upload";
  if (pathname.includes("/dashboard")) return "dashboard";
  return "api";
}

function getEntityId(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
  const tail = versionIndex >= 0 ? parts.slice(versionIndex + 1) : parts;
  const candidate = [...tail].reverse().find((part) => {
    return ![
      "cancel",
      "mine",
      "normal",
      "recent",
      "sales",
      "setting",
      "sort",
      "summary",
      "unique",
    ].includes(part);
  });
  return candidate ?? pathname;
}

function getSuccessAction(pathname: string, method: string): AuditAction {
  if (method === "GET" || method === "HEAD") return "API_RESPONSE";

  const operation =
    method === "POST"
      ? "CREATE"
      : method === "DELETE"
        ? "DELETE"
        : method === "PATCH" || method === "PUT"
          ? "UPDATE"
          : null;

  if (!operation) return "API_ACTION";
  if (pathname.includes("/products")) {
    return `PRODUCT_${operation}` as AuditAction;
  }
  if (pathname.includes("/setting/banner")) {
    return `BANNER_${operation}` as AuditAction;
  }
  if (
    pathname.includes("/setting/review") ||
    pathname === "/api/v0/reviews"
  ) {
    return `REVIEW_${operation}` as AuditAction;
  }
  if (pathname.includes("/bookings")) {
    return `BOOKING_${operation}` as AuditAction;
  }
  if (pathname.includes("/accounts")) {
    return `ACCOUNT_${operation}` as AuditAction;
  }
  if (/\/api\/v1\/users(?:\/|$)/.test(pathname)) {
    return `USER_${operation}` as AuditAction;
  }
  if (
    pathname.includes("/setting/normal") ||
    pathname.includes("/config")
  ) {
    return "CONFIG_UPDATE";
  }
  if (pathname.includes("/upload")) return "UPLOAD_CREATE";
  return "API_ACTION";
}

async function readRequestBody(
  request: Request,
  capture: boolean
): Promise<unknown> {
  if (!capture || request.method === "GET" || request.method === "HEAD") {
    return null;
  }
  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = request.headers.get("content-length");
  if (contentType.includes("multipart/form-data")) {
    return {
      type: "multipart/form-data",
      contentLength: contentLength ? Number(contentLength) : null,
      note: "ละเว้นเนื้อหาไฟล์ แต่ response จะมีชื่อ ชนิด และขนาดไฟล์",
    };
  }
  try {
    if (contentType.includes("application/json")) return await request.json();
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return Object.fromEntries((await request.formData()).entries());
    }
    return (await request.text()) || null;
  } catch {
    return "[UNREADABLE_BODY]";
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 304) return null;
  const contentType = response.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) return await response.json();
    if (contentType.startsWith("text/")) return (await response.text()) || null;
    return {
      type: contentType || "application/octet-stream",
      contentLength: response.headers.get("content-length"),
      body: "[BINARY_RESPONSE]",
    };
  } catch {
    return "[UNREADABLE_RESPONSE]";
  }
}

/**
 * ตัวครอบสำหรับ Native Next.js Route Handler ให้มี audit รูปแบบเดียวกับ Elysia
 * โดย response จะถูก clone ก่อนอ่าน จึงไม่กระทบ body ที่ส่งกลับ client
 */
export async function withApiAudit(
  request: Request,
  options: AuditRouteOptions,
  handler: (
    request: Request,
    context: AuditRouteContext
  ) => Promise<Response>
): Promise<Response> {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const url = new URL(request.url);
  const requestBodyPromise = readRequestBody(
    request.clone(),
    options.captureRequestBody !== false
  );
  let session: AuthSession = null;

  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch {
    session = null;
  }

  try {
    const response = await handler(request, {
      session,
      user: session?.user ?? null,
    });
    const [requestBody, responseBody] = await Promise.all([
      requestBodyPromise,
      readResponseBody(response.clone()),
    ]);
    const isError = response.status >= 400;

    if (
      (request as Request & { _domainAuditLogged?: boolean })
        ._domainAuditLogged &&
      !isError
    ) {
      return response;
    }

    await logAudit({
      action: isError
        ? "API_ERROR"
        : options.successAction ??
          (request.method === "GET" || request.method === "HEAD"
            ? "API_RESPONSE"
            : "API_ACTION"),
      entityType: options.entityType,
      entityId: options.entityId ?? url.pathname,
      user: session?.user ?? null,
      request,
      details: {
        requestId,
        request: {
          method: request.method,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams.entries()),
          body: sanitizeAuditValue(requestBody),
          headers: {
            contentType: request.headers.get("content-type"),
            origin: request.headers.get("origin"),
            referer: request.headers.get("referer"),
            acceptLanguage: request.headers.get("accept-language"),
          },
        },
        response: {
          status: response.status,
          outcome: isError ? "error" : "success",
          body: sanitizeAuditValue(responseBody),
        },
        durationMs: Date.now() - startedAt,
        occurredAt: new Date().toISOString(),
      },
    });
    return response;
  } catch (error) {
    await logAudit({
      action: "API_ERROR",
      entityType: options.entityType,
      entityId: options.entityId ?? url.pathname,
      user: session?.user ?? null,
      request,
      details: {
        requestId,
        request: {
          method: request.method,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams.entries()),
          body: sanitizeAuditValue(await requestBodyPromise),
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

/**
 * ครอบ Elysia app.handle ที่ขอบเขต Next.js โดยตรง
 * จึงไม่ขึ้นกับ Elysia afterResponse lifecycle
 */
export function withElysiaAudit(handler: NextRouteHandler): NextRouteHandler {
  return (request) => {
    const url = new URL(request.url);
    return withApiAudit(
      request,
      {
        entityType: getEntityType(url.pathname),
        entityId: getEntityId(url.pathname),
        successAction: getSuccessAction(url.pathname, request.method),
      },
      (auditedRequest) => handler(auditedRequest)
    );
  };
}
