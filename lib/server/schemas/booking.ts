import { t } from "elysia";

export const BookingCreateBody = t.Object({
  productId: t.Optional(t.Integer()),
  productCode: t.Optional(t.String()),
  productName: t.String({ minLength: 1, error: "ต้องระบุชื่อสินค้า" }),
  username: t.String({ minLength: 1, error: "ต้องระบุชื่อผู้ใช้" }),
  phone: t.String({ minLength: 6, maxLength: 30, error: "เบอร์โทรไม่ถูกต้อง" }),
  content: t.Optional(t.String()),
  price: t.Number({ minimum: 0 }),
  bookingDate: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  bookingTime: t.Optional(t.String()),
});

export const BookingStatusBody = t.Object({
  status: t.Union([
    t.Literal("รอตรวจสอบ"),
    t.Literal("กำลังดำเนินการ"),
    t.Literal("สำเร็จ"),
    t.Literal("ยกเลิก"),
  ]),
});

export const BookingParams = t.Object({
  id: t.Numeric({ minimum: 1 }),
});

export const AccountBody = t.Object({
  date: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  description: t.Optional(t.String({ maxLength: 255 })),
  category: t.Union([t.Literal("รายรับ"), t.Literal("รายจ่าย")]),
  income: t.Number({ minimum: 0 }),
  expense: t.Number({ minimum: 0 }),
});

export const AccountParams = t.Object({
  id: t.Numeric({ minimum: 1 }),
});
