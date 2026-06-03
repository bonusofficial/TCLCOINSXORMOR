"use client";

import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  /** Selected date in ISO format "YYYY-MM-DD" */
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  /** Min date in ISO format */
  min?: string;
  /** Max date in ISO format */
  max?: string;
  disabled?: boolean;
  /** Where dropdown opens — default "bottom" */
  align?: "bottom" | "top";
  /** Display year as Buddhist Era (+543) — default true for Thai users */
  buddhistYear?: boolean;
}

const TH_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const TH_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const TH_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseISO(s: unknown): Date | null {
  if (typeof s !== "string" || !s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDisplay(s: string, buddhist: boolean): string {
  const d = parseISO(s);
  if (!d) return "";
  const year = buddhist ? d.getFullYear() + 543 : d.getFullYear();
  return `${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]} ${year}`;
}

export function DatePicker({
  value,
  onChange,
  className = "",
  placeholder = "เลือกวันที่",
  min,
  max,
  disabled,
  align = "bottom",
  buddhistYear = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = parseISO(value);
  const today = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const minDate = min ? parseISO(min) : null;
  const maxDate = max ? parseISO(max) : null;

  // View month/year — defaults ตามค่าเลือก หรือวันนี้
  const [viewMonth, setViewMonth] = useState(() => {
    const d = selected ?? today;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // เมื่อเปิด: reset view ไปเดือนของ value
  useEffect(() => {
    if (!open) return;
    const d = selected ?? today;
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Outside click ปิด
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* ── สร้าง grid วัน ── */
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = อาทิตย์
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{
    day: number;
    date: Date;
    disabled: boolean;
    isToday: boolean;
    isSelected: boolean;
  } | null> = [];

  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const disabledDay =
      (!!minDate && date < minDate) || (!!maxDate && date > maxDate);
    cells.push({
      day: d,
      date,
      disabled: disabledDay,
      isToday: date.getTime() === today.getTime(),
      isSelected: selected !== null && date.getTime() === selected.getTime(),
    });
  }

  const goPrev = () => setViewMonth(new Date(year, month - 1, 1));
  const goNext = () => setViewMonth(new Date(year, month + 1, 1));

  const pickDate = (d: Date) => {
    onChange(toISO(d));
    setOpen(false);
  };

  const displayYear = buddhistYear ? year + 543 : year;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full rounded-xl border bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none transition flex items-center justify-between text-brand-ink cursor-pointer ${
          open
            ? "border-brand-green ring-4 ring-brand-green/20"
            : "border-brand-green-100 hover:border-brand-green/60"
        } disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <span className={value ? "text-brand-ink" : "text-brand-ink-soft/60"}>
          {value ? formatDisplay(value, buddhistYear) : placeholder}
        </span>
        <CalendarDays className="h-4 w-4 text-brand-ink-soft flex-shrink-0" />
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div
          className={`absolute z-50 left-0 w-[300px] bg-brand-surface-soft border border-brand-green-100 rounded-2xl shadow-2xl ring-1 ring-brand-green/20 p-3 animate-in fade-in slide-in-from-top-1 duration-150 ${
            align === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {/* Header — month/year + navigation */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="w-8 h-8 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:text-brand-green hover:border-brand-green flex items-center justify-center transition cursor-pointer flex-shrink-0"
              aria-label="เดือนก่อน"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="font-display font-extrabold text-sm text-brand-ink text-center flex-1">
              {TH_MONTHS_FULL[month]} {displayYear}
            </div>
            <button
              type="button"
              onClick={goNext}
              className="w-8 h-8 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:text-brand-green hover:border-brand-green flex items-center justify-center transition cursor-pointer flex-shrink-0"
              aria-label="เดือนถัดไป"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {TH_DAYS.map((d, i) => (
              <div
                key={i}
                className={`text-center text-[10px] font-extrabold py-1 ${
                  i === 0 ? "text-rose-400" : "text-brand-ink-soft"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c) return <div key={i} className="aspect-square" />;
              const isSunday = i % 7 === 0;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !c.disabled && pickDate(c.date)}
                  disabled={c.disabled}
                  className={`aspect-square rounded-lg text-[12.5px] font-bold transition cursor-pointer ${
                    c.isSelected
                      ? "bg-gradient-to-br from-brand-green to-brand-green-600 text-white shadow-md shadow-brand-green/40 font-black"
                      : c.isToday
                      ? "bg-brand-green-50 text-brand-green font-extrabold ring-1 ring-brand-green"
                      : c.disabled
                      ? "text-brand-ink-soft/30 cursor-not-allowed"
                      : isSunday
                      ? "text-rose-400 hover:bg-brand-green-50 hover:text-brand-green"
                      : "text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green"
                  }`}
                >
                  {c.day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <button
            type="button"
            onClick={() => pickDate(today)}
            className="mt-3 w-full py-2 rounded-lg text-xs font-extrabold text-white bg-brand-green hover:bg-brand-green-600 transition cursor-pointer"
          >
            วันนี้
          </button>
        </div>
      )}
    </div>
  );
}
