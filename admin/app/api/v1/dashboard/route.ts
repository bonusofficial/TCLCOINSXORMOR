import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

/* ─────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────── */

/** วันแรกของเดือน */
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
/** วันแรกของเดือนก่อน */
function startOfPrevMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}
/** วันแรกของวัน */
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
/** บวก/ลบจำนวนวัน โดยคงเวลาในวันเดิม */
function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const THAI_WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

type RevenueChartBooking = {
  price: unknown;
  createdAt: Date;
};

function buildRevenueCharts(bookings: RevenueChartBooking[], now: Date) {
  const today = startOfDay(now);
  const weekStart = addDays(today, -6);
  const tomorrow = addDays(today, 1);
  const thisMonth = startOfMonth(now);
  const thisYear = new Date(now.getFullYear(), 0, 1);
  const nextYear = new Date(now.getFullYear() + 1, 0, 1);

  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    return {
      label: THAI_WEEKDAYS[day.getDay()],
      value: 0,
    };
  });

  const month = Array.from({ length: today.getDate() }, (_, i) => ({
    label: `${i + 1}`,
    value: 0,
  }));

  const year = THAI_MONTHS.map((label) => ({
    label,
    value: 0,
  }));

  for (const b of bookings) {
    const createdAt = b.createdAt;
    const day = startOfDay(createdAt);
    const value = Number(b.price ?? 0);

    if (day >= weekStart && day < tomorrow) {
      const idx = Math.floor((day.getTime() - weekStart.getTime()) / 86400000);
      if (week[idx]) week[idx].value += value;
    }

    if (createdAt >= thisMonth && createdAt < tomorrow) {
      const idx = createdAt.getDate() - 1;
      if (month[idx]) month[idx].value += value;
    }

    if (createdAt >= thisYear && createdAt < nextYear) {
      year[createdAt.getMonth()].value += value;
    }
  }

  return { week, month, year };
}

/** คำนวณ % เปลี่ยนแปลง */
function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const SUCCESS_STATUSES = ["สำเร็จ", "ชำระแล้ว"];

type SalesUser = {
  id: string;
  name: string;
  username: string | null;
  displayUsername: string | null;
  role: string | null;
};

