import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import { AccountBody } from "@/lib/server/schemas/booking";
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

  /** GET — list ทั้งหมด + summary */
  .get(
    "/",
    async () => {
      const items = await prisma.accounts.findMany({
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 500,
      });
      const totalIncome = items.reduce((s, i) => s + Number(i.income), 0);
      const totalExpense = items.reduce((s, i) => s + Number(i.expense), 0);
      return {
        ok: true as const,
        data: items.map(shape),
        summary: {
          totalIncome: totalIncome.toFixed(2),
          totalExpense: totalExpense.toFixed(2),
          balance: (totalIncome - totalExpense).toFixed(2),
        },
      };
    },
    { requireRole: "admin" }
  )

  /** POST — สร้างรายการ */
  .post(
    "/",
    async ({ body }) => {
      const saved = await prisma.accounts.create({
        data: {
          date: new Date(body.date),
          description: body.description ?? null,
          category: body.category,
          income: body.income,
          expense: body.expense,
        },
      });
      return {
        ok: true as const,
        message: "เพิ่มรายการแล้ว",
        data: shape(saved),
      };
    },
    { body: AccountBody, requireRole: "admin" }
  );

export type AccountsApp = typeof app;

export const GET = app.handle;
export const POST = app.handle;
