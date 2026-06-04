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
  memberNo: t.Optional(t.Union([t.Number(), t.Null()])),
  name: t.Optional(t.String({ maxLength: 120 })),
  email: t.Optional(t.String({ maxLength: 255 })),
  username: t.Optional(t.String({ maxLength: 30 })),
  displayUsername: t.Optional(t.Union([t.String({ maxLength: 120 }), t.Null()])),
  image: t.Optional(t.Union([t.String(), t.Null()])),
  phone: t.Optional(t.Union([t.String({ maxLength: 30 }), t.Null()])),
  emailVerified: t.Optional(t.Boolean()),
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
  displayUsername: string | null;
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

      const nextMemberNo =
        body.memberNo === undefined
          ? undefined
          : body.memberNo === null
            ? null
            : Number(body.memberNo);
      if (
        nextMemberNo !== undefined &&
        nextMemberNo !== null &&
        (!Number.isInteger(nextMemberNo) || nextMemberNo <= 0)
      ) {
        return status(400, {
          ok: false,
          message: "UID ต้องเป็นเลขจำนวนเต็มมากกว่า 0",
        });
      }

      const rawUsername =
        body.username === undefined ? undefined : body.username.trim();
      const nextUsername =
        rawUsername === undefined ? undefined : rawUsername.toLowerCase();
      if (body.username !== undefined && !nextUsername) {
        return status(400, { ok: false, message: "ต้องระบุ Username" });
      }
      if (
        nextUsername &&
        (nextUsername.length < 3 || nextUsername.length > 30)
      ) {
        return status(400, {
          ok: false,
          message: "Username ต้องมี 3-30 ตัวอักษร",
        });
      }

      const nextName =
        body.name !== undefined
          ? body.name.trim()
          : nextUsername !== undefined
            ? nextUsername
            : undefined;
      if (body.name !== undefined && !nextName) {
        return status(400, { ok: false, message: "ต้องระบุชื่อผู้ใช้" });
      }

      const nextEmail = body.email?.trim().toLowerCase();
      if (
        body.email !== undefined &&
        (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail))
      ) {
        return status(400, { ok: false, message: "รูปแบบอีเมลไม่ถูกต้อง" });
      }

      const nextDisplayUsername =
        body.displayUsername === undefined
          ? nextUsername !== undefined
            ? nextUsername
            : undefined
          : body.displayUsername?.trim() || nextUsername || null;
      const nextImage =
        body.image === undefined ? undefined : body.image?.trim() || null;
      const nextPhone =
        body.phone === undefined ? undefined : body.phone?.trim() || null;
      const nextShopName =
        body.shopName === undefined ? undefined : body.shopName?.trim() || null;
      const nextLineId =
        body.lineId === undefined ? undefined : body.lineId?.trim() || null;

      const [memberNoHit, emailHit, usernameHit] = await Promise.all([
        nextMemberNo !== undefined && nextMemberNo !== null
          ? prisma.user.findFirst({
              where: { id: { not: params.id }, memberNo: nextMemberNo },
              select: { id: true },
            })
          : Promise.resolve(null),
        nextEmail
          ? prisma.user.findFirst({
              where: { id: { not: params.id }, email: nextEmail },
              select: { id: true },
            })
          : Promise.resolve(null),
        nextUsername
          ? prisma.user.findFirst({
              where: { id: { not: params.id }, username: nextUsername },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);

      if (memberNoHit)
        return status(400, { ok: false, message: "UID นี้ถูกใช้แล้ว" });
      if (emailHit)
        return status(400, { ok: false, message: "อีเมลนี้ถูกใช้แล้ว" });
      if (usernameHit)
        return status(400, { ok: false, message: "Username นี้ถูกใช้แล้ว" });

      const saved = await prisma.user.update({
        where: { id: params.id },
        data: {
          ...(nextMemberNo !== undefined && { memberNo: nextMemberNo }),
          ...(nextName !== undefined && { name: nextName }),
          ...(nextEmail !== undefined && { email: nextEmail }),
          ...(nextUsername !== undefined && { username: nextUsername }),
          ...(nextDisplayUsername !== undefined && {
            displayUsername: nextDisplayUsername,
          }),
          ...(nextImage !== undefined && { image: nextImage }),
          ...(nextPhone !== undefined && { phone: nextPhone }),
          ...(body.emailVerified !== undefined && {
            emailVerified: body.emailVerified,
          }),
          ...(body.role !== undefined && { role: body.role }),
          ...(nextShopName !== undefined && { shopName: nextShopName }),
          ...(nextLineId !== undefined && { lineId: nextLineId }),
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
            memberNo: before.memberNo,
            name: before.name,
            email: before.email,
            username: before.username,
            displayUsername: before.displayUsername,
            image: before.image,
            phone: before.phone,
            emailVerified: before.emailVerified,
            role: before.role,
            shopName: before.shopName,
            lineId: before.lineId,
          },
          after: {
            memberNo: saved.memberNo,
            name: saved.name,
            email: saved.email,
            username: saved.username,
            displayUsername: saved.displayUsername,
            image: saved.image,
            phone: saved.phone,
            emailVerified: saved.emailVerified,
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
