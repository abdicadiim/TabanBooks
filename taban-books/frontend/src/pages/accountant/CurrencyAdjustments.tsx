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
    <div className="flex flex-col h-full bg-white">
      {/* Header - Matching Items List style */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 min-h-[57px]">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-900">
            Base Currency Adjustments
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {selectedIds.length > 0 && (
            <button
              onClick={deleteSelected}
              disabled={submitting}
              className="px-3 py-1.5 border border-red-200 rounded text-xs font-medium text-red-600 hover:bg-red-50 bg-white shadow-sm transition-colors"
            >
              Delete ({selectedIds.length})
            </button>
          )}
          <button
            onClick={openCreate}
            className="cursor-pointer transition-all bg-[#156372] text-white px-4 py-1 rounded border-[#0d4d59] border-b-[4px] hover:brightness-110 active:border-b-[2px] active:translate-y-[2px] flex items-center gap-1 text-sm font-semibold"
          >
            + New
          </button>
        </div>
      </div>

      {/* Filter Row - Pill Style */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-100 bg-[#fbfcfd]">
        <div className="flex items-center border border-gray-200 rounded-md px-2 py-0.5 bg-white shadow-sm">
          <span className="text-[11px] text-gray-500 mr-1">Filter By:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as CurrencyAdjustmentPeriod)}
            className="text-[11px] font-medium text-slate-700 focus:ring-0 cursor-pointer border-none p-0 bg-transparent outline-none"
          >
            {CURRENCY_ADJUSTMENT_LIST_PERIOD_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#f8fafc] sticky top-0 z-10 border-b border-gray-200">
            <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-2 w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredAdjustments.length && filteredAdjustments.length > 0}
                  onChange={() => {
                    if (selectedIds.length === filteredAdjustments.length) setSelectedIds([]);
                    else setSelectedIds(filteredAdjustments.map(a => getCurrencyAdjustmentIdentifier(a)));
                  }}
                  className="rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                />
              </th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Currency</th>
              <th className="px-4 py-2 text-right">Exchange Rate</th>
              <th className="px-4 py-2 text-right">Gain or Loss</th>
              <th className="px-4 py-2">Notes</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 italic">Loading adjustments...</td>
              </tr>
            ) : filteredAdjustments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="text-gray-400 text-sm">Record a Base Currency Adjustment to correct fluctuations in exchange rates</div>
                </td>
              </tr>
            ) : (
              filteredAdjustments.map((a) => {
                const id = getCurrencyAdjustmentIdentifier(a);
                if (!id) return null;
                const selected = selectedIds.includes(id);
                return (
                  <tr key={id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelection(id)}
                        className="rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-700">{toCurrencyAdjustmentInputDate(a.date)}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-600">{a.currency}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-600 text-right">{formatCurrencyAdjustmentMoney(Number(a.exchangeRate || 0))}</td>
                    <td className={`px-4 py-2.5 text-sm text-right font-semibold ${Number(a.gainOrLoss) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {Number(a.gainOrLoss) >= 0 ? "+" : ""}{formatCurrencyAdjustmentMoney(Number(a.gainOrLoss || 0))}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-500 truncate max-w-[240px]" title={a.notes}>{a.notes}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => deleteOne(id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[1200] p-4">
          <div className="w-full max-w-[600px] bg-white rounded-lg shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-900">Base Currency Adjustment</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[13px] text-rose-500 font-medium mb-1.5">Currency*</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                  className="w-full h-[34px] px-3 text-[13px] border border-gray-300 rounded focus:border-slate-400 outline-none bg-white transition-colors"
                >
                  <option value="">Select currency</option>
                  {CURRENCY_ADJUSTMENT_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] text-rose-500 font-medium mb-1.5">Date of Adjustment*</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full h-[34px] px-3 text-[13px] border border-gray-300 rounded focus:border-slate-400 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[13px] text-rose-500 font-medium mb-1.5">Exchange Rate*</label>
                <div className="flex items-center">
                  <div className="h-[34px] flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-[13px] text-gray-500 rounded-l">
                    1 {adjustments[0]?.baseCurrency || "AED"} =
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="0.0000"
                    value={form.exchangeRate}
                    onChange={(e) => setForm((prev) => ({ ...prev, exchangeRate: e.target.value }))}
                    className="flex-1 h-[34px] px-3 text-[13px] border border-gray-300 focus:border-slate-400 outline-none transition-colors"
                  />
                  <div className="h-[34px] flex items-center px-3 border border-l-0 border-gray-300 bg-gray-50 text-[13px] text-gray-500 rounded-r">
                    {form.currency || "---"}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[13px] text-rose-500 font-medium mb-1.5">Notes*</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Max. 500 characters"
                  className="w-full p-3 text-[13px] border border-gray-300 rounded focus:border-slate-400 outline-none transition-colors resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-50 flex items-center gap-3">
              <button
                onClick={onPreview}
                disabled={submitting}
                className="px-5 py-1.5 bg-[#156372] hover:bg-[#0d4d59] text-white text-sm font-medium rounded shadow-sm transition-colors"
              >
                {submitting ? "Loading..." : "Continue"}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 text-sm font-medium rounded shadow-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && preview && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[1200] p-4">
          <div className="w-full max-w-[900px] bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-900">Confirm Base Currency Adjustment</h3>
              <button onClick={() => { setShowConfirmModal(false); setPreview(null); }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="p-6">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-6 flex flex-wrap gap-8 text-[13px]">
                <div><span className="text-slate-500 mr-2">Currency:</span> <span className="font-semibold text-slate-900">{preview.currency}</span></div>
                <div><span className="text-slate-500 mr-2">Previous Rate:</span> <span className="font-semibold text-slate-900">{formatCurrencyAdjustmentMoney(preview.previousExchangeRate)}</span></div>
                <div><span className="text-slate-500 mr-2">New Rate:</span> <span className="font-semibold text-slate-900">{formatCurrencyAdjustmentMoney(preview.exchangeRate)}</span></div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-[40vh] overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-3 text-center w-12">Select</th>
                        <th className="px-4 py-3">Account</th>
                        <th className="px-4 py-3 text-right">Balance (FCY)</th>
                        <th className="px-4 py-3 text-right">Balance (BCY)</th>
                        <th className="px-4 py-3 text-right">Revalued (BCY)</th>
                        <th className="px-4 py-3 text-right">Gain/Loss (BCY)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.affectedAccounts.map((row) => (
                        <tr key={row.accountId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={row.selected !== false}
                              onChange={() => toggleAccountRow(row.accountId)}
                              className="rounded border-gray-300 text-slate-600"
                            />
                          </td>
                          <td className="px-4 py-3 text-[13px] text-slate-700 font-medium">{row.accountName}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-600 text-right">{formatCurrencyAdjustmentMoney(row.balanceFCY)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-600 text-right">{formatCurrencyAdjustmentMoney(row.balanceBCY)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-600 text-right">{formatCurrencyAdjustmentMoney(row.revaluedBalanceBCY)}</td>
                          <td className={`px-4 py-3 text-[13px] text-right font-bold ${row.gainOrLossBCY >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {row.gainOrLossBCY >= 0 ? "+" : ""}{formatCurrencyAdjustmentMoney(row.gainOrLossBCY)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <div className="text-[13px] text-slate-500 italic">
                  * Select accounts to include in this adjustment.
                </div>
                <div className="text-right">
                  <span className="text-[13px] text-slate-500 mr-2">Total Gain/Loss (Selected):</span>
                  <span className={`text-base font-bold ${selectedGainLoss >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {selectedGainLoss >= 0 ? "+" : ""}{formatCurrencyAdjustmentMoney(selectedGainLoss)}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-50 flex items-center gap-3">
              <button
                onClick={onMakeAdjustment}
                disabled={submitting}
                className="px-5 py-1.5 bg-[#156372] hover:bg-[#0d4d59] text-white text-sm font-medium rounded shadow-sm transition-colors"
              >
                {submitting ? "Saving..." : "Make an Adjustment"}
              </button>
              <button
                onClick={() => { setShowConfirmModal(false); setShowCreateModal(true); }}
                className="px-5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 text-sm font-medium rounded shadow-sm transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => { setShowConfirmModal(false); setPreview(null); }}
                className="px-5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 text-sm font-medium rounded shadow-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
