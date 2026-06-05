import { prisma } from "@/lib/prisma";

/** อ่าน Json (string[] หรือ JSON string) ให้เป็น string[] เสมอ */
function toStrArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * เปลี่ยนชื่อผู้ใช้ในลิสต์ "สมาชิกที่มีสิทธิ์ได้รับส่วนลดพิเศษ" ของทุกสินค้า
 * ให้ตามชื่อใหม่อัตโนมัติ — เทียบแบบไม่สนตัวพิมพ์เล็ก/ใหญ่ และตัด entry ซ้ำออก
 * คืนค่า: จำนวนสินค้าที่ถูกอัปเดต
 *
 * ใช้ตอน "ลูกค้า/แอดมินเปลี่ยน username" เพื่อให้สิทธิ์ส่วนลดติดตามผู้ใช้ไปด้วย
 * (ไม่ต้องมาแก้ลิสต์หลังบ้านเองทุกครั้ง)
 */
export async function renameDiscountEligibleUsername(
  oldUsername: string,
  newUsername: string
): Promise<number> {
  const oldU = (oldUsername ?? "").trim();
  const newU = (newUsername ?? "").trim();
  if (!oldU || !newU || oldU.toLowerCase() === newU.toLowerCase()) return 0;

  const products = await prisma.products.findMany({
    select: { id: true, discountEligibleUsernames: true },
  });

  let updatedCount = 0;
  for (const p of products) {
    const list = toStrArr(p.discountEligibleUsernames);
    if (!list.some((u) => u.trim().toLowerCase() === oldU.toLowerCase())) continue;

    // แทนชื่อเก่า→ใหม่ แล้ว dedupe (case-insensitive) คงลำดับเดิมไว้
    const seen = new Set<string>();
    const next: string[] = [];
    for (const u of list) {
      const replaced = u.trim().toLowerCase() === oldU.toLowerCase() ? newU : u;
      const key = replaced.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      next.push(replaced);
    }

    await prisma.products.update({
      where: { id: p.id },
      data: { discountEligibleUsernames: next },
    });
    updatedCount++;
  }
  return updatedCount;
}
