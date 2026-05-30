"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import {
  Home,
  CalendarDays,
  UserPlus,
  LogIn,
  Menu,
  X,
  ChevronDown,
  UserCog,
  Receipt,
  LogOut,
  Crown,
  Shield,
  Settings2,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";

type UserRole = "member" | "agent" | "admin";

interface NavbarProps {
  onOpenAuth: (tab: "login" | "register") => void;
  isLoggedIn: boolean;
  userRole: UserRole;
  onLogout: () => void;
}

/* ── Role configuration ── */
const ROLE_CONFIG: Record<
  UserRole,
  {
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    ringClass: string;
    shadowClass: string;
    badgeText: string;
    badgeColor: string;
    badgeDot: string;
    badgeIconBg: string;
  }
> = {
  member: {
    label: "สมาชิกทั่วไป",
    icon: Home,
    ringClass: "ring-brand-green",
    shadowClass: "shadow-brand-green/30",
    badgeText: "text-brand-green",
    badgeColor: "from-brand-green to-brand-green-600",
    badgeDot: "bg-brand-green",
    badgeIconBg: "bg-gradient-to-br from-brand-green to-brand-green-600",
  },
  agent: {
    label: "ตัวแทนจำหน่าย",
    icon: Crown,
    ringClass: "ring-brand-gold",
    shadowClass: "shadow-brand-gold/30",
    badgeText: "text-brand-gold",
    badgeColor: "from-brand-gold-light to-brand-gold-deep",
    badgeDot: "bg-brand-gold",
    badgeIconBg: "bg-gradient-to-br from-brand-gold-light to-brand-gold-deep",
  },
  admin: {
    label: "ผู้ดูแลระบบ",
    icon: Shield,
    ringClass: "ring-sky-400",
    shadowClass: "shadow-sky-500/30",
    badgeText: "text-sky-400",
    badgeColor: "from-sky-400 to-sky-600",
    badgeDot: "bg-sky-400",
    badgeIconBg: "bg-gradient-to-br from-sky-400 to-sky-600",
  },
};

/**
 * Build a placeholder avatar URL using brand colors when no user image exists.
 * Uses the first character of the identifier; falls back to "U".
 */
function buildFallbackAvatar(identifier?: string | null) {
  const raw = (identifier ?? "U").trim();
  const firstChar = raw.charAt(0).toUpperCase() || "U";
  return `https://placehold.co/500x500/39C848/F7FDF7?text=${encodeURIComponent(firstChar)}`;
}

