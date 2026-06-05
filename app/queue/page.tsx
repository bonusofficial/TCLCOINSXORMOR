"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  AlertOctagon,
  CheckCircle2,
  Copy,
  Loader2,
  Phone,
  Tag,
  ArrowRight,
  Users,
  Crown
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import { publicApi } from "@/lib/eden";
import {
  useConfig,
  useProducts,
  type PublicProduct as QueueProduct,
} from "@/lib/contexts/PublicDataContext";
import { useSession, signOut } from "@/lib/auth-client";
import {
  formatBookingDateTime,
  statusStyle,
  type UserRole,
} from "@/lib/booking";
import { getProductAvailability, getEffectivePrice, fmtThaiDate, fmt, todayISO, useNowTick } from "@/lib/product-utils";
import { PackageCard } from "@/components/PackageCard";
import { copyToClipboard } from "@/lib/utils";

/* ─────────────────────────────────────────────
 * Types — Reuse PublicProduct + TimeSlot from context
 * ───────────────────────────────────────────── */

function sortByMostBooked(a: QueueProduct, b: QueueProduct) {
  const queueDiff = b.queueCount - a.queueCount;
  if (queueDiff !== 0) return queueDiff;

  const priceDiff = Number(a.price) - Number(b.price);
  if (priceDiff !== 0) return priceDiff;

  return b.id - a.id;
}

