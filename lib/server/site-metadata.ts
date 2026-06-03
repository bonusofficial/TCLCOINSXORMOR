import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

type SiteMetadataConfig = {
  title: string | null;
  description: string | null;
  keywords: string | null;
  logo: string | null;
  announceBanner: string | null;
};

type SiteMetadataOptions = {
  baseUrl?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  titleSuffix?: string;
};

const DEFAULT_TITLE = "TCLCOINSXORMOR";
const DEFAULT_DESCRIPTION =
  "TCLCOINSXORMOR Top-up Coins เติมเหรียญไลน์รวดเร็ว ปลอดภัย เหรียญแท้ 100%";
const DEFAULT_ICON = "/favicon.ico";
const DEFAULT_IMAGE = "/logo.png";

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function splitKeywords(value: string | null | undefined) {
  return cleanText(value)
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function normalizeBaseUrl(value: string | undefined) {
  const raw = cleanText(value).replace(/\/+$/, "");
  if (!raw) return undefined;

  try {
    return new URL(raw);
  } catch {
    return undefined;
  }
}

function resolveBaseUrl(baseUrl?: string) {
  return (
    normalizeBaseUrl(baseUrl) ??
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeBaseUrl(process.env.BETTER_AUTH_URL)
  );
}

function resolvePublicUrl(value: string | null | undefined, baseUrl?: URL) {
  const raw = cleanText(value);
  if (!raw) return "";

  try {
    return new URL(raw).toString();
  } catch {
    const publicPath = raw.startsWith("/") ? raw : `/${raw}`;
    return baseUrl ? new URL(publicPath, baseUrl).toString() : publicPath;
  }
}

async function getLatestConfig() {
  try {
    return await prisma.config.findFirst({
      orderBy: { id: "desc" },
      select: {
        title: true,
        description: true,
        keywords: true,
        logo: true,
        announceBanner: true,
      },
    });
  } catch (error) {
    console.error("Failed to load site metadata config:", error);
    return null;
  }
}

export async function getSiteMetadata(
  options: SiteMetadataOptions = {}
): Promise<Metadata> {
  const config: SiteMetadataConfig | null = await getLatestConfig();
  const metadataBase = resolveBaseUrl(options.baseUrl);
  const siteTitle =
    cleanText(config?.title) || options.defaultTitle || DEFAULT_TITLE;
  const titleSuffix = cleanText(options.titleSuffix);
  const title = titleSuffix ? `${siteTitle} - ${titleSuffix}` : siteTitle;
  const description =
    cleanText(config?.description) ||
    options.defaultDescription ||
    DEFAULT_DESCRIPTION;
  const keywords = splitKeywords(config?.keywords);
  const icon = resolvePublicUrl(config?.logo || DEFAULT_ICON, metadataBase);
  const image = resolvePublicUrl(
    config?.announceBanner || config?.logo || DEFAULT_IMAGE,
    metadataBase
  );

  return {
    ...(metadataBase ? { metadataBase } : {}),
    title,
    description,
    ...(keywords.length > 0 ? { keywords } : {}),
    icons: {
      icon,
    },
    openGraph: {
      title,
      description,
      siteName: siteTitle,
      type: "website",
      ...(metadataBase ? { url: metadataBase.toString() } : {}),
      ...(image ? { images: [{ url: image, alt: siteTitle }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
