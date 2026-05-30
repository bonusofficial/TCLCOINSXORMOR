import React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Safe checks
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  // Page numbers logic
  const getPageNumbers = () => {
    const range = 1 // number of buttons to show on either side of active
    const pages: (number | string)[] = []

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - range && i <= currentPage + range)
      ) {
        pages.push(i)
      } else if (
        i === currentPage - range - 1 ||
        i === currentPage + range + 1
      ) {
        pages.push("...")
      }
    }
    return pages.filter((v, idx, arr) => arr.indexOf(v) === idx)
  }

  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIdx = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-brand-surface border border-brand-green-100 rounded-2xl shadow-xs w-full mt-4 animate-in fade-in duration-200">
      {/* Information text */}
      <div className="text-xs font-bold text-brand-ink-soft/90 text-center sm:text-left">
        แสดง <span className="text-brand-green">{startIdx}</span> ถึง{" "}
        <span className="text-brand-green">{endIdx}</span> จากทั้งหมด{" "}
        <span className="text-brand-green">{totalItems.toLocaleString()}</span>{" "}
        รายการ
      </div>

      {/* Control Buttons & Selector */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Page size dropdown */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[11px] font-extrabold text-brand-ink-soft">
              แถวต่อหน้า:
            </span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-[11.5px] font-black rounded-lg border border-brand-green-100 bg-brand-paper py-1.5 px-2.5 outline-none focus:border-brand-green text-brand-ink cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Buttons list */}
        <div className="flex items-center gap-1 bg-brand-paper border border-brand-green-100 p-0.5 rounded-xl">
          {/* First page button */}
          <button
            onClick={() => onPageChange(1)}
            disabled={!canPrev}
            className="w-8 h-8 rounded-lg text-brand-ink-soft hover:text-brand-green hover:bg-brand-green-50/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-brand-ink-soft flex items-center justify-center transition cursor-pointer"
            aria-label="หน้าแรก"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Prev page button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canPrev}
            className="w-8 h-8 rounded-lg text-brand-ink-soft hover:text-brand-green hover:bg-brand-green-50/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-brand-ink-soft flex items-center justify-center transition cursor-pointer"
            aria-label="หน้าก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`dots-${idx}`}
                  className="w-8 h-8 text-xs font-extrabold text-brand-ink-soft/40 flex items-center justify-center select-none"
                >
                  ...
                </span>
              )
            }
            const pageNum = p as number
            const isActive = pageNum === currentPage
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                  isActive
                    ? "bg-brand-green text-white shadow-xs shadow-brand-green/20"
                    : "text-brand-ink-soft hover:text-brand-green hover:bg-brand-green-50/40"
                }`}
              >
                {pageNum}
              </button>
            )
          })}

          {/* Next page button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canNext}
            className="w-8 h-8 rounded-lg text-brand-ink-soft hover:text-brand-green hover:bg-brand-green-50/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-brand-ink-soft flex items-center justify-center transition cursor-pointer"
            aria-label="หน้าถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last page button */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={!canNext}
            className="w-8 h-8 rounded-lg text-brand-ink-soft hover:text-brand-green hover:bg-brand-green-50/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-brand-ink-soft flex items-center justify-center transition cursor-pointer"
            aria-label="หน้าสุดท้าย"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
