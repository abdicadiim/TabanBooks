// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { Check, FileText, Filter, MoreVertical, Mail, Printer, X } from "lucide-react";
import { PURCHASE_ORDER_FILTER_OPTIONS } from "./PurchaseOrders.constants";

export default function PurchaseOrdersSelectionBar({
  onBulkCancelItems,
  onBulkUpdate,
  onClearSelection,
  onConvertToBill,
  onDeleteSelected,
  onEmail,
  onExportPdf,
  onMarkAsIssued,
  onMarkAsReceived,
  onMarkAsUnreceived,
  onReopenCancelled,
  onPrint,
  onViewSelect,
  selectedOrdersCount,
}) {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState("");
  const [selectedFilterType, setSelectedFilterType] = useState("All");
  const [showBulkActionMoreDropdown, setShowBulkActionMoreDropdown] = useState(false);
  const filterModalRef = useRef(null);
  const bulkActionDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterModalRef.current && !filterModalRef.current.contains(event.target)) {
        setShowFilterModal(false);
      }

      if (
        bulkActionDropdownRef.current &&
        !bulkActionDropdownRef.current.contains(event.target)
      ) {
        setShowBulkActionMoreDropdown(false);
      }
    };

    if (showFilterModal || showBulkActionMoreDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBulkActionMoreDropdown, showFilterModal]);

  const filteredOptions = PURCHASE_ORDER_FILTER_OPTIONS.filter((option) =>
    option.toLowerCase().includes(filterSearchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        padding: "12px 24px",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div style={{ position: "relative" }} ref={filterModalRef}>
          <button
            onClick={() => setShowFilterModal((current) => !current)}
            style={{
              padding: "6px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#ffffff",
              backgroundColor: "#fbbf24",
              border: "1px solid #f59e0b",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "#f59e0b";
              event.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "#fbbf24";
              event.currentTarget.style.transform = "scale(1)";
            }}
            title="Filter"
          >
            <Filter size={16} style={{ color: "#ffffff" }} />
          </button>

          {showFilterModal && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "8px",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                zIndex: 1000,
                minWidth: "300px",
                maxHeight: "400px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "12px",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#f9fafb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                  }}
                >
                  <Filter size={16} style={{ color: "#6b7280" }} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={filterSearchQuery}
                    onChange={(event) => setFilterSearchQuery(event.target.value)}
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      fontSize: "14px",
                      backgroundColor: "transparent",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "8px 0",
                }}
              >
                {filteredOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSelectedFilterType(option);
                      setShowFilterModal(false);
                      setFilterSearchQuery("");

                      if (option === "All") {
                        onViewSelect("All");
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      fontSize: "14px",
                      textAlign: "left",
                      backgroundColor:
                        selectedFilterType === option ? "#eff6ff" : "transparent",
                      color: selectedFilterType === option ? "#156372" : "#374151",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      borderLeft:
                        selectedFilterType === option
                          ? "3px solid #156372"
                          : "3px solid transparent",
                    }}
                    onMouseEnter={(event) => {
                      if (selectedFilterType !== option) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (selectedFilterType !== option) {
                        event.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {selectedFilterType === option && (
                      <Check size={16} style={{ color: "#156372" }} />
                    )}
                    <span>{option}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onBulkUpdate}
          style={actionButtonStyle}
          onMouseEnter={setHoverBackground("#f9fafb")}
          onMouseLeave={setHoverBackground("#ffffff")}
        >
          Bulk Update
        </button>

        <button
          onClick={onExportPdf}
          style={iconActionButtonStyle}
          onMouseEnter={setHoverBackground("#f9fafb")}
          onMouseLeave={setHoverBackground("#ffffff")}
          title="Export as PDF"
        >
          <FileText size={16} />
        </button>

        <button
          onClick={onPrint}
          style={iconActionButtonStyle}
          onMouseEnter={setHoverBackground("#f9fafb")}
          onMouseLeave={setHoverBackground("#ffffff")}
          title="Print"
        >
          <Printer size={16} />
        </button>

        <button
          onClick={onEmail}
          style={iconActionButtonStyle}
          onMouseEnter={setHoverBackground("#f9fafb")}
          onMouseLeave={setHoverBackground("#ffffff")}
          title="Email"
        >
          <Mail size={16} />
        </button>

        <button
          onClick={onConvertToBill}
          style={actionButtonStyle}
          onMouseEnter={setHoverBackground("#f9fafb")}
          onMouseLeave={setHoverBackground("#ffffff")}
        >
          Convert to Bill
        </button>

        <button
          onClick={onMarkAsIssued}
          style={actionButtonStyle}
          onMouseEnter={setHoverBackground("#f9fafb")}
          onMouseLeave={setHoverBackground("#ffffff")}
        >
          Mark as Issued
        </button>

        <button
          onClick={onMarkAsReceived}
          style={actionButtonStyle}
          onMouseEnter={setHoverBackground("#f9fafb")}
          onMouseLeave={setHoverBackground("#ffffff")}
        >
          Mark as Received
        </button>

        <button
          onClick={onMarkAsUnreceived}
          style={actionButtonStyle}
          onMouseEnter={setHoverBackground("#f9fafb")}
          onMouseLeave={setHoverBackground("#ffffff")}
        >
          Mark as Unreceived
        </button>

        <div style={{ position: "relative" }} ref={bulkActionDropdownRef}>
          <button
            onClick={() => setShowBulkActionMoreDropdown((current) => !current)}
            style={iconActionButtonStyle}
            onMouseEnter={setHoverBackground("#f9fafb")}
            onMouseLeave={setHoverBackground("#ffffff")}
            title="More"
          >
            <MoreVertical size={16} />
          </button>

          {showBulkActionMoreDropdown && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "4px",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                zIndex: 1000,
                minWidth: "200px",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                onClick={() => {
                  onBulkCancelItems();
                  setShowBulkActionMoreDropdown(false);
                }}
                style={dropdownActionButtonStyle}
                onMouseEnter={setHoverBackground("#f9fafb")}
                onMouseLeave={setHoverBackground("transparent")}
              >
                Bulk Cancel Items
              </button>

              <button
                onClick={async () => {
                  try {
                    await onReopenCancelled();
                  } finally {
                    setShowBulkActionMoreDropdown(false);
                  }
                }}
                style={dropdownActionButtonStyle}
                onMouseEnter={setHoverBackground("#f9fafb")}
                onMouseLeave={setHoverBackground("transparent")}
              >
                Bulk reopen canceled items
              </button>

              <button
                onClick={() => {
                  onDeleteSelected();
                  setShowBulkActionMoreDropdown(false);
                }}
                style={{
                  ...dropdownActionButtonStyle,
                  borderBottom: "none",
                }}
                onMouseEnter={setHoverBackground("#f9fafb")}
                onMouseLeave={setHoverBackground("transparent")}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            backgroundColor: "#dbeafe",
            color: "#156372",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          {selectedOrdersCount}
        </div>

        <span
          style={{
            fontSize: "14px",
            color: "#374151",
            fontWeight: "500",
          }}
        >
          Selected
        </span>

        <button
          onClick={onClearSelection}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 8px",
            fontSize: "14px",
            color: "#374151",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = "#e5e7eb";
            event.currentTarget.style.borderRadius = "4px";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <span>Esc</span>
          <X size={16} style={{ color: "#156372" }} />
        </button>
      </div>
    </div>
  );
}

const actionButtonStyle = {
  padding: "6px 12px",
  fontSize: "14px",
  fontWeight: "500",
  color: "#374151",
  backgroundColor: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const iconActionButtonStyle = {
  ...actionButtonStyle,
  padding: "6px",
  justifyContent: "center",
  width: "32px",
  height: "32px",
};

const dropdownActionButtonStyle = {
  padding: "8px 12px",
  fontSize: "14px",
  textAlign: "left",
  color: "#374151",
  backgroundColor: "transparent",
  border: "none",
  cursor: "pointer",
  borderBottom: "1px solid #e5e7eb",
};

const setHoverBackground =
  (backgroundColor: string) =>
  (event) => {
    event.currentTarget.style.backgroundColor = backgroundColor;
  };
