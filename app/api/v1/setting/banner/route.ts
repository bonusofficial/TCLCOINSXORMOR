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

  /** GET — list banners เรียงตามลำดับความพรีเมียม (sortOrder asc, id asc) */
  .get("/", async () => {
    const items = await prisma.banners.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { id: "asc" },
      ],
    });
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

  /** PUT — จัดเรียงลำดับ banner ทั้งหมด */
  .put(
    "/sort",
    async ({ body }) => {
      const { ids } = body;
      await Promise.all(
        ids.map((id: number, idx: number) =>
          prisma.banners.update({
            where: { id },
            data: { sortOrder: idx },
          })
        )
      );
      return {
        ok: true as const,
        message: "จัดเรียงลำดับรูปภาพสไลเดอร์เรียบร้อยแล้ว",
      };
    },
    {
      body: t.Object({
        ids: t.Array(t.Numeric()),
      }),
      requireRole: "admin",
    }
  )

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
export const PUT = app.handle;
