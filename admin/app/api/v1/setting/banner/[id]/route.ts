import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

const Params = t.Object({
  id: t.Numeric({ minimum: 1 }),
});

const app = new Elysia({ prefix: "/api/v1/setting/banner" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** DELETE /:id */
  .delete(
    "/:id",
    async ({ params, status }) => {
      try {
        await prisma.banners.delete({ where: { id: params.id } });
        return { ok: true as const, message: "ลบ banner แล้ว" };
      } catch {
        return status(404, { ok: false, message: "ไม่พบ banner" });
      }
    },
    { params: Params, requireRole: "admin" }
  );

export type BannerItemApp = typeof app;

export const DELETE = app.handle;
