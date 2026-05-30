"use client";

import React from "react";
import { MessageCircle, HelpCircle, PhoneCall, ArrowRight } from "lucide-react";
import { useConfig } from "@/lib/contexts/PublicDataContext";

export default function SupportSection() {
  const { config } = useConfig();
  return (
    <section className="bg-brand-surface py-20" id="support">
      <div className="max-w-[1240px] mx-auto px-7 w-full relative">
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-brand-gold to-brand-gold-deep p-8 md:p-14 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          
          {/* Decorative circular background blobs */}
          <span className="absolute -top-40 -right-20 h-[340px] w-[340px] rounded-full bg-brand-surface/16 pointer-events-none" />
          <span className="absolute -bottom-[110px] left-[30%] h-48 w-48 rounded-full bg-brand-surface/12 pointer-events-none" />

          {/* Left Column Support info */}
          <div className="space-y-4 max-w-xl relative z-10">
            <span className="inline-flex items-center gap-2 bg-brand-surface/90 text-brand-gold-deep font-extrabold text-[13.5px] py-2 px-4.5 rounded-full shadow-sm">
              <HelpCircle className="h-4.5 w-4.5 text-brand-gold-deep" />
              ติดปัญหาเหรอ? เราพร้อมช่วยคุณ!
            </span>
            <h2 className="font-display font-black text-3xl md:text-[42px] leading-tight text-[#3A2A00] tracking-tight">
              ติดขัดพร้อมช่วย 24/7!
            </h2>
            <p className="text-sm.5 md:text-base leading-relaxed text-[#5A3F00] font-bold">
              ทีมงานคุณภาพสามารถแก้ปัญหาของคุณได้อย่างรวดเร็ว ทั้งการเติมเหรียญ หรือการใช้งานเว็บไซต์ระบบจองคิว!
            </p>
          </div>

          {/* Right Column support buttons */}
          <div className="flex flex-col gap-3.5 w-full lg:max-w-xs relative z-10">
            
            {/* Button 1: LINE Support */}
            <a 
              href={config.contactLine || "https://line.me/R/ti/p/@ormorcoins"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-brand-surface/95 rounded-2xl p-4 md:py-4.5 md:px-5.5 font-extrabold text-sm.5 text-brand-ink transition shadow-sm hover:shadow-md hover:translate-x-1.5 duration-200 group"
            >
              <span className="w-10.5 h-10.5 rounded-xl bg-[#06C755] text-white flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-5.5 w-5.5 fill-white" />
              </span>
              <span className="flex flex-col leading-snug">
                <b>ติดต่อทาง LINE OA</b>
                <span className="text-[10px] text-brand-ink-soft font-bold">แอดมินตอบกลับฉับไว</span>
              </span>
              <ArrowRight className="h-4.5 w-4.5 text-brand-ink-soft ml-auto group-hover:text-brand-green transition" />
            </a>

            {/* Button 2: Call/Webboard support */}
            <a 
              href={config.phone ? `tel:${config.phone}` : "tel:0999999999"}
              className="flex items-center gap-4 bg-brand-surface/95 rounded-2xl p-4 md:py-4.5 md:px-5.5 font-extrabold text-sm.5 text-brand-ink transition shadow-sm hover:shadow-md hover:translate-x-1.5 duration-200 group"
            >
              <span className="w-10.5 h-10.5 rounded-xl bg-brand-green-100 text-brand-green flex items-center justify-center flex-shrink-0">
                <PhoneCall className="h-5 w-5" />
              </span>
              <span className="flex flex-col leading-snug">
                <b>สายด่วนแก้ปัญหา</b>
                <span className="text-[10.5px] text-brand-coral font-extrabold">โทรด่วน: {config.phone || "099-999-9999"}</span>
              </span>
              <ArrowRight className="h-4.5 w-4.5 text-brand-ink-soft ml-auto group-hover:text-brand-green transition" />
            </a>

            {/* QR Code Card */}
            <div className="flex flex-col items-center bg-brand-surface/95 rounded-2xl p-4 shadow-sm text-center relative overflow-hidden group">
              <img 
                src={config.qrcodesupport || "/qrcode.jpeg"} 
                alt="LINE OA QR Code" 
                className="w-32 h-32 rounded-xl object-contain border border-brand-green-100 shadow-sm transition duration-300 group-hover:scale-105"
              />
              <p className="text-[10.5px] text-brand-ink font-black mt-2">แอดไลน์ผ่าน QR Code</p>
              <p className="text-[9px] text-brand-ink-soft font-bold mt-0.5">สแกนเพื่อติดต่อแอดมินทันที</p>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
