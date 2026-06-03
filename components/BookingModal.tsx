"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, AlertTriangle, ArrowRight, ArrowLeft, Check, Ticket, ExternalLink, ShieldCheck, Copy } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { generateBookingCode, formatBookingDateTime } from "@/lib/booking";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";

interface PackageData {
  coins: string;
  price: string;
  title: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: PackageData | null;
}

export default function BookingModal({ isOpen, onClose, selectedPackage }: BookingModalProps) {
  const { data: session } = useSession();
  const userRole = ((session?.user as { role?: string } | undefined)?.role ?? "member").toLowerCase();

  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<"normal" | "agent">(userRole === "agent" ? "agent" : "normal");
  const [formData, setFormData] = useState({
    username: "",
    linePassword: "",
    reserveDate: "",
    reserveTime: "",
    phone: "",
    notes: ""
  });
  const [agreed, setAgreed] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [bookedAt, setBookedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setAgreed(false);
      // Generate booking code ตาม role
      setTicketId(generateBookingCode(userRole));

      // Default to today
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        reserveDate: today,
        reserveTime: "00.00–23.00",
        phone: (session?.user as { phone?: string } | undefined)?.phone ?? prev.phone,
      }));
      setBookedAt(null);
    }
  }, [isOpen, userRole, session]);

  const copyTicket = () => {
    copyToClipboard(ticketId);
    toast.success("คัดลอกรหัสจองแล้ว", { description: ticketId });
  };

  if (!isOpen || !selectedPackage) return null;

  // Pricing calculations
  const originalPrice = parseFloat(selectedPackage.price.replace(/,/g, ""));
  // Agents get a 5% discount
  const discount = userType === "agent" ? originalPrice * 0.05 : 0;
  const finalPrice = originalPrice - discount;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setBookedAt(new Date());
    setStep(4);
  };

  // Compile formatted message for LINE Admin
  const getLineMessage = () => {
    return encodeURIComponent(
      `สวัสดีครับ แอดมินจองคิวเติมเหรียญ\n` +
      `รหัสคิว: ${ticketId}\n` +
      `แพ็กเกจ: ${selectedPackage.coins} Coins (${finalPrice.toLocaleString()} บาท)\n` +
      `ประเภทผู้ใช้: ${userType === "agent" ? "ตัวแทนจำหน่าย" : "ลูกค้าทั่วไป"}\n` +
      `วันที่จอง: ${formData.reserveDate}\n` +
      `เวลาจอง: ${formData.reserveTime}\n` +
      `เบอร์โทรไลน์: ${formData.username}\n` +
      `กรุณาตรวจสอบคิวและยืนยันยอดโอนให้ด้วยครับ`
    );
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-[32px] border border-brand-green-100 bg-brand-surface p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 md:p-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Floating background lights */}
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-brand-green/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-brand-gold/10 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-brand-green-100 mb-6">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-green bg-brand-green-50 px-2.5 py-1 rounded-full">
              ขั้นตอนที่ {step} จาก 4
            </span>
            <h3 className="font-display text-xl font-extrabold text-brand-ink mt-1">
              {step === 1 && "กรอกข้อมูลบัญชี LINE"}
              {step === 2 && "เลือกเวลาจองคิว"}
              {step === 3 && "สรุปยอดจองและข้อตกลง"}
              {step === 4 && "จองสำเร็จ! ได้รับคิวของคุณแล้ว"}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green-50 text-brand-ink-soft hover:bg-brand-green-100 hover:text-brand-green transition"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Stepper Dots Indicators */}
        {step < 4 && (
          <div className="mb-6 flex gap-2">
            {[1, 2, 3].map((num) => (
              <div 
                key={num} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === num 
                    ? "w-8 bg-brand-green" 
                    : num < step 
                      ? "w-4 bg-brand-green-600" 
                      : "w-4 bg-brand-green-100"
                }`}
              />
            ))}
          </div>
        )}

        {/* STEP 1: LINE Account Information */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* User Type Toggle */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-ink-soft pl-1">ประเภทการเติม</label>
              <div className="flex rounded-2xl bg-brand-paper p-1 border border-brand-green-100">
                <button
                  type="button"
                  onClick={() => setUserType("normal")}
                  className={`flex-1 rounded-xl py-3 text-center text-xs font-bold transition ${
                    userType === "normal"
                      ? "bg-brand-surface text-brand-green shadow-sm border border-brand-green-100"
                      : "text-brand-ink-soft hover:text-brand-green"
                  }`}
                >
                  ลูกค้าทั่วไป
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("agent")}
                  className={`flex-1 rounded-xl py-3 text-center text-xs font-bold transition ${
                    userType === "agent"
                      ? "bg-brand-surface text-brand-green shadow-sm border border-brand-green-100"
                      : "text-brand-ink-soft hover:text-brand-green"
                  }`}
                >
                  ตัวแทนรับราคาสมาชิก (ลด 5%)
                </button>
              </div>
            </div>

            {/* Line Username */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-ink-soft pl-1">เบอร์มือถือ หรือ Line ID (ที่ผูกบัญชี)</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="กรุณากรอกเบอร์มือถือหรือไอดี"
                className="w-full rounded-2xl border border-brand-green-100 bg-brand-surface py-3.5 px-4 text-sm font-semibold outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green-50 text-brand-ink"
              />
            </div>

            {/* Line Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-ink-soft pl-1">รหัสผ่านบัญชี LINE</label>
              <input
                type="password"
                name="linePassword"
                value={formData.linePassword}
                onChange={handleInputChange}
                required
                placeholder="รหัสผ่าน LINE (เพื่อเข้าทำรายการ)"
                className="w-full rounded-2xl border border-brand-green-100 bg-brand-surface py-3.5 px-4 text-sm font-semibold outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green-50 text-brand-ink"
              />
              <p className="text-[10px] text-brand-coral font-bold flex items-center gap-1 mt-1 pl-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                กรุณายืนยันรหัสให้ถูกต้องเพื่อหลีกเลี่ยงความล่าช้าในขั้นตอนถอนคิว
              </p>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-ink-soft pl-1">เบอร์โทรติดต่อกลับ <span className="text-rose-400">*</span></label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder="เช่น 081-234-5678"
                className="w-full rounded-2xl border border-brand-green-100 bg-brand-surface py-3.5 px-4 text-sm font-semibold outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green-50 text-brand-ink"
              />
              <p className="text-[10px] text-brand-ink-soft font-bold mt-1 pl-1">
                ใช้สำหรับให้แอดมินติดต่อกลับ — ระบบไม่เปิดเผยข้อมูลกับบุคคลที่สาม
              </p>
            </div>

            {/* Active Package Banner */}
            <div className="rounded-2xl bg-brand-green-50 p-4 border border-brand-green-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-brand-ink-soft">แพ็กเกจที่เลือก</p>
                <p className="text-lg font-extrabold text-brand-green">{selectedPackage.coins} Coins</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-brand-ink-soft">ราคาปกติ</p>
                <p className="text-lg font-extrabold text-brand-ink">{originalPrice.toLocaleString()} บาท</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextStep}
              disabled={!formData.username || !formData.linePassword}
              className="w-full rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-600 py-3.5 px-4 text-sm font-extrabold text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 transition flex items-center justify-center gap-2 mt-4"
            >
              ดำเนินการต่อ
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Time Selection */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Date Selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-ink-soft pl-1 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-brand-green" />
                เลือกวันจองคิว
              </label>
              <input
                type="date"
                name="reserveDate"
                value={formData.reserveDate}
                onChange={handleInputChange}
                required
                className="w-full rounded-2xl border border-brand-green-100 bg-brand-surface py-3.5 px-4 text-sm font-semibold outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green-50 text-brand-ink"
              />
            </div>

            {/* Time Slot Selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-ink-soft pl-1 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-brand-green" />
                ช่วงเวลาที่ต้องการเติม (คิวเวลานั้นๆ)
              </label>
              <select
                name="reserveTime"
                value={formData.reserveTime}
                onChange={handleInputChange}
                required
                className="w-full rounded-2xl border border-brand-green-100 bg-brand-surface py-3.5 px-4 text-sm font-semibold outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green-50 text-brand-ink"
              >
                <option value="00.00–23.00">ตลอดวัน 00.00 - 23.00 (แนะนำ เติมเร็วสุด)</option>
                <option value="08.00–12.00">ช่วงเช้า 08.00 - 12.00 (คิวเช้า)</option>
                <option value="12.00–16.00">ช่วงบ่าย 12.00 - 16.00 (คิวบ่าย)</option>
                <option value="16.00–20.00">ช่วงเย็น 16.00 - 20.00 (คิวยอดนิยม)</option>
                <option value="20.00–23.00">รอบดึก 20.00 - 23.00</option>
              </select>
            </div>

            {/* Note Area */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-ink-soft pl-1">หมายเหตุเพิ่มเติมถึงแอดมิน (ถ้ามี)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                placeholder="เช่น การขอสำรองยอดหรือการแจ้งย้ายอุปกรณ์"
                className="w-full rounded-2xl border border-brand-green-100 bg-brand-surface py-3 px-4 text-sm font-semibold outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green-50 text-brand-ink resize-none"
              />
            </div>

            {/* Disclaimer android-only */}
            <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100 text-xs font-bold text-amber-800 leading-relaxed">
              <p className="flex items-center gap-1.5 mb-1 text-amber-900 font-extrabold">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
                โปรดอ่านก่อนยืนยันคิว:
              </p>
              * ระบบรองรับเฉพาะระบบปฏิบัติการ Android เท่านั้น หากใช้ iOS แอดมินจะต้องย้ายประวัติเพื่อดำเนินการให้ ซึ่งยอดเหรียญจะไม่แสดงบน iOS แต่เหรียญใช้งานซื้อสติกเกอร์/ธีมให้เครื่องท่านได้ปกติ
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 rounded-2xl border border-brand-green-100 bg-brand-surface py-3.5 px-4 text-sm font-extrabold text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green transition flex items-center justify-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-600 py-3.5 px-4 text-sm font-extrabold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition flex items-center justify-center gap-1"
              >
                หน้าถัดไป
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Summary and agreement */}
        {step === 3 && (
          <form onSubmit={handleSubmitBooking} className="space-y-4 animate-in fade-in duration-200">
            {/* Detailed Checkout Receipt list */}
            <div className="rounded-2xl border border-brand-green-100 bg-brand-paper p-4 space-y-3.5">
              <div className="flex justify-between items-center text-xs font-bold text-brand-ink-soft border-b border-brand-green-100 pb-2">
                <span>หัวข้อรายละเอียด</span>
                <span>ข้อมูลคิว</span>
              </div>
              
              <div className="flex justify-between items-center text-sm font-semibold text-brand-ink">
                <span className="text-brand-ink-soft">แพ็กเกจ</span>
                <span className="font-extrabold">{selectedPackage.coins} Coins</span>
              </div>

              <div className="flex justify-between items-center text-sm font-semibold text-brand-ink">
                <span className="text-brand-ink-soft">บัญชีไลน์ (เบอร์)</span>
                <span>{formData.username}</span>
              </div>

              <div className="flex justify-between items-center text-sm font-semibold text-brand-ink">
                <span className="text-brand-ink-soft">เวลาดำเนินการจอง</span>
                <span>{formData.reserveDate} ({formData.reserveTime})</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between items-center text-sm font-semibold text-brand-green">
                  <span>ส่วนลดตัวแทน (5%)</span>
                  <span>-{discount.toLocaleString()} บาท</span>
                </div>
              )}

              <div className="flex justify-between items-center border-t border-brand-green-100 pt-3 text-brand-ink">
                <span className="text-sm font-extrabold">ยอดโอนชำระสุทธิ</span>
                <span className="text-xl font-extrabold text-brand-green">{finalPrice.toLocaleString()} บาท</span>
              </div>
            </div>

            {/* Checkbox agreement */}
            <label className="flex gap-2.5 p-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 accent-brand-green flex-shrink-0"
              />
              <span className="text-xs font-semibold leading-relaxed text-brand-ink-soft">
                ฉันได้ตรวจสอบ <span className="text-brand-coral font-bold">ข้อมูลบัญชีไลน์/รหัสผ่าน</span> ถูกต้องดีแล้ว และยอมรับว่าห้ามกดยกเลิกหรือส่งข้อมูลเท็จ กดยืนยันเพื่อบันทึกคิวระบบ
              </span>
            </label>

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 rounded-2xl border border-brand-green-100 bg-brand-surface py-3.5 px-4 text-sm font-extrabold text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green transition flex items-center justify-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                ย้อนกลับ
              </button>
              <button
                type="submit"
                disabled={!agreed}
                className="flex-1 rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-600 py-3.5 px-4 text-sm font-extrabold text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 transition flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                ยืนยันการจองคิว
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Success Ticket */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-300">
            {/* Beautiful ticket design */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-brand-green bg-gradient-to-br from-brand-paper to-brand-paper p-6 shadow-md text-brand-ink">
              
              {/* Semi-circle cutouts on left and right side of ticket */}
              <div className="absolute top-1/2 -left-3.5 h-7 w-7 rounded-full bg-brand-surface border-r border-brand-green-100 -translate-y-1/2" />
              <div className="absolute top-1/2 -right-3.5 h-7 w-7 rounded-full bg-brand-surface border-l border-brand-green-100 -translate-y-1/2" />

              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0 flex-1">
                  <span className="text-[9.5px] font-extrabold uppercase bg-brand-green text-white px-2 py-0.5 rounded">
                    QUEUE PASS
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <p className="font-display font-black text-xl sm:text-2xl tracking-tight text-brand-green truncate">
                      {ticketId}
                    </p>
                    <button
                      type="button"
                      onClick={copyTicket}
                      title="คัดลอกรหัสจอง"
                      className="w-7 h-7 rounded-lg bg-brand-green-50 text-brand-green hover:bg-brand-green-100 flex items-center justify-center transition cursor-pointer flex-shrink-0"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-[10px] font-bold text-brand-ink-soft">สถานะ</p>
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-black bg-amber-50 text-amber-700 ring-1 ring-amber-500/30 px-2 py-0.5 rounded-md mt-1">
                    🟡 รอตรวจสอบ
                  </span>
                </div>
              </div>

              <div className="border-t border-brand-green-100 my-3.5 pt-3.5 space-y-2.5 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-brand-ink-soft">สินค้าจองคิว</span>
                  <span className="font-bold">{selectedPackage.coins} Coins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-ink-soft">ยอดเงินโอน</span>
                  <span className="font-black text-sm text-brand-green">{finalPrice.toLocaleString()} บาท</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-ink-soft">วัน-เวลาดำเนินรายการ</span>
                  <span className="font-bold">{formData.reserveDate} ({formData.reserveTime})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-ink-soft">บัญชีไลน์</span>
                  <span className="font-bold font-mono">{formData.username}</span>
                </div>
                {formData.phone && (
                  <div className="flex justify-between">
                    <span className="text-brand-ink-soft">เบอร์โทร</span>
                    <span className="font-bold">{formData.phone}</span>
                  </div>
                )}
                {bookedAt && (
                  <div className="flex justify-between">
                    <span className="text-brand-ink-soft">จองเมื่อ</span>
                    <span className="font-bold">{formatBookingDateTime(bookedAt)}</span>
                  </div>
                )}
              </div>

              {/* Fake Barcode structure */}
              <div className="mt-4 pt-3.5 border-t border-brand-green-100 flex flex-col items-center">
                <div className="h-8 w-4/5 bg-[repeating-linear-gradient(90deg,#1c2b14,#1c2b14_2px,transparent_2px,transparent_6px)]" />
                <p className="text-[9px] font-bold text-brand-ink-soft mt-1.5 tracking-widest">{ticketId}-044-TICK</p>
              </div>
            </div>

            {/* Checklist guide */}
            <div className="mt-5 rounded-2xl bg-brand-green-50 p-4 border border-brand-green-100 space-y-2.5">
              <p className="text-xs font-extrabold text-brand-green flex items-center gap-1.5">
                <Check className="h-4.5 w-4.5" />
                ขั้นตอนสุดท้ายในการเติม:
              </p>
              <ol className="text-[11px] font-semibold text-brand-ink-soft list-decimal pl-4.5 space-y-1 leading-relaxed">
                <li>กดปุ่มส่งตั๋วคิวไปที่แชทไลน์แอดมินด้านล่าง</li>
                <li>แนบรูปหลักฐานการโอนชำระเงิน <b className="text-brand-green">({finalPrice.toLocaleString()} บาท)</b></li>
                <li>แอดมินระบบจะยืนยันคิวและเติมเหรียญเสร็จสิ้นภายใน 5-10 นาที</li>
              </ol>
            </div>

            {/* Line redirect CTA buttons */}
            <div className="flex flex-col gap-2.5 mt-5">
              <a
                href={`https://line.me/R/ti/p/@ormorcoins?text=${getLineMessage()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-2xl bg-[#06C755] py-3.5 px-4 text-sm font-extrabold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4.5 w-4.5" />
                ส่งสลิป & ตั๋วคิวไปที่ LINE
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl bg-brand-green-50 py-3 px-4 text-xs font-bold text-brand-green hover:bg-brand-green-100 transition"
              >
                ปิดหน้าต่างนี้
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
