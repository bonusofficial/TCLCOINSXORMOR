import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import { errorPlugin, loggerPlugin } from "@/lib/server/middleware";

type TopupRound = {
  code: string;
  name: string;
  start: string;
  end: string;
  capacity: number;
  enabled: boolean;
  sortOrder: number;
};

type SaleSchedule = {
  date: string;
  bookingStart: string;
  bookingEnd: string;
  rounds: TopupRound[];
};

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseSchedules(
  saleSchedules: unknown,
  saleDates: unknown,
  timeSlots: unknown
): SaleSchedule[] {
  const schedules = toArray(saleSchedules).filter(
    (item): item is SaleSchedule =>
      !!item &&
      typeof item === "object" &&
      typeof (item as SaleSchedule).date === "string" &&
      typeof (item as SaleSchedule).bookingStart === "string" &&
      typeof (item as SaleSchedule).bookingEnd === "string" &&
      Array.isArray((item as SaleSchedule).rounds)
  );
  if (schedules.length > 0) return schedules;

  const dates = toArray(saleDates).filter(
    (date): date is string => typeof date === "string"
  );
  const slots = toArray(timeSlots).filter(
    (slot): slot is { start: string; end: string } =>
      !!slot &&
      typeof slot === "object" &&
      typeof (slot as { start?: unknown }).start === "string" &&
      typeof (slot as { end?: unknown }).end === "string"
  );
  const bookingStart = slots[0]?.start ?? "00:00";
  const bookingEnd = slots[slots.length - 1]?.end ?? "23:59";
  return dates.map((date) => ({
    date: date.slice(0, 10),
    bookingStart,
    bookingEnd,
    rounds: [
      {
        code: "LEGACY",
        name: "รอบเติมทั่วไป",
        start: bookingStart,
        end: bookingEnd,
        capacity: 999999,
        enabled: true,
        sortOrder: 0,
      },
    ],
  }));
}

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
    const roundBookings = await prisma.bookings.findMany({
      where: {
        status: { not: "ยกเลิก" },
        productId: { not: null },
        topupRoundCode: { not: null },
      },
      select: {
        productId: true,
        bookingDate: true,
        topupRoundCode: true,
      },
    });
    const roundCountMap = new Map<string, number>();
    for (const booking of roundBookings) {
      if (booking.productId == null || !booking.topupRoundCode) continue;
      const key = `${booking.productId}:${booking.bookingDate.toISOString().slice(0, 10)}:${booking.topupRoundCode}`;
      roundCountMap.set(key, (roundCountMap.get(key) ?? 0) + 1);
    }

    return {
      ok: true as const,
      data: items.map((p) => {
        const saleSchedules = parseSchedules(
          p.saleSchedules,
          p.saleDates,
          p.timeSlots
        ).map((schedule) => ({
          ...schedule,
          rounds: [...schedule.rounds]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((round) => {
              const bookedCount =
                roundCountMap.get(`${p.id}:${schedule.date}:${round.code}`) ?? 0;
              const remaining = Math.max(0, round.capacity - bookedCount);
              const nearFullThreshold = Math.max(
                1,
                Math.ceil(round.capacity * 0.2)
              );
              const status = !round.enabled
                ? "closed"
                : remaining <= 0
                  ? "full"
                  : remaining <= nearFullThreshold
                    ? "near_full"
                    : "open";
              return { ...round, bookedCount, remaining, status };
            }),
        }));
        return {
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
          saleSchedules,
          discountEligibleUsernames: p.discountEligibleUsernames,
          note: p.note,
          queueCount: queueMap.get(p.id) ?? 0,
        };
      }),
    };
  });

export type ProductsPublicApp = typeof app;

export const GET = app.handle;
