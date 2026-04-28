import React from "react";
import CompanyHeader from "./shared/CompanyHeader";

const ItemBarcodeTemplatePreview = () => {
  const items = [
    { id: 1, name: "Brochure Design", barcode: "1234567890123", sku: "BR-001" },
    { id: 2, name: "Web Design Packages(Template) - Basic", barcode: "1234567890124", sku: "WD-001" },
    { id: 3, name: "Print Ad - Basic - Color", barcode: "1234567890125", sku: "PA-001" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <CompanyHeader />
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Item Barcodes</h1>
          <div className="text-sm text-gray-600">Generated: 06 Dec 2025</div>
        </div>
      </div>

      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-600">SKU: {item.sku}</div>
              </div>
            </div>
            <div className="flex items-center justify-center bg-white border-2 border-gray-300 rounded p-4">
              <div className="text-center">
                <div className="text-2xl font-mono mb-2">{item.barcode}</div>
                <div className="text-xs text-gray-500">Barcode</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemBarcodeTemplatePreview;

