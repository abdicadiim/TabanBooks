import React, { useState, useRef, useEffect } from "react";
import { Plus, ChevronDown, ChevronRight, Search, GripVertical } from "lucide-react";

type AccountTypeId = "asset" | "liability" | "equity" | "income" | "expense";

interface AccountTypeRow {
  name: string;
  info: boolean;
  mappedAccount: string;
}

interface AccountTypeSection {
  id: AccountTypeId;
  name: string;
  icon: string;
  color: string;
  accounts: AccountTypeRow[];
}

interface AccountCategory {
  category: string;
  items: string[];
}

interface NewAccountFormState {
  name: string;
  code: string;
  type: string;
  category: string;
}

type ExpandedSectionsState = Record<AccountTypeId, boolean>;
type DropdownOpenState = Record<string, boolean>;
type AccountSearchState = Record<string, string>;
type DropdownRefsState = Record<string, HTMLDivElement | null>;

const accountTypes: AccountTypeSection[] = [
  {
    id: "asset",
    name: "Asset",
    icon: "💎",
    color: "#ec4899",
    accounts: [
      { name: "Vendor Advances", info: true, mappedAccount: "Prepaid Expenses" }
    ]
  },
  {
    id: "liability",
    name: "Liability",
    icon: "🛡️",
    color: "#a855f7",
    accounts: [
      { name: "Customer Advances", info: false, mappedAccount: "Unearned Revenue" }
    ]
  },
  {
    id: "equity",
    name: "Equity",
    icon: "⭐",
    color: "#156372",
    accounts: []
  },
  {
    id: "income",
    name: "Income",
    icon: "💰",
    color: "#10b981",
    accounts: []
  },
  {
    id: "expense",
    name: "Expense",
    icon: "📊",
    color: "#f59e0b",
    accounts: []
  }
];

const allAccounts: AccountCategory[] = [
  { category: "Other Current Asset", items: ["Advance Tax", "Employee Advance", "Prepaid Expenses", "Sales to Customers (Cash)"] },
  { category: "Cash", items: ["Cash", "Petty Cash", "Undeposited Funds"] },
  { category: "Accounts Receivable", items: ["Accounts Receivable"] },
  { category: "Other Current Liability", items: ["Employee Reimbursements", "Opening Balance Adjustments", "Tax Payable", "Unearned Revenue"] },
  { category: "Accounts Payable", items: ["Accounts Payable"] }
];

