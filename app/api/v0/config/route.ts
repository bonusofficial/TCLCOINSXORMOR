import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";
import { errorPlugin, loggerPlugin } from "@/lib/server/middleware";

/**
 * Public Config endpoint — สำหรับเว็บฝั่งผู้ใช้
 * ใช้ที่ /queue, hero, footer ฯลฯ
 * Read-only, ไม่ต้อง auth
 */
const app = new Elysia({ prefix: "/api/v0/config" })
  .use(loggerPlugin)
  .use(errorPlugin)

  /** GET — โหลด config ทั่วไป พร้อมสถานะระบบ Real-time */
  .get("/", async () => {
    const [config, activeQueues, totalCompleted, totalUsers, stockAgg] = await Promise.all([
      prisma.config.findUnique({ where: { id: 1 } }),
      prisma.bookings.count({
        where: {
          status: {
            in: ["รอตรวจสอบ", "รอชำระเงิน", "ชำระแล้ว", "กำลังดำเนินการ"],
          },
        },
      }),
      prisma.bookings.count({
        where: {
          status: "สำเร็จ",
        },
      }),
      prisma.user.count(),
      prisma.products.aggregate({
        _sum: {
          stock: true,
        },
      }),
    ]);

    const stats = {
      activeQueues,
      totalCompleted: totalCompleted + 10000, // อิงฐานรีวิวเดิม
      totalUsers,
      totalStock: stockAgg._sum.stock ?? 0,
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
          qrcodesupport: "",
          warningMessage: "",
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
        qrcodeagent: config.qrcodeagent,
        qrcodesupport: config.qrcodesupport,
        warningMessage: config.warningMessage,
        stats,
      },
    };
  });

export type ConfigPublicApp = typeof app;

export const GET = app.handle;
