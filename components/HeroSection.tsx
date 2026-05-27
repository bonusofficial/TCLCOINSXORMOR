"use client";

import React from "react";
import {
  Zap,
  ShieldCheck,
  Clock,
  ArrowRight,
  MessageSquare,
  AlertOctagon,
} from "lucide-react";
import Image from "next/image";
interface HeroSectionProps {
  onOpenBooking: () => void;
}

export default function HeroSection({ onOpenBooking }: HeroSectionProps) {
  return (
    <section className="relative pt-16 pb-20 overflow-hidden">
      {/* Warning ticker alert - Moved here right under CTA */}
      <div className="flex justify-center">
      <div className="bg-gradient-to-r from-[#FFF1EF] to-[#FFE7E3] border border-[#FFD5CE] rounded-2xl flex items-center gap-3.5 py-2.5 px-4.5 shadow-sm overflow-hidden relative max-w-6xl">
        <div className="flex items-center gap-1.5 flex-shrink-0 bg-brand-coral text-white font-extrabold text-xs py-1 px-3 rounded-full relative z-10 shadow-sm shadow-brand-coral/20">
          <AlertOctagon className="h-3.5 w-3.5" />
          คำเตือน
        </div>
        <div className="overflow-hidden flex-1 relative z-0">
          <p className="whitespace-nowrap font-bold text-xs text-[#C4382A] animate-scroll-ticker">
            ห้ามกดจองเล่น ๆ หากตรวจพบ ปรับ 50 บาท / 1 ครั้ง •
            กรุณาจองเฉพาะที่ต้องการเติมจริงเท่านั้น • ขอบคุณที่ให้ความร่วมมือ
          </p>
        </div>
      </div>
      </div>
      {/* Background radial glow */}
      <div className="absolute inset-0 z-[-1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#F6FAF2] to-[#F6FAF2]" />
        <div className="absolute top-[-10%] left-[5%] w-[50%] aspect-square rounded-full bg-brand-green/10 blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[45%] aspect-square rounded-full bg-brand-gold/8 blur-[100px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(#7ACB53 1.4px, transparent 1.4px)",
            backgroundSize: "34px 34px",
            maskImage: "linear-gradient(to bottom, #000 80%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to bottom, #000 80%, transparent)",
          }}
        />
      </div>

      {/* Floating Animated LINE App Nodes */}
      <img
        src="/LINE_APP_Android.png"
        alt="LINE App"
        className="hidden xl:absolute top-[80px] left-[2%] w-11 h-11 object-contain pointer-events-none select-none animate-bob-1 drop-shadow-md opacity-85"
      />
      <div className="hidden xl:absolute top-[240px] left-[40%] w-8 h-8 rounded-full bg-gradient-to-br from-[#FFE08A] via-brand-gold to-brand-gold-deep shadow-md flex items-center justify-center font-extrabold text-[10px] text-[#7a4d00] pointer-events-none select-none animate-bob-2 opacity-80">
        <span className="rotate-[-12deg]">฿</span>
      </div>
      <img
        src="/LINE_APP_Android.png"
        alt="LINE App"
        className="hidden xl:absolute bottom-[140px] left-[1%] w-9.5 h-9.5 object-contain pointer-events-none select-none animate-bob-3 drop-shadow-md opacity-85"
      />

      <div className="max-w-[1240px] mx-auto px-7 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-8 items-center">
          {/* Left Column (Copy content) */}
          <div className="flex flex-col space-y-6">
            {/* Live Pulser Eyebrow */}
            <div className="self-start inline-flex items-center gap-2 bg-brand-green-50/60 border border-brand-green-100 py-1.5 px-3.5 rounded-full font-bold text-[12.5px] text-brand-green-700 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
              <span>✅ รองรับตัวแทน & ลูกค้าทั่วไป</span>
            </div>

            {/* Headline */}
            <h1 className="font-display font-black text-[44px] md:text-[62px] lg:text-[70px] leading-[0.98] tracking-tight text-brand-ink animate-in fade-in slide-in-from-bottom-3 duration-700">
              เติม
              <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-brand-green-600 to-brand-green z-10 px-1">
                เหรียญไลน์
                <span className="absolute left-0 right-0 bottom-1 h-3 md:h-4 bg-brand-gold/45 rounded-lg z-[-1] rotate-[-1deg]" />
              </span>
              <br />
              ไวใน 5 นาที
            </h1>

            {/* Sub/Lead */}
            <p className="max-w-xl text-base md:text-lg leading-relaxed text-brand-ink-soft font-medium animate-in fade-in slide-in-from-bottom-4 duration-800">
              ทำไมต้องเติมกับเรา? เหรียญแท้ 100% ปลอดภัยมั่นใจได้ ขั้นตอนง่าย
              ใช้เพียงเบอร์/รหัสผ่าน หรือสแกน QR Code
              เพื่อจองคิวเติมเงินได้อย่างรวดเร็ว
            </p>

            {/* OS Support Notice Box */}
            <div className="self-start inline-flex items-center gap-2 bg-amber-50 border border-amber-200 py-2 px-4 rounded-xl text-xs md:text-sm font-bold text-amber-800 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-800">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              ⚠️ รองรับเฉพาะระบบปฏิบัติการ Android เท่านั้น
            </div>

            {/* Chips Feats */}
            <div className="flex flex-wrap gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-800">
              <span className="inline-flex items-center gap-2 bg-white border border-brand-green-100 py-2.5 px-4 rounded-full text-xs font-bold text-brand-ink shadow-sm">
                <Zap className="h-4 w-4 text-brand-green-600 fill-brand-green-100" />
                ไม่ต้องรอนาน
              </span>
              <span className="inline-flex items-center gap-2 bg-white border border-brand-green-100 py-2.5 px-4 rounded-full text-xs font-bold text-brand-ink shadow-sm">
                <ShieldCheck className="h-4.5 w-4.5 text-brand-green-600 fill-brand-green-100" />
                เหรียญแท้ 100%
              </span>
              <span className="inline-flex items-center gap-2 bg-white border border-brand-green-100 py-2.5 px-4 rounded-full text-xs font-bold text-brand-ink shadow-sm">
                <Clock className="h-4.5 w-4.5 text-brand-green-600 fill-brand-green-100" />
                บริการ 24/7
              </span>
            </div>

            {/* Hero CTAs */}
            <div className="flex flex-col gap-4 pt-2 animate-in fade-in slide-in-from-bottom-5 duration-900">
              <div className="flex flex-wrap gap-3.5 items-center">
                <button
                  onClick={onOpenBooking}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-extrabold text-sm md:text-base text-white bg-brand-green-700 hover:bg-[#3D8520] shadow-lg shadow-brand-green-700/20 hover:shadow-xl hover:shadow-brand-green-700/30 hover:-translate-y-1 transition duration-200 cursor-pointer"
                >
                  จองคิวเลย
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* c */}
          <div className="flex justify-center items-center relative animate-in zoom-in-90 duration-700">
            <div className="">
              {/* Glass shine element overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

              {/* ORMOR Logo WebP Image */}
              <img
                src="/logo.webp"
                alt="ORMOR Topup Coins Logo"
                className="w-[78%] h-auto relative z-10 drop-shadow-xl animate-bob-bt2"
              />

              {/* Floating badges on the visual cards */}
              <div className="absolute top-[8%] left-[-4%] z-20 bg-white rounded-2xl p-3 shadow-md flex items-center gap-2.5 animate-bob-bt1 border border-brand-green-100">
                <span className="w-9.5 h-9.5 rounded-xl bg-brand-green-50 text-brand-green-700 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <span className="flex flex-col leading-tight">
                  <b className="text-[13px] font-display font-extrabold text-brand-ink">
                    ปลอดภัย 100%
                  </b>
                  <span className="text-[10px] text-brand-ink-soft font-bold">
                    เหรียญแท้ทุกออเดอร์
                  </span>
                </span>
              </div>

              <div className="absolute bottom-[12%] right-[-4%] z-20 bg-white rounded-2xl p-3 shadow-md flex items-center gap-2.5 animate-bob-bt2 border border-brand-green-100">
                <span className="w-9.5 h-9.5 rounded-xl bg-[#FFF3D1] text-brand-gold-deep flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </span>
                <span className="flex flex-col leading-tight">
                  <b className="text-[13px] font-display font-extrabold text-brand-ink">
                    ไวสุด 5 นาที
                  </b>
                  <span className="text-[10px] text-brand-ink-soft font-bold">
                    เติมไวทันใจระบบดี
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User Trust Banner strip */}
        <div className="mt-14 flex flex-wrap items-center gap-6 md:gap-8 justify-between bg-white border border-brand-green-100 p-6 md:py-6 md:px-8.5 rounded-[32px] shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3.5 select-none">
              <span className="w-9.5 h-9.5 rounded-full border-[2.5px] border-white text-xs font-bold text-white bg-gradient-to-tr from-[#FF8A65] to-[#FF7043] flex items-center justify-center shadow-sm">
                อ
              </span>
              <span className="w-9.5 h-9.5 rounded-full border-[2.5px] border-white text-xs font-bold text-white bg-gradient-to-tr from-brand-green to-brand-green-600 flex items-center justify-center shadow-sm">
                ร
              </span>
              <span className="w-9.5 h-9.5 rounded-full border-[2.5px] border-white text-xs font-bold text-white bg-gradient-to-tr from-[#42A5F5] to-[#1E88E5] flex items-center justify-center shadow-sm">
                ม
              </span>
              <span className="w-9.5 h-9.5 rounded-full border-[2.5px] border-white text-xs font-bold text-white bg-brand-green-700 flex items-center justify-center shadow-sm">
                +99
              </span>
            </div>
            <div className="text-xs font-bold leading-relaxed text-brand-ink-soft">
              รีวิวจากผู้ใช้จริง
              <br />
              <b className="text-brand-ink text-sm font-black">
                +10,000 ออเดอร์
              </b>
            </div>
          </div>

          <div className="hidden md:block w-px h-9.5 bg-brand-green-100" />

          <div className="flex flex-col">
            <span className="font-display font-black text-2xl lg:text-3xl text-brand-green-700 leading-none">
              99.9%
            </span>
            <span className="text-[11.5px] font-bold text-brand-ink-soft mt-1">
              เสถียรภาพระบบการทำงาน
            </span>
          </div>

          <div className="hidden md:block w-px h-9.5 bg-brand-green-100" />

          <a
            href="https://line.me/R/ti/p/@ormorcoins"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col group/stat transition duration-200"
          >
            <span className="font-display font-black text-2xl lg:text-3xl text-brand-green-700 leading-none flex items-center gap-1 group-hover/stat:text-brand-green-600">
              ดูรีวิวลูกค้า ➔
            </span>
            <span className="text-[11.5px] font-bold text-brand-ink-soft mt-1 underline decoration-brand-green-300 group-hover/stat:text-brand-green-700">
              คลิกเพื่อรับชมรีวิว
            </span>
          </a>

          <div className="hidden md:block w-px h-9.5 bg-brand-green-100" />

          <div className="flex flex-col">
            <span className="font-display font-black text-2xl lg:text-3xl text-brand-green-700 leading-none">
              24/7
            </span>
            <span className="text-[11.5px] font-bold text-brand-ink-soft mt-1">
              ทีมงานแสตนบายช่วยเหลือ
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
