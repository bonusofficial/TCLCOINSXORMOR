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

  /** GET — list สินค้าทั้งหมด */
  .get("/", async () => {
    const items = await prisma.products.findMany({
      orderBy: { createdAt: "desc" },
    });
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
        saleDates: p.saleDates,
        timeSlots: p.timeSlots,
        discountEligibleUsernames: p.discountEligibleUsernames,
        note: p.note,
      })),
    };
  });

export type ProductsPublicApp = typeof app;

export const GET = app.handle;
