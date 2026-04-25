import type { CSSProperties } from "react";
import type { MoneyInTransactionType } from "./helpers";
import { AccountDetailDashboardTab } from "./AccountDetailDashboardTab";
import { AccountDetailTransactionsTab } from "./AccountDetailTransactionsTab";
import { formatCurrencyAmount } from "./helpers";
import type { AccountDetailController } from "./types";

type AccountDetailMainContentProps = {
  controller: AccountDetailController;
};

const menuPanelStyle: CSSProperties = {
  position: "absolute",
  backgroundColor: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  zIndex: 1000,
  overflow: "hidden",
};

const secondaryIconButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "8px",
  display: "flex",
  alignItems: "center",
  borderRadius: "4px",
};

const openOptionStyle: CSSProperties = {
  padding: "10px 16px",
  cursor: "pointer",
  fontSize: "14px",
  color: "#111827",
  backgroundColor: "transparent",
};

function ActionMenu({
  actions,
  onSelect,
}: {
  actions: Array<{ label: string; action: () => void }>;
  onSelect: () => void;
}) {
  return (
    <>
      {actions.map((item, index) => (
        <div
          key={item.label}
          onClick={() => {
            item.action();
            onSelect();
          }}
          style={{
            padding: "10px 14px",
            cursor: "pointer",
            fontSize: "14px",
            color: index === 0 ? "white" : "#111827",
            backgroundColor: index === 0 ? "#156372" : "transparent",
          }}
        >
          {item.label}
        </div>
      ))}
    </>
  );
}

