/**
 * ค่าเริ่มต้นของเนื้อหาเว็บที่แก้ไขได้ผ่านแอดมิน (config)
 * ใช้เป็น fallback ในหน้าเว็บ และ pre-fill ในหน้า settings
 */

export interface HowItWorksStep {
  title: string;
  desc: string;
}

export const DEFAULT_HOW_IT_WORKS: HowItWorksStep[] = [
  {
    title: "สมัครสมาชิก",
    desc: "สมัครด้วยชื่อผู้ใช้งานในกลุ่มโอเพนแชท หรือสมัครแบบลูกค้าทั่วไปได้ทันที ตัวแทนรับราคาพิเศษถูกกว่าเดิม",
  },
  {
    title: "จองคิว",
    desc: "เลือกวันและเวลา → เลือกแพ็กเกจ → ตรวจสอบ → ยืนยันการจอง แล้วส่งรหัสให้แอดมินทาง LINE Official",
  },
  {
    title: "รอรับเหรียญ",
    desc: "รอแอดมินยืนยัน → ชำระเงิน → ส่งสลิป → รอเติมเหรียญ → ตรวจสอบยอดได้ทันที",
  },
  {
    title: "รีวิวสำเร็จ",
    desc: "เมื่อได้รับเหรียญแล้ว ร่วมแชร์ประสบการณ์ของคุณ เพื่อช่วยให้ผู้ใช้คนอื่นมั่นใจในบริการของเรา",
  },
];

/* ─────────────────────────────────────────────
 * Footer — ลิงก์ + เนื้อหาส่วนท้ายเว็บ (แก้ได้ในแอดมิน)
 * ───────────────────────────────────────────── */
export interface FooterLink {
  label: string;
  url: string;
}

export const DEFAULT_FOOTER_LINKS: FooterLink[] = [
  { label: "หน้าแรกของระบบ", url: "/" },
  { label: "ขั้นตอนการสั่งจองคิว", url: "/#how" },
  { label: "เช็คสถานะสต็อกแพ็กเกจ", url: "/queue" },
];

export const DEFAULT_FOOTER_SERVICES: FooterLink[] = [
  { label: "สิทธิพิเศษสำหรับตัวแทน", url: "/profile/benefits" },
];

/** parse ค่า footer links จาก config (กัน MariaDB JSON คืนเป็น string) */
export function parseFooterLinks(v: unknown): FooterLink[] {
  let arr: unknown = v;
  if (typeof v === "string") {
    try {
      arr = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (x): x is { label?: unknown; url?: unknown } =>
        !!x && typeof x === "object"
    )
    .map((x) => ({
      label: String(x.label ?? ""),
      url: String(x.url ?? ""),
    }))
    .filter((l) => l.label || l.url);
}

/** parse ค่า howItWorks จาก config (กัน MariaDB JSON คืนเป็น string) */
export function parseHowItWorks(v: unknown): HowItWorksStep[] {
  let arr: unknown = v;
  if (typeof v === "string") {
    try {
      arr = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (x): x is { title?: unknown; desc?: unknown } =>
        !!x && typeof x === "object"
    )
    .map((x) => ({
      title: String(x.title ?? ""),
      desc: String(x.desc ?? ""),
    }))
    .filter((s) => s.title || s.desc);
}
