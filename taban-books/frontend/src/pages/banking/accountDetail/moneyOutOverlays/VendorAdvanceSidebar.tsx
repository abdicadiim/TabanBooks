import type { AccountDetailController } from "../types";
import { PAYMENT_MODE_OPTIONS } from "../../../../utils/paymentModes";

type VendorAdvanceSidebarProps = Pick<
  AccountDetailController,
  | "vendorAdvanceFormData"
  | "setVendorAdvanceFormData"
  | "vendorAdvanceVendorOpen"
  | "setVendorAdvanceVendorOpen"
  | "paidViaOpen"
  | "setPaidViaOpen"
  | "depositToOpen"
  | "setDepositToOpen"
  | "vendorAdvanceVendorRef"
  | "paidViaRef"
  | "depositToRef"
  | "vendorNames"
  | "bankAccountNames"
  | "handleSaveVendorAdvance"
  | "setShowVendorAdvanceSidebar"
>;

export function VendorAdvanceSidebar(props: VendorAdvanceSidebarProps) {
  const {
    vendorAdvanceFormData,
    setVendorAdvanceFormData,
    vendorAdvanceVendorOpen,
    setVendorAdvanceVendorOpen,
    paidViaOpen,
    setPaidViaOpen,
    depositToOpen,
    setDepositToOpen,
    vendorAdvanceVendorRef,
    paidViaRef,
    depositToRef,
    vendorNames,
    bankAccountNames,
    handleSaveVendorAdvance,
    setShowVendorAdvanceSidebar,
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
              Vendor Advance
            </h2>
            <button
              onClick={() => setShowVendorAdvanceSidebar(false)}
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
            {/* Vendor */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Vendor<span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ position: "relative" }} ref={vendorAdvanceVendorRef}>
                <button
                  type="button"
                  onClick={() => setVendorAdvanceVendorOpen(!vendorAdvanceVendorOpen)}
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
                    color: vendorAdvanceFormData.vendor ? "#111827" : "#9ca3af"
                  }}
                >
                  <span>{vendorAdvanceFormData.vendor || "Select Vendor"}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {vendorAdvanceVendorOpen && (
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
                    {(vendorNames.length ? vendorNames : ["Vendor 1", "Vendor 2", "Vendor 3", "Vendor 4"]).map((vendor) => (
                      <div
                        key={vendor}
                        onClick={() => {
                          setVendorAdvanceFormData({ ...vendorAdvanceFormData, vendor });
                          setVendorAdvanceVendorOpen(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#111827",
                          backgroundColor: vendorAdvanceFormData.vendor === vendor ? "#eff6ff" : "transparent"
                        }}
                        onMouseEnter={(e) => {
                          if (vendorAdvanceFormData.vendor !== vendor) {
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (vendorAdvanceFormData.vendor !== vendor) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        {vendor}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  {vendorAdvanceFormData.currency}
                </div>
                <input
                  type="text"
                  value={vendorAdvanceFormData.amount}
                  onChange={(e) => setVendorAdvanceFormData({ ...vendorAdvanceFormData, amount: e.target.value })}
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
                value={vendorAdvanceFormData.date}
                onChange={(e) => setVendorAdvanceFormData({ ...vendorAdvanceFormData, date: e.target.value })}
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

            {/* Bank Charges */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Bank Charges
                <div style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  backgroundColor: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "help"
                }}>
                  <span style={{ fontSize: "10px", color: "#6b7280", fontWeight: "600" }}>i</span>
                </div>
              </label>
              <input
                type="text"
                value={vendorAdvanceFormData.bankCharges}
                onChange={(e) => setVendorAdvanceFormData({ ...vendorAdvanceFormData, bankCharges: e.target.value })}
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
                value={vendorAdvanceFormData.reference}
                onChange={(e) => setVendorAdvanceFormData({ ...vendorAdvanceFormData, reference: e.target.value })}
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
              <div style={{ position: "relative" }} ref={paidViaRef}>
                <button
                  type="button"
                  onClick={() => setPaidViaOpen(!paidViaOpen)}
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
                  <span>{vendorAdvanceFormData.paidVia || "Cash"}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {paidViaOpen && (
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
                          setVendorAdvanceFormData({ ...vendorAdvanceFormData, paidVia: method });
                          setPaidViaOpen(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#111827",
                          backgroundColor: vendorAdvanceFormData.paidVia === method ? "#eff6ff" : "transparent"
                        }}
                        onMouseEnter={(e) => {
                          if (vendorAdvanceFormData.paidVia !== method) {
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (vendorAdvanceFormData.paidVia !== method) {
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

            {/* Deposit To */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Deposit To
              </label>
              <div style={{ position: "relative" }} ref={depositToRef}>
                <button
                  type="button"
                  onClick={() => setDepositToOpen(!depositToOpen)}
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
                    color: vendorAdvanceFormData.depositTo ? "#111827" : "#9ca3af"
                  }}
                >
                  <span>{vendorAdvanceFormData.depositTo || "Select account"}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {depositToOpen && (
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
                    {(bankAccountNames.length ? bankAccountNames : ["Petty Cash", "Main Account", "Savings Account"]).map((account) => (
                      <div
                        key={account}
                        onClick={() => {
                          setVendorAdvanceFormData({ ...vendorAdvanceFormData, depositTo: account });
                          setDepositToOpen(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#111827",
                          backgroundColor: vendorAdvanceFormData.depositTo === account ? "#eff6ff" : "transparent"
                        }}
                        onMouseEnter={(e) => {
                          if (vendorAdvanceFormData.depositTo !== account) {
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (vendorAdvanceFormData.depositTo !== account) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        {account}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                value={vendorAdvanceFormData.description}
                onChange={(e) => setVendorAdvanceFormData({ ...vendorAdvanceFormData, description: e.target.value })}
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
              onClick={() => setShowVendorAdvanceSidebar(false)}
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
                handleSaveVendorAdvance();
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
