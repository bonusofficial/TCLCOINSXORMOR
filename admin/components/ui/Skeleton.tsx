import React from "react";

/** Skeleton placeholder — แถบ pulse สีอ่อน ใช้แทน content ที่กำลังโหลด */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-brand-green-100/40 ${className}`}
    />
  );
}
