import type { MouseEvent as ReactMouseEvent } from "react";
import { ArrowUpDown, FileText, Search } from "lucide-react";

import { ACCENT_COLOR } from "./constants";
import { TableRowSkeleton } from "./TableRowSkeleton";
import type {
  InventoryAdjustmentColumn,
  InventoryAdjustmentRow,
} from "./types";
import {
  formatInventoryAdjustmentDate,
  formatInventoryAdjustmentDateTime,
  mapColumnSortField,
} from "./utils";

type InventoryAdjustmentsTableViewProps = {
  rows: InventoryAdjustmentRow[];
  allSelected: boolean;
  selectedItems: string[];
  visibleColumns: InventoryAdjustmentColumn[];
  onRowClick?: (row: InventoryAdjustmentRow) => void;
  onSelectAll?: (checked: boolean) => void;
  onSelectItem?: (id: string, checked: boolean) => void;
  onSort?: (field: string) => void;
  sortBy?: string;
  isLoading?: boolean;
  onOpenSearch: () => void;
  onStartResizing: (
    key: string,
    event: ReactMouseEvent<HTMLElement>,
  ) => void;
};

const isSortedColumn = (sortBy: string | undefined, key: string) =>
  sortBy === key ||
  (sortBy === "Created Time" && key === "createdTime") ||
  (sortBy === "Last Modified Time" && key === "lastModifiedTime");

export function InventoryAdjustmentsTableView({
  rows,
  allSelected,
  selectedItems,
  visibleColumns,
  onRowClick,
  onSelectAll,
  onSelectItem,
  onSort,
  sortBy,
  isLoading,
  onOpenSearch,
  onStartResizing,
}: InventoryAdjustmentsTableViewProps) {
  return (
    <div className="min-h-0 overflow-x-auto bg-white">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10 border-b border-gray-200 bg-[#f3f4f6]">
          <tr className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
            <th className="w-16 min-w-[64px] px-4 py-3">
              <div className="relative flex items-center gap-3">
                <div className="min-w-[8px]" />
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => onSelectAll?.(event.target.checked)}
                  style={{ accentColor: ACCENT_COLOR }}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 transition-all focus:ring-0"
                  onClick={(event) => event.stopPropagation()}
                />
              </div>
            </th>

            {visibleColumns.map((column) => (
              <th
                key={column.key}
                className="group/header relative cursor-pointer select-none px-4 py-3"
                style={{ width: column.width }}
                onClick={() => onSort?.(mapColumnSortField(column.key))}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-bold text-slate-900">
                      {column.label}
                    </span>
                    {isSortedColumn(sortBy, column.key) && (
                      <ArrowUpDown
                        size={10}
                        className="flex-shrink-0 text-[#156372] transition-colors"
                      />
                    )}
                  </div>
                </div>

                <div
                  className="absolute bottom-0 right-0 top-0 w-[2px] cursor-col-resize border-gray-100 hover:bg-[#156372]/50 group-hover/header:border-r"
                  onMouseDown={(event) => onStartResizing(column.key, event)}
                  onClick={(event) => event.stopPropagation()}
                />
              </th>
            ))}

            <th className="sticky right-0 w-12 border-l border-gray-100 bg-[#f3f4f6] px-4 py-3">
              <div className="flex items-center justify-center gap-2">
                <Search
                  size={14}
                  className="cursor-pointer text-gray-300 transition-colors hover:opacity-80"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenSearch();
                  }}
                />
              </div>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <TableRowSkeleton columns={visibleColumns} />
          ) : (
            rows.map((row) => {
              const isSelected = selectedItems.includes(row.id);

              return (
                <tr
                  key={row.id}
                  className="group cursor-pointer transition-all hover:bg-slate-50/60"
                  style={
                    isSelected
                      ? { backgroundColor: "rgba(21, 99, 114, 0.1)" }
                      : undefined
                  }
                  onClick={() => {
                    if (selectedItems.length === 0) {
                      onRowClick?.(row);
                    }
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="invisible min-w-[8px] group-hover:visible" />
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => {
                          event.stopPropagation();
                          onSelectItem?.(row.id, event.target.checked);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        style={{ accentColor: ACCENT_COLOR }}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 transition-all focus:ring-0"
                      />
                    </div>
                  </td>

                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className="truncate px-4 py-3 text-[13px]"
                      style={{ maxWidth: column.width }}
                    >
                      {column.key === "date" ? (
                        <span className="text-[13px] text-[#111827]">
                          {formatInventoryAdjustmentDate(row.date, row.rawDate)}
                        </span>
                      ) : column.key === "status" ? (
                        <span className="font-medium uppercase text-[#2563eb]">
                          {row.status || "DRAFT"}
                        </span>
                      ) : column.key === "description" ? (
                        row.description ? (
                          <button
                            type="button"
                            className="rounded p-1 text-gray-700 hover:bg-gray-100"
                            title={row.description}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <FileText size={15} />
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )
                      ) : column.key === "referenceNumber" ? (
                        <span className="font-medium text-[#156372]">
                          {row.adjustmentNumber || row.referenceNumber}
                        </span>
                      ) : column.key === "createdTime" ? (
                        <span className="whitespace-pre-line text-gray-900">
                          {formatInventoryAdjustmentDateTime(
                            row.createdTime,
                            row.rawCreatedAt,
                          )}
                        </span>
                      ) : column.key === "lastModifiedTime" ? (
                        <span className="whitespace-pre-line text-gray-900">
                          {formatInventoryAdjustmentDateTime(
                            row.lastModifiedTime,
                            row.rawUpdatedAt,
                          )}
                        </span>
                      ) : column.key === "type" ? (
                        <span className="text-gray-900">{row.type}</span>
                      ) : (
                        <span className="text-[13px] text-gray-900">
                          {row[column.key] || ""}
                        </span>
                      )}
                    </td>
                  ))}

                  <td className="sticky right-0 w-12 border-l border-gray-50 bg-white px-4 py-3" />
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
