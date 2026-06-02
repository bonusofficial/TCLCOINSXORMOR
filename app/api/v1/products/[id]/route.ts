import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";
import { ProductBody } from "@/lib/server/schemas/product";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

const Params = t.Object({
  id: t.Numeric({ minimum: 1 }),
});

const app = new Elysia({ prefix: "/api/v1/products" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** GET /:id */
  .get(
    "/:id",
    async ({ params, status }) => {
      const item = await prisma.products.findUnique({
        where: { id: params.id },
      });
      if (!item) return status(404, { ok: false, message: "ไม่พบสินค้า" });
      return {
        ok: true as const,
        data: {
          ...item,
          price: item.price.toString(),
          cost: item.cost.toString(),
          agentPrice: item.agentPrice.toString(),
          discountAmount: item.discountAmount.toString(),
        },
      };
    },
    { params: Params, requireRole: "admin" }
  )

  /** PATCH /:id — update */
  .patch(
    "/:id",
    async ({ params, body, status }) => {
      try {
        const saved = await prisma.products.update({
          where: { id: params.id },
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
          message: "อัปเดตสินค้าแล้ว",
          data: {
            ...saved,
            price: saved.price.toString(),
            cost: saved.cost.toString(),
            agentPrice: saved.agentPrice.toString(),
            discountAmount: saved.discountAmount.toString(),
          },
        };
      } catch {
        return status(404, { ok: false, message: "ไม่พบสินค้า" });
      }
    },
    { params: Params, body: ProductBody, requireRole: "admin" }
  )

  /** DELETE /:id */
  .delete(
    "/:id",
    async ({ params, status }) => {
      try {
        await prisma.products.delete({ where: { id: params.id } });
        return { ok: true as const, message: "ลบสินค้าแล้ว" };
      } catch {
        return status(404, { ok: false, message: "ไม่พบสินค้า" });
      }
    },
    { params: Params, requireRole: "admin" }
  );

export type ProductsItemApp = typeof app;

export const GET = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
