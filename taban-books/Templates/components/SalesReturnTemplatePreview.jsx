import React from "react";
import CompanyHeader from "./shared/CompanyHeader";
import AddressSection from "./shared/AddressSection";
import ItemsTable from "./shared/ItemsTable";

const SalesReturnTemplatePreview = () => {
  const items = [
    {
      id: 1,
      name: "Brochure Design",
      description: "Brochure Design Single Sided Color",
      qty: 2.00,
      returnedQty: 2.00,
      unit: "Nos",
      rate: 300.00,
      amount: 300.00,
    },
    {
      id: 2,
      name: "Web Design Packages(Template) - Basic",
      description: "Custom Themes for your business. Inclusive of 10 hours of marketing and annual training",
      qty: 2.00,
      returnedQty: 2.00,
      unit: "Nos",
      rate: 250.00,
      amount: 250.00,
    },
    {
      id: 3,
      name: "Print Ad - Basic - Color",
      description: "Print Ad 1/8 size Color",
      qty: 2.00,
      returnedQty: 2.00,
      unit: "Nos",
      rate: 80.00,
      amount: 80.00,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <CompanyHeader />
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Return</h1>
          <div className="text-sm text-gray-600">RMA# RMA-17</div>
          <div className="text-sm text-gray-600 mt-2">Date : 06 Dec 2025</div>
        </div>
      </div>

      {/* Address Section */}
      <AddressSection />

      {/* Items Table */}
      <ItemsTable items={items} columns={["#", "Item & Description", "Returned Qty", "Rate", "Amount"]} />

      {/* Summary */}
      <div className="flex justify-end mt-6 mb-6">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Sub Total</span>
            <span className="text-gray-900">630.00</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">$662.75</span>
          </div>
        </div>
      </div>

      {/* Reason Section */}
      <div className="mt-6">
        <div className="text-sm font-semibold text-gray-700 mb-2">Reason</div>
        <div className="text-sm text-gray-600">Reason Name</div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-right text-xs text-gray-500">1</div>
    </div>
  );
};

export default SalesReturnTemplatePreview;

