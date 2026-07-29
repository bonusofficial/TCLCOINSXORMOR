import { t } from "elysia";

/**
 * Elysia schemas สำหรับ products endpoints
 * (Eden จะ infer type จากนี้ → ฝั่ง client ได้ type-safe ทันที)
 */

const SaleDate = t.String({
  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
  error: "วันที่ต้องเป็น YYYY-MM-DD",
});

const TimeSlot = t.Object({
  start: t.String({ pattern: "^\\d{2}:\\d{2}$", error: "เวลาเริ่มต้องเป็น HH:mm" }),
  end: t.String({ pattern: "^\\d{2}:\\d{2}$", error: "เวลาสิ้นสุดต้องเป็น HH:mm" }),
});

const TopupRound = t.Object({
  code: t.String({ minLength: 1, maxLength: 80 }),
  name: t.String({ minLength: 1, maxLength: 120 }),
  start: t.String({ pattern: "^\\d{2}:\\d{2}$" }),
  end: t.String({ pattern: "^\\d{2}:\\d{2}$" }),
  capacity: t.Integer({ minimum: 1 }),
  enabled: t.Boolean(),
  sortOrder: t.Integer({ minimum: 0 }),
});

const SaleSchedule = t.Object({
  date: SaleDate,
  bookingStart: t.String({ pattern: "^\\d{2}:\\d{2}$" }),
  bookingEnd: t.String({ pattern: "^\\d{2}:\\d{2}$" }),
  rounds: t.Array(TopupRound),
});

export const ProductBody = t.Object({
  image: t.String(),
  name: t.String({ minLength: 1, error: "ต้องระบุชื่อสินค้า" }),
  description: t.String(),

  price: t.Number({ minimum: 0, error: "ราคาทั่วไปต้องไม่ติดลบ" }),
  cost: t.Number({ minimum: 0, error: "ต้นทุนต้องไม่ติดลบ" }),
  agentPrice: t.Number({ minimum: 0, error: "ราคา Agent ต้องไม่ติดลบ" }),

  stockEnabled: t.Boolean(),
  stock: t.Integer({ minimum: 0, error: "สต็อกต้องไม่ติดลบ" }),

  maxPerUserPerDay: t.Optional(t.Integer({ minimum: 0, error: "จำกัดต่อคน/วันต้องไม่ติดลบ" })),

  saleDates: t.Array(SaleDate),
  timeSlots: t.Array(TimeSlot),
  saleSchedules: t.Optional(t.Array(SaleSchedule)),

  discountEligibleUsernames: t.Array(t.String()),
  discountAmount: t.Number({ minimum: 0 }),

  note: t.Optional(t.Union([t.String(), t.Null()])),
});

export const ProductParams = t.Object({
  id: t.Numeric({ minimum: 1 }),
});
