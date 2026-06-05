import { Coins, TriangleAlert, Trophy, Medal, Sparkles, Flame, Rocket, Clock } from "lucide-react";
import { PublicProduct as QueueProduct } from "@/lib/contexts/PublicDataContext";
import { UserRole } from "@/lib/booking";
import { getProductAvailability, getEffectivePrice, fmt, fmtThaiDate, padHHMM, useNowTick } from "@/lib/product-utils";

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function formatSaleDateLabel(dates: string[]) {
  if (!dates.length) return "ไม่ระบุวันขาย";

  const sortedDates = [...dates].sort();
  const parsed = sortedDates.map((date) => {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  });

  if (parsed.some((date) => date === null)) {
    return sortedDates.map(fmtThaiDate).join(" · ");
  }

  const dateParts = parsed as Array<{ year: number; month: number; day: number }>;
  const first = dateParts[0];
  const sameMonthAndYear = dateParts.every(
    (date) => date.year === first.year && date.month === first.month
  );

  if (!sameMonthAndYear) {
    return sortedDates.map(fmtThaiDate).join(" · ");
  }

  const days = [...new Set(dateParts.map((date) => date.day))].sort((a, b) => a - b);
  const monthLabel = THAI_MONTHS[first.month - 1] ?? "";
  const yearLabel = first.year + 543;

  if (days.length === 1) {
    return `${days[0]} ${monthLabel} ${yearLabel}`;
  }

  const consecutive = days.every((day, index) => index === 0 || day === days[index - 1] + 1);
  if (consecutive) {
    return `${days[0]} - ${days[days.length - 1]} ${monthLabel} ${yearLabel}`;
  }

  return `${days.join(", ")} ${monthLabel} ${yearLabel}`;
}

