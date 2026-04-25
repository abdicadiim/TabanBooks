import type { AccountDetailController } from "../types";
import { MoneyInOverlayShell } from "./MoneyInOverlayShell";
import { PAYMENT_MODE_OPTIONS } from "../../../../utils/paymentModes";

type CreditNoteRefundSidebarProps = Pick<
  AccountDetailController,
  | "creditNoteRefundFormData"
  | "setCreditNoteRefundFormData"
  | "creditNoteRefundCustomerOpen"
  | "setCreditNoteRefundCustomerOpen"
  | "creditNoteRefundPaidViaOpen"
  | "setCreditNoteRefundPaidViaOpen"
  | "creditNoteRefundCustomerRef"
  | "creditNoteRefundPaidViaRef"
  | "customerNames"
  | "handleSaveCreditNoteRefund"
> & {
  onClose: () => void;
};

export function CreditNoteRefundSidebar({
  creditNoteRefundFormData,
  setCreditNoteRefundFormData,
  creditNoteRefundCustomerOpen,
  setCreditNoteRefundCustomerOpen,
  creditNoteRefundPaidViaOpen,
  setCreditNoteRefundPaidViaOpen,
  creditNoteRefundCustomerRef,
  creditNoteRefundPaidViaRef,
  customerNames,
  handleSaveCreditNoteRefund,
  onClose,
}: CreditNoteRefundSidebarProps) {
  return (
    <MoneyInOverlayShell
      title="Credit Note Refund"
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
              handleSaveCreditNoteRefund();
            }}
            disabled={!creditNoteRefundFormData.customer || !creditNoteRefundFormData.selectedCreditNote}
            style={{
              padding: "10px 20px",
              backgroundColor:
                creditNoteRefundFormData.customer && creditNoteRefundFormData.selectedCreditNote
                  ? "#156372"
                  : "#d1d5db",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor:
                creditNoteRefundFormData.customer && creditNoteRefundFormData.selectedCreditNote
                  ? "pointer"
                  : "not-allowed",
            }}
            onMouseEnter={(event) => {
              if (creditNoteRefundFormData.customer && creditNoteRefundFormData.selectedCreditNote) {
                event.currentTarget.style.backgroundColor = "#0e4a5e";
              }
            }}
            onMouseOut={(event) => {
              if (creditNoteRefundFormData.customer && creditNoteRefundFormData.selectedCreditNote) {
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
        <div style={{ position: "relative" }} ref={creditNoteRefundCustomerRef}>
          <button
            type="button"
            onClick={() => setCreditNoteRefundCustomerOpen(!creditNoteRefundCustomerOpen)}
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
              color: creditNoteRefundFormData.customer ? "#111827" : "#9ca3af",
            }}
          >
            <span>{creditNoteRefundFormData.customer || "Select customer"}</span>
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
          {creditNoteRefundCustomerOpen && (
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
                      setCreditNoteRefundFormData({ ...creditNoteRefundFormData, customer });
                      setCreditNoteRefundCustomerOpen(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#111827",
                      backgroundColor:
                        creditNoteRefundFormData.customer === customer ? "#eff6ff" : "transparent",
                    }}
                    onMouseEnter={(event) => {
                      if (creditNoteRefundFormData.customer !== customer) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (creditNoteRefundFormData.customer !== customer) {
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
          value={creditNoteRefundFormData.date}
          onChange={(event) =>
            setCreditNoteRefundFormData({ ...creditNoteRefundFormData, date: event.target.value })
          }
          placeholder="dd/MM/yyyy"
          disabled={!creditNoteRefundFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: !creditNoteRefundFormData.customer ? "#f9fafb" : "white",
            color: !creditNoteRefundFormData.customer ? "#9ca3af" : "#111827",
            cursor: !creditNoteRefundFormData.customer ? "not-allowed" : "text",
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
          value={creditNoteRefundFormData.reference}
          onChange={(event) =>
            setCreditNoteRefundFormData({
              ...creditNoteRefundFormData,
              reference: event.target.value,
            })
          }
          disabled={!creditNoteRefundFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: !creditNoteRefundFormData.customer ? "#f9fafb" : "white",
            color: !creditNoteRefundFormData.customer ? "#9ca3af" : "#111827",
            cursor: !creditNoteRefundFormData.customer ? "not-allowed" : "text",
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
        <div style={{ position: "relative" }} ref={creditNoteRefundPaidViaRef}>
          <button
            type="button"
            onClick={() =>
              creditNoteRefundFormData.customer &&
              setCreditNoteRefundPaidViaOpen(!creditNoteRefundPaidViaOpen)
            }
            disabled={!creditNoteRefundFormData.customer}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              background: !creditNoteRefundFormData.customer ? "#f9fafb" : "white",
              cursor: !creditNoteRefundFormData.customer ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textAlign: "left",
              color: !creditNoteRefundFormData.customer ? "#9ca3af" : "#111827",
            }}
          >
            <span>{creditNoteRefundFormData.paidVia || "Cash"}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3.5 5.25l3.5 3.5 3.5-3.5"
                stroke={!creditNoteRefundFormData.customer ? "#9ca3af" : "#6b7280"}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {creditNoteRefundPaidViaOpen && creditNoteRefundFormData.customer && (
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
                    setCreditNoteRefundFormData({ ...creditNoteRefundFormData, paidVia: method });
                    setCreditNoteRefundPaidViaOpen(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#111827",
                    backgroundColor:
                      creditNoteRefundFormData.paidVia === method ? "#eff6ff" : "transparent",
                  }}
                  onMouseEnter={(event) => {
                    if (creditNoteRefundFormData.paidVia !== method) {
                      event.currentTarget.style.backgroundColor = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (creditNoteRefundFormData.paidVia !== method) {
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

      {creditNoteRefundFormData.customer && (
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
            Select Credit Note<span style={{ color: "#ef4444" }}>*</span>
          </label>
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
              <div>CN#</div>
              <div>Amount</div>
              <div>Balance</div>
            </div>
            {creditNoteRefundFormData.creditNotes.map((creditNote) => (
              <div
                key={creditNote.id}
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
                    name="creditNote"
                    checked={creditNoteRefundFormData.selectedCreditNote === creditNote.id.toString()}
                    onChange={() =>
                      setCreditNoteRefundFormData({
                        ...creditNoteRefundFormData,
                        selectedCreditNote: creditNote.id.toString(),
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
                  {creditNote.number}
                </div>
                <div style={{ fontSize: "14px", color: "#111827" }}>{creditNote.amount}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px", color: "#111827" }}>{creditNote.balance}</span>
                  <input
                    type="text"
                    value={creditNote.refundAmount}
                    onChange={(event) => {
                      const updatedCreditNotes = creditNoteRefundFormData.creditNotes.map((currentNote) =>
                        currentNote.id === creditNote.id
                          ? { ...currentNote, refundAmount: event.target.value }
                          : currentNote,
                      );
                      setCreditNoteRefundFormData({
                        ...creditNoteRefundFormData,
                        creditNotes: updatedCreditNotes,
                      });
                    }}
                    placeholder="0"
                    style={{
                      width: "80px",
                      padding: "6px 10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                    onFocus={(event) => {
                      event.currentTarget.style.borderColor = "#156372";
                      event.currentTarget.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                    }}
                    onBlur={(event) => {
                      event.currentTarget.style.borderColor = "#d1d5db";
                      event.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
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
          value={creditNoteRefundFormData.description}
          onChange={(event) =>
            setCreditNoteRefundFormData({
              ...creditNoteRefundFormData,
              description: event.target.value,
            })
          }
          placeholder="Max. 500 characters"
          maxLength={500}
          rows={4}
          disabled={!creditNoteRefundFormData.customer}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
            backgroundColor: !creditNoteRefundFormData.customer ? "#f9fafb" : "white",
            color: !creditNoteRefundFormData.customer ? "#9ca3af" : "#111827",
            cursor: !creditNoteRefundFormData.customer ? "not-allowed" : "text",
          }}
        />
      </div>
    </MoneyInOverlayShell>
  );
}
