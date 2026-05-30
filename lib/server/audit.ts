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
  | "BANNER_DELETE"
  | "REVIEW_CREATE"
  | "REVIEW_UPDATE"
  | "REVIEW_DELETE"
  | "CONFIG_UPDATE"
  | "LOGIN"
  | "LOGOUT";

export type AuditEntityType =
  | "user"
  | "product"
  | "banner"
  | "review"
  | "config"
  | "session";

interface LogAuditOptions {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | number | null;
  details?: unknown;
  user?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    username?: string | null;
  } | null;
  request?: Request | null;
}

/**
 * บันทึก audit log
 * — fire-and-forget: เรียกแบบไม่ await ก็ได้, error จะถูก swallow
 */
export async function logAudit(opts: LogAuditOptions): Promise<void> {
  try {
    const ip =
      opts.request?.headers.get("x-forwarded-for") ??
      opts.request?.headers.get("x-real-ip") ??
      null;
    const userAgent = opts.request?.headers.get("user-agent") ?? null;

    await prisma.audit_logs.create({
      data: {
        userId: opts.user?.id ?? null,
        userEmail: opts.user?.email ?? null,
        userName:
          opts.user?.name ?? opts.user?.username ?? null,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId != null ? String(opts.entityId) : null,
        details: (opts.details ?? null) as never,
        ipAddress: ip,
        userAgent,
      },
    });
  } catch (err) {
    // ไม่ throw — audit log ล่มไม่ควรหยุดการทำงานหลัก
    console.error("[audit] log failed:", err);
  }
}
