"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession, signOut } from "@/lib/auth-client";
import {
  ChevronLeft,
  Star,
  Lock,
  Loader2,
  Send,
  Clock,
  CheckCircle,
  Ban,
  MessageSquareQuote,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import { publicApi } from "@/lib/eden";

type UserRole = "member" | "agent" | "admin";

function resolveUserRole(user?: {
  role?: string | null;
  email?: string | null;
} | null): UserRole {
  const dbRole = (user?.role ?? "").toLowerCase().trim();
  if (dbRole === "admin" || dbRole === "agent" || dbRole === "member") {
    return dbRole as UserRole;
  }
  return "member";
}

type ReviewStatus = "pending" | "approved" | "rejected";

interface MyReview {
  id: number;
  status: ReviewStatus;
  avatar: string | null;
  name: string;
  detail: string | null;
  review: string;
  rating: number;
  createdAt: string;
}

const STATUS_META: Record<
  ReviewStatus,
  { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: "รอแอดมินอนุมัติ",
    cls: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    icon: Clock,
  },
  approved: {
    label: "แสดงบนเว็บแล้ว",
    cls: "bg-brand-green-50 text-brand-green border-brand-green-100",
    icon: CheckCircle,
  },
  rejected: {
    label: "ไม่ผ่านการอนุมัติ",
    cls: "bg-rose-500/10 text-rose-500 border-rose-500/30",
    icon: Ban,
  },
};

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
function formatThaiDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export default function MyReviewsPage() {
  const { data: session, isPending } = useSession();
  const user = session?.user as
    | { id?: string; role?: string | null; email?: string | null }
    | undefined;
  const isLoggedIn = !!user;

  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  // Form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // My reviews list
  const [myReviews, setMyReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMine = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } =
        await publicApi.reviewsMine.api.v0.reviews.mine.get();
      if (!error && data?.ok) {
        setMyReviews(data.data as MyReview[]);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    loadMine();
  }, [isLoggedIn, loadMine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) {
      toast.warning("กรุณาเขียนรีวิวก่อนส่ง");
      return;
    }
    setSubmitting(true);
    const tId = toast.loading("กำลังส่งรีวิว...");
    try {
      const { error } = await publicApi.reviews.api.v0.reviews.post({
        rating,
        review: reviewText.trim(),
        detail: detail.trim() || undefined,
      });
      if (error) {
        const v = error.value as { message?: string } | undefined;
        toast.error("ส่งรีวิวไม่สำเร็จ", { id: tId, description: v?.message });
        return;
      }
      toast.success("ส่งรีวิวเรียบร้อย!", {
        id: tId,
        description: "รอแอดมินอนุมัติก่อนแสดงบนหน้าเว็บ",
      });
      setReviewText("");
      setDetail("");
      setRating(5);
      loadMine();
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ", { id: tId });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Logged-out gate ── */
  if (!isPending && !isLoggedIn) {
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
          <div className="max-w-md w-full bg-brand-surface border border-brand-green-100 rounded-[32px] p-8 text-center shadow-xl ring-1 ring-brand-green/15 z-10 relative">
            <div className="w-16 h-16 mx-auto rounded-[20px] bg-brand-green-50 flex items-center justify-center mb-5">
              <Lock className="h-7 w-7 text-brand-green" />
            </div>
            <h2 className="font-display font-black text-xl text-brand-ink mb-2">
              ต้องเข้าสู่ระบบก่อน
            </h2>
            <p className="text-sm text-brand-ink-soft font-medium mb-6">
              เข้าสู่ระบบเพื่อเขียนรีวิวและดูสถานะรีวิวของคุณ
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
        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          initialTab={authTab}
        />
      </div>
    );
  }

  const activeStar = hoverRating || rating;

  return (
    <div className="min-h-screen bg-brand-paper font-sans text-brand-ink flex flex-col">
      <Navbar
        onOpenAuth={(tab) => {
          setAuthTab(tab);
          setAuthOpen(true);
        }}
        isLoggedIn={isLoggedIn}
        userRole={resolveUserRole(user)}
        onLogout={async () => {
          await signOut();
          window.location.href = "/";
        }}
      />

      <main className="flex-1 max-w-[820px] w-full mx-auto px-6 py-8 md:py-12 space-y-6 z-10 relative">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-ink-soft hover:text-brand-green transition group"
        >
          <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          กลับหน้าหลัก
        </Link>

        {/* Header */}
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-brand-ink flex items-center gap-2">
            <MessageSquareQuote className="h-7 w-7 text-brand-green" />
            เขียนรีวิว
          </h1>
          <p className="text-sm text-brand-ink-soft font-medium mt-1">
            แบ่งปันประสบการณ์ของคุณ — รีวิวที่แอดมินอนุมัติจะแสดงบนหน้าแรกของเว็บ
          </p>
        </div>

        {/* ── Review form ── */}
        <form
          onSubmit={handleSubmit}
          className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7 shadow-sm space-y-5"
        >
          {/* Star picker */}
          <div>
            <label className="block text-[13px] font-extrabold text-brand-ink mb-2">
              ให้คะแนน
            </label>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => {
                const v = i + 1;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRating(v)}
                    onMouseEnter={() => setHoverRating(v)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${v} ดาว`}
                    className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        v <= activeStar
                          ? "fill-brand-gold text-brand-gold-deep"
                          : "fill-zinc-200 text-zinc-300"
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                );
              })}
              <span className="ml-2 font-display font-black text-lg text-brand-ink">
                {activeStar}.0
              </span>
            </div>
          </div>

          {/* Detail (optional) */}
          <div>
            <label className="block text-[13px] font-extrabold text-brand-ink mb-2">
              แพ็กเกจ / รายละเอียด{" "}
              <span className="text-brand-ink-soft font-bold">(ไม่บังคับ)</span>
            </label>
            <input
              type="text"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={200}
              placeholder="เช่น เติม 1,600 Coins"
              className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-3 px-4 text-sm font-semibold outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 text-brand-ink placeholder:text-brand-ink-soft/50"
            />
          </div>

          {/* Review text */}
          <div>
            <label className="block text-[13px] font-extrabold text-brand-ink mb-2">
              รีวิวของคุณ
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="เล่าประสบการณ์การใช้บริการของคุณ..."
              className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-3 px-4 text-sm font-medium leading-relaxed outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 text-brand-ink placeholder:text-brand-ink-soft/50 resize-none"
            />
            <div className="text-right text-[11px] font-bold text-brand-ink-soft/70 mt-1">
              {reviewText.length}/1000
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-full font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <Send className="h-4.5 w-4.5" />
            )}
            ส่งรีวิว
          </button>
        </form>

        {/* ── My reviews ── */}
        <div className="space-y-3">
          <h2 className="font-display font-black text-lg text-brand-ink">
            รีวิวของฉัน
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-brand-ink-soft">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="font-bold text-sm">กำลังโหลด...</span>
            </div>
          ) : myReviews.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-brand-green-100 bg-brand-green-50/40 p-8 text-center">
              <p className="font-display text-base font-black text-brand-ink">
                คุณยังไม่เคยรีวิว
              </p>
              <p className="mt-1 text-sm font-semibold text-brand-ink-soft">
                เขียนรีวิวด้านบนเพื่อแบ่งปันประสบการณ์ของคุณ
              </p>
            </div>
          ) : (
            myReviews.map((r) => {
              const meta = STATUS_META[r.status];
              const StatusIcon = meta.icon;
              return (
                <div
                  key={r.id}
                  className="bg-brand-surface border border-brand-green-100 rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < r.rating
                              ? "fill-brand-gold text-brand-gold-deep"
                              : "fill-zinc-200 text-zinc-300"
                          }`}
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                  </div>
                  {r.detail && (
                    <span className="inline-block text-[11px] font-bold text-brand-ink-soft bg-brand-paper px-2 py-0.5 rounded-full border border-brand-green-100/60 mb-2">
                      {r.detail}
                    </span>
                  )}
                  <p className="text-[13px] leading-relaxed text-brand-ink-soft font-medium">
                    “{r.review}”
                  </p>
                  <div className="text-[11px] font-bold text-brand-ink-soft/70 mt-2.5">
                    {formatThaiDate(r.createdAt)}
                  </div>
                </div>
              );
            })
          )}
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
