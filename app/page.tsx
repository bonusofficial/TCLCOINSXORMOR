"use client";

import React, { useState, useEffect } from "react";
import {
  MessageCircle,
  UserCheck,
  ShieldCheck,
  User,
  AlertOctagon,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import PackagesSection from "@/components/PackagesSection";
import StatsSection from "@/components/StatsSection";
import SupportSection from "@/components/SupportSection";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import BookingModal from "@/components/BookingModal";

interface PackageData {
  coins: string;
  price: string;
  title: string;
}

export default function Home() {
  // Auth & User State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<"member" | "agent">("member");
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Modal states
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<PackageData | null>(null);

  // Trigger Auth modal
  const handleOpenAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  // Trigger Booking modal with package payload
  const handleSelectPackage = (pkg: PackageData) => {
    setSelectedPkg(pkg);
    setBookingOpen(true);
  };

  // Default booking modal trigger (selects first package automatically)
  const handleDefaultBooking = () => {
    handleSelectPackage({
      coins: "3,300",
      price: "1,200",
      title: "★ ยอดนิยมอันดับ 1",
    });
  };

  // Scroll reveal animation loader hook
  useEffect(() => {
    const handleScrollReveal = () => {
      const reveals = document.querySelectorAll(".reveal");
      reveals.forEach((element) => {
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 120; // threshold

        if (elementTop < windowHeight - elementVisible) {
          element.classList.add("in");
        }
      });
    };

    // Run once on load and attach listener
    handleScrollReveal();
    window.addEventListener("scroll", handleScrollReveal);

    return () => window.removeEventListener("scroll", handleScrollReveal);
  }, []);

  return (
    <div className="min-h-screen bg-brand-paper font-sans text-brand-ink selection:bg-brand-green/20 overflow-x-hidden flex flex-col">
      {/* NAVBAR */}
      <Navbar
        onOpenAuth={handleOpenAuth}
        isLoggedIn={isLoggedIn}
        userRole={userRole}
        onLogout={() => {
          setIsLoggedIn(false);
          setUserRole("member");
        }}
      />
      {/* HERO SECTION */}
      <HeroSection onOpenBooking={handleDefaultBooking} />

      {/* HOW IT WORKS */}
      <div className="reveal">
        <HowItWorks onOpenBooking={handleDefaultBooking} />
      </div>

      {/* PACKAGES */}
      <div className="reveal">
        <PackagesSection onSelectPackage={handleSelectPackage} />
      </div>

      {/* SYSTEM STATS */}
      <div className="reveal">
        <StatsSection />
      </div>

      {/* SUPPORT */}
      <div className="reveal">
        <SupportSection />
      </div>

      {/* FOOTER */}
      <Footer />

      {/* ACCOUNT STATUS WIDGET */}
      {isLoggedIn && (
        <div className="fixed right-6.5 bottom-6.5 z-[90] flex flex-col items-end gap-2">
          {/* Popover Menu */}
          {showAccountMenu && (
            <div className="bg-white border border-brand-green-100 rounded-2xl p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 w-64 text-left mb-1">
              <p className="text-xs font-extrabold text-brand-ink mb-1">
                สิทธิ์บัญชีของคุณ
              </p>
              <p className="text-[11px] text-brand-ink-soft leading-normal mb-3">
                {userRole === "agent"
                  ? "ยินดีต้อนรับ! คุณอยู่ในฐานะตัวแทนจำหน่าย ได้รับส่วนลดพิเศษ 5% ทุกออเดอร์แล้ว"
                  : "คุณเป็นสมาชิกทั่วไป สามารถอัปเกรดเพื่อรับเรทราคาสุดพิเศษของตัวแทนจำหน่ายได้ทันที!"}
              </p>
              {userRole === "member" ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setUserRole("agent");
                    setShowAccountMenu(false);
                    alert(
                      "🎉 อัปเกรดสถานะเป็น ตัวแทนจำหน่าย สำเร็จแล้ว! คุณได้รับส่วนลดพิเศษ 5% ทันทีทุกแพ็กเกจ",
                    );
                  }}
                  className="w-full text-center py-2.5 px-3 rounded-xl font-bold text-xs bg-brand-gold hover:bg-brand-gold/90 text-brand-gold-deep border border-brand-gold-deep/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  ⚡ อัปเกรดเป็นตัวแทน
                </button>
              ) : (
                <div className="text-xs font-bold text-brand-green-700 bg-brand-green-50 py-1.5 px-3 rounded-lg border border-brand-green-100 text-center">
                  คุณเป็นตัวแทนจำหน่ายแล้ว ✅
                </div>
              )}
            </div>
          )}

          {/* Pill Widget (Matches screenshot exactly) */}
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="flex flex-col items-start bg-[#E2F3D8] hover:bg-[#D4EBC7] border border-brand-green-200/40 rounded-2xl py-2.5 px-4 shadow-md transition-all duration-200 text-left min-w-[145px] relative overflow-hidden group cursor-pointer"
          >
            <span className="text-[9.5px] font-extrabold text-brand-ink-soft/80 leading-none">
              สถานะบัญชี
            </span>
            <div className="flex items-center justify-between w-full mt-1.5 gap-4">
              <span className="flex items-center gap-1.5 text-xs font-black text-brand-ink leading-none">
                <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
                {userRole === "agent" ? "ตัวแทนจำหน่าย" : "สมาชิกทั่วไป"}
              </span>
              <User className="h-3.5 w-3.5 text-brand-ink-soft/90 flex-shrink-0" />
            </div>
          </button>
        </div>
      )}

      {/* AUTHENTICATION PORTAL MODAL */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialTab={authTab}
        onLoginSuccess={(role) => {
          setIsLoggedIn(true);
          setUserRole(role);
        }}
      />

      {/* QUEUE CHECKOUT BOOKING MODAL */}
      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        selectedPackage={selectedPkg}
      />
    </div>
  );
}
