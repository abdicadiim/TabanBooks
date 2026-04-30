import React from "react";
import { GripVertical, Plus, X } from "lucide-react";

import { MANUAL_JOURNAL_TEMPLATE_FIELD_OPTIONS } from "./config";
import type { ManualJournalFieldMapping } from "./types";

interface ManualJournalTemplateModalProps {
  fieldMappings: ManualJournalFieldMapping[];
  open: boolean;
  templateName: string;
  onAddField: () => void;
  onChangeFieldMapping: (
    fieldId: string,
    field: "tabanField" | "exportField",
    value: string,
  ) => void;
  onChangeTemplateName: (value: string) => void;
  onClose: () => void;
  onRemoveField: (fieldId: string) => void;
  onSave: () => void;
}

export function ManualJournalTemplateModal({
  fieldMappings,
  open,
  templateName,
  onAddField,
  onChangeFieldMapping,
  onChangeTemplateName,
  onClose,
  onRemoveField,
  onSave,
}: ManualJournalTemplateModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827" }}>
              New Export Template
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#64748b" }}>
              Define the fields you want to export and how they should appear in
              the file.
            </p>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "24px", display: "grid", gap: "20px" }}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={labelStyle}>Template Name</span>
            <input
              type="text"
              value={templateName}
              onChange={(event) => onChangeTemplateName(event.target.value)}
              placeholder="Enter template name"
              style={fieldStyle}
            />
          </label>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 1fr 44px",
                gap: "12px",
                padding: "14px 16px",
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e5e7eb",
                fontSize: "12px",
                fontWeight: 700,
                color: "#64748b",
                letterSpacing: "0.08em",
              }}
            >
              <div />
              <div>FIELD IN TABAN BOOKS</div>
              <div>FIELD IN EXPORT FILE</div>
              <div />
            </div>

            <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
              {fieldMappings.map((mapping) => (
                <div
                  key={mapping.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 1fr 44px",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                    }}
                  >
                    <GripVertical size={18} />
                  </div>

                  <select
                    value={mapping.tabanField}
                    onChange={(event) =>
                      onChangeFieldMapping(mapping.id, "tabanField", event.target.value)
                    }
                    style={fieldStyle}
                  >
                    {MANUAL_JOURNAL_TEMPLATE_FIELD_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={mapping.exportField}
                    onChange={(event) =>
                      onChangeFieldMapping(mapping.id, "exportField", event.target.value)
                    }
                    style={fieldStyle}
                  />

                  <button
                    type="button"
                    onClick={() => onRemoveField(mapping.id)}
                    style={removeButtonStyle}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={onAddField}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "fit-content",
                  borderRadius: "10px",
                  border: "1px dashed #94a3b8",
                  padding: "10px 14px",
                  backgroundColor: "#ffffff",
                  color: "#156372",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <Plus size={16} />
                Add a New Field
              </button>
            </div>
          </div>
        </div>

        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            Cancel
          </button>
          <button type="button" onClick={onSave} style={primaryButtonStyle}>
            Save and Select
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 4000,
  padding: "20px",
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "860px",
  backgroundColor: "#ffffff",
  borderRadius: "20px",
  boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18)",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  padding: "20px 24px",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const footerStyle: React.CSSProperties = {
  padding: "20px 24px",
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
};

const closeButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "34px",
  height: "34px",
  borderRadius: "999px",
  border: "1px solid #d1d5db",
  backgroundColor: "#ffffff",
  color: "#156372",
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#334155",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  padding: "11px 12px",
  fontSize: "14px",
  backgroundColor: "#ffffff",
  color: "#111827",
};

const removeButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  border: "1px solid #fecaca",
  backgroundColor: "#fff1f2",
  color: "#b91c1c",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  padding: "11px 16px",
  backgroundColor: "#ffffff",
  color: "#156372",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
};

const primaryButtonStyle: React.CSSProperties = {
  borderRadius: "10px",
  border: "none",
  padding: "11px 18px",
  backgroundColor: "#156372",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 700,
};

