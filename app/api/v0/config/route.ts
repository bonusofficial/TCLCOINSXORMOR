import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import {
  authPlugin,
  errorPlugin,
  loggerPlugin,
} from "@/lib/server/middleware";

/**
 * Public Config endpoint — สำหรับเว็บฝั่งผู้ใช้
 * ใช้ที่ /queue, hero, footer ฯลฯ
 * Read-only, ไม่ต้อง auth
 */
const app = new Elysia({ prefix: "/api/v0/config" })
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(authPlugin)

  /** GET — โหลด config ทั่วไป พร้อมสถานะระบบ Real-time */
  .get("/", async ({ set, user }) => {
    set.headers["Cache-Control"] = "private, no-store";
    const userRole = (
      (user as { role?: string } | null)?.role ?? "member"
    ).toLowerCase();
    const canViewAgentGroup = ["agent", "vip", "admin"].includes(userRole);
    const canViewVipGroup = ["vip", "admin"].includes(userRole);

    // นับตรงจาก DB ด้วย count() — แม่นยำ ไม่ติดเพดาน (กันกรณีออเดอร์เกิน 200)
    const [config, activeQueues, totalCompleted, cancelledCount, totalBookings, totalUsers, stockAgg] =
      await Promise.all([
        prisma.config.findFirst({ orderBy: { id: "desc" } }),
        // ยอดคิวปัจจุบัน = ออเดอร์ที่ยังอยู่ในคิว (รอตรวจสอบ + กำลังดำเนินการ) ให้ตรงกับหน้าจัดการจอง
        prisma.bookings.count({ where: { status: { in: ["รอตรวจสอบ", "กำลังดำเนินการ"] } } }),
        prisma.bookings.count({ where: { status: "สำเร็จ" } }),
        prisma.bookings.count({ where: { status: "ยกเลิก" } }),
        prisma.bookings.count(),
        prisma.user.count(),
        prisma.products.aggregate({
          where: { stockEnabled: true },
          _sum: { stock: true },
        }),
      ]);

    // เสถียรภาพ = อัตราออเดอร์สำเร็จจากที่จบแล้วทั้งหมด (สำเร็จ + ยกเลิก) — ข้อมูลจริง
    const resolved = totalCompleted + cancelledCount;
    const successRate =
      resolved > 0 ? Math.round((totalCompleted / resolved) * 1000) / 10 : 100;

    const stats = {
      activeQueues,
      totalBookings,
      totalCompleted, // จำนวนออเดอร์สำเร็จจริง (เอา +10000 ที่ปลอมออก)
      totalUsers,
      totalStock: stockAgg._sum.stock ?? 0,
      successRate, // % เสถียรภาพ/ความสำเร็จจริง
    };

    if (!config) {
      return {
        ok: true as const,
        data: {
          logo: "",
          title: "TCLCOINSXORMOR",
          description: "",
          keywords: "",
          agentLink: "",
          contactLine: "",
          phone: "",
          qrcodenormal: "",
          qrcodeagent: "",
          qrcodevip: "",
          qrcodesupport: "",
          warningMessage: "",
          agentPrivileges: "",
          lineGroupNormal: "",
          lineGroupAgent: "",
          lineGroupVip: "",
          lineGroupAgentLockedMessage: "",
          lineGroupVipLockedMessage: "",
          welcomeTitle: "",
          welcomeAgentDesc: "",
          welcomeMemberDesc: "",
          howItWorks: [] as unknown,
          termsContent: "",
          privacyContent: "",
          reviewLink: "",
          announceEnabled: false,
          announceBanner: "",
          announceBadge: "",
          announceTitle: "",
          announceContent: "",
          marqueeText: "",
          footerDescription: "",
          footerLinks: [] as unknown,
          footerServices: [] as unknown,
          footerLineUrl: "",
          footerFacebook: "",
          footerCopyright: "",
          stats,
        },
      };
    }

    return {
      ok: true as const,
      data: {
        logo: config.logo,
        title: config.title,
        description: config.description,
        keywords: config.keywords,
        agentLink: config.agentLink,
        contactLine: config.contactLine,
        phone: config.phone,
        qrcodenormal: config.qrcodenormal,
        qrcodeagent: canViewAgentGroup ? config.qrcodeagent : "",
        qrcodevip: canViewVipGroup ? config.qrcodevip : "",
        qrcodesupport: config.qrcodesupport,
        warningMessage: config.warningMessage,
        agentPrivileges: config.agentPrivileges ?? "",
        lineGroupNormal: config.lineGroupNormal ?? "",
        lineGroupAgent: canViewAgentGroup ? config.lineGroupAgent ?? "" : "",
        lineGroupVip: canViewVipGroup ? config.lineGroupVip ?? "" : "",
        lineGroupAgentLockedMessage:
          config.lineGroupAgentLockedMessage ?? "",
        lineGroupVipLockedMessage: config.lineGroupVipLockedMessage ?? "",
        welcomeTitle: config.welcomeTitle ?? "",
        welcomeAgentDesc: config.welcomeAgentDesc ?? "",
        welcomeMemberDesc: config.welcomeMemberDesc ?? "",
        howItWorks: (config.howItWorks ?? []) as unknown,
        termsContent: config.termsContent ?? "",
        privacyContent: config.privacyContent ?? "",
        reviewLink: config.reviewLink ?? "",
        announceEnabled: config.announceEnabled ?? false,
        announceBanner: config.announceBanner ?? "",
        announceBadge: config.announceBadge ?? "",
        announceTitle: config.announceTitle ?? "",
        announceContent: config.announceContent ?? "",
        marqueeText: config.marqueeText ?? "",
        footerDescription: config.footerDescription ?? "",
        footerLinks: (config.footerLinks ?? []) as unknown,
        footerServices: (config.footerServices ?? []) as unknown,
        footerLineUrl: config.footerLineUrl ?? "",
        footerFacebook: config.footerFacebook ?? "",
        footerCopyright: config.footerCopyright ?? "",
        stats,
      },
    };
  });

export type ConfigPublicApp = typeof app;

export const GET = app.handle;
