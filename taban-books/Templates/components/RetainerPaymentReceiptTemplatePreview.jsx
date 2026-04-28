import React from "react";
import CompanyHeader from "./shared/CompanyHeader";
import AddressSection from "./shared/AddressSection";

const RetainerPaymentReceiptTemplatePreview = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <CompanyHeader />
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Retainer Payment Receipt</h1>
          <div className="text-sm text-gray-600">Receipt# RPR-17</div>
        </div>
      </div>

      <div className="text-right mb-6 text-sm text-gray-600">
        <div>Payment Date: 06 Dec 2025</div>
        <div>Payment Method: Bank Transfer</div>
        <div>Reference: RET-17</div>
      </div>

      <AddressSection />

      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Retainer Amount</span>
          <span className="text-gray-900">$550.00</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Amount Paid</span>
          <span className="text-gray-900 font-semibold">$550.00</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
          <span className="text-gray-900 font-semibold">Balance</span>
          <span className="text-gray-900 font-semibold">$0.00</span>
        </div>
      </div>
    </div>
  );
};

export default RetainerPaymentReceiptTemplatePreview;

