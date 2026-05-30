"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  RefreshCw,
  Trash2,
  Pencil,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  Save,
  CalendarDays,
} from "lucide-react";
import { accountsApi } from "@/lib/eden";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";

interface AccountRow {
  id: number;
  date: string;
  description: string | null;
  category: "รายรับ" | "รายจ่าย" | string;
  income: string;
  expense: string;
  createdAt: string;
}

interface Summary {
  totalIncome: string;
  totalExpense: string;
  balance: string;
}

const fmt = (v: string | number) =>
  Number(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
};

export default function FinancePage() {
  const [items, setItems] = useState<AccountRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalIncome: "0",
    totalExpense: "0",
    balance: "0",
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "รายรับ" | "รายจ่าย">("all");
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await accountsApi.collection.api.v1.accounts.get();
    if (error) {
      toast.error("โหลดไม่สำเร็จ");
      setLoading(false);
      return;
    }
    if (data.ok) {
      setItems(data.data);
      setSummary(data.summary);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const handleDelete = async (a: AccountRow) => {
    if (!confirm("ลบรายการนี้?")) return;
    setDeletingId(a.id);
    const tId = toast.loading("กำลังลบ...");
    const { data, error } = await accountsApi.item.api.v1
      .accounts({ id: String(a.id) })
      .delete();
    setDeletingId(null);
    if (error) {
      const v = error.value as { message?: string } | undefined;
      toast.error("ลบไม่สำเร็จ", { id: tId, description: v?.message });
      return;
    }
    toast.success(data.message ?? "ลบแล้ว", { id: tId });
    load();
  };

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((a) => a.category === filter);
  }, [items, filter]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display font-black text-xl sm:text-2xl text-brand-ink">
            บัญชีรับ-จ่าย
          </h1>
          <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
            ทั้งหมด <b className="text-brand-green">{items.length}</b> รายการ
            {filtered.length !== items.length && (
              <> · กรองได้ <b className="text-brand-green">{filtered.length}</b></>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer self-start"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          เพิ่มรายการ
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-green-50 text-brand-green flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] font-extrabold text-brand-ink-soft uppercase">รายรับรวม</p>
            <p className="font-display font-black text-lg text-brand-green leading-tight">
              ฿{fmt(summary.totalIncome)}
            </p>
          </div>
        </div>
        <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] font-extrabold text-brand-ink-soft uppercase">รายจ่ายรวม</p>
            <p className="font-display font-black text-lg text-rose-400 leading-tight">
              ฿{fmt(summary.totalExpense)}
            </p>
          </div>
        </div>
        <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-gold/15 text-brand-gold-deep flex items-center justify-center flex-shrink-0">
            <Wallet className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] font-extrabold text-brand-ink-soft uppercase">คงเหลือ</p>
            <p className={`font-display font-black text-lg leading-tight ${Number(summary.balance) >= 0 ? "text-brand-gold-deep" : "text-rose-400"}`}>
              ฿{fmt(summary.balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 mb-4 bg-brand-surface border border-brand-green-100 rounded-xl p-1 inline-flex">
        {(["all", "รายรับ", "รายจ่าย"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-4 py-1.5 rounded-lg text-[11.5px] font-extrabold transition cursor-pointer ${
              filter === k
                ? "bg-brand-green text-white shadow-sm"
                : "text-brand-ink-soft hover:text-brand-green"
            }`}
          >
            {k === "all" ? "ทั้งหมด" : k}
          </button>
        ))}
        <button
          onClick={load}
          disabled={loading}
          className="px-2 py-1.5 rounded-lg text-brand-ink-soft hover:text-brand-green cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
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
            ไม่มีรายการ
          </p>
        </div>
      ) : (
        <>
          <div className="bg-brand-surface border border-brand-green-100 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4 whitespace-nowrap">วันที่</TableHead>
                  <TableHead className="py-3 px-3">รายละเอียด</TableHead>
                  <TableHead className="py-3 px-3 text-center">ประเภท</TableHead>
                  <TableHead className="py-3 px-3 text-right whitespace-nowrap">รายรับ</TableHead>
                  <TableHead className="py-3 px-3 text-right whitespace-nowrap">รายจ่าย</TableHead>
                  <TableHead className="py-3 px-4 text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((a) => {
                  const isIncome = a.category === "รายรับ";
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="py-3 px-4 whitespace-nowrap text-[12px] font-bold text-brand-ink-soft inline-flex items-center gap-1.5 border-0">
                        <CalendarDays className="h-3 w-3" />
                        {fmtDate(a.date)}
                      </TableCell>
                      <TableCell className="py-3 px-3 font-bold text-brand-ink line-clamp-1">
                        {a.description || <span className="text-brand-ink-soft/60 font-normal">—</span>}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-center">
                        <span className={`inline-block text-[11px] font-black px-2 py-0.5 rounded-full ${
                          isIncome
                            ? "bg-brand-green-50 text-brand-green"
                            : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {a.category}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-right whitespace-nowrap font-extrabold text-brand-green">
                        {Number(a.income) > 0 ? fmt(a.income) : "—"}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-right whitespace-nowrap font-extrabold text-rose-400">
                        {Number(a.expense) > 0 ? fmt(a.expense) : "—"}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => {
                              setEditing(a);
                              setModalOpen(true);
                            }}
                            className="w-8 h-8 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:border-brand-green hover:text-brand-green flex items-center justify-center cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(a)}
                            disabled={deletingId === a.id}
                            className="w-8 h-8 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:border-rose-400 hover:text-rose-400 flex items-center justify-center cursor-pointer disabled:opacity-50"
                          >
                            {deletingId === a.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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

      {/* Modal */}
      {modalOpen && (
        <AccountModal
          initial={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditing(null);
            load();
          }}
        />
      )}
    </main>
  );
}

/* ── Modal ── */
function AccountModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: AccountRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(initial?.date ? initial.date.slice(0, 10) : today);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<"รายรับ" | "รายจ่าย">(
    (initial?.category as "รายรับ" | "รายจ่าย") ?? "รายรับ"
  );
  const [amount, setAmount] = useState(
    String(initial ? (Number(initial.income) > 0 ? initial.income : initial.expense) : "0")
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const tId = toast.loading(initial ? "กำลังบันทึก..." : "กำลังเพิ่ม...");
    const payload = {
      date,
      description: description || undefined,
      category,
      income: category === "รายรับ" ? Number(amount) : 0,
      expense: category === "รายจ่าย" ? Number(amount) : 0,
    };
    const res = initial
      ? await accountsApi.item.api.v1.accounts({ id: String(initial.id) }).patch(payload)
      : await accountsApi.collection.api.v1.accounts.post(payload);
    setSaving(false);
    if (res.error) {
      const v = res.error.value as { message?: string } | undefined;
      toast.error("บันทึกไม่สำเร็จ", { id: tId, description: v?.message });
      return;
    }
    toast.success(res.data.message ?? "สำเร็จ", { id: tId });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-brand-surface-soft border border-brand-green-100 rounded-t-3xl sm:rounded-3xl shadow-2xl ring-1 ring-brand-green/20 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <header className="flex items-center justify-between p-5 border-b border-brand-green-100/60">
          <h3 className="font-display font-black text-lg text-brand-ink">
            {initial ? "แก้ไขรายการ" : "เพิ่มรายการ"}
          </h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-brand-surface border border-brand-green-100 flex items-center justify-center text-brand-ink-soft hover:text-brand-green cursor-pointer">
            <X className="h-4.5 w-4.5" />
          </button>
        </header>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">วันที่</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink" />
          </div>

          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">ประเภท</label>
            <div className="grid grid-cols-2 gap-2">
              {(["รายรับ", "รายจ่าย"] as const).map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`py-3 rounded-xl font-extrabold text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      active
                        ? c === "รายรับ"
                          ? "bg-brand-green text-white shadow-md shadow-brand-green/30"
                          : "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                        : "bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:text-brand-green"
                    }`}
                  >
                    {c === "รายรับ" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">จำนวนเงิน (บาท)</label>
            <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink" />
          </div>

          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">หมายเหตุ (ไม่บังคับ)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="รายละเอียด..." className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink" />
          </div>
        </div>

        <footer className="flex gap-3 p-5 border-t border-brand-green-100/60">
          <button onClick={onClose} disabled={saving} className="flex-1 py-3 rounded-xl font-extrabold text-sm border border-brand-coral/40 bg-brand-coral/10 text-brand-coral hover:bg-brand-coral/20 cursor-pointer disabled:opacity-60">
            ยกเลิก
          </button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {initial ? "บันทึก" : "เพิ่ม"}
          </button>
        </footer>
      </div>
    </div>
  );
}
