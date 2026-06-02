import { t } from "elysia";
import {
  PRODUCT_MAX_SALE_DATES,
  PRODUCT_MAX_TIME_SLOTS,
  PRODUCT_MAX_DISCOUNT_USERS,
} from "@/lib/types/product";

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

export const ProductBody = t.Object({
  image: t.String(),
  name: t.String({ minLength: 1, error: "ต้องระบุชื่อสินค้า" }),
  description: t.String(),

  price: t.Number({ minimum: 0, error: "ราคาทั่วไปต้องไม่ติดลบ" }),
  cost: t.Number({ minimum: 0, error: "ต้นทุนต้องไม่ติดลบ" }),
  agentPrice: t.Number({ minimum: 0, error: "ราคา Agent ต้องไม่ติดลบ" }),

  stockEnabled: t.Boolean(),
  stock: t.Integer({ minimum: 0, error: "สต็อกต้องไม่ติดลบ" }),

  saleDates: t.Array(SaleDate, {
    maxItems: PRODUCT_MAX_SALE_DATES,
    error: `เลือกวันที่ขายได้สูงสุด ${PRODUCT_MAX_SALE_DATES} วัน`,
  }),
  timeSlots: t.Array(TimeSlot, {
    maxItems: PRODUCT_MAX_TIME_SLOTS,
    error: `เพิ่มช่วงเวลาได้สูงสุด ${PRODUCT_MAX_TIME_SLOTS} ช่วง`,
  }),

  discountEligibleUsernames: t.Array(t.String(), {
    maxItems: PRODUCT_MAX_DISCOUNT_USERS,
    error: `กำหนดผู้มีสิทธิ์ได้สูงสุด ${PRODUCT_MAX_DISCOUNT_USERS} คน`,
  }),
  discountAmount: t.Number({ minimum: 0 }),

  note: t.Optional(t.Union([t.String(), t.Null()])),
});

export const ProductParams = t.Object({
  id: t.Numeric({ minimum: 1 }),
});
