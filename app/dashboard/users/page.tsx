"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  RefreshCw,
  Pencil,
  Trash2,
  Crown,
  Shield,
  User as UserIcon,
  X,
  Save,
  Mail,
  AtSign,
  Phone,
  Coins,
  Download,
} from "lucide-react";
import { usersApi } from "@/lib/eden";
import { timeAgo } from "@/lib/audit-labels";
import { formatDisplayID } from "@/components/Navbar";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";

type UserRole = "member" | "agent" | "admin";

interface AppUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  image: string | null;
  role: string | null;
  phone: string | null;
  credit: number | null;
  total_credit: number | null;
  emailVerified: boolean;
  shopName: string | null;
  lineId: string | null;
  createdAt: string;
  updatedAt: string;
}

const ROLE_META: Record<UserRole, {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  bg: string;
  text: string;
}> = {
  member: { label: "สมาชิก", icon: UserIcon, bg: "bg-brand-green-50", text: "text-brand-green" },
  agent: { label: "ตัวแทน", icon: Crown, bg: "bg-amber-50", text: "text-amber-700" },
  admin: { label: "ผู้ดูแลระบบ", icon: Shield, bg: "bg-sky-50", text: "text-sky-700" },
};

function normalizeRole(r: string | null): UserRole {
  const v = (r ?? "").toLowerCase().trim();
  if (v === "admin" || v === "agent" || v === "member") return v;
  return "member";
}

function fallbackAvatar(identifier: string) {
  const c = (identifier ?? "U").charAt(0).toUpperCase() || "U";
  return `https://placehold.co/200x200/39C848/F7FDF7?text=${encodeURIComponent(c)}`;
}

