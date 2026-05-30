"use client";

import React, { useMemo } from "react";
import { Star, Quote, BadgeCheck, ThumbsUp } from "lucide-react";
import { useReviews } from "@/lib/contexts/PublicDataContext";

interface Review {
  id: string;
  name: string;
  initial: string;
  avatarBg: string;
  /** URL รูป avatar — ถ้ามีจะใช้รูปจริงแทน initial+gradient */
  avatarUrl?: string | null;
  rating: number;
  review: string;
  package: string;
  timeAgo: string;
  verified?: boolean;
  helpful?: number;
}

/** Pool ของ avatar gradient — สุ่มตาม id เพื่อให้รีวิวเดียวกันได้สีเดิมเสมอ */
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#FF8A65,#FF7043)",
  "linear-gradient(135deg,#39C848,#128C2E)",
  "linear-gradient(135deg,#42A5F5,#1E88E5)",
  "linear-gradient(135deg,#FFC928,#F0A800)",
  "linear-gradient(135deg,#AB47BC,#8E24AA)",
  "linear-gradient(135deg,#26A69A,#00897B)",
  "linear-gradient(135deg,#EF5350,#E53935)",
  "linear-gradient(135deg,#5C6BC0,#3949AB)",
];

const TIME_UNIT_TH: Record<string, string> = {
  hour: "ชม.",
  day: "วัน",
  week: "สัปดาห์",
  month: "เดือน",
  year: "ปี",
};

const REVIEWS: Review[] = [
  {
    id: "r1",
    name: "คุณกิตติ ส.",
    initial: "ก",
    avatarBg: "linear-gradient(135deg,#FF8A65,#FF7043)",
    rating: 5,
    review:
      "เติมไวมากจริง 5 นาทีเหรียญเข้าเลย ใช้บริการครั้งที่ 3 แล้ว ราคาดีที่สุดที่เคยเจอในตลาด แนะนำเพื่อนต่อแล้ว",
    package: "เติม 3,300 Coins",
    timeAgo: "2 ชม. ที่แล้ว",
    verified: true,
    helpful: 24
  },
  {
    id: "r2",
    name: "คุณนภัสร ม.",
    initial: "น",
    avatarBg: "linear-gradient(135deg,#39C848,#128C2E)",
    rating: 5,
    review:
      "ตอนแรกกลัวโดนโกง แต่ทีมงานคุยน่ารักมาก อธิบายชัด ตอบไว มีรูปยืนยันทุกขั้นตอน ปลอดภัยจริง 100%",
    package: "เติม 10,000 Coins",
    timeAgo: "5 ชม. ที่แล้ว",
    verified: true,
    helpful: 41
  },
  {
    id: "r3",
    name: "คุณวรวัฒน์ ป.",
    initial: "ว",
    avatarBg: "linear-gradient(135deg,#42A5F5,#1E88E5)",
    rating: 5,
    review:
      "เป็นตัวแทนใช้ที่นี่ประจำ ส่วนลด 5% คุ้มมาก เคลมเร็วถ้ามีปัญหา ระบบหลังบ้านจัดการง่าย",
    package: "ตัวแทนจำหน่าย VIP",
    timeAgo: "1 วันที่แล้ว",
    verified: true,
    helpful: 18
  },
  {
    id: "r4",
    name: "คุณพิมพ์ใจ ก.",
    initial: "พ",
    avatarBg: "linear-gradient(135deg,#FFC928,#F0A800)",
    rating: 5,
    review:
      "ใช้ครั้งแรก สแกน QR จองคิวง่ายมาก ไม่ต้องกรอกอะไรเยอะ เหรียญเข้าใน 8 นาที จากกังวลเป็นประทับใจเลย",
    package: "เติม 5,400 Coins",
    timeAgo: "1 วันที่แล้ว",
    verified: true,
    helpful: 33
  },
  {
    id: "r5",
    name: "คุณสมศักดิ์ ท.",
    initial: "ส",
    avatarBg: "linear-gradient(135deg,#AB47BC,#8E24AA)",
    rating: 5,
    review:
      "จองคิวรอบดึก ตี 2 กว่า ทีมตอบเร็วทันที 24/7 จริง ๆ ราคาคุ้มกว่าเติมในแอปเยอะมาก",
    package: "เติม 15,000 Coins",
    timeAgo: "2 วันที่แล้ว",
    verified: true,
    helpful: 27
  },
  {
    id: "r6",
    name: "คุณวีรภัทร น.",
    initial: "ว",
    avatarBg: "linear-gradient(135deg,#26A69A,#00897B)",
    rating: 5,
    review:
      "คุ้มมาก ๆ ที่นี่ ลดหนักกว่าเจ้าอื่นเห็น ๆ ใช้มาเป็นปีแล้วไม่เคยมีปัญหาสักครั้ง ขอบคุณทีมงานครับ",
    package: "ลูกค้าประจำ 1+ ปี",
    timeAgo: "3 วันที่แล้ว",
    verified: true,
    helpful: 56
  },
  {
    id: "r7",
    name: "คุณภัทรา ส.",
    initial: "ภ",
    avatarBg: "linear-gradient(135deg,#EF5350,#E53935)",
    rating: 5,
    review:
      "เพื่อนแนะนำมา ตอนแรกไม่ค่อยเชื่อ แต่เติมจริงเหรียญเข้าจริง สบายใจมาก หาเจ้าประจำได้แล้ว",
    package: "เติม 3,300 Coins",
    timeAgo: "4 วันที่แล้ว",
    verified: true,
    helpful: 19
  },
  {
    id: "r8",
    name: "คุณอนุชา ร.",
    initial: "อ",
    avatarBg: "linear-gradient(135deg,#5C6BC0,#3949AB)",
    rating: 5,
    review:
      "ระบบดีมาก จองง่าย จ่ายง่าย เหรียญเข้าไว แนะนำมือใหม่ให้ใช้เลย ไม่ต้องกลัวเหมือนเจ้าอื่น",
    package: "เติม 30,000 Coins",
    timeAgo: "1 สัปดาห์ที่แล้ว",
    verified: true,
    helpful: 38
  }
];

