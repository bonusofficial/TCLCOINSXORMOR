"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  X,
  Save,
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
  Pencil,
  Star,
  Globe,
  Phone,
  MessageCircle,
  Link as LinkIcon,
  FileText,
  AlertTriangle,
  Sparkles,
  Loader2,
  ChevronUp,
  ChevronDown,
  Crown,
  Bell,
  Check,
  Ban,
  Clock,
  PanelBottom,
  Link2,
} from "lucide-react";
import { settingApi } from "@/lib/eden";
import { DEFAULT_HOW_IT_WORKS, parseHowItWorks, type HowItWorksStep, parseFooterLinks, DEFAULT_FOOTER_LINKS, DEFAULT_FOOTER_SERVICES, type FooterLink } from "@/lib/site-defaults";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
/* ─────────────────────────────────────────────
 * MOCK DATA — replace with API/Server-state later
 * ───────────────────────────────────────────── */

type TimeUnit = "hour" | "day" | "week" | "month" | "year";

const TIME_UNIT_LABEL: Record<TimeUnit, string> = {
  hour: "ชั่วโมง",
  day: "วัน",
  week: "สัปดาห์",
  month: "เดือน",
  year: "ปี",
};

type ReviewStatus = "pending" | "approved" | "rejected";

const REVIEW_STATUS_META: Record<
  ReviewStatus,
  { label: string; cls: string }
