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
 * กำไร = ราคาขาย (booking.price) − ต้นทุน (product.cost)
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
        orderBy: { updatedAt: "desc" },
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
        // ใช้ต้นทุนที่ "ล็อกไว้ตอนปิดการขาย" (snapshot) ก่อน — ถ้ายังไม่มี (ออเดอร์เก่า)
        // ค่อย fallback ไปอ่านต้นทุนสดจาก product ตาม productId/ชื่อสินค้า
        const cost =
          b.cost != null
            ? Number(b.cost)
            : (b.productId != null ? costMap.get(b.productId) : undefined) ??
              costByName.get(productNameKey(b.productName)) ??
              0;
        const profit = salePrice - cost;
        const isToday = b.updatedAt >= startToday;

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
          username: b.username,
          salePrice: salePrice.toFixed(2),
          cost: cost.toFixed(2),
          profit: profit.toFixed(2),
          completedAt: b.updatedAt.toISOString(),
          bookingDate: b.bookingDate.toISOString(),
          bookingTime: b.bookingTime,
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
