import React from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import type { ChartOfAccountsAccount } from "../chartOfAccountsTypes";

const DEBIT_BALANCE_TYPES = [
  "Asset",
  "Other Asset",
  "Other Current Asset",
  "Cash",
  "Bank",
  "Fixed Asset",
  "Accounts Receivable",
  "Stock",
  "Payment Clearing Account",
  "Input Tax",
  "Intangible Asset",
  "Non Current Asset",
  "Deferred Tax Asset",
  "Expense",
  "Cost Of Goods Sold",
  "Other Expense",
];

interface ChartOfAccountsDetailViewProps {
  accountTransactions: any[];
  accounts: ChartOfAccountsAccount[];
  baseCurrency: any;
  isTransactionsLoading: boolean;
  onClose: () => void;
  onDelete: (account: ChartOfAccountsAccount) => void;
  onEdit: (account: ChartOfAccountsAccount) => void;
  onNewAccount: () => void;
  onOpenTransactionReport: () => void;
  onSelectAccount: (account: ChartOfAccountsAccount) => void;
  selectedAccount: ChartOfAccountsAccount;
  transactionTotals: { credit: number; debit: number };
}

const getAccountLine = (transaction: any, selectedAccount: ChartOfAccountsAccount) => {
  const selectedAccountId = selectedAccount.id || selectedAccount._id;
  return transaction.lines?.find(
    (line: any) =>
      line.account === selectedAccountId ||
      (line.accountName &&
        line.accountName === (selectedAccount.name || selectedAccount.accountName)) ||
      (line.account &&
        line.account === (selectedAccount.name || selectedAccount.accountName)),
  );
};

const getCurrencyLabel = (baseCurrency: any) =>
  baseCurrency?.symbol || (baseCurrency?.code ? String(baseCurrency.code).split(" ")[0] : "USD");

