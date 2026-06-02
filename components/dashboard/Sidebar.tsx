"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConfig } from "@/lib/contexts/PublicDataContext";
import {
  Home,
  Package,
  Settings,
  Users,
  LogOut,
  X,
  ChevronUp,
  Box,
  CalendarCheck,
  Wallet,
  ScrollText,
} from "lucide-react";

export interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string | null;
  /** Optional prefix-match for active state (defaults to `href`) */
  activeMatch?: string;
  /** Sub-items — render เป็น expandable panel ใต้ icon */
  children?: NavItem[];
}

export const DASHBOARD_NAV: NavItem[] = [
  { key: "home", href: "/dashboard", label: "หน้าหลัก", icon: Home, badge: null, activeMatch: "/dashboard" },
  {
    key: "manage",
    href: "/dashboard/manage",
    label: "จัดการ",
    icon: Package,
    badge: "12",
    children: [
      { key: "products", href: "/dashboard/manage", label: "รายการสินค้า", icon: Box, activeMatch: "/dashboard/manage" },
      { key: "bookings", href: "/dashboard/manage/bookings", label: "จอง", icon: CalendarCheck },
      { key: "finance", href: "/dashboard/manage/finance", label: "บัญชีรับ-จ่าย", icon: Wallet },
    ],
  },
  { key: "customize", href: "/dashboard/settings", label: "ปรับแต่ง", icon: Settings, badge: null },
  { key: "users", href: "/dashboard/users", label: "ผู้ใช้", icon: Users, badge: null },
  { key: "audit", href: "/dashboard/audit", label: "บันทึก", icon: ScrollText, badge: null },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function DashboardSidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { config } = useConfig();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const siteLogo = config.logo?.trim() || "/logo.webp";
  const siteTitle = config.title?.trim() || "TCLCOINSXORMOR";

  /** active state — รวมถึง children ด้วย (parent จะ active ถ้า child active) */
  const isPathActive = (match: string) => {
    if (match === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(match);
  };

  const isItemActive = (item: NavItem): boolean => {
    const match = item.activeMatch ?? item.href;
    if (isPathActive(match)) return true;
    return item.children?.some((c) => isItemActive(c)) ?? false;
  };

  /** auto-expand parent ที่มี child active */
  useEffect(() => {
    const next = new Set<string>();
    for (const item of DASHBOARD_NAV) {
      if (item.children?.some((c) => isItemActive(c))) {
        next.add(item.key);
      }
    }

    const id = window.setTimeout(() => {
      setExpanded(next);
    }, 0);

    return () => window.clearTimeout(id);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <aside
      className={`flex w-[88px] flex-shrink-0 flex-col items-center bg-brand-surface border-r border-brand-green-100 py-6 h-screen z-50
        fixed md:sticky top-0 left-0
        transition-transform duration-300 ease-out
        ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
      `}
    >
      {/* Mobile close button */}
      {mobileOpen && (
        <button
          onClick={onClose}
          className="md:hidden absolute top-3 right-[-44px] w-10 h-10 rounded-full bg-brand-surface border border-brand-green-100 flex items-center justify-center text-brand-ink-soft shadow-md hover:text-brand-green transition cursor-pointer animate-in fade-in zoom-in-95 duration-200"
          aria-label="ปิดเมนู"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {/* Logo */}
      <Link
        href="/"
        className="mb-8 block"
        aria-label={siteTitle}
      >
        <img
          src={siteLogo}
          alt={siteTitle}
          className="w-14 h-14 object-contain drop-shadow-sm"
        />
      </Link>

      {/* Nav items */}
      <nav className="flex flex-col gap-2 flex-1 overflow-y-auto w-full px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {DASHBOARD_NAV.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);
          const hasChildren = (item.children?.length ?? 0) > 0;
          const isExpanded = expanded.has(item.key);

          return (
            <div key={item.key} className="flex flex-col items-center">
              {/* Parent button */}
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(item.key)}
                  className={`relative flex flex-col items-center gap-1 py-2.5 px-2 w-16 rounded-2xl transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-brand-green-50 text-brand-green"
                      : "text-brand-ink-soft hover:bg-brand-green-50/50 hover:text-brand-green"
                  }`}
                >
                  {active && (
                    <span className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1 h-7 bg-brand-green rounded-r-full" />
                  )}
                  <div className="relative">
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  </div>
                  <span className="text-[10.5px] font-extrabold">{item.label}</span>
                  {/* Chevron indicator */}
                  <span className={`mt-0.5 transition-transform duration-200 ${isExpanded ? "" : "rotate-180"}`}>
                    <ChevronUp className="h-3 w-3" strokeWidth={3} />
                  </span>
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`relative flex flex-col items-center gap-1 py-2.5 px-2 w-16 rounded-2xl transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-brand-green-50 text-brand-green"
                      : "text-brand-ink-soft hover:bg-brand-green-50/50 hover:text-brand-green"
                  }`}
                >
                  {active && (
                    <span className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1 h-7 bg-brand-green rounded-r-full" />
                  )}
                  <div className="relative">
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-2.5 bg-brand-coral text-white text-[9px] font-black px-1.5 rounded-full min-w-[16px] h-4 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10.5px] font-extrabold">{item.label}</span>
                </Link>
              )}

              {/* Sub-items panel */}
              {hasChildren && isExpanded && (
                <div className="mt-2 w-16 bg-brand-paper border border-brand-green-100 rounded-2xl py-2.5 flex flex-col items-center gap-1 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                  {item.children!.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = isPathActive(child.activeMatch ?? child.href);
                    return (
                      <Link
                        key={child.key}
                        href={child.href}
                        onClick={onClose}
                        className={`flex flex-col items-center gap-1 py-2 px-1 w-14 rounded-xl transition cursor-pointer ${
                          childActive
                            ? "bg-brand-green-50 text-brand-green"
                            : "text-brand-ink-soft hover:bg-brand-green-50/60 hover:text-brand-green"
                        }`}
                      >
                        <ChildIcon className="h-4.5 w-4.5" strokeWidth={childActive ? 2.5 : 2} />
                        <span className="text-[9.5px] font-extrabold text-center leading-tight">
                          {child.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-2 pt-3 border-t border-brand-green-100 w-full items-center">
        <button
          className="w-10 h-10 rounded-xl text-brand-ink-soft hover:bg-rose-500/10 hover:text-rose-400 flex items-center justify-center transition cursor-pointer"
          aria-label="ออกจากระบบ"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}