function DefaultAccountTracking() {
  const [accountTypesState, setAccountTypesState] = useState<AccountTypeSection[]>(accountTypes);
  const [expandedSections, setExpandedSections] = useState<ExpandedSectionsState>({
    asset: true,
    liability: false,
    equity: false,
    income: false,
    expense: false,
  });
  const [openDropdowns, setOpenDropdowns] = useState<DropdownOpenState>({});
  const [accountSearch, setAccountSearch] = useState<AccountSearchState>({});
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [newAccountData, setNewAccountData] = useState<NewAccountFormState>({
    name: "",
    code: "",
    type: "",
    category: ""
  });
  const dropdownRefs = useRef<DropdownRefsState>({});

  const toggleSection = (sectionId: AccountTypeId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const toggleDropdown = (accountTypeId: AccountTypeId, accountIndex: number) => {
    const key = `${accountTypeId}-${accountIndex}`;
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    if (!openDropdowns[key]) {
      setAccountSearch(prev => ({ ...prev, [key]: "" }));
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;

      Object.keys(dropdownRefs.current).forEach(key => {
        const ref = dropdownRefs.current[key];
        if (ref && !ref.contains(target)) {
          setOpenDropdowns(prev => ({ ...prev, [key]: false }));
        }
      });
    }

    if (Object.keys(openDropdowns).some(key => openDropdowns[key])) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdowns]);

  const handleAccountSelect = (
    accountTypeId: AccountTypeId,
    accountIndex: number,
    selectedAccount: string,
  ) => {
    // Update the mapped account in state
    setAccountTypesState(prev => prev.map(accountType => {
      if (accountType.id === accountTypeId) {
        const updatedAccounts = [...accountType.accounts];
        updatedAccounts[accountIndex] = {
          ...updatedAccounts[accountIndex],
          mappedAccount: selectedAccount
        };
        return { ...accountType, accounts: updatedAccounts };
      }
      return accountType;
    }));
    const key = `${accountTypeId}-${accountIndex}`;
    setOpenDropdowns(prev => ({ ...prev, [key]: false }));
  };

  const getFilteredAccounts = (searchKey: string): AccountCategory[] => {
    const search = accountSearch[searchKey] || "";
    if (!search) return allAccounts;

    return allAccounts.map(category => ({
      ...category,
      items: category.items.filter(item =>
        item.toLowerCase().includes(search.toLowerCase()) ||
        category.category.toLowerCase().includes(search.toLowerCase())
      )
    })).filter(category => category.items.length > 0);
  };

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{
          fontSize: "18px",
          fontWeight: "600",
          marginBottom: "8px",
          color: "#111827"
        }}>
          Select Default Accounts for Each Account Type
        </h2>
        <p style={{
          fontSize: "14px",
          color: "#6b7280",
          margin: 0
        }}>
          The default accounts you select here will automatically be applied when you create new transactions.
        </p>
      </div>

      {/* Account Type Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {accountTypesState.map((accountType) => (
          <div
            key={accountType.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              overflow: "hidden"
            }}
          >
            {/* Section Header */}
            <div
              onClick={() => toggleSection(accountType.id)}
              style={{
                padding: "16px 20px",
                backgroundColor: "#f9fafb",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                borderBottom: expandedSections[accountType.id] ? "1px solid #e5e7eb" : "none"
              }}
            >
              {expandedSections[accountType.id] ? (
                <ChevronDown size={20} color="#6b7280" />
              ) : (
                <ChevronRight size={20} color="#6b7280" />
              )}
              <span style={{ fontSize: "24px" }}>{accountType.icon}</span>
              <h3 style={{
                fontSize: "16px",
                fontWeight: "600",
                margin: 0,
                color: "#111827"
              }}>
                {accountType.name}
              </h3>
            </div>

            {/* Section Content */}
            {expandedSections[accountType.id] && (
              <div style={{ padding: "20px" }}>
                {accountType.accounts.length > 0 ? (
                  <div style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    overflow: "hidden"
                  }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead style={{ backgroundColor: "#f9fafb" }}>
                        <tr>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#374151",
                            textTransform: "uppercase",
                            borderBottom: "1px solid #e5e7eb"
                          }}>
                            ACCOUNTS
                          </th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#374151",
                            textTransform: "uppercase",
                            borderBottom: "1px solid #e5e7eb"
                          }}>
                            MAPPED ACCOUNTS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {accountType.accounts.map((account, index) => {
                          const dropdownKey = `${accountType.id}-${index}`;
                          const isOpen = openDropdowns[dropdownKey];
                          return (
                            <tr key={index} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span>{account.name}</span>
                                  {account.info && (
                                    <span style={{
                                      width: "16px",
                                      height: "16px",
                                      borderRadius: "50%",
                                      background: "#e5e7eb",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "10px",
                                      color: "#6b7280",
                                      cursor: "help"
                                    }}>
                                      i
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <div
                                  ref={(el) => {
                                    if (el) dropdownRefs.current[dropdownKey] = el;
                                  }}
                                  style={{ position: "relative", width: "100%" }}
                                >
                                  <div
                                    onClick={() => toggleDropdown(accountType.id, index)}
                                    style={{
                                      padding: "8px 12px",
                                      border: isOpen ? "2px solid #156372" : "1px solid #e5e7eb",
                                      borderRadius: "6px",
                                      fontSize: "14px",
                                      background: "white",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      color: "#111827"
                                    }}
                                  >
                                    <span>{account.mappedAccount || "Select account"}</span>
                                    <ChevronDown
                                      size={16}
                                      style={{
                                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                        transition: "transform 0.2s"
                                      }}
                                    />
                                  </div>

                                  {isOpen && (
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: "calc(100% + 4px)",
                                        left: 0,
                                        right: 0,
                                        backgroundColor: "white",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "8px",
                                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                                        zIndex: 1000,
                                        maxHeight: "300px",
                                        display: "flex",
                                        flexDirection: "column",
                                        overflow: "hidden"
                                      }}
                                    >
                                      {/* Search Bar */}
                                      <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
                                        <div style={{ position: "relative" }}>
                                          <Search
                                            size={16}
                                            style={{
                                              position: "absolute",
                                              left: "8px",
                                              top: "50%",
                                              transform: "translateY(-50%)",
                                              color: "#9ca3af"
                                            }}
                                          />
                                          <input
                                            type="text"
                                            placeholder="Search"
                                            value={accountSearch[dropdownKey] || ""}
                                            onChange={(e) => setAccountSearch(prev => ({ ...prev, [dropdownKey]: e.target.value }))}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                              width: "100%",
                                              padding: "6px 8px 6px 32px",
                                              border: "1px solid #e5e7eb",
                                              borderRadius: "4px",
                                              fontSize: "13px",
                                              outline: "none"
                                            }}
                                            autoFocus
                                          />
                                        </div>
                                      </div>

                                      {/* Account List */}
                                      <div style={{ overflowY: "auto", maxHeight: "240px" }}>
                                        {getFilteredAccounts(dropdownKey).map((category) => (
                                          <div key={category.category}>
                                            <div style={{
                                              padding: "8px 12px",
                                              fontSize: "11px",
                                              fontWeight: "700",
                                              color: "#4b5563",
                                              backgroundColor: "#f9fafb",
                                              textTransform: "uppercase",
                                              borderBottom: "1px solid #e5e7eb"
                                            }}>
                                              {category.category}
                                            </div>
                                            {category.items.map((item) => (
                                              <div
                                                key={item}
                                                onClick={() => handleAccountSelect(accountType.id, index, item)}
                                                style={{
                                                  padding: "10px 12px",
                                                  cursor: "pointer",
                                                  fontSize: "14px",
                                                  backgroundColor: account.mappedAccount === item ? "#156372" : "transparent",
                                                  color: account.mappedAccount === item ? "white" : "#111827",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "space-between"
                                                }}
                                                onMouseEnter={(e) => {
                                                  if (account.mappedAccount !== item) {
                                                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                                                  }
                                                }}
                                                onMouseLeave={(e) => {
                                                  if (account.mappedAccount !== item) {
                                                    e.currentTarget.style.backgroundColor = "transparent";
                                                  }
                                                }}
                                              >
                                                <span>{item}</span>
                                                {account.mappedAccount === item && (
                                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M13.5 4.5l-7 7-3.5-3.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                                  </svg>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ))}
                                      </div>

                                      {/* New Account Button */}
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsNewAccountModalOpen(true);
                                        }}
                                        style={{
                                          padding: "10px 12px",
                                          borderTop: "1px solid #e5e7eb",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                          color: "#156372",
                                          backgroundColor: "#f9fafb"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                                      >
                                        <Plus size={16} />
                                        <span style={{ fontSize: "14px", fontWeight: "500" }}>New Account</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                    No accounts configured for this account type.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div style={{
        marginTop: "32px",
        paddingTop: "24px",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "flex-start"
      }}>
        <button
          onClick={() => {
            // Save settings
            alert("Settings saved!");
          }}
          style={{
            padding: "10px 24px",
            backgroundColor: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#b91c1c"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#dc2626"}
        >
          Save
        </button>
      </div>

      {/* New Account Modal */}
      {isNewAccountModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setIsNewAccountModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "500px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 24px",
              borderBottom: "1px solid #e5e7eb"
            }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0, color: "#111827" }}>
                New Account
              </h2>
              <button
                onClick={() => setIsNewAccountModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#ef4444",
                  marginBottom: "8px"
                }}>
                  Account Name<span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={newAccountData.name}
                  onChange={(e) => setNewAccountData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter account name"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#156372"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#111827",
                  marginBottom: "8px"
                }}>
                  Account Code
                </label>
                <input
                  type="text"
                  value={newAccountData.code}
                  onChange={(e) => setNewAccountData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Enter account code"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#156372"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#ef4444",
                  marginBottom: "8px"
                }}>
                  Account Type<span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={newAccountData.type}
                  onChange={(e) => setNewAccountData(prev => ({ ...prev, type: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                >
                  <option value="">Select account type</option>
                  {accountTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#111827",
                  marginBottom: "8px"
                }}>
                  Category
                </label>
                <select
                  value={newAccountData.category}
                  onChange={(e) => setNewAccountData(prev => ({ ...prev, category: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                >
                  <option value="">Select category</option>
                  {allAccounts.map(cat => (
                    <option key={cat.category} value={cat.category}>{cat.category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              padding: "16px 24px",
              borderTop: "1px solid #e5e7eb"
            }}>
              <button
                onClick={() => setIsNewAccountModalOpen(false)}
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "500",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ffffff"}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newAccountData.name || !newAccountData.type) {
                    alert("Please fill in all required fields");
                    return;
                  }
                  // Save new account
                  alert("Account created successfully!");
                  setIsNewAccountModalOpen(false);
                  setNewAccountData({ name: "", code: "", type: "", category: "" });
                }}
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "500",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#b91c1c"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#dc2626"}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DefaultAccountTracking;
