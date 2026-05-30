"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  X,
  Trash2,
  Plus,
  ImageIcon,
  Upload,
  Loader2,
  CalendarDays,
  Clock,
  Tag,
  Coins,
  Crown,
  Boxes,
  StickyNote,
  Users,
  Percent,
} from "lucide-react";
import { productsApi } from "@/lib/eden";
import { TimePicker } from "@/components/ui/TimePicker";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  PRODUCT_MAX_SALE_DATES,
  PRODUCT_MAX_TIME_SLOTS,
  PRODUCT_MAX_DISCOUNT_USERS,
  type ProductParsed,
  type TimeSlot,
} from "@/lib/types/product";

interface Props {
  open: boolean;
  initial: ProductParsed | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}

const inputCls =
  "w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60";

const textareaCls = `${inputCls} resize-none`;

function todayPlus(days: number) {
  const d = new Date();
  const ICTDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  ICTDate.setUTCDate(ICTDate.getUTCDate() + days);
  return `${ICTDate.getUTCFullYear()}-${String(ICTDate.getUTCMonth() + 1).padStart(2, "0")}-${String(ICTDate.getUTCDate()).padStart(2, "0")}`;
}

export function ProductFormModal({ open, initial, onClose, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [agentPrice, setAgentPrice] = useState("0");
  const [stockEnabled, setStockEnabled] = useState(false);
  const [stock, setStock] = useState("0");
  const [saleDates, setSaleDates] = useState<string[]>([todayPlus(0)]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { start: "09:00", end: "18:00" },
  ]);
  const [discountUsers, setDiscountUsers] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset / prefill เมื่อเปิด modal
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setImage(initial.image);
      setName(initial.name);
      setDescription(initial.description);
      setPrice(String(initial.price));
      setAgentPrice(String(initial.agentPrice));
      setStockEnabled(initial.stockEnabled);
      setStock(String(initial.stock));

      // Permissive JSON parsing — รับได้ทั้ง array, JSON string, datetime
      const toArray = (v: unknown): unknown[] => {
        if (Array.isArray(v)) return v;
        if (typeof v === "string") {
          try {
            const parsed = JSON.parse(v);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      const safeDates = toArray(initial.saleDates)
        .map((d) => {
          if (!d) return null;
          const str = typeof d === "string" 
            ? d 
            : (d instanceof Date 
              ? d.toISOString() 
              : String(d));
          const m = str.match(/^(\d{4}-\d{2}-\d{2})/);
          return m ? m[1] : null;
        })
        .filter((d): d is string => d !== null);
      setSaleDates(safeDates.length ? safeDates : [todayPlus(0)]);

      const safeSlots = toArray(initial.timeSlots).filter(
        (s): s is TimeSlot =>
          !!s &&
          typeof s === "object" &&
          typeof (s as TimeSlot).start === "string" &&
          typeof (s as TimeSlot).end === "string"
      );
      setTimeSlots(
        safeSlots.length ? safeSlots : [{ start: "09:00", end: "18:00" }]
      );

      const safeUsers = toArray(initial.discountEligibleUsernames).filter(
        (u): u is string => typeof u === "string"
      );
      setDiscountUsers(safeUsers.join(", "));
      setDiscountAmount(String(initial.discountAmount));
      setNote(initial.note ?? "");
    } else {
      setImage("");
      setName("");
      setDescription("");
      setPrice("0");
      setAgentPrice("0");
      setStockEnabled(false);
      setStock("0");
      setSaleDates([todayPlus(0)]);
      setTimeSlots([{ start: "09:00", end: "18:00" }]);
      setDiscountUsers("");
      setDiscountAmount("0");
      setNote("");
    }
  }, [open, initial]);

  if (!open) return null;

  /* ─── helpers ─── */
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.warning("ไฟล์ใหญ่เกินไป", { description: "อัปโหลดได้สูงสุด 3 MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const addDate = () => {
    if (saleDates.length >= PRODUCT_MAX_SALE_DATES) return;
    setSaleDates([...saleDates, todayPlus(saleDates.length)]);
  };
  const setDate = (i: number, v: string) =>
    setSaleDates(saleDates.map((d, idx) => (idx === i ? v : d)));
  const removeDate = (i: number) =>
    setSaleDates(saleDates.filter((_, idx) => idx !== i));

  const addSlot = () => {
    if (timeSlots.length >= PRODUCT_MAX_TIME_SLOTS) return;
    setTimeSlots([...timeSlots, { start: "10:00", end: "12:00" }]);
  };
  const setSlot = (i: number, field: keyof TimeSlot, v: string) =>
    setTimeSlots(
      timeSlots.map((s, idx) => (idx === i ? { ...s, [field]: v } : s))
    );
  const removeSlot = (i: number) =>
    setTimeSlots(timeSlots.filter((_, idx) => idx !== i));

  /* ─── submit ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!name.trim()) {
      toast.warning("ต้องระบุชื่อสินค้า");
      return;
    }

    const users = discountUsers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (users.length > PRODUCT_MAX_DISCOUNT_USERS) {
      toast.warning(`ระบุได้สูงสุด ${PRODUCT_MAX_DISCOUNT_USERS} คน`);
      return;
    }

    const payload = {
      image,
      name: name.trim(),
      description,
      price: Number(price) || 0,
      agentPrice: Number(agentPrice) || 0,
      stockEnabled,
      stock: Number(stock) || 0,
      saleDates,
      timeSlots,
      discountEligibleUsernames: users,
      discountAmount: Number(discountAmount) || 0,
      note: note.trim() || null,
    };

    setSaving(true);
    const id = toast.loading(initial ? "กำลังบันทึก..." : "กำลังเพิ่มสินค้า...");
    try {
      const res = initial
        ? await productsApi.item.api.v1
            .products({ id: String(initial.id) })
            .patch(payload)
        : await productsApi.collection.api.v1.products.post(payload);

      if (res.error) {
        const status = res.error.status;
        const value = res.error.value as { message?: string } | undefined;
        toast.error("บันทึกไม่สำเร็จ", {
          id,
          description: value?.message ?? `error ${status}`,
        });
        setSaving(false);
        return;
      }

      toast.success(res.data.message ?? "สำเร็จ", { id });
      onSaved();
      onClose();
    } catch (err) {
      toast.error("บันทึกไม่สำเร็จ", {
        id,
        description: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      {/* Modal box — flex column, height-bounded */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-2xl h-[95vh] sm:h-auto sm:max-h-[92vh] bg-brand-surface-soft border border-brand-green-100 rounded-t-3xl sm:rounded-3xl shadow-2xl ring-1 ring-brand-green/20 flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200"
      >
        {/* Header — fixed */}
        <header className="flex items-center justify-between p-4 sm:p-5 border-b border-brand-green-100/60 flex-shrink-0">
          <h3 className="font-display font-black text-base sm:text-lg text-brand-ink truncate">
            {initial ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-full bg-brand-surface border border-brand-green-100 flex items-center justify-center text-brand-ink-soft hover:text-brand-green transition cursor-pointer flex-shrink-0"
            aria-label="ปิด"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </header>

        {/* Body — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Image */}
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">
              รูปสินค้า
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="group relative bg-brand-paper border-2 border-dashed border-brand-green-100 rounded-2xl overflow-hidden hover:border-brand-green transition cursor-pointer aspect-[16/8]"
            >
              {image ? (
                <>
                  <img
                    src={image}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <span className="bg-brand-surface-soft text-brand-ink px-3 py-1.5 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1.5">
                      <Upload className="h-3 w-3" /> เปลี่ยน
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImage("");
                      }}
                      className="bg-rose-500/90 text-white px-3 py-1.5 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1.5 hover:bg-rose-500"
                    >
                      <Trash2 className="h-3 w-3" /> ลบ
                    </button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-brand-ink-soft p-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-green-50 flex items-center justify-center mb-2">
                    <ImageIcon className="h-5 w-5 text-brand-green" />
                  </div>
                  <p className="text-[12px] font-extrabold text-brand-ink">
                    คลิกอัปโหลดรูปสินค้า
                  </p>
                  <p className="text-[10px] font-bold mt-0.5">PNG/JPG ≤ 3 MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFile}
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-brand-green" />
              ชื่อสินค้า <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="เช่น 3,300 Coins"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">
              คำอธิบาย
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={textareaCls}
              placeholder="รายละเอียดสินค้า..."
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-brand-green" />
                ราคาทั่วไป (บาท)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-brand-gold" />
                ราคา Agent (บาท)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={agentPrice}
                onChange={(e) => setAgentPrice(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Sale dates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12.5px] font-extrabold text-brand-ink inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-brand-green" />
                วันที่ตั้งการขาย
                <span className="text-brand-ink-soft font-bold">
                  (สูงสุด {PRODUCT_MAX_SALE_DATES} วัน)
                </span>
              </label>
              <button
                type="button"
                onClick={addDate}
                disabled={saleDates.length >= PRODUCT_MAX_SALE_DATES}
                className="text-[11px] font-extrabold text-brand-green hover:text-brand-green-600 inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> เพิ่มวันที่
              </button>
            </div>
            <div className="space-y-2">
              {saleDates.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <DatePicker
                    value={d}
                    onChange={(v) => setDate(i, v)}
                    className="flex-1"
                  />
                  {saleDates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDate(i)}
                      className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center transition cursor-pointer flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Time slots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12.5px] font-extrabold text-brand-ink inline-flex items-center gap-1.5 flex-wrap">
                <Clock className="h-3.5 w-3.5 text-brand-green" />
                ช่วงเวลาเปิดรับ
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand-green/10 text-brand-green text-[10px] font-black ring-1 ring-brand-green/30">
                  เวลาไทย · UTC+7
                </span>
                <span className="text-brand-ink-soft font-bold">
                  (สูงสุด {PRODUCT_MAX_TIME_SLOTS} ช่วง)
                </span>
              </label>
              <button
                type="button"
                onClick={addSlot}
                disabled={timeSlots.length >= PRODUCT_MAX_TIME_SLOTS}
                className="text-[11px] font-extrabold text-brand-green hover:text-brand-green-600 inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> เพิ่มเวลา
              </button>
            </div>
            <p className="text-[10.5px] font-bold text-brand-ink-soft -mt-1 mb-2">
              ระบบใช้เวลาประเทศไทยเสมอ — ลูกค้าทุกคนจะเห็นช่วงเวลานี้ตรงกัน
            </p>
            <div className="space-y-2">
              {timeSlots.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                  <TimePicker
                    value={s.start}
                    onChange={(v) => setSlot(i, "start", v)}
                  />
                  <span className="text-brand-ink-soft font-bold">–</span>
                  <TimePicker
                    value={s.end}
                    onChange={(v) => setSlot(i, "end", v)}
                  />
                  {timeSlots.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center transition cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="w-10" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5 text-brand-green" />
              หมายเหตุ
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={textareaCls}
              placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)..."
            />
          </div>

          {/* Discount users */}
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-brand-green" />
              ผู้มีสิทธิ์ได้รับส่วนลด
              <span className="text-brand-ink-soft font-bold">
                (สูงสุด {PRODUCT_MAX_DISCOUNT_USERS} คน)
              </span>
            </label>
            <textarea
              rows={2}
              value={discountUsers}
              onChange={(e) => setDiscountUsers(e.target.value)}
              className={textareaCls}
              placeholder="ใส่ชื่อผู้ใช้ (คั่นด้วยจุลภาค ,) เช่น peak, riu, john..."
            />
          </div>

          {/* Discount amount */}
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-brand-gold" />
              จำนวนส่วนลดสำหรับผู้มีสิทธิ์ (บาท)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Stock toggle + amount */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-brand-paper border border-brand-green-100">
            <Boxes className="h-5 w-5 text-brand-green mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-extrabold text-brand-ink">
                  ระบบสต็อก
                </span>
                <button
                  type="button"
                  onClick={() => setStockEnabled(!stockEnabled)}
                  className={`relative w-11 h-6 rounded-full transition cursor-pointer ${
                    stockEnabled ? "bg-brand-green" : "bg-brand-ink-soft/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      stockEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {stockEnabled && (
                <input
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className={inputCls}
                  placeholder="จำนวนสต็อก"
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer — fixed */}
        <footer className="flex gap-2 sm:gap-3 p-4 sm:p-5 border-t border-brand-green-100/60 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 rounded-xl font-extrabold text-sm border border-brand-coral/40 bg-brand-coral/10 text-brand-coral hover:bg-brand-coral/20 transition cursor-pointer disabled:opacity-60"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-60 disabled:hover:translate-y-0 inline-flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "บันทึก" : "เพิ่มสินค้า"}
          </button>
        </footer>
      </form>
    </div>
  );
}
