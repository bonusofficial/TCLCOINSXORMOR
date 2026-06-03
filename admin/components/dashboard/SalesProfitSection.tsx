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

interface SalesRow {
  id: number;
  bookingCode: string;
  productName: string;
  username: string;
  salePrice: string;
  cost: string;
  profit: string;
  completedAt: string;
  bookingDate: string;
  bookingTime: string | null;
}

interface SalesSummary {
  todayProfit: string;
  todaySales: string;
  todayCount: number;
  totalProfit: string;
  totalSales: string;
  totalCost: string;
  count: number;
}

const fmt = (v: string | number) =>
  Number(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function SalesProfitSection() {
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      setSummary(data.summary);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const handleExport = () => {
    const headers = [
      "วันที่",
      "สินค้า",
      "ราคาขาย",
      "ต้นทุน",
      "กำไร",
      "ลูกค้า",
      "รหัสจอง",
    ];
    const body = rows.map((r) => [
      fmtDateTime(r.completedAt),
      r.productName,
      r.salePrice,
      r.cost,
      r.profit,
      r.username,
      r.bookingCode,
    ]);
    const csv =
      "﻿" +
      [headers, ...body]
        .map((row) =>
          row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales_profit_${new Date().toISOString().slice(0, 10)}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("ส่งออกข้อมูลสำเร็จ", {
      description: `ดาวน์โหลดเรียบร้อย (${rows.length} รายการ)`,
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {/* กำไรวันนี้ — เด่นสุด */}
        <div className="bg-gradient-to-br from-brand-green to-brand-green-700 rounded-2xl p-4 text-white shadow-lg shadow-brand-green/20">
          <p className="text-[10.5px] font-extrabold uppercase opacity-90 inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> กำไรวันนี้
          </p>
          <p className="font-display font-black text-xl leading-tight mt-1">
            ฿{fmt(summary?.todayProfit ?? 0)}
          </p>
          <p className="text-[10.5px] font-bold opacity-90 mt-0.5">
            {summary?.todayCount ?? 0} ออเดอร์ · ยอดขาย ฿{fmt(summary?.todaySales ?? 0)}
          </p>
        </div>

        <SummaryCard
          label="ยอดขายรวม"
          value={summary?.totalSales ?? "0"}
          icon={<TrendingUp className="h-5 w-5" strokeWidth={2.5} />}
          tone="green"
        />
        <SummaryCard
          label="ต้นทุนรวม"
          value={summary?.totalCost ?? "0"}
          icon={<Coins className="h-5 w-5" strokeWidth={2.5} />}
          tone="rose"
        />
        <SummaryCard
          label="กำไรรวม"
          value={summary?.totalProfit ?? "0"}
          icon={<Wallet className="h-5 w-5" strokeWidth={2.5} />}
          tone="gold"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-brand-ink-soft">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="font-bold">กำลังโหลด...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-brand-surface border border-brand-green-100 rounded-3xl p-10 text-center">
          <Receipt className="h-10 w-10 mx-auto text-brand-green mb-2" />
          <p className="font-display font-black text-base text-brand-ink mb-1">
            ยังไม่มีรายการขายที่สำเร็จ
          </p>
          <p className="text-xs text-brand-ink-soft font-bold">
            เมื่อกด &ldquo;สำเร็จ&rdquo; ในหน้าจองคิว ออเดอร์จะถูกดึงมาคำนวณกำไรที่นี่อัตโนมัติ
          </p>
        </div>
      ) : (
        <>
          <div className="bg-brand-surface border border-brand-green-100 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4 whitespace-nowrap">วันที่</TableHead>
                  <TableHead className="py-3 px-3">สินค้า</TableHead>
                  <TableHead className="py-3 px-3 text-right whitespace-nowrap">ราคาขาย</TableHead>
                  <TableHead className="py-3 px-3 text-right whitespace-nowrap">ต้นทุน</TableHead>
                  <TableHead className="py-3 px-3 text-right whitespace-nowrap">กำไร</TableHead>
                  <TableHead className="py-3 px-4 whitespace-nowrap">ลูกค้า</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((r) => {
                  const profitNum = Number(r.profit);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="py-3 px-4 whitespace-nowrap text-[12px] font-bold text-brand-ink-soft">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3 w-3" />
                          {fmtDateTime(r.completedAt)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3 font-bold text-brand-ink">
                        <span className="line-clamp-1">{r.productName}</span>
                        <span className="text-[10.5px] font-semibold text-brand-ink-soft/70">
                          #{r.bookingCode}
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
                      <TableCell className="py-3 px-4 whitespace-nowrap font-bold text-brand-ink">
                        @{r.username}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={rows.length}
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
