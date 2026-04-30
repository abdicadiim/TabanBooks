import React from "react";

import type { ManualJournalTemplateRecord } from "./types";
import {
  getManualJournalTemplateCreatedBy,
  getManualJournalTemplateLines,
  getManualJournalTemplateName,
} from "./utils";

interface ManualJournalTemplateSidebarProps {
  isLoading: boolean;
  onApply: (template: ManualJournalTemplateRecord) => void;
  onClose: () => void;
  onCreateTemplate: () => void;
  open: boolean;
  templates: ManualJournalTemplateRecord[];
}

export function ManualJournalTemplateSidebar({
  isLoading,
  onApply,
  onClose,
  onCreateTemplate,
  open,
  templates,
}: ManualJournalTemplateSidebarProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "165px",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
      }}
      onClick={onClose}
    >
      <aside
        style={{
          marginLeft: "auto",
          display: "flex",
          height: "calc(100vh - 165px)",
          width: "min(460px, 100%)",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          boxShadow: "-20px 0 50px rgba(15, 23, 42, 0.16)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            borderBottom: "1px solid #e5e7eb",
            padding: "24px",
          }}
        >
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
              Templates
            </div>
            <h2
              style={{
                margin: "6px 0 0",
                fontSize: "22px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Choose Journal Template
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "999px",
              backgroundColor: "#ffffff",
              color: "#374151",
              cursor: "pointer",
              padding: "8px 12px",
            }}
          >
            Close
          </button>
        </div>

        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}>
          <button
            type="button"
            onClick={onCreateTemplate}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "14px",
              backgroundColor: "#0f766e",
              color: "#ffffff",
              cursor: "pointer",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Create New Template
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {isLoading ? (
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div
              style={{
                border: "1px dashed #cbd5e1",
                borderRadius: "18px",
                padding: "24px",
                backgroundColor: "#f8fafc",
                fontSize: "14px",
                color: "#6b7280",
                lineHeight: 1.7,
              }}
            >
              No journal templates are available yet. Create one first, then
              come back here to reuse it.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {templates.map((template) => (
                <article
                  key={
                    template._id ||
                    template.id ||
                    getManualJournalTemplateName(template)
                  }
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "18px",
                    backgroundColor: "#ffffff",
                    padding: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {getManualJournalTemplateName(template)}
                      </h3>
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontSize: "13px",
                          color: "#6b7280",
                          lineHeight: 1.6,
                        }}
                      >
                        {template.notes || template.description || "No notes"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onApply(template)}
                      style={{
                        border: "none",
                        borderRadius: "12px",
                        backgroundColor: "#ecfeff",
                        color: "#155e75",
                        cursor: "pointer",
                        padding: "10px 14px",
                        fontSize: "13px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Use
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "10px",
                      marginTop: "16px",
                    }}
                  >
                    <Meta
                      label="Reference"
                      value={template.referenceNumber || template.reference || "-"}
                    />
                    <Meta label="Currency" value={template.currency || "-"} />
                    <Meta
                      label="Method"
                      value={template.reportingMethod || "accrual-and-cash"}
                    />
                    <Meta
                      label="Lines"
                      value={String(getManualJournalTemplateLines(template).length)}
                    />
                    <Meta
                      label="Created By"
                      value={getManualJournalTemplateCreatedBy(template)}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "14px",
        backgroundColor: "#f8fafc",
        padding: "12px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#6b7280",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: "6px",
          fontSize: "13px",
          color: "#111827",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}
