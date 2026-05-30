import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

const Query = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 200 })),
  cursor: t.Optional(t.Numeric()),
  action: t.Optional(t.String()),
  entityType: t.Optional(t.String()),
  userId: t.Optional(t.String()),
});

const app = new Elysia({ prefix: "/api/v1/audit" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** GET — list audit logs with pagination + filters (admin) */
  .get(
    "/",
    async ({ query }) => {
      const limit = query.limit ?? 50;
      const items = await prisma.audit_logs.findMany({
        where: {
          ...(query.action && { action: query.action }),
          ...(query.entityType && { entityType: query.entityType }),
          ...(query.userId && { userId: query.userId }),
        },
        take: limit + 1, // +1 เพื่อตรวจว่ามีหน้าถัดไป
        ...(query.cursor && { skip: 1, cursor: { id: query.cursor } }),
        orderBy: { id: "desc" },
      });

      const hasMore = items.length > limit;
      const data = (hasMore ? items.slice(0, -1) : items).map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      }));

      return {
        ok: true as const,
        data,
        nextCursor: hasMore ? data[data.length - 1].id : null,
      };
    },
    { query: Query, requireRole: "admin" }
  )

  /** GET /recent — ล่าสุด N รายการ สำหรับ dashboard widget */
  .get(
    "/recent",
    async () => {
      const items = await prisma.audit_logs.findMany({
        take: 10,
        orderBy: { id: "desc" },
      });
      return {
        ok: true as const,
        data: items.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
        })),
      };
    },
    { requireRole: "admin" }
  );

export type AuditApp = typeof app;

export const GET = app.handle;
