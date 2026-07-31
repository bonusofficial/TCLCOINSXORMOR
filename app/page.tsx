"use client";

import React, { useState } from "react";
import { Crown, User } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import PackagesSection from "@/components/PackagesSection";
import ReviewsSection from "@/components/ReviewsSection";
import StatsSection from "@/components/StatsSection";
import SupportSection from "@/components/SupportSection";
import AuthModal from "@/components/AuthModal";
import AnnouncementBell from "@/components/AnnouncementBell";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useConfig } from "@/lib/contexts/PublicDataContext";
import { getAdminDashboardHref } from "@/lib/admin-url";
import { normalizeExternalUrl } from "@/lib/external-url";

type UserRole = "member" | "vip" | "agent" | "admin";

/**
 * Resolve the effective user role.
 * Priority:
 *   1. `user.role` field from the DB (authoritative)
 *   2. Email-domain hint (legacy / fallback for accounts without a role)
 */
function resolveUserRole(user?: {
  role?: string | null;
  email?: string | null;
} | null): UserRole {
  const dbRole = (user?.role ?? "").toLowerCase().trim();
  if (
    dbRole === "admin" ||
    dbRole === "agent" ||
    dbRole === "vip" ||
    dbRole === "member"
  ) {
    return dbRole as UserRole;
  }
  const email = (user?.email ?? "").toLowerCase().trim();
  if (email.endsWith("@admin.tclcoinsxormor.com")) return "admin";
  if (email.endsWith("@vip.tclcoinsxormor.com")) return "vip";
  return "member";
}

