"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ImageIcon,
  PackageSearch,
  Loader2,
  RefreshCw,
  ArrowUpDown,
  ArrowDownAZ,
  Coins,
  Boxes,
  CalendarDays,
  Users,
  X,
} from "lucide-react";
import { productsApi } from "@/lib/eden";
import type {
  ProductParsed,
  SaleDate,
  TimeSlot,
  DiscountUsername,
} from "@/lib/types/product";
import { ProductFormModal } from "@/components/dashboard/ProductFormModal";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";

/* ─────────────────────────────────────────────
 * Cast raw API response → ProductParsed
 * ─────────────────────────────────────────────
 * NOTE: MariaDB/MySQL JSON columns บางครั้ง Prisma คืนเป็น JSON string
 * (โดยเฉพาะเวอร์ชั่นเก่า) — เลย parse safe ทั้งสองทาง
 */
function parseJSONArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseProduct(p: Record<string, unknown>): ProductParsed {
  return {
    id: p.id as number,
    image: (p.image as string) ?? "",
    name: (p.name as string) ?? "",
    description: (p.description as string) ?? "",
    price: (p.price as string) ?? "0",
    cost: (p.cost as string) ?? "0",
    agentPrice: (p.agentPrice as string) ?? "0",
    stockEnabled: (p.stockEnabled as boolean) ?? false,
    stock: (p.stock as number) ?? 0,
    maxPerUserPerDay: (p.maxPerUserPerDay as number) ?? 0,
    saleDates: parseJSONArray<SaleDate>(p.saleDates),
    timeSlots: parseJSONArray<TimeSlot>(p.timeSlots),
    discountEligibleUsernames: parseJSONArray<DiscountUsername>(
      p.discountEligibleUsernames
    ),
    discountAmount: (p.discountAmount as string) ?? "0",
    note: (p.note as string | null) ?? null,
    createdAt: new Date(p.createdAt as string),
    updatedAt: new Date(p.updatedAt as string),
  };
}

const fmtMoney = (v: string | number) =>
  Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 });

const fmtDate = (d: Date) =>
  d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });

type SortKey = "newest" | "oldest" | "name" | "price";

const SORT_LABEL: Record<SortKey, string> = {
  newest: "ใหม่ล่าสุด",
  oldest: "เก่าสุด",
  name: "ชื่อ A→Z",
  price: "ราคา ต่ำ→สูง",
};

