"use client";

import React, { useMemo, useState } from "react";
import { TrendingUp, Tag, Loader2 } from "lucide-react";
import { useProducts } from "@/lib/contexts/PublicDataContext";
import { useSession } from "@/lib/auth-client";
import { UserRole } from "@/lib/booking";
import { PackageCard } from "@/components/PackageCard";

interface PackagesSectionProps {
  onSelectPackage: (productId: number) => void;
}

export default function PackagesSection({ onSelectPackage }: PackagesSectionProps) {
  const [activeTab, setActiveTab] = useState<"popular" | "recommended">("popular");
  
  const { products, loading } = useProducts();
  const { data: session } = useSession();
  
  const user = session?.user as any;
  const userRole: UserRole = (() => {
    const r = (user?.role ?? "").toLowerCase().trim();
    if (r === "admin" || r === "agent" || r === "member") return r as UserRole;
    return "member";
  })();
  const username = user?.username ?? null;

  // Split products into popular and recommended (just for UI tabs simulation since we don't have this in DB yet)
  const displayProducts = useMemo(() => {
    if (products.length === 0) return [];
    
    // Sort products by price ascending
    const sorted = [...products].sort((a, b) => Number(a.price) - Number(b.price));
    
    if (activeTab === "popular") {
      // First half or top 3
      return sorted.slice(0, Math.max(3, Math.ceil(sorted.length / 2)));
    } else {
      // Second half
      return sorted.slice(Math.max(3, Math.ceil(sorted.length / 2)));
    }
  }, [products, activeTab]);

  return (
    <section className="bg-gradient-to-b from-brand-paper to-brand-paper py-20" id="packages">
      <div className="max-w-[1240px] mx-auto px-7 w-full">

        {/* Section Header Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-11">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-brand-green-50 text-brand-green font-extrabold text-[12px] uppercase tracking-wider py-1.5 px-4.5 rounded-full">
              <TrendingUp className="h-3 w-3" strokeWidth={3} />
              ขายดีที่สุดในเดือนนี้
            </div>
            <h2 className="font-display font-black text-3xl md:text-[46px] leading-[1.08] tracking-tight text-brand-ink">
              สินค้า<em className="not-italic text-brand-green">ยอดนิยม</em>
            </h2>
            <p className="text-base leading-relaxed text-brand-ink-soft font-medium">
              จัดอันดับจากยอดจองจริงของลูกค้า — เลือกแพ็กเกจที่คนซื้อเยอะที่สุด มั่นใจได้ในความคุ้มค่า
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex bg-brand-surface border border-brand-green-100 p-1.5 rounded-full shadow-sm self-start">
            <button
              onClick={() => setActiveTab("popular")}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "popular"
                  ? "bg-gradient-to-r from-brand-green to-brand-green-600 text-white shadow-md shadow-brand-green/20"
                  : "text-brand-ink-soft hover:text-brand-green"
              }`}
            >
              ยอดนิยม
            </button>
            <button
              onClick={() => setActiveTab("recommended")}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "recommended"
                  ? "bg-gradient-to-r from-brand-green to-brand-green-600 text-white shadow-md shadow-brand-green/20"
                  : "text-brand-ink-soft hover:text-brand-green"
              }`}
            >
              สินค้าแนะนำ
            </button>
          </div>
        </div>

        {/* Packages Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-brand-ink-soft">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="font-bold">กำลังโหลด...</span>
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="bg-brand-surface border border-brand-green-100 rounded-3xl p-12 text-center">
            <Tag className="h-12 w-12 mx-auto text-brand-green mb-2" />
            <p className="font-display font-black text-base text-brand-ink mb-1">
              ไม่มีแพ็กเกจที่แสดงในหมวดหมู่นี้
            </p>
            <p className="text-xs text-brand-ink-soft font-bold">
              ลองเปลี่ยนหมวดหมู่หรือกลับมาดูใหม่ภายหลัง
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayProducts.map((p, i) => (
              <PackageCard
                key={p.id}
                idx={i + 1}
                product={p}
                userRole={userRole}
                username={username}
                onSelect={() => onSelectPackage(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
