"use client";

import React from "react";
import { UserCheck, CalendarRange, Coins, HeartHandshake, ArrowRight } from "lucide-react";
import { useConfig } from "@/lib/contexts/PublicDataContext";
import { DEFAULT_HOW_IT_WORKS, parseHowItWorks } from "@/lib/site-defaults";

interface HowItWorksProps {
  onOpenBooking: () => void;
}

const STEP_ICONS = [UserCheck, CalendarRange, Coins, HeartHandshake];

export default function HowItWorks({ onOpenBooking }: HowItWorksProps) {
  const { config } = useConfig();
  // ใช้ขั้นตอนจากแอดมินถ้ามี ไม่งั้น fallback ค่าเริ่มต้น
  const parsed = parseHowItWorks(config?.howItWorks);
  const steps = (parsed.length ? parsed : DEFAULT_HOW_IT_WORKS).slice(0, 4);

  return (
    <section className="bg-brand-surface py-20 border-y border-brand-green-50" id="how">
      <div className="max-w-[1240px] mx-auto px-7 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-14 items-start">
          
          {/* Left Intro Block */}
          <div className="space-y-5 lg:sticky lg:top-[120px]">
            <div className="inline-flex items-center gap-2 bg-brand-green-50 text-brand-green font-extrabold text-[12px] uppercase tracking-wider py-1.5 px-4.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
              ใช้งานง่าย
            </div>
            <h2 className="font-display font-black text-3xl md:text-[46px] leading-[1.08] tracking-tight text-brand-ink">
              ขั้นตอนการใช้งาน <em className="not-italic text-brand-green">TCLCOINSXORMOR</em>
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

          {/* Right Steps Grid — ขั้นตอนแก้ไขได้ในแอดมิน */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? UserCheck;
              return (
                <div
                  key={i}
                  className="group relative bg-brand-paper border border-brand-green-100 rounded-3xl p-6.5 overflow-hidden transition-all duration-300 hover:bg-brand-surface hover:shadow-lg hover:-translate-y-1.5 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-brand-green before:to-brand-gold before:scale-x-0 group-hover:before:scale-x-100 before:transition-transform before:duration-300 before:origin-left"
                >
                  <div className="flex items-center justify-between mb-4.5">
                    <span className="w-13 h-13 rounded-2xl bg-brand-surface shadow-sm flex items-center justify-center text-brand-green">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="font-display font-black text-4xl text-brand-green-100 leading-none select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-brand-ink mb-2">{step.title}</h3>
                  <p className="text-xs.5 md:text-sm text-brand-ink-soft leading-relaxed font-semibold whitespace-pre-line">
                    {step.desc}
                  </p>
                </div>
              );
            })}

          </div>

        </div>
      </div>
    </section>
  );
}
