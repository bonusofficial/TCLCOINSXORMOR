import { Elysia } from "elysia";
import { withElysiaAudit } from "@/lib/server/audit-route";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { BookingCreateBody, BookingParams } from "@/lib/server/schemas/booking";
import { generateBookingCode } from "@/lib/booking";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";
import { logAudit } from "@/lib/server/audit";
import { adjustProductStock } from "@/lib/server/stock";
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
  recipientFirstName: string | null;
  recipientLastName: string | null;
  addressLine: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  content: string | null;
  quantity: number;
  unitPrice: { toString(): string } | null;
  price: { toString(): string };
  status: string;
  bookingDate: Date;
  bookingTime: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...b,
    unitPrice: b.unitPrice?.toString() ?? b.price.toString(),
    price: b.price.toString(),
    bookingDate: b.bookingDate.toISOString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

type BookingErrorStatus = 400 | 404 | 409 | 429;

class BookingHttpError extends Error {
  constructor(
    public readonly statusCode: BookingErrorStatus,
    public readonly payload: { ok: false; message: string }
  ) {
    super(payload.message);
  }
}

function bookingLockKey(userId: string, productId: number, date: string): string {
  return `booking:${userId}:${productId}:${date}`;
}

async function acquireBookingLock(
  tx: Prisma.TransactionClient,
  lockKey: string
): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ got: number | bigint | null }>>`
    SELECT GET_LOCK(${lockKey}, 5) AS got
  `;
  if (Number(rows[0]?.got ?? 0) !== 1) {
    throw new BookingHttpError(429, {
      ok: false,
      message: "มีคำขอจองซ้ำในเวลาใกล้กัน กรุณารอสักครู่แล้วลองใหม่",
    });
  }
}

