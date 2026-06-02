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
  maxBookingsPerUser: t.Optional(t.Integer({ error: "จำกัดการจองต่อวันต้องเป็นตัวเลขจำนวนเต็ม" })),
  agentPrivileges: t.Optional(t.String()),
  lineGroupNormal: t.Optional(t.String()),
  lineGroupAgent: t.Optional(t.String()),
  welcomeTitle: t.Optional(t.String()),
  welcomeAgentDesc: t.Optional(t.String()),
  welcomeMemberDesc: t.Optional(t.String()),
  howItWorks: t.Optional(
    t.Array(t.Object({ title: t.String(), desc: t.String() }))
  ),
  termsContent: t.Optional(t.String()),
  privacyContent: t.Optional(t.String()),
  reviewLink: t.Optional(t.String()),
  announceEnabled: t.Optional(t.Boolean()),
  announceBanner: t.Optional(t.String()),
  announceBadge: t.Optional(t.String()),
  announceTitle: t.Optional(t.String()),
  announceContent: t.Optional(t.String()),
  marqueeText: t.Optional(t.String()),
});

const app = new Elysia({ prefix: "/api/v1/setting/normal" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authMacros)
  /** GET — admin only (ลูกค้าใช้ /api/v0/config แทน) */
  .get(
    "/",
    async ({ user }) => {
      const config = await prisma.config.findFirst({ orderBy: { id: "desc" } });
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
            maxBookingsPerUser: 0,
            agentPrivileges: "",
            lineGroupNormal: "",
            lineGroupAgent: "",
            welcomeTitle: "",
            welcomeAgentDesc: "",
            welcomeMemberDesc: "",
            howItWorks: [],
            termsContent: "",
            privacyContent: "",
            reviewLink: "",
            announceEnabled: false,
            announceBanner: "",
            announceBadge: "",
            announceTitle: "",
            announceContent: "",
            marqueeText: "",
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
      
      const payload = {
        ...body,
        maxBookingsPerUser: body.maxBookingsPerUser !== undefined ? body.maxBookingsPerUser : undefined,
        agentPrivileges: body.agentPrivileges !== undefined ? body.agentPrivileges : undefined,
      };

      const saved = existing
         ? await prisma.config.update({ where: { id: existing.id }, data: payload })
         : await prisma.config.create({
             data: {
               logo: body.logo,
               title: body.title,
               description: body.description,
               keywords: body.keywords,
               agentLink: body.agentLink,
               contactLine: body.contactLine,
               phone: body.phone,
               qrcodenormal: body.qrcodenormal,
               qrcodeagent: body.qrcodeagent,
               qrcodesupport: body.qrcodesupport,
               warningMessage: body.warningMessage,
               maxBookingsPerUser: body.maxBookingsPerUser ?? 0,
               agentPrivileges: body.agentPrivileges ?? "",
               lineGroupNormal: body.lineGroupNormal ?? "",
               lineGroupAgent: body.lineGroupAgent ?? "",
               welcomeTitle: body.welcomeTitle ?? "",
               welcomeAgentDesc: body.welcomeAgentDesc ?? "",
               welcomeMemberDesc: body.welcomeMemberDesc ?? "",
               howItWorks: body.howItWorks ?? [],
               termsContent: body.termsContent ?? "",
               privacyContent: body.privacyContent ?? "",
               reviewLink: body.reviewLink ?? "",
               announceEnabled: body.announceEnabled ?? false,
               announceBanner: body.announceBanner ?? "",
               announceBadge: body.announceBadge ?? "",
               announceTitle: body.announceTitle ?? "",
               announceContent: body.announceContent ?? "",
               marqueeText: body.marqueeText ?? "",
             },
           });

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
