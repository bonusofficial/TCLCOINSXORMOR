/**
 * Helper รวมสำหรับสคริปต์จัดการฐานข้อมูล (backup / restore / sync)
 * - ใช้ Prisma client เดียวกับแอป + MariaDB adapter
 * - MODELS เรียงลำดับให้ตาราง parent (user) มาก่อน FK child (session/account)
 */
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

export const MODELS = [
  "user",
  "session",
  "account",
  "verification",
  "config",
  "banners",
  "products",
  "reviews",
  "bookings",
  "accounts",
  "audit_logs",
] as const;

export type ModelName = (typeof MODELS)[number];

/** delegate แบบ dynamic (เข้าถึง prisma[model] โดยไม่เสีย type safety มากนัก) */
interface AnyDelegate {
  findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
  upsert: (args: unknown) => Promise<unknown>;
  count: (args?: unknown) => Promise<number>;
}

export function delegate(prisma: PrismaClient, model: ModelName): AnyDelegate {
  return (prisma as unknown as Record<string, AnyDelegate>)[model];
}

export function makeClient(url: string): PrismaClient {
  const adapter = new PrismaMariaDb(url);
  return new PrismaClient({ adapter });
}

/** "YYYYMMDD-HHmmss" สำหรับตั้งชื่อไฟล์ backup */
export function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** ซ่อนรหัสผ่านใน connection string ก่อน log/บันทึก */
export function maskUrl(url: string): string {
  return url.replace(/\/\/([^:/@]+):[^@]*@/, "//$1:***@");
}

/** แยก id ออกจาก row (สำหรับ update payload ที่ไม่ควรแก้ PK) */
export function withoutId(row: Record<string, unknown>): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...row };
  delete rest.id;
  return rest;
}
