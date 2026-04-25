import type { AccountDetailController } from "../types";
import { MoneyInOverlayShell } from "./MoneyInOverlayShell";
import { PAYMENT_MODE_OPTIONS } from "../../../../utils/paymentModes";

type PaymentRefundSidebarProps = Pick<
  AccountDetailController,
  | "paymentRefundFormData"
  | "setPaymentRefundFormData"
  | "paymentRefundCustomerOpen"
  | "setPaymentRefundCustomerOpen"
  | "paymentRefundPaidViaOpen"
  | "setPaymentRefundPaidViaOpen"
  | "paymentRefundCustomerRef"
  | "paymentRefundPaidViaRef"
  | "customerNames"
  | "handleSavePaymentRefund"
> & {
  onClose: () => void;
};

export function PaymentRefundSidebar({
  paymentRefundFormData,
  setPaymentRefundFormData,
  paymentRefundCustomerOpen,
  setPaymentRefundCustomerOpen,
  paymentRefundPaidViaOpen,
  setPaymentRefundPaidViaOpen,
  paymentRefundCustomerRef,
  paymentRefundPaidViaRef,
  customerNames,
  handleSavePaymentRefund,
  onClose,
}: PaymentRefundSidebarProps) {
  return (
    <MoneyInOverlayShell
      title="Payment Refund"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 20px",
              backgroundColor: "white",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              color: "#111827",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "#f9fafb";
              event.currentTarget.style.borderColor = "#9ca3af";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "white";
              event.currentTarget.style.borderColor = "#d1d5db";
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              handleSavePaymentRefund();
            }}
            disabled={!paymentRefundFormData.customer || !paymentRefundFormData.selectedPayment}
            style={{
              padding: "10px 20px",
              backgroundColor:
                paymentRefundFormData.customer && paymentRefundFormData.selectedPayment
                  ? "#156372"
                  : "#d1d5db",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor:
                paymentRefundFormData.customer && paymentRefundFormData.selectedPayment
                  ? "pointer"
                  : "not-allowed",
            }}
            onMouseEnter={(event) => {
              if (paymentRefundFormData.customer && paymentRefundFormData.selectedPayment) {
                event.currentTarget.style.backgroundColor = "#0e4a5e";
              }
            }}
            onMouseOut={(event) => {
              if (paymentRefundFormData.customer && paymentRefundFormData.selectedPayment) {
                event.currentTarget.style.backgroundColor = "#156372";
              }
            }}
          >
            Save
          </button>
        </>
      }
    >
      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          Customer<span style={{ color: "#ef4444" }}>*</span>
        </label>
        <div style={{ position: "relative" }} ref={paymentRefundCustomerRef}>
          <button
            type="button"
            onClick={() => setPaymentRefundCustomerOpen(!paymentRefundCustomerOpen)}
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
              color: paymentRefundFormData.customer ? "#111827" : "#9ca3af",
            }}
          >
            <span>{paymentRefundFormData.customer || "Select customer"}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3.5 5.25l3.5 3.5 3.5-3.5"
                stroke="#6b7280"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {paymentRefundCustomerOpen && (
            <div
              style={{
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
                overflowY: "auto",
              }}
            >
              {(customerNames.length ? customerNames : ["Customer 1", "Customer 2", "Customer 3"]).map(
                (customer) => (
                  <div
                    key={customer}
                    onClick={() => {
                      setPaymentRefundFormData({
                        ...paymentRefundFormData,
                        customer,
                        payments: [
                          { id: 1, number: "PAY00001", amount: "5000", balance: "5000", refundAmount: "" },
                        ],
                      });
                      setPaymentRefundCustomerOpen(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#111827",
                      backgroundColor:
                        paymentRefundFormData.customer === customer ? "#eff6ff" : "transparent",
                    }}
                    onMouseEnter={(event) => {
                      if (paymentRefundFormData.customer !== customer) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (paymentRefundFormData.customer !== customer) {
                        event.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {customer}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          Date<span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          type="text"
          value={paymentRefundFormData.date}
          onChange={(event) =>
            setPaymentRefundFormData({ ...paymentRefundFormData, date: event.target.value })
          }
          placeholder="dd/MM/yyyy"
          disabled={!paymentRefundFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: !paymentRefundFormData.customer ? "#f9fafb" : "white",
            color: !paymentRefundFormData.customer ? "#9ca3af" : "#111827",
            cursor: !paymentRefundFormData.customer ? "not-allowed" : "text",
          }}
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          Reference#
        </label>
        <input
          type="text"
          value={paymentRefundFormData.reference}
          onChange={(event) =>
            setPaymentRefundFormData({ ...paymentRefundFormData, reference: event.target.value })
          }
          disabled={!paymentRefundFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: !paymentRefundFormData.customer ? "#f9fafb" : "white",
            color: !paymentRefundFormData.customer ? "#9ca3af" : "#111827",
            cursor: !paymentRefundFormData.customer ? "not-allowed" : "text",
          }}
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          Paid Via
        </label>
        <div style={{ position: "relative" }} ref={paymentRefundPaidViaRef}>
          <button
            type="button"
            onClick={() =>
              paymentRefundFormData.customer &&
              setPaymentRefundPaidViaOpen(!paymentRefundPaidViaOpen)
            }
            disabled={!paymentRefundFormData.customer}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              background: !paymentRefundFormData.customer ? "#f9fafb" : "white",
              cursor: !paymentRefundFormData.customer ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textAlign: "left",
              color: !paymentRefundFormData.customer ? "#9ca3af" : "#111827",
            }}
          >
            <span>{paymentRefundFormData.paidVia || "Cash"}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3.5 5.25l3.5 3.5 3.5-3.5"
                stroke={!paymentRefundFormData.customer ? "#9ca3af" : "#6b7280"}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {paymentRefundPaidViaOpen && paymentRefundFormData.customer && (
            <div
              style={{
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
                overflowY: "auto",
              }}
            >
              {PAYMENT_MODE_OPTIONS.map((method) => (
                <div
                  key={method}
                  onClick={() => {
                    setPaymentRefundFormData({ ...paymentRefundFormData, paidVia: method });
                    setPaymentRefundPaidViaOpen(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#111827",
                    backgroundColor:
                      paymentRefundFormData.paidVia === method ? "#eff6ff" : "transparent",
                  }}
                  onMouseEnter={(event) => {
                    if (paymentRefundFormData.paidVia !== method) {
                      event.currentTarget.style.backgroundColor = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (paymentRefundFormData.paidVia !== method) {
                      event.currentTarget.style.backgroundColor = "transparent";
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

      {paymentRefundFormData.customer && (
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#111827",
              marginBottom: "8px",
            }}
          >
            Select a payment<span style={{ color: "#ef4444" }}>*</span>
          </label>
          {paymentRefundFormData.payments.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                backgroundColor: "#f9fafb",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              There are no payments with credits for this customer.
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr 1fr 1fr",
                  gap: "16px",
                  padding: "12px 16px",
                  backgroundColor: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                }}
              >
                <div style={{ width: "24px" }}></div>
                <div>Payment #</div>
                <div>Amount</div>
                <div>Balance</div>
              </div>
              {paymentRefundFormData.payments.map((payment) => (
                <div
                  key={payment.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr 1fr 1fr",
                    gap: "16px",
                    padding: "12px 16px",
                    borderBottom: "1px solid #f3f4f6",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentRefundFormData.selectedPayment === payment.id.toString()}
                      onChange={() =>
                        setPaymentRefundFormData({
                          ...paymentRefundFormData,
                          selectedPayment: payment.id.toString(),
                        })
                      }
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                  <div
                    style={{
                      color: "#156372",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                  >
                    {payment.number}
                  </div>
                  <div style={{ fontSize: "14px", color: "#111827" }}>{payment.amount}</div>
                  <div style={{ fontSize: "14px", color: "#111827" }}>{payment.balance}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          Description
        </label>
        <textarea
          value={paymentRefundFormData.description}
          onChange={(event) =>
            setPaymentRefundFormData({ ...paymentRefundFormData, description: event.target.value })
          }
          placeholder="Max. 500 characters"
          maxLength={500}
          rows={4}
          disabled={!paymentRefundFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
            backgroundColor: !paymentRefundFormData.customer ? "#f9fafb" : "white",
            color: !paymentRefundFormData.customer ? "#9ca3af" : "#111827",
            cursor: !paymentRefundFormData.customer ? "not-allowed" : "text",
          }}
        />
      </div>
    </MoneyInOverlayShell>
  );
}
