import type { AccountDetailController } from "../types";
import { MoneyInAttachmentsField } from "./MoneyInAttachmentsField";
import { MoneyInOverlayShell } from "./MoneyInOverlayShell";
import { PAYMENT_MODE_OPTIONS } from "../../../../utils/paymentModes";

type CustomerAdvanceSidebarProps = Pick<
  AccountDetailController,
  | "customerAdvanceFormData"
  | "setCustomerAdvanceFormData"
  | "customerAdvanceCustomerOpen"
  | "setCustomerAdvanceCustomerOpen"
  | "customerAdvanceReceivedViaOpen"
  | "setCustomerAdvanceReceivedViaOpen"
  | "customerAdvanceCustomerRef"
  | "customerAdvanceReceivedViaRef"
  | "customerAdvanceFileInputRef"
  | "customerNames"
  | "handleSaveCustomerAdvance"
> & {
  onClose: () => void;
};

export function CustomerAdvanceSidebar({
  customerAdvanceFormData,
  setCustomerAdvanceFormData,
  customerAdvanceCustomerOpen,
  setCustomerAdvanceCustomerOpen,
  customerAdvanceReceivedViaOpen,
  setCustomerAdvanceReceivedViaOpen,
  customerAdvanceCustomerRef,
  customerAdvanceReceivedViaRef,
  customerAdvanceFileInputRef,
  customerNames,
  handleSaveCustomerAdvance,
  onClose,
}: CustomerAdvanceSidebarProps) {
  return (
    <MoneyInOverlayShell
      title="Customer Advance"
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
              handleSaveCustomerAdvance();
            }}
            disabled={
              !customerAdvanceFormData.customer ||
              !customerAdvanceFormData.amountReceived ||
              !customerAdvanceFormData.exchangeRate
            }
            style={{
              padding: "10px 20px",
              backgroundColor:
                customerAdvanceFormData.customer &&
                customerAdvanceFormData.amountReceived &&
                customerAdvanceFormData.exchangeRate
                  ? "#156372"
                  : "#d1d5db",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor:
                customerAdvanceFormData.customer &&
                customerAdvanceFormData.amountReceived &&
                customerAdvanceFormData.exchangeRate
                  ? "pointer"
                  : "not-allowed",
            }}
            onMouseEnter={(event) => {
              if (
                customerAdvanceFormData.customer &&
                customerAdvanceFormData.amountReceived &&
                customerAdvanceFormData.exchangeRate
              ) {
                event.currentTarget.style.backgroundColor = "#0e4a5e";
              }
            }}
            onMouseOut={(event) => {
              if (
                customerAdvanceFormData.customer &&
                customerAdvanceFormData.amountReceived &&
                customerAdvanceFormData.exchangeRate
              ) {
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
        <div style={{ position: "relative" }} ref={customerAdvanceCustomerRef}>
          <button
            type="button"
            onClick={() => setCustomerAdvanceCustomerOpen(!customerAdvanceCustomerOpen)}
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
              color: customerAdvanceFormData.customer ? "#111827" : "#9ca3af",
            }}
          >
            <span>{customerAdvanceFormData.customer || "Select Customer"}</span>
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
          {customerAdvanceCustomerOpen && (
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
                      setCustomerAdvanceFormData({ ...customerAdvanceFormData, customer });
                      setCustomerAdvanceCustomerOpen(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#111827",
                      backgroundColor:
                        customerAdvanceFormData.customer === customer ? "#eff6ff" : "transparent",
                    }}
                    onMouseEnter={(event) => {
                      if (customerAdvanceFormData.customer !== customer) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (customerAdvanceFormData.customer !== customer) {
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
            value={customerAdvanceFormData.amountReceived}
            onChange={(event) =>
              setCustomerAdvanceFormData({
                ...customerAdvanceFormData,
                amountReceived: event.target.value,
              })
            }
            placeholder="0.00"
            disabled={!customerAdvanceFormData.customer}
            style={{
              width: "100%",
              padding: "10px 14px 10px 50px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
              backgroundColor: !customerAdvanceFormData.customer ? "#f9fafb" : "white",
              color: !customerAdvanceFormData.customer ? "#9ca3af" : "#111827",
              cursor: !customerAdvanceFormData.customer ? "not-allowed" : "text",
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
          value={customerAdvanceFormData.bankCharges}
          onChange={(event) =>
            setCustomerAdvanceFormData({
              ...customerAdvanceFormData,
              bankCharges: event.target.value,
            })
          }
          placeholder="0.00"
          disabled={!customerAdvanceFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: !customerAdvanceFormData.customer ? "#f9fafb" : "white",
            color: !customerAdvanceFormData.customer ? "#9ca3af" : "#111827",
            cursor: !customerAdvanceFormData.customer ? "not-allowed" : "text",
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
          Exchange Rate<span style={{ color: "#ef4444" }}>*</span>
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
            1 KES =
          </span>
          <input
            type="text"
            value={customerAdvanceFormData.exchangeRate}
            onChange={(event) =>
              setCustomerAdvanceFormData({
                ...customerAdvanceFormData,
                exchangeRate: event.target.value,
              })
            }
            placeholder="0.00"
            disabled={!customerAdvanceFormData.customer}
            style={{
              width: "100%",
              padding: "10px 14px 10px 80px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
              backgroundColor: !customerAdvanceFormData.customer ? "#f9fafb" : "white",
              color: !customerAdvanceFormData.customer ? "#9ca3af" : "#111827",
              cursor: !customerAdvanceFormData.customer ? "not-allowed" : "text",
            }}
          />
          <span
            style={{
              position: "absolute",
              right: "14px",
              fontSize: "14px",
              color: "#6b7280",
              zIndex: 1,
            }}
          >
            KES
          </span>
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "#6b7280",
            marginTop: "4px",
            marginBottom: 0,
          }}
        >
          This will be set as the exchange rate for this date.
        </p>
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
          value={customerAdvanceFormData.date}
          onChange={(event) =>
            setCustomerAdvanceFormData({ ...customerAdvanceFormData, date: event.target.value })
          }
          placeholder="dd/MM/yyyy"
          disabled={!customerAdvanceFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: !customerAdvanceFormData.customer ? "#f9fafb" : "white",
            color: !customerAdvanceFormData.customer ? "#9ca3af" : "#111827",
            cursor: !customerAdvanceFormData.customer ? "not-allowed" : "text",
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
            value={customerAdvanceFormData.paymentNumber}
            onChange={(event) =>
              setCustomerAdvanceFormData({
                ...customerAdvanceFormData,
                paymentNumber: event.target.value,
              })
            }
            disabled={!customerAdvanceFormData.customer}
            style={{
              width: "100%",
              padding: "10px 14px 10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
              backgroundColor: !customerAdvanceFormData.customer ? "#f9fafb" : "white",
              color: !customerAdvanceFormData.customer ? "#9ca3af" : "#111827",
              cursor: !customerAdvanceFormData.customer ? "not-allowed" : "text",
            }}
          />
          <button
            type="button"
            onClick={() => {
              const nextNumber = parseInt(customerAdvanceFormData.paymentNumber) + 1;
              setCustomerAdvanceFormData({
                ...customerAdvanceFormData,
                paymentNumber: nextNumber.toString(),
              });
            }}
            disabled={!customerAdvanceFormData.customer}
            style={{
              position: "absolute",
              right: "8px",
              background: "none",
              border: "none",
              cursor: !customerAdvanceFormData.customer ? "not-allowed" : "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: !customerAdvanceFormData.customer ? "#9ca3af" : "#6b7280",
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
          value={customerAdvanceFormData.reference}
          onChange={(event) =>
            setCustomerAdvanceFormData({
              ...customerAdvanceFormData,
              reference: event.target.value,
            })
          }
          disabled={!customerAdvanceFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: !customerAdvanceFormData.customer ? "#f9fafb" : "white",
            color: !customerAdvanceFormData.customer ? "#9ca3af" : "#111827",
            cursor: !customerAdvanceFormData.customer ? "not-allowed" : "text",
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
        <div style={{ position: "relative" }} ref={customerAdvanceReceivedViaRef}>
          <button
            type="button"
            onClick={() =>
              customerAdvanceFormData.customer &&
              setCustomerAdvanceReceivedViaOpen(!customerAdvanceReceivedViaOpen)
            }
            disabled={!customerAdvanceFormData.customer}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              background: !customerAdvanceFormData.customer ? "#f9fafb" : "white",
              cursor: !customerAdvanceFormData.customer ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textAlign: "left",
              color: !customerAdvanceFormData.customer ? "#9ca3af" : "#111827",
            }}
          >
            <span>{customerAdvanceFormData.receivedVia || "Cash"}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3.5 5.25l3.5 3.5 3.5-3.5"
                stroke={!customerAdvanceFormData.customer ? "#9ca3af" : "#6b7280"}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {customerAdvanceReceivedViaOpen && customerAdvanceFormData.customer && (
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
                    setCustomerAdvanceFormData({ ...customerAdvanceFormData, receivedVia: method });
                    setCustomerAdvanceReceivedViaOpen(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#111827",
                    backgroundColor:
                      customerAdvanceFormData.receivedVia === method ? "#eff6ff" : "transparent",
                  }}
                  onMouseEnter={(event) => {
                    if (customerAdvanceFormData.receivedVia !== method) {
                      event.currentTarget.style.backgroundColor = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (customerAdvanceFormData.receivedVia !== method) {
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
          value={customerAdvanceFormData.description}
          onChange={(event) =>
            setCustomerAdvanceFormData({
              ...customerAdvanceFormData,
              description: event.target.value,
            })
          }
          placeholder="Max. 500 characters"
          maxLength={500}
          rows={4}
          disabled={!customerAdvanceFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
            backgroundColor: !customerAdvanceFormData.customer ? "#f9fafb" : "white",
            color: !customerAdvanceFormData.customer ? "#9ca3af" : "#111827",
            cursor: !customerAdvanceFormData.customer ? "not-allowed" : "text",
          }}
        />
      </div>

      <MoneyInAttachmentsField
        attachments={customerAdvanceFormData.attachments}
        inputRef={customerAdvanceFileInputRef}
        disabled={!customerAdvanceFormData.customer}
        onChangeAttachments={(attachments) => {
          setCustomerAdvanceFormData({ ...customerAdvanceFormData, attachments });
        }}
      />
    </MoneyInOverlayShell>
  );
}
