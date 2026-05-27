"use client";

import React from "react";
import { UserCheck, CalendarRange, Coins, HeartHandshake, ArrowRight } from "lucide-react";

interface HowItWorksProps {
  onOpenBooking: () => void;
}

export default function HowItWorks({ onOpenBooking }: HowItWorksProps) {
  return (
    <section className="bg-white py-20 border-y border-brand-green-50" id="how">
      <div className="max-w-[1240px] mx-auto px-7 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-14 items-start">
          
          {/* Left Intro Block */}
          <div className="space-y-5 lg:sticky lg:top-[120px]">
            <div className="inline-flex items-center gap-2 bg-brand-green-50 text-brand-green-700 font-extrabold text-[12px] uppercase tracking-wider py-1.5 px-4.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
              ใช้งานง่าย
            </div>
            <h2 className="font-display font-black text-3xl md:text-[46px] leading-[1.08] tracking-tight text-brand-ink">
              ขั้นตอนการใช้งาน <em className="not-italic text-brand-green-600">ORMOR</em>
            </h2>
            <p className="text-base leading-relaxed text-brand-ink-soft font-medium">
              เริ่มต้นง่าย ๆ เพียงไม่กี่ขั้นตอน เพื่อประสบการณ์การใช้งานที่รวดเร็วและปลอดภัยที่สุดสำหรับคุณ
            </p>
            <button 
              onClick={onOpenBooking}
              className="inline-flex items-center gap-2 px-8 py-4.5 rounded-full font-extrabold text-sm md:text-base text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-lg shadow-brand-green/30 hover:shadow-xl hover:shadow-brand-green/40 hover:-translate-y-1 transition duration-200 mt-4"
            >
              เริ่มจองคิว
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {/* Right Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Step 1 */}
            <div className="group relative bg-[#F6FAF2] border border-brand-green-100 rounded-3xl p-6.5 overflow-hidden transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-1.5 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-brand-green before:to-brand-gold before:scale-x-0 group-hover:before:scale-x-100 before:transition-transform before:duration-300 before:origin-left">
              <div className="flex items-center justify-between mb-4.5">
                <span className="w-13 h-13 rounded-2xl bg-white shadow-sm flex items-center justify-center text-brand-green-700">
                  <UserCheck className="h-6 w-6" />
                </span>
                <span className="font-display font-black text-4xl text-brand-green-100 leading-none select-none">01</span>
              </div>
              <h3 className="font-display font-bold text-lg text-brand-ink mb-2">สมัครสมาชิก</h3>
              <p className="text-xs.5 md:text-sm text-brand-ink-soft leading-relaxed font-semibold">
                สมัครด้วยชื่อผู้ใช้งานในกลุ่มโอเพนแชท หรือสมัครแบบลูกค้าทั่วไปได้ทันที <span className="text-brand-green-700 font-bold">ตัวแทนรับราคาพิเศษ</span>ถูกกว่าเดิม
              </p>
            </div>

            {/* Step 2 */}
            <div className="group relative bg-[#F6FAF2] border border-brand-green-100 rounded-3xl p-6.5 overflow-hidden transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-1.5 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-brand-green before:to-brand-gold before:scale-x-0 group-hover:before:scale-x-100 before:transition-transform before:duration-300 before:origin-left">
              <div className="flex items-center justify-between mb-4.5">
                <span className="w-13 h-13 rounded-2xl bg-white shadow-sm flex items-center justify-center text-brand-green-700">
                  <CalendarRange className="h-6 w-6" />
                </span>
                <span className="font-display font-black text-4xl text-brand-green-100 leading-none select-none">02</span>
              </div>
              <h3 className="font-display font-bold text-lg text-brand-ink mb-2">จองคิว</h3>
              <p className="text-xs.5 md:text-sm text-brand-ink-soft leading-relaxed font-semibold">
                เลือกวันและเวลา → เลือกแพ็กเกจ → ตรวจสอบ → <span className="text-brand-green-700 font-bold">ยืนยันการจอง</span> แล้วส่งรหัสให้แอดมินทาง LINE Official
              </p>
            </div>

            {/* Step 3 */}
            <div className="group relative bg-[#F6FAF2] border border-brand-green-100 rounded-3xl p-6.5 overflow-hidden transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-1.5 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-brand-green before:to-brand-gold before:scale-x-0 group-hover:before:scale-x-100 before:transition-transform before:duration-300 before:origin-left">
              <div className="flex items-center justify-between mb-4.5">
                <span className="w-13 h-13 rounded-2xl bg-white shadow-sm flex items-center justify-center text-brand-green-700">
                  <Coins className="h-6 w-6" />
                </span>
                <span className="font-display font-black text-4xl text-brand-green-100 leading-none select-none">03</span>
              </div>
              <h3 className="font-display font-bold text-lg text-brand-ink mb-2">รอรับเหรียญ</h3>
              <p className="text-xs.5 md:text-sm text-brand-ink-soft leading-relaxed font-semibold">
                รอแอดมินยืนยัน → ชำระเงิน → ส่งสลิป → <span className="text-brand-green-700 font-bold">รอเติมเหรียญ</span> → ตรวจสอบยอดได้ทันที
              </p>
            </div>

            {/* Step 4 */}
            <div className="group relative bg-[#F6FAF2] border border-brand-green-100 rounded-3xl p-6.5 overflow-hidden transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-1.5 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-brand-green before:to-brand-gold before:scale-x-0 group-hover:before:scale-x-100 before:transition-transform before:duration-300 before:origin-left">
              <div className="flex items-center justify-between mb-4.5">
                <span className="w-13 h-13 rounded-2xl bg-white shadow-sm flex items-center justify-center text-brand-green-700">
                  <HeartHandshake className="h-6 w-6" />
                </span>
                <span className="font-display font-black text-4xl text-brand-green-100 leading-none select-none">04</span>
              </div>
              <h3 className="font-display font-bold text-lg text-brand-ink mb-2">รีวิวสำเร็จ</h3>
              <p className="text-xs.5 md:text-sm text-brand-ink-soft leading-relaxed font-semibold">
                เมื่อได้รับเหรียญแล้ว ร่วม<span className="text-brand-green-700 font-bold">แชร์ประสบการณ์</span>ของคุณ เพื่อช่วยให้ผู้ใช้คนอื่นมั่นใจในบริการของเรา
              </p>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
