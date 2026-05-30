import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import { ReviewBody, ReviewParams } from "@/lib/server/schemas/review";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

function shape(r: {
  id: number;
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

  /** PATCH /:id — แก้รีวิว */
  .patch(
    "/:id",
    async ({ params, body, status }) => {
      try {
        const saved = await prisma.reviews.update({
          where: { id: params.id },
          data: {
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
          message: "อัปเดตรีวิวแล้ว",
          data: shape(saved),
        };
      } catch {
        return status(404, { ok: false, message: "ไม่พบรีวิว" });
      }
    },
    { params: ReviewParams, body: ReviewBody, requireRole: "admin" }
  )

  /** DELETE /:id */
  .delete(
    "/:id",
    async ({ params, status }) => {
      try {
        await prisma.reviews.delete({ where: { id: params.id } });
        return { ok: true as const, message: "ลบรีวิวแล้ว" };
      } catch {
        return status(404, { ok: false, message: "ไม่พบรีวิว" });
      }
    },
    { params: ReviewParams, requireRole: "admin" }
  );

export type ReviewItemApp = typeof app;

export const PATCH = app.handle;
export const DELETE = app.handle;
