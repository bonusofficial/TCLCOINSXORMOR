"use client";

/**
 * MOCKUP — กระดิ่งประกาศลอยมุมขวาบน (Notification Bell)
 *
 * เปิดดูที่: http://localhost:3000/demo/bell
 *
 * แนวคิด: แทนที่จะเด้งโมดัล "ประกาศสำคัญ" กลางจอครั้งเดียว
 *  → ทำเป็นกระดิ่งลอยมุมขวาบน "ที่ขยับได้" (สั่นเรียกความสนใจ + จุดแดงแจ้งเตือน)
 *  → ตัวแทนกดดูประกาศซ้ำได้ตลอดเวลา ไม่พลาดข้อมูล
 *
 * นี่เป็น mockup (ข้อมูลประกาศ hardcode) ยังไม่ผูกกับ DB/แอดมิน
 */

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  X,
  Megaphone,
  Clock,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

/* ── ข้อมูลประกาศตัวอย่าง (อนาคตดึงจากแอดมิน) ── */
const ANNOUNCEMENT = {
  badge: "ประกาศสำคัญ",
  title: "วิธีสมัครตัวแทน ORMOR TOPUP COINS",
  intro:
    "สำหรับตัวแทนใหม่ที่ยังสมัครไม่เป็น สามารถดูวิธีสมัครแบบละเอียดได้ที่ลิงก์ด้านล่างนี้เลยครับ 👇✨",
  checklist: [
    "สมัครตัวแทน",
    "รับรหัสตัวแทน",
    "สมัครสมาชิกเว็บไซต์",
    "ตั้งชื่อใน LINE OpenChat",
    "วิธีรับราคาตัวแทน",
  ],
  link: "https://shorturl.asia/iEMDr",
  lineOfficial: "@831sccwr",
  updatedAt: "เมื่อสักครู่",
};

