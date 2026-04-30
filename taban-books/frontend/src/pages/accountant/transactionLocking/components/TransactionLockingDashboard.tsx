import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Lock,
  LockOpen,
  Pencil,
  Search,
  Settings2,
} from "lucide-react";

import {
  NEGATIVE_STOCK_OPTION_COPY,
  TRANSACTION_MODULES,
} from "../config";
import type { NegativeStockOption, TransactionLockMap } from "../types";
import { formatLockDate } from "../utils";

interface TransactionLockingDashboardProps {
  locks: TransactionLockMap;
  lockedCount: number;
  negativeStockOption: NegativeStockOption;
  onOpenAccountants: () => void;
  onOpenConfigure: () => void;
  onOpenLockModal: (moduleName: string) => void;
  onOpenUnlockSummary: () => void;
  onPartialUnlock: (moduleName: string) => void;
  onUnlock: (moduleName: string) => void;
}

interface TransactionModuleCardProps {
  moduleName: string;
  accentColor: string;
  description: string;
  lock: TransactionLockMap[string] | undefined;
  onEdit: () => void;
  onPartialUnlock: () => void;
  onUnlock: () => void;
}

function TransactionModuleCard({
  moduleName,
  accentColor,
  description,
  lock,
  onEdit,
  onPartialUnlock,
  onUnlock,
}: TransactionModuleCardProps) {
  const isLocked = Boolean(lock);
  const primaryButtonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    border: "none",
    borderRadius: "10px",
    padding: "11px 16px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    backgroundColor: "#156372",
    color: "#ffffff",
  };

  const secondaryButtonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "11px 16px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    backgroundColor: "#ffffff",
    color: "#334155",
  };

  return (
    <article
      style={{
        backgroundColor: "#ffffff",
        border: `1px solid ${isLocked ? `${accentColor}33` : "#e5e7eb"}`,
        borderRadius: "18px",
        padding: "24px",
        display: "grid",
        gap: "18px",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isLocked ? "#fee2e2" : `${accentColor}14`,
            color: isLocked ? "#dc2626" : accentColor,
            flexShrink: 0,
          }}
        >
          {isLocked ? <Lock size={24} /> : <LockOpen size={24} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              borderRadius: "999px",
              padding: "5px 10px",
              backgroundColor: isLocked ? "#fee2e2" : "#ecfeff",
              color: isLocked ? "#b91c1c" : "#0f766e",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {isLocked ? "Locked" : "Open"}
          </div>
          <h2
            style={{
              margin: "12px 0 8px",
              fontSize: "22px",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            {moduleName}
          </h2>
          <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.7, color: "#64748b" }}>
            {description}
          </p>
        </div>
      </div>

      <div
        style={{
          borderRadius: "14px",
          padding: "16px 18px",
          backgroundColor: isLocked ? "#fff7ed" : "#f8fafc",
          border: `1px solid ${isLocked ? "#fdba74" : "#e2e8f0"}`,
        }}
      >
        {isLocked ? (
          <>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#111827",
                marginBottom: "8px",
              }}
            >
              Transactions before {formatLockDate(lock?.date)} are currently locked.
            </div>
            <div style={{ fontSize: "14px", lineHeight: 1.7, color: "#156372" }}>
              {lock?.reason}
            </div>
          </>
        ) : (
          <div style={{ fontSize: "14px", lineHeight: 1.7, color: "#64748b" }}>
            This module is still open for edits, deletions, and date changes in older
            transactions.
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {isLocked ? (
          <>
            <button type="button" onClick={onUnlock} style={primaryButtonStyle}>
              <LockOpen size={16} />
              Unlock
            </button>
            <button type="button" onClick={onPartialUnlock} style={secondaryButtonStyle}>
              <AlertTriangle size={16} />
              Unlock Partially
            </button>
            <button type="button" onClick={onEdit} style={secondaryButtonStyle}>
              <Pencil size={16} />
              Edit Lock
            </button>
          </>
        ) : (
          <button type="button" onClick={onEdit} style={primaryButtonStyle}>
            <Lock size={16} />
            Lock Transactions
          </button>
        )}
      </div>
    </article>
  );
}

