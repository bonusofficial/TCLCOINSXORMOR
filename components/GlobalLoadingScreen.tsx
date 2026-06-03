"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePublicDataLoading } from "@/lib/contexts/PublicDataContext";

/**
 * GlobalLoadingScreen — splash ตอนเข้าเว็บครั้งแรก (แบบเรียบง่าย: icon หมุน + "กำลังโหลด...")
 *
 *  - ปิดทันทีเมื่อ config ชุดแรกพร้อม · มี hard cap ไม่ block เกิน MAX_MS (กันค้างบนมือถือ)
 *  - ตอน fade ใส่ pointer-events-none → แตะ/เลื่อนหน้าด้านล่างได้ทันที
 */
const MAX_MS = 1500;

export default function GlobalLoadingScreen() {
  const { loading } = usePublicDataLoading();
  const [ready, setReady] = useState(false); // เริ่ม fade ออก
  const [mounted, setMounted] = useState(true); // ถอด DOM หลัง fade

  // ปิดเมื่อ config ชุดแรกโหลดเสร็จ
  useEffect(() => {
    if (!loading.config) setReady(true);
  }, [loading.config]);

  // hard cap — ปิดแน่นอนภายใน MAX_MS
  useEffect(() => {
    const cap = window.setTimeout(() => setReady(true), MAX_MS);
    return () => window.clearTimeout(cap);
  }, []);

  // fade แล้วถอด DOM
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(id);
  }, [ready]);

  if (!mounted) return null;

  return (
    <div
      aria-label="กำลังโหลด"
      aria-live="polite"
      role="status"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-brand-paper transition-opacity duration-300 ${
        ready ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <Loader2 className="h-10 w-10 animate-spin text-brand-green" strokeWidth={2.5} />
      <p className="text-sm font-bold text-brand-ink-soft">กำลังโหลด...</p>
    </div>
  );
}
