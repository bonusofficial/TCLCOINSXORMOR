"use client";

import React, { useMemo, useState } from "react";
import { Coins, Flame, Sparkles, TrendingUp, ShieldCheck, Crown } from "lucide-react";

interface Package {
  id: string;
  coins: string;
  price: string;
  originalPrice?: string;
  ribbon: string;
  ribbonBg?: string;
  popularityCount: number;
  stockLeft: number;
  stockTotal: number;
  status: "open" | "wait" | "closed";
  highlight?: "best-value" | "limited" | "trending";
}

interface PackagesSectionProps {
  onSelectPackage: (pkg: { coins: string; price: string; title: string }) => void;
}

const POPULAR_PACKAGES: Package[] = [
  {
    id: "pop-1",
    coins: "3,300",
    price: "1,200",
    originalPrice: "1,650",
    ribbon: "ยอดนิยมอันดับ 1",
    popularityCount: 842,
    stockLeft: 44,
    stockTotal: 100,
    status: "open",
    highlight: "trending"
  },
  {
    id: "pop-2",
    coins: "10,000",
    price: "3,200",
    originalPrice: "5,000",
    ribbon: "ยอดนิยมอันดับ 2",
    ribbonBg: "linear-gradient(135deg,#9AA593,#7C8674)",
    popularityCount: 391,
    stockLeft: 1,
    stockTotal: 30,
    status: "open",
    highlight: "limited"
  },
  {
    id: "pop-3",
    coins: "30,000",
    price: "9,450",
    originalPrice: "15,000",
    ribbon: "ยอดนิยมอันดับ 3",
    ribbonBg: "linear-gradient(135deg,#9AA593,#7C8674)",
    popularityCount: 185,
    stockLeft: 0,
    stockTotal: 20,
    status: "closed"
  }
];

const RECOMMENDED_PACKAGES: Package[] = [
  {
    id: "rec-1",
    coins: "5,400",
    price: "1,950",
    originalPrice: "2,700",
    ribbon: "แนะนำสุดคุ้ม",
    popularityCount: 654,
    stockLeft: 20,
    stockTotal: 50,
    status: "open",
    highlight: "best-value"
  },
  {
    id: "rec-2",
    coins: "15,000",
    price: "4,800",
    originalPrice: "7,500",
    ribbon: "แพ็กเกจคุ้มค่า",
    ribbonBg: "linear-gradient(135deg,#9AA593,#7C8674)",
    popularityCount: 297,
    stockLeft: 4,
    stockTotal: 25,
    status: "open",
    highlight: "limited"
  },
  {
    id: "rec-3",
    coins: "50,000",
    price: "15,500",
    originalPrice: "25,000",
    ribbon: "เซ็ตใหญ่จัดเต็ม",
    ribbonBg: "linear-gradient(135deg,#9AA593,#7C8674)",
    popularityCount: 98,
    stockLeft: 0,
    stockTotal: 10,
    status: "closed"
  }
];

// Convert string with commas to number
const toNum = (s: string) => parseFloat(s.replace(/,/g, ""));

// Format Thai number with commas
const fmt = (n: number) =>
  n >= 1000 ? n.toLocaleString("en-US") : n.toString();

