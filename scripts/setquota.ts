/**
 * setquota.ts — ตรวจ/ตั้งค่า "จำกัดการจองต่อคน/วัน" (maxPerUserPerDay) ของสินค้าตรงๆ ใน DB
 *
 * ใช้ตรวจว่าค่าจริงในฐานข้อมูลตรงกับที่ตั้งในหน้าแอดมินไหม (กันกรณีฟอร์มเซฟไม่ติด/แคชค้าง)
 *
 *   # 1) ดูค่าปัจจุบันของทุกสินค้า:
 *   npx tsx scripts/setquota.ts
 *
 *   # 2) ตั้ง limit ของสินค้า id ที่ต้องการ (เช่น สินค้า #17 = 2 แพ็ก/คน/วัน):
 *   npx tsx scripts/setquota.ts 17 2
 *
 *   # 3) ปลดล็อก (ไม่จำกัด):
 *   npx tsx scripts/setquota.ts 17 0
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function list() {
  const ps = await prisma.products.findMany({
    select: { id: true, name: true, maxPerUserPerDay: true },
    orderBy: { id: "asc" },
  });
  console.log("─".repeat(60));
  console.log("  สินค้า — จำกัดการจองต่อคน/วัน (maxPerUserPerDay)");
  console.log("─".repeat(60));
  for (const p of ps) {
    const lim = p.maxPerUserPerDay > 0 ? `${p.maxPerUserPerDay} แพ็ก/คน/วัน` : "ไม่จำกัด";
    console.log(`  #${String(p.id).padEnd(4)} limit=${String(p.maxPerUserPerDay).padEnd(3)} (${lim})  ${p.name}`);
  }
  console.log("─".repeat(60));
  console.log("  ตั้งค่า:  npx tsx scripts/setquota.ts <id> <จำนวน>");
}

async function main() {
  const [idArg, limitArg] = process.argv.slice(2);

  if (idArg === undefined) {
    await list();
    return;
  }

  const id = Number(idArg);
  const limit = Number(limitArg);
  if (!Number.isInteger(id) || id <= 0) {
    console.error("❌ id ไม่ถูกต้อง — ต้องเป็นเลขจำนวนเต็มบวก");
    process.exit(1);
  }
  if (!Number.isInteger(limit) || limit < 0) {
    console.error("❌ จำนวน limit ไม่ถูกต้อง — ต้องเป็น 0 (ไม่จำกัด) หรือจำนวนเต็มบวก");
    process.exit(1);
  }

  const before = await prisma.products.findUnique({
    where: { id },
    select: { name: true, maxPerUserPerDay: true },
  });
  if (!before) {
    console.error(`❌ ไม่พบสินค้า #${id}`);
    process.exit(1);
  }

  await prisma.products.update({
    where: { id },
    data: { maxPerUserPerDay: limit },
  });

  console.log(`✅ #${id} "${before.name}"`);
  console.log(`   limit: ${before.maxPerUserPerDay} → ${limit} ${limit > 0 ? `(${limit} แพ็ก/คน/วัน)` : "(ไม่จำกัด)"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
