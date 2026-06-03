import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

const SUCCESS_STATUSES = ["สำเร็จ", "ชำระแล้ว"];

type SummaryUser = {
  id: string;
  memberNo: number | null;
  name: string;
  username: string | null;
  displayUsername: string | null;
  role: string | null;
  image: string | null;
};

function normalizeIdentity(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function indexSummaryUsers(users: SummaryUser[]) {
  const byId = new Map<string, SummaryUser>();
  const byIdentity = new Map<string, SummaryUser>();

  for (const user of users) {
    byId.set(user.id, user);
    for (const value of [user.username, user.displayUsername, user.name]) {
      const key = normalizeIdentity(value);
      if (key && !byIdentity.has(key)) byIdentity.set(key, user);
    }
  }

  return { byId, byIdentity };
}

/**
 * สรุปยอดตามบุคคล (admin) — รวมการจองต่อผู้ใช้
 *  - totalBookings : จำนวนการจองทั้งหมด (ไม่นับที่ยกเลิก)
 *  - successOrders : จำนวนรายการที่สำเร็จ
 *  - totalSpent    : ยอดเงินรวมจากรายการที่สำเร็จ
 * เรียงตามคนที่จองมากที่สุด
 */
const app = new Elysia({ prefix: "/api/v1/users/summary" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  .get(
    "/",
    async ({ query }) => {
      // กรองตามเดือน (YYYY-MM) จาก bookingDate — เก็บเป็นวันไทยที่เที่ยงคืน UTC ขอบเขต UTC จึงตรงเดือนไทยพอดี
      const monthFilter = (() => {
        const m = (query.month ?? "").trim();
        if (!/^\d{4}-\d{2}$/.test(m)) return {};
        const [y, mo] = m.split("-").map(Number);
        return {
          bookingDate: {
            gte: new Date(Date.UTC(y, mo - 1, 1)),
            lt: new Date(Date.UTC(y, mo, 1)),
          },
        };
      })();

      const [bookings, users] = await Promise.all([
        prisma.bookings.findMany({
          where: { status: { not: "ยกเลิก" }, ...monthFilter },
          select: { userId: true, username: true, status: true, price: true },
        }),
        prisma.user.findMany({
          select: {
            id: true,
            memberNo: true,
            name: true,
            username: true,
            displayUsername: true,
            role: true,
            image: true,
          },
        }),
      ]);
      const { byId: usersById, byIdentity: usersByIdentity } = indexSummaryUsers(users);

      const map = new Map<
        string,
        { user: SummaryUser | null; username: string; total: number; success: number; spent: number }
      >();
      for (const b of bookings) {
        const user = b.userId
          ? usersById.get(b.userId) ?? null
          : usersByIdentity.get(normalizeIdentity(b.username)) ?? null;
        const normalizedUsername = normalizeIdentity(b.username);
        const key = user?.id ? `user:${user.id}` : normalizedUsername ? `legacy:${normalizedUsername}` : "";
        if (!key) continue;

        const e = map.get(key) ?? {
          user,
          username: b.username,
          total: 0,
          success: 0,
          spent: 0,
        };
        e.total++;
        if (SUCCESS_STATUSES.includes(b.status)) {
          e.success++;
          e.spent += Number(b.price);
        }
        map.set(key, e);
      }

      const rows = Array.from(map.entries())
        .map(([key, agg]) => {
          const u = agg.user;
          return {
            userId: u?.id ?? key,
            memberNo: u?.memberNo ?? null,
            name: u?.name ?? agg.username,
            username: u?.username ?? agg.username,
            role: u?.role ?? null,
            image: u?.image ?? null,
            totalBookings: agg.total,
            successOrders: agg.success,
            totalSpent: agg.spent,
          };
        })
        .sort(
          (a, b) =>
            b.totalSpent - a.totalSpent || b.successOrders - a.successOrders || b.totalBookings - a.totalBookings
        );

      return { ok: true as const, data: rows };
    },
    {
      requireRole: "admin",
      query: t.Object({ month: t.Optional(t.String()) }),
    }
  );

export type UsersSummaryApp = typeof app;

export const GET = app.handle;
