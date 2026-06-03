import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { PublicDataProvider } from "@/lib/contexts/PublicDataContext";
import { cn } from "@/lib/utils";
import { getSiteMetadata } from "@/lib/server/site-metadata";

export const revalidate = 60;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata({
    titleSuffix: "Admin",
    defaultTitle: "TCLCOINSXORMOR",
    defaultDescription: "ORMOR administration dashboard",
  });
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={cn(
        "h-full antialiased font-sans",
        geistSans.variable,
        geistMono.variable,
        inter.variable
      )}
    >
      <body className="min-h-full bg-brand-paper text-brand-ink">
        <PublicDataProvider>
          {children}
          <Toaster />
        </PublicDataProvider>
      </body>
    </html>
  );
}