export default function BellMockupPage() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  /* ปิดเมื่อคลิกนอก panel */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* ปิดด้วย Esc */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggle = () => {
    setOpen((o) => !o);
    setUnread(false); // เปิดแล้วถือว่าอ่านแล้ว — จุดแดง + การสั่นหยุด
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#a3e063] via-[#8ad857] to-[#72c948] font-sans">
      {/* keyframes เฉพาะ mockup นี้ */}
      <style>{`
        @keyframes bellSwing {
          0%, 38%, 100% { transform: rotate(0deg); }
          6%  { transform: rotate(16deg); }
          12% { transform: rotate(-14deg); }
          18% { transform: rotate(11deg); }
          24% { transform: rotate(-8deg); }
          30% { transform: rotate(5deg); }
          34% { transform: rotate(-3deg); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: .65; }
        }
        @keyframes ringPulse {
          0%   { box-shadow: 0 0 0 0 rgba(244,63,94,.55); }
          70%  { box-shadow: 0 0 0 14px rgba(244,63,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(244,63,94,0); }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(-12px) scale(.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .bell-swing { transform-origin: 50% 12%; animation: bellSwing 2.6s ease-in-out infinite; }
        .ring-pulse { animation: ringPulse 1.9s ease-out infinite; }
        .dot-pulse  { animation: dotPulse 1.4s ease-in-out infinite; }
        .panel-in   { animation: panelIn .22s cubic-bezier(0.22,0.8,0.3,1); }
      `}</style>

      {/* ── Faux navbar (จัดบริบทให้เหมือนหน้าจริง) ── */}
      <div className="pointer-events-none sticky top-0 z-10 flex justify-center px-4 pt-5">
        <div className="flex w-full max-w-3xl items-center justify-between rounded-full bg-[#4e7d2e]/90 px-6 py-3 text-white shadow-lg backdrop-blur">
          <div className="flex items-center gap-5 text-sm font-extrabold">
            <span>🏠 หน้าหลัก</span>
            <span className="opacity-80">🎫 จองคิว</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-white/20" />
        </div>
      </div>

      {/* ── เนื้อหา demo ── */}
      <div className="relative z-0 mx-auto max-w-2xl px-6 pt-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/25 px-4 py-1.5 text-[12px] font-black uppercase tracking-wider text-white backdrop-blur">
          Mockup · Notification Bell
        </span>
        <h1 className="mt-5 text-4xl font-black leading-tight text-white drop-shadow-sm sm:text-5xl">
          กระดิ่งประกาศ<br />มุมขวาบน
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm font-bold leading-relaxed text-white/90">
          กระดิ่งจะ<b>สั่นเรียกความสนใจ</b>พร้อมจุดแดงเมื่อมีประกาศใหม่ —
          ตัวแทนกดเข้าไปอ่านได้ตลอดเวลา ไม่พลาดข้อมูลแม้ปิดป็อปอัปไปแล้ว
        </p>

        <div className="mx-auto mt-8 inline-flex flex-col gap-2 rounded-2xl bg-white/90 px-6 py-4 text-left text-[13px] font-bold text-[#2f5e1e] shadow-xl">
          <span className="flex items-center gap-2">
            <span className="text-base">👆</span> กดกระดิ่งมุมขวาบนเพื่อเปิด/ปิดประกาศ
          </span>
          <button
            onClick={() => setUnread(true)}
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#39C848] px-4 py-1.5 text-[12px] font-black text-white transition hover:bg-[#2BAA38] cursor-pointer"
          >
            <Bell className="h-3.5 w-3.5" /> รีเซ็ตตัวอย่าง (จำลองมีประกาศใหม่)
          </button>
        </div>
      </div>

      {/* ════════ FLOATING BELL + PANEL ════════ */}
      <div className="fixed right-5 top-24 z-50 sm:right-8">
        {/* Bell button */}
        <button
          ref={btnRef}
          type="button"
          onClick={toggle}
          aria-label="ประกาศจากระบบ"
          aria-expanded={open}
          className={`relative ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.4)] ring-1 ring-black/5 transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
            unread ? "ring-pulse" : ""
          }`}
        >
          <Bell
            className={`h-6 w-6 text-amber-500 ${unread && !open ? "bell-swing" : ""}`}
            strokeWidth={2.4}
            fill="currentColor"
          />
          {unread && (
            <span className="absolute right-3 top-3 h-3 w-3 rounded-full border-2 border-white bg-rose-500 dot-pulse" />
          )}
        </button>

        {/* Panel */}
        {open && (
          <div
            ref={panelRef}
            className="panel-in absolute right-0 top-16 w-[340px] origin-top-right overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:w-[380px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
              <span className="flex items-center gap-2 text-[14px] font-black text-[#1f7a2e]">
                <Megaphone className="h-4 w-4" /> ประกาศจากระบบ
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="ปิด"
                className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="max-h-[70vh] overflow-y-auto">
              {/* Cover (placeholder รูปประกาศ — อนาคตแอดมินอัปโหลดเอง) */}
              <div className="relative flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-[#39C848] via-[#2BAA38] to-[#128C2E]">
                <div className="text-center text-white">
                  <Megaphone className="mx-auto h-9 w-9 drop-shadow" />
                  <p className="mt-1.5 text-lg font-black drop-shadow">ORMOR TOPUP COINS</p>
                  <p className="text-[11px] font-bold opacity-90">คู่มือสำหรับตัวแทน</p>
                </div>
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-black text-[#1f7a2e]">
                  {ANNOUNCEMENT.badge}
                </span>
              </div>

              <div className="px-4 py-4">
                <h3 className="flex items-start gap-1.5 text-[15px] font-black leading-snug text-zinc-800">
                  📖 {ANNOUNCEMENT.title}
                </h3>
                <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-zinc-600">
                  {ANNOUNCEMENT.intro}
                </p>

                {/* Checklist */}
                <ul className="mt-3 space-y-1.5">
                  {ANNOUNCEMENT.checklist.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-[12.5px] font-bold text-zinc-700">
                      <ShieldCheck className="h-4 w-4 flex-shrink-0 text-[#39C848]" />
                      {c}
                    </li>
                  ))}
                </ul>

                {/* Link */}
                <a
                  href={ANNOUNCEMENT.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#39C848] py-2.5 text-[13px] font-black text-white transition hover:bg-[#2BAA38]"
                >
                  เปิดคู่มือสมัครตัวแทน
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-[#39C848]/40 py-2.5 text-[13px] font-black text-[#1f7a2e] transition hover:bg-[#39C848]/10"
                >
                  <svg className="w-[24px] h-auto" fill="#ffff" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>LINE</title><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                  สอบถาม LINE Official {ANNOUNCEMENT.lineOfficial}
                </a>

                {/* Footer */}
                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 text-[11px] font-bold text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> อัปเดตล่าสุด
                  </span>
                  <span>{ANNOUNCEMENT.updatedAt}</span>
                </div>
              </div>
            </div>

            {/* CTA bottom */}
            <button
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-1.5 bg-[#0F2118] py-3 text-[13px] font-black text-white transition hover:bg-[#15211A] cursor-pointer"
            >
              รับทราบและเริ่มใช้งาน
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