export default function PackagesSection({ onSelectPackage }: PackagesSectionProps) {
  const [activeTab, setActiveTab] = useState<"popular" | "recommended">("popular");

  // Sort: open first (by popularity desc), then closed at the end
  const packages = useMemo(() => {
    const list = activeTab === "popular" ? POPULAR_PACKAGES : RECOMMENDED_PACKAGES;
    const open = list.filter((p) => p.status !== "closed").sort((a, b) => b.popularityCount - a.popularityCount);
    const closed = list.filter((p) => p.status === "closed");
    return [...open, ...closed];
  }, [activeTab]);

  const maxPopularity = useMemo(
    () => Math.max(...packages.map((p) => p.popularityCount)),
    [packages]
  );

  return (
    <section className="bg-gradient-to-b from-[#F6FAF2] to-white py-20" id="packages">
      <div className="max-w-[1240px] mx-auto px-7 w-full">

        {/* Section Header Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-11">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-brand-green-50 text-brand-green-700 font-extrabold text-[12px] uppercase tracking-wider py-1.5 px-4.5 rounded-full">
              <TrendingUp className="h-3 w-3" strokeWidth={3} />
              ขายดีที่สุดในเดือนนี้
            </div>
            <h2 className="font-display font-black text-3xl md:text-[46px] leading-[1.08] tracking-tight text-brand-ink">
              สินค้า<em className="not-italic text-brand-green-600">ยอดนิยม</em>
            </h2>
            <p className="text-base leading-relaxed text-brand-ink-soft font-medium">
              จัดอันดับจากยอดจองจริงของลูกค้า — เลือกแพ็กเกจที่คนซื้อเยอะที่สุด มั่นใจได้ในความคุ้มค่า
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex bg-white border border-brand-green-100 p-1.5 rounded-full shadow-sm self-start">
            <button
              onClick={() => setActiveTab("popular")}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "popular"
                  ? "bg-gradient-to-r from-brand-green to-brand-green-600 text-white shadow-md shadow-brand-green/20"
                  : "text-brand-ink-soft hover:text-brand-green-700"
              }`}
            >
              ยอดนิยม
            </button>
            <button
              onClick={() => setActiveTab("recommended")}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "recommended"
                  ? "bg-gradient-to-r from-brand-green to-brand-green-600 text-white shadow-md shadow-brand-green/20"
                  : "text-brand-ink-soft hover:text-brand-green-700"
              }`}
            >
              สินค้าแนะนำ
            </button>
          </div>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-7 max-w-[920px] mx-auto">
          {packages.map((pkg, index) => {
            const isOpen = pkg.status === "open";
            const isTopRank = index === 0 && isOpen;
            const coinsNum = toNum(pkg.coins);
            const priceNum = toNum(pkg.price);
            const originalNum = pkg.originalPrice ? toNum(pkg.originalPrice) : null;
            const pricePerCoin = (priceNum / coinsNum).toFixed(2);
            const savings = originalNum ? originalNum - priceNum : 0;
            const savingsPct = originalNum ? Math.round((savings / originalNum) * 100) : 0;
            const stockPct = Math.min(100, Math.round((pkg.stockLeft / pkg.stockTotal) * 100));
            const isLowStock = isOpen && pkg.stockLeft <= 5;
            const popularityWidth = Math.max(18, Math.round((pkg.popularityCount / maxPopularity) * 100));

            return (
              <div
                key={pkg.id}
                className={`group relative flex flex-col rounded-[32px] p-7 md:p-8 transition-all duration-300 ${
                  !isOpen
                    ? "bg-zinc-50 border border-zinc-200 opacity-75 grayscale-[40%]"
                    : isTopRank
                    ? "bg-gradient-to-br from-white via-white to-brand-green-50 border-2 border-brand-green shadow-[0_18px_50px_-20px_rgba(122,203,83,0.45)] hover:shadow-[0_28px_60px_-20px_rgba(122,203,83,0.55)] hover:-translate-y-2.5"
                    : "bg-white border border-brand-green-100 shadow-sm hover:shadow-2xl hover:-translate-y-2.5"
                }`}
              >
                {/* Glow accent for top rank */}
                {isTopRank && (
                  <div className="pointer-events-none absolute -top-px left-12 right-12 h-px bg-gradient-to-r from-transparent via-brand-green to-transparent" />
                )}

                {/* Rank Ribbon */}
                <div
                  className="absolute -top-3 left-7 inline-flex items-center gap-1.5 font-extrabold text-[11px] text-white py-1.5 pl-3 pr-4 rounded-full shadow-md tracking-wide"
                  style={{
                    background: isTopRank
                      ? "linear-gradient(135deg,#FFC32B,#F2A40C)"
                      : pkg.ribbonBg || "linear-gradient(135deg,#9AA593,#7C8674)"
                  }}
                >
                  {isTopRank ? (
                    <Crown className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : (
                    <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                  )}
                  {pkg.ribbon}
                </div>

                {/* Discount Badge top-right */}
                {originalNum && isOpen && (
                  <div className="absolute top-6 right-6 bg-[#FFF1EF] text-[#C4382A] border border-[#FFD5CE] font-black text-[11px] py-1 px-2.5 rounded-lg">
                    -{savingsPct}%
                  </div>
                )}
                {!isOpen && (
                  <div className="absolute top-6 right-6 bg-zinc-200 text-zinc-500 font-extrabold text-[10px] py-1 px-2.5 rounded-lg uppercase tracking-wider">
                    เร็ว ๆ นี้
                  </div>
                )}

                {/* Coin Icon Badge */}
                <div className={`w-14 h-14 rounded-2xl shadow-md flex items-center justify-center mb-5 mt-2 ${
                  isOpen
                    ? "bg-gradient-to-br from-[#FFE08A] via-brand-gold to-brand-gold-deep animate-pulse-ring"
                    : "bg-zinc-300"
                }`}>
                  <Coins className="h-7 w-7 text-white drop-shadow-sm" />
                </div>

                {/* Coins amount */}
                <div className="font-display font-black text-[30px] leading-tight text-brand-ink">
                  {pkg.coins}{" "}
                  <small className="text-sm font-extrabold text-brand-ink-soft">Coins</small>
                </div>

                {/* Price row with strikethrough */}
                <div className="flex items-baseline gap-3 mt-1.5">
                  <div className="font-display font-black text-[34px] leading-none text-brand-green-700 flex items-baseline gap-1.5">
                    {pkg.price}
                    <small className="text-sm font-extrabold text-brand-ink-soft">บาท</small>
                  </div>
                  {originalNum && (
                    <span className="text-sm font-bold text-zinc-400 line-through">
                      {pkg.originalPrice}
                    </span>
                  )}
                </div>

                {/* Per-coin rate */}
                <div className="mt-1.5 text-[11px] font-bold text-brand-ink-soft">
                  เฉลี่ย {pricePerCoin} บาท/Coin
                  {savings > 0 && (
                    <span className="text-[#C4382A]"> · ประหยัด {fmt(savings)} บาท</span>
                  )}
                </div>

                {/* HERO: Popularity Bar */}
                <div className={`mt-5 rounded-2xl p-3.5 border ${
                  isOpen
                    ? "bg-gradient-to-r from-[#FFF6E8] via-[#FFF1EF] to-[#FFE8E4] border-[#FFD5CE]"
                    : "bg-zinc-100 border-zinc-200"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 font-black text-sm text-[#C4382A]">
                      <Flame className="h-4 w-4 fill-[#FF6B5B] text-[#C4382A]" strokeWidth={2} />
                      {fmt(pkg.popularityCount)} คนเลือกอันนี้
                    </span>
                    {isTopRank && (
                      <span className="text-[10px] font-extrabold text-[#C4382A] bg-white/70 py-0.5 px-2 rounded-full">
                        TOP 1
                      </span>
                    )}
                  </div>
                  {/* Heat bar */}
                  <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#FFB347] via-[#FF6B5B] to-[#C4382A] rounded-full transition-all duration-700"
                      style={{ width: `${popularityWidth}%` }}
                    />
                  </div>
                </div>

                {/* Stock Indicator */}
                {isOpen && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                      <span className="text-brand-ink-soft">สต๊อกที่เหลือ</span>
                      <span className={isLowStock ? "text-[#C4382A]" : "text-brand-green-700"}>
                        {isLowStock && "⚡ "}
                        เหลือ {pkg.stockLeft} ชิ้น
                      </span>
                    </div>
                    <div className="h-1.5 bg-brand-green-50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isLowStock
                            ? "bg-gradient-to-r from-[#FFB347] to-[#C4382A]"
                            : "bg-gradient-to-r from-brand-green to-brand-green-600"
                        }`}
                        style={{ width: `${stockPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Trust micro-row */}
                {isOpen && (
                  <div className="flex items-center gap-1.5 mt-4 text-[11px] font-bold text-brand-ink-soft">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand-green-600" strokeWidth={2.5} />
                    รับประกันเหรียญเข้าภายใน 24 ชม.
                  </div>
                )}

                {/* CTA Button */}
                <button
                  type="button"
                  disabled={!isOpen}
                  onClick={() =>
                    onSelectPackage({ coins: pkg.coins, price: pkg.price, title: pkg.ribbon })
                  }
                  className={`mt-5 w-full py-4 rounded-[16px] font-extrabold text-sm transition-all duration-200 ${
                    isOpen
                      ? isTopRank
                        ? "text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-lg shadow-brand-green/30 hover:shadow-xl hover:shadow-brand-green/40 hover:-translate-y-0.5 cursor-pointer"
                        : "text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/20 hover:shadow-lg hover:shadow-brand-green/30 hover:-translate-y-0.5 cursor-pointer"
                      : "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200"
                  }`}
                >
                  {isOpen ? (isTopRank ? "🚀 จองเลย — แพ็กเกจที่คนซื้อเยอะที่สุด" : "จองสินค้าเลย!") : "หมดชั่วคราว"}
                </button>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
