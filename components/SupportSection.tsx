"use client";

import React from "react";
import { MessageCircle, HelpCircle, PhoneCall, ArrowRight } from "lucide-react";
import { useConfig } from "@/lib/contexts/PublicDataContext";
import Image from "next/image";
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
                <svg className="w-[24px] h-auto" fill="#ffff" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>LINE</title><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
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
            <div className="flex flex-col items-center bg-brand-surface/95 rounded-md p-4 shadow-sm text-center relative overflow-hidden group">
              <img 
                src={config.qrcodesupport || "/qrcode.jpeg"} 
                alt="LINE OA QR Code" 
                className="w-32 h-32 rounded-md object-contain border border-brand-green-100 shadow-sm transition duration-300 group-hover:scale-105"
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
