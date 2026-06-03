"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, Loader2, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { authClient, signIn, signOut, useSession } from "@/lib/auth-client";

type AdminSessionUser = {
  role?: string | null;
  name?: string | null;
  email?: string | null;
  username?: string | null;
};

function normalizeRole(role?: string | null) {
  return (role ?? "").toLowerCase().trim();
}

function getSafeNextPath() {
  if (typeof window === "undefined") return "/dashboard";

  const next = new URLSearchParams(window.location.search).get("next");
  if (next?.startsWith("/dashboard")) return next;
  return "/dashboard";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const currentUser = session?.user as AdminSessionUser | undefined;
  const currentRole = normalizeRole(currentUser?.role);
  const isAdmin = currentRole === "admin";
  const isSignedInNonAdmin = Boolean(session?.user) && !isAdmin;

  const displayName = useMemo(() => {
    return currentUser?.name || currentUser?.username || currentUser?.email || "บัญชีนี้";
  }, [currentUser]);

  useEffect(() => {
    if (isAdmin) {
      router.replace(getSafeNextPath());
    }
  }, [isAdmin, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    const input = identifier.trim();
    if (!input || !password) {
      toast.warning("กรอกข้อมูลให้ครบ", {
        description: "กรุณาระบุชื่อผู้ใช้/อีเมล และรหัสผ่าน",
      });
      return;
    }

    setLoading(true);
    const toastId = toast.loading("กำลังเข้าสู่ระบบผู้ดูแล...");

    try {
      const credentials = { password, rememberMe: true };
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
      let response = isEmail
        ? await signIn.email({ email: input, ...credentials })
        : await signIn.username({ username: input, ...credentials });

      if (response.error && !isEmail && input.includes("@")) {
        const fallback = await signIn.email({ email: input, ...credentials });
        if (!fallback.error) response = fallback;
      } else if (response.error && isEmail) {
        const fallback = await signIn.username({ username: input, ...credentials });
        if (!fallback.error) response = fallback;
      }

      if (response.error) {
        throw new Error(response.error.message ?? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }

      const sessionResponse = await authClient.getSession({
        fetchOptions: { cache: "no-store" },
      });
      const user = sessionResponse.data?.user as AdminSessionUser | undefined;

      if (normalizeRole(user?.role) !== "admin") {
        await signOut();
        throw new Error("บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ");
      }

      toast.success("เข้าสู่ระบบเรียบร้อย", { id: toastId });
      router.replace(getSafeNextPath());
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในระบบ";
      toast.error("เข้าสู่ระบบไม่สำเร็จ", {
        id: toastId,
        description: message,
      });
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    router.refresh();
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-brand-paper text-brand-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[1120px] items-center justify-center px-5 py-10">
        <section className="grid w-full overflow-hidden rounded-2xl border border-brand-green-100 bg-brand-surface shadow-2xl shadow-black/30 md:grid-cols-[1fr_420px]">
          <div className="flex min-h-[460px] flex-col justify-between bg-brand-paper p-8 md:p-10">
            <div className="space-y-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green text-brand-paper shadow-lg shadow-brand-green/20">
                <ShieldCheck className="h-7 w-7" strokeWidth={2.5} />
              </div>
              <div className="space-y-3">
                <p className="text-xs font-black uppercase text-brand-green">
                  ORMOR Admin
                </p>
                <h1 className="max-w-[560px] text-3xl font-black leading-tight text-brand-ink md:text-5xl">
                  ระบบจัดการหลังบ้าน TCLCOINSXORMOR
                </h1>
                <p className="max-w-[520px] text-sm font-semibold leading-7 text-brand-ink-soft md:text-base">
                  เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ผู้ดูแลระบบเท่านั้น
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 text-sm font-bold text-brand-ink-soft sm:grid-cols-3">
              <div className="rounded-xl border border-brand-green-100 bg-brand-surface p-4">
                แดชบอร์ด
              </div>
              <div className="rounded-xl border border-brand-green-100 bg-brand-surface p-4">
                จัดการสินค้า
              </div>
              <div className="rounded-xl border border-brand-green-100 bg-brand-surface p-4">
                ตรวจสอบรายการ
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center border-t border-brand-green-100 bg-brand-surface p-6 md:border-l md:border-t-0 md:p-8">
            {isPending || isAdmin ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
              </div>
            ) : isSignedInNonAdmin ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-bold text-rose-200">
                  {displayName} ไม่มีสิทธิ์เข้าใช้งานระบบผู้ดูแล
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleSignOut();
                  }}
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-4 text-sm font-black text-brand-paper transition hover:bg-brand-green-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                  ออกจากบัญชีนี้
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-black text-brand-ink">เข้าสู่ระบบ</h2>
                  <p className="mt-1 text-sm font-semibold text-brand-ink-soft">
                    สำหรับผู้ดูแลระบบ
                  </p>
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-black text-brand-ink-soft">
                    ชื่อผู้ใช้หรืออีเมล
                  </span>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-ink-soft" />
                    <input
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      autoComplete="username"
                      className="h-12 w-full rounded-xl border border-brand-green-100 bg-brand-paper pl-12 pr-4 text-sm font-bold outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/20"
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-black text-brand-ink-soft">
                    รหัสผ่าน
                  </span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-ink-soft" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      className="h-12 w-full rounded-xl border border-brand-green-100 bg-brand-paper pl-12 pr-4 text-sm font-bold outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/20"
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-4 text-sm font-black text-brand-paper transition hover:bg-brand-green-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                  เข้าสู่ระบบแอดมิน
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
