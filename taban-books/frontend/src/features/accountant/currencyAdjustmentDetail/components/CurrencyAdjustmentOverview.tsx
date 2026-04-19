import React from "react";
import { Paperclip } from "lucide-react";

import {
  CURRENCY_ADJUSTMENT_EMPTY_NOTES_LABEL,
  CURRENCY_ADJUSTMENT_TITLE,
} from "../../currencyAdjustmentConfig";
import type { CurrencyAdjustment } from "../../currencyAdjustmentTypes";
import {
  formatCurrencyAdjustmentCreatedDate,
  formatCurrencyAdjustmentSignedValue,
  getCurrencyCode,
  getCurrencyAdjustmentNotes,
} from "../../currencyAdjustmentUtils";

interface CurrencyAdjustmentOverviewProps {
  adjustment: CurrencyAdjustment;
  adjustmentNumber: number | null;
  attachmentCount: number;
}

export function CurrencyAdjustmentOverview({
  adjustment,
  adjustmentNumber,
  attachmentCount,
}: CurrencyAdjustmentOverviewProps) {
  const gainLossValue = Number(adjustment.gainOrLoss || 0);
  const gainLossColor = gainLossValue >= 0 ? "#10b981" : "#ef4444";
  const gainLossLabel = formatCurrencyAdjustmentSignedValue(gainLossValue, "AMD");
  const createdLabel = formatCurrencyAdjustmentCreatedDate(adjustment.createdAt);
  const exchangeRateLabel = `1 ${getCurrencyCode(adjustment.currency)} = ${adjustment.exchangeRate} AMD`;
  const notes = getCurrencyAdjustmentNotes(adjustment.notes);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "700",
            margin: 0,
            marginBottom: "4px",
            color: "#111827",
          }}
        >
          {CURRENCY_ADJUSTMENT_TITLE}
        </h1>
        <div style={{ fontSize: "18px", color: "#6b7280" }}>
          {adjustmentNumber ? `#${adjustmentNumber}` : ""}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
          marginBottom: "24px",
        }}
      >
        <div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
            Date
          </div>
          <div style={{ fontSize: "16px", fontWeight: "500", color: "#111827" }}>
            {adjustment.date}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
            Currency
          </div>
          <div style={{ fontSize: "16px", fontWeight: "500", color: "#111827" }}>
            {adjustment.currency}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
            Gain or Loss
          </div>
          <div
            style={{ fontSize: "16px", fontWeight: "500", color: gainLossColor }}
          >
            {gainLossLabel}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          Notes
        </h3>
        <div
          style={{
            fontSize: "14px",
            color:
              notes === CURRENCY_ADJUSTMENT_EMPTY_NOTES_LABEL
                ? "#6b7280"
                : "#111827",
            padding: "12px",
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
            border: "1px solid #e5e7eb",
          }}
        >
          {notes}
        </div>
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "24px",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#1e40af", color: "white" }}>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                }}
              >
                CURRENCY
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                }}
              >
                EXCHANGE RATE
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "right",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                }}
              >
                GAIN OR LOSS
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                {adjustment.currency}
              </td>
              <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                {exchangeRateLabel}
              </td>
              <td
                style={{
                  padding: "12px 16px",
                  fontSize: "14px",
                  textAlign: "right",
                  color: gainLossColor,
                  fontWeight: "500",
                }}
              >
                {gainLossLabel}
              </td>
            </tr>
            <tr style={{ backgroundColor: "#f9fafb" }}>
              <td
                style={{
                  padding: "12px 16px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                Total
              </td>
              <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                {adjustment.exchangeRate} AMD
              </td>
              <td
                style={{
                  padding: "12px 16px",
                  fontSize: "14px",
                  textAlign: "right",
                  fontWeight: "600",
                  color: gainLossColor,
                }}
              >
                {gainLossLabel}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        style={{
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "16px",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#111827",
            marginBottom: "12px",
          }}
        >
          More Information
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <span style={{ color: "#6b7280" }}>Adjustment Date:</span>
            <span style={{ color: "#111827", fontWeight: "500" }}>{adjustment.date}</span>
          </div>
          {createdLabel && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "#6b7280" }}>Created:</span>
              <span style={{ color: "#111827", fontWeight: "500" }}>{createdLabel}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "13px",
            }}
          >
            <span style={{ color: "#6b7280" }}>Attachments:</span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#156372" }}>
              <Paperclip size={14} />
              <span>{attachmentCount} Attachment(s) added</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
