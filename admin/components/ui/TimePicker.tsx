"use client";

import React, { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Where the dropdown opens — default "bottom" */
  align?: "bottom" | "top";
}

const pad = (n: number) => String(n).padStart(2, "0");

function parseValue(v: string): { h: number; m: number } {
  const [hRaw, mRaw] = (v || "00:00").split(":");
  const h = Math.min(23, Math.max(0, parseInt(hRaw, 10) || 0));
  const m = Math.min(59, Math.max(0, parseInt(mRaw, 10) || 0));
  return { h, m };
}

/* ─────────────────────────────────────────────
 * Scrollable column — list 0..count-1, ค่าที่เลือก highlight
 * ───────────────────────────────────────────── */
function ScrollColumn({
  count,
  value,
  onSelect,
  label,
}: {
  count: number;
  value: number;
  onSelect: (n: number) => void;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // scroll selected item into view เมื่อ mount + value เปลี่ยน
  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-val="${value}"]`
    );
    el?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [value]);

  return (
    <div className="flex flex-col min-w-0">
      <div className="text-[10px] font-extrabold text-brand-ink-soft uppercase tracking-widest text-center mb-1.5">
        {label}
      </div>
      <div
        ref={containerRef}
        className="h-44 overflow-y-auto py-1 pr-0.5 [scrollbar-width:thin] [scrollbar-color:var(--color-brand-green)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-brand-green-100 [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        {Array.from({ length: count }).map((_, i) => {
          const selected = i === value;
          return (
            <button
              key={i}
              data-val={i}
              type="button"
              onClick={() => onSelect(i)}
              className={`w-full py-2 text-center text-[15px] font-extrabold rounded-lg transition cursor-pointer ${
                selected
                  ? "bg-brand-green text-white shadow-sm shadow-brand-green/30"
                  : "text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green"
              }`}
            >
              {pad(i)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * TimePicker — wheel-style picker
 * ───────────────────────────────────────────── */
export function TimePicker({
  value,
  onChange,
  className = "",
  placeholder = "00:00",
  disabled,
  align = "bottom",
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { h, m } = parseValue(value);

  // outside-click close
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const setHour = (n: number) => onChange(`${pad(n)}:${pad(m)}`);
  const setMin = (n: number) => onChange(`${pad(h)}:${pad(n)}`);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none transition flex items-center justify-between text-brand-ink ${
          open
            ? "border-brand-green ring-4 ring-brand-green/20"
            : "hover:border-brand-green/60"
        } disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer`}
      >
        <span className={value ? "text-brand-ink" : "text-brand-ink-soft/60"}>
          {value || placeholder}
        </span>
        <Clock className="h-4 w-4 text-brand-ink-soft" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={`absolute z-50 left-0 right-0 bg-brand-surface-soft border border-brand-green-100 rounded-2xl shadow-2xl ring-1 ring-brand-green/20 p-3 animate-in fade-in slide-in-from-top-1 duration-150 ${
            align === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {/* Header — show currently selected big */}
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            <div className="py-3 text-center text-xl font-black text-white bg-gradient-to-br from-brand-green to-brand-green-600 rounded-xl shadow-md shadow-brand-green/30">
              {pad(h)}
            </div>
            <div className="py-3 text-center text-xl font-black text-white bg-gradient-to-br from-brand-green to-brand-green-600 rounded-xl shadow-md shadow-brand-green/30">
              {pad(m)}
            </div>
          </div>

          {/* Two scrollable columns */}
          <div className="grid grid-cols-2 gap-2">
            <ScrollColumn count={24} value={h} onSelect={setHour} label="ชั่วโมง" />
            <ScrollColumn count={60} value={m} onSelect={setMin} label="นาที" />
          </div>

          {/* Quick action */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2.5 w-full py-2 rounded-lg text-xs font-extrabold text-white bg-brand-green hover:bg-brand-green-600 transition cursor-pointer"
          >
            ตกลง
          </button>
        </div>
      )}
    </div>
  );
}
