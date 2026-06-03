import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

/**
 * ตรวจว่า "ชื่อร้าน" / "ไอดีไลน์" ซ้ำกับผู้ใช้คนอื่นหรือไม่
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
      const shopName = (body.shopName ?? "").trim();
      const lineId = (body.lineId ?? "").trim();

      const [shopHit, lineHit] = await Promise.all([
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

      const shopNameTaken = !!shopHit;
      const lineIdTaken = !!lineHit;

      return {
        ok: !shopNameTaken && !lineIdTaken,
        shopNameTaken,
        lineIdTaken,
      };
    },
    {
      body: t.Object({
        shopName: t.Optional(t.String()),
        lineId: t.Optional(t.String()),
      }),
      requireAuth: true,
    }
  );

export type ProfileUniqueApp = typeof app;

export const POST = app.handle;
