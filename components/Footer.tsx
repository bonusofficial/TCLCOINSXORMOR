"use client";

import React from "react";
import { MessageCircle, ArrowUp } from "lucide-react";
import { useConfig } from "@/lib/contexts/PublicDataContext";

export default function Footer() {
  const { config } = useConfig();
  const siteLogo = config.logo?.trim() || "/logo.webp";
  const siteTitle = config.title?.trim() || "TCLCOINSXORMOR";
  const siteDescription =
    config.description?.trim() ||
    "ระบบรับจองคิวและเติมเงินเหรียญแท้ 100% รวดเร็ว ปลอดภัย และเสถียรที่สุดในอุตสาหกรรม";

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative bg-gradient-to-br from-brand-green-600 to-brand-green-700 text-white pt-16 overflow-hidden">
      
      {/* Background Dot texture */}
      <div 
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#fff 1.4px, transparent 1.4px)",
          backgroundSize: "30px 30px"
        }}
      />

      <div className="max-w-[1240px] mx-auto px-7 w-full relative z-10">
        
        {/* Foot Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-11 pb-11">
          
          {/* Col 1: Brand info */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white border border-white/30 overflow-hidden shadow-lg shadow-black/10">
                <img
                  src={siteLogo}
                  alt={siteTitle}
                  className="h-full w-full object-contain p-1.5"
                />
              </div>
              <h3 className="font-display font-black text-2xl tracking-tight leading-none">
                {siteTitle}
                <span className="text-[14px] font-bold block text-brand-gold mt-1 tracking-widest uppercase">
                  TOPUP COINS
                </span>
              </h3>
            </div>
            <p className="text-xs.5 leading-relaxed text-white/80 max-w-[280px] font-medium">
              {siteDescription}
            </p>
          </div>

          {/* Col 2: Sitemap */}
          <div className="space-y-4">
            <h4 className="font-display font-black text-sm uppercase tracking-wider relative pb-2.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-0.75 after:bg-brand-gold after:rounded">
              ลิงก์แนะนำ
            </h4>
            <ul className="space-y-2.5 text-xs.5 font-bold text-white/80">
              <li>
                <a href="#" className="hover:text-white hover:translate-x-1 inline-block transition">หน้าแรกของระบบ</a>
              </li>
              <li>
                <a href="#how" className="hover:text-white hover:translate-x-1 inline-block transition">ขั้นตอนการสั่งจองคิว</a>
              </li>
              <li>
                <a href="/queue" className="hover:text-white hover:translate-x-1 inline-block transition">เช็คสถานะสต็อกแพ็กเกจ</a>
              </li>
            </ul>
          </div>

          {/* Col 3: Support */}
          <div className="space-y-4">
            <h4 className="font-display font-black text-sm uppercase tracking-wider relative pb-2.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-0.75 after:bg-brand-gold after:rounded">
              การบริการ
            </h4>
            <ul className="space-y-2.5 text-xs.5 font-bold text-white/80">
              <li>
                <a href="/profile/benefits" className="hover:text-white hover:translate-x-1 inline-block transition">สิทธิพิเศษสำหรับตัวแทน</a>
              </li>
            </ul>
          </div>

          {/* Col 4: Social media connect */}
          <div className="space-y-4">
            <h4 className="font-display font-black text-sm uppercase tracking-wider relative pb-2.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-0.75 after:bg-brand-gold after:rounded">
              ช่องทางโซเชียล
            </h4>
            <div className="flex gap-3">
              <a 
                href="https://line.me/R/ti/p/@ormorcoins"
                target="_blank" 
                rel="noopener noreferrer"
                className="w-11.5 h-11.5 rounded-xl bg-brand-surface/14 text-white flex items-center justify-center hover:bg-brand-surface hover:text-brand-green hover:-translate-y-1 transition duration-200"
              >
                <MessageCircle className="w-5.5 h-5.5 fill-current" />
              </a>
              <a 
                href="#"
                onClick={scrollToTop}
                className="w-11.5 h-11.5 rounded-xl bg-brand-surface/14 text-white flex items-center justify-center hover:bg-brand-gold hover:text-brand-ink hover:-translate-y-1 transition duration-200"
                title="Scroll to top"
              >
                <ArrowUp className="w-5.5 h-5.5" />
              </a>
            </div>
          </div>

        </div>

        {/* Legal Bottom Bar */}
        <div className="border-t border-white/16 py-5.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/70 font-bold">
          <p>© {new Date().getFullYear()} {siteTitle} TOPUP COINS. ระบบเติมเหรียญไลน์ ขอสงวนลิขสิทธิ์ทั้งหมด</p>
          <div className="flex gap-6">
            <a href="/terms" className="hover:text-brand-gold transition">ข้อกำหนดเงื่อนไขการใช้บริการ</a>
            <a href="/privacy" className="hover:text-brand-gold transition">นโยบายความเป็นส่วนตัว</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
