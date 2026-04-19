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

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
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
    </div>
  );
}
