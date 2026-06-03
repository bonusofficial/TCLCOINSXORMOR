import { prisma } from "@/lib/prisma";

/**
 * "active" status = ยังกินสต็อกอยู่
 * "ยกเลิก" = คืนสต็อก
 */
export function isActiveStatus(status: string): boolean {
  return status !== "ยกเลิก";
}

/**
 * ปรับสต็อกของสินค้า (+ คืน / − ตัด) — เคารพ stockEnabled flag
 * - ถ้า productId เป็น null → ข้าม
 * - ถ้า product ไม่มี stockEnabled → ข้าม
 * - ป้องกัน stock ติดลบ (Math.max 0)
 */
export async function adjustProductStock(
  productId: number | null | undefined,
  delta: number
): Promise<void> {
  if (!productId || delta === 0) return;
  const product = await prisma.products.findUnique({
    where: { id: productId },
    select: { id: true, stockEnabled: true, stock: true },
  });
  if (!product || !product.stockEnabled) return;
  const next = Math.max(0, product.stock + delta);
  await prisma.products.update({
    where: { id: product.id },
    data: { stock: next },
  });
}

/**
 * จอง (ตัด) สต็อก −1 แบบ atomic — กัน oversell เมื่อมีคนกดพร้อมกัน
 * ใช้ UPDATE ... WHERE stock > 0 (เงื่อนไขถูกเช็คในคำสั่งเดียวระดับ DB row)
 * - "skip"  = สินค้าไม่เปิด stockEnabled / ไม่พบ → ไม่ต้องตัด ปล่อยจองได้
 * - "ok"    = ตัดสต็อกสำเร็จ (จองได้)
 * - "out"   = สต็อกหมด (จองไม่ได้)
 */
export async function tryReserveStock(
  productId: number | null | undefined
): Promise<"ok" | "out" | "skip"> {
  if (!productId) return "skip";
  const product = await prisma.products.findUnique({
    where: { id: productId },
    select: { stockEnabled: true },
  });
  if (!product || !product.stockEnabled) return "skip";
  const res = await prisma.products.updateMany({
    where: { id: productId, stockEnabled: true, stock: { gt: 0 } },
    data: { stock: { decrement: 1 } },
  });
  return res.count > 0 ? "ok" : "out";
}

/**
 * ตรวจว่าสินค้ามีสต็อกพอจองหรือไม่
 * - return true ถ้าจองได้ (มีสต็อก หรือไม่ได้เปิด stockEnabled)
 * - return false ถ้าหมด
 */
export async function hasAvailableStock(
  productId: number | null | undefined
): Promise<boolean> {
  if (!productId) return true; // ไม่ผูกกับสินค้า → ปล่อย
  const product = await prisma.products.findUnique({
    where: { id: productId },
    select: { stockEnabled: true, stock: true },
  });
  if (!product) return true;
  if (!product.stockEnabled) return true;
  return product.stock > 0;
}

/**
 * คำนวณ stock delta ตามการเปลี่ยน status
 * - active → cancelled: +1 (คืน)
 * - cancelled → active: -1 (ตัด)
 * - active → active หรือ cancelled → cancelled: 0
 */
export function stockDeltaOnStatusChange(
  oldStatus: string,
  newStatus: string
): number {
  const wasActive = isActiveStatus(oldStatus);
  const willBeActive = isActiveStatus(newStatus);
  if (wasActive && !willBeActive) return 1; // คืน
  if (!wasActive && willBeActive) return -1; // ตัด
  return 0;
}
