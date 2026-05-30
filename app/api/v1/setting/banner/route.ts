import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

const app = new Elysia({ prefix: "/api/v1/setting/banner" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** GET — list banners เรียง id asc (เก่าสุดก่อน) */
  .get("/", async () => {
    const items = await prisma.banners.findMany({ orderBy: { id: "asc" } });
    return {
      ok: true as const,
      data: items.map((b) => {
        // defensive: ถ้า prisma client เก่ายังไม่มี createdAt → fallback
        const createdAt =
          (b as { createdAt?: Date }).createdAt?.toISOString() ??
          new Date().toISOString();
        return { id: b.id, image: b.image, createdAt };
      }),
    };
  })

  /** POST — เพิ่ม banner ใหม่ (รับ URL จาก upload endpoint) */
  .post(
    "/",
    async ({ body }) => {
      const saved = await prisma.banners.create({
        data: { image: body.image },
      });
      const createdAt =
        (saved as { createdAt?: Date }).createdAt?.toISOString() ??
        new Date().toISOString();
      return {
        ok: true as const,
        message: "เพิ่ม banner แล้ว",
        data: { id: saved.id, image: saved.image, createdAt },
      };
    },
    {
      body: t.Object({
        image: t.String({ minLength: 1, error: "ต้องระบุ URL รูปภาพ" }),
      }),
      requireRole: "admin",
    }
  );

export type BannerApp = typeof app;

export const GET = app.handle;
export const POST = app.handle;
