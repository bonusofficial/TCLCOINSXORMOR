import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";
import { calculateUserActivity } from "@/lib/server/user-inactivity";

const app = new Elysia({ prefix: "/api/v1/users" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** GET — list users (admin) */
  .get(
    "/",
    async () => {
      const [items, latestBookings] = await Promise.all([
        prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            memberNo: true,
            name: true,
            email: true,
            username: true,
            image: true,
            role: true,
            phone: true,
            emailVerified: true,
            shopName: true,
            lineId: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.bookings.groupBy({
          by: ["userId"],
          where: { userId: { not: null } },
          _max: { createdAt: true },
        }),
      ]);
      const latestBookingByUserId = new Map<string, Date | null>();
      for (const item of latestBookings) {
        if (item.userId) {
          latestBookingByUserId.set(item.userId, item._max.createdAt);
        }
      }
      const now = new Date();
      return {
        ok: true as const,
        data: items.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
          ...calculateUserActivity(
            u.createdAt,
            latestBookingByUserId.get(u.id) ?? null,
            now,
            u.role
          ),
        })),
      };
    },
    { requireRole: "admin" }
  );

export type UsersApp = typeof app;

export const GET = app.handle;
