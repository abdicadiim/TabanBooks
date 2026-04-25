import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { accountantAPI } from "../../services/api";
import {
  CURRENCY_ADJUSTMENT_CURRENCIES,
  CURRENCY_ADJUSTMENT_LIST_PERIOD_OPTIONS,
  type CurrencyAdjustmentPeriod,
} from "./currencyAdjustmentConfig";
import type {
  CurrencyAdjustment,
  CurrencyAdjustmentPreviewResult,
} from "./currencyAdjustmentTypes";
import {
  formatCurrencyAdjustmentMoney,
  getCurrencyAdjustmentIdentifier,
  isCurrencyAdjustmentInPeriod,
  toCurrencyAdjustmentInputDate,
} from "./currencyAdjustmentUtils";

export default function CurrencyAdjustments() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [adjustments, setAdjustments] = useState<CurrencyAdjustment[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<CurrencyAdjustmentPeriod>("This Month");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [form, setForm] = useState({
    currency: "",
    date: new Date().toISOString().slice(0, 10),
    previousExchangeRate: "1",
    exchangeRate: "",
    notes: "",
  });

  const [preview, setPreview] = useState<CurrencyAdjustmentPreviewResult | null>(
    null,
  );

  const loadAdjustments = async () => {
    setLoading(true);
    try {
      const response = await accountantAPI.getCurrencyAdjustments({ limit: 1000 });
      if (response?.success) {
        setAdjustments(response.data || []);
      } else {
        setAdjustments([]);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to load currency adjustments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdjustments();
  }, []);

  const filteredAdjustments = useMemo(
    () => adjustments.filter((adjustment) => isCurrencyAdjustmentInPeriod(adjustment.date, filter)),
    [adjustments, filter]
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openCreate = () => {
    setForm({
      currency: "",
      date: new Date().toISOString().slice(0, 10),
      previousExchangeRate: "1",
      exchangeRate: "",
      notes: "",
    });
    setPreview(null);
    setShowCreateModal(true);
  };

  const onPreview = async () => {
    if (!form.currency || !form.date || !form.exchangeRate || !form.notes.trim()) {
      toast.error("Currency, date, exchange rate and notes are required.");
      return;
    }

    const payload = {
      currency: form.currency,
      date: form.date,
      previousExchangeRate: Number(form.previousExchangeRate || 1),
      exchangeRate: Number(form.exchangeRate),
      notes: form.notes.trim(),
    };

    if (!payload.exchangeRate || payload.exchangeRate <= 0) {
      toast.error("Exchange rate must be greater than 0.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await accountantAPI.previewCurrencyAdjustment(payload);
      if (!response?.success) {
        toast.error("Failed to preview adjustment.");
        return;
      }
      const previewData: CurrencyAdjustmentPreviewResult = response.data;
      if (!previewData.affectedAccounts?.length) {
        toast.error("No open foreign-currency transactions found for this currency.");
        return;
      }
      setPreview({
        ...previewData,
        affectedAccounts: previewData.affectedAccounts.map((a) => ({ ...a, selected: true })),
      });
      setShowCreateModal(false);
      setShowConfirmModal(true);
    } catch (error: any) {
      toast.error(error?.message || "Failed to preview adjustment.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAccountRow = (accountId: string) => {
    setPreview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        affectedAccounts: prev.affectedAccounts.map((row) =>
          row.accountId === accountId ? { ...row, selected: !row.selected } : row
        ),
      };
    });
  };

  const selectedPreviewRows = (preview?.affectedAccounts || []).filter((row) => row.selected !== false);
  const selectedGainLoss = selectedPreviewRows.reduce((sum, row) => sum + (Number(row.gainOrLossBCY) || 0), 0);

  const onMakeAdjustment = async () => {
    if (!preview) return;
    if (!selectedPreviewRows.length) {
      toast.error("Select at least one account to make an adjustment.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        currency: form.currency,
        date: form.date,
        previousExchangeRate: Number(form.previousExchangeRate || preview.previousExchangeRate || 1),
        exchangeRate: Number(form.exchangeRate),
        notes: form.notes.trim(),
        affectedAccounts: selectedPreviewRows,
      };

      const response = await accountantAPI.createCurrencyAdjustment(payload);
      if (!response?.success) {
        toast.error("Failed to create adjustment.");
        return;
      }
      toast.success("Base currency adjustment created successfully.");
      setShowConfirmModal(false);
      setPreview(null);
      await loadAdjustments();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create adjustment.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteOne = async (id: string) => {
    if (!window.confirm("Delete this base currency adjustment?")) return;
    try {
      const response = await accountantAPI.deleteCurrencyAdjustment(id);
      if (!response?.success) {
        toast.error("Failed to delete adjustment.");
        return;
      }
      toast.success("Adjustment deleted.");
      await loadAdjustments();
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete adjustment.");
    }
  };

  const deleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected adjustment(s)?`)) return;

    try {
      setSubmitting(true);
      await Promise.all(selectedIds.map((id) => accountantAPI.deleteCurrencyAdjustment(id)));
      toast.success("Selected adjustments deleted.");
      setSelectedIds([]);
      await loadAdjustments();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete selected adjustments.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", background: "#f8fafc" }}>
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: "#111827" }}>Base Currency Adjustments</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
            Revalue open foreign-currency balances using updated exchange rates.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={deleteSelected}
            disabled={!selectedIds.length || submitting}
            style={{
              padding: "8px 12px",
              border: "1px solid #fecaca",
              background: selectedIds.length ? "#fff1f2" : "#f8fafc",
              color: selectedIds.length ? "#b91c1c" : "#94a3b8",
              borderRadius: 8,
              cursor: selectedIds.length ? "pointer" : "not-allowed",
              fontWeight: 600,
            }}
          >
            Delete Selected
          </button>
          <button
            onClick={openCreate}
            style={{
              padding: "8px 14px",
              border: "none",
              background: "#156372",
              color: "white",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            + Make an Adjustment
          </button>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: "#64748b" }}>Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as CurrencyAdjustmentPeriod)}
            style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", background: "white" }}
          >
            {CURRENCY_ADJUSTMENT_LIST_PERIOD_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}></th>
                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Date</th>
                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Currency</th>
                <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>Prev Rate</th>
                <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>New Rate</th>
                <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>Gain/Loss (BCY)</th>
                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Notes</th>
                <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 18, color: "#64748b" }}>Loading adjustments...</td>
                </tr>
              ) : filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 18, color: "#64748b" }}>
                    No adjustments found. Create one using "+ Make an Adjustment".
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((a) => {
                  const id = getCurrencyAdjustmentIdentifier(a);
                  if (!id) return null;
                  const selected = selectedIds.includes(id);
                  return (
                    <tr key={id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <input type="checkbox" checked={selected} onChange={() => toggleSelection(id)} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>{toCurrencyAdjustmentInputDate(a.date)}</td>
                      <td style={{ padding: "10px 12px" }}>{a.currency}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>{formatCurrencyAdjustmentMoney(Number(a.previousExchangeRate || 1))}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>{formatCurrencyAdjustmentMoney(Number(a.exchangeRate || 0))}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: Number(a.gainOrLoss) >= 0 ? "#047857" : "#b91c1c", fontWeight: 700 }}>
                        {Number(a.gainOrLoss) >= 0 ? "+" : ""}{formatCurrencyAdjustmentMoney(Number(a.gainOrLoss || 0))}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#475569", maxWidth: 320 }}>{a.notes}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                          <button
                            onClick={() => deleteOne(id)}
                            style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#b91c1c", borderRadius: 6, padding: "5px 8px", cursor: "pointer" }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ width: 700, maxWidth: "calc(100vw - 32px)", background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>Make a Base Currency Adjustment</h3>
            <p style={{ marginTop: 0, color: "#64748b", fontSize: 13 }}>
              Step 1: Enter adjustment details, then continue to confirm affected accounts.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, color: "#334155" }}>Currency *</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                  style={{ width: "100%", marginTop: 6, padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }}
                >
                  <option value="">Select currency</option>
                  {CURRENCY_ADJUSTMENT_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#334155" }}>Adjustment Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  style={{ width: "100%", marginTop: 6, padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#334155" }}>Previous Exchange Rate</label>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={form.previousExchangeRate}
                  onChange={(e) => setForm((prev) => ({ ...prev, previousExchangeRate: e.target.value }))}
                  style={{ width: "100%", marginTop: 6, padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#334155" }}>New Exchange Rate *</label>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={form.exchangeRate}
                  onChange={(e) => setForm((prev) => ({ ...prev, exchangeRate: e.target.value }))}
                  style={{ width: "100%", marginTop: 6, padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }}
                />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 13, color: "#334155" }}>Notes (mandatory) *</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Reason for adjustment"
                style={{ width: "100%", marginTop: 6, padding: "10px", border: "1px solid #cbd5e1", borderRadius: 8, resize: "vertical" }}
              />
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ border: "1px solid #d1d5db", background: "white", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={onPreview}
                disabled={submitting}
                style={{ border: "none", background: "#156372", color: "white", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}
              >
                {submitting ? "Loading..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ width: 980, maxWidth: "calc(100vw - 24px)", background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>Confirm Base Currency Adjustment</h3>
            <p style={{ marginTop: 0, color: "#64748b", fontSize: 13 }}>
              FCY = Foreign Currency, BCY = Base Currency. Select accounts and click "Make an Adjustment".
            </p>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, marginBottom: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div><strong>Currency:</strong> {preview.currency}</div>
              <div><strong>Previous Rate:</strong> {formatCurrencyAdjustmentMoney(preview.previousExchangeRate)}</div>
              <div><strong>New Rate:</strong> {formatCurrencyAdjustmentMoney(preview.exchangeRate)}</div>
            </div>

            <div style={{ maxHeight: "52vh", overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>Select</th>
                    <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Account</th>
                    <th style={{ padding: "10px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>Balance (FCY)</th>
                    <th style={{ padding: "10px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>Balance (BCY)</th>
                    <th style={{ padding: "10px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>Revalued Balance (BCY)</th>
                    <th style={{ padding: "10px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>Gain or Loss (BCY)</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.affectedAccounts.map((row) => (
                    <tr key={row.accountId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={row.selected !== false}
                          onChange={() => toggleAccountRow(row.accountId)}
                        />
                      </td>
                      <td style={{ padding: "10px" }}>{row.accountName}</td>
                      <td style={{ padding: "10px", textAlign: "right" }}>{formatCurrencyAdjustmentMoney(row.balanceFCY)}</td>
                      <td style={{ padding: "10px", textAlign: "right" }}>{formatCurrencyAdjustmentMoney(row.balanceBCY)}</td>
                      <td style={{ padding: "10px", textAlign: "right" }}>{formatCurrencyAdjustmentMoney(row.revaluedBalanceBCY)}</td>
                      <td style={{ padding: "10px", textAlign: "right", color: row.gainOrLossBCY >= 0 ? "#047857" : "#b91c1c", fontWeight: 700 }}>
                        {row.gainOrLossBCY >= 0 ? "+" : ""}{formatCurrencyAdjustmentMoney(row.gainOrLossBCY)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 10, textAlign: "right", fontSize: 15 }}>
              <strong>Total Gain/Loss (Selected): </strong>
              <span style={{ color: selectedGainLoss >= 0 ? "#047857" : "#b91c1c", fontWeight: 800 }}>
                {selectedGainLoss >= 0 ? "+" : ""}{formatCurrencyAdjustmentMoney(selectedGainLoss)}
              </span>
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setShowCreateModal(true);
                }}
                style={{ border: "1px solid #d1d5db", background: "white", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
              >
                Back
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPreview(null);
                }}
                style={{ border: "1px solid #d1d5db", background: "white", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={onMakeAdjustment}
                disabled={submitting}
                style={{ border: "none", background: "#156372", color: "white", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}
              >
                {submitting ? "Saving..." : "Make an Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
