"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { uploadImage } from "@/lib/upload";
import {
  X,
  Trash2,
  Plus,
  Minus,
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
  Copy,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { productsApi, usersApi } from "@/lib/eden";
import { TimePicker } from "@/components/ui/TimePicker";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  type ProductParsed,
  type SaleSchedule,
  type TopupRound,
  type TimeSlot,
} from "@/lib/types/product";

type DiscountUserOption = {
  username: string | null;
  displayUsername: string | null;
  name: string;
  email: string;
  role: string | null;
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

function CapacityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (rawValue: string) => {
    const parsed = Number(rawValue);
    const next =
      Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
    setDraft(String(next));
    onChange(next);
  };

  const adjust = (amount: number) => {
    const parsed = Number(draft);
    const current =
      Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : value;
    const next = Math.max(1, current + amount);
    setDraft(String(next));
    onChange(next);
  };

  return (
    <div className="mt-1 grid grid-cols-[2.5rem_minmax(4.5rem,1fr)_2.5rem] overflow-hidden rounded-xl border border-brand-green-100 bg-brand-paper transition focus-within:border-brand-green focus-within:ring-4 focus-within:ring-brand-green/20">
      <button
        type="button"
        onClick={() => adjust(-1)}
        disabled={(Number(draft) || value) <= 1}
        aria-label="ลดจำนวนที่รับต่อรอบ"
        className="flex h-10 items-center justify-center border-r border-brand-green-100 text-brand-ink-soft transition hover:bg-brand-green-50 hover:text-brand-green disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer"
      >
        <Minus className="h-4 w-4" strokeWidth={3} />
      </button>
      <input
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        value={draft}
        onChange={(event) => {
          const rawValue = event.target.value;
          setDraft(rawValue);
          const parsed = Number(rawValue);
          if (
            rawValue !== "" &&
            Number.isInteger(parsed) &&
            parsed >= 1
          ) {
            onChange(parsed);
          }
        }}
        onBlur={() => commit(draft)}
        aria-label="จำนวนที่รับต่อรอบ"
        className="h-10 min-w-0 appearance-none border-0 bg-transparent px-2 text-center text-sm font-black text-brand-ink outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => adjust(1)}
        aria-label="เพิ่มจำนวนที่รับต่อรอบ"
        className="flex h-10 items-center justify-center border-l border-brand-green-100 text-brand-green transition hover:bg-brand-green-50 cursor-pointer"
      >
        <Plus className="h-4 w-4" strokeWidth={3} />
      </button>
    </div>
  );
}

function todayPlus(days: number) {
  const d = new Date();
  const ICTDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  ICTDate.setUTCDate(ICTDate.getUTCDate() + days);
  return `${ICTDate.getUTCFullYear()}-${String(ICTDate.getUTCMonth() + 1).padStart(2, "0")}-${String(ICTDate.getUTCDate()).padStart(2, "0")}`;
}

function defaultTopupRound(index = 0): TopupRound {
  const startHour = Math.min(21, 12 + index * 3);
  const start = `${String(startHour).padStart(2, "0")}:00`;
  const end = `${String(Math.min(23, startHour + 1)).padStart(2, "0")}:00`;
  return {
    code: `R${index + 1}`,
    name: `รอบที่ ${index + 1}`,
    start,
    end,
    capacity: 10,
    enabled: true,
    sortOrder: index,
  };
}

