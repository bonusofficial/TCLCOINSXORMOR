import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import { ReviewBody } from "@/lib/server/schemas/review";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

/** helper — แปลง row จาก Prisma → response shape (กัน createdAt/updatedAt undefined) */
function shape(r: {
  id: number;
  userId?: string | null;
  status?: string;
  avatar?: string | null;
  name: string;
  detail: string | null;
  review: string;
  rating: number;
  timeValue: number;
  timeUnit: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  const now = new Date().toISOString();
  return {
    id: r.id,
    userId: r.userId ?? null,
    status: r.status ?? "approved",
    avatar: r.avatar ?? null,
    name: r.name,
    detail: r.detail,
    review: r.review,
    rating: r.rating,
    timeValue: r.timeValue,
    timeUnit: r.timeUnit,
    createdAt: r.createdAt?.toISOString() ?? now,
    updatedAt: r.updatedAt?.toISOString() ?? now,
  };
}

const app = new Elysia({ prefix: "/api/v1/setting/review" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** GET — list ทั้งหมด รวมที่รออนุมัติ (admin moderation) */
  .get(
    "/",
    async () => {
      const items = await prisma.reviews.findMany({ orderBy: { id: "desc" } });
      return { ok: true as const, data: items.map(shape) };
    },
    { requireRole: "admin" }
  )

  /** POST — เพิ่มรีวิว (admin) — ดีฟอลต์อนุมัติทันที */
  .post(
    "/",
    async ({ body }) => {
      const saved = await prisma.reviews.create({
        data: {
          status: body.status ?? "approved",
          avatar: body.avatar ?? null,
          name: body.name,
          detail: body.detail ?? null,
          review: body.review,
          rating: body.rating,
          timeValue: body.timeValue,
          timeUnit: body.timeUnit,
        },
      });
      return {
        ok: true as const,
        message: "เพิ่มรีวิวแล้ว",
        data: shape(saved),
      };
    },
    { body: ReviewBody, requireRole: "admin" }
  );

export type ReviewApp = typeof app;

export const GET = app.handle;
export const POST = app.handle;
