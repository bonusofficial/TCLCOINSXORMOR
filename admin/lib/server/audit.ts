import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "USER_ROLE_CHANGE"
  | "USER_PASSWORD_RESET"
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
  | "BOOKING_DELETE"
  | "ACCOUNT_CREATE"
  | "ACCOUNT_UPDATE"
  | "ACCOUNT_DELETE"
  | "UPLOAD_CREATE"
  | "CONFIG_UPDATE"
  | "API_MUTATION"
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
const TRUNCATED = "[TRUNCATED]";
const MAX_STRING_LENGTH = 2_000;
const MAX_ARRAY_ITEMS = 25;
const MAX_OBJECT_KEYS = 80;
const MAX_DEPTH = 6;
const MAX_DETAILS_LENGTH = 48_000;

const SENSITIVE_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "passwordconfirmation",
  "token",
  "sessiontoken",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "authorization",
  "cookie",
  "setcookie",
  "secret",
  "apikey",
  "api_key",
  "otp",
]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[-_\s]/g, "");
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return (
    SENSITIVE_KEYS.has(key.toLowerCase()) ||
    SENSITIVE_KEYS.has(normalized) ||
    normalized.includes("password") ||
    normalized.includes("token") ||
    normalized.includes("secret") ||
    normalized.includes("authorization") ||
    normalized.includes("cookie") ||
    normalized.includes("apikey")
  );
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 12))}…[truncated]`;
}

/**
 * ทำข้อมูลให้พร้อมเก็บใน JSON:
 * - ปิดบัง credentials/tokens
 * - จำกัด depth, จำนวนรายการ และความยาว string
 * - แปลง Date, bigint, File/FormData เป็นค่าที่อ่านได้
 */
export function sanitizeAuditValue(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>()
): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "string") {
    if (value.startsWith("data:") && value.includes(";base64,")) {
      return `[DATA_URL ${value.length} chars]`;
    }
    return truncate(value, MAX_STRING_LENGTH);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol" || typeof value === "function") {
    return `[${typeof value}]`;
  }
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return TRUNCATED;

  if (typeof File !== "undefined" && value instanceof File) {
    return {
      type: "file",
      name: value.name,
      mimeType: value.type,
      size: value.size,
    };
  }
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return {
      type: "blob",
      mimeType: value.type,
      size: value.size,
    };
  }
  if (typeof FormData !== "undefined" && value instanceof FormData) {
    const form: Record<string, unknown> = {};
    for (const [key, entry] of value.entries()) {
      form[key] = isSensitiveKey(key)
        ? REDACTED
        : sanitizeAuditValue(entry, depth + 1, seen);
    }
    return form;
  }
  if (Array.isArray(value)) {
    const result = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((entry) => sanitizeAuditValue(entry, depth + 1, seen));
    if (value.length > MAX_ARRAY_ITEMS) {
      result.push(`[${value.length - MAX_ARRAY_ITEMS} more items]`);
    }
    return result;
  }
  if (typeof value === "object") {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);

    if (value instanceof URLSearchParams) {
      return sanitizeAuditValue(
        Object.fromEntries(value.entries()),
        depth + 1,
        seen
      );
    }

    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const entries = Object.entries(source);
    for (const [key, entry] of entries.slice(0, MAX_OBJECT_KEYS)) {
      result[key] = isSensitiveKey(key)
        ? REDACTED
        : sanitizeAuditValue(entry, depth + 1, seen);
    }
    if (entries.length > MAX_OBJECT_KEYS) {
      result._truncatedKeys = entries.length - MAX_OBJECT_KEYS;
    }
    return result;
  }
  return String(value);
}

function prepareDetails(value: unknown): unknown {
  const sanitized = sanitizeAuditValue(value);
  try {
    const serialized = JSON.stringify(sanitized);
    if (serialized.length <= MAX_DETAILS_LENGTH) return sanitized;
    return {
      truncated: true,
      originalLength: serialized.length,
      preview: truncate(serialized, MAX_DETAILS_LENGTH - 100),
    };
  } catch {
    return { serializationError: true };
  }
}

function buildDetails(opts: LogAuditOptions): unknown {
  const hasExchange =
    opts.payload !== undefined ||
    opts.response !== undefined ||
    opts.responseStatus !== undefined;
  if (!hasExchange) return opts.details ?? null;

  const url = opts.request ? new URL(opts.request.url) : null;
  const status = opts.responseStatus ?? 200;
  return {
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

export function getClientIp(request?: Request | null): string | null {
  const forwarded = request?.headers.get("x-forwarded-for");
  const value =
    forwarded?.split(",")[0]?.trim() ||
    request?.headers.get("x-real-ip")?.trim() ||
    request?.headers.get("cf-connecting-ip")?.trim() ||
    null;
  return value ? truncate(value, 45) : null;
}

/**
 * บันทึก audit log โดยปิดบังข้อมูลลับและไม่ปล่อยให้ audit ขัดขวางงานหลัก
 */
export async function logAudit(opts: LogAuditOptions): Promise<void> {
  if (opts.request && !opts.action.startsWith("API_")) {
    (opts.request as Request & { _domainAuditLogged?: boolean })
      ._domainAuditLogged = true;
  }

  try {
    const userAgent = opts.request?.headers.get("user-agent") ?? null;

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
        details: (prepareDetails(buildDetails(opts)) ?? null) as never,
        ipAddress: getClientIp(opts.request),
        userAgent,
      },
    });
  } catch (err) {
    console.error("[audit] log failed:", err);
  }
}
