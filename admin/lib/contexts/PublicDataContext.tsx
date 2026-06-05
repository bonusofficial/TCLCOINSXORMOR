"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { publicApi } from "@/lib/eden";

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

export interface PublicConfig {
  logo: string;
  title: string;
  description: string;
  keywords: string;
  agentLink: string;
  contactLine: string;
  phone: string;
  qrcodenormal: string;
  qrcodeagent: string;
  qrcodesupport: string;
  warningMessage: string;
  agentPrivileges: string;
  lineGroupNormal: string;
  lineGroupAgent: string;
  welcomeTitle: string;
  welcomeAgentDesc: string;
  welcomeMemberDesc: string;
  howItWorks: { title: string; desc: string }[];
  termsContent: string;
  privacyContent: string;
  reviewLink: string;
  announceEnabled: boolean;
  announceBanner: string;
  announceBadge: string;
  announceTitle: string;
  announceContent: string;
  marqueeText: string;
  footerDescription: string;
  footerLinks: { label: string; url: string }[];
  footerServices: { label: string; url: string }[];
  footerLineUrl: string;
  footerFacebook: string;
  footerCopyright: string;
  stats?: {
    activeQueues: number;
    totalBookings: number;
    totalCompleted: number;
    totalStock: number;
    totalUsers: number;
    successRate: number;
  };
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface PublicProduct {
  id: number;
  image: string;
  name: string;
  description: string;
  price: string;
  agentPrice: string;
  discountAmount: string;
  stockEnabled: boolean;
  stock: number;
  maxPerUserPerDay: number;
  saleDates: string[];
  timeSlots: TimeSlot[];
  discountEligibleUsernames: string[];
  note: string | null;
  /** จำนวนคิวจริง (booking ที่ไม่ถูกยกเลิก) — ใช้แสดง "คนเลือกอันนี้" */
  queueCount: number;
}

export interface PublicReview {
  id: number;
  avatar: string | null;
  name: string;
  detail: string | null;
  review: string;
  rating: number;
  timeValue: number;
  timeUnit: string;
  createdAt: string;
}

interface PublicDataValue {
  config: PublicConfig | null;
  products: PublicProduct[];
  reviews: PublicReview[];
  initialLoaded: boolean;
  loading: {
    config: boolean;
    products: boolean;
    reviews: boolean;
  };
  loaded: {
    config: boolean;
    products: boolean;
    reviews: boolean;
  };
  /** Refresh individual sections (เรียกได้หลัง admin บันทึก) */
  refresh: {
    config: () => Promise<void>;
    products: () => Promise<void>;
    reviews: () => Promise<void>;
    all: () => Promise<void>;
  };
  /** Load only when a section is actually used on the current route */
  ensure: {
    config: () => Promise<void>;
    products: () => Promise<void>;
    reviews: () => Promise<void>;
  };
}

const DEFAULT_CONFIG: PublicConfig = {
  logo: "",
  title: "TCLCOINSXORMOR",
  description: "",
  keywords: "",
  agentLink: "",
  contactLine: "",
  phone: "",
  qrcodenormal: "",
  qrcodeagent: "",
  qrcodesupport: "",
  warningMessage: "",
  agentPrivileges: "",
  lineGroupNormal: "",
  lineGroupAgent: "",
  welcomeTitle: "",
  welcomeAgentDesc: "",
  welcomeMemberDesc: "",
  howItWorks: [],
  termsContent: "",
  privacyContent: "",
  reviewLink: "",
  announceEnabled: false,
  announceBanner: "",
  announceBadge: "",
  announceTitle: "",
  announceContent: "",
  marqueeText: "",
  footerDescription: "",
  footerLinks: [],
  footerServices: [],
  footerLineUrl: "",
  footerFacebook: "",
  footerCopyright: "",
  stats: {
    activeQueues: 0,
    totalBookings: 0,
    totalCompleted: 0,
    totalStock: 0,
    totalUsers: 0,
    successRate: 100,
  },
};

const PublicDataContext = createContext<PublicDataValue | null>(null);

/* ─────────────────────────────────────────────
 * Provider — โหลดข้อมูลครั้งเดียวที่ root
 * ───────────────────────────────────────────── */

export function PublicDataProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadedConfig, setLoadedConfig] = useState(false);
  const [loadedProducts, setLoadedProducts] = useState(false);
  const [loadedReviews, setLoadedReviews] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const inFlightRef = useRef<{
    config?: Promise<void>;
    products?: Promise<void>;
    reviews?: Promise<void>;
  }>({});

  /* ── fetchers ── */
  const fetchConfig = useCallback(async (force = false) => {
    if (!force && loadedConfig) return;
    if (inFlightRef.current.config) return inFlightRef.current.config;

    const task = (async () => {
      setLoadingConfig(true);
      try {
        const { data, error } = await publicApi.config.api.v0.config.get();
        if (error || !data?.ok) {
          setConfig(DEFAULT_CONFIG);
          return;
        }
        setConfig(data.data as PublicConfig);
      } catch (err) {
        console.error("[PublicData] config failed:", err);
        setConfig(DEFAULT_CONFIG);
      } finally {
        setLoadedConfig(true);
        setLoadingConfig(false);
        inFlightRef.current.config = undefined;
      }
    })();

    inFlightRef.current.config = task;
    return task;
  }, [loadedConfig]);

  const fetchProducts = useCallback(async (force = false) => {
    if (!force && loadedProducts) return;
    if (inFlightRef.current.products) return inFlightRef.current.products;

    const task = (async () => {
      setLoadingProducts(true);
      try {
        const { data, error } = await publicApi.products.api.v0.products.get();
        if (error || !data?.ok) {
          setProducts([]);
          return;
        }
        // MariaDB JSON บางครั้ง Prisma คืนเป็น string — parse safely ทั้งสองทาง
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
        setProducts(
          (data.data as Record<string, unknown>[]).map((p) => ({
            id: p.id as number,
            image: (p.image as string) ?? "",
            name: (p.name as string) ?? "",
            description: (p.description as string) ?? "",
            price: (p.price as string) ?? "0",
            agentPrice: (p.agentPrice as string) ?? "0",
            discountAmount: (p.discountAmount as string) ?? "0",
            stockEnabled: (p.stockEnabled as boolean) ?? false,
            stock: (p.stock as number) ?? 0,
            maxPerUserPerDay: (p.maxPerUserPerDay as number) ?? 0,
            saleDates: toArray(p.saleDates)
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
              .filter((d): d is string => d !== null),
            timeSlots: toArray(p.timeSlots).filter(
              (s): s is TimeSlot =>
                !!s &&
                typeof s === "object" &&
                typeof (s as TimeSlot).start === "string" &&
                typeof (s as TimeSlot).end === "string"
            ),
            discountEligibleUsernames: toArray(
              p.discountEligibleUsernames
            ).filter((u): u is string => typeof u === "string"),
            note: (p.note as string | null) ?? null,
            queueCount: (p.queueCount as number) ?? 0,
          }))
        );
      } catch (err) {
        console.error("[PublicData] products failed:", err);
        setProducts([]);
      } finally {
        setLoadedProducts(true);
        setLoadingProducts(false);
        inFlightRef.current.products = undefined;
      }
    })();

    inFlightRef.current.products = task;
    return task;
  }, [loadedProducts]);

  const fetchReviews = useCallback(async (force = false) => {
    if (!force && loadedReviews) return;
    if (inFlightRef.current.reviews) return inFlightRef.current.reviews;

    const task = (async () => {
      setLoadingReviews(true);
      try {
        // ใช้ v0 public endpoint — คืนเฉพาะรีวิวที่แอดมินอนุมัติแล้ว
        const { data, error } = await publicApi.reviews.api.v0.reviews.get();
        if (error || !data?.ok) {
          setReviews([]);
          return;
        }
        setReviews(
          data.data.map((r) => ({
            id: r.id,
            avatar: r.avatar ?? null,
            name: r.name,
            detail: r.detail ?? null,
            review: r.review,
            rating: r.rating,
            timeValue: r.timeValue,
            timeUnit: r.timeUnit,
            createdAt: r.createdAt,
          }))
        );
      } catch (err) {
        console.error("[PublicData] reviews failed:", err);
        setReviews([]);
      } finally {
        setLoadedReviews(true);
        setLoadingReviews(false);
        inFlightRef.current.reviews = undefined;
      }
    })();

    inFlightRef.current.reviews = task;
    return task;
  }, [loadedReviews]);

  const ensureConfig = useCallback(() => fetchConfig(false), [fetchConfig]);
  const ensureProducts = useCallback(() => fetchProducts(false), [fetchProducts]);
  const ensureReviews = useCallback(() => fetchReviews(false), [fetchReviews]);

  const refreshConfig = useCallback(() => fetchConfig(true), [fetchConfig]);
  const refreshProducts = useCallback(() => fetchProducts(true), [fetchProducts]);
  const refreshReviews = useCallback(() => fetchReviews(true), [fetchReviews]);
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshConfig(), refreshProducts(), refreshReviews()]);
  }, [refreshConfig, refreshProducts, refreshReviews]);

  // โหลดเฉพาะ config ตอน mount; products/reviews จะ lazy-load เมื่อ hook นั้นถูกใช้จริง
  useEffect(() => {
    let mounted = true;
    const bootId = window.setTimeout(() => {
      ensureConfig().finally(() => {
        if (mounted) setInitialLoaded(true);
      });
    }, 0);
    return () => {
      mounted = false;
      window.clearTimeout(bootId);
    };
  }, [ensureConfig]);

  const value: PublicDataValue = useMemo(
    () => ({
      config,
      products,
      reviews,
      initialLoaded,
      loading: {
        config: loadingConfig,
        products: loadingProducts,
        reviews: loadingReviews,
      },
      loaded: {
        config: loadedConfig,
        products: loadedProducts,
        reviews: loadedReviews,
      },
      refresh: {
        config: refreshConfig,
        products: refreshProducts,
        reviews: refreshReviews,
        all: refreshAll,
      },
      ensure: {
        config: ensureConfig,
        products: ensureProducts,
        reviews: ensureReviews,
      },
    }),
    [
      config,
      products,
      reviews,
      initialLoaded,
      loadingConfig,
      loadingProducts,
      loadingReviews,
      loadedConfig,
      loadedProducts,
      loadedReviews,
      refreshConfig,
      refreshProducts,
      refreshReviews,
      refreshAll,
      ensureConfig,
      ensureProducts,
      ensureReviews,
    ]
  );

  return (
    <PublicDataContext.Provider value={value}>
      {children}
    </PublicDataContext.Provider>
  );
}

