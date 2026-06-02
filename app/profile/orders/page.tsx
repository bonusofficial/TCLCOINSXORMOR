"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession, signOut } from "@/lib/auth-client";
import {
  ChevronLeft,
  Search,
  Copy,
  Receipt,
  Clock,
  Trash2,
  Loader2,
  AlertOctagon,
  MessageCircle,
  Coins,
  Ban,
  CheckCircle,
  FileText,
  Calendar,
  Lock,
  ChevronDown,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import { publicApi } from "@/lib/eden";
import { useConfig } from "@/lib/contexts/PublicDataContext";
import { Marquee } from "@/components/ui/Marquee";
import { getProductAvailability, fmt } from "@/lib/product-utils";

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

interface BookingItem {
  id: number;
  bookingCode: string;
  productId: number | null;
  productCode: string | null;
  productName: string;
  userId: string | null;
  username: string;
  phone: string;
  content: string | null;
  price: string;
  status: string;
  bookingDate: string;
  bookingTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function OrdersHistoryPage() {
  const { data: session, isPending } = useSession();
  const { config } = useConfig();
  
  const user = session?.user as
    | {
        id?: string;
        username?: string | null;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        phone?: string | null;
        role?: string | null;
      }
    | undefined;

  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const isLoggedIn = !!user;
  const userRole = resolveUserRole(user);

  // Bookings list state
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "success" | "cancelled">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Fetch orders
  useEffect(() => {
    if (!isLoggedIn) return;
    let mounted = true;

    setLoadingBookings(true);
    publicApi.bookings.api.v0.bookings.get()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (!error && data?.ok) {
          setBookings(data.data as BookingItem[]);
        } else {
          toast.error("ดึงข้อมูลประวัติการจองคิวไม่สำเร็จ");
        }
        setLoadingBookings(false);
      })
      .catch(() => {
        if (mounted) {
          toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
          setLoadingBookings(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  // Copy booking detail handler (Precisely formatted as requested)
  const handleCopyBooking = (b: BookingItem) => {
    const datePart = formatThaiDateFull(b.bookingDate);
    // ยศจาก prefix ของรหัสการจอง: MB=ลูกค้าทั่วไป, AG=ตัวแทน, ADM=แอดมิน
    const prefix = (b.bookingCode.split("-")[0] || "").toUpperCase();
    const roleLabel =
      prefix === "AG" ? "ตัวแทน" : prefix === "ADM" ? "แอดมิน" : "ลูกค้าทั่วไป";

    const textToCopy = `รหัสการจอง: ${b.bookingCode}
สินค้า: ${b.productName}
ชื่อผู้ใช้: ${b.username || "-"} (UID: ${b.userId || "-"})
ยศ: ${roleLabel}
เบอร์โทร: ${b.phone || "-"}
วันที่: ${datePart}
เวลา: ${b.bookingTime || "00:00 - 23:59"} น.
ราคา: ${fmt(b.price)} บาท
สถานะ: ${getStatusBadge(b.status).emoji} ${getStatusBadge(b.status).label}
จองเมื่อ: ${formatPressedAt(b.createdAt)}
รายละเอียด: ${b.content || "-"}`;

    navigator.clipboard.writeText(textToCopy);
    toast.success("คัดลอกรายละเอียดข้อมูลการจองแล้ว!", {
      description: b.bookingCode,
    });
  };

  // Self cancel booking handler (Only allowed for pending/unpaid bookings)
  const handleCancelBooking = async (id: number, codeStr: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจองคิวรหัส ${codeStr}?`)) return;
    const tId = toast.loading("กำลังดำเนินการยกเลิกคิวจอง...");
    
    try {
      const { data, error } = await publicApi.bookings.api.v0.bookings({ id }).cancel.patch();
      if (error) {
        const msg = (error.value as { message?: string })?.message || "ยกเลิกไม่สำเร็จ";
        toast.error(msg, { id: tId });
        return;
      }
      
      toast.success("ยกเลิกการจองคิวเรียบร้อยแล้ว", { id: tId });
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "ยกเลิก" } : b))
      );
    } catch (e) {
      toast.error("เกิดข้อผิดพลาดการเชื่อมต่อระบบในการยกเลิก", { id: tId });
    }
  };

  // วันที่จองคิว แบบไทยเต็ม — "2 เมษายน พ.ศ. 2569"
  const formatThaiDateFull = (dateStr: string) => {
    const THAI_MONTHS = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
    ];
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
      return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`;
    } catch {
      return String(dateStr).slice(0, 10);
    }
  };

  // เวลาที่ลูกค้ากดจองจริง — เวลาไทย (UTC+7) — "02/06/2026 เวลา 21.30 น."
  const formatPressedAt = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const bkk = new Date(d.getTime() + 7 * 60 * 60 * 1000); // แปลงเป็นเวลาไทย
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${pad(bkk.getUTCDate())}/${pad(bkk.getUTCMonth() + 1)}/${bkk.getUTCFullYear()} เวลา ${pad(bkk.getUTCHours())}.${pad(bkk.getUTCMinutes())} น.`;
    } catch {
      return dateStr;
    }
  };

  // Style helper for statuses
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "รอตรวจสอบ":
        return {
          label: "รอตรวจสอบ",
          detailText: "ส่งคำขอจองแล้ว แอดมินกำลังตรวจสอบ",
          emoji: "🟡",
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-500",
          ring: "ring-amber-500/20",
          statusColor: "text-amber-600 dark:text-amber-500",
        };
      case "กำลังดำเนินการ":
        return {
          label: "กำลังดำเนินการ",
          detailText: "แอดมินรับเรื่องแล้ว กำลังเข้าทำรายการเติมเหรียญ",
          emoji: "🔵",
          bg: "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400",
          ring: "ring-sky-500/20",
          statusColor: "text-sky-600 dark:text-sky-400",
        };
      case "สำเร็จ":
        return {
          label: "สำเร็จแล้ว",
          detailText: "เติมเหรียญเสร็จสิ้นสมบูรณ์ ขอบคุณที่ใช้บริการครับ",
          emoji: "🟢",
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
          ring: "ring-emerald-500/20",
          statusColor: "text-emerald-600 dark:text-emerald-400",
        };
      case "ยกเลิก":
        return {
          label: "ยกเลิกแล้ว",
          detailText: "การจองนี้ถูกยกเลิกแล้ว",
          emoji: "🔴",
          bg: "bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-400",
          ring: "ring-rose-500/20",
          statusColor: "text-rose-500 dark:text-rose-400",
        };
      default:
        return {
          label: status,
          detailText: "อยู่ระหว่างดำเนินการระบบ",
          emoji: "⚪",
          bg: "bg-zinc-500/10 border-zinc-500/30 text-zinc-500",
          ring: "ring-zinc-500/20",
          statusColor: "text-zinc-500",
        };
    }
  };

  // Filter & Sort computation
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        // Search filter
        const matchSearch =
          b.bookingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (b.bookingTime ?? "").toLowerCase().includes(searchQuery.toLowerCase());

        // Status filter
        if (statusFilter === "all") return matchSearch;
        if (statusFilter === "pending") {
          return matchSearch && (b.status === "รอตรวจสอบ" || b.status === "กำลังดำเนินการ");
        }
        if (statusFilter === "success") {
          return matchSearch && b.status === "สำเร็จ";
        }
        if (statusFilter === "cancelled") {
          return matchSearch && b.status === "ยกเลิก";
        }
        return matchSearch;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortBy === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [bookings, searchQuery, statusFilter, sortBy]);

  // Logged-out state UI gate
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
        <main className="flex-1 flex items-center justify-center px-6 py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none -z-0">
            <div className="absolute top-1/4 left-1/4 w-80 aspect-square rounded-full bg-brand-green/8 blur-[100px]" />
          </div>
          <div className="max-w-md w-full bg-brand-surface border border-brand-green-100 rounded-[32px] p-8 text-center shadow-xl ring-1 ring-brand-green/15 z-10 relative">
            <div className="w-16 h-16 mx-auto rounded-[20px] bg-brand-green-50 flex items-center justify-center mb-5">
              <Lock className="h-7 w-7 text-brand-green" />
            </div>
            <h2 className="font-display font-black text-xl text-brand-ink mb-2">
              ต้องเข้าสู่ระบบก่อน
            </h2>
            <p className="text-sm text-brand-ink-soft font-medium mb-6">
              กรุณาเข้าสู่ระบบเพื่อตรวจสอบประวัติการจองและสั่งซื้อของคุณ
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

      <main className="flex-1 max-w-[1000px] w-full mx-auto px-6 py-8 md:py-12 space-y-6 z-10 relative">
        
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-ink-soft hover:text-brand-green transition group"
        >
          <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          กลับหน้าหลัก
        </Link>

        {/* Dynamic backdrop decorations */}
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute top-[-100px] right-[10%] w-[350px] aspect-square rounded-full bg-brand-green/5 blur-[120px]" />
          <div className="absolute top-[300px] left-[5%] w-[300px] aspect-square rounded-full bg-brand-gold/5 blur-[120px]" />
        </div>

        {/* Header section & search/filters wrapper */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h1 className="font-display font-black text-3xl sm:text-4xl text-brand-ink leading-tight">
                ประวัติการสั่งซื้อ <span className="text-brand-green">คิวของคุณ</span>
              </h1>
              <p className="text-sm text-brand-ink-soft font-medium">
                สามารถติดตามและตรวจสอบสถานะการจองของคุณได้แบบ Real-time
              </p>
            </div>

            {/* Quick search input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-ink-soft/70" />
              <input
                type="text"
                placeholder="ค้นหารหัสจอง หรือ สินค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-brand-green-100 bg-brand-surface text-sm font-semibold outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 text-brand-ink placeholder:text-brand-ink-soft/50 shadow-sm"
              />
            </div>
          </div>

          {/* Filtering row & sorting */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-surface border border-brand-green-100/70 p-2.5 rounded-[22px] shadow-sm">
            
            {/* Status chips */}
            <div className="flex flex-wrap gap-1.5">
              {([
                { key: "all", label: "ทั้งหมด" },
                { key: "pending", label: "รอดำเนินการ" },
                { key: "success", label: "สำเร็จแล้ว" },
                { key: "cancelled", label: "ยกเลิกแล้ว" },
              ] as const).map((chip) => {
                const isActive = statusFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    onClick={() => setStatusFilter(chip.key)}
                    className={`px-4.5 py-2 rounded-full font-extrabold text-xs transition duration-200 cursor-pointer ${
                      isActive
                        ? "bg-brand-green text-white shadow-md shadow-brand-green/20"
                        : "text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 pl-2">
              <span className="text-[11.5px] font-extrabold text-brand-ink-soft/80">จัดเรียงตาม:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
                  className="appearance-none pl-3.5 pr-8 py-1.5 bg-brand-green-50/50 hover:bg-brand-green-50 text-brand-green border border-brand-green-100 rounded-full font-black text-xs cursor-pointer outline-none transition"
                >
                  <option value="newest">ล่าสุด</option>
                  <option value="oldest">เก่าที่สุด</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-green pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ข้อความวิ่ง marquee (จาก config) */}
        <Marquee text={config.marqueeText} />

        {/* Bookings/Orders List Grid */}
        {loadingBookings ? (
          <div className="bg-brand-surface border border-brand-green-100/80 rounded-[32px] p-16 text-center flex flex-col items-center justify-center gap-3 shadow-sm min-h-[300px]">
            <Loader2 className="w-10 h-10 text-brand-green animate-spin" />
            <p className="text-sm font-extrabold text-brand-ink-soft">กำลังโหลดประวัติคิวจองของคุณ...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-brand-surface border border-brand-green-100/80 rounded-[32px] p-16 text-center flex flex-col items-center justify-center gap-4.5 shadow-sm min-h-[300px]">
            <div className="w-16 h-16 rounded-[22px] bg-brand-green-50/50 flex items-center justify-center text-brand-green-500">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <p className="font-display font-black text-lg text-brand-ink">ไม่พบประวัติคิวการสั่งซื้อ</p>
              <p className="text-xs font-bold text-brand-ink-soft/80 mt-1 max-w-sm mx-auto">
                {bookings.length === 0
                  ? "คุณยังไม่มีประวัติการจองคิวในระบบในขณะนี้ ลองจองคิวแรกของคุณตอนนี้เลย!"
                  : "ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา/ตัวกรองของคุณ"}
              </p>
            </div>
            {bookings.length === 0 && (
              <Link
                href="/queue"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-extrabold text-xs text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer"
              >
                จองคิวแรกเลย
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const badge = getStatusBadge(b.status);
              const isUnpaid = b.status === "รอตรวจสอบ" || b.status === "รอชำระเงิน";
              
              return (
                <div
                  key={b.id}
                  className="group bg-brand-surface border border-brand-green-100 hover:border-brand-green/40 hover:shadow-lg transition-all duration-300 rounded-[28px] overflow-hidden"
                >
                  {/* Card Header Info bar */}
                  <div className="px-5 sm:px-6 py-3.5 bg-gradient-to-r from-brand-green-50/40 via-transparent to-transparent border-b border-brand-green-100/50 flex flex-wrap items-center justify-between gap-3">
                    
                    {/* Booking code & copy button */}
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-black text-sm text-brand-ink">
                        #{b.bookingCode}
                      </span>
                      <button
                        onClick={() => handleCopyBooking(b)}
                        className="w-7.5 h-7.5 rounded-lg bg-brand-green-50 hover:bg-brand-green text-brand-green hover:text-white flex items-center justify-center transition cursor-pointer group/copy"
                        title="คัดลอกรายละเอียดคิวจอง"
                      >
                        <Copy className="h-3.5 w-3.5 transition group-hover/copy:scale-105" />
                      </button>

                      {/* Display CreatedAt (Thai Buddhist Date Year) */}
                      <span className="text-[11px] font-bold text-brand-ink-soft/90 flex items-center gap-1.5">
                        <span className="h-1 w-1 bg-zinc-300 rounded-full" />
                        <Calendar className="h-3 w-3 text-brand-ink-soft" />
                        จองเมื่อ {formatPressedAt(b.createdAt)}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-full border shadow-sm ${badge.bg}`}
                    >
                      <span>{badge.emoji}</span>
                      {badge.label}
                    </span>
                  </div>

                  {/* Card Content body */}
                  <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    
                    {/* Product block */}
                    <div className="flex items-start gap-4">
                      {/* Coins green glassmorphism container */}
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-green/20 to-brand-green/5 border-2 border-brand-green/25 flex items-center justify-center flex-shrink-0 relative shadow-sm">
                        <Coins className="h-7 w-7 text-brand-green" />
                        <span className="absolute inset-0 rounded-2xl bg-white/20 pointer-events-none" />
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-display font-black text-lg text-brand-ink group-hover:text-brand-green transition duration-200">
                          {b.productName}
                        </h3>
                        <p className={`text-[12.5px] font-extrabold flex items-center gap-1.5 ${badge.statusColor}`}>
                          <span className="inline-flex w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          {badge.detailText}
                        </p>
                      </div>
                    </div>

                    {/* Price block */}
                    <div className="flex flex-col items-start md:items-end justify-center">
                      <span className="text-[11px] font-extrabold text-brand-ink-soft">ยอดชำระสุทธิ</span>
                      <span className="font-display font-black text-2xl lg:text-3xl text-brand-green leading-none mt-1">
                        ฿{fmt(b.price)} <span className="text-xs font-black text-brand-ink">บาท</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Footer actions */}
                  <div className="px-5 sm:px-6 py-4 bg-brand-surface-soft/40 border-t border-brand-green-100/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    {/* Booking date + time slot */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-brand-ink-soft">
                      <div className="flex items-center gap-1.5 bg-brand-green-50/50 py-1 px-3 rounded-full border border-brand-green-100/50">
                        <Calendar className="h-3.5 w-3.5 text-brand-green" />
                        <span>วันที่จอง:</span>
                        <span className="text-brand-ink font-black">{formatThaiDateFull(b.bookingDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-brand-green-50/50 py-1 px-3 rounded-full border border-brand-green-100/50">
                        <Clock className="h-3.5 w-3.5 text-brand-green" />
                        <span>ช่วงเวลา:</span>
                        <span className="text-brand-ink font-black">{b.bookingTime || "00:00 - 23:59"} น.</span>
                      </div>
                      
                      {b.content && (
                        <p className="max-w-[320px] truncate text-[11.5px]" title={b.content}>
                          บันทึก: <span className="font-medium text-brand-ink-soft">{b.content}</span>
                        </p>
                      )}
                    </div>

                    {/* Actions button group */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      
                      {/* Line contact link */}
                      <a
                        href={config.contactLine || "https://lin.ee/WAQHSfb"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full font-black text-[12.5px] text-white bg-[#06C755] hover:bg-[#05b34c] shadow-md shadow-[#06C755]/20 hover:shadow-lg hover:-translate-y-0.5 transition duration-200 cursor-pointer"
                      >
                        <MessageCircle className="h-4 w-4 fill-white" strokeWidth={0} />
                        ติดต่อแอดมิน
                      </a>

                      {/* Cancel order button (Unpaid only) */}
                      {isUnpaid ? (
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(b.id, b.bookingCode)}
                          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full font-extrabold text-[12.5px] text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-100 hover:border-rose-200 hover:-translate-y-0.5 transition duration-200 cursor-pointer"
                        >
                          <Ban className="h-4 w-4" />
                          ยกเลิก
                        </button>
                      ) : (
                        // Disabled placeholder when already paid/completed
                        <button
                          type="button"
                          disabled
                          className="hidden sm:inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full font-extrabold text-[12.5px] text-zinc-400 bg-zinc-50 border border-zinc-100 opacity-60 cursor-not-allowed"
                        >
                          <Ban className="h-4 w-4" />
                          ยกเลิก
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Auth Modal for Demo navbar operations */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialTab={authTab}
      />
    </div>
  );
}
