import React from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import type { ChartOfAccountsAccount } from "../chartOfAccountsTypes";

const brand = {
  primary: "#156372",
  primaryDark: "#0d4a52",
  primaryLight: "#1f7a8c",
  primarySoft: "#e8f7f8",
  primarySoftAlt: "#f3fbfb",
  border: "#d7e8eb",
  text: "#0f172a",
  muted: "#5f7691",
  panel: "#ffffff",
  canvas: "#f4f9fa",
  danger: "#dc2626",
  dangerSoft: "#fff1f2",
  shadow: "0 18px 40px rgba(13, 74, 82, 0.08)",
};

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

const getAccountLine = (
  transaction: any,
  selectedAccount: ChartOfAccountsAccount,
) => {
  const selectedAccountId = selectedAccount.id || selectedAccount._id;

  return transaction.lines?.find(
    (line: any) =>
      line.account === selectedAccountId ||
      (line.accountName &&
        line.accountName ===
          (selectedAccount.name || selectedAccount.accountName)) ||
      (line.account &&
        line.account === (selectedAccount.name || selectedAccount.accountName)),
  );
};

const getCurrencyLabel = (baseCurrency: any) =>
  baseCurrency?.symbol ||
  (baseCurrency?.code ? String(baseCurrency.code).split(" ")[0] : "USD");

