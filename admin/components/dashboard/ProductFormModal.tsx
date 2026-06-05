"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { uploadImage } from "@/lib/upload";
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
import { productsApi, usersApi } from "@/lib/eden";
import { TimePicker } from "@/components/ui/TimePicker";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  type ProductParsed,
  type TimeSlot,
} from "@/lib/types/product";

type DiscountUserOption = {
  username: string | null;
  displayUsername: string | null;
  name: string;
  email: string;
};

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

const padTimePart = (n: number) => String(n).padStart(2, "0");

function currentThaiHHMM() {
  const d = new Date();
  const ICTDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return `${padTimePart(ICTDate.getUTCHours())}:${padTimePart(ICTDate.getUTCMinutes())}`;
}

function addMinutesWithinThaiDay(hhmm: string, minutesToAdd: number) {
  const [hRaw, mRaw] = hhmm.split(":");
  const startMinutes = (parseInt(hRaw, 10) || 0) * 60 + (parseInt(mRaw, 10) || 0);
  const endMinutes = Math.min(23 * 60 + 59, startMinutes + minutesToAdd);
  return `${padTimePart(Math.floor(endMinutes / 60))}:${padTimePart(endMinutes % 60)}`;
}

function defaultTimeSlot(): TimeSlot {
  const start = currentThaiHHMM();
  const end = addMinutesWithinThaiDay(start, 120);
  return start < end ? { start, end } : { start: "23:58", end: "23:59" };
}

function displayUserLabel(
  user: DiscountUserOption | undefined,
  fallbackUsername: string
) {
  return (
    user?.displayUsername?.trim() ||
    user?.name?.trim() ||
    user?.username?.trim() ||
    fallbackUsername
  );
}