const formatMoney = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function ChartOfAccountsDetailView({
  accountTransactions,
  accounts,
  baseCurrency,
  isTransactionsLoading,
  onClose,
  onDelete,
  onEdit,
  onNewAccount,
  onOpenTransactionReport,
  onSelectAccount,
  selectedAccount,
  transactionTotals,
}: ChartOfAccountsDetailViewProps) {
  const isDebitType = DEBIT_BALANCE_TYPES.includes(selectedAccount.type || "");
  const balance = isDebitType
    ? transactionTotals.debit - transactionTotals.credit
    : transactionTotals.credit - transactionTotals.debit;
  const balanceSuffix = balance >= 0
    ? isDebitType
      ? "Dr"
      : "Cr"
    : isDebitType
      ? "Cr"
      : "Dr";
  const currencyLabel = getCurrencyLabel(baseCurrency);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "grid",
        gridTemplateColumns: "320px minmax(0, 1fr)",
        backgroundColor: "#f8fafc",
      }}
    >
      <aside
        style={{
          backgroundColor: "#ffffff",
          borderRight: "1px solid #e5e7eb",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#0f172a" }}>
              Accounts
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
              Browse the current page without leaving the detail view.
            </p>
          </div>
          <button
            type="button"
            onClick={onNewAccount}
            style={{
              border: "none",
              borderRadius: "999px",
              width: "32px",
              height: "32px",
              backgroundColor: "#156372",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        <div style={{ padding: "12px" }}>
          {accounts.map((account) => {
            const accountId = account.id || account._id || account.accountName;
            const isActive =
              accountId ===
              (selectedAccount.id || selectedAccount._id || selectedAccount.accountName);

            return (
              <button
                key={accountId}
                type="button"
                onClick={() => onSelectAccount(account)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "1px solid",
                  borderColor: isActive ? "#156372" : "#e5e7eb",
                  backgroundColor: isActive ? "#ecfeff" : "#ffffff",
                  borderRadius: "12px",
                  padding: "14px",
                  marginBottom: "10px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                  {account.name}
                </div>
                <div style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>
                  {account.type}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main style={{ padding: "24px", overflowY: "auto" }}>
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "20px",
              marginBottom: "24px",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                {selectedAccount.type}
              </p>
              <h1 style={{ margin: "6px 0 0", fontSize: "28px", fontWeight: 700, color: "#0f172a" }}>
                {selectedAccount.name}
              </h1>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => onEdit(selectedAccount)}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <Pencil size={16} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(selectedAccount)}
                style={{
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  color: "#dc2626",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  border: "none",
                  borderRadius: "10px",
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  padding: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div style={{ padding: "18px", borderRadius: "14px", backgroundColor: "#ecfeff" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#0f766e", textTransform: "uppercase" }}>
                Closing Balance
              </p>
              <p style={{ margin: "10px 0 0", fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>
                {currencyLabel} {formatMoney(Math.abs(balance))} ({balanceSuffix})
              </p>
            </div>
            <div style={{ padding: "18px", borderRadius: "14px", backgroundColor: "#f8fafc" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                Total Debit
              </p>
              <p style={{ margin: "10px 0 0", fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>
                {currencyLabel} {formatMoney(transactionTotals.debit)}
              </p>
            </div>
            <div style={{ padding: "18px", borderRadius: "14px", backgroundColor: "#f8fafc" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                Total Credit
              </p>
              <p style={{ margin: "10px 0 0", fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>
                {currencyLabel} {formatMoney(transactionTotals.credit)}
              </p>
            </div>
          </div>

          {selectedAccount.description && (
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                Description
              </h3>
              <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.7, color: "#475569" }}>
                {selectedAccount.description}
              </p>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#0f172a" }}>
                Recent Transactions
              </h3>
              <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
                Review the latest journal lines connected to this account.
              </p>
            </div>
            {accountTransactions.length > 0 && (
              <button
                type="button"
                onClick={onOpenTransactionReport}
                style={{
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Open Report
              </button>
            )}
          </div>

          {isTransactionsLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <Loader2 className="animate-spin" size={28} color="#156372" />
            </div>
          ) : accountTransactions.length === 0 ? (
            <div
              style={{
                padding: "32px",
                borderRadius: "14px",
                backgroundColor: "#f8fafc",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              There are no transactions available for this account yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: "12px 8px", fontSize: "12px", color: "#64748b" }}>Date</th>
                    <th style={{ padding: "12px 8px", fontSize: "12px", color: "#64748b" }}>Details</th>
                    <th style={{ padding: "12px 8px", fontSize: "12px", color: "#64748b" }}>Type</th>
                    <th style={{ padding: "12px 8px", fontSize: "12px", color: "#64748b", textAlign: "right" }}>Debit</th>
                    <th style={{ padding: "12px 8px", fontSize: "12px", color: "#64748b", textAlign: "right" }}>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {accountTransactions.map((transaction, index) => {
                    const line = getAccountLine(transaction, selectedAccount);
                    return (
                      <tr
                        key={`${transaction._id || transaction.id || index}`}
                        style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                        onClick={onOpenTransactionReport}
                      >
                        <td style={{ padding: "14px 8px", fontSize: "14px", color: "#0f172a" }}>
                          {new Date(transaction.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td style={{ padding: "14px 8px", fontSize: "14px", color: "#334155" }}>
                          <div>{transaction.description || transaction.reference || "Manual Journal"}</div>
                          <div style={{ marginTop: "4px", fontSize: "12px", color: "#94a3b8" }}>
                            {transaction.entryNumber}
                          </div>
                        </td>
                        <td style={{ padding: "14px 8px", fontSize: "14px", color: "#64748b" }}>
                          Journal
                        </td>
                        <td style={{ padding: "14px 8px", fontSize: "14px", color: "#0f172a", textAlign: "right" }}>
                          {line?.debit ? formatMoney(line.debit) : "--"}
                        </td>
                        <td style={{ padding: "14px 8px", fontSize: "14px", color: "#0f172a", textAlign: "right" }}>
                          {line?.credit ? formatMoney(line.credit) : "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
                    <td colSpan={3} style={{ padding: "14px 8px", textAlign: "right", color: "#0f172a" }}>
                      Total
                    </td>
                    <td style={{ padding: "14px 8px", textAlign: "right", color: "#0f172a" }}>
                      {formatMoney(transactionTotals.debit)}
                    </td>
                    <td style={{ padding: "14px 8px", textAlign: "right", color: "#0f172a" }}>
                      {formatMoney(transactionTotals.credit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
