import React from "react";
import { Download, Plus, X } from "lucide-react";

import {
  MANUAL_JOURNAL_DECIMAL_FORMAT_OPTIONS,
  MANUAL_JOURNAL_EXPORT_FORMAT_OPTIONS,
} from "./config";
import type {
  ManualJournalExportSettings,
  ManualJournalExportTemplate,
  ManualJournalExportType,
} from "./types";

interface ManualJournalExportModalProps {
  exportSettings: ManualJournalExportSettings;
  exportType: ManualJournalExportType;
  isBusy: boolean;
  open: boolean;
  templates: ManualJournalExportTemplate[];
  onChangeSettings: <K extends keyof ManualJournalExportSettings>(
    field: K,
    value: ManualJournalExportSettings[K],
  ) => void;
  onClose: () => void;
  onConfirmExport: () => void;
  onOpenTemplateModal: () => void;
}

const EXPORT_TITLES: Record<ManualJournalExportType, string> = {
  journals: "Export Journals",
  customerCredits: "Export Applied Customer Credits",
  vendorCredits: "Export Applied Vendor Credits",
};

export function ManualJournalExportModal({
  exportSettings,
  exportType,
  isBusy,
  open,
  templates,
  onChangeSettings,
  onClose,
  onConfirmExport,
  onOpenTemplateModal,
  
}: ManualJournalExportModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827" }}>
              {EXPORT_TITLES[exportType]}
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#64748b" }}>
              Choose the export scope, template, and file format before generating
              the file.
            </p>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            padding: "24px",
            display: "grid",
            gap: "18px",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={labelStyle}>Scope</span>
            <select
              value={exportSettings.scope}
              onChange={(event) =>
                onChangeSettings("scope", event.target.value as ManualJournalExportSettings["scope"])
              }
              style={fieldStyle}
            >
              <option value="filtered">Current filtered results</option>
              <option value="all">All loaded records</option>
              <option value="custom">Custom date range</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: "8px" }}>
            <span style={labelStyle}>Template</span>
            <div style={{ display: "flex", gap: "10px" }}>
              <select
                value={exportSettings.selectedTemplateId}
                onChange={(event) =>
                  onChangeSettings("selectedTemplateId", event.target.value)
                }
                style={{ ...fieldStyle, flex: 1 }}
              >
                <option value="">Standard export</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onOpenTemplateModal}
                style={secondaryButtonStyle}
              >
                <Plus size={16} />
              </button>
            </div>
          </label>

          {exportSettings.scope === "custom" ? (
            <>
              <label style={{ display: "grid", gap: "8px" }}>
                <span style={labelStyle}>Date From</span>
                <input
                  type="date"
                  value={exportSettings.dateFrom}
                  onChange={(event) => onChangeSettings("dateFrom", event.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label style={{ display: "grid", gap: "8px" }}>
                <span style={labelStyle}>Date To</span>
                <input
                  type="date"
                  value={exportSettings.dateTo}
                  onChange={(event) => onChangeSettings("dateTo", event.target.value)}
                  style={fieldStyle}
                />
              </label>
            </>
          ) : null}

          <label style={{ display: "grid", gap: "8px" }}>
            <span style={labelStyle}>File Format</span>
            <select
              value={exportSettings.fileFormat}
              onChange={(event) =>
                onChangeSettings(
                  "fileFormat",
                  event.target.value as ManualJournalExportSettings["fileFormat"],
                )
              }
              style={fieldStyle}
            >
              {MANUAL_JOURNAL_EXPORT_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "8px" }}>
            <span style={labelStyle}>Decimal Format</span>
            <select
              value={exportSettings.decimalFormat}
              onChange={(event) =>
                onChangeSettings("decimalFormat", event.target.value)
              }
              style={fieldStyle}
            >
              {MANUAL_JOURNAL_DECIMAL_FORMAT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "8px" }}>
            <span style={labelStyle}>Password</span>
            <input
              type="password"
              value={exportSettings.password}
              onChange={(event) => onChangeSettings("password", event.target.value)}
              placeholder="Optional"
              style={fieldStyle}
            />
          </label>
        </div>

        <div
          style={{
            margin: "0 24px 24px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            backgroundColor: "#f8fafc",
            padding: "16px 18px",
            fontSize: "14px",
            lineHeight: 1.7,
            color: "#475569",
          }}
        >
          Exporting will use the selected file format and the currently available
          data for this workflow. Templates are stored locally for faster repeat
          exports.
        </div>

        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={plainButtonStyle}>
            Cancel
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onConfirmExport}
            style={{
              ...primaryButtonStyle,
              opacity: isBusy ? 0.7 : 1,
              cursor: isBusy ? "not-allowed" : "pointer",
            }}
          >
            <Download size={16} />
            Export
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
  zIndex: 9999,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "0 20px 20px",
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#ffffff",
  maxWidth:"760px",
  borderRadius: "0 0 20px 20px",
  boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18)",
  overflow: "hidden",
  marginTop: "0px",
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
  color: "#475569",
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

const plainButtonStyle: React.CSSProperties = {
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  padding: "11px 16px",
  backgroundColor: "#ffffff",
  color: "#475569",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  padding: "11px 12px",
  backgroundColor: "#ffffff",
  color: "#334155",
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  borderRadius: "10px",
  border: "none",
  padding: "11px 18px",
  backgroundColor: "#156372",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 700,
};
