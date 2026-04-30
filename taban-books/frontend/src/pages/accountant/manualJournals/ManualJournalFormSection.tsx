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
  minHeight: "46px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
  lineHeight: 1.4,
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
        borderTop: "1px solid #e5e7eb",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        padding: "20px 0 18px",
      }}
    >
      <style>
        {`
          .manual-journal-details-form {
            display: grid;
            gap: 16px;
          }

          .manual-journal-details-row {
            display: grid;
            grid-template-columns: 250px minmax(320px, 600px);
            align-items: center;
            gap: 16px;
          }

          .manual-journal-details-row--notes {
            align-items: start;
          }

          @media (max-width: 860px) {
            .manual-journal-details-row {
              grid-template-columns: minmax(0, 1fr);
              gap: 8px;
            }
          }
        `}
      </style>

      <div className="manual-journal-details-form">
        <label className="manual-journal-details-row">
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#dc2626" }}>
            Date*
          </span>
          <input
            type="date"
            value={formData.date}
            onChange={(event) => onChange("date", event.target.value)}
            style={fieldStyle}
          />
        </label>

        <label className="manual-journal-details-row">
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#dc2626" }}>
            Journal#*
          </span>
          <input
            type="text"
            value={formData.journalNumber}
            onChange={(event) => onChange("journalNumber", event.target.value)}
            placeholder="Enter journal number"
            style={fieldStyle}
          />
        </label>

        <label className="manual-journal-details-row">
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

        <div className="manual-journal-details-row">
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
            Reporting Method
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "22px" }}>
            {MANUAL_JOURNAL_REPORTING_METHOD_OPTIONS.map((option) => (
              <label
                key={option.value}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#111827",
                }}
              >
                <input
                  type="radio"
                  name="manual-journal-reporting-method"
                  value={option.value}
                  checked={formData.reportingMethod === option.value}
                  onChange={(event) =>
                    onChange("reportingMethod", event.target.value)
                  }
                  style={{ width: "16px", height: "16px" }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <label className="manual-journal-details-row">
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

        <label className="manual-journal-details-row manual-journal-details-row--notes">
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#dc2626" }}>
            Notes*
          </span>
          <textarea
            value={formData.notes}
            onChange={(event) => onChange("notes", event.target.value)}
            placeholder="Add context for reviewers or period-end notes"
            rows={4}
            style={{ ...fieldStyle, minHeight: "104px", resize: "vertical" }}
          />
        </label>
      </div>
    </section>
  );
}
