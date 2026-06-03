import { t } from "elysia";

export const REVIEW_TIME_UNITS = ["hour", "day", "week", "month", "year"] as const;
export type ReviewTimeUnit = (typeof REVIEW_TIME_UNITS)[number];

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

const ReviewStatusSchema = t.Union(
  [t.Literal("pending"), t.Literal("approved"), t.Literal("rejected")],
  { error: "สถานะรีวิวไม่ถูกต้อง" }
);

/** ลูกค้าส่งรีวิวเอง — ใส่แค่ดาว + ข้อความ (ชื่อ/รูปดึงจากบัญชี) */
export const CustomerReviewBody = t.Object({
  rating: t.Integer({ minimum: 1, maximum: 5, error: "ให้คะแนน 1-5 ดาว" }),
  review: t.String({ minLength: 1, maxLength: 1000, error: "กรุณาเขียนรีวิว" }),
  detail: t.Optional(t.String({ maxLength: 200 })),
});

export const ReviewBody = t.Object({
  avatar: t.Optional(t.Union([t.String(), t.Null()])),
  name: t.String({ minLength: 1, maxLength: 120, error: "ต้องระบุชื่อลูกค้า" }),
  detail: t.Optional(t.String({ maxLength: 200 })),
  review: t.String({ minLength: 1, error: "ต้องระบุรายละเอียดรีวิว" }),
  rating: t.Integer({ minimum: 1, maximum: 5, error: "คะแนนต้องอยู่ระหว่าง 1-5" }),
  timeValue: t.Integer({ minimum: 1, error: "เวลาต้องมากกว่า 0" }),
  timeUnit: t.Union(
    [
      t.Literal("hour"),
      t.Literal("day"),
      t.Literal("week"),
      t.Literal("month"),
      t.Literal("year"),
    ],
    { error: "หน่วยเวลาไม่ถูกต้อง" }
  ),
  status: t.Optional(ReviewStatusSchema),
});

export const ReviewParams = t.Object({
  id: t.Numeric({ minimum: 1 }),
});
