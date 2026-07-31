import { Elysia } from "elysia";
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

type TopupRound = {
  code: string;
  name: string;
  start: string;
  end: string;
  capacity: number;
  enabled: boolean;
  sortOrder: number;
};

type SaleSchedule = {
  date: string;
  bookingStart: string;
  bookingEnd: string;
  rounds: TopupRound[];
};

function parseSaleSchedules(
  saleSchedules: unknown,
  saleDates: unknown,
  timeSlots: unknown
): SaleSchedule[] {
  const schedules = toArr(saleSchedules).filter(
    (item): item is SaleSchedule =>
      !!item &&
      typeof item === "object" &&
      typeof (item as SaleSchedule).date === "string" &&
      typeof (item as SaleSchedule).bookingStart === "string" &&
      typeof (item as SaleSchedule).bookingEnd === "string" &&
      Array.isArray((item as SaleSchedule).rounds)
  );
  if (schedules.length > 0) return schedules;

  const dates = toArr(saleDates).filter(
    (date): date is string => typeof date === "string"
  );
  const slots = toArr(timeSlots).filter(
    (slot): slot is { start: string; end: string } =>
      !!slot &&
      typeof slot === "object" &&
      typeof (slot as { start?: unknown }).start === "string" &&
      typeof (slot as { end?: unknown }).end === "string"
  );
  const bookingStart = slots[0]?.start ?? "00:00";
  const bookingEnd = slots[slots.length - 1]?.end ?? "23:59";
  return dates.map((date) => ({
    date: date.slice(0, 10),
    bookingStart,
    bookingEnd,
    rounds: [
      {
        code: "LEGACY",
        name: "รอบเติมทั่วไป",
        start: bookingStart,
        end: bookingEnd,
        capacity: 999999,
        enabled: true,
        sortOrder: 0,
      },
    ],
  }));
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
  bookingWindowStart: string | null;
  bookingWindowEnd: string | null;
  topupRoundCode: string | null;
  topupRoundName: string | null;
  topupRoundStart: string | null;
  topupRoundEnd: string | null;
  topupRoundCapacity: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  // หมายเหตุ: คืนค่าแบบ explicit (ไม่ spread ...b) เพื่อไม่ให้ฟิลด์ภายในอย่าง "cost" (ต้นทุน)
  // หลุดออกไปยังฝั่งลูกค้าผ่าน API
  return {
    id: b.id,
    bookingCode: b.bookingCode,
    productId: b.productId,
    productCode: b.productCode,
    productName: b.productName,
    userId: b.userId,
    username: b.username,
    phone: b.phone,
    recipientFirstName: b.recipientFirstName,
    recipientLastName: b.recipientLastName,
    addressLine: b.addressLine,
    subdistrict: b.subdistrict,
    district: b.district,
    province: b.province,
    postalCode: b.postalCode,
    content: b.content,
    quantity: b.quantity,
    unitPrice: b.unitPrice?.toString() ?? b.price.toString(),
    price: b.price.toString(),
    status: b.status,
    bookingDate: b.bookingDate.toISOString(),
    bookingTime: b.bookingTime,
    bookingWindowStart: b.bookingWindowStart,
    bookingWindowEnd: b.bookingWindowEnd,
    topupRoundCode: b.topupRoundCode,
    topupRoundName: b.topupRoundName,
    topupRoundStart: b.topupRoundStart,
    topupRoundEnd: b.topupRoundEnd,
    topupRoundCapacity: b.topupRoundCapacity,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

type BookingErrorStatus = 400 | 404 | 409;

class BookingHttpError extends Error {
  constructor(
    public readonly statusCode: BookingErrorStatus,
    public readonly payload: { ok: false; message: string }
  ) {
    super(payload.message);
  }
}

/**
 * ล็อกแถวสินค้าไว้จน transaction commit เพื่อ serialize การจองของสินค้านี้
 * การ count ความจุรอบและ create จึงไม่มีช่องว่างให้สอง request แย่งที่สุดท้าย
 */
async function lockProductForBooking(
  tx: Prisma.TransactionClient,
  productId: number
): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: number }>>`
    SELECT id FROM products WHERE id = ${productId} FOR UPDATE
  `;
  if (!rows[0]) {
    throw new BookingHttpError(404, {
      ok: false,
      message: "ไม่พบสินค้าที่ต้องการจอง",
    });
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

      const schedules = parseSaleSchedules(
        prod.saleSchedules,
        prod.saleDates,
        prod.timeSlots
      );
      const todaySchedule = schedules.find((schedule) => schedule.date === today);
      if (!todaySchedule) {
        return code(400, {
          ok: false,
          message: "ขออภัย ขณะนี้ไม่อยู่ในวันเปิดจองของสินค้านี้",
        });
      }
      if (
        nowHHMM < padHHMM(todaySchedule.bookingStart) ||
        nowHHMM > padHHMM(todaySchedule.bookingEnd)
      ) {
        return code(400, {
          ok: false,
          message: "ขออภัย ขณะนี้ไม่อยู่ในช่วงเวลาเปิดรับจองของสินค้านี้",
        });
      }
      const requestedRoundCode = body.topupRoundCode?.trim();
      const requiresTopupRound = todaySchedule.rounds.length > 0;
      if (requiresTopupRound && !requestedRoundCode) {
        return code(400, {
          ok: false,
          message: "กรุณาเลือกรอบเติมที่ต้องการ",
        });
      }
      const requestedRound = requestedRoundCode
        ? todaySchedule.rounds.find((round) => round.code === requestedRoundCode)
        : null;
      if (requiresTopupRound && (!requestedRound || !requestedRound.enabled)) {
        return code(409, {
          ok: false,
          message: "รอบเติมที่เลือกปิดรับจองแล้ว กรุณาเลือกรอบอื่น",
        });
      }

      // วัน/เวลา ที่จะบันทึก — ยึดของเซิร์ฟเวอร์ ไม่เชื่อค่าจาก client
      const bookingDateUTC = bangkokDateToUTCMidnight(today);
      const bookingTime = `${padHHMM(todaySchedule.bookingStart)} - ${padHHMM(todaySchedule.bookingEnd)}`;

      // ── เตรียมช่วงวันไทยสำหรับเช็คโควตาการจองต่อวัน ──
      const { start: startOfDay, end: endOfDay } = bangkokDayRangeUTC(today);

      // ── ราคา คำนวณใหม่ฝั่งเซิร์ฟเวอร์เสมอ (ไม่เชื่อราคาที่ client ส่งมา) ──
      const role = ((user as { role?: string | null }).role ?? "member").toLowerCase();
      const isAgent = role === "agent" || role === "admin";
      const accountLoginUsername = (user as { username?: string | null }).username ?? null;
      const accountDisplayUsername =
        (user as { displayUsername?: string | null }).displayUsername ?? null;
      const bookingUsername =
        accountDisplayUsername?.trim() || accountLoginUsername?.trim() || body.username;
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
          await lockProductForBooking(tx, prod.id);
            // ลิมิตเฉพาะสินค้านี้ต่อคน/วัน (product.maxPerUserPerDay) — 0 = ไม่จำกัด
            // อยู่ใต้ row lock เพื่อกันยิงหลาย request พร้อมกันแล้วหลุด quota
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
              select: {
                stockEnabled: true,
                cost: true,
                saleSchedules: true,
                saleDates: true,
                timeSlots: true,
              },
            });
            if (!stockState) {
              throw new BookingHttpError(404, {
                ok: false,
                message: "ไม่พบสินค้าที่ต้องการจอง",
              });
            }
            const liveSchedule = parseSaleSchedules(
              stockState.saleSchedules,
              stockState.saleDates,
              stockState.timeSlots
            ).find((schedule) => schedule.date === today);
            if (
              !liveSchedule ||
              nowHHMM < padHHMM(liveSchedule.bookingStart) ||
              nowHHMM > padHHMM(liveSchedule.bookingEnd)
            ) {
              throw new BookingHttpError(409, {
                ok: false,
                message: "ช่วงเวลาเปิดรับจองสิ้นสุดแล้ว กรุณาเลือกรายการใหม่",
              });
            }
            const liveRequiresTopupRound = liveSchedule.rounds.length > 0;
            const liveRound = requestedRoundCode
              ? liveSchedule.rounds.find(
                  (round) => round.code === requestedRoundCode
                ) ?? null
              : null;
            if (
              liveRequiresTopupRound &&
              (!liveRound || !liveRound.enabled)
            ) {
              throw new BookingHttpError(409, {
                ok: false,
                message: "รอบเติมที่เลือกปิดรับจองแล้ว กรุณาเลือกรอบอื่น",
              });
            }
            if (liveRound) {
              const roundQuantityAggregate = await tx.bookings.aggregate({
                where: {
                  productId: prod.id,
                  bookingDate: { gte: startOfDay, lte: endOfDay },
                  topupRoundCode: liveRound.code,
                  status: { not: "ยกเลิก" },
                },
                _sum: { quantity: true },
              });
              const bookedRoundQuantity =
                roundQuantityAggregate._sum.quantity ?? 0;
              const remainingRoundQuantity = Math.max(
                0,
                liveRound.capacity - bookedRoundQuantity
              );
              if (quantity > remainingRoundQuantity) {
                throw new BookingHttpError(409, {
                  ok: false,
                  message:
                    remainingRoundQuantity <= 0
                      ? `${liveRound.name} เต็มแล้ว กรุณาเลือกรอบเติมอื่น`
                      : `${liveRound.name} เหลือ ${remainingRoundQuantity} ชิ้น กรุณาลดจำนวนสินค้าแล้วลองใหม่`,
                });
              }
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
                username: bookingUsername,
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
                bookingWindowStart: padHHMM(liveSchedule.bookingStart),
                bookingWindowEnd: padHHMM(liveSchedule.bookingEnd),
                topupRoundCode: liveRound?.code ?? null,
                topupRoundName: liveRound?.name ?? null,
                topupRoundStart: liveRound ? padHHMM(liveRound.start) : null,
                topupRoundEnd: liveRound ? padHHMM(liveRound.end) : null,
                topupRoundCapacity: liveRound?.capacity ?? null,
                status: "รอตรวจสอบ",
              },
          });
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
      logAudit({
        action: "BOOKING_CREATE",
        entityType: "booking",
        entityId: saved.id,
        details: {
          activity: "USER_BOOKING_CREATE",
          description: "ผู้ใช้สร้างรายการจอง",
          bookingCode: saved.bookingCode,
          productName: prod.name,
          quantity,
          unitPrice,
          price,
          costSnapshot: saved.cost?.toString() ?? null,
          bookingWindow: `${saved.bookingWindowStart}-${saved.bookingWindowEnd}`,
          topupRoundCode: saved.topupRoundCode,
          topupRoundName: saved.topupRoundName,
          topupRoundTime: `${saved.topupRoundStart}-${saved.topupRoundEnd}`,
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

      // คืนสต็อกตามจำนวนสินค้า ส่วนจำนวนว่างของรอบคำนวณใหม่จาก booking ที่ยังไม่ถูกยกเลิก
      await adjustProductStock(before.productId, before.quantity);

      logAudit({
        action: "BOOKING_CANCEL",
        entityType: "booking",
        entityId: saved.id,
        details: {
          activity: "USER_BOOKING_CANCEL",
          description: "ผู้ใช้ยกเลิกรายการจองของตนเอง",
          bookingCode: saved.bookingCode,
          beforeStatus: before.status,
          afterStatus: saved.status,
          quantity: before.quantity,
          stockDelta: before.quantity,
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
