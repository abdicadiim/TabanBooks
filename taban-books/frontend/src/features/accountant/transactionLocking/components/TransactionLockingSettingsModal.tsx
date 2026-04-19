import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

import { NEGATIVE_STOCK_OPTION_COPY } from "../config";
import type { NegativeStockOption } from "../types";

interface TransactionLockingSettingsModalProps {
  open: boolean;
  value: NegativeStockOption;
  onApply: (value: NegativeStockOption) => void;
  onClose: () => void;
}

export function TransactionLockingSettingsModal({
  open,
  value,
  onApply,
  onClose,
}: TransactionLockingSettingsModalProps) {
  const [draftValue, setDraftValue] = useState<NegativeStockOption>(value);

  useEffect(() => {
    if (open) {
      setDraftValue(value);
    }
  }, [open, value]);

  if (!open) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18)",
          overflow: "hidden",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827" }}>
              Negative Stock Policy
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#64748b" }}>
              Choose how transaction locking behaves when inventory goes below zero.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
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
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "24px", display: "grid", gap: "16px" }}>
          {(["allow", "restrict"] as NegativeStockOption[]).map((option) => {
            const copy = NEGATIVE_STOCK_OPTION_COPY[option];
            const selected = draftValue === option;

            return (
              <label
                key={option}
                style={{
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start",
                  cursor: "pointer",
                  padding: "18px",
                  borderRadius: "16px",
                  border: `1px solid ${selected ? "#156372" : "#d1d5db"}`,
                  backgroundColor: selected ? "#eff6ff" : "#ffffff",
                }}
              >
                <input
                  type="radio"
                  name="transaction-locking-negative-stock"
                  value={option}
                  checked={selected}
                  onChange={() => setDraftValue(option)}
                  style={{ marginTop: "3px", accentColor: "#156372" }}
                />
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>
                    {copy.title}
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "14px",
                      lineHeight: 1.7,
                      color: "#475569",
                    }}
                  >
                    {copy.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        <div
          style={{
            padding: "20px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              padding: "11px 16px",
              backgroundColor: "#ffffff",
              color: "#475569",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply(draftValue)}
            style={{
              borderRadius: "10px",
              border: "none",
              padding: "11px 18px",
              backgroundColor: "#156372",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
