/**
 * Helper สำหรับ render audit logs ฝั่ง frontend
 */

export const ACTION_LABEL: Record<string, string> = {
  USER_CREATE: "สร้างผู้ใช้",
  USER_UPDATE: "แก้ไขผู้ใช้",
  USER_DELETE: "ลบผู้ใช้",
  USER_ROLE_CHANGE: "เปลี่ยน role",
  USER_PASSWORD_RESET: "รีเซ็ตรหัสผ่าน",
  PRODUCT_CREATE: "เพิ่มสินค้า",
  PRODUCT_UPDATE: "แก้ไขสินค้า",
  PRODUCT_DELETE: "ลบสินค้า",
  BANNER_CREATE: "เพิ่ม banner",
  BANNER_DELETE: "ลบ banner",
  REVIEW_CREATE: "เพิ่มรีวิว",
  REVIEW_UPDATE: "แก้ไขรีวิว",
  REVIEW_DELETE: "ลบรีวิว",
  CONFIG_UPDATE: "แก้ไขการตั้งค่า",
  LOGIN: "เข้าสู่ระบบ",
  LOGOUT: "ออกจากระบบ",
};

export const ENTITY_LABEL: Record<string, string> = {
  user: "ผู้ใช้",
  product: "สินค้า",
  banner: "Banner",
  review: "รีวิว",
  config: "การตั้งค่า",
  session: "เซสชัน",
};

/** สี indicator ตาม action category */
export function actionColor(action: string): {
  bg: string;
  text: string;
  ring: string;
} {
  if (action.startsWith("USER_DELETE") || action.endsWith("_DELETE"))
    return {
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      ring: "ring-rose-500/20",
    };
  if (action.startsWith("USER_CREATE") || action.endsWith("_CREATE"))
    return {
      bg: "bg-brand-green-50",
      text: "text-brand-green",
      ring: "ring-brand-green/20",
    };
  if (action.endsWith("_UPDATE") || action === "USER_ROLE_CHANGE")
    return {
      bg: "bg-amber-50",
      text: "text-amber-600",
      ring: "ring-amber-500/20",
    };
  if (action === "LOGIN" || action === "LOGOUT")
    return {
      bg: "bg-sky-50",
      text: "text-sky-600",
      ring: "ring-sky-500/20",
    };
  return {
    bg: "bg-brand-paper",
    text: "text-brand-ink-soft",
    ring: "ring-brand-green-100",
  };
}

/** Format relative time */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} วินาทีที่แล้ว`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชั่วโมงที่แล้ว`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} วันที่แล้ว`;
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