function ReviewCard({ r }: { r: Review }) {
  return (
    <div className="flex-shrink-0 w-[340px] md:w-[380px] bg-brand-surface border border-brand-green-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">
      {/* Decorative quote */}
      <Quote
        className="absolute top-5 right-5 h-7 w-7 text-brand-green-100"
        strokeWidth={2.5}
      />

      {/* Header: avatar + name */}
      <div className="flex items-center gap-3 mb-4">
        {r.avatarUrl ? (
          <img
            src={r.avatarUrl}
            alt={r.name}
            className="w-11 h-11 rounded-full object-cover shadow-sm flex-shrink-0 ring-2 ring-brand-green-100"
          />
        ) : (
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-black text-white text-base shadow-sm flex-shrink-0"
            style={{ background: r.avatarBg }}
          >
            {r.initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-extrabold text-[14px] text-brand-ink truncate">
              {r.name}
            </span>
            {r.verified && (
              <BadgeCheck
                className="h-4 w-4 text-brand-green flex-shrink-0"
                strokeWidth={2.5}
              />
            )}
          </div>
          <div className="text-[11px] font-bold text-brand-ink-soft truncate">
            {r.package}
          </div>
        </div>
      </div>

      {/* Stars */}
      <div className="flex items-center gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < r.rating
                ? "fill-brand-gold text-brand-gold-deep"
                : "fill-zinc-200 text-zinc-300"
            }`}
            strokeWidth={1.5}
          />
        ))}
        <span className="ml-1.5 text-[11px] font-extrabold text-brand-ink-soft">
          {r.rating}.0
        </span>
      </div>

      {/* Review text */}
      <p className="text-[13px] leading-relaxed text-brand-ink-soft font-medium mb-4 line-clamp-4">
        “{r.review}”
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-dashed border-brand-green-100">
        <span className="text-[11px] font-bold text-brand-ink-soft">
          {r.timeAgo}
        </span>
        {r.helpful !== undefined && (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-brand-green bg-brand-green-50 py-1 px-2 rounded-full">
            <ThumbsUp className="h-3 w-3" strokeWidth={2.5} />
            {r.helpful}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ReviewsSection() {
  // Reviews มาจาก context — โหลดครั้งเดียวที่ root, share ทุกหน้า
  const { reviews: apiReviews } = useReviews();

  // Map context shape → component shape
  const mapped = useMemo<Review[]>(
    () =>
      apiReviews.map((r, i) => ({
        id: String(r.id),
        name: r.name,
        initial: r.name.charAt(0) || "?",
        avatarBg: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length],
        avatarUrl: r.avatar ?? null,
        rating: r.rating,
        review: r.review,
        package: r.detail ?? "",
        timeAgo: `${r.timeValue} ${TIME_UNIT_TH[r.timeUnit] ?? r.timeUnit} ที่แล้ว`,
        verified: true,
        helpful: undefined,
      })),
    [apiReviews]
  );

  // Fallback static data ถ้า API ยังไม่มีรีวิว
  const source = mapped.length > 0 ? mapped : REVIEWS;

  // ── สร้าง 2 แถวที่ดู populated เสมอ ──
  //  - รีวิวน้อย ก็วน loop จนได้ขั้นต่ำต่อแถว → marquee ดูเต็มตลอด
  //  - รีวิวเยอะ ก็กระจายเป็น 2 แถวสมดุล
  //  - แต่ละ review ได้รูปกระจายตำแหน่งต่างกันใน 2 แถว
  const { rowA, rowB } = useMemo(() => {
    const MIN_PER_ROW = 8; // ขั้นต่ำเพื่อให้ marquee เต็มจอ
    if (source.length === 0) return { rowA: [], rowB: [] };

    /** rotate array + repeat จนได้จำนวนขั้นต่ำ */
    const buildRow = (offset: number): Review[] => {
      const rotated = [
        ...source.slice(offset),
        ...source.slice(0, offset),
      ];
      const out: Review[] = [];
      while (out.length < MIN_PER_ROW) out.push(...rotated);
      return out;
    };

    return {
      rowA: buildRow(0),
      rowB: buildRow(Math.ceil(source.length / 2)), // offset ครึ่งหนึ่งให้ไม่ซ้ำกัน
    };
  }, [source]);

  return (
    <section className="bg-brand-surface py-20 relative overflow-hidden" id="reviews">
      {/* Soft brand backdrop */}
      <div className="absolute inset-0 pointer-events-none -z-0">
        <div className="absolute top-0 left-1/4 w-1/2 aspect-square rounded-full bg-brand-green/5 blur-[120px]" />
      </div>

      <div className="max-w-[1240px] mx-auto px-7 w-full relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 bg-brand-green-50 text-brand-green font-extrabold text-[12px] uppercase tracking-wider py-1.5 px-4.5 rounded-full">
            <Star className="h-3 w-3 fill-brand-gold text-brand-gold-deep" />
            รีวิวจากลูกค้าจริง
          </div>
          <h2 className="font-display font-black text-3xl md:text-[46px] leading-[1.08] tracking-tight text-brand-ink">
            ลูกค้า<em className="not-italic text-brand-green">+10,000 คน</em>
            <br />
            บอกต่อความประทับใจ
          </h2>
          <p className="text-base leading-relaxed text-brand-ink-soft font-medium">
            รีวิวจริงจากลูกค้าที่ใช้บริการ ไม่ตัดต่อ ไม่จ้าง
            ทุกความคิดเห็นยืนยันตัวตนแล้ว
          </p>

          {/* Rating summary pill */}
          <div className="inline-flex items-center gap-3 bg-brand-surface border border-brand-green-100 py-2.5 px-5 rounded-full shadow-sm">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-brand-gold text-brand-gold-deep"
                  strokeWidth={1.5}
                />
              ))}
            </div>
            <span className="font-display font-black text-lg text-brand-ink leading-none">
              4.9
            </span>
            <span className="w-px h-4 bg-brand-green-100" />
            <span className="text-xs font-bold text-brand-ink-soft">
              จาก <b className="text-brand-ink">2,847 รีวิว</b>
            </span>
          </div>
        </div>

        {/* Marquee rows */}
        <div className="marquee-pause space-y-5 relative">
          {/* Edge fade masks */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 md:w-40 bg-gradient-to-r from-brand-surface to-transparent z-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 md:w-40 bg-gradient-to-l from-brand-surface to-transparent z-20" />

          {/* Row A — scroll left (duplicate 2x สำหรับ seamless marquee) */}
          <div className="overflow-hidden">
            <div className="flex gap-5 w-max animate-marquee">
              {[...rowA, ...rowA].map((r, i) => (
                <ReviewCard key={`a-${i}-${r.id}`} r={r} />
              ))}
            </div>
          </div>

          {/* Row B — scroll right (reverse) */}
          <div className="overflow-hidden">
            <div className="flex gap-5 w-max animate-marquee-reverse">
              {[...rowB, ...rowB].map((r, i) => (
                <ReviewCard key={`b-${i}-${r.id}`} r={r} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA strip */}
        <div className="mt-12 text-center">
          <p className="text-sm font-bold text-brand-ink-soft">
            อยากเป็นรีวิวต่อไป?{" "}
            <a
              href="#packages"
              className="text-brand-green underline decoration-brand-green-300 underline-offset-4 hover:text-brand-green font-extrabold"
            >
              เลือกแพ็กเกจที่ใช่ของคุณเลย ➔
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
