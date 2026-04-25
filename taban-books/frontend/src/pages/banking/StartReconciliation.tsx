import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { bankAccountsAPI, bankReconciliationsAPI, bankTransactionsAPI } from "../../services/api";

const toAmount = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatAmount = (value: number, currencyCode = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(Number(value || 0));

const toDateInput = (value: Date) => value.toISOString().split("T")[0];

export default function StartReconciliation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [account, setAccount] = useState<any>(location.state?.account || null);
  const accountId = account?._id || account?.id || id;

  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      startDate: toDateInput(monthStart),
      endDate: toDateInput(today),
      closingBalance: "",
    };
  });

  const loadData = async () => {
    if (!accountId) return;
    try {
      setLoading(true);
      setError("");

      const [accountRes, txRes] = await Promise.all([
        bankAccountsAPI.getById(accountId),
        bankTransactionsAPI.getAll({ account_id: accountId, per_page: 1000 }),
      ]);

      if (accountRes?.bankaccount) {
        setAccount(accountRes.bankaccount);
        setFormData((prev) => ({
          ...prev,
          closingBalance:
            prev.closingBalance === ""
              ? String(toAmount(accountRes.bankaccount.balance).toFixed(2))
              : prev.closingBalance,
        }));
      }

      const allowedStatuses = new Set(["manually_added", "matched", "categorized"]);
      const eligibleTx = (txRes?.banktransactions || []).filter((txn: any) => {
        const status = String(txn.status || "").toLowerCase().trim();
        return allowedStatuses.has(status) && !txn.isReconciled;
      });

      setTransactions(eligibleTx);
    } catch (err: any) {
      console.error("Failed to load reconciliation data:", err);
      setError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accountId]);

  const filteredTransactions = useMemo(() => {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    return transactions.filter((txn) => {
      const d = new Date(txn.date);
      return d >= start && d <= end;
    });
  }, [transactions, formData.startDate, formData.endDate]);

  const selectedTransactions = useMemo(
    () =>
      filteredTransactions.filter((txn) =>
        selectedTransactionIds.includes(String(txn._id || txn.id))
      ),
    [filteredTransactions, selectedTransactionIds]
  );

  const clearedAmount = useMemo(
    () =>
      Number(
        selectedTransactions
          .reduce((sum, txn) => {
            const absAmount = Math.abs(toAmount(txn.amount));
            return sum + (txn.debitOrCredit === "credit" ? absAmount : -absAmount);
          }, 0)
          .toFixed(2)
      ),
    [selectedTransactions]
  );

  const closingBalance = toAmount(formData.closingBalance);
  const difference = Number((closingBalance - clearedAmount).toFixed(2));

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedTransactionIds([]);
      return;
    }
    setSelectedTransactionIds(
      filteredTransactions.map((txn) => String(txn._id || txn.id))
    );
  };

  const toggleSelectOne = (txnId: string, checked: boolean) => {
    setSelectedTransactionIds((prev) => {
      if (checked) return [...new Set([...prev, txnId])];
      return prev.filter((id) => id !== txnId);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;

    if (selectedTransactionIds.length === 0) {
      setError("Select at least one transaction to reconcile.");
      return;
    }

    if (Math.abs(difference) > 0.009) {
      setError("Difference must be zero before you can reconcile.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await bankReconciliationsAPI.create(accountId, {
        start_date: formData.startDate,
        end_date: formData.endDate,
        closing_balance: closingBalance,
        transaction_ids: selectedTransactionIds,
      });

      navigate(`/banking/account/${accountId}/reconciliations`, { state: { account } });
    } catch (err: any) {
      console.error("Failed to start reconciliation:", err);
      setError(err?.message || "Failed to reconcile account");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "24px", color: "#156372", fontWeight: 600 }}>Loading reconciliation screen...</div>;
  }

  return (
    <div style={{ paddingTop: "56px", backgroundColor: "#f7f8fc", paddingRight: "24px", paddingBottom: "24px", minHeight: "calc(100vh - 56px)" }}>
      <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "8px" }}>
        <button
          onClick={() => navigate(`/banking/account/${accountId}/reconciliations`, { state: { account } })}
          style={{ border: "none", background: "none", color: "#156372", cursor: "pointer", padding: 0, marginBottom: "16px", fontSize: "14px" }}
        >
          Back to Reconciliations
        </button>

        <h1 style={{ margin: 0, fontSize: "24px", color: "#111827", marginBottom: "18px" }}>
          {(account?.accountName || "Bank Account")} - Start Reconciliation
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", color: "#111827" }}>
              Start Date
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "10px" }}
                required
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", color: "#111827" }}>
              End Date
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "10px" }}
                required
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", color: "#111827" }}>
              Closing Balance
              <input
                type="number"
                step="0.01"
                value={formData.closingBalance}
                onChange={(e) => setFormData((prev) => ({ ...prev, closingBalance: e.target.value }))}
                style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "10px" }}
                required
              />
            </label>
          </div>

          <div style={{ marginBottom: "14px", display: "flex", gap: "16px", fontSize: "14px", color: "#111827" }}>
            <strong>Cleared: {formatAmount(clearedAmount, account?.currencyCode || "USD")}</strong>
            <strong>Difference: <span style={{ color: Math.abs(difference) > 0.009 ? "#b91c1c" : "#059669" }}>{formatAmount(difference, account?.currencyCode || "USD")}</span></strong>
          </div>

          {error && (
            <div style={{ marginBottom: "12px", color: "#b91c1c", backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "10px 12px", borderRadius: "6px" }}>
              {error}
            </div>
          )}

          <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", marginBottom: "18px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#f9fafb" }}>
                <tr>
                  <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={filteredTransactions.length > 0 && selectedTransactionIds.length === filteredTransactions.length}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", textAlign: "left", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Date</th>
                  <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", textAlign: "left", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Reference</th>
                  <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", textAlign: "left", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Type</th>
                  <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", textAlign: "left", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", textAlign: "right", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "14px 12px", color: "#6b7280" }}>
                      No eligible transactions in this date range.
                    </td>
                  </tr>
                )}
                {filteredTransactions.map((txn) => {
                  const txnId = String(txn._id || txn.id);
                  return (
                    <tr key={txnId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <input
                          type="checkbox"
                          checked={selectedTransactionIds.includes(txnId)}
                          onChange={(e) => toggleSelectOne(txnId, e.target.checked)}
                        />
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "14px", color: "#111827" }}>
                        {new Date(txn.date).toLocaleDateString("en-GB")}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "14px", color: "#6b7280" }}>
                        {txn.referenceNumber || "-"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "14px", color: "#111827" }}>
                        {txn.transactionType}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "12px", color: "#111827", textTransform: "uppercase" }}>
                        {txn.status}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "14px", color: txn.debitOrCredit === "credit" ? "#059669" : "#b91c1c", textAlign: "right", fontWeight: 600 }}>
                        {txn.debitOrCredit === "credit" ? "+" : "-"}{formatAmount(Math.abs(toAmount(txn.amount)), account?.currencyCode || "USD")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={() => navigate(`/banking/account/${accountId}/reconciliations`, { state: { account } })}
              style={{ border: "1px solid #d1d5db", backgroundColor: "white", borderRadius: "6px", padding: "10px 14px", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || selectedTransactionIds.length === 0}
              style={{ border: "none", backgroundColor: "#156372", color: "white", borderRadius: "6px", padding: "10px 14px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Reconciling..." : "Reconcile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

