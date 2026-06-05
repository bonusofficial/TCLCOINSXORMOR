"use client";

import React, { useEffect, useState, useRef } from "react";
import { useConfig } from "@/lib/contexts/PublicDataContext";
import {
  Zap,
  ShieldCheck,
  Clock,
  ArrowRight,
  AlertOctagon,
  Users,
  Crown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { publicApi } from "@/lib/eden";

interface HeroSectionProps {
  onOpenAuth?: (tab: "login" | "register") => void;
  isLoggedIn?: boolean;
  userRole?: "member" | "agent" | "admin";
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

export default function HeroSection({
  onOpenAuth,
  isLoggedIn = false,
  userRole = "member",
}: HeroSectionProps) {
  const { config } = useConfig();
  // ตัวแทน/แอดมิน = เห็น QR กลุ่มตัวแทน · ลูกค้าทั่วไป = เห็นข้อความชวนสมัครแทน
  const isAgentViewer = userRole === "agent" || userRole === "admin";
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerPaused, setBannerPaused] = useState(false);
  const [qrTab, setQrTab] = useState<"member" | "agent">("member");
  const [authOpening, setAuthOpening] = useState<"login" | "register" | null>(null);
  const authOpeningTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (authOpeningTimerRef.current) {
        window.clearTimeout(authOpeningTimerRef.current);
      }
    };
  }, []);

  const handleAuthOpen = (tab: "login" | "register") => {
    if (authOpening) return;
    setAuthOpening(tab);
    onOpenAuth?.(tab);
    
    if (authOpeningTimerRef.current) {
      window.clearTimeout(authOpeningTimerRef.current);
    }
    authOpeningTimerRef.current = window.setTimeout(() => {
      setAuthOpening(null);
      authOpeningTimerRef.current = null;
    }, 700);
  };

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

  // ── ตรรกะ QR กลุ่มตัวแทน ──
  const isAgentTab = qrTab === "agent";
  // ลูกค้าทั่วไปเปิดแท็บตัวแทน → ซ่อน QR + ชวนสมัครตัวแทน
  const lockAgentQr = isAgentTab && !isAgentViewer;
  const qrDescription = isAgentTab
    ? isAgentViewer
      ? "ได้รับสิทธิพิเศษ Update ก่อนใคร และส่วนลดมากมาย"
      : "สมัครสมาชิก 199฿"
    : LINE_GROUPS.member.desc;
  const agentRegisterUrl =
    config.agentLink?.trim() || LINE_GROUPS.agent.href;

  return (
    <section className="relative pt-10 md:pt-14 pb-20 overflow-hidden bg-brand-surface" style={{ contentVisibility: 'auto' }}>

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

        {/* Warning ticker — มาร์คีวิ่งแบบลูปไม่มีรอยต่อ (หยุดเมื่อ hover) */}
        <div className="bg-gradient-to-r from-[#FFF1EF] to-[#FFE7E3] border border-[#FFD5CE] rounded-2xl flex items-center gap-3.5 py-2.5 px-4.5 shadow-sm overflow-hidden relative w-full">
          <div className="flex items-center gap-1.5 flex-shrink-0 bg-brand-coral text-white font-extrabold text-xs py-1 px-3 rounded-full relative z-10 shadow-sm shadow-brand-coral/20">
            <AlertOctagon className="h-3.5 w-3.5" />
            คำเตือน
          </div>
          <div className="marquee-pause relative min-w-0 flex-1 overflow-hidden z-0">
            <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#FFE7E3] to-transparent" />
            <div
              className="flex w-max animate-marquee whitespace-nowrap"
              style={{ animationDuration: "22s", willChange: "transform" }}
            >
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  aria-hidden={i > 0}
                  className="px-8 font-bold text-xs text-[#C4382A]"
                >
                  ห้ามกดจองเล่น ๆ หากตรวจพบ ปรับ 50 บาท / 1 ครั้ง • กรุณาจองเฉพาะที่ต้องการเติมจริงเท่านั้น • ขอบคุณที่ให้ความร่วมมือ
                </span>
              ))}
            </div>
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
            {isLoggedIn ? (
              <Link
                href="/queue"
                className="relative inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-extrabold text-sm md:text-base text-white bg-gradient-to-r from-brand-green-700 via-brand-green-600 to-brand-green shadow-lg shadow-brand-green-600/35 hover:shadow-xl hover:shadow-brand-lime/50 hover:-translate-y-1 transition duration-200 cursor-pointer overflow-hidden group/cta"
              >
                <span className="absolute inset-0 rounded-full ring-2 ring-brand-lime/0 group-hover/cta:ring-brand-lime/60 transition duration-300 pointer-events-none" />
                จองคิวเลย
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover/cta:translate-x-1" />
              </Link>
            ) : (
              <button
                type="button"
                disabled={authOpening !== null}
                onClick={() => handleAuthOpen("login")}
                className="relative inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-extrabold text-sm md:text-base text-white bg-gradient-to-r from-brand-green-700 via-brand-green-600 to-brand-green shadow-lg shadow-brand-green-600/35 hover:shadow-xl hover:shadow-brand-lime/50 hover:-translate-y-1 transition duration-200 cursor-pointer overflow-hidden group/cta disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:-translate-y-0"
              >
                <span className="absolute inset-0 rounded-full ring-2 ring-brand-lime/0 group-hover/cta:ring-brand-lime/60 transition duration-300 pointer-events-none" />
                {authOpening === "login" ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    กำลังโหลด
                  </>
                ) : (
                  <>
                    เข้าสู่ระบบตอนนี้
                    <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover/cta:translate-x-1" />
                  </>
                )}
              </button>
            )}
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
          className="relative rounded-[36px] overflow-hidden shadow-[0_30px_60px_-25px_rgba(8, 238, 32,0.35)] border border-brand-green-100 bg-brand-surface animate-in fade-in slide-in-from-bottom-6 duration-1000 will-change-auto"
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
                  className="flex h-full w-full transition-transform duration-500 ease-out will-change-auto"
                  style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
                >
                  {banners.map((b, i) => (
                    <div key={b.id} className="w-full h-full flex-shrink-0 relative">
                      <img
                        src={b.image}
                        alt={`แบนเนอร์ ${i + 1}`}
                        className="w-full h-full object-cover select-none"
                        draggable={false}
                        loading={i === 0 ? "eager" : "lazy"}
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
              {lockAgentQr ? (
                <div className="w-32 h-32 md:w-36 md:h-36 rounded-lg bg-brand-green-50/60 border border-dashed border-brand-green-100 flex flex-col items-center justify-center gap-2 text-center px-3">
                  <Lock className="h-7 w-7 text-brand-green" />
                  <span className="text-[11px] font-extrabold text-brand-ink-soft leading-tight">
                    เฉพาะตัวแทน
                    <br />
                    เท่านั้น
                  </span>
                </div>
              ) : (
                <img
                  src={qrTab === "member" ? (config.qrcodenormal || "/qrcode.jpeg") : (config.qrcodeagent || "/qrcode.jpeg")}
                  alt={`QR เข้ากลุ่ม LINE ${LINE_GROUPS[qrTab].label}`}
                  className="w-32 h-32 md:w-36 md:h-36 object-contain rounded-lg"
                />
              )}
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
                <svg className="w-[15px] h-auto" fill="#ffff" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>LINE</title><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                LINE Official
              </div>
              <p className="font-display font-extrabold text-[16px] md:text-[17px] text-brand-ink leading-tight mb-1.5">
                สแกนเพื่อเข้ากลุ่ม LINE
              </p>
              <p className="text-[12.5px] text-brand-ink-soft leading-snug mb-3 font-medium">
                {qrDescription}
              </p>

              {lockAgentQr ? (
                /* ลูกค้าทั่วไปบนแท็บตัวแทน → ปุ่มชวนสมัครเป็นตัวแทน */
                <a
                  href={agentRegisterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-gold-light to-brand-gold-deep py-2.5 text-[13px] font-black text-brand-ink shadow-md shadow-brand-gold/30 transition hover:-translate-y-0.5"
                >
                  <Crown className="h-4 w-4" strokeWidth={2.5} />
                  สมัครเป็นตัวแทน 199฿
                </a>
              ) : (
                /* ปุ่มกดเข้ากลุ่ม LINE — ลิงก์แก้ได้ในแอดมิน (lineGroupNormal/lineGroupAgent) */
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
                  <svg className="w-[24px] h-auto" fill="#ffff" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>LINE</title><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                  กดเพื่อเข้ากลุ่ม LINE
                </a>
              )}

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
