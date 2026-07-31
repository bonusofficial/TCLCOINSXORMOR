import { Elysia } from "elysia";
import { withElysiaAudit } from "@/lib/server/audit-route";
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
const COMPLETED_BOOKING_STATUSES = ["สำเร็จ", "ชำระแล้ว"];
const BOOKING_STATS_LIMIT = 200;

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

    const [config, bookingStatsRows, totalUsers, stockAgg] = await Promise.all([
      prisma.config.findFirst({ orderBy: { id: "desc" } }),
      // อิงชุดเดียวกับหน้าหลังบ้าน /dashboard/manage/bookings ที่แสดงล่าสุด 200 รายการ
      prisma.bookings.findMany({
        orderBy: { id: "desc" },
        take: BOOKING_STATS_LIMIT,
        select: {
          status: true,
        },
      }),
      prisma.user.count(),
      prisma.products.aggregate({
        where: {
          stockEnabled: true,
        },
        _sum: {
          stock: true,
        },
      }),
    ]);
    const activeQueues = bookingStatsRows.filter((b) => b.status === "กำลังดำเนินการ").length;
    const totalBookings = bookingStatsRows.length;
    const totalCompleted = bookingStatsRows.filter((b) =>
      COMPLETED_BOOKING_STATUSES.includes(b.status)
    ).length;
    const cancelledCount = bookingStatsRows.filter((b) => b.status === "ยกเลิก").length;

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
          vipLink: "",
          contactLine: "",
          phone: "",
          qrcodenormal: "",
          qrcodeagent: "",
          qrcodevip: "",
          qrcodesupport: "",
          warningMessage: "",
          agentPrivileges: "",
          vipPrivileges: "",
          lineGroupNormal: "",
          lineGroupAgent: "",
          lineGroupVip: "",
          lineGroupAgentLockedMessage: "",
          lineGroupVipLockedMessage: "",
          welcomeTitle: "",
          welcomeAgentDesc: "",
          welcomeVipDesc: "",
          welcomeMemberDesc: "",
          agentSignupTitle: "",
          agentSignupDescription: "",
          vipSignupTitle: "",
          vipSignupDescription: "",
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
        vipLink: config.vipLink ?? "",
        contactLine: config.contactLine,
        phone: config.phone,
        qrcodenormal: config.qrcodenormal,
        qrcodeagent: canViewAgentGroup ? config.qrcodeagent : "",
        qrcodevip: canViewVipGroup ? config.qrcodevip : "",
        qrcodesupport: config.qrcodesupport,
        warningMessage: config.warningMessage,
        agentPrivileges: config.agentPrivileges ?? "",
        vipPrivileges: config.vipPrivileges ?? "",
        lineGroupNormal: config.lineGroupNormal ?? "",
        lineGroupAgent: canViewAgentGroup ? config.lineGroupAgent ?? "" : "",
        lineGroupVip: canViewVipGroup ? config.lineGroupVip ?? "" : "",
        lineGroupAgentLockedMessage:
          config.lineGroupAgentLockedMessage ?? "",
        lineGroupVipLockedMessage: config.lineGroupVipLockedMessage ?? "",
        welcomeTitle: config.welcomeTitle ?? "",
        welcomeAgentDesc: config.welcomeAgentDesc ?? "",
        welcomeVipDesc: config.welcomeVipDesc ?? "",
        welcomeMemberDesc: config.welcomeMemberDesc ?? "",
        agentSignupTitle: config.agentSignupTitle ?? "",
        agentSignupDescription: config.agentSignupDescription ?? "",
        vipSignupTitle: config.vipSignupTitle ?? "",
        vipSignupDescription: config.vipSignupDescription ?? "",
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

export const GET = withElysiaAudit(app.handle);
