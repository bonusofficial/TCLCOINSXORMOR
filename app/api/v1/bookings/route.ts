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
  cost: { toString(): string } | null;
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
  return {
    ...b,
    unitPrice: b.unitPrice?.toString() ?? b.price.toString(),
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
      const quantity = body.quantity ?? 1;
      // เช็คสต็อกก่อน
      const ok = await hasAvailableStock(body.productId ?? null, quantity);
      if (!ok) {
        return httpStatus(409, {
          ok: false,
          message: "สินค้าหมดสต็อก ไม่สามารถจองได้",
        });
      }
      const costProduct =
        body.productId != null
          ? await prisma.products.findUnique({
              where: { id: body.productId },
              select: { cost: true },
            })
          : await prisma.products.findFirst({
              where: { name: body.productName.trim() },
              select: { cost: true },
              orderBy: { id: "desc" },
            });

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
          recipientFirstName: body.recipientFirstName?.trim() || null,
          recipientLastName: body.recipientLastName?.trim() || null,
          addressLine: body.addressLine?.trim() || null,
          subdistrict: body.subdistrict?.trim() || null,
          district: body.district?.trim() || null,
          province: body.province?.trim() || null,
          postalCode: body.postalCode?.trim() || null,
          content: body.content ?? null,
          quantity,
          unitPrice: body.price,
          price: Math.round(body.price * quantity * 100) / 100,
          cost:
            costProduct?.cost != null
              ? Math.round(Number(costProduct.cost) * quantity * 100) / 100
              : null,
          bookingDate: new Date(body.bookingDate),
          bookingTime: body.bookingTime ?? null,
          status: "รอตรวจสอบ",
        },
      });

      await adjustProductStock(body.productId ?? null, -quantity);

      logAudit({
        action: "BOOKING_CREATE",
        entityType: "booking",
        entityId: saved.id,
        details: {
          bookingCode: code,
          productName: body.productName,
          quantity,
          unitPrice: body.price,
          price: Math.round(body.price * quantity * 100) / 100,
          stockDelta: -quantity,
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
