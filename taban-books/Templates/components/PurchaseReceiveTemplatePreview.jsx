import React from "react";
import CompanyHeader from "./shared/CompanyHeader";
import AddressSection from "./shared/AddressSection";
import ItemsTable from "./shared/ItemsTable";

const PurchaseReceiveTemplatePreview = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <CompanyHeader />
        <div className="text-right">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Purchase Receive</h1>
          <div className="text-sm text-gray-600">Receive# PR-17</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-6 text-sm text-gray-700">
          <div><span className="font-semibold">Receive#</span> PR-17</div>
          <div><span className="font-semibold">Receive Date</span> 06 Dec 2025</div>
          <div><span className="font-semibold">Purchase Order#</span> PO-17</div>
        </div>
        <div className="bg-gray-100 px-4 py-2 rounded">
          <div className="text-xs text-gray-600 mb-1">Total Qty</div>
          <div className="text-lg font-bold text-gray-900">3.00</div>
        </div>
      </div>

      <AddressSection />

      <ItemsTable columns={["#", "Item & Description", "Qty"]} />

      <div className="mt-6 text-right text-xs text-gray-500">1</div>
    </div>
  );
};

export default PurchaseReceiveTemplatePreview;

