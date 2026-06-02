import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import { errorPlugin, loggerPlugin } from "@/lib/server/middleware";

/**
 * Public Banners — สำหรับ Hero section ของเว็บผู้ใช้
 * Read-only, ไม่ต้อง auth
 */
const app = new Elysia({ prefix: "/api/v0/banners" })
  .use(loggerPlugin)
  .use(errorPlugin)

  /** GET — list ทั้งหมด เรียงตามลำดับความพรีเมียม (sortOrder asc, id asc) */
  .get("/", async () => {
    const items = await prisma.banners.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { id: "asc" },
      ],
    });
    return {
      ok: true as const,
      data: items.map((b) => ({
        id: b.id,
        image: b.image,
      })),
    };
  });

export type BannersPublicApp = typeof app;

export const GET = app.handle;
