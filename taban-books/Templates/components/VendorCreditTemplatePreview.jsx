import React from "react";
import CompanyHeader from "./shared/CompanyHeader";
import AddressSection from "./shared/AddressSection";
import ItemsTable from "./shared/ItemsTable";

const VendorCreditTemplatePreview = () => {
  const items = [
    { id: 1, name: "Brochure Design", description: "Brochure Design Single Sided Color", qty: 1.00, unit: "Nos", rate: 300.00, amount: 300.00 },
    { id: 2, name: "Web Design Packages(Template) - Basic", description: "Custom Themes for your business. Inclusive of 10 hours of marketing and annual training", qty: 1.00, unit: "Nos", rate: 250.00, amount: 250.00 },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <CompanyHeader />
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Credit</h1>
          <div className="text-sm text-gray-600">Vendor Credit# VC-17</div>
          <div className="mt-2">
            <div className="text-sm text-gray-600">Credit Amount</div>
            <div className="text-2xl font-bold text-gray-900">$550.00</div>
          </div>
        </div>
      </div>

      <div className="text-right mb-6 text-sm text-gray-600">
        <div>Credit Date: 06 Dec 2025</div>
        <div>Reference Bill: BILL-17</div>
      </div>

      <AddressSection />

      <ItemsTable items={items} columns={["#", "Item & Description", "Qty", "Rate", "Amount"]} />

      <div className="flex justify-end mt-6">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Sub Total</span>
            <span className="text-gray-900">550.00</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
            <span className="text-gray-900">Credit Amount</span>
            <span className="text-gray-900">$550.00</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorCreditTemplatePreview;

