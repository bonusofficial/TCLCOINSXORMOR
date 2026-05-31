"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  CalendarDays,
  Clock,
  Phone,
  X,
  Download,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { bookingsApi } from "@/lib/eden";
import {
  BOOKING_STATUSES,
  statusStyle,
  formatBookingDateTime,
} from "@/lib/booking";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";

interface Booking {
  id: number;
  bookingCode: string;
  productName: string;
  username: string;
  phone: string;
  price: string;
  status: string;
  bookingDate: string;
  bookingTime: string | null;
  content: string | null;
  createdAt: string;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success("คัดลอกรหัสแล้ว", { description: value });
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-brand-green-100 bg-brand-green-50/50 hover:bg-brand-green hover:border-brand-green text-[10.5px] font-black text-brand-green hover:text-white transition cursor-pointer flex-shrink-0"
    >
      {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
      <span>{copied ? "คัดลอกแล้ว" : "คัดลอกรหัส"}</span>
    </button>
  );
}

function getStatusIcon(status: string, className = "h-3 w-3") {
  switch (status) {
    case "รอตรวจสอบ":
      return <span className="inline-block w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />;
    case "กำลังดำเนินการ":
      return <Clock className={`${className} text-sky-500 animate-spin flex-shrink-0`} />;
    case "สำเร็จ":
      return <Check className={`${className} text-emerald-600 flex-shrink-0`} strokeWidth={3.5} />;
    case "ยกเลิก":
      return <X className={`${className} text-rose-500 flex-shrink-0`} strokeWidth={3.5} />;
    default:
      return <span className="inline-block w-2 h-2 rounded-full bg-brand-ink-soft/40 flex-shrink-0" />;
  }
}

