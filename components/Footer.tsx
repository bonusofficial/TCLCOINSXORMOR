"use client";

import React from "react";
import { MessageCircle, ArrowUp } from "lucide-react";

export default function Footer() {
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
            <h3 className="font-display font-black text-2xl tracking-tight leading-none">
              TCLCOINSXORMOR <span className="text-[14px] font-bold block text-brand-gold mt-1 tracking-widest uppercase">TOPUP COINS</span>
            </h3>
            <p className="text-xs.5 leading-relaxed text-white/80 max-w-[280px] font-medium">
              ระบบรับจองคิวและเติมเงินเหรียญแท้ 100% รวดเร็ว ปลอดภัย และเสถียรที่สุดในอุตสาหกรรม
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
                <a href="#packages" className="hover:text-white hover:translate-x-1 inline-block transition">เช็คสถานะสต็อกแพ็กเกจ</a>
              </li>
              <li>
                <a href="#stats" className="hover:text-white hover:translate-x-1 inline-block transition">ดูความเสถียรภาพระบบ</a>
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
                <a href="#support" className="hover:text-white hover:translate-x-1 inline-block transition">ศูนย์ช่วยเหลือ / ติดปัญหา</a>
              </li>
              <li>
                <a href="https://line.me/R/ti/p/@ormorcoins" className="hover:text-white hover:translate-x-1 inline-block transition">LINE Official OA</a>
              </li>
              <li>
                <a href="#" className="hover:text-white hover:translate-x-1 inline-block transition">สิทธิพิเศษสำหรับตัวแทน</a>
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
                href="https://facebook.com"
                target="_blank" 
                rel="noopener noreferrer"
                className="w-11.5 h-11.5 rounded-xl bg-brand-surface/14 text-white flex items-center justify-center hover:bg-brand-surface hover:text-brand-green hover:-translate-y-1 transition duration-200"
              >
                <svg className="w-5.5 h-5.5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
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
          <p>© {new Date().getFullYear()} TCLCOINSXORMOR TOPUP COINS. ระบบเติมเหรียญไลน์ ขอสงวนลิขสิทธิ์ทั้งหมด</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-brand-gold transition">ข้อกำหนดเงื่อนไขการใช้บริการ</a>
            <a href="#" className="hover:text-brand-gold transition">นโยบายความเป็นส่วนตัว</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