const formatMoney = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatTransactionSourceType = (value: unknown): string => {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return "Journal";

  const map: Record<string, string> = {
    invoice: "Invoice",
    credit_note: "Credit Note",
    payment_received: "Payment Received",
    payment_made: "Payment Made",
    sales_receipt: "Sales Receipt",
    bill: "Bill",
    expense: "Expense",
    manual_journal: "Journal",
    journal: "Journal",
  };

  if (map[raw]) return map[raw];

  return raw
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

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

  const balanceSuffix =
    balance >= 0 ? (isDebitType ? "Dr" : "Cr") : isDebitType ? "Cr" : "Dr";

  const currencyLabel = getCurrencyLabel(baseCurrency);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "grid",
        gridTemplateColumns: "300px minmax(0, 1fr)",
        backgroundColor: brand.canvas,
      }}
    >
      <aside
        style={{
          backgroundColor: brand.panel,
          borderRight: `1px solid ${brand.border}`,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "22px",
            borderBottom: `1px solid ${brand.border}`,
            backgroundColor: brand.primarySoftAlt,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: 800,
                  color: brand.text,
                }}
              >
                Accounts
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "13px",
                  color: brand.muted,
                  lineHeight: 1.5,
                }}
              >
                Select an account to view its balance and transactions.
              </p>
            </div>

            <button
              type="button"
              onClick={onNewAccount}
              title="New Account"
              style={{
                border: "none",
                borderRadius: "14px",
                width: "42px",
                height: "42px",
                backgroundColor: brand.primary,
                color: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 20px rgba(21, 99, 114, 0.22)",
              }}
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div style={{ padding: "14px" }}>
          {accounts.map((account) => {
            const accountId = account.id || account._id || account.accountName;

            const isActive =
              accountId ===
              (selectedAccount.id ||
                selectedAccount._id ||
                selectedAccount.accountName);

            return (
              <button
                key={accountId}
                type="button"
                onClick={() => onSelectAccount(account)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: `1px solid ${
                    isActive ? brand.primary : brand.border
                  }`,
                  backgroundColor: isActive ? brand.primarySoft : "#ffffff",
                  borderRadius: "14px",
                  padding: "14px 15px",
                  marginBottom: "10px",
                  cursor: "pointer",
                  boxShadow: isActive
                    ? "0 10px 22px rgba(21, 99, 114, 0.12)"
                    : "none",
                  transition: "all 0.18s ease",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 800,
                    color: brand.text,
                    lineHeight: 1.35,
                  }}
                >
                  {account.name}
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "12px",
                    color: isActive ? brand.primaryDark : brand.muted,
                  }}
                >
                  {account.type}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main
        style={{
          padding: "24px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
            display: "grid",
            gap: "18px",
          }}
        >
          <section
            style={{
              backgroundColor: brand.panel,
              borderRadius: "22px",
              border: `1px solid ${brand.border}`,
              boxShadow: brand.shadow,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "24px 26px",
                borderBottom: `1px solid ${brand.border}`,
                backgroundColor: brand.primarySoftAlt,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "18px",
              }}
            >
              <div>
                <span
                  style={{
                    display: "inline-flex",
                    padding: "6px 10px",
                    borderRadius: "999px",
                    backgroundColor: brand.primarySoft,
                    color: brand.primaryDark,
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  {selectedAccount.type}
                </span>

                <h1
                  style={{
                    margin: "12px 0 0",
                    fontSize: "28px",
                    lineHeight: 1.15,
                    fontWeight: 900,
                    color: brand.text,
                  }}
                >
                  {selectedAccount.name}
                </h1>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => onEdit(selectedAccount)}
                  style={{
                    border: `1px solid ${brand.border}`,
                    borderRadius: "12px",
                    backgroundColor: "#ffffff",
                    color: brand.text,
                    padding: "10px 13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  <Pencil size={15} />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(selectedAccount)}
                  style={{
                    border: "1px solid rgba(220, 38, 38, 0.2)",
                    borderRadius: "12px",
                    backgroundColor: brand.dangerSoft,
                    color: brand.danger,
                    padding: "10px 13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  <Trash2 size={15} />
                  Delete
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  title="Close"
                  style={{
                    border: `1px solid ${brand.border}`,
                    borderRadius: "12px",
                    backgroundColor: "#ffffff",
                    color: brand.muted,
                    padding: "10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div
              style={{
                padding: "22px 26px",
                display: "grid",
                gridTemplateColumns: "1.3fr 1fr 1fr",
                gap: "14px",
              }}
            >
              <div
                style={{
                  padding: "20px",
                  borderRadius: "18px",
                  backgroundColor: brand.primary,
                  color: "#ffffff",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    opacity: 0.86,
                  }}
                >
                  Closing Balance
                </p>

                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: "26px",
                    fontWeight: 900,
                  }}
                >
                  {currencyLabel} {formatMoney(Math.abs(balance))}{" "}
                  <span style={{ fontSize: "15px" }}>({balanceSuffix})</span>
                </p>
              </div>

              <div
                style={{
                  padding: "20px",
                  borderRadius: "18px",
                  backgroundColor: brand.primarySoftAlt,
                  border: `1px solid ${brand.border}`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    color: brand.muted,
                    textTransform: "uppercase",
                  }}
                >
                  Total Debit
                </p>

                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: "23px",
                    fontWeight: 900,
                    color: brand.text,
                  }}
                >
                  {currencyLabel} {formatMoney(transactionTotals.debit)}
                </p>
              </div>

              <div
                style={{
                  padding: "20px",
                  borderRadius: "18px",
                  backgroundColor: brand.primarySoftAlt,
                  border: `1px solid ${brand.border}`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    color: brand.muted,
                    textTransform: "uppercase",
                  }}
                >
                  Total Credit
                </p>

                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: "23px",
                    fontWeight: 900,
                    color: brand.text,
                  }}
                >
                  {currencyLabel} {formatMoney(transactionTotals.credit)}
                </p>
              </div>
            </div>

            {selectedAccount.description && (
              <div
                style={{
                  margin: "0 26px 24px",
                  padding: "18px 20px",
                  borderRadius: "16px",
                  backgroundColor: brand.primarySoftAlt,
                  border: `1px solid ${brand.border}`,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: 800,
                    color: brand.text,
                  }}
                >
                  Description
                </h3>

                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    color: brand.muted,
                  }}
                >
                  {selectedAccount.description}
                </p>
              </div>
            )}
          </section>

          <section
            style={{
              backgroundColor: brand.panel,
              borderRadius: "22px",
              border: `1px solid ${brand.border}`,
              boxShadow: brand.shadow,
              padding: "22px",
            }}
          >
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
                <h3
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: 900,
                    color: brand.text,
                  }}
                >
                  Recent Transactions
                </h3>

                <p
                  style={{
                    margin: "5px 0 0",
                    fontSize: "13px",
                    color: brand.muted,
                  }}
                >
                  Latest activity linked to this account.
                </p>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  padding: "4px",
                  borderRadius: "12px",
                  backgroundColor: brand.primarySoftAlt,
                  border: `1px solid ${brand.border}`,
                  gap: "4px",
                }}
              >
                <button
                  type="button"
                  style={{
                    border: "none",
                    backgroundColor: brand.primary,
                    color: "#ffffff",
                    padding: "7px 12px",
                    borderRadius: "9px",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  FCY
                </button>

                <button
                  type="button"
                  style={{
                    border: "none",
                    backgroundColor: "transparent",
                    color: brand.muted,
                    padding: "7px 12px",
                    borderRadius: "9px",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  BCY
                </button>
              </div>
            </div>

            {isTransactionsLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "46px 0",
                }}
              >
                <Loader2 className="animate-spin" size={28} color={brand.primary} />
              </div>
            ) : accountTransactions.length === 0 ? (
              <div
                style={{
                  padding: "38px 32px",
                  borderRadius: "18px",
                  backgroundColor: brand.primarySoftAlt,
                  border: `1px dashed ${brand.border}`,
                  textAlign: "center",
                  color: brand.muted,
                  fontSize: "15px",
                }}
              >
                There are no transactions available for this account yet.
              </div>
            ) : (
              <>
                <div
                  style={{
                    overflowX: "auto",
                    border: `1px solid ${brand.border}`,
                    borderRadius: "16px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: `1px solid ${brand.border}`,
                          textAlign: "left",
                          backgroundColor: brand.primarySoftAlt,
                        }}
                      >
                        {["Date", "Transaction Details", "Type", "Debit", "Credit"].map(
                          (heading) => (
                            <th
                              key={heading}
                              style={{
                                padding: "13px 16px",
                                fontSize: "11px",
                                fontWeight: 900,
                                color: brand.muted,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                textAlign:
                                  heading === "Debit" || heading === "Credit"
                                    ? "right"
                                    : "left",
                              }}
                            >
                              {heading}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {accountTransactions.map((transaction, index) => {
                        const line = getAccountLine(transaction, selectedAccount);

                        return (
                          <tr
                            key={`${transaction._id || transaction.id || index}`}
                            style={{
                              borderBottom: "1px solid #edf4f5",
                              cursor: "pointer",
                              backgroundColor:
                                index % 2 === 0 ? "#ffffff" : brand.primarySoftAlt,
                            }}
                            onClick={onOpenTransactionReport}
                          >
                            <td
                              style={{
                                padding: "15px 16px",
                                fontSize: "14px",
                                color: brand.text,
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {new Date(transaction.date).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                },
                              )}
                            </td>

                            <td
                              style={{
                                padding: "15px 16px",
                                fontSize: "14px",
                                color: brand.text,
                              }}
                            >
                              {transaction.description ||
                                transaction.reference ||
                                "Manual Journal"}
                            </td>

                            <td
                              style={{
                                padding: "15px 16px",
                                fontSize: "14px",
                                color: brand.muted,
                              }}
                            >
                              {formatTransactionSourceType(
                                transaction.sourceType || transaction.type,
                              )}
                            </td>

                            <td
                              style={{
                                padding: "15px 16px",
                                fontSize: "14px",
                                color: brand.text,
                                textAlign: "right",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {line?.debit
                                ? `${currencyLabel}${formatMoney(line.debit)}`
                                : ""}
                            </td>

                            <td
                              style={{
                                padding: "15px 16px",
                                fontSize: "14px",
                                color: brand.text,
                                textAlign: "right",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {line?.credit
                                ? `${currencyLabel}${formatMoney(line.credit)}`
                                : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot>
                      <tr
                        style={{
                          backgroundColor: brand.primarySoft,
                          fontWeight: 800,
                        }}
                      >
                        <td
                          colSpan={3}
                          style={{
                            padding: "15px 16px",
                            textAlign: "right",
                            color: brand.text,
                          }}
                        >
                          Total
                        </td>

                        <td
                          style={{
                            padding: "15px 16px",
                            textAlign: "right",
                            color: brand.text,
                          }}
                        >
                          {formatMoney(transactionTotals.debit)}
                        </td>

                        <td
                          style={{
                            padding: "15px 16px",
                            textAlign: "right",
                            color: brand.text,
                          }}
                        >
                          {formatMoney(transactionTotals.credit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div style={{ marginTop: "14px", textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={onOpenTransactionReport}
                    style={{
                      border: `1px solid ${brand.primary}`,
                      backgroundColor: brand.primarySoft,
                      color: brand.primaryDark,
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontWeight: 800,
                      cursor: "pointer",
                      padding: "10px 14px",
                    }}
                  >
                    Show more details
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}