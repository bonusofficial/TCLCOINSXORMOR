import { useEffect, useState } from "react";
import { PublicProduct as QueueProduct } from "@/lib/contexts/PublicDataContext";
import { UserRole } from "@/lib/booking";

/**
 * ทุก helper เกี่ยวกับวัน/เวลา ล็อกเป็น Asia/Bangkok (UTC+7) เสมอ
 * — กัน SSR (server เป็น UTC) คำนวณวันที่/เวลาเพี้ยน
 * — กัน user ที่ตั้ง timezone เครื่องผิด เห็นสถานะไม่ตรงกับ admin
 */
const TH_TZ = "Asia/Bangkok";

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

export function getProductAvailability(p: QueueProduct): {
  status: "open" | "soon" | "ended" | "outOfStock";
  label: string;
  message?: string;
} {
  if (p.stockEnabled && p.stock <= 0) {
    return { status: "outOfStock", label: "สินค้าหมด" };
  }
  if (!p.saleDates.length) {
    return { status: "ended", label: "ไม่ระบุวันขาย" };
  }
  const today = todayISO();
  const now = currentHHMM();
  const saleDates = p.saleDates.map((d) => d.trim());
  const isToday = saleDates.includes(today);

  if (!isToday) {
    const upcoming = [...saleDates].sort().find((d) => d >= today);
    if (upcoming && upcoming > today) {
      return {
        status: "soon",
        label: "เปิดจองวันที่ " + fmtThaiDate(upcoming),
      };
    }
    return { status: "ended", label: "ปิดรับแล้ว" };
  }

  // เป็นวันนี้ — เช็คเวลา (pad ก่อนเทียบ string เสมอ)
  const activeSlot = p.timeSlots.find(
    (s) => now >= padHHMM(s.start) && now <= padHHMM(s.end)
  );
  if (activeSlot) {
    return { status: "open", label: "เปิดจองอยู่" };
  }
  // หา slot ถัดไป
  const upcomingSlot = p.timeSlots
    .filter((s) => padHHMM(s.start) > now)
    .sort((a, b) => padHHMM(a.start).localeCompare(padHHMM(b.start)))[0];
  if (upcomingSlot) {
    return {
      status: "soon",
      label: `เปิด ${padHHMM(upcomingSlot.start)}`,
      message: "ยังไม่ถึงเวลาจอง",
    };
  }
  return {
    status: "ended",
    label: "หมดช่วงเวลาจองวันนี้",
    message: "ไม่อยู่ในช่วงเวลาจอง",
  };
}

export function getEffectivePrice(p: QueueProduct, role: UserRole, username: string | null): {
  amount: number;
  isAgent: boolean;
  hasVipDiscount: boolean;
} {
  const isAgent = role === "agent" || role === "admin";
  const base = isAgent ? Number(p.agentPrice) : Number(p.price);
  const u = (username ?? "").toLowerCase().trim();
  const hasVipDiscount =
    u !== "" && p.discountEligibleUsernames.map((x) => x.toLowerCase()).includes(u);
  const finalPrice = hasVipDiscount ? Math.max(0, base - Number(p.discountAmount)) : base;
  return { amount: finalPrice, isAgent, hasVipDiscount };
}
