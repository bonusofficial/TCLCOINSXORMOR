import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import { errorPlugin, loggerPlugin } from "@/lib/server/middleware";

/**
 * Public Reviews — สำหรับเว็บฝั่งผู้ใช้ (หน้าแรก)
 * Read-only, ไม่ต้อง auth
 */
const app = new Elysia({ prefix: "/api/v0/reviews" })
  .use(loggerPlugin)
  .use(errorPlugin)

  /** GET — list ทั้งหมด (เรียงใหม่สุดก่อน) */
  .get("/", async () => {
    const items = await prisma.reviews.findMany({ orderBy: { id: "desc" } });
    return {
      ok: true as const,
      data: items.map((r) => ({
        id: r.id,
        avatar: (r as { avatar?: string | null }).avatar ?? null,
        name: r.name,
        detail: r.detail,
        review: r.review,
        rating: r.rating,
        timeValue: r.timeValue,
        timeUnit: r.timeUnit,
        createdAt: (
          (r as { createdAt?: Date }).createdAt ?? new Date()
        ).toISOString(),
      })),
    };
  });

export type ReviewsPublicApp = typeof app;

export const GET = app.handle;
