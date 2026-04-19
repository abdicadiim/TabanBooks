import type { AccountDetailController } from "../types";
import { MoneyInAttachmentsField } from "./MoneyInAttachmentsField";
import { MoneyInOverlayShell } from "./MoneyInOverlayShell";
import { PAYMENT_MODE_OPTIONS } from "../../../../utils/paymentModes";

type CustomerPaymentSidebarProps = Pick<
  AccountDetailController,
  | "customerPaymentFormData"
  | "setCustomerPaymentFormData"
  | "customerPaymentCustomerOpen"
  | "setCustomerPaymentCustomerOpen"
  | "customerPaymentReceivedViaOpen"
  | "setCustomerPaymentReceivedViaOpen"
  | "customerPaymentCustomerRef"
  | "customerPaymentReceivedViaRef"
  | "customerPaymentFileInputRef"
  | "customerNames"
  | "handleSaveCustomerPayment"
> & {
  onClose: () => void;
};

export function CustomerPaymentSidebar({
  customerPaymentFormData,
  setCustomerPaymentFormData,
  customerPaymentCustomerOpen,
  setCustomerPaymentCustomerOpen,
  customerPaymentReceivedViaOpen,
  setCustomerPaymentReceivedViaOpen,
  customerPaymentCustomerRef,
  customerPaymentReceivedViaRef,
  customerPaymentFileInputRef,
  customerNames,
  handleSaveCustomerPayment,
  onClose,
}: CustomerPaymentSidebarProps) {
  return (
    <MoneyInOverlayShell
      title="Customer Payment"
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
              handleSaveCustomerPayment();
            }}
            disabled={!customerPaymentFormData.customer || !customerPaymentFormData.amountReceived}
            style={{
              padding: "10px 20px",
              backgroundColor:
                customerPaymentFormData.customer && customerPaymentFormData.amountReceived
                  ? "#156372"
                  : "#d1d5db",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor:
                customerPaymentFormData.customer && customerPaymentFormData.amountReceived
                  ? "pointer"
                  : "not-allowed",
            }}
            onMouseEnter={(event) => {
              if (customerPaymentFormData.customer && customerPaymentFormData.amountReceived) {
                event.currentTarget.style.backgroundColor = "#0e4a5e";
              }
            }}
            onMouseOut={(event) => {
              if (customerPaymentFormData.customer && customerPaymentFormData.amountReceived) {
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
        <div style={{ position: "relative" }} ref={customerPaymentCustomerRef}>
          <button
            type="button"
            onClick={() => setCustomerPaymentCustomerOpen(!customerPaymentCustomerOpen)}
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
              color: customerPaymentFormData.customer ? "#111827" : "#9ca3af",
            }}
          >
            <span>{customerPaymentFormData.customer || "Select customer"}</span>
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
          {customerPaymentCustomerOpen && (
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
                      setCustomerPaymentFormData({ ...customerPaymentFormData, customer });
                      setCustomerPaymentCustomerOpen(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#111827",
                      backgroundColor:
                        customerPaymentFormData.customer === customer ? "#eff6ff" : "transparent",
                    }}
                    onMouseEnter={(event) => {
                      if (customerPaymentFormData.customer !== customer) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (customerPaymentFormData.customer !== customer) {
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
          Amount Received<span style={{ color: "#ef4444" }}>*</span>
        </label>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span
            style={{
              position: "absolute",
              left: "14px",
              fontSize: "14px",
              color: "#6b7280",
              zIndex: 1,
            }}
          >
            KES
          </span>
          <input
            type="text"
            value={customerPaymentFormData.amountReceived}
            onChange={(event) =>
              setCustomerPaymentFormData({
                ...customerPaymentFormData,
                amountReceived: event.target.value,
              })
            }
            placeholder="0.00"
            disabled={!customerPaymentFormData.customer}
            style={{
              width: "100%",
              padding: "10px 14px 10px 50px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
              backgroundColor: !customerPaymentFormData.customer ? "#f9fafb" : "white",
              color: !customerPaymentFormData.customer ? "#9ca3af" : "#111827",
              cursor: !customerPaymentFormData.customer ? "not-allowed" : "text",
            }}
          />
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
          Bank Charges (if any)
        </label>
        <input
          type="text"
          value={customerPaymentFormData.bankCharges}
          onChange={(event) =>
            setCustomerPaymentFormData({
              ...customerPaymentFormData,
              bankCharges: event.target.value,
            })
          }
          placeholder="0.00"
          disabled={!customerPaymentFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: !customerPaymentFormData.customer ? "#f9fafb" : "white",
            color: !customerPaymentFormData.customer ? "#9ca3af" : "#111827",
            cursor: !customerPaymentFormData.customer ? "not-allowed" : "text",
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
          Date<span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          type="text"
          value={customerPaymentFormData.date}
          onChange={(event) =>
            setCustomerPaymentFormData({ ...customerPaymentFormData, date: event.target.value })
          }
          placeholder="dd/MM/yyyy"
          disabled={!customerPaymentFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: !customerPaymentFormData.customer ? "#f9fafb" : "white",
            color: !customerPaymentFormData.customer ? "#9ca3af" : "#111827",
            cursor: !customerPaymentFormData.customer ? "not-allowed" : "text",
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
          Payment #<span style={{ color: "#ef4444" }}>*</span>
        </label>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <input
            type="text"
            value={customerPaymentFormData.paymentNumber}
            onChange={(event) =>
              setCustomerPaymentFormData({
                ...customerPaymentFormData,
                paymentNumber: event.target.value,
              })
            }
            disabled={!customerPaymentFormData.customer}
            style={{
              width: "100%",
              padding: "10px 14px 10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
              backgroundColor: !customerPaymentFormData.customer ? "#f9fafb" : "white",
              color: !customerPaymentFormData.customer ? "#9ca3af" : "#111827",
              cursor: !customerPaymentFormData.customer ? "not-allowed" : "text",
            }}
          />
          <button
            type="button"
            onClick={() => {
              const nextNumber = parseInt(customerPaymentFormData.paymentNumber) + 1;
              setCustomerPaymentFormData({
                ...customerPaymentFormData,
                paymentNumber: nextNumber.toString(),
              });
            }}
            disabled={!customerPaymentFormData.customer}
            style={{
              position: "absolute",
              right: "8px",
              background: "none",
              border: "none",
              cursor: !customerPaymentFormData.customer ? "not-allowed" : "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: !customerPaymentFormData.customer ? "#9ca3af" : "#6b7280",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
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
          Reference#
        </label>
        <input
          type="text"
          value={customerPaymentFormData.reference}
          onChange={(event) =>
            setCustomerPaymentFormData({
              ...customerPaymentFormData,
              reference: event.target.value,
            })
          }
          disabled={!customerPaymentFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: !customerPaymentFormData.customer ? "#f9fafb" : "white",
            color: !customerPaymentFormData.customer ? "#9ca3af" : "#111827",
            cursor: !customerPaymentFormData.customer ? "not-allowed" : "text",
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
          Received Via
        </label>
        <div style={{ position: "relative" }} ref={customerPaymentReceivedViaRef}>
          <button
            type="button"
            onClick={() =>
              customerPaymentFormData.customer &&
              setCustomerPaymentReceivedViaOpen(!customerPaymentReceivedViaOpen)
            }
            disabled={!customerPaymentFormData.customer}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              background: !customerPaymentFormData.customer ? "#f9fafb" : "white",
              cursor: !customerPaymentFormData.customer ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textAlign: "left",
              color: !customerPaymentFormData.customer ? "#9ca3af" : "#111827",
            }}
          >
            <span>{customerPaymentFormData.receivedVia || "Cash"}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3.5 5.25l3.5 3.5 3.5-3.5"
                stroke={!customerPaymentFormData.customer ? "#9ca3af" : "#6b7280"}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {customerPaymentReceivedViaOpen && customerPaymentFormData.customer && (
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
                    setCustomerPaymentFormData({ ...customerPaymentFormData, receivedVia: method });
                    setCustomerPaymentReceivedViaOpen(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#111827",
                    backgroundColor:
                      customerPaymentFormData.receivedVia === method ? "#eff6ff" : "transparent",
                  }}
                  onMouseEnter={(event) => {
                    if (customerPaymentFormData.receivedVia !== method) {
                      event.currentTarget.style.backgroundColor = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (customerPaymentFormData.receivedVia !== method) {
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
          value={customerPaymentFormData.description}
          onChange={(event) =>
            setCustomerPaymentFormData({
              ...customerPaymentFormData,
              description: event.target.value,
            })
          }
          placeholder="Max. 500 characters"
          maxLength={500}
          rows={4}
          disabled={!customerPaymentFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
            backgroundColor: !customerPaymentFormData.customer ? "#f9fafb" : "white",
            color: !customerPaymentFormData.customer ? "#9ca3af" : "#111827",
            cursor: !customerPaymentFormData.customer ? "not-allowed" : "text",
          }}
        />
      </div>

      {customerPaymentFormData.customer && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              margin: 0,
            }}
          >
            There are no unpaid invoices associated with this customer.
          </p>
        </div>
      )}

      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            cursor: customerPaymentFormData.customer ? "pointer" : "not-allowed",
            fontSize: "14px",
            color: !customerPaymentFormData.customer ? "#9ca3af" : "#111827",
          }}
        >
          <input
            type="checkbox"
            checked={customerPaymentFormData.sendThankYouNote}
            onChange={(event) =>
              setCustomerPaymentFormData({
                ...customerPaymentFormData,
                sendThankYouNote: event.target.checked,
              })
            }
            disabled={!customerPaymentFormData.customer}
            style={{
              marginRight: "8px",
              cursor: customerPaymentFormData.customer ? "pointer" : "not-allowed",
            }}
          />
          <span>Send a "Thank you" note for this payment</span>
        </label>
      </div>

      <MoneyInAttachmentsField
        attachments={customerPaymentFormData.attachments}
        inputRef={customerPaymentFileInputRef}
        disabled={!customerPaymentFormData.customer}
        onChangeAttachments={(attachments) => {
          setCustomerPaymentFormData({ ...customerPaymentFormData, attachments });
        }}
      />
    </MoneyInOverlayShell>
  );
}
