"use client";

import React, { useState, useEffect } from "react";
import {
  MessageCircle,
  UserCheck,
  ShieldCheck,
  User,
  AlertOctagon,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import PackagesSection from "@/components/PackagesSection";
import ReviewsSection from "@/components/ReviewsSection";
import StatsSection from "@/components/StatsSection";
import SupportSection from "@/components/SupportSection";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

type UserRole = "member" | "agent" | "admin";

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
  if (dbRole === "admin" || dbRole === "agent" || dbRole === "member") {
    return dbRole as UserRole;
  }
  const email = (user?.email ?? "").toLowerCase().trim();
  if (email.endsWith("@admin.tclcoinsxormor.com")) return "admin";
  if (email.endsWith("@vip.tclcoinsxormor.com")) return "agent";
  return "member";
}

export default function Home() {
  // Auth & User State — synced from better-auth session (persists across reloads)
  const { data: session } = useSession();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("member");
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Sync local UI state with cookie-backed session
  useEffect(() => {
    if (session?.user) {
      setIsLoggedIn(true);
      setUserRole(resolveUserRole(session.user as { role?: string | null; email?: string | null }));
    } else {
      setIsLoggedIn(false);
      setUserRole("member");
    }
  }, [session]);

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

  // Scroll reveal animation loader hook
  useEffect(() => {
    const handleScrollReveal = () => {
      const reveals = document.querySelectorAll(".reveal");
      reveals.forEach((element) => {
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 120; // threshold

        if (elementTop < windowHeight - elementVisible) {
          element.classList.add("in");
        }
      });
    };

    // Run once on load and attach listener
    handleScrollReveal();
    window.addEventListener("scroll", handleScrollReveal);

    return () => window.removeEventListener("scroll", handleScrollReveal);
  }, []);

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
            setIsLoggedIn(false);
            setUserRole("member");
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
      {/* HERO SECTION */}
      <HeroSection onOpenBooking={handleDefaultBooking} />

      {/* HOW IT WORKS */}
      <div className="reveal">
        <HowItWorks onOpenBooking={handleDefaultBooking} />
      </div>

      {/* CUSTOMER REVIEWS */}
      <div className="reveal">
        <ReviewsSection />
      </div>

      {/* PACKAGES */}
      <div className="reveal">
        <PackagesSection onSelectPackage={handleSelectPackage} />
      </div>

      {/* SYSTEM STATS */}
      <div className="reveal">
        <StatsSection />
      </div>

      {/* SUPPORT */}
      <div className="reveal">
        <SupportSection />
      </div>

      {/* FOOTER */}
      <Footer />

      {/* ACCOUNT STATUS WIDGET */}
      {isLoggedIn && (() => {
        const isAdmin = userRole === "admin";
        const isAgent = userRole === "agent";
        const isMember = userRole === "member";
        const dotColor = isAdmin
          ? "bg-sky-400"
          : isAgent
          ? "bg-brand-gold"
          : "bg-brand-green";
        const iconColor = isAdmin
          ? "text-sky-400"
          : isAgent
          ? "text-brand-gold"
          : "text-brand-green";
        const roleLabel = isAdmin
          ? "ผู้ดูแลระบบ"
          : isAgent
          ? "ตัวแทนจำหน่าย"
          : "สมาชิกทั่วไป";
        const description = isAdmin
          ? "คุณเข้าใช้งานในฐานะผู้ดูแลระบบ — เข้าถึงแดชบอร์ดและจัดการระบบได้เต็มรูปแบบ"
          : isAgent
          ? "ยินดีต้อนรับ! คุณอยู่ในฐานะตัวแทนจำหน่าย รับส่วนลดพิเศษ 5% ทุกออเดอร์"
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
                    href="/dashboard"
                    className="w-full text-center py-2.5 px-3 rounded-xl font-extrabold text-xs bg-gradient-to-r from-sky-400 to-sky-600 text-white shadow-md shadow-sky-500/30 hover:shadow-lg hover:shadow-sky-500/45 hover:-translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    🛡 เข้าสู่แดชบอร์ดผู้ดูแล
                  </a>
                )}
                {isAgent && (
                  <div className="text-xs font-extrabold text-brand-gold bg-brand-gold/10 py-2 px-3 rounded-lg border border-brand-gold/30 text-center inline-flex items-center justify-center gap-1.5 w-full">
                    👑 ตัวแทนจำหน่าย · เปิดใช้งานแล้ว
                  </div>
                )}
                {isMember && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setUserRole("agent");
                      setShowAccountMenu(false);
                    }}
                    className="w-full text-center py-2.5 px-3 rounded-xl font-extrabold text-xs bg-gradient-to-r from-brand-gold-light via-brand-gold to-brand-gold-deep text-brand-ink shadow-md shadow-brand-gold/30 hover:shadow-lg hover:shadow-brand-gold/45 hover:-translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    ⚡ อัปเกรดเป็นตัวแทน
                  </button>
                )}
              </div>
            )}

            {/* Pill Widget */}
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex flex-col items-start bg-brand-surface-soft hover:bg-brand-green-50 border border-brand-green-100 backdrop-blur-md rounded-2xl py-2.5 px-4 shadow-lg shadow-black/30 ring-1 ring-brand-green/15 transition-all duration-200 text-left min-w-[170px] relative overflow-hidden group cursor-pointer"
            >
              <span className="text-[9.5px] font-extrabold text-brand-ink-soft leading-none uppercase tracking-wider">
                สถานะบัญชี
              </span>
              <div className="flex items-center justify-between w-full mt-1.5 gap-4">
                <span className="flex items-center gap-1.5 text-xs font-black text-brand-ink leading-none">
                  <span className={`h-2 w-2 rounded-full animate-pulse ${dotColor}`} />
                  {roleLabel}
                </span>
                <User className={`h-3.5 w-3.5 flex-shrink-0 ${iconColor}`} />
              </div>
            </button>
          </div>
        );
      })()}

      {/* AUTHENTICATION PORTAL MODAL */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialTab={authTab}
        onLoginSuccess={(role) => {
          setIsLoggedIn(true);
          setUserRole(role);
        }}
      />

    </div>
  );
}
