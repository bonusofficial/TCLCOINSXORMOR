import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";
import { CustomerReviewBody } from "@/lib/server/schemas/review";

/**
 * Public Reviews — สำหรับเว็บฝั่งผู้ใช้ (หน้าแรก)
 * - GET: แสดงเฉพาะรีวิวที่แอดมินอนุมัติแล้ว (ไม่ต้อง auth)
 * - POST: ลูกค้าส่งรีวิว (ต้อง login) → สถานะ "pending" รอแอดมินอนุมัติ
 */
const app = new Elysia({ prefix: "/api/v0/reviews" })
  .use(loggerPlugin)
  .use(errorPlugin)

  /** GET — list เฉพาะรีวิวที่อนุมัติแล้ว (เรียงใหม่สุดก่อน) */
  .get("/", async ({ set }) => {
    set.headers["Cache-Control"] = "private, max-age=300, stale-while-revalidate=3600";

    const items = await prisma.reviews.findMany({
      where: { status: "approved" },
      orderBy: { id: "desc" },
    });
    return {
      ok: true as const,
      data: items.map((r) => ({
        id: r.id,
        avatar: r.avatar ?? null,
        name: r.name,
        detail: r.detail,
        review: r.review,
        rating: r.rating,
        timeValue: r.timeValue,
        timeUnit: r.timeUnit,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  })

  .use(authMacros)

  /** POST — ลูกค้าส่งรีวิว (รออนุมัติ) — ชื่อ/รูป ดึงจากบัญชีจริง */
  .post(
    "/",
    async ({ body, user }) => {
      const u = user as {
        name?: string | null;
        username?: string | null;
        image?: string | null;
      };
      const name =
        (u.name ?? "").trim() ||
        (u.username ?? "").trim() ||
        "ลูกค้า";
      const saved = await prisma.reviews.create({
        data: {
          userId: user.id,
          status: "pending",
          avatar: u.image ?? null,
          name,
          detail: body.detail?.trim() || null,
          review: body.review.trim(),
          rating: body.rating,
          timeValue: 1,
          timeUnit: "hour",
        },
      });
      return {
        ok: true as const,
        message: "ส่งรีวิวเรียบร้อย รอแอดมินอนุมัติก่อนแสดงผล",
        data: { id: saved.id },
      };
    },
    { body: CustomerReviewBody, requireAuth: true }
  );

export type ReviewsPublicApp = typeof app;

export const GET = app.handle;
export const POST = app.handle;