function defaultSaleSchedule(date = todayPlus(0)): SaleSchedule {
  return {
    date,
    bookingStart: "09:00",
    bookingEnd: "23:00",
    rounds: [defaultTopupRound(0)],
  };
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

function normalizeIdentity(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function discountUserKeys(user: DiscountUserOption) {
  return [user.username, user.displayUsername, user.name]
    .map(normalizeIdentity)
    .filter(Boolean);
}

function findCurrentDiscountUser(
  users: DiscountUserOption[],
  storedUsername: string
) {
  const key = normalizeIdentity(storedUsername);
  if (!key) return undefined;

  return users.find((user) => discountUserKeys(user).includes(key));
}

function canonicalDiscountUsername(
  storedUsername: string,
  users: DiscountUserOption[]
) {
  return findCurrentDiscountUser(users, storedUsername)?.username?.trim() || storedUsername.trim();
}

function normalizeDiscountUsernames(
  usernames: string[],
  users: DiscountUserOption[]
) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const username of usernames) {
    const matchedUser = findCurrentDiscountUser(users, username);
    if (
      matchedUser &&
      normalizeIdentity(matchedUser.role) !== "vip"
    ) {
      continue;
    }
    const currentUsername = canonicalDiscountUsername(username, users);
    const key = normalizeIdentity(currentUsername);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    normalized.push(currentUsername);
  }

  return normalized;
}

