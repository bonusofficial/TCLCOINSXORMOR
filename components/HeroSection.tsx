"use client";

import React, { useEffect, useState } from "react";
import { useConfig } from "@/lib/contexts/PublicDataContext";
import {
  Zap,
  ShieldCheck,
  Clock,
  ArrowRight,
  MessageCircle,
  AlertOctagon,
  Users,
  Crown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { publicApi } from "@/lib/eden";

interface HeroSectionProps {
  onOpenBooking: () => void;
}

interface Banner {
  id: number;
  image: string;
}


const LINE_GROUPS = {
  member: {
    label: "ลูกค้าทั่วไป",
    desc: "รับโปรโมชั่นใหม่ แจ้งเตือนคิว และดีลพิเศษเฉพาะสมาชิก LINE",
    href: "https://line.me/R/ti/p/@ormorcoins",
    badge: "@ormorcoins"
  },
  agent: {
    label: "ตัวแทนจำหน่าย",
    desc: "เข้าถึงเรท VIP ส่วนลด 5% ทุกออเดอร์ และคิวพิเศษเฉพาะตัวแทน",
    href: "https://line.me/R/ti/p/@ormoragent",
    badge: "@ormoragent"
  }
} as const;

export default function HeroSection({ onOpenBooking }: HeroSectionProps) {
  const { config } = useConfig();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerPaused, setBannerPaused] = useState(false);
  const [qrTab, setQrTab] = useState<"member" | "agent">("member");

  useEffect(() => {
    let mounted = true;
    publicApi.banners.api.v0.banners.get().then(({ data, error }) => {
      if (!mounted) return;
      if (!error && data?.ok) {
        setBanners(data.data);
      }
      setLoadingBanners(false);
    }).catch(() => {
      if (mounted) setLoadingBanners(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (bannerPaused || banners.length <= 1) return;
    const id = setInterval(() => {
      setBannerIndex((i) => (i + 1) % banners.length);
    }, 4500);
    return () => clearInterval(id);
  }, [bannerPaused, banners.length]);

  const goPrev = () =>
    setBannerIndex((i) => (i - 1 + banners.length) % banners.length);
  const goNext = () => setBannerIndex((i) => (i + 1) % banners.length);

  return (
    <section className="relative pt-10 md:pt-14 pb-20 overflow-hidden bg-brand-surface">

      {/* Soft brand backdrop — no banner here, just gentle color */}
      <div className="absolute inset-0 pointer-events-none -z-0">
        <div className="absolute top-[-15%] left-[10%] w-[40%] aspect-square rounded-full bg-brand-green/8 blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[40%] aspect-square rounded-full bg-brand-gold/8 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(#39C848 1.4px, transparent 1.4px)",
            backgroundSize: "34px 34px",
            maskImage: "linear-gradient(to bottom, #000 60%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 60%, transparent)",
          }}
        />
      </div>

      <div className="max-w-[1240px] mx-auto px-7 w-full relative z-10">

        {/* Warning ticker */}
        <div className="bg-gradient-to-r from-[#FFF1EF] to-[#FFE7E3] border border-[#FFD5CE] rounded-2xl flex items-center gap-3.5 py-2.5 px-4.5 shadow-sm overflow-hidden relative w-full">
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

        {/* ════════ HERO TEXT — centered, premium ════════ */}
        <div className="text-center max-w-3xl mx-auto pt-14 pb-10 md:pb-14">
          {/* Eyebrow badge — soft mint with gold sparkle */}
          <div className="inline-flex items-center gap-1.5 bg-brand-mint/45 border border-brand-green text-brand-green font-extrabold text-[11.5px] py-1.5 px-4 rounded-full shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Sparkles className="h-3 w-3 fill-brand-gold text-brand-gold-deep" strokeWidth={2} />
            รองรับตัวแทน & ลูกค้าทั่วไป
          </div>

          {/* Headline */}
          <h1 className="mt-5 font-display font-black leading-[1.06] tracking-tight text-brand-ink animate-in fade-in slide-in-from-bottom-3 duration-700">
            <span className="block text-[28px] md:text-[40px] lg:text-[48px] text-transparent bg-clip-text bg-gradient-to-r from-brand-gold-light via-brand-gold to-brand-gold-deep drop-shadow-[0_2px_6px_rgba(240,168,0,0.35)]">
              ORMOR TOPUP COINS
            </span>
            <span className="block mt-2 text-[26px] md:text-[40px] lg:text-[48px] text-brand-ink">
              รับจองคิวเติม
              <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-brand-green-700 via-brand-green-600 to-brand-green z-10 px-1 inline-block text-glow-green pb-2 md:pb-3">
                เหรียญไลน์
                <span className="pointer-events-none absolute left-1 right-1 bottom-0 h-1.5 md:h-2 bg-gradient-to-r from-brand-gold-light via-brand-gold to-brand-gold-deep rounded-full rotate-[-1.5deg] shadow-[0_0_12px_rgba(255,201,40,0.55)]" />
              </span>
            </span>
            <span className="block mt-1 text-[28px] md:text-[44px] lg:text-[54px]">
              ไวใน <span className="text-brand-green">5 นาที</span>
            </span>
          </h1>

          {/* Sub-copy */}
          <p className="mt-5 max-w-xl mx-auto text-[15px] md:text-base leading-relaxed text-brand-ink-soft font-medium animate-in fade-in slide-in-from-bottom-4 duration-800">
            TCLCOINSXORMOR ยินดีให้บริการ <b className="text-brand-ink">สะดวก รวดเร็ว</b> และ
            <b className="text-brand-ink"> ปลอดภัยที่สุด</b> เหรียญแท้ 100% ทุกออเดอร์
          </p>

          {/* Dual CTAs */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-900">
            <Link
              href="#booking"
              className="relative inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-extrabold text-sm md:text-base text-white bg-gradient-to-r from-brand-green-700 via-brand-green-600 to-brand-green shadow-lg shadow-brand-green-600/35 hover:shadow-xl hover:shadow-brand-lime/50 hover:-translate-y-1 transition duration-200 cursor-pointer overflow-hidden group/cta"
            >
              <span className="absolute inset-0 rounded-full ring-2 ring-brand-lime/0 group-hover/cta:ring-brand-lime/60 transition duration-300 pointer-events-none" />
              จองคิวเลย
              <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover/cta:translate-x-1" />
            </Link>
            <a
              href="/queue"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-extrabold text-sm md:text-base bg-brand-surface text-brand-ink border border-brand-green-100 shadow-sm hover:border-brand-green hover:text-brand-green hover:-translate-y-1 transition duration-200 cursor-pointer"
            >
              ดูแพ็กเกจทั้งหมด
            </a>
          </div>

          {/* Feature mini chips — centered */}
          <div className="mt-7 flex flex-wrap justify-center gap-2 animate-in fade-in slide-in-from-bottom-5 duration-900">
            <span className="inline-flex items-center gap-1.5 bg-brand-surface border border-brand-green-100 py-1.5 px-3 rounded-full text-[11.5px] font-bold text-brand-ink shadow-sm">
              <Zap className="h-3.5 w-3.5 text-brand-green fill-brand-green-100" />
              ไม่ต้องรอนาน
            </span>
            <span className="inline-flex items-center gap-1.5 bg-brand-surface border border-brand-green-100 py-1.5 px-3 rounded-full text-[11.5px] font-bold text-brand-ink shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-green fill-brand-green-100" />
              เหรียญแท้ 100%
            </span>
            <span className="inline-flex items-center gap-1.5 bg-brand-surface border border-brand-green-100 py-1.5 px-3 rounded-full text-[11.5px] font-bold text-brand-ink shadow-sm">
              <Clock className="h-3.5 w-3.5 text-brand-green fill-brand-green-100" />
              บริการ 24/7
            </span>
            <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 py-1.5 px-3 rounded-full text-[11.5px] font-bold text-amber-800 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Android เท่านั้น
            </span>
          </div>
        </div>

        {/* ════════ PREMIUM BANNER CARD — separated, with arrows ════════ */}
        <div
          className="relative rounded-[36px] overflow-hidden shadow-[0_30px_60px_-25px_rgba(8, 238, 32,0.35)] border border-brand-green-100 bg-brand-surface animate-in fade-in slide-in-from-bottom-6 duration-1000"
          onMouseEnter={() => setBannerPaused(true)}
          onMouseLeave={() => setBannerPaused(false)}
          role="region"
          aria-label="โปรโมชั่นและประกาศ"
        >
          {loadingBanners ? (
            <div className="aspect-[1920/720] md:aspect-[1920/620] w-full bg-zinc-200 animate-pulse flex flex-col items-center justify-center">
              <span className="w-12 h-12 border-4 border-zinc-300 border-t-brand-green rounded-full animate-spin mb-4" />
              <span className="text-zinc-400 font-bold text-sm">กำลังโหลดรูปภาพ...</span>
            </div>
          ) : banners.length === 0 ? (
            <div className="aspect-[1920/720] md:aspect-[1920/620] w-full bg-zinc-50 flex items-center justify-center text-zinc-400 font-bold">
              ไม่มีแบนเนอร์
            </div>
          ) : (
            <>
              {/* Slides track */}
              <div className="aspect-[1920/720] md:aspect-[1920/620] relative">
                <div
                  className="flex h-full w-full transition-transform duration-[700ms] ease-[cubic-bezier(0.22,0.8,0.3,1)]"
                  style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
                >
                  {banners.map((b, i) => (
                    <div key={b.id} className="w-full h-full flex-shrink-0 relative">
                      <img
                        src={b.image}
                        alt={`แบนเนอร์ ${i + 1}`}
                        className="w-full h-full object-cover select-none"
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Prev arrow */}
              {banners.length > 1 && (
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="แบนเนอร์ก่อนหน้า"
                  className="absolute top-1/2 left-4 md:left-6 -translate-y-1/2 flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-full bg-brand-surface/90 backdrop-blur-sm text-brand-ink hover:bg-brand-surface hover:scale-110 active:scale-95 shadow-lg transition duration-200 cursor-pointer z-10"
                >
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
                </button>
              )}

              {/* Next arrow */}
              {banners.length > 1 && (
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="แบนเนอร์ถัดไป"
                  className="absolute top-1/2 right-4 md:right-6 -translate-y-1/2 flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-full bg-brand-surface/90 backdrop-blur-sm text-brand-ink hover:bg-brand-surface hover:scale-110 active:scale-95 shadow-lg transition duration-200 cursor-pointer z-10"
                >
                  <ChevronRight className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
                </button>
              )}

              {/* Bottom gradient + dots */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
              {banners.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setBannerIndex(i)}
                      aria-label={`ไปแบนเนอร์ ${i + 1}`}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        i === bannerIndex
                          ? "w-8 bg-brand-surface shadow-md"
                          : "w-2 bg-brand-surface/60 hover:bg-brand-surface/85"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Counter badge top-right */}
              {banners.length > 1 && (
                <div className="absolute top-4 right-4 md:top-5 md:right-5 bg-black/40 backdrop-blur-sm text-white text-[11px] font-extrabold py-1 px-2.5 rounded-full z-10">
                  {bannerIndex + 1} / {banners.length}
                </div>
              )}
            </>
          )}
        </div>

        {/* ════════ QR CODE — Join LINE Group, centered card ════════ */}
        <div className="mt-12 bg-brand-surface border border-brand-green-100 rounded-3xl p-6 md:p-7 shadow-md max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
            {/* QR with scanner corner ticks */}
            <div className="relative flex-shrink-0 p-2.5 bg-brand-surface border-2 border-brand-green-100 rounded-2xl self-center md:self-start">
              <img
                src={qrTab === "member" ? (config.qrcodenormal || "/qrcode.jpeg") : (config.qrcodeagent || "/qrcode.jpeg")}
                alt={`QR เข้ากลุ่ม LINE ${LINE_GROUPS[qrTab].label}`}
                className="w-32 h-32 md:w-36 md:h-36 object-contain rounded-lg"
              />
              <span className="absolute top-1 left-1 w-3.5 h-3.5 border-l-[2.5px] border-t-[2.5px] border-brand-green-600 rounded-tl-md" />
              <span className="absolute top-1 right-1 w-3.5 h-3.5 border-r-[2.5px] border-t-[2.5px] border-brand-green-600 rounded-tr-md" />
              <span className="absolute bottom-1 left-1 w-3.5 h-3.5 border-l-[2.5px] border-b-[2.5px] border-brand-green-600 rounded-bl-md" />
              <span className="absolute bottom-1 right-1 w-3.5 h-3.5 border-r-[2.5px] border-b-[2.5px] border-brand-green-600 rounded-br-md" />
            </div>

            {/* Right side */}
            <div className="flex-1 min-w-0">
              {/* Tab switcher */}
              <div className="flex bg-brand-green-50/70 p-1 rounded-full w-fit border border-brand-green-100 mb-3">
                {(Object.keys(LINE_GROUPS) as Array<keyof typeof LINE_GROUPS>).map((key) => {
                  const isActive = qrTab === key;
                  const Icon = key === "member" ? Users : Crown;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setQrTab(key)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-extrabold text-[11px] transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-brand-surface text-brand-green shadow-sm"
                          : "text-brand-ink-soft hover:text-brand-green"
                      }`}
                    >
                      <Icon className="h-3 w-3" strokeWidth={2.5} />
                      {key === "member" ? "ทั่วไป" : "ตัวแทน"}
                    </button>
                  );
                })}
              </div>

              <div className="inline-flex items-center gap-1.5 bg-[#06C755] text-white font-black text-[10px] uppercase tracking-wider py-1 px-2 rounded-md mb-2 shadow-sm">
                <MessageCircle className="h-3 w-3 fill-white" strokeWidth={0} />
                LINE Official
              </div>
              <p className="font-display font-extrabold text-[16px] md:text-[17px] text-brand-ink leading-tight mb-1.5">
                สแกนเพื่อเข้ากลุ่ม LINE
              </p>
              <p className="text-[12.5px] text-brand-ink-soft leading-snug mb-3 font-medium">
                {LINE_GROUPS[qrTab].desc}
              </p>

              {/* ปุ่มกดเข้ากลุ่ม LINE — ลิงก์แก้ได้ในแอดมิน (lineGroupNormal/lineGroupAgent) */}
              <a
                href={
                  qrTab === "member"
                    ? config.lineGroupNormal?.trim() || LINE_GROUPS.member.href
                    : config.lineGroupAgent?.trim() || LINE_GROUPS.agent.href
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] py-2.5 text-[13px] font-black text-white shadow-md shadow-[#06C755]/30 transition hover:-translate-y-0.5 hover:bg-[#05b34c]"
              >
                <MessageCircle className="h-4 w-4 fill-white" strokeWidth={0} />
                กดเพื่อเข้ากลุ่ม LINE
              </a>

            </div>
          </div>
        </div>

        {/* ════════ Trust Banner ════════ */}
        <div className="mt-12 flex flex-wrap items-center gap-6 md:gap-8 justify-between bg-brand-surface border border-brand-green-100 p-6 md:py-6 md:px-8.5 rounded-[32px] shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-1000">
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
                {/* จำนวนผู้ใช้จริง (realtime) — ไม่ใช่ค่าปลอม +99 */}
                {(config?.stats?.totalUsers ?? 0) > 99
                  ? "99+"
                  : `+${config?.stats?.totalUsers ?? 0}`}
              </span>
            </div>
            <div className="text-xs font-bold leading-relaxed text-brand-ink-soft">
              รีวิวจากผู้ใช้จริง
              <br />
              <b className="text-brand-ink text-sm font-black">
                +{Number(config?.stats?.totalCompleted ?? 0).toLocaleString()} ออเดอร์
              </b>
            </div>
          </div>

          <div className="hidden md:block w-px h-9.5 bg-brand-green-100" />

          <div className="flex flex-col">
            <span className="font-display font-black text-2xl lg:text-3xl text-brand-green leading-none">
              {config?.stats?.successRate ?? 100}%
            </span>
            <span className="text-[11.5px] font-bold text-brand-ink-soft mt-1">
              เสถียรภาพระบบการทำงาน
            </span>
          </div>

          <div className="hidden md:block w-px h-9.5 bg-brand-green-100" />

          <a
            href={config.reviewLink?.trim() || "https://line.me/R/ti/p/@ormorcoins"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col group/stat transition duration-200"
          >
            <span className="font-display font-black text-2xl lg:text-3xl text-brand-green leading-none flex items-center gap-1 group-hover/stat:text-brand-green">
              ดูรีวิวลูกค้า ➔
            </span>
            <span className="text-[11.5px] font-bold text-brand-ink-soft mt-1 underline decoration-brand-green-300 group-hover/stat:text-brand-green">
              คลิกเพื่อรับชมรีวิว
            </span>
          </a>

          <div className="hidden md:block w-px h-9.5 bg-brand-green-100" />

          <div className="flex flex-col">
            <span className="font-display font-black text-2xl lg:text-3xl text-brand-green leading-none flex items-center gap-1.5">
              {config?.stats?.activeQueues ?? 0} คิว
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-green"></span>
              </span>
            </span>
            <span className="text-[11.5px] font-bold text-brand-ink-soft mt-1">
              คิวรอประมวลผล Realtime
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
