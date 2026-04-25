// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { FileText, MoreVertical, Mail, Printer, X } from "lucide-react";

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
  selectedOrdersCount,
}) {
  const [showBulkActionMoreDropdown, setShowBulkActionMoreDropdown] = useState(false);
  const bulkActionDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        bulkActionDropdownRef.current &&
        !bulkActionDropdownRef.current.contains(event.target)
      ) {
        setShowBulkActionMoreDropdown(false);
      }
    };

    if (showBulkActionMoreDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBulkActionMoreDropdown]);

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
