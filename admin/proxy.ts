import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const sessionCookie = getSessionCookie(request, { cookiePrefix: "ormor-admin" });
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
  matcher: ["/dashboard/:path*"],
};
