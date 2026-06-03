/**
 * Booking helpers — shared client/server
 */

export type BookingPrefix = "MB" | "AG" | "ADM";
export type UserRole = "member" | "agent" | "admin";

export const BOOKING_STATUSES = [
  "รอตรวจสอบ",
  "กำลังดำเนินการ",
  "สำเร็จ",
  "ยกเลิก",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Map role → booking code prefix */
export function bookingPrefix(role: UserRole | string | null | undefined): BookingPrefix {
  const r = (role ?? "").toLowerCase().trim();
  if (r === "admin") return "ADM";
  if (r === "agent") return "AG";
  return "MB";
}

/** Build DDMMYYYY portion from Date */
function dateSlug(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`;
}

/** Random 4-digit string */
function random4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Generate booking code — รูปแบบใหม่:
 *   MB-DDMMYYYY-XXXX  (ลูกค้าทั่วไป)
 *   AG-DDMMYYYY-XXXX  (ตัวแทน)
 *   ADM-DDMMYYYY-XXXX (แอดมิน)
 */
export function generateBookingCode(
  role: UserRole | string | null | undefined,
  date: Date = new Date()
): string {
  return `${bookingPrefix(role)}-${dateSlug(date)}-${random4()}`;
}

/** Display styling per status */
export function statusStyle(status: string): {
  emoji: string;
  label: string;
  bg: string;
  text: string;
  ring: string;
} {
  switch (status) {
    case "รอตรวจสอบ":
      return {
        emoji: "🟡",
        label: "รอตรวจสอบ",
        bg: "bg-amber-50",
        text: "text-amber-700",
        ring: "ring-amber-500/30",
      };
    case "กำลังดำเนินการ":
      return {
        emoji: "🔵",
        label: "กำลังดำเนินการ",
        bg: "bg-sky-50",
        text: "text-sky-700",
        ring: "ring-sky-500/30",
      };
    case "สำเร็จ":
      return {
        emoji: "✅",
        label: "สำเร็จ",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        ring: "ring-emerald-500/30",
      };
    case "ยกเลิก":
      return {
        emoji: "🔴",
        label: "ยกเลิก",
        bg: "bg-rose-500/10",
        text: "text-rose-400",
        ring: "ring-rose-500/30",
      };
    default:
      return {
        emoji: "⚪",
        label: status,
        bg: "bg-brand-paper",
        text: "text-brand-ink-soft",
        ring: "ring-brand-green-100",
      };
  }
}

/** Format datetime → "28/05/2026 14:32" Thai locale */
export function formatBookingDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())} น.`;
}
