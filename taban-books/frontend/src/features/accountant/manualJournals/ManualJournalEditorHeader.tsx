import React from "react";

interface ManualJournalEditorHeaderProps {
  isBusy: boolean;
  isEditMode: boolean;
  onBack: () => void;
  onChooseTemplate: () => void;
  onPublish: () => void;
  onSaveDraft: () => void;
}

export function ManualJournalEditorHeader({
  isBusy,
  isEditMode,
  onBack,
  onChooseTemplate,
  onPublish,
  onSaveDraft,
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
          margin: "0 auto",
          maxWidth: "1400px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "20px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "999px",
              backgroundColor: "#ffffff",
              color: "#374151",
              cursor: "pointer",
              padding: "8px 14px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Back
          </button>
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#0f766e",
              }}
            >
              Accountant
            </div>
            <h1
              style={{
                margin: "4px 0 0",
                fontSize: "28px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              {isEditMode ? "Edit Journal" : "New Journal"}
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <button
            type="button"
            onClick={onChooseTemplate}
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: "12px",
              backgroundColor: "#eff6ff",
              color: "#1d4ed8",
              cursor: "pointer",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Choose Template
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isBusy}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              backgroundColor: "#ffffff",
              color: "#374151",
              cursor: isBusy ? "not-allowed" : "pointer",
              opacity: isBusy ? 0.7 : 1,
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={isBusy}
            style={{
              border: "none",
              borderRadius: "12px",
              backgroundColor: "#0f766e",
              color: "#ffffff",
              cursor: isBusy ? "not-allowed" : "pointer",
              opacity: isBusy ? 0.7 : 1,
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            {isBusy ? "Saving..." : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
