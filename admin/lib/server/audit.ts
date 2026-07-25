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
  | "CONFIG_UPDATE"
  | "API_MUTATION"
  | "LOGIN"
  | "LOGOUT";

export type AuditEntityType =
  | "user"
  | "product"
  | "banner"
  | "review"
  | "config"
  | "api"
  | "session";

interface LogAuditOptions {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | number | null;
  details?: unknown;
  payload?: unknown;
  response?: unknown;
  responseStatus?: number;
  user?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    username?: string | null;
  } | null;
  request?: Request | null;
}

const SENSITIVE_KEYS = [
  "authorization",
  "cookie",
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "api_key",
  "otp",
];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-\s]/g, "_");
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive));
}

/** แปลงข้อมูลให้เก็บเป็น JSON ได้ พร้อมปิดบัง credential ทุกระดับ */
function sanitizeAuditValue(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0
): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") {
    if (value.startsWith("data:") && value.includes(";base64,")) {
      return `[DATA_URL ${value.length} chars]`;
    }
    return value.length > 20_000
      ? `${value.slice(0, 20_000)}… [TRUNCATED ${value.length - 20_000} chars]`
      : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (depth >= 10) return "[MAX_DEPTH]";
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item, seen, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      isSensitiveKey(key)
        ? "[REDACTED]"
        : sanitizeAuditValue(child, seen, depth + 1),
    ])
  );
}

/**
 * บันทึก audit log
 * ควร await เพื่อให้ runtime เขียนฐานข้อมูลเสร็จก่อนจบ request
 * error จะถูก swallow เพื่อไม่ให้ audit ขัดขวางงานหลัก
 */
export async function logAudit(opts: LogAuditOptions): Promise<void> {
  if (opts.request) {
    (opts.request as Request & { _auditLogged?: boolean })._auditLogged = true;
  }

  try {
    const ip =
      opts.request?.headers.get("x-forwarded-for") ??
      opts.request?.headers.get("x-real-ip") ??
      null;
    const userAgent = opts.request?.headers.get("user-agent") ?? null;
    const url = opts.request ? new URL(opts.request.url) : null;
    const details = {
      summary: sanitizeAuditValue(opts.details),
      request: {
        method: opts.request?.method ?? null,
        path: url?.pathname ?? null,
        query: url
          ? Object.fromEntries(url.searchParams.entries())
          : {},
        payload: sanitizeAuditValue(opts.payload),
      },
      response: {
        status: opts.responseStatus ?? 200,
        body: sanitizeAuditValue(opts.response),
      },
    };

    await prisma.audit_logs.create({
      data: {
        userId: opts.user?.id ?? null,
        userEmail: opts.user?.email ?? null,
        userName:
          opts.user?.name ?? opts.user?.username ?? null,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId != null ? String(opts.entityId) : null,
        details: details as never,
        ipAddress: ip,
        userAgent,
      },
    });
  } catch (err) {
    // ไม่ throw — audit log ล่มไม่ควรหยุดการทำงานหลัก
    console.error("[audit] log failed:", err);
  }
}