async function releaseBookingLock(
  tx: Prisma.TransactionClient,
  lockKey: string
): Promise<void> {
  try {
    await tx.$queryRaw<Array<{ released: number | bigint | null }>>`
      SELECT RELEASE_LOCK(${lockKey}) AS released
    `;
  } catch {
    // Connection-bound advisory locks are also released when the DB connection closes.
  }
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
      const quantity = body.quantity ?? 1;

      const delivery = {
        recipientFirstName: body.recipientFirstName?.trim() ?? "",
        recipientLastName: body.recipientLastName?.trim() ?? "",
        addressLine: body.addressLine?.trim() ?? "",
        subdistrict: body.subdistrict?.trim() ?? "",
        district: body.district?.trim() ?? "",
        province: body.province?.trim() ?? "",
        postalCode: body.postalCode?.trim() ?? "",
      };
      if (
        !delivery.recipientFirstName ||
        !delivery.recipientLastName ||
        !delivery.addressLine ||
        !delivery.subdistrict ||
        !delivery.district ||
        !delivery.province ||
        !/^\d{5}$/.test(delivery.postalCode)
      ) {
        return code(400, {
          ok: false,
          message: "กรุณากรอกชื่อผู้รับและที่อยู่จัดส่งให้ครบถ้วน",
        });
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

      // ── เตรียมช่วงวันไทยสำหรับเช็คโควตาการจองต่อวัน ──
      const { start: startOfDay, end: endOfDay } = bangkokDayRangeUTC(today);

      // ── ราคา คำนวณใหม่ฝั่งเซิร์ฟเวอร์เสมอ (ไม่เชื่อราคาที่ client ส่งมา) ──
      const role = ((user as { role?: string | null }).role ?? "member").toLowerCase();
      const isAgent = role === "agent" || role === "admin";
      const accountUsername = (user as { username?: string | null }).username ?? null;
      const discountAmt = Math.max(0, Number(prod.discountAmount) || 0);
      const hasVipDiscount = role === "vip";
      const base =
        isAgent || hasVipDiscount
          ? Number(prod.agentPrice)
          : Number(prod.price);
      const unitPrice = hasVipDiscount ? Math.max(0, base - discountAmt) : base;
      const price = Math.round(unitPrice * quantity * 100) / 100;

      let stockDelta = 0;
      let saved;
      try {
        saved = await prisma.$transaction(async (tx) => {
          const lockKey = bookingLockKey(user.id, prod.id, today);
          await acquireBookingLock(tx, lockKey);

          try {
            // ลิมิตเฉพาะสินค้านี้ต่อคน/วัน (product.maxPerUserPerDay) — 0 = ไม่จำกัด
            // อยู่ใต้ advisory lock เพื่อกันยิงหลาย request พร้อมกันแล้วหลุด quota
            if (prod.maxPerUserPerDay > 0) {
              const quantityAggregate = await tx.bookings.aggregate({
                where: {
                  userId: user.id,
                  productId: prod.id,
                  bookingDate: { gte: startOfDay, lte: endOfDay },
                  status: { not: "ยกเลิก" },
                },
                _sum: { quantity: true },
              });
              const bookedQuantity = quantityAggregate._sum.quantity ?? 0;
              if (bookedQuantity + quantity > prod.maxPerUserPerDay) {
                throw new BookingHttpError(400, {
                  ok: false,
                  message: `ขออภัย สินค้านี้จำกัดจองได้ไม่เกิน ${prod.maxPerUserPerDay} ชิ้น/วัน/คน (จองแล้ว ${bookedQuantity} ชิ้น)`,
                });
              }
            }

            const stockState = await tx.products.findUnique({
              where: { id: prod.id },
              select: { stockEnabled: true, cost: true },
            });
            if (!stockState) {
              throw new BookingHttpError(404, {
                ok: false,
                message: "ไม่พบสินค้าที่ต้องการจอง",
              });
            }

            // ตัดสต็อกแบบ atomic ใน transaction เดียวกับการสร้าง booking
            if (stockState.stockEnabled) {
              const reserved = await tx.products.updateMany({
                where: {
                  id: prod.id,
                  stockEnabled: true,
                  stock: { gte: quantity },
                },
                data: { stock: { decrement: quantity } },
              });
              if (reserved.count === 0) {
                throw new BookingHttpError(409, {
                  ok: false,
                  message: "สินค้าหมดสต็อก ไม่สามารถจองได้",
                });
              }
              stockDelta = -quantity;
            }

            // Generate code ที่ unique (retry กันชน)
            let bookingCode = generateBookingCode(user.role as string | null);
            for (let attempt = 0; attempt < 5; attempt++) {
              const exists = await tx.bookings.findUnique({
                where: { bookingCode },
                select: { id: true },
              });
              if (!exists) break;
              bookingCode = generateBookingCode(user.role as string | null);
            }

            return tx.bookings.create({
              data: {
                bookingCode,
                productId: prod.id,
                productCode: body.productCode ?? null,
                productName: prod.name, // ยึดชื่อจริงจากฐานข้อมูล
                userId: user.id,
                username: accountUsername ?? body.username,
                phone: body.phone,
                ...delivery,
                content: body.content ?? null,
                quantity,
                unitPrice,
                price, // ราคาที่เซิร์ฟเวอร์คำนวณเอง
                cost:
                  Math.round(Number(stockState.cost) * quantity * 100) / 100,
                bookingDate: bookingDateUTC, // วันไทยของเซิร์ฟเวอร์
                bookingTime,
                status: "รอตรวจสอบ",
              },
            });
          } finally {
            await releaseBookingLock(tx, lockKey);
          }
        });
      } catch (err) {
        if (err instanceof BookingHttpError) {
          return code(err.statusCode, err.payload);
        }
        throw err;
      }

      const responsePayload = {
        ok: true as const,
        message: "จองสำเร็จ",
        data: shape(saved),
      };

      await logAudit({
        action: "BOOKING_CREATE",
        entityType: "booking",
        entityId: saved.id,
        details: {
          bookingCode: saved.bookingCode,
          productName: prod.name,
          quantity,
          unitPrice,
          price,
          stockDelta,
        },
        payload: body,
        response: responsePayload,
        user,
        request,
      });

      return responsePayload;
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

      await adjustProductStock(before.productId, before.quantity);

      const responsePayload = {
        ok: true as const,
        message: "ยกเลิกการจองคิวสำเร็จ",
        data: shape(saved),
      };

      await logAudit({
        action: "BOOKING_UPDATE",
        entityType: "booking",
        entityId: saved.id,
        details: {
          bookingCode: saved.bookingCode,
          action: "USER_CANCEL",
          quantity: before.quantity,
          stockDelta: before.quantity,
        },
        payload: { params },
        response: responsePayload,
        user,
        request,
      });

      return responsePayload;
    },
    { params: BookingParams, requireAuth: true }
  );

export type BookingsPublicApp = typeof app;

export const GET = withElysiaAudit(app.handle);
export const POST = withElysiaAudit(app.handle);
export const PATCH = withElysiaAudit(app.handle);