export default function UsersPage() {
  const [items, setItems] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await usersApi.collection.api.v1.users.get();
    if (error) {
      const value = error.value as { message?: string } | undefined;
      toast.error(value?.message ?? `โหลดไม่สำเร็จ (${error.status})`);
      setLoading(false);
      return;
    }
    if (data.ok) setItems(data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  const handleDelete = async (u: AppUser) => {
    if (!confirm(`ลบบัญชี "${u.email}" จริงหรือไม่? (จะลบ session/account ด้วย)`)) return;
    setDeletingId(u.id);
    const id = toast.loading("กำลังลบ...");
    const { data, error } = await usersApi.item.api.v1.users({ id: u.id }).delete();
    setDeletingId(null);
    if (error) {
      const value = error.value as { message?: string } | undefined;
      toast.error("ลบไม่สำเร็จ", { id, description: value?.message });
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== u.id));
    toast.success(data.message ?? "ลบแล้ว", { id });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((u) => {
      if (roleFilter !== "all" && normalizeRole(u.role) !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.username ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").includes(q) ||
        (u.shopName ?? "").toLowerCase().includes(q) ||
        (u.lineId ?? "").toLowerCase().includes(q) ||
        formatDisplayID(u.id).toLowerCase().includes(q)
      );
    });
  }, [items, search, roleFilter]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Handle Export to Excel (CSV with UTF-8 BOM)
  const handleExport = () => {
    const headers = ["ID", "ชื่อผู้ใช้", "อีเมล", "Username", "ชื่อร้าน", "ไอดีไลน์เติม Coins", "บทบาท (Role)", "เบอร์โทรศัพท์", "สมัครเมื่อ"];
    const rows = filtered.map(u => [
      u.id,
      u.name,
      u.email,
      u.username || "—",
      u.shopName || "—",
      u.lineId || "—",
      ROLE_META[normalizeRole(u.role)].label,
      u.phone || "—",
      new Date(u.createdAt).toLocaleString("th-TH")
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `users_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("ส่งออกข้อมูลสำเร็จ", { description: `ดาวน์โหลดเรียบร้อยแล้ว (${filtered.length} รายการ)` });
  };

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display font-black text-xl sm:text-2xl text-brand-ink">
            จัดการผู้ใช้
          </h1>
          <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
            ทั้งหมด <b className="text-brand-green">{items.length}</b> คน
            {filtered.length !== items.length && (
              <> · กรองได้ <b className="text-brand-green">{filtered.length}</b></>
            )}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer self-start"
        >
          <Download className="h-4 w-4" />
          <span>ส่งออก Excel</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-3 mb-4 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-brand-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา ชื่อ/อีเมล/username/เบอร์..."
            className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 pl-9 pr-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60"
          />
        </div>
        <div className="flex gap-1.5 bg-brand-paper border border-brand-green-100 rounded-xl p-1">
          {(["all", "member", "agent", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-[11.5px] font-extrabold transition cursor-pointer ${
                roleFilter === r
                  ? "bg-brand-green text-white shadow-sm"
                  : "text-brand-ink-soft hover:text-brand-green"
              }`}
            >
              {r === "all" ? "ทั้งหมด" : ROLE_META[r].label}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-brand-green-100 bg-brand-paper text-brand-ink-soft hover:border-brand-green hover:text-brand-green transition cursor-pointer disabled:opacity-50 text-sm font-bold"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>รีเฟรช</span>
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-ink-soft">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="font-bold">กำลังโหลด...</span>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-brand-surface border border-brand-green-100 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4">ผู้ใช้</TableHead>
                  <TableHead className="py-3 px-3">ติดต่อ</TableHead>
                  <TableHead className="py-3 px-3">ชื่อร้าน / ไอดีไลน์</TableHead>
                  <TableHead className="py-3 px-3 text-center">Role</TableHead>
                  <TableHead className="py-3 px-3 whitespace-nowrap">สมัครเมื่อ</TableHead>
                  <TableHead className="py-3 px-4 text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((u) => {
                  const role = normalizeRole(u.role);
                  const RoleIcon = ROLE_META[role].icon;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.image || fallbackAvatar(u.name || u.email)}
                            alt={u.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-green-100"
                          />
                          <div className="min-w-0">
                            <div className="font-display font-extrabold text-[13.5px] text-brand-ink line-clamp-1">
                              {u.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {u.username && (
                                <span className="text-[11px] text-brand-ink-soft font-bold">@{u.username}</span>
                              )}
                              <span className="text-[9.5px] bg-brand-green-50 text-brand-green border border-brand-green-100 rounded px-1 font-mono font-bold">
                                ID: {formatDisplayID(u.id)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-[11.5px]">
                        <div className="text-brand-ink-soft font-medium line-clamp-1">{u.email}</div>
                        {u.phone && (
                          <div className="text-brand-ink-soft/70 font-bold mt-0.5">{u.phone}</div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-[11.5px]">
                        {u.shopName ? (
                          <div className="font-extrabold text-brand-ink line-clamp-1">{u.shopName}</div>
                        ) : (
                          <div className="text-brand-ink-soft/40 italic">ไม่มีข้อมูลร้าน</div>
                        )}
                        {u.lineId ? (
                          <div className="text-brand-green font-bold mt-0.5">LINE: {u.lineId}</div>
                        ) : (
                          <div className="text-brand-ink-soft/40 italic text-[10.5px]">ไม่มีไลน์เติมเงิน</div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black ${ROLE_META[role].bg} ${ROLE_META[role].text}`}>
                          <RoleIcon className="h-3 w-3" strokeWidth={2.5} />
                          {ROLE_META[role].label}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-[11.5px] font-bold text-brand-ink-soft whitespace-nowrap">
                        {timeAgo(u.createdAt)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => setEditing(u)}
                            className="w-8 h-8 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:border-brand-green hover:bg-brand-green-50 hover:text-brand-green flex items-center justify-center transition cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={deletingId === u.id}
                            className="w-8 h-8 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:border-rose-400 hover:bg-rose-500/10 hover:text-rose-400 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                          >
                            {deletingId === u.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {paginatedItems.map((u) => {
              const role = normalizeRole(u.role);
              const RoleIcon = ROLE_META[role].icon;
              return (
                <article key={u.id} className="bg-brand-surface border border-brand-green-100 rounded-2xl p-3 flex gap-3 shadow-xs">
                  <img
                    src={u.image || fallbackAvatar(u.name || u.email)}
                    alt={u.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-brand-green-100 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-display font-extrabold text-sm text-brand-ink line-clamp-1">{u.name}</div>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black flex-shrink-0 ${ROLE_META[role].bg} ${ROLE_META[role].text}`}>
                        <RoleIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
                        {ROLE_META[role].label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <div className="text-[11px] text-brand-ink-soft font-medium line-clamp-1">{u.email}</div>
                      <span className="text-[9px] bg-brand-green-50 text-brand-green border border-brand-green-100 rounded px-1 font-mono font-bold whitespace-nowrap">
                        ID: {formatDisplayID(u.id)}
                      </span>
                    </div>
                    {(u.shopName || u.lineId) && (
                      <div className="mt-1.5 pt-1.5 border-t border-brand-green-100/40 text-[11px] space-y-0.5">
                        {u.shopName && (
                          <div className="text-brand-ink font-semibold">ร้าน: <span className="font-extrabold">{u.shopName}</span></div>
                        )}
                        {u.lineId && (
                          <div className="text-brand-green font-bold">LINE เติม Coins: {u.lineId}</div>
                        )}
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-2">
                      <button onClick={() => setEditing(u)} className="flex-1 py-1.5 rounded-lg text-[11px] font-extrabold bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:text-brand-green inline-flex items-center justify-center gap-1 cursor-pointer">
                        <Pencil className="h-3 w-3" /> แก้ไข
                      </button>
                      <button onClick={() => handleDelete(u)} disabled={deletingId === u.id} className="w-9 rounded-lg bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:text-rose-400 inline-flex items-center justify-center cursor-pointer disabled:opacity-50">
                        {deletingId === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {/* Edit modal */}
      {editing && (
        <UserEditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
          }}
        />
      )}
    </main>
  );
}

/* ── Edit modal ── */

function UserEditModal({
  user,
  onClose,
  onSaved,
}: {
  user: AppUser;
  onClose: () => void;
  onSaved: (u: AppUser) => void;
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [shopName, setShopName] = useState(user.shopName ?? "");
  const [lineId, setLineId] = useState(user.lineId ?? "");
  const [role, setRole] = useState<UserRole>(normalizeRole(user.role));
  const [credit, setCredit] = useState(String(user.credit ?? 0));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const tId = toast.loading("กำลังบันทึก...");
    const { data, error } = await usersApi.item.api.v1
      .users({ id: user.id })
      .patch({
        name,
        phone,
        role,
        credit: Number(credit) || 0,
        shopName: shopName.trim() || null,
        lineId: lineId.trim() || null,
      });
    setSaving(false);
    if (error) {
      const value = error.value as { message?: string } | undefined;
      toast.error("บันทึกไม่สำเร็จ", { id: tId, description: value?.message });
      return;
    }
    toast.success(data.message ?? "อัปเดตแล้ว", { id: tId });
    onSaved(data.data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[92vh] bg-brand-surface-soft border border-brand-green-100 rounded-t-3xl sm:rounded-3xl shadow-2xl ring-1 ring-brand-green/20 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <header className="flex items-center justify-between p-5 border-b border-brand-green-100/60 flex-shrink-0">
          <h3 className="font-display font-black text-lg text-brand-ink">แก้ไขผู้ใช้</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-brand-surface border border-brand-green-100 flex items-center justify-center text-brand-ink-soft hover:text-brand-green cursor-pointer">
            <X className="h-4.5 w-4.5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-brand-green" />
              อีเมล
            </label>
            <input value={user.email} disabled className="w-full rounded-xl border border-brand-green-100 bg-brand-paper/60 py-2.5 px-3.5 text-sm font-semibold text-brand-ink-soft" />
          </div>
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
              <AtSign className="h-3.5 w-3.5 text-brand-green" />
              Username
            </label>
            <input value={user.username ?? "-"} disabled className="w-full rounded-xl border border-brand-green-100 bg-brand-paper/60 py-2.5 px-3.5 text-sm font-semibold text-brand-ink-soft" />
          </div>
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">ชื่อ-นามสกุล</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink" />
          </div>
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-brand-green" />
              เบอร์โทร
            </label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink" />
          </div>
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">ชื่อร้านปัจจุบัน</label>
            <input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="ไม่มีข้อมูลร้าน" className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink" />
          </div>
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
              <span className="text-brand-green font-black">LINE</span>
              ไอดีไลน์ปัจจุบันที่ใช้เติม Coins
            </label>
            <input value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="ไม่มีไลน์เติมเงิน" className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink" />
          </div>
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-brand-gold" />
              Credit
            </label>
            <input type="number" min={0} value={credit} onChange={(e) => setCredit(e.target.value)} className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink" />
          </div>
          <div>
            <label className="block text-[12.5px] font-extrabold text-brand-ink mb-2">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {(["member", "agent", "admin"] as const).map((r) => {
                const Icon = ROLE_META[r].icon;
                const active = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-3 rounded-xl text-[12px] font-extrabold inline-flex flex-col items-center gap-1 transition cursor-pointer ${
                      active
                        ? "bg-brand-green text-white shadow-md shadow-brand-green/30"
                        : "bg-brand-paper border border-brand-green-100 text-brand-ink-soft hover:text-brand-green"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {ROLE_META[r].label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="flex gap-3 p-5 border-t border-brand-green-100/60 flex-shrink-0">
          <button onClick={onClose} disabled={saving} className="flex-1 py-3 rounded-xl font-extrabold text-sm border border-brand-coral/40 bg-brand-coral/10 text-brand-coral hover:bg-brand-coral/20 cursor-pointer disabled:opacity-60">
            ยกเลิก
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-brand-green to-brand-green-600 shadow-md shadow-brand-green/30 inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            บันทึก
          </button>
        </footer>
      </div>
    </div>
  );
}
