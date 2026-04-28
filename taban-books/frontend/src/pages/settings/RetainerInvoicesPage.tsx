import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

type RetainerInvoiceSettings = {
  termsConditions: string;
  customerNotes: string;
  approvalType: "no-approval" | "simple" | "multi-level" | "custom";
};

const STORAGE_KEY = "settings_retainer_invoices";

const DEFAULT_SETTINGS: RetainerInvoiceSettings = {
  termsConditions: "",
  customerNotes: "",
  approvalType: "no-approval",
};

export default function RetainerInvoicesPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<RetainerInvoiceSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (!savedSettings) return;

      const parsedSettings = JSON.parse(savedSettings);
      setSettings({
        termsConditions: String(parsedSettings.termsConditions || ""),
        customerNotes: String(parsedSettings.customerNotes || ""),
        approvalType:
          parsedSettings.approvalType === "simple" ||
          parsedSettings.approvalType === "multi-level" ||
          parsedSettings.approvalType === "custom"
            ? parsedSettings.approvalType
            : "no-approval",
      });
    } catch (error) {
      console.error("Failed to load retainer invoice settings from local storage:", error);
    }
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      toast.success("Retainer invoice settings saved successfully");
    } catch (error) {
      console.error("Failed to save retainer invoice settings:", error);
      toast.error("Failed to save retainer invoice settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full p-8 pb-24">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Retainer Invoices</h1>

      <div className="mb-6 flex items-center gap-1">
        {[
          { key: "general", label: "General" },
          { key: "approvals", label: "Approvals" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition focus:outline-none ${
              activeTab === tab.key
                ? "border-b-2 border-[#156b7d] text-[#156b7d]"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="max-w-3xl space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Terms & Conditions</h3>
            <textarea
              value={settings.termsConditions}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, termsConditions: e.target.value }))
              }
              rows={8}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#156b7d]"
              placeholder="Enter terms and conditions"
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Customer Notes</h3>
            <textarea
              value={settings.customerNotes}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, customerNotes: e.target.value }))
              }
              rows={8}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#156b7d]"
              placeholder="Enter customer notes"
            />
          </div>
        </div>
      )}

      {activeTab === "approvals" && (
        <div className="space-y-6 pb-24">
          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Approval Type</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  key: "no-approval",
                  title: "No Approval",
                  desc: "Create Retainer Invoice and perform further actions without approval.",
                },
                {
                  key: "simple",
                  title: "Simple Approval",
                  desc: "Any user with approve permission can approve the Retainer Invoice.",
                },
                {
                  key: "multi-level",
                  title: "Multi-Level Approval",
                  desc: "Set many levels of approval. The Retainer Invoice will be approved only when all the approvers approve.",
                },
                {
                  key: "custom",
                  title: "Custom Approval",
                  desc: "Create a customized approval flow by adding one or more criteria.",
                },
              ].map((card) => {
                const isSelected = settings.approvalType === card.key;

                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        approvalType: card.key as RetainerInvoiceSettings["approvalType"],
                      }))
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-[#3b82f6] bg-[#eff6ff]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        readOnly
                        checked={isSelected}
                        className="mt-1 h-4 w-4 border-gray-300 text-[#156b7d]"
                      />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{card.title}</div>
                        <div className="mt-1 text-sm text-gray-600">{card.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-5" />
        </div>
      )}

      <div
        className="fixed bottom-0 z-30 px-6 py-4"
        style={{ left: "16rem", right: 0 }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex min-h-[38px] items-center rounded-[9px] bg-[#156b7d] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#115766] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
