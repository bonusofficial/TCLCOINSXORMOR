"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  CircleX,
  Clock3,
  Loader2,
  RefreshCw,
  ScrollText,
  Filter,
  ChevronDown,
} from "lucide-react";
import { auditApi } from "@/lib/eden";
import {
  ACTION_LABEL,
  ENTITY_LABEL,
  actionColor,
  timeAgo,
} from "@/lib/audit-labels";

interface AuditLog {
  id: number;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  actorType: "user" | "admin" | "system";
  createdAt: string;
}

interface HttpAuditDetails {
  requestId?: string;
  durationMs?: number;
  occurredAt?: string;
  authRoute?: string;
  summary?: unknown;
  request?: {
    method?: string;
    path?: string;
    query?: unknown;
    body?: unknown;
    payload?: unknown;
    headers?: unknown;
  };
  response?: {
    status?: number;
    outcome?: string;
    body?: unknown;
    error?: unknown;
  };
}

function getHttpDetails(details: unknown): HttpAuditDetails | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const value = details as HttpAuditDetails;
  return value.request || value.response || value.requestId ? value : null;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function DetailJson({ value }: { value: unknown }) {
  return (
    <pre className="text-[10.5px] bg-brand-surface-soft text-brand-ink-soft p-3 rounded-lg overflow-x-auto font-mono border border-brand-green-100 max-h-80">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState<string>("");
  const [actorFilter, setActorFilter] = useState<
    "" | "user" | "admin" | "system"
  >("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true);
        setCursor(null);
      } else {
        setLoadingMore(true);
      }
      const { data, error } = await auditApi.api.v1.audit.get({
        query: {
          limit: 50,
          ...(cursor && !reset ? { cursor } : {}),
          ...(actionFilter ? { action: actionFilter } : {}),
          ...(entityFilter ? { entityType: entityFilter } : {}),
          ...(actorFilter ? { actorType: actorFilter } : {}),
        },
      });
      if (error) {
        const value = error.value as { message?: string } | undefined;
        toast.error(value?.message ?? `โหลดไม่สำเร็จ`);
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      if (data.ok) {
        const mapped: AuditLog[] = data.data.map((d) => ({
          id: d.id,
          userId: d.userId,
          userEmail: d.userEmail,
          userName: d.userName,
          action: d.action,
          entityType: d.entityType,
          entityId: d.entityId,
          details: d.details,
          ipAddress: d.ipAddress,
          userAgent: d.userAgent,
          actorType: d.actorType as AuditLog["actorType"],
          createdAt: d.createdAt,
        }));
        setItems((prev) => (reset ? mapped : [...prev, ...mapped]));
        setHasMore(data.nextCursor !== null);
        setCursor(data.nextCursor);
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [cursor, actionFilter, entityFilter, actorFilter]
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, entityFilter, actorFilter]);

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display font-black text-xl sm:text-2xl text-brand-ink inline-flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-brand-green" />
            บันทึกระบบ (Audit Logs)
          </h1>
          <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
            ติดตามทุก API response, action, error และการเข้าสู่ระบบ — เรียงใหม่สุดก่อน
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-brand-green-100 bg-brand-surface text-brand-ink-soft hover:border-brand-green hover:text-brand-green transition cursor-pointer disabled:opacity-50 text-sm font-bold self-start"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>รีเฟรช</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-brand-surface border border-brand-green-100 rounded-2xl p-3 mb-4 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <Filter className="hidden sm:block h-4 w-4 text-brand-ink-soft flex-shrink-0 ml-1" />
        <select
          value={actorFilter}
          onChange={(e) =>
            setActorFilter(
              e.target.value as "" | "user" | "admin" | "system"
            )
          }
          className="flex-1 rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green text-brand-ink cursor-pointer"
        >
          <option value="">ผู้กระทำทั้งหมด</option>
          <option value="user">ผู้ใช้</option>
          <option value="admin">แอดมิน</option>
          <option value="system">ระบบ</option>
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="flex-1 rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green text-brand-ink cursor-pointer"
        >
          <option value="">ทุก action</option>
          {Object.entries(ACTION_LABEL).map(([k, v]) => (
            <option key={k} value={k} className="bg-brand-surface text-brand-ink">
              {v}
            </option>
          ))}
        </select>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="flex-1 rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-brand-green text-brand-ink cursor-pointer"
        >
          <option value="">ทุก entity</option>
          {Object.entries(ENTITY_LABEL).map(([k, v]) => (
            <option key={k} value={k} className="bg-brand-surface text-brand-ink">
              {v}
            </option>
          ))}
        </select>
        {(actionFilter || entityFilter || actorFilter) && (
          <button
            onClick={() => {
              setActionFilter("");
              setEntityFilter("");
              setActorFilter("");
            }}
            className="px-3 py-2.5 rounded-xl text-[12px] font-extrabold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 cursor-pointer"
          >
            ล้างฟิลเตอร์
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-ink-soft">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="font-bold">กำลังโหลด...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-brand-surface border border-brand-green-100 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-green-50 flex items-center justify-center mb-3">
            <ScrollText className="h-7 w-7 text-brand-green" />
          </div>
          <p className="font-display font-black text-base text-brand-ink mb-1">
            ยังไม่มีบันทึกระบบ
          </p>
          <p className="text-xs text-brand-ink-soft font-bold">
            การกระทำของผู้ใช้ แอดมิน และระบบจะถูกบันทึกที่นี่อัตโนมัติ
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((log) => {
            const color = actionColor(log.action);
            const isExpanded = expandedId === log.id;
            const actionLabel = ACTION_LABEL[log.action] ?? log.action;
            const entityLabel = ENTITY_LABEL[log.entityType] ?? log.entityType;
            const actorLabel =
              log.actorType === "admin"
                ? "แอดมิน"
                : log.actorType === "user"
                  ? "ผู้ใช้"
                  : "ระบบ";
            const actorClass =
              log.actorType === "admin"
                ? "bg-sky-500/10 text-sky-600 ring-sky-500/20"
                : log.actorType === "user"
                  ? "bg-brand-green-50 text-brand-green ring-brand-green/20"
                  : "bg-slate-500/10 text-slate-500 ring-slate-500/20";
            const http = getHttpDetails(log.details);
            const method = http?.request?.method;
            const path = http?.request?.path ?? http?.authRoute;
            const status = http?.response?.status;
            const isError =
              http?.response?.outcome === "error" ||
              (typeof status === "number" && status >= 400);
            return (
              <div
                key={log.id}
                className="bg-brand-surface border border-brand-green-100 rounded-2xl overflow-hidden hover:border-brand-green transition"
              >
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : log.id)
                  }
                  className="w-full text-left p-3 sm:p-4 flex items-start gap-3 cursor-pointer"
                >
                  {/* action badge */}
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider py-1 px-2 rounded-md flex-shrink-0 ${color.bg} ${color.text} ring-1 ${color.ring}`}
                  >
                    {actionLabel}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-display font-extrabold text-[13px] text-brand-ink">
                        {log.userName || log.userEmail || "ระบบ"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9.5px] font-black ring-1 ${actorClass}`}
                      >
                        {actorLabel}
                      </span>
                      <span className="text-brand-ink-soft text-[11.5px] font-bold">
                        → {entityLabel}
                        {log.entityId && ` #${log.entityId}`}
                      </span>
                    </div>
                    {(method || path || status !== undefined) && (
                      <div className="flex items-center gap-1.5 flex-wrap my-1">
                        {method && (
                          <span className="rounded bg-brand-paper px-1.5 py-0.5 font-mono text-[10px] font-black text-brand-green ring-1 ring-brand-green-100">
                            {method}
                          </span>
                        )}
                        {path && (
                          <span className="max-w-full truncate font-mono text-[10.5px] font-bold text-brand-ink-soft">
                            {path}
                          </span>
                        )}
                        {status !== undefined && (
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-black ${
                              isError
                                ? "bg-rose-500/10 text-rose-500"
                                : "bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {isError ? (
                              <CircleX className="h-3 w-3" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            {status}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-[11px] text-brand-ink-soft/70 font-bold inline-flex items-center gap-2">
                      <span>{timeAgo(log.createdAt)}</span>
                      {http?.durationMs !== undefined && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            {http.durationMs} ms
                          </span>
                        </>
                      )}
                      {log.ipAddress && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{log.ipAddress}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-brand-ink-soft transition-transform flex-shrink-0 mt-0.5 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-brand-green-100/60 pt-3 bg-brand-paper/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <div className="text-brand-ink-soft/70 font-bold">วันเวลา</div>
                        <div className="text-brand-ink font-extrabold">
                          {formatDateTime(log.createdAt)}
                        </div>
                      </div>
                      <div>
                        <div className="text-brand-ink-soft/70 font-bold">Log ID</div>
                        <div className="text-brand-ink font-mono font-extrabold">
                          #{log.id}
                        </div>
                      </div>
                      <div>
                        <div className="text-brand-ink-soft/70 font-bold">
                          ประเภทผู้กระทำ
                        </div>
                        <div className="text-brand-ink font-extrabold">
                          {actorLabel}
                        </div>
                      </div>
                      {log.userEmail && (
                        <div>
                          <div className="text-brand-ink-soft/70 font-bold">Email</div>
                          <div className="text-brand-ink font-extrabold">{log.userEmail}</div>
                        </div>
                      )}
                      {log.userId && (
                        <div>
                          <div className="text-brand-ink-soft/70 font-bold">User ID</div>
                          <div className="text-brand-ink font-mono font-extrabold break-all">
                            {log.userId}
                          </div>
                        </div>
                      )}
                      {log.ipAddress && (
                        <div>
                          <div className="text-brand-ink-soft/70 font-bold">IP Address</div>
                          <div className="text-brand-ink font-mono font-extrabold">
                            {log.ipAddress}
                          </div>
                        </div>
                      )}
                      {http?.requestId && (
                        <div>
                          <div className="text-brand-ink-soft/70 font-bold">Request ID</div>
                          <div className="text-brand-ink font-mono font-extrabold break-all">
                            {http.requestId}
                          </div>
                        </div>
                      )}
                      {http?.durationMs !== undefined && (
                        <div>
                          <div className="text-brand-ink-soft/70 font-bold">ระยะเวลา</div>
                          <div className="text-brand-ink font-extrabold">
                            {http.durationMs} ms
                          </div>
                        </div>
                      )}
                      {log.userAgent && (
                        <div className="sm:col-span-2 lg:col-span-3">
                          <div className="text-brand-ink-soft/70 font-bold">User Agent</div>
                          <div className="text-brand-ink font-medium break-words">{log.userAgent}</div>
                        </div>
                      )}
                    </div>
                    {http ? (
                      <>
                        <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
                          <div>
                            <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] text-brand-ink-soft/70 font-bold">
                              <Activity className="h-3.5 w-3.5" />
                              Request
                            </div>
                            <DetailJson value={http.request ?? null} />
                          </div>
                          <div>
                            <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] text-brand-ink-soft/70 font-bold">
                              {isError ? (
                                <CircleX className="h-3.5 w-3.5 text-rose-500" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                              Response
                            </div>
                            <DetailJson value={http.response ?? null} />
                          </div>
                        </div>
                        {http.summary !== null &&
                          http.summary !== undefined && (
                            <div className="mt-3">
                              <div className="text-[11px] text-brand-ink-soft/70 font-bold mb-1">
                                Operation Summary
                              </div>
                              <DetailJson value={http.summary} />
                            </div>
                          )}
                      </>
                    ) : (
                      log.details !== null &&
                      log.details !== undefined && (
                        <div className="mt-3">
                          <div className="text-[11px] text-brand-ink-soft/70 font-bold mb-1">
                            Details
                          </div>
                          <DetailJson value={log.details} />
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => load(false)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-extrabold bg-brand-surface border border-brand-green-100 text-brand-ink-soft hover:border-brand-green hover:text-brand-green cursor-pointer disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                โหลดเพิ่ม
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
