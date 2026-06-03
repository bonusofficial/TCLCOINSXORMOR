import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import { AccountBody, AccountParams } from "@/lib/server/schemas/booking";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

function shape(a: {
  id: number;
  date: Date;
  description: string | null;
  category: string;
  income: { toString(): string };
  expense: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: a.id,
    date: a.date.toISOString(),
    description: a.description,
    category: a.category,
    income: a.income.toString(),
    expense: a.expense.toString(),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

const app = new Elysia({ prefix: "/api/v1/accounts" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  .patch(
    "/:id",
    async ({ params, body, status }) => {
      try {
        const saved = await prisma.accounts.update({
          where: { id: params.id },
          data: {
            date: new Date(body.date),
            description: body.description ?? null,
            category: body.category,
            income: body.income,
            expense: body.expense,
          },
        });
        return { ok: true as const, message: "อัปเดตแล้ว", data: shape(saved) };
      } catch {
        return status(404, { ok: false, message: "ไม่พบรายการ" });
      }
    },
    { params: AccountParams, body: AccountBody, requireRole: "admin" }
  )

  .delete(
    "/:id",
    async ({ params, status }) => {
      try {
        await prisma.accounts.delete({ where: { id: params.id } });
        return { ok: true as const, message: "ลบรายการแล้ว" };
      } catch {
        return status(404, { ok: false, message: "ไม่พบรายการ" });
      }
    },
    { params: AccountParams, requireRole: "admin" }
  );

export type AccountsItemApp = typeof app;

export const PATCH = app.handle;
export const DELETE = app.handle;
