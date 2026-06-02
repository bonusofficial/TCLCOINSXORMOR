"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import { useSession, signOut } from "@/lib/auth-client";

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

/**
 * หน้าเอกสาร (ข้อกำหนด / นโยบาย) — รับเนื้อหา HTML จาก config (จัดการที่หลังบ้าน)
 */
export default function LegalPage({
  title,
  html,
}: {
  title: string;
  html: string;
}) {
  const { data: session } = useSession();
  const user = session?.user as
    | { role?: string | null; email?: string | null }
    | undefined;
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const isLoggedIn = !!user;
  const userRole = resolveUserRole(user);

  const hasContent = !!html && html.replace(/<[^>]*>/g, "").trim().length > 0;

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

      <main className="flex-1 max-w-[820px] w-full mx-auto px-6 py-8 md:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-ink-soft hover:text-brand-green transition group mb-5"
        >
          <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          กลับหน้าแรก
        </Link>

        <section className="bg-brand-surface border border-brand-green-100 rounded-[28px] p-6 md:p-9 shadow-sm ring-1 ring-brand-green/10">
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-brand-green-100/60">
            <div className="w-11 h-11 rounded-xl bg-brand-green-50 text-brand-green flex items-center justify-center flex-shrink-0">
              <FileText className="h-5.5 w-5.5" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="font-display font-black text-xl md:text-2xl text-brand-ink leading-tight">
                {title}
              </h1>
            </div>
          </div>

          {hasContent ? (
            <div
              className="text-sm text-brand-ink leading-relaxed
                [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-brand-ink [&_h2]:mt-5 [&_h2]:mb-2
                [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-brand-ink [&_h3]:mt-4 [&_h3]:mb-1.5
                [&_p]:mb-3 [&_p]:text-brand-ink-soft
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3
                [&_li]:mb-1 [&_li]:text-brand-ink-soft
                [&_a]:text-brand-green [&_a]:underline
                [&_strong]:text-brand-ink [&_b]:text-brand-ink
                [&_blockquote]:border-l-4 [&_blockquote]:border-brand-green-100 [&_blockquote]:pl-4 [&_blockquote]:text-brand-ink-soft [&_blockquote]:my-3"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div className="py-12 text-center">
              <p className="font-display font-black text-base text-brand-ink mb-1">
                ยังไม่มีเนื้อหา
              </p>
            </div>
          )}
        </section>
      </main>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialTab={authTab}
      />
    </div>
  );
}
