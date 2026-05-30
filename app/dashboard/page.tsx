"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { dashboardApi, auditApi } from "@/lib/eden";
import { ACTION_LABEL, ENTITY_LABEL, actionColor, timeAgo } from "@/lib/audit-labels";
import {
  ScrollText,
  Wallet,
  UsersRound,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  MoreVertical,
  Crown,
  Coins,
  CheckCircle2,
  Clock4,
  Loader2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/* ─────────────────────────────────────────────
 * TYPES
 * ───────────────────────────────────────────── */

interface StatCard {
  label: string;
  value: string;
  suffix?: string;
  delta: number;
  deltaLabel: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color: StatColor;
  sparkline: number[];
}

interface BookingItem {
  id: number;
  bookingCode: string;
  productName: string;
  username: string;
  price: string;
  status: string;
  createdAt: string;
}

interface TopPackage {
  rank: number;
  name: string;
  sold: number;
  revenue: number;
  share: number;
}

interface TopAgent {
  rank: number;
  name: string;
  username: string;
  revenue: number;
  orders: number;
}

interface ChartPoint {
  month: string;
  value: number;
}

type StatColor = "green" | "gold" | "coral" | "sky";

/* ─────────────────────────────────────────────
 * HELPERS
 * ───────────────────────────────────────────── */

const COLOR_TOKENS: Record<StatColor, { iconBg: string; iconText: string; ring: string; accent: string }> = {
  green: { iconBg: "bg-brand-green-50", iconText: "text-brand-green", ring: "ring-brand-green-100", accent: "#39C848" },
  gold: { iconBg: "bg-amber-50", iconText: "text-amber-700", ring: "ring-amber-100", accent: "#F0A800" },
  coral: { iconBg: "bg-rose-50", iconText: "text-rose-600", ring: "ring-rose-100", accent: "#FF6B5B" },
  sky: { iconBg: "bg-sky-50", iconText: "text-sky-700", ring: "ring-sky-100", accent: "#1E88E5" },
};

function smoothPath(pts: { x: number; y: number }[]) {
  if (!pts.length) return "";
  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const dx = (cur.x - prev.x) / 3;
    path += ` C ${prev.x + dx} ${prev.y}, ${cur.x - dx} ${cur.y}, ${cur.x} ${cur.y}`;
  }
  return path;
}

function fmtMoney(n: number) {
  return n.toLocaleString("en-US");
}

