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
  actorType: t.Optional(
    t.Union([
      t.Literal("user"),
      t.Literal("admin"),
      t.Literal("system"),
    ])
  ),
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
      const adminUsers = await prisma.user.findMany({
        where: {
          OR: [
            { role: "admin" },
            { email: { endsWith: "@admin.tclcoinsxormor.com" } },
          ],
        },
        select: { id: true },
      });
      const adminIds = adminUsers.map((user) => user.id);
      const items = await prisma.audit_logs.findMany({
        where: {
          ...(query.action && { action: query.action }),
          ...(query.entityType && { entityType: query.entityType }),
          ...(query.userId && { userId: query.userId }),
          ...(query.actorType === "admin" && {
            userId: { in: adminIds },
          }),
          ...(query.actorType === "user" && {
            OR: [
              { userId: { not: null, notIn: adminIds } },
              { userId: null, userEmail: { not: null } },
            ],
          }),
          ...(query.actorType === "system" && {
            userId: null,
            userEmail: null,
          }),
        },
        take: limit + 1, // +1 เพื่อตรวจว่ามีหน้าถัดไป
        ...(query.cursor && { skip: 1, cursor: { id: query.cursor } }),
        orderBy: { id: "desc" },
      });

      const hasMore = items.length > limit;
      const adminIdSet = new Set(adminIds);
      const data = (hasMore ? items.slice(0, -1) : items).map((a) => {
        const actorType = a.userId
          ? adminIdSet.has(a.userId)
            ? "admin"
            : "user"
          : a.userEmail
            ? "user"
            : "system";
        return {
          ...a,
          actorType,
          createdAt: a.createdAt.toISOString(),
        };
      });

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
