import { t } from "elysia";

export const BookingCreateBody = t.Object({
  productId: t.Optional(t.Integer()),
  productCode: t.Optional(t.String()),
  productName: t.String({ minLength: 1, error: "ต้องระบุชื่อสินค้า" }),
  username: t.String({ minLength: 1, error: "ต้องระบุชื่อผู้ใช้" }),
  phone: t.String({ pattern: "^\\d{10}$", error: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก" }),
  recipientFirstName: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  recipientLastName: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  addressLine: t.Optional(t.String({ minLength: 1, maxLength: 1000 })),
  subdistrict: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  district: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  province: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  postalCode: t.Optional(t.String({ pattern: "^\\d{5}$" })),
  topupRoundCode: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
  content: t.Optional(t.String()),
  quantity: t.Optional(t.Integer({ minimum: 1, maximum: 2 })),
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

export const BookingAdminUpdateBody = t.Object({
  status: t.Optional(
    t.Union([
      t.Literal("รอตรวจสอบ"),
      t.Literal("กำลังดำเนินการ"),
      t.Literal("สำเร็จ"),
      t.Literal("ยกเลิก"),
    ])
  ),
  phone: t.Optional(t.String({ pattern: "^\\d{10}$" })),
  recipientFirstName: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  recipientLastName: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  addressLine: t.Optional(t.String({ minLength: 1, maxLength: 1000 })),
  subdistrict: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  district: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  province: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  postalCode: t.Optional(t.String({ pattern: "^\\d{5}$" })),
  content: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()])),
  price: t.Optional(t.Number({ minimum: 0 })),
  cost: t.Optional(t.Number({ minimum: 0 })),
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
