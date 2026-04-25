import React from "react";
import { ChevronDown } from "lucide-react";

import {
  CURRENCY_ADJUSTMENT_PERIOD_OPTIONS,
  type CurrencyAdjustmentPeriod,
} from "../../currencyAdjustmentConfig";
import type { CurrencyAdjustment } from "../../currencyAdjustmentTypes";
import {
  formatCurrencyAdjustmentSignedValue,
  getCurrencyAdjustmentIdentifier,
  matchesCurrencyAdjustmentId,
} from "../../currencyAdjustmentUtils";
import { useDropdownMenu } from "../useDropdownMenu";

interface CurrencyAdjustmentSidebarProps {
  activeAdjustmentId?: string | null;
  adjustments: CurrencyAdjustment[];
  selectedPeriod: CurrencyAdjustmentPeriod;
  onSelectAdjustment: (adjustmentId: string) => void;
  onSelectPeriod: (period: CurrencyAdjustmentPeriod) => void;
}

export function CurrencyAdjustmentSidebar({
  activeAdjustmentId,
  adjustments,
  selectedPeriod,
  onSelectAdjustment,
  onSelectPeriod,
}: CurrencyAdjustmentSidebarProps) {
  const periodMenu = useDropdownMenu<HTMLDivElement>();

  return (
    <div
      style={{
        width: "320px",
        backgroundColor: "white",
        borderRight: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 60px)",
      }}
    >
      <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb" }}>
        <div ref={periodMenu.ref} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => periodMenu.setIsOpen((isOpen) => !isOpen)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "13px",
              backgroundColor: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#111827",
            }}
          >
            <span>Period: {selectedPeriod}</span>
            <ChevronDown
              size={14}
              style={{
                transform: periodMenu.isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </button>
          {periodMenu.isOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                zIndex: 1000,
              }}
            >
              {CURRENCY_ADJUSTMENT_PERIOD_OPTIONS.map((option) => (
                <div
                  key={option}
                  onClick={() => {
                    onSelectPeriod(option);
                    periodMenu.setIsOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: "13px",
                    backgroundColor:
                      selectedPeriod === option ? "#f3f4f6" : "transparent",
                    color: "#111827",
                  }}
                  onMouseEnter={(event) => {
                    if (selectedPeriod !== option) {
                      event.currentTarget.style.backgroundColor = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (selectedPeriod !== option) {
                      event.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {option}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {adjustments.length === 0 ? (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#6b7280",
              fontSize: "13px",
            }}
          >
            No adjustments found
          </div>
        ) : (
          adjustments.map((adjustment) => {
            const adjustmentId = getCurrencyAdjustmentIdentifier(adjustment);
            if (!adjustmentId) return null;

            const isActive = matchesCurrencyAdjustmentId(
              adjustment,
              activeAdjustmentId,
            );

            return (
              <div
                key={adjustmentId}
                onClick={() => onSelectAdjustment(adjustmentId)}
                style={{
                  padding: "12px",
                  marginBottom: "8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  backgroundColor: isActive ? "#eff6ff" : "transparent",
                  border: isActive
                    ? "1px solid #156372"
                    : "1px solid transparent",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(event) => {
                  if (!isActive) {
                    event.currentTarget.style.backgroundColor = "#f9fafb";
                  }
                }}
                onMouseLeave={(event) => {
                  if (!isActive) {
                    event.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "4px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#111827",
                    }}
                  >
                    {adjustment.date}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color:
                        Number(adjustment.gainOrLoss || 0) >= 0
                          ? "#10b981"
                          : "#ef4444",
                    }}
                  >
                    {formatCurrencyAdjustmentSignedValue(
                      Number(adjustment.gainOrLoss || 0),
                    )}
                  </div>
                </div>
                <div
                  style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}
                >
                  {adjustment.currency}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
