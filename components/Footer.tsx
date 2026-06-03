"use client";
import Image from "next/image";
import React from "react";
import { ArrowUp } from "lucide-react";
import { useConfig } from "@/lib/contexts/PublicDataContext";
import {
  parseFooterLinks,
  DEFAULT_FOOTER_LINKS,
  DEFAULT_FOOTER_SERVICES,
} from "@/lib/site-defaults";

export default function Footer() {
  const { config } = useConfig();
  const siteLogo = config.logo?.trim() || "/logo.webp";
  const siteTitle = config.title?.trim() || "TCLCOINSXORMOR";
  const siteDescription =
    config.footerDescription?.trim() ||
    config.description?.trim() ||
    "ระบบรับจองคิวและเติมเงินเหรียญแท้ 100% รวดเร็ว ปลอดภัย และเสถียรที่สุดในอุตสาหกรรม";

  // ลิงก์ใน footer — ดึงจาก config (admin แก้ได้) ไม่งั้นใช้ค่าเริ่มต้น
  const parsedLinks = parseFooterLinks(config.footerLinks);
  const recommendedLinks = parsedLinks.length ? parsedLinks : DEFAULT_FOOTER_LINKS;
  const parsedServices = parseFooterLinks(config.footerServices);
  const serviceLinks = parsedServices.length ? parsedServices : DEFAULT_FOOTER_SERVICES;

  const lineUrl =
    config.footerLineUrl?.trim() ||
    config.contactLine?.trim() ||
    "https://line.me/R/ti/p/@ormorcoins";
  const facebookUrl = config.footerFacebook?.trim() || "";
  const copyrightText =
    config.footerCopyright?.trim() ||
    `© ${new Date().getFullYear()} ${siteTitle} TOPUP COINS. ระบบเติมเหรียญไลน์ ขอสงวนลิขสิทธิ์ทั้งหมด`;

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
          backgroundSize: "30px 30px",
        }}
      />

      <div className="max-w-[1240px] mx-auto px-7 w-full relative z-10">
        {/* Foot Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-11 pb-11">
          {/* Col 1: Brand info */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center">
                <img
                  src={siteLogo}
                  alt={siteTitle}
                  className="h-full w-full"
                />
              </div>
              <h3 className="font-display font-black text-2xl tracking-tight leading-none">
                {siteTitle}
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
              {recommendedLinks.map((l, i) => (
                <li key={i}>
                  <a
                    href={l.url || "#"}
                    className="hover:text-white hover:translate-x-1 inline-block transition"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Support */}
          <div className="space-y-4">
            <h4 className="font-display font-black text-sm uppercase tracking-wider relative pb-2.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-0.75 after:bg-brand-gold after:rounded">
              การบริการ
            </h4>
            <ul className="space-y-2.5 text-xs.5 font-bold text-white/80">
              {serviceLinks.map((l, i) => (
                <li key={i}>
                  <a
                    href={l.url || "#"}
                    className="hover:text-white hover:translate-x-1 inline-block transition"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Social media connect */}
          <div className="space-y-4">
            <h4 className="font-display font-black text-sm uppercase tracking-wider relative pb-2.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-0.75 after:bg-brand-gold after:rounded">
              ช่องทางโซเชียล
            </h4>
            <div className="flex gap-3">
              <a
                href={lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11.5 h-11.5 rounded-xl bg-brand-surface/14 text-white flex items-center justify-center hover:bg-brand-surface hover:text-brand-green hover:-translate-y-1 transition duration-200"
              >
                <svg className="w-[24px] h-auto" fill="#ffff" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>LINE</title><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              </a>
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11.5 h-11.5 rounded-xl bg-brand-surface/14 text-white flex items-center justify-center hover:bg-brand-surface hover:text-brand-green hover:-translate-y-1 transition duration-200"
                >
                  <Image
                    src="https://thesvg.org/icons/facebook/default.svg"
                    alt="Facebook"
                    width={24}
                    height={24}
                  />
                </a>
              )}
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
          <p>{copyrightText}</p>
          <div className="flex gap-6">
            <a href="/terms" className="hover:text-brand-gold transition">
              ข้อกำหนดเงื่อนไขการใช้บริการ
            </a>
            <a href="/privacy" className="hover:text-brand-gold transition">
              นโยบายความเป็นส่วนตัว
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
