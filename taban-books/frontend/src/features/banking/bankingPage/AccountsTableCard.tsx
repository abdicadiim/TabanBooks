import { ACCOUNT_FILTER_OPTIONS } from "./constants";
import {
  formatCurrencyAmount,
  getAccountCurrencySymbol,
  getAccountDisplayName,
  getAccountId,
  getDisplayedBankBalance,
} from "./helpers";
import type { BankAccount, BankingPageController } from "./types";

type AccountsTableCardProps = {
  controller: BankingPageController;
};

const renderAccountIcon = (account: BankAccount) => {
  if (account.icon === "bank") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect
          x="1"
          y="5"
          width="14"
          height="9"
          rx="1"
          stroke="#10b981"
          strokeWidth="1.5"
          fill="none"
        />
        <path d="M1 8h14" stroke="#10b981" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="#6b7280" strokeWidth="1.5" fill="none" />
      <path
        d="M8 4v4l3 2"
        stroke="#6b7280"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export function AccountsTableCard({ controller }: AccountsTableCardProps) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
          ref={controller.activeAccountsDropdownRef}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827",
              margin: 0,
            }}
          >
            {controller.activeAccountsFilter}
          </h3>
          <button
            onClick={() =>
              controller.setActiveAccountsDropdownOpen(
                !controller.activeAccountsDropdownOpen,
              )
            }
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              borderRadius: "4px",
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "#f3f4f6";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{
                transform: controller.activeAccountsDropdownOpen
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <path
                d="M3.5 5.25l3.5 3.5 3.5-3.5"
                stroke="#156372"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {controller.activeAccountsDropdownOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: 0,
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow:
                  "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                zIndex: 1000,
                minWidth: "180px",
                overflow: "hidden",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {ACCOUNT_FILTER_OPTIONS.map((option) => {
                const isSelected = controller.activeAccountsFilter === option;
                return (
                  <div
                    key={option}
                    onClick={() => {
                      controller.setActiveAccountsFilter(option);
                      controller.setActiveAccountsDropdownOpen(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      color: isSelected ? "#2563eb" : "#111827",
                      transition: "background-color 0.15s ease",
                      backgroundColor: isSelected ? "#eff6ff" : "transparent",
                    }}
                    onMouseEnter={(event) => {
                      if (!isSelected) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (!isSelected) {
                        event.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <span>{option}</span>
                    {isSelected && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M13 4l-6 6-3-3"
                          stroke="#2563eb"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{
                position: "absolute",
                left: "12px",
                pointerEvents: "none",
              }}
            >
              <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" fill="none" />
              <path
                d="M11 11l-3-3"
                stroke="#9ca3af"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Search accounts..."
              value={controller.searchTerm}
              onChange={(event) => controller.setSearchTerm(event.target.value)}
              style={{
                padding: "8px 12px 8px 36px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                outline: "none",
                width: "200px",
              }}
              onFocus={(event) => {
                event.currentTarget.style.borderColor = "#156372";
                event.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(38, 99, 235, 0.1)";
              }}
              onBlur={(event) => {
                event.currentTarget.style.borderColor = "#d1d5db";
                event.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
        </div>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <th
              style={{
                textAlign: "left",
                padding: "12px 0",
                fontSize: "12px",
                fontWeight: "600",
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              ACCOUNT DETAILS
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "12px 0",
                fontSize: "12px",
                fontWeight: "600",
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              UNCATEGORIZED
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "12px 0",
                fontSize: "12px",
                fontWeight: "600",
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              AMOUNT IN BANK
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "12px 0",
                fontSize: "12px",
                fontWeight: "600",
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                AMOUNT IN TABAN
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    controller.setIsFindAccountModalOpen(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle
                      cx="7"
                      cy="7"
                      r="5"
                      stroke="#6b7280"
                      strokeWidth="1.5"
                      fill="none"
                    />
                    <path
                      d="M11 11l-3-3"
                      stroke="#6b7280"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "12px 0",
                fontSize: "12px",
                fontWeight: "600",
                color: "#6b7280",
                textTransform: "uppercase",
                width: "40px",
              }}
            />
          </tr>
        </thead>

        <tbody>
          {controller.filteredAccounts.map((account, index) => {
            const accountId =
              getAccountId(account) || `${getAccountDisplayName(account)}-${index}`;
            const currencySymbol = getAccountCurrencySymbol(account);

            return (
              <tr
                key={accountId}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <td
                  style={{
                    padding: "12px 0",
                    fontSize: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor:
                          account.icon === "bank" ? "#d1fae5" : "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {renderAccountIcon(account)}
                    </div>

                    <div>
                      <div
                        onClick={() => controller.navigateToAccount(account)}
                        style={{
                          color: "#156372",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        {getAccountDisplayName(account)}
                      </div>
                      {account.accountNumber && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            marginTop: "2px",
                          }}
                        >
                          {account.accountNumber}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td
                  style={{
                    padding: "12px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  {account.uncategorizedTransactions ?? account.uncategorized ?? 0}
                </td>

                <td
                  style={{
                    padding: "12px 0",
                    fontSize: "14px",
                    color: "#111827",
                  }}
                >
                  {formatCurrencyAmount(
                    currencySymbol,
                    getDisplayedBankBalance(account),
                  )}
                </td>

                <td
                  style={{
                    padding: "12px 0",
                    fontSize: "14px",
                    color: "#111827",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>
                      {formatCurrencyAmount(currencySymbol, Number(account.balance || 0))}
                    </span>

                    <div
                      style={{ position: "relative" }}
                      ref={controller.setAccountMenuRef(accountId)}
                    >
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          controller.toggleAccountMenu(accountId);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "50%",
                          width: "24px",
                          height: "24px",
                          transition: "background-color 0.2s ease",
                        }}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.backgroundColor = "#f3f4f6";
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle
                            cx="8"
                            cy="8"
                            r="7"
                            stroke="#6b7280"
                            strokeWidth="1.5"
                            fill="none"
                          />
                          <path
                            d="M5 6.5l3 3 3-3"
                            stroke="#6b7280"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      {controller.openAccountMenu === accountId && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "calc(100% + 4px)",
                            right: 0,
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow:
                              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                            zIndex: 1000,
                            minWidth: "200px",
                            overflow: "hidden",
                          }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {[
                            {
                              label: "Edit Account",
                              action: () => controller.editAccount(account),
                            },
                            {
                              label: "View Transactions",
                              action: () => controller.navigateToAccount(account),
                            },
                            {
                              label: "Find Your Account",
                              action: () => controller.setIsFindAccountModalOpen(true),
                            },
                          ].map((item, menuIndex) => (
                            <div
                              key={item.label}
                              onClick={() => {
                                item.action();
                                controller.toggleAccountMenu(accountId);
                              }}
                              style={{
                                padding: "10px 14px",
                                cursor: "pointer",
                                fontSize: "14px",
                                color: menuIndex === 0 ? "white" : "#111827",
                                transition: "background-color 0.15s ease",
                                backgroundColor:
                                  menuIndex === 0 ? "#156372" : "transparent",
                              }}
                              onMouseEnter={(event) => {
                                if (menuIndex === 0) {
                                  event.currentTarget.style.backgroundColor = "#156372";
                                  event.currentTarget.style.color = "white";
                                } else {
                                  event.currentTarget.style.backgroundColor = "#f3f4f6";
                                }
                              }}
                              onMouseLeave={(event) => {
                                event.currentTarget.style.backgroundColor =
                                  menuIndex === 0 ? "#156372" : "transparent";
                                event.currentTarget.style.color =
                                  menuIndex === 0 ? "white" : "#111827";
                              }}
                            >
                              {item.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