/** Time ago in Thai */
function bookingTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อกี้";
  if (mins < 60) return `${mins} นาที`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.`;
  const days = Math.floor(hrs / 24);
  return `${days} วัน`;
}

/** Generate avatar gradient from string */
function avatarGradient(name: string): string {
  const gradients = [
    "linear-gradient(135deg,#FF8A65,#FF7043)",
    "linear-gradient(135deg,#39C848,#128C2E)",
    "linear-gradient(135deg,#42A5F5,#1E88E5)",
    "linear-gradient(135deg,#AB47BC,#8E24AA)",
    "linear-gradient(135deg,#FF7043,#E64A19)",
    "linear-gradient(135deg,#26A69A,#00897B)",
    "linear-gradient(135deg,#5C6BC0,#3949AB)",
    "linear-gradient(135deg,#EC407A,#C2185B)",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

/* ─────────────────────────────────────────────
 * REVENUE CHART CONFIG (shadcn / recharts)
 * ───────────────────────────────────────────── */

const REVENUE_CHART_CONFIG = {
  value: {
    label: "รายได้",
    color: "var(--color-brand-green-600)",
  },
} satisfies ChartConfig;

/* ─────────────────────────────────────────────
 * MINI SPARKLINE
 * ───────────────────────────────────────────── */

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 100, H = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / range) * H * 0.8 - 4,
  }));
  const path = smoothPath(pts);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
 * LOADING SKELETON
 * ───────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <main className="flex-1 px-6 lg:px-8 py-7 space-y-7 max-w-[1480px] w-full mx-auto">
      {/* Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-brand-surface border border-brand-green-100 rounded-[22px] p-5 shadow-sm animate-pulse">
            <div className="w-11 h-11 rounded-2xl bg-brand-green-50 mb-4" />
            <div className="h-3 w-20 bg-brand-green-50 rounded mb-2" />
            <div className="h-7 w-28 bg-brand-green-50 rounded mb-4" />
            <div className="h-px bg-brand-green-100 mb-3" />
            <div className="h-3 w-24 bg-brand-green-50 rounded" />
          </div>
        ))}
      </section>

      {/* Chart + Bookings */}
      <section className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-6">
        <div className="bg-brand-surface border border-brand-green-100 rounded-[24px] p-6 shadow-sm animate-pulse">
          <div className="h-5 w-32 bg-brand-green-50 rounded mb-2" />
          <div className="h-3 w-48 bg-brand-green-50 rounded mb-6" />
          <div className="h-[300px] bg-brand-green-50/40 rounded-xl" />
        </div>
        <div className="bg-brand-surface border border-brand-green-100 rounded-[24px] p-6 shadow-sm animate-pulse">
          <div className="h-5 w-28 bg-brand-green-50 rounded mb-2" />
          <div className="h-3 w-40 bg-brand-green-50 rounded mb-6" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 rounded-full bg-brand-green-50" />
              <div className="flex-1">
                <div className="h-3 w-24 bg-brand-green-50 rounded mb-2" />
                <div className="h-2.5 w-32 bg-brand-green-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom loading indicator */}
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 text-brand-green animate-spin" />
        <span className="ml-2 text-sm font-bold text-brand-ink-soft">กำลังโหลดข้อมูล...</span>
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────────
 * PAGE
 * ───────────────────────────────────────────── */

export default function DashboardPage() {
  const [chartRange, setChartRange] = useState<"year" | "month" | "week">("year");
  const [loading, setLoading] = useState(true);

  // Dashboard data states
  const [statCards, setStatCards] = useState<StatCard[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [recentBookings, setRecentBookings] = useState<BookingItem[]>([]);
  const [topPackages, setTopPackages] = useState<TopPackage[]>([]);
  const [topAgents, setTopAgents] = useState<TopAgent[]>([]);
  const [peakMonth, setPeakMonth] = useState<string>("");

  const fetchDashboard = useCallback(async () => {
    try {
      const { data: resp, error } = await dashboardApi.api.v1.dashboard.get();
      if (error || !resp?.ok) {
        console.error("Dashboard fetch error:", error);
        return;
      }
      const d = resp.data;

      // Build stat cards from real data
      const cards: StatCard[] = [
        {
          label: "รายได้ทั้งหมด",
          value: `฿${fmtMoney(d.stats.revenue.total)}`,
          delta: d.stats.revenue.delta,
          deltaLabel: d.stats.revenue.deltaLabel,
          icon: Wallet,
          color: "green",
          sparkline: d.stats.revenue.sparkline,
        },
        {
          label: "ลูกค้าทั้งหมด",
          value: String(d.stats.members.total),
          suffix: "คน",
          delta: d.stats.members.delta,
          deltaLabel: d.stats.members.deltaLabel,
          icon: UsersRound,
          color: "gold",
          sparkline: d.stats.members.sparkline,
        },
        {
          label: "ตัวแทนทั้งหมด",
          value: String(d.stats.agents.total),
          suffix: "คน",
          delta: d.stats.agents.delta,
          deltaLabel: d.stats.agents.deltaLabel,
          icon: Crown,
          color: "coral",
          sparkline: d.stats.agents.sparkline,
        },
        {
          label: "ออเดอร์วันนี้",
          value: String(d.stats.ordersToday.total),
          suffix: "ออเดอร์",
          delta: d.stats.ordersToday.delta,
          deltaLabel: d.stats.ordersToday.deltaLabel,
          icon: ShoppingBag,
          color: "sky",
          sparkline: d.stats.ordersToday.sparkline,
        },
      ];
      setStatCards(cards);

      // Chart
      setChartData(d.chart);
      const peak = d.chart.reduce((max: ChartPoint, c: ChartPoint) => (c.value > max.value ? c : max), d.chart[0]);
      setPeakMonth(peak?.month ?? "");

      // Recent bookings
      setRecentBookings(d.recentBookings);

      // Top packages
      setTopPackages(d.topPackages);

      // Top agents
      setTopAgents(d.topAgents);
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) return <DashboardSkeleton />;

  // Chart total revenue for the year
  const yearTotal = chartData.reduce((s, c) => s + c.value, 0);

  return (
    <main className="flex-1 px-6 lg:px-8 py-7 space-y-7 max-w-[1480px] w-full mx-auto">

          {/* ═══ Stat Cards ═══ */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {statCards.map((s) => {
              const Icon = s.icon;
              const c = COLOR_TOKENS[s.color];
              const positive = s.delta >= 0;
              return (
                <div
                  key={s.label}
                  className="group relative bg-brand-surface border border-brand-green-100 rounded-[22px] p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-11 h-11 rounded-2xl ${c.iconBg} ${c.iconText} flex items-center justify-center`}>
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <button className="text-brand-ink-soft/60 hover:text-brand-ink-soft transition opacity-0 group-hover:opacity-100" aria-label="ตัวเลือก">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4">
                    <p className="text-[11.5px] font-bold text-brand-ink-soft">{s.label}</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="font-display font-black text-[26px] text-brand-ink leading-none tracking-tight">
                        {s.value}
                      </span>
                      {s.suffix && <span className="text-xs font-extrabold text-brand-ink-soft">{s.suffix}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-dashed border-brand-green-100">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-black ${positive ? "text-brand-green" : "text-rose-600"}`}>
                      {positive ? <TrendingUp className="h-3 w-3" strokeWidth={2.8} /> : <TrendingDown className="h-3 w-3" strokeWidth={2.8} />}
                      {positive ? "+" : ""}
                      {s.color === "gold" || s.color === "coral" ? s.delta : `${s.delta}%`}
                    </span>
                    <span className="text-[10.5px] font-bold text-brand-ink-soft">{s.deltaLabel}</span>
                  </div>

                  {/* Sparkline */}
                  <div className="absolute right-3 bottom-3 w-20 h-8 opacity-70 group-hover:opacity-100 transition">
                    <Sparkline data={s.sparkline} color={c.accent} />
                  </div>
                </div>
              );
            })}
          </section>

          {/* ═══ Chart + Bookings ═══ */}
          <section className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-6">

            {/* Revenue Chart */}
            <div className="bg-brand-surface border border-brand-green-100 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
                <div>
                  <h3 className="font-display font-black text-lg text-brand-ink">ภาพรวมรายได้</h3>
                  <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                    รายได้รวมในปี {new Date().getFullYear()} — ฿{fmtMoney(yearTotal)}
                  </p>
                </div>
                <div className="flex bg-brand-green-50/60 border border-brand-green-100 p-1 rounded-full">
                  {(["week", "month", "year"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setChartRange(r)}
                      className={`px-3.5 py-1.5 rounded-full font-extrabold text-[11px] transition-all duration-200 cursor-pointer ${
                        chartRange === r ? "bg-brand-surface text-brand-green shadow-sm" : "text-brand-ink-soft hover:text-brand-green"
                      }`}
                    >
                      {r === "week" ? "สัปดาห์" : r === "month" ? "เดือน" : "ปี"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-brand-green-700" />
                  <span className="text-[11px] font-bold text-brand-ink-soft">รายได้ปี {new Date().getFullYear()}</span>
                </div>
                {peakMonth && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-white bg-brand-green-700 py-0.5 px-2 rounded">เดือนสูงสุด {peakMonth}</span>
                  </div>
                )}
              </div>

              {/* shadcn / Recharts Area Chart */}
              <ChartContainer
                config={REVENUE_CHART_CONFIG}
                className="aspect-auto h-[300px] w-full"
              >
                <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-brand-green)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-brand-green)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="strokeRevenue" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--color-brand-green-700)" />
                      <stop offset="100%" stopColor="var(--color-brand-green)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="4 6"
                    stroke="var(--color-brand-green-100)"
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tick={{ fill: "var(--color-brand-ink-soft)", fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={48}
                    tick={{ fill: "var(--color-brand-ink-soft)", fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                  />
                  <ChartTooltip
                    cursor={{ stroke: "var(--color-brand-green-600)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        labelFormatter={(label) => `เดือน ${label}`}
                        formatter={(value) => [`฿${Number(value).toLocaleString("en-US")}`, " รายได้"]}
                      />
                    }
                  />
                  <Area
                    dataKey="value"
                    type="monotone"
                    stroke="url(#strokeRevenue)"
                    strokeWidth={2.5}
                    fill="url(#fillRevenue)"
                    activeDot={{
                      r: 6,
                      fill: "var(--color-brand-green-700)",
                      stroke: "white",
                      strokeWidth: 3,
                    }}
                    dot={{
                      r: 3.5,
                      fill: "white",
                      stroke: "var(--color-brand-green-700)",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Recent Bookings */}
            <div className="bg-brand-surface border border-brand-green-100 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-black text-lg text-brand-ink">การจองล่าสุด</h3>
                  <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
                    {recentBookings.length} รายการล่าสุด
                  </p>
                </div>
                <Link href="/dashboard/manage/bookings" className="text-[11.5px] font-extrabold text-brand-green hover:text-brand-green inline-flex items-center gap-1 group/all">
                  ดูทั้งหมด
                  <ArrowRight className="h-3 w-3 transition-transform group-hover/all:translate-x-0.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {recentBookings.length === 0 ? (
                  <div className="text-center py-8 text-brand-ink-soft text-sm font-bold">
                    ยังไม่มีการจอง
                  </div>
                ) : (
                  recentBookings.map((b) => {
                    const isCompleted = b.status === "สำเร็จ";
                    const isPending = b.status === "รอตรวจสอบ" || b.status === "รอชำระเงิน";
                    return (
                      <div
                        key={b.id}
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-brand-green-50/40 transition group/booking cursor-pointer"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shadow-sm flex-shrink-0"
                          style={{ background: avatarGradient(b.username) }}
                        >
                          {b.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-display font-extrabold text-[13.5px] text-brand-ink truncate">{b.username}</span>
                            {isCompleted ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-brand-green flex-shrink-0" />
                            ) : isPending ? (
                              <Clock4 className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-ink-soft truncate">
                            <Coins className="h-3 w-3 text-brand-gold-deep flex-shrink-0" />
                            {b.productName} · ฿{fmtMoney(Number(b.price))}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span
                            className={`inline-block text-[9.5px] font-black uppercase tracking-wider py-0.5 px-2 rounded ${
                              isCompleted ? "bg-brand-green-50 text-brand-green"
                              : b.status === "ยกเลิก" ? "bg-rose-50 text-rose-600"
                              : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {b.status}
                          </span>
                          <p className="text-[10px] font-bold text-brand-ink-soft mt-1">{bookingTimeAgo(b.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* ═══ Top Packages + Top Agents ═══ */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top Packages */}
            <div className="bg-brand-surface border border-brand-green-100 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-black text-lg text-brand-ink">แพ็กเกจขายดี</h3>
                  <p className="text-xs text-brand-ink-soft font-bold mt-0.5">เรียงตามยอดขาย (ออเดอร์สำเร็จ)</p>
                </div>
              </div>

              {topPackages.length === 0 ? (
                <div className="text-center py-8 text-brand-ink-soft text-sm font-bold">
                  ยังไม่มีข้อมูลแพ็กเกจ
                </div>
              ) : (
                <div className="space-y-4">
                  {topPackages.map((p) => (
                    <div key={p.rank} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[12.5px]">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px] ${
                              p.rank === 1
                                ? "bg-gradient-to-br from-brand-gold to-brand-gold-deep text-white shadow-sm"
                                : p.rank === 2
                                ? "bg-zinc-200 text-zinc-700"
                                : p.rank === 3
                                ? "bg-amber-100 text-amber-800"
                                : "bg-brand-green-50 text-brand-green"
                            }`}
                          >
                            {p.rank}
                          </span>
                          <span className="font-display font-extrabold text-brand-ink">{p.name}</span>
                          <span className="text-[11px] font-bold text-brand-ink-soft">฿{fmtMoney(p.revenue)}</span>
                        </div>
                        <span className="font-black text-brand-ink">{p.sold} ออเดอร์</span>
                      </div>
                      <div className="h-1.5 bg-brand-green-50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-green to-brand-green-600 rounded-full transition-all duration-700"
                          style={{ width: `${p.share}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Agents */}
            <div className="bg-brand-surface border border-brand-green-100 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-black text-lg text-brand-ink">ตัวแทนยอดเยี่ยม</h3>
                  <p className="text-xs text-brand-ink-soft font-bold mt-0.5">Top performers ตามยอดขาย</p>
                </div>
                <Link href="/dashboard/users" className="text-[11.5px] font-extrabold text-brand-green hover:text-brand-green inline-flex items-center gap-1 group/all">
                  ดูทั้งหมด
                  <ArrowRight className="h-3 w-3 transition-transform group-hover/all:translate-x-0.5" />
                </Link>
              </div>

              {topAgents.length === 0 ? (
                <div className="text-center py-8 text-brand-ink-soft text-sm font-bold">
                  ยังไม่มีข้อมูลตัวแทน
                </div>
              ) : (
                <div className="space-y-3">
                  {topAgents.map((a) => (
                    <div
                      key={a.rank}
                      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-brand-green-50/40 transition cursor-pointer"
                    >
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm shadow-sm"
                          style={{ background: avatarGradient(a.name) }}
                        >
                          {a.name.charAt(0)}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white shadow-sm ${
                            a.rank === 1
                              ? "bg-gradient-to-br from-brand-gold to-brand-gold-deep text-white"
                              : a.rank === 2
                              ? "bg-zinc-300 text-zinc-700"
                              : a.rank === 3
                              ? "bg-amber-200 text-amber-800"
                              : "bg-brand-green-50 text-brand-green"
                          }`}
                        >
                          {a.rank}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-extrabold text-[13.5px] text-brand-ink truncate">{a.name}</div>
                        <div className="text-[11px] font-bold text-brand-ink-soft truncate">{a.username}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-display font-black text-[14px] text-brand-green leading-none">
                          ฿{fmtMoney(a.revenue)}
                        </div>
                        <div className="text-[10.5px] font-bold text-brand-ink-soft mt-1">{a.orders} ออเดอร์</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ═══ Recent Audit Activity ═══ */}
          <RecentAuditWidget />

      {/* Footer spacing */}
      <div className="h-4" />
    </main>
  );
}

/* ─────────────────────────────────────────────
 * RECENT AUDIT WIDGET — load 10 ล่าสุดจาก /api/v1/audit/recent
 * ───────────────────────────────────────────── */

function RecentAuditWidget() {
  type Log = {
    id: number;
    userName: string | null;
    userEmail: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
  };

  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditApi.api.v1.audit.recent
      .get()
      .then(({ data, error }) => {
        if (error || !data?.ok) return;
        setLogs(
          data.data.map((d) => ({
            id: d.id,
            userName: d.userName,
            userEmail: d.userEmail,
            action: d.action,
            entityType: d.entityType,
            entityId: d.entityId,
            createdAt: d.createdAt,
          }))
        );
      })
      .catch((err) => console.error("Load audit failed:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-brand-surface border border-brand-green-100 rounded-[24px] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-display font-black text-lg text-brand-ink inline-flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-brand-green" />
            กิจกรรมล่าสุดในระบบ
          </h3>
          <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
            การกระทำของ admin 10 รายการล่าสุด
          </p>
        </div>
        <Link
          href="/dashboard/audit"
          className="text-[11.5px] font-extrabold text-brand-green hover:text-brand-green-600 inline-flex items-center gap-1 group/all"
        >
          ดูทั้งหมด
          <ArrowRight className="h-3 w-3 transition-transform group-hover/all:translate-x-0.5" />
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8 text-brand-ink-soft text-sm font-bold">
          กำลังโหลด...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-brand-ink-soft text-sm font-bold">
          ยังไม่มีบันทึก
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const color = actionColor(log.action);
            return (
              <div
                key={log.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-brand-green-50/40 transition"
              >
                <span
                  className={`text-[10px] font-black uppercase tracking-wider py-1 px-2 rounded-md ${color.bg} ${color.text} ring-1 ${color.ring} flex-shrink-0`}
                >
                  {ACTION_LABEL[log.action] ?? log.action}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-extrabold text-brand-ink line-clamp-1">
                    {log.userName || log.userEmail || "ระบบ"}
                  </div>
                  <div className="text-[10.5px] text-brand-ink-soft font-bold">
                    {ENTITY_LABEL[log.entityType] ?? log.entityType}
                    {log.entityId && ` #${log.entityId}`}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-brand-ink-soft/70 whitespace-nowrap flex-shrink-0">
                  {timeAgo(log.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
