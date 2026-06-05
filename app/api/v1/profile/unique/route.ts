import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";
import { renameDiscountEligibleUsername } from "@/lib/server/discount-sync";

/**
 * ตรวจว่า "ชื่อผู้ใช้" / "ชื่อร้าน" / "ไอดีไลน์" ซ้ำกับผู้ใช้คนอื่นหรือไม่
 * - เช็คเฉพาะค่าที่ไม่ว่าง (ค่าว่างปล่อยให้ซ้ำได้ เพราะหลายคนยังไม่กรอก)
 * - ไม่นับตัวเอง (id != current user)
 */
const app = new Elysia({ prefix: "/api/v1/profile/unique" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  .post(
    "/",
    async ({ body, user }) => {
      const username = (body.username ?? "").trim().toLowerCase();
      const shopName = (body.shopName ?? "").trim();
      const lineId = (body.lineId ?? "").trim();

      const [usernameHit, shopHit, lineHit] = await Promise.all([
        username
          ? prisma.user.findFirst({
              where: { id: { not: user.id }, username },
              select: { id: true },
            })
          : Promise.resolve(null),
        shopName
          ? prisma.user.findFirst({
              where: { id: { not: user.id }, shopName },
              select: { id: true },
            })
          : Promise.resolve(null),
        lineId
          ? prisma.user.findFirst({
              where: { id: { not: user.id }, lineId },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);

      const usernameTaken = !!usernameHit;
      const shopNameTaken = !!shopHit;
      const lineIdTaken = !!lineHit;

      return {
        ok: !usernameTaken && !shopNameTaken && !lineIdTaken,
        usernameTaken,
        shopNameTaken,
        lineIdTaken,
      };
    },
    {
      body: t.Object({
        username: t.Optional(t.String()),
        shopName: t.Optional(t.String()),
        lineId: t.Optional(t.String()),
      }),
      requireAuth: true,
    }
  )

  /**
   * หลังลูกค้าเปลี่ยน "ชื่อผู้ใช้" สำเร็จ → ย้ายสิทธิ์ส่วนลดพิเศษจากชื่อเก่าไปชื่อใหม่อัตโนมัติ
   * - ชื่อใหม่ = username ปัจจุบันของผู้ใช้ (อ่านจาก DB ตาม session — เชื่อถือได้ ปลอมไม่ได้)
   * - previousUsername = ชื่อเก่าที่ client แจ้งมา; ป้องกันการแย่งสิทธิ์โดยเช็คว่าชื่อเก่า
   *   ต้องไม่ใช่ของผู้ใช้คนอื่นที่ยังใช้งานอยู่ (ต้องเป็นชื่อที่ "ว่างแล้ว" จากการเปลี่ยนของเจ้าตัว)
   */
  .post(
    "/sync-discount",
    async ({ body, user }) => {
      const me = await prisma.user.findUnique({
        where: { id: user.id },
        select: { username: true },
      });
      const currentUsername = (me?.username ?? "").trim();
      const previous = (body.previousUsername ?? "").trim();

      if (
        !currentUsername ||
        !previous ||
        previous.toLowerCase() === currentUsername.toLowerCase()
      ) {
        return { ok: true as const, updated: 0 };
      }

      // กันแย่งสิทธิ์: ชื่อเก่าต้องไม่มีผู้ใช้คนอื่นถือครองอยู่
      const ownedByOther = await prisma.user.findFirst({
        where: { id: { not: user.id }, username: previous },
        select: { id: true },
      });
      if (ownedByOther) return { ok: true as const, updated: 0 };

      const updated = await renameDiscountEligibleUsername(
        previous,
        currentUsername
      );
      return { ok: true as const, updated };
    },
    {
      body: t.Object({ previousUsername: t.String() }),
      requireAuth: true,
    }
  );

export type ProfileUniqueApp = typeof app;

export const POST = app.handle;
