import React from "react";
import { CalendarDays, X } from "lucide-react";

import { formatLockDate } from "../utils";

interface TransactionLockModalProps {
  open: boolean;
  moduleName: string | null;
  date: string;
  reason: string;
  existingLock: boolean;
  onClose: () => void;
  onDateChange: (date: string) => void;
  onReasonChange: (reason: string) => void;
  onSave: () => void;
}

export function TransactionLockModal({
  open,
  moduleName,
  date,
  reason,
  existingLock,
  onClose,
  onDateChange,
  onReasonChange,
  onSave,
}: TransactionLockModalProps) {
  if (!open || !moduleName) {
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
        zIndex: 10000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
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
              {existingLock ? "Update Lock" : "Lock Module"}
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#64748b" }}>
              {moduleName}
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

        <div style={{ padding: "24px", display: "grid", gap: "20px" }}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
              Lock Date
            </span>
            <div style={{ position: "relative" }}>
              <input
                type="date"
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
                style={{
                  width: "100%",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  padding: "12px 14px 12px 42px",
                  fontSize: "14px",
                  color: "#111827",
                  backgroundColor: "#ffffff",
                }}
              />
              <CalendarDays
                size={18}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "14px",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                  pointerEvents: "none",
                }}
              />
            </div>
          </label>

          <div
            style={{
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#f8fafc",
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
              PREVIEW
            </div>
            <div style={{ marginTop: "8px", fontSize: "14px", lineHeight: 1.7, color: "#334155" }}>
              Transactions created on or before <strong>{formatLockDate(date)}</strong>{" "}
              will be locked for this module.
            </div>
          </div>

          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
              Reason
            </span>
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Why are you locking this period?"
              rows={5}
              style={{
                width: "100%",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                padding: "12px 14px",
                fontSize: "14px",
                color: "#111827",
                resize: "vertical",
                fontFamily: "inherit",
                backgroundColor: "#ffffff",
              }}
            />
          </label>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "20px 24px",
            borderTop: "1px solid #e5e7eb",
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
            onClick={onSave}
            disabled={!date || !reason.trim()}
            style={{
              borderRadius: "10px",
              border: "none",
              padding: "11px 18px",
              backgroundColor: !date || !reason.trim() ? "#cbd5e1" : "#156372",
              color: "#ffffff",
              cursor: !date || !reason.trim() ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            {existingLock ? "Update Lock" : "Save Lock"}
          </button>
        </div>
      </div>
    </div>
  );
}
