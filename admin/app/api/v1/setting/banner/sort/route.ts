import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

const app = new Elysia({ prefix: "/api/v1/setting/banner/sort" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)

  /** PUT — จัดเรียงลำดับ banner ทั้งหมด */
  .put(
    "/",
    async ({ body }) => {
      const { ids } = body;
      await Promise.all(
        ids.map((id: number, idx: number) =>
          prisma.banners.update({
            where: { id },
            data: { sortOrder: idx },
          })
        )
      );
      return {
        ok: true as const,
        message: "จัดเรียงลำดับรูปภาพสไลเดอร์เรียบร้อยแล้ว",
      };
    },
    {
      body: t.Object({
        ids: t.Array(t.Numeric()),
      }),
      requireRole: "admin",
    }
  );

export type BannerSortApp = typeof app;

export const PUT = app.handle;