export function AccountDetailMainContent({ controller }: AccountDetailMainContentProps) {
  const {
    account,
    navigate,
    accountMenuRef,
    dropdownRef,
    settingsDropdownRef,
    isAccountMenuOpen,
    setIsAccountMenuOpen,
    isAddTransactionDropdownOpen,
    setIsAddTransactionDropdownOpen,
    isSettingsDropdownOpen,
    setIsSettingsDropdownOpen,
    moneyOutTransactionOptions,
    moneyInTransactionOptions,
    setShowTransferSidebar,
    setShowCardPaymentSidebar,
    setShowOwnerDrawingsSidebar,
    setShowTransferFromAnotherAccountSidebar,
    setMoneyInTransactionType,
    setShowMoneyInEntrySidebar,
    handleMarkInactive,
    setShowDeleteConfirm,
    selectedTransactions,
    handleDeleteSelectedTransactions,
    setSelectedTransactions,
    activeTab,
    setActiveTab,
    transactions,
    getTransactionId,
    formatTransactionTypeLabel,
    getTransactionCounterparty,
    setIsSearchModalOpen,
  } = controller;
  const accountActions = [
    {
      label: "Edit",
      action: () =>
        navigate("/banking/add-account/form", {
          state: {
            isEdit: true,
            account,
          },
        }),
    },
    {
      label: "Reconcile Account",
      action: () =>
        navigate(`/banking/account/${account?._id}/reconciliations`, {
          state: { account },
        }),
    },
    {
      label: "Mark as Inactive",
      action: () => {
        void handleMarkInactive();
      },
    },
    {
      label: "Delete",
      action: () => setShowDeleteConfirm(true),
    },
  ];

  const openMoneyOutFlow = (option: string) => {
    if (option === "Transfer To Another Account") {
      setShowTransferSidebar(true);
    } else if (option === "Card Payment") {
      setShowCardPaymentSidebar(true);
    } else if (option === "Owner Drawings") {
      setShowOwnerDrawingsSidebar(true);
    }

    setIsAddTransactionDropdownOpen(false);
  };

  const openMoneyInFlow = (option: string) => {
    if (option === "Transfer From Another Account") {
      setShowTransferFromAnotherAccountSidebar(true);
      setIsAddTransactionDropdownOpen(false);
      return;
    }

    const typeByOption: Record<string, MoneyInTransactionType> = {
      Deposit: "deposit",
      Refund: "refund",
      "Sales Without Invoices": "sales_without_invoices",
      "Interest Income": "interest_income",
      "Other Income": "other_income",
      "Expense Refund": "expense_refund",
      "Owner's Contribution": "owner_contribution",
    };

    const transactionType = typeByOption[option];
    if (transactionType) {
      setMoneyInTransactionType(transactionType);
      setShowMoneyInEntrySidebar(true);
    }

    setIsAddTransactionDropdownOpen(false);
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            position: "relative",
          }}
          ref={accountMenuRef}
        >
          <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#111827", margin: 0 }}>
            {account?.accountName || "Bank Account"}
          </h1>
          <button
            onClick={() => setIsAccountMenuOpen((current) => !current)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#156372" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {isAccountMenuOpen && (
            <div style={{ ...menuPanelStyle, bottom: "calc(100% + 8px)", left: 0, minWidth: "200px" }} onClick={(event) => event.stopPropagation()}>
              <ActionMenu actions={accountActions} onSelect={() => setIsAccountMenuOpen(false)} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              onClick={() => setIsAddTransactionDropdownOpen((current) => !current)}
              style={{
                padding: "8px 16px",
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
              <span>Add Transaction</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isAddTransactionDropdownOpen && (
              <div
                style={{
                  ...menuPanelStyle,
                  top: "calc(100% + 8px)",
                  right: 0,
                  minWidth: "280px",
                  maxHeight: "500px",
                  overflowY: "auto",
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <div>
                  <div
                    style={{
                      padding: "8px 16px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    Money Out
                  </div>
                  {moneyOutTransactionOptions.map((option) => (
                    <div key={option} onClick={() => openMoneyOutFlow(option)} style={openOptionStyle}>
                      {option}
                    </div>
                  ))}
                </div>

                <div>
                  <div
                    style={{
                      padding: "8px 16px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    Money In
                  </div>
                  {moneyInTransactionOptions.map((option) => (
                    <div key={option} onClick={() => openMoneyInFlow(option)} style={openOptionStyle}>
                      {option}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ position: "relative" }} ref={settingsDropdownRef}>
            <button onClick={() => setIsSettingsDropdownOpen((current) => !current)} style={secondaryIconButtonStyle}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 11.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill="#6b7280" />
                <path d="M17.66 9.2l-1.78-1.03.5-1.9a.5.5 0 00-.1-.5l-1.4-1.4a.5.5 0 00-.5-.1l-1.9.5-1.03-1.78a.5.5 0 00-.7 0L8.41 3.6a.5.5 0 000 .7l1.03 1.78-1.9.5a.5.5 0 00-.5.1l-1.4 1.4a.5.5 0 00-.1.5l.5 1.9-1.78 1.03a.5.5 0 000 .7l1.78 1.03-.5 1.9a.5.5 0 00.1.5l1.4 1.4a.5.5 0 00.5.1l1.9-.5 1.03 1.78a.5.5 0 00.7 0l1.03-1.78 1.9.5a.5.5 0 00.5-.1l1.4-1.4a.5.5 0 00.1-.5l-.5-1.9 1.78-1.03a.5.5 0 000-.7z" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isSettingsDropdownOpen && (
              <div style={{ ...menuPanelStyle, top: "calc(100% + 8px)", right: 0, minWidth: "200px" }} onClick={(event) => event.stopPropagation()}>
                <ActionMenu actions={accountActions} onSelect={() => setIsSettingsDropdownOpen(false)} />
              </div>
            )}
          </div>

          <button onClick={() => navigate("/banking")} style={secondaryIconButtonStyle}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "8px",
            backgroundColor: "#eff6ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="6" width="16" height="12" rx="2" stroke="#156372" strokeWidth="1.5" fill="none" />
            <path d="M4 10h16M8 6V4M16 6V4" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>Amount in Taban</div>
          <div style={{ fontSize: "20px", fontWeight: 600, color: "#111827" }}>
            {(account?.currencySymbol || "$")}
            {formatCurrencyAmount(account?.balance || 0)}
          </div>
        </div>
      </div>

      {selectedTransactions.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            marginBottom: "16px",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                void handleDeleteSelectedTransactions();
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: "#156372",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Delete
            </button>
            <span style={{ fontSize: "14px", color: "#111827", fontWeight: 500 }}>
              {selectedTransactions.length} Selected Transaction{selectedTransactions.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button onClick={() => setSelectedTransactions([])} style={secondaryIconButtonStyle}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "1px solid #e5e7eb" }}>
        {["Dashboard", "Transactions"].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "12px 16px",
                background: "none",
                border: "none",
                borderBottom: isActive ? "2px solid #156372" : "2px solid transparent",
                color: isActive ? "#156372" : "#6b7280",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {activeTab === "Transactions" ? (
        <AccountDetailTransactionsTab
          transactions={transactions}
          selectedTransactions={selectedTransactions}
          setSelectedTransactions={setSelectedTransactions}
          setIsSearchModalOpen={setIsSearchModalOpen}
          getTransactionId={getTransactionId}
          formatTransactionTypeLabel={formatTransactionTypeLabel}
          getTransactionCounterparty={getTransactionCounterparty}
        />
      ) : (
        <AccountDetailDashboardTab
          account={account}
          transactions={transactions}
          navigate={navigate}
          onViewAllTransactions={() => setActiveTab("Transactions")}
        />
      )}
    </div>
  );
}
