"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { publicApi, settingApi } from "@/lib/eden";

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
  stats?: {
    activeQueues: number;
    totalCompleted: number;
    totalStock: number;
    totalUsers: number;
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
  saleDates: string[];
  timeSlots: TimeSlot[];
  discountEligibleUsernames: string[];
  note: string | null;
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
  loading: {
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
  stats: {
    activeQueues: 0,
    totalCompleted: 10000,
    totalStock: 0,
    totalUsers: 100,
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
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);

  /* ── fetchers ── */
  const fetchConfig = useCallback(async () => {
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
      setLoadingConfig(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
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
        }))
      );
    } catch (err) {
      console.error("[PublicData] products failed:", err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      // ใช้ v1 admin endpoint เพราะ reviews GET public อยู่แล้ว
      const { data, error } =
        await settingApi.review.collection.api.v1.setting.review.get();
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
      setLoadingReviews(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchConfig(), fetchProducts(), fetchReviews()]);
  }, [fetchConfig, fetchProducts, fetchReviews]);

  // โหลดครั้งเดียวที่ mount พร้อมตั้งเวลาโพลล์อัปเดตสถานะคิวแบบ Realtime ทุกๆ 10 วินาที
  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchConfig, 10_000);
    return () => clearInterval(id);
  }, [fetchAll, fetchConfig]);

  const value: PublicDataValue = useMemo(
    () => ({
      config,
      products,
      reviews,
      loading: {
        config: loadingConfig,
        products: loadingProducts,
        reviews: loadingReviews,
      },
      refresh: {
        config: fetchConfig,
        products: fetchProducts,
        reviews: fetchReviews,
        all: fetchAll,
      },
    }),
    [
      config,
      products,
      reviews,
      loadingConfig,
      loadingProducts,
      loadingReviews,
      fetchConfig,
      fetchProducts,
      fetchReviews,
      fetchAll,
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
  return {
    products: ctx.products,
    loading: ctx.loading.products,
    refresh: ctx.refresh.products,
  };
}

/** ใช้กับ reviews */
export function useReviews() {
  const ctx = useCtx();
  return {
    reviews: ctx.reviews,
    loading: ctx.loading.reviews,
    refresh: ctx.refresh.reviews,
  };
}

/** Refresh ทั้งหมดพร้อมกัน — ใช้หลัง admin บันทึก */
export function useRefreshPublicData() {
  return useCtx().refresh.all;
}
