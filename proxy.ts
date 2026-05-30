import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Next.js 16 Proxy (เดิมคือ middleware.ts — เปลี่ยนชื่อแล้ว)
 *
 * - ทำงานบน Edge runtime ก่อน route handler
 * - ตรวจว่ามี better-auth session cookie ไหม (lightweight — ไม่ hit DB)
 * - ถ้าไม่มี → redirect ไปหน้าแรกพร้อม flag ให้เปิด login modal
 * - role check (admin/agent) ทำใน layout (Server Component) อีกชั้น
 *
 * NOTE: รันบน Edge → ใช้ Prisma/database ไม่ได้
 *       getSessionCookie แค่อ่าน cookie + verify signature เท่านั้น
 */
export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const url = new URL("/", request.url);
    url.searchParams.set("auth", "required");
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Routes ที่ต้อง login
 * - /dashboard/*  — admin only (role check ใน layout)
 * - /profile/*    — user ทุก role
 */
export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
