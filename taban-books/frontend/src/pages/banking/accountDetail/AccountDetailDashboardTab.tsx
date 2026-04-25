import { memo } from "react";
import type { NavigateFunction } from "react-router-dom";
import {
  formatCurrencyAmount,
  formatTransactionDate,
  formatTransactionTypeLabel,
  getTransactionCounterparty,
  getTransactionId,
} from "./helpers";

type AccountDetailDashboardTabProps = {
  account: any;
  transactions: any[];
  navigate: NavigateFunction;
  onViewAllTransactions: () => void;
};

const chartValues = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
const chartDates = [
  "25 Nov",
  "27 Nov",
  "29 Nov",
  "01 Dec",
  "03 Dec",
  "05 Dec",
  "07 Dec",
  "09 Dec",
  "11 Dec",
  "13 Dec",
  "15 Dec",
  "17 Dec",
  "19 Dec",
  "21 Dec",
  "23 Dec",
];

function AccountDetailDashboardTabComponent({
  account,
  transactions,
  navigate,
  onViewAllTransactions,
}: AccountDetailDashboardTabProps) {
  const recentTransactions = transactions.slice(0, 5);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "24px",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", margin: "0 0 20px 0" }}>
              Activity Summary
            </h3>
            <div
              style={{
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#111827",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="4" width="12" height="10" rx="1" stroke="#156372" strokeWidth="1.5" fill="none" />
                  <path d="M2 8h12M6 4v10" stroke="#156372" strokeWidth="1.5" />
                </svg>
                <span>Last Reconciliation</span>
              </div>
              <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                You can reconcile your transactions to ensure that transactions in Taban match your bank statement.
                Your latest reconciliation details will be displayed here.
              </p>
              <button
                onClick={() =>
                  navigate(`/banking/account/${account?._id}/reconciliations`, {
                    state: { account },
                  })
                }
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#156372",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Initiate Reconciliation
              </button>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", margin: 0 }}>Cash Summary</h3>
              <div
                style={{
                  padding: "6px 12px",
                  backgroundColor: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#111827",
                }}
              >
                Last 30 days
              </div>
            </div>

            <div
              style={{
                position: "relative",
                height: "300px",
                borderBottom: "1px solid #e5e7eb",
                borderLeft: "1px solid #e5e7eb",
                paddingLeft: "40px",
                paddingBottom: "30px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: "30px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  width: "40px",
                  paddingRight: "8px",
                  alignItems: "flex-end",
                }}
              >
                {chartValues.slice().reverse().map((value) => (
                  <span key={value} style={{ fontSize: "12px", color: "#6b7280" }}>
                    {value === 0 ? "0" : value === 3.5 ? "3.5 K" : `${value} K`}
                  </span>
                ))}
              </div>

              <div style={{ position: "relative", width: "100%", height: "100%" }}>
                {chartValues.map((value, index) => (
                  <div
                    key={value}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: `${(chartValues.length - 1 - index) * (100 / (chartValues.length - 1))}%`,
                      borderTop: "1px solid #f3f4f6",
                      height: "1px",
                    }}
                  />
                ))}
                <svg
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                >
                  <polyline
                    points="0%,100% 20%,100% 40%,100% 60%,0% 80%,0% 100%,0%"
                    fill="none"
                    stroke="#156372"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingLeft: "40px" }}>
                {chartDates.map((date) => (
                  <span key={date} style={{ fontSize: "11px", color: "#6b7280", width: `${100 / chartDates.length}%`, textAlign: "center" }}>
                    {date}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "24px", marginTop: "16px", paddingLeft: "40px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "12px", height: "12px", backgroundColor: "#156372", borderRadius: "2px" }} />
                <span style={{ fontSize: "14px", color: "#6b7280" }}>Closing Balance</span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "24px",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", margin: "0 0 20px 0" }}>
            Recent Transactions
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {recentTransactions.length === 0 && (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  color: "#6b7280",
                  fontSize: "14px",
                }}
              >
                No recent transactions to show yet.
              </div>
            )}
            {recentTransactions.map((transaction) => (
              <div
                key={getTransactionId(transaction)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "12px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827", marginBottom: "4px" }}>
                    {formatTransactionTypeLabel(transaction.transactionType || transaction.type)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {getTransactionCounterparty(transaction) || "No counterparty"} • {formatTransactionDate(transaction.date)}
                  </div>
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>
                  {formatCurrencyAmount(transaction.amount)}
                </div>
              </div>
            ))}
            {transactions.length > recentTransactions.length && (
              <button
                onClick={onViewAllTransactions}
                style={{
                  padding: "8px 16px",
                  background: "none",
                  border: "none",
                  color: "#156372",
                  fontSize: "14px",
                  cursor: "pointer",
                  alignSelf: "flex-start",
                  fontWeight: 500,
                }}
              >
                View all transactions
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "24px",
          backgroundColor: "white",
          border: "2px dashed #d1d5db",
          borderRadius: "8px",
          padding: "40px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f0f9ff 0%, #fefce8 100%)",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #d1fae5 0%, #dbeafe 50%, #fef3c7 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="12" width="32" height="24" rx="2" fill="#10b981" opacity="0.3" />
            <rect x="8" y="12" width="32" height="24" rx="2" stroke="#10b981" strokeWidth="2" />
            <path d="M8 20h32M20 12v24" stroke="#10b981" strokeWidth="2" />
            <rect x="28" y="28" width="8" height="6" rx="1" fill="#f97316" stroke="#f97316" strokeWidth="1.5" />
            <path d="M30 30h4M30 32h4" stroke="white" strokeWidth="1" />
          </svg>
        </div>
        <p
          style={{
            fontSize: "16px",
            fontWeight: 500,
            color: "#111827",
            margin: "0 0 20px 0",
            textAlign: "center",
          }}
        >
          Yet to add Bank and Credit Card details
        </p>
        <button
          onClick={() => navigate("/banking/add-account")}
          style={{
            padding: "12px 24px",
            backgroundColor: "#156372",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="4" width="12" height="10" rx="1" stroke="white" strokeWidth="1.5" fill="none" />
            <path d="M2 8h12M6 4v10" stroke="white" strokeWidth="1.5" />
          </svg>
          Add Bank Account
        </button>
      </div>
    </>
  );
}

export const AccountDetailDashboardTab = memo(AccountDetailDashboardTabComponent);
