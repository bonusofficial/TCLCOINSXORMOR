/**
 * สำรองฐานข้อมูล (Backup) → ไฟล์ JSON ใน ./backups/
 *
 *   npx tsx scripts/db-backup.ts
 *   # หรือสำรองจาก DB อื่น:
 *   BACKUP_SOURCE_URL="mysql://user:pass@host:3306/dbname" npx tsx scripts/db-backup.ts
 */
import "dotenv/config";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { MODELS, makeClient, delegate, timestamp, maskUrl } from "./_db-helpers";

async function main() {
  const url = process.env.BACKUP_SOURCE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("ไม่พบ DATABASE_URL (หรือ BACKUP_SOURCE_URL) ใน .env");

  console.log(`📦 เริ่มสำรองข้อมูลจาก: ${maskUrl(url)}\n`);
  const prisma = makeClient(url);
  try {
    const data: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};
    for (const m of MODELS) {
      const rows = await delegate(prisma, m).findMany();
      data[m] = rows;
      counts[m] = rows.length;
      console.log(`  • ${m.padEnd(14)} : ${rows.length} แถว`);
    }

    const dir = join(process.cwd(), "backups");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `backup-${timestamp()}.json`);
    const payload = {
      meta: {
        createdAt: new Date().toISOString(),
        database: maskUrl(url),
        models: MODELS,
        counts,
      },
      data,
    };
    writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");

    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    console.log(`\n✓ สำรองข้อมูลสำเร็จ (${total} แถว) → ${file}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("✗ Backup ล้มเหลว:", e);
  process.exit(1);
});