/* ─────────────────────────────────────────────
 * Hooks
 * ───────────────────────────────────────────── */

function useCtx(): PublicDataValue {
  const ctx = useContext(PublicDataContext);
  if (!ctx) {
    throw new Error(
      "[PublicData] hook called outside <PublicDataProvider>"
    );
  }
  return ctx;
}

/** ใช้กับ config (logo, warning, qr ฯลฯ) */
export function useConfig() {
  const ctx = useCtx();
  return {
    config: ctx.config ?? DEFAULT_CONFIG,
    loading: ctx.loading.config,
    refresh: ctx.refresh.config,
  };
}

/** ใช้กับ products (สินค้า) */
export function useProducts() {
  const ctx = useCtx();
  const ensureProducts = ctx.ensure.products;

  useEffect(() => {
    if (ctx.loaded.products) return;
    const id = window.setTimeout(() => {
      void ensureProducts();
    }, 0);
    return () => window.clearTimeout(id);
  }, [ctx.loaded.products, ensureProducts]);

  return {
    products: ctx.products,
    loading: ctx.loading.products || !ctx.loaded.products,
    refresh: ctx.refresh.products,
  };
}

/** ใช้กับ reviews */
export function useReviews() {
  const ctx = useCtx();
  const ensureReviews = ctx.ensure.reviews;

  useEffect(() => {
    if (ctx.loaded.reviews) return;
    const id = window.setTimeout(() => {
      void ensureReviews();
    }, 0);
    return () => window.clearTimeout(id);
  }, [ctx.loaded.reviews, ensureReviews]);

  return {
    reviews: ctx.reviews,
    loading: ctx.loading.reviews || !ctx.loaded.reviews,
    refresh: ctx.refresh.reviews,
  };
}

/** ใช้กับ loading screen รวมของทั้งเว็บ */
export function usePublicDataLoading() {
  const ctx = useCtx();
  return {
    initialLoaded: ctx.initialLoaded,
    initialLoading: !ctx.initialLoaded,
    loading: ctx.loading,
  };
}

/** Refresh ทั้งหมดพร้อมกัน — ใช้หลัง admin บันทึก */
export function useRefreshPublicData() {
  return useCtx().refresh.all;
}
