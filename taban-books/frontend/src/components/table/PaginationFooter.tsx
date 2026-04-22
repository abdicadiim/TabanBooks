import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

type PaginationFooterProps = {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  pageSizeOptions?: number[];
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function PaginationFooter({
  totalItems,
  currentPage,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = "rows",
  onPageChange,
  onPageSizeChange,
  className = "",
}: PaginationFooterProps) {
  const safeTotalItems = Number.isFinite(Number(totalItems)) ? Math.max(0, Number(totalItems)) : 0;
  if (safeTotalItems < 10) return null;

  const safePageSize = Math.max(1, Number(pageSize) || 1);
  const safeCurrentPage = Math.max(1, Number(currentPage) || 1);
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / safePageSize));
  const safePage = clamp(safeCurrentPage, 1, totalPages);
  const start = safeTotalItems === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const end = safeTotalItems === 0 ? 0 : Math.min(safePage * safePageSize, safeTotalItems);
  const [pageInput, setPageInput] = useState(String(safePage));

  useEffect(() => {
    setPageInput(String(safePage));
  }, [safePage]);

  const normalizedPageSizeOptions = useMemo(
    () => Array.from(new Set(pageSizeOptions.filter((option) => Number(option) > 0))),
    [pageSizeOptions],
  );

  const commitPageInput = () => {
    const parsed = Number.parseInt(pageInput, 10);
    if (!Number.isFinite(parsed)) {
      setPageInput(String(safePage));
      return;
    }
    onPageChange(clamp(parsed, 1, totalPages));
  };

  // Modern UI Classes based on the provided image
  const actionEnabled = "text-[#006ADC] hover:opacity-80";
  const actionDisabled = "text-[#BFD1E5] cursor-not-allowed";
  const navItemBase = "flex items-center gap-1.5 transition-opacity duration-200";

  return (
    <div className={`bg-white px-6 py-4 border-t border-slate-100 ${className}`}>
      <div className="flex flex-row items-center justify-between font-sans">
        {/* Left Side: Page Size and Range Info */}
        <div className="flex items-center gap-8 text-[14px] text-[#667085]">
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap">Rows per page</span>
            <div className="relative">
              <select
                value={safePageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-9 w-[70px] appearance-none rounded-md border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-900 outline-none focus:border-[#006ADC]"
              >
                {normalizedPageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="whitespace-nowrap tabular-nums">
            {start}-{end} of {safeTotalItems} {itemLabel}
          </div>
        </div>

        {/* Right Side: Navigation Controls */}
        <div className="flex items-center gap-6 text-[14px]">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safePage === 1}
            className={`${safePage === 1 ? actionDisabled : actionEnabled}`}
          >
            <ChevronsLeft size={20} strokeWidth={1.5} />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage === 1}
            className={`${navItemBase} ${safePage === 1 ? actionDisabled : actionEnabled}`}
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
            <span className="font-medium">Previous</span>
          </button>

          {/* Page Input */}
          <div className="flex items-center gap-2 text-[#667085]">
            <input
              type="text"
              inputMode="numeric"
              value={pageInput}
              onChange={(e) => {
                const nextValue = e.target.value.replace(/[^\d]/g, "");
                setPageInput(nextValue);
              }}
              onBlur={commitPageInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitPageInput();
                }
              }}
              className="h-9 w-10 rounded border border-slate-300 bg-white text-center text-sm font-medium text-slate-900 outline-none focus:border-[#006ADC] focus:ring-1 focus:ring-[#006ADC]/10"
            />
            <span className="whitespace-nowrap">of {totalPages}</span>
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            className={`${navItemBase} ${safePage >= totalPages ? actionDisabled : actionEnabled}`}
          >
            <span className="font-medium">Next</span>
            <ChevronRight size={20} strokeWidth={1.5} />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safePage >= totalPages}
            className={`${safePage >= totalPages ? actionDisabled : actionEnabled}`}
          >
            <ChevronsRight size={20} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
