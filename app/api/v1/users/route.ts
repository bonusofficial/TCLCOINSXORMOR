import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

const app = new Elysia({ prefix: "/api/v1/users" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** GET — list users (admin) */
  .get(
    "/",
    async () => {
      const items = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true,
          role: true,
          phone: true,
          credit: true,
          total_credit: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return {
        ok: true as const,
        data: items.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
        })),
      };
    },
    { requireRole: "admin" }
  );

export type UsersApp = typeof app;

export const GET = app.handle;
