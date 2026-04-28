import React from "react";
import CompanyHeader from "./shared/CompanyHeader";
import ItemsTable from "./shared/ItemsTable";

const ValueAdjustmentTemplatePreview = () => {
  const items = [
    { id: 1, name: "Brochure Design", description: "Brochure Design Single Sided Color", qty: 10.00, unit: "Nos", rate: 300.00, amount: 3000.00 },
    { id: 2, name: "Web Design Packages(Template) - Basic", description: "Custom Themes for your business. Inclusive of 10 hours of marketing and annual training", qty: 5.00, unit: "Nos", rate: 250.00, amount: 1250.00 },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <CompanyHeader />
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Value Adjustment</h1>
          <div className="text-sm text-gray-600">Adjustment# VA-17</div>
        </div>
      </div>

      <div className="text-right mb-6 text-sm text-gray-600">
        <div>Adjustment Date: 06 Dec 2025</div>
        <div>Warehouse: Main Warehouse</div>
        <div>Reason: Revaluation</div>
      </div>

      <ItemsTable items={items} columns={["#", "Item & Description", "Qty", "Rate", "Amount"]} />

      <div className="flex justify-end mt-6">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
            <span className="text-gray-900">Total Adjustment</span>
            <span className="text-gray-900">$4,250.00</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValueAdjustmentTemplatePreview;

