import React from "react";

import type { ManualJournalNewTaxState } from "./types";

interface ManualJournalNewTaxModalProps {
  formData: ManualJournalNewTaxState;
  onChange: (
    field: keyof ManualJournalNewTaxState,
    value: string | boolean,
  ) => void;
  onClose: () => void;
  onSave: () => void;
  open: boolean;
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "14px",
  color: "#111827",
  backgroundColor: "#ffffff",
};

export function ManualJournalNewTaxModal({
  formData,
  onChange,
  onClose,
  onSave,
  open,
}: ManualJournalNewTaxModalProps) {
  if (!open) {
    return null;
  }

  const canSave = Boolean(formData.name.trim() && formData.rate.trim());

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          borderRadius: "24px",
          backgroundColor: "#ffffff",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
          overflow: "hidden",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            borderBottom: "1px solid #e5e7eb",
            padding: "24px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#0f766e",
            }}
          >
            Taxes
          </div>
          <h2
            style={{
              margin: "8px 0 0",
              fontSize: "24px",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Create New Tax
          </h2>
        </div>

        <div style={{ display: "grid", gap: "18px", padding: "24px" }}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
              Tax Name
            </span>
            <input
              type="text"
              value={formData.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="VAT 16%"
              style={fieldStyle}
            />
          </label>

          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
              Rate (%)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={formData.rate}
              onChange={(event) => onChange("rate", event.target.value)}
              placeholder="0.00"
              style={fieldStyle}
            />
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "14px",
              color: "#374151",
            }}
          >
            <input
              type="checkbox"
              checked={formData.isCompound}
              onChange={(event) => onChange("isCompound", event.target.checked)}
            />
            Compound tax
          </label>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            borderTop: "1px solid #e5e7eb",
            padding: "20px 24px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              backgroundColor: "#ffffff",
              color: "#374151",
              cursor: "pointer",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            style={{
              border: "none",
              borderRadius: "12px",
              backgroundColor: canSave ? "#0f766e" : "#9ca3af",
              color: "#ffffff",
              cursor: canSave ? "pointer" : "not-allowed",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Save Tax
          </button>
        </div>
      </div>
    </div>
  );
}
