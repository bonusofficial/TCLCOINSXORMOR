"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Menu } from "lucide-react";

/** Route metadata for breadcrumb + title. */
const ROUTE_META: Record<string, { title: string; crumb: string }> = {
  "/dashboard": { title: "ORMOR Backend", crumb: "แดชบอร์ด" },
  "/dashboard/settings": { title: "ปรับแต่งระบบ", crumb: "ปรับแต่ง" },
  "/dashboard/manage": { title: "รายการสินค้า", crumb: "รายการสินค้า" },
  "/dashboard/manage/bookings": { title: "จัดการการจอง", crumb: "จอง" },
  "/dashboard/manage/finance": { title: "บัญชีรับ-จ่าย", crumb: "บัญชีรับ-จ่าย" },
  "/dashboard/users": { title: "จัดการผู้ใช้", crumb: "ผู้ใช้" },
  "/dashboard/audit": { title: "บันทึกระบบ", crumb: "บันทึก" },
};

interface TopBarProps {
  onMenuOpen: () => void;
}

export function DashboardTopBar({ onMenuOpen }: TopBarProps) {
  const pathname = usePathname();
  const meta = ROUTE_META[pathname] ?? {
    title: "ORMOR Backend",
    crumb: "แดชบอร์ด",
  };
  const isSubPage = pathname !== "/dashboard";

  return (
    <header className="bg-brand-surface/80 backdrop-blur-lg border-b border-brand-green-100 sticky top-0 z-30">
      <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 lg:px-8 py-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuOpen}
          className="md:hidden w-10 h-10 rounded-full bg-brand-surface border border-brand-green-100 flex items-center justify-center text-brand-ink-soft hover:text-brand-green hover:border-brand-green transition cursor-pointer flex-shrink-0"
          aria-label="เปิดเมนู"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-brand-ink-soft">
            <Home className="h-3 w-3" />
            <span>หน้าหลัก</span>
            <span>/</span>
            {isSubPage ? (
              <>
                <Link href="/dashboard" className="hover:text-brand-green">
                  แดชบอร์ด
                </Link>
                <span>/</span>
                <span className="text-brand-green">{meta.crumb}</span>
              </>
            ) : (
              <span className="text-brand-green">{meta.crumb}</span>
            )}
          </div>
          <h1 className="font-display font-black text-lg md:text-2xl text-brand-ink mt-0.5 leading-tight truncate">
            {meta.title}
          </h1>
        </div>
      </div>
    </header>
  );
}
