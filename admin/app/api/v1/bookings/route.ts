import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import { BookingCreateBody } from "@/lib/server/schemas/booking";
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
  cost: { toString(): string } | null;
  status: string;
  bookingDate: Date;
  bookingTime: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...b,
    price: b.price.toString(),
    cost: b.cost != null ? b.cost.toString() : null,
    bookingDate: b.bookingDate.toISOString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

const app = new Elysia({ prefix: "/api/v1/bookings" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** GET — list ทั้งหมด (admin) */
  .get(
    "/",
    async () => {
      const items = await prisma.bookings.findMany({
        orderBy: { id: "desc" },
        take: 200,
      });
      return { ok: true as const, data: items.map(shape) };
    },
    { requireRole: "admin" }
  )

  /** POST — สร้างการจองจากหลังบ้านเท่านั้น (หน้า queue ใช้ /api/v0/bookings) */
  .post(
    "/",
    async ({ body, user, request, status: httpStatus }) => {
      // เช็คสต็อกก่อน
      const ok = await hasAvailableStock(body.productId ?? null);
      if (!ok) {
        return httpStatus(409, {
          ok: false,
          message: "สินค้าหมดสต็อก ไม่สามารถจองได้",
        });
      }

      // Generate code ที่ unique (retry ถ้าชน)
      let code = generateBookingCode(user.role as string | null);
      for (let attempt = 0; attempt < 5; attempt++) {
        const exists = await prisma.bookings.findUnique({
          where: { bookingCode: code },
          select: { id: true },
        });
        if (!exists) break;
        code = generateBookingCode(user.role as string | null);
      }

      const saved = await prisma.bookings.create({
        data: {
          bookingCode: code,
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
        action: "PRODUCT_CREATE", // booking-related — เก็บใน entity booking
        entityType: "product",
        entityId: saved.id,
        details: {
          bookingCode: code,
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
    { body: BookingCreateBody, requireRole: "admin" }
  );

export type BookingsApp = typeof app;

export const GET = app.handle;
export const POST = app.handle;
