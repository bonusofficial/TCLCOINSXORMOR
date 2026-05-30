"use client";

/**
 * Demo page: ใช้ Eden client เรียก /api/v1/setting/normal
 *
 * Pattern ที่แสดง:
 *  1) Initial load (GET) ตอน mount ด้วย useEffect
 *  2) Save (PUT) จาก form submit พร้อม loading state
 *  3) Error handling แยกตาม status (401/403/422/500)
 *  4) Type-safe end-to-end — IDE auto-complete + compile error
 *
 * เปิดที่: http://localhost:3000/demo/setting
 * (ต้อง login เป็น admin เพราะ route มี requireRole: "admin")
 */

import React, { useEffect, useState } from "react";
import { settingApi } from "@/lib/eden";
import { toast } from "sonner";
import { Loader2, Save, RefreshCw } from "lucide-react";

const initialForm = {
  logo: "",
  title: "",
  description: "",
  keywords: "",
  agentLink: "",
  contactLine: "",
  phone: "",
  qrcodenormal: "",
  qrcodeagent: "",
  qrcodesupport: "",
  warningMessage: "",
};

export default function DemoSettingPage() {
  const [form, setForm] = useState(initialForm);
  const [accessedBy, setAccessedBy] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ────────────────────────────────────────
   * 1) LOAD — Eden GET
   * ──────────────────────────────────────── */
  const load = async () => {
    setLoading(true);
    const { data, error } = await settingApi.normal.api.v1.setting.normal.get();

    if (error) {
      // error.status — type-narrowed: 401 | 403 | 422 | 500
      const status = error.status;
      if (status === 401) toast.error("กรุณาเข้าสู่ระบบก่อน");
      else if (status === 403) toast.error("ต้องเป็น admin เท่านั้น");
      else toast.error(`โหลดไม่สำเร็จ (${status})`);
      setLoading(false);
      return;
    }

    // data type-safe — IDE รู้ว่ามี ok, data, accessedBy
    if (data.ok) {
      const c = data.data;
      setForm({
        logo: c.logo,
        title: c.title,
        description: c.description,
        keywords: c.keywords,
        agentLink: c.agentLink,
        contactLine: c.contactLine,
        phone: c.phone,
        qrcodenormal: c.qrcodenormal,
        qrcodeagent: c.qrcodeagent,
        qrcodesupport: c.qrcodesupport,
        warningMessage: c.warningMessage,
      });
      setAccessedBy(data.accessedBy);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /* ────────────────────────────────────────
   * 2) SAVE — Eden PUT
   * ──────────────────────────────────────── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const id = toast.loading("กำลังบันทึก...");

    const { data, error } = await settingApi.normal.api.v1.setting.normal.put(form);

    if (error) {
      // Type narrowing แยกตาม status
      if (error.status === 401) {
        toast.error("กรุณาเข้าสู่ระบบ", { id });
      } else if (error.status === 403) {
        toast.error("ไม่มีสิทธิ์", {
          id,
          description: "ต้องเป็น admin เท่านั้น",
        });
      } else if (error.status === 422) {
        // VALIDATION error จาก errorPlugin
        const value = error.value as { message?: string; issues?: unknown[] };
        toast.error("ข้อมูลไม่ถูกต้อง", {
          id,
          description: value?.message ?? "ตรวจสอบ field ที่กรอก",
        });
        console.error("Validation issues:", value?.issues);
      } else {
        toast.error("บันทึกไม่สำเร็จ", { id });
      }
      setSaving(false);
      return;
    }

    toast.success(data.message, {
      id,
      description: `บันทึกโดย ${data.updatedBy}`,
    });
    setSaving(false);
  };

  /* ────────────────────────────────────────
   * UI
   * ──────────────────────────────────────── */

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-paper flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-brand-ink-soft font-bold">
          <Loader2 className="h-5 w-5 animate-spin" />
          กำลังโหลด...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-paper font-sans text-brand-ink py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-3xl text-brand-ink">
              Eden Demo · Setting Normal
            </h1>
            <p className="text-sm text-brand-ink-soft font-medium mt-1">
              เข้าถึงโดย <b className="text-brand-green">{accessedBy}</b>
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-brand-surface border border-brand-green-100 text-brand-ink-soft hover:bg-brand-green-50 hover:text-brand-green transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            โหลดใหม่
          </button>
        </header>

        <form
          onSubmit={handleSave}
          className="bg-brand-surface border border-brand-green-100 rounded-3xl p-6 space-y-4 shadow-sm ring-1 ring-brand-green/10"
        >
          {(
            [
              ["title", "ชื่อเว็บไซต์"],
              ["description", "คำอธิบาย"],
              ["keywords", "Keywords"],
              ["agentLink", "ลิงก์สมัครตัวแทน"],
              ["contactLine", "LINE OA"],
              ["phone", "เบอร์โทร"],
              ["warningMessage", "ข้อความเตือน"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">
                {label}
              </label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink"
              />
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              บันทึก
            </button>
          </div>
        </form>

        {/* Raw response สำหรับ debug */}
        <details className="mt-6 bg-brand-surface border border-brand-green-100 rounded-2xl p-4 text-xs">
          <summary className="font-extrabold text-brand-ink cursor-pointer">
            🔍 ดู form state (debug)
          </summary>
          <pre className="mt-3 text-brand-ink-soft font-mono overflow-x-auto">
            {JSON.stringify(form, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
