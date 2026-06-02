import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import { ProductBody } from "@/lib/server/schemas/product";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

const app = new Elysia({ prefix: "/api/v1/products" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** GET — list ทั้งหมด (admin — ลูกค้าใช้ /api/v0/products แทน) */
  .get(
    "/",
    async () => {
      const items = await prisma.products.findMany({
        orderBy: { createdAt: "desc" },
      });
      return {
        ok: true as const,
        data: items.map((p) => ({
          ...p,
          price: p.price.toString(),
          cost: p.cost.toString(),
          agentPrice: p.agentPrice.toString(),
          discountAmount: p.discountAmount.toString(),
        })),
      };
    },
    { requireRole: "admin" }
  )

  /** POST — create */
  .post(
    "/",
    async ({ body }) => {
      const saved = await prisma.products.create({
        data: {
          image: body.image,
          name: body.name,
          description: body.description,
          price: body.price,
          cost: body.cost,
          agentPrice: body.agentPrice,
          stockEnabled: body.stockEnabled,
          stock: body.stock,
          saleDates: body.saleDates,
          timeSlots: body.timeSlots,
          discountEligibleUsernames: body.discountEligibleUsernames,
          discountAmount: body.discountAmount,
          note: body.note ?? null,
        },
      });
      return {
        ok: true as const,
        message: "เพิ่มสินค้าใหม่แล้ว",
        data: {
          ...saved,
          price: saved.price.toString(),
          cost: saved.cost.toString(),
          agentPrice: saved.agentPrice.toString(),
          discountAmount: saved.discountAmount.toString(),
        },
      };
    },
    { body: ProductBody, requireRole: "admin" }
  );

export type ProductsApp = typeof app;

export const GET = app.handle;
export const POST = app.handle;
