import type { RefObject } from "react";
import { X } from "lucide-react";

import {
  SEARCH_ADJUSTMENT_TYPE_OPTIONS,
  SEARCH_FILTER_OPTIONS,
  SEARCH_REASON_OPTIONS,
} from "./constants";
import { SearchDatePicker } from "./SearchDatePicker";
import type {
  CalendarMonthDirection,
  InventoryAdjustmentSearchForm,
} from "./types";

type DatePickerKey = "from" | "to";

type InventoryAdjustmentsSearchModalProps = {
  open: boolean;
  searchFilter: string;
  searchForm: InventoryAdjustmentSearchForm;
  dateFromPickerOpen: boolean;
  dateToPickerOpen: boolean;
  dateFromCalendar: Date;
  dateToCalendar: Date;
  dateFromPickerRef: RefObject<HTMLDivElement | null>;
  dateToPickerRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onSearchFilterChange: (value: string) => void;
  onSearchFormChange: (
    field: keyof InventoryAdjustmentSearchForm,
    value: string,
  ) => void;
  onToggleDatePicker: (picker: DatePickerKey) => void;
  onNavigateCalendar: (
    picker: DatePickerKey,
    direction: CalendarMonthDirection,
  ) => void;
  onDateSelect: (picker: DatePickerKey, date: Date) => void;
  onCancel: () => void;
  onSearch: () => void;
};

export function InventoryAdjustmentsSearchModal({
  open,
  searchFilter,
  searchForm,
  dateFromPickerOpen,
  dateToPickerOpen,
  dateFromCalendar,
  dateToCalendar,
  dateFromPickerRef,
  dateToPickerRef,
  onClose,
  onSearchFilterChange,
  onSearchFormChange,
  onToggleDatePicker,
  onNavigateCalendar,
  onDateSelect,
  onCancel,
  onSearch,
}: InventoryAdjustmentsSearchModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          width: "95%",
          maxWidth: "700px",
          maxHeight: "90vh",
          overflowY: "auto",
          margin: "16px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flex: 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", color: "#374151" }}>Search</span>
              <select
                style={{
                  padding: "4px 8px",
                  fontSize: "13px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  outline: "none",
                  backgroundColor: "#ffffff",
                }}
                value="Inventory Adjustments"
                readOnly
              >
                <option>Inventory Adjustments</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", color: "#374151" }}>Filter</span>
              <select
                style={{
                  padding: "4px 8px",
                  fontSize: "13px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  outline: "none",
                  backgroundColor: "#ffffff",
                }}
                value={searchFilter}
                onChange={(event) => onSearchFilterChange(event.target.value)}
              >
                {SEARCH_FILTER_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "4px",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "#f3f4f6";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <X size={20} strokeWidth={2} style={{ color: "#6b7280" }} />
          </button>
        </div>

        <div style={{ padding: "16px", paddingTop: "24px", paddingBottom: "24px" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}
            className="md:grid-cols-2"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Item Name
                </label>
                <input
                  type="text"
                  value={searchForm.itemName}
                  onChange={(event) =>
                    onSearchFormChange("itemName", event.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Reference#
                </label>
                <input
                  type="text"
                  value={searchForm.referenceNumber}
                  onChange={(event) =>
                    onSearchFormChange("referenceNumber", event.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "14px",
                    border: "1px solid #2563eb",
                    borderRadius: "6px",
                    outline: "none",
                    boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.1)",
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Reason
                </label>
                <select
                  value={searchForm.reason}
                  onChange={(event) =>
                    onSearchFormChange("reason", event.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    outline: "none",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <option value="">Select a reason</option>
                  {SEARCH_REASON_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Item Description
                </label>
                <input
                  type="text"
                  value={searchForm.itemDescription}
                  onChange={(event) =>
                    onSearchFormChange("itemDescription", event.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Adjustment Type
                </label>
                <select
                  value={searchForm.adjustmentType}
                  onChange={(event) =>
                    onSearchFormChange("adjustmentType", event.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    outline: "none",
                    backgroundColor: "#ffffff",
                  }}
                >
                  {SEARCH_ADJUSTMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Date Range
                </label>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <SearchDatePicker
                    value={searchForm.dateFrom}
                    open={dateFromPickerOpen}
                    pickerRef={dateFromPickerRef}
                    calendarMonth={dateFromCalendar}
                    onToggle={() => onToggleDatePicker("from")}
                    onNavigate={(direction) =>
                      onNavigateCalendar("from", direction)
                    }
                    onSelect={(date) => onDateSelect("from", date)}
                  />

                  <span style={{ color: "#6b7280", fontSize: "14px" }}>-</span>

                  <SearchDatePicker
                    value={searchForm.dateTo}
                    open={dateToPickerOpen}
                    pickerRef={dateToPickerRef}
                    calendarMonth={dateToCalendar}
                    onToggle={() => onToggleDatePicker("to")}
                    onNavigate={(direction) =>
                      onNavigateCalendar("to", direction)
                    }
                    onSelect={(date) => onDateSelect("to", date)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid #e5e7eb",
            }}
            className="sm:flex-row sm:justify-end"
          >
            <button
              onClick={onCancel}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "500",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
                color: "#374151",
                cursor: "pointer",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.borderColor = "#9ca3af";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.borderColor = "#d1d5db";
              }}
            >
              Cancel
            </button>

            <button
              onClick={onSearch}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "500",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#ef4444",
                color: "#ffffff",
                cursor: "pointer",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = "#dc2626";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = "#ef4444";
              }}
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
