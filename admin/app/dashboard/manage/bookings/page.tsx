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
  Pencil,
  MapPin,
  Save,
  UserRound,
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
  recipientFirstName: string | null;
  recipientLastName: string | null;
  addressLine: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  quantity: number;
  unitPrice: string | null;
  price: string;
  cost: string | null;
  currentProductCost: string | null;
  status: string;
  bookingDate: string;
  bookingTime: string | null;
  bookingWindowStart: string | null;
  bookingWindowEnd: string | null;
  topupRoundCode: string | null;
  topupRoundName: string | null;
  topupRoundStart: string | null;
  topupRoundEnd: string | null;
  topupRoundCapacity: number | null;
  content: string | null;
  createdAt: string;
}

type DateFilter = "all" | "today" | "this_week" | "this_month" | "custom";
type SortOrder = "newest" | "oldest";
type BookingEditForm = {
  phone: string;
  firstName: string;
  lastName: string;
  addressLine: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  content: string;
  cost: string;
};

const emptyEditForm: BookingEditForm = {
  phone: "",
  firstName: "",
  lastName: "",
  addressLine: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
  content: "",
  cost: "",
};

function formatDeliveryAddress(b: Booking) {
  return [
    b.addressLine,
    b.subdistrict && `ตำบล/แขวง ${b.subdistrict}`,
    b.district && `อำเภอ/เขต ${b.district}`,
    b.province,
    b.postalCode,
  ]
    .filter(Boolean)
    .join(" ");
}

