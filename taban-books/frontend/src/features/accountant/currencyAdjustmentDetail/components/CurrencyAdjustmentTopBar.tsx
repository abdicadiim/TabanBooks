import React from "react";
import { ChevronRight, MessageSquare, Paperclip, X } from "lucide-react";

interface CurrencyAdjustmentTopBarProps {
  adjustmentNumber: number | null;
  attachmentCount: number;
  onBack: () => void;
  onClose: () => void;
}

export function CurrencyAdjustmentTopBar({
  adjustmentNumber,
  attachmentCount,
  onBack,
  onClose,
}: CurrencyAdjustmentTopBarProps) {
  return (
    <div
      style={{
        backgroundColor: "#6366f1",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: "white",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronRight size={18} />
        </button>
        <span style={{ fontSize: "14px" }}>All Currency Adjustments</span>
      </div>
      <div style={{ fontSize: "16px", fontWeight: "600" }}>
        {adjustmentNumber ? adjustmentNumber : ""}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}
        >
          <Paperclip size={16} />
          <span>{attachmentCount}</span>
        </div>
        <button
          type="button"
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <MessageSquare size={18} />
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
