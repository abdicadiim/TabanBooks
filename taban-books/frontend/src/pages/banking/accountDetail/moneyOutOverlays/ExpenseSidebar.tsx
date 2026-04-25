import type { AccountDetailController } from "../types";

type ExpenseSidebarProps = Pick<
  AccountDetailController,
  | "expenseFormData"
  | "setExpenseFormData"
  | "expenseAccountOpen"
  | "setExpenseAccountOpen"
  | "vendorOpen"
  | "setVendorOpen"
  | "customerOpen"
  | "setCustomerOpen"
  | "currencyOpen"
  | "setCurrencyOpen"
  | "expenseAccountRef"
  | "vendorRef"
  | "customerRef"
  | "currencyRef"
  | "fileInputRef"
  | "resolvedBaseCurrency"
  | "vendorNames"
  | "customerNames"
  | "handleSaveExpense"
  | "setShowExpenseSidebar"
>;

export function ExpenseSidebar(props: ExpenseSidebarProps) {
  const {
    expenseFormData,
    setExpenseFormData,
    expenseAccountOpen,
    setExpenseAccountOpen,
    vendorOpen,
    setVendorOpen,
    customerOpen,
    setCustomerOpen,
    currencyOpen,
    setCurrencyOpen,
    expenseAccountRef,
    vendorRef,
    customerRef,
    currencyRef,
    fileInputRef,
    resolvedBaseCurrency,
    vendorNames,
    customerNames,
    handleSaveExpense,
    setShowExpenseSidebar,
  } = props;

  return (
<div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "500px",
            backgroundColor: "white",
            boxShadow: "-4px 0 6px rgba(0, 0, 0, 0.1)",
            zIndex: 10001,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto"
          }}
        >
          {/* Header */}
          <div style={{
            padding: "24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <h2 style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#111827",
              margin: 0
            }}>
              Expense
            </h2>
            <button
              onClick={() => setShowExpenseSidebar(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px"
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5l10 10" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Form Content */}
          <div style={{
            padding: "24px",
            flex: 1,
            overflowY: "auto"
          }}>
            {/* Expense Account */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Expense Account<span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ position: "relative" }} ref={expenseAccountRef}>
                <button
                  type="button"
                  onClick={() => setExpenseAccountOpen(!expenseAccountOpen)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    background: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left"
                  }}
                >
                  <span>{expenseFormData.expenseAccount || "Select an account"}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {expenseAccountOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    zIndex: 1000,
                    maxHeight: "200px",
                    overflowY: "auto"
                  }}>
                    {["Cost of Goods Sold", "Advertising And Marketing", "Office Supplies", "Travel Expense", "Rent Expense", "Utilities"].map((acc) => (
                      <div
                        key={acc}
                        onClick={() => {
                          setExpenseFormData({ ...expenseFormData, expenseAccount: acc });
                          setExpenseAccountOpen(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#111827",
                          backgroundColor: expenseFormData.expenseAccount === acc ? "#eff6ff" : "transparent"
                        }}
                        onMouseEnter={(e) => {
                          if (expenseFormData.expenseAccount !== acc) {
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (expenseFormData.expenseAccount !== acc) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        {acc}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => console.log("Itemize")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#156372",
                  fontSize: "12px",
                  cursor: "pointer",
                  padding: "4px 0",
                  marginTop: "4px"
                }}
              >
                Itemize
              </button>
            </div>

            {/* Date */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Date<span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={expenseFormData.date}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                placeholder="dd/MM/yyyy"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#156372";
                  e.target.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Amount */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Amount<span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ position: "relative", flex: "0 0 80px" }} ref={currencyRef}>
                  <button
                    type="button"
                    onClick={() => setCurrencyOpen(!currencyOpen)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      background: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <span>{expenseFormData.currency}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {currencyOpen && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      backgroundColor: "white",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      zIndex: 1000,
                      maxHeight: "200px",
                      overflowY: "auto"
                    }}>
                      {[resolvedBaseCurrency].map((curr) => (
                        <div
                          key={curr}
                          onClick={() => {
                            setExpenseFormData({ ...expenseFormData, currency: curr });
                            setCurrencyOpen(false);
                          }}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: "#111827",
                            backgroundColor: expenseFormData.currency === curr ? "#eff6ff" : "transparent"
                          }}
                        >
                          {curr}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={expenseFormData.amount}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                  placeholder="0.00"
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#156372";
                    e.target.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Vendor */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Vendor
              </label>
              <div style={{ position: "relative" }} ref={vendorRef}>
                <button
                  type="button"
                  onClick={() => setVendorOpen(!vendorOpen)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    background: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                    color: expenseFormData.vendor ? "#111827" : "#9ca3af"
                  }}
                >
                  <span>{expenseFormData.vendor || "Select vendor"}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {vendorOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    zIndex: 1000,
                    maxHeight: "200px",
                    overflowY: "auto"
                  }}>
                    {(vendorNames.length ? vendorNames : ["Vendor 1", "Vendor 2", "Vendor 3"]).map((vendor) => (
                      <div
                        key={vendor}
                        onClick={() => {
                          setExpenseFormData({ ...expenseFormData, vendor });
                          setVendorOpen(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#111827"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        {vendor}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reference# */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Reference#
              </label>
              <input
                type="text"
                value={expenseFormData.reference}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, reference: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#156372";
                  e.target.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Description
              </label>
              <textarea
                value={expenseFormData.description}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                placeholder="Max. 500 characters"
                maxLength={500}
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#156372";
                  e.target.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Customer */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Customer
              </label>
              <div style={{ position: "relative" }} ref={customerRef}>
                <button
                  type="button"
                  onClick={() => setCustomerOpen(!customerOpen)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    background: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                    color: expenseFormData.customer ? "#111827" : "#9ca3af"
                  }}
                >
                  <span>{expenseFormData.customer || "Select customer"}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {customerOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    zIndex: 1000,
                    maxHeight: "200px",
                    overflowY: "auto"
                  }}>
                    {(customerNames.length ? customerNames : ["Customer 1", "Customer 2", "Customer 3"]).map((customer) => (
                      <div
                        key={customer}
                        onClick={() => {
                          setExpenseFormData({ ...expenseFormData, customer });
                          setCustomerOpen(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#111827"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        {customer}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reporting Tags */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Reporting Tags
              </label>
              <button
                type="button"
                onClick={() => console.log("Associate Tags")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#156372",
                  fontSize: "14px",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                Associate Tags
              </button>
            </div>

            {/* Attach Receipt */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Attach Receipt
              </label>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*,.pdf"
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  setExpenseFormData({ ...expenseFormData, files: [...expenseFormData.files, ...files] });
                }}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#111827"
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = "#156372";
                  e.target.style.backgroundColor = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.backgroundColor = "white";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Upload File
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p style={{
                fontSize: "12px",
                color: "#6b7280",
                margin: "8px 0 0 0"
              }}>
                You can upload a maximum of 5 files, 10MB each.
              </p>
            </div>
          </div>

          {/* Footer Buttons */}
          <div style={{
            padding: "24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px"
          }}>
            <button
              type="button"
              onClick={() => setShowExpenseSidebar(false)}
              style={{
                padding: "10px 20px",
                backgroundColor: "white",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                color: "#111827"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
                e.target.style.borderColor = "#9ca3af";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "white";
                e.target.style.borderColor = "#d1d5db";
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                handleSaveExpense();
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: "#156372",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#0e4a5e"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#156372"}
            >
              Save
            </button>
          </div>
        </div>
  );
}