function effectiveBookingCost(booking: Booking) {
  return booking.cost ?? booking.currentProductCost;
}

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
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkStatusDropdownOpen, setBulkStatusDropdownOpen] = useState(false);
  const bulkStatusDropdownRef = useRef<HTMLDivElement>(null);
  const [costEditorOpen, setCostEditorOpen] = useState(false);
  const [costDrafts, setCostDrafts] = useState<Record<number, string>>({});
  const [useSharedCost, setUseSharedCost] = useState(false);
  const [sharedCost, setSharedCost] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState<BookingEditForm>(emptyEditForm);
  const [editTargetStatus, setEditTargetStatus] = useState<BookingStatus | null>(
    null
  );
  const [savingEdit, setSavingEdit] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const resetListView = () => {
    setCurrentPage(1);
    setSelectedIds(new Set());
    setCostEditorOpen(false);
    setCostDrafts({});
    setUseSharedCost(false);
    setSharedCost("");
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
    load();
  }, [load]);

  useEffect(() => {
    if (!bulkStatusDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bulkStatusDropdownRef.current && !bulkStatusDropdownRef.current.contains(e.target as Node)) {
        setBulkStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bulkStatusDropdownOpen]);

  const openEditBooking = (
    booking: Booking,
    targetStatus: BookingStatus | null = null
  ) => {
    setEditingBooking(booking);
    setEditTargetStatus(targetStatus);
    setEditForm({
      phone: booking.phone,
      firstName: booking.recipientFirstName ?? "",
      lastName: booking.recipientLastName ?? "",
      addressLine: booking.addressLine ?? "",
      subdistrict: booking.subdistrict ?? "",
      district: booking.district ?? "",
      province: booking.province ?? "",
      postalCode: booking.postalCode ?? "",
      content: booking.content ?? "",
      cost: effectiveBookingCost(booking) ?? "",
    });
  };

  const closeEditBooking = () => {
    if (savingEdit) return;
    setEditingBooking(null);
    setEditTargetStatus(null);
    setEditForm(emptyEditForm);
  };

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

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingBooking) return;
    if (!/^\d{10}$/.test(editForm.phone)) {
      toast.warning("เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก");
      return;
    }
    if (editForm.postalCode && !/^\d{5}$/.test(editForm.postalCode)) {
      toast.warning("รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก");
      return;
    }
    setSavingEdit(true);
    const tId = toast.loading(
      editTargetStatus === "สำเร็จ"
        ? "กำลังบันทึกและปิดงาน..."
        : "กำลังบันทึกข้อมูล..."
    );
    const optionalText = (value: string) =>
      value.trim() ? value.trim() : undefined;
    const { data, error } = await bookingsApi.item.api.v1
      .bookings({ id: String(editingBooking.id) })
      .patch({
        ...(editTargetStatus ? { status: editTargetStatus } : {}),
        phone: editForm.phone,
        ...(optionalText(editForm.firstName)
          ? { recipientFirstName: optionalText(editForm.firstName) }
          : {}),
        ...(optionalText(editForm.lastName)
          ? { recipientLastName: optionalText(editForm.lastName) }
          : {}),
        ...(optionalText(editForm.addressLine)
          ? { addressLine: optionalText(editForm.addressLine) }
          : {}),
        ...(optionalText(editForm.subdistrict)
          ? { subdistrict: optionalText(editForm.subdistrict) }
          : {}),
        ...(optionalText(editForm.district)
          ? { district: optionalText(editForm.district) }
          : {}),
        ...(optionalText(editForm.province)
          ? { province: optionalText(editForm.province) }
          : {}),
        ...(optionalText(editForm.postalCode)
          ? { postalCode: optionalText(editForm.postalCode) }
          : {}),
        content: editForm.content.trim() || null,
        ...(editForm.cost.trim() !== ""
          ? { cost: Number(editForm.cost) }
          : {}),
      });
    setSavingEdit(false);

    if (error) {
      const value = error.value as { message?: string } | undefined;
      toast.error("บันทึกไม่สำเร็จ", {
        id: tId,
        description: value?.message,
      });
      return;
    }

    setItems((current) =>
      current.map((booking) =>
        booking.id === editingBooking.id ? data.data : booking
      )
    );
    toast.success(data.message, { id: tId });
    setEditingBooking(null);
    setEditTargetStatus(null);
    setEditForm(emptyEditForm);
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
        `${b.recipientFirstName ?? ""} ${b.recipientLastName ?? ""}`.toLowerCase().includes(q) ||
        formatDeliveryAddress(b).toLowerCase().includes(q) ||
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
          `${b.recipientFirstName ?? ""} ${b.recipientLastName ?? ""}`.toLowerCase().includes(q) ||
          formatDeliveryAddress(b).toLowerCase().includes(q) ||
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
    if (!checked) {
      setCostDrafts((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
    }
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
    setCostEditorOpen(false);
    setCostDrafts({});
    setUseSharedCost(false);
    setSharedCost("");
  };

  const handleOpenCostEditor = () => {
    if (selectedCount === 0) return;
    const editable = selectedBookings.filter((booking) => booking.status !== "สำเร็จ");
    if (editable.length === 0) {
      toast.info("รายการที่เลือกสำเร็จแล้วและถูกล็อกต้นทุน");
      return;
    }
    setCostDrafts(
      Object.fromEntries(
        editable.map((booking) => [booking.id, ""])
      )
    );
    setUseSharedCost(false);
    setSharedCost("");
    setCostEditorOpen(true);
  };

  const handleSaveBulkCosts = async () => {
    const editable = selectedBookings.filter(
      (booking) => booking.status !== "สำเร็จ"
    );
    if (editable.length === 0) {
      toast.info("ไม่มีรายการที่สามารถแก้ต้นทุนได้");
      return;
    }

    if (useSharedCost && sharedCost.trim() === "") {
      toast.warning("กรุณากรอกต้นทุนที่ใช้ร่วมกัน");
      return;
    }

    const values = editable.flatMap((booking) => {
      const rawValue = useSharedCost
        ? sharedCost
        : costDrafts[booking.id] ?? "";
      if (rawValue.trim() === "") return [];
      const value = Number(rawValue);
      return [{ booking, rawValue: rawValue.trim(), value }];
    });
    if (values.length === 0) {
      setCostEditorOpen(false);
      toast.info("ไม่ได้แก้ไขต้นทุน", {
        description: "ระบบจะใช้ต้นทุนปัจจุบันจากสินค้าเมื่อกดสำเร็จ",
      });
      return;
    }
    const invalid = values.find(
      ({ rawValue, value }) =>
        rawValue === "" || !Number.isFinite(value) || value < 0
    );
    if (invalid) {
      toast.warning(`กรุณากรอกต้นทุนของ ${invalid.booking.bookingCode} ให้ถูกต้อง`);
      return;
    }

    setBulkUpdating(true);
    const tId = toast.loading(`กำลังบันทึกต้นทุน ${values.length} รายการ...`);
    const updated: Booking[] = [];
    const failedIds: number[] = [];

    for (const { booking, value } of values) {
      try {
        const { data, error } = await bookingsApi.item.api.v1
          .bookings({ id: String(booking.id) })
          .patch({
            cost: value,
          });

        if (error || !data?.ok) {
          failedIds.push(booking.id);
          continue;
        }

        updated.push(data.data);
      } catch {
        failedIds.push(booking.id);
      }
    }

    setBulkUpdating(false);

    if (updated.length > 0) {
      const updatedById = new Map(updated.map((b) => [b.id, b]));
      setItems((prev) => prev.map((b) => updatedById.get(b.id) ?? b));
    }

    if (failedIds.length === 0) {
      setCostEditorOpen(false);
      toast.success("บันทึกต้นทุนเรียบร้อยแล้ว", {
        id: tId,
        description: `สำเร็จ ${updated.length} รายการ`,
      });
      return;
    }

    setSelectedIds(new Set(failedIds));
    toast.error("บันทึกต้นทุนบางรายการไม่สำเร็จ", {
      id: tId,
      description: `สำเร็จ ${updated.length} รายการ, ไม่สำเร็จ ${failedIds.length} รายการ`,
    });
  };

  const handleBulkChangeStatus = async (targetStatus: BookingStatus) => {
    setBulkStatusDropdownOpen(false);
    const targets = selectedBookings.filter(
      (booking) => booking.status !== targetStatus
    );
    if (targets.length === 0) {
      toast.info(`รายการที่เลือกเป็นสถานะ "${targetStatus}" อยู่แล้ว`);
      return;
    }

    setBulkUpdating(true);
    const tId = toast.loading(
      `กำลังเปลี่ยน ${targets.length} รายการเป็น "${targetStatus}"...`
    );
    const updated: Booking[] = [];
    const failedIds: number[] = [];

    for (const target of targets) {
      try {
        const { data, error } = await bookingsApi.item.api.v1
          .bookings({ id: String(target.id) })
          .patch({ status: targetStatus });
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
      const updatedById = new Map(updated.map((booking) => [booking.id, booking]));
      setItems((previous) =>
        previous.map((booking) => updatedById.get(booking.id) ?? booking)
      );
    }

    if (failedIds.length === 0) {
      setSelectedIds(new Set());
      setCostEditorOpen(false);
      toast.success(`เปลี่ยนสถานะเป็น "${targetStatus}" แล้ว`, {
        id: tId,
        description:
          targetStatus === "สำเร็จ"
            ? `${updated.length} รายการถูกนำไปคำนวณในหน้าบัญชีรับ–จ่ายอัตโนมัติ`
            : `อัปเดตสำเร็จ ${updated.length} รายการ`,
      });
      return;
    }

    setSelectedIds(new Set(failedIds));
    toast.error(`เปลี่ยนเป็น "${targetStatus}" บางรายการไม่สำเร็จ`, {
      id: tId,
      description: `สำเร็จ ${updated.length} รายการ, ไม่สำเร็จ ${failedIds.length} รายการ`,
    });
  };

  const toggleOrderDetails = (id: number) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Handle Export to Excel (CSV with UTF-8 BOM for Thai character compatibility)
  const handleExport = () => {
    const headers = ["รหัสการจอง", "ชื่อลูกค้า", "ผู้รับสินค้า", "เบอร์โทรศัพท์", "ที่อยู่จัดส่ง", "ชื่อสินค้า/บริการ", "จำนวน", "ราคาต่อชิ้น", "ยอดรวม", "ต้นทุนจริง", "สถานะ", "วันที่เปิดรับจอง", "ช่วงเวลาเปิดรับจอง", "รหัสรอบเติม", "ชื่อรอบเติม", "เวลารอบเติม", "หมายเหตุลูกค้า", "วันที่และเวลาที่ลูกค้ากดจอง"];
    const rows = filtered.map(b => [
      b.bookingCode,
      b.username,
      [b.recipientFirstName, b.recipientLastName].filter(Boolean).join(" ") || "—",
      b.phone,
      formatDeliveryAddress(b) || "—",
      b.productName,
      b.quantity || 1,
      b.unitPrice ?? b.price,
      b.price,
      effectiveBookingCost(b) ?? "—",
      b.status,
      b.bookingDate,
      b.bookingWindowStart && b.bookingWindowEnd
        ? `${b.bookingWindowStart}–${b.bookingWindowEnd}`
        : b.bookingTime || "—",
      b.topupRoundCode || "—",
      b.topupRoundName || "—",
      b.topupRoundStart && b.topupRoundEnd
        ? `${b.topupRoundStart}–${b.topupRoundEnd}`
        : "—",
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
            placeholder="ค้นหา รหัส / ลูกค้า / ผู้รับ / ที่อยู่ / สินค้า..."
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
              <button
                type="button"
                onClick={handleOpenCostEditor}
                disabled={bulkUpdating}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-green bg-brand-surface px-4 py-2.5 text-sm font-black text-brand-green hover:bg-brand-green-50 transition cursor-pointer disabled:opacity-60"
              >
                <Pencil className="h-4 w-4" strokeWidth={2.5} />
                แก้ไขต้นทุน
              </button>
              <div ref={bulkStatusDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setBulkStatusDropdownOpen((prev) => !prev)}
                  disabled={bulkUpdating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-black text-white shadow-md shadow-brand-green/25 hover:bg-brand-green-600 transition cursor-pointer disabled:opacity-60"
                >
                  {bulkUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4" strokeWidth={2.5} />
                  )}
                  เปลี่ยนสถานะ
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${bulkStatusDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {bulkStatusDropdownOpen && !bulkUpdating && (
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-brand-green-100 bg-brand-paper shadow-xl overflow-hidden">
                    {BOOKING_STATUSES.map((s) => {
                      const sty = statusStyle(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleBulkChangeStatus(s)}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-extrabold text-brand-ink hover:bg-brand-green-50 transition"
                        >
                          <span>{sty.emoji}</span>
                          <span>{sty.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {costEditorOpen && (
            <section className="mt-3 rounded-2xl border border-brand-green-100 bg-brand-surface p-3 sm:p-4">
              <div className="flex flex-col gap-3 border-b border-brand-green-100/70 pb-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="font-display text-base font-black text-brand-ink">
                    แก้ไขต้นทุนออเดอร์ที่เลือก
                  </h2>
                  <p className="mt-0.5 text-[11px] font-bold text-brand-ink-soft">
                    กำไรใหม่คำนวณจากราคาขายลบต้นทุนใหม่อัตโนมัติ
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-brand-green-100 bg-brand-paper px-3 text-xs font-black text-brand-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSharedCost}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setUseSharedCost(checked);
                        if (checked && sharedCost === "") {
                          const first = selectedBookings.find(
                            (booking) => booking.status !== "สำเร็จ"
                          );
                          setSharedCost(
                            first
                              ? costDrafts[first.id] ||
                                  effectiveBookingCost(first) ||
                                  ""
                              : ""
                          );
                        }
                      }}
                      className="h-4 w-4 accent-brand-green"
                    />
                    ใช้ต้นทุนเดียวกันทั้งหมด
                  </label>
                  {useSharedCost && (
                    <label className="text-[10.5px] font-black text-brand-ink">
                      ต้นทุนที่ใช้ร่วมกัน
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={sharedCost}
                        onChange={(event) => setSharedCost(event.target.value)}
                        placeholder="0.00"
                        className="mt-1 block w-full min-w-40 rounded-xl border border-brand-green-100 bg-brand-paper px-3 py-2 text-sm font-black text-brand-ink outline-none focus:border-brand-green sm:w-44"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {selectedBookings.map((booking) => {
                  const locked = booking.status === "สำเร็จ";
                  const existingCost = effectiveBookingCost(booking);
                  const draft = locked
                    ? booking.cost ?? ""
                    : useSharedCost
                      ? sharedCost
                      : costDrafts[booking.id] ?? "";
                  const calculationCost =
                    draft.trim() === "" ? existingCost : draft;
                  const draftNumber =
                    calculationCost == null || calculationCost.trim() === ""
                      ? null
                      : Number(calculationCost);
                  const profit =
                    draftNumber != null && Number.isFinite(draftNumber)
                      ? Number(booking.price) - draftNumber
                      : null;
                  return (
                    <div
                      key={booking.id}
                      className="grid grid-cols-1 gap-2 rounded-xl border border-brand-green-100/70 bg-brand-paper p-3 sm:grid-cols-[minmax(180px,1.4fr)_repeat(3,minmax(120px,0.8fr))] sm:items-end"
                    >
                      <div className="min-w-0">
                        <code className="text-[10.5px] font-black text-brand-green">
                          {booking.bookingCode}
                        </code>
                        <div className="mt-0.5 truncate text-xs font-black text-brand-ink">
                          {booking.productName}
                        </div>
                        {locked && (
                          <div className="mt-1 text-[10px] font-black text-sky-600">
                            รายการสำเร็จแล้ว · ล็อกต้นทุน
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-brand-ink-soft">
                          ราคาขาย
                        </div>
                        <div className="mt-1 text-sm font-black text-brand-green">
                          ฿{Number(booking.price).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-brand-ink-soft">
                          ต้นทุนเดิม
                        </div>
                        <div className="mt-1 text-sm font-black text-brand-ink">
                          {existingCost == null
                            ? "ยังไม่ระบุ"
                            : `฿${Number(existingCost).toLocaleString()}`}
                        </div>
                        {booking.cost == null && existingCost != null && (
                          <div className="mt-0.5 text-[9.5px] font-bold text-brand-green">
                            จากต้นทุนสินค้าปัจจุบัน
                          </div>
                        )}
                      </div>
                      <label className="text-[10px] font-black text-brand-ink-soft">
                        ต้นทุนใหม่
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={draft}
                          disabled={locked || useSharedCost}
                          onChange={(event) =>
                            setCostDrafts((previous) => ({
                              ...previous,
                              [booking.id]: event.target.value,
                            }))
                          }
                          placeholder={
                            existingCost == null
                              ? "กรอกต้นทุนใหม่"
                              : `ไม่แก้ไข (ใช้ ฿${Number(
                                  existingCost
                                ).toLocaleString()})`
                          }
                          className="mt-1 block w-full rounded-lg border border-brand-green-100 bg-brand-surface px-2.5 py-2 text-sm font-black text-brand-ink outline-none focus:border-brand-green disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <span className={`mt-1 block text-[10px] font-black ${
                          profit == null
                            ? "text-brand-ink-soft"
                            : profit >= 0
                              ? "text-brand-green"
                              : "text-rose-500"
                        }`}>
                          กำไรใหม่:{" "}
                          {profit == null
                            ? "—"
                            : `฿${profit.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCostEditorOpen(false)}
                  disabled={bulkUpdating}
                  className="rounded-xl border border-brand-green-100 bg-brand-paper px-4 py-2.5 text-sm font-black text-brand-ink-soft hover:text-brand-green disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulkCosts}
                  disabled={bulkUpdating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-black text-white shadow-md shadow-brand-green/20 hover:bg-brand-green-600 disabled:opacity-60"
                >
                  {bulkUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  บันทึกต้นทุน
                </button>
              </div>
            </section>
          )}
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
                  <TableHead className="py-3 px-3 whitespace-nowrap">ลูกค้ากดจองเมื่อ</TableHead>
                  <TableHead className="py-3 px-4 text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((b) => {
                  return (
                    <React.Fragment key={b.id}>
                      <TableRow
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
                          {[b.recipientFirstName, b.recipientLastName].filter(Boolean).join(" ") || b.username}
                        </div>
                        <div className="text-[10.5px] text-brand-green font-black">
                          @{b.username}
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
                        <div className="mt-0.5 text-[10.5px] font-black text-brand-green">
                          จำนวน {b.quantity || 1} ชิ้น
                        </div>
                        {(b.bookingWindowStart || b.bookingTime) && (
                          <div className="mt-0.5 text-[10.5px] text-brand-ink-soft font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            เปิดรับ:{" "}
                            {b.bookingWindowStart && b.bookingWindowEnd
                              ? `${b.bookingWindowStart}–${b.bookingWindowEnd} น.`
                              : `${b.bookingTime} น.`}
                          </div>
                        )}
                        {b.topupRoundName && (
                          <div className="mt-0.5 text-[10.5px] font-black text-brand-green">
                            รอบเติม: {b.topupRoundName}{" "}
                            {b.topupRoundStart && b.topupRoundEnd
                              ? `${b.topupRoundStart}–${b.topupRoundEnd} น.`
                              : ""}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-right whitespace-nowrap font-extrabold text-brand-green">
                        ฿{Number(b.price).toLocaleString()}
                        <div className="text-[9.5px] font-bold text-brand-ink-soft">
                          ต้นทุน:{" "}
                          {effectiveBookingCost(b) == null
                            ? "ยังไม่ระบุ"
                            : `฿${Number(
                                effectiveBookingCost(b)
                              ).toLocaleString()}`}
                        </div>
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
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleOrderDetails(b.id)}
                            title="ดูรายละเอียดออเดอร์"
                            aria-expanded={expandedIds.has(b.id)}
                            className="w-8 h-8 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:border-brand-green hover:text-brand-green flex items-center justify-center transition cursor-pointer"
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${
                                expandedIds.has(b.id) ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditBooking(b)}
                            disabled={bulkUpdating || b.status === "สำเร็จ"}
                            title={
                              b.status === "สำเร็จ"
                                ? "รายการสำเร็จแล้ว ข้อมูลถูกล็อก"
                                : "แก้ข้อมูลผู้จองและต้นทุน"
                            }
                            className="w-8 h-8 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:border-brand-green hover:text-brand-green flex items-center justify-center transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(b)}
                            disabled={bulkUpdating || deletingId === b.id}
                            className="w-8 h-8 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:border-rose-400 hover:bg-rose-500/10 hover:text-rose-400 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                          >
                            {deletingId === b.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      </TableRow>
                      {expandedIds.has(b.id) && (
                        <TableRow className="bg-brand-paper/60 hover:bg-brand-paper/60">
                          <TableCell colSpan={8} className="px-4 py-3">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div className="rounded-xl border border-brand-green-100 bg-brand-surface p-3">
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-brand-ink-soft">
                                  <MapPin className="h-3.5 w-3.5 text-brand-green" />
                                  ที่อยู่ Snapshot
                                </div>
                                <p className="mt-1.5 text-xs font-bold leading-relaxed text-brand-ink">
                                  {formatDeliveryAddress(b) || "ไม่ได้ระบุที่อยู่"}
                                </p>
                              </div>
                              <div className="rounded-xl border border-brand-green-100 bg-brand-surface p-3">
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-brand-ink-soft">
                                  <StickyNote className="h-3.5 w-3.5 text-brand-gold-deep" />
                                  หมายเหตุของลูกค้า
                                </div>
                                <p className="mt-1.5 text-xs font-bold leading-relaxed text-brand-ink">
                                  {b.content?.trim() || "ไม่มีหมายเหตุ"}
                                </p>
                              </div>
                              <div className="rounded-xl border border-brand-green-100 bg-brand-surface p-3">
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-brand-ink-soft">
                                  <Clock className="h-3.5 w-3.5 text-brand-green" />
                                  ข้อมูลเวลา Snapshot
                                </div>
                                <p className="mt-1.5 text-xs font-bold leading-relaxed text-brand-ink">
                                  ลูกค้ากดจองเมื่อ: {formatBookingDateTime(b.createdAt)}
                                  <br />
                                  เปิดรับ:{" "}
                                  {b.bookingWindowStart && b.bookingWindowEnd
                                    ? `${b.bookingWindowStart}–${b.bookingWindowEnd} น.`
                                    : `${b.bookingTime || "—"} น.`}
                                  <br />
                                  รอบเติม:{" "}
                                  <span className="font-black text-brand-green">
                                    {b.topupRoundName || "ไม่กำหนดรอบเติม"}
                                    {b.topupRoundStart && b.topupRoundEnd
                                      ? ` ${b.topupRoundStart}–${b.topupRoundEnd} น.`
                                      : ""}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
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
                  <div className="mt-0.5 text-[10.5px] font-black text-brand-green">
                    จำนวน {b.quantity || 1} ชิ้น
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-brand-ink-soft">
                    <UserRound className="h-3 w-3" />
                    {[b.recipientFirstName, b.recipientLastName].filter(Boolean).join(" ") || b.username}
                    <Phone className="ml-1 h-3 w-3" />
                    {b.phone}
                  </div>
                  <div className="mt-0.5 text-[10.5px] font-black text-brand-green">
                    @{b.username}
                  </div>
                  <div className="mt-1.5 rounded-lg bg-brand-paper px-2 py-1.5 text-[10.5px] font-bold text-brand-ink-soft">
                    รอบเติม:{" "}
                    <span className="font-black text-brand-green">
                      {b.topupRoundName || "ไม่กำหนดรอบเติม"}
                      {b.topupRoundStart && b.topupRoundEnd
                        ? ` ${b.topupRoundStart}–${b.topupRoundEnd} น.`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px]">
                    <span className="font-extrabold text-brand-green">
                      ฿{Number(b.price).toLocaleString()}
                    </span>
                    <span className="text-brand-ink-soft font-bold inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      กดจองเมื่อ {formatBookingDateTime(b.createdAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleOrderDetails(b.id)}
                    aria-expanded={expandedIds.has(b.id)}
                    className="mt-2 flex w-full items-center justify-between rounded-lg border border-brand-green-100 bg-brand-paper px-3 py-2 text-[11px] font-black text-brand-ink-soft hover:text-brand-green"
                  >
                    ดูรายละเอียดออเดอร์
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        expandedIds.has(b.id) ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedIds.has(b.id) && (
                    <div className="mt-2 space-y-2 rounded-xl border border-brand-green-100 bg-brand-paper p-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-brand-ink-soft">
                          <MapPin className="h-3.5 w-3.5 text-brand-green" />
                          ที่อยู่ Snapshot
                        </div>
                        <p className="mt-1 text-[11px] font-bold leading-relaxed text-brand-ink">
                          {formatDeliveryAddress(b) || "ไม่ได้ระบุที่อยู่"}
                        </p>
                      </div>
                      <div className="border-t border-brand-green-100/70 pt-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-brand-ink-soft">
                          <StickyNote className="h-3.5 w-3.5 text-brand-gold-deep" />
                          หมายเหตุของลูกค้า
                        </div>
                        <p className="mt-1 text-[11px] font-bold leading-relaxed text-brand-ink">
                          {b.content?.trim() || "ไม่มีหมายเหตุ"}
                        </p>
                      </div>
                      <div className="border-t border-brand-green-100/70 pt-2 text-[11px] font-bold text-brand-ink">
                        ลูกค้ากดจองเมื่อ: {formatBookingDateTime(b.createdAt)}
                        <br />
                        เปิดรับ:{" "}
                        {b.bookingWindowStart && b.bookingWindowEnd
                          ? `${b.bookingWindowStart}–${b.bookingWindowEnd} น.`
                          : `${b.bookingTime || "—"} น.`}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-1.5 mt-2.5">
                    <StatusSelector
                      value={b.status}
                      onChange={(s) => handleStatusChange(b, s)}
                      disabled={bulkUpdating || updatingId === b.id}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => openEditBooking(b)}
                      disabled={bulkUpdating || b.status === "สำเร็จ"}
                      title="แก้ข้อมูลผู้จองและต้นทุน"
                      className="w-10 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:text-brand-green inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
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

      {editingBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-booking-title"
        >
          <form
            onSubmit={handleSaveEdit}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-brand-green-100 bg-brand-surface p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="edit-booking-title"
                  className="font-display text-xl font-black text-brand-ink"
                >
                  {editTargetStatus === "สำเร็จ"
                    ? "ตรวจสอบก่อนทำรายการสำเร็จ"
                    : "แก้ข้อมูลรายการจอง"}
                </h2>
                <p className="mt-1 text-xs font-bold text-brand-ink-soft">
                  {editingBooking.bookingCode} · ข้อมูลที่แก้จะเปลี่ยนเฉพาะ
                  Snapshot ของออเดอร์นี้
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditBooking}
                disabled={savingEdit}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-brand-green-100 bg-brand-paper text-brand-ink-soft transition hover:text-brand-green disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-brand-green-100 bg-brand-paper p-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-brand-ink-soft">
                  ช่วงเวลาเปิดรับจอง
                </p>
                <p className="mt-1 text-sm font-black text-brand-ink">
                  {editingBooking.bookingWindowStart &&
                  editingBooking.bookingWindowEnd
                    ? `${editingBooking.bookingWindowStart}–${editingBooking.bookingWindowEnd} น.`
                    : `${editingBooking.bookingTime || "—"} น.`}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-brand-ink-soft">
                  รอบเติม Snapshot
                </p>
                <p className="mt-1 text-sm font-black text-brand-green">
                  {editingBooking.topupRoundName || "ไม่กำหนดรอบเติม"}
                  {editingBooking.topupRoundStart &&
                  editingBooking.topupRoundEnd
                    ? ` · ${editingBooking.topupRoundStart}–${editingBooking.topupRoundEnd} น.`
                    : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-xs font-black text-brand-ink">
                ชื่อจริง
                <input
                  value={editForm.firstName}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  maxLength={120}
                  className="mt-2 w-full rounded-xl border border-brand-green-100 bg-brand-paper px-3 py-2.5 text-sm font-semibold outline-none focus:border-brand-green"
                />
              </label>
              <label className="text-xs font-black text-brand-ink">
                นามสกุล
                <input
                  value={editForm.lastName}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  maxLength={120}
                  className="mt-2 w-full rounded-xl border border-brand-green-100 bg-brand-paper px-3 py-2.5 text-sm font-semibold outline-none focus:border-brand-green"
                />
              </label>
              <label className="text-xs font-black text-brand-ink">
                เบอร์โทรศัพท์
                <input
                  required
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-brand-green-100 bg-brand-paper px-3 py-2.5 text-sm font-semibold outline-none focus:border-brand-green"
                />
              </label>
              <label className="text-xs font-black text-brand-ink">
                ต้นทุนบัตรเงินสดที่ใช้จริง (แก้ไขได้)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editForm.cost}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      cost: event.target.value,
                    }))
                  }
                  placeholder={
                    editingBooking &&
                    effectiveBookingCost(editingBooking) != null
                      ? `เว้นว่างเพื่อใช้ ฿${Number(
                          effectiveBookingCost(editingBooking)
                        ).toLocaleString()}`
                      : "เว้นว่างเพื่อใช้ต้นทุนสินค้า"
                  }
                  className="mt-2 w-full rounded-xl border border-brand-green-100 bg-brand-paper px-3 py-2.5 text-sm font-semibold outline-none focus:border-brand-green"
                />
                <span className="mt-1 block text-[10px] font-bold text-brand-ink-soft">
                  ระบบดึงจากต้นทุนสินค้าให้อัตโนมัติ แก้เฉพาะเมื่อใช้ต้นทุนจริงต่างจากเดิม
                </span>
              </label>
              <label className="text-xs font-black text-brand-ink sm:col-span-2">
                บ้านเลขที่ หมู่ ซอย ถนน อาคาร หรือรายละเอียดเพิ่มเติม
                <textarea
                  rows={2}
                  value={editForm.addressLine}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      addressLine: event.target.value,
                    }))
                  }
                  maxLength={1000}
                  className="mt-2 w-full resize-none rounded-xl border border-brand-green-100 bg-brand-paper px-3 py-2.5 text-sm font-semibold outline-none focus:border-brand-green"
                />
              </label>
              {(
                [
                  ["subdistrict", "ตำบล / แขวง"],
                  ["district", "อำเภอ / เขต"],
                  ["province", "จังหวัด"],
                  ["postalCode", "รหัสไปรษณีย์"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="text-xs font-black text-brand-ink">
                  {label}
                  <input
                    value={editForm[field]}
                    inputMode={field === "postalCode" ? "numeric" : undefined}
                    maxLength={field === "postalCode" ? 5 : 120}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        [field]:
                          field === "postalCode"
                            ? event.target.value.replace(/\D/g, "").slice(0, 5)
                            : event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-brand-green-100 bg-brand-paper px-3 py-2.5 text-sm font-semibold outline-none focus:border-brand-green"
                  />
                </label>
              ))}
              <label className="text-xs font-black text-brand-ink sm:col-span-2">
                หมายเหตุของลูกค้า
                <textarea
                  rows={3}
                  value={editForm.content}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  maxLength={500}
                  className="mt-2 w-full resize-none rounded-xl border border-brand-green-100 bg-brand-paper px-3 py-2.5 text-sm font-semibold outline-none focus:border-brand-green"
                />
              </label>
            </div>

            {editTargetStatus === "สำเร็จ" && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-extrabold text-amber-500">
                ตรวจสอบชื่อ ที่อยู่ เบอร์โทร และต้นทุนจริงให้ถูกต้อง
                หลังบันทึกสถานะสำเร็จข้อมูลส่วนนี้จะถูกล็อก
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditBooking}
                disabled={savingEdit}
                className="rounded-xl border border-brand-green-100 bg-brand-paper px-5 py-2.5 text-sm font-black text-brand-ink-soft transition hover:text-brand-green disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-black text-white shadow-md shadow-brand-green/25 transition hover:bg-brand-green-600 disabled:opacity-60"
              >
                {savingEdit ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {editTargetStatus === "สำเร็จ"
                  ? "บันทึกและทำรายการสำเร็จ"
                  : "บันทึกข้อมูล"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
