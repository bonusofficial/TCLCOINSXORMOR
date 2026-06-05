import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import { BookingCreateBody, BookingParams } from "@/lib/server/schemas/booking";
import { generateBookingCode } from "@/lib/booking";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";
import { logAudit } from "@/lib/server/audit";
import { adjustProductStock, tryReserveStock } from "@/lib/server/stock";
import {
  bangkokToday,
  bangkokHHMM,
  bangkokDayRangeUTC,
  bangkokDateToUTCMidnight,
  padHHMM,
} from "@/lib/server/time";

/** parse Json array จาก Prisma (MariaDB อาจคืนเป็น string) */
function toArr(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function shape(b: {
  id: number;
  bookingCode: string;
  productId: number | null;
  productCode: string | null;
  productName: string;
  userId: string | null;
  username: string;
  phone: string;
  content: string | null;
  price: { toString(): string };
  status: string;
  bookingDate: Date;
  bookingTime: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...b,
    price: b.price.toString(),
    bookingDate: b.bookingDate.toISOString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

/**
 * Public Bookings endpoint — สำหรับลูกค้าจองคิว
 * ต้อง login (requireAuth) — ลูกค้าทุก role ทำได้
 */
const app = new Elysia({ prefix: "/api/v0/bookings" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** GET — ดึงรายการจองของตนเอง */
  .get(
    "/",
    async ({ user }) => {
      const items = await prisma.bookings.findMany({
        where: { userId: user.id },
        orderBy: { id: "desc" },
        take: 100,
      });
      return {
        ok: true as const,
        data: items.map(shape),
      };
    },
    { requireAuth: true }
  )

  /** POST — ลูกค้าสร้างการจอง (ตัดสต็อก -1 ถ้าสินค้าเปิด stockEnabled) */
  .post(
    "/",
    async ({ body, user, request, status: code }) => {
      if (body.productId == null) {
        return code(400, { ok: false, message: "ต้องระบุสินค้าที่ต้องการจอง" });
      }

      // โหลดสินค้าเพื่อตรวจสอบความถูกต้องของข้อมูล
      const prod = await prisma.products.findUnique({
        where: { id: body.productId },
      });
      if (!prod) {
        return code(404, { ok: false, message: "ไม่พบสินค้าที่ต้องการจอง" });
      }

      // ── เวลา/วันที่ ใช้ของเซิร์ฟเวอร์ (Asia/Bangkok) เป็น "แหล่งความจริงเดียว" ──
      //     กันผู้ใช้ย้าย timezone เครื่อง หรือยิง API ตรง ๆ เพื่อกดนอกรอบขาย
      const today = bangkokToday();
      const nowHHMM = bangkokHHMM();

      const saleDates = toArr(prod.saleDates)
        .map((d) => (typeof d === "string" ? d.slice(0, 10) : ""))
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
      const timeSlots = toArr(prod.timeSlots).filter(
        (s): s is { start: string; end: string } =>
          !!s &&
          typeof s === "object" &&
          typeof (s as { start?: unknown }).start === "string" &&
          typeof (s as { end?: unknown }).end === "string"
      );

      // ต้องเป็นวันเปิดขาย "วันนี้" ตามเวลาไทยฝั่งเซิร์ฟเวอร์เท่านั้น
      if (!saleDates.includes(today)) {
        return code(400, {
          ok: false,
          message: "ขออภัย ขณะนี้ไม่อยู่ในวันเปิดจองของสินค้านี้",
        });
      }

      // ต้องอยู่ในช่วงเวลาเปิดจองจริง (ถ้าไม่กำหนดช่วงเวลา = เปิดทั้งวัน)
      let activeSlot: { start: string; end: string } | null = null;
      if (timeSlots.length > 0) {
        activeSlot =
          timeSlots.find(
            (s) => nowHHMM >= padHHMM(s.start) && nowHHMM <= padHHMM(s.end)
          ) ?? null;
        if (!activeSlot) {
          return code(400, {
            ok: false,
            message: "ขออภัย ขณะนี้ไม่อยู่ในช่วงเวลาเปิดจองของสินค้านี้",
          });
        }
      }

      // วัน/เวลา ที่จะบันทึก — ยึดของเซิร์ฟเวอร์ ไม่เชื่อค่าจาก client
      const bookingDateUTC = bangkokDateToUTCMidnight(today);
      const bookingTime = activeSlot
        ? `${padHHMM(activeSlot.start)} - ${padHHMM(activeSlot.end)}`
        : body.bookingTime?.trim() || null;

      // ── เช็คโควตาการจองต่อวัน ── (นับช่วง "วันไทย" ของเซิร์ฟเวอร์)
      const { start: startOfDay, end: endOfDay } = bangkokDayRangeUTC(today);

      // ลิมิตเฉพาะสินค้านี้ต่อคน/วัน (product.maxPerUserPerDay) — 0 = ไม่จำกัด
      if (prod.maxPerUserPerDay > 0) {
        const prodCount = await prisma.bookings.count({
          where: {
            userId: user.id,
            productId: body.productId,
            bookingDate: { gte: startOfDay, lte: endOfDay },
            status: { not: "ยกเลิก" },
          },
        });
        if (prodCount >= prod.maxPerUserPerDay) {
          return code(400, {
            ok: false,
            message: `ขออภัย สินค้านี้จำกัดจองได้ไม่เกิน ${prod.maxPerUserPerDay} แพ็ก/วัน/คน`,
          });
        }
      }

      // ── ราคา คำนวณใหม่ฝั่งเซิร์ฟเวอร์เสมอ (ไม่เชื่อราคาที่ client ส่งมา) ──
      const role = ((user as { role?: string | null }).role ?? "member").toLowerCase();
      const isAgent = role === "agent" || role === "admin";
      const base = isAgent ? Number(prod.agentPrice) : Number(prod.price);
      const accountLoginUsername = (user as { username?: string | null }).username ?? null;
      const accountDisplayUsername =
        (user as { displayUsername?: string | null }).displayUsername ?? null;
      const bookingUsername =
        accountDisplayUsername?.trim() || accountLoginUsername?.trim() || body.username;
      const matchUsername = (accountLoginUsername ?? accountDisplayUsername ?? body.username ?? "")
        .toLowerCase()
        .trim();
      const discountUsers = toArr(prod.discountEligibleUsernames)
        .filter((u): u is string => typeof u === "string")
        .map((u) => u.toLowerCase());
      const discountAmt = Number(prod.discountAmount);
      const hasVipDiscount =
        discountAmt > 0 &&
        matchUsername !== "" &&
        discountUsers.includes(matchUsername);
      const price = hasVipDiscount ? Math.max(0, base - discountAmt) : base;

      // ── ตัดสต็อกแบบ atomic (กัน oversell เมื่อคนกดพร้อมกัน) ──
      const reserve = await tryReserveStock(prod.id);
      if (reserve === "out") {
        return code(409, {
          ok: false,
          message: "สินค้าหมดสต็อก ไม่สามารถจองได้",
        });
      }

      // Generate code ที่ unique (retry กันชน)
      let bookingCode = generateBookingCode(user.role as string | null);
      for (let attempt = 0; attempt < 5; attempt++) {
        const exists = await prisma.bookings.findUnique({
          where: { bookingCode },
          select: { id: true },
        });
        if (!exists) break;
        bookingCode = generateBookingCode(user.role as string | null);
      }

      let saved;
      try {
        saved = await prisma.bookings.create({
          data: {
            bookingCode,
            productId: prod.id,
            productCode: body.productCode ?? null,
            productName: prod.name, // ยึดชื่อจริงจากฐานข้อมูล
            userId: user.id,
            username: bookingUsername,
            phone: body.phone,
            content: body.content ?? null,
            price, // ราคาที่เซิร์ฟเวอร์คำนวณเอง
            bookingDate: bookingDateUTC, // วันไทยของเซิร์ฟเวอร์
            bookingTime,
            status: "รอตรวจสอบ",
          },
        });
      } catch (err) {
        // create ล้มเหลว → คืนสต็อกที่จองไว้ก่อนหน้า
        if (reserve === "ok") await adjustProductStock(prod.id, +1);
        throw err;
      }

      logAudit({
        action: "PRODUCT_CREATE",
        entityType: "product",
        entityId: saved.id,
        details: {
          bookingCode,
          productName: prod.name,
          price,
          stockDelta: reserve === "ok" ? -1 : 0,
        },
        user,
        request,
      });

      return {
        ok: true as const,
        message: "จองสำเร็จ",
        data: shape(saved),
      };
    },
    { body: BookingCreateBody, requireAuth: true }
  )

  /** PATCH /:id/cancel — ลูกค้ายกเลิกการจองของตนเอง */
  .patch(
    "/:id/cancel",
    async ({ params, user, request, status: code }) => {
      const id = Number(params.id);
      const before = await prisma.bookings.findUnique({
        where: { id },
      });
      if (!before) {
        return code(404, { ok: false, message: "ไม่พบการจอง" });
      }
      if (before.userId !== user.id) {
        return code(403, { ok: false, message: "ไม่มีสิทธิ์ในการจัดการการจองนี้" });
      }
      if (before.status !== "รอตรวจสอบ") {
        return code(400, { ok: false, message: "ไม่สามารถยกเลิกการจองนี้ได้เนื่องจากอยู่ระหว่างดำเนินการหรือสำเร็จแล้ว" });
      }

      const saved = await prisma.bookings.update({
        where: { id },
        data: { status: "ยกเลิก" },
      });

      // คืนสต็อก +1 (booking นี้กิน stock ตอนสร้าง)
      await adjustProductStock(before.productId, +1);

      logAudit({
        action: "PRODUCT_UPDATE",
        entityType: "product",
        entityId: saved.id,
        details: {
          bookingCode: saved.bookingCode,
          action: "USER_CANCEL",
          stockDelta: +1,
        },
        user,
        request,
      });

      return {
        ok: true as const,
        message: "ยกเลิกการจองคิวสำเร็จ",
        data: shape(saved),
      };
    },
    { params: BookingParams, requireAuth: true }
  );

export type BookingsPublicApp = typeof app;

export const GET = app.handle;
export const POST = app.handle;
export const PATCH = app.handle;