export default function Home() {
  const { data: session } = useSession();
  const { config } = useConfig();
  const [roleOverride, setRoleOverride] = useState<UserRole | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const sessionUser = session?.user as
    | { role?: string | null; email?: string | null; username?: string | null }
    | undefined;
  const isLoggedIn = !!sessionUser || roleOverride !== null;
  const userRole = roleOverride ?? resolveUserRole(sessionUser);
  const adminDashboardHref = getAdminDashboardHref();
  const agentSignupHref = normalizeExternalUrl(config?.agentLink);
  const vipSignupHref = normalizeExternalUrl(
    config?.vipLink || config?.contactLine
  );

  // Modal states
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const router = useRouter();

  // Trigger Auth modal
  const handleOpenAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const handleSelectPackage = (productId: number) => {
    router.push(`/queue?productId=${productId}`);
  };

  const handleDefaultBooking = () => {
    router.push("/queue");
  };

  return (
    <div className="min-h-screen bg-brand-paper font-sans text-brand-ink selection:bg-brand-green/20 overflow-x-hidden flex flex-col">
      {/* NAVBAR */}
      <Navbar
        onOpenAuth={handleOpenAuth}
        isLoggedIn={isLoggedIn}
        userRole={userRole}
        onLogout={async () => {
          const id = toast.loading("กำลังออกจากระบบ...");
          try {
            await signOut();
            setRoleOverride(null);
            toast.success("ออกจากระบบเรียบร้อย", {
              id,
              description: "ขอบคุณที่ใช้บริการ TCLCOINSXORMOR",
            });
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : "เกิดข้อผิดพลาดในระบบ";
            toast.error("ออกจากระบบไม่สำเร็จ", { id, description: msg });
          }
        }}
      />
      {/* ANNOUNCEMENT BELL — กระดิ่งประกาศ (เฉพาะหน้าแรก) */}
      <AnnouncementBell />

      {/* HERO SECTION */}
      <HeroSection
        onOpenAuth={handleOpenAuth}
        isLoggedIn={isLoggedIn}
        userRole={userRole}
      />

      {/* HOW IT WORKS */}
      <HowItWorks onOpenBooking={handleDefaultBooking} />

      {/* CUSTOMER REVIEWS */}
      <ReviewsSection />

      {/* PACKAGES */}
      <PackagesSection
        onSelectPackage={handleSelectPackage}
        userRole={userRole}
      />

      {/* SYSTEM STATS */}
      <StatsSection />

      {/* SUPPORT */}
      <SupportSection />

      {/* FOOTER — แสดงผ่าน ConditionalFooter ใน root layout */}

      {/* ACCOUNT STATUS WIDGET */}
      {isLoggedIn && (() => {
        const isAdmin = userRole === "admin";
        const isAgent = userRole === "agent";
        const isVip = userRole === "vip";
        const isMember = userRole === "member";
        const dotColor = isAdmin
          ? "bg-sky-400"
          : isAgent
          ? "bg-brand-gold"
          : isVip
          ? "bg-amber-400"
          : "bg-brand-green";
        const iconColor = isAdmin
          ? "text-sky-400"
          : isAgent
          ? "text-brand-gold"
          : isVip
          ? "text-amber-400"
          : "text-brand-green";
        const roleLabel = isAdmin
          ? "ผู้ดูแลระบบ"
          : isAgent
          ? "ตัวแทนจำหน่าย"
          : isVip
          ? "VIP MEMBER"
          : "สมาชิกทั่วไป";
        const description = isAdmin
          ? "คุณเข้าใช้งานในฐานะผู้ดูแลระบบ — เข้าถึงแดชบอร์ดและจัดการระบบได้เต็มรูปแบบ"
          : isAgent
          ? "ยินดีต้อนรับ! คุณอยู่ในฐานะตัวแทนจำหน่าย และได้รับเรทราคาพิเศษสำหรับตัวแทน"
          : isVip
          ? "บัญชีของคุณได้รับยศ VIP และรหัสการจองเฉพาะที่ขึ้นต้นด้วย VIP-"
          : "คุณเป็นสมาชิกทั่วไป สามารถอัปเกรดเพื่อรับเรทราคาสุดพิเศษของตัวแทนได้ทันที";

        return (
          <div className="fixed right-6.5 bottom-6.5 z-[90] flex flex-col items-end gap-2">
            {/* Popover Menu */}
            {showAccountMenu && (
              <div className="bg-brand-surface-soft border border-brand-green-100 rounded-2xl p-4 shadow-2xl shadow-black/40 ring-1 ring-brand-green/15 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 w-72 text-left mb-1">
                <p className="text-xs font-extrabold text-brand-ink mb-1 inline-flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${dotColor} animate-pulse`} />
                  สิทธิ์บัญชีของคุณ
                </p>
                <p className="text-[11.5px] text-brand-ink-soft leading-relaxed mb-3 font-medium">
                  {description}
                </p>

                {isAdmin && (
                  <a
                    href={adminDashboardHref}
                    className="w-full text-center py-2.5 px-3 rounded-xl font-extrabold text-xs bg-gradient-to-r from-sky-400 to-sky-600 text-white shadow-md shadow-sky-500/30 hover:shadow-lg hover:shadow-sky-500/45 hover:-translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    🛡 เข้าสู่แดชบอร์ดผู้ดูแล
                  </a>
                )}
                {isAgent && (
                  <div className="space-y-2">
                    <div className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-3 py-2 text-center text-xs font-extrabold text-brand-gold">
                      <User className="h-4 w-4" strokeWidth={2.5} />
                      ตัวแทนจำหน่าย · เปิดใช้งานแล้ว
                    </div>
                    <a
                      href={vipSignupHref || "#"}
                      target={vipSignupHref ? "_blank" : undefined}
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-center text-xs font-black text-amber-400 transition hover:bg-amber-400/15"
                    >
                      <Crown className="h-4 w-4" strokeWidth={2.7} />
                      หรืออัปเกรดเป็น VIP ได้ คลิกเลย
                    </a>
                  </div>
                )}
                {isVip && (
                  <div className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-center text-xs font-extrabold text-amber-400">
                    <Crown className="h-4 w-4" strokeWidth={2.7} />
                    VIP MEMBER · เปิดใช้งานแล้ว
                  </div>
                )}
                {isMember && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setShowAccountMenu(false);
                      if (agentSignupHref) {
                        window.open(agentSignupHref, "_blank", "noopener,noreferrer");
                      }
                    }}
                    className="w-full text-center py-2.5 px-3 rounded-xl font-extrabold text-xs bg-gradient-to-r from-brand-gold-light via-brand-gold to-brand-gold-deep text-brand-ink shadow-md shadow-brand-gold/30 hover:shadow-lg hover:shadow-brand-gold/45 hover:-translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    ⚡ อัปเกรดเป็นตัวแทน
                  </button>
                )}
              </div>
            )}

            {/* Pill Widget */}
            <div className="flex flex-col bg-brand-surface-soft border border-brand-green-100 backdrop-blur-md rounded-2xl py-2.5 px-4 shadow-lg shadow-black/30 ring-1 ring-brand-green/15 min-w-[170px] text-left relative overflow-hidden group">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="w-full text-left outline-none cursor-pointer flex flex-col items-start hover:opacity-85 transition"
              >
                <span className="text-[9.5px] font-extrabold text-brand-ink-soft leading-none uppercase tracking-wider">
                  สถานะบัญชี
                </span>
                <div className="flex items-center justify-between w-full mt-1.5 gap-4">
                  <span className="flex items-center gap-1.5 text-xs font-black text-brand-ink leading-none">
                    <span className={`h-2 w-2 rounded-full animate-pulse ${dotColor}`} />
                    {roleLabel}
                  </span>
                  {isVip ? (
                    <Crown
                      className={`h-4 w-4 flex-shrink-0 ${iconColor}`}
                      strokeWidth={2.7}
                    />
                  ) : (
                    <User className={`h-3.5 w-3.5 flex-shrink-0 ${iconColor}`} />
                  )}
                </div>
              </button>

              {isMember && (
                <a
                  href={agentSignupHref || "#"}
                  target={agentSignupHref ? "_blank" : undefined}
                  rel="noreferrer"
                  className="mt-2.5 pt-2 border-t border-brand-green-100/50 w-full text-center text-[10.5px] font-black text-brand-gold-deep hover:text-amber-500 transition cursor-pointer flex items-center justify-center gap-0.5"
                >
                  อัปเกรดเป็นตัวแทน →
                </a>
              )}
            </div>
          </div>
        );
      })()}

      {/* AUTHENTICATION PORTAL MODAL */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialTab={authTab}
        onLoginSuccess={(role) => {
          setRoleOverride(role);
        }}
      />

    </div>
  );
}
