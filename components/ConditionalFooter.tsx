"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

/**
 * แสดง Footer ในทุกหน้า ยกเว้นหน้าแดชบอร์ด (/dashboard และ /dashboard/*)
 * วางไว้ใน root layout ครั้งเดียว — ครอบคลุมทุกหน้าอัตโนมัติ
 */
export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === "/dashboard" || pathname?.startsWith("/dashboard/")) {
    return null;
  }
  return <Footer />;
}
