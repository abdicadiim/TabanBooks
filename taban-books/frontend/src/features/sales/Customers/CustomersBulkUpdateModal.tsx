import React, { useMemo } from "react";
import { Info, X } from "lucide-react";
import { ConfigurePaymentTermsModal } from "../../../components/ConfigurePaymentTermsModal";
import { PaymentTermsDropdown } from "../../../components/PaymentTermsDropdown";
import SearchableDropdown from "../../../components/ui/SearchableDropdown";

export default function CustomersBulkUpdateModal({ controller }: { controller: any }) {
  const {
    accountsReceivableOptions,
    bulkUpdateData,
    configureTermsOpen,
    filteredCustomerLanguages,
    handleBulkUpdateSubmit,
    isBulkUpdateModalOpen,
    paymentTermsList,
    setBulkUpdateData,
    setConfigureTermsOpen,
    setPaymentTermsList,
    setIsBulkUpdateModalOpen,
  } = controller;

  const currencyOptions = useMemo(
    () =>
      (Array.isArray(controller.currencyOptions) ? controller.currencyOptions : []).map((currency: any) => ({
        value: String(currency.code || ""),
        label: `${String(currency.code || "").toUpperCase()} - ${String(currency.name || currency.code || "")}`,
      })).filter((currency: any) => currency.value),
    [controller.currencyOptions]
  );

  const accountOptions = useMemo(
    () =>
      (Array.isArray(accountsReceivableOptions) ? accountsReceivableOptions : []).map((account: any) => {
        const label = account?.account_type
          ? `${String(account.name || account.label || account.id)} - ${String(account.account_type)}`
          : String(account.name || account.label || account.id);
        return {
          value: String(account.id || account.value || ""),
          label,
        };
      }).filter((account: any) => account.value),
    [accountsReceivableOptions]
  );

  const customerLanguageOptions = useMemo(
    () =>
      (Array.isArray(filteredCustomerLanguages) ? filteredCustomerLanguages : []).map((language: string) => ({
        value: String(language).toLowerCase(),
        label: String(language),
      })),
    [filteredCustomerLanguages]
  );

  return (
    <>
      {isBulkUpdateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[1000] overflow-y-auto pt-10 pb-10">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-[560px] mt-2 mb-2 flex flex-col overflow-visible">
            <div className="flex items-center justify-between py-4 px-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 m-0">Bulk Update - Customers</h2>
              <button
                className="flex items-center justify-center w-7 h-7 bg-[#156372] border-2 border-white rounded text-white cursor-pointer hover:bg-[#0f4f5a] transition-colors"
                onClick={() => setIsBulkUpdateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-visible">
              <div className="flex items-center mb-5 last:mb-0">
                <label className="w-40 flex-shrink-0 text-sm text-gray-700">Customer Type</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="customerType"
                      value="business"
                      checked={bulkUpdateData.customerType === "business"}
                      onChange={(e) => setBulkUpdateData((prev: any) => ({ ...prev, customerType: e.target.value }))}
                      className="hidden"
                    />
                    <span className={`w-[18px] h-[18px] border-2 rounded-full flex items-center justify-center transition-all ${bulkUpdateData.customerType === "business" ? "border-[#156372]" : "border-gray-300"}`}>
                      {bulkUpdateData.customerType === "business" && <span className="w-2.5 h-2.5 bg-[#156372] rounded-full" />}
                    </span>
                    Business
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="customerType"
                      value="individual"
                      checked={bulkUpdateData.customerType === "individual"}
                      onChange={(e) => setBulkUpdateData((prev: any) => ({ ...prev, customerType: e.target.value }))}
                      className="hidden"
                    />
                    <span className={`w-[18px] h-[18px] border-2 rounded-full flex items-center justify-center transition-all ${bulkUpdateData.customerType === "individual" ? "border-[#156372]" : "border-gray-300"}`}>
                      {bulkUpdateData.customerType === "individual" && <span className="w-2.5 h-2.5 bg-[#156372] rounded-full" />}
                    </span>
                    Individual
                  </label>
                </div>
              </div>

              <div className="flex items-center mb-5 last:mb-0">
                <label className="w-40 flex-shrink-0 text-sm text-gray-700">Currency</label>
                <div className="flex-1 max-w-md">
                  <SearchableDropdown
                    value={bulkUpdateData.currency}
                    options={currencyOptions}
                    placeholder="Select"
                    accentColor="#156372"
                    showClear={Boolean(bulkUpdateData.currency)}
                    onChange={(value) => setBulkUpdateData((prev: any) => ({ ...prev, currency: value }))}
                    onClear={() => setBulkUpdateData((prev: any) => ({ ...prev, currency: "" }))}
                  />
                </div>
              </div>

              <div className="flex items-center mb-5 last:mb-0">
                <label className="w-40 flex-shrink-0 text-sm text-gray-700">Payment Terms</label>
                <div className="flex-1 max-w-md">
                  <PaymentTermsDropdown
                    value={bulkUpdateData.paymentTerms}
                    onChange={(value) => setBulkUpdateData((prev: any) => ({ ...prev, paymentTerms: value }))}
                    customTerms={paymentTermsList}
                    onConfigureTerms={() => setConfigureTermsOpen(true)}
                  />
                </div>
              </div>

              <div className="flex items-center mb-5 last:mb-0">
                <label className="w-40 flex-shrink-0 text-sm text-gray-700 flex items-center gap-1.5">
                  Customer Language
                  <Info size={14} className="text-gray-400" />
                </label>
                <div className="flex-1 max-w-md">
                  <SearchableDropdown
                    value={bulkUpdateData.customerLanguage}
                    options={customerLanguageOptions}
                    placeholder="Select language"
                    accentColor="#156372"
                    showClear={Boolean(bulkUpdateData.customerLanguage)}
                    onChange={(value) => setBulkUpdateData((prev: any) => ({ ...prev, customerLanguage: value }))}
                    onClear={() => setBulkUpdateData((prev: any) => ({ ...prev, customerLanguage: "" }))}
                  />
                </div>
              </div>

              <div className="flex items-center mb-5 last:mb-0">
                <label className="w-40 flex-shrink-0 text-sm text-gray-700">Accounts Receivable</label>
                <div className="flex-1 max-w-md">
                  <SearchableDropdown
                    value={bulkUpdateData.accountsReceivable}
                    options={accountOptions}
                    placeholder="Select an account"
                    accentColor="#156372"
                    showClear={Boolean(bulkUpdateData.accountsReceivable)}
                    onChange={(value) => setBulkUpdateData((prev: any) => ({ ...prev, accountsReceivable: value }))}
                    onClear={() => setBulkUpdateData((prev: any) => ({ ...prev, accountsReceivable: "" }))}
                  />
                </div>
              </div>

            </div>

            <div className="flex items-center gap-3 py-4 px-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <button
                className="py-2.5 px-5 text-sm font-medium text-white bg-[#156372] border-none rounded-md cursor-pointer transition-colors hover:bg-[#0f4f5a]"
                onClick={handleBulkUpdateSubmit}
              >
                Update Fields
              </button>
              <button
                className="py-2.5 px-5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                onClick={() => setIsBulkUpdateModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfigurePaymentTermsModal
        isOpen={configureTermsOpen}
        onClose={() => setConfigureTermsOpen(false)}
        onSave={setPaymentTermsList}
        initialTerms={paymentTermsList}
      />
    </>
  );
}
