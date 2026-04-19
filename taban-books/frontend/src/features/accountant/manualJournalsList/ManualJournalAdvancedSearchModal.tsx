import React from "react";
import { X } from "lucide-react";

import type { ManualJournalSearchForm } from "./types";

interface ManualJournalAdvancedSearchModalProps {
  formData: ManualJournalSearchForm;
  open: boolean;
  onApply: () => void;
  onChange: <K extends keyof ManualJournalSearchForm>(
    field: K,
    value: ManualJournalSearchForm[K],
  ) => void;
  onClose: () => void;
  onReset: () => void;
}

export function ManualJournalAdvancedSearchModal({
  formData,
  open,
  onApply,
  onChange,
  onClose,
  onReset,
}: ManualJournalAdvancedSearchModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      style={overlayStyle}
      onClick={onClose}
    >
      <div
        style={{
          ...modalStyle,
          maxWidth: "920px",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827" }}>
              Advanced Search
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#64748b" }}>
              Filter journals by number, date, amount, notes, and reporting fields.
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
          <SearchInput
            label="View"
            value={formData.filterType}
            input={
              <select
                value={formData.filterType}
                onChange={(event) => onChange("filterType", event.target.value as ManualJournalSearchForm["filterType"])}
                style={fieldStyle}
              >
                <option value="All">All</option>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </select>
            }
          />
          <SearchInput
            label="Journal#"
            value={formData.journalNumber}
            input={
              <input
                type="text"
                value={formData.journalNumber}
                onChange={(event) => onChange("journalNumber", event.target.value)}
                style={fieldStyle}
              />
            }
          />
          <SearchInput
            label="Reference#"
            value={formData.referenceNumber}
            input={
              <input
                type="text"
                value={formData.referenceNumber}
                onChange={(event) => onChange("referenceNumber", event.target.value)}
                style={fieldStyle}
              />
            }
          />
          <SearchInput
            label="Status"
            value={formData.status}
            input={
              <select
                value={formData.status}
                onChange={(event) => onChange("status", event.target.value)}
                style={fieldStyle}
              >
                <option value="">Any status</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="PENDING APPROVAL">PENDING APPROVAL</option>
              </select>
            }
          />
          <SearchInput
            label="Date From"
            value={formData.dateFrom}
            input={
              <input
                type="date"
                value={formData.dateFrom}
                onChange={(event) => onChange("dateFrom", event.target.value)}
                style={fieldStyle}
              />
            }
          />
          <SearchInput
            label="Date To"
            value={formData.dateTo}
            input={
              <input
                type="date"
                value={formData.dateTo}
                onChange={(event) => onChange("dateTo", event.target.value)}
                style={fieldStyle}
              />
            }
          />
          <SearchInput
            label="Account"
            value={formData.account}
            input={
              <input
                type="text"
                value={formData.account}
                onChange={(event) => onChange("account", event.target.value)}
                style={fieldStyle}
              />
            }
          />
          <SearchInput
            label="Tax"
            value={formData.tax}
            input={
              <input
                type="text"
                value={formData.tax}
                onChange={(event) => onChange("tax", event.target.value)}
                style={fieldStyle}
              />
            }
          />
          <SearchInput
            label="Vendor Name"
            value={formData.vendorName}
            input={
              <input
                type="text"
                value={formData.vendorName}
                onChange={(event) => onChange("vendorName", event.target.value)}
                style={fieldStyle}
              />
            }
          />
          <SearchInput
            label="Journal Type"
            value={formData.journalType}
            input={
              <input
                type="text"
                value={formData.journalType}
                onChange={(event) => onChange("journalType", event.target.value)}
                style={fieldStyle}
              />
            }
          />
          <SearchInput
            label="Total From"
            value={formData.totalFrom}
            input={
              <input
                type="number"
                value={formData.totalFrom}
                onChange={(event) => onChange("totalFrom", event.target.value)}
                style={fieldStyle}
              />
            }
          />
          <SearchInput
            label="Total To"
            value={formData.totalTo}
            input={
              <input
                type="number"
                value={formData.totalTo}
                onChange={(event) => onChange("totalTo", event.target.value)}
                style={fieldStyle}
              />
            }
          />
          <SearchInput
            label="Notes"
            value={formData.notes}
            input={
              <input
                type="text"
                value={formData.notes}
                onChange={(event) => onChange("notes", event.target.value)}
                style={fieldStyle}
              />
            }
          />
          <SearchInput
            label="Project Name"
            value={formData.projectName}
            input={
              <input
                type="text"
                value={formData.projectName}
                onChange={(event) => onChange("projectName", event.target.value)}
                style={fieldStyle}
              />
            }
          />
          <SearchInput
            label="Customer Name"
            value={formData.customerName}
            input={
              <input
                type="text"
                value={formData.customerName}
                onChange={(event) => onChange("customerName", event.target.value)}
                style={fieldStyle}
              />
            }
          />
          <SearchInput
            label="Reporting Method"
            value={formData.reportingMethod}
            input={
              <select
                value={formData.reportingMethod}
                onChange={(event) => onChange("reportingMethod", event.target.value)}
                style={fieldStyle}
              >
                <option value="">Any reporting method</option>
                <option value="Accrual and Cash">Accrual and Cash</option>
                <option value="Accrual">Accrual</option>
                <option value="Cash">Cash</option>
              </select>
            }
          />
        </div>

        <div style={footerStyle}>
          <button type="button" onClick={onReset} style={secondaryButtonStyle}>
            Reset
          </button>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            Cancel
          </button>
          <button type="button" onClick={onApply} style={primaryButtonStyle}>
            Search
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchInput({
  input,
  label,
}: {
  input: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: "8px" }}>
      <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>{label}</span>
      {input}
    </label>
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
  gap: "12px",
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  padding: "20px 24px",
  borderTop: "1px solid #e5e7eb",
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

const fieldStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  padding: "11px 12px",
  fontSize: "14px",
  color: "#111827",
  backgroundColor: "#ffffff",
};

const secondaryButtonStyle: React.CSSProperties = {
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  padding: "11px 16px",
  backgroundColor: "#ffffff",
  color: "#475569",
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
