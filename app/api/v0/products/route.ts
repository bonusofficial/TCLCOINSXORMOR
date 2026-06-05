import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import { errorPlugin, loggerPlugin } from "@/lib/server/middleware";

/**
 * Public Products endpoint — สำหรับเว็บฝั่งผู้ใช้ (/queue)
 * Read-only, ไม่ต้อง auth
 */
const app = new Elysia({ prefix: "/api/v0/products" })
  .use(loggerPlugin)
  .use(errorPlugin)

  /** GET — list สินค้าทั้งหมด พร้อมจำนวนคิวจริง (booking ที่ไม่ถูกยกเลิก) */
  .get("/", async ({ set }) => {
    set.headers["Cache-Control"] = "private, no-store";

    const items = await prisma.products.findMany({
      orderBy: { createdAt: "desc" },
    });

    // นับจำนวนการจองจริงต่อสินค้า (ไม่นับที่ยกเลิก) — ใช้เป็น "คนเลือกอันนี้" / คิวปัจจุบัน
    const grouped = await prisma.bookings.groupBy({
      by: ["productId"],
      where: { status: { not: "ยกเลิก" }, productId: { not: null } },
      _count: { _all: true },
    });
    const queueMap = new Map(
      grouped.map((g) => [g.productId, g._count._all])
    );

    return {
      ok: true as const,
      data: items.map((p) => ({
        id: p.id,
        image: p.image,
        name: p.name,
        description: p.description,
        price: p.price.toString(),
        agentPrice: p.agentPrice.toString(),
        discountAmount: p.discountAmount.toString(),
        stockEnabled: p.stockEnabled,
        stock: p.stock,
        maxPerUserPerDay: p.maxPerUserPerDay,
        saleDates: p.saleDates,
        timeSlots: p.timeSlots,
        discountEligibleUsernames: p.discountEligibleUsernames,
        note: p.note,
        queueCount: queueMap.get(p.id) ?? 0,
      })),
    };
  });

export type ProductsPublicApp = typeof app;

export const GET = app.handle;
