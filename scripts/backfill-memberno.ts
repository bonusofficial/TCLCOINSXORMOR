/**
 * Backfill memberNo ให้ผู้ใช้เก่าที่ยังเป็น null — เรียงตามวันสมัคร (createdAt)
 * รันครั้งเดียว:  npx tsx scripts/backfill-memberno.ts
 * - idempotent: เซ็ตเฉพาะที่ยัง null และนับต่อจาก memberNo สูงสุดที่มีอยู่
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const pending = await prisma.user.findMany({
    where: { memberNo: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });

  const last = await prisma.user.findFirst({
    where: { memberNo: { not: null } },
    orderBy: { memberNo: "desc" },
    select: { memberNo: true },
  });

  let n = last?.memberNo ?? 0;
  if (pending.length === 0) {
    console.log(`✓ ไม่มีผู้ใช้ที่ต้อง backfill (memberNo สูงสุดปัจจุบัน = ${n})`);
    return;
  }

  for (const u of pending) {
    n++;
    await prisma.user.update({ where: { id: u.id }, data: { memberNo: n } });
    console.log(`  OMTC-${String(n).padStart(5, "0")}  ←  ${u.email}`);
  }
  console.log(`✓ Backfill สำเร็จ ${pending.length} ราย (ถึง OMTC-${String(n).padStart(5, "0")})`);
}

main()
  .catch((e) => {
    console.error("✗ Backfill ล้มเหลว:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
