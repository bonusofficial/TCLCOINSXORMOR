import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authMacros,
  loggerPlugin,
  errorPlugin,
} from "@/lib/server/middleware";

const NormalSettingBody = t.Object({
  logo: t.String(),
  title: t.String({ minLength: 1, error: "ต้องระบุชื่อเว็บไซต์" }),
  description: t.String(),
  keywords: t.String(),
  agentLink: t.String(),
  contactLine: t.String(),
  phone: t.String(),
  qrcodenormal: t.String(),
  qrcodeagent: t.String(),
  qrcodesupport: t.String(),
  warningMessage: t.String(),
});

const app = new Elysia({ prefix: "/api/v1/setting/normal" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)
  /** GET — admin only (ลูกค้าใช้ /api/v0/config แทน) */
  .get(
    "/",
    async ({ user }) => {
      const config = await prisma.config.findUnique({ where: { id: 1 } });
      if (!config) {
        return {
          ok: true,
          data: {
            id: 0,
            logo: "",
            title: "TCLCOINSXORMOR",
            description: "",
            keywords: "",
            agentLink: "",
            contactLine: "",
            phone: "",
            qrcodenormal: "",
            qrcodeagent: "",
            qrcodesupport: "",
            warningMessage: "",
          },
          accessedBy: user.email,
        } as const;
      }
      return { ok: true, data: config, accessedBy: user.email };
    },
    { requireRole: "admin" }
  )
  .put(
    "/",
    async ({ body, user }) => {
      const existing = await prisma.config.findFirst({ orderBy: { id: "desc" } });
      const saved = existing
        ? await prisma.config.update({ where: { id: existing.id }, data: body })
        : await prisma.config.create({ data: body });

      return {
        ok: true,
        message: "บันทึกการตั้งค่าทั่วไปแล้ว",
        data: saved,
        updatedBy: user.email,
      } as const;
    },
    {
      requireRole: "admin",
      body: NormalSettingBody,
    }
  );

export type SettingNormalApp = typeof app;

export const GET = app.handle;
export const PUT = app.handle;
