"use client";

import React, { useState } from "react";
import { X, User, Lock, Mail, Phone, CheckCircle2, Eye, EyeOff, UserCheck, ShieldCheck } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
  onLoginSuccess?: (role: "member" | "agent") => void;
}

export default function AuthModal({ isOpen, onClose, initialTab = "login", onLoginSuccess }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Form fields state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  if (!isOpen) return null;

  const handleTabChange = (tab: "login" | "register") => {
    setActiveTab(tab);
    setSuccess(false);
    setShowPassword(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);

    const isAgent = formData.username.toLowerCase().includes("agent") || 
                    formData.username.includes("ตัวแทน");
    const role = isAgent ? "agent" : "member";

    setTimeout(() => {
      setSuccess(false);
      if (onLoginSuccess) {
        onLoginSuccess(role);
      }
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-brand-ink/40 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Light-Theme Optimized Modal Dialog */}
      <div className="relative w-full max-w-[950px] overflow-hidden rounded-[38px] border border-brand-green-100 bg-white shadow-[0_30px_60px_-15px_rgba(46,91,28,0.15)] transition-all duration-300 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Soft background light blobs */}
        <div className="absolute top-[-10%] left-[-10%] h-60 w-60 rounded-full bg-brand-green/8 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] h-60 w-60 rounded-full bg-brand-gold/6 blur-[80px] pointer-events-none" />

        {/* CLOSE BUTTON */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 lg:right-auto lg:left-[calc(57.5%-22px)] z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white border border-brand-green-100 shadow-md text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green-700 transition duration-200"
          aria-label="Close dialog"
        >
          <X className="h-5.5 w-5.5" />
        </button>

        {/* LEFT COLUMN: FORM ACTION PANEL */}
        <div className="p-8 md:p-12 lg:p-14 flex flex-col justify-center min-h-[520px] relative z-10 bg-white">
          {success ? (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-5 flex h-18 w-18 items-center justify-center rounded-full bg-brand-green-50 text-brand-green border border-brand-green-100 shadow-lg shadow-brand-green/10">
                <CheckCircle2 className="h-11 w-11" />
              </div>
              <h3 className="font-display text-2.5xl font-black text-brand-ink">
                {activeTab === "login" ? "เข้าสู่ระบบสำเร็จ!" : "สมัครสมาชิกสำเร็จ!"}
              </h3>
              <p className="mt-2 text-brand-ink-soft font-semibold text-sm max-w-xs leading-relaxed">
                กำลังดึงประวัติการจองและระบบสมาชิกขึ้นแสดงผล ยินดีต้อนรับกลับ...
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-200">
              
              {/* Header Title with live dot */}
              <div className="mb-8">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-green-700">ORMOR topup system</span>
                </div>
                <h2 className="font-display font-black text-3.5xl tracking-tight text-brand-ink mt-2 leading-none">
                  {activeTab === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
                </h2>
                <p className="mt-3 text-xs.5 md:text-sm text-brand-ink-soft font-bold">
                  {activeTab === "login" 
                    ? "ยินดีต้อนรับกลับมา! กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ" 
                    : "เริ่มการสมัครสมาชิกของคุณได้เลยที่นี่!"}
                </p>
              </div>

              {/* Form Input pods */}
              <form onSubmit={handleSubmit} className="space-y-4.5">
                
                {/* Username Input Pod */}
                <div className="relative group">
                  <div className="absolute top-1/2 left-4.5 -translate-y-1/2 flex items-center justify-center text-brand-ink-soft group-focus-within:text-brand-green-700 transition duration-200">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    placeholder={activeTab === "login" ? "ชื่อผู้ใช้งาน หรือ อีเมล" : "ชื่อผู้ใช้งาน"}
                    className="w-full rounded-2xl border border-brand-green-50/65 bg-[#F6FAF2]/80 py-4.5 pr-4 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green-50 text-brand-ink placeholder:text-brand-ink-soft/50"
                  />
                </div>
                
                {activeTab === "login" && (
                  <p className="text-[10px] text-brand-green-700 font-bold pl-1.5 -mt-3.5">
                    💡 ทดสอบ: พิมพ์คำว่า <span className="underline font-black">agent</span> หรือ <span className="underline font-black">ตัวแทน</span> เพื่อจำลองบัญชีตัวแทน
                  </p>
                )}

                {activeTab === "register" && (
                  <>
                    {/* Email Input Pod */}
                    <div className="relative group">
                      <div className="absolute top-1/2 left-4.5 -translate-y-1/2 flex items-center justify-center text-brand-ink-soft group-focus-within:text-brand-green-700 transition duration-200">
                        <Mail className="h-4.5 w-4.5" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="อีเมลของคุณ"
                        className="w-full rounded-2xl border border-brand-green-50/65 bg-[#F6FAF2]/80 py-4.5 pr-4 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green-50 text-brand-ink placeholder:text-brand-ink-soft/50"
                      />
                    </div>

                    {/* Phone Input Pod */}
                    <div className="relative group">
                      <div className="absolute top-1/2 left-4.5 -translate-y-1/2 flex items-center justify-center text-brand-ink-soft group-focus-within:text-brand-green-700 transition duration-200">
                        <Phone className="h-4.5 w-4.5" />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        placeholder="เบอร์โทรศัพท์"
                        className="w-full rounded-2xl border border-brand-green-50/65 bg-[#F6FAF2]/80 py-4.5 pr-4 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green-50 text-brand-ink placeholder:text-brand-ink-soft/50"
                      />
                    </div>
                  </>
                )}

                {/* Password Input Pod */}
                <div className="relative group">
                  <div className="absolute top-1/2 left-4.5 -translate-y-1/2 flex items-center justify-center text-brand-ink-soft group-focus-within:text-brand-green-700 transition duration-200">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    placeholder="รหัสผ่าน"
                    className="w-full rounded-2xl border border-brand-green-50/65 bg-[#F6FAF2]/80 py-4.5 pr-12.5 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green-50 text-brand-ink placeholder:text-brand-ink-soft/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-4.5 -translate-y-1/2 text-brand-ink-soft hover:text-brand-green-700 transition"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>

                {activeTab === "register" && (
                  /* Confirm Password Pod */
                  <div className="relative group">
                    <div className="absolute top-1/2 left-4.5 -translate-y-1/2 flex items-center justify-center text-brand-ink-soft group-focus-within:text-brand-green-700 transition duration-200">
                      <Lock className="h-4.5 w-4.5" />
                    </div>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      placeholder="ยืนยันรหัสผ่าน"
                      className="w-full rounded-2xl border border-brand-green-50/65 bg-[#F6FAF2]/80 py-4.5 pr-4 pl-12.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green-50 text-brand-ink placeholder:text-brand-ink-soft/50"
                    />
                  </div>
                )}

                {/* Options panel */}
                {activeTab === "login" && (
                  <div className="flex items-center justify-between pl-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 bg-[#F6FAF2] border-brand-green-100 rounded accent-brand-green"
                      />
                      <span className="text-xs.5 font-bold text-brand-ink-soft">จดจำฉันไว้</span>
                    </label>
                    <a href="#" className="text-xs.5 font-bold text-brand-ink-soft hover:text-brand-green-700 hover:underline transition">
                      ลืมรหัสผ่าน?
                    </a>
                  </div>
                )}

                {/* DUAL BUTTON CAPSULE SYSTEM */}
                <div className="pt-3.5 space-y-3">
                  
                  {/* Primary Button */}
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-600 hover:from-brand-green-600 hover:to-brand-green-700 py-4.5 px-4 text-base font-extrabold text-white shadow-lg shadow-brand-green/20 hover:scale-[1.01] hover:shadow-brand-green/35 transition duration-250 flex items-center justify-center gap-1.5"
                  >
                    {activeTab === "login" ? "เข้าสู่ระบบ ➔" : "สมัครสมาชิกเลย ➔"}
                  </button>

                  {/* Secondary Button */}
                  <button
                    type="button"
                    onClick={() => handleTabChange("register")}
                    className="w-full rounded-2xl bg-[#43525B] hover:bg-[#344148] border border-transparent py-3.5 px-4 text-base font-extrabold text-white hover:scale-[1.01] shadow-md transition duration-250 flex flex-col items-center justify-center leading-none gap-1"
                  >
                    <span>สมัครตัวแทน</span>
                    <span className="text-[10px] text-white/70 font-bold tracking-wide">สมัครสมาชิกเพื่อรับรหัสตัวแทน</span>
                  </button>

                </div>

              </form>

              {/* Footer Switch Option */}
              <div className="mt-8 text-center text-xs.5 text-brand-ink-soft font-bold">
                {activeTab === "login" ? (
                  <span>
                    ยังไม่มีบัญชีใช่ไหม?{" "}
                    <button 
                      onClick={() => handleTabChange("register")}
                      className="font-extrabold text-brand-green-700 hover:underline"
                    >
                      สมัครสมาชิกที่นี่
                    </button>
                  </span>
                ) : (
                  <span>
                    มีบัญชีแล้วใช่ไหม?{" "}
                    <button 
                      onClick={() => handleTabChange("login")}
                      className="font-extrabold text-brand-green-700 hover:underline"
                    >
                      เข้าสู่ระบบ
                    </button>
                  </span>
                )}
              </div>

            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CREAM-GREEN BLURRED ILLUSTRATION & DETAILS */}
        <div className="hidden lg:flex relative bg-gradient-to-br from-[#FFFDF6] via-[#F6FAF2] to-brand-green-50 p-12 lg:p-14 flex-col justify-center border-l border-brand-green-100/50 overflow-hidden">
          
          {/* Logo Background Banner - Reduced blur to 6px so it's beautifully visible */}
          <img 
            src="/logo.webp" 
            alt="ORMOR Logo Backdrop" 
            className="absolute inset-0 w-full h-full object-cover opacity-[0.14] blur-[6px] pointer-events-none scale-105" 
          />

          {/* Subtle grid background pattern */}
          <div 
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#7ACB53 1.4px, transparent 1.4px)",
              backgroundSize: "24px 24px"
            }}
          />

          {/* HIGHLIGHT ROLES INFO PANEL */}
          <div className="space-y-5.5 relative z-10 font-bold text-brand-ink text-sm">

            {/* Premium, engaging copy */}
            <p className="text-center px-2 leading-relaxed text-base md:text-lg">
              <span className="font-extrabold text-brand-ink leading-snug block">
                "ระบบจองคิวอัจฉริยะที่จะเปลี่ยนการเติมเหรียญไลน์ของคุณให้รวดเร็ว ปลอดภัย และคุ้มค่าสูงสุดในทุกออเดอร์"
              </span>
            </p>

            {/* Highlight Tag: Agent - Expanded padding and reduced blur */}
            <div className="flex gap-4.5 bg-white/85 border border-[#E04F96]/15 p-7.5 rounded-[32px] shadow-sm backdrop-blur-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-[#E04F96]/10 text-[#E04F96] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <UserCheck className="h-5.5 w-5.5" />
              </div>
              <div className="text-xs.5 leading-relaxed">
                <b className="text-[#E04F96] text-[14.5px] block mb-1 font-black">บทบาทตัวแทนจำหน่าย</b>
                <span className="text-brand-ink-soft">สมัครสมาชิกโดยใช้ <b className="text-[#E04F96]">(ชื่อผู้ใช้งาน)</b> ในกลุ่มโอเพนแชทที่คุณตั้งไว้ได้เลย</span>
              </div>
            </div>

            {/* Highlight Tag: Customer - Expanded padding and reduced blur */}
            <div className="flex gap-4.5 bg-white/85 border border-brand-green-100/40 p-7.5 rounded-[32px] shadow-sm backdrop-blur-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-brand-green-50 text-brand-green-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <ShieldCheck className="h-5.5 w-5.5" />
              </div>
              <div className="text-xs.5 leading-relaxed">
                <b className="text-brand-green-700 text-[14.5px] block mb-1 font-black">บทบาทลูกค้าทั่วไป</b>
                <span className="text-brand-ink-soft">สมัครสมาชิกได้ตามปกติ และสามารถอัปเกรดเป็นตัวแทนเพื่อรับเรทพิเศษที่ดีกว่าเดิมได้ทันที</span>
              </div>
            </div>

            {/* Social proof badge under cards */}
            <div className="text-center pt-2">
              <p className="text-xs font-black text-brand-green-700 bg-brand-green-50/80 border border-brand-green-100/80 py-2 px-4.5 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                <span>สมาชิกกว่า 143 คนไว้วางใจแล้ว ⭐</span>
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
