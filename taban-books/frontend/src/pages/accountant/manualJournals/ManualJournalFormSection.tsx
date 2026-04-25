import React from "react";

import type { ManualJournalCurrency } from "../manualJournalTypes";
import { MANUAL_JOURNAL_REPORTING_METHOD_OPTIONS } from "./config";
import type { ManualJournalFormState } from "./types";

interface ManualJournalFormSectionProps {
  currencies: ManualJournalCurrency[];
  formData: ManualJournalFormState;
  onChange: (field: keyof ManualJournalFormState, value: string) => void;
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "14px",
  color: "#111827",
  backgroundColor: "#ffffff",
  outline: "none",
};

export function ManualJournalFormSection({
  currencies,
  formData,
  onChange,
}: ManualJournalFormSectionProps) {
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "20px",
        backgroundColor: "#ffffff",
        padding: "24px",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Journal Details
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "14px",
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Keep the top-level details small and predictable, then manage the
            accounting lines below.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <label style={{ display: "grid", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
            Date
          </span>
          <input
            type="date"
            value={formData.date}
            onChange={(event) => onChange("date", event.target.value)}
            style={fieldStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
            Journal Number
          </span>
          <input
            type="text"
            value={formData.journalNumber}
            onChange={(event) => onChange("journalNumber", event.target.value)}
            placeholder="Enter journal number"
            style={fieldStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
            Reference
          </span>
          <input
            type="text"
            value={formData.reference}
            onChange={(event) => onChange("reference", event.target.value)}
            placeholder="Reference number"
            style={fieldStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
            Currency
          </span>
          <select
            value={formData.currency}
            onChange={(event) => onChange("currency", event.target.value)}
            style={fieldStyle}
          >
            {currencies.map((currency, index) => (
              <option
                key={`${currency.code}-${currency.name}-${index}`}
                value={currency.code}
              >
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
          marginTop: "16px",
        }}
      >
        <label style={{ display: "grid", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
            Reporting Method
          </span>
          <select
            value={formData.reportingMethod}
            onChange={(event) =>
              onChange("reportingMethod", event.target.value)
            }
            style={fieldStyle}
          >
            {MANUAL_JOURNAL_REPORTING_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
            Notes
          </span>
          <textarea
            value={formData.notes}
            onChange={(event) => onChange("notes", event.target.value)}
            placeholder="Add context for reviewers or period-end notes"
            rows={4}
            style={{ ...fieldStyle, resize: "vertical" }}
          />
        </label>
      </div>
    </section>
  );
}
