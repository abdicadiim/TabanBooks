import React from "react";
import { X } from "lucide-react";

import { formatLockDate } from "../utils";

interface LockedModuleSummary {
  name: string;
  lock: {
    date: string;
    reason: string;
  };
}

interface TransactionLockingUnlockSummaryModalProps {
  open: boolean;
  lockedModules: LockedModuleSummary[];
  onClose: () => void;
}

export function TransactionLockingUnlockSummaryModal({
  open,
  lockedModules,
  onClose,
}: TransactionLockingUnlockSummaryModalProps) {
  if (!open) {
    return null;
  }

  const hasLockedModules = lockedModules.length > 0;

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
          maxWidth: "540px",
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
              Unlock Modules
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#64748b" }}>
              Review existing locks before moving to a shared lock date.
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

        <div style={{ padding: "24px", display: "grid", gap: "14px" }}>
          {hasLockedModules ? (
            <>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.7, color: "#475569" }}>
                The following modules are already locked and would need to be unlocked
                before you can switch to a single global lock date.
              </p>

              <div style={{ display: "grid", gap: "12px" }}>
                {lockedModules.map((module) => (
                  <div
                    key={module.name}
                    style={{
                      borderRadius: "14px",
                      border: "1px solid #e5e7eb",
                      padding: "14px 16px",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                      {module.name}
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "14px", color: "#475569" }}>
                      Lock date: {formatLockDate(module.lock.date)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.7, color: "#475569" }}>
              All modules are currently unlocked, so you can introduce a shared lock
              date whenever that workflow is ready.
            </p>
          )}
        </div>

        <div
          style={{
            padding: "20px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
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
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
