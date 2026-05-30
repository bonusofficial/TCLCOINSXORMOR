import React from "react";
import { Zap, Sparkles, Boxes, Clock, Coins, CalendarDays, AlertOctagon } from "lucide-react";
import { PublicProduct as QueueProduct } from "@/lib/contexts/PublicDataContext";
import { UserRole } from "@/lib/booking";
import { getProductAvailability, getEffectivePrice, fmt, fmtThaiDate, useNowTick } from "@/lib/product-utils";

export function PackageCard({
  idx,
  product: p,
  userRole,
  username,
  onSelect,
}: {
  idx: number;
  product: QueueProduct;
  userRole: UserRole;
  username: string | null;
  onSelect: () => void;
}) {
  useNowTick(); // re-render ตามเวลา เพื่อให้สถานะเปิด/ปิด อัปเดตเอง
  const avail = getProductAvailability(p);
  const price = getEffectivePrice(p, userRole, username);

  const statusBadge = (() => {
    if (avail.status === "open")
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-600",
        ring: "ring-emerald-500/30",
        icon: <Zap className="h-3 w-3" />,
        label: "เปิดจองแล้ว",
      };
    if (avail.status === "soon")
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        ring: "ring-amber-500/30",
        icon: <Sparkles className="h-3 w-3" />,
        label: "เปิดจองเร็วๆนี้",
      };
    if (avail.status === "outOfStock")
      return {
        bg: "bg-rose-500/10",
        text: "text-rose-400",
        ring: "ring-rose-500/30",
        icon: <Boxes className="h-3 w-3" />,
        label: "สินค้าหมด",
      };
    return {
      bg: "bg-brand-paper",
      text: "text-brand-ink-soft",
      ring: "ring-brand-green-100",
      icon: <Clock className="h-3 w-3" />,
      label: "ปิดรับ",
    };
  })();

  const buttonDisabled = avail.status !== "open";
  const buttonText =
    avail.status === "open"
      ? "จองสินค้าเลย!"
      : avail.status === "soon"
      ? avail.message ?? "ยังไม่ถึงเวลาจอง"
      : avail.status === "outOfStock"
      ? "สินค้าหมด"
      : "ไม่อยู่ในช่วงเวลาจอง";

  return (
    <article className="bg-brand-surface border border-brand-green-100 rounded-3xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[10.5px] font-extrabold text-brand-ink-soft uppercase tracking-widest">
          แพ็กเกจลำดับที่ {idx}
        </p>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md ${statusBadge.bg} ${statusBadge.text} ring-1 ${statusBadge.ring}`}
        >
          {statusBadge.icon}
          {statusBadge.label}
        </span>
      </div>

      {/* Title — product image (fallback to coin icon) */}
      <div className="flex items-center gap-2.5 mb-1">
        {p.image ? (
          <img
            src={p.image}
            alt={p.name}
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-brand-green-100 shadow-sm flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold-light to-brand-gold-deep flex items-center justify-center shadow-sm flex-shrink-0">
            <Coins className="h-5 w-5 text-white" />
          </div>
        )}
        <h3 className="font-display font-black text-lg text-brand-ink line-clamp-2 flex-1 min-w-0">
          {p.name}
        </h3>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display font-black text-2xl text-brand-green">
          {fmt(price.amount)}
        </span>
        <span className="text-xs font-bold text-brand-ink-soft">บาท</span>
        {price.isAgent && Number(p.price) !== price.amount && (
          <span className="text-[10px] text-brand-ink-soft/60 line-through ml-auto">
            ฿{fmt(p.price)}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-1.5 text-[11.5px] font-bold text-brand-ink-soft mb-3">
        {p.saleDates[0] && (
          <div className="flex items-center justify-between gap-2 bg-brand-paper rounded-lg px-2.5 py-1.5 border border-brand-green-100/60">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3 text-brand-green" />
              {fmtThaiDate(p.saleDates[0])}
            </span>
            {p.saleDates.length > 1 && (
              <span className="text-[10px] font-extrabold text-brand-green">
                +{p.saleDates.length - 1} วัน
              </span>
            )}
          </div>
        )}
        {p.timeSlots[0] && (
          <div className="flex items-center justify-between gap-2 bg-brand-paper rounded-lg px-2.5 py-1.5 border border-brand-green-100/60">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-brand-green" />
              {p.timeSlots[0].start} - {p.timeSlots[0].end}
            </span>
            {p.timeSlots.length > 1 && (
              <span className="text-[10px] font-extrabold text-brand-green">
                +{p.timeSlots.length - 1} ช่วง
              </span>
            )}
          </div>
        )}
        {p.stockEnabled && (
          <div className="inline-flex items-center gap-1.5">
            <Boxes className="h-3 w-3" />
            คงเหลือ:{" "}
            <span className={p.stock > 0 ? "text-brand-green font-black" : "text-rose-400 font-black"}>
              {p.stock} ชิ้น
            </span>
          </div>
        )}
      </div>

      {/* Description — รายละเอียดสินค้า */}
      {p.description && (
        <div className="bg-brand-paper border border-brand-green-100 rounded-lg p-2.5 mb-3 text-[11px] font-medium text-brand-ink-soft leading-relaxed line-clamp-3">
          {p.description}
        </div>
      )}

      {/* Note — หมายเหตุจาก admin (เด่นขึ้นกว่าเดิม) */}
      {p.note && (
        <div className="bg-amber-500/15 border border-amber-500/50 rounded-lg p-2.5 mb-3 text-[11px] font-bold text-amber-300 leading-relaxed line-clamp-4 flex items-start gap-1.5 ring-1 ring-amber-500/20">
          <AlertOctagon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>{p.note}</span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto">
        <div className="flex items-center justify-between text-[10.5px] font-bold mb-2.5">
          <span className="text-brand-ink-soft">สถานะ:</span>
          <span className={`inline-flex items-center gap-1 font-black ${statusBadge.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${avail.status === "open" ? "bg-emerald-500 animate-pulse" : avail.status === "soon" ? "bg-amber-500" : "bg-brand-ink-soft/40"}`} />
            {avail.label}
          </span>
        </div>
        <button
          type="button"
          onClick={onSelect}
          disabled={buttonDisabled}
          className={`w-full py-2.5 rounded-xl font-extrabold text-sm transition cursor-pointer ${
            buttonDisabled
              ? "bg-brand-paper text-brand-ink-soft/50 border border-brand-green-100/60 cursor-not-allowed"
              : "bg-gradient-to-r from-brand-green to-brand-green-600 text-white shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5"
          }`}
        >
          {buttonText}
        </button>
      </div>
    </article>
  );
}
