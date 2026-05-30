"use client";

import React, { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { DashboardTopBar } from "@/components/dashboard/TopBar";

/**
 * Client wrapper สำหรับ dashboard pages
 * - แยกออกมาเพื่อให้ layout.tsx เป็น Server Component (เช็ค session ฝั่ง server ได้)
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-paper flex font-sans text-brand-ink">
      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <DashboardSidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <DashboardTopBar onMenuOpen={() => setMobileNavOpen(true)} />
        {children}
      </div>
    </div>
  );
}