export function ProductFormModal({ open, initial, onClose, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  // States
  const [image, setImage] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [cost, setCost] = useState("0");
  const [agentPrice, setAgentPrice] = useState("0");
  const [stockEnabled, setStockEnabled] = useState(false);
  const [stock, setStock] = useState("0");
  const [stockDirty, setStockDirty] = useState(false);
  const [maxPerUserPerDay, setMaxPerUserPerDay] = useState("0"); // 0 = ไม่จำกัด
  const [saleDates, setSaleDates] = useState<string[]>([todayPlus(0)]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => [defaultTimeSlot()]);
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<DiscountUserOption[]>([]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Load all users on mount
  useEffect(() => {
    usersApi.collection.api.v1.users
      .get()
      .then(({ data, error }) => {
        if (error || !data?.ok) return;
        setAllUsers(
          data.data.map((u) => ({
            username: u.username,
            displayUsername: u.displayUsername ?? null,
            name: u.name ?? "",
            email: u.email,
          }))
        );
      })
      .catch((err) => console.error("Load users failed:", err));
  }, []);

  // Reset / prefill เมื่อเปิด modal
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setImage(initial.image);
      setName(initial.name);
      setDescription(initial.description);
      setPrice(String(initial.price));
      setCost(String(initial.cost ?? "0"));
      setAgentPrice(String(initial.agentPrice));
      setStockEnabled(initial.stockEnabled);
      setStock(String(initial.stock));
      setStockDirty(false);
      setMaxPerUserPerDay(String(initial.maxPerUserPerDay ?? 0));

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
        safeSlots.length ? safeSlots : [defaultTimeSlot()]
      );

      const safeUsers = toArray(initial.discountEligibleUsernames).filter(
        (u): u is string => typeof u === "string"
      );
      setSelectedUsernames(safeUsers);
      setDiscountAmount(String(initial.discountAmount));
      setNote(initial.note ?? "");
    } else {
      setImage("");
      setName("");
      setDescription("");
      setPrice("0");
      setCost("0");
      setAgentPrice("0");
      setStockEnabled(false);
      setStock("0");
      setStockDirty(false);
      setMaxPerUserPerDay("0");
      setSaleDates([todayPlus(0)]);
      setTimeSlots([defaultTimeSlot()]);
      setSelectedUsernames([]);
      setDiscountAmount("0");
      setNote("");
    }
  }, [open, initial]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  /* ─── helpers ─── */
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.warning("ไฟล์ใหญ่เกินไป", { description: "อัปโหลดได้สูงสุด 3 MB" });
      e.target.value = "";
      return;
    }
    setImageUploading(true);
    const tId = toast.loading("กำลังอัปโหลดรูป...");
    try {
      // อัปโหลดเป็นไฟล์จริง → ได้ URL ไม่ใช่ base64
      const url = await uploadImage(file);
      setImage(url);
      toast.success("อัปโหลดรูปแล้ว", { id: tId });
    } catch (err) {
      toast.error("อัปโหลดรูปไม่สำเร็จ", {
        id: tId,
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setImageUploading(false);
      e.target.value = ""; // reset เพื่อเลือกไฟล์เดิมซ้ำได้
    }
  };

  const addDate = () => {
    setSaleDates([...saleDates, todayPlus(saleDates.length)]);
  };
  const setDate = (i: number, v: string) =>
    setSaleDates(saleDates.map((d, idx) => (idx === i ? v : d)));
  const removeDate = (i: number) =>
    setSaleDates(saleDates.filter((_, idx) => idx !== i));

  const addSlot = () => {
    setTimeSlots((prev) => [...prev, defaultTimeSlot()]);
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

    setSaving(true);
    const id = toast.loading(initial ? "กำลังบันทึก..." : "กำลังเพิ่มสินค้า...");
    try {
      let payloadStockEnabled = stockEnabled;
      let payloadStock = Number(stock) || 0;

      if (initial && !stockDirty) {
        const latest = await productsApi.item.api.v1
          .products({ id: String(initial.id) })
          .get();

        if (latest.error || !latest.data?.ok) {
          const value = latest.error?.value as { message?: string } | undefined;
          toast.error("บันทึกไม่สำเร็จ", {
            id,
            description: value?.message ?? "โหลดสต็อกล่าสุดไม่สำเร็จ กรุณาลองใหม่",
          });
          setSaving(false);
          return;
        }

        const latestProduct = latest.data.data as { stock?: unknown; stockEnabled?: unknown };
        payloadStockEnabled =
          typeof latestProduct.stockEnabled === "boolean"
            ? latestProduct.stockEnabled
            : stockEnabled;
        payloadStock =
          typeof latestProduct.stock === "number"
            ? latestProduct.stock
            : payloadStock;
      }

      const payload = {
        image,
        name: name.trim(),
        description,
        price: Number(price) || 0,
        cost: Number(cost) || 0,
        agentPrice: Number(agentPrice) || 0,
        stockEnabled: payloadStockEnabled,
        stock: payloadStock,
        maxPerUserPerDay: Math.max(0, Number(maxPerUserPerDay) || 0),
        saleDates,
        timeSlots,
        discountEligibleUsernames: selectedUsernames,
        discountAmount: Number(discountAmount) || 0,
        note: note.trim() || null,
      };

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

  // คำนวณกำไร
  const calculatedProfitGeneral = Math.max(0, Number(price) - Number(cost));
  const calculatedProfitAgent = Math.max(0, Number(agentPrice) - Number(cost));

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

        {/* Body — scrollable (รูป → ชื่อ → คำอธิบาย → ราคาขาย/ต้นทุน/Agent → สต็อก → วันและเวลา → ส่วนลด → หมายเหตุ) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* 1. รูปสินค้า (Image) */}
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">
              รูปสินค้า
            </label>
            <div
              onClick={() => {
                if (!imageUploading) fileRef.current?.click();
              }}
              className="group relative bg-brand-paper border-2 border-dashed border-brand-green-100 rounded-2xl overflow-hidden hover:border-brand-green transition cursor-pointer aspect-square max-w-[260px]"
            >
              {imageUploading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-brand-paper/80 backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
                </div>
              )}
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
                  <p className="text-[10px] font-bold mt-0.5 text-center">
                    แนะนำ 500×500px (1:1) · PNG/JPG ≤ 3 MB
                  </p>
                </div>
              )}
            </div>
            <p className="text-[10.5px] font-bold text-brand-ink-soft mt-1.5 leading-relaxed">
              💡 แนะนำขนาด <span className="text-brand-green font-black">500×500px</span> หรือสัดส่วน <span className="text-brand-green font-black">1:1 (สี่เหลี่ยมจัตุรัส)</span> — หากใส่รูปสัดส่วนผิดจะถูกครอบตัด/บิดเบี้ยวในการ์ดสินค้า
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFile}
            />
          </div>

          {/* 2. ชื่อสินค้า & คำอธิบาย */}
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

          {/* 3. ราคาขาย → ต้นทุน → ราคา Agent */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[12px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-brand-green" />
                  ราคาทั่วไป/ขาย (฿)
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
                <label className="block text-[12px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-brand-coral" />
                  ต้นทุน (บาท)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className={inputCls}
                  placeholder="ต้นทุนสินค้า"
                />
              </div>
              <div>
                <label className="block text-[12px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5 text-brand-gold" />
                  ราคา Agent (฿)
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

            {/* อัตราคำนวณกำไร */}
            {(!isNaN(Number(price)) && !isNaN(Number(cost)) && Number(price) > 0) && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-brand-green-50/50 border border-brand-green-100/60 text-[11px] font-bold text-brand-ink-soft select-none">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-green" />
                  <span>กำไรขายทั่วไป: <b className="text-brand-green text-xs">{calculatedProfitGeneral.toLocaleString()} บาท</b></span>
                </div>
                {(!isNaN(Number(agentPrice)) && Number(agentPrice) > 0) && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-gold-deep" />
                    <span>กำไร Agent: <b className="text-brand-gold-deep text-xs">{calculatedProfitAgent.toLocaleString()} บาท</b></span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. ระบบสต็อก (Segmented Control + Stepper) */}
          <div className="p-4 rounded-2xl bg-brand-paper border border-brand-green-100">
            <div className="flex items-start gap-3">
              <Boxes className="h-5 w-5 text-brand-green mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-extrabold text-brand-ink">
                      จำนวนสต็อก (มีของกี่ชิ้น)
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-brand-ink-soft -mt-1">
                    เลือก &ldquo;กำหนดจำนวน&rdquo; แล้วใส่จำนวนที่มี เช่น 10 — ขายหมดระบบจะปิดรับอัตโนมัติ
                  </p>
                  
                  {/* Segmented Control */}
                  <div className="grid grid-cols-2 p-1 bg-brand-surface border border-brand-green-100/60 rounded-xl select-none">
                    <button
                      type="button"
                      onClick={() => {
                        setStockDirty(true);
                        setStockEnabled(false);
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-black text-center transition-all cursor-pointer ${
                        !stockEnabled
                          ? "bg-gradient-to-r from-brand-green to-brand-green-600 text-white shadow-sm"
                          : "text-brand-ink-soft hover:text-brand-green"
                      }`}
                    >
                      ไม่จำกัด (ขายได้เรื่อยๆ)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStockDirty(true);
                        setStockEnabled(true);
                        if (stock === "0") {
                          setStock("10"); // default to 10 stock to avoid 0 stock auto-close
                        }
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-black text-center transition-all cursor-pointer ${
                        stockEnabled
                          ? "bg-gradient-to-r from-brand-green to-brand-green-600 text-white shadow-sm"
                          : "text-brand-ink-soft hover:text-brand-green"
                      }`}
                    >
                      กำหนดจำนวน (เช่น 10)
                    </button>
                  </div>
                </div>
                
                {stockEnabled && (
                  <div className="flex items-center gap-3 mt-4.5 select-none bg-brand-surface-soft border border-brand-green-100/40 rounded-xl p-3.5 animate-in fade-in duration-200">
                    <span className="text-xs font-bold text-brand-ink-soft">
                      มีของทั้งหมด (ชิ้น):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStockDirty(true);
                        setStock(Math.max(0, Number(stock) - 1).toString());
                      }}
                      className="w-9 h-9 rounded-lg bg-brand-green-50 text-brand-green border border-brand-green-100 hover:bg-brand-green-100 flex items-center justify-center font-black text-base transition cursor-pointer active:scale-95 flex-shrink-0"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={stock}
                      onChange={(e) => {
                        setStockDirty(true);
                        setStock(Math.max(0, parseInt(e.target.value) || 0).toString());
                      }}
                      className="w-20 rounded-lg border border-brand-green-100 bg-brand-paper py-1.5 px-2.5 text-center font-bold text-sm outline-none text-brand-ink"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setStockDirty(true);
                        setStock((Number(stock) + 1).toString());
                      }}
                      className="w-9 h-9 rounded-lg bg-brand-green-50 text-brand-green border border-brand-green-100 hover:bg-brand-green-100 flex items-center justify-center font-black text-base transition cursor-pointer active:scale-95 flex-shrink-0"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-brand-ink-soft/80 font-bold ml-auto">
                      * สต็อกจะลดลงทีละ 1 ทุกครั้งที่ลูกค้าจอง
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4b. จำกัดการจองต่อคน/วัน (เฉพาะสินค้านี้) */}
          <div className="p-4 rounded-2xl bg-brand-paper border border-brand-green-100">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-brand-green mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-[13px] font-extrabold text-brand-ink">
                  จำกัดการจองต่อคน/วัน (เฉพาะสินค้านี้)
                </span>
                <p className="text-[11px] font-bold text-brand-ink-soft mt-0.5 mb-3">
                  จำกัดว่า 1 คน จองสินค้านี้ได้กี่แพ็กต่อวัน — สินค้าแต่ละตัวตั้งแยกกันได้
                </p>

                <div className="grid grid-cols-2 p-1 bg-brand-surface border border-brand-green-100/60 rounded-xl select-none">
                  <button
                    type="button"
                    onClick={() => setMaxPerUserPerDay("0")}
                    className={`py-2 px-3 rounded-lg text-xs font-black text-center transition-all cursor-pointer ${
                      Number(maxPerUserPerDay) <= 0
                        ? "bg-gradient-to-r from-brand-green to-brand-green-600 text-white shadow-sm"
                        : "text-brand-ink-soft hover:text-brand-green"
                    }`}
                  >
                    ไม่จำกัด
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (Number(maxPerUserPerDay) <= 0) setMaxPerUserPerDay("3");
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-black text-center transition-all cursor-pointer ${
                      Number(maxPerUserPerDay) > 0
                        ? "bg-gradient-to-r from-brand-green to-brand-green-600 text-white shadow-sm"
                        : "text-brand-ink-soft hover:text-brand-green"
                    }`}
                  >
                    จำกัดจำนวน
                  </button>
                </div>

                {Number(maxPerUserPerDay) > 0 && (
                  <div className="flex items-center gap-3 mt-4.5 select-none bg-brand-surface-soft border border-brand-green-100/40 rounded-xl p-3.5 animate-in fade-in duration-200">
                    <span className="text-xs font-bold text-brand-ink-soft">
                      จองได้ไม่เกิน (แพ็ก/คน/วัน):
                    </span>
                    <button
                      type="button"
                      onClick={() => setMaxPerUserPerDay(Math.max(1, Number(maxPerUserPerDay) - 1).toString())}
                      className="w-9 h-9 rounded-lg bg-brand-green-50 text-brand-green border border-brand-green-100 hover:bg-brand-green-100 flex items-center justify-center font-black text-base transition cursor-pointer active:scale-95 flex-shrink-0"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={maxPerUserPerDay}
                      onChange={(e) => setMaxPerUserPerDay(Math.max(1, parseInt(e.target.value) || 1).toString())}
                      className="w-20 rounded-lg border border-brand-green-100 bg-brand-paper py-1.5 px-2.5 text-center font-bold text-sm outline-none text-brand-ink"
                    />
                    <button
                      type="button"
                      onClick={() => setMaxPerUserPerDay((Number(maxPerUserPerDay) + 1).toString())}
                      className="w-9 h-9 rounded-lg bg-brand-green-50 text-brand-green border border-brand-green-100 hover:bg-brand-green-100 flex items-center justify-center font-black text-base transition cursor-pointer active:scale-95 flex-shrink-0"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-brand-ink-soft/80 font-bold ml-auto">
                      เช่น 3 = คนละไม่เกิน 3 แพ็ก/วัน
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. วันและเวลาที่ตั้งขาย */}
          <div className="space-y-4">
            {/* วันที่ตั้งการขาย */}
            <div className="bg-brand-paper/40 p-4 border border-brand-green-100 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12.5px] font-extrabold text-brand-ink inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-brand-green" />
                  วันที่ตั้งการขาย
                  <span className="text-brand-ink-soft font-bold">
                    (ไม่จำกัด)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={addDate}
                  className="text-[11px] font-extrabold text-brand-green hover:text-brand-green-600 inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่มวันที่
                </button>
              </div>

              {/* วันที่ลูกค้าจอง Preview */}
              <div className="bg-brand-surface-soft/80 border border-brand-green-100/40 rounded-xl p-3 text-[11px] text-brand-ink-soft space-y-1.5 font-bold mb-3 select-none">
                <span className="text-[10px] text-brand-green font-extrabold uppercase tracking-wider block">💡 ตัวอย่างปฏิทินที่ลูกค้าจะคลิกจอง (Preview)</span>
                <div className="flex gap-1.5 flex-wrap">
                  {saleDates.slice(0, 3).map((d, index) => {
                    const formattedDate = d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : `วันที่ ${index + 1}`;
                    return (
                      <span key={index} className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-black ${index === 0 ? "bg-brand-green text-white border-brand-green shadow-sm shadow-brand-green/20" : "bg-brand-paper border-brand-green-100 text-brand-ink/75"}`}>
                        {formattedDate}
                      </span>
                    );
                  })}
                  {saleDates.length > 3 && (
                    <span className="px-2.5 py-1 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft/75 text-[10.5px]">
                      +{saleDates.length - 3} วันที่เหลือ...
                    </span>
                  )}
                </div>
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

            {/* ช่วงเวลาเปิดรับ */}
            <div className="bg-brand-paper/40 p-4 border border-brand-green-100 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12.5px] font-extrabold text-brand-ink inline-flex items-center gap-1.5 flex-wrap">
                  <Clock className="h-3.5 w-3.5 text-brand-green" />
                  ช่วงเวลาเปิดรับ
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand-green/10 text-brand-green text-[10px] font-black ring-1 ring-brand-green/30">
                    เวลาไทย · UTC+7
                  </span>
                  <span className="text-brand-ink-soft font-bold">
                    (ไม่จำกัดจำนวนช่วง)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={addSlot}
                  className="text-[11px] font-extrabold text-brand-green hover:text-brand-green-600 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่มเวลา
                </button>
              </div>
              <p className="text-[10.5px] font-bold text-brand-ink-soft -mt-1 mb-3">
                ระบบใช้เวลาประเทศไทยเสมอ — ลูกค้าทุกคนจะเห็นช่วงเวลานี้ตรงกัน
              </p>

              {/* ช่วงเวลา Preview */}
              <div className="bg-brand-surface-soft/80 border border-brand-green-100/40 rounded-xl p-3 text-[11px] text-brand-ink-soft space-y-1.5 font-bold mb-3 select-none">
                <span className="text-[10px] text-brand-green font-extrabold uppercase tracking-wider block">💡 ตัวอย่างแถบเลือกช่วงเวลาที่ลูกค้าจะกดเลือก (Preview)</span>
                <div className="flex gap-1.5 flex-wrap">
                  {timeSlots.slice(0, 3).map((slot, index) => (
                    <span key={index} className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-black ${index === 0 ? "bg-brand-green text-white border-brand-green shadow-sm shadow-brand-green/20" : "bg-brand-paper border-brand-green-100 text-brand-ink/75"}`}>
                      {slot.start} - {slot.end}
                    </span>
                  ))}
                  {timeSlots.length > 3 && (
                    <span className="px-2.5 py-1 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft/75 text-[10.5px]">
                      +{timeSlots.length - 3} ช่วง...
                    </span>
                  )}
                </div>
              </div>

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
          </div>

          {/* 6. ส่วนลด (ผู้มีสิทธิ์ได้รับส่วนลด & จำนวนส่วนลด) */}
          <div className="space-y-4">
            <div className="bg-brand-paper/40 p-4 border border-brand-green-100 rounded-2xl">
              <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-brand-green" />
                สมาชิกที่มีสิทธิ์ได้รับส่วนลดพิเศษ
                <span className="text-brand-ink-soft font-bold">
                  (ไม่จำกัดจำนวน)
                </span>
              </label>

              {/* แสดงแท็กคนที่เลือกไว้ */}
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedUsernames.map((uname) => {
                  const selectedUser = allUsers.find((u) => u.username === uname);
                  const label = displayUserLabel(selectedUser, uname);

                  return (
                    <span
                      key={uname}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-brand-green-50 text-brand-green border border-brand-green-100 shadow-sm"
                    >
                      <span>{label}</span>
                      {label !== uname && (
                        <span className="text-[10px] font-black text-brand-green/70">
                          @{uname}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedUsernames(selectedUsernames.filter((x) => x !== uname))}
                        className="w-4 h-4 rounded-full bg-brand-green-100 hover:bg-rose-500 hover:text-white text-brand-green flex items-center justify-center transition cursor-pointer active:scale-90"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  );
                })}
                {selectedUsernames.length === 0 && (
                  <span className="text-xs text-brand-ink-soft/60 font-bold py-1 select-none">
                    ยังไม่มีการเลือกสมาชิก (ใช้ราคาขายปกติทั่วไป)
                  </span>
                )}
              </div>

              {/* Search input & Custom searchable dropdown */}
              <div className="relative">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  className={inputCls}
                  placeholder="พิมพ์เพื่อค้นหาชื่อ Username, ชื่อแสดงผล หรืออีเมลสมาชิก..."
                />
                
                {dropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto bg-brand-surface border border-brand-green-100 rounded-xl shadow-2xl z-10 p-1 divide-y divide-brand-green-100/40 animate-in fade-in duration-100">
                    {allUsers.filter((u) => {
                      if (!u.username) return false;
                      const q = userSearch.toLowerCase().trim();
                      if (!q) return !selectedUsernames.includes(u.username);
                      return (
                        (u.username.toLowerCase().includes(q) ||
                         (u.displayUsername ?? "").toLowerCase().includes(q) ||
                         u.name.toLowerCase().includes(q) ||
                         u.email.toLowerCase().includes(q)) &&
                        !selectedUsernames.includes(u.username)
                      );
                    }).length === 0 ? (
                      <div className="p-3 text-center text-xs text-brand-ink-soft font-bold select-none">
                        ไม่พบรายชื่อสมาชิก หรือสมาชิกถูกเลือกครบแล้ว
                      </div>
                    ) : (
                      allUsers
                        .filter((u) => {
                          if (!u.username) return false;
                          const q = userSearch.toLowerCase().trim();
                          if (!q) return !selectedUsernames.includes(u.username);
                          return (
                            (u.username.toLowerCase().includes(q) ||
                             (u.displayUsername ?? "").toLowerCase().includes(q) ||
                             u.name.toLowerCase().includes(q) ||
                             u.email.toLowerCase().includes(q)) &&
                            !selectedUsernames.includes(u.username)
                          );
                        })
                        .map((u) => {
                          const label = displayUserLabel(u, u.username ?? "");

                          return (
                            <button
                              key={u.username}
                              type="button"
                              onClick={() => {
                                if (u.username) {
                                  setSelectedUsernames([...selectedUsernames, u.username]);
                                  setUserSearch("");
                                  setDropdownOpen(false);
                                }
                              }}
                              className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold text-brand-ink hover:bg-brand-green-50 hover:text-brand-green transition flex items-center justify-between cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="font-extrabold text-[12.5px] truncate">{label}</div>
                                <div className="text-[10px] text-brand-ink-soft mt-0.5 truncate">@{u.username} · {u.email}</div>
                              </div>
                              <Plus className="h-4 w-4 text-brand-green flex-shrink-0" />
                            </button>
                          );
                        })
                    )}
                  </div>
                )}
                {dropdownOpen && (
                  <div
                    className="fixed inset-0 z-0"
                    onClick={() => setDropdownOpen(false)}
                  />
                )}
              </div>
            </div>

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
          </div>

          {/* 7. หมายเหตุ (Note) */}
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5 text-brand-green" />
              หมายเหตุเพิ่มเติม
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={textareaCls}
              placeholder="ระบุหมายเหตุเพิ่มเติมที่เป็นประโยชน์สำหรับแอดมินหรือระบบ..."
            />
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
