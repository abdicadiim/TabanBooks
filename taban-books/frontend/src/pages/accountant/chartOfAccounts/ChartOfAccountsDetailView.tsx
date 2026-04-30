import React, { useMemo } from "react";
import {
  X,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Plus,
} from "lucide-react";
import { format } from "date-fns";

const brand = {
  primary: "#156372",
  primaryDark: "#0d4d59",
  primarySoft: "#e8f3f5",
  primarySoftAlt: "#f8fcfc",
  text: "#1e293b",
  muted: "#64748b",
  border: "#e2e8f0",
  white: "#ffffff",
  shadow: "0 4px 12px rgba(21, 99, 114, 0.08)",
};

interface ChartOfAccountsDetailViewProps {
  selectedAccount: any;
  accounts: any[];
  onSelectAccount: (account: any) => void;
  onNewAccount: () => void;
  onClose: () => void;
  onOpenTransactionReport: () => void;
}

export function ChartOfAccountsDetailView({
  selectedAccount,
  accounts,
  onSelectAccount,
  onNewAccount,
  onClose,
  onOpenTransactionReport,
}: ChartOfAccountsDetailViewProps) {
  const currencyLabel = "USD";

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  const accountTransactions = useMemo(() => {
    return selectedAccount?.transactions || [];
  }, [selectedAccount]);

  const transactionTotals = useMemo(() => {
    return accountTransactions.reduce(
      (acc: any, transaction: any) => {
        const line = transaction.lines?.find(
          (l: any) =>
            (l.account?._id || l.account?.id || l.account) ===
            (selectedAccount?._id || selectedAccount?.id),
        );
        if (line) {
          acc.debit += Number(line.debit || 0);
          acc.credit += Number(line.credit || 0);
        }
        return acc;
      },
      { debit: 0, credit: 0 },
    );
  }, [accountTransactions, selectedAccount]);

  const formatTransactionSourceType = (type: string) => {
    if (!type) return "Transaction";
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getAccountLine = (transaction: any, account: any) => {
    return transaction.lines?.find(
      (l: any) =>
        (l.account?._id || l.account?.id || l.account) ===
        (account?._id || account?.id),
    );
  };

  if (!selectedAccount) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          color: brand.muted,
          padding: "40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            backgroundColor: brand.primarySoft,
            padding: "24px",
            borderRadius: "50%",
            marginBottom: "20px",
          }}
        >
          <FileText size={48} color={brand.primary} />
        </div>
        <h3
          style={{
            fontSize: "20px",
            fontWeight: 800,
            color: brand.text,
            marginBottom: "12px",
          }}
        >
          Select an Account
        </h3>
        <p style={{ maxWidth: "320px", lineHeight: "1.6" }}>
          Select an account from the list to view its transaction history and
          detailed balance information.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        backgroundColor: "#f8fafc",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Sidebar with Account List */}
      <aside
        style={{
          width: "320px",
          borderRight: `1px solid ${brand.border}`,
          backgroundColor: brand.white,
          display: "flex",
          flexDirection: "column",
          boxShadow: "4px 0 10px rgba(0,0,0,0.02)",
          zIndex: 10,
        }}
      >
        <div
          style={{
            padding: "24px 20px",
            borderBottom: `1px solid ${brand.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{ fontSize: "16px", fontWeight: 800, color: brand.text }}
          >
            Accounts
          </h2>
          <button
            onClick={onNewAccount}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              backgroundColor: brand.primary,
              color: brand.white,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            title="New Account"
          >
            <Plus size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {accounts.map((account) => {
            const isActive =
              (account._id || account.id) ===
              (selectedAccount._id || selectedAccount.id);
            return (
              <div
                key={account._id || account.id}
                onClick={() => onSelectAccount(account)}
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  marginBottom: "6px",
                  backgroundColor: isActive ? brand.primarySoft : "transparent",
                  border: isActive
                    ? `1px solid ${brand.primarySoft}`
                    : "1px solid transparent",
                  transition: "all 0.2s",
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
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? brand.primary : brand.text,
                    }}
                  >
                    {account.name}
                  </span>
                  <ChevronRight
                    size={14}
                    color={isActive ? brand.primary : brand.muted}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "12px", color: brand.muted }}>
                    {account.code}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: brand.text,
                    }}
                  >
                    {currencyLabel} {formatMoney(account.balance)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header Toolbar */}
        <header
          style={{
            padding: "16px 32px",
            backgroundColor: brand.white,
            borderBottom: `1px solid ${brand.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                backgroundColor: brand.primarySoft,
                padding: "8px",
                borderRadius: "10px",
              }}
            >
              <FileText size={20} color={brand.primary} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: brand.text,
                  margin: 0,
                }}
              >
                {selectedAccount.name}
              </h1>
              <span style={{ fontSize: "13px", color: brand.muted }}>
                Account Details & Transactions
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                backgroundColor: brand.white,
                border: `1px solid ${brand.border}`,
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 700,
                color: brand.text,
                cursor: "pointer",
              }}
            >
              <Printer size={16} /> Print
            </button>
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                backgroundColor: brand.white,
                border: `1px solid ${brand.border}`,
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 700,
                color: "#ef4444",
                cursor: "pointer",
              }}
            >
              <X size={16} /> Close
            </button>
          </div>
        </header>

        <div style={{ padding: "32px" }}>
          {/* Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "24px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                backgroundColor: brand.white,
                padding: "24px",
                borderRadius: "20px",
                boxShadow: brand.shadow,
                border: "1px solid #f1f5f9",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <span style={{ fontSize: "14px", color: brand.muted }}>
                  Current Balance
                </span>
                <TrendingUp size={18} color="#10b981" />
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  color: brand.text,
                }}
              >
                {currencyLabel} {formatMoney(selectedAccount.balance)}
              </div>
            </div>

            <div
              style={{
                backgroundColor: brand.white,
                padding: "24px",
                borderRadius: "20px",
                boxShadow: brand.shadow,
                border: "1px solid #f1f5f9",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <span style={{ fontSize: "14px", color: brand.muted }}>
                  Account Type
                </span>
                <Clock size={18} color={brand.primary} />
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: brand.text,
                }}
              >
                {selectedAccount.type}
              </div>
            </div>

            <div
              style={{
                backgroundColor: brand.white,
                padding: "24px",
                borderRadius: "20px",
                boxShadow: brand.shadow,
                border: "1px solid #f1f5f9",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <span style={{ fontSize: "14px", color: brand.muted }}>
                  Account Code
                </span>
                <AlertCircle size={18} color="#f59e0b" />
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: brand.text,
                }}
              >
                {selectedAccount.code}
              </div>
            </div>
          </div>

          {/* Transactions Table Section */}
          <section
            style={{
              backgroundColor: brand.white,
              borderRadius: "20px",
              boxShadow: brand.shadow,
              border: "1px solid #f1f5f9",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "24px",
                borderBottom: `1px solid ${brand.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{ fontSize: "16px", fontWeight: 800, color: brand.text }}
              >
                Transaction History
              </h3>
            </div>

            {accountTransactions.length === 0 ? (
              <div style={{ padding: "80px 20px", textAlign: "center" }}>
                <Clock
                  size={40}
                  color={brand.muted}
                  style={{ marginBottom: "16px", opacity: 0.3 }}
                />
                <p style={{ color: brand.muted, fontSize: "14px" }}>
                  No transactions found for this account.
                </p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: "800px",
                    }}
                  >
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