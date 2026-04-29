import React, { useEffect, useMemo, useState } from "react";
import { Info, X } from "lucide-react";

import {
  ACCOUNT_TYPE_LABELS,
  getAccountTypeCategoryDescription,
} from "../chartOfAccountsConfig";
import type {
  ChartOfAccountsAccount,
  ChartOfAccountsFormData,
} from "../chartOfAccountsTypes";

interface ChartOfAccountsAccountModalProps {
  allAccounts: ChartOfAccountsAccount[];
  initialFormData: ChartOfAccountsFormData;
  mode: "create" | "edit";
  onClose: () => void;
  onSubmit: (formData: ChartOfAccountsFormData) => Promise<void> | void;
  open: boolean;
  submitting?: boolean;
}

const BRAND_PRIMARY = "#156372";
const BRAND_BORDER = "#d8e0ea";
const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  minHeight: "48px",
  padding: "0 14px",
  borderRadius: "14px",
  border: `1px solid ${BRAND_BORDER}`,
  fontSize: "14px",
  color: "#0f172a",
  backgroundColor: "#ffffff",
  boxSizing: "border-box",
  outline: "none",
};

export function ChartOfAccountsAccountModal({
  allAccounts,
  initialFormData,
  mode,
  onClose,
  onSubmit,
  open,
  submitting = false,
}: ChartOfAccountsAccountModalProps) {
  const [formData, setFormData] = useState<ChartOfAccountsFormData>(initialFormData);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormData(initialFormData);
  }, [
    initialFormData.accountCode,
    initialFormData.accountName,
    initialFormData.accountType,
    initialFormData.addToWatchlist,
    initialFormData.description,
    initialFormData.isSubAccount,
    initialFormData.parentAccountId,
    open,
  ]);

  const groupedParentAccounts = useMemo(() => {
    const groups = allAccounts.reduce<Record<string, ChartOfAccountsAccount[]>>(
      (result, account) => {
        const groupName = account.type || "Other";
        if (!result[groupName]) {
          result[groupName] = [];
        }
        result[groupName].push(account);
        return result;
      },
      {},
    );

    return Object.entries(groups);
  }, [allAccounts]);

  if (!open) {
    return null;
  }

  const title = mode === "create" ? "Create Account" : "Edit Account";
  const submitLabel = mode === "create" ? "Create Account" : "Save Changes";
  const isSaveDisabled = !formData.accountType || !formData.accountName.trim() || submitting;
  const accountTypeHint = getAccountTypeCategoryDescription(formData.accountType);

  const handleFieldChange = <K extends keyof ChartOfAccountsFormData>(
    field: K,
    value: ChartOfAccountsFormData[K],
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (isSaveDisabled) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.32)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "0 0 24px",
        zIndex: 3000,
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "860px",
          backgroundColor: "#ffffff",
          borderRadius: "0 0 22px 22px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
          overflow: "hidden",
          marginTop: 0,
        }}
      >
        <div
          style={{
            padding: "24px 24px 18px",
            borderBottom: "1px solid #edf2f7",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>
              {title}
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>
              Set the account type, naming, structure, and dashboard visibility before saving.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "999px",
              border: "1px solid #dbe3ec",
              backgroundColor: "#ffffff",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            padding: "24px",
            display: "grid",
            gap: "18px",
            maxHeight: "calc(100vh - 210px)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: "18px",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                Account Type
              </span>
              <select
                value={formData.accountType}
                onChange={(event) => handleFieldChange("accountType", event.target.value)}
                style={INPUT_STYLE}
              >
                <option value="">Select account type</option>
                {ACCOUNT_TYPE_LABELS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                Account Name
              </span>
              <input
                type="text"
                value={formData.accountName}
                onChange={(event) => handleFieldChange("accountName", event.target.value)}
                placeholder="Enter account name"
                style={INPUT_STYLE}
              />
            </label>

            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                Account Code
              </span>
              <input
                type="text"
                value={formData.accountCode}
                onChange={(event) => handleFieldChange("accountCode", event.target.value)}
                placeholder="Optional"
                style={INPUT_STYLE}
              />
            </label>

            {formData.isSubAccount ? (
              <label style={{ display: "grid", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                  Parent Account
                </span>
                <select
                  value={formData.parentAccountId}
                  onChange={(event) => handleFieldChange("parentAccountId", event.target.value)}
                  style={INPUT_STYLE}
                >
                  <option value="">Select a parent account</option>
                  {groupedParentAccounts.map(([groupName, accounts]) => (
                    <optgroup key={groupName} label={groupName}>
                      {accounts.map((account) => (
                        <option key={account.id || account._id} value={account.id || account._id}>
                          {account.name || account.accountName}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            ) : (
              <div
                style={{
                  border: "1px dashed #d8e0ea",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "grid",
                  alignContent: "center",
                  backgroundColor: "#fbfdff",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                  Account Type Notes
                </span>
                <span style={{ marginTop: "6px", fontSize: "13px", lineHeight: 1.6, color: "#64748b" }}>
                  {accountTypeHint}
                </span>
              </div>
            )}
          </div>

          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
              Description
            </span>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(event) =>
                handleFieldChange("description", event.target.value.slice(0, 500))
              }
              placeholder="Optional description"
              style={{
                ...INPUT_STYLE,
                minHeight: "120px",
                padding: "14px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </label>

          <div
            style={{
              display: "grid",
              gap: "12px",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "14px 16px",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                color: "#334155",
              }}
            >
              <input
                type="checkbox"
                checked={formData.isSubAccount}
                onChange={(event) => handleFieldChange("isSubAccount", event.target.checked)}
                style={{ marginTop: "2px", accentColor: BRAND_PRIMARY }}
              />
              <span style={{ display: "grid", gap: "4px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>Make this a sub-account</span>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Organize this account under a parent account.
                </span>
              </span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "14px 16px",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                color: "#334155",
              }}
            >
              <input
                type="checkbox"
                checked={formData.addToWatchlist}
                onChange={(event) => handleFieldChange("addToWatchlist", event.target.checked)}
                style={{ marginTop: "2px", accentColor: BRAND_PRIMARY }}
              />
              <span style={{ display: "grid", gap: "4px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>
                  Add this account to the dashboard watchlist
                </span>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Keep important balances easier to monitor.
                </span>
              </span>
            </label>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "16px 18px",
              borderRadius: "18px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              color: "#475569",
            }}
          >
            <Info size={18} color={BRAND_PRIMARY} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "13px", lineHeight: 1.7 }}>
              {accountTypeHint}
              {formData.description ? ` Description length: ${formData.description.length}/500.` : ""}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "18px 24px",
            borderTop: "1px solid #edf2f7",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            backgroundColor: "#ffffff",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: "14px",
              border: "1px solid #d8e0ea",
              backgroundColor: "#ffffff",
              color: "#475569",
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaveDisabled}
            style={{
              border: "none",
              borderRadius: "14px",
              backgroundColor: isSaveDisabled ? "#9eb7bc" : BRAND_PRIMARY,
              color: "#ffffff",
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: isSaveDisabled ? "not-allowed" : "pointer",
              boxShadow: isSaveDisabled ? "none" : "0 10px 24px rgba(21, 99, 114, 0.22)",
            }}
          >
            {submitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
