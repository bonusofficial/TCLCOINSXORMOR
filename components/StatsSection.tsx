"use client";

import React, { useState, useEffect, useRef } from "react";
import { CheckSquare, GitMerge, Inbox, Users } from "lucide-react";

// Hook/Sub-component for clean viewport numeric countup animations
function CountUp({ to, duration = 1500 }: { to: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const node = elementRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect(); // Count up only once
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let startTimestamp: number | null = null;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out quadratic function for premium feel
      const easeOutProgress = progress * (2 - progress);
      
      setCount(Math.floor(easeOutProgress * to));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [started, to, duration]);

  return <span ref={elementRef}>{count}</span>;
}

function LiveQueueCounter({ initialVal = 14 }: { initialVal?: number }) {
  const [queueCount, setQueueCount] = useState(initialVal);

  useEffect(() => {
    const interval = setInterval(() => {
      setQueueCount((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const newVal = prev + delta;
        if (newVal < 11) return 12;
        if (newVal > 17) return 16;
        return newVal;
      });
    }, 3000); // fluctuates every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="flex items-center gap-2">
      <span>{queueCount}</span>
      <span className="relative flex h-3.5 w-3.5 mt-1">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-brand-green"></span>
      </span>
    </span>
  );
}

export default function StatsSection() {
  return (
    <section className="bg-white py-20 border-b border-brand-green-50" id="stats">
      <div className="max-w-[1240px] mx-auto px-7 w-full">
        
        {/* Section Header */}
        <div className="space-y-4 max-w-xl mb-11">
          <div className="inline-flex items-center gap-2 bg-brand-green-50 text-brand-green-700 font-extrabold text-[12px] uppercase tracking-wider py-1.5 px-4.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
            สถานะระบบ
          </div>
          <h2 className="font-display font-black text-3xl md:text-[46px] leading-[1.08] tracking-tight text-brand-ink">
            สถานะ<em className="not-italic text-brand-green-600">ระบบ</em>
          </h2>
          <p className="text-base leading-relaxed text-brand-ink-soft font-medium">
            เรามุ่งมั่นพัฒนาเทคโนโลยีเพื่อรองรับผู้ใช้งานจำนวนมาก ด้วยระบบที่มีเสถียรภาพและรวดเร็วที่สุดในอุตสาหกรรม
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Stat 1 */}
          <div className="relative overflow-hidden border border-brand-green-100 rounded-[32px] p-8 transition duration-300 hover:shadow-md hover:-translate-y-1.5 bg-gradient-to-br from-white to-brand-green-50/30 group">
            <span className="absolute -bottom-10 -right-10 h-30 w-30 rounded-full bg-brand-green/10 opacity-50 transition group-hover:scale-110 pointer-events-none" />
            <div className="w-12 h-12 rounded-xl bg-brand-green-100 text-brand-green-700 flex items-center justify-center mb-5.5 shadow-sm">
              <CheckSquare className="h-5.5 w-5.5" />
            </div>
            <div className="font-display font-black text-[46px] leading-none text-brand-green-700 tracking-tight">
              <CountUp to={517} />
            </div>
            <p className="mt-3 text-xs.5 leading-relaxed font-bold text-brand-ink-soft">
              รายการทั้งหมดที่ดำเนินการสำเร็จบนแพลตฟอร์ม
            </p>
          </div>

          {/* Stat 2 */}
          <div className="relative overflow-hidden border border-brand-green-100 rounded-[32px] p-8 transition duration-300 hover:shadow-md hover:-translate-y-1.5 bg-gradient-to-br from-white to-brand-green-50/20 group">
            <span className="absolute -bottom-10 -right-10 h-30 w-30 rounded-full bg-brand-green/5 opacity-50 transition group-hover:scale-110 pointer-events-none" />
            <div className="w-12 h-12 rounded-xl bg-brand-green-100 text-brand-green-700 flex items-center justify-center mb-5.5 shadow-sm">
              <GitMerge className="h-5.5 w-5.5" />
            </div>
            <div className="font-display font-black text-[46px] leading-none text-brand-green-700 tracking-tight flex items-center gap-2">
              <LiveQueueCounter />
            </div>
            <p className="mt-3 text-xs.5 leading-relaxed font-bold text-brand-ink-soft">
              ยอดคิวปัจจุบันที่กำลังดำเนินการผ่านระบบอัตโนมัติ
            </p>
          </div>

          {/* Stat 3 */}
          <div className="relative overflow-hidden border border-brand-green-100 rounded-[32px] p-8 transition duration-300 hover:shadow-md hover:-translate-y-1.5 bg-gradient-to-br from-white to-amber-50/30 group">
            <span className="absolute -bottom-10 -right-10 h-30 w-30 rounded-full bg-brand-gold/10 opacity-50 transition group-hover:scale-110 pointer-events-none" />
            <div className="w-12 h-12 rounded-xl bg-[#FFF0E0] text-brand-gold-deep flex items-center justify-center mb-5.5 shadow-sm">
              <Inbox className="h-5.5 w-5.5" />
            </div>
            <div className="font-display font-black text-[46px] leading-none text-brand-gold-deep tracking-tight">
              <CountUp to={176} />
            </div>
            <p className="mt-3 text-xs.5 leading-relaxed font-bold text-brand-ink-soft">
              จำนวนสต็อกเหรียญและแพ็กเกจทั้งหมดที่พร้อมให้บริการ
            </p>
          </div>

          {/* Stat 4 */}
          <div className="relative overflow-hidden border border-brand-green-100 rounded-[32px] p-8 transition duration-300 hover:shadow-md hover:-translate-y-1.5 bg-gradient-to-br from-white to-purple-50/20 group">
            <span className="absolute -bottom-10 -right-10 h-30 w-30 rounded-full bg-purple-500/5 opacity-50 transition group-hover:scale-110 pointer-events-none" />
            <div className="w-12 h-12 rounded-xl bg-[#F1E8FF] text-purple-600 flex items-center justify-center mb-5.5 shadow-sm">
              <Users className="h-5.5 w-5.5" />
            </div>
            <div className="font-display font-black text-[46px] leading-none text-purple-600 tracking-tight">
              <CountUp to={143} />
            </div>
            <p className="mt-3 text-xs.5 leading-relaxed font-bold text-brand-ink-soft">
              จำนวนสมาชิกที่ไว้วางใจใช้บริการระบบเติมเหรียญของเรา
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
