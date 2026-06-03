/**
 * Type definitions for the `products` JSON fields
 * (Prisma เก็บเป็น Json — TS ต้อง cast เอง)
 *
 * Constraint: max 8 items per array (บังคับฝั่ง app)
 */

export const PRODUCT_MAX_TIME_SLOTS = 8;

/** วันที่เปิดขาย — ISO date string "YYYY-MM-DD" */
export type SaleDate = string;

/** ช่วงเวลาขาย — "HH:mm" 24-hour */
export interface TimeSlot {
  start: string; // "17:10"
  end: string;   // "18:08"
}

/** Username ของผู้ได้รับส่วนลดพิเศษ */
export type DiscountUsername = string;

/**
 * Full product shape (parsed from DB)
 * — ใช้กับ Prisma return value ที่ cast JSON fields แล้ว
 */
export interface ProductParsed {
  id: number;
  image: string;
  name: string;
  description: string;
  price: string;            // Prisma Decimal → string ใน JSON
  cost: string;
  agentPrice: string;
  stockEnabled: boolean;
  stock: number;
  maxPerUserPerDay: number;
  saleDates: SaleDate[];
  timeSlots: TimeSlot[];
  discountEligibleUsernames: DiscountUsername[];
  discountAmount: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input shape — สำหรับ create/update
 */
export interface ProductInput {
  image: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  agentPrice: number;
  stockEnabled: boolean;
  stock: number;
  maxPerUserPerDay?: number;
  saleDates: SaleDate[];
  timeSlots: TimeSlot[];
  discountEligibleUsernames: DiscountUsername[];
  discountAmount: number;
  note?: string | null;
}

/**
 * Validators — ใช้ใน Elysia route หรือ server action
 */
export function validateProductInput(input: ProductInput): string | null {
  if (!input.name.trim()) return "ต้องระบุชื่อสินค้า";
  if (input.price < 0) return "ราคาทั่วไปต้องไม่ติดลบ";
  if (input.cost < 0) return "ต้นทุนต้องไม่ติดลบ";
  if (input.agentPrice < 0) return "ราคา Agent ต้องไม่ติดลบ";
  if (input.stock < 0) return "จำนวนสต็อกต้องไม่ติดลบ";
  if (input.discountAmount < 0) return "ส่วนลดต้องไม่ติดลบ";

  if (input.timeSlots.length > PRODUCT_MAX_TIME_SLOTS) {
    return `เพิ่มช่วงเวลาได้สูงสุด ${PRODUCT_MAX_TIME_SLOTS} ช่วง`;
  }

  // Validate time format + start < end
  const timeRe = /^\d{2}:\d{2}$/;
  for (const s of input.timeSlots) {
    if (!timeRe.test(s.start) || !timeRe.test(s.end)) {
      return "รูปแบบเวลาต้องเป็น HH:mm (เช่น 17:10)";
    }
    if (s.start >= s.end) {
      return `ช่วงเวลา ${s.start}–${s.end} เริ่มต้องน้อยกว่าสิ้นสุด`;
    }
  }

  // Validate date format
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  for (const d of input.saleDates) {
    if (!dateRe.test(d)) return `รูปแบบวันที่ต้องเป็น YYYY-MM-DD (พบ: ${d})`;
  }

  return null; // ผ่านหมด
}
