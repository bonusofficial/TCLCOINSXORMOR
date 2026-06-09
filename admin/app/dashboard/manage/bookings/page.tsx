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
  StickyNote,
  X,
  Download,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { bookingsApi } from "@/lib/eden";
import {
  BOOKING_STATUSES,
  type BookingStatus,
  statusStyle,
  formatBookingDateTime,
} from "@/lib/booking";
import { copyToClipboard } from "@/lib/utils";
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

type DateFilter = "all" | "today" | "this_week" | "this_month" | "custom";
type SortOrder = "newest" | "oldest";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        copyToClipboard(value);
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

function SelectionCheckbox({
  checked,
  indeterminate = false,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-brand-green-100 accent-brand-green cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    />
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [bulkStatus, setBulkStatus] = useState<BookingStatus>("กำลังดำเนินการ");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const resetListView = () => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

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
    // คำนวณจากข้อมูลที่กรองด้วย date และ search แล้ว (ยกเว้น status filter)
    const baseFiltered = items.filter((b) => {
      // Date filtering logic
      if (dateFilter !== "all") {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const dayOfWeek = startOfToday.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const startOfThisWeek = new Date(startOfToday);
        startOfThisWeek.setDate(startOfToday.getDate() + diffToMonday);

        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const bDate = new Date(b.createdAt);
        if (dateFilter === "today" && bDate < startOfToday) return false;
        if (dateFilter === "this_week" && bDate < startOfThisWeek) return false;
        if (dateFilter === "this_month" && bDate < startOfThisMonth) return false;
        if (dateFilter === "custom" && selectedSpecificDate) {
          const bDateStr = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, "0")}-${String(bDate.getDate()).padStart(2, "0")}`;
          if (bDateStr !== selectedSpecificDate) return false;
        }
      }

      // Search filter
      const q = search.trim().toLowerCase();
      if (q) {
        return (
          b.bookingCode.toLowerCase().includes(q) ||
          b.username.toLowerCase().includes(q) ||
          b.productName.toLowerCase().includes(q) ||
          b.phone.includes(q)
        );
      }

      return true;
    });

    baseFiltered.forEach((b) => {
      counts[b.status] = (counts[b.status] ?? 0) + 1;
    });
    return counts;
  }, [items, dateFilter, selectedSpecificDate, search]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const selectedBookings = useMemo(
    () => filtered.filter((b) => selectedIds.has(b.id)),
    [filtered, selectedIds]
  );
  const selectedCount = selectedBookings.length;
  const visibleIds = useMemo(() => paginatedItems.map((b) => b.id), [paginatedItems]);
  const visibleSelectedCount = useMemo(
    () => visibleIds.filter((id) => selectedIds.has(id)).length,
    [selectedIds, visibleIds]
  );
  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  const handleToggleBookingSelection = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleVisibleSelection = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const handleSelectFiltered = () => {
    setSelectedIds(new Set(filtered.map((b) => b.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkStatusChange = async () => {
    if (selectedCount === 0) return;

    const targets = selectedBookings.filter((b) => b.status !== bulkStatus);
    if (targets.length === 0) {
      toast.info(`รายการที่เลือกเป็นสถานะ "${bulkStatus}" อยู่แล้ว`);
      return;
    }

    setBulkUpdating(true);
    const tId = toast.loading(`กำลังอัปเดต ${targets.length} รายการ...`);
    const updated: Booking[] = [];
    const failedIds: number[] = [];

    for (const target of targets) {
      try {
        const { data, error } = await bookingsApi.item.api.v1
          .bookings({ id: String(target.id) })
          .patch({
            status: bulkStatus,
          });

        if (error || !data?.ok) {
          failedIds.push(target.id);
          continue;
        }

        updated.push(data.data);
      } catch {
        failedIds.push(target.id);
      }
    }

    setBulkUpdating(false);

    if (updated.length > 0) {
      const updatedById = new Map(updated.map((b) => [b.id, b]));
      setItems((prev) => prev.map((b) => updatedById.get(b.id) ?? b));
    }

    if (failedIds.length === 0) {
      setSelectedIds(new Set());
      toast.success(`อัปเดตสถานะเป็น "${bulkStatus}" แล้ว`, {
        id: tId,
        description: `สำเร็จ ${updated.length} รายการ`,
      });
      return;
    }

    setSelectedIds(new Set(failedIds));
    toast.error("อัปเดตบางรายการไม่สำเร็จ", {
      id: tId,
      description: `สำเร็จ ${updated.length} รายการ, ไม่สำเร็จ ${failedIds.length} รายการ`,
    });
  };

  // Handle Export to Excel (CSV with UTF-8 BOM for Thai character compatibility)
  const handleExport = () => {
    const headers = ["รหัสการจอง", "ชื่อลูกค้า", "เบอร์โทรศัพท์", "ชื่อสินค้า/บริการ", "ราคา", "สถานะ", "วันที่จอง", "เวลาจอง", "หมายเหตุลูกค้า", "วันที่สั่งซื้อ"];
    const rows = filtered.map(b => [
      b.bookingCode,
      b.username,
      b.phone,
      b.productName,
      b.price,
      b.status,
      b.bookingDate,
      b.bookingTime || "—",
      b.content?.trim() || "—",
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
            {dateFilter === "all" && !search ? (
              <>ทั้งหมด <b className="text-brand-green">{items.length}</b> รายการ</>
            ) : (
              <>
                กรองได้ <b className="text-brand-green">{Object.values(stats).reduce((a, b) => a + b, 0)}</b> จากทั้งหมด <b className="text-brand-ink-soft">{items.length}</b> รายการ
              </>
            )}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={bulkUpdating}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer self-start disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <Download className="h-4 w-4" />
          <span>ส่งออก Excel</span>
        </button>
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => {
            setStatusFilter("");
            resetListView();
          }}
          className={`px-3 py-1.5 rounded-full text-[11.5px] font-extrabold border transition cursor-pointer ${
            statusFilter === ""
              ? "bg-brand-green text-white border-brand-green"
              : "bg-brand-surface text-brand-ink-soft border-brand-green-100 hover:text-brand-green"
          }`}
        >
          ทั้งหมด ({Object.values(stats).reduce((a, b) => a + b, 0)})
        </button>
        {BOOKING_STATUSES.map((s) => {
          const sty = statusStyle(s);
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(active ? "" : s);
                resetListView();
              }}
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
            onChange={(e) => {
              setSearch(e.target.value);
              resetListView();
            }}
            placeholder="ค้นหา รหัส / username / สินค้า / เบอร์..."
            className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 pl-9 pr-9 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                resetListView();
              }}
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
                const nextDateFilter = e.target.value as DateFilter;
                setDateFilter(nextDateFilter);
                if (nextDateFilter !== "custom") setSelectedSpecificDate("");
                resetListView();
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
              onChange={(value) => {
                setSelectedSpecificDate(value);
                resetListView();
              }}
              placeholder="เลือกวันที่ต้องการกรอง"
              className="w-full sm:w-44 flex-shrink-0"
            />
          )}

          {/* Sort Filter */}
          <div className="relative inline-flex items-center">
            <ArrowUpDown className="absolute left-3 h-4 w-4 text-brand-ink-soft" />
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as SortOrder);
                resetListView();
              }}
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
          disabled={loading || bulkUpdating}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-brand-green-100 bg-brand-paper text-brand-ink-soft hover:border-brand-green hover:text-brand-green transition cursor-pointer disabled:opacity-50 text-sm font-bold"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>รีเฟรช</span>
        </button>
      </div>

      {selectedCount > 0 && (
        <div className="mb-4 rounded-2xl border border-brand-green/25 bg-brand-green-50/80 px-3 py-3 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-brand-surface px-3 py-2 text-sm font-black text-brand-ink ring-1 ring-brand-green-100">
                เลือกแล้ว <b className="mx-1 text-brand-green">{selectedCount}</b> รายการ
              </span>
              {selectedCount < filtered.length && (
                <button
                  type="button"
                  onClick={handleSelectFiltered}
                  disabled={bulkUpdating}
                  className="inline-flex items-center justify-center rounded-lg border border-brand-green-100 bg-brand-surface px-3 py-2 text-xs font-extrabold text-brand-ink-soft hover:border-brand-green hover:text-brand-green transition cursor-pointer disabled:opacity-50"
                >
                  เลือกที่กรองทั้งหมด ({filtered.length})
                </button>
              )}
              <button
                type="button"
                onClick={handleClearSelection}
                disabled={bulkUpdating}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-green-100 bg-brand-surface px-3 py-2 text-xs font-extrabold text-brand-ink-soft hover:border-rose-300 hover:text-rose-500 transition cursor-pointer disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                ล้าง
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <StatusSelector
                value={bulkStatus}
                onChange={(s) => setBulkStatus(s as BookingStatus)}
                disabled={bulkUpdating}
                className="w-full sm:w-44"
              />
              <button
                type="button"
                onClick={handleBulkStatusChange}
                disabled={bulkUpdating}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-black text-white shadow-md shadow-brand-green/25 hover:bg-brand-green-600 transition cursor-pointer disabled:opacity-60"
              >
                {bulkUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" strokeWidth={3.2} />
                )}
                อัปเดตสถานะ
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <TableHead className="w-10 py-3 pl-4 pr-0">
                    <SelectionCheckbox
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected}
                      disabled={bulkUpdating || paginatedItems.length === 0}
                      label="เลือกรายการในหน้านี้"
                      onChange={handleToggleVisibleSelection}
                    />
                  </TableHead>
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
                  return (
                    <TableRow
                      key={b.id}
                      data-state={selectedIds.has(b.id) ? "selected" : undefined}
                    >
                      <TableCell className="w-10 py-3 pl-4 pr-0">
                        <SelectionCheckbox
                          checked={selectedIds.has(b.id)}
                          disabled={bulkUpdating || updatingId === b.id || deletingId === b.id}
                          label={`เลือก ${b.bookingCode}`}
                          onChange={(checked) => handleToggleBookingSelection(b.id, checked)}
                        />
                      </TableCell>
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
                        {b.content?.trim() && (
                          <div
                            title={b.content.trim()}
                            className="mt-1 flex items-start gap-1 text-[11px] font-bold text-brand-gold-deep max-w-[240px]"
                          >
                            <StickyNote className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2 leading-snug">
                              หมายเหตุ: {b.content.trim()}
                            </span>
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
                          disabled={bulkUpdating || updatingId === b.id}
                        />
                      </TableCell>
                      <TableCell className="py-3 px-3 text-[11px] font-bold text-brand-ink-soft whitespace-nowrap">
                        {formatBookingDateTime(b.createdAt)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDelete(b)}
                          disabled={bulkUpdating || deletingId === b.id}
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
                  className={`bg-brand-surface border rounded-2xl p-3 shadow-xs transition ${
                    selectedIds.has(b.id)
                      ? "border-brand-green bg-brand-green-50/50 ring-2 ring-brand-green/15"
                      : "border-brand-green-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="inline-flex items-center gap-2 min-w-0">
                      <SelectionCheckbox
                        checked={selectedIds.has(b.id)}
                        disabled={bulkUpdating || updatingId === b.id || deletingId === b.id}
                        label={`เลือก ${b.bookingCode}`}
                        onChange={(checked) => handleToggleBookingSelection(b.id, checked)}
                      />
                      <div className="inline-flex items-center gap-1.5 min-w-0">
                        <code className="font-mono font-extrabold text-[11.5px] text-brand-ink bg-brand-paper border border-brand-green-100 px-2 py-0.5 rounded truncate">
                          {b.bookingCode}
                        </code>
                        <CopyButton value={b.bookingCode} />
                      </div>
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
                      disabled={bulkUpdating || updatingId === b.id}
                      className="flex-1"
                    />
                    <button
                      onClick={() => handleDelete(b)}
                      disabled={bulkUpdating || deletingId === b.id}
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
