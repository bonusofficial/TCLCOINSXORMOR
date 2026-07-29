"use client";

/**
 * SalesProfitSection — สรุปรายรับ/กำไรจาก order ที่ "สำเร็จ"
 *
 * ดึงข้อมูลอัตโนมัติจาก bookings ที่สถานะ "สำเร็จ" (พอแอดมินกดสำเร็จในหน้าจอง → โผล่ที่นี่)
 * คอลัมน์: วันที่ / สินค้า / ราคาขาย / ต้นทุน / กำไร / ลูกค้า
 * กำไร = ราคาขาย − ต้นทุน ·  กำไรวันนี้ = ผลรวมกำไรทุก order ที่สำเร็จวันนี้
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  Wallet,
  Coins,
  Download,
  CalendarDays,
  Receipt,
  ChevronDown,
  ArrowUpDown,
  Clock3,
  Crown,
  Phone,
  Shield,
  Store,
  UserRound,
} from "lucide-react";
import { accountsApi } from "@/lib/eden";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";

type CustomerRole = "member" | "vip" | "agent" | "admin";

interface SalesRow {
  id: number;
  bookingCode: string;
  productName: string;
  username: string;
  recipientFirstName: string | null;
  recipientLastName: string | null;
  phone: string;
  customerRole: CustomerRole;
  salePrice: string;
  cost: string;
  profit: string;
  completedAt: string;
  bookedAt: string;
  bookingDate: string;
  bookingTime: string | null;
  bookingWindowStart: string | null;
  bookingWindowEnd: string | null;
  topupRoundName: string | null;
  topupRoundStart: string | null;
  topupRoundEnd: string | null;
}

const ROLE_META = {
  member: {
    label: "สมาชิก",
    icon: UserRound,
    classes: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600",
  },
  vip: {
    label: "VIP",
    icon: Crown,
    classes: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  },
  agent: {
    label: "ตัวแทน",
    icon: Store,
    classes: "border-teal-500/30 bg-teal-500/10 text-teal-600",
  },
  admin: {
    label: "ผู้ดูแลระบบ",
    icon: Shield,
    classes: "border-sky-500/30 bg-sky-500/10 text-sky-600",
  },
} satisfies Record<
  CustomerRole,
  {
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    classes: string;
  }
>;

const fmt = (v: string | number) =>
  Number(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// วันที่ล้วน (ใช้กับ bookingDate ที่เป็นเที่ยงคืน — ไม่โชว์เวลาเพื่อกันเพี้ยน tz)
const fmtDateOnly = (s: string) =>
  new Date(s).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const fullName = (row: SalesRow) =>
  [row.recipientFirstName, row.recipientLastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ") || "ไม่ระบุชื่อจริง";

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const monthKey = (s: string) => {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${THAI_MONTHS[(m || 1) - 1]} ${y + 543}`;
};

export default function SalesProfitSection() {
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "this_week" | "this_month" | "month" | "custom">("all");
  const [selectedSpecificDate, setSelectedSpecificDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(""); // "YYYY-MM"
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await accountsApi.sales.api.v1.accounts.sales.get();
    if (error) {
      toast.error("โหลดยอดขายไม่สำเร็จ");
      setLoading(false);
      return;
    }
    if (data.ok) {
      setRows(data.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, selectedSpecificDate, selectedMonth, sortOrder]);

  // หน้าบัญชียึดวันที่ปิดงานจริง เพื่อให้ออเดอร์ที่เพิ่งกด "สำเร็จ"
  // แสดงในรายรับของวันนั้น แม้วันที่คิวจะเป็นคนละวัน
  const filtered = useMemo(() => {
    if (dateFilter === "all") return rows;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dow = startOfToday.getDay();
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() + (dow === 0 ? -6 : 1 - dow));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return rows.filter((r) => {
      const d = new Date(r.completedAt);
      if (dateFilter === "today" && d < startOfToday) return false;
      if (dateFilter === "this_week" && d < startOfWeek) return false;
      if (dateFilter === "this_month" && d < startOfMonth) return false;
      if (dateFilter === "month" && selectedMonth && monthKey(r.completedAt) !== selectedMonth) return false;
      if (dateFilter === "custom" && selectedSpecificDate) {
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (ds !== selectedSpecificDate) return false;
      }
      return true;
    });
  }, [rows, dateFilter, selectedMonth, selectedSpecificDate]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ta = new Date(a.completedAt).getTime();
      const tb = new Date(b.completedAt).getTime();
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });
  }, [filtered, sortOrder]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  // เดือนที่มีข้อมูล (สำหรับ dropdown)
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(monthKey(r.completedAt));
    return Array.from(set).sort().reverse();
  }, [rows]);

  // ยอดของช่วงที่กรอง (การ์ดเปลี่ยนตามตัวกรอง)
  const filteredSummary = useMemo(() => {
    let sales = 0, cost = 0, profit = 0;
    for (const r of filtered) {
      sales += Number(r.salePrice) || 0;
      cost += Number(r.cost) || 0;
      profit += Number(r.profit) || 0;
    }
    return { sales, cost, profit };
  }, [filtered]);

  // สรุปแยกรายเดือน (สำหรับส่งออก)
  const monthlyBreakdown = useMemo(() => {
    const map = new Map<string, { sales: number; cost: number; profit: number }>();
    for (const r of filtered) {
      const k = monthKey(r.completedAt);
      const e = map.get(k) ?? { sales: 0, cost: 0, profit: 0 };
      e.sales += Number(r.salePrice) || 0;
      e.cost += Number(r.cost) || 0;
      e.profit += Number(r.profit) || 0;
      map.set(k, e);
    }
    return Array.from(map.entries())
      .sort((x, y) => (x[0] < y[0] ? 1 : -1))
      .map(([ym, v]) => ({ ym, ...v }));
  }, [filtered]);

  const periodLabel =
    dateFilter === "all" ? "ทั้งหมด"
    : dateFilter === "today" ? "วันนี้"
    : dateFilter === "this_week" ? "สัปดาห์นี้"
    : dateFilter === "this_month" ? "เดือนนี้"
    : dateFilter === "month" && selectedMonth ? monthLabel(selectedMonth)
    : dateFilter === "custom" && selectedSpecificDate ? selectedSpecificDate
    : "ทั้งหมด";

  // ป้ายการ์ดกำไรเด่น — เปลี่ยนตามช่วงที่เลือก (เลือกวันนี้ = "กำไรวันนี้")
  const profitCardLabel =
    dateFilter === "all" ? "กำไรทั้งหมด"
    : dateFilter === "today" ? "กำไรวันนี้"
    : dateFilter === "this_week" ? "กำไรสัปดาห์นี้"
    : dateFilter === "this_month" ? "กำไรเดือนนี้"
    : `กำไร · ${periodLabel}`;

  const handleExport = () => {
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const out: string[] = [];

    // สรุปรวมของช่วงที่เลือก
    out.push([`กำไรจากการขาย (${periodLabel})`].map(q).join(","));
    out.push(["ยอดขายรวม", "ต้นทุนรวม", "กำไรรวม", "จำนวนออเดอร์"].map(q).join(","));
    out.push([fmt(filteredSummary.sales), fmt(filteredSummary.cost), fmt(filteredSummary.profit), filtered.length].map(q).join(","));
    out.push("");

    // สรุปแยกรายเดือน
    out.push(["สรุปรายเดือน"].map(q).join(","));
    out.push(["เดือน", "ยอดขาย", "ต้นทุน", "กำไร"].map(q).join(","));
    for (const m of monthlyBreakdown) {
      out.push([monthLabel(m.ym), fmt(m.sales), fmt(m.cost), fmt(m.profit)].map(q).join(","));
    }
    out.push("");

    // รายการทั้งหมด
    out.push(["รายการทั้งหมด"].map(q).join(","));
    out.push([
      "วันที่และเวลาทำรายการจอง",
      "วันที่และเวลาปิดงานสำเร็จ",
      "วันที่เปิดรับจอง",
      "ช่วงเวลาเปิดรับจอง",
      "ชื่อรอบเติม",
      "เวลารอบเติม",
      "สินค้า",
      "ราคาขาย",
      "ต้นทุน",
      "กำไร",
      "ชื่อ–นามสกุลจริง",
      "Username",
      "เบอร์โทรศัพท์",
      "ยศลูกค้า",
      "รหัสจอง",
    ].map(q).join(","));
    for (const r of sorted) {
      out.push([
        fmtDateTime(r.bookedAt),
        fmtDateTime(r.completedAt),
        fmtDateOnly(r.bookingDate),
        r.bookingWindowStart && r.bookingWindowEnd
          ? `${r.bookingWindowStart}–${r.bookingWindowEnd}`
          : r.bookingTime ?? "—",
        r.topupRoundName ?? "—",
        r.topupRoundStart && r.topupRoundEnd
          ? `${r.topupRoundStart}–${r.topupRoundEnd}`
          : "—",
        r.productName,
        r.salePrice,
        r.cost,
        r.profit,
        fullName(r),
        r.username,
        r.phone,
        ROLE_META[r.customerRole].label,
        r.bookingCode,
      ].map(q).join(","));
    }
    const csv = "﻿" + out.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fileSuffix = dateFilter === "month" && selectedMonth ? selectedMonth : new Date().toISOString().slice(0, 10);
    link.download = `sales_profit_${fileSuffix}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("ส่งออกข้อมูลสำเร็จ", {
      description: `${periodLabel} · ${filtered.length} รายการ`,
    });
  };

  return (
    <section className="mb-9">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-brand-green-50 text-brand-green flex items-center justify-center flex-shrink-0">
            <Receipt className="h-5 w-5" strokeWidth={2.4} />
          </div>
          <div>
            <h2 className="font-display font-black text-lg sm:text-xl text-brand-ink leading-tight">
              กำไรจากการขาย
            </h2>
            <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
              ดึงจาก order ที่ <b className="text-brand-green">สำเร็จ</b> อัตโนมัติ · กำไร = ราคาขาย − ต้นทุน
            </p>
          </div>
        </div>
        <div className="flex gap-2 self-start">
          <button
            onClick={handleExport}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-sm text-brand-green border border-brand-green hover:bg-brand-green-50 transition cursor-pointer disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>ส่งออก</span>
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-brand-green-100 bg-brand-surface text-brand-ink-soft hover:border-brand-green hover:text-brand-green transition cursor-pointer disabled:opacity-50 text-xs font-bold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* ป้ายช่วงที่เลือก */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-extrabold text-brand-ink-soft uppercase">ยอดสรุป</span>
        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-brand-green-50 text-brand-green">
          {periodLabel}
        </span>
        <span className="text-[11px] font-bold text-brand-ink-soft/70">· {filtered.length} ออเดอร์</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {/* กำไรของช่วงที่เลือก — เด่นสุด (เปลี่ยนตามตัวกรอง) */}
        <div className="bg-gradient-to-br from-brand-green to-brand-green-700 rounded-2xl p-4 text-white shadow-lg shadow-brand-green/20">
          <p className="text-[10.5px] font-extrabold uppercase opacity-90 inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> {profitCardLabel}
          </p>
          <p className="font-display font-black text-xl leading-tight mt-1">
            ฿{fmt(filteredSummary.profit)}
          </p>
          <p className="text-[10.5px] font-bold opacity-90 mt-0.5">
            {filtered.length} ออเดอร์ · ยอดขาย ฿{fmt(filteredSummary.sales)}
          </p>
        </div>

        <SummaryCard
          label="ยอดขาย"
          value={String(filteredSummary.sales)}
          icon={<TrendingUp className="h-5 w-5" strokeWidth={2.5} />}
          tone="green"
        />
        <SummaryCard
          label="ต้นทุน"
          value={String(filteredSummary.cost)}
          icon={<Coins className="h-5 w-5" strokeWidth={2.5} />}
          tone="rose"
        />
        <SummaryCard
          label="กำไร"
          value={String(filteredSummary.profit)}
          icon={<Wallet className="h-5 w-5" strokeWidth={2.5} />}
          tone="gold"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 items-stretch sm:items-center justify-end">
        <div className="relative inline-flex items-center">
          <CalendarDays className="absolute left-3 h-4 w-4 text-brand-ink-soft" />
          <select
            value={dateFilter}
            onChange={(e) => {
              const v = e.target.value as typeof dateFilter;
              setDateFilter(v);
              if (v !== "custom") setSelectedSpecificDate("");
              if (v !== "month") setSelectedMonth("");
            }}
            className="w-full sm:w-auto inline-flex items-center justify-between gap-2 pl-9 pr-8 py-2.5 rounded-xl border border-brand-green-100 bg-brand-surface text-xs font-extrabold text-brand-ink-soft hover:border-brand-green hover:text-brand-green transition cursor-pointer outline-none appearance-none"
          >
            <option value="all">ทั้งหมด</option>
            <option value="today">วันนี้</option>
            <option value="this_week">สัปดาห์นี้</option>
            <option value="this_month">เดือนนี้</option>
            <option value="month">เลือกเดือน...</option>
            <option value="custom">ระบุวันที่...</option>
          </select>
          <ChevronDown className="absolute right-3 h-4 w-4 text-brand-ink-soft pointer-events-none" />
        </div>

        {dateFilter === "month" && (
          <div className="relative inline-flex items-center">
            <CalendarDays className="absolute left-3 h-4 w-4 text-brand-ink-soft" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto inline-flex items-center justify-between gap-2 pl-9 pr-8 py-2.5 rounded-xl border border-brand-green-100 bg-brand-surface text-xs font-extrabold text-brand-ink-soft hover:border-brand-green hover:text-brand-green transition cursor-pointer outline-none appearance-none"
            >
              <option value="">เลือกเดือน</option>
              {monthOptions.map((ym) => (
                <option key={ym} value={ym}>
                  {monthLabel(ym)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 h-4 w-4 text-brand-ink-soft pointer-events-none" />
          </div>
        )}

        {dateFilter === "custom" && (
          <DatePicker
            value={selectedSpecificDate}
            onChange={setSelectedSpecificDate}
            placeholder="เลือกวันที่ต้องการกรอง"
            className="w-full sm:w-44 flex-shrink-0"
          />
        )}

        <div className="relative inline-flex items-center">
          <ArrowUpDown className="absolute left-3 h-4 w-4 text-brand-ink-soft" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="w-full sm:w-auto inline-flex items-center justify-between gap-2 pl-9 pr-8 py-2.5 rounded-xl border border-brand-green-100 bg-brand-surface text-xs font-extrabold text-brand-ink-soft hover:border-brand-green hover:text-brand-green transition cursor-pointer outline-none appearance-none"
          >
            <option value="newest">ใหม่ล่าสุด</option>
            <option value="oldest">เก่าที่สุด</option>
          </select>
          <ChevronDown className="absolute right-3 h-4 w-4 text-brand-ink-soft pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-brand-ink-soft">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="font-bold">กำลังโหลด...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-brand-surface border border-brand-green-100 rounded-3xl p-10 text-center">
          <Receipt className="h-10 w-10 mx-auto text-brand-green mb-2" />
          <p className="font-display font-black text-base text-brand-ink mb-1">
            {rows.length === 0 ? "ยังไม่มีรายการขายที่สำเร็จ" : "ไม่มีรายการขายในช่วงที่เลือก"}
          </p>
          <p className="text-xs text-brand-ink-soft font-bold">
            {rows.length === 0
              ? "เมื่อกดสำเร็จในหน้าจองคิว ออเดอร์จะถูกดึงมาคำนวณกำไรที่นี่อัตโนมัติ"
              : `มีออเดอร์สำเร็จทั้งหมด ${rows.length} รายการ แต่ไม่มีรายการที่ปิดงานในช่วงนี้`}
          </p>
          {rows.length > 0 && dateFilter !== "all" && (
            <button
              type="button"
              onClick={() => {
                setDateFilter("all");
                setSelectedSpecificDate("");
                setSelectedMonth("");
              }}
              className="mt-4 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-black text-white shadow-md shadow-brand-green/20 hover:bg-brand-green-600"
            >
              แสดงทั้งหมด {rows.length} รายการ
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-brand-surface border border-brand-green-100 rounded-2xl overflow-x-auto shadow-xs">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4 whitespace-nowrap">วันที่–เวลาจอง</TableHead>
                  <TableHead className="py-3 px-3">สินค้า</TableHead>
                  <TableHead className="py-3 px-3 whitespace-nowrap">รอบเติมที่เลือก</TableHead>
                  <TableHead className="py-3 px-3 text-right whitespace-nowrap">ราคาขาย</TableHead>
                  <TableHead className="py-3 px-3 text-right whitespace-nowrap">ต้นทุน</TableHead>
                  <TableHead className="py-3 px-3 text-right whitespace-nowrap">กำไร</TableHead>
                  <TableHead className="py-3 px-4 whitespace-nowrap">ข้อมูลผู้จอง</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((r) => {
                  const profitNum = Number(r.profit);
                  const role = ROLE_META[r.customerRole];
                  const RoleIcon = role.icon;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="py-3 px-4 whitespace-nowrap text-[12px] font-bold text-brand-ink-soft">
                        <span className="inline-flex items-center gap-1.5 text-brand-ink">
                          <Clock3 className="h-3 w-3 text-brand-green" />
                          {fmtDateTime(r.bookedAt)} น.
                        </span>
                        <span className="mt-1 block text-[10.5px] font-semibold text-brand-ink-soft/70">
                          วันที่เปิดรับ: {fmtDateOnly(r.bookingDate)}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] font-black text-brand-green">
                          สำเร็จเมื่อ: {fmtDateTime(r.completedAt)} น.
                        </span>
                        {(r.bookingWindowStart || r.bookingTime) && (
                          <span className="block text-[10.5px] font-semibold text-brand-ink-soft/70 mt-0.5">
                            เปิดรับ:{" "}
                            {r.bookingWindowStart && r.bookingWindowEnd
                              ? `${r.bookingWindowStart}–${r.bookingWindowEnd}`
                              : r.bookingTime}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-3 font-bold text-brand-ink">
                        <span className="line-clamp-1">{r.productName}</span>
                        <span className="text-[10.5px] font-semibold text-brand-ink-soft/70">
                          #{r.bookingCode}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3 whitespace-nowrap">
                        <span className="block font-black text-brand-green">
                          {r.topupRoundName ?? "ไม่ระบุชื่อรอบ"}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] font-bold text-brand-ink-soft">
                          {r.topupRoundStart && r.topupRoundEnd
                            ? `${r.topupRoundStart}–${r.topupRoundEnd} น.`
                            : "ไม่ระบุเวลารอบ"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-right whitespace-nowrap font-extrabold text-brand-ink">
                        ฿{fmt(r.salePrice)}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-right whitespace-nowrap font-bold text-rose-400">
                        ฿{fmt(r.cost)}
                      </TableCell>
                      <TableCell
                        className={`py-3 px-3 text-right whitespace-nowrap font-black ${
                          profitNum >= 0 ? "text-brand-green" : "text-rose-400"
                        }`}
                      >
                        ฿{fmt(r.profit)}
                      </TableCell>
                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        <span className="block font-black text-brand-ink">
                          {fullName(r)}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] font-bold text-brand-ink-soft">
                          @{r.username}
                        </span>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-ink-soft">
                          <Phone className="h-3 w-3 text-brand-green" />
                          {r.phone || "ไม่ระบุเบอร์"}
                        </span>
                        <span className={`mt-1 flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${role.classes}`}>
                          <RoleIcon className="h-3 w-3" strokeWidth={2.5} />
                          {role.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "green" | "rose" | "gold";
}) {
  const toneCls =
    tone === "green"
      ? "bg-brand-green-50 text-brand-green"
      : tone === "rose"
        ? "bg-rose-500/10 text-rose-400"
        : "bg-brand-gold/15 text-brand-gold-deep";
  const valueCls =
    tone === "green"
      ? "text-brand-green"
      : tone === "rose"
        ? "text-rose-400"
        : "text-brand-gold-deep";
  return (
    <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${toneCls}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10.5px] font-extrabold text-brand-ink-soft uppercase">{label}</p>
        <p className={`font-display font-black text-lg leading-tight ${valueCls}`}>
          ฿{fmt(value)}
        </p>
      </div>
    </div>
  );
}
