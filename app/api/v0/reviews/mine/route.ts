import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

/**
 * รีวิวของฉัน — ลูกค้าดูรีวิวที่ตัวเองส่ง พร้อมสถานะ (รออนุมัติ/อนุมัติ/ไม่อนุมัติ)
 */
const app = new Elysia({ prefix: "/api/v0/reviews/mine" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  .get(
    "/",
    async ({ user }) => {
      const items = await prisma.reviews.findMany({
        where: { userId: user.id },
        orderBy: { id: "desc" },
      });
      return {
        ok: true as const,
        data: items.map((r) => ({
          id: r.id,
          status: r.status,
          avatar: r.avatar ?? null,
          name: r.name,
          detail: r.detail,
          review: r.review,
          rating: r.rating,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    },
    { requireAuth: true }
  );

export type ReviewsMineApp = typeof app;

export const GET = app.handle;
