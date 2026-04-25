import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { bankAccountsAPI, bankReconciliationsAPI } from "../../services/api";

type AccountLike = {
  _id?: string;
  id?: string;
  accountName?: string;
  currencyCode?: string;
};

const formatAmount = (value: number, currencyCode = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(Number(value || 0));

const formatDate = (value?: string | Date) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export default function Reconciliations() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [account, setAccount] = useState<AccountLike | null>(location.state?.account || null);
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const accountId = useMemo(() => account?._id || account?.id || id, [account, id]);

  const loadData = async () => {
    if (!accountId) return;
    try {
      setLoading(true);
      setError("");

      const [accountRes, reconciliationRes] = await Promise.all([
        bankAccountsAPI.getById(accountId),
        bankReconciliationsAPI.list(accountId),
      ]);

      if (accountRes?.bankaccount) {
        setAccount(accountRes.bankaccount);
      }
      setReconciliations(reconciliationRes?.reconciliations || []);
    } catch (err: any) {
      console.error("Failed to load reconciliations:", err);
      setError(err?.message || "Failed to load reconciliations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accountId]);

  const handleUndo = async (reconciliationId: string) => {
    if (!accountId) return;
    if (!window.confirm("Undo this reconciliation?")) return;
    try {
      await bankReconciliationsAPI.undo(accountId, reconciliationId);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to undo reconciliation");
    }
  };

  const handleDelete = async (reconciliationId: string) => {
    if (!accountId) return;
    if (!window.confirm("Delete this reconciliation?")) return;
    try {
      await bankReconciliationsAPI.delete(accountId, reconciliationId);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete reconciliation");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "#156372", fontWeight: 600 }}>
        Loading reconciliations...
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "56px", backgroundColor: "#f7f8fc", paddingRight: "24px", paddingBottom: "24px", minHeight: "calc(100vh - 56px)" }}>
      <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <button
            onClick={() => navigate(`/banking/account/${accountId}`, { state: { account } })}
            style={{ border: "none", background: "none", color: "#156372", cursor: "pointer", padding: 0, fontSize: "14px" }}
          >
            Back to Transactions
          </button>
          <button
            onClick={() => navigate(`/banking/account/${accountId}/reconcile/start`, { state: { account } })}
            style={{ border: "none", backgroundColor: "#156372", color: "white", borderRadius: "6px", padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}
          >
            Reconcile Now
          </button>
        </div>

        <h1 style={{ margin: 0, fontSize: "24px", color: "#111827", marginBottom: "12px" }}>
          {(account as any)?.accountName || "Bank Account"} - Reconciliations
        </h1>
        <p style={{ margin: "0 0 16px 0", color: "#6b7280", fontSize: "14px" }}>
          Reconcile your bank statements with your Taban transactions. Only the latest reconciliation can be undone or deleted.
        </p>

        {error && (
          <div style={{ marginBottom: "16px", color: "#b91c1c", backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "10px 12px", borderRadius: "6px" }}>
            {error}
          </div>
        )}

        <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "#f9fafb" }}>
              <tr>
                {["Period", "Closing Balance", "Cleared Amount", "Difference", "Status", "Reconciled On", "Actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px", fontSize: "12px", color: "#6b7280", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reconciliations.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "18px 12px", color: "#6b7280" }}>
                    No reconciliations found.
                  </td>
                </tr>
              )}
              {reconciliations.map((recon, idx) => {
                const isLatest = idx === 0;
                const status = String(recon.status || "reconciled");
                return (
                  <tr key={recon._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                      {formatDate(recon.startDate)} - {formatDate(recon.endDate)}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                      {formatAmount(recon.closingBalance, (account as any)?.currencyCode || "USD")}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                      {formatAmount(recon.clearedAmount, (account as any)?.currencyCode || "USD")}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px", color: Math.abs(Number(recon.difference || 0)) > 0.009 ? "#b91c1c" : "#059669" }}>
                      {formatAmount(recon.difference, (account as any)?.currencyCode || "USD")}
                    </td>
                    <td style={{ padding: "12px", fontSize: "12px", color: status === "undone" ? "#92400e" : "#065f46", fontWeight: 700, textTransform: "uppercase" }}>
                      {status}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px", color: "#6b7280" }}>
                      {formatDate(recon.reconciledAt || recon.createdAt)}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px" }}>
                      {status === "reconciled" && isLatest ? (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleUndo(recon._id)}
                            style={{ border: "1px solid #d1d5db", background: "white", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", color: "#111827" }}
                          >
                            Undo
                          </button>
                          <button
                            onClick={() => handleDelete(recon._id)}
                            style={{ border: "1px solid #fecaca", background: "#fef2f2", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", color: "#b91c1c" }}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

