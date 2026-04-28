import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

type SalesReceiptSettings = {
  depositTo: string;
  termsConditions: string;
  notes: string;
};

const STORAGE_KEY = "settings_sales_receipts_page";

const DEFAULT_SETTINGS: SalesReceiptSettings = {
  depositTo: "Petty Cash",
  termsConditions: "",
  notes: "",
};

export default function SalesReceiptsPage() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SalesReceiptSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      setSettings({
        depositTo: String(parsed?.depositTo || "Petty Cash"),
        termsConditions: String(parsed?.termsConditions || ""),
        notes: String(parsed?.notes || ""),
      });
    } catch (error) {
      console.error("Failed to load sales receipt settings:", error);
    }
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      toast.success("Sales receipt settings saved successfully");
    } catch (error) {
      console.error("Failed to save sales receipt settings:", error);
      toast.error("Failed to save sales receipt settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full p-8 pb-28">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Sales Receipts</h1>

      <div className="max-w-[760px] space-y-4">
        <section className="max-w-[680px] border-b border-gray-200 pb-4">
          <h2 className="mb-2 text-sm font-medium text-gray-900">Deposit To</h2>
          <p className="mb-2 text-sm text-gray-500">
            Select a default account to deposit your payments
          </p>
          <select
            value={settings.depositTo}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, depositTo: event.target.value }))
            }
            className="h-10 w-full max-w-[210px] rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#156b7d] focus:ring-1 focus:ring-[#156b7d]"
          >
            <option>Petty Cash</option>
            <option>Cash</option>
            <option>Bank</option>
            <option>Undeposited Funds</option>
          </select>
        </section>

        <section className="max-w-[680px] border-b border-gray-200 pb-5">
          <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)] md:items-start">
            <label className="pt-1 text-sm text-gray-700">Terms & Conditions</label>
            <textarea
              value={settings.termsConditions}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, termsConditions: event.target.value }))
              }
              rows={5}
              className="w-full max-w-[340px] rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-[#156b7d] focus:ring-1 focus:ring-[#156b7d]"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[140px_minmax(0,1fr)] md:items-start">
            <label className="pt-1 text-sm text-gray-700">Notes</label>
            <textarea
              value={settings.notes}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, notes: event.target.value }))
              }
              rows={5}
              placeholder="Enter any notes to be displayed in your transaction"
              className="w-full max-w-[340px] rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-[#156b7d] focus:ring-1 focus:ring-[#156b7d]"
            />
          </div>
        </section>
      </div>

      <div
        className="fixed bottom-0 z-30 px-6 py-4"
        style={{ left: "16rem", right: 0 }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex min-h-[38px] items-center rounded-[9px] bg-[#22c55e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1fb157] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
