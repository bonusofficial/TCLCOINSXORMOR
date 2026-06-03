/**
 * Sync ข้อมูลจากฐานข้อมูลต้นทาง (เก่า) → ปลายทาง (ใหม่) โดยตรง — upsert ตาม id (รันซ้ำได้)
 *
 *   SOURCE_DATABASE_URL="mysql://user:pass@oldhost:3306/olddb" \
 *   TARGET_DATABASE_URL="mysql://user:pass@newhost:3306/newdb" \
 *   npx tsx scripts/db-sync.ts
 *
 *   # ถ้าไม่ตั้ง TARGET_DATABASE_URL จะใช้ DATABASE_URL ใน .env เป็นปลายทาง
 *
 * ⚠️ ต้อง `prisma db push` ที่ DB ปลายทางให้มีตารางครบก่อน
 */
import "dotenv/config";
import { MODELS, makeClient, delegate, withoutId, maskUrl } from "./_db-helpers";

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;

  if (!sourceUrl) throw new Error("ต้องตั้ง SOURCE_DATABASE_URL (ฐานข้อมูลต้นทาง/เก่า)");
  if (!targetUrl) throw new Error("ไม่พบ TARGET_DATABASE_URL หรือ DATABASE_URL (ปลายทาง)");
  if (sourceUrl === targetUrl)
    throw new Error("ต้นทางและปลายทางต้องไม่ใช่ฐานข้อมูลเดียวกัน");

  console.log(`🔄 Sync ข้อมูล`);
  console.log(`   ต้นทาง : ${maskUrl(sourceUrl)}`);
  console.log(`   ปลายทาง: ${maskUrl(targetUrl)}\n`);

  const source = makeClient(sourceUrl);
  const target = makeClient(targetUrl);
  try {
    let grand = 0;
    for (const m of MODELS) {
      const rows = await delegate(source, m).findMany();
      let ok = 0;
      for (const row of rows) {
        const id = (row as { id: unknown }).id;
        await delegate(target, m).upsert({
          where: { id },
          update: withoutId(row),
          create: row,
        });
        ok++;
      }
      grand += ok;
      console.log(`  • ${m.padEnd(14)} : ${ok}/${rows.length} แถว`);
    }
    console.log(`\n✓ Sync สำเร็จ (${grand} แถว) ต้นทาง → ปลายทาง`);
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

main().catch((e) => {
  console.error("✗ Sync ล้มเหลว:", e);
  process.exit(1);
});
