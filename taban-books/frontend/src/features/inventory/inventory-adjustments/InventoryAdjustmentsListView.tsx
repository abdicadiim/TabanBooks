import { ArrowUpDown, Search } from "lucide-react";

import { ACCENT_COLOR } from "./constants";
import type { InventoryAdjustmentRow } from "./types";

type InventoryAdjustmentsListViewProps = {
  rows: InventoryAdjustmentRow[];
  allSelected: boolean;
  selectedItems: string[];
  onRowClick?: (row: InventoryAdjustmentRow) => void;
  onSelectAll?: (checked: boolean) => void;
  onSelectItem?: (id: string, checked: boolean) => void;
  onSort?: (field: string) => void;
  sortBy?: string;
  isLoading?: boolean;
  onOpenSearch: () => void;
};

export function InventoryAdjustmentsListView({
  rows,
  allSelected,
  selectedItems,
  onRowClick,
  onSelectAll,
  onSelectItem,
  onSort,
  sortBy,
  isLoading,
  onOpenSearch,
}: InventoryAdjustmentsListViewProps) {
  return (
    <div className="flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/30 px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(event) => onSelectAll?.(event.target.checked)}
              style={{ accentColor: ACCENT_COLOR }}
              className="h-4 w-4 cursor-pointer rounded border-gray-300"
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Select All
            </span>
          </div>

          <div
            className="group flex cursor-pointer items-center gap-1"
            onClick={() => onSort?.("date")}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-[#156372]">
              Date
            </span>
            {sortBy === "date" && (
              <ArrowUpDown size={10} className="text-[#156372]" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpenSearch();
            }}
            className="cursor-pointer rounded border border-gray-200 bg-white p-1.5 text-gray-400 shadow-sm transition-colors hover:text-[#156372]"
            title="Search"
          >
            <Search size={14} />
          </button>
        </div>
      </div>

      {isLoading ? (
        Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`mob-skel-${index}`}
            className="animate-pulse border-b border-gray-100 p-4"
          >
            <div className="flex items-start gap-4">
              <div className="h-4 w-4 rounded bg-gray-100 pt-1" />
              <div className="flex-1">
                <div className="mb-2 flex items-start justify-between">
                  <div className="h-4 w-32 rounded bg-gray-100" />
                  <div className="h-3 w-16 rounded bg-gray-50" />
                </div>
                <div className="mb-2 h-4 w-48 rounded bg-gray-100" />
                <div className="h-3 w-20 rounded bg-gray-50" />
              </div>
            </div>
          </div>
        ))
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">
          No adjustments found
        </div>
      ) : (
        rows.map((row) => {
          const isSelected = selectedItems.includes(row.id);

          return (
            <div
              key={row.id}
              onClick={() => {
                if (selectedItems.length === 0) {
                  onRowClick?.(row);
                }
              }}
              className={`cursor-pointer border-b border-gray-100 p-3 px-4 transition-colors ${
                isSelected ? "bg-[#156372]/5" : "bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) => {
                      event.stopPropagation();
                      onSelectItem?.(row.id, event.target.checked);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className="h-4 w-4 rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                    style={{ accentColor: ACCENT_COLOR }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-start justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-[#156372]">
                      {row.adjustmentNumber || row.referenceNumber}
                    </span>
                    <span className="whitespace-nowrap text-[11px] text-gray-500">
                      {row.date}
                    </span>
                  </div>

                  <div className="mb-1 truncate text-[13px] text-gray-700">
                    {row.reason}
                  </div>

                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#156372]">
                    {row.status}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
