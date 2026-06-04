/**
 * Migrate ข้อมูลจากระบบเก่า (Laravel SQL dump) → schema ใหม่ (Prisma relational/JSON)
 *
 *   # 1) ดูตัวอย่าง (dry-run — ไม่เขียน DB):
 *   npx tsx scripts/migrate-legacy.ts /path/to/old.sql
 *   npx tsx scripts/migrate-legacy.ts /path/to/old.sql.zip
 *
 *   # 2) รันจริง (ล้างตารางที่เกี่ยวข้องใน DB ปลายทาง แล้ว import ใหม่):
 *   MIGRATE_CONFIRM=yes npx tsx scripts/migrate-legacy.ts /path/to/old.sql
 *
 * ENV:
 *   MIGRATE_TARGET_URL  ปลายทาง (ดีฟอลต์ = DATABASE_URL ใน .env)
 *   MIGRATE_CONFIRM     ต้อง = "yes" ถึงจะเขียนจริง (ไม่งั้น dry-run)
 *   MIGRATE_WIPE_ALL    "1" = ล้าง banners/reviews/audit_logs ด้วย (ดีฟอลต์เก็บไว้)
 *   MIGRATE_SKIP_CONFIG "1" = เก็บ config ปัจจุบันไว้ ไม่ import settings จาก legacy
 *   MIGRATE_ALIAS_SQL_FILE path ไฟล์ SQL/ZIP รุ่นก่อนหน้า ใช้ map ชื่อเก่าจาก email เดียวกัน
 *
 * การแปลงหลัก:
 *   - products + product_dates + time_slots → products (saleDates/timeSlots เป็น JSON)
 *   - users (Laravel) → User + Account(credential, bcrypt) · gen memberNo ใหม่ · login ด้วย email
 *   - settings → config (howItWorks, announce*)
 *   - account(รายรับ/รายจ่าย) → accounts · bookings → bookings (map productId จาก product_code)
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { execFileSync } from "child_process";
import { makeClient } from "./_db-helpers";

/* ───────── SQL dump parser (รูปแบบ mysqldump: INSERT INTO `t` VALUES (...),(...);) ───────── */
type Cell = string | number | null;

function parseRows(sql: string, startIndex: number): { rows: Cell[][]; end: number } {
  let i = startIndex;
  const rows: Cell[][] = [];
  let row: Cell[] | null = null;
  let field = "";
  let inString = false;
  let inField = false;
  let isStr = false;

  const flush = () => {
    if (!inField || !row) return;
    let v: Cell;
    if (isStr) v = field;
    else {
      const t = field.trim();
      v = t === "NULL" || t === "" ? null : /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : t;
    }
    row.push(v);
    field = "";
    inField = false;
    isStr = false;
  };

  for (; i < sql.length; i++) {
    const c = sql[i];
    if (inString) {
      if (c === "\\") {
        const n = sql[++i];
        field += n === "n" ? "\n" : n === "r" ? "\r" : n === "t" ? "\t" : n === "0" ? "\0" : n;
      } else if (c === "'") {
        inString = false;
      } else field += c;
      continue;
    }
    if (c === "'") { inString = true; inField = true; isStr = true; continue; }
    if (c === "(") { row = []; continue; }
    if (c === ")") { flush(); if (row) rows.push(row); row = null; continue; }
    if (c === ",") { if (row) flush(); continue; }
    if (c === ";") break; // จบ statement
    if (/\s/.test(c)) { if (inField && !isStr) field += c; continue; }
    inField = true;
    field += c;
  }
  return { rows, end: i };
}

