"use client";

import React, { useState, useMemo, useEffect } from "react";
import { signIn, signUp, authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useConfig } from "@/lib/contexts/PublicDataContext";
import {
  X,
  User,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  Eye,
  EyeOff,
  UserCheck,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Crown,
  Loader2,
  Check,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
  onLoginSuccess?: (role: "member" | "agent" | "admin") => void;
}

/* Password strength rules */
const PASSWORD_RULES: Array<{ id: string; label: string; test: (p: string) => boolean }> = [
  { id: "len", label: "อย่างน้อย 8 ตัวอักษร", test: (p) => p.length >= 8 },
  { id: "upper", label: "ตัวพิมพ์ใหญ่ (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "ตัวพิมพ์เล็ก (a-z)", test: (p) => /[a-z]/.test(p) },
  { id: "num", label: "ตัวเลข (0-9)", test: (p) => /\d/.test(p) },
  { id: "sym", label: "อักขระพิเศษ (!@#$...)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function AuthModal({
  isOpen,
  onClose,
  initialTab = "login",
  onLoginSuccess,
}: AuthModalProps) {
  const { config } = useConfig();
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync activeTab when modal re-opens with a different initialTab
  // (useState initializer only runs once; component stays mounted between opens)
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSuccess(false);
      setShowPassword(false);
    }
  }, [isOpen, initialTab]);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // Live password strength (only relevant when registering)
  const passwordChecks = useMemo(
    () =>
      PASSWORD_RULES.map((r) => ({
        ...r,
        pass: r.test(formData.password),
      })),
    [formData.password]
  );
  const passedCount = passwordChecks.filter((r) => r.pass).length;
  const strengthPct = (passedCount / PASSWORD_RULES.length) * 100;
  const strengthLabel =
    passedCount <= 1
      ? "อ่อนมาก"
      : passedCount === 2
      ? "อ่อน"
      : passedCount === 3
      ? "ปานกลาง"
      : passedCount === 4
      ? "ดี"
      : "แข็งแกร่ง";
  const strengthColor =
    passedCount <= 1
      ? "from-rose-500 to-rose-600"
      : passedCount === 2
      ? "from-orange-500 to-orange-600"
      : passedCount === 3
      ? "from-amber-400 to-brand-gold"
      : passedCount === 4
      ? "from-brand-green to-brand-green-600"
      : "from-brand-lime to-brand-green";

  if (!isOpen) return null;

  const handleTabChange = (tab: "login" | "register") => {
    setActiveTab(tab);
    setSuccess(false);
    setShowPassword(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Authoritative database-backed user role resolver
  const resolveUserRole = (user?: {
    role?: string | null;
    email?: string | null;
  } | null): "member" | "agent" | "admin" => {
    if (!user) return "member";
    const dbRole = (user.role ?? "").toLowerCase().trim();
    if (dbRole === "admin" || dbRole === "agent" || dbRole === "member") {
      return dbRole as "member" | "agent" | "admin";
    }
    const email = (user.email ?? "").toLowerCase().trim();
    if (email.endsWith("@admin.tclcoinsxormor.com")) return "admin";
    if (email.endsWith("@vip.tclcoinsxormor.com")) return "agent";
    return "member";
  };

  const finishSuccess = (role: "member" | "agent" | "admin") => {
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onLoginSuccess?.(role);
      onClose();
      // Reload page to seamlessly synchronize cookie-backed sessions in Next.js and Elysia
      window.location.reload();
    }, 1500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const input = formData.username.trim();
    if (!input || !formData.password) {
      toast.warning("กรอกข้อมูลให้ครบ", {
        description: "กรุณาระบุชื่อผู้ใช้/อีเมล และรหัสผ่าน",
      });
      return;
    }

    setLoading(true);
    const id = toast.loading("กำลังเข้าสู่ระบบ...");

    // Strict email format check — anything looking like "x@y.z" is treated as email
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    const credentials = { password: formData.password, rememberMe };

    try {
      // Try primary method based on detection
      let res = isEmail
        ? await signIn.email({ email: input, ...credentials })
        : await signIn.username({ username: input, ...credentials });

      // Fallback: if primary fails AND input is ambiguous (contains @ but maybe not
      // strict email), try the other method silently before showing error
      if (res.error && !isEmail && input.includes("@")) {
        const fallback = await signIn.email({ email: input, ...credentials });
        if (!fallback.error) res = fallback;
      } else if (res.error && isEmail) {
        // Edge case: some users register with email-shaped usernames
        const fallback = await signIn.username({ username: input, ...credentials });
        if (!fallback.error) res = fallback;
      }

      if (res.error) {
        toast.error("เข้าสู่ระบบไม่สำเร็จ", {
          id,
          description:
            res.error.message ??
            "ไม่พบบัญชีนี้ หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
        });
        setLoading(false);
        return;
      }

      // Fetch the actual database session to resolve authoritative role
      const sessionRes = await authClient.getSession({ fetchOptions: { cache: "no-store" } });
      const user = sessionRes?.data?.user;
      const role = resolveUserRole(user);

      const roleDesc =
        role === "admin"
          ? "เข้าสู่ระบบในฐานะผู้ดูแลระบบ"
          : role === "agent"
          ? "เข้าสู่ระบบในฐานะตัวแทนจำหน่าย"
          : `เข้าสู่ระบบด้วย${isEmail ? "อีเมล" : "ชื่อผู้ใช้"}สำเร็จ`;
      toast.success("ยินดีต้อนรับกลับ! 🎉", { id, description: roleDesc });
      setLoading(false);
      finishSuccess(role);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในระบบ";
      toast.error("เข้าสู่ระบบไม่สำเร็จ", { id, description: msg });
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const username = formData.username.trim();
    const email = formData.email.trim();
    if (!username || !email || !formData.password) {
      toast.warning("กรอกข้อมูลให้ครบ", {
        description: "กรุณาระบุชื่อผู้ใช้, อีเมล และรหัสผ่าน",
      });
      return;
    }
    const failed = PASSWORD_RULES.filter((r) => !r.test(formData.password));
    if (failed.length > 0) {
      toast.warning("รหัสผ่านไม่ปลอดภัยพอ", {
        description: `ขาด: ${failed.map((r) => r.label).join(" · ")}`,
      });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.warning("รหัสผ่านไม่ตรงกัน", {
        description: "กรุณายืนยันรหัสผ่านให้ตรงกัน",
      });
      return;
    }

    setLoading(true);
    const id = toast.loading("กำลังสมัครสมาชิก...");
    try {
      const phone = formData.phone.trim();
      const res = await signUp.email({
        email,
        password: formData.password,
        name: username,
        username,
        phone,
      } as Parameters<typeof signUp.email>[0] & { username: string; phone: string });

      if (res.error) {
        toast.error("สมัครสมาชิกไม่สำเร็จ", {
          id,
          description:
            res.error.message ?? "อาจมีบัญชีนี้แล้ว กรุณาลองชื่อผู้ใช้/อีเมลอื่น",
        });
        setLoading(false);
        return;
      }

      // Fetch the actual database session to resolve authoritative role
      const sessionRes = await authClient.getSession({ fetchOptions: { cache: "no-store" } });
      const user = sessionRes?.data?.user;
      const role = resolveUserRole(user);

      toast.success("สมัครสมาชิกสำเร็จ! ✨", {
        id,
        description: "ระบบกำลังพาคุณเข้าสู่ระบบ...",
      });
      setLoading(false);
      finishSuccess(role);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในระบบ";
      toast.error("สมัครสมาชิกไม่สำเร็จ", { id, description: msg });
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (activeTab === "login") return handleLogin(e);
    return handleRegister(e);
  };
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Dark-Theme Modal Dialog */}
      <div className="relative w-full max-w-[1000px] overflow-hidden rounded-[38px] border border-brand-green-100 bg-brand-surface-soft shadow-[0_30px_60px_-15px_rgba(8,238,32,0.25)] ring-1 ring-brand-green/20 transition-all duration-300 grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] animate-in fade-in zoom-in-95 duration-200">
        {/* Soft background light blobs */}
        <div className="absolute top-[-10%] left-[-10%] h-60 w-60 rounded-full bg-brand-green/8 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] h-60 w-60 rounded-full bg-brand-gold/6 blur-[80px] pointer-events-none" />

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 lg:right-auto lg:left-[calc(62.5%-22px)] z-50 flex h-11 w-11 items-center justify-center rounded-full bg-brand-surface border border-brand-green-100 shadow-md text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green transition duration-200"
          aria-label="Close dialog"
        >
          <X className="h-5.5 w-5.5" />
        </button>

        {/* LEFT COLUMN: FORM ACTION PANEL */}
        <div className="p-8 md:p-12 lg:p-14 flex flex-col justify-center min-h-[520px] relative z-10 bg-brand-surface">
          {success ? (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-5 flex h-18 w-18 items-center justify-center rounded-full bg-brand-green-50 text-brand-green border border-brand-green-100 shadow-lg shadow-brand-green/10">
                <CheckCircle2 className="h-11 w-11" />
              </div>
              <h3 className="font-display text-2.5xl font-black text-brand-ink">
                {activeTab === "login"
                  ? "เข้าสู่ระบบสำเร็จ!"
                  : "สมัครสมาชิกสำเร็จ!"}
              </h3>
              <p className="mt-2 text-brand-ink-soft font-semibold text-sm max-w-xs leading-relaxed">
                กำลังดึงประวัติการจองและระบบสมาชิกขึ้นแสดงผล ยินดีต้อนรับกลับ...
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-200">
              {/* Header Title with live dot */}
              <div className="mb-8">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-green">
                    TCLCOINSXORMOR topup system
                  </span>
                </div>
                <h2 className="font-display font-black text-3.5xl tracking-tight text-brand-ink mt-2 leading-none">
                  {activeTab === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
                </h2>
                <p className="mt-3 text-xs.5 md:text-sm text-brand-ink-soft font-bold">
                  {activeTab === "login"
                    ? "ยินดีต้อนรับกลับมา! กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ"
                    : "เริ่มการสมัครสมาชิกของคุณได้เลยที่นี่!"}
                </p>
              </div>

              {/* Form Input pods */}
              <form onSubmit={handleSubmit} className="space-y-4.5">
                {/* Username Input Pod */}
                <div className="relative group">
                  <div className="absolute top-1/2 left-4.5 -translate-y-1/2 flex items-center justify-center text-brand-ink-soft group-focus-within:text-brand-green transition duration-200">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    placeholder={
                      activeTab === "login"
                        ? "ชื่อผู้ใช้งาน หรือ อีเมล"
                        : "ชื่อผู้ใช้งาน"
                    }
                    className="w-full rounded-2xl border border-brand-green-100 bg-brand-paper py-4.5 pr-4 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-brand-surface focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/70"
                  />
                </div>

                {activeTab === "login" && (
                  <p className="text-[10px] text-brand-ink-soft font-bold pl-1.5 -mt-3.5">
                    💡 เข้าสู่ระบบด้วย{" "}
                    <span className="text-brand-green font-black">
                      อีเมล Gmail
                    </span>{" "}
                    หรือ{" "}
                    <span className="text-brand-green font-black">
                      ชื่อผู้ใช้งาน
                    </span>{" "}
                    ที่ลงทะเบียนไว้
                  </p>
                )}

                {activeTab === "register" && (
                  <>
                    {/* Email Input Pod */}
                    <div className="relative group">
                      <div className="absolute top-1/2 left-4.5 -translate-y-1/2 flex items-center justify-center text-brand-ink-soft group-focus-within:text-brand-green transition duration-200">
                        <Mail className="h-4.5 w-4.5" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="อีเมลของคุณ"
                        className="w-full rounded-2xl border border-brand-green-100 bg-brand-paper py-4.5 pr-4 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-brand-surface focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/70"
                      />
                    </div>

                    {/* Phone Input Pod */}
                    <div className="relative group">
                      <div className="absolute top-1/2 left-4.5 -translate-y-1/2 flex items-center justify-center text-brand-ink-soft group-focus-within:text-brand-green transition duration-200">
                        <Phone className="h-4.5 w-4.5" />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        placeholder="เบอร์โทรศัพท์"
                        className="w-full rounded-2xl border border-brand-green-100 bg-brand-paper py-4.5 pr-4 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-brand-surface focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/70"
                      />
                    </div>
                  </>
                )}

                {/* Password Input Pod */}
                <div className="relative group">
                  <div className="absolute top-1/2 left-4.5 -translate-y-1/2 flex items-center justify-center text-brand-ink-soft group-focus-within:text-brand-green transition duration-200">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    placeholder="รหัสผ่าน"
                    className="w-full rounded-2xl border border-brand-green-100 bg-brand-paper py-4.5 pr-12.5 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-brand-surface focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/70"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-4.5 -translate-y-1/2 text-brand-ink-soft hover:text-brand-green transition"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator — register only */}
                {activeTab === "register" && formData.password.length > 0 && (
                  <div className="space-y-2 -mt-2 px-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Strength bar + label */}
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-1.5 bg-brand-surface-soft rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${strengthColor} transition-all duration-300`}
                          style={{ width: `${strengthPct}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                          passedCount <= 1
                            ? "text-rose-400"
                            : passedCount === 2
                            ? "text-orange-400"
                            : passedCount === 3
                            ? "text-brand-gold"
                            : "text-brand-green"
                        }`}
                      >
                        {strengthLabel}
                      </span>
                    </div>

                    {/* Rule checklist */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {passwordChecks.map((rule) => (
                        <span
                          key={rule.id}
                          className={`text-[10.5px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                            rule.pass
                              ? "text-brand-green"
                              : "text-brand-ink-soft/60"
                          }`}
                        >
                          {rule.pass ? (
                            <Check className="h-3 w-3" strokeWidth={3} />
                          ) : (
                            <span className="h-3 w-3 inline-flex items-center justify-center">
                              <span className="h-1 w-1 rounded-full bg-brand-ink-soft/40" />
                            </span>
                          )}
                          {rule.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "register" && (
                  /* Confirm Password Pod */
                  <div className="relative group">
                    <div className="absolute top-1/2 left-4.5 -translate-y-1/2 flex items-center justify-center text-brand-ink-soft group-focus-within:text-brand-green transition duration-200">
                      <Lock className="h-4.5 w-4.5" />
                    </div>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      placeholder="ยืนยันรหัสผ่าน"
                      className="w-full rounded-2xl border border-brand-green-100 bg-brand-paper py-4.5 pr-4 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-brand-surface focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/70"
                    />
                  </div>
                )}

                {/* Options panel */}
                {activeTab === "login" && (
                  <div className="flex items-center justify-between pl-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 bg-brand-paper border-brand-green-100 rounded accent-brand-green"
                      />
                      <span className="text-xs.5 font-bold text-brand-ink-soft">
                        จดจำฉันไว้
                      </span>
                    </label>
                    <a
                      href="#"
                      className="text-xs.5 font-bold text-brand-ink-soft hover:text-brand-green hover:underline transition"
                    >
                      ลืมรหัสผ่าน?
                    </a>
                  </div>
                )}

                {/* DUAL BUTTON CAPSULE SYSTEM */}
                <div className="pt-3.5 space-y-3">
                  {/* Primary Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-600 hover:from-brand-green-600 hover:to-brand-green-700 py-4.5 px-4 text-base font-extrabold text-white shadow-lg shadow-brand-green/20 hover:scale-[1.01] hover:shadow-brand-green/35 transition duration-250 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        กำลังดำเนินการ...
                      </>
                    ) : (
                      <>
                        {activeTab === "login"
                          ? "เข้าสู่ระบบ"
                          : "สมัครสมาชิกเลย"}
                        <ArrowRight className="h-4.5 w-4.5" />
                      </>
                    )}
                  </button>

                  {/* Secondary Button — VIP Agent (dark green + gold border + glow) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (config?.agentLink) {
                        window.open(config.agentLink, "_blank");
                      } else {
                        handleTabChange("register");
                      }
                    }}
                    className="group/agent relative w-full rounded-2xl bg-gradient-to-br from-brand-green-700 via-brand-green-600 to-brand-leaf-deep border-2 border-brand-gold py-3.5 px-4 text-base font-extrabold text-brand-ink hover:scale-[1.01] shadow-lg shadow-brand-gold/25 hover:shadow-xl hover:shadow-brand-gold/45 transition duration-250 flex items-center justify-center gap-2.5 cursor-pointer overflow-hidden"
                  >
                    {/* Gold shimmer overlay */}
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-brand-gold-light/15 to-transparent translate-x-[-100%] group-hover/agent:translate-x-[100%] transition-transform duration-700" />

                    <Crown
                      className="h-5 w-5 text-brand-gold drop-shadow-[0_1px_3px_rgba(240,168,0,0.6)] flex-shrink-0"
                      strokeWidth={2.5}
                    />
                    <span className="flex flex-col items-start leading-none gap-1">
                      <span className="text-white text-glow-gold">
                        สมัครตัวแทน
                      </span>
                      <span className="text-[10px] text-brand-gold-light font-bold tracking-wide">
                        สิทธิพิเศษ VIP · รับรหัสตัวแทน
                      </span>
                    </span>
                  </button>
                </div>
              </form>

              {/* Footer Switch Option */}
              <div className="mt-8 text-center text-xs.5 text-brand-ink-soft font-bold">
                {activeTab === "login" ? (
                  <span>
                    ยังไม่มีบัญชีใช่ไหม?{" "}
                    <button
                      onClick={() => handleTabChange("register")}
                      className="font-extrabold text-brand-green hover:underline"
                    >
                      สมัครสมาชิกที่นี่
                    </button>
                  </span>
                ) : (
                  <span>
                    มีบัญชีแล้วใช่ไหม?{" "}
                    <button
                      onClick={() => handleTabChange("login")}
                      className="font-extrabold text-brand-green hover:underline"
                    >
                      เข้าสู่ระบบ
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PREMIUM DARK ILLUSTRATION & DETAILS */}
        <div className="hidden lg:flex relative bg-gradient-to-br from-brand-surface via-brand-paper to-brand-surface p-10 xl:p-12 flex-col justify-center border-l border-brand-green-100/40 overflow-hidden">
          {/* Soft brand color blobs for depth on dark */}
          <div className="absolute -top-16 -right-12 h-60 w-60 rounded-full bg-brand-green/20 blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-brand-gold/15 blur-[90px] pointer-events-none" />
          <div className="absolute top-1/2 right-1/3 h-32 w-32 rounded-full bg-brand-lime/8 blur-[60px] pointer-events-none" />

          {/* Subtle grid background pattern */}
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(#39C848 1.4px, transparent 1.4px)",
              backgroundSize: "24px 24px",
              maskImage: "linear-gradient(to bottom, #000 70%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to bottom, #000 70%, transparent)",
            }}
          />

          {/* CONTENT STACK */}
          <div className="space-y-6 relative z-10">
            {/* HEADLINE BLOCK — replaces the plain quote */}
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 bg-brand-green/15 border border-brand-green/40 text-brand-green font-black text-[10px] uppercase tracking-[0.18em] py-1.5 px-3.5 rounded-full mb-4 shadow-sm shadow-brand-green/20">
                <Sparkles
                  className="h-3 w-3 fill-brand-gold text-brand-gold"
                  strokeWidth={2}
                />
                ระบบจองเหรียญไลน์อันดับ 1
              </div>
              <h3 className="font-display font-black text-[26px] xl:text-[30px] leading-[1.05] tracking-tight text-brand-ink">
                ยินดีต้อนรับสู่
                <br />
                <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-brand-green-600 to-brand-green">
                  ครอบครัว TCLCOINSXORMOR
                  <span className="absolute left-0 right-0 bottom-0.5 h-2 bg-brand-gold/40 rounded -z-10 rotate-[-0.5deg]" />
                </span>
              </h3>
              <p className="mt-3 text-[12.5px] text-brand-ink-soft font-semibold leading-relaxed max-w-[300px] mx-auto">
                เข้าสู่ระบบเพื่อรับ
                <b className="text-brand-ink"> สิทธิพิเศษ</b>,
                <b className="text-brand-ink"> คิวด่วน</b> และ
                <b className="text-brand-ink"> ราคาสมาชิก</b>
              </p>
            </div>

            {/* Highlight Tag: Agent — bigger padding, no backdrop-blur */}
            <div className="flex gap-4 bg-brand-surface-soft border border-[#E04F96]/30 p-8 rounded-[28px] shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-[#E04F96]/10 text-[#E04F96] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <UserCheck className="h-5.5 w-5.5" />
              </div>
              <div className="text-[12.5px] leading-relaxed">
                <b className="text-[#E04F96] text-[14.5px] block mb-1 font-black">
                  บทบาทตัวแทนจำหน่าย
                </b>
                <span className="text-brand-ink-soft font-medium">
                  สมัครสมาชิกโดยใช้{" "}
                  <b className="text-[#E04F96]">(ชื่อผู้ใช้งาน)</b>{" "}
                  ในกลุ่มโอเพนแชทที่คุณตั้งไว้ได้เลย
                </span>
              </div>
            </div>

            {/* Highlight Tag: Customer */}
            <div className="flex gap-4 bg-brand-surface-soft border border-brand-green/30 p-8 rounded-[28px] shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-brand-green-50 text-brand-green flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <ShieldCheck className="h-5.5 w-5.5" />
              </div>
              <div className="text-[12.5px] leading-relaxed">
                <b className="text-brand-green text-[14.5px] block mb-1 font-black">
                  บทบาทลูกค้าทั่วไป
                </b>
                <span className="text-brand-ink-soft font-medium">
                  สมัครได้ตามปกติ
                  และอัปเกรดเป็นตัวแทนเพื่อรับเรทพิเศษที่ดีกว่าได้ทันที
                </span>
              </div>
            </div>

            {/* Social proof — avatar stack + tagline */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <div className="flex -space-x-2.5 select-none">
                <span className="h-7 w-7 rounded-full border-2 border-white shadow-sm bg-gradient-to-tr from-[#FF8A65] to-[#FF7043] text-white text-[10px] font-black flex items-center justify-center">
                  อ
                </span>
                <span className="h-7 w-7 rounded-full border-2 border-white shadow-sm bg-gradient-to-tr from-brand-green to-brand-green-600 text-white text-[10px] font-black flex items-center justify-center">
                  ร
                </span>
                <span className="h-7 w-7 rounded-full border-2 border-white shadow-sm bg-gradient-to-tr from-[#42A5F5] to-[#1E88E5] text-white text-[10px] font-black flex items-center justify-center">
                  ม
                </span>
                <span className="h-7 w-7 rounded-full border-2 border-white shadow-sm bg-brand-green-700 text-white text-[9px] font-black flex items-center justify-center">
                  +99
                </span>
              </div>
              <p className="text-[11.5px] font-extrabold text-brand-ink leading-tight">
                สมาชิกกว่า <span className="text-brand-green">143 คน</span>
                <br />
                <span className="text-brand-ink-soft font-bold">
                  ไว้วางใจแล้ว <span className="text-brand-gold-deep">⭐</span>
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
