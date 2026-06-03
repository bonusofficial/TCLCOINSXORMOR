import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

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
    async () => {
      const bookings = await prisma.bookings.findMany({
        where: { status: { not: "ยกเลิก" }, userId: { not: null } },
        select: { userId: true, status: true, price: true },
      });

      const map = new Map<
        string,
        { total: number; success: number; spent: number }
      >();
      for (const b of bookings) {
        if (!b.userId) continue;
        const e = map.get(b.userId) ?? { total: 0, success: 0, spent: 0 };
        e.total++;
        if (b.status === "สำเร็จ") {
          e.success++;
          e.spent += Number(b.price);
        }
        map.set(b.userId, e);
      }

      const userIds = Array.from(map.keys());
      const users = userIds.length
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              memberNo: true,
              name: true,
              username: true,
              role: true,
              image: true,
            },
          })
        : [];
      const userMap = new Map(users.map((u) => [u.id, u]));

      const rows = userIds
        .map((id) => {
          const agg = map.get(id)!;
          const u = userMap.get(id);
          return {
            userId: id,
            memberNo: u?.memberNo ?? null,
            name: u?.name ?? "(ไม่พบผู้ใช้)",
            username: u?.username ?? null,
            role: u?.role ?? null,
            image: u?.image ?? null,
            totalBookings: agg.total,
            successOrders: agg.success,
            totalSpent: agg.spent,
          };
        })
        .sort(
          (a, b) =>
            b.totalBookings - a.totalBookings || b.totalSpent - a.totalSpent
        );

      return { ok: true as const, data: rows };
    },
    { requireRole: "admin" }
  );

export type UsersSummaryApp = typeof app;

export const GET = app.handle;