export default function Navbar({
  onOpenAuth,
  isLoggedIn,
  userRole,
  onLogout,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Active state per nav link — based on current pathname
  const pathname = usePathname();
  const isHomeActive = pathname === "/";
  const isQueueActive = pathname.startsWith("/queue");

  // Pull user from better-auth session — may be null in demo/prop-only login
  const { data: session } = useSession();
  const user = session?.user as
    | {
        username?: string | null;
        name?: string | null;
        email?: string | null;
        image?: string | null;
      }
    | undefined;

  const { displayName, avatarSrc } = useMemo(() => {
    const identifier =
      user?.username || user?.name || user?.email?.split("@")[0] || "บัญชีของฉัน";
    const src = user?.image || buildFallbackAvatar(identifier);
    return { displayName: identifier, avatarSrc: src };
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  const role = ROLE_CONFIG[userRole];
  const isAdmin = userRole === "admin";

  /* ── Account menu items (vary by role) ── */
  const accountMenuItems = useMemo(() => {
    const items: Array<{ href: string; icon: typeof UserCog; label: string }> = [];
    if (isAdmin) {
      items.push({ href: "/dashboard", icon: Settings2, label: "จัดการระบบ" });
    }
    items.push(
      { href: "/profile", icon: UserCog, label: "แก้ไขโปรไฟล์" },
      { href: "/profile/orders", icon: Receipt, label: "ประวัติการสั่งซื้อ" }
    );
    return items;
  }, [isAdmin]);

  return (
    <div className="sticky top-[18px] z-80 px-7 max-w-[1240px] mx-auto w-full">
      <nav className="flex items-center justify-between bg-brand-surface/78 backdrop-blur-xl border border-brand-green-100/50 shadow-lg rounded-full py-2.5 pr-3.5 pl-5.5 transition-all duration-300">

        {/* Left Side: Brand/Logo & Nav Links (Desktop) */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="relative w-16 h-11 flex items-center justify-start hover:opacity-95 transition duration-200"
          >
            <img
              src="/logo.png"
              alt="TCLCOINSXORMOR Logo"
              className="absolute w-[72px] h-[72px] max-w-none object-contain transition duration-300 hover:scale-110"
            />
          </Link>

          {/* Nav Links (Desktop) */}
          <div className="hidden md:flex gap-1.5 items-center">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-full font-bold text-sm transition duration-200 ${
                isHomeActive
                  ? "text-brand-green bg-brand-green-100/70 hover:bg-brand-green-100"
                  : "text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green"
              }`}
            >
              <Home className="h-4.5 w-4.5" />
              หน้าหลัก
            </Link>
            <Link
              href="/queue"
              className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-full font-bold text-sm transition duration-200 ${
                isQueueActive
                  ? "text-brand-green bg-brand-green-100/70 hover:bg-brand-green-100"
                  : "text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green"
              }`}
            >
              <CalendarDays className="h-4.5 w-4.5" />
              จองคิวเติมเงิน
            </Link>
          </div>
        </div>

        {/* CTA Actions (Desktop) */}
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            /* AVATAR DROPDOWN */
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all duration-200 cursor-pointer group"
                aria-label="เมนูบัญชี"
              >
                {/* Avatar — image from DB, fallback to placehold */}
                <div className="relative w-9 h-9 flex-shrink-0">
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full rounded-full object-cover ring-2 shadow-sm ${role.ringClass}`}
                  />
                  {/* Role badge top-right (agent crown / admin shield) */}
                  {userRole !== "member" && (
                    <span
                      className={`absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full ${role.badgeIconBg} flex items-center justify-center shadow-md ring-2 ring-brand-surface`}
                    >
                      <role.icon
                        className="h-2.5 w-2.5 text-brand-ink"
                        strokeWidth={3}
                      />
                    </span>
                  )}
                  {/* Online dot bottom-right */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-lime ring-2 ring-brand-surface" />
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-brand-ink-soft transition-transform duration-200 ${
                    accountMenuOpen ? "rotate-180 text-brand-green" : ""
                  }`}
                  strokeWidth={2.5}
                />
              </button>

              {/* Dropdown Menu */}
              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-2.5 w-64 bg-brand-surface-soft border border-brand-green-100 rounded-2xl shadow-2xl ring-1 ring-brand-green/15 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* User info header */}
                  <div className="p-4 bg-gradient-to-br from-brand-green-50 to-transparent border-b border-brand-green-100/60 flex items-center gap-3">
                    <div className="relative w-11 h-11 flex-shrink-0">
                      <img
                        src={avatarSrc}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        className={`w-full h-full rounded-full object-cover ring-2 shadow-md ${role.ringClass} ${role.shadowClass}`}
                      />
                      {userRole !== "member" && (
                        <span
                          className={`absolute -top-1 -right-1 w-5 h-5 rounded-full ${role.badgeIconBg} flex items-center justify-center shadow-md ring-2 ring-brand-surface-soft`}
                        >
                          <role.icon
                            className="h-3 w-3 text-brand-ink"
                            strokeWidth={3}
                          />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-extrabold text-sm text-brand-ink truncate">
                        {displayName}
                      </p>
                      <p
                        className={`text-[11px] font-bold inline-flex items-center gap-1 mt-0.5 ${role.badgeText}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full animate-pulse ${role.badgeDot}`}
                        />
                        {role.label}
                      </p>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="p-2">
                    {accountMenuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green transition cursor-pointer"
                        >
                          <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                          {item.label}
                        </a>
                      );
                    })}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-brand-green-100/60 p-2">
                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition cursor-pointer"
                    >
                      <LogOut className="h-4.5 w-4.5" strokeWidth={2} />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => onOpenAuth("register")}
                className="hidden sm:inline-flex items-center gap-1.5 px-5 py-3 rounded-full font-bold text-[13.5px] text-brand-ink hover:bg-brand-green-50 hover:text-brand-green transition duration-200"
              >
                <UserPlus className="h-4 w-4" />
                สมัครสมาชิก
              </button>
              <button
                onClick={() => onOpenAuth("login")}
                className="px-6 py-3 rounded-full font-extrabold text-[13.5px] text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition duration-200 flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                เข้าสู่ระบบ
              </button>
            </>
          )}

          {/* Burger Button (Mobile) — opens shadcn Drawer */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-[13px] bg-brand-green-50 text-brand-green hover:bg-brand-green-100 transition font-bold text-sm cursor-pointer"
            aria-label="เปิดเมนู"
          >
            <Menu className="h-4.5 w-4.5" />
            <span>เมนู</span>
          </button>
        </div>
      </nav>

      {/* ════ MOBILE DRAWER (shadcn) ════ */}
      <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DrawerContent className="!bg-brand-surface-soft !border-brand-green-100 ring-1 ring-brand-green/20 max-h-[88vh]">
          <DrawerHeader className="text-left border-b border-brand-green-100/60">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="TCLCOINSXORMOR"
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <DrawerTitle className="font-display font-black text-base text-brand-ink leading-tight">
                    เมนูหลัก
                  </DrawerTitle>
                  <DrawerDescription className="text-[11px] font-bold text-brand-ink-soft">
                    TCLCOINSXORMOR · เติมเหรียญไลน์
                  </DrawerDescription>
                </div>
              </div>
              <DrawerClose asChild>
                <button
                  className="w-9 h-9 rounded-full bg-brand-surface border border-brand-green-100 flex items-center justify-center text-brand-ink-soft hover:text-brand-green hover:border-brand-green transition cursor-pointer"
                  aria-label="ปิดเมนู"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="px-5 pb-6 flex flex-col gap-3 overflow-y-auto">
            {/* Nav links */}
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 p-3.5 rounded-2xl font-bold transition ${
                isHomeActive
                  ? "text-brand-green bg-brand-green-50 border border-brand-green-100"
                  : "text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green"
              }`}
            >
              <Home className="h-5 w-5" />
              หน้าหลัก
            </Link>
            <Link
              href="/queue"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 p-3.5 rounded-2xl font-bold transition ${
                isQueueActive
                  ? "text-brand-green bg-brand-green-50 border border-brand-green-100"
                  : "text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green"
              }`}
            >
              <CalendarDays className="h-5 w-5" />
              จองคิวเติมเงิน
            </Link>

            <div className="h-px bg-brand-green-100 my-1" />

            {isLoggedIn ? (
              <>
                {/* User card */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-brand-green-50 to-transparent border border-brand-green-100">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full rounded-full object-cover ring-2 shadow-md ${role.ringClass} ${role.shadowClass}`}
                    />
                    {userRole !== "member" && (
                      <span
                        className={`absolute -top-1 -right-1 w-5 h-5 rounded-full ${role.badgeIconBg} flex items-center justify-center shadow-md ring-2 ring-brand-surface-soft`}
                      >
                        <role.icon
                          className="h-3 w-3 text-brand-ink"
                          strokeWidth={3}
                        />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-extrabold text-sm text-brand-ink truncate">
                      {displayName}
                    </p>
                    <p
                      className={`text-[11px] font-bold inline-flex items-center gap-1 ${role.badgeText}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full animate-pulse ${role.badgeDot}`}
                      />
                      {role.label}
                    </p>
                  </div>
                </div>

                {/* Account menu items */}
                {accountMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3.5 rounded-2xl font-bold text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green transition"
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </a>
                  );
                })}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="mt-1 w-full py-3.5 rounded-2xl font-extrabold text-sm text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth("login");
                  }}
                  className="w-full py-3.5 rounded-2xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="h-4.5 w-4.5" />
                  เข้าสู่ระบบ
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth("register");
                  }}
                  className="w-full py-3.5 rounded-2xl font-extrabold text-sm text-brand-ink bg-brand-green-50 hover:bg-brand-green-100 hover:text-brand-green border border-brand-green-100 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="h-4.5 w-4.5" />
                  สมัครสมาชิกใหม่
                </button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