export function PackageCard({
  idx,
  product: p,
  userRole,
  username,
  maxQueueCount = 0,
  onSelect,
}: {
  idx: number;
  product: QueueProduct;
  userRole: UserRole;
  username: string | null;
  /** จำนวนคิวสูงสุดในบรรดาสินค้าทั้งหมด — ใช้คำนวณ % แถบความนิยมแบบสัมพัทธ์ */
  maxQueueCount?: number;
  onSelect: () => void;
}) {
  useNowTick(); // re-render ตามเวลา
  const avail = getProductAvailability(p);
  const price = getEffectivePrice(p, userRole, username);

  const sellingPrice = price.amount;

  // คำนวณราคาขีดฆ่าและเปอร์เซ็นต์ส่วนลด ตามสิทธิ์ของผู้ใช้ (ทั่วไป / ตัวแทน / VIP)
  let strikePrice = 0;
  let strikeLabel = "";

  if (price.isAgent) {
    strikePrice = Number(p.price);
    strikeLabel = "ราคาทั่วไป";
  } else if (price.hasVipDiscount) {
    strikePrice = Number(p.price);
    strikeLabel = "ราคาทั่วไป";
  }

  const discountPercent = strikePrice > 0 ? Math.round(((strikePrice - sellingPrice) / strikePrice) * 100) : 0;

  // จำนวนที่ "ขายไปแล้ว" = booking จริงที่ไม่ถูกยกเลิก (อัปเดต realtime)
  const soldCount = p.queueCount;
  // ระบบหักสต็อกตอนจอง → สต็อกเต็มเดิม = ที่เหลือ + ที่ขายไปแล้ว
  const stockTotal = p.stockEnabled ? p.stock + soldCount : 0;
  // % ความคืบหน้าการขาย = ขายแล้วกี่ % ของสต็อกทั้งหมด
  // (สินค้าที่ไม่เปิดสต็อก = ไม่มีเพดาน → เทียบความนิยมสัมพัทธ์กับแพ็กที่ขายดีสุดแทน)
  const soldPercentage = p.stockEnabled
    ? stockTotal > 0
      ? Math.round((soldCount / stockTotal) * 100)
      : 0
    : maxQueueCount > 0
      ? Math.round((soldCount / maxQueueCount) * 100)
      : 0;

  // วันที่ + ช่วงเวลาเปิดรับ (จาก saleDates / timeSlots)
  const dateLabel = formatSaleDateLabel(p.saleDates);
  const timeLabel = p.timeSlots.length
    ? p.timeSlots.map((s) => `${padHHMM(s.start)}-${padHHMM(s.end)}`).join(", ")
    : "";

  const BadgeIcon = idx === 1 
    ? Trophy 
    : idx === 2 || idx === 3 
    ? Medal 
    : Sparkles;
    
  const badgeLabel = idx <= 3 ? `ยอดนิยมอันดับ ${idx}` : `แพ็กเกจอันดับ ${idx}`;

  const isOpen = avail.status === "open";
  const isSoon = avail.status === "soon";
  const isEnded = avail.status === "ended";
  const isOutOfStock = avail.status === "outOfStock";
  const productDescription = p.description.trim();
  const noteText = p.note?.trim();
  const buttonDisabled = !isOpen;
  const statusTitle = isOpen
    ? "เปิดรับจองอยู่"
    : isSoon
      ? "ยังไม่ถึงเวลาจอง"
      : isOutOfStock
        ? "สินค้าหมด"
        : "ปิดจองแล้ว";
  const statusDetail = [dateLabel, timeLabel && `เวลา ${timeLabel}`].filter(Boolean).join(" · ");
  const buttonLabel = isSoon
    ? "ยังไม่ถึงเวลาจอง"
    : isEnded
      ? "ปิดจองแล้ว"
      : isOutOfStock
        ? "สินค้าหมด"
        : idx === 1
      ? "จองเลย – แพ็กเกจที่คนซื้อเยอะที่สุด"
      : "จองสินค้าเลย!";
  const statusTone = isOpen
    ? "bg-brand-green/15 text-brand-green border-brand-green/30"
    : isSoon
      ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
      : "bg-rose-500/12 text-rose-300 border-rose-500/35";
  const statusDotTone = isOpen
    ? "bg-brand-green animate-pulse"
    : isSoon
      ? "bg-brand-gold"
      : "bg-rose-400";

  return (
    <article className={`relative bg-[#0d0f12]/45 backdrop-blur-md border-2 rounded-3xl p-5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col ${
      idx === 1 ? "border-brand-green/80 shadow-lg shadow-brand-green/10" : "border-brand-green-100/50"
    }`}>
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-4 select-none">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-brand-ink/90 bg-brand-surface border border-brand-green-100 px-2.5 py-1 rounded-full">
          <BadgeIcon className={`h-3.5 w-3.5 ${
            idx === 1 ? "text-amber-400" : idx === 2 ? "text-slate-300" : idx === 3 ? "text-amber-700" : "text-brand-green"
          }`} />
          {badgeLabel}
        </span>
        {discountPercent > 0 && (
          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10.5px] font-black px-2.5 py-0.5 rounded-lg">
            -{discountPercent}%
          </span>
        )}
      </div>

      {/* Main visual info */}
      <div className="flex items-center gap-3.5 mb-2.5">
        {p.image ? (
          <img
            src={p.image}
            alt={p.name}
            className="w-[100px] h-[100px] rounded-2xl object-cover ring-2 ring-brand-green-100 shadow-md flex-shrink-0"
          />
        ) : (
          <div className="w-[100px] h-[100px] rounded-2xl bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-deep flex items-center justify-center shadow-md flex-shrink-0">
            <Coins className="h-11 w-11 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-black text-xl text-white tracking-tight leading-tight truncate">
            {p.name}
          </h3>
          {productDescription && (
            <p className="mt-1.5 text-[11.5px] font-bold text-brand-ink-soft leading-relaxed line-clamp-2">
              {productDescription}
            </p>
          )}
        </div>
      </div>

      {/* Pricing block */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-black text-2xl text-brand-green">
            {fmt(sellingPrice)}
          </span>
          <span className="text-xs font-bold text-brand-ink-soft">บาท</span>
          {strikePrice > 0 && (
            <span className="text-[11.5px] text-rose-400 font-black line-through ml-auto">
              {strikeLabel} {fmt(strikePrice)}
            </span>
          )}
        </div>
      </div>

      {/* Sales progress bar — ขายไปแล้วกี่ชิ้นจากสต็อกทั้งหมด (ข้อมูลจริง realtime) */}
      <div className="space-y-1.5 mb-3.5 select-none">
        <div className="flex items-center justify-between text-[11px] font-black">
          <span className="text-amber-500 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 fill-amber-500 animate-pulse text-amber-500" />
            {soldCount > 0 ? `ซื้อไปแล้ว ${fmt(soldCount)} คน` : "เพิ่งเปิดให้จอง"}
          </span>
          {soldPercentage > 0 && (
            <span className="text-rose-400">{soldPercentage}%</span>
          )}
        </div>
        <div className="w-full bg-brand-green-100/10 h-2.5 rounded-full overflow-hidden border border-brand-green-100/25">
          <div
            className="bg-gradient-to-r from-amber-500 via-rose-500 to-brand-green h-full rounded-full transition-all duration-500"
            style={{ width: `${soldPercentage}%` }}
          />
        </div>
        {p.stockEnabled && stockTotal > 0 && (
          <p className="text-[10px] font-bold text-brand-ink-soft">
            ขายแล้ว <span className="text-brand-ink font-black">{fmt(soldCount)}</span> / {fmt(stockTotal)} ชิ้น
          </p>
        )}
      </div>

      {/* Stock remaining info */}
      <div className="mb-3">
        {p.stockEnabled ? (
          <p className="text-[11px] font-bold text-brand-ink-soft">
            สต็อกที่เหลือ: <span className={p.stock > 0 ? "text-brand-green font-black" : "text-rose-400 font-black"}>{p.stock > 0 ? `เหลือ ${p.stock} ชิ้น` : "หมดชั่วคราว"}</span>
          </p>
        ) : (
          <p className="text-[11px] font-bold text-brand-ink-soft">
            คลังสินค้า: <span className="text-brand-green font-black">เหรียญแท้พร้อมส่ง</span>
          </p>
        )}
      </div>

      {/* Status + booking window — สถานะ + วันที่/ช่วงเวลาเปิดรับ */}
      <div className="mb-3 rounded-xl border border-brand-green-100/30 bg-brand-surface/40 p-2.5 space-y-1.5">
        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${statusTone}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusDotTone}`} />
          {statusTitle}
        </span>
        {statusDetail && (
          <p className="text-[10.5px] font-bold text-brand-ink-soft leading-relaxed">
            {statusDetail}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-brand-green-100/20">
        {noteText && (
          <div className="w-full py-3 px-3 rounded-xl font-extrabold text-sm transition cursor-pointer flex items-center justify-center gap-2 bg-amber-500/12 text-amber-300 border border-amber-500/40 cursor-not-allowed shadow-none mb-3 text-center leading-relaxed">
            <TriangleAlert className="h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-3">หมายเหตุเพิ่มเติม: {noteText}</span>
          </div>
        )}
        <button
          type="button"
          onClick={onSelect}
          disabled={buttonDisabled}
          className={`w-full py-3 rounded-xl font-extrabold text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            buttonDisabled
              ? "bg-amber-500/12 text-amber-300 border border-amber-500/40 cursor-not-allowed shadow-none"
              : "bg-gradient-to-r from-brand-green to-brand-green-600 hover:from-brand-green-600 hover:to-brand-green-700 text-white shadow-md shadow-brand-green/20 hover:shadow-lg hover:-translate-y-0.5"
          }`}
        >
          {isSoon ? (
            <Clock className="h-4 w-4" />
          ) : (
            isOpen && idx === 1 && <Rocket className="h-4 w-4 animate-bounce" />
          )}
          <span>{buttonLabel}</span>
        </button>
      </div>
    </article>
  );
}
