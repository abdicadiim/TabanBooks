import type { AccountDetailController } from "../types";
import { MoneyInAttachmentsField } from "./MoneyInAttachmentsField";
import { MoneyInOverlayShell } from "./MoneyInOverlayShell";

type TransferFromAnotherAccountSidebarProps = Pick<
  AccountDetailController,
  | "transferFromAnotherAccountFormData"
  | "setTransferFromAnotherAccountFormData"
  | "transferFromToAccountOpen"
  | "setTransferFromToAccountOpen"
  | "transferFromFromAccountOpen"
  | "setTransferFromFromAccountOpen"
  | "transferFromCurrencyOpen"
  | "setTransferFromCurrencyOpen"
  | "transferFromToAccountRef"
  | "transferFromFromAccountRef"
  | "transferFromCurrencyRef"
  | "transferFromFileInputRef"
  | "transferBankSelectionOptions"
  | "resolvedBaseCurrency"
  | "handleSaveTransferFromAnotherAccount"
> & {
  onClose: () => void;
};

export function TransferFromAnotherAccountSidebar({
  transferFromAnotherAccountFormData,
  setTransferFromAnotherAccountFormData,
  transferFromToAccountOpen,
  setTransferFromToAccountOpen,
  transferFromFromAccountOpen,
  setTransferFromFromAccountOpen,
  transferFromCurrencyOpen,
  setTransferFromCurrencyOpen,
  transferFromToAccountRef,
  transferFromFromAccountRef,
  transferFromCurrencyRef,
  transferFromFileInputRef,
  transferBankSelectionOptions,
  resolvedBaseCurrency,
  handleSaveTransferFromAnotherAccount,
  onClose,
}: TransferFromAnotherAccountSidebarProps) {
  return (
    <MoneyInOverlayShell
      title="Transfer From Another Account"
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
              handleSaveTransferFromAnotherAccount();
            }}
            disabled={
              !transferFromAnotherAccountFormData.toAccount ||
              !transferFromAnotherAccountFormData.fromAccount ||
              !transferFromAnotherAccountFormData.amount
            }
            style={{
              padding: "10px 20px",
              backgroundColor:
                transferFromAnotherAccountFormData.toAccount &&
                transferFromAnotherAccountFormData.fromAccount &&
                transferFromAnotherAccountFormData.amount
                  ? "#156372"
                  : "#d1d5db",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor:
                transferFromAnotherAccountFormData.toAccount &&
                transferFromAnotherAccountFormData.fromAccount &&
                transferFromAnotherAccountFormData.amount
                  ? "pointer"
                  : "not-allowed",
            }}
            onMouseEnter={(event) => {
              if (
                transferFromAnotherAccountFormData.toAccount &&
                transferFromAnotherAccountFormData.fromAccount &&
                transferFromAnotherAccountFormData.amount
              ) {
                event.currentTarget.style.backgroundColor = "#0e4a5e";
              }
            }}
            onMouseOut={(event) => {
              if (
                transferFromAnotherAccountFormData.toAccount &&
                transferFromAnotherAccountFormData.fromAccount &&
                transferFromAnotherAccountFormData.amount
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
          To Account<span style={{ color: "#ef4444" }}>*</span>
        </label>
        <div style={{ position: "relative" }} ref={transferFromToAccountRef}>
          <button
            type="button"
            onClick={() => setTransferFromToAccountOpen(!transferFromToAccountOpen)}
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
              color: transferFromAnotherAccountFormData.toAccount ? "#111827" : "#9ca3af",
            }}
          >
            <span>{transferFromAnotherAccountFormData.toAccount || "Select an account"}</span>
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
          {transferFromToAccountOpen && (
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
              {transferBankSelectionOptions
                .filter((account) => account !== transferFromAnotherAccountFormData.fromAccount)
                .map((account) => (
                  <div
                    key={account}
                    onClick={() => {
                      setTransferFromAnotherAccountFormData({
                        ...transferFromAnotherAccountFormData,
                        toAccount: account,
                      });
                      setTransferFromToAccountOpen(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#111827",
                      backgroundColor:
                        transferFromAnotherAccountFormData.toAccount === account
                          ? "#eff6ff"
                          : "transparent",
                    }}
                    onMouseEnter={(event) => {
                      if (transferFromAnotherAccountFormData.toAccount !== account) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (transferFromAnotherAccountFormData.toAccount !== account) {
                        event.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {account}
                  </div>
                ))}
            </div>
          )}
        </div>
        <div
          style={{
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "12px", color: "#6b7280" }}>Reporting Tags</span>
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
          From Account<span style={{ color: "#ef4444" }}>*</span>
        </label>
        <div style={{ position: "relative" }} ref={transferFromFromAccountRef}>
          <button
            type="button"
            onClick={() => setTransferFromFromAccountOpen(!transferFromFromAccountOpen)}
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
              color: transferFromAnotherAccountFormData.fromAccount ? "#111827" : "#9ca3af",
            }}
          >
            <span>{transferFromAnotherAccountFormData.fromAccount || "Select an account"}</span>
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
          {transferFromFromAccountOpen && (
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
              {transferBankSelectionOptions
                .filter((account) => account !== transferFromAnotherAccountFormData.toAccount)
                .map((account) => (
                  <div
                    key={account}
                    onClick={() => {
                      setTransferFromAnotherAccountFormData({
                        ...transferFromAnotherAccountFormData,
                        fromAccount: account,
                      });
                      setTransferFromFromAccountOpen(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#111827",
                      backgroundColor:
                        transferFromAnotherAccountFormData.fromAccount === account
                          ? "#eff6ff"
                          : "transparent",
                    }}
                    onMouseEnter={(event) => {
                      if (transferFromAnotherAccountFormData.fromAccount !== account) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (transferFromAnotherAccountFormData.fromAccount !== account) {
                        event.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {account}
                  </div>
                ))}
            </div>
          )}
        </div>
        <div
          style={{
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "12px", color: "#6b7280" }}>Reporting Tags</span>
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
          value={transferFromAnotherAccountFormData.date}
          onChange={(event) =>
            setTransferFromAnotherAccountFormData({
              ...transferFromAnotherAccountFormData,
              date: event.target.value,
            })
          }
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
          <div style={{ position: "relative", flex: "0 0 100px" }} ref={transferFromCurrencyRef}>
            <button
              type="button"
              onClick={() => setTransferFromCurrencyOpen(!transferFromCurrencyOpen)}
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
              <span>{transferFromAnotherAccountFormData.currency}</span>
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
            {transferFromCurrencyOpen && (
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
                      setTransferFromAnotherAccountFormData({
                        ...transferFromAnotherAccountFormData,
                        currency,
                      });
                      setTransferFromCurrencyOpen(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#111827",
                      backgroundColor:
                        transferFromAnotherAccountFormData.currency === currency
                          ? "#eff6ff"
                          : "transparent",
                    }}
                    onMouseEnter={(event) => {
                      if (transferFromAnotherAccountFormData.currency !== currency) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (transferFromAnotherAccountFormData.currency !== currency) {
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
            value={transferFromAnotherAccountFormData.amount}
            onChange={(event) =>
              setTransferFromAnotherAccountFormData({
                ...transferFromAnotherAccountFormData,
                amount: event.target.value,
              })
            }
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
          Reference#
        </label>
        <input
          type="text"
          value={transferFromAnotherAccountFormData.reference}
          onChange={(event) =>
            setTransferFromAnotherAccountFormData({
              ...transferFromAnotherAccountFormData,
              reference: event.target.value,
            })
          }
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
          value={transferFromAnotherAccountFormData.description}
          onChange={(event) =>
            setTransferFromAnotherAccountFormData({
              ...transferFromAnotherAccountFormData,
              description: event.target.value,
            })
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

      <MoneyInAttachmentsField
        attachments={transferFromAnotherAccountFormData.attachments}
        inputRef={transferFromFileInputRef}
        onChangeAttachments={(attachments) => {
          setTransferFromAnotherAccountFormData({
            ...transferFromAnotherAccountFormData,
            attachments,
          });
        }}
      />
    </MoneyInOverlayShell>
  );
}