> = {
  pending: {
    label: "รออนุมัติ",
    cls: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  approved: {
    label: "แสดงอยู่",
    cls: "bg-brand-green-50 text-brand-green border-brand-green-100",
  },
  rejected: {
    label: "ไม่อนุมัติ",
    cls: "bg-rose-500/10 text-rose-500 border-rose-500/30",
  },
};

interface Review {
  id: number;
  status: ReviewStatus;
  avatar: string | null;
  name: string;
  detail: string;
  review: string;
  rating: number;
  timeValue: number;
  timeUnit: TimeUnit;
}

interface Banner {
  id: number;
  image: string;
  createdAt: string;
}

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

type UploadResponse =
  | {
      ok: true;
      url: string;
      fileName: string;
      size: number;
      contentType: string;
    }
  | {
      ok: false;
      message?: string;
    };

/* ─────────────────────────────────────────────
 * IMAGE UPLOAD HELPER
 * ───────────────────────────────────────────── */

function ImageUpload({
  value,
  onChange,
  label,
  helperText,
  className = "",
  aspect = "square",
}: {
  value: string | null;
  onChange: (src: string | null) => void;
  label?: string;
  helperText?: string;
  className?: string;
  aspect?: "square" | "wide";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > MAX_UPLOAD_SIZE) {
        toast.warning("ไฟล์ใหญ่เกินไป", {
          description: "อัปโหลดได้สูงสุด 5 MB",
        });
        return;
      }

      if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
        toast.warning("ชนิดไฟล์ไม่ถูกต้อง", {
          description: "รองรับเฉพาะ PNG, JPG, WebP หรือ GIF",
        });
        return;
      }

      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/v1/upload/settings-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const result = (await response
        .json()
        .catch(() => null)) as UploadResponse | null;

      if (!response.ok || !result?.ok) {
        const message =
          result && "message" in result && result.message
            ? result.message
            : "เกิดข้อผิดพลาดระหว่างอัปโหลดไฟล์";
        throw new Error(message);
      }

      onChange(result.url);
      toast.success("อัปโหลดรูปแล้ว", {
        description: file.name,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดระหว่างอัปโหลดไฟล์";
      toast.error("อัปโหลดไม่สำเร็จ", { description: message });
    } finally {
      setUploading(false);
      input.value = "";
    }
  };
  return (
    <div className={className}>
      {label && (
        <label className="block text-[12px] font-extrabold text-brand-ink mb-2">
          {label}
        </label>
      )}
      <div
        className={`group relative bg-brand-paper border-2 border-dashed border-brand-green-100 rounded-2xl overflow-hidden hover:border-brand-green transition cursor-pointer ${
          aspect === "wide" ? "aspect-[16/6]" : "aspect-square"
        }`}
        aria-busy={uploading}
        onClick={() => {
          if (!uploading) inputRef.current?.click();
        }}
      >
        {uploading && (
          <div className="absolute inset-0 z-20 bg-brand-surface-soft/85 backdrop-blur-sm flex flex-col items-center justify-center text-brand-ink">
            <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
            <p className="text-[11px] font-extrabold mt-2">กำลังอัปโหลด...</p>
          </div>
        )}
        {value ? (
          <>
            <img
              src={value}
              alt={label ?? "upload"}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <span className="bg-brand-surface-soft text-brand-ink px-3 py-1.5 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1.5">
                <Upload className="h-3 w-3" />
                เปลี่ยน
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                className="bg-rose-500/90 text-white px-3 py-1.5 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1.5 hover:bg-rose-500"
              >
                <Trash2 className="h-3 w-3" />
                ลบ
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-brand-ink-soft p-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-green-50 flex items-center justify-center mb-2 group-hover:bg-brand-green-100 transition">
              <ImageIcon className="h-5 w-5 text-brand-green" />
            </div>
            <p className="text-[12px] font-extrabold text-brand-ink">
              คลิกเพื่ออัปโหลด
            </p>
            <p className="text-[10px] font-bold mt-0.5 text-center">
              {helperText ?? "PNG, JPG, WebP, GIF · สูงสุด 5 MB"}
            </p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={uploading}
        onChange={onFile}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
 * REUSABLE FIELDS
 * ───────────────────────────────────────────── */

function Field({
  label,
  icon: Icon,
  required,
  helper,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-brand-green" />}
        {label}
        {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
      {helper && (
        <p className="text-[10.5px] font-bold text-brand-ink-soft mt-1.5">
          {helper}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60";

const textareaCls =
  "w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60 resize-none";

/* ─────────────────────────────────────────────
 * FooterLinkEditor — แก้รายการลิงก์ใน footer (label + url) เพิ่ม/ลบได้
 * ───────────────────────────────────────────── */
function FooterLinkEditor({
  title,
  links,
  setLinks,
}: {
  title: string;
  links: FooterLink[];
  setLinks: (l: FooterLink[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[12.5px] font-extrabold text-brand-ink inline-flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 text-brand-green" />
          {title}
        </label>
        <button
          type="button"
          onClick={() => setLinks([...links, { label: "", url: "" }])}
          className="text-[11px] font-extrabold text-brand-green hover:text-brand-green-600 inline-flex items-center gap-1 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> เพิ่มลิงก์
        </button>
      </div>
      <div className="space-y-2">
        {links.map((l, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              className={inputCls}
              placeholder="ชื่อลิงก์ที่แสดง"
              value={l.label}
              onChange={(e) =>
                setLinks(links.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
              }
            />
            <input
              className={inputCls}
              placeholder="/path หรือ https://..."
              value={l.url}
              onChange={(e) =>
                setLinks(links.map((x, idx) => (idx === i ? { ...x, url: e.target.value } : x)))
              }
            />
            <button
              type="button"
              onClick={() => setLinks(links.filter((_, idx) => idx !== i))}
              className="w-9 h-9 flex-shrink-0 rounded-lg bg-brand-surface border border-brand-green-100 hover:border-rose-400 hover:bg-rose-500/10 text-brand-ink-soft hover:text-rose-400 flex items-center justify-center transition cursor-pointer"
              aria-label="ลบ"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {links.length === 0 && (
          <p className="text-xs text-brand-ink-soft/60 font-bold py-1 select-none">
            ยังไม่มีลิงก์ — กด &quot;เพิ่มลิงก์&quot;
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * AVATAR UPLOAD BUTTON — ใช้ /api/v1/upload/settings-image
 * ───────────────────────────────────────────── */

function AvatarUploadButton({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > MAX_UPLOAD_SIZE) {
        toast.warning("ไฟล์ใหญ่เกินไป", { description: "สูงสุด 5 MB" });
        return;
      }
      if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
        toast.warning("ชนิดไฟล์ไม่ถูกต้อง", {
          description: "รองรับ PNG/JPG/WebP/GIF",
        });
        return;
      }

      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/v1/upload/settings-image", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const result = (await res.json().catch(() => null)) as UploadResponse | null;

      if (!res.ok || !result?.ok) {
        const msg =
          result && "message" in result && typeof result.message === "string"
            ? result.message
            : "อัปโหลดล้มเหลว";
        throw new Error(msg);
      }
      onChange(result.url);
      toast.success("อัปโหลดรูปแล้ว");
    } catch (err) {
      toast.error("อัปโหลดไม่สำเร็จ", {
        description: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
      });
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11.5px] font-extrabold bg-brand-green-50 text-brand-green border border-brand-green-100 hover:bg-brand-green-100 transition cursor-pointer disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {value ? "เปลี่ยนรูป" : "อัปโหลด"}
      </button>
      {value && !uploading && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11.5px] font-extrabold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/20 transition cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          ลบ
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={onFile}
        disabled={uploading}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
 * REVIEW EDIT DIALOG (inline)
 * ───────────────────────────────────────────── */

function ReviewEditor({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: Review | null;
  onSave: (r: Review) => void;
  onClose: () => void;
  saving?: boolean;
}) {
  const [avatar, setAvatar] = useState<string | null>(initial?.avatar ?? null);
  const [name, setName] = useState(initial?.name ?? "");
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [review, setReview] = useState(initial?.review ?? "");
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [timeValue, setTimeValue] = useState(initial?.timeValue ?? 1);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>(initial?.timeUnit ?? "day");

  const handleSave = () => {
    if (!name.trim() || !detail.trim() || !review.trim() || rating < 1) {
      toast.warning("กรอกข้อมูลให้ครบถ้วน", {
        description: "กรุณากรอก ชื่อลูกค้า, จำนวน Coins ที่เติม, คะแนนดาว และข้อความรีวิว ให้ครบทุกช่องก่อนบันทึก",
      });
      return;
    }
    onSave({
      id: initial?.id ?? 0,         // 0 = new, > 0 = update
      status: initial?.status ?? "approved",
      avatar,
      name: name.trim(),
      detail: detail.trim(),
      review: review.trim(),
      rating,
      timeValue,
      timeUnit,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-brand-surface-soft border border-brand-green-100 rounded-3xl p-6 shadow-2xl ring-1 ring-brand-green/20 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-black text-lg text-brand-ink">
            {initial ? "แก้ไขรีวิว" : "เพิ่มรีวิวใหม่"}
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-brand-surface border border-brand-green-100 flex items-center justify-center text-brand-ink-soft hover:text-brand-green transition cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Avatar — circle upload */}
          <Field label="รูปโปรไฟล์ลูกค้า (ไม่บังคับ)">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="avatar"
                    className="w-full h-full rounded-full object-cover ring-2 ring-brand-green shadow-md shadow-brand-green/20"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-brand-green to-brand-green-600 text-white font-display font-black text-2xl flex items-center justify-center ring-2 ring-brand-green-100 shadow-md">
                    {name.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <AvatarUploadButton
                  value={avatar}
                  onChange={setAvatar}
                />
                <p className="text-[10.5px] font-bold text-brand-ink-soft mt-1.5">
                  แนะนำสี่เหลี่ยมจัตุรัส 500×500 px · PNG/JPG/WebP/GIF
                </p>
              </div>
            </div>
          </Field>

          <Field label="ชื่อลูกค้า" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น คุณกิตติ ส."
              className={inputCls}
            />
          </Field>

          <Field label="จำนวน Coins ที่เติม" required>
            <input
              type="text"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="เช่น 3,300 Coins"
              className={inputCls}
            />
          </Field>

          <Field label="รายละเอียดรีวิว" required>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="ความคิดเห็นจากลูกค้า..."
              rows={4}
              className={textareaCls}
            />
          </Field>

          <Field label="คะแนน (ดาว)">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const filled = i < rating;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i + 1)}
                    className="p-1 hover:scale-110 transition cursor-pointer"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        filled
                          ? "fill-brand-gold text-brand-gold-deep"
                          : "fill-brand-surface text-brand-ink-soft/40"
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-sm font-extrabold text-brand-ink">
                {rating}.0
              </span>
            </div>
          </Field>

          <Field label="เวลาที่รีวิว">
            <div className="grid grid-cols-[1fr_1.5fr_auto] gap-2 items-center">
              <input
                type="number"
                min={1}
                value={timeValue}
                onChange={(e) =>
                  setTimeValue(Math.max(1, Number(e.target.value) || 1))
                }
                className={inputCls}
              />
              <select
                value={timeUnit}
                onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
                className={inputCls}
              >
                {(Object.keys(TIME_UNIT_LABEL) as TimeUnit[]).map((u) => (
                  <option key={u} value={u} className="bg-brand-surface text-brand-ink">
                    {TIME_UNIT_LABEL[u]}
                  </option>
                ))}
              </select>
              <span className="text-[12px] font-bold text-brand-ink-soft">
                ที่แล้ว
              </span>
            </div>
          </Field>
        </div>

        <div className="flex gap-2.5 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 rounded-xl font-extrabold text-sm bg-brand-surface border border-brand-green-100 text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green transition cursor-pointer disabled:opacity-60"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg transition cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "บันทึก" : "เพิ่มรีวิว"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * PAGE
 * ───────────────────────────────────────────── */

type SettingsTab = "general" | "aesthetics" | "reviews" | "notify" | "footer";

const TABS: Array<{
  key: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "general", label: "ทั่วไป", icon: Globe },
  { key: "aesthetics", label: "ความสวยงาม", icon: Sparkles },
  { key: "reviews", label: "รีวิว", icon: Star },
  { key: "notify", label: "แจ้งเตือน", icon: Bell },
  { key: "footer", label: "Footer", icon: PanelBottom },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // GENERAL TAB STATE
  const [logo, setLogo] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("TCLCOINSXORMOR");
  const [description, setDescription] = useState(
    "ระบบเติมเหรียญไลน์ที่รวดเร็ว ปลอดภัย เหรียญแท้ 100% บริการ 24/7"
  );
  const [keywords, setKeywords] = useState(
    "เติมเหรียญไลน์, LINE Coins, ตัวแทน LINE, เติม Coin ราคาถูก"
  );
  const [agentRegLink, setAgentRegLink] = useState(
    "https://tclcoinsxormor.com/agent/apply"
  );
  const [lineOA, setLineOA] = useState("https://line.me/R/ti/p/@tclcoinsxormor");
  const [phone, setPhone] = useState("02-123-4567");
  const [qrGeneral, setQrGeneral] = useState<string | null>(null);
  const [qrAgent, setQrAgent] = useState<string | null>(null);
  const [qrSupport, setQrSupport] = useState<string | null>(null);
  const [warning, setWarning] = useState(
    "ห้ามกดจองเล่น ๆ หากตรวจพบ ปรับ 50 บาท / 1 ครั้ง • กรุณาจองเฉพาะที่ต้องการเติมจริงเท่านั้น"
  );
  const [marqueeText, setMarqueeText] = useState("");
  const [agentPrivileges, setAgentPrivileges] = useState("");
  // เนื้อหาเว็บที่แก้ไขได้ (config ใหม่)
  const [lineGroupNormal, setLineGroupNormal] = useState("");
  const [lineGroupAgent, setLineGroupAgent] = useState("");
  const [reviewLink, setReviewLink] = useState("");
  const [welcomeTitle, setWelcomeTitle] = useState("");
  const [welcomeAgentDesc, setWelcomeAgentDesc] = useState("");
  const [welcomeMemberDesc, setWelcomeMemberDesc] = useState("");
  const [howItWorks, setHowItWorks] = useState<HowItWorksStep[]>(DEFAULT_HOW_IT_WORKS);
  const updateStep = (i: number, key: "title" | "desc", value: string) =>
    setHowItWorks((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));

  // ── Footer settings ──
  const [footerDescription, setFooterDescription] = useState("");
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>(DEFAULT_FOOTER_LINKS);
  const [footerServices, setFooterServices] = useState<FooterLink[]>(DEFAULT_FOOTER_SERVICES);
  const [footerLineUrl, setFooterLineUrl] = useState("");
  const [footerFacebook, setFooterFacebook] = useState("");
  const [footerCopyright, setFooterCopyright] = useState("");
  // หน้าเอกสาร (rich text)
  const [termsContent, setTermsContent] = useState("");
  const [privacyContent, setPrivacyContent] = useState("");
  // ประกาศแจ้งเตือน
  const [announceEnabled, setAnnounceEnabled] = useState(false);
  const [announceBanner, setAnnounceBanner] = useState("");
  const [announceBadge, setAnnounceBadge] = useState("");
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceContent, setAnnounceContent] = useState("");

  // AESTHETICS TAB STATE
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [deletingBannerId, setDeletingBannerId] = useState<number | null>(null);

  /* ── Load banners on mount ── */
  useEffect(() => {
    setBannerLoading(true);
    settingApi.banner.collection.api.v1.setting.banner
      .get()
      .then(({ data, error }) => {
        if (error || !data?.ok) return;
        setBanners(data.data);
      })
      .catch((err) => console.error("Load banners failed:", err))
      .finally(() => setBannerLoading(false));
  }, []);

  // REVIEWS TAB STATE
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);

  /* ── Load reviews on mount ── */
  useEffect(() => {
    setReviewsLoading(true);
    settingApi.review.collection.api.v1.setting.review
      .get()
      .then(({ data, error }) => {
        if (error || !data?.ok) return;
        setReviews(
          data.data.map((r) => ({
            id: r.id,
            status: (r.status ?? "approved") as ReviewStatus,
            avatar: r.avatar ?? null,
            name: r.name,
            detail: r.detail ?? "",
            review: r.review,
            rating: r.rating,
            timeValue: r.timeValue,
            timeUnit: r.timeUnit as TimeUnit,
          }))
        );
      })
      .catch((err) => console.error("Load reviews failed:", err))
      .finally(() => setReviewsLoading(false));
  }, []);

  /* ── Load existing config on mount (Eden GET) ── */
  useEffect(() => {
    settingApi.normal.api.v1.setting.normal
      .get()
      .then(({ data, error }) => {
        if (error || !data?.ok) return;
        const c = data.data;
        setLogo(c.logo || null);
        setSiteName(c.title);
        setDescription(c.description);
        setKeywords(c.keywords);
        setAgentRegLink(c.agentLink);
        setLineOA(c.contactLine);
        setPhone(c.phone);
        setQrGeneral(c.qrcodenormal || null);
        setQrAgent(c.qrcodeagent || null);
        setQrSupport(c.qrcodesupport || null);
        setWarning(c.warningMessage);
        setMarqueeText(c.marqueeText ?? "");
        setAgentPrivileges(c.agentPrivileges ?? "");
        setLineGroupNormal(c.lineGroupNormal ?? "");
        setLineGroupAgent(c.lineGroupAgent ?? "");
        setReviewLink(c.reviewLink ?? "");
        setWelcomeTitle(c.welcomeTitle ?? "");
        setWelcomeAgentDesc(c.welcomeAgentDesc ?? "");
        setWelcomeMemberDesc(c.welcomeMemberDesc ?? "");
        const parsedSteps = parseHowItWorks(c.howItWorks);
        setHowItWorks(parsedSteps.length ? parsedSteps : DEFAULT_HOW_IT_WORKS);
        setFooterDescription(c.footerDescription ?? "");
        const parsedFLinks = parseFooterLinks(c.footerLinks);
        setFooterLinks(parsedFLinks.length ? parsedFLinks : DEFAULT_FOOTER_LINKS);
        const parsedFServices = parseFooterLinks(c.footerServices);
        setFooterServices(parsedFServices.length ? parsedFServices : DEFAULT_FOOTER_SERVICES);
        setFooterLineUrl(c.footerLineUrl ?? "");
        setFooterFacebook(c.footerFacebook ?? "");
        setFooterCopyright(c.footerCopyright ?? "");
        setTermsContent(c.termsContent ?? "");
        setPrivacyContent(c.privacyContent ?? "");
        setAnnounceEnabled(c.announceEnabled ?? false);
        setAnnounceBanner(c.announceBanner ?? "");
        setAnnounceBadge(c.announceBadge ?? "");
        setAnnounceTitle(c.announceTitle ?? "");
        setAnnounceContent(c.announceContent ?? "");
      })
      .catch((err) => console.error("Load setting failed:", err));
  }, []);

  /* ── Save (Eden PUT) — type-safe end-to-end ── */
  const handleSaveGeneral = async () => {
    const id = toast.loading("กำลังบันทึก...");
    try {
      const { data, error } = await settingApi.normal.api.v1.setting.normal.put({
        logo: logo ?? "",
        title: siteName,
        description,
        keywords,
        agentLink: agentRegLink,
        contactLine: lineOA,
        phone,
        qrcodenormal: qrGeneral ?? "",
        qrcodeagent: qrAgent ?? "",
        qrcodesupport: qrSupport ?? "",
        warningMessage: warning,
        marqueeText,
        agentPrivileges: agentPrivileges,
        lineGroupNormal,
        lineGroupAgent,
        reviewLink,
        welcomeTitle,
        welcomeAgentDesc,
        welcomeMemberDesc,
        howItWorks,
        termsContent,
        privacyContent,
        announceEnabled,
        announceBanner,
        announceBadge,
        announceTitle,
        announceContent,
        footerDescription,
        footerLinks: footerLinks.filter((l) => l.label.trim() || l.url.trim()),
        footerServices: footerServices.filter((l) => l.label.trim() || l.url.trim()),
        footerLineUrl,
        footerFacebook,
        footerCopyright,
      });

      if (error) {
        toast.error("บันทึกไม่สำเร็จ", {
          id,
          description: error.value && typeof error.value === "object" && "message" in error.value
            ? String(error.value.message)
            : "เกิดข้อผิดพลาดในระบบ",
        });
        return;
      }

      toast.success(data.message, {
        id,
        description: `เว็บไซต์ "${data.data.title}" อัปเดตเรียบร้อย`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในระบบ";
      toast.error("บันทึกไม่สำเร็จ", { id, description: msg });
    }
  };

  const handleAddBanner = async (src: string | null) => {
    if (!src) return;
    const tId = toast.loading("กำลังบันทึก banner...");
    const { data, error } = await settingApi.banner.collection.api.v1.setting.banner.post({
      image: src,
    });
    if (error) {
      const value = error.value as { message?: string } | undefined;
      toast.error("เพิ่ม banner ไม่สำเร็จ", {
        id: tId,
        description: value?.message ?? `error ${error.status}`,
      });
      return;
    }
    setBanners((prev) => [...prev, data.data]);
    toast.success(data.message ?? "เพิ่ม banner แล้ว", { id: tId });
  };

  const handleDeleteBanner = async (id: number) => {
    if (!confirm("ลบ banner นี้?")) return;
    setDeletingBannerId(id);
    const tId = toast.loading("กำลังลบ...");
    const { data, error } = await settingApi.banner.item.api.v1.setting
      .banner({ id: String(id) })
      .delete();
    setDeletingBannerId(null);
    if (error) {
      const value = error.value as { message?: string } | undefined;
      toast.error("ลบไม่สำเร็จ", { id: tId, description: value?.message });
      return;
    }
    setBanners((prev) => prev.filter((b) => b.id !== id));
    toast.success(data.message ?? "ลบแล้ว", { id: tId });
  };

  const handleSortBanners = async (newBanners: Banner[]) => {
    setBanners(newBanners);
    const tId = toast.loading("กำลังอัปเดตลำดับเรียง...");
    const ids = newBanners.map((b) => b.id);
    const { data, error } = await settingApi.banner.collection.api.v1.setting.banner.sort.put({
      ids,
    });
    if (error) {
      toast.error("บันทึกลำดับไม่สำเร็จ", { id: tId });
    } else {
      toast.success(data.message ?? "อัปเดตลำดับเรียบร้อย", { id: tId });
    }
  };

  const moveBannerUp = (index: number) => {
    if (index === 0) return;
    const nextBanners = [...banners];
    const temp = nextBanners[index];
    nextBanners[index] = nextBanners[index - 1];
    nextBanners[index - 1] = temp;
    handleSortBanners(nextBanners);
  };

  const moveBannerDown = (index: number) => {
    if (index === banners.length - 1) return;
    const nextBanners = [...banners];
    const temp = nextBanners[index];
    nextBanners[index] = nextBanners[index + 1];
    nextBanners[index + 1] = temp;
    handleSortBanners(nextBanners);
  };

  const handleSaveReview = async (r: Review) => {
    setSavingReview(true);
    const tId = toast.loading(r.id ? "กำลังบันทึก..." : "กำลังเพิ่มรีวิว...");

    const payload = {
      avatar: r.avatar,
      name: r.name,
      detail: r.detail || undefined,
      review: r.review,
      rating: r.rating,
      timeValue: r.timeValue,
      timeUnit: r.timeUnit,
      status: r.status,
    };

    const res = r.id
      ? await settingApi.review.item.api.v1.setting
          .review({ id: String(r.id) })
          .patch(payload)
      : await settingApi.review.collection.api.v1.setting.review.post(payload);

    setSavingReview(false);

    if (res.error) {
      const value = res.error.value as { message?: string } | undefined;
      toast.error("บันทึกไม่สำเร็จ", {
        id: tId,
        description: value?.message ?? `error ${res.error.status}`,
      });
      return;
    }

    const saved = res.data.data;
    const mapped: Review = {
      id: saved.id,
      status: ((saved as { status?: string }).status ?? "approved") as ReviewStatus,
      avatar: saved.avatar ?? null,
      name: saved.name,
      detail: saved.detail ?? "",
      review: saved.review,
      rating: saved.rating,
      timeValue: saved.timeValue,
      timeUnit: saved.timeUnit as TimeUnit,
    };

    setReviews((prev) =>
      r.id
        ? prev.map((x) => (x.id === r.id ? mapped : x))
        : [mapped, ...prev]
    );
    toast.success(res.data.message ?? "สำเร็จ", { id: tId });
    setReviewDialogOpen(false);
    setEditingReview(null);
  };

  const handleDeleteReview = async (id: number) => {
    if (!confirm("ลบรีวิวนี้?")) return;
    setDeletingReviewId(id);
    const tId = toast.loading("กำลังลบ...");
    const { data, error } = await settingApi.review.item.api.v1.setting
      .review({ id: String(id) })
      .delete();
    setDeletingReviewId(null);
    if (error) {
      const value = error.value as { message?: string } | undefined;
      toast.error("ลบไม่สำเร็จ", { id: tId, description: value?.message });
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== id));
    toast.success(data.message ?? "ลบแล้ว", { id: tId });
  };

  /* ── อนุมัติ / ไม่อนุมัติ รีวิว ── */
  const handleSetReviewStatus = async (r: Review, status: ReviewStatus) => {
    const tId = toast.loading("กำลังอัปเดตสถานะ...");
    const res = await settingApi.review.item.api.v1.setting
      .review({ id: String(r.id) })
      .patch({
        avatar: r.avatar,
        name: r.name,
        detail: r.detail || undefined,
        review: r.review,
        rating: r.rating,
        timeValue: r.timeValue,
        timeUnit: r.timeUnit,
        status,
      });
    if (res.error) {
      const value = res.error.value as { message?: string } | undefined;
      toast.error("อัปเดตไม่สำเร็จ", { id: tId, description: value?.message });
      return;
    }
    setReviews((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, status } : x))
    );
    toast.success(
      status === "approved" ? "อนุมัติรีวิวแล้ว — แสดงบนหน้าเว็บ" : "ปฏิเสธรีวิวแล้ว",
      { id: tId }
    );
  };

  return (
    <>
      <main className="flex-1 px-6 lg:px-8 py-7 max-w-[1200px] w-full mx-auto">

          {/* Sticky Header Bar for Tab Switcher and Actions */}
          <div className="sticky top-[72px] -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 bg-brand-paper/90 backdrop-blur-md border-b border-brand-green-100/60 z-20 mb-7 flex flex-wrap items-center justify-between gap-4 transition-all duration-200 rounded-b-2xl">
            {/* Tab Switcher */}
            <div className="bg-brand-surface-soft border border-brand-green-100 rounded-2xl p-1.5 inline-flex gap-1 flex-wrap">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={`px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all duration-200 inline-flex items-center gap-2 cursor-pointer ${
                      active
                        ? "bg-brand-green text-white shadow-md shadow-brand-green/30"
                        : "text-brand-ink-soft hover:text-brand-green hover:bg-brand-green-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Sticky Actions */}
            {activeTab === "general" && (
              <button
                onClick={handleSaveGeneral}
                className="px-6 py-2.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer inline-flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                บันทึกข้อมูล
              </button>
            )}

            {activeTab === "reviews" && (
              <button
                onClick={() => {
                  setEditingReview(null);
                  setReviewDialogOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                เพิ่มรีวิว
              </button>
            )}
          </div>

          {/* ═══ Tab 1: GENERAL ═══ */}
          {activeTab === "general" && (
            <div className="space-y-6">

              {/* Brand & Identity */}
              <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7">
                <header className="mb-5">
                  <h2 className="font-display font-black text-lg text-brand-ink">
                    แบรนด์ & ตัวตน
                  </h2>
                  <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                    ข้อมูลหลักที่จะแสดงทั่วทั้งเว็บและ SEO
                  </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 items-start">
                  <ImageUpload
                    value={logo}
                    onChange={setLogo}
                    label="โลโก้เว็บไซต์"
                    helperText="แนะนำ 500×500 px"
                  />
                  <div className="space-y-4">
                    <Field label="ชื่อเว็บไซต์" required icon={Globe}>
                      <input
                        type="text"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <Field
                      label="คำอธิบาย"
                      icon={FileText}
                      helper="ใช้สำหรับ meta description (แนะนำ 120–160 ตัวอักษร)"
                    >
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={textareaCls}
                      />
                    </Field>
                    <Field
                      label="Keywords"
                      helper="คั่นด้วยเครื่องหมายจุลภาค (,) เช่น เติมเหรียญไลน์, LINE Coins"
                    >
                      <input
                        type="text"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </div>
              </section>

              {/* Contact & Links */}
              <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7">
                <header className="mb-5">
                  <h2 className="font-display font-black text-lg text-brand-ink">
                    ลิงก์ & ช่องทางติดต่อ
                  </h2>
                  <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                    URLs และข้อมูลติดต่อที่แสดงในเว็บ
                  </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="ลิงก์สมัครตัวแทน" icon={LinkIcon}>
                    <input
                      type="url"
                      value={agentRegLink}
                      onChange={(e) => setAgentRegLink(e.target.value)}
                      placeholder="https://..."
                      className={inputCls}
                    />
                  </Field>
                  <Field label="ลิงก์ติดต่อ (LINE OA)" icon={MessageCircle}>
                    <input
                      type="url"
                      value={lineOA}
                      onChange={(e) => setLineOA(e.target.value)}
                      placeholder="https://line.me/R/ti/p/@..."
                      className={inputCls}
                    />
                  </Field>
                  <Field label="เบอร์โทรศัพท์" icon={Phone}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </section>

              {/* QR Codes */}
              <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7">
                <header className="mb-5">
                  <h2 className="font-display font-black text-lg text-brand-ink">
                    QR Code ทั้งหมด
                  </h2>
                  <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                    อัปโหลด QR สำหรับแต่ละกลุ่ม (รูป PNG/JPG/WebP/GIF, สี่เหลี่ยมจัตุรัส)
                  </p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <ImageUpload
                    value={qrGeneral}
                    onChange={setQrGeneral}
                    label="QR กลุ่มทั่วไป"
                  />
                  <ImageUpload
                    value={qrAgent}
                    onChange={setQrAgent}
                    label="QR กลุ่มตัวแทน"
                  />
                  <ImageUpload
                    value={qrSupport}
                    onChange={setQrSupport}
                    label="QR ติดต่อ Support"
                  />
                </div>
              </section>

              {/* Warning */}
              <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7">
                <header className="mb-5">
                  <h2 className="font-display font-black text-lg text-brand-ink inline-flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    คำเตือนหน้าแรก
                  </h2>
                  <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                    ข้อความที่จะวิ่งในแถบเตือนด้านบนของเว็บ
                  </p>
                </header>
                <textarea
                  rows={3}
                  value={warning}
                  onChange={(e) => setWarning(e.target.value)}
                  className={textareaCls}
                  placeholder="พิมพ์ข้อความเตือน..."
                />
              </section>

              {/* Marquee text (ข้อความวิ่ง) */}
              <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7">
                <header className="mb-5">
                  <h2 className="font-display font-black text-lg text-brand-ink inline-flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-brand-green" />
                    ข้อความวิ่ง (Marquee)
                  </h2>
                  <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                    ข้อความวิ่งแนวนอนในหน้าประวัติการสั่งซื้อ · เว้นว่าง = ไม่แสดง
                  </p>
                </header>
                <input
                  type="text"
                  value={marqueeText}
                  onChange={(e) => setMarqueeText(e.target.value)}
                  className={inputCls}
                  placeholder="เช่น 🔥 โปรโมชั่นพิเศษวันนี้! เติม 10,000 Coins รับส่วนลดทันที"
                />
              </section>

              {/* Agent Privileges */}
              <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7">
                <header className="mb-5">
                  <h2 className="font-display font-black text-lg text-brand-ink inline-flex items-center gap-2">
                    <Crown className="h-5 w-5 text-brand-gold" />
                    สิทธิพิเศษตัวแทน (Agent Privileges)
                  </h2>
                  <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                    รายละเอียดสิทธิพิเศษ/ราคาพิเศษที่ตัวแทนจำหน่ายจะได้รับเมื่อใช้บริการ
                  </p>
                </header>
                <textarea
                  rows={6}
                  value={agentPrivileges}
                  onChange={(e) => setAgentPrivileges(e.target.value)}
                  className={textareaCls}
                  placeholder="พิมพ์รายละเอียดสิทธิพิเศษของตัวแทนจำหน่าย..."
                />
              </section>

              {/* เนื้อหาเว็บไซต์ (แก้ไขได้) — LINE group, หน้าสมัคร, ขั้นตอนการใช้งาน */}
              <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7 space-y-6">
                <header>
                  <h2 className="font-display font-black text-lg text-brand-ink">
                    เนื้อหาเว็บไซต์ (แก้ไขได้)
                  </h2>
                  <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                    ลิงก์กลุ่ม LINE · ข้อความหน้าสมัคร · ขั้นตอนการใช้งาน
                  </p>
                </header>

                {/* LINE group links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="ลิงก์เข้ากลุ่ม LINE — ลูกค้าทั่วไป" helper='ปุ่ม "กดเพื่อเข้ากลุ่ม LINE" ใต้ QR (แท็บทั่วไป)'>
                    <input
                      type="text"
                      value={lineGroupNormal}
                      onChange={(e) => setLineGroupNormal(e.target.value)}
                      placeholder="https://line.me/ti/g/..."
                      className={inputCls}
                    />
                  </Field>
                  <Field label="ลิงก์เข้ากลุ่ม LINE — ตัวแทน" helper='ปุ่ม "กดเพื่อเข้ากลุ่ม LINE" ใต้ QR (แท็บตัวแทน)'>
                    <input
                      type="text"
                      value={lineGroupAgent}
                      onChange={(e) => setLineGroupAgent(e.target.value)}
                      placeholder="https://line.me/ti/g/..."
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Review link (ปุ่ม "ดูรีวิวลูกค้า" แถบ trust หน้าแรก) */}
                <Field label="ลิงก์ดูรีวิวลูกค้า" helper='ปุ่ม "ดูรีวิวลูกค้า →" ในแถบ trust หน้าแรก (เว้นว่าง = ใช้ LINE OA)'>
                  <input
                    type="text"
                    value={reviewLink}
                    onChange={(e) => setReviewLink(e.target.value)}
                    placeholder="https://... (ลิงก์รวมรีวิวทั้งหมด)"
                    className={inputCls}
                  />
                </Field>

                {/* Welcome panel (หน้าสมัคร) */}
                <Field label="หัวข้อหน้าสมัคร (Welcome)" helper="แสดงในกล่องสมัครสมาชิก (เว้นว่าง = ใช้ค่าเริ่มต้น)">
                  <input
                    type="text"
                    value={welcomeTitle}
                    onChange={(e) => setWelcomeTitle(e.target.value)}
                    placeholder="ยินดีต้อนรับสู่ครอบครัว TCLCOINSXORMOR"
                    className={inputCls}
                  />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="คำอธิบายบทบาทตัวแทน">
                    <textarea
                      rows={3}
                      value={welcomeAgentDesc}
                      onChange={(e) => setWelcomeAgentDesc(e.target.value)}
                      placeholder="ตัวแทนจำหน่าย: รับเรท VIP ส่วนลดพิเศษทุกออเดอร์..."
                      className={textareaCls}
                    />
                  </Field>
                  <Field label="คำอธิบายบทบาทลูกค้าทั่วไป">
                    <textarea
                      rows={3}
                      value={welcomeMemberDesc}
                      onChange={(e) => setWelcomeMemberDesc(e.target.value)}
                      placeholder="ลูกค้าทั่วไป: เติมเหรียญง่าย ปลอดภัย รวดเร็ว..."
                      className={textareaCls}
                    />
                  </Field>
                </div>

                {/* How it works steps */}
                <div>
                  <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">
                    ขั้นตอนการใช้งาน (4 ขั้นตอน)
                  </label>
                  <div className="space-y-3">
                    {howItWorks.map((step, i) => (
                      <div key={i} className="bg-brand-paper border border-brand-green-100 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-brand-green-100 text-brand-green font-black text-xs flex items-center justify-center flex-shrink-0">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => updateStep(i, "title", e.target.value)}
                            placeholder={`หัวข้อขั้นตอนที่ ${i + 1}`}
                            className={inputCls}
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={step.desc}
                          onChange={(e) => updateStep(i, "desc", e.target.value)}
                          placeholder="รายละเอียดขั้นตอน"
                          className={textareaCls}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* เอกสารทางกฎหมาย — ข้อกำหนด & นโยบาย (rich text) */}
              <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7 space-y-6">
                <header>
                  <h2 className="font-display font-black text-lg text-brand-ink">
                    เอกสารทางกฎหมาย
                  </h2>
                  <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                    จัดการเนื้อหา ข้อกำหนดเงื่อนไขการใช้บริการ และนโยบายความเป็นส่วนตัว (แสดงที่หน้า /terms และ /privacy)
                  </p>
                </header>

                <div>
                  <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">
                    ข้อกำหนดเงื่อนไขการใช้บริการ
                  </label>
                  <RichTextEditor
                    value={termsContent}
                    onChange={setTermsContent}
                    placeholder="พิมพ์ข้อกำหนดเงื่อนไขการใช้บริการ..."
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">
                    นโยบายความเป็นส่วนตัว
                  </label>
                  <RichTextEditor
                    value={privacyContent}
                    onChange={setPrivacyContent}
                    placeholder="พิมพ์นโยบายความเป็นส่วนตัว..."
                  />
                </div>
              </section>
            </div>
          )}

          {/* ═══ Tab 2: AESTHETICS ═══ */}
          {activeTab === "aesthetics" && (
            <div className="space-y-6">
              <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7">
                <header className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display font-black text-lg text-brand-ink">
                      Banner & รูปประกอบ
                    </h2>
                    <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                      อัปโหลด banner ที่จะหมุนใน hero — แนะนำ 1920×720 px
                    </p>
                  </div>
                  <span className="text-[11px] font-extrabold bg-brand-green-50 text-brand-green border border-brand-green-100 py-1 px-2.5 rounded-full">
                    {banners.length} รูป
                  </span>
                </header>

                {/* Upload area */}
                <ImageUpload
                  value={null}
                  onChange={handleAddBanner}
                  aspect="wide"
                  helperText="คลิกเพื่ออัปโหลด banner ใหม่ (ขนาดแนะนำ 1920×720)"
                />

                {/* Banner list */}
                {bannerLoading ? (
                  <div className="mt-6 flex items-center justify-center py-10 text-brand-ink-soft">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span className="font-bold text-sm">กำลังโหลด banner...</span>
                  </div>
                ) : banners.length > 0 ? (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {banners.map((b, i) => (
                      <div
                        key={b.id}
                        className="relative group rounded-2xl overflow-hidden border border-brand-green-100 bg-brand-paper aspect-[16/6]"
                      >
                        <img
                          src={b.image}
                          alt={`Banner ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-brand-surface-soft/95 backdrop-blur text-brand-ink text-[10px] font-black py-1 px-2 rounded">
                          #{i + 1}
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1.5 transition">
                          {i > 0 && (
                            <button
                              onClick={() => moveBannerUp(i)}
                              className="w-8 h-8 rounded-full bg-brand-surface-soft/95 hover:bg-brand-green hover:text-white text-brand-ink flex items-center justify-center shadow-md cursor-pointer transition"
                              title="เลื่อนขึ้น"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                          )}
                          {i < banners.length - 1 && (
                            <button
                              onClick={() => moveBannerDown(i)}
                              className="w-8 h-8 rounded-full bg-brand-surface-soft/95 hover:bg-brand-green hover:text-white text-brand-ink flex items-center justify-center shadow-md cursor-pointer transition"
                              title="เลื่อนลง"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBanner(b.id)}
                            disabled={deletingBannerId === b.id}
                            className="w-8 h-8 rounded-full bg-rose-500/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-md cursor-pointer disabled:opacity-60 transition"
                            title="ลบ"
                          >
                            {deletingBannerId === b.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            </div>
          )}

          {/* ═══ Tab 3: REVIEWS ═══ */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7">
                <header className="mb-5 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-display font-black text-lg text-brand-ink">
                      จัดการรีวิวลูกค้า
                    </h2>
                    <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                      อนุมัติรีวิวจากลูกค้า · เพิ่ม/แก้ไข/ลบ — เฉพาะที่ &quot;แสดงอยู่&quot; เท่านั้นที่ขึ้นหน้าเว็บ
                    </p>
                  </div>
                </header>

                <div className="space-y-3">
                  {reviewsLoading ? (
                    <div className="flex items-center justify-center py-10 text-brand-ink-soft">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span className="font-bold text-sm">กำลังโหลดรีวิว...</span>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-10 text-brand-ink-soft text-sm font-bold">
                      ยังไม่มีรีวิว — กด &quot;เพิ่มรีวิว&quot; เพื่อเริ่มต้น
                    </div>
                  ) : null}
                  {!reviewsLoading && reviews.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-start gap-4 p-4 rounded-2xl border border-brand-green-100 bg-brand-paper hover:border-brand-green hover:bg-brand-surface-soft transition group"
                    >
                      {/* Avatar thumbnail */}
                      <div className="w-12 h-12 flex-shrink-0">
                        {r.avatar ? (
                          <img
                            src={r.avatar}
                            alt={r.name}
                            className="w-full h-full rounded-full object-cover ring-2 ring-brand-green-100"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-brand-green to-brand-green-600 text-white font-display font-black text-base flex items-center justify-center ring-2 ring-brand-green-100">
                            {r.name.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-display font-extrabold text-sm text-brand-ink">
                            {r.name}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${REVIEW_STATUS_META[r.status].cls}`}
                          >
                            {r.status === "pending" && <Clock className="h-2.5 w-2.5" />}
                            {r.status === "approved" && <Check className="h-2.5 w-2.5" />}
                            {r.status === "rejected" && <Ban className="h-2.5 w-2.5" />}
                            {REVIEW_STATUS_META[r.status].label}
                          </span>
                          {r.detail && (
                            <span className="text-[11px] font-bold text-brand-ink-soft bg-brand-surface px-2 py-0.5 rounded-full border border-brand-green-100/60">
                              {r.detail}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < r.rating
                                  ? "fill-brand-gold text-brand-gold-deep"
                                  : "fill-brand-surface text-brand-ink-soft/40"
                              }`}
                              strokeWidth={1.5}
                            />
                          ))}
                          <span className="ml-1 text-[10px] font-bold text-brand-ink-soft">
                            · {r.timeValue} {TIME_UNIT_LABEL[r.timeUnit]}ที่แล้ว
                          </span>
                        </div>
                        <p className="text-[12.5px] text-brand-ink-soft leading-relaxed line-clamp-2">
                          &quot;{r.review}&quot;
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition">
                        {r.status !== "approved" && (
                          <button
                            onClick={() => handleSetReviewStatus(r, "approved")}
                            className="w-8 h-8 rounded-lg bg-brand-green-50 border border-brand-green-100 hover:bg-brand-green hover:text-white text-brand-green flex items-center justify-center transition cursor-pointer"
                            aria-label="อนุมัติ"
                            title="อนุมัติ (แสดงบนเว็บ)"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {r.status !== "rejected" && (
                          <button
                            onClick={() => handleSetReviewStatus(r, "rejected")}
                            className="w-8 h-8 rounded-lg bg-brand-surface border border-brand-green-100 hover:border-amber-400 hover:bg-amber-500/10 text-brand-ink-soft hover:text-amber-500 flex items-center justify-center transition cursor-pointer"
                            aria-label="ไม่อนุมัติ"
                            title="ไม่อนุมัติ (ซ่อนจากเว็บ)"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingReview(r);
                            setReviewDialogOpen(true);
                          }}
                          className="w-8 h-8 rounded-lg bg-brand-surface border border-brand-green-100 hover:border-brand-green hover:bg-brand-green-50 text-brand-ink-soft hover:text-brand-green flex items-center justify-center transition cursor-pointer"
                          aria-label="แก้ไข"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReview(r.id)}
                          disabled={deletingReviewId === r.id}
                          className="w-8 h-8 rounded-lg bg-brand-surface border border-brand-green-100 hover:border-rose-400 hover:bg-rose-500/10 text-brand-ink-soft hover:text-rose-400 flex items-center justify-center transition cursor-pointer disabled:opacity-60"
                          aria-label="ลบ"
                        >
                          {deletingReviewId === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ═══ Tab 4: NOTIFY (ประกาศแจ้งเตือน) ═══ */}
          {activeTab === "notify" && (
            <div className="space-y-6">
              <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7 space-y-6">
                <header className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display font-black text-lg text-brand-ink inline-flex items-center gap-2">
                      <Bell className="h-5 w-5 text-brand-gold" />
                      ประกาศแจ้งเตือน
                    </h2>
                    <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                      แสดงเป็น popup กลางจอ + ที่กระดิ่งมุมขวาบนในหน้าแรก · กด &ldquo;รับทราบ&rdquo; จะซ่อน 1 วัน
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnnounceEnabled((v) => !v)}
                    aria-pressed={announceEnabled}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition cursor-pointer ${
                      announceEnabled ? "bg-brand-green" : "bg-brand-green-100"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        announceEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </header>

                <ImageUpload
                  label="รูป Banner ประกาศ"
                  value={announceBanner || null}
                  onChange={(url) => setAnnounceBanner(url ?? "")}
                  aspect="wide"
                  helperText="แนะนำแนวนอน (เช่น 1200×675px) · PNG/JPG ≤ 5 MB"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="ป้าย Badge" helper='เช่น "ประกาศสำคัญ"'>
                    <input
                      type="text"
                      value={announceBadge}
                      onChange={(e) => setAnnounceBadge(e.target.value)}
                      placeholder="ประกาศสำคัญ"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="หัวข้อประกาศ">
                    <input
                      type="text"
                      value={announceTitle}
                      onChange={(e) => setAnnounceTitle(e.target.value)}
                      placeholder="เช่น วิธีสมัครตัวแทน ORMOR TOPUP COINS"
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div>
                  <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">
                    รายละเอียด
                  </label>
                  <RichTextEditor
                    value={announceContent}
                    onChange={setAnnounceContent}
                    placeholder="พิมพ์รายละเอียดประกาศ..."
                  />
                </div>
              </section>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveGeneral}
                  className="px-7 py-3 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-lg shadow-brand-green/30 hover:shadow-xl hover:-translate-y-0.5 transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  บันทึกประกาศ
                </button>
              </div>
            </div>
          )}

          {activeTab === "footer" && (
            <div className="space-y-6">
              <section className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7">
                <header className="mb-5">
                  <h2 className="font-display font-black text-lg text-brand-ink">
                    ตั้งค่า Footer
                  </h2>
                  <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                    จัดการเนื้อหาและลิงก์ส่วนท้ายเว็บ — มีผลกับทุกหน้า (ยกเว้น /dashboard)
                  </p>
                </header>

                <div className="space-y-5">
                  <Field
                    label="คำอธิบายใต้แบรนด์"
                    icon={FileText}
                    helper="ข้อความสั้น ๆ ใต้โลโก้ใน footer (เว้นว่าง = ใช้คำอธิบายเว็บไซต์)"
                  >
                    <textarea
                      rows={3}
                      className={textareaCls}
                      value={footerDescription}
                      onChange={(e) => setFooterDescription(e.target.value)}
                      placeholder="ระบบรับจองคิวและเติมเงินเหรียญแท้ 100%..."
                    />
                  </Field>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FooterLinkEditor
                      title="ลิงก์แนะนำ"
                      links={footerLinks}
                      setLinks={setFooterLinks}
                    />
                    <FooterLinkEditor
                      title="การบริการ"
                      links={footerServices}
                      setLinks={setFooterServices}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="ลิงก์ LINE" icon={MessageCircle} helper="ไอคอน LINE ใน footer (เว้นว่าง = ใช้ลิงก์ติดต่อ)">
                      <input
                        type="url"
                        className={inputCls}
                        value={footerLineUrl}
                        onChange={(e) => setFooterLineUrl(e.target.value)}
                        placeholder="https://line.me/R/ti/p/@..."
                      />
                    </Field>
                    <Field label="ลิงก์ Facebook" icon={LinkIcon} helper="เว้นว่าง = ซ่อนไอคอน Facebook">
                      <input
                        type="url"
                        className={inputCls}
                        value={footerFacebook}
                        onChange={(e) => setFooterFacebook(e.target.value)}
                        placeholder="https://facebook.com/..."
                      />
                    </Field>
                  </div>

                  <Field
                    label="ข้อความลิขสิทธิ์ (Copyright)"
                    icon={FileText}
                    helper="ข้อความบรรทัดล่างสุด (เว้นว่าง = ใช้ค่าเริ่มต้น © ปี + ชื่อเว็บ)"
                  >
                    <input
                      type="text"
                      className={inputCls}
                      value={footerCopyright}
                      onChange={(e) => setFooterCopyright(e.target.value)}
                      placeholder="© 2026 TCLCOINSXORMOR TOPUP COINS..."
                    />
                  </Field>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveGeneral}
                      className="px-7 py-3 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-lg shadow-brand-green/30 hover:shadow-xl hover:-translate-y-0.5 transition cursor-pointer inline-flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      บันทึก Footer
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

        <div className="h-6" />
      </main>

      {/* Review Editor Modal */}
      {reviewDialogOpen && (
        <ReviewEditor
          initial={editingReview}
          onSave={handleSaveReview}
          onClose={() => {
            setReviewDialogOpen(false);
            setEditingReview(null);
          }}
          saving={savingReview}
        />
      )}
    </>
  );
}
