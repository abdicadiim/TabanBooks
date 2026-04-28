import React from "react";
import CompanyHeader from "./shared/CompanyHeader";
import ItemsTable from "./shared/ItemsTable";

const QuantityAdjustmentTemplatePreview = () => {
  const items = [
    { id: 1, name: "Brochure Design", description: "Brochure Design Single Sided Color", qty: 10.00, unit: "Nos" },
    { id: 2, name: "Web Design Packages(Template) - Basic", description: "Custom Themes for your business. Inclusive of 10 hours of marketing and annual training", qty: 5.00, unit: "Nos" },
    { id: 3, name: "Print Ad - Basic - Color", description: "Print Ad 1/8 size Color", qty: 20.00, unit: "Nos" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <CompanyHeader />
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quantity Adjustment</h1>
          <div className="text-sm text-gray-600">Adjustment# QA-17</div>
        </div>
      </div>

      <div className="text-right mb-6 text-sm text-gray-600">
        <div>Adjustment Date: 06 Dec 2025</div>
        <div>Warehouse: Main Warehouse</div>
        <div>Reason: Stock Count</div>
      </div>

      <ItemsTable items={items} columns={["#", "Item & Description", "Qty"]} />

      <div className="mt-6 text-right text-xs text-gray-500">1</div>
    </div>
  );
};

export default QuantityAdjustmentTemplatePreview;

