"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from "lucide-react";
import { resetPassword } from "@/lib/auth-client";

const PASSWORD_RULES: Array<{ id: string; label: string; test: (p: string) => boolean }> = [
  { id: "len", label: "อย่างน้อย 8 ตัวอักษร", test: (p) => p.length >= 8 },
  { id: "upper", label: "ตัวพิมพ์ใหญ่ (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "ตัวพิมพ์เล็ก (a-z)", test: (p) => /[a-z]/.test(p) },
  { id: "num", label: "ตัวเลข (0-9)", test: (p) => /\d/.test(p) },
  { id: "sym", label: "อักขระพิเศษ (!@#$...)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

interface ResetPasswordFormProps {
  token: string;
  invalidToken: boolean;
}

export function ResetPasswordForm({ token, invalidToken }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const passwordChecks = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        pass: rule.test(password),
      })),
    [password]
  );
  const passedCount = passwordChecks.filter((rule) => rule.pass).length;
  const canSubmit = !!token && !invalidToken && passedCount === PASSWORD_RULES.length;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    if (!token || invalidToken) {
      toast.error("ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง", {
        description: "กรุณาขอลิงก์ใหม่อีกครั้ง",
      });
      return;
    }
    if (passedCount !== PASSWORD_RULES.length) {
      toast.warning("รหัสผ่านยังไม่ปลอดภัยพอ", {
        description: "กรุณาทำตามเงื่อนไขรหัสผ่านทั้งหมด",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast.warning("รหัสผ่านไม่ตรงกัน", {
        description: "กรุณายืนยันรหัสผ่านใหม่ให้ตรงกัน",
      });
      return;
    }

    setLoading(true);
    const id = toast.loading("กำลังตั้งรหัสผ่านใหม่...");
    try {
      const res = await resetPassword({
        newPassword: password,
        token,
      });

      if (res.error) {
        toast.error("ตั้งรหัสผ่านใหม่ไม่สำเร็จ", {
          id,
          description: res.error.message ?? "ลิงก์อาจหมดอายุแล้ว กรุณาขอลิงก์ใหม่",
        });
        setLoading(false);
        return;
      }

      toast.success("ตั้งรหัสผ่านใหม่สำเร็จ", {
        id,
        description: "กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่",
      });
      setDone(true);
      setTimeout(() => router.push("/"), 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในระบบ";
      toast.error("ตั้งรหัสผ่านใหม่ไม่สำเร็จ", { id, description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-paper text-brand-ink flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-[520px] rounded-[30px] border border-brand-green-100 bg-brand-surface shadow-[0_30px_70px_-30px_rgba(22,163,41,0.38)] p-7 md:p-9">
        <div className="mb-7">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green-50 text-brand-green border border-brand-green-100">
            {done ? <CheckCircle2 className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <h1 className="font-display mt-4 text-3xl font-black tracking-tight text-brand-ink">
            ตั้งรหัสผ่านใหม่
          </h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-brand-ink-soft">
            กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ หลังจากสำเร็จระบบจะพากลับหน้าเข้าสู่ระบบ
          </p>
        </div>

        {invalidToken || !token ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-extrabold">ลิงก์ไม่ถูกต้องหรือหมดอายุ</p>
                <p className="mt-1 text-sm font-semibold">
                  กรุณากลับไปขอลิงก์รีเซ็ตรหัสผ่านใหม่จากหน้าล็อกอิน
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-rose-700 transition"
            >
              กลับหน้าแรก
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : done ? (
          <div className="rounded-2xl border border-brand-green-100 bg-brand-green-50 p-5 text-brand-green">
            <p className="font-extrabold">รหัสผ่านถูกเปลี่ยนแล้ว</p>
            <p className="mt-1 text-sm font-semibold">กำลังพาคุณกลับหน้าแรก...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4.5">
            <div className="relative group">
              <div className="absolute top-1/2 left-4.5 -translate-y-1/2 text-brand-ink-soft group-focus-within:text-brand-green">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="รหัสผ่านใหม่"
                required
                className="w-full rounded-2xl border border-brand-green-100 bg-brand-paper py-4.5 pr-12.5 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-brand-surface focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/70"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute top-1/2 right-4.5 -translate-y-1/2 text-brand-ink-soft hover:text-brand-green transition"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="grid grid-cols-1 gap-1 rounded-2xl bg-brand-paper p-3">
                {passwordChecks.map((rule) => (
                  <span
                    key={rule.id}
                    className={`inline-flex items-center gap-2 text-[11px] font-bold ${
                      rule.pass ? "text-brand-green" : "text-brand-ink-soft/65"
                    }`}
                  >
                    {rule.pass ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-brand-ink-soft/35" />}
                    {rule.label}
                  </span>
                ))}
              </div>
            )}

            <div className="relative group">
              <div className="absolute top-1/2 left-4.5 -translate-y-1/2 text-brand-ink-soft group-focus-within:text-brand-green">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="ยืนยันรหัสผ่านใหม่"
                required
                className="w-full rounded-2xl border border-brand-green-100 bg-brand-paper py-4.5 pr-4 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-brand-surface focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/70"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-600 hover:from-brand-green-600 hover:to-brand-green-700 py-4.5 px-4 text-base font-extrabold text-white shadow-lg shadow-brand-green/20 transition duration-250 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  ตั้งรหัสผ่านใหม่
                  <ArrowRight className="h-4.5 w-4.5" />
                </>
              )}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
