import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBudgetById } from "../accountantModel";
import { BudgetLine, sumLineBudget, sumLineActual } from "../budgetUtils";

function exportRows(headers: string[], rows: Array<Array<string | number>>, filename: string) {
  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function BudgetVsActuals() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [reportBasis, setReportBasis] = useState("Accrual");
  const [period, setPeriod] = useState("Monthly");

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const b = await getBudgetById(id);
      if (!b) {
        navigate("/accountant/budgets");
        return;
      }
      setBudget(b);
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const rows = useMemo(() => {
    const lines: BudgetLine[] = budget?.lines || [];
    return lines
      .filter((l) => {
        if (filter === "all") return true;
        if (filter === "active") return true;
        if (filter === "budget") return true;
        if (filter === "budget-or-active") return true;
        return true;
      })
      .map((line) => {
        const budgetAmount = sumLineBudget(line);
        const actualAmount = sumLineActual(line);
        const variance = actualAmount - budgetAmount;
        return {
          account: line.accountName || line.account,
          type: line.accountType,
          budgetAmount,
          actualAmount,
          variance,
        };
      });
  }, [budget, filter]);

  if (loading) return <div style={{ padding: 24 }}>Loading budget vs actuals...</div>;

  const totalBudget = rows.reduce((s, r) => s + r.budgetAmount, 0);
  const totalActual = rows.reduce((s, r) => s + r.actualAmount, 0);
  const totalVariance = totalActual - totalBudget;

  return (
    <div style={{ padding: 24, background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Company Budget Vs Company Actuals</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportRows(["Account", "Type", "Budget", "Actual", "Variance"], rows.map((r) => [r.account, r.type, r.budgetAmount.toFixed(2), r.actualAmount.toFixed(2), r.variance.toFixed(2)]), `${budget?.name || "budget"}_vs_actuals.csv`)}>
            Export Report
          </button>
          <button onClick={() => window.print()}>Print Budget Summary</button>
          <button onClick={() => navigate(`/accountant/budgets/${id}`)}>Back</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Accounts</option>
          <option value="active">Accounts with Transactions</option>
          <option value="budget">Budget Accounts</option>
          <option value="budget-or-active">Accounts with Transactions or Budget Accounts</option>
        </select>
        <select value={reportBasis} onChange={(e) => setReportBasis(e.target.value)}>
          <option value="Accrual">Accrual</option>
          <option value="Cash">Cash</option>
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="Monthly">Monthly</option>
          <option value="Quarterly">Quarterly</option>
          <option value="Half-yearly">Half-yearly</option>
          <option value="Yearly">Yearly</option>
        </select>
      </div>

      <div style={{ marginBottom: 10, color: "#6b7280", fontSize: 13 }}>
        Basis: {reportBasis} | Period: {period}
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "auto", background: "white" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Account</th>
              <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Type</th>
              <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>Budget</th>
              <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>Actual</th>
              <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>Variance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.type}-${r.account}`}>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6" }}>{r.account}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", textTransform: "capitalize" }}>{r.type}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{r.budgetAmount.toFixed(2)}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{r.actualAmount.toFixed(2)}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", textAlign: "right", color: r.variance >= 0 ? "#065f46" : "#991b1b" }}>
                  {r.variance.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: "#f9fafb", fontWeight: 600 }}>
              <td style={{ padding: "10px 12px" }} colSpan={2}>Total</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{totalBudget.toFixed(2)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{totalActual.toFixed(2)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: totalVariance >= 0 ? "#065f46" : "#991b1b" }}>
                {totalVariance.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

