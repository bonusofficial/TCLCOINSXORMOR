import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";
import { errorPlugin, loggerPlugin } from "@/lib/server/middleware";

/**
 * Resolve login identifier → canonical username
 *
 * รองรับการเข้าสู่ระบบด้วย: username / email / ชื่อร้าน (shopName) / ไอดีไลน์ (lineId)
 * คืน username มาตรฐานของบัญชีที่ตรง เพื่อให้ฝั่ง client เรียก signIn.username ต่อ
 * (ไม่คืน email เพื่อลดการเปิดเผยข้อมูล · ไม่ตรวจรหัสผ่านที่นี่ — ตรวจตอน signIn)
 */
const app = new Elysia({ prefix: "/api/v0/auth/resolve" })
  .use(loggerPlugin)
  .use(errorPlugin)

  .post(
    "/",
    async ({ body }) => {
      const id = body.identifier.trim();
      if (!id) return { ok: false as const, username: null };

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: id },
            { email: id },
            { shopName: id },
            { lineId: id },
          ],
        },
        select: { username: true },
      });

      return user?.username
        ? { ok: true as const, username: user.username }
        : { ok: false as const, username: null };
    },
    { body: t.Object({ identifier: t.String() }) }
  );

export type AuthResolveApp = typeof app;

export const POST = app.handle;
