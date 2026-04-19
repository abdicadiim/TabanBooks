import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import {
  ACCOUNT_TYPE_LABELS,
  getAccountTypeCategoryDescription,
  getAccountTypeCategoryLabel,
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
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
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
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "880px",
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "#0f172a" }}>
              {title}
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#64748b" }}>
              Keep account setup simple and consistent across your chart.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              backgroundColor: "transparent",
              color: "#ef4444",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            padding: "24px",
            display: "grid",
            gap: "24px",
            gridTemplateColumns: "minmax(0, 1fr) 280px",
          }}
        >
          <div style={{ display: "grid", gap: "18px" }}>
            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                Account Type
              </span>
              <select
                value={formData.accountType}
                onChange={(event) => handleFieldChange("accountType", event.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  backgroundColor: "#ffffff",
                }}
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
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                Account Name
              </span>
              <input
                type="text"
                value={formData.accountName}
                onChange={(event) => handleFieldChange("accountName", event.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                Account Code
              </span>
              <input
                type="text"
                value={formData.accountCode}
                onChange={(event) => handleFieldChange("accountCode", event.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                Description
              </span>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(event) =>
                  handleFieldChange("description", event.target.value.slice(0, 500))
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                color: "#334155",
              }}
            >
              <input
                type="checkbox"
                checked={formData.isSubAccount}
                onChange={(event) => handleFieldChange("isSubAccount", event.target.checked)}
              />
              <span>Make this a sub-account</span>
            </label>

            {formData.isSubAccount && (
              <label style={{ display: "grid", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                  Parent Account
                </span>
                <select
                  value={formData.parentAccountId}
                  onChange={(event) => handleFieldChange("parentAccountId", event.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    backgroundColor: "#ffffff",
                  }}
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
            )}

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                color: "#334155",
              }}
            >
              <input
                type="checkbox"
                checked={formData.addToWatchlist}
                onChange={(event) =>
                  handleFieldChange("addToWatchlist", event.target.checked)
                }
              />
              <span>Add this account to the dashboard watchlist</span>
            </label>
          </div>

          <div
            style={{
              borderRadius: "12px",
              backgroundColor: "#0f172a",
              color: "#e2e8f0",
              padding: "18px",
              alignSelf: "start",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
              {getAccountTypeCategoryLabel(formData.accountType)}
            </h3>
            <p style={{ margin: "10px 0 0", fontSize: "13px", lineHeight: 1.6 }}>
              {getAccountTypeCategoryDescription(formData.accountType)}
            </p>
          </div>
        </div>

        <div
          style={{
            padding: "18px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            gap: "12px",
            justifyContent: "flex-start",
          }}
        >
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaveDisabled}
            style={{
              border: "none",
              borderRadius: "8px",
              backgroundColor: isSaveDisabled ? "#94a3b8" : "#156372",
              color: "#ffffff",
              padding: "10px 18px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: isSaveDisabled ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Saving..." : submitLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#334155",
              padding: "10px 18px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
