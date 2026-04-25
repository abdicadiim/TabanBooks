import { useEffect, useState } from "react";

import { InventoryAdjustmentsListView } from "./inventory-adjustments/InventoryAdjustmentsListView";
import { InventoryAdjustmentsSearchModal } from "./inventory-adjustments/InventoryAdjustmentsSearchModal";
import { InventoryAdjustmentsTableView } from "./inventory-adjustments/InventoryAdjustmentsTableView";
import { INVENTORY_VIEW_MODE_STORAGE_KEY } from "./inventory-adjustments/constants";
import type {
  InventoryAdjustmentsProps,
  InventoryAdjustmentsViewMode,
} from "./inventory-adjustments/types";
import { useInventoryAdjustmentColumns } from "./inventory-adjustments/useInventoryAdjustmentColumns";
import { useInventoryAdjustmentSearch } from "./inventory-adjustments/useInventoryAdjustmentSearch";

export default function InventoryAdjustments({
  rows,
  onRowClick,
  onCreateNew,
  selectedItems = [],
  onSelectAll,
  onSelectItem,
  onSort,
  sortBy,
  isLoading,
  currentTypeFilter = "All",
}: InventoryAdjustmentsProps) {
  const allSelected = rows.length > 0 && selectedItems.length === rows.length;
  const [viewMode] = useState<InventoryAdjustmentsViewMode>("table");
  const { visibleColumns, startResizing } = useInventoryAdjustmentColumns();
  const search = useInventoryAdjustmentSearch(currentTypeFilter);

  useEffect(() => {
    localStorage.setItem(INVENTORY_VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const isEmpty = !isLoading && rows.length === 0;

  return (
    <div className="min-h-full w-full overflow-visible bg-transparent">
      {isEmpty ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center bg-transparent">
          <h2 className="text-2xl font-medium text-gray-900">
            Keep Your Inventory Accurate
          </h2>
          <p className="mt-3 text-[13px] text-slate-500">
            Adjust your inventory to ensure accurate quantity and value.
          </p>
          <button
            type="button"
            onClick={() => onCreateNew?.()}
            className="mt-8 rounded-md px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(90deg, #3b82f6 0%, #4f86ff 100%)" }}
          >
            CREATE ADJUSTMENT
          </button>
        </div>
      ) : (
        <>
          {viewMode === "list" && (
            <InventoryAdjustmentsListView
              rows={rows}
              allSelected={allSelected}
              selectedItems={selectedItems}
              onRowClick={onRowClick}
              onSelectAll={onSelectAll}
              onSelectItem={onSelectItem}
              onSort={onSort}
              sortBy={sortBy}
              isLoading={isLoading}
              onOpenSearch={search.openSearchModal}
            />
          )}

          {viewMode === "table" && (
            <InventoryAdjustmentsTableView
              rows={rows}
              allSelected={allSelected}
              selectedItems={selectedItems}
              visibleColumns={visibleColumns}
              onRowClick={onRowClick}
              onSelectAll={onSelectAll}
              onSelectItem={onSelectItem}
              onSort={onSort}
              sortBy={sortBy}
              isLoading={isLoading}
              onOpenSearch={search.openSearchModal}
              onStartResizing={startResizing}
            />
          )}

          <InventoryAdjustmentsSearchModal
            open={search.searchModalOpen}
            searchFilter={search.searchFilter}
            searchForm={search.searchForm}
            dateFromPickerOpen={search.dateFromPickerOpen}
            dateToPickerOpen={search.dateToPickerOpen}
            dateFromCalendar={search.dateFromCalendar}
            dateToCalendar={search.dateToCalendar}
            dateFromPickerRef={search.dateFromPickerRef}
            dateToPickerRef={search.dateToPickerRef}
            onClose={search.closeSearchModal}
            onSearchFilterChange={search.setSearchFilter}
            onSearchFormChange={search.updateSearchForm}
            onToggleDatePicker={search.toggleDatePicker}
            onNavigateCalendar={search.navigateCalendar}
            onDateSelect={search.handleDateSelect}
            onCancel={search.cancelSearch}
            onSearch={search.submitSearch}
          />
        </>
      )}
    </div>
  );
}

