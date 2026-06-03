import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Next.js 16 Proxy (เดิมคือ middleware.ts — เปลี่ยนชื่อตาม Next 16)
 *
 * เว็บผู้ใช้ไม่มีหน้า /dashboard แล้ว:
 * - production apex/www ที่เข้า /dashboard จะ redirect ไป dashboard subdomain
 * - /profile ยังเช็ค session cookie แบบ lightweight ไม่ hit DB
 *
 * cookie session แชร์ข้ามซับโดเมนผ่าน better-auth crossSubDomainCookies (ตั้ง COOKIE_DOMAIN)
 */
function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/profile");
}

function isDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
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

  // เว็บผู้ใช้ไม่ serve dashboard แล้ว ให้ส่งไป admin project แยกบน dashboard subdomain
  if (!isLocal && !isDashboardHost && isDashboardPath(pathname)) {
    const dashHost = host.startsWith("www.")
      ? `dashboard.${host.slice(4)}`
      : `dashboard.${host}`;
    const url = new URL(request.url);
    url.host = dashHost;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url);
  }

  // ต้องมี session cookie สำหรับ /profile
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
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
