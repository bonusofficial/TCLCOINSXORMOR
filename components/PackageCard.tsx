import { Coins, AlertOctagon, Trophy, Medal, Sparkles, Flame, Rocket, Calendar, Clock } from "lucide-react";
import { PublicProduct as QueueProduct } from "@/lib/contexts/PublicDataContext";
import { UserRole } from "@/lib/booking";
import { getProductAvailability, getEffectivePrice, fmt, fmtThaiDate, padHHMM, useNowTick } from "@/lib/product-utils";

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
  const dateLabel = p.saleDates.length
    ? p.saleDates.map(fmtThaiDate).join(" · ")
    : "ไม่ระบุวันขาย";
  const timeLabel = p.timeSlots.length
    ? p.timeSlots.map((s) => `${padHHMM(s.start)}-${padHHMM(s.end)}`).join(", ")
    : "";

  // คำการันตีแบบสลับสับเปลี่ยนเพื่อความพรีเมียม
  const guaranteeText = p.id % 2 === 0
    ? "รับประกันเหรียญแท้ภายใน 24 ชม."
    : "มีเงินเติมส่งตรงเข้าคิวใน 24 ชม.";

  const BadgeIcon = idx === 1 
    ? Trophy 
    : idx === 2 || idx === 3 
    ? Medal 
    : Sparkles;
    
  const badgeLabel = idx <= 3 ? `ยอดนิยมอันดับ ${idx}` : `แพ็กเกจอันดับ ${idx}`;

  const buttonDisabled = false;

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
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-brand-green/15 text-brand-green border border-brand-green/30">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" />
          {avail.status === "open" ? "เปิดรับจองอยู่" : avail.label}
        </span>
      </div>

      {/* Note — หมายเหตุจาก admin (เด่นขึ้นกว่าเดิม) */}
      {p.note && (
        <div className="bg-amber-500/15 border border-amber-500/50 rounded-lg p-2.5 mb-3 text-[11px] font-bold text-amber-300 leading-relaxed line-clamp-4 flex items-start gap-1.5 ring-1 ring-amber-500/20">
          <AlertOctagon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>{p.note}</span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-brand-green-100/20">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-brand-ink-soft mb-3.5 select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" />
          {guaranteeText}
        </div>
        <button
          type="button"
          onClick={onSelect}
          disabled={buttonDisabled}
          className={`w-full py-3 rounded-xl font-extrabold text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            buttonDisabled
              ? "bg-brand-paper/50 text-brand-ink-soft/40 border border-brand-green-100/30 cursor-not-allowed"
              : "bg-gradient-to-r from-brand-green to-brand-green-600 hover:from-brand-green-600 hover:to-brand-green-700 text-white shadow-md shadow-brand-green/20 hover:shadow-lg hover:-translate-y-0.5"
          }`}
        >
          {idx === 1 && <Rocket className="h-4 w-4 animate-bounce" />}
          <span>{idx === 1 ? "จองเลย – แพ็กเกจที่คนซื้อเยอะที่สุด" : "จองสินค้าเลย!"}</span>
        </button>
      </div>
    </article>
  );
}
