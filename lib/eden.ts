import { treaty } from "@elysiajs/eden";
import type { App as RootApp } from "@/app/api/[[...slugs]]/route";
import type { SettingNormalApp } from "@/app/api/v1/setting/normal/route";
import type { ProductsApp } from "@/app/api/v1/products/route";
import type { ProductsItemApp } from "@/app/api/v1/products/[id]/route";
import type { BannerApp } from "@/app/api/v1/setting/banner/route";
import type { BannerItemApp } from "@/app/api/v1/setting/banner/[id]/route";
import type { ReviewApp } from "@/app/api/v1/setting/review/route";
import type { ReviewItemApp } from "@/app/api/v1/setting/review/[id]/route";
import type { UsersApp } from "@/app/api/v1/users/route";
import type { UsersItemApp } from "@/app/api/v1/users/[id]/route";
import type { AuditApp } from "@/app/api/v1/audit/route";
import type { BookingsApp } from "@/app/api/v1/bookings/route";
import type { BookingsItemApp } from "@/app/api/v1/bookings/[id]/route";
import type { AccountsApp } from "@/app/api/v1/accounts/route";
import type { AccountsItemApp } from "@/app/api/v1/accounts/[id]/route";
import type { DashboardApp } from "@/app/api/v1/dashboard/route";
// ── Public v0 (สำหรับเว็บฝั่งผู้ใช้) ──
import type { ConfigPublicApp } from "@/app/api/v0/config/route";
import type { ProductsPublicApp } from "@/app/api/v0/products/route";
import type { BookingsPublicApp } from "@/app/api/v0/bookings/route";
import type { ReviewsPublicApp } from "@/app/api/v0/reviews/route";
import type { BannersPublicApp } from "@/app/api/v0/banners/route";

const configuredBaseURL = process.env.NEXT_PUBLIC_API_URL?.trim();
const baseURL = typeof window === "undefined" ? configuredBaseURL ?? "" : "";
const commonConfig = {
  keepDomain: baseURL === "",
  fetch: { credentials: "include" as RequestCredentials },
};

export const api = treaty<RootApp>(baseURL, commonConfig);

export const settingApi = {
  normal: treaty<SettingNormalApp>(baseURL, commonConfig),
  banner: {
    collection: treaty<BannerApp>(baseURL, commonConfig),
    item: treaty<BannerItemApp>(baseURL, commonConfig),
  },
  review: {
    collection: treaty<ReviewApp>(baseURL, commonConfig),
    item: treaty<ReviewItemApp>(baseURL, commonConfig),
  },
};

export const usersApi = {
  collection: treaty<UsersApp>(baseURL, commonConfig),
  item: treaty<UsersItemApp>(baseURL, commonConfig),
};

export const auditApi = treaty<AuditApp>(baseURL, commonConfig);

export const bookingsApi = {
  collection: treaty<BookingsApp>(baseURL, commonConfig),
  item: treaty<BookingsItemApp>(baseURL, commonConfig),
};

export const accountsApi = {
  collection: treaty<AccountsApp>(baseURL, commonConfig),
  item: treaty<AccountsItemApp>(baseURL, commonConfig),
};

/* ──────────────────────────────────────────────
 * Public v0 — สำหรับเว็บฝั่งผู้ใช้ (queue, hero ฯลฯ)
 * ────────────────────────────────────────────── */
export const publicApi = {
  config: treaty<ConfigPublicApp>(baseURL, commonConfig),
  products: treaty<ProductsPublicApp>(baseURL, commonConfig),
  bookings: treaty<BookingsPublicApp>(baseURL, commonConfig),
  reviews: treaty<ReviewsPublicApp>(baseURL, commonConfig),
  banners: treaty<BannersPublicApp>(baseURL, commonConfig),
};

export const productsApi = {
  collection: treaty<ProductsApp>(baseURL, commonConfig),
  item: treaty<ProductsItemApp>(baseURL, commonConfig),
};

export const dashboardApi = treaty<DashboardApp>(baseURL, commonConfig);
