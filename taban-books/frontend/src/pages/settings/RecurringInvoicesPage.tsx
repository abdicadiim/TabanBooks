import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

type RecurringInvoiceSettings = {
  creationMode: "draft" | "send" | "charge-send";
  onPaymentSuccess: string;
  onPaymentFailure: string;
  suspendAfterFailure: boolean;
  disableAutomaticCardSaving: boolean;
  applyExcessPayments: boolean;
  applyCreditNotes: boolean;
};

const STORAGE_KEY = "settings_recurring_invoices_page";

const DEFAULT_SETTINGS: RecurringInvoiceSettings = {
  creationMode: "charge-send",
  onPaymentSuccess: "Send Thank-you Email along with the Invoice",
  onPaymentFailure: "Send Payment Failure Email Notification",
  suspendAfterFailure: false,
  disableAutomaticCardSaving: false,
  applyExcessPayments: true,
  applyCreditNotes: true,
};

export default function RecurringInvoicesPage() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<RecurringInvoiceSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      setSettings({
        creationMode:
          parsed?.creationMode === "draft" || parsed?.creationMode === "send"
            ? parsed.creationMode
            : "charge-send",
        onPaymentSuccess: String(
          parsed?.onPaymentSuccess || "Send Thank-you Email along with the Invoice"
        ),
        onPaymentFailure: String(
          parsed?.onPaymentFailure || "Send Payment Failure Email Notification"
        ),
        suspendAfterFailure: Boolean(parsed?.suspendAfterFailure),
        disableAutomaticCardSaving: Boolean(parsed?.disableAutomaticCardSaving),
        applyExcessPayments: parsed?.applyExcessPayments !== false,
        applyCreditNotes: parsed?.applyCreditNotes !== false,
      });
    } catch (error) {
      console.error("Failed to load recurring invoice settings:", error);
    }
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      toast.success("Recurring invoice settings saved successfully");
    } catch (error) {
      console.error("Failed to save recurring invoice settings:", error);
      toast.error("Failed to save recurring invoice settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full p-8 pb-28">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Recurring Invoices</h1>

      <div className="max-w-[760px] space-y-4">
          <div className="max-w-[680px] rounded-md bg-[#eaf2ff] px-4 py-3 text-sm leading-6 text-gray-600">
            Recurring Invoices are automatically created based on a configured schedule. Here you can
            configure the auto-charging option and the process of sending these invoices to your customers.
          </div>

          <div className="space-y-4 border-b border-gray-200 pb-5">
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="recurring-creation-mode"
                checked={settings.creationMode === "draft"}
                onChange={() => setSettings((prev) => ({ ...prev, creationMode: "draft" }))}
                className="mt-1 h-4 w-4 border-gray-300"
              />
              <div>
                <div className="font-medium text-gray-900">Create Invoices as Drafts</div>
                <p className="mt-1 max-w-[620px] text-sm leading-6 text-gray-500">
                  Invoices will be saved as drafts. You can review and send them to your customers for payment.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="recurring-creation-mode"
                checked={settings.creationMode === "send"}
                onChange={() => setSettings((prev) => ({ ...prev, creationMode: "send" }))}
                className="mt-1 h-4 w-4 border-gray-300"
              />
              <div>
                <div className="font-medium text-gray-900">Create and Send Invoices</div>
                <p className="mt-1 max-w-[620px] text-sm leading-6 text-gray-500">
                  Invoices will be automatically sent to your customers for payment.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="recurring-creation-mode"
                checked={settings.creationMode === "charge-send"}
                onChange={() => setSettings((prev) => ({ ...prev, creationMode: "charge-send" }))}
                className="mt-1 h-4 w-4 border-gray-300"
              />
              <div className="min-w-0">
                <div className="font-medium text-gray-900">Create, Charge and Send Invoices</div>
                <p className="mt-1 max-w-[620px] text-sm leading-6 text-gray-500">
                  Your customer's credit card associated with the recurring invoice is charged automatically and invoices are sent for their reference.
                </p>
              </div>
            </label>

            {settings.creationMode === "charge-send" && (
              <div className="ml-6 space-y-4">
                <p className="max-w-[620px] text-sm leading-6 text-gray-700">
                  You can configure the retry preferences, and customize the email notification that will be sent to your customers by clicking the corresponding payment method (Credit Card or ACH).
                </p>

                <div className="grid max-w-[650px] gap-3 md:grid-cols-2">
                  <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                      On Payment Success
                    </div>
                    <div className="space-y-3 p-3">
                      <select
                        value={settings.onPaymentSuccess}
                        onChange={(event) =>
                          setSettings((prev) => ({ ...prev, onPaymentSuccess: event.target.value }))
                        }
                        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#156b7d] focus:ring-1 focus:ring-[#156b7d]"
                      >
                        <option>Send Thank-you Email along with the Invoice</option>
                        <option>Send Invoice Only</option>
                        <option>Do Nothing</option>
                      </select>
                      <div className="text-sm text-[#2563eb]">Credit Card and ACH</div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                      On Payment Failure
                    </div>
                    <div className="space-y-3 p-3">
                      <select
                        value={settings.onPaymentFailure}
                        onChange={(event) =>
                          setSettings((prev) => ({ ...prev, onPaymentFailure: event.target.value }))
                        }
                        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#156b7d] focus:ring-1 focus:ring-[#156b7d]"
                      >
                        <option>Send Payment Failure Email Notification</option>
                        <option>Send Retry Reminder</option>
                        <option>Do Nothing</option>
                      </select>
                      <div className="text-sm text-[#2563eb]">Credit Card | ACH</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="max-w-[700px] space-y-3">
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.suspendAfterFailure}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, suspendAfterFailure: event.target.checked }))
                }
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <span>After failure, suspend the recurring invoice</span>
            </label>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.disableAutomaticCardSaving}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    disableAutomaticCardSaving: event.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <div>
                <div>Disable automatic saving of card details</div>
                <p className="mt-1 max-w-[620px] text-sm leading-6 text-gray-500">
                  This option would disable the automatic selection of the option to save card details in the Customer Portal.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.applyExcessPayments}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, applyExcessPayments: event.target.checked }))
                }
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <span>Apply customer's excess payments to their recurring invoices</span>
            </label>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.applyCreditNotes}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, applyCreditNotes: event.target.checked }))
                }
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <span>Apply customer's credit notes to their recurring invoices</span>
            </label>
          </div>

          <p className="max-w-[700px] text-sm leading-6 text-gray-500">
            Note: Since your customer will be autocharged, payment reminder will be disabled.
          </p>

          <div className="border-b border-gray-200 pb-6" />
      </div>

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
