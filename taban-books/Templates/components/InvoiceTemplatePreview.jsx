import React from "react";
import CompanyHeader from "./shared/CompanyHeader";
import AddressSection from "./shared/AddressSection";
import ItemsTable from "./shared/ItemsTable";
import { SAMPLE_TEMPLATE_DATA } from "../constants";

const InvoiceTemplatePreview = () => {
  const data = SAMPLE_TEMPLATE_DATA.invoice;

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <CompanyHeader />
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
          <div className="text-sm text-gray-600">Invoice# {data.invoiceNumber}</div>
          <div className="mt-2">
            <div className="text-sm text-gray-600">Balance Due</div>
            <div className="text-2xl font-bold text-gray-900">{data.balanceDue}</div>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="mb-6">
        <AddressSection billTo={data.billTo} />
        <div className="text-right text-sm text-gray-600">
          <div>Invoice Date: {data.invoiceDate}</div>
          <div>Due On Receipt</div>
          <div>Due Date: {data.dueDate}</div>
          <div>Project Name: Design project</div>
        </div>
      </div>

      {/* Items Table */}
      <ItemsTable items={data.items} columns={["#", "Item & Description", "Qty", "Rate", "Discount", "Amount"]} />

      {/* Summary */}
      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Sub Total</span>
            <span className="text-gray-900">{data.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{data.tax1.name} ({data.tax1.percent}%)</span>
            <span className="text-gray-900">{data.tax1.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{data.tax2.name} ({data.tax2.percent}%)</span>
            <span className="text-gray-900">{data.tax2.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">Rs.{data.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
            <span className="text-gray-900">Balance Due</span>
            <span className="text-gray-900">Rs.{data.balanceDue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-600 space-y-1">
        <div>Notes: Thanks for your business.</div>
        <div>Payment Options: PayPal</div>
        <div>Terms & Conditions</div>
      </div>
    </div>
  );
};

export default InvoiceTemplatePreview;

