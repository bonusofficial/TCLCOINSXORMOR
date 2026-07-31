import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "USER_ROLE_CHANGE"
  | "USER_PASSWORD_RESET"
  | "USER_PASSWORD_CHANGE"
  | "PRODUCT_CREATE"
  | "PRODUCT_UPDATE"
  | "PRODUCT_DELETE"
  | "BANNER_CREATE"
  | "BANNER_UPDATE"
  | "BANNER_DELETE"
  | "REVIEW_CREATE"
  | "REVIEW_UPDATE"
  | "REVIEW_DELETE"
  | "BOOKING_CREATE"
  | "BOOKING_UPDATE"
  | "BOOKING_CANCEL"
  | "BOOKING_DELETE"
  | "ACCOUNT_CREATE"
  | "ACCOUNT_UPDATE"
  | "ACCOUNT_DELETE"
  | "UPLOAD_CREATE"
  | "CONFIG_UPDATE"
  | "LOGIN"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "AUTH_ERROR"
  | "API_RESPONSE"
  | "API_ACTION"
  | "API_ERROR";

export type AuditEntityType =
  | "user"
  | "product"
  | "banner"
  | "review"
  | "config"
  | "session"
  | "booking"
  | "account"
  | "upload"
  | "dashboard"
  | "api"
  | "auth"
  | "audit";

export interface AuditUserSnapshot {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  role?: string | null;
}

interface LogAuditOptions {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | number | null;
  details?: unknown;
  payload?: unknown;
  response?: unknown;
  responseStatus?: number;
  user?: AuditUserSnapshot | null;
  request?: Request | null;
}

const REDACTED = "[REDACTED]";
const MAX_STRING_LENGTH = 2_000;
const MAX_ARRAY_ITEMS = 25;
const MAX_OBJECT_KEYS = 80;
const MAX_DEPTH = 6;
const SENSITIVE_KEYS = [
  "password",
  "token",
  "authorization",
  "cookie",
  "secret",
  "apikey",
  "otp",
];

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength
    ? value
    : `${value.slice(0, Math.max(0, maxLength - 12))}…[truncated]`;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_\s]/g, "");
  return SENSITIVE_KEYS.some((item) => normalized.includes(item));
}

/** ปิดบัง credentials และจำกัดขนาดข้อมูลก่อนเก็บลง Audit JSON */
export function sanitizeAuditValue(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>()
): unknown {
  if (value == null) return null;
  if (typeof value === "string") {
    if (value.startsWith("data:") && value.includes(";base64,")) {
      return `[DATA_URL ${value.length} chars]`;
    }
    return truncate(value, MAX_STRING_LENGTH);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return "[TRUNCATED]";
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeAuditValue(item, depth + 1, seen));
  }
  if (typeof value === "object") {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
      result[key] = isSensitiveKey(key)
        ? REDACTED
        : sanitizeAuditValue(item, depth + 1, seen);
    }
    return result;
  }
  return String(value);
}

function getClientIp(request?: Request | null): string | null {
  const forwarded = request?.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request?.headers.get("x-real-ip")?.trim() ||
    request?.headers.get("cf-connecting-ip")?.trim() ||
    null
  );
}

function buildDetails(opts: LogAuditOptions): unknown {
  const status = opts.responseStatus ?? 200;
  const hasExchange =
    opts.payload !== undefined ||
    opts.response !== undefined ||
    opts.responseStatus !== undefined;
  const actor = {
    role: opts.user?.role ?? null,
    category:
      opts.user?.role?.toLowerCase() === "admin"
        ? "admin"
        : opts.user?.id || opts.user?.email
          ? "user"
          : "system",
  };
  if (!hasExchange) {
    return { actor, summary: opts.details ?? null };
  }
  const url = opts.request ? new URL(opts.request.url) : null;
  return {
    actor,
    summary: opts.details ?? null,
    request: {
      method: opts.request?.method ?? null,
      path: url?.pathname ?? null,
      query: url ? Object.fromEntries(url.searchParams.entries()) : {},
      body: opts.payload ?? null,
    },
    response: {
      status,
      outcome: status >= 400 ? "error" : "success",
      body: opts.response ?? null,
    },
  };
}

/** บันทึก Audit แบบไม่ขัดขวางงานหลักหากระบบ Log มีปัญหา */
export async function logAudit(opts: LogAuditOptions): Promise<void> {
  try {
    await prisma.audit_logs.create({
      data: {
        userId: opts.user?.id ? truncate(String(opts.user.id), 36) : null,
        userEmail: opts.user?.email
          ? truncate(String(opts.user.email), 255)
          : null,
        userName:
          opts.user?.name || opts.user?.username
            ? truncate(String(opts.user.name || opts.user.username), 120)
            : null,
        action: truncate(opts.action, 50),
        entityType: truncate(opts.entityType, 50),
        entityId:
          opts.entityId != null ? truncate(String(opts.entityId), 100) : null,
        details: sanitizeAuditValue(buildDetails(opts)) as never,
        ipAddress: getClientIp(opts.request),
        userAgent: opts.request?.headers.get("user-agent") ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] log failed:", error);
  }
}
