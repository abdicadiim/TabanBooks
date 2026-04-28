import React from "react";
import CompanyHeader from "./shared/CompanyHeader";
import AddressSection from "./shared/AddressSection";
import ItemsTable from "./shared/ItemsTable";

const SalesOrderTemplatePreview = () => {
  const items = [
    {
      id: 1,
      name: "Brochure Design",
      description: "Brochure Design Single Sided Color",
      qty: 1.00,
      unit: "Nos",
      rate: 300.00,
      discount: 0.00,
      amount: 300.00,
    },
    {
      id: 2,
      name: "Web Design Packages(Template) - Basic",
      description: "Custom Themes for your business. Inclusive of 10 hours of marketing and annual training",
      qty: 1.00,
      unit: "Nos",
      rate: 250.00,
      discount: 0.00,
      amount: 250.00,
    },
    {
      id: 3,
      name: "Print Ad - Basic - Color",
      description: "Print Ad 1/8 size Color",
      qty: 1.00,
      unit: "Nos",
      rate: 80.00,
      discount: 0.00,
      amount: 80.00,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <CompanyHeader />
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Order</h1>
          <div className="text-sm text-gray-600">Sales Order# SO-17</div>
        </div>
      </div>

      {/* Address Section */}
      <AddressSection />

      {/* Order Details */}
      <div className="text-right mb-6 text-sm text-gray-600">
        <div>Order Date: 06 Dec 2025</div>
        <div>Expected Shipment Date: 06 Dec 2025</div>
        <div>Ref#: SO-17</div>
        <div>Delivery Method: UPS</div>
      </div>

      {/* Items Table */}
      <ItemsTable items={items} columns={["#", "Item & Description", "Qty", "Rate", "Discount", "Amount"]} />

      {/* Summary */}
      <div className="flex justify-end mt-6">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Sub Total</span>
            <span className="text-gray-900">630.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Discount</span>
            <span className="text-gray-900">0.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Sample Tax1 (4.70%)</span>
            <span className="text-gray-900">11.75</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Sample Tax2 (7.00%)</span>
            <span className="text-gray-900">21.00</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t border-gray-200 bg-gray-100 px-2 py-1 rounded">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">$662.75</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesOrderTemplatePreview;

