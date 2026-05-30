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
import { adjustProductStock, hasAvailableStock } from "@/lib/server/stock";

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
      // เช็คสต็อกก่อน
      const ok = await hasAvailableStock(body.productId ?? null);
      if (!ok) {
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

      const saved = await prisma.bookings.create({
        data: {
          bookingCode,
          productId: body.productId ?? null,
          productCode: body.productCode ?? null,
          productName: body.productName,
          userId: user.id,
          username: body.username,
          phone: body.phone,
          content: body.content ?? null,
          price: body.price,
          bookingDate: new Date(body.bookingDate),
          bookingTime: body.bookingTime ?? null,
          status: "รอตรวจสอบ",
        },
      });

      // ตัดสต็อก -1
      await adjustProductStock(body.productId ?? null, -1);

      logAudit({
        action: "PRODUCT_CREATE",
        entityType: "product",
        entityId: saved.id,
        details: {
          bookingCode,
          productName: body.productName,
          price: body.price,
          stockDelta: -1,
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
