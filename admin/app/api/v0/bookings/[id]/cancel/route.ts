import { Elysia } from "elysia";
import { withElysiaAudit } from "@/lib/server/audit-route";
import { prisma } from "@/lib/prisma";
import { BookingParams } from "@/lib/server/schemas/booking";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";
import { logAudit } from "@/lib/server/audit";
import { adjustProductStock } from "@/lib/server/stock";

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

const app = new Elysia({ prefix: "/api/v0/bookings" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** PATCH /api/v0/bookings/:id/cancel — ลูกค้ายกเลิกการจองของตนเอง */
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
      if (before.status !== "รอตรวจสอบ" && before.status !== "รอชำระเงิน") {
        return code(400, { ok: false, message: "ไม่สามารถยกเลิกการจองนี้ได้เนื่องจากอยู่ระหว่างดำเนินการหรือสำเร็จแล้ว" });
      }

      const saved = await prisma.$transaction(async (tx) => {
        const updated = await tx.bookings.updateMany({
          where: {
            id,
            userId: user.id,
            status: { in: ["รอตรวจสอบ", "รอชำระเงิน"] },
          },
          data: { status: "ยกเลิก" },
        });
        if (updated.count === 0) return null;
        await adjustProductStock(
          before.productId,
          before.quantity,
          tx
        );
        return tx.bookings.findUnique({ where: { id } });
      });
      if (!saved) {
        return code(409, {
          ok: false,
          message: "สถานะการจองเปลี่ยนไปแล้ว กรุณารีเฟรชแล้วลองใหม่",
        });
      }

      const responsePayload = {
        ok: true as const,
        message: "ยกเลิกการจองคิวสำเร็จ",
        data: shape(saved),
      };

      await logAudit({
        action: "BOOKING_CANCEL",
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

export type BookingsCancelPublicApp = typeof app;

export const PATCH = withElysiaAudit(app.handle);
