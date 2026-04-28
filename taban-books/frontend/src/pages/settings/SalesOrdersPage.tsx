import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

type SalesOrdersSettings = {
  updateInvoiceFields: {
    address: boolean;
    customerNotes: boolean;
    termsConditions: boolean;
  };
  closeOrderWhen: "invoice-created" | "shipment-fulfilled" | "shipment-and-invoice";
  restrictClosedOrderEditing: boolean;
  termsConditions: string;
  customerNotes: string;
  approvalType: "no-approval" | "simple" | "multi-level" | "custom";
};

const STORAGE_KEY = "settings_sales_orders";

const DEFAULT_SETTINGS: SalesOrdersSettings = {
  updateInvoiceFields: {
    address: true,
    customerNotes: false,
    termsConditions: false,
  },
  closeOrderWhen: "invoice-created",
  restrictClosedOrderEditing: false,
  termsConditions: "",
  customerNotes: "",
  approvalType: "no-approval",
};

const tabs = [
  { key: "general", label: "General" },
  { key: "approvals", label: "Approvals" },
] as const;

export default function SalesOrdersPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["key"]>("general");
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SalesOrdersSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      setSettings({
        updateInvoiceFields: {
          address: Boolean(parsed?.updateInvoiceFields?.address),
          customerNotes: Boolean(parsed?.updateInvoiceFields?.customerNotes),
          termsConditions: Boolean(parsed?.updateInvoiceFields?.termsConditions),
        },
        closeOrderWhen:
          parsed?.closeOrderWhen === "shipment-fulfilled" ||
          parsed?.closeOrderWhen === "shipment-and-invoice"
            ? parsed.closeOrderWhen
            : "invoice-created",
        restrictClosedOrderEditing: Boolean(parsed?.restrictClosedOrderEditing),
        termsConditions: String(parsed?.termsConditions || ""),
        customerNotes: String(parsed?.customerNotes || ""),
        approvalType:
          parsed?.approvalType === "simple" ||
          parsed?.approvalType === "multi-level" ||
          parsed?.approvalType === "custom"
            ? parsed.approvalType
            : "no-approval",
      });
    } catch (error) {
      console.error("Failed to load sales order settings:", error);
    }
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      toast.success("Sales order settings saved successfully");
    } catch (error) {
      console.error("Failed to save sales order settings:", error);
      toast.error("Failed to save sales order settings");
    } finally {
      setSaving(false);
    }
  };

  const renderPlaceholder = (title: string, description: string) => (
    <div className="max-w-4xl rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 leading-6">{description}</p>
    </div>
  );

  return (
    <div className="w-full p-8 pb-28">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Sales Orders</h1>

      <div className="mb-5 flex flex-wrap items-center gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition focus:outline-none ${
              activeTab === tab.key
                ? "border-b-2 border-[#156b7d] text-[#156b7d]"
                : "border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="max-w-[860px] space-y-6">
          <section className="border-b border-gray-200 pb-5">
            <h2 className="mb-3 text-sm font-medium text-gray-900">
              Which of the following fields of Sales Orders do you want to update in the respective Invoices?
            </h2>
            <div className="space-y-2.5 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.updateInvoiceFields.address}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      updateInvoiceFields: {
                        ...prev.updateInvoiceFields,
                        address: event.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>Address</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.updateInvoiceFields.customerNotes}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      updateInvoiceFields: {
                        ...prev.updateInvoiceFields,
                        customerNotes: event.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>Customer Notes</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.updateInvoiceFields.termsConditions}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      updateInvoiceFields: {
                        ...prev.updateInvoiceFields,
                        termsConditions: event.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>Terms & Conditions</span>
              </label>
            </div>
          </section>

          <section className="border-b border-gray-200 pb-5">
            <h2 className="mb-3 text-sm font-medium text-gray-900">
              When do you want your Sales Orders to be closed?
            </h2>
            <div className="space-y-2.5 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sales-order-close-when"
                  checked={settings.closeOrderWhen === "invoice-created"}
                  onChange={() =>
                    setSettings((prev) => ({ ...prev, closeOrderWhen: "invoice-created" }))
                  }
                  className="h-4 w-4 border-gray-300"
                />
                <span>When invoice is created</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sales-order-close-when"
                  checked={settings.closeOrderWhen === "shipment-fulfilled"}
                  onChange={() =>
                    setSettings((prev) => ({ ...prev, closeOrderWhen: "shipment-fulfilled" }))
                  }
                  className="h-4 w-4 border-gray-300"
                />
                <span>When shipment is fulfilled</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sales-order-close-when"
                  checked={settings.closeOrderWhen === "shipment-and-invoice"}
                  onChange={() =>
                    setSettings((prev) => ({ ...prev, closeOrderWhen: "shipment-and-invoice" }))
                  }
                  className="h-4 w-4 border-gray-300"
                />
                <span>When shipment is fulfilled and invoice is created</span>
              </label>
            </div>

            <label className="mt-5 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.restrictClosedOrderEditing}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    restrictClosedOrderEditing: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <span>Restrict closed sales orders from being edited</span>
            </label>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-gray-900">Terms & Conditions</h2>
            <textarea
              value={settings.termsConditions}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, termsConditions: event.target.value }))
              }
              rows={8}
              placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
              className="w-full max-w-[620px] rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-[#156b7d] focus:ring-1 focus:ring-[#156b7d]"
            />
          </section>

          <section className="border-b border-gray-200 pb-6">
            <h2 className="mb-2 text-sm font-medium text-gray-900">Customer Notes</h2>
            <textarea
              value={settings.customerNotes}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, customerNotes: event.target.value }))
              }
              rows={8}
              placeholder="Enter any notes to be displayed in your transaction"
              className="w-full max-w-[620px] rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-[#156b7d] focus:ring-1 focus:ring-[#156b7d]"
            />
          </section>
        </div>
      )}

      {activeTab === "approvals" && (
        <div className="space-y-6 pb-24">
          <div>
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Approval Type</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  key: "no-approval",
                  title: "No Approval",
                  desc: "Create Sales Order and perform further actions without approval.",
                },
                {
                  key: "simple",
                  title: "Simple Approval",
                  desc: "Any user with approve permission can approve the Sales Order.",
                },
                {
                  key: "multi-level",
                  title: "Multi-Level Approval",
                  desc: "Set many levels of approval. The Sales Order will be approved only when all the approvers approve.",
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
                        approvalType: card.key as SalesOrdersSettings["approvalType"],
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
          className="inline-flex min-h-[38px] items-center rounded-[9px] bg-[#005766] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004954] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
