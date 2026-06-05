import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import { BookingParams, BookingStatusBody } from "@/lib/server/schemas/booking";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";
import { logAudit } from "@/lib/server/audit";
import {
  adjustProductStock,
  isActiveStatus,
  stockDeltaOnStatusChange,
} from "@/lib/server/stock";

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

/**
 * ต้นทุนสินค้า ณ ปัจจุบัน — ใช้ snapshot ลงออเดอร์ตอนปิดการขาย (กด "สำเร็จ")
 * จับด้วย productId ก่อน, ไม่เจอค่อย fallback ด้วยชื่อสินค้า
 */
async function resolveProductCost(
  productId: number | null,
  productName: string
): Promise<number> {
  if (productId != null) {
    const p = await prisma.products.findUnique({
      where: { id: productId },
      select: { cost: true },
    });
    if (p) return Number(p.cost);
  }
  const byName = await prisma.products.findFirst({
    where: { name: productName.trim() },
    select: { cost: true },
    orderBy: { id: "desc" },
  });
  return byName ? Number(byName.cost) : 0;
}

const app = new Elysia({ prefix: "/api/v1/bookings" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** PATCH /:id — อัปเดต status (admin) */
  .patch(
    "/:id",
    async ({ params, body, user, request, status: code }) => {
      const before = await prisma.bookings.findUnique({
        where: { id: params.id },
      });
      if (!before)
        return code(404, { ok: false, message: "ไม่พบการจอง" });

      // เมื่อปิดการขาย (สถานะ = "สำเร็จ") → ล็อกต้นทุน ณ เวลานั้นลงในออเดอร์ (snapshot)
      // กันยอดกำไรย้อนหลังเพี้ยนหากแก้/ลบต้นทุนสินค้าภายหลัง
      const costSnapshot =
        body.status === "สำเร็จ"
          ? await resolveProductCost(before.productId, before.productName)
          : undefined;

      const saved = await prisma.bookings.update({
        where: { id: params.id },
        data: {
          status: body.status,
          ...(costSnapshot !== undefined ? { cost: costSnapshot } : {}),
        },
      });

      // ปรับสต็อกตาม transition: active→cancelled = +1, cancelled→active = -1
      const delta = stockDeltaOnStatusChange(before.status, saved.status);
      if (delta !== 0) {
        await adjustProductStock(saved.productId, delta);
      }

      logAudit({
        action: "PRODUCT_UPDATE",
        entityType: "product",
        entityId: saved.id,
        details: {
          bookingCode: saved.bookingCode,
          before: { status: before.status },
          after: { status: saved.status },
          stockDelta: delta,
        },
        user,
        request,
      });

      return {
        ok: true as const,
        message: `อัปเดตสถานะเป็น "${body.status}"`,
        data: shape(saved),
      };
    },
    { params: BookingParams, body: BookingStatusBody, requireRole: "admin" }
  )

  /** DELETE /:id — ลบการจอง (admin) */
  .delete(
    "/:id",
    async ({ params, user, request, status: code }) => {
      const before = await prisma.bookings.findUnique({
        where: { id: params.id },
      });
      if (!before)
        return code(404, { ok: false, message: "ไม่พบการจอง" });

      await prisma.bookings.delete({ where: { id: params.id } });

      // ถ้าก่อนลบยัง active อยู่ → คืนสต็อก +1
      const wasActive = isActiveStatus(before.status);
      if (wasActive) {
        await adjustProductStock(before.productId, +1);
      }

      logAudit({
        action: "PRODUCT_DELETE",
        entityType: "product",
        entityId: before.id,
        details: {
          bookingCode: before.bookingCode,
          productName: before.productName,
          stockDelta: wasActive ? +1 : 0,
        },
        user,
        request,
      });

      return { ok: true as const, message: "ลบการจองแล้ว" };
    },
    { params: BookingParams, requireRole: "admin" }
  );

export type BookingsItemApp = typeof app;

export const PATCH = app.handle;
export const DELETE = app.handle;
