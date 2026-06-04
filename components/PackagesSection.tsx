"use client";

import React, { useMemo, useState } from "react";
import { TrendingUp, Tag } from "lucide-react";
import { useProducts } from "@/lib/contexts/PublicDataContext";
import { UserRole } from "@/lib/booking";
import { PackageCard } from "@/components/PackageCard";
import { getProductAvailability } from "@/lib/product-utils";
import { Skeleton } from "@/components/ui/Skeleton";

interface PackagesSectionProps {
  onSelectPackage: (productId: number) => void;
  userRole?: UserRole;
  username?: string | null;
}

export default function PackagesSection({
  onSelectPackage,
  userRole = "member",
  username = null,
}: PackagesSectionProps) {
  const [activeTab, setActiveTab] = useState<"popular" | "recommended">("popular");
  
  const { products, loading } = useProducts();

  // แสดงเฉพาะแพ็กที่เปิดจองอยู่จริง แล้วจัดอันดับจากยอดจองจริง
  // popular = อันดับ 1-3, recommended = อันดับ 4 เป็นต้นไป
  const displayProducts = useMemo(() => {
    if (products.length === 0) return [];

    const active = products.filter(
      (p) => getProductAvailability(p).status === "open"
    );

    const ranked = [...active]
      .sort((a, b) => {
        const queueDiff = b.queueCount - a.queueCount;
        if (queueDiff !== 0) return queueDiff;

        const priceDiff = Number(a.price) - Number(b.price);
        if (priceDiff !== 0) return priceDiff;

        return b.id - a.id;
      })
      .map((product, index) => ({
        product,
        rank: index + 1,
      }));

    if (activeTab === "popular") {
      return ranked.slice(0, 3);
    }

    return ranked.slice(3);
  }, [products, activeTab]);

  // คิวสูงสุดในบรรดาสินค้าทั้งหมด — ใช้ทำ % แถบความนิยมแบบสัมพัทธ์ในการ์ด
  const maxQueueCount = useMemo(
    () => products.reduce((m, p) => Math.max(m, p.queueCount), 0),
    [products]
  );

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-brand-surface border border-brand-green-100 rounded-3xl p-5"
              >
                <Skeleton className="h-44 w-full rounded-2xl mb-4" />
                <Skeleton className="h-5 w-2/3 mb-2.5" />
                <Skeleton className="h-3.5 w-1/2 mb-5" />
                <div className="flex items-center justify-between mb-5">
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
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
            {displayProducts.map(({ product, rank }) => (
              <PackageCard
                key={product.id}
                idx={rank}
                product={product}
                userRole={userRole}
                username={username}
                maxQueueCount={maxQueueCount}
                onSelect={() => onSelectPackage(product.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