function formatApiDate(value: unknown) {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

type BookingQuotaItem = {
  productId: number | null;
  status: string;
  bookingDate: string;
};

type BookingNotice = {
  type: "warning" | "error";
  title: string;
  description: string;
} | null;

function getQuotaExceededMessage(p: QueueProduct, bookedToday: number) {
  if (p.maxPerUserPerDay <= 0 || bookedToday < p.maxPerUserPerDay) return null;

  return `แพ็กเกจนี้จำกัดซื้อได้ไม่เกิน ${p.maxPerUserPerDay} แพ็ก/วัน/คน คุณจองครบโควต้าของวันนี้แล้ว`;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const value = (error as { value?: unknown } | null)?.value;

  if (value && typeof value === "object") {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  if (typeof value === "string" && value.trim()) return value;

  const message = (error as { message?: unknown } | null)?.message;
  if (typeof message === "string" && message.trim()) return message;

  return fallback;
}

function isQuotaErrorMessage(message: string) {
  return message.includes("จำกัด") || message.includes("ไม่เกิน") || message.toLowerCase().includes("quota");
}

/* ─────────────────────────────────────────────
 * Page
 * ───────────────────────────────────────────── */

function QueueContent() {
  const { data: session } = useSession();
  const user = session?.user as
    | { id?: string; email?: string; username?: string; displayUsername?: string; phone?: string; role?: string }
    | undefined;
  const isLoggedIn = !!user;
  const userRole: UserRole = (() => {
    const r = (user?.role ?? "").toLowerCase().trim();
    if (r === "admin" || r === "agent" || r === "member") return r;
    return "member";
  })();

  // Navbar/auth modal state
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  // Products + config มาจาก context (โหลดครั้งเดียวที่ root)
  const { products, loading, refresh: refreshProducts } = useProducts();
  const { config } = useConfig();
  const warningMessage = config.warningMessage;

  const searchParams = useSearchParams();
  const router = useRouter();
  const paramProductId = searchParams.get("productId");
  const [search, setSearch] = useState("");

  // Booking form
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dailyBookingCountState, setDailyBookingCountState] = useState<{
    userId: string;
    counts: Record<number, number>;
  } | null>(null);
  const [bookingNotice, setBookingNotice] = useState<BookingNotice>(null);

  // Success result
  const [result, setResult] = useState<{
    code: string;
    productName: string;
    price: string;
    date: string;
    time: string;
    bookedAt: string;
  } | null>(null);

  // Prefill phone from session
  useEffect(() => {
    if (!user?.phone || phone) return;

    const id = window.setTimeout(() => {
      setPhone(user.phone ?? "");
    }, 0);

    return () => window.clearTimeout(id);
  }, [user?.phone, phone]);

  // re-render ตามเวลา เพื่อให้สถานะ/ฟิลเตอร์ เปิด-ปิด อัปเดตเองแบบ real-time
  const nowTick = useNowTick();

  /* ── Filter + search ── */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q))
        return false;

      // แสดงแพ็กที่เปิดจองแล้ว และแพ็กที่ยังไม่ถึงเวลาจอง
      // สินค้าหมด / ปิดรับแล้ว / ไม่ระบุวันขาย ยังซ่อนเหมือนเดิม
      const availability = getProductAvailability(p);
      if (availability.status !== "open" && availability.status !== "soon") return false;

      return true;
    });

    // เรียงตามยอดจองจริงจากมากไปน้อย
    return [...filtered].sort(sortByMostBooked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, search, nowTick]);

  // คิวสูงสุดในบรรดาสินค้าทั้งหมด — ใช้ทำ % แถบความนิยมแบบสัมพัทธ์ในการ์ด
  const maxQueueCount = useMemo(
    () => products.reduce((m, p) => Math.max(m, p.queueCount), 0),
    [products]
  );

  /* ── Booking handlers ── */
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const effectivePrice = useMemo(
    () =>
      selectedProduct
        ? getEffectivePrice(
            selectedProduct,
            userRole,
            user?.displayUsername || user?.username || null
          )
        : null,
    [selectedProduct, userRole, user?.displayUsername, user?.username]
  );

  const dailyBookingCounts =
    dailyBookingCountState && dailyBookingCountState.userId === user?.id
      ? dailyBookingCountState.counts
      : {};

  const showBookingNotice = (
    notice: NonNullable<BookingNotice>,
    replaceToastId?: string | number
  ) => {
    setBookingNotice(notice);
    if (replaceToastId !== undefined) toast.dismiss(replaceToastId);

    const options = {
      description: notice.description,
      duration: 6500,
    };

    if (notice.type === "warning") {
      toast.warning(notice.title, options);
      return;
    }

    toast.error(notice.title, options);
  };

  useEffect(() => {
    if (!bookingNotice) return;

    const id = window.setTimeout(() => {
      setBookingNotice(null);
    }, 6500);

    return () => window.clearTimeout(id);
  }, [bookingNotice]);

  useEffect(() => {
    const currentUserId = user?.id;
    if (!isLoggedIn || !currentUserId) return;

    let mounted = true;
    publicApi.bookings.api.v0.bookings.get()
      .then(({ data, error }) => {
        if (!mounted || error || !data?.ok) return;

        const today = todayISO();
        const counts: Record<number, number> = {};
        for (const booking of data.data as BookingQuotaItem[]) {
          if (booking.productId == null || booking.status === "ยกเลิก") continue;
          if (formatApiDate(booking.bookingDate).slice(0, 10) !== today) continue;

          counts[booking.productId] = (counts[booking.productId] ?? 0) + 1;
        }
        setDailyBookingCountState({ userId: currentUserId, counts });
      })
      .catch(() => {
        // ถ้าดึงยอดไม่ได้ ให้ API ตอน submit เป็นตัวกัน quota ขั้นสุดท้าย
      });

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, user?.id]);

  const showQuotaToast = (p: QueueProduct) => {
    const message = getQuotaExceededMessage(p, dailyBookingCounts[p.id] ?? 0);
    if (!message) return false;

    showBookingNotice({
      type: "warning",
      title: "ซื้อแพ็กเกจเกินโควต้า",
      description: message,
    });
    return true;
  };

  const showFormGuardToast = () => {
    if (!isLoggedIn) {
      setAuthTab("login");
      setAuthOpen(true);
      toast.info("กรุณาเข้าสู่ระบบก่อน", { description: "เพื่อทำการจองคิว" });
      return true;
    }

    if (!selectedProduct) {
      toast.warning("เลือกแพ็กเกจก่อน", {
        description: "กรุณาเลือกแพ็กเกจที่ต้องการจอง",
      });
      return true;
    }

    if (!selectedDate || !selectedTime) {
      toast.warning("เลือกวันและเวลาก่อน", {
        description: "กรุณาเลือกวันที่และช่วงเวลาที่ต้องการจอง",
      });
      return true;
    }

    if (phone.trim().length < 6) {
      toast.warning("กรอกเบอร์โทรให้ถูกต้อง", {
        description: "เบอร์โทรติดต่อกลับต้องมีอย่างน้อย 6 ตัวอักษร",
      });
      return true;
    }

    return showQuotaToast(selectedProduct);
  };

  const handlePickProduct = (p: QueueProduct) => {
    if (!isLoggedIn) {
      setAuthTab("login");
      setAuthOpen(true);
      toast.info("กรุณาเข้าสู่ระบบก่อน", { description: "เพื่อทำการจองคิว" });
      return;
    }
    const availability = getProductAvailability(p);
    if (availability.status !== "open") {
      showBookingNotice({
        type: "warning",
        title: availability.message ?? "ยังไม่ถึงเวลาจอง",
        description: availability.label,
      });
      return;
    }
    if (showQuotaToast(p)) return;

    setSelectedProductId(p.id);
    // เลือกวันแรกที่ยังไม่ผ่าน (>= วันนี้) เป็นค่าเริ่มต้น — ไม่ดีฟอลต์เป็นวันที่หมดเวลาไปแล้ว
    const today = todayISO();
    const upcomingDates = [...p.saleDates].filter((d) => d >= today).sort();
    setSelectedDate(upcomingDates[0] ?? today);
    setSelectedTime(
      p.timeSlots[0] ? `${p.timeSlots[0].start} - ${p.timeSlots[0].end}` : ""
    );
    // scroll to form
    setTimeout(() => {
      document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    if (paramProductId && products.length > 0 && !selectedProductId) {
      const p = products.find((x) => x.id === Number(paramProductId));
      if (!p) return;

      const id = window.setTimeout(() => {
        handlePickProduct(p);
      }, 0);

      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramProductId, products, selectedProductId]);

  const formValid =
    isLoggedIn &&
    selectedProduct !== null &&
    selectedDate !== "" &&
    selectedTime !== "" &&
    phone.trim().length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showFormGuardToast() || !selectedProduct) return;
    if (!effectivePrice) {
      toast.error("ไม่พบราคาของแพ็กเกจ", {
        description: "กรุณาเลือกแพ็กเกจใหม่อีกครั้ง",
      });
      return;
    }

    setSubmitting(true);
    setBookingNotice(null);
    const tId = toast.loading("กำลังจอง...");
    try {
      const { data, error } = await publicApi.bookings.api.v0.bookings.post({
        productId: selectedProduct.id,
        productCode: undefined,
        productName: selectedProduct.name,
        username: user?.displayUsername || user?.username || user?.email?.split("@")[0] || "user",
        phone: phone.trim(),
        content: notes.trim() || undefined,
        price: effectivePrice.amount,
        bookingDate: selectedDate,
        bookingTime: selectedTime,
      });
      if (error) {
        const message = getApiErrorMessage(error, "กรุณาลองใหม่อีกครั้ง");
        if (isQuotaErrorMessage(message)) {
          showBookingNotice(
            {
              type: "warning",
              title: "ซื้อแพ็กเกจเกินโควต้า",
              description: message,
            },
            tId
          );
        } else {
          showBookingNotice(
            {
              type: "error",
              title: "จองไม่สำเร็จ",
              description: message,
            },
            tId
          );
        }
        return;
      }
      const booking = data.data;
      setBookingNotice(null);
      toast.success("จองคิวสำเร็จ! กำลังนำทางไปหน้าประวัติการจอง...", { id: tId });
      setResult({
        code: booking.bookingCode,
        productName: booking.productName,
        price: booking.price,
        date: formatApiDate(booking.bookingDate),
        time: booking.bookingTime ?? "",
        bookedAt: formatApiDate(booking.createdAt),
      });
      setDailyBookingCountState((prev) => {
        const currentUserId = user?.id ?? "";
        const counts = prev?.userId === currentUserId ? prev.counts : {};

        return {
          userId: currentUserId,
          counts: {
            ...counts,
            [selectedProduct.id]: (counts[selectedProduct.id] ?? 0) + 1,
          },
        };
      });
      void refreshProducts();
      // reset form
      setSelectedProductId(null);
      setNotes("");

      // Redirect with slight delay
      setTimeout(() => {
        router.push("/profile/orders");
      }, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      showBookingNotice(
        {
          type: "error",
          title: "จองไม่สำเร็จ",
          description: msg,
        },
        tId
      );
    } finally {
      setSubmitting(false);
    }
  };

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

      {bookingNotice && (
        <div className="fixed inset-x-4 top-4 z-[10000] pointer-events-none sm:left-auto sm:right-6 sm:w-[380px]">
          <div
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl shadow-black/50 ring-1 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ${
              bookingNotice.type === "warning"
                ? "border-amber-500/60 bg-[#201A0D]/95 text-amber-100 ring-amber-500/20"
                : "border-rose-500/60 bg-[#220F14]/95 text-rose-100 ring-rose-500/20"
            }`}
          >
            <AlertOctagon
              className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                bookingNotice.type === "warning" ? "text-brand-gold" : "text-rose-400"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold leading-snug">{bookingNotice.title}</p>
              <p className="mt-1 text-xs font-bold leading-relaxed text-brand-ink-soft">
                {bookingNotice.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBookingNotice(null)}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-brand-ink-soft hover:bg-white/10 hover:text-brand-ink"
              aria-label="ปิดข้อความแจ้งเตือน"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Warning ticker — โหลดจาก config (admin ตั้งค่าได้ที่ /dashboard/settings) */}
      {warningMessage && (
        <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 mt-[6.5rem]">
          <div className="bg-gradient-to-r from-[#3B1B14] to-[#2B130E] border border-rose-500/30 rounded-2xl flex items-center gap-3 py-2.5 px-4 shadow-sm overflow-hidden">
            <div className="flex items-center gap-1.5 flex-shrink-0 bg-rose-500 text-white font-extrabold text-xs py-1 px-3 rounded-full">
              <AlertOctagon className="h-3.5 w-3.5" />
              คำเตือน
            </div>
            {/* ข้อความเตือนวิ่งแนวนอน (ลูปไม่มีรอยต่อ, หยุดเมื่อ hover) */}
            <div className="marquee-pause relative min-w-0 flex-1 overflow-hidden">
              <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#2B130E] to-transparent" />
              <div
                className="flex w-max animate-marquee whitespace-nowrap will-change-transform"
                style={{ animationDuration: "22s" }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    aria-hidden={i > 0}
                    className="px-8 text-xs font-bold text-rose-300"
                  >
                    {warningMessage}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result banner — show after successful booking */}
      {result && (
        <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 mt-4">
          <div className="bg-gradient-to-br from-brand-green-50 to-brand-surface border border-brand-green rounded-3xl p-5 sm:p-6 shadow-lg shadow-brand-green/20">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-brand-green text-white flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-black text-lg text-brand-ink">
                  จองคิวสำเร็จ! 🎉
                </h3>
                <p className="text-xs text-brand-ink-soft font-bold">
                  กรุณาเก็บรหัสจองไว้ใช้แจ้งแอดมิน
                </p>
              </div>
              <button
                onClick={() => setResult(null)}
                className="text-brand-ink-soft hover:text-brand-green cursor-pointer p-1"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-brand-surface-soft rounded-xl p-3 border border-brand-green-100">
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-brand-ink-soft mb-1">รหัสจอง</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-black text-base text-brand-green flex-1 truncate">
                    {result.code}
                  </code>
                  <button
                    onClick={() => {
                      copyToClipboard(result.code);
                      toast.success("คัดลอกรหัสแล้ว", { description: result.code });
                    }}
                    className="w-8 h-8 rounded-lg bg-brand-green text-white hover:bg-brand-green-600 flex items-center justify-center cursor-pointer flex-shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="bg-brand-surface-soft rounded-xl p-3 border border-brand-green-100">
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-brand-ink-soft mb-1">สถานะ</p>
                <span className={`inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-md ${statusStyle("รอตรวจสอบ").bg} ${statusStyle("รอตรวจสอบ").text} ring-1 ${statusStyle("รอตรวจสอบ").ring}`}>
                  🟡 รอตรวจสอบ
                </span>
                <p className="text-[10px] text-brand-ink-soft font-bold mt-1.5">
                  จองเมื่อ {formatBookingDateTime(result.bookedAt)}
                </p>
              </div>
            </div>
            <div className="mt-3 text-xs font-bold text-brand-ink-soft">
              <b className="text-brand-ink">{result.productName}</b> ·{" "}
              {fmtThaiDate((typeof result.date === "string" ? result.date : String(result.date)).slice(0, 10))} · {result.time} ·{" "}
              <span className="text-brand-green font-extrabold">฿{fmt(result.price)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Packages list section */}
      <section className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 mt-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-brand-ink">
              สินค้า<span className="text-brand-green">ยอดนิยม</span>
            </h1>
            <p className="text-xs text-brand-ink-soft font-bold mt-1">
              จัดอันดับจากยอดจองจริงของลูกค้า — แพ็กที่ยังไม่ถึงเวลาจองจะแสดงสถานะรอเวลาไว้ก่อน
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-brand-ink-soft" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาแพ็กเกจ..."
              className="w-full rounded-full border border-brand-green-100 bg-brand-surface py-2.5 pl-9 pr-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-brand-ink-soft">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="font-bold">กำลังโหลด...</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-brand-surface border border-brand-green-100 rounded-3xl p-12 text-center">
            <Tag className="h-12 w-12 mx-auto text-brand-green mb-2" />
            <p className="font-display font-black text-base text-brand-ink mb-1">
              ยังไม่มีแพ็กเกจที่แสดงตอนนี้
            </p>
            <p className="text-xs text-brand-ink-soft font-bold">
              ขณะนี้ไม่มีแพ็กเกจที่เปิดจองหรือรอเวลาเปิดจอง สินค้าหมดและแพ็กที่ปิดรับแล้วจะไม่แสดง
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((p, i) => (
              <PackageCard
                key={p.id}
                idx={i + 1}
                product={p}
                userRole={userRole}
                username={user?.displayUsername || user?.username || null}
                maxQueueCount={maxQueueCount}
                onSelect={() => handlePickProduct(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Booking form section */}
      <section id="booking-form" className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 mt-12 mb-12">
        <div className="mb-6">
          <h2 className="font-display font-black text-2xl text-brand-ink">
            จองคิวแพ็กเกจ<span className="text-brand-green">เหรียญ</span>
          </h2>
          <p className="text-xs text-brand-ink-soft font-bold mt-1">
            เลือกวัน, เวลา และแพ็กเกจที่ต้องการ จากนั้นตรวจสอบรายละเอียดก่อนยืนยันการจอง
          </p>
        </div>

        {!isLoggedIn ? (
          <div className="bg-brand-surface border border-brand-green-100 rounded-3xl p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-green-50 flex items-center justify-center mb-3">
              <Users className="h-7 w-7 text-brand-green" />
            </div>
            <h3 className="font-display font-black text-lg text-brand-ink mb-1">
              เข้าสู่ระบบก่อนจองคิว
            </h3>
            <p className="text-xs text-brand-ink-soft font-bold mb-4">
              สมัครสมาชิกฟรี หรือเข้าสู่ระบบเพื่อทำการจอง
            </p>
            <button
              onClick={() => {
                setAuthTab("login");
                setAuthOpen(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer"
            >
              เข้าสู่ระบบ
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 1: เลือกวันและเวลา */}
            <section className="bg-brand-surface border-l-4 border-l-brand-green border border-brand-green-100 rounded-2xl p-5">
              <h3 className="font-display font-black text-base text-brand-ink mb-1">
                เลือกวันและเวลา
              </h3>
              <p className="text-[11.5px] text-brand-ink-soft font-bold mb-4">
                สามารถเลือกวันที่หมายเหตุได้ในช่วงที่ระบบกำหนด และเวลาอาจมีการเปลี่ยนแปลง กรุณาเป็นไปตามกลุ่ม LINE OpenChat
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">
                    วันที่ต้องการจอง
                  </label>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    disabled={!selectedProduct}
                    className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink disabled:opacity-60 cursor-pointer"
                  >
                    <option value="" className="bg-brand-surface text-brand-ink">
                      กรุณาเลือกแพ็กเกจก่อน
                    </option>
                    {(selectedProduct?.saleDates ?? [])
                      .filter((d) => d >= todayISO())
                      .sort()
                      .map((d) => (
                        <option key={d} value={d} className="bg-brand-surface text-brand-ink">
                          {fmtThaiDate(d)}
                        </option>
                      ))}
                  </select>
                  <p className="text-[10.5px] font-bold text-brand-ink-soft mt-1.5">
                    {selectedProduct ? "เลือกวันที่ต้องการ" : "ยังไม่ได้เลือก"}
                  </p>
                </div>
                <div>
                  <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5 flex-wrap">
                    เวลาที่ต้องการจอง
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand-green/10 text-brand-green text-[10px] font-black ring-1 ring-brand-green/30">
                      เวลาไทย
                    </span>
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    disabled={!selectedProduct}
                    className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink disabled:opacity-60 cursor-pointer"
                  >
                    <option value="" className="bg-brand-surface text-brand-ink">
                      -- กรุณาเลือกแพ็กเกจก่อน --
                    </option>
                    {(selectedProduct?.timeSlots ?? []).map((s, i) => (
                      <option key={i} value={`${s.start} - ${s.end}`} className="bg-brand-surface text-brand-ink">
                        {s.start} - {s.end}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10.5px] font-bold text-brand-ink-soft mt-1.5">
                    {selectedProduct ? "เลือกเวลาที่สะดวกตามรอบการเปิดรับ" : "กรุณาเลือกแพ็กเกจที่ต้องการก่อน"}
                  </p>
                </div>
              </div>
            </section>

            {/* Step 2: รายละเอียดที่เลือก */}
            <section className="bg-brand-surface border-l-4 border-l-brand-green border border-brand-green-100 rounded-2xl p-5">
              <h3 className="font-display font-black text-base text-brand-ink mb-1">
                รายละเอียดที่เลือก
              </h3>
              <p className="text-[11.5px] text-brand-ink-soft font-bold mb-4">
                กรุณาเลือกจองคิวสินค้าที่ต้องการ และตรวจสอบรายละเอียดก่อนยืนยันการจอง
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">
                    เลือกแพ็กเกจที่ต้องการ
                  </label>
                  <select
                    value={selectedProductId ?? ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const p = products.find((x) => x.id === id);
                      if (!p) return;
                      // กันการเลือกตัวที่ disabled (กรณี browser ปล่อยผ่าน)
                      const av = getProductAvailability(p);
                      if (av.status !== "open") {
                        toast.error("ไม่สามารถจองได้", { description: av.label });
                        return;
                      }
                      handlePickProduct(p);
                    }}
                    className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink cursor-pointer"
                  >
                    <option value="" className="bg-brand-surface text-brand-ink">
                      -- กรุณาเลือกแพ็กเกจ --
                    </option>
                    {products
                      .filter((p) => getProductAvailability(p).status === "open")
                      .sort(sortByMostBooked)
                      .map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          className="bg-brand-surface text-brand-ink"
                        >
                          {p.name} · ฿{fmt(p.price)}
                        </option>
                      ))}
                  </select>
                  <p className="text-[10.5px] font-bold text-brand-ink-soft mt-1.5">
                    ช่องนี้แสดงเฉพาะแพ็กเกจที่<span className="text-brand-green">เปิดจองอยู่</span>เท่านั้น — แพ็กที่ยังไม่ถึงเวลาจองจะแสดงในการ์ดด้านบน
                  </p>
                </div>
                <div>
                  <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">
                    ราคา
                  </label>
                  <div className="rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold text-brand-ink">
                    {effectivePrice ? (
                      <div className="flex items-center justify-between">
                        <span className="text-brand-green font-black">
                          ฿{fmt(effectivePrice.amount)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {effectivePrice.isAgent && (
                            <span className="text-[10px] font-black bg-brand-gold/15 text-brand-gold-deep px-1.5 py-0.5 rounded ring-1 ring-brand-gold/30">
                              <Crown className="h-2.5 w-2.5 inline mr-0.5" />
                              Agent
                            </span>
                          )}
                          {effectivePrice.hasVipDiscount && (
                            <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded ring-1 ring-amber-500/30">
                              VIP -฿{fmt(selectedProduct?.discountAmount ?? 0)}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-brand-ink-soft/60">ราคาจะแสดงอัตโนมัติ</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="mt-4">
                <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-brand-green" />
                  เบอร์โทรติดต่อกลับ <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="เช่น 081-234-5678"
                  className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60"
                />
                <p className="text-[10.5px] font-bold text-brand-ink-soft mt-1.5">
                  ใช้สำหรับให้แอดมินติดต่อกลับ
                </p>
              </div>

              {/* Notes */}
              <div className="mt-4">
                <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">
                  หมายเหตุเพิ่มเติม
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น ขอคิวด่วน / หากมีการเปลี่ยนแปลงรอบจะแจ้งใน LINE"
                  className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60 resize-none"
                />
              </div>
            </section>

            {bookingNotice && (
              <div
                role="alert"
                className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${
                  bookingNotice.type === "warning"
                    ? "border-amber-500/50 bg-amber-500/12 text-amber-100"
                    : "border-rose-500/50 bg-rose-500/12 text-rose-100"
                }`}
              >
                <AlertOctagon
                  className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                    bookingNotice.type === "warning" ? "text-brand-gold" : "text-rose-400"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">{bookingNotice.title}</p>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-brand-ink-soft">
                    {bookingNotice.description}
                  </p>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              onClick={(e) => {
                if (!submitting && showFormGuardToast()) {
                  e.preventDefault();
                }
              }}
              className="w-full py-4 rounded-2xl font-extrabold text-base inline-flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-brand-green-50 disabled:text-brand-green/60 bg-gradient-to-r from-brand-green to-brand-green-600 text-white shadow-lg shadow-brand-green/30 hover:shadow-xl hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:shadow-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  กำลังจอง...
                </>
              ) : !formValid ? (
                <>
                  <AlertOctagon className="h-4.5 w-4.5" />
                  กรุณากรอกข้อมูลให้ครบถ้วน
                </>
              ) : (
                <>
                  ยืนยันจองคิว
                  <ArrowRight className="h-4.5 w-4.5" />
                </>
              )}
            </button>
          </form>
        )}
      </section>
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialTab={authTab}
      />
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-paper flex items-center justify-center text-brand-ink-soft"><Loader2 className="h-6 w-6 animate-spin mr-2" />กำลังโหลด...</div>}>
      <QueueContent />
    </Suspense>
  );
}
