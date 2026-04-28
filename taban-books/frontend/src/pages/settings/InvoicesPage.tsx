import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

type InvoiceSettings = {
  allowEditingSentInvoice: boolean;
  associateExpenseReceipts: boolean;
  invoiceOrderNumber: "sales-order-number" | "sales-order-reference";
  notifyOnlinePayments: boolean;
  includeReceiptWithThankYou: boolean;
  automateThankYouNote: boolean;
  enableInvoiceQrCode: boolean;
  qrCodeType: "invoice-url" | "custom";
  qrCodeDescription: string;
  hideZeroValueItems: boolean;
  termsConditions: string;
  customerNotes: string;
  approvalType: "no-approval" | "simple" | "multi-level" | "custom";
};

const STORAGE_KEY = "settings_invoices_page";

const DEFAULT_SETTINGS: InvoiceSettings = {
  allowEditingSentInvoice: true,
  associateExpenseReceipts: true,
  invoiceOrderNumber: "sales-order-number",
  notifyOnlinePayments: true,
  includeReceiptWithThankYou: true,
  automateThankYouNote: true,
  enableInvoiceQrCode: false,
  qrCodeType: "invoice-url",
  qrCodeDescription: "Scan the QR code to view the configured information.",
  hideZeroValueItems: true,
  termsConditions: "",
  customerNotes: "Thanks for your business.",
  approvalType: "no-approval",
};

