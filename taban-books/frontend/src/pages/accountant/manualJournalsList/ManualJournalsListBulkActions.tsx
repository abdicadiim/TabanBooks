import React from "react";
import { X } from "lucide-react";

interface ManualJournalsListBulkActionsProps {
  isBusy: boolean;
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelection: () => void;
  onPublishSelection: () => void;
}

export function ManualJournalsListBulkActions({
  isBusy,
  selectedCount,
  onClearSelection,
  onDeleteSelection,
  onPublishSelection,
}: ManualJournalsListBulkActionsProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "16px 24px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "32px",
            height: "32px",
            borderRadius: "999px",
            backgroundColor: "#156372",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          {selectedCount}
        </span>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
          journals selected
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <button
          type="button"
          disabled={isBusy}
          onClick={onPublishSelection}
          style={{
            border: "none",
            borderRadius: "10px",
            padding: "10px 14px",
            backgroundColor: "#156372",
            color: "#ffffff",
            cursor: isBusy ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: 700,
            opacity: isBusy ? 0.7 : 1,
          }}
        >
          Publish
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={onDeleteSelection}
          style={{
            border: "1px solid #fecaca",
            borderRadius: "10px",
            padding: "10px 14px",
            backgroundColor: "#fff1f2",
            color: "#b91c1c",
            cursor: isBusy ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: 700,
            opacity: isBusy ? 0.7 : 1,
          }}
        >
          Delete
        </button>
        <button
          type="button"
          onClick={onClearSelection}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            border: "1px solid #d1d5db",
            borderRadius: "10px",
            padding: "10px 14px",
            backgroundColor: "#ffffff",
            color: "#156372",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Clear
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
