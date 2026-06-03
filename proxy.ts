import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Next.js 16 Proxy (เดิมคือ middleware.ts — เปลี่ยนชื่อตาม Next 16)
 *
 * 1) แยก subdomain
 *    - dashboard.<domain>  → หน้าแอดมิน (rewrite root → /dashboard)
 *    - www.<domain> / apex → หน้าผู้ใช้ (กันเข้า /dashboard → เด้งไป dashboard subdomain)
 *    - localhost / IP / dev → ไม่แยก (admin ใช้ /dashboard บน localhost ได้ปกติ)
 * 2) เช็ค session cookie สำหรับ /dashboard, /profile (lightweight ไม่ hit DB)
 *    role check (admin) ทำใน layout (Server Component) อีกชั้น
 *
 * cookie session แชร์ข้ามซับโดเมนผ่าน better-auth crossSubDomainCookies (ตั้ง COOKIE_DOMAIN)
 */
function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/profile")
  );
}

export async function proxy(request: NextRequest) {
  // อยู่หลัง Cloudflare Tunnel/reverse proxy → ใช้ x-forwarded-host เป็นหลัก (ชื่อโดเมนจริงที่ผู้ใช้เรียก)
  // แล้วค่อย fallback เป็น host (cloudflared ส่ง Host เดิมมาให้อยู่แล้วโดยดีฟอลต์)
  const host = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  )
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  const { pathname } = request.nextUrl;

  const isLocal =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    !host.includes(".");
  const isDashboardHost = !isLocal && host.split(".")[0] === "dashboard";

  // ── 1) แยก subdomain (เฉพาะโดเมนจริง) ──
  if (!isLocal) {
    if (isDashboardHost) {
      // ซับโดเมนแอดมิน: root → /dashboard (rewrite ให้ URL สะอาด)
      if (pathname === "/" || pathname === "") {
        // มาพร้อม ?auth (layout เด้งมาตอนยังไม่ล็อกอิน) → ปล่อยหน้า login แสดง กัน loop
        if (request.nextUrl.searchParams.has("auth")) return NextResponse.next();
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.rewrite(url);
      }
    } else if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      // ซับโดเมนผู้ใช้ (www/apex): ห้ามเข้าหน้าแอดมิน → เด้งไป dashboard subdomain
      const dashHost = host.startsWith("www.")
        ? `dashboard.${host.slice(4)}`
        : `dashboard.${host}`;
      const url = new URL(request.url);
      url.host = dashHost;
      url.protocol = "https:";
      url.port = "";
      return NextResponse.redirect(url);
    }
  }

  // ── 2) ต้องมี session cookie สำหรับ /dashboard, /profile ──
  if (isProtectedPath(pathname)) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      const url = new URL("/", request.url);
      url.searchParams.set("auth", "required");
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // "/" สำหรับ rewrite ซับโดเมนแอดมิน · /dashboard, /profile สำหรับ gate + block
  matcher: ["/", "/dashboard/:path*", "/profile/:path*"],
};