const tabs = [
  { key: "general", label: "General" },
  { key: "approvals", label: "Approvals" },
] as const;

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["key"]>("general");
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      setSettings({
        allowEditingSentInvoice: Boolean(parsed?.allowEditingSentInvoice),
        associateExpenseReceipts: Boolean(parsed?.associateExpenseReceipts),
        invoiceOrderNumber:
          parsed?.invoiceOrderNumber === "sales-order-reference"
            ? "sales-order-reference"
            : "sales-order-number",
        notifyOnlinePayments: Boolean(parsed?.notifyOnlinePayments),
        includeReceiptWithThankYou: Boolean(parsed?.includeReceiptWithThankYou),
        automateThankYouNote: Boolean(parsed?.automateThankYouNote),
        enableInvoiceQrCode: Boolean(parsed?.enableInvoiceQrCode),
        qrCodeType: parsed?.qrCodeType === "custom" ? "custom" : "invoice-url",
        qrCodeDescription: String(
          parsed?.qrCodeDescription || "Scan the QR code to view the configured information."
        ),
        hideZeroValueItems: Boolean(parsed?.hideZeroValueItems),
        termsConditions: String(parsed?.termsConditions || ""),
        customerNotes: String(parsed?.customerNotes || "Thanks for your business."),
        approvalType:
          parsed?.approvalType === "simple" ||
          parsed?.approvalType === "multi-level" ||
          parsed?.approvalType === "custom"
            ? parsed.approvalType
            : "no-approval",
      });
    } catch (error) {
      console.error("Failed to load invoice settings:", error);
    }
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      toast.success("Invoice settings saved successfully");
    } catch (error) {
      console.error("Failed to save invoice settings:", error);
      toast.error("Failed to save invoice settings");
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
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Invoices</h1>

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
            <div className="space-y-3 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.allowEditingSentInvoice}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, allowEditingSentInvoice: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>Allow editing of Sent Invoice?</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.associateExpenseReceipts}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, associateExpenseReceipts: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>Associate and display expense receipts in Invoice PDF</span>
              </label>
            </div>
          </section>

          <section className="border-b border-gray-200 pb-5">
            <h2 className="mb-3 text-sm font-medium text-gray-900">Invoice Order Number</h2>
            <div className="space-y-2.5 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="invoice-order-number"
                  checked={settings.invoiceOrderNumber === "sales-order-number"}
                  onChange={() =>
                    setSettings((prev) => ({ ...prev, invoiceOrderNumber: "sales-order-number" }))
                  }
                  className="h-4 w-4 border-gray-300"
                />
                <span>Use Sales Order Number</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="invoice-order-number"
                  checked={settings.invoiceOrderNumber === "sales-order-reference"}
                  onChange={() =>
                    setSettings((prev) => ({ ...prev, invoiceOrderNumber: "sales-order-reference" }))
                  }
                  className="h-4 w-4 border-gray-300"
                />
                <span>Use Sales Order Reference Number</span>
              </label>
            </div>
          </section>

          <section className="border-b border-gray-200 pb-5">
            <h2 className="mb-3 text-sm font-medium text-gray-900">Payments</h2>
            <div className="space-y-3 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.notifyOnlinePayments}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, notifyOnlinePayments: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>Get notified when customers pay online</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.includeReceiptWithThankYou}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, includeReceiptWithThankYou: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>Do you want to include the payment receipt along with the Thank You note?</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.automateThankYouNote}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, automateThankYouNote: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>Automate thank you note to customer on receipt of online payment</span>
              </label>
            </div>
          </section>

          <section className="border-b border-gray-200 pb-5">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium text-gray-900">Invoice QR Code</h2>
                <p className="mt-2 max-w-[640px] text-sm leading-6 text-gray-500">
                  Enable and configure the QR code you want to display on the PDF copy of an Invoice.
                  Your customers can scan the QR code using their device to access the URL or other
                  information that you configure.
                </p>
              </div>
              <label className="flex items-center gap-2 pt-1 text-sm text-gray-700">
                <span>{settings.enableInvoiceQrCode ? "Enabled" : "Disabled"}</span>
                <button
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({ ...prev, enableInvoiceQrCode: !prev.enableInvoiceQrCode }))
                  }
                  className={`relative h-5 w-9 rounded-full transition ${
                    settings.enableInvoiceQrCode ? "bg-[#005766]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                      settings.enableInvoiceQrCode ? "left-4" : "left-0.5"
                    }`}
                  />
                </button>
              </label>
            </div>

            {settings.enableInvoiceQrCode && (
              <div className="mt-5 max-w-[760px] space-y-5">
                <div className="flex items-start gap-6">
                  <label className="w-[140px] pt-3 text-sm text-gray-700">QR Code Type</label>
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <select
                        value={settings.qrCodeType}
                        onChange={(event) =>
                          setSettings((prev) => ({
                            ...prev,
                            qrCodeType: event.target.value as InvoiceSettings["qrCodeType"],
                          }))
                        }
                        className="h-10 w-full max-w-[340px] rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
                      >
                        <option value="invoice-url">Invoice URL</option>
                        <option value="custom">Custom</option>
                      </select>

                      {settings.qrCodeType === "custom" && (
                        <button
                          type="button"
                          className="inline-flex h-10 items-center rounded-md bg-[#005766] px-4 text-sm font-semibold text-white transition hover:bg-[#004954]"
                        >
                          Configure
                        </button>
                      )}
                    </div>

                    <p className="mt-2 max-w-[430px] text-sm leading-6 text-gray-500">
                      {settings.qrCodeType === "custom"
                        ? "When scanned, the custom URL you configure or the information you enter will be displayed."
                        : "When scanned, invoice URL will be displayed to the customer. Recommended if you provide online payment options."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <label className="w-[140px] pt-3 text-sm text-gray-700">QR Code Description</label>
                  <div className="flex-1">
                    <textarea
                      value={settings.qrCodeDescription}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          qrCodeDescription: event.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full max-w-[340px] rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
                    />
                  </div>
                </div>

                <p className="max-w-[720px] text-sm leading-6 text-gray-500">
                  Note: You can display this QR code in your invoice PDFs. To do this, edit the invoice
                  template from <span className="text-[#2563eb]">PDF Templates in Settings</span> and select
                  the <span className="italic">Show Invoice QR Code</span> checkbox in the Other Details section.
                </p>
              </div>
            )}
          </section>

          <section className="border-b border-gray-200 pb-5">
            <h2 className="mb-3 text-sm font-medium text-gray-900">Zero-Value Line Items</h2>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.hideZeroValueItems}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, hideZeroValueItems: event.target.checked }))
                }
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <div>
                <div>Hide zero-value line items</div>
                <p className="mt-1 max-w-[650px] leading-6 text-gray-500">
                  Choose whether you want to hide zero-value line items in an invoice&apos;s PDF and
                  the Customer Portal. They will still be visible while editing an invoice. This setting
                  will not apply to invoices whose total is zero.
                </p>
              </div>
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
                  desc: "Create Invoice and perform further actions without approval.",
                },
                {
                  key: "simple",
                  title: "Simple Approval",
                  desc: "Any user with approve permission can approve the Invoice.",
                },
                {
                  key: "multi-level",
                  title: "Multi-Level Approval",
                  desc: "Set many levels of approval. The Invoice will be approved only when all the approvers approve.",
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
                        approvalType: card.key as InvoiceSettings["approvalType"],
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
