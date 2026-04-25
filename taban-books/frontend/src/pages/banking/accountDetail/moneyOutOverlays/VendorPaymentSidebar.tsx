import type { AccountDetailController } from "../types";
import { PAYMENT_MODE_OPTIONS } from "../../../../utils/paymentModes";

type VendorPaymentSidebarProps = Pick<
  AccountDetailController,
  | "vendorPaymentFormData"
  | "setVendorPaymentFormData"
  | "vendorPaymentVendorOpen"
  | "setVendorPaymentVendorOpen"
  | "vendorPaymentPaidViaOpen"
  | "setVendorPaymentPaidViaOpen"
  | "vendorPaymentVendorRef"
  | "vendorPaymentPaidViaRef"
  | "vendorNames"
  | "resolvedBaseCurrency"
  | "handleSaveVendorPayment"
  | "setShowVendorPaymentSidebar"
>;

export function VendorPaymentSidebar(props: VendorPaymentSidebarProps) {
  const {
    vendorPaymentFormData,
    setVendorPaymentFormData,
    vendorPaymentVendorOpen,
    setVendorPaymentVendorOpen,
    vendorPaymentPaidViaOpen,
    setVendorPaymentPaidViaOpen,
    vendorPaymentVendorRef,
    vendorPaymentPaidViaRef,
    vendorNames,
    resolvedBaseCurrency,
    handleSaveVendorPayment,
    setShowVendorPaymentSidebar,
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
              Vendor Payment
            </h2>
            <button
              onClick={() => {
                setShowVendorPaymentSidebar(false);
                setVendorPaymentFormData({
                  vendor: "",
                  paymentNumber: "2",
                  amount: "",
                  currency: resolvedBaseCurrency,
                  date: "29/12/2025",
                  bankCharges: "",
                  reference: "",
                  paidVia: "Cash",
                  description: "",
                  bills: [
                    { id: 1, billNumber: "56y", showPO: true, due: "KES322.00", dueDate: "13/12/2025", paymentAmount: "0" },
                    { id: 2, billNumber: "dxc(13 Dec 2025)", showPO: false, due: "KES322.00", dueDate: "13/12/2025", paymentAmount: "0" }
                  ]
                });
              }}
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
            {/* Payment Details Section */}
            <div style={{ marginBottom: "32px" }}>
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
                <div style={{ position: "relative" }} ref={vendorPaymentVendorRef}>
                  <button
                    type="button"
                    onClick={() => setVendorPaymentVendorOpen(!vendorPaymentVendorOpen)}
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
                      color: vendorPaymentFormData.vendor ? "#111827" : "#9ca3af"
                    }}
                  >
                    <span>{vendorPaymentFormData.vendor || "Select Vendor"}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {vendorPaymentVendorOpen && (
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
                            setVendorPaymentFormData({ ...vendorPaymentFormData, vendor });
                            setVendorPaymentVendorOpen(false);
                          }}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: "#111827",
                            backgroundColor: vendorPaymentFormData.vendor === vendor ? "#eff6ff" : "transparent"
                          }}
                          onMouseEnter={(e) => {
                            if (vendorPaymentFormData.vendor !== vendor) {
                              e.currentTarget.style.backgroundColor = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (vendorPaymentFormData.vendor !== vendor) {
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

              {/* Payment # */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#111827",
                  marginBottom: "8px"
                }}>
                  Payment #<span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="text"
                    value={vendorPaymentFormData.paymentNumber}
                    onChange={(e) => setVendorPaymentFormData({ ...vendorPaymentFormData, paymentNumber: e.target.value })}
                    disabled={!vendorPaymentFormData.vendor}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      outline: "none",
                      backgroundColor: !vendorPaymentFormData.vendor ? "#f9fafb" : "white",
                      color: !vendorPaymentFormData.vendor ? "#9ca3af" : "#111827",
                      cursor: !vendorPaymentFormData.vendor ? "not-allowed" : "text"
                    }}
                  />
                  <button
                    type="button"
                    disabled={!vendorPaymentFormData.vendor}
                    style={{
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      backgroundColor: !vendorPaymentFormData.vendor ? "#f9fafb" : "white",
                      cursor: !vendorPaymentFormData.vendor ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke={!vendorPaymentFormData.vendor ? "#9ca3af" : "#6b7280"} strokeWidth="1.5" fill="none" />
                      <path d="M8 5v3M8 10h.01" stroke={!vendorPaymentFormData.vendor ? "#9ca3af" : "#6b7280"} strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
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
                <input
                  type="text"
                  value={vendorPaymentFormData.amount}
                  onChange={(e) => setVendorPaymentFormData({ ...vendorPaymentFormData, amount: e.target.value })}
                  placeholder={resolvedBaseCurrency}
                  disabled={!vendorPaymentFormData.vendor}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none",
                    backgroundColor: !vendorPaymentFormData.vendor ? "#f9fafb" : "white",
                    color: !vendorPaymentFormData.vendor ? "#9ca3af" : "#111827",
                    cursor: !vendorPaymentFormData.vendor ? "not-allowed" : "text"
                  }}
                />
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
                  value={vendorPaymentFormData.date}
                  onChange={(e) => setVendorPaymentFormData({ ...vendorPaymentFormData, date: e.target.value })}
                  placeholder="dd/MM/yyyy"
                  disabled={!vendorPaymentFormData.vendor}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none",
                    backgroundColor: !vendorPaymentFormData.vendor ? "#f9fafb" : "white",
                    color: !vendorPaymentFormData.vendor ? "#9ca3af" : "#111827",
                    cursor: !vendorPaymentFormData.vendor ? "not-allowed" : "text"
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
                  value={vendorPaymentFormData.bankCharges}
                  onChange={(e) => setVendorPaymentFormData({ ...vendorPaymentFormData, bankCharges: e.target.value })}
                  disabled={!vendorPaymentFormData.vendor}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none",
                    backgroundColor: !vendorPaymentFormData.vendor ? "#f9fafb" : "white",
                    color: !vendorPaymentFormData.vendor ? "#9ca3af" : "#111827",
                    cursor: !vendorPaymentFormData.vendor ? "not-allowed" : "text"
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
                  value={vendorPaymentFormData.reference}
                  onChange={(e) => setVendorPaymentFormData({ ...vendorPaymentFormData, reference: e.target.value })}
                  disabled={!vendorPaymentFormData.vendor}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none",
                    backgroundColor: !vendorPaymentFormData.vendor ? "#f9fafb" : "white",
                    color: !vendorPaymentFormData.vendor ? "#9ca3af" : "#111827",
                    cursor: !vendorPaymentFormData.vendor ? "not-allowed" : "text"
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
                <div style={{ position: "relative" }} ref={vendorPaymentPaidViaRef}>
                  <button
                    type="button"
                    onClick={() => vendorPaymentFormData.vendor && setVendorPaymentPaidViaOpen(!vendorPaymentPaidViaOpen)}
                    disabled={!vendorPaymentFormData.vendor}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      background: !vendorPaymentFormData.vendor ? "#f9fafb" : "white",
                      cursor: !vendorPaymentFormData.vendor ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      textAlign: "left",
                      color: !vendorPaymentFormData.vendor ? "#9ca3af" : "#111827"
                    }}
                  >
                    <span>{vendorPaymentFormData.paidVia || "Cash"}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke={!vendorPaymentFormData.vendor ? "#9ca3af" : "#6b7280"} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {vendorPaymentPaidViaOpen && vendorPaymentFormData.vendor && (
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
                            setVendorPaymentFormData({ ...vendorPaymentFormData, paidVia: method });
                            setVendorPaymentPaidViaOpen(false);
                          }}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: "#111827",
                            backgroundColor: vendorPaymentFormData.paidVia === method ? "#eff6ff" : "transparent"
                          }}
                          onMouseEnter={(e) => {
                            if (vendorPaymentFormData.paidVia !== method) {
                              e.currentTarget.style.backgroundColor = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (vendorPaymentFormData.paidVia !== method) {
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
                  value={vendorPaymentFormData.description}
                  onChange={(e) => setVendorPaymentFormData({ ...vendorPaymentFormData, description: e.target.value })}
                  placeholder="Max. 500 characters"
                  maxLength={500}
                  rows={4}
                  disabled={!vendorPaymentFormData.vendor}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    backgroundColor: !vendorPaymentFormData.vendor ? "#f9fafb" : "white",
                    color: !vendorPaymentFormData.vendor ? "#9ca3af" : "#111827",
                    cursor: !vendorPaymentFormData.vendor ? "not-allowed" : "text"
                  }}
                />
              </div>
            </div>

            {/* Bill Details Section */}
            {vendorPaymentFormData.vendor && (
              <div style={{ marginBottom: "32px" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px"
                }}>
                  <h3 style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#111827",
                    margin: 0
                  }}>
                    Bill Details
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const updatedBills = vendorPaymentFormData.bills.map(bill => ({ ...bill, paymentAmount: "0" }));
                        setVendorPaymentFormData({ ...vendorPaymentFormData, bills: updatedBills });
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#156372",
                        fontSize: "12px",
                        cursor: "pointer",
                        padding: 0
                      }}
                    >
                      Clear Applied Amount
                    </button>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>Payment(KES)</span>
                  </div>
                </div>

                {vendorPaymentFormData.bills.map((bill) => (
                  <div key={bill.id} style={{
                    padding: "16px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    marginBottom: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: "#156372",
                        fontSize: "14px",
                        fontWeight: "500",
                        marginBottom: "4px",
                        cursor: "pointer"
                      }}>
                        {bill.billNumber}
                      </div>
                      {bill.showPO && (
                        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                          Show PO#
                        </div>
                      )}
                      <div style={{ fontSize: "14px", color: "#111827", marginBottom: "4px" }}>
                        Due {bill.due}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        {bill.dueDate}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <input
                        type="text"
                        value={bill.paymentAmount}
                        onChange={(e) => {
                          const updatedBills = vendorPaymentFormData.bills.map(b =>
                            b.id === bill.id ? { ...b, paymentAmount: e.target.value } : b
                          );
                          setVendorPaymentFormData({ ...vendorPaymentFormData, bills: updatedBills });
                        }}
                        style={{
                          width: "100px",
                          padding: "6px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          fontSize: "14px",
                          textAlign: "right"
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updatedBills = vendorPaymentFormData.bills.map(b =>
                            b.id === bill.id ? { ...b, paymentAmount: bill.due.replace("USD", "").trim() } : b
                          );
                          setVendorPaymentFormData({ ...vendorPaymentFormData, bills: updatedBills });
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#156372",
                          fontSize: "12px",
                          cursor: "pointer",
                          padding: 0
                        }}
                      >
                        Pay in Full
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary Section */}
            {vendorPaymentFormData.vendor && (
              <div style={{
                padding: "16px",
                backgroundColor: "#f9fafb",
                borderRadius: "6px",
                marginBottom: "24px"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid #e5e7eb"
                }}>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Total(KES):</span>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>0.00</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>Amount Paid</span>
                    <span style={{ fontSize: "13px", color: "#111827" }}>0.00</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>Amount used for Payments</span>
                    <span style={{ fontSize: "13px", color: "#111827" }}>0.00</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>Amount Refunded</span>
                    <span style={{ fontSize: "13px", color: "#111827" }}>0.00</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "13px", color: "#6b7280" }}>Amount in Excess</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2L2 14h12L8 2z" fill="#fbbf24" fillOpacity="0.2" />
                        <path d="M8 2L2 14h12L8 2z" stroke="#fbbf24" strokeWidth="1.5" fill="none" />
                        <path d="M8 6v2M8 10h.01" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span style={{ fontSize: "13px", color: "#111827" }}>KES 0.00</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>Bank Charges</span>
                    <span style={{ fontSize: "13px", color: "#111827" }}>KES 0.00</span>
                  </div>
                </div>
              </div>
            )}
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
              onClick={() => {
                setShowVendorPaymentSidebar(false);
                setVendorPaymentFormData({
                  vendor: "",
                  paymentNumber: "2",
                  amount: "",
                  currency: resolvedBaseCurrency,
                  date: "29/12/2025",
                  bankCharges: "",
                  reference: "",
                  paidVia: "Cash",
                  description: "",
                  bills: [
                    { id: 1, billNumber: "56y", showPO: true, due: "KES322.00", dueDate: "13/12/2025", paymentAmount: "0" },
                    { id: 2, billNumber: "dxc(13 Dec 2025)", showPO: false, due: "KES322.00", dueDate: "13/12/2025", paymentAmount: "0" }
                  ]
                });
              }}
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
                handleSaveVendorPayment();
              }}
              disabled={!vendorPaymentFormData.vendor}
              style={{
                padding: "10px 20px",
                backgroundColor: vendorPaymentFormData.vendor ? "#156372" : "#d1d5db",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: vendorPaymentFormData.vendor ? "pointer" : "not-allowed"
              }}
              onMouseEnter={(e) => {
                if (vendorPaymentFormData.vendor) {
                  e.target.style.backgroundColor = "#0e4a5e";
                }
              }}
              onMouseOut={(e) => {
                if (vendorPaymentFormData.vendor) {
                  e.target.style.backgroundColor = "#156372";
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
  );
}
