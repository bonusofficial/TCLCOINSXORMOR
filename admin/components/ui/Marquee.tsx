"use client";

import { Megaphone } from "lucide-react";

/**
 * Marquee — แถบข้อความวิ่งแนวนอน (ลูปไม่มีรอยต่อ, หยุดเมื่อ hover)
 * ใช้ animate-marquee (translateX 0 → -50%) จาก globals.css
 */
export function Marquee({ text }: { text: string }) {
  const t = (text ?? "").trim();
  if (!t) return null;

  return (
    <div className="marquee-pause relative flex items-center gap-2.5 overflow-hidden rounded-2xl border border-rose-500/30 bg-rose-500/10 py-2.5 pl-4">
      <span className="z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm">
        <Megaphone className="h-3.5 w-3.5" />
      </span>
      {/* fade ขอบซ้าย/ขวา */}
      <span className="pointer-events-none absolute inset-y-0 left-12 z-10 w-8 bg-gradient-to-r from-rose-500/15 to-transparent" />
      <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-brand-surface to-transparent" />
      {/* scroll window ต้อง flex-1 + min-w-0 ถึงจะบีบให้ content overflow แล้วเลื่อนได้ */}
      <div className="min-w-0 flex-1 overflow-hidden pr-2">
        <div
          className="flex w-max animate-marquee whitespace-nowrap will-change-transform"
          style={{ animationDuration: "22s" }}
        >
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              aria-hidden={i > 0}
              className="px-8 text-[13px] font-extrabold text-rose-400"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