function normalizeIdentity(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function indexSalesUsers(users: SalesUser[]) {
  const byId = new Map<string, SalesUser>();
  const byIdentity = new Map<string, SalesUser>();

  for (const user of users) {
    byId.set(user.id, user);
    for (const value of [user.username, user.displayUsername, user.name]) {
      const key = normalizeIdentity(value);
      if (key && !byIdentity.has(key)) byIdentity.set(key, user);
    }
  }

  return { byId, byIdentity };
}

/* ─────────────────────────────────────────────
 * Dashboard Stats API
 * ───────────────────────────────────────────── */

const app = new Elysia({ prefix: "/api/v1/dashboard" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** GET — Dashboard overview (admin only) */
  .get(
    "/",
    async () => {
      const now = new Date();
      const today = startOfDay(now);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const thisMonth = startOfMonth(now);
      const prevMonth = startOfPrevMonth(now);
      const thisYear = new Date(now.getFullYear(), 0, 1);
      const nextYear = new Date(now.getFullYear() + 1, 0, 1);
      const last7Start = addDays(today, -6);
      const chartStart = new Date(Math.min(thisYear.getTime(), last7Start.getTime()));

      // ─── Parallel queries ───
      const [
        // Revenue (from bookings with successful status)
        totalRevenue,
        thisMonthRevenue,
        prevMonthRevenue,
        // Users
        totalMembers,
        membersLast30,
        totalAgents,
        agentsLast30,
        // Orders
        ordersToday,
        ordersYesterday,
        // Sparkline: daily revenue for 7 days
        // Recent bookings
        recentBookings,
        // All bookings for top packages + top agents aggregate
        allSuccessBookings,
        // Revenue chart data for week / month / year ranges
        chartBookings,
      ] = await Promise.all([
        // 1. Total revenue (all time, สำเร็จ)
        prisma.bookings.aggregate({
          _sum: { price: true },
          where: { status: "สำเร็จ" },
        }),
        // 2. This month revenue
        prisma.bookings.aggregate({
          _sum: { price: true },
          where: {
            status: "สำเร็จ",
            createdAt: { gte: thisMonth },
          },
        }),
        // 3. Previous month revenue
        prisma.bookings.aggregate({
          _sum: { price: true },
          where: {
            status: "สำเร็จ",
            createdAt: { gte: prevMonth, lt: thisMonth },
          },
        }),
        // 4. Total members (not Agent, not Admin)
        prisma.user.count({
          where: {
            OR: [
              { role: { not: "Agent" } },
              { role: null },
            ],
            AND: [
              {
                OR: [
                  { role: { not: "Admin" } },
                  { role: null },
                ],
              },
            ],
          },
        }),
        // 5. Members created in last 30 days
        prisma.user.count({
          where: {
            createdAt: { gte: new Date(now.getTime() - 30 * 86400000) },
            OR: [
              { role: { not: "Agent" } },
              { role: null },
            ],
            AND: [
              {
                OR: [
                  { role: { not: "Admin" } },
                  { role: null },
                ],
              },
            ],
          },
        }),
        // 6. Total agents
        prisma.user.count({
          where: { role: "Agent" },
        }),
        // 7. Agents created in last 30 days
        prisma.user.count({
          where: {
            role: "Agent",
            createdAt: { gte: new Date(now.getTime() - 30 * 86400000) },
          },
        }),
        // 8. Orders today
        prisma.bookings.count({
          where: { createdAt: { gte: today } },
        }),
        // 9. Orders yesterday
        prisma.bookings.count({
          where: { createdAt: { gte: yesterday, lt: today } },
        }),
        // 10. Recent 10 bookings
        prisma.bookings.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        // 11. All successful bookings for aggregation
        prisma.bookings.findMany({
          where: { status: { in: SUCCESS_STATUSES } },
          select: {
            productName: true,
            price: true,
            userId: true,
            username: true,
          },
        }),
        // 12. Revenue bookings for chart (สำเร็จ only)
        prisma.bookings.findMany({
          where: {
            status: { in: SUCCESS_STATUSES },
            createdAt: { gte: chartStart, lt: nextYear },
          },
          select: {
            price: true,
            createdAt: true,
          },
        }),
      ]);

      // ─── Sparkline: daily revenue for the last 7 days ───
      const sparklineRevenue: number[] = [];
      const sparklineMembers: number[] = [];
      const sparklineAgents: number[] = [];
      const sparklineOrders: number[] = [];

      // We'll compute sparklines from separate queries (7 days)
      const sparkDays = 7;
      const sparkPromises = [];
      for (let i = sparkDays - 1; i >= 0; i--) {
        const dayStart = new Date(today);
        dayStart.setDate(dayStart.getDate() - i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        sparkPromises.push(
          prisma.bookings.aggregate({
            _sum: { price: true },
            where: { status: "สำเร็จ", createdAt: { gte: dayStart, lt: dayEnd } },
          }),
          prisma.user.count({
            where: {
              createdAt: { lt: dayEnd },
              OR: [{ role: { not: "Agent" } }, { role: null }],
              AND: [{ OR: [{ role: { not: "Admin" } }, { role: null }] }],
            },
          }),
          prisma.user.count({
            where: { role: "Agent", createdAt: { lt: dayEnd } },
          }),
          prisma.bookings.count({
            where: { createdAt: { gte: dayStart, lt: dayEnd } },
          }),
        );
      }
      const sparkResults = await Promise.all(sparkPromises);
      for (let i = 0; i < sparkDays; i++) {
        const base = i * 4;
        sparklineRevenue.push(Number((sparkResults[base] as { _sum: { price: unknown } })._sum.price ?? 0));
        sparklineMembers.push(sparkResults[base + 1] as number);
        sparklineAgents.push(sparkResults[base + 2] as number);
        sparklineOrders.push(sparkResults[base + 3] as number);
      }

      // ─── Stat Cards ───
      const totalRevenueVal = Number(totalRevenue._sum.price ?? 0);
      const thisMonthVal = Number(thisMonthRevenue._sum.price ?? 0);
      const prevMonthVal = Number(prevMonthRevenue._sum.price ?? 0);

      const stats = {
        revenue: {
          total: totalRevenueVal,
          delta: pctDelta(thisMonthVal, prevMonthVal),
          deltaLabel: "vs เดือนก่อน",
          sparkline: sparklineRevenue,
        },
        members: {
          total: totalMembers,
          new30d: membersLast30,
          delta: membersLast30,
          deltaLabel: `เพิ่มใน 30 วัน`,
          sparkline: sparklineMembers,
        },
        agents: {
          total: totalAgents,
          new30d: agentsLast30,
          delta: agentsLast30,
          deltaLabel: "ตัวแทนใหม่",
          sparkline: sparklineAgents,
        },
        ordersToday: {
          total: ordersToday,
          delta: pctDelta(ordersToday, ordersYesterday),
          deltaLabel: "vs เมื่อวาน",
          sparkline: sparklineOrders,
        },
      };

      // ─── Revenue Chart (week / month / year) ───
      const revenueCharts = buildRevenueCharts(chartBookings, now);

      // ─── Recent Bookings ───
      const recentBookingsData = recentBookings.map((b) => ({
        id: b.id,
        bookingCode: b.bookingCode,
        productName: b.productName,
        username: b.username,
        price: b.price.toString(),
        status: b.status,
        createdAt: b.createdAt.toISOString(),
      }));

      // ─── Top Packages ───
      const pkgMap = new Map<string, { name: string; count: number; revenue: number }>();
      for (const b of allSuccessBookings) {
        const existing = pkgMap.get(b.productName);
        if (existing) {
          existing.count++;
          existing.revenue += Number(b.price);
        } else {
          pkgMap.set(b.productName, {
            name: b.productName,
            count: 1,
            revenue: Number(b.price),
          });
        }
      }
      const topPackages = Array.from(pkgMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((p, i) => ({
          rank: i + 1,
          name: p.name,
          sold: p.count,
          revenue: p.revenue,
        }));
      // Normalize share (max = 100)
      const maxSold = topPackages[0]?.sold ?? 1;
      const topPackagesWithShare = topPackages.map((p) => ({
        ...p,
        share: Math.round((p.sold / maxSold) * 100),
      }));

      // ─── Top Agents ───
      const salesUsers = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          username: true,
          displayUsername: true,
          role: true,
        },
      });
      const { byId: usersById, byIdentity: usersByIdentity } = indexSalesUsers(salesUsers);
      const agentMap = new Map<string, { key: string; user: SalesUser | null; username: string; revenue: number; orders: number }>();

      for (const b of allSuccessBookings) {
        const user = b.userId
          ? usersById.get(b.userId) ?? null
          : usersByIdentity.get(normalizeIdentity(b.username)) ?? null;
        const normalizedUsername = normalizeIdentity(b.username);
        const key = user?.id ? `user:${user.id}` : normalizedUsername ? `legacy:${normalizedUsername}` : "";
        if (!key) continue;

        const existing = agentMap.get(key);
        if (existing) {
          existing.orders++;
          existing.revenue += Number(b.price);
        } else {
          agentMap.set(key, {
            key,
            user,
            username: b.username,
            revenue: Number(b.price),
            orders: 1,
          });
        }
      }

      const topAgents = Array.from(agentMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map((a, i) => ({
          rank: i + 1,
          name: a.user?.name ?? a.username,
          username: a.user?.username ? `@${a.user.username}` : a.username,
          revenue: a.revenue,
          orders: a.orders,
        }));

      return {
        ok: true as const,
        data: {
          stats,
          chart: revenueCharts,
          recentBookings: recentBookingsData,
          topPackages: topPackagesWithShare,
          topAgents,
        },
      };
    },
    { requireRole: "admin" }
  );

export type DashboardApp = typeof app;

export const GET = app.handle;
