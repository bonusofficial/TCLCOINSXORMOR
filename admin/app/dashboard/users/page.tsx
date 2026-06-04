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
  Hash,
  Image as ImageIcon,
  Store,
  MessageCircle,
  Download,
  Coins,
  CheckCircle,
  BarChart3,
  Users as UsersIcon,
} from "lucide-react";
import { usersApi } from "@/lib/eden";
import { timeAgo } from "@/lib/audit-labels";
import { formatDisplayID } from "@/lib/user-format";
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
  memberNo: number | null;
  name: string;
  email: string;
  username: string | null;
  displayUsername: string | null;
  image: string | null;
  role: string | null;
  phone: string | null;
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

  // Tabs — "list" รายชื่อผู้ใช้ · "summary" สรุปยอดตามบุคคล (เปิดจาก ?tab=summary)
  const [activeTab, setActiveTab] = useState<"list" | "summary">("list");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (t === "summary") setActiveTab("summary");
  }, []);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const resetListView = () => {
    setCurrentPage(1);
  };

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

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
        (u.displayUsername ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").includes(q) ||
        (u.shopName ?? "").toLowerCase().includes(q) ||
        (u.lineId ?? "").toLowerCase().includes(q) ||
        formatDisplayID(u.memberNo, u.id).toLowerCase().includes(q)
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
    const headers = ["UID", "ชื่อผู้ใช้", "อีเมล", "Username", "ชื่อที่แสดง", "ชื่อร้าน", "ไอดีไลน์เติม Coins", "บทบาท (Role)", "เบอร์โทรศัพท์", "ยืนยันอีเมล", "สมัครเมื่อ"];
    const rows = filtered.map(u => [
      formatDisplayID(u.memberNo, u.id),
      u.name,
      u.email,
      u.username || "—",
      u.displayUsername || "—",
      u.shopName || "—",
      u.lineId || "—",
      ROLE_META[normalizeRole(u.role)].label,
      u.phone || "—",
      u.emailVerified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน",
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

      {/* Tab switcher */}
      <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-1.5 mb-4 inline-flex gap-1">
        {([
          { key: "list", label: "รายชื่อผู้ใช้", icon: UsersIcon },
          { key: "summary", label: "สรุปยอดตามบุคคล", icon: BarChart3 },
        ] as const).map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-xl font-extrabold text-[13px] inline-flex items-center gap-1.5 transition cursor-pointer ${
                active
                  ? "bg-brand-green text-white shadow-md shadow-brand-green/30"
                  : "text-brand-ink-soft hover:text-brand-green hover:bg-brand-green-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "list" && (
        <>
      {/* Toolbar */}
      <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-3 mb-4 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-brand-ink-soft" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetListView();
            }}
            placeholder="ค้นหา ชื่อ/อีเมล/username/เบอร์..."
            className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 pl-9 pr-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60"
          />
        </div>
        <div className="flex gap-1.5 bg-brand-paper border border-brand-green-100 rounded-xl p-1">
          {(["all", "member", "agent", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRoleFilter(r);
                resetListView();
              }}
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
                  const displayUsername = u.displayUsername || u.username;
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
                              {displayUsername && (
                                <span className="text-[11px] text-brand-ink-soft font-bold">@{displayUsername}</span>
                              )}
                              <span className="text-[9.5px] bg-brand-green-50 text-brand-green border border-brand-green-100 rounded px-1 font-mono font-bold">
                                ID: {formatDisplayID(u.memberNo, u.id)}
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
              const displayUsername = u.displayUsername || u.username;
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
                      {displayUsername && (
                        <span className="text-[10.5px] text-brand-green font-extrabold">@{displayUsername}</span>
                      )}
                      <span className="text-[9px] bg-brand-green-50 text-brand-green border border-brand-green-100 rounded px-1 font-mono font-bold whitespace-nowrap">
                        ID: {formatDisplayID(u.memberNo, u.id)}
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
        </>
      )}

      {activeTab === "summary" && <UserSummaryTab />}

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

/* ── สรุปยอดตามบุคคล ── */

interface SummaryRow {
  userId: string;
  memberNo: number | null;
  name: string;
  username: string | null;
  role: string | null;
  image: string | null;
  totalBookings: number;
  successOrders: number;
  totalSpent: number;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(n)));

function rankBadge(rank: number) {
  if (rank === 1) return "bg-gradient-to-br from-brand-gold-light to-brand-gold-deep text-brand-ink";
  if (rank === 2) return "bg-gradient-to-br from-zinc-300 to-zinc-400 text-zinc-800";
  if (rank === 3) return "bg-gradient-to-br from-amber-600 to-amber-800 text-white";
  return "bg-brand-green-50 text-brand-ink-soft";
}

function UserSummaryTab() {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [month, setMonth] = useState(""); // "" = ทุกเดือน · "YYYY-MM" = เดือนที่เลือก

  const monthOptions = useMemo(() => {
    const THAI = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      return {
        value: `${d.getFullYear()}-${String(m + 1).padStart(2, "0")}`,
        label: `${THAI[m]} ${d.getFullYear() + 543}`,
      };
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await usersApi.summary.api.v1.users.summary.get({
      query: { month },
    });
    if (error) {
      const v = error.value as { message?: string } | undefined;
      toast.error(v?.message ?? "โหลดสรุปยอดไม่สำเร็จ");
      setLoading(false);
      return;
    }
    if (data.ok) setRows(data.data as SummaryRow[]);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (roleFilter !== "all" && normalizeRole(r.role) !== roleFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.username ?? "").toLowerCase().includes(q) ||
        formatDisplayID(r.memberNo, r.userId).toLowerCase().includes(q)
      );
    });
  }, [rows, search, roleFilter]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-brand-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="font-bold">กำลังโหลด...</span>
      </div>
    );
  }

  if (rows.length === 0 && !month) {
    return (
      <div className="bg-brand-surface border border-brand-green-100 rounded-2xl py-16 text-center text-brand-ink-soft text-sm font-bold">
        ยังไม่มีข้อมูลการจอง
      </div>
    );
  }

  const totalSpentAll = filtered.reduce((s, r) => s + r.totalSpent, 0);
  const totalSuccessAll = filtered.reduce((s, r) => s + r.successOrders, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar — filter เหมือนแท็บรายชื่อผู้ใช้ */}
      <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-3 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-brand-ink-soft" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหา ชื่อ/username/UID..."
            className="w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 pl-9 pr-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60"
          />
        </div>
        <div className="flex gap-1.5 bg-brand-paper border border-brand-green-100 rounded-xl p-1">
          {(["all", "member", "agent", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRoleFilter(r);
                setCurrentPage(1);
              }}
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
        {/* เลือกเดือน */}
        <select
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3 text-sm font-bold text-brand-ink outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 cursor-pointer"
        >
          <option value="">ทุกเดือน</option>
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-brand-green-100 bg-brand-paper text-brand-ink-soft hover:border-brand-green hover:text-brand-green transition cursor-pointer disabled:opacity-50 text-sm font-bold"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>รีเฟรช</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green flex-shrink-0">
            <UsersIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-extrabold text-brand-ink-soft">ผู้ใช้ที่มีการจอง</p>
            <p className="font-display font-black text-xl text-brand-ink">{rows.length}</p>
          </div>
        </div>
        <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green flex-shrink-0">
            <CheckCircle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-extrabold text-brand-ink-soft">รายการสำเร็จรวม</p>
            <p className="font-display font-black text-xl text-brand-green">{totalSuccessAll}</p>
          </div>
        </div>
        <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 flex-shrink-0">
            <Coins className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-extrabold text-brand-ink-soft">ยอดเงินรวม (สำเร็จ)</p>
            <p className="font-display font-black text-xl text-brand-ink">฿{fmtMoney(totalSpentAll)}</p>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-brand-surface border border-brand-green-100 rounded-2xl overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3 px-4 w-16 text-center">อันดับ</TableHead>
              <TableHead className="py-3 px-3">ผู้ใช้</TableHead>
              <TableHead className="py-3 px-3 text-center">Role</TableHead>
              <TableHead className="py-3 px-3 text-center">จำนวนการจอง</TableHead>
              <TableHead className="py-3 px-3 text-center">รายการสำเร็จ</TableHead>
              <TableHead className="py-3 px-4 text-right">ยอดเงิน (สำเร็จ)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((r, i) => {
              const rank = startIndex + i + 1;
              const meta = ROLE_META[normalizeRole(r.role)];
              const RoleIcon = meta.icon;
              return (
                <TableRow key={r.userId}>
                  <TableCell className="py-3 px-4 text-center">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-black text-[12px] ${rankBadge(rank)}`}>
                      {rank}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={r.image || fallbackAvatar(r.name)}
                        alt={r.name}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-green-100 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-extrabold text-[13px] text-brand-ink truncate">{r.name}</div>
                        <div className="text-[10.5px] font-bold text-brand-ink-soft truncate">
                          {r.username ? `@${r.username} · ` : ""}
                          {formatDisplayID(r.memberNo, r.userId)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${meta.bg} ${meta.text}`}>
                      <RoleIcon className="h-3 w-3" />
                      {meta.label}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-3 text-center font-black text-brand-ink">{r.totalBookings}</TableCell>
                  <TableCell className="py-3 px-3 text-center font-extrabold text-brand-green">{r.successOrders}</TableCell>
                  <TableCell className="py-3 px-4 text-right font-black text-brand-ink">฿{fmtMoney(r.totalSpent)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2.5">
        {paginated.map((r, i) => {
          const rank = startIndex + i + 1;
          const meta = ROLE_META[normalizeRole(r.role)];
          return (
            <div key={r.userId} className="bg-brand-surface border border-brand-green-100 rounded-2xl p-3 flex items-center gap-3">
              <span className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-black text-[13px] ${rankBadge(rank)}`}>{rank}</span>
              <img src={r.image || fallbackAvatar(r.name)} alt={r.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-green-100 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-[13px] text-brand-ink truncate">{r.name}</div>
                <div className="text-[10.5px] font-bold text-brand-ink-soft truncate">
                  {formatDisplayID(r.memberNo, r.userId)} · {meta.label}
                </div>
                <div className="flex gap-3 mt-1 text-[11px] font-bold">
                  <span className="text-brand-ink-soft">จอง <b className="text-brand-ink">{r.totalBookings}</b></span>
                  <span className="text-brand-ink-soft">สำเร็จ <b className="text-brand-green">{r.successOrders}</b></span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] font-bold text-brand-ink-soft">ยอด</div>
                <div className="font-black text-[13px] text-brand-ink">฿{fmtMoney(r.totalSpent)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-brand-surface border border-brand-green-100 rounded-2xl py-12 text-center text-brand-ink-soft text-sm font-bold">
          ไม่พบผู้ใช้ที่ตรงกับการค้นหา
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}

/* ── Edit modal ── */

const editLabelCls =
  "block text-[12.5px] font-extrabold text-brand-ink mb-2 inline-flex items-center gap-1.5";
const editInputCls =
  "w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 text-brand-ink placeholder:text-brand-ink-soft/60 disabled:bg-brand-paper/60 disabled:text-brand-ink-soft disabled:cursor-not-allowed";

function UserEditModal({
  user,
  onClose,
  onSaved,
}: {
  user: AppUser;
  onClose: () => void;
  onSaved: (u: AppUser) => void;
}) {
  const [memberNo, setMemberNo] = useState(user.memberNo?.toString() ?? "");
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username ?? "");
  const [displayUsername, setDisplayUsername] = useState(
    user.displayUsername ?? user.username ?? ""
  );
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState(user.image ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [shopName, setShopName] = useState(user.shopName ?? "");
  const [lineId, setLineId] = useState(user.lineId ?? "");
  const [emailVerified, setEmailVerified] = useState(user.emailVerified);
  const [role, setRole] = useState<UserRole>(normalizeRole(user.role));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;

    const nextMemberNoText = memberNo.trim();
    const nextMemberNo = nextMemberNoText ? Number(nextMemberNoText) : null;
    if (
      nextMemberNo !== null &&
      (!Number.isInteger(nextMemberNo) || nextMemberNo <= 0)
    ) {
      toast.warning("UID ต้องเป็นเลขจำนวนเต็มมากกว่า 0");
      return;
    }

    const nextEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      toast.warning("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    const nextUsername = username.trim();
    if (nextUsername && (nextUsername.length < 3 || nextUsername.length > 30)) {
      toast.warning("Username ต้องมี 3-30 ตัวอักษร");
      return;
    }

    const nextName = name.trim();
    if (!nextName) {
      toast.warning("ต้องระบุชื่อผู้ใช้");
      return;
    }

    setSaving(true);
    const tId = toast.loading("กำลังบันทึก...");
    try {
      const { data, error } = await usersApi.item.api.v1
        .users({ id: user.id })
        .patch({
          memberNo: nextMemberNo,
          email: nextEmail,
          username: nextUsername || null,
          displayUsername: displayUsername.trim() || nextUsername || null,
          name: nextName,
          image: image.trim() || null,
          phone: phone.trim() || null,
          emailVerified,
          role,
          shopName: shopName.trim() || null,
          lineId: lineId.trim() || null,
        });
      if (error) {
        const value = error.value as { message?: string } | undefined;
        toast.error("บันทึกไม่สำเร็จ", { id: tId, description: value?.message });
        return;
      }
      toast.success(data.message ?? "อัปเดตแล้ว", { id: tId });
      onSaved(data.data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-brand-surface-soft border border-brand-green-100 rounded-t-3xl sm:rounded-3xl shadow-2xl ring-1 ring-brand-green/20 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <header className="flex items-center justify-between p-5 border-b border-brand-green-100/60 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="font-display font-black text-lg text-brand-ink">แก้ไขผู้ใช้</h3>
            <p className="text-[11px] font-bold text-brand-ink-soft mt-0.5 truncate">
              {formatDisplayID(user.memberNo, user.id)} · {user.id}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-brand-surface border border-brand-green-100 flex items-center justify-center text-brand-ink-soft hover:text-brand-green cursor-pointer">
            <X className="h-4.5 w-4.5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          <div className="flex items-center gap-3 rounded-2xl border border-brand-green-100 bg-brand-surface p-3">
            <img
              src={image || fallbackAvatar(name || email)}
              alt={name || email}
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-green-100"
            />
            <div className="min-w-0">
              <div className="font-display font-black text-brand-ink truncate">
                {name || "ไม่มีชื่อ"}
              </div>
              <div className="text-[11px] font-bold text-brand-ink-soft truncate">
                {email || "ไม่มีอีเมล"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={editLabelCls}>
                <Hash className="h-3.5 w-3.5 text-brand-green" />
                UID / เลขสมาชิก
              </label>
              <input
                value={memberNo}
                onChange={(e) => setMemberNo(e.target.value)}
                inputMode="numeric"
                placeholder="เว้นว่างได้"
                className={editInputCls}
              />
            </div>

          <div>
              <label className={editLabelCls}>
              <Mail className="h-3.5 w-3.5 text-brand-green" />
              อีเมล
            </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={editInputCls}
              />
          </div>
          <div>
              <label className={editLabelCls}>
              <AtSign className="h-3.5 w-3.5 text-brand-green" />
              Username
            </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={30}
                autoComplete="username"
                placeholder="username สำหรับเข้าสู่ระบบ"
                className={editInputCls}
              />
          </div>
          <div>
              <label className={editLabelCls}>
                <AtSign className="h-3.5 w-3.5 text-brand-green" />
                ชื่อที่แสดง
              </label>
              <input
                value={displayUsername}
                onChange={(e) => setDisplayUsername(e.target.value)}
                maxLength={120}
                placeholder="ถ้าเว้นว่างจะใช้ username"
                className={editInputCls}
              />
          </div>
          <div>
              <label className={editLabelCls}>
                <UserIcon className="h-3.5 w-3.5 text-brand-green" />
                ชื่อผู้ใช้
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                className={editInputCls}
              />
            </div>
            <div>
              <label className={editLabelCls}>
                <ImageIcon className="h-3.5 w-3.5 text-brand-green" />
                รูปโปรไฟล์ URL
              </label>
              <input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
                className={editInputCls}
              />
            </div>
            <div>
              <label className={editLabelCls}>
              <Phone className="h-3.5 w-3.5 text-brand-green" />
              เบอร์โทร
            </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={30}
                className={editInputCls}
              />
          </div>
          <div>
              <label className={editLabelCls}>
                <Store className="h-3.5 w-3.5 text-brand-green" />
                ชื่อร้านปัจจุบัน
              </label>
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                maxLength={200}
                placeholder="ไม่มีข้อมูลร้าน"
                className={editInputCls}
              />
          </div>
          <div>
              <label className={editLabelCls}>
                <MessageCircle className="h-3.5 w-3.5 text-brand-green" />
              ไอดีไลน์ปัจจุบันที่ใช้เติม Coins
            </label>
              <input
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                maxLength={100}
                placeholder="ไม่มีไลน์เติมเงิน"
                className={editInputCls}
              />
            </div>

            <div>
              <label className={editLabelCls}>
                <CheckCircle className="h-3.5 w-3.5 text-brand-green" />
                สถานะยืนยันอีเมล
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-brand-green-100 bg-brand-paper px-3.5 py-2.5 cursor-pointer">
                <span className="text-sm font-extrabold text-brand-ink">
                  {emailVerified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}
                </span>
                <input
                  type="checkbox"
                  checked={emailVerified}
                  onChange={(e) => setEmailVerified(e.target.checked)}
                  className="h-4.5 w-4.5 accent-brand-green cursor-pointer"
                />
              </label>
            </div>
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
