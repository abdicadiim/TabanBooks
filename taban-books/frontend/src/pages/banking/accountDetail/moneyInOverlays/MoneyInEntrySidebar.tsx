import type { AccountDetailController } from "../types";
import { MoneyInAttachmentsField } from "./MoneyInAttachmentsField";
import { MoneyInOverlayShell } from "./MoneyInOverlayShell";
import { PAYMENT_MODE_OPTIONS } from "../../../../utils/paymentModes";

type MoneyInEntrySidebarProps = Pick<
  AccountDetailController,
  | "moneyInSidebarTitle"
  | "moneyInFormData"
  | "setMoneyInFormData"
  | "moneyInCurrencyOpen"
  | "setMoneyInCurrencyOpen"
  | "moneyInReceivedViaOpen"
  | "setMoneyInReceivedViaOpen"
  | "moneyInCurrencyRef"
  | "moneyInReceivedViaRef"
  | "moneyInFileInputRef"
  | "resolvedBaseCurrency"
  | "handleSaveMoneyInEntry"
> & {
  onClose: () => void;
};

export function MoneyInEntrySidebar({
  moneyInSidebarTitle,
  moneyInFormData,
  setMoneyInFormData,
  moneyInCurrencyOpen,
  setMoneyInCurrencyOpen,
  moneyInReceivedViaOpen,
  setMoneyInReceivedViaOpen,
  moneyInCurrencyRef,
  moneyInReceivedViaRef,
  moneyInFileInputRef,
  resolvedBaseCurrency,
  handleSaveMoneyInEntry,
  onClose,
}: MoneyInEntrySidebarProps) {
  return (
    <MoneyInOverlayShell
      title={moneyInSidebarTitle}
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
              handleSaveMoneyInEntry();
            }}
            disabled={!moneyInFormData.amount}
            style={{
              padding: "10px 20px",
              backgroundColor: moneyInFormData.amount ? "#156372" : "#d1d5db",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: moneyInFormData.amount ? "pointer" : "not-allowed",
            }}
            onMouseEnter={(event) => {
              if (moneyInFormData.amount) {
                event.currentTarget.style.backgroundColor = "#0e4a5e";
              }
            }}
            onMouseOut={(event) => {
              if (moneyInFormData.amount) {
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
          Date<span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          type="text"
          value={moneyInFormData.date}
          onChange={(event) => setMoneyInFormData({ ...moneyInFormData, date: event.target.value })}
          placeholder="dd/MM/yyyy"
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
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
          Amount<span style={{ color: "#ef4444" }}>*</span>
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ position: "relative", flex: "0 0 100px" }} ref={moneyInCurrencyRef}>
            <button
              type="button"
              onClick={() => setMoneyInCurrencyOpen(!moneyInCurrencyOpen)}
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
              }}
            >
              <span>{moneyInFormData.currency}</span>
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
            {moneyInCurrencyOpen && (
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
                {[resolvedBaseCurrency].map((currency) => (
                  <div
                    key={currency}
                    onClick={() => {
                      setMoneyInFormData({ ...moneyInFormData, currency });
                      setMoneyInCurrencyOpen(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#111827",
                      backgroundColor: moneyInFormData.currency === currency ? "#eff6ff" : "transparent",
                    }}
                    onMouseEnter={(event) => {
                      if (moneyInFormData.currency !== currency) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (moneyInFormData.currency !== currency) {
                        event.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {currency}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={moneyInFormData.amount}
            onChange={(event) => setMoneyInFormData({ ...moneyInFormData, amount: event.target.value })}
            placeholder="0.00"
            style={{
              flex: 1,
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
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
          Received Via
        </label>
        <div style={{ position: "relative" }} ref={moneyInReceivedViaRef}>
          <button
            type="button"
            onClick={() => setMoneyInReceivedViaOpen(!moneyInReceivedViaOpen)}
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
            }}
          >
            <span>{moneyInFormData.receivedVia || "Cash"}</span>
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
          {moneyInReceivedViaOpen && (
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
                    setMoneyInFormData({ ...moneyInFormData, receivedVia: method });
                    setMoneyInReceivedViaOpen(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#111827",
                    backgroundColor:
                      moneyInFormData.receivedVia === method ? "#eff6ff" : "transparent",
                  }}
                  onMouseEnter={(event) => {
                    if (moneyInFormData.receivedVia !== method) {
                      event.currentTarget.style.backgroundColor = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (moneyInFormData.receivedVia !== method) {
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
          Reference#
        </label>
        <input
          type="text"
          value={moneyInFormData.reference}
          onChange={(event) => setMoneyInFormData({ ...moneyInFormData, reference: event.target.value })}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
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
          Description
        </label>
        <textarea
          value={moneyInFormData.description}
          onChange={(event) =>
            setMoneyInFormData({ ...moneyInFormData, description: event.target.value })
          }
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
            fontFamily: "inherit",
          }}
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "14px", fontWeight: "500", color: "#111827" }}>Reporting Tags</span>
          <button
            type="button"
            style={{
              padding: "4px 12px",
              backgroundColor: "#eff6ff",
              color: "#156372",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2h8v8H2z" stroke="currentColor" strokeWidth="1" fill="none" />
              <path d="M4 4h4M4 6h4M4 8h2" stroke="currentColor" strokeWidth="1" />
            </svg>
            Associate Tags
          </button>
        </div>
      </div>

      <MoneyInAttachmentsField
        attachments={moneyInFormData.attachments}
        inputRef={moneyInFileInputRef}
        onChangeAttachments={(attachments) => {
          setMoneyInFormData({ ...moneyInFormData, attachments });
        }}
      />
    </MoneyInOverlayShell>
  );
}
