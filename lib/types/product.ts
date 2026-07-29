/**
 * Type definitions for the `products` JSON fields
 * (Prisma เก็บเป็น Json — TS ต้อง cast เอง)
 */

/** วันที่เปิดขาย — ISO date string "YYYY-MM-DD" */
export type SaleDate = string;

/** ช่วงเวลาขาย — "HH:mm" 24-hour */
export interface TimeSlot {
  start: string; // "17:10"
  end: string;   // "18:08"
}

export interface TopupRound {
  code: string;
  name: string;
  start: string;
  end: string;
  capacity: number;
  enabled: boolean;
  sortOrder: number;
}

export interface SaleSchedule {
  date: string;
  bookingStart: string;
  bookingEnd: string;
  rounds: TopupRound[];
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
  saleSchedules: SaleSchedule[];
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
  saleSchedules?: SaleSchedule[];
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

  const scheduleDates = new Set<string>();
  for (const schedule of input.saleSchedules ?? []) {
    if (!dateRe.test(schedule.date)) {
      return `รูปแบบวันที่ตารางขายไม่ถูกต้อง: ${schedule.date}`;
    }
    if (scheduleDates.has(schedule.date)) {
      return `วันที่ ${schedule.date} ถูกตั้งค่าซ้ำ`;
    }
    scheduleDates.add(schedule.date);
    if (
      !timeRe.test(schedule.bookingStart) ||
      !timeRe.test(schedule.bookingEnd) ||
      schedule.bookingStart >= schedule.bookingEnd
    ) {
      return `ช่วงเวลาเปิดรับจองวันที่ ${schedule.date} ไม่ถูกต้อง`;
    }
    const roundCodes = new Set<string>();
    for (const round of schedule.rounds) {
      const code = round.code.trim();
      if (!code || !round.name.trim()) return "รหัสรอบและชื่อรอบห้ามว่าง";
      if (roundCodes.has(code)) {
        return `รหัสรอบ ${code} ซ้ำในวันที่ ${schedule.date}`;
      }
      roundCodes.add(code);
      if (
        !timeRe.test(round.start) ||
        !timeRe.test(round.end) ||
        round.start >= round.end
      ) {
        return `เวลาของ ${round.name} วันที่ ${schedule.date} ไม่ถูกต้อง`;
      }
      if (!Number.isInteger(round.capacity) || round.capacity < 1) {
        return `จำนวนที่รับของ ${round.name} ต้องอย่างน้อย 1`;
      }
    }
  }

  return null; // ผ่านหมด
}
