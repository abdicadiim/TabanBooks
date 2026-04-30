import React from "react";

interface ManualJournalEditorHeaderProps {
  isEditMode: boolean;
  onChooseTemplate: () => void;
}

export function ManualJournalEditorHeader({
  isEditMode,
  onChooseTemplate,
}: ManualJournalEditorHeaderProps) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "18px 12px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: 600,
            color: "#111827",
            lineHeight: 1.05,
          }}
        >
          {isEditMode ? "Edit Journal" : "New Journal"}
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={onChooseTemplate}
            style={{
              border: "none",
              borderRadius: "8px",
              backgroundColor: "transparent",
              color: "#1d4ed8",
              cursor: "pointer",
              padding: "6px 2px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Choose Template
          </button>
        </div>
      </div>
    </div>
  );
}
