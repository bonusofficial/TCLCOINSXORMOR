/**
 * Server-side time helpers — ล็อกเป็น Asia/Bangkok (UTC+7) เสมอ
 *
 * ใช้ฝั่ง server (API routes) เป็น "แหล่งความจริงเดียว" ของเวลา
 * — ไม่เชื่อเวลา/timezone ที่ client ส่งมา (กันผู้ใช้ย้าย timezone เครื่องมากดนอกรอบ)
 * — ประเทศไทยไม่มี DST ออฟเซ็ต +7 คงที่ตลอดปี จึงใช้ shift epoch ได้ปลอดภัย
 */
const TH_OFFSET_MS = 7 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

/** Date ที่ "UTC fields" = เวลาท้องถิ่นไทย (ใช้ดึง field ผ่าน getUTC*) */
function bangkokNow(): Date {
  return new Date(Date.now() + TH_OFFSET_MS);
}

/** วันนี้ตามเวลาไทย — "YYYY-MM-DD" */
export function bangkokToday(): string {
  const d = bangkokNow();
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** เวลาปัจจุบันตามเวลาไทย — "HH:mm" (24 ชม.) */
export function bangkokHHMM(): string {
  const d = bangkokNow();
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/**
 * ช่วงเวลา UTC ของ "วันไทย" ที่กำหนด (YYYY-MM-DD)
 * — booking เก็บ bookingDate เป็นเที่ยงคืน UTC ของวันไทยนั้น
 *   จึงนับ booking ต่อวันด้วยช่วง [00:00:00.000Z, 23:59:59.999Z] ของวันเดียวกัน
 */
export function bangkokDayRangeUTC(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateStr}T00:00:00.000Z`),
    end: new Date(`${dateStr}T23:59:59.999Z`),
  };
}

/** bookingDate ที่จะบันทึก — เที่ยงคืน UTC ของวันไทยที่กำหนด */
export function bangkokDateToUTCMidnight(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Normalize "H:mm" → "HH:mm" เพื่อเทียบ string ได้ถูกต้อง */
export function padHHMM(t: string): string {
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})$/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : String(t).trim();
}