export default function ManagePage() {
  const [items, setItems] = useState<ProductParsed[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductParsed | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* ─── load list ─── */
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await productsApi.collection.api.v1.products.get();
    if (error) {
      const status = error.status;
      const value = error.value as { message?: string } | undefined;
      if (status === 401) toast.error("กรุณาเข้าสู่ระบบ");
      else if (status === 403) toast.error("ต้องเป็นแอดมินเท่านั้น");
      else toast.error(value?.message ?? `โหลดไม่สำเร็จ (${status})`);
      setLoading(false);
      return;
    }
    if (data.ok) {
      setItems((data.data as Record<string, unknown>[]).map(parseProduct));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to first page when search or sortKey changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortKey]);

  /* ─── delete ─── */
  const handleDelete = async (p: ProductParsed) => {
    if (!confirm(`ลบ "${p.name}" จริงหรือไม่?`)) return;
    setDeletingId(p.id);
    const id = toast.loading("กำลังลบ...");
    const { data, error } = await productsApi.item.api.v1
      .products({ id: String(p.id) })
      .delete();
    setDeletingId(null);
    if (error) {
      const value = error.value as { message?: string } | undefined;
      toast.error("ลบไม่สำเร็จ", { id, description: value?.message });
      return;
    }
    toast.success(data.message ?? "ลบแล้ว", { id });
    setItems((prev) => prev.filter((x) => x.id !== p.id));
  };

  /* ─── filter + sort ─── */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? items.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        )
      : [...items];

    switch (sortKey) {
      case "newest":
        return filtered.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
      case "oldest":
        return filtered.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );
      case "name":
        return filtered.sort((a, b) => a.name.localeCompare(b.name, "th"));
      case "price":
        return filtered.sort((a, b) => Number(a.price) - Number(b.price));
      default:
        return filtered;
    }
  }, [items, search, sortKey]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, currentPage, pageSize]);

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display font-black text-xl sm:text-2xl text-brand-ink">
            จัดการสินค้า
          </h1>
          <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
            ทั้งหมด <b className="text-brand-green">{items.length}</b> รายการ
            {search && (
              <>
                {" "}· พบ <b className="text-brand-green">{visible.length}</b> จากค้นหา
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer self-start"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          เพิ่มสินค้า
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-3 mb-4 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-brand-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อสินค้า หรือ คำอธิบาย..."
            className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 pl-9 pr-9 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 w-6 h-6 rounded-full bg-brand-surface text-brand-ink-soft hover:text-brand-green flex items-center justify-center cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setSortMenuOpen(!sortMenuOpen)}
            onBlur={() => setTimeout(() => setSortMenuOpen(false), 150)}
            className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2 px-3.5 py-2.5 rounded-xl border border-brand-green-100 bg-brand-paper text-sm font-extrabold text-brand-ink-soft hover:border-brand-green hover:text-brand-green transition cursor-pointer"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span>{SORT_LABEL[sortKey]}</span>
          </button>
          {sortMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-brand-surface-soft border border-brand-green-100 rounded-xl shadow-2xl ring-1 ring-brand-green/15 p-1 z-10 animate-in fade-in slide-in-from-top-1 duration-150">
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <button
                  key={k}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSortKey(k);
                    setSortMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
                    sortKey === k
                      ? "bg-brand-green-50 text-brand-green"
                      : "text-brand-ink-soft hover:bg-brand-green-50/60 hover:text-brand-green"
                  }`}
                >
                  {k === "name" ? (
                    <ArrowDownAZ className="h-3.5 w-3.5" />
                  ) : k === "price" ? (
                    <Coins className="h-3.5 w-3.5" />
                  ) : (
                    <CalendarDays className="h-3.5 w-3.5" />
                  )}
                  {SORT_LABEL[k]}
                </button>
              ))}
            </div>
          )}
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

      {/* States */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-ink-soft">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="font-bold">กำลังโหลด...</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-brand-surface border border-brand-green-100 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-green-50 flex items-center justify-center mb-3">
            <PackageSearch className="h-7 w-7 text-brand-green" />
          </div>
          <p className="font-display font-black text-base text-brand-ink mb-1">
            {search ? "ไม่พบสินค้าที่ค้นหา" : "ยังไม่มีสินค้า"}
          </p>
          <p className="text-xs text-brand-ink-soft font-bold">
            {search
              ? "ลองคำค้นอื่น"
              : "กดปุ่ม 'เพิ่มสินค้า' เพื่อสร้างรายการแรก"}
          </p>
        </div>
      ) : (
        <>
          {/* ─── DESKTOP TABLE (md+) ─── */}
          <div className="hidden md:block bg-brand-surface border border-brand-green-100 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4 w-20">รูป</TableHead>
                  <TableHead className="py-3 px-3 min-w-[180px]">สินค้า</TableHead>
                  <TableHead className="py-3 px-3 text-right whitespace-nowrap">ราคา ฿</TableHead>
                  <TableHead className="py-3 px-3 text-right whitespace-nowrap">Agent ฿</TableHead>
                  <TableHead className="py-3 px-3 text-center">สต็อก</TableHead>
                  <TableHead className="py-3 px-3 text-center whitespace-nowrap">ตารางขาย</TableHead>
                  <TableHead className="py-3 px-3 text-center">VIP</TableHead>
                  <TableHead className="py-3 px-3 whitespace-nowrap">เพิ่มเมื่อ</TableHead>
                  <TableHead className="py-3 px-4 text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((p) => (
                  <TableRow key={p.id}>
                    {/* รูป */}
                    <TableCell className="py-3 px-4 border-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-brand-paper border border-brand-green-100">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-brand-ink-soft">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {/* ชื่อ + desc */}
                    <TableCell className="py-3 px-3">
                      <div className="font-display font-extrabold text-[13.5px] text-brand-ink line-clamp-1">
                        {p.name}
                      </div>
                      {p.description && (
                        <div className="text-[11.5px] text-brand-ink-soft font-medium line-clamp-1">
                          {p.description}
                        </div>
                      )}
                    </TableCell>
                    {/* ราคา */}
                    <TableCell className="py-3 px-3 text-right font-extrabold text-brand-green whitespace-nowrap">
                      {fmtMoney(p.price)}
                    </TableCell>
                    {/* Agent */}
                    <TableCell className="py-3 px-3 text-right font-bold text-brand-gold-deep whitespace-nowrap">
                      {fmtMoney(p.agentPrice)}
                    </TableCell>
                    {/* สต็อก */}
                    <TableCell className="py-3 px-3 text-center">
                      {p.stockEnabled ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black ${
                            p.stock > 0
                              ? "bg-brand-green-50 text-brand-green"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          <Boxes className="h-3 w-3" />
                          {p.stock}
                        </span>
                      ) : (
                        <span className="text-[11px] text-brand-ink-soft/60 font-bold">
                          ∞
                        </span>
                      )}
                    </TableCell>
                    {/* ตารางขาย */}
                    <TableCell className="py-3 px-3 text-center text-[11px] font-bold text-brand-ink-soft whitespace-nowrap">
                      {p.saleDates.length > 0 || p.timeSlots.length > 0 ? (
                        <>
                          <span className="text-brand-ink font-black">
                            {p.saleDates.length}
                          </span>
                          <span className="text-brand-ink-soft/60"> วัน · </span>
                          <span className="text-brand-ink font-black">
                            {p.timeSlots.length}
                          </span>
                          <span className="text-brand-ink-soft/60"> ช่วง</span>
                        </>
                      ) : (
                        <span className="text-brand-ink-soft/60">—</span>
                      )}
                    </TableCell>
                    {/* VIP */}
                    <TableCell className="py-3 px-3 text-center">
                      {p.discountEligibleUsernames.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                          <Users className="h-3 w-3" />
                          {p.discountEligibleUsernames.length}
                        </span>
                      ) : (
                        <span className="text-brand-ink-soft/60">—</span>
                      )}
                    </TableCell>
                    {/* เพิ่มเมื่อ */}
                    <TableCell className="py-3 px-3 text-[11.5px] font-bold text-brand-ink-soft whitespace-nowrap">
                      {fmtDate(p.createdAt)}
                    </TableCell>
                    {/* Actions */}
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => {
                            setEditing(p);
                            setModalOpen(true);
                          }}
                          className="w-8 h-8 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:border-brand-green hover:bg-brand-green-50 hover:text-brand-green flex items-center justify-center transition cursor-pointer"
                          aria-label="แก้ไข"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deletingId === p.id}
                          className="w-8 h-8 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:border-rose-400 hover:bg-rose-500/10 hover:text-rose-400 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                          aria-label="ลบ"
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ─── MOBILE CARD LIST (< md) ─── */}
          <div className="md:hidden space-y-3">
            {paginatedItems.map((p) => (
              <article
                key={p.id}
                className="bg-brand-surface border border-brand-green-100 rounded-2xl p-3 flex gap-3 shadow-xs"
              >
                {/* รูป */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-brand-paper border border-brand-green-100 flex-shrink-0">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-ink-soft">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>

                {/* ข้อมูล */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-extrabold text-sm text-brand-ink line-clamp-1">
                      {p.name}
                    </h3>
                    <span className="text-[10px] text-brand-ink-soft/70 font-bold whitespace-nowrap flex-shrink-0">
                      {fmtDate(p.createdAt)}
                    </span>
                  </div>
                  {p.description && (
                    <p className="text-[11px] text-brand-ink-soft font-medium line-clamp-1 mt-0.5">
                      {p.description}
                    </p>
                  )}

                  {/* Price + meta */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-extrabold text-brand-green">
                      <Coins className="h-3 w-3" />
                      {fmtMoney(p.price)}฿
                    </span>
                    <span className="text-[10.5px] font-bold text-brand-gold-deep">
                      VIP {fmtMoney(p.agentPrice)}฿
                    </span>
                    {p.stockEnabled && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                          p.stock > 0
                            ? "bg-brand-green-50 text-brand-green"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        <Boxes className="h-2.5 w-2.5" />
                        {p.stock}
                      </span>
                    )}
                    {p.discountEligibleUsernames.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                        <Users className="h-2.5 w-2.5" />
                        {p.discountEligibleUsernames.length}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 mt-2.5">
                    <button
                      onClick={() => {
                        setEditing(p);
                        setModalOpen(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-extrabold bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green transition cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" />
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={deletingId === p.id}
                      className="w-9 inline-flex items-center justify-center rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:border-rose-400 hover:bg-rose-500/10 hover:text-rose-400 transition cursor-pointer disabled:opacity-50"
                    >
                      {deletingId === p.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={visible.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {/* Modal */}
      <ProductFormModal
        open={modalOpen}
        initial={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={load}
      />
    </main>
  );
}