function StatusSelector({
  value,
  onChange,
  disabled,
  className = ""
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sty = statusStyle(value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full inline-flex items-center justify-between sm:justify-start gap-1.5 text-[11px] font-black py-1.5 px-2.5 rounded-lg cursor-pointer outline-none border transition ${sty.bg} ${sty.text} ring-1 ${sty.ring} hover:opacity-90 disabled:opacity-60`}
      >
        <span className="inline-flex items-center gap-1.5">
          {getStatusIcon(value)}
          <span>{value}</span>
        </span>
        <ChevronDown className="h-3 w-3 opacity-60 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-40 bg-brand-surface-soft border border-brand-green-100 rounded-xl shadow-2xl ring-1 ring-brand-green/15 p-1 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
          {BOOKING_STATUSES.map((s) => {
            const active = s === value;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
                  active
                    ? "bg-brand-green-50 text-brand-green"
                    : "text-brand-ink-soft hover:bg-brand-green-50/60 hover:text-brand-green"
                }`}
              >
                {getStatusIcon(s, "h-3 w-3")}
                <span>{s}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "this_week" | "this_month" | "custom">("all");
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await bookingsApi.collection.api.v1.bookings.get();
    if (error) {
      const value = error.value as { message?: string } | undefined;
      toast.error(value?.message ?? `โหลดไม่สำเร็จ (${error.status})`);
      setLoading(false);
      return;
    }
    if (data.ok) setItems(data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reset page when search, statusFilter, dateFilter, custom date or sortOrder changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, dateFilter, selectedSpecificDate, sortOrder]);

  const handleStatusChange = async (b: Booking, status: string) => {
    setUpdatingId(b.id);
    const tId = toast.loading("กำลังอัปเดต...");
    const { data, error } = await bookingsApi.item.api.v1
      .bookings({ id: String(b.id) })
      .patch({
        status: status as (typeof BOOKING_STATUSES)[number],
      });
    setUpdatingId(null);
    if (error) {
      const v = error.value as { message?: string } | undefined;
      toast.error("อัปเดตไม่สำเร็จ", { id: tId, description: v?.message });
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === b.id ? data.data : x)));
    toast.success(data.message, { id: tId });
  };

  const handleDelete = async (b: Booking) => {
    if (!confirm(`ลบการจอง "${b.bookingCode}"?`)) return;
    setDeletingId(b.id);
    const tId = toast.loading("กำลังลบ...");
    const { data, error } = await bookingsApi.item.api.v1
      .bookings({ id: String(b.id) })
      .delete();
    setDeletingId(null);
    if (error) {
      const v = error.value as { message?: string } | undefined;
      toast.error("ลบไม่สำเร็จ", { id: tId, description: v?.message });
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== b.id));
    toast.success(data.message ?? "ลบแล้ว", { id: tId });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    
    // Calculate date boundaries based on local time
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const dayOfWeek = startOfToday.getDay(); // 0 = Sun, 1 = Mon...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfThisWeek = new Date(startOfToday);
    startOfThisWeek.setDate(startOfToday.getDate() + diffToMonday);
    
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return items.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false;
      
      // Date filtering logic
      if (dateFilter !== "all") {
        const bDate = new Date(b.createdAt);
        if (dateFilter === "today" && bDate < startOfToday) return false;
        if (dateFilter === "this_week" && bDate < startOfThisWeek) return false;
        if (dateFilter === "this_month" && bDate < startOfThisMonth) return false;
        if (dateFilter === "custom" && selectedSpecificDate) {
          const bDateStr = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, "0")}-${String(bDate.getDate()).padStart(2, "0")}`;
          if (bDateStr !== selectedSpecificDate) return false;
        }
      }

      if (!q) return true;
      return (
        b.bookingCode.toLowerCase().includes(q) ||
        b.username.toLowerCase().includes(q) ||
        b.productName.toLowerCase().includes(q) ||
        b.phone.includes(q)
      );
    });
  }, [items, search, statusFilter, dateFilter, selectedSpecificDate]);

  // Sort filtered items
  const sorted = useMemo(() => {
    const arr = [...filtered];
    return arr.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [filtered, sortOrder]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((b) => {
      counts[b.status] = (counts[b.status] ?? 0) + 1;
    });
    return counts;
  }, [items]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  // Handle Export to Excel (CSV with UTF-8 BOM for Thai character compatibility)
  const handleExport = () => {
    const headers = ["รหัสการจอง", "ชื่อลูกค้า", "เบอร์โทรศัพท์", "ชื่อสินค้า/บริการ", "ราคา", "สถานะ", "วันที่จอง", "เวลาจอง", "วันที่สั่งซื้อ"];
    const rows = filtered.map(b => [
      b.bookingCode,
      b.username,
      b.phone,
      b.productName,
      b.price,
      b.status,
      b.bookingDate,
      b.bookingTime || "—",
      formatBookingDateTime(b.createdAt)
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("ส่งออกข้อมูลสำเร็จ", { description: `ดาวน์โหลดเรียบร้อยแล้ว (${filtered.length} รายการ)` });
  };

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display font-black text-xl sm:text-2xl text-brand-ink">
            จัดการการจอง
          </h1>
          <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
            ทั้งหมด <b className="text-brand-green">{items.length}</b> รายการ
            {filtered.length !== items.length && (
              <> · กรองได้ <b className="text-brand-green">{filtered.length}</b></>
            )}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer self-start"
        >
          <Download className="h-4 w-4" />
          <span>ส่งออก Excel</span>
        </button>
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setStatusFilter("")}
          className={`px-3 py-1.5 rounded-full text-[11.5px] font-extrabold border transition cursor-pointer ${
            statusFilter === ""
              ? "bg-brand-green text-white border-brand-green"
              : "bg-brand-surface text-brand-ink-soft border-brand-green-100 hover:text-brand-green"
          }`}
        >
          ทั้งหมด ({items.length})
        </button>
        {BOOKING_STATUSES.map((s) => {
          const sty = statusStyle(s);
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? "" : s)}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-extrabold border transition cursor-pointer inline-flex items-center gap-1.5 ${
                active
                  ? `${sty.bg} ${sty.text} border-current shadow-sm`
                  : "bg-brand-surface text-brand-ink-soft border-brand-green-100"
              }`}
            >
              {getStatusIcon(s, "h-3 w-3")}
              {s} ({stats[s] ?? 0})
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-3 mb-4 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-brand-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา รหัส / username / สินค้า / เบอร์..."
            className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 pl-9 pr-9 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 w-6 h-6 rounded-full text-brand-ink-soft hover:text-brand-green cursor-pointer flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="relative inline-flex items-center">
            <CalendarDays className="absolute left-3 h-4 w-4 text-brand-ink-soft" />
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as any);
                if (e.target.value !== "custom") setSelectedSpecificDate("");
              }}
              className="w-full sm:w-auto inline-flex items-center justify-between gap-2 pl-9 pr-8 py-2.5 rounded-xl border border-brand-green-100 bg-brand-paper text-sm font-extrabold text-brand-ink-soft hover:border-brand-green hover:text-brand-green transition cursor-pointer outline-none appearance-none"
            >
              <option value="all">ทั้งหมด (วันที่)</option>
              <option value="today">วันนี้</option>
              <option value="this_week">สัปดาห์นี้</option>
              <option value="this_month">เดือนนี้</option>
              <option value="custom">ระบุวันที่...</option>
            </select>
            <ChevronDown className="absolute right-3 h-4 w-4 text-brand-ink-soft pointer-events-none" />
          </div>

          {dateFilter === "custom" && (
            <DatePicker
              value={selectedSpecificDate}
              onChange={setSelectedSpecificDate}
              placeholder="เลือกวันที่ต้องการกรอง"
              className="w-full sm:w-44 flex-shrink-0"
            />
          )}

          {/* Sort Filter */}
          <div className="relative inline-flex items-center">
            <ArrowUpDown className="absolute left-3 h-4 w-4 text-brand-ink-soft" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full sm:w-auto inline-flex items-center justify-between gap-2 pl-9 pr-8 py-2.5 rounded-xl border border-brand-green-100 bg-brand-paper text-sm font-extrabold text-brand-ink-soft hover:border-brand-green hover:text-brand-green transition cursor-pointer outline-none appearance-none"
            >
              <option value="newest">ใหม่ล่าสุด</option>
              <option value="oldest">เก่าที่สุด</option>
            </select>
            <ChevronDown className="absolute right-3 h-4 w-4 text-brand-ink-soft pointer-events-none" />
          </div>
        </div>

        {/* Refresh */}
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-brand-green-100 bg-brand-paper text-brand-ink-soft hover:border-brand-green hover:text-brand-green transition cursor-pointer disabled:opacity-50 text-sm font-bold"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>รีเฟรช</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-ink-soft">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="font-bold">กำลังโหลด...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-brand-surface border border-brand-green-100 rounded-3xl p-12 text-center">
          <p className="font-display font-black text-base text-brand-ink mb-1">
            ไม่มีข้อมูลการจอง
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-brand-surface border border-brand-green-100 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4">รหัสจอง</TableHead>
                  <TableHead className="py-3 px-3">ลูกค้า</TableHead>
                  <TableHead className="py-3 px-3">สินค้า</TableHead>
                  <TableHead className="py-3 px-3 text-right whitespace-nowrap">ราคา</TableHead>
                  <TableHead className="py-3 px-3 text-center">สถานะ</TableHead>
                  <TableHead className="py-3 px-3 whitespace-nowrap">จองเมื่อ</TableHead>
                  <TableHead className="py-3 px-4 text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((b) => {
                  const sty = statusStyle(b.status);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5">
                          <code className="font-mono font-extrabold text-[12px] text-brand-ink bg-brand-paper border border-brand-green-100 px-2 py-0.5 rounded">
                            {b.bookingCode}
                          </code>
                          <CopyButton value={b.bookingCode} />
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="font-extrabold text-[12.5px] text-brand-ink line-clamp-1">
                          {b.username}
                        </div>
                        <div className="text-[11px] text-brand-ink-soft font-bold inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {b.phone}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="font-extrabold text-[12.5px] text-brand-ink line-clamp-1">
                          {b.productName}
                        </div>
                        {b.bookingTime && (
                          <div className="text-[11px] text-brand-ink-soft font-bold inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {b.bookingTime}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-right whitespace-nowrap font-extrabold text-brand-green">
                        ฿{Number(b.price).toLocaleString()}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-center">
                        <StatusSelector
                          value={b.status}
                          onChange={(s) => handleStatusChange(b, s)}
                          disabled={updatingId === b.id}
                        />
                      </TableCell>
                      <TableCell className="py-3 px-3 text-[11px] font-bold text-brand-ink-soft whitespace-nowrap">
                        {formatBookingDateTime(b.createdAt)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDelete(b)}
                          disabled={deletingId === b.id}
                          className="w-8 h-8 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:border-rose-400 hover:bg-rose-500/10 hover:text-rose-400 flex items-center justify-center transition cursor-pointer disabled:opacity-50 ml-auto"
                        >
                          {deletingId === b.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {paginatedItems.map((b) => {
              const sty = statusStyle(b.status);
              return (
                <article
                  key={b.id}
                  className="bg-brand-surface border border-brand-green-100 rounded-2xl p-3 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="inline-flex items-center gap-1.5 min-w-0">
                      <code className="font-mono font-extrabold text-[11.5px] text-brand-ink bg-brand-paper border border-brand-green-100 px-2 py-0.5 rounded truncate">
                        {b.bookingCode}
                      </code>
                      <CopyButton value={b.bookingCode} />
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md ${sty.bg} ${sty.text} ring-1 ${sty.ring} flex-shrink-0`}
                    >
                      {getStatusIcon(b.status, "h-2.5 w-2.5")}
                      <span>{b.status}</span>
                    </span>
                  </div>
                  <div className="font-extrabold text-[13px] text-brand-ink line-clamp-1">
                    {b.productName}
                  </div>
                  <div className="text-[11px] text-brand-ink-soft font-bold mt-0.5">
                    👤 {b.username} · 📞 {b.phone}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px]">
                    <span className="font-extrabold text-brand-green">
                      ฿{Number(b.price).toLocaleString()}
                    </span>
                    <span className="text-brand-ink-soft font-bold inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatBookingDateTime(b.createdAt)}
                    </span>
                  </div>
                  <div className="flex gap-1.5 mt-2.5">
                    <StatusSelector
                      value={b.status}
                      onChange={(s) => handleStatusChange(b, s)}
                      disabled={updatingId === b.id}
                      className="flex-1"
                    />
                    <button
                      onClick={() => handleDelete(b)}
                      disabled={deletingId === b.id}
                      className="w-10 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:text-rose-400 inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                    >
                      {deletingId === b.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </main>
  );
}