function parseInsert(sql: string, table: string, expectedCols: string[]): Cell[][] {
  const inserts = new RegExp(
    `INSERT\\s+INTO\\s+\`${table}\`\\s*(?:\\(([^)]*)\\)\\s*)?VALUES`,
    "gi"
  );
  const rows: Cell[][] = [];
  let match: RegExpExecArray | null;

  while ((match = inserts.exec(sql))) {
    const statementCols = match[1]
      ? Array.from(match[1].matchAll(/`([^`]+)`/g), (m) => m[1])
      : expectedCols;
    const parsed = parseRows(sql, inserts.lastIndex);

    for (const row of parsed.rows) {
      rows.push(
        expectedCols.map((col) => {
          const idx = statementCols.indexOf(col);
          return idx >= 0 ? row[idx] ?? null : null;
        })
      );
    }

    inserts.lastIndex = parsed.end + 1;
  }

  return rows;
}

function toObjects(rows: Cell[][], cols: string[]): Record<string, Cell>[] {
  return rows.map((r) => {
    const o: Record<string, Cell> = {};
    cols.forEach((c, idx) => (o[c] = r[idx] ?? null));
    return o;
  });
}

function readSqlDump(file: string): string {
  if (!file.toLowerCase().endsWith(".zip")) return readFileSync(file, "utf8");

  try {
    return execFileSync("unzip", ["-p", file], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(
      `อ่านไฟล์ zip ไม่สำเร็จ: ${file} (ต้องมีคำสั่ง unzip ในเครื่อง/server)`,
      { cause: error }
    );
  }
}

/* ───────── helpers ───────── */
function toDate(v: Cell): Date | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T00:00:00Z");
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return new Date(s.replace(" ", "T") + "Z");
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
const str = (v: Cell): string => (v == null ? "" : String(v));
const num = (v: Cell): number => (v == null ? 0 : Number(v));
const hhmm = (v: Cell): string => str(v).slice(0, 5); // "23:00:00" → "23:00"
const capRole = (lv: Cell): string => {
  const v = str(lv).toLowerCase();
  return v === "admin" ? "Admin" : v === "agent" ? "Agent" : "Member";
};
function normalizeIdentity(v: Cell | string | null | undefined): string {
  return str(v ?? "").trim().toLowerCase();
}
/** key หลวม — ตัดคำร้าน (coinsbyormor/byormor/coins/ormor) + อักขระคั่น/ช่องว่าง
 *  เพื่อจับชื่อที่ลูกค้าพิมพ์ต่างรูปแบบ (เช่น "คริสตินา|ByOrmor-62" ↔ "คริสตินา-coinsbyormor-62") */
function coreKey(v: Cell | string | null | undefined): string {
  return str(v ?? "")
    .toLowerCase()
    .replace(/coinsbyormor|byormor|coins|ormor/g, "")
    .replace(/[^a-z0-9฀-๿]+/g, "");
}
/** เลขท้ายชื่อ (รหัสลูกค้าในกลุ่ม OpenChat) — ใช้ match สำรองเมื่อชื่อเพี้ยน */
function numKey(v: Cell | string | null | undefined): string {
  const m = str(v ?? "").match(/(\d+)\D*$/);
  return m ? m[1] : "";
}
function rememberLegacyUserIdentity(
  map: Map<string, string>,
  uid: string,
  values: Array<Cell | string | null | undefined>
) {
  for (const value of values) {
    const key = normalizeIdentity(value);
    if (key && !map.has(key)) map.set(key, uid);
  }
}
function makeUniqueUsername(
  u: Record<string, Cell>,
  fallbackNo: number,
  used: Set<string>
): string {
  const candidates = [
    str(u.name).trim(),
    str(u.users_code).trim(),
    str(u.email).split("@")[0]?.trim() ?? "",
    `user-${fallbackNo}`,
  ];
  const raw = candidates.find((x) => x.length >= 3) ?? `user-${fallbackNo}`;
  const base = raw.slice(0, 180);
  let username = base;
  let suffix = 1;

  while (used.has(username)) {
    const tail = `-${suffix++}`;
    username = `${base.slice(0, 180 - tail.length)}${tail}`;
  }

  used.add(username);
  return username;
}
function parseDiscountUsers(v: Cell): string[] {
  const s = str(v).trim();
  if (!s) return [];
  try {
    const j = JSON.parse(s);
    if (Array.isArray(j)) return j.map((x) => String(x)).filter(Boolean);
  } catch {
    /* not json */
  }
  return s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
}

/* ───────── column orders (ตามลำดับใน CREATE TABLE) ───────── */
const COLS = {
  users: ["id", "users_code", "name", "email", "phone", "shop_name", "line_id", "email_verified_at", "password", "level", "remember_token", "created_at", "updated_at"],
  products: ["id", "product_code", "product_name", "main_price", "agent_price", "stock", "status", "date", "created_at", "updated_at", "note", "discount_users", "discount_amount"],
  product_dates: ["id", "product_id", "date", "created_at", "updated_at"],
  time_slots: ["id", "product_id", "start_time", "end_time", "is_available", "created_at", "updated_at"],
  bookings: ["id", "product_code", "booking_code", "username", "product_name", "content", "price", "status", "booking_date", "booking_time", "created_at", "updated_at"],
  account: ["id", "date", "description", "category", "income", "expense", "created_at", "updated_at"],
  settings: ["id", "logo", "qr_code", "site_name", "description", "website_url", "warning_text", "maintenance_mode", "facebook", "line", "popup_image", "popup_title", "popup_desc", "step_1_icon", "step_1_title", "step_1_desc", "step_2_icon", "step_2_title", "step_2_desc", "step_3_icon", "step_3_title", "step_3_desc", "step_4_icon", "step_4_title", "step_4_desc", "created_at", "updated_at"],
};

async function main() {
  const file = process.argv[2] || process.env.LEGACY_SQL_FILE;
  if (!file) throw new Error("ระบุ path ไฟล์ .sql/.zip เป็น argument (หรือ LEGACY_SQL_FILE)");
  const confirm = process.env.MIGRATE_CONFIRM === "yes";
  const targetUrl = process.env.MIGRATE_TARGET_URL || process.env.DATABASE_URL;
  const aliasFile = process.env.MIGRATE_ALIAS_SQL_FILE || process.env.LEGACY_ALIAS_SQL_FILE;
  if (!targetUrl) throw new Error("ไม่พบ DATABASE_URL (หรือ MIGRATE_TARGET_URL)");

  const sql = readSqlDump(file);
  const aliasSql = aliasFile ? readSqlDump(aliasFile) : "";

  const users = toObjects(parseInsert(sql, "users", COLS.users), COLS.users);
  const products = toObjects(parseInsert(sql, "products", COLS.products), COLS.products);
  const pdates = toObjects(parseInsert(sql, "product_dates", COLS.product_dates), COLS.product_dates);
  const slots = toObjects(parseInsert(sql, "time_slots", COLS.time_slots), COLS.time_slots);
  const bookings = toObjects(parseInsert(sql, "bookings", COLS.bookings), COLS.bookings);
  const account = toObjects(parseInsert(sql, "account", COLS.account), COLS.account);
  const settings = toObjects(parseInsert(sql, "settings", COLS.settings), COLS.settings);
  const aliasUsers = aliasSql
    ? toObjects(parseInsert(aliasSql, "users", COLS.users), COLS.users)
    : [];
  const aliasValuesByEmail = new Map<string, Array<Cell | string | null | undefined>>();
  for (const u of aliasUsers) {
    const email = normalizeIdentity(u.email);
    if (!email) continue;
    const aliases = aliasValuesByEmail.get(email) ?? [];
    aliases.push(u.name, u.users_code, u.shop_name, u.line_id);
    aliasValuesByEmail.set(email, aliases);
  }

  console.log(`📄 อ่านไฟล์: ${file}`);
  console.log(`   users=${users.length} products=${products.length} product_dates=${pdates.length} time_slots=${slots.length} bookings=${bookings.length} account=${account.length} settings=${settings.length}\n`);
  if (aliasFile) {
    console.log(`🔗 alias users: ${aliasUsers.length} แถว จาก ${aliasFile}\n`);
  }

  // ── เตรียมข้อมูลฝั่งใหม่ ──
  // products: รวม dates + slots
  const datesByProduct = new Map<number, string[]>();
  for (const d of pdates) {
    const pid = num(d.product_id);
    const arr = datesByProduct.get(pid) ?? [];
    arr.push(str(d.date).slice(0, 10));
    datesByProduct.set(pid, arr);
  }
  const slotsByProduct = new Map<number, { start: string; end: string }[]>();
  for (const s of slots) {
    const pid = num(s.product_id);
    const arr = slotsByProduct.get(pid) ?? [];
    arr.push({ start: hhmm(s.start_time), end: hhmm(s.end_time) });
    slotsByProduct.set(pid, arr);
  }
  // map product_code → product id (สำหรับ bookings)
  const codeToProductId = new Map<string, number>();
  for (const p of products) codeToProductId.set(str(p.product_code), num(p.id));

  // users → memberNo ใหม่ (เรียงตาม id เก่า) + ตัด email ซ้ำ (กัน unique ชน)
  const seenEmail = new Set<string>();
  const sortedUsers = [...users]
    .sort((a, b) => num(a.id) - num(b.id))
    .filter((u) => {
      const e = str(u.email).toLowerCase().trim();
      if (!e || seenEmail.has(e)) return false;
      seenEmail.add(e);
      return true;
    });

  // bookings → ตัด booking_code ซ้ำ (กัน unique ชน)
  const seenCode = new Set<string>();
  const uniqueBookings = bookings.filter((b) => {
    const c = str(b.booking_code).trim();
    if (!c || seenCode.has(c)) return false;
    seenCode.add(c);
    return true;
  });

  if (!confirm) {
    console.log("🔍 DRY RUN (ยังไม่เขียน DB) — ตัวอย่างผลลัพธ์:");
    const p0 = products[0];
    if (p0)
      console.log(`   product#${str(p0.id)} "${str(p0.product_name)}" → saleDates=${(datesByProduct.get(num(p0.id)) ?? []).length} วัน, timeSlots=${(slotsByProduct.get(num(p0.id)) ?? []).length} ช่วง`);
    const u0 = sortedUsers[0];
    if (u0)
      console.log(`   user "${str(u0.email)}" → username="${str(u0.name).trim() || str(u0.users_code).trim()}", memberNo=1 (OMTC-00001), role=${capRole(u0.level)}, bcrypt ${str(u0.password).slice(0, 7)}`);
    console.log(`\n   จะเขียน: config=${settings[0] ? 1 : 0}, user=${sortedUsers.length}, account(auth)=${sortedUsers.length}, products=${products.length}, accounts(การเงิน)=${account.length}, bookings=${uniqueBookings.length}`);
    const aliasEnv = aliasFile ? `MIGRATE_ALIAS_SQL_FILE="${aliasFile}" ` : "";
    console.log(`\n👉 รันจริงแบบ import settings ด้วย:  ${aliasEnv}MIGRATE_CONFIRM=yes npx tsx scripts/migrate-legacy.ts "${file}"`);
    console.log(`👉 รันจริงแบบเก็บ config เดิมไว้: ${aliasEnv}MIGRATE_CONFIRM=yes MIGRATE_SKIP_CONFIG=1 npx tsx scripts/migrate-legacy.ts "${file}"`);
    return;
  }

  // ── รันจริง ──
  const prisma = makeClient(targetUrl);
  const wipeAll = process.env.MIGRATE_WIPE_ALL === "1";
  const skipConfig = process.env.MIGRATE_SKIP_CONFIG === "1"; // เก็บ config ปัจจุบันไว้ (ไม่ทับด้วย settings เก่า)
  try {
    console.log("🧹 ล้างตารางปลายทาง..." + (skipConfig ? " (เก็บ config เดิมไว้)" : ""));
    // FK-safe: ลบ child (session/account) ก่อน user
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.bookings.deleteMany({});
    await prisma.accounts.deleteMany({});
    await prisma.products.deleteMany({});
    if (!skipConfig) await prisma.config.deleteMany({});
    await prisma.user.deleteMany({});
    if (wipeAll) {
      await prisma.reviews.deleteMany({});
      await prisma.banners.deleteMany({});
      await prisma.audit_logs.deleteMany({});
      await prisma.verification.deleteMany({});
      console.log("   (ล้าง reviews/banners/audit_logs ด้วย)");
    } else {
      console.log("   (เก็บ reviews/banners/audit_logs ไว้ — ใช้ MIGRATE_WIPE_ALL=1 ถ้าต้องการล้างด้วย)");
    }

    // config (จาก settings แถวแรก) — ข้ามถ้า MIGRATE_SKIP_CONFIG=1 (เก็บ config ปัจจุบันไว้)
    const st = settings[0];
    if (!skipConfig && st) {
      const steps = [1, 2, 3, 4]
        .map((n) => ({ title: str(st[`step_${n}_title`]), desc: str(st[`step_${n}_desc`]) }))
        .filter((s) => s.title || s.desc);
      await prisma.config.create({
        data: {
          logo: str(st.logo),
          title: str(st.site_name) || "ORMOR TOPUP COINS",
          description: str(st.description),
          keywords: "",
          agentLink: "",
          contactLine: str(st.line),
          phone: "",
          qrcodenormal: str(st.qr_code),
          qrcodeagent: str(st.qr_code),
          qrcodesupport: "",
          warningMessage: str(st.warning_text),
          agentPrivileges: "",
          lineGroupNormal: "",
          lineGroupAgent: "",
          welcomeTitle: str(st.popup_title),
          welcomeAgentDesc: "",
          welcomeMemberDesc: "",
          howItWorks: steps,
          termsContent: "",
          privacyContent: "",
          reviewLink: "",
          announceEnabled: !!(str(st.popup_title) || str(st.popup_desc)),
          announceBanner: str(st.popup_image),
          announceBadge: "",
          announceTitle: str(st.popup_title),
          announceContent: str(st.popup_desc),
          marqueeText: "",
          footerFacebook: str(st.facebook),
        },
      });
    }

    // users → User + Account(credential)
    let memberNo = 0;
    const usedUsernames = new Set<string>();
    const legacyUserIdByIdentity = new Map<string, string>();
    // map สำรองแบบหลวม (ตัด collision ทิ้ง กันลิงก์ผิดคน)
    const coreToUid = new Map<string, string>();
    const numToUid = new Map<string, string>();
    const coreCollision = new Set<string>();
    const numCollision = new Set<string>();
    const rememberLooseIdentity = (
      uid: string,
      values: Array<Cell | string | null | undefined>
    ) => {
      for (const value of values) {
        const ck = coreKey(value);
        if (ck.length >= 2) {
          if (coreToUid.has(ck) && coreToUid.get(ck) !== uid) coreCollision.add(ck);
          else coreToUid.set(ck, uid);
        }
        const nk = numKey(value);
        if (nk) {
          if (numToUid.has(nk) && numToUid.get(nk) !== uid) numCollision.add(nk);
          else numToUid.set(nk, uid);
        }
      }
    };
    for (const u of sortedUsers) {
      memberNo++;
      const uid = randomUUID();
      const username = makeUniqueUsername(u, memberNo, usedUsernames);
      const aliasValues = aliasValuesByEmail.get(normalizeIdentity(u.email)) ?? [];
      rememberLegacyUserIdentity(legacyUserIdByIdentity, uid, [
        u.name,
        u.users_code,
        u.email,
        username,
        ...aliasValues,
      ]);
      // สะสม key หลวมจากชื่อ (เก็บเฉพาะที่ไม่ชนกัน)
      rememberLooseIdentity(uid, [u.name, u.users_code, ...aliasValues]);
      await prisma.user.create({
        data: {
          id: uid,
          name: str(u.name),
          email: str(u.email),
          emailVerified: u.email_verified_at != null,
          username,
          displayUsername: username,
          memberNo,
          role: capRole(u.level),
          phone: str(u.phone) || null,
          shopName: str(u.shop_name) || null,
          lineId: str(u.line_id) || null,
          createdAt: toDate(u.created_at) ?? new Date(),
          updatedAt: toDate(u.updated_at) ?? new Date(),
        },
      });
      await prisma.account.create({
        data: {
          id: randomUUID(),
          accountId: uid,
          providerId: "credential",
          userId: uid,
          password: str(u.password),
          createdAt: toDate(u.created_at) ?? new Date(),
          updatedAt: toDate(u.updated_at) ?? new Date(),
        },
      });
    }

    // ตัด key ที่ชนกันทิ้ง (กันลิงก์ booking ผิดคน) แล้วสร้างตัว resolve
    for (const k of coreCollision) coreToUid.delete(k);
    for (const k of numCollision) numToUid.delete(k);
    const resolveUserId = (uname: string): string | null =>
      legacyUserIdByIdentity.get(normalizeIdentity(uname)) ??
      coreToUid.get(coreKey(uname)) ??
      numToUid.get(numKey(uname)) ??
      null;

    // products (รวม dates + slots)
    for (const p of products) {
      const pid = num(p.id);
      const stockVal = p.stock; // null = ไม่จำกัด
      await prisma.products.create({
        data: {
          id: pid,
          image: "",
          name: str(p.product_name),
          description: str(p.note),
          price: num(p.main_price),
          cost: 0,
          agentPrice: num(p.agent_price),
          stockEnabled: stockVal != null,
          stock: stockVal == null ? 0 : Number(stockVal),
          maxPerUserPerDay: 0,
          saleDates: datesByProduct.get(pid) ?? [],
          timeSlots: slotsByProduct.get(pid) ?? [],
          discountEligibleUsernames: parseDiscountUsers(p.discount_users),
          discountAmount: num(p.discount_amount),
          note: null,
          createdAt: toDate(p.created_at) ?? new Date(),
          updatedAt: toDate(p.updated_at) ?? new Date(),
        },
      });
    }

    // accounts (รายรับ/รายจ่าย)
    for (const a of account) {
      await prisma.accounts.create({
        data: {
          id: num(a.id),
          date: toDate(a.date) ?? new Date(),
          description: str(a.description) || null,
          category: str(a.category),
          income: num(a.income),
          expense: num(a.expense),
          createdAt: toDate(a.created_at) ?? new Date(),
          updatedAt: toDate(a.updated_at) ?? new Date(),
        },
      });
    }

    // bookings (map productId จาก product_code; phone ไม่มีในข้อมูลเก่า)
    for (const b of uniqueBookings) {
      const username = str(b.username);
      await prisma.bookings.create({
        data: {
          id: num(b.id),
          bookingCode: str(b.booking_code),
          productId: codeToProductId.get(str(b.product_code)) ?? null,
          productCode: str(b.product_code) || null,
          productName: str(b.product_name),
          userId: resolveUserId(username),
          username,
          phone: "-",
          content: str(b.content) || null,
          price: num(b.price),
          status: str(b.status) || "รอตรวจสอบ",
          bookingDate: toDate(b.booking_date) ?? new Date(),
          bookingTime: str(b.booking_time) || null,
          createdAt: toDate(b.created_at) ?? new Date(),
          updatedAt: toDate(b.updated_at) ?? new Date(),
        },
      });
    }

    const configSummary = skipConfig ? "kept" : st ? "1" : "0";
    console.log(`\n✓ Migrate สำเร็จ — config=${configSummary}, user=${sortedUsers.length}, products=${products.length}, accounts=${account.length}, bookings=${uniqueBookings.length}`);
    console.log(`  ผู้ใช้เดิม login ด้วย "username หรือ email" + รหัสผ่านเดิม · UID ใหม่ OMTC-00001..${String(memberNo).padStart(5, "0")}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("✗ Migrate ล้มเหลว:", e);
  process.exit(1);
});
