"use client";
import Image from "next/image";
import React, { useState } from "react";
import { Home, CalendarDays, UserPlus, LogIn, Menu, X } from "lucide-react";

interface NavbarProps {
  onOpenAuth: (tab: "login" | "register") => void;
  isLoggedIn: boolean;
  userRole: "member" | "agent";
  onLogout: () => void;
}

export default function Navbar({ onOpenAuth, isLoggedIn, userRole, onLogout }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="sticky top-[18px] z-80 px-7 max-w-[1240px] mx-auto w-full">
      <nav className="flex items-center justify-between bg-white/78 backdrop-blur-xl border border-white/90 shadow-lg rounded-full py-2.5 pr-3.5 pl-5.5 transition-all duration-300">
        
        {/* Left Side: Brand/Logo & Nav Links (Desktop) */}
        <div className="flex items-center gap-6">
          <a href="#" className="relative w-16 h-11 flex items-center justify-start hover:opacity-95 transition duration-200">
            <img 
              src="/logo.webp" 
              alt="ORMOR Logo" 
              className="absolute w-[72px] h-[72px] max-w-none object-contain transition duration-300 hover:scale-110" 
            />
          </a>

          {/* Nav Links (Desktop) */}
          <div className="hidden md:flex gap-1.5 items-center">
            <a 
              href="#" 
              className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-full font-bold text-sm text-brand-green-700 bg-brand-green-100/70 hover:bg-brand-green-100 transition duration-200"
            >
              <Home className="h-4.5 w-4.5" />
              หน้าหลัก
            </a>
            <a 
              href="#packages" 
              className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-full font-bold text-sm text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green-700 transition duration-200"
            >
              <CalendarDays className="h-4.5 w-4.5" />
              จองคิวเติมเงิน
            </a>
          </div>
        </div>

        {/* CTA Actions (Desktop) */}
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <div className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs bg-brand-green-50 text-brand-green-700 border border-brand-green-100">
                <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
                {userRole === "agent" ? "ตัวแทน ORMOR ✅" : "ลูกค้าทั่วไป"}
              </div>
              <button 
                onClick={onLogout}
                className="px-5 py-3 rounded-full font-extrabold text-[13.5px] text-white bg-[#43525B] hover:bg-[#344148] shadow-md hover:-translate-y-0.5 transition duration-200 flex items-center gap-1.5 cursor-pointer"
              >
                ออกจากระบบ
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => onOpenAuth("register")}
                className="hidden sm:inline-flex items-center gap-1.5 px-5 py-3 rounded-full font-bold text-[13.5px] text-brand-ink hover:bg-brand-green-50 hover:text-brand-green-700 transition duration-200"
              >
                <UserPlus className="h-4 w-4" />
                สมัครสมาชิก
              </button>
              <button 
                onClick={() => onOpenAuth("login")}
                className="px-6 py-3 rounded-full font-extrabold text-[13.5px] text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition duration-200 flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                เข้าสู่ระบบ
              </button>
            </>
          )}
          
          {/* Burger Button (Mobile) */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-[13px] bg-brand-green-50 text-brand-green-700 hover:bg-brand-green-100 transition font-bold text-sm"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            <span>เมนู</span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-4 top-[84px] z-90 p-6 rounded-[28px] border border-white bg-white/95 shadow-2xl backdrop-blur-xl md:hidden animate-in fade-in slide-in-from-top-6 duration-200">
          <div className="flex flex-col gap-4">
            <a 
              href="#" 
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 p-3 rounded-2xl font-bold text-brand-green-700 bg-brand-green-50"
            >
              <Home className="h-5 w-5" />
              หน้าหลัก
            </a>
            <a 
              href="#packages" 
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 p-3 rounded-2xl font-bold text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green-700 transition"
            >
              <CalendarDays className="h-5 w-5" />
              จองคิวเติมเงิน
            </a>
            <div className="h-px bg-brand-green-100 my-2" />
            {isLoggedIn ? (
              <>
                <div className="flex items-center justify-center gap-1.5 p-3 rounded-2xl font-bold text-xs bg-brand-green-50 text-brand-green-700 border border-brand-green-100">
                  <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
                  {userRole === "agent" ? "ตัวแทน ORMOR ✅" : "ลูกค้าทั่วไป"}
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full py-3.5 rounded-2xl font-extrabold text-sm text-white bg-[#43525B] hover:bg-[#344148] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth("register");
                }}
                className="w-full py-3.5 rounded-2xl font-extrabold text-sm text-brand-ink bg-brand-green-50 hover:bg-brand-green-100 hover:text-brand-green-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="h-4.5 w-4.5" />
                สมัครสมาชิกใหม่
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
