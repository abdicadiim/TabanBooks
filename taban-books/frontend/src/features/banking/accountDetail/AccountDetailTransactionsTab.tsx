import { memo } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import {
  formatCurrencyAmount,
  formatTransactionDate,
} from "./helpers";

type AccountDetailTransactionsTabProps = {
  transactions: any[];
  selectedTransactions: string[];
  setSelectedTransactions: Dispatch<SetStateAction<string[]>>;
  setIsSearchModalOpen: Dispatch<SetStateAction<boolean>>;
  getTransactionId: (transaction: any) => string;
  formatTransactionTypeLabel: (value: unknown) => string;
  getTransactionCounterparty: (transaction: any) => string;
};

const tableHeaderStyle: CSSProperties = {
  padding: "12px 16px",
  fontSize: "12px",
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
};

const formatStatusLabel = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "-";

  return raw
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

function AccountDetailTransactionsTabComponent({
  transactions,
  selectedTransactions,
  setSelectedTransactions,
  setIsSearchModalOpen,
  getTransactionId,
  formatTransactionTypeLabel,
  getTransactionCounterparty,
}: AccountDetailTransactionsTabProps) {
  const allSelected = transactions.length > 0 && selectedTransactions.length === transactions.length;

  const toggleAllTransactions = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(transactions.map((transaction) => getTransactionId(transaction)).filter(Boolean));
      return;
    }

    setSelectedTransactions([]);
  };

  const toggleTransaction = (transaction: any, checked: boolean) => {
    const transactionId = getTransactionId(transaction);
    if (!transactionId) return;

    setSelectedTransactions((current) => {
      if (checked) {
        return current.includes(transactionId) ? current : [...current, transactionId];
      }

      return current.filter((id) => id !== transactionId);
    });
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
            <th style={{ ...tableHeaderStyle, textAlign: "left", width: "40px" }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => toggleAllTransactions(event.target.checked)}
                style={{ cursor: "pointer" }}
              />
            </th>
            <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Date</th>
            <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Reference#</th>
            <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Type</th>
            <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Status</th>
            <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Deposits</th>
            <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Withdrawals</th>
            <th style={{ ...tableHeaderStyle, textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                <span>Running Balance</span>
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="7" cy="7" r="5" stroke="#6b7280" strokeWidth="1.5" fill="none" />
                    <path d="M11 11l-3-3" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 && (
            <tr>
              <td
                colSpan={8}
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  fontSize: "14px",
                  color: "#6b7280",
                }}
              >
                No transactions found for this account yet.
              </td>
            </tr>
          )}
          {transactions.map((transaction) => {
            const transactionId = getTransactionId(transaction);
            const isSelected = selectedTransactions.includes(transactionId);
            const isDeposit = transaction.debitOrCredit === "credit";
            const isWithdrawal = transaction.debitOrCredit === "debit";

            return (
              <tr key={transactionId || transaction._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "12px 16px" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) => toggleTransaction(transaction, event.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                </td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                  {formatTransactionDate(transaction.date)}
                </td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#6b7280" }}>
                  {transaction.referenceNumber || transaction.reference_number || ""}
                </td>
                <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                  <div>
                    <div style={{ color: "#111827", fontWeight: 500, marginBottom: "2px" }}>
                      {formatTransactionTypeLabel(transaction.transactionType || transaction.type)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {getTransactionCounterparty(transaction) || "-"}
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#6b7280" }}>
                  {formatStatusLabel(transaction.status)}
                </td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827", textAlign: "right" }}>
                  {isDeposit ? formatCurrencyAmount(transaction.amount) : ""}
                </td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#0f766e", textAlign: "right" }}>
                  {isWithdrawal ? formatCurrencyAmount(Math.abs(Number(transaction.amount || 0))) : ""}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    fontSize: "14px",
                    color: "#111827",
                    textAlign: "right",
                    fontWeight: 500,
                  }}
                >
                  {formatCurrencyAmount(transaction.balance ?? transaction.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const AccountDetailTransactionsTab = memo(AccountDetailTransactionsTabComponent);
