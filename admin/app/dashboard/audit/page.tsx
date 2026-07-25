"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
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
  createdAt: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? String(value);
}

export default function AuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState<string>("");
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
          createdAt: d.createdAt,
        }));
        setItems((prev) => (reset ? mapped : [...prev, ...mapped]));
        setHasMore(data.nextCursor !== null);
        setCursor(data.nextCursor);
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [cursor, actionFilter, entityFilter]
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, entityFilter]);

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display font-black text-xl sm:text-2xl text-brand-ink inline-flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-brand-green" />
            บันทึกระบบ (Audit Logs)
          </h1>
          <p className="text-xs text-brand-ink-soft font-bold mt-0.5">
            ติดตามการกระทำของ admin และระบบ — เรียงใหม่สุดก่อน
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
        {(actionFilter || entityFilter) && (
          <button
            onClick={() => {
              setActionFilter("");
              setEntityFilter("");
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
            การกระทำของ admin จะถูกบันทึกที่นี่อัตโนมัติ
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((log) => {
            const color = actionColor(log.action);
            const isExpanded = expandedId === log.id;
            const actionLabel = ACTION_LABEL[log.action] ?? log.action;
            const entityLabel = ENTITY_LABEL[log.entityType] ?? log.entityType;
            const details = asRecord(log.details);
            const requestDetails = asRecord(details?.request);
            const responseDetails = asRecord(details?.response);
            const isStructured =
              requestDetails !== null || responseDetails !== null;
            const summary = isStructured ? details?.summary : log.details;
            const method =
              typeof requestDetails?.method === "string"
                ? requestDetails.method
                : null;
            const path =
              typeof requestDetails?.path === "string"
                ? requestDetails.path
                : null;
            const responseStatus =
              typeof responseDetails?.status === "number"
                ? responseDetails.status
                : null;
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
                      <span className="text-brand-ink-soft text-[11.5px] font-bold">
                        → {entityLabel}
                        {log.entityId && ` #${log.entityId}`}
                      </span>
                    </div>
                    <div className="text-[11px] text-brand-ink-soft/70 font-bold inline-flex items-center gap-2">
                      <span>{timeAgo(log.createdAt)}</span>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {log.userEmail && (
                        <div>
                          <div className="text-brand-ink-soft/70 font-bold">Email</div>
                          <div className="text-brand-ink font-extrabold">{log.userEmail}</div>
                        </div>
                      )}
                      {log.userAgent && (
                        <div className="sm:col-span-2">
                          <div className="text-brand-ink-soft/70 font-bold">User Agent</div>
                          <div className="text-brand-ink font-medium line-clamp-1">{log.userAgent}</div>
                        </div>
                      )}
                    </div>
                    {isStructured && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                        <section className="min-w-0 rounded-xl border border-sky-200 bg-sky-50/50 overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-sky-200 bg-sky-100/50">
                            <span className="text-[11px] font-black text-sky-700">
                              Request Payload
                            </span>
                            {method && (
                              <span className="text-[9px] font-black font-mono rounded bg-sky-600 text-white px-1.5 py-0.5">
                                {method}
                              </span>
                            )}
                            {path && (
                              <span className="text-[10px] font-mono text-sky-700 truncate">
                                {path}
                              </span>
                            )}
                          </div>
                          <div className="p-3 space-y-3">
                            {requestDetails?.query !== undefined &&
                              Object.keys(
                                asRecord(requestDetails.query) ?? {}
                              ).length > 0 && (
                                <div>
                                  <div className="text-[10px] font-extrabold text-sky-700/70 mb-1">
                                    Query
                                  </div>
                                  <pre className="text-[10.5px] bg-brand-surface text-brand-ink p-2.5 rounded-lg overflow-x-auto font-mono border border-sky-100">
                                    {formatJson(requestDetails.query)}
                                  </pre>
                                </div>
                              )}
                            <div>
                              <div className="text-[10px] font-extrabold text-sky-700/70 mb-1">
                                Body / Params
                              </div>
                              <pre className="text-[10.5px] bg-brand-surface text-brand-ink p-2.5 rounded-lg overflow-x-auto font-mono border border-sky-100">
                                {formatJson(requestDetails?.payload ?? null)}
                              </pre>
                            </div>
                          </div>
                        </section>

                        <section className="min-w-0 rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-200 bg-emerald-100/50">
                            <span className="text-[11px] font-black text-emerald-700">
                              Response
                            </span>
                            {responseStatus !== null && (
                              <span
                                className={`text-[9px] font-black font-mono rounded px-1.5 py-0.5 ${
                                  responseStatus >= 400
                                    ? "bg-rose-600 text-white"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                HTTP {responseStatus}
                              </span>
                            )}
                          </div>
                          <div className="p-3">
                            <div className="text-[10px] font-extrabold text-emerald-700/70 mb-1">
                              Response Body
                            </div>
                            <pre className="text-[10.5px] bg-brand-surface text-brand-ink p-2.5 rounded-lg overflow-x-auto font-mono border border-emerald-100">
                              {formatJson(responseDetails?.body ?? null)}
                            </pre>
                          </div>
                        </section>
                      </div>
                    )}
                    {summary !== null && summary !== undefined && (
                      <div className="mt-3">
                        <div className="text-[11px] text-brand-ink-soft/70 font-bold mb-1">
                          {isStructured ? "Operation Summary" : "Details"}
                        </div>
                        <pre className="text-[10.5px] bg-brand-surface-soft text-brand-ink-soft p-3 rounded-lg overflow-x-auto font-mono border border-brand-green-100">
                          {formatJson(summary)}
                        </pre>
                      </div>
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
