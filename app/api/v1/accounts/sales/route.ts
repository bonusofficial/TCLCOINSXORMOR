import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

/**
 * รายรับ/กำไรจาก order ที่ "สำเร็จ" — ดึงจาก bookings อัตโนมัติ
 * พอแอดมินกด "สำเร็จ" ในหน้าจอง order นั้นจะโผล่ที่นี่ทันที (derived, ไม่ต้องบันทึกซ้ำ)
 *
 * กำไร = ยอดขายรวม (booking.price) − ต้นทุนรวมของทุกชิ้น
 */

/** เริ่มต้น "วันนี้" ตามเวลาไทย (UTC+7) เป็น Date (UTC) — กัน tz ของ server เพี้ยน */
function bangkokStartOfToday(): Date {
  const nowBkk = new Date(Date.now() + 7 * 3600 * 1000);
  return new Date(
    Date.UTC(
      nowBkk.getUTCFullYear(),
      nowBkk.getUTCMonth(),
      nowBkk.getUTCDate()
    ) - 7 * 3600 * 1000
  );
}

function productNameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function totalBookingCost(
  storedCost: { toString(): string } | null,
  productUnitCost: number,
  quantity: number
) {
  if (storedCost == null) {
    return roundCurrency(productUnitCost * quantity);
  }
  const snapshot = Number(storedCost);
  // รองรับ snapshot เก่าที่เคยบันทึกต้นทุนต่อชิ้นแทนต้นทุนรวม
  if (quantity > 1 && Math.abs(snapshot - productUnitCost) < 0.005) {
    return roundCurrency(snapshot * quantity);
  }
  return snapshot;
}

type CustomerRole = "member" | "vip" | "agent" | "admin";

/** ยศ ณ เวลาจองถูกล็อกอยู่ใน prefix ของรหัสจอง */
function customerRoleFromBookingCode(bookingCode: string): CustomerRole {
  const prefix = bookingCode.split("-", 1)[0]?.toUpperCase();
  if (prefix === "ADM") return "admin";
  if (prefix === "AG") return "agent";
  if (prefix === "VIP") return "vip";
  return "member";
}

const app = new Elysia({ prefix: "/api/v1/accounts/sales" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** GET — list รายการขายที่สำเร็จ พร้อมกำไร + สรุปกำไรวันนี้/รวม (admin) */
  .get(
    "/",
    async () => {
      const bookings = await prisma.bookings.findMany({
        where: { status: "สำเร็จ" },
        // วันที่ทางบัญชียึดเวลาที่ลูกค้าสร้างออเดอร์ ไม่ใช่เวลาที่แอดมินแก้ไขล่าสุด
        orderBy: { createdAt: "desc" },
      });

      // map productId/productName → ต้นทุน (fallback สำหรับ booking เก่าที่ไม่ผูก productId)
      const productIds = [
        ...new Set(
          bookings
            .map((b) => b.productId)
            .filter((id): id is number => id != null)
        ),
      ];
      const productNames = [
        ...new Set(
          bookings
            .map((b) => b.productName.trim())
            .filter(Boolean)
        ),
      ];
      const productFilters = [
        ...(productIds.length ? [{ id: { in: productIds } }] : []),
        ...(productNames.length ? [{ name: { in: productNames } }] : []),
      ];
      const products = productFilters.length
        ? await prisma.products.findMany({
            where: { OR: productFilters },
            select: { id: true, name: true, cost: true },
            orderBy: { id: "desc" },
          })
        : [];
      const costMap = new Map(products.map((p) => [p.id, Number(p.cost)]));
      const costByName = new Map<string, number>();
      for (const p of products) {
        const key = productNameKey(p.name);
        if (!costByName.has(key)) {
          costByName.set(key, Number(p.cost));
        }
      }

      const startToday = bangkokStartOfToday();

      let todayProfit = 0;
      let todaySales = 0;
      let totalProfit = 0;
      let totalSales = 0;
      let totalCost = 0;
      let todayCount = 0;

      const rows = bookings.map((b) => {
        const salePrice = Number(b.price);
        const productUnitCost =
          (b.productId != null ? costMap.get(b.productId) : undefined) ??
          costByName.get(productNameKey(b.productName)) ??
          0;
        const cost = totalBookingCost(
          b.cost,
          productUnitCost,
          b.quantity
        );
        const profit = salePrice - cost;
        const isToday = b.createdAt >= startToday;

        totalSales += salePrice;
        totalCost += cost;
        totalProfit += profit;
        if (isToday) {
          todayProfit += profit;
          todaySales += salePrice;
          todayCount += 1;
        }

        return {
          id: b.id,
          bookingCode: b.bookingCode,
          productName: b.productName,
          quantity: b.quantity,
          unitPrice: b.unitPrice?.toString() ?? null,
          username: b.username,
          recipientFirstName: b.recipientFirstName,
          recipientLastName: b.recipientLastName,
          phone: b.phone,
          customerRole: customerRoleFromBookingCode(b.bookingCode),
          salePrice: salePrice.toFixed(2),
          unitCost: (cost / Math.max(1, b.quantity)).toFixed(2),
          cost: cost.toFixed(2),
          profit: profit.toFixed(2),
          lastUpdatedAt: b.updatedAt.toISOString(),
          bookedAt: b.createdAt.toISOString(),
          bookingDate: b.bookingDate.toISOString(),
          bookingTime: b.bookingTime,
          bookingWindowStart: b.bookingWindowStart,
          bookingWindowEnd: b.bookingWindowEnd,
          topupRoundName: b.topupRoundName,
          topupRoundStart: b.topupRoundStart,
          topupRoundEnd: b.topupRoundEnd,
        };
      });

      return {
        ok: true as const,
        data: rows,
        summary: {
          todayProfit: todayProfit.toFixed(2),
          todaySales: todaySales.toFixed(2),
          todayCount,
          totalProfit: totalProfit.toFixed(2),
          totalSales: totalSales.toFixed(2),
          totalCost: totalCost.toFixed(2),
          count: rows.length,
        },
      };
    },
    { requireRole: "admin" }
  );

export type AccountsSalesApp = typeof app;

export const GET = app.handle;
