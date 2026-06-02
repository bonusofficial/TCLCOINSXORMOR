"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import {
  ChevronLeft,
  Crown,
  Lock,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Coins,
  CheckCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import { useConfig } from "@/lib/contexts/PublicDataContext";

type UserRole = "member" | "agent" | "admin";

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

export default function AgentBenefitsPage() {
  const { data: session, isPending } = useSession();
  const { config } = useConfig();
  
  const user = session?.user as
    | {
        id?: string;
        username?: string | null;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        role?: string | null;
      }
    | undefined;

  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const isLoggedIn = !!user;
  const userRole = resolveUserRole(user);
  const isAgentOrAdmin = userRole === "agent" || userRole === "admin";

  // Loading state
  if (isPending) {
    return (
      <div className="min-h-screen bg-brand-paper font-sans text-brand-ink flex flex-col justify-center items-center gap-3">
        <Loader2 className="w-10 h-10 text-brand-green animate-spin" />
        <p className="text-sm font-extrabold text-brand-ink-soft">กำลังโหลดสิทธิพิเศษตัวแทน...</p>
      </div>
    );
  }

  // Logged-out state gate
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-brand-paper font-sans text-brand-ink flex flex-col">
        <Navbar
          onOpenAuth={(tab) => {
            setAuthTab(tab);
            setAuthOpen(true);
          }}
          isLoggedIn={false}
          userRole="member"
          onLogout={() => {}}
        />
        <main className="flex-1 flex items-center justify-center px-6 py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none -z-0">
            <div className="absolute top-1/4 left-1/4 w-80 aspect-square rounded-full bg-brand-green/8 blur-[100px]" />
          </div>
          <div className="max-w-md w-full bg-brand-surface border border-brand-green-100 rounded-[32px] p-8 text-center shadow-xl ring-1 ring-brand-green/15 z-10 relative">
            <div className="w-16 h-16 mx-auto rounded-[20px] bg-brand-green-50 flex items-center justify-center mb-5">
              <Lock className="h-7 w-7 text-brand-green" />
            </div>
            <h2 className="font-display font-black text-xl text-brand-ink mb-2">
              ต้องเข้าสู่ระบบก่อน
            </h2>
            <p className="text-sm text-brand-ink-soft font-medium mb-6">
              กรุณาเข้าสู่ระบบด้วยบัญชีตัวแทนเพื่อดูข้อมูลสิทธิพิเศษและส่วนลดของคุณ
            </p>
            <button
              onClick={() => {
                setAuthTab("login");
                setAuthOpen(true);
              }}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer"
            >
              เข้าสู่ระบบ
            </button>
          </div>
        </main>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialTab={authTab} />
      </div>
    );
  }

  // Non-agent unauthorized gate
  if (!isAgentOrAdmin) {
    return (
      <div className="min-h-screen bg-brand-paper font-sans text-brand-ink flex flex-col">
        <Navbar
          onOpenAuth={(tab) => {
            setAuthTab(tab);
            setAuthOpen(true);
          }}
          isLoggedIn={isLoggedIn}
          userRole={userRole}
          onLogout={async () => {
            await signOut();
            window.location.href = "/";
          }}
        />
        <main className="flex-1 flex items-center justify-center px-6 py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none -z-0">
            <div className="absolute top-1/4 left-1/4 w-80 aspect-square rounded-full bg-brand-gold/8 blur-[100px]" />
          </div>
          <div className="max-w-md w-full bg-brand-surface border border-brand-green-100 rounded-[32px] p-8 text-center shadow-xl ring-1 ring-brand-green/15 z-10 relative">
            <div className="w-16 h-16 mx-auto rounded-[20px] bg-brand-gold/10 flex items-center justify-center mb-5">
              <ShieldAlert className="h-7 w-7 text-brand-gold-deep" />
            </div>
            <h2 className="font-display font-black text-xl text-brand-ink mb-2">
              เฉพาะตัวแทนจำหน่ายเท่านั้น
            </h2>
            <p className="text-sm text-brand-ink-soft font-medium mb-6">
              ขออภัย หน้าสิทธิพิเศษนี้อนุญาตให้เข้าถึงเฉพาะตัวแทนจำหน่ายที่เปิดบริการกับทางแบรนด์เท่านั้น
            </p>
            {config?.agentLink && (
              <a
                href={config.agentLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-extrabold text-sm text-brand-gold-deep bg-gradient-to-r from-brand-gold-light to-brand-gold shadow-md shadow-brand-gold/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer"
              >
                <Crown className="h-4 w-4" />
                สมัครเป็นตัวแทนจำหน่าย
              </a>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Split agentPrivileges text by newline for rendering lists beautifully
  const benefitsText = config?.agentPrivileges ?? "";
  const benefitsList = benefitsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <div className="min-h-screen bg-brand-paper font-sans text-brand-ink flex flex-col">
      <Navbar
        onOpenAuth={(tab) => {
          setAuthTab(tab);
          setAuthOpen(true);
        }}
        isLoggedIn={isLoggedIn}
        userRole={userRole}
        onLogout={async () => {
          await signOut();
          window.location.href = "/";
        }}
      />

      <main className="flex-1 max-w-[800px] w-full mx-auto px-6 py-8 md:py-12 space-y-6 z-10 relative">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-ink-soft hover:text-brand-green transition group"
        >
          <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          กลับหน้าหลัก
        </Link>

        {/* Dynamic backdrop decorations */}
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute top-[-100px] right-[10%] w-[350px] aspect-square rounded-full bg-brand-gold/5 blur-[120px]" />
          <div className="absolute top-[300px] left-[5%] w-[300px] aspect-square rounded-full bg-brand-green/5 blur-[120px]" />
        </div>

        {/* Header section */}
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black text-brand-gold-deep bg-brand-gold/10 border border-brand-gold/30">
            <Crown className="h-3.5 w-3.5" />
            สิทธิพิเศษระดับ VIP & AGENT
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-brand-ink leading-tight mt-2">
            สิทธิพิเศษของ <span className="text-brand-gold-deep">ตัวแทนจำหน่าย</span>
          </h1>
          <p className="text-sm text-brand-ink-soft font-bold">
            ข้อมูลเรทส่วนลดพิเศษ และบริการพิเศษส่วนตัวสำหรับสมาชิกกลุ่มตัวแทน
          </p>
        </div>

        {/* Content Section */}
        <section className="bg-brand-surface border-2 border-brand-gold/20 rounded-[32px] p-6 md:p-8 shadow-xl shadow-brand-gold/5 relative overflow-hidden ring-1 ring-brand-gold/5">
          {/* Decorative glows */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-gold/10 rounded-full blur-xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-green/5 rounded-full blur-xl" />

          <div className="relative space-y-6">

            {benefitsList.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Coins className="h-10 h-10 text-brand-ink-soft/40 mx-auto" />
                <p className="text-sm font-bold text-brand-ink-soft">
                  ขณะนี้แอดมินยังไม่ได้ลงรายละเอียดสิทธิพิเศษเพิ่มเติม
                </p>
                <p className="text-xs font-bold text-brand-ink-soft/75">
                  เรทส่วนลดของคุณจะถูกปรับและแสดงผลโดยอัตโนมัติที่หน้าจองคิวเติมเงินแล้วครับ
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {benefitsList.map((benefit, i) => {
                  // Custom highlights for lines that look like headers or key points
                  const isHeader = benefit.startsWith("★") || benefit.startsWith("●") || benefit.startsWith("#");
                  const cleanText = isHeader ? benefit.substring(1).trim() : benefit;

                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3.5 p-4.5 rounded-2xl border transition duration-200 ${
                        isHeader
                          ? "bg-brand-gold/5 border-brand-gold/25 font-black text-brand-gold-deep"
                          : "bg-brand-paper/50 border-brand-green-100 hover:border-brand-green/30"
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <CheckCircle className={`h-4.5 w-4.5 ${isHeader ? "text-brand-gold-deep" : "text-brand-green"}`} />
                      </div>
                      <p className={`text-sm leading-relaxed ${isHeader ? "font-extrabold" : "font-semibold text-brand-ink-soft"}`}>
                        {cleanText}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialTab={authTab} />
    </div>
  );
}
