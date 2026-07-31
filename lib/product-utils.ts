import { useEffect, useState } from "react";
import { PublicProduct as QueueProduct } from "@/lib/contexts/PublicDataContext";
import { UserRole } from "@/lib/booking";

/**
 * ทุก helper เกี่ยวกับวัน/เวลา ล็อกเป็น Asia/Bangkok (UTC+7) เสมอ
 * — กัน SSR (server เป็น UTC) คำนวณวันที่/เวลาเพี้ยน
 * — กัน user ที่ตั้ง timezone เครื่องผิด เห็นสถานะไม่ตรงกับ admin
 */
export const todayISO = () => {
  const d = new Date();
  const ICTDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return `${ICTDate.getUTCFullYear()}-${String(ICTDate.getUTCMonth() + 1).padStart(2, "0")}-${String(ICTDate.getUTCDate()).padStart(2, "0")}`;
};

export const currentHHMM = () => {
  const d = new Date();
  const ICTDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return `${String(ICTDate.getUTCHours()).padStart(2, "0")}:${String(ICTDate.getUTCMinutes()).padStart(2, "0")}`;
};

/** Normalize "H:mm" → "HH:mm" เพื่อให้เทียบ string ได้ถูกต้อง (เช่น "9:00" จะมากกว่า "17:44" ถ้าไม่ pad) */
export const padHHMM = (t: string) => {
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})$/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : String(t).trim();
};

/**
 * Re-render ทุก ๆ ช่วง (ดีฟอลต์ 30 วิ) เพื่อให้สถานะเปิด/ปิดตามวัน-เวลา
 * อัปเดตเองแบบ real-time — กันกรณีเปิดหน้าค้างไว้ก่อนถึงรอบขายแล้วสถานะไม่เปลี่ยน
 */
export function useNowTick(intervalMs = 30_000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

export const fmt = (v: string | number) =>
  Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 });

export const fmtThaiDate = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${parseInt(d)} ${months[parseInt(mo) - 1]} ${parseInt(y) + 543}`;
};

function getFirstSlotStart(p: QueueProduct) {
  if (p.saleSchedules.length > 0) {
    return [...p.saleSchedules]
      .sort((a, b) => a.date.localeCompare(b.date))[0]?.bookingStart ?? "";
  }
  const firstSlot = [...p.timeSlots]
    .sort((a, b) => padHHMM(a.start).localeCompare(padHHMM(b.start)))[0];

  return firstSlot ? padHHMM(firstSlot.start) : "";
}

function getUpcomingDateAvailability(p: QueueProduct, saleDates: string[], today: string) {
  const upcoming = [...saleDates].sort().find((d) => d > today);
  if (!upcoming) return null;

  const firstSlotStart =
    p.saleSchedules.find((schedule) => schedule.date === upcoming)
      ?.bookingStart ?? getFirstSlotStart(p);
  return {
    status: "soon" as const,
    label: `เปิดจองวันที่ ${fmtThaiDate(upcoming)}${firstSlotStart ? ` เวลา ${firstSlotStart}` : ""}`,
    message: "ยังไม่ถึงเวลาจอง",
  };
}

export function getProductAvailability(p: QueueProduct): {
  status: "open" | "soon" | "ended" | "outOfStock";
  label: string;
  message?: string;
} {
  if (p.stockEnabled && p.stock <= 0) {
    return { status: "outOfStock", label: "สินค้าหมด" };
  }
  const schedules = p.saleSchedules.length
    ? p.saleSchedules
    : p.saleDates.map((date) => ({
        date,
        bookingStart: p.timeSlots[0]?.start ?? "00:00",
        bookingEnd: p.timeSlots[p.timeSlots.length - 1]?.end ?? "23:59",
        rounds: [],
      }));
  if (!schedules.length) {
    return {
      status: "ended",
      label: "ไม่ระบุวันขาย",
      message: "ปิดจองแล้ว",
    };
  }
  const today = todayISO();
  const now = currentHHMM();
  const saleDates = schedules.map((schedule) => schedule.date.trim());
  const todaySchedule = schedules.find((schedule) => schedule.date === today);
  const isToday = !!todaySchedule;

  if (!isToday) {
    const upcomingAvailability = getUpcomingDateAvailability(p, saleDates, today);
    if (upcomingAvailability) return upcomingAvailability;

    return {
      status: "ended",
      label: "เลยกำหนดจองแล้ว",
      message: "ปิดจองแล้ว",
    };
  }

  // เป็นวันนี้ — เช็ค "ช่วงเวลาเปิดรับจอง" แยกจากรอบเติม
  if (
    todaySchedule &&
    now >= padHHMM(todaySchedule.bookingStart) &&
    now <= padHHMM(todaySchedule.bookingEnd)
  ) {
    return {
      status: "open",
      label: `เปิดรับจอง ${padHHMM(todaySchedule.bookingStart)}–${padHHMM(todaySchedule.bookingEnd)}`,
    };
  }
  if (todaySchedule && padHHMM(todaySchedule.bookingStart) > now) {
    return {
      status: "soon",
      label: `เปิดรับจองวันนี้ เวลา ${padHHMM(todaySchedule.bookingStart)}`,
      message: "ยังไม่ถึงเวลาจอง",
    };
  }

  const upcomingAvailability = getUpcomingDateAvailability(p, saleDates, today);
  if (upcomingAvailability) return upcomingAvailability;

  return {
    status: "ended",
    label: "เลยช่วงเวลาจองแล้ว",
    message: "ปิดจองแล้ว",
  };
}

export function getEffectivePrice(p: QueueProduct, role: UserRole): {
  amount: number;
  isAgent: boolean;
  hasVipDiscount: boolean;
} {
  const isAgent = role === "agent" || role === "admin";
  // สมาชิกยศ VIP ทุกบัญชีได้ราคา VIP อัตโนมัติ
  // ราคา VIP = ราคา Agent - ส่วนลดพิเศษของสินค้า
  const hasVipDiscount = role === "vip";
  const discountAmount = Math.max(0, Number(p.discountAmount) || 0);
  const base =
    isAgent || hasVipDiscount ? Number(p.agentPrice) : Number(p.price);
  const finalPrice = hasVipDiscount ? Math.max(0, base - discountAmount) : base;
  return { amount: finalPrice, isAgent, hasVipDiscount };
}
