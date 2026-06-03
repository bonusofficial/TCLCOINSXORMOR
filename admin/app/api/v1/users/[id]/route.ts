import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";
import { logAudit } from "@/lib/server/audit";

const Params = t.Object({ id: t.String({ minLength: 1 }) });

const UserUpdateBody = t.Object({
  name: t.Optional(t.String({ maxLength: 120 })),
  phone: t.Optional(t.String({ maxLength: 30 })),
  role: t.Optional(
    t.Union([t.Literal("member"), t.Literal("agent"), t.Literal("admin")])
  ),
  shopName: t.Optional(t.Union([t.String({ maxLength: 200 }), t.Null()])),
  lineId: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
});

function shape(u: {
  id: string;
  memberNo: number | null;
  name: string;
  email: string;
  username: string | null;
  image: string | null;
  role: string | null;
  phone: string | null;
  emailVerified: boolean;
  shopName: string | null;
  lineId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

const app = new Elysia({ prefix: "/api/v1/users" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** GET /:id */
  .get(
    "/:id",
    async ({ params, status }) => {
      const u = await prisma.user.findUnique({ where: { id: params.id } });
      if (!u) return status(404, { ok: false, message: "ไม่พบผู้ใช้" });
      return { ok: true as const, data: shape(u) };
    },
    { params: Params, requireRole: "admin" }
  )

  /** PATCH /:id — แก้ไขข้อมูล + log audit */
  .patch(
    "/:id",
    async ({ params, body, user: actor, request, status }) => {
      const before = await prisma.user.findUnique({ where: { id: params.id } });
      if (!before)
        return status(404, { ok: false, message: "ไม่พบผู้ใช้" });

      const saved = await prisma.user.update({
        where: { id: params.id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.phone !== undefined && { phone: body.phone }),
          ...(body.role !== undefined && { role: body.role }),
          ...(body.shopName !== undefined && { shopName: body.shopName }),
          ...(body.lineId !== undefined && { lineId: body.lineId }),
        },
      });

      // determine action type
      const isRoleChange = body.role !== undefined && body.role !== before.role;
      logAudit({
        action: isRoleChange ? "USER_ROLE_CHANGE" : "USER_UPDATE",
        entityType: "user",
        entityId: saved.id,
        details: {
          before: {
            name: before.name,
            phone: before.phone,
            role: before.role,
            shopName: before.shopName,
            lineId: before.lineId,
          },
          after: {
            name: saved.name,
            phone: saved.phone,
            role: saved.role,
            shopName: saved.shopName,
            lineId: saved.lineId,
          },
        },
        user: actor,
        request,
      });

      return {
        ok: true as const,
        message: "อัปเดตผู้ใช้แล้ว",
        data: shape(saved),
      };
    },
    { params: Params, body: UserUpdateBody, requireRole: "admin" }
  )

  /** DELETE /:id — ลบผู้ใช้ + log audit */
  .delete(
    "/:id",
    async ({ params, user: actor, request, status }) => {
      const before = await prisma.user.findUnique({ where: { id: params.id } });
      if (!before)
        return status(404, { ok: false, message: "ไม่พบผู้ใช้" });

      // กันลบตัวเอง
      if (actor.id === params.id) {
        return status(400, { ok: false, message: "ไม่สามารถลบบัญชีตัวเองได้" });
      }

      await prisma.user.delete({ where: { id: params.id } });

      logAudit({
        action: "USER_DELETE",
        entityType: "user",
        entityId: before.id,
        details: {
          deletedUser: {
            email: before.email,
            name: before.name,
            role: before.role,
          },
        },
        user: actor,
        request,
      });

      return { ok: true as const, message: "ลบผู้ใช้แล้ว" };
    },
    { params: Params, requireRole: "admin" }
  );

export type UsersItemApp = typeof app;

export const GET = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
