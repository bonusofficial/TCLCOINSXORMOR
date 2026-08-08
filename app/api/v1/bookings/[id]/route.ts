import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  BookingAdminUpdateBody,
  BookingParams,
} from "@/lib/server/schemas/booking";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";
import { logAudit } from "@/lib/server/audit";
import {
  adjustProductStock,
  isActiveStatus,
  ProductStockUnavailableError,
  stockDeltaOnStatusChange,
} from "@/lib/server/stock";

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeStoredCost(
  storedCost: number | null,
  productUnitCost: number,
  quantity: number
) {
  if (storedCost == null) return null;
  if (
    quantity > 1 &&
    Math.abs(storedCost - productUnitCost) < 0.005
  ) {
    return roundCurrency(storedCost * quantity);
  }
  return storedCost;
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

async function resolveProductCost(
  productId: number | null,
  productName: string
): Promise<number> {
  if (productId != null) {
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { cost: true },
    });
    if (product) return Number(product.cost);
  }

  const product = await prisma.products.findFirst({
    where: { name: productName.trim() },
    select: { cost: true },
    orderBy: { id: "desc" },
  });
  return product ? Number(product.cost) : 0;
}

const app = new Elysia({ prefix: "/api/v1/bookings" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** PATCH /:id — แก้ Snapshot ผู้จอง/ต้นทุน และอัปเดตสถานะ (admin) */
  .patch(
    "/:id",
    async ({ params, body, user, request, status: code }) => {
      const before = await prisma.bookings.findUnique({
        where: { id: params.id },
      });
      if (!before)
        return code(404, { ok: false, message: "ไม่พบการจอง" });

      const hasDetailChanges = Object.keys(body).some(
        (key) => key !== "status"
      );
      if (before.status === "สำเร็จ" && hasDetailChanges) {
        return code(409, {
          ok: false,
          message: "รายการสำเร็จแล้ว ไม่สามารถแก้ข้อมูลผู้จองหรือต้นทุนย้อนหลังได้",
        });
      }

      const nextStatus = body.status ?? before.status;
      const currentProductUnitCost = await resolveProductCost(
        before.productId,
        before.productName
      );
      let costSnapshot: number | undefined;
      if (body.unitCost !== undefined) {
        costSnapshot = roundCurrency(body.unitCost * before.quantity);
      } else if (body.cost !== undefined) {
        costSnapshot = body.cost;
      } else if (nextStatus === "สำเร็จ") {
        costSnapshot =
          before.cost != null
            ? normalizeStoredCost(
                Number(before.cost),
                currentProductUnitCost,
                before.quantity
              ) ?? 0
            : roundCurrency(currentProductUnitCost * before.quantity);
      }

      let transactionResult;
      try {
        transactionResult = await prisma.$transaction(async (tx) => {
          const updated = await tx.bookings.updateMany({
            where: { id: params.id, status: before.status },
            data: {
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.phone !== undefined ? { phone: body.phone.trim() } : {}),
          ...(body.recipientFirstName !== undefined
            ? { recipientFirstName: body.recipientFirstName.trim() }
            : {}),
          ...(body.recipientLastName !== undefined
            ? { recipientLastName: body.recipientLastName.trim() }
            : {}),
          ...(body.addressLine !== undefined
            ? { addressLine: body.addressLine.trim() }
            : {}),
          ...(body.subdistrict !== undefined
            ? { subdistrict: body.subdistrict.trim() }
            : {}),
          ...(body.district !== undefined
            ? { district: body.district.trim() }
            : {}),
          ...(body.province !== undefined
            ? { province: body.province.trim() }
            : {}),
          ...(body.postalCode !== undefined
            ? { postalCode: body.postalCode.trim() }
            : {}),
          ...(body.content !== undefined ? { content: body.content } : {}),
          ...(body.price !== undefined ? { price: body.price } : {}),
          ...(costSnapshot !== undefined ? { cost: costSnapshot } : {}),
            },
          });
          if (updated.count === 0) return null;
          const saved = await tx.bookings.findUniqueOrThrow({
            where: { id: params.id },
          });
          const delta =
            stockDeltaOnStatusChange(before.status, saved.status) *
            saved.quantity;
          if (delta !== 0) {
            await adjustProductStock(saved.productId, delta, tx);
          }
          return { saved, delta };
        });
      } catch (error) {
        if (error instanceof ProductStockUnavailableError) {
          return code(409, {
            ok: false,
            message: "สต็อกสินค้าไม่เพียงพอ ไม่สามารถนำรายการที่ยกเลิกกลับมาได้",
          });
        }
        throw error;
      }
      if (!transactionResult) {
        return code(409, {
          ok: false,
          message: "สถานะรายการเปลี่ยนไปแล้ว กรุณารีเฟรชแล้วลองใหม่",
        });
      }
      const { saved, delta } = transactionResult;

      logAudit({
        action: "BOOKING_UPDATE",
        entityType: "booking",
        entityId: saved.id,
        details: {
          bookingCode: saved.bookingCode,
          before: {
            status: before.status,
            phone: before.phone,
            recipientFirstName: before.recipientFirstName,
            recipientLastName: before.recipientLastName,
            cost: before.cost?.toString() ?? null,
          },
          after: {
            status: saved.status,
            phone: saved.phone,
            recipientFirstName: saved.recipientFirstName,
            recipientLastName: saved.recipientLastName,
            cost: saved.cost?.toString() ?? null,
          },
          requestedUnitCost: body.unitCost ?? null,
          stockDelta: delta,
        },
        user,
        request,
      });

      return {
        ok: true as const,
        message:
          body.status !== undefined
            ? `อัปเดตสถานะเป็น "${body.status}"`
            : "บันทึกข้อมูลรายการจองแล้ว",
        data: shape(saved),
      };
    },
    { params: BookingParams, body: BookingAdminUpdateBody, requireRole: "admin" }
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

      const wasActive = isActiveStatus(before.status);
      const deleted = await prisma.$transaction(async (tx) => {
        const result = await tx.bookings.deleteMany({
          where: { id: params.id, status: before.status },
        });
        if (result.count === 0) return false;
        if (wasActive) {
          await adjustProductStock(before.productId, before.quantity, tx);
        }
        return true;
      });
      if (!deleted) {
        return code(409, {
          ok: false,
          message: "สถานะรายการเปลี่ยนไปแล้ว กรุณารีเฟรชแล้วลองใหม่",
        });
      }

      logAudit({
        action: "BOOKING_DELETE",
        entityType: "booking",
        entityId: before.id,
        details: {
          bookingCode: before.bookingCode,
          productName: before.productName,
          quantity: before.quantity,
          stockDelta: wasActive ? before.quantity : 0,
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
