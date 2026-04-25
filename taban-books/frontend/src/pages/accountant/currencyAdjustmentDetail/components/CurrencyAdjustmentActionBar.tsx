import React from "react";
import { ChevronDown, Edit, FileText } from "lucide-react";

import {
  CURRENCY_ADJUSTMENT_EXPORT_ACTIONS,
  type CurrencyAdjustmentExportAction,
} from "../../currencyAdjustmentConfig";
import { useDropdownMenu } from "../useDropdownMenu";

interface CurrencyAdjustmentActionBarProps {
  onDownloadPdf: () => void;
  onEdit: () => void;
  onPrint: () => void;
}

export function CurrencyAdjustmentActionBar({
  onDownloadPdf,
  onEdit,
  onPrint,
}: CurrencyAdjustmentActionBarProps) {
  const exportMenu = useDropdownMenu<HTMLDivElement>();

  const handleExportAction = (actionId: CurrencyAdjustmentExportAction) => {
    if (actionId === "download") {
      onDownloadPdf();
      exportMenu.setIsOpen(false);
      return;
    }

    onPrint();
    exportMenu.setIsOpen(false);
  };

  return (
    <div
      style={{
        padding: "12px 20px",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <button
        type="button"
        onClick={onEdit}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 16px",
          backgroundColor: "#f3f4f6",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: "500",
          color: "#111827",
          cursor: "pointer",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.backgroundColor = "#e5e7eb";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor = "#f3f4f6";
        }}
      >
        <Edit size={16} />
        Edit
      </button>

      <div ref={exportMenu.ref} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => exportMenu.setIsOpen((isOpen) => !isOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            backgroundColor: "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            color: "#111827",
            cursor: "pointer",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = "#e5e7eb";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = "#f3f4f6";
          }}
        >
          <FileText size={16} />
          PDF/Print
          <ChevronDown size={14} />
        </button>
        {exportMenu.isOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              zIndex: 1000,
              minWidth: "150px",
            }}
          >
            {CURRENCY_ADJUSTMENT_EXPORT_ACTIONS.map((action) => (
              <div
                key={action.id}
                onClick={() => handleExportAction(action.id)}
                style={{
                  padding: "8px 12px",
                  fontSize: "13px",
                  cursor: "pointer",
                  color: "#111827",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = "#f9fafb";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {action.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
