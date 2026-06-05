"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authClient, useSession, signOut } from "@/lib/auth-client";
import { profileApi } from "@/lib/eden";
import { uploadImage } from "@/lib/upload";
import {
  Mail,
  AtSign,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Save,
  Upload,
  Trash2,
  Camera,
  Loader2,
  ChevronLeft,
  ShieldCheck,
  Crown,
  Shield,
  Store,
  MessageCircle,
  ArrowRight,
  Copy,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Navbar, { formatDisplayID } from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import { useConfig } from "@/lib/contexts/PublicDataContext";
import { copyToClipboard } from "@/lib/utils";


type UserRole = "member" | "agent" | "admin";

type CopyFeedback = {
  type: "success" | "error";
  title: string;
  description: string;
};

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

const ROLE_META: Record<
  UserRole,
  { label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; color: string }
> = {
  member: { label: "สมาชิกทั่วไป", icon: ShieldCheck, color: "text-brand-green" },
  agent: { label: "ตัวแทนจำหน่าย", icon: Crown, color: "text-brand-gold" },
  admin: { label: "ผู้ดูแลระบบ", icon: Shield, color: "text-sky-400" },
};

function buildFallbackAvatar(identifier?: string | null) {
  const raw = (identifier ?? "U").trim();
  const firstChar = raw.charAt(0).toUpperCase() || "U";
  return `https://placehold.co/500x500/39C848/F7FDF7?text=${encodeURIComponent(firstChar)}`;
}

const inputCls =
  "w-full rounded-xl border border-brand-green-100 bg-brand-paper py-3 px-4 text-sm font-semibold outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60 disabled:opacity-60 disabled:cursor-not-allowed";

export default function ProfilePage() {
  const { data: session, isPending, refetch } = useSession();
  const user = session?.user as
    | {
        id?: string;
        memberNo?: number | null;
        username?: string | null;
        displayUsername?: string | null;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        phone?: string | null;
        role?: string | null;
        shopName?: string | null;
        lineId?: string | null;
      }
    | undefined;
  const { config } = useConfig();

  // Modal/auth state for Navbar
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const isLoggedIn = !!user;
  const userRole = resolveUserRole(user);

  // Profile picture
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account info
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  // ข้อมูลร้าน (สำหรับตัวแทน) — ชื่อร้านปัจจุบัน + ไอดีไลน์ที่ใช้เติม Coins
  const [shopName, setShopName] = useState("");
  const [lineId, setLineId] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback | null>(null);

  // Initialize editable account fields from user
  useEffect(() => {
    if (!user) return;

    const id = window.setTimeout(() => {
      setPhone(user.phone ?? "");
      setUsername(user.displayUsername?.trim() ? user.displayUsername : user.username ?? "");
      setShopName(user.shopName ?? "");
      setLineId(user.lineId ?? "");
    }, 0);

    return () => window.clearTimeout(id);
  }, [user?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!copyFeedback) return;

    const id = window.setTimeout(() => {
      setCopyFeedback(null);
    }, 2600);

    return () => window.clearTimeout(id);
  }, [copyFeedback]);

  const displayName = useMemo(
    () =>
      user?.displayUsername ||
      user?.username ||
      user?.name ||
      user?.email?.split("@")[0] ||
      "บัญชีของฉัน",
    [user]
  );
  const currentAvatarSrc =
    avatarPreview ?? user?.image ?? buildFallbackAvatar(displayName);
  const role = ROLE_META[userRole];
  const RoleIcon = role.icon;

  const handlePickAvatar = () => fileInputRef.current?.click();

  const handleCopyUid = async () => {
    if (!user?.id) {
      setCopyFeedback({
        type: "error",
        title: "คัดลอก UID ไม่สำเร็จ",
        description: "ไม่พบ UID ของผู้ใช้งาน",
      });
      toast.error("คัดลอก UID ไม่สำเร็จ", {
        description: "ไม่พบ UID ของผู้ใช้งาน",
      });
      return;
    }

    const uid = formatDisplayID(user.memberNo, user.id);
    const copied = await copyToClipboard(uid);
    if (copied) {
      setCopyFeedback({
        type: "success",
        title: "คัดลอก UID แล้ว",
        description: uid,
      });
      toast.success("คัดลอก UID สำเร็จแล้ว!", { description: uid });
      return;
    }

    setCopyFeedback({
      type: "error",
      title: "คัดลอก UID ไม่สำเร็จ",
      description: "กรุณาลองอีกครั้ง",
    });
    toast.error("คัดลอก UID ไม่สำเร็จ", {
      description: "กรุณาลองอีกครั้ง",
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.warning("ไฟล์ใหญ่เกินไป", { description: "อัปโหลดได้สูงสุด 2 MB" });
      e.target.value = "";
      return;
    }
    setAvatarUploading(true);
    const tId = toast.loading("กำลังอัปโหลดรูป...");
    try {
      // อัปโหลดเป็นไฟล์จริง → ได้ URL (/uploads/images/xxx) ไม่ใช่ base64
      const url = await uploadImage(file);
      setAvatarPreview(url);
      toast.success("อัปโหลดรูปแล้ว — กด \"บันทึกรูป\" เพื่อยืนยัน", { id: tId });
    } catch (err) {
      toast.error("อัปโหลดรูปไม่สำเร็จ", {
        id: tId,
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handleSaveAvatar = async () => {
    if (!avatarPreview) {
      toast.warning("ยังไม่ได้เลือกรูปใหม่");
      return;
    }
    setAvatarUploading(true);
    const id = toast.loading("กำลังบันทึกรูปโปรไฟล์...");
    try {
      const res = await authClient.updateUser({ image: avatarPreview });
      if (res.error) {
        toast.error("บันทึกรูปไม่สำเร็จ", {
          id,
          description: res.error.message ?? "เกิดข้อผิดพลาด",
        });
        setAvatarUploading(false);
        return;
      }
      toast.success("อัปเดตรูปโปรไฟล์แล้ว", { id });
      setAvatarPreview(null);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด in ระบบ";
      toast.error("บันทึกรูปไม่สำเร็จ", { id, description: msg });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveInfo = async () => {
    if (savingInfo) return;
    setSavingInfo(true);
    const id = toast.loading("กำลังบันทึก...");
    try {
      const nextUsername = username.trim();
      // ชื่อผู้ใช้เดิม (ก่อนบันทึก) — ใช้ย้ายสิทธิ์ส่วนลดพิเศษไปชื่อใหม่หลังเปลี่ยนชื่อ
      const previousUsername = (user?.username ?? user?.displayUsername ?? "").trim();
      if (nextUsername.length < 3) {
        toast.warning("ชื่อผู้ใช้สั้นเกินไป", {
          id,
          description: "ต้องมีอย่างน้อย 3 ตัวอักษร",
        });
        setSavingInfo(false);
        return;
      }
      if (nextUsername.length > 30) {
        toast.warning("ชื่อผู้ใช้ยาวเกินไป", {
          id,
          description: "ต้องไม่เกิน 30 ตัวอักษร",
        });
        setSavingInfo(false);
        return;
      }

      // เช็คชื่อผู้ใช้/ชื่อร้าน/ไอดีไลน์ ห้ามซ้ำกับผู้ใช้คนอื่น ก่อนบันทึก
      const check = await profileApi.api.v1.profile.unique.post({
        username: nextUsername,
        shopName: shopName.trim(),
        lineId: lineId.trim(),
      });
      if (check.error || (check.data && !check.data.ok)) {
        const taken: string[] = [];
        if (check.data?.usernameTaken) taken.push("ชื่อผู้ใช้นี้");
        if (check.data?.shopNameTaken) taken.push("ชื่อร้านนี้");
        if (check.data?.lineIdTaken) taken.push("ไอดีไลน์นี้");
        toast.error("ข้อมูลซ้ำกับผู้ใช้อื่น", {
          id,
          description: taken.length
            ? `${taken.join(" และ ")}ถูกใช้ไปแล้ว กรุณาเปลี่ยนเป็นค่าอื่น`
            : "ไม่สามารถตรวจสอบความซ้ำได้ กรุณาลองใหม่",
        });
        setSavingInfo(false);
        return;
      }

      const res = await authClient.updateUser({
        name: nextUsername,
        username: nextUsername,
        displayUsername: nextUsername,
        phone,
        shopName,
        lineId,
      } as Parameters<typeof authClient.updateUser>[0]);
      if (res.error) {
        toast.error("บันทึกไม่สำเร็จ", {
          id,
          description: res.error.message ?? "เกิดข้อผิดพลาด",
        });
        setSavingInfo(false);
        return;
      }
      // เปลี่ยนชื่อผู้ใช้ → ย้ายสิทธิ์ส่วนลดพิเศษให้ตามชื่อใหม่อัตโนมัติ (ไม่บล็อกการบันทึกหลัก)
      if (
        previousUsername &&
        previousUsername.toLowerCase() !== nextUsername.toLowerCase()
      ) {
        try {
          await profileApi.api.v1.profile.unique["sync-discount"].post({
            previousUsername,
          });
        } catch {
          /* เงียบไว้ — สิทธิ์ส่วนลดยังแก้จากหลังบ้านได้ */
        }
      }

      toast.success("อัปเดตข้อมูลแล้ว", { id });
      setUsername(nextUsername);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในระบบ";
      toast.error("บันทึกไม่สำเร็จ", { id, description: msg });
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changingPassword) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.warning("กรอกข้อมูลให้ครบ");
      return;
    }
    if (newPassword.length < 8) {
      toast.warning("รหัสผ่านใหม่สั้นเกินไป", {
        description: "ต้องมีอย่างน้อย 8 ตัวอักษร",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning("รหัสผ่านยืนยันไม่ตรงกัน");
      return;
    }
    if (currentPassword === newPassword) {
      toast.warning("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม");
      return;
    }

    setChangingPassword(true);
    const id = toast.loading("กำลังเปลี่ยนรหัสผ่าน...");
    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (res.error) {
        toast.error("เปลี่ยนรหัสไม่สำเร็จ", {
          id,
          description:
            res.error.message ?? "รหัสผ่านเดิมอาจไม่ถูกต้อง",
        });
        setChangingPassword(false);
        return;
      }
      toast.success("เปลี่ยนรหัสผ่านสำเร็จ", {
        id,
        description: "เซสชันอื่นถูกออกจากระบบเพื่อความปลอดภัย",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในระบบ";
      toast.error("เปลี่ยนรหัสไม่สำเร็จ", { id, description: msg });
    } finally {
      setChangingPassword(false);
    }
  };

  // Logged-out gate
  if (!isPending && !user) {
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
        <main className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-md w-full bg-brand-surface border border-brand-green-100 rounded-3xl p-8 text-center shadow-xl ring-1 ring-brand-green/15">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-green-50 flex items-center justify-center mb-4">
              <Lock className="h-7 w-7 text-brand-green" />
            </div>
            <h2 className="font-display font-black text-xl text-brand-ink mb-2">
              ต้องเข้าสู่ระบบก่อน
            </h2>
            <p className="text-sm text-brand-ink-soft font-medium mb-5">
              กรุณาเข้าสู่ระบบเพื่อจัดการโปรไฟล์ของคุณ
            </p>
            <button
              onClick={() => {
                setAuthTab("login");
                setAuthOpen(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 cursor-pointer"
            >
              เข้าสู่ระบบ
            </button>
          </div>
        </main>
        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          initialTab={authTab}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-paper font-sans text-brand-ink flex flex-col">
      {copyFeedback && (
        <div className="fixed inset-x-4 top-4 z-[9999] pointer-events-none sm:left-auto sm:right-6 sm:top-6 sm:w-[340px]">
          <div
            role={copyFeedback.type === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl ring-1 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ${
              copyFeedback.type === "success"
                ? "border-brand-green bg-brand-surface-soft/95 text-brand-ink shadow-brand-green/25 ring-brand-green/25"
                : "border-rose-400 bg-brand-surface-soft/95 text-brand-ink shadow-rose-500/20 ring-rose-400/20"
            }`}
          >
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                copyFeedback.type === "success"
                  ? "bg-brand-green/15 text-brand-green"
                  : "bg-rose-500/15 text-rose-400"
              }`}
            >
              {copyFeedback.type === "success" ? (
                <CheckCircle className="h-4.5 w-4.5" />
              ) : (
                <AlertCircle className="h-4.5 w-4.5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black leading-5">{copyFeedback.title}</p>
              <p className="mt-0.5 truncate text-xs font-bold text-brand-ink-soft">
                {copyFeedback.description}
              </p>
            </div>
          </div>
        </div>
      )}
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

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 md:py-12 space-y-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-ink-soft hover:text-brand-green transition"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          กลับหน้าหลัก
        </Link>

        {/* Header */}
        <header className="space-y-2">
          <h1 className="font-display font-black text-3xl md:text-4xl text-brand-ink">
            แก้ไขโปรไฟล์
          </h1>
          <p className="text-sm text-brand-ink-soft font-medium">
            จัดการรูปโปรไฟล์ ข้อมูลส่วนตัว และรหัสผ่านของคุณ
          </p>
        </header>

        {/* ── Profile picture ── */}
        <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7 shadow-sm ring-1 ring-brand-green/10">
          <h2 className="font-display font-black text-lg text-brand-ink mb-1">
            รูปโปรไฟล์
          </h2>
          <p className="text-xs text-brand-ink-soft font-bold mb-5">
            อัปโหลดรูป (PNG, JPG · สูงสุด 2 MB) — แนะนำ 500×500 px
          </p>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative">
              <img
                src={currentAvatarSrc}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-28 h-28 rounded-full object-cover ring-4 ring-brand-green-100 shadow-lg shadow-brand-green/20"
              />
              <button
                type="button"
                onClick={handlePickAvatar}
                className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-br from-brand-green to-brand-green-600 text-white flex items-center justify-center shadow-lg shadow-brand-green/40 hover:scale-110 transition cursor-pointer"
                aria-label="เปลี่ยนรูป"
              >
                <Camera className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-display font-extrabold text-base text-brand-ink">
                  {displayName}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10.5px] font-black ${role.color}`}
                >
                  <RoleIcon className="h-3 w-3" strokeWidth={2.5} />
                  {role.label}
                </span>
              </div>
              <p className="text-[12px] text-brand-ink-soft font-bold mb-3">
                {user?.email}
              </p>

              {/* อัปเกรดเป็นตัวแทน — แสดงเฉพาะสมาชิกทั่วไป */}
              {userRole === "member" && (
                <a
                  href={config.agentLink.trim() || "#"}
                  target={config.agentLink.trim() ? "_blank" : undefined}
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mb-4 px-3.5 py-1.5 rounded-full text-[11.5px] font-extrabold text-brand-gold-deep bg-brand-gold/10 border border-brand-gold/30 hover:bg-brand-gold/20 hover:-translate-y-0.5 transition cursor-pointer"
                >
                  <Crown className="h-3.5 w-3.5" />
                  อัปเกรดเป็นตัวแทน
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePickAvatar}
                  disabled={avatarUploading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-extrabold bg-brand-green-50 text-brand-green border border-brand-green-100 hover:bg-brand-green-100 transition cursor-pointer disabled:opacity-60"
                >
                  <Upload className="h-3.5 w-3.5" />
                  เลือกรูปใหม่
                </button>
                {avatarPreview && (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveAvatar}
                      disabled={avatarUploading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-extrabold text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 transition cursor-pointer disabled:opacity-60"
                    >
                      {avatarUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      บันทึกรูป
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarPreview(null)}
                      disabled={avatarUploading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-extrabold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      ยกเลิก
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Account info ── */}
        <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7 shadow-sm ring-1 ring-brand-green/10">
          <h2 className="font-display font-black text-lg text-brand-ink mb-1">
            ข้อมูลบัญชี
          </h2>
          <p className="text-xs text-brand-ink-soft font-bold mb-5">
            อีเมลไม่สามารถเปลี่ยนแปลงได้ ชื่อผู้ใช้ เบอร์โทรศัพท์ ชื่อร้าน และไอดีไลน์สามารถอัปเดตและบันทึกข้อมูลได้ตามต้องการ
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-brand-green" />
                อีเมล
              </label>
              <input
                type="email"
                value={user?.email ?? ""}
                disabled
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
                <AtSign className="h-3.5 w-3.5 text-brand-green" />
                ชื่อผู้ใช้
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ชื่อผู้ใช้สำหรับเข้าสู่ระบบ"
                autoComplete="username"
                maxLength={30}
                className={inputCls}
              />
            </div>
            {userRole === "agent" && (
            <div>
              <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
                <AtSign className="h-3.5 w-3.5 text-brand-green" />
                UID ผู้ใช้งาน
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatDisplayID(user?.memberNo, user?.id)}
                  disabled
                  className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-3 pl-4 pr-11 text-sm font-semibold outline-none text-brand-ink-soft opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={handleCopyUid}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 text-brand-green hover:scale-110 transition cursor-pointer"
                  title="คัดลอก UID"
                >
                  <Copy className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
            )}
            <div>
              <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-brand-green" />
                เบอร์โทรศัพท์
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="ระบุเบอร์โทรศัพท์ของคุณ"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-brand-green" />
                ชื่อร้านปัจจุบัน
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="เช่น ร้านเติมเหรียญ ABC (สำหรับตัวแทน)"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-brand-green" />
                ไอดีไลน์ปัจจุบันที่ใช้เติม Coins
              </label>
              <input
                type="text"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                placeholder="เช่น @yourlineid (สำหรับตัวแทน)"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex justify-end mt-6 border-t border-brand-green-100/60 pt-4">
            <button
              type="button"
              onClick={handleSaveInfo}
              disabled={savingInfo}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-[13px] font-extrabold text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-60"
            >
              {savingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              บันทึกข้อมูลบัญชี
            </button>
          </div>
        </section>

        {/* ── Change password ── */}
        <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7 shadow-sm ring-1 ring-brand-green/10">
          <h2 className="font-display font-black text-lg text-brand-ink mb-1">
            เปลี่ยนรหัสผ่าน
          </h2>
          <p className="text-xs text-brand-ink-soft font-bold mb-5">
            ต้องระบุรหัสผ่านเดิมเพื่อยืนยันตัวตน — เซสชันอื่นจะถูกออกจากระบบหลังเปลี่ยนรหัส
          </p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <PasswordField
              label="รหัสผ่านเดิม"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showOld}
              onToggle={() => setShowOld(!showOld)}
              placeholder="กรอกรหัสผ่านปัจจุบัน"
            />
            <PasswordField
              label="รหัสผ่านใหม่"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggle={() => setShowNew(!showNew)}
              placeholder="อย่างน้อย 8 ตัวอักษร"
              helper="ใช้ตัวอักษรผสมตัวเลขเพื่อความปลอดภัย"
            />
            <PasswordField
              label="ยืนยันรหัสผ่านใหม่"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggle={() => setShowConfirm(!showConfirm)}
              placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
            />

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {changingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                เปลี่ยนรหัสผ่าน
              </button>
            </div>
          </form>
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

/* ── Reusable password field ── */

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <div>
      <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5 text-brand-green" />
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-3 pl-4 pr-11 text-sm font-semibold outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-1/2 right-3.5 -translate-y-1/2 text-brand-ink-soft hover:text-brand-green transition cursor-pointer"
          aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        >
          {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </div>
      {helper && (
        <p className="text-[10.5px] font-bold text-brand-ink-soft mt-1.5">
          {helper}
        </p>
      )}
    </div>
  );
}
