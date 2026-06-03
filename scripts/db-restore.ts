/**
 * กู้คืน / Sync ข้อมูลจากไฟล์ backup → ฐานข้อมูลปลายทาง (upsert ตาม id — รันซ้ำได้)
 *
 *   npx tsx scripts/db-restore.ts                       # ใช้ไฟล์ล่าสุดใน ./backups
 *   npx tsx scripts/db-restore.ts backups/backup-XXX.json
 *   # เลือกปลายทางอื่น (เช่นย้ายขึ้น DB ใหม่):
 *   RESTORE_TARGET_URL="mysql://user:pass@host:3306/newdb" npx tsx scripts/db-restore.ts
 *
 * ⚠️ ต้อง `prisma db push` ที่ DB ปลายทางให้มีตารางครบก่อน
 */
import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { MODELS, makeClient, delegate, withoutId, maskUrl } from "./_db-helpers";

function resolveBackupFile(): string {
  const arg = process.argv[2];
  if (arg) return arg;
  const dir = join(process.cwd(), "backups");
  const files = readdirSync(dir)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
    .sort();
  if (files.length === 0) throw new Error("ไม่พบไฟล์ backup ใน ./backups (ระบุ path เป็น argument ได้)");
  return join(dir, files[files.length - 1]); // ล่าสุด
}

async function main() {
  const url = process.env.RESTORE_TARGET_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("ไม่พบ DATABASE_URL (หรือ RESTORE_TARGET_URL) ใน .env");

  const file = resolveBackupFile();
  const parsed = JSON.parse(readFileSync(file, "utf8")) as {
    data: Record<string, Record<string, unknown>[]>;
  };

  console.log(`📥 กู้คืนจาก: ${file}`);
  console.log(`   → ปลายทาง: ${maskUrl(url)}\n`);

  const prisma = makeClient(url);
  try {
    for (const m of MODELS) {
      const rows = parsed.data[m] ?? [];
      let ok = 0;
      for (const row of rows) {
        const id = (row as { id: unknown }).id;
        await delegate(prisma, m).upsert({
          where: { id },
          update: withoutId(row),
          create: row,
        });
        ok++;
      }
      console.log(`  • ${m.padEnd(14)} : ${ok}/${rows.length} แถว`);
    }
    console.log(`\n✓ กู้คืน / Sync เข้า DB ปลายทางสำเร็จ`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("✗ Restore ล้มเหลว:", e);
  process.exit(1);
});
