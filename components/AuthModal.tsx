"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  authClient,
  requestPasswordReset,
  signIn,
  signUp,
} from "@/lib/auth-client";
import { publicApi } from "@/lib/eden";
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
  Store,
  MessageCircle,
  BookOpen,
  TriangleAlert,
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

type AuthTab = "login" | "register" | "forgot";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact" | "flexible";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      "timeout-callback"?: () => void;
    }
  ) => string;
  remove?: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
  "";
let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("โหลด Turnstile ไม่สำเร็จ")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("โหลด Turnstile ไม่สำเร็จ"));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

function TurnstileWidget({
  siteKey,
  resetKey,
  error,
  onVerify,
  onExpire,
  onError,
}: {
  siteKey: string;
  resetKey: string;
  error: string | null;
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current && window.turnstile.remove) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        containerRef.current.innerHTML = "";
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          size: "flexible",
          callback: onVerify,
          "expired-callback": onExpire,
          "timeout-callback": onExpire,
          "error-callback": onError,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setScriptError("ไม่สามารถโหลดระบบยืนยันความปลอดภัยได้ กรุณารีเฟรชหน้าอีกครั้ง");
        onError();
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, resetKey, onVerify, onExpire, onError]);

  const message = scriptError ?? error;

  return (
    <div className="rounded-2xl border border-brand-green-100 bg-brand-paper/70 p-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold text-brand-ink-soft">
        <ShieldCheck className="h-3.5 w-3.5 text-brand-green" />
        ยืนยันความปลอดภัยด้วย Cloudflare
      </div>
      <div ref={containerRef} className="min-h-[65px] w-full overflow-hidden rounded-xl" />
      {message && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] font-bold leading-relaxed text-amber-300">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}

export default function AuthModal({
  isOpen,
  onClose,
  initialTab = "login",
  onLoginSuccess,
}: AuthModalProps) {
  const { config } = useConfig();
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [turnstileResetCounter, setTurnstileResetCounter] = useState(0);

  // Sync activeTab when modal re-opens with a different initialTab
  // (useState initializer only runs once; component stays mounted between opens)
  useEffect(() => {
    if (!isOpen) return;

    const id = window.setTimeout(() => {
      setActiveTab(initialTab);
      setSuccess(false);
      setShowPassword(false);
      setLoginError(null);
      setRegisterError(null);
      setTurnstileToken("");
      setTurnstileError(null);
      setTurnstileResetCounter((value) => value + 1);
    }, 0);

    return () => window.clearTimeout(id);
  }, [isOpen, initialTab]);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    shopName: "",
    lineId: "",
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

  const resetTurnstileChallenge = useCallback(() => {
    setTurnstileToken("");
    setTurnstileError(null);
    setTurnstileResetCounter((value) => value + 1);
  }, []);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileError(null);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
    setTurnstileError("การยืนยันหมดอายุ กรุณายืนยันอีกครั้ง");
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken("");
    setTurnstileError("ตรวจสอบความปลอดภัยไม่สำเร็จ กรุณาลองอีกครั้ง");
  }, []);

  if (!isOpen) return null;

  const turnstileEnabled = activeTab !== "forgot" && TURNSTILE_SITE_KEY !== "";

  const getCaptchaFetchOptions = () =>
    turnstileEnabled && turnstileToken
      ? {
          headers: {
            "x-captcha-response": turnstileToken,
          },
        }
      : undefined;

  const requireTurnstile = (target: "login" | "register") => {
    if (!turnstileEnabled) return true;
    if (turnstileToken) return true;

    const description =
      turnstileError ?? "กรุณายืนยันความปลอดภัย Cloudflare ก่อนดำเนินการต่อ";
    if (target === "login") setLoginError(description);
    else setRegisterError(description);
    toast.warning("ยืนยันความปลอดภัยก่อน", { description, duration: 5000 });
    return false;
  };

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    setSuccess(false);
    setShowPassword(false);
    setLoginError(null);
    setRegisterError(null);
    resetTurnstileChallenge();
    if (tab === "forgot" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.username.trim())) {
      setFormData((prev) => ({ ...prev, email: prev.username.trim() }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (activeTab === "login") setLoginError(null);
    if (activeTab === "register") setRegisterError(null);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showLoginWarning = (title: string, description: string) => {
    setLoginError(description);
    toast.warning(title, { description, duration: 5000 });
  };

  const getFriendlyAuthError = (message?: string | null) => {
    const raw = message?.trim();
    const lower = raw?.toLowerCase() ?? "";
    if (
      lower.includes("captcha") ||
      lower.includes("verification") ||
      lower.includes("turnstile") ||
      lower.includes("missing response")
    ) {
      return "ยืนยันความปลอดภัยไม่สำเร็จ กรุณาลองยืนยัน Cloudflare อีกครั้ง";
    }

    return raw;
  };

  const showLoginFailure = (
    toastId: string | number,
    message?: string | null
  ) => {
    const raw = getFriendlyAuthError(message);
    const lower = raw?.toLowerCase() ?? "";
    const description =
      !raw ||
      lower.includes("invalid") ||
      lower.includes("password") ||
      lower.includes("credential") ||
      lower.includes("not found")
        ? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง"
        : raw;

    setLoginError(description);
    toast.error("เข้าสู่ระบบไม่สำเร็จ", {
      id: toastId,
      description,
      duration: 6000,
    });
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
    if (!input && !formData.password) {
      showLoginWarning(
        "กรอกข้อมูลให้ครบ",
        "กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน"
      );
      return;
    }
    if (!input) {
      showLoginWarning("กรุณากรอกชื่อผู้ใช้", "กรุณาระบุชื่อผู้ใช้หรืออีเมล");
      return;
    }
    if (!formData.password) {
      showLoginWarning("กรุณากรอกรหัสผ่าน", "กรุณากรอกรหัสผ่านก่อนเข้าสู่ระบบ");
      return;
    }
    if (!requireTurnstile("login")) return;

    setLoading(true);
    const id = toast.loading("กำลังเข้าสู่ระบบ...");

    // Strict email format check — anything looking like "x@y.z" is treated as email
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    const credentials = { password: formData.password, rememberMe };
    const captchaFetchOptions = getCaptchaFetchOptions();

    try {
      let resolvedUsername: string | null = null;
      try {
        const resolved =
          await publicApi.authResolve.api.v0.auth.resolve.post({
            identifier: input,
          });
        resolvedUsername =
          resolved?.data?.ok && resolved.data.username
            ? resolved.data.username
            : null;
      } catch {
        // ถ้า resolve ล้มเหลว ให้ใช้ method ตาม input เดิม
      }

      // Turnstile token ตรวจได้ครั้งเดียว จึงต้องยิง auth endpoint เพียงครั้งเดียวต่อ submit
      const res = resolvedUsername
        ? await signIn.username({ username: resolvedUsername, ...credentials }, captchaFetchOptions)
        : isEmail
          ? await signIn.email({ email: input, ...credentials }, captchaFetchOptions)
          : await signIn.username({ username: input, ...credentials }, captchaFetchOptions);

      if (res.error) {
        showLoginFailure(id, res.error.message);
        resetTurnstileChallenge();
        setLoading(false);
        return;
      }

      // Fetch the actual database session to resolve authoritative role
      const sessionRes = await authClient.getSession({ fetchOptions: { cache: "no-store" } });
      const user = sessionRes?.data?.user;
      if (!user) {
        showLoginFailure(id, "ไม่สามารถยืนยันการเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง");
        resetTurnstileChallenge();
        setLoading(false);
        return;
      }
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
      showLoginFailure(id, msg);
      resetTurnstileChallenge();
      setLoading(false);
    }
  };

  // แจ้ง error ของการสมัครสมาชิก — โชว์ทั้ง inline alert (ค้างในฟอร์ม) + toast
  const showRegisterError = (
    title: string,
    description: string,
    type: "warning" | "error" = "error"
  ) => {
    setRegisterError(description);
    if (type === "warning") toast.warning(title, { description, duration: 5000 });
    else toast.error(title, { description, duration: 6000 });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setRegisterError(null);

    const username = formData.username.trim();
    const email = formData.email.trim();
    if (!username || !email || !formData.password) {
      showRegisterError("กรอกข้อมูลให้ครบ", "กรุณาระบุชื่อผู้ใช้, อีเมล และรหัสผ่าน", "warning");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showRegisterError("อีเมลไม่ถูกต้อง", "กรุณาระบุอีเมลที่ถูกต้อง", "warning");
      return;
    }
    // เช็ค "รหัสผ่านยืนยัน" ก่อนเสมอ — ให้ขึ้น alert ทันทีถ้ายังไม่กรอก/ไม่ตรงกัน
    if (!formData.confirmPassword) {
      showRegisterError("กรุณายืนยันรหัสผ่าน", "กรอกรหัสผ่านอีกครั้งในช่อง “ยืนยันรหัสผ่าน”", "warning");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      showRegisterError(
        "รหัสผ่านไม่ตรงกัน",
        "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง"
      );
      return;
    }
    const failed = PASSWORD_RULES.filter((r) => !r.test(formData.password));
    if (failed.length > 0) {
      showRegisterError(
        "รหัสผ่านไม่ปลอดภัยพอ",
        `ขาด: ${failed.map((r) => r.label).join(" · ")}`,
        "warning"
      );
      return;
    }
    if (!requireTurnstile("register")) return;

    setLoading(true);
    const id = toast.loading("กำลังสมัครสมาชิก...");
    try {
      const phone = formData.phone.trim();
      const shopName = formData.shopName.trim();
      const lineId = formData.lineId.trim();
      const captchaFetchOptions = getCaptchaFetchOptions();
      const res = await signUp.email(
        {
          email,
          password: formData.password,
          name: username,
          username,
          phone,
          shopName,
          lineId,
        } as Parameters<typeof signUp.email>[0] & {
          username: string;
          phone: string;
          shopName: string;
          lineId: string;
        },
        captchaFetchOptions
      );

      if (res.error) {
        const desc =
          getFriendlyAuthError(res.error.message) ??
          "อาจมีบัญชีนี้แล้ว กรุณาลองชื่อผู้ใช้/อีเมลอื่น";
        setRegisterError(desc);
        toast.error("สมัครสมาชิกไม่สำเร็จ", { id, description: desc, duration: 6000 });
        resetTurnstileChallenge();
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
      const msg = getFriendlyAuthError(err instanceof Error ? err.message : null) ?? "เกิดข้อผิดพลาดในระบบ";
      setRegisterError(msg);
      toast.error("สมัครสมาชิกไม่สำเร็จ", { id, description: msg, duration: 6000 });
      resetTurnstileChallenge();
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const email = formData.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.warning("อีเมลไม่ถูกต้อง", {
        description: "กรุณาระบุอีเมลที่ใช้สมัครสมาชิก",
      });
      return;
    }

    setLoading(true);
    const id = toast.loading("กำลังส่งลิงก์รีเซ็ตรหัสผ่าน...");
    try {
      const res = await requestPasswordReset({ email });
      if (res.error) {
        toast.error("ส่งอีเมลไม่สำเร็จ", {
          id,
          description:
            res.error.message ??
            "กรุณาตรวจสอบการตั้งค่า SMTP/Gmail ในระบบ",
        });
        setLoading(false);
        return;
      }

      toast.success("ส่งคำขอเรียบร้อย", {
        id,
        description:
          "หากอีเมลนี้มีบัญชีอยู่ในระบบ คุณจะได้รับลิงก์สำหรับตั้งรหัสผ่านใหม่",
      });
      setActiveTab("login");
      resetTurnstileChallenge();
      setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในระบบ";
      toast.error("ส่งอีเมลไม่สำเร็จ", { id, description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (activeTab === "forgot") return handleForgotPassword(e);
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
      <div className="relative w-full max-w-[1000px] max-h-[92vh] overflow-x-hidden overflow-y-auto rounded-[38px] border border-brand-green-100 bg-brand-surface-soft shadow-[0_30px_60px_-15px_rgba(8,238,32,0.25)] ring-1 ring-brand-green/20 transition-all duration-300 grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] animate-in fade-in zoom-in-95 duration-200">
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
                  {activeTab === "login"
                    ? "เข้าสู่ระบบ"
                    : activeTab === "forgot"
                    ? "ลืมรหัสผ่าน"
                    : "สมัครสมาชิก"}
                </h2>
                <p className="mt-3 text-xs.5 md:text-sm text-brand-ink-soft font-bold">
                  {activeTab === "login"
                    ? "ยินดีต้อนรับกลับมา! กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ"
                    : activeTab === "forgot"
                    ? "กรอกอีเมลที่ใช้สมัครสมาชิก แล้วระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่"
                    : "เริ่มการสมัครสมาชิกของคุณได้เลยที่นี่!"}
                </p>
              </div>

              {/* Form Input pods */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4.5">
                {activeTab === "forgot" ? (
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
                      placeholder="อีเมลที่ใช้สมัครสมาชิก"
                      className="w-full rounded-2xl border border-brand-green-100 bg-brand-paper py-4.5 pr-4 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-brand-surface focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/70"
                    />
                  </div>
                ) : (
                  <>
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
                            ? "ชื่อผู้ใช้"
                            : "ชื่อผู้ใช้งาน"
                        }
                        className="w-full rounded-2xl border border-brand-green-100 bg-brand-paper py-4.5 pr-4 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-brand-surface focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/70"
                      />
                    </div>
                  </>
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

                    {/* ชื่อร้านปัจจุบัน */}
                    <div className="relative group">
                      <div className="absolute top-1/2 left-4.5 -translate-y-1/2 flex items-center justify-center text-brand-ink-soft group-focus-within:text-brand-green transition duration-200">
                        <Store className="h-4.5 w-4.5" />
                      </div>
                      <input
                        type="text"
                        name="shopName"
                        value={formData.shopName}
                        onChange={handleInputChange}
                        placeholder="ชื่อร้านปัจจุบัน"
                        className="w-full rounded-2xl border border-brand-green-100 bg-brand-paper py-4.5 pr-4 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-brand-surface focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/70"
                      />
                    </div>

                    {/* ไอดีไลน์ปัจจุบันที่ใช้เติม Coins */}
                    <div className="relative group">
                      <div className="absolute top-1/2 left-4.5 -translate-y-1/2 flex items-center justify-center text-brand-ink-soft group-focus-within:text-brand-green transition duration-200">
                        <MessageCircle className="h-4.5 w-4.5" />
                      </div>
                      <input
                        type="text"
                        name="lineId"
                        value={formData.lineId}
                        onChange={handleInputChange}
                        placeholder="ไอดีไลน์ปัจจุบันที่ใช้เติม Coins"
                        className="w-full rounded-2xl border border-brand-green-100 bg-brand-paper py-4.5 pr-4 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-brand-surface focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/70"
                      />
                    </div>
                  </>
                )}

                {activeTab !== "forgot" && (
                  /* Password Input Pod */
                  <>
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
                        aria-invalid={activeTab === "login" && !!loginError}
                        className={`w-full rounded-2xl border bg-brand-paper py-4.5 pr-12.5 pl-12.5 text-sm font-semibold outline-none transition focus:bg-brand-surface focus:ring-4 text-brand-ink placeholder:text-brand-ink-soft/70 ${
                          activeTab === "login" && loginError
                            ? "border-rose-400 focus:border-rose-400 focus:ring-rose-500/20"
                            : "border-brand-green-100 focus:border-brand-green focus:ring-brand-green/20"
                        }`}
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
                    {activeTab === "login" && loginError && (
                      <div
                        role="alert"
                        className="-mt-1 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] font-bold leading-relaxed text-rose-300"
                      >
                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <span>{loginError}</span>
                      </div>
                    )}
                  </>
                )}

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

                {turnstileEnabled && (
                  <TurnstileWidget
                    key={`${activeTab}-${turnstileResetCounter}`}
                    siteKey={TURNSTILE_SITE_KEY}
                    resetKey={`${activeTab}-${turnstileResetCounter}`}
                    error={turnstileError}
                    onVerify={handleTurnstileVerify}
                    onExpire={handleTurnstileExpire}
                    onError={handleTurnstileError}
                  />
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
                    <button
                      type="button"
                      onClick={() => handleTabChange("forgot")}
                      className="text-xs.5 font-bold text-brand-ink-soft hover:text-brand-green hover:underline transition"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                )}

                {/* Inline alert ตอนสมัครสมาชิก — แสดงค้างในฟอร์มเมื่อมี error */}
                {activeTab === "register" && registerError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-[12px] font-bold leading-relaxed text-rose-300"
                  >
                    <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{registerError}</span>
                  </div>
                )}

                {/* DUAL BUTTON CAPSULE SYSTEM */}
                <div className="pt-3.5 space-y-3">
                  {/* Primary Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    aria-busy={loading}
                    className="w-full rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-600 hover:from-brand-green-600 hover:to-brand-green-700 py-4.5 px-4 text-base font-extrabold text-white shadow-lg shadow-brand-green/20 hover:scale-[1.01] hover:shadow-brand-green/35 transition duration-250 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        <span aria-live="polite">กำลังโหลด</span>
                      </>
                    ) : (
                      <>
                        {activeTab === "login"
                          ? "เข้าสู่ระบบ"
                          : activeTab === "forgot"
                          ? "ส่งลิงก์รีเซ็ต"
                          : "สมัครสมาชิกเลย"}
                        <ArrowRight className="h-4.5 w-4.5" />
                      </>
                    )}
                  </button>

                  {/* Secondary Button — VIP Agent (dark green + gold border + glow) */}
                  {activeTab !== "forgot" && (
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
                          สมัครตัวแทน 199฿
                        </span>
                        <span className="text-[10px] text-brand-gold-light font-bold tracking-wide">
                          สิทธิพิเศษ VIP • พร้อมส่วนลดมากมาย!
                        </span>
                      </span>
                    </button>
                  )}
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
        <div className="flex order-first lg:order-none relative bg-gradient-to-br from-brand-surface via-brand-paper to-brand-surface p-7 lg:p-10 xl:p-12 flex-col justify-center border-b lg:border-b-0 lg:border-l border-brand-green-100/40 overflow-hidden">
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
                {config.welcomeTitle?.trim() ? (
                  <span className="relative inline-flex max-w-full items-center justify-center gap-2 text-white">
                    <BookOpen
                      className="h-6 w-6 shrink-0 text-brand-gold xl:h-7 xl:w-7"
                      strokeWidth={2.5}
                    />
                    <span className="relative min-w-0 break-words">
                      {config.welcomeTitle}
                      <span className="absolute left-0 right-0 bottom-0.5 h-2 bg-brand-gold/40 rounded -z-10 rotate-[-0.5deg]" />
                    </span>
                  </span>
                ) : (
                  <>
                    ยินดีต้อนรับสู่
                    <br />
                    <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-brand-green-600 to-brand-green">
                      ครอบครัว TCLCOINSXORMOR
                      <span className="absolute left-0 right-0 bottom-0.5 h-2 bg-brand-gold/40 rounded -z-10 rotate-[-0.5deg]" />
                    </span>
                  </>
                )}
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
                <span className="text-brand-ink-soft font-medium whitespace-pre-line">
                  {config.welcomeAgentDesc?.trim() || (
                    <>
                      สมัครสมาชิกโดยใช้{" "}
                      <b className="text-[#E04F96]">(ชื่อผู้ใช้งาน)</b>{" "}
                      ในกลุ่มโอเพนแชทที่คุณตั้งไว้ได้เลย
                    </>
                  )}
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
                <span className="text-brand-ink-soft font-medium whitespace-pre-line">
                  {config.welcomeMemberDesc?.trim() ||
                    "สมัครได้ตามปกติ และอัปเกรดเป็นตัวแทนเพื่อรับเรทพิเศษที่ดีกว่าได้ทันที"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
