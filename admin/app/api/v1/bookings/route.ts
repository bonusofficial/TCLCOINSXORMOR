import { Elysia } from "elysia";
import { withElysiaAudit } from "@/lib/server/audit-route";
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

function shape(
  b: {
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
  },
  currentProductCost: { toString(): string } | string | number | null = null
) {
  return {
    ...b,
    price: b.price.toString(),
    cost: b.cost != null ? b.cost.toString() : null,
    currentProductCost:
      currentProductCost != null ? currentProductCost.toString() : null,
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
      // โหลดทั้งหมด (ไม่ติดเพดาน 200) — หน้าแอดมินแบ่งหน้าเองฝั่ง client
      const [items, products] = await Promise.all([
        prisma.bookings.findMany({
          orderBy: { id: "desc" },
        }),
        prisma.products.findMany({
          select: { id: true, name: true, cost: true },
        }),
      ]);
      const costById = new Map(
        products.map((product) => [product.id, product.cost] as const)
      );
      const costByName = new Map(
        products.map(
          (product) => [product.name.trim().toLowerCase(), product.cost] as const
        )
      );

      return {
        ok: true as const,
        data: items.map((booking) =>
          shape(
            booking,
            (booking.productId != null
              ? costById.get(booking.productId)
              : undefined) ??
              costByName.get(booking.productName.trim().toLowerCase()) ??
              null
          )
        ),
      };
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
          recipientFirstName: body.recipientFirstName?.trim() || null,
          recipientLastName: body.recipientLastName?.trim() || null,
          addressLine: body.addressLine?.trim() || null,
          subdistrict: body.subdistrict?.trim() || null,
          district: body.district?.trim() || null,
          province: body.province?.trim() || null,
          postalCode: body.postalCode?.trim() || null,
          content: body.content ?? null,
          price: body.price,
          bookingDate: new Date(body.bookingDate),
          bookingTime: body.bookingTime ?? null,
          status: "รอตรวจสอบ",
        },
      });

      // ตัดสต็อก -1
      await adjustProductStock(body.productId ?? null, -1);

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
          bookingCode: code,
          productName: body.productName,
          price: body.price,
          stockDelta: -1,
        },
        payload: body,
        response: responsePayload,
        user,
        request,
      });

      return responsePayload;
    },
    { body: BookingCreateBody, requireRole: "admin" }
  );

export type BookingsApp = typeof app;

export const GET = withElysiaAudit(app.handle);
export const POST = withElysiaAudit(app.handle);
