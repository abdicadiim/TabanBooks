import type { AccountDetailController } from "../types";
import { PAYMENT_MODE_OPTIONS } from "../../../../utils/paymentModes";

type DepositToOtherAccountsSidebarProps = Pick<
  AccountDetailController,
  | "depositToOtherAccountsFormData"
  | "setDepositToOtherAccountsFormData"
  | "depositToOtherAccountsPaidViaOpen"
  | "setDepositToOtherAccountsPaidViaOpen"
  | "depositToOtherAccountsToAccountOpen"
  | "setDepositToOtherAccountsToAccountOpen"
  | "depositToOtherAccountsReceivedFromOpen"
  | "setDepositToOtherAccountsReceivedFromOpen"
  | "depositToOtherAccountsPaidViaRef"
  | "depositToOtherAccountsToAccountRef"
  | "depositToOtherAccountsReceivedFromRef"
  | "depositToOtherAccountsFileInputRef"
  | "bankAccountNames"
  | "customerNames"
  | "handleSaveDepositToOtherAccounts"
  | "setShowDepositToOtherAccountsSidebar"
>;

export function DepositToOtherAccountsSidebar(props: DepositToOtherAccountsSidebarProps) {
  const {
    depositToOtherAccountsFormData,
    setDepositToOtherAccountsFormData,
    depositToOtherAccountsPaidViaOpen,
    setDepositToOtherAccountsPaidViaOpen,
    depositToOtherAccountsToAccountOpen,
    setDepositToOtherAccountsToAccountOpen,
    depositToOtherAccountsReceivedFromOpen,
    setDepositToOtherAccountsReceivedFromOpen,
    depositToOtherAccountsPaidViaRef,
    depositToOtherAccountsToAccountRef,
    depositToOtherAccountsReceivedFromRef,
    depositToOtherAccountsFileInputRef,
    bankAccountNames,
    customerNames,
    handleSaveDepositToOtherAccounts,
    setShowDepositToOtherAccountsSidebar,
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
              Deposit To Other Accounts
            </h2>
            <button
              onClick={() => setShowDepositToOtherAccountsSidebar(false)}
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
                value={depositToOtherAccountsFormData.date}
                onChange={(e) => setDepositToOtherAccountsFormData({ ...depositToOtherAccountsFormData, date: e.target.value })}
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
                <div style={{
                  padding: "10px 14px",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#6b7280",
                  minWidth: "80px",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {depositToOtherAccountsFormData.currency}
                </div>
                <input
                  type="text"
                  value={depositToOtherAccountsFormData.amount}
                  onChange={(e) => setDepositToOtherAccountsFormData({ ...depositToOtherAccountsFormData, amount: e.target.value })}
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
              <button
                type="button"
                onClick={() => console.log("Split Amount")}
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
                Split Amount
              </button>
            </div>

            {/* Paid Via */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Paid Via
              </label>
              <div style={{ position: "relative" }} ref={depositToOtherAccountsPaidViaRef}>
                <button
                  type="button"
                  onClick={() => setDepositToOtherAccountsPaidViaOpen(!depositToOtherAccountsPaidViaOpen)}
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
                  <span>{depositToOtherAccountsFormData.paidVia || "Cash"}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {depositToOtherAccountsPaidViaOpen && (
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
                    {PAYMENT_MODE_OPTIONS.map((method) => (
                      <div
                        key={method}
                        onClick={() => {
                          setDepositToOtherAccountsFormData({ ...depositToOtherAccountsFormData, paidVia: method });
                          setDepositToOtherAccountsPaidViaOpen(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#111827",
                          backgroundColor: depositToOtherAccountsFormData.paidVia === method ? "#eff6ff" : "transparent"
                        }}
                        onMouseEnter={(e) => {
                          if (depositToOtherAccountsFormData.paidVia !== method) {
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (depositToOtherAccountsFormData.paidVia !== method) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        {method}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* To Account */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                To Account<span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ position: "relative" }} ref={depositToOtherAccountsToAccountRef}>
                <button
                  type="button"
                  onClick={() => setDepositToOtherAccountsToAccountOpen(!depositToOtherAccountsToAccountOpen)}
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
                    color: depositToOtherAccountsFormData.toAccount ? "#111827" : "#9ca3af"
                  }}
                >
                  <span>{depositToOtherAccountsFormData.toAccount || "Select an account"}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {depositToOtherAccountsToAccountOpen && (
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
                    {(bankAccountNames.length ? bankAccountNames : ["Petty Cash", "Main Account", "Savings Account", "Undeposited Funds"]).map((acc) => (
                      <div
                        key={acc}
                        onClick={() => {
                          setDepositToOtherAccountsFormData({ ...depositToOtherAccountsFormData, toAccount: acc });
                          setDepositToOtherAccountsToAccountOpen(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#111827",
                          backgroundColor: depositToOtherAccountsFormData.toAccount === acc ? "#eff6ff" : "transparent"
                        }}
                        onMouseEnter={(e) => {
                          if (depositToOtherAccountsFormData.toAccount !== acc) {
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (depositToOtherAccountsFormData.toAccount !== acc) {
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
            </div>

            {/* Received From */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Received From
              </label>
              <div style={{ position: "relative" }} ref={depositToOtherAccountsReceivedFromRef}>
                <button
                  type="button"
                  onClick={() => setDepositToOtherAccountsReceivedFromOpen(!depositToOtherAccountsReceivedFromOpen)}
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
                    color: depositToOtherAccountsFormData.receivedFrom ? "#111827" : "#9ca3af"
                  }}
                >
                  <span>{depositToOtherAccountsFormData.receivedFrom || "Select Customer"}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {depositToOtherAccountsReceivedFromOpen && (
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
                    {(customerNames.length ? customerNames : ["Customer 1", "Customer 2", "Customer 3", "Customer 4"]).map((customer) => (
                      <div
                        key={customer}
                        onClick={() => {
                          setDepositToOtherAccountsFormData({ ...depositToOtherAccountsFormData, receivedFrom: customer });
                          setDepositToOtherAccountsReceivedFromOpen(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#111827",
                          backgroundColor: depositToOtherAccountsFormData.receivedFrom === customer ? "#eff6ff" : "transparent"
                        }}
                        onMouseEnter={(e) => {
                          if (depositToOtherAccountsFormData.receivedFrom !== customer) {
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (depositToOtherAccountsFormData.receivedFrom !== customer) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        {customer}
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
                value={depositToOtherAccountsFormData.reference}
                onChange={(e) => setDepositToOtherAccountsFormData({ ...depositToOtherAccountsFormData, reference: e.target.value })}
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
                value={depositToOtherAccountsFormData.description}
                onChange={(e) => setDepositToOtherAccountsFormData({ ...depositToOtherAccountsFormData, description: e.target.value })}
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
                  fontSize: "12px",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1L7.5 4.5L11 6L7.5 7.5L6 11L4.5 7.5L1 6L4.5 4.5L6 1Z" stroke="#156372" strokeWidth="1.5" fill="none" />
                </svg>
                Associate Tags
              </button>
            </div>

            {/* Attachments */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Attachments
              </label>
              <input
                type="file"
                ref={depositToOtherAccountsFileInputRef}
                multiple
                accept="image/*,.pdf"
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  setDepositToOtherAccountsFormData({ ...depositToOtherAccountsFormData, files: [...depositToOtherAccountsFormData.files, ...files] });
                }}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => depositToOtherAccountsFileInputRef.current?.click()}
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
              onClick={() => setShowDepositToOtherAccountsSidebar(false)}
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
                handleSaveDepositToOtherAccounts();
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