export function TransactionLockingDashboard({
  locks,
  lockedCount,
  negativeStockOption,
  onOpenAccountants,
  onOpenConfigure,
  onOpenLockModal,
  onOpenUnlockSummary,
  onPartialUnlock,
  onUnlock,
}: TransactionLockingDashboardProps) {
  const negativeStockCopy = NEGATIVE_STOCK_OPTION_COPY[negativeStockOption];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        backgroundColor: "#f8fafc",
        width: "100%",
      }}
    >
      <div style={{ width: "100%", padding: "32px", minHeight: "calc(100vh - 60px)" }}>
        <section
          style={{
            background:
              "linear-gradient(135deg, rgba(21, 99, 114, 0.10) 0%, rgba(255, 255, 255, 1) 55%)",
            border: "1px solid #dbeafe",
            borderRadius: "24px",
            padding: "28px",
            display: "grid",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: "20px",
            }}
          >
            <div style={{ maxWidth: "760px" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "30px",
                  fontWeight: 700,
                  color: "#111827",
                  letterSpacing: "-0.02em",
                }}
              >
                Transaction Locking
              </h1>
              <p
                style={{
                  margin: "12px 0 0",
                  fontSize: "15px",
                  lineHeight: 1.8,
                  color: "#156372",
                }}
              >
                Close accounting periods with confidence by locking each module
                independently. Once a module is locked, users can no longer edit,
                delete, or move older transactions that would change historical
                balances.
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "12px" }}>
              <button
                type="button"
                onClick={onOpenConfigure}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "999px",
                  border: "1px solid #fcd34d",
                  padding: "10px 14px",
                  backgroundColor: "#fffbeb",
                  color: "#b45309",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <Settings2 size={16} />
                Configure Negative Stock
              </button>

              <button
                type="button"
                onClick={onOpenAccountants}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "999px",
                  border: "1px solid #cbd5e1",
                  padding: "10px 14px",
                  backgroundColor: "#ffffff",
                  color: "#156372",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <Search size={16} />
                Find Accountants
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: "14px",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "16px 18px",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
                CURRENT LOCK STATUS
              </div>
              <div style={{ marginTop: "10px", fontSize: "28px", fontWeight: 700, color: "#111827" }}>
                {lockedCount} / {TRANSACTION_MODULES.length}
              </div>
              <div style={{ marginTop: "6px", fontSize: "14px", color: "#156372" }}>
                modules are currently locked.
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "16px 18px",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
                NEGATIVE STOCK RULE
              </div>
              <div style={{ marginTop: "10px", fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                {negativeStockOption === "allow" ? "Allowed" : "Restricted"}
              </div>
              <div style={{ marginTop: "6px", fontSize: "14px", lineHeight: 1.6, color: "#156372" }}>
                {negativeStockCopy.description}
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gap: "20px",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          }}
        >
          {TRANSACTION_MODULES.map((module) => (
            <TransactionModuleCard
              key={module.name}
              moduleName={module.name}
              accentColor={module.accentColor}
              description={module.description}
              lock={locks[module.name]}
              onEdit={() => onOpenLockModal(module.name)}
              onPartialUnlock={() => onPartialUnlock(module.name)}
              onUnlock={() => onUnlock(module.name)}
            />
          ))}
        </section>

        <section
          style={{
            marginTop: "28px",
            backgroundColor: "#fff7ed",
            border: "1px solid #fdba74",
            borderRadius: "20px",
            padding: "24px 26px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div style={{ maxWidth: "700px" }}>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "#111827" }}>
              Lock All Transactions At Once
            </h2>
            <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.7, color: "#156372" }}>
              If you prefer one shared lock date across Sales, Purchases, Banking, and
              Accountant transactions, first confirm which module locks are already in
              place.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenUnlockSummary}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              borderRadius: "999px",
              border: "none",
              padding: "12px 18px",
              backgroundColor: "#156372",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Switch to Lock All Transactions
            <ArrowRight size={16} />
          </button>
        </section>
      </div>
    </div>
  );
}
