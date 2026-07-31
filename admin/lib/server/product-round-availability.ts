import { prisma } from "@/lib/prisma";

type RoundAvailability = {
  bookedCount: number;
  remaining: number;
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

function roundKey(productId: number, date: string, code: string) {
  return `${productId}:${date.slice(0, 10)}:${code.trim()}`;
}

export async function loadRoundAvailability(productIds: number[]) {
  const ids = [...new Set(productIds.filter((id) => Number.isInteger(id)))];
  const availability = new Map<string, RoundAvailability>();
  if (ids.length === 0) return availability;

  const activeBookings = await prisma.bookings.groupBy({
    by: ["productId", "bookingDate", "topupRoundCode"],
    where: {
      productId: { in: ids },
      topupRoundCode: { not: null },
      status: { not: "ยกเลิก" },
    },
    _sum: { quantity: true },
  });

  for (const booking of activeBookings) {
    if (booking.productId == null || !booking.topupRoundCode) continue;
    const key = roundKey(
      booking.productId,
      booking.bookingDate.toISOString(),
      booking.topupRoundCode
    );
    availability.set(key, {
      bookedCount: Math.max(0, booking._sum.quantity ?? 0),
      remaining: 0,
    });
  }

  return availability;
}

export function withRoundAvailability(
  productId: number,
  saleSchedules: unknown,
  availability: Map<string, RoundAvailability>
) {
  return toArray(saleSchedules).map((value) => {
    if (!value || typeof value !== "object") return value;
    const schedule = value as Record<string, unknown>;
    const date = String(schedule.date ?? "").slice(0, 10);
    const rounds = toArray(schedule.rounds).map((roundValue) => {
      if (!roundValue || typeof roundValue !== "object") return roundValue;
      const round = roundValue as Record<string, unknown>;
      const code = String(round.code ?? "").trim();
      const capacity = Math.max(0, Number(round.capacity) || 0);
      const bookedCount =
        availability.get(roundKey(productId, date, code))?.bookedCount ?? 0;
      return {
        ...round,
        bookedCount,
        remaining: Math.max(0, capacity - bookedCount),
      };
    });

    return { ...schedule, rounds };
  });
}
