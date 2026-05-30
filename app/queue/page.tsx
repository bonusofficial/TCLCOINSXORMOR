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
  generateBookingCode,
  formatBookingDateTime,
  statusStyle,
  type UserRole,
} from "@/lib/booking";
import { getProductAvailability, getEffectivePrice, fmtThaiDate, fmt, todayISO, useNowTick } from "@/lib/product-utils";
import { PackageCard } from "@/components/PackageCard";

/* ─────────────────────────────────────────────
 * Types — Reuse PublicProduct + TimeSlot from context
 * ───────────────────────────────────────────── */

type Filter = "all" | "soon" | "open";

const FILTER_LABEL: Record<Filter, string> = {
  all: "ทั้งหมด",
  soon: "เปิดจองวันนี้",
  open: "จองได้เลย",
};

/* ─────────────────────────────────────────────
 * Page
 * ───────────────────────────────────────────── */

function QueueContent() {
  const { data: session } = useSession();
  const user = session?.user as
    | { id?: string; email?: string; username?: string; phone?: string; role?: string }
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
  const { products, loading } = useProducts();
  const { config } = useConfig();
  const warningMessage = config.warningMessage;

  const searchParams = useSearchParams();
  const router = useRouter();
  const paramProductId = searchParams.get("productId");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Booking form
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    if (user?.phone && !phone) setPhone(user.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.phone]);

  // re-render ตามเวลา เพื่อให้สถานะ/ฟิลเตอร์ เปิด-ปิด อัปเดตเองแบบ real-time
  const nowTick = useNowTick();

  /* ── Filter + search ── */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q))
        return false;
      const avail = getProductAvailability(p);
      if (filter === "open" && avail.status !== "open") return false;
      if (filter === "soon" && avail.status !== "soon") return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, search, filter, nowTick]);

  /* ── Booking handlers ── */
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const effectivePrice = useMemo(
    () =>
      selectedProduct
        ? getEffectivePrice(selectedProduct, userRole, user?.username ?? null)
        : null,
    [selectedProduct, userRole, user?.username]
  );

  const handlePickProduct = (p: QueueProduct) => {
    if (!isLoggedIn) {
      setAuthTab("login");
      setAuthOpen(true);
      toast.info("กรุณาเข้าสู่ระบบก่อน", { description: "เพื่อทำการจองคิว" });
      return;
    }
    setSelectedProductId(p.id);
    setSelectedDate(p.saleDates[0] ?? todayISO());
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
      if (p) handlePickProduct(p);
    }
  }, [paramProductId, products, selectedProductId]);

  const formValid =
    isLoggedIn &&
    selectedProduct !== null &&
    selectedDate !== "" &&
    selectedTime !== "" &&
    phone.trim().length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid || !selectedProduct || !effectivePrice) return;

    setSubmitting(true);
    const tId = toast.loading("กำลังจอง...");
    try {
      const { data, error } = await publicApi.bookings.api.v0.bookings.post({
        productId: selectedProduct.id,
        productCode: undefined,
        productName: selectedProduct.name,
        username: user?.username ?? user?.email?.split("@")[0] ?? "user",
        phone: phone.trim(),
        content: notes.trim() || undefined,
        price: effectivePrice.amount,
        bookingDate: selectedDate,
        bookingTime: selectedTime,
      });
      if (error) {
        const v = error.value as { message?: string } | undefined;
        toast.error("จองไม่สำเร็จ", { id: tId, description: v?.message });
        setSubmitting(false);
        return;
      }
      const booking = data.data;
      toast.success("จองคิวสำเร็จ! กำลังนำทางไปหน้าประวัติการจอง...", { id: tId });
      setResult({
        code: booking.bookingCode,
        productName: booking.productName,
        price: booking.price,
        date: typeof booking.bookingDate === "string"
          ? booking.bookingDate
          : ((booking.bookingDate as any) instanceof Date
            ? (booking.bookingDate as any).toISOString()
            : String(booking.bookingDate)),
        time: booking.bookingTime ?? "",
        bookedAt: typeof booking.createdAt === "string"
          ? booking.createdAt
          : ((booking.createdAt as any) instanceof Date
            ? (booking.createdAt as any).toISOString()
            : String(booking.createdAt)),
      });
      // reset form
      setSelectedProductId(null);
      setNotes("");

      // Redirect with slight delay
      setTimeout(() => {
        router.push("/profile/orders");
      }, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast.error("จองไม่สำเร็จ", { id: tId, description: msg });
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

      {/* Warning ticker — โหลดจาก config (admin ตั้งค่าได้ที่ /dashboard/settings) */}
      {warningMessage && (
        <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 mt-[6.5rem]">
          <div className="bg-gradient-to-r from-[#3B1B14] to-[#2B130E] border border-rose-500/30 rounded-2xl flex items-center gap-3 py-2.5 px-4 shadow-sm overflow-hidden">
            <div className="flex items-center gap-1.5 flex-shrink-0 bg-rose-500 text-white font-extrabold text-xs py-1 px-3 rounded-full">
              <AlertOctagon className="h-3.5 w-3.5" />
              คำเตือน
            </div>
            <p className="text-xs font-bold text-rose-300 line-clamp-2 sm:line-clamp-1">
              {warningMessage}
            </p>
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
                      navigator.clipboard.writeText(result.code);
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
              แพ็กเกจที่เปิดให้จอง<span className="text-brand-green">วันนี้</span>
            </h1>
            <p className="text-xs text-brand-ink-soft font-bold mt-1">
              สามารถเลือกจองแพ็กเกจที่ต้องการของคุณได้
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

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(Object.keys(FILTER_LABEL) as Filter[]).map((k) => {
            const active = filter === k;
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-extrabold border transition cursor-pointer ${
                  active
                    ? "bg-brand-green text-white border-brand-green shadow-md shadow-brand-green/30"
                    : "bg-brand-surface text-brand-ink-soft border-brand-green-100 hover:text-brand-green"
                }`}
              >
                {FILTER_LABEL[k]}
              </button>
            );
          })}
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
              ไม่มีแพ็กเกจที่ตรงกัน
            </p>
            <p className="text-xs text-brand-ink-soft font-bold">
              ลองเปลี่ยนคำค้นหรือฟิลเตอร์ดู
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
                username={user?.username ?? null}
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
                    {(selectedProduct?.saleDates ?? []).map((d) => (
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
                    {products.map((p) => {
                      const av = getProductAvailability(p);
                      const disabled = av.status !== "open";
                      const tag =
                        av.status === "outOfStock"
                          ? "สินค้าหมด"
                          : av.status === "soon"
                            ? av.label
                            : av.status === "ended"
                              ? "ปิดรับแล้ว"
                              : "";
                      return (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={disabled}
                          className={`bg-brand-surface text-brand-ink ${
                            disabled ? "text-brand-ink-soft/60" : ""
                          }`}
                        >
                          {p.name} · ฿{fmt(p.price)}
                          {tag ? ` — ${tag}` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10.5px] font-bold text-brand-ink-soft mt-1.5">
                    เฉพาะแพ็กเกจที่<span className="text-brand-green">เปิดจองอยู่</span>เท่านั้นที่เลือกได้ — สินค้าหมด / นอกวันขาย / นอกช่วงเวลา จะถูกปิดไว้
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

            {/* Submit */}
            <button
              type="submit"
              disabled={!formValid || submitting}
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
