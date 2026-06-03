import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { PublicDataProvider } from "@/lib/contexts/PublicDataContext";
import ConditionalFooter from "@/components/ConditionalFooter";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  let title = "TCLCOINSXORMOR — ระบบเติมเหรียญไลน์";
  let description = "TCLCOINSXORMOR Top-up Coins · เติมเหรียญไลน์รวดเร็ว ปลอดภัย เหรียญแท้ 100%";
  let keywords = "";
  let icon = "/favicon.ico";

  try {
    const config = await prisma.config.findFirst();
    if (config) {
      if (config.title) title = config.title;
      if (config.description) description = config.description;
      if (config.keywords) keywords = config.keywords;
      if (config.logo) icon = config.logo;
    }
  } catch (error) {
    console.error("Failed to load metadata config:", error);
  }

  return {
    title,
    description,
    keywords,
    icons: {
      icon,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <PublicDataProvider>
          {children}
          <ConditionalFooter />
          <Toaster />
        </PublicDataProvider>
      </body>
    </html>
  );
}