function sameStringList(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
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
  const [saleSchedules, setSaleSchedules] = useState<SaleSchedule[]>(() => [
    defaultSaleSchedule(),
  ]);
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
            role: u.role,
          }))
        );
      })
      .catch((err) => console.error("Load users failed:", err));
  }, []);

  // Reset / prefill เมื่อเปิด modal
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
      const safeSlots = toArray(initial.timeSlots).filter(
        (s): s is TimeSlot =>
          !!s &&
          typeof s === "object" &&
          typeof (s as TimeSlot).start === "string" &&
          typeof (s as TimeSlot).end === "string"
      );
      const safeSchedules = toArray(initial.saleSchedules)
        .map((value) => {
          if (!value || typeof value !== "object") return null;
          const schedule = value as Record<string, unknown>;
          const rawDate = schedule.date;
          const dateText =
            rawDate instanceof Date ? rawDate.toISOString() : String(rawDate ?? "");
          const date = dateText.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
          if (
            !date ||
            typeof schedule.bookingStart !== "string" ||
            typeof schedule.bookingEnd !== "string" ||
            !Array.isArray(schedule.rounds)
          ) {
            return null;
          }
          return {
            date,
            bookingStart: schedule.bookingStart,
            bookingEnd: schedule.bookingEnd,
            rounds: schedule.rounds as SaleSchedule["rounds"],
          };
        })
        .filter((schedule): schedule is SaleSchedule => schedule !== null);
      if (safeSchedules.length > 0) {
        setSaleSchedules(
          safeSchedules.map((schedule) => ({
            ...schedule,
            rounds: schedule.rounds
              .map((round, index) => ({
                ...round,
                capacity: Math.max(1, Number(round.capacity) || 1),
                enabled: round.enabled !== false,
                sortOrder: index,
              }))
              .sort((a, b) => a.sortOrder - b.sortOrder),
          }))
        );
      } else {
        const legacyStart = safeSlots[0]?.start ?? "09:00";
        const legacyEnd = safeSlots[safeSlots.length - 1]?.end ?? "23:00";
        setSaleSchedules(
          (safeDates.length ? safeDates : [todayPlus(0)]).map((date) => ({
            ...defaultSaleSchedule(date),
            bookingStart: legacyStart,
            bookingEnd: legacyEnd,
          }))
        );
      }

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
      setSaleSchedules([defaultSaleSchedule()]);
      setSelectedUsernames([]);
      setDiscountAmount("0");
      setNote("");
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open || allUsers.length === 0) return;

    setSelectedUsernames((prev) => {
      const next = normalizeDiscountUsernames(prev, allUsers);
      return sameStringList(prev, next) ? prev : next;
    });
  }, [open, allUsers]);

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

  const updateSchedule = (index: number, patch: Partial<SaleSchedule>) => {
    setSaleSchedules((previous) =>
      previous.map((schedule, currentIndex) =>
        currentIndex === index ? { ...schedule, ...patch } : schedule
      )
    );
  };

  const updateRound = (
    scheduleIndex: number,
    roundIndex: number,
    patch: Partial<TopupRound>
  ) => {
    setSaleSchedules((previous) =>
      previous.map((schedule, currentScheduleIndex) => {
        if (currentScheduleIndex !== scheduleIndex) return schedule;
        return {
          ...schedule,
          rounds: schedule.rounds.map((round, currentRoundIndex) =>
            currentRoundIndex === roundIndex ? { ...round, ...patch } : round
          ),
        };
      })
    );
  };

  const addRound = (scheduleIndex: number) => {
    setSaleSchedules((previous) =>
      previous.map((schedule, currentIndex) => {
        if (currentIndex !== scheduleIndex) return schedule;
        let number = schedule.rounds.length + 1;
        while (schedule.rounds.some((round) => round.code === `R${number}`)) number += 1;
        return {
          ...schedule,
          rounds: [
            ...schedule.rounds,
            {
              ...defaultTopupRound(schedule.rounds.length),
              code: `R${number}`,
              name: `รอบที่ ${number}`,
            },
          ],
        };
      })
    );
  };

  const removeRound = (scheduleIndex: number, roundIndex: number) => {
    setSaleSchedules((previous) =>
      previous.map((schedule, currentIndex) =>
        currentIndex === scheduleIndex
          ? {
              ...schedule,
              rounds: schedule.rounds.filter((_, index) => index !== roundIndex),
            }
          : schedule
      )
    );
  };

  const moveRound = (
    scheduleIndex: number,
    roundIndex: number,
    direction: -1 | 1
  ) => {
    setSaleSchedules((previous) =>
      previous.map((schedule, currentIndex) => {
        if (currentIndex !== scheduleIndex) return schedule;
        const targetIndex = roundIndex + direction;
        if (targetIndex < 0 || targetIndex >= schedule.rounds.length) return schedule;
        const rounds = [...schedule.rounds];
        [rounds[roundIndex], rounds[targetIndex]] = [
          rounds[targetIndex],
          rounds[roundIndex],
        ];
        return { ...schedule, rounds };
      })
    );
  };

  const copyRoundsToOtherDates = (sourceIndex: number) => {
    const sourceRounds = saleSchedules[sourceIndex]?.rounds ?? [];
    setSaleSchedules((previous) =>
      previous.map((schedule, index) =>
        index === sourceIndex
          ? schedule
          : {
              ...schedule,
              rounds: sourceRounds.map((round, roundIndex) => ({
                ...round,
                sortOrder: roundIndex,
              })),
            }
      )
    );
    toast.success("คัดลอกรอบเติมไปใช้กับวันอื่นแล้ว");
  };

  /* ─── submit ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!name.trim()) {
      toast.warning("ต้องระบุชื่อสินค้า");
      return;
    }
    if (saleSchedules.length === 0) {
      toast.warning("ต้องกำหนดวันเปิดรับจองอย่างน้อย 1 วัน");
      return;
    }
    if (Number(discountAmount) > Number(agentPrice)) {
      toast.warning("ส่วนลด VIP ต้องไม่เกินราคา Agent");
      return;
    }
    const seenDates = new Set<string>();
    for (const schedule of saleSchedules) {
      if (!schedule.date || seenDates.has(schedule.date)) {
        toast.warning(
          seenDates.has(schedule.date)
            ? `วันที่ ${schedule.date} ถูกตั้งค่าซ้ำ`
            : "กรุณาระบุวันที่เปิดรับจอง"
        );
        return;
      }
      seenDates.add(schedule.date);
      if (
        !schedule.bookingStart ||
        !schedule.bookingEnd ||
        schedule.bookingStart >= schedule.bookingEnd
      ) {
        toast.warning(`ช่วงเวลาเปิดรับจองวันที่ ${schedule.date} ไม่ถูกต้อง`);
        return;
      }
      const seenCodes = new Set<string>();
      for (const round of schedule.rounds) {
        const code = round.code.trim();
        if (!code || !round.name.trim() || seenCodes.has(code)) {
          toast.warning(
            seenCodes.has(code)
              ? `รหัสรอบ ${code} ซ้ำในวันที่ ${schedule.date}`
              : `กรุณากรอกรหัสและชื่อรอบในวันที่ ${schedule.date}`
          );
          return;
        }
        seenCodes.add(code);
        if (!round.start || !round.end || round.start >= round.end) {
          toast.warning(`เวลาของ ${round.name} วันที่ ${schedule.date} ไม่ถูกต้อง`);
          return;
        }
      }
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
        saleDates: saleSchedules.map((schedule) => schedule.date),
        timeSlots: saleSchedules.map((schedule) => ({
          start: schedule.bookingStart,
          end: schedule.bookingEnd,
        })),
        saleSchedules: saleSchedules.map((schedule) => ({
          ...schedule,
          rounds: schedule.rounds.map((round, index) => ({
            ...round,
            code: round.code.trim(),
            name: round.name.trim(),
            capacity: Math.max(1, Number(round.capacity) || 1),
            sortOrder: index,
          })),
        })),
        discountEligibleUsernames: normalizeDiscountUsernames(
          selectedUsernames,
          allUsers
        ),
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
  const calculatedVipPrice = Math.max(
    0,
    Number(agentPrice) - Number(discountAmount)
  );
  const availableVipUsers = allUsers.filter((user) => {
    if (
      !user.username ||
      normalizeIdentity(user.role) !== "vip"
    ) {
      return false;
    }
    const query = userSearch.toLowerCase().trim();
    const isSelected = selectedUsernames.some(
      (selected) =>
        normalizeIdentity(canonicalDiscountUsername(selected, allUsers)) ===
        normalizeIdentity(user.username)
    );
    if (isSelected) return false;
    if (!query) return true;
    return (
      user.username.toLowerCase().includes(query) ||
      (user.displayUsername ?? "").toLowerCase().includes(query) ||
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

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
                  ราคา Agent / ฐานราคา VIP (฿)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={agentPrice}
                  onChange={(e) => setAgentPrice(e.target.value)}
                  className={inputCls}
                />
                <p className="mt-1 text-[9.5px] font-bold text-brand-ink-soft">
                  สมาชิก VIP ทุกบัญชีจะลดเพิ่มจากราคานี้อัตโนมัติ
                </p>
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

          {/* 5. ตารางเปิดรับจองและรอบเติม แยกตามวัน */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="inline-flex items-center gap-1.5 text-[13px] font-black text-brand-ink">
                  <CalendarDays className="h-4 w-4 text-brand-green" />
                  ตารางเปิดรับจองและรอบเติม
                </h4>
                <p className="mt-1 text-[10.5px] font-bold text-brand-ink-soft">
                  เวลาเปิดรับจองคือเวลาที่เว็บไซต์รับคำสั่ง ส่วนรอบเติมคือเวลาที่ร้านดำเนินการให้ลูกค้า
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSaleSchedules((previous) => [
                    ...previous,
                    defaultSaleSchedule(todayPlus(previous.length)),
                  ])
                }
                className="inline-flex flex-shrink-0 items-center gap-1 rounded-xl border border-brand-green/30 bg-brand-green/10 px-3 py-2 text-[11px] font-black text-brand-green hover:bg-brand-green hover:text-white transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                เพิ่มวันที่
              </button>
            </div>

            {saleSchedules.map((schedule, scheduleIndex) => (
              <section
                key={`${schedule.date}-${scheduleIndex}`}
                className="rounded-2xl border border-brand-green-100 bg-brand-paper/50 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[11px] font-extrabold text-brand-ink-soft">
                      วันที่เปิดรับ
                    </label>
                    <DatePicker
                      value={schedule.date}
                      onChange={(date) => updateSchedule(scheduleIndex, { date })}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 self-end">
                    {saleSchedules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => copyRoundsToOtherDates(scheduleIndex)}
                        className="inline-flex h-10 items-center gap-1 rounded-xl border border-brand-green-100 bg-brand-surface px-2.5 text-[10px] font-extrabold text-brand-green hover:border-brand-green transition cursor-pointer"
                        title="คัดลอกรอบเติมของวันนี้ไปใช้กับวันอื่นทั้งหมด"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        คัดลอกรอบไปวันอื่น
                      </button>
                    )}
                    {saleSchedules.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSaleSchedules((previous) =>
                            previous.filter((_, index) => index !== scheduleIndex)
                          )
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                        aria-label="ลบวันที่"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-sky-500/25 bg-sky-500/8 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-sky-500">
                    <Clock className="h-3.5 w-3.5" />
                    ส่วนที่ 1 · ช่วงเวลาเปิดรับจอง
                  </div>
                  <p className="mb-3 text-[10px] font-bold text-brand-ink-soft">
                    เว็บไซต์อนุญาตให้ลูกค้ากดยืนยันจองได้เฉพาะช่วงนี้ ไม่ใช่เวลาที่ร้านเติมสินค้า
                  </p>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <TimePicker
                      value={schedule.bookingStart}
                      onChange={(bookingStart) =>
                        updateSchedule(scheduleIndex, { bookingStart })
                      }
                    />
                    <span className="font-bold text-brand-ink-soft">–</span>
                    <TimePicker
                      value={schedule.bookingEnd}
                      onChange={(bookingEnd) =>
                        updateSchedule(scheduleIndex, { bookingEnd })
                      }
                    />
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-brand-green/25 bg-brand-green/5 p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-black text-brand-green">
                        ส่วนที่ 2 · รอบเติมของวันนี้
                      </div>
                      <p className="mt-0.5 text-[10px] font-bold text-brand-ink-soft">
                        ลูกค้าเลือกรอบได้ 1 รอบต่อออเดอร์ ระบบปิดรอบอัตโนมัติเมื่อเต็ม
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addRound(scheduleIndex)}
                      className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-brand-green/30 bg-brand-surface px-2.5 py-1.5 text-[10.5px] font-black text-brand-green hover:bg-brand-green hover:text-white transition cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      เพิ่มรอบ
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {schedule.rounds.map((round, roundIndex) => (
                      <div
                        key={`${round.code}-${roundIndex}`}
                        className="rounded-xl border border-brand-green-100 bg-brand-surface p-3"
                      >
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className="text-[10px] font-extrabold text-brand-ink-soft">
                            รหัสรอบ
                            <input
                              value={round.code}
                              onChange={(event) =>
                                updateRound(scheduleIndex, roundIndex, {
                                  code: event.target.value,
                                })
                              }
                              maxLength={80}
                              className={`${inputCls} mt-1`}
                              placeholder="R1"
                            />
                          </label>
                          <label className="text-[10px] font-extrabold text-brand-ink-soft">
                            ชื่อรอบ
                            <input
                              value={round.name}
                              onChange={(event) =>
                                updateRound(scheduleIndex, roundIndex, {
                                  name: event.target.value,
                                })
                              }
                              maxLength={120}
                              className={`${inputCls} mt-1`}
                              placeholder="รอบที่ 1"
                            />
                          </label>
                        </div>
                        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                          <label className="text-[10px] font-extrabold text-brand-ink-soft">
                            เวลาเริ่ม
                            <TimePicker
                              value={round.start}
                              onChange={(start) =>
                                updateRound(scheduleIndex, roundIndex, { start })
                              }
                              className="mt-1"
                            />
                          </label>
                          <span className="pb-3 font-bold text-brand-ink-soft">–</span>
                          <label className="text-[10px] font-extrabold text-brand-ink-soft">
                            เวลาสิ้นสุด
                            <TimePicker
                              value={round.end}
                              onChange={(end) =>
                                updateRound(scheduleIndex, roundIndex, { end })
                              }
                              className="mt-1"
                            />
                          </label>
                        </div>
                        <div className="mt-2 flex flex-wrap items-end gap-2">
                          <div className="min-w-40 flex-1 text-[10px] font-extrabold text-brand-ink-soft">
                            จำนวนที่รับต่อรอบ
                            <CapacityStepper
                              value={round.capacity}
                              onChange={(capacity) =>
                                updateRound(scheduleIndex, roundIndex, {
                                  capacity,
                                })
                              }
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateRound(scheduleIndex, roundIndex, {
                                enabled: !round.enabled,
                              })
                            }
                            className={`h-10 rounded-xl border px-3 text-[10.5px] font-black transition cursor-pointer ${
                              round.enabled
                                ? "border-brand-green/30 bg-brand-green/10 text-brand-green"
                                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {round.enabled ? "เปิดรับจอง" : "ปิดรับจอง"}
                          </button>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => moveRound(scheduleIndex, roundIndex, -1)}
                              disabled={roundIndex === 0}
                              className="flex h-10 w-9 items-center justify-center rounded-lg border border-brand-green-100 text-brand-ink-soft hover:text-brand-green disabled:opacity-30 cursor-pointer"
                              aria-label="เลื่อนรอบขึ้น"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveRound(scheduleIndex, roundIndex, 1)}
                              disabled={roundIndex === schedule.rounds.length - 1}
                              className="flex h-10 w-9 items-center justify-center rounded-lg border border-brand-green-100 text-brand-ink-soft hover:text-brand-green disabled:opacity-30 cursor-pointer"
                              aria-label="เลื่อนรอบลง"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRound(scheduleIndex, roundIndex)}
                              className="flex h-10 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                              aria-label="ลบรอบ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {schedule.rounds.length === 0 && (
                      <div className="rounded-xl border border-dashed border-brand-green/30 bg-brand-green/5 p-4 text-center text-[11px] font-extrabold text-brand-green">
                        ไม่กำหนดรอบเติม — ลูกค้าจองได้ตามช่วงเวลาเปิดรับจอง
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* 6. ส่วนลด (ผู้มีสิทธิ์ได้รับส่วนลด & จำนวนส่วนลด) */}
          <div className="space-y-4">
            <div className="bg-brand-paper/40 p-4 border border-brand-green-100 rounded-2xl">
              <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-brand-green" />
                รายชื่อ VIP เดิม (ไม่ใช้จำกัดสิทธิ์แล้ว)
                <span className="text-brand-ink-soft font-bold">
                  (ไม่จำกัดจำนวน)
                </span>
              </label>

              {/* แสดงแท็กคนที่เลือกไว้ */}
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedUsernames.map((uname) => {
                  const selectedUser = findCurrentDiscountUser(allUsers, uname);
                  const currentUsername = selectedUser?.username?.trim() || uname;
                  const label = displayUserLabel(selectedUser, currentUsername);

                  return (
                    <span
                      key={currentUsername}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-brand-green-50 text-brand-green border border-brand-green-100 shadow-sm"
                    >
                      <span>{label}</span>
                      {label !== currentUsername && (
                        <span className="text-[10px] font-black text-brand-green/70">
                          @{currentUsername}
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
                    ไม่ต้องเลือกรายชื่อ — สมาชิก VIP ทุกบัญชีได้รับราคา VIP
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
                  placeholder="ค้นหา Username, ชื่อแสดงผล หรืออีเมลของสมาชิก VIP..."
                />
                
                {dropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto bg-brand-surface border border-brand-green-100 rounded-xl shadow-2xl z-10 p-1 divide-y divide-brand-green-100/40 animate-in fade-in duration-100">
                    {availableVipUsers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-brand-ink-soft font-bold select-none">
                        ไม่พบสมาชิกยศ VIP หรือถูกเลือกครบแล้ว
                      </div>
                    ) : (
                      availableVipUsers.map((u) => {
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
                ส่วนลด VIP ทุกบัญชีจากราคา Agent (บาท)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className={inputCls}
              />
              <div className="mt-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs font-bold text-brand-ink-soft">
                ราคา VIP = ราคา Agent ฿
                {Number(agentPrice).toLocaleString()} − ส่วนลด ฿
                {Number(discountAmount).toLocaleString()} ={" "}
                <b className="text-amber-500">
                  ฿{calculatedVipPrice.toLocaleString()}
                </b>
              </div>
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
