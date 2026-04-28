import React from "react";
import CompanyHeader from "./shared/CompanyHeader";
import AddressSection from "./shared/AddressSection";
import ItemsTable from "./shared/ItemsTable";

const PackageSlipTemplatePreview = ({ data }) => {
  // Use provided data or fallback to defaults
  const pkg = data || {
    packageNumber: "PKG-17",
    date: "06 Dec 2025",
    salesOrder: "SO-17",
    totalQty: 3.00,
    items: [
      { id: 1, name: "Brochure Design", description: "Brochure Design Single Sided Color", qty: 1.00, unit: "Nos" },
      { id: 2, name: "Web Design Packages(Template) - Basic", description: "Custom Themes for your business", qty: 1.00, unit: "Nos" },
      { id: 3, name: "Print Ad - Basic - Color", description: "Print Ad 1/8 size Color", qty: 1.00, unit: "Nos" },
    ],
    billingAddress: { name: "Rob & Joe Traders", address: "4141 Hacienda Drive", city: "Pleasanton", state: "94588 CA", country: "USA" },
    shippingAddress: { name: "Rob & Joe Traders", address: "4141 Hacienda Drive", city: "Pleasanton", state: "94588 CA", country: "USA" }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto h-full relative font-sans">
      {/* Header with Company Info - Full Width, Left Aligned */}
      <div className="mb-8">
        <CompanyHeader />
      </div>

      {/* Package Info Bar */}
      <div className="flex items-stretch justify-between border-y border-gray-200 mb-8 py-2">
        <div className="flex-1 grid grid-cols-4 gap-4 px-2">
          <div>
            <div className="text-sm font-bold text-gray-800">Package#</div>
            <div className="text-sm text-gray-600">{pkg.packageNumber || pkg.number}</div>
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800">Order Date</div>
            <div className="text-sm text-gray-600">{pkg.orderDate || "18 Nov 2025"}</div>
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800">Package Date</div>
            <div className="text-sm text-gray-600">{pkg.date}</div>
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800">Sales Order#</div>
            <div className="text-sm text-gray-600">{pkg.salesOrder || pkg.salesOrderNumber}</div>
          </div>
        </div>

        {/* Total Qty Box */}
        <div className="bg-gray-100 px-6 py-2 flex flex-col items-center justify-center border-l border-gray-200 ml-4 min-w-[120px]">
          <div className="text-sm font-bold text-gray-800">Total Qty</div>
          <div className="text-lg font-bold text-gray-900">{typeof pkg.totalQty === 'number' ? pkg.totalQty.toFixed(2) : pkg.totalQty}</div>
        </div>
      </div>

      {/* Address Section */}
      <div className="grid grid-cols-2 gap-12 mb-8">
        <div>
          <div className="text-gray-600 mb-1">Bill To</div>
          <div className="font-bold text-blue-500 mb-1">{pkg.billingAddress?.name || pkg.customer}</div>
          <AddressSection billTo={pkg.billingAddress} shipTo={null} hideLabel={true} />
        </div>
        <div>
          <div className="text-gray-600 mb-1">Ship To</div>
          <AddressSection billTo={null} shipTo={pkg.shippingAddress || pkg.billingAddress} hideLabel={true} />
        </div>
      </div>

      {/* Items Table - Blue Header */}
      <div className="mb-8">
        <ItemsTable items={pkg.items || []} columns={["#", "Item & Description", "Qty"]} headerColor="bg-[#156372]" />
      </div>

      {/* Footer */}
      {/* <div className="mt-6 text-right text-xs text-gray-500">1</div> */}
    </div>
  );
};

export default PackageSlipTemplatePreview;

