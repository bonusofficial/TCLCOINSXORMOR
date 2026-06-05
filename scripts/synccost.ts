/**
 * synccost.ts — Sync ต้นทุน (cost) ของทุก Order (bookings) ให้ตรงกับ
 * "ต้นทุนปัจจุบัน" ของแต่ละแพ็ค (products.cost)
 *
 * ใช้ตอนเพิ่ง "กรอก/แก้ต้นทุนสินค้า" แล้วอยากให้ออเดอร์เดิมที่ยังไม่มีต้นทุน
 * (หรืออยากรีเซ็ตให้ตรงกับต้นทุนล่าสุด) เชื่อมกับต้นทุนปัจจุบันทันที
 * → หน้า finance จะคำนวณกำไรได้ถูกต้อง
 *
 *   # 1) ดูตัวอย่าง (dry-run — ไม่เขียน DB):
 *   npx tsx scripts/synccost.ts
 *
 *   # 2) รันจริง:
 *   SYNC_CONFIRM=yes npx tsx scripts/synccost.ts
 *
 * ENV:
 *   SYNC_CONFIRM=yes       ต้องใส่ถึงจะเขียนจริง (ไม่งั้น dry-run อย่างเดียว)
 *   SYNC_ONLY_MISSING=1    อัปเดตเฉพาะออเดอร์ที่ยังไม่มีต้นทุน (cost = null) — ไม่ทับ snapshot เดิม
 *   SYNC_ONLY_COMPLETED=1  อัปเดตเฉพาะออเดอร์สถานะ "สำเร็จ" (ดีฟอลต์ = ทุกสถานะ)
 *
 * จับคู่ต้นทุน: productId ก่อน → ไม่เจอ fallback ด้วยชื่อสินค้า (เหมือน logic หน้า finance)
 * ออเดอร์ที่อ้างสินค้าที่ถูกลบไปแล้ว (จับคู่ไม่ได้) จะถูกข้าม
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const CONFIRM = process.env.SYNC_CONFIRM === "yes";
const ONLY_MISSING = process.env.SYNC_ONLY_MISSING === "1";
const ONLY_COMPLETED = process.env.SYNC_ONLY_COMPLETED === "1";

/** normalize ชื่อสินค้าให้จับคู่แบบหลวมๆ (ตัดช่องว่างซ้ำ + ตัวพิมพ์เล็ก) */
function nameKey(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

const baht = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function main() {
  const products = await prisma.products.findMany({
    select: { id: true, name: true, cost: true },
  });
  const costById = new Map<number, number>(products.map((p) => [p.id, Number(p.cost)]));
  const costByName = new Map<string, number>();
  for (const p of products) {
    const k = nameKey(p.name);
    if (!costByName.has(k)) costByName.set(k, Number(p.cost));
  }

  const bookings = await prisma.bookings.findMany({
    where: ONLY_COMPLETED ? { status: "สำเร็จ" } : {},
    select: { id: true, bookingCode: true, productId: true, productName: true, cost: true },
    orderBy: { id: "asc" },
  });

  let toUpdate = 0;
  let unmatched = 0;
  let alreadySame = 0;
  let skippedHasCost = 0;
  const preview: string[] = [];

  for (const b of bookings) {
    // โหมด "เฉพาะที่ยังไม่มีต้นทุน" — ข้ามออเดอร์ที่ล็อก cost ไว้แล้ว
    if (ONLY_MISSING && b.cost != null) {
      skippedHasCost++;
      continue;
    }

    const resolved =
      (b.productId != null ? costById.get(b.productId) : undefined) ??
      costByName.get(nameKey(b.productName));

    if (resolved == null) {
      unmatched++;
      continue; // สินค้าถูกลบ — ไม่มีต้นทุนปัจจุบันให้ sync
    }

    const current = b.cost == null ? null : Number(b.cost);
    if (current !== null && current === resolved) {
      alreadySame++;
      continue; // ตรงอยู่แล้ว ไม่ต้องเขียนซ้ำ
    }

    if (preview.length < 15) {
      preview.push(
        `  #${b.bookingCode}  ${b.productName}  ต้นทุน ${current == null ? "—" : baht(current)} → ${baht(resolved)}`
      );
    }

    if (CONFIRM) {
      await prisma.bookings.update({ where: { id: b.id }, data: { cost: resolved } });
    }
    toUpdate++;
  }

  console.log("═".repeat(60));
  console.log(`  Sync ต้นทุน Order ↔ ต้นทุนปัจจุบันของแพ็ค  ${CONFIRM ? "[เขียนจริง]" : "[DRY-RUN]"}`);
  console.log("═".repeat(60));
  console.log(`  สินค้าทั้งหมด        : ${products.length} แพ็ค`);
  console.log(`  ออเดอร์ที่ตรวจ        : ${bookings.length} รายการ${ONLY_COMPLETED ? " (เฉพาะ 'สำเร็จ')" : ""}`);
  console.log(`  ${CONFIRM ? "อัปเดตแล้ว" : "จะอัปเดต"}          : ${toUpdate} รายการ`);
  console.log(`  ตรงอยู่แล้ว (ข้าม)   : ${alreadySame}`);
  if (ONLY_MISSING) console.log(`  มี cost อยู่แล้ว (ข้าม): ${skippedHasCost}`);
  console.log(`  จับคู่สินค้าไม่ได้    : ${unmatched} (สินค้าถูกลบ — sync ไม่ได้)`);
  if (preview.length) {
    console.log("\n  ตัวอย่างที่เปลี่ยน:");
    console.log(preview.join("\n"));
    if (toUpdate > preview.length) console.log(`  ... และอีก ${toUpdate - preview.length} รายการ`);
  }
  console.log("─".repeat(60));
  if (!CONFIRM) {
    console.log("  นี่คือ DRY-RUN ยังไม่ได้เขียน DB");
    console.log("  รันจริง:  SYNC_CONFIRM=yes npx tsx scripts/synccost.ts");
  } else {
    console.log("  ✓ เขียน DB เรียบร้อย");
  }
  console.log("═".repeat(60));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
