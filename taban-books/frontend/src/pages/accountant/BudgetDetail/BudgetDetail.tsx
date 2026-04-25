import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteBudget,
  getBudgetById,
  getBudgets,
  saveBudget,
} from "../accountantModel";
import {
  buildLinesFromSelections,
  BudgetLine,
  getPeriods,
  sumLineBudget,
  sumByType,
} from "../budgetUtils";
import "./BudgetDetail.css";

type ReportTab = "profit-loss" | "balance-sheet" | "cash-flow";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

function exportRows(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>
) {
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

export default function BudgetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [budget, setBudget] = useState<any>(null);
  const [allBudgets, setAllBudgets] = useState<any[]>([]);
  const [tab, setTab] = useState<ReportTab>("profit-loss");
  const [lines, setLines] = useState<BudgetLine[]>([]);

  const [showPrefill, setShowPrefill] = useState(false);
  const [prefillBudgetId, setPrefillBudgetId] = useState("");

  const [showAutofill, setShowAutofill] = useState(false);
  const [autofillAccount, setAutofillAccount] = useState("");
  const [autofillMode, setAutofillMode] = useState("fixed");
  const [autofillTarget, setAutofillTarget] = useState("first");
  const [autofillValue, setAutofillValue] = useState("0");

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const [budgetRes, budgetsRes] = await Promise.all([
        getBudgetById(id),
        getBudgets({ limit: 1000 }),
      ]);
      if (!budgetRes) {
        navigate("/accountant/budgets");
        return;
      }
      const selectedIncomeAccounts = budgetRes.selectedIncomeAccounts || [];
      const selectedExpenseAccounts = budgetRes.selectedExpenseAccounts || [];
      const selectedAssetAccounts = budgetRes.selectedAssetAccounts || [];
      const selectedLiabilityAccounts = budgetRes.selectedLiabilityAccounts || [];
      const selectedEquityAccounts = budgetRes.selectedEquityAccounts || [];
      const fiscalYearLabel =
        budgetRes.fiscalYearLabel ||
        `Jan ${budgetRes.fiscalYear} - Dec ${budgetRes.fiscalYear}`;
      const periods = getPeriods(
        (budgetRes.budgetPeriod || "Monthly") as any,
        fiscalYearLabel
      );
      const generated = buildLinesFromSelections({
        periods,
        income: selectedIncomeAccounts,
        expense: selectedExpenseAccounts,
        asset: selectedAssetAccounts,
        liability: selectedLiabilityAccounts,
        equity: selectedEquityAccounts,
      });
      const normalizedLines =
        Array.isArray(budgetRes.lines) && budgetRes.lines.length > 0
          ? budgetRes.lines
          : generated;
      setBudget({
        ...budgetRes,
        fiscalYearLabel,
      });
      setLines(normalizedLines);
      setAutofillAccount(normalizedLines[0]?.accountName || normalizedLines[0]?.account || "");
      if (budgetsRes?.success) {
        setAllBudgets(budgetsRes.data || []);
      }
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const periods = useMemo(() => {
    if (!lines.length) return [];
    return lines[0].periods?.map((p: any) => p.period) || [];
  }, [lines]);

  const incomeLines = lines.filter((l) => l.accountType === "income");
  const expenseLines = lines.filter((l) => l.accountType === "expense");
  const assetLines = lines.filter((l) => l.accountType === "asset");
  const liabilityLines = lines.filter((l) => l.accountType === "liability");
  const equityLines = lines.filter((l) => l.accountType === "equity");

  const incomeTotal = sumByType(lines, "income");
  const expenseTotal = sumByType(lines, "expense");
  const netProfitLoss = incomeTotal - expenseTotal;
  const assetTotal = sumByType(lines, "asset");
  const liabilityTotal = sumByType(lines, "liability");
  const equityTotal = sumByType(lines, "equity");
  const mismatch = assetTotal - (liabilityTotal + equityTotal);

  const setPeriodAmount = (lineIndex: number, periodIndex: number, value: string) => {
    const amount = Number(value) || 0;
    setLines((prev) =>
      prev.map((line, i) =>
        i !== lineIndex
          ? line
          : {
              ...line,
              periods: line.periods.map((p: any, pi: number) =>
                pi === periodIndex ? { ...p, amount } : p
              ),
            }
      )
    );
  };

  const handleSave = async () => {
    if (!budget) return;
    setSaving(true);
    const success = await saveBudget({
      ...budget,
      lines,
    });
    setSaving(false);
    if (!success) {
      alert("Failed to save budget changes.");
      return;
    }
    alert("Budget updated successfully.");
  };

  const handleClone = async () => {
    if (!budget) return;
    const clonePayload = {
      ...budget,
      _id: undefined,
      id: undefined,
      name: `${budget.name} (Copy)`,
      createdAt: undefined,
      updatedAt: undefined,
    };
    const success = await saveBudget(clonePayload);
    if (!success) {
      alert("Failed to clone budget.");
      return;
    }
    navigate("/accountant/budgets");
  };

  const handleDelete = async () => {
    if (!budget?._id && !budget?.id) return;
    if (!window.confirm(`Delete "${budget.name}"?`)) return;
    const success = await deleteBudget(budget._id || budget.id);
    if (!success) {
      alert("Failed to delete budget.");
      return;
    }
    navigate("/accountant/budgets");
  };

  const applyPrefill = async () => {
    if (!prefillBudgetId) return;
    const prevBudget = allBudgets.find(
      (b: any) => (b._id || b.id) === prefillBudgetId
    );
    if (!prevBudget) return;
    const prevBudgetFull =
      prevBudget.lines?.length > 0
        ? prevBudget
        : await getBudgetById(prevBudget._id || prevBudget.id);
    if (!prevBudgetFull?.lines) return;

    const updated = lines.map((line) => {
      const prevLine = prevBudgetFull.lines.find(
        (pl: any) => (pl.accountName || pl.account) === (line.accountName || line.account)
      );
      if (!prevLine) return line;
      return {
        ...line,
        periods: line.periods.map((p: any, i: number) => ({
          ...p,
          amount: Number(prevLine.periods?.[i]?.amount || 0),
          actualAmount: Number(prevLine.periods?.[i]?.amount || 0),
        })),
      };
    });
    setLines(updated);
    setShowPrefill(false);
  };

  const applyAutofill = () => {
    const step = Number(autofillValue) || 0;
    setLines((prev) =>
      prev.map((line) => {
        if ((line.accountName || line.account) !== autofillAccount) return line;
        const existing = [...line.periods];
        if (!existing.length) return line;

        const first = Number(existing[0].amount) || 0;
        const next = existing.map((period, idx) => {
          if (idx === 0) return period;
          let amount = Number(period.amount) || 0;
          if (autofillTarget === "first") {
            if (autofillMode === "fixed") amount = first;
            if (autofillMode === "adjust-amount") amount = first + step * idx;
            if (autofillMode === "adjust-percent") {
              amount = first * Math.pow(1 + step / 100, idx);
            }
          } else {
            if (autofillMode === "fixed") amount = first;
            if (autofillMode === "adjust-amount") amount = amount + step;
            if (autofillMode === "adjust-percent") amount = amount * (1 + step / 100);
          }
          return { ...period, amount: Number(amount.toFixed(2)) };
        });
        return { ...line, periods: next };
      })
    );
    setShowAutofill(false);
  };

  const exportBudget = (ext: "pdf" | "xls" | "xlsx" | "csv") => {
    if (ext === "pdf") {
      window.print();
      return;
    }
    const headers = ["Account", ...periods, "Total"];
    const rows = lines.map((line) => [
      line.accountName || line.account,
      ...line.periods.map((p) => Number(p.amount || 0).toFixed(2)),
      sumLineBudget(line).toFixed(2),
    ]);
    exportRows(`${budget?.name || "budget"}.${ext}`, headers, rows);
  };

  const renderEditableTable = (subset: BudgetLine[], title: string) => (
    <section className="budget-card" style={{ marginBottom: 20 }}>
      <div className="budget-card-header">
        <h3>{title}</h3>
        <span>{subset.length} accounts</span>
      </div>
      <div className="budget-table-wrap">
        <table className="budget-table">
          <thead>
            <tr>
              <th>Account</th>
              {periods.map((p) => (
                <th key={p} className="numeric-cell">
                  {p}
                </th>
              ))}
              <th className="numeric-cell">Total</th>
            </tr>
          </thead>
          <tbody>
            {subset.map((line) => {
              const lineIndex = lines.findIndex(
                (l) => (l.accountName || l.account) === (line.accountName || line.account)
              );
              return (
                <tr key={`${line.account}-${line.accountType}`}>
                  <td>{line.accountName || line.account}</td>
                  {line.periods.map((p, periodIndex) => (
                    <td key={`${p.period}-${periodIndex}`}>
                      <input
                        className="budget-input"
                        type="number"
                        value={Number(p.amount || 0)}
                        onChange={(e) => setPeriodAmount(lineIndex, periodIndex, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="numeric-cell strong-cell">{formatMoney(sumLineBudget(line))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  if (loading) {
    return <div className="budget-state">Loading budget...</div>;
  }

  if (!budget) {
    return <div className="budget-state">Budget not found.</div>;
  }

  const budgetId = budget._id || budget.id;
  const priorBudgets = allBudgets.filter(
    (b: any) => (b._id || b.id) !== budgetId && Number(b.fiscalYear) < Number(budget.fiscalYear)
  );

  return (
    <div className="budget-page">
      <section className="budget-header">
        <div>
          <p className="budget-label">Company Budget</p>
          <h1>{budget.name}</h1>
          <div className="budget-meta">
            <span>Fiscal Year: {budget.fiscalYearLabel || budget.fiscalYear}</span>
            <span>Period: {budget.budgetPeriod}</span>
          </div>
        </div>
        <div className="budget-toolbar">
          <button className="btn btn-ghost" onClick={() => navigate(`/accountant/budgets/${budgetId}/edit`)}>Edit</button>
          <button className="btn btn-ghost" onClick={() => setShowPrefill(true)}>Pre-fill</button>
          <button className="btn btn-ghost" onClick={() => setShowAutofill(true)}>Auto-Fill</button>
          <button className="btn btn-ghost" onClick={() => navigate(`/accountant/budgets/${budgetId}/actuals`)}>Budget Vs Actuals</button>
          <button className="btn btn-ghost" onClick={() => exportBudget("pdf")}>PDF</button>
          <button className="btn btn-ghost" onClick={() => exportBudget("xls")}>XLS</button>
          <button className="btn btn-ghost" onClick={() => exportBudget("xlsx")}>XLSX</button>
          <button className="btn btn-ghost" onClick={() => window.print()}>Print</button>
          <button className="btn btn-ghost" onClick={handleClone}>Clone</button>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </section>

      <section className="budget-summary-grid">
        <article className="summary-card">
          <p>Total Income</p>
          <h4>{formatMoney(incomeTotal)}</h4>
        </article>
        <article className="summary-card">
          <p>Total Expense</p>
          <h4>{formatMoney(expenseTotal)}</h4>
        </article>
        <article className="summary-card">
          <p>Net Profit / Loss</p>
          <h4 className={netProfitLoss >= 0 ? "positive" : "negative"}>{formatMoney(netProfitLoss)}</h4>
        </article>
      </section>

      <div className="budget-tabs">
        <button className={tab === "profit-loss" ? "tab active" : "tab"} onClick={() => setTab("profit-loss")}>
          Profit and Loss
        </button>
        <button className={tab === "balance-sheet" ? "tab active" : "tab"} onClick={() => setTab("balance-sheet")}>
          Balance Sheet
        </button>
        <button className={tab === "cash-flow" ? "tab active" : "tab"} onClick={() => setTab("cash-flow")}>
          Cash Flow Statement
        </button>
      </div>

      {tab === "profit-loss" && (
        <div>
          {renderEditableTable(incomeLines, "Income")}
          {renderEditableTable(expenseLines, "Expense")}
          <section className="budget-card budget-highlight">
            Net Profit / Loss: {formatMoney(netProfitLoss)}
          </section>
        </div>
      )}

      {tab === "balance-sheet" && (
        <div>
          {renderEditableTable(assetLines, "Assets")}
          {renderEditableTable(liabilityLines, "Liabilities")}
          {renderEditableTable(equityLines, "Equity")}
          {Math.abs(mismatch) > 0.0001 && (
            <section className="budget-card budget-warning">
              Budget Mismatch Account (Equity): {formatMoney(mismatch)}
            </section>
          )}
          <section className="budget-card budget-highlight">
            Total Assets ({formatMoney(assetTotal)}) = Total Liabilities ({formatMoney(liabilityTotal)}) + Total Equity ({formatMoney(equityTotal + mismatch)})
          </section>
        </div>
      )}

      {tab === "cash-flow" && (
        <section className="budget-card cashflow-card">
          <div className="cashflow-row">
            <span>Cash Inflow (Income)</span>
            <strong>{formatMoney(incomeTotal)}</strong>
          </div>
          <div className="cashflow-row">
            <span>Cash Outflow (Expense)</span>
            <strong>{formatMoney(expenseTotal)}</strong>
          </div>
          <div className="cashflow-row total">
            <span>Net Cash Flow</span>
            <strong>{formatMoney(netProfitLoss)}</strong>
          </div>
          {Math.abs(mismatch) > 0.0001 && (
            <div className="cashflow-mismatch">Budget Mismatch Account: {formatMoney(mismatch)}</div>
          )}
        </section>
      )}

      <div className="budget-footer-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate("/accountant/budgets")}>Back</button>
      </div>

      {showPrefill && (
        <div className="budget-modal-overlay">
          <div className="budget-modal">
            <h3>Pre-fill from Previous Years' Actuals</h3>
            <select
              className="modal-field"
              value={prefillBudgetId}
              onChange={(e) => setPrefillBudgetId(e.target.value)}
            >
              <option value="">Select previous budget</option>
              {priorBudgets.map((b: any) => (
                <option key={b._id || b.id} value={b._id || b.id}>
                  {b.name} ({b.fiscalYear})
                </option>
              ))}
            </select>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowPrefill(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={applyPrefill} disabled={!prefillBudgetId}>Pre-fill</button>
            </div>
          </div>
        </div>
      )}

      {showAutofill && (
        <div className="budget-modal-overlay">
          <div className="budget-modal wide">
            <h3>Auto-Fill Amounts</h3>
            <div className="autofill-grid">
              <select className="modal-field" value={autofillAccount} onChange={(e) => setAutofillAccount(e.target.value)}>
                {lines.map((l) => (
                  <option key={`${l.accountType}-${l.account}`} value={l.accountName || l.account}>
                    {l.accountName || l.account}
                  </option>
                ))}
              </select>
              <select className="modal-field" value={autofillMode} onChange={(e) => setAutofillMode(e.target.value)}>
                <option value="fixed">Apply fixed amount for each period</option>
                <option value="adjust-amount">Adjust by amount for each period</option>
                <option value="adjust-percent">Adjust by percentage for each period</option>
              </select>
              <select className="modal-field" value={autofillTarget} onChange={(e) => setAutofillTarget(e.target.value)}>
                <option value="first">Use first period's amount</option>
                <option value="existing">Use each period's existing amount</option>
              </select>
              <input
                className="modal-field"
                type="number"
                value={autofillValue}
                onChange={(e) => setAutofillValue(e.target.value)}
                placeholder="Value"
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowAutofill(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={applyAutofill}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
