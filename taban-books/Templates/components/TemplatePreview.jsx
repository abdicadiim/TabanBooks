import React from "react";
import { Star, ChevronDown } from "lucide-react";
import InvoiceTemplatePreview from "./InvoiceTemplatePreview";
import SalesOrderTemplatePreview from "./SalesOrderTemplatePreview";
import SalesReturnTemplatePreview from "./SalesReturnTemplatePreview";
import PackageSlipTemplatePreview from "./PackageSlipTemplatePreview";
import ShipmentTemplatePreview from "./ShipmentTemplatePreview";
import SalesReceiptTemplatePreview from "./SalesReceiptTemplatePreview";
import CreditNoteTemplatePreview from "./CreditNoteTemplatePreview";
import PurchaseOrderTemplatePreview from "./PurchaseOrderTemplatePreview";
import PurchaseReceiveTemplatePreview from "./PurchaseReceiveTemplatePreview";
import RetainerInvoiceTemplatePreview from "./RetainerInvoiceTemplatePreview";
import PaymentReceiptTemplatePreview from "./PaymentReceiptTemplatePreview";
import RetainerPaymentReceiptTemplatePreview from "./RetainerPaymentReceiptTemplatePreview";
import CustomerStatementTemplatePreview from "./CustomerStatementTemplatePreview";
import BillTemplatePreview from "./BillTemplatePreview";
import VendorCreditTemplatePreview from "./VendorCreditTemplatePreview";
import VendorPaymentTemplatePreview from "./VendorPaymentTemplatePreview";
import VendorStatementTemplatePreview from "./VendorStatementTemplatePreview";
import QuantityAdjustmentTemplatePreview from "./QuantityAdjustmentTemplatePreview";
import ValueAdjustmentTemplatePreview from "./ValueAdjustmentTemplatePreview";
import ItemBarcodeTemplatePreview from "./ItemBarcodeTemplatePreview";
import { TEMPLATE_TYPES } from "../constants";

const TemplatePreview = ({ template, templateType = "invoices" }) => {
  const typeLabel = TEMPLATE_TYPES.find((t) => t.id === templateType)?.label || "Templates";

  const renderTemplatePreview = () => {
    switch (templateType) {
      case "invoices":
        return <InvoiceTemplatePreview />;
      case "sales-orders":
        return <SalesOrderTemplatePreview />;
      case "sales-returns":
        return <SalesReturnTemplatePreview />;
      case "package-slips":
        return <PackageSlipTemplatePreview />;
      case "shipments":
        return <ShipmentTemplatePreview />;
      case "sales-receipts":
        return <SalesReceiptTemplatePreview />;
      case "credit-notes":
        return <CreditNoteTemplatePreview />;
      case "purchase-orders":
        return <PurchaseOrderTemplatePreview />;
      case "purchase-receives":
        return <PurchaseReceiveTemplatePreview />;
      case "retainer-invoices":
        return <RetainerInvoiceTemplatePreview />;
      case "payment-receipts":
        return <PaymentReceiptTemplatePreview />;
      case "retainer-payment-receipts":
        return <RetainerPaymentReceiptTemplatePreview />;
      case "customer-statements":
        return <CustomerStatementTemplatePreview />;
      case "bills":
        return <BillTemplatePreview />;
      case "vendor-credits":
        return <VendorCreditTemplatePreview />;
      case "vendor-payments":
        return <VendorPaymentTemplatePreview />;
      case "vendor-statements":
        return <VendorStatementTemplatePreview />;
      case "quantity-adjustments":
        return <QuantityAdjustmentTemplatePreview />;
      case "value-adjustments":
        return <ValueAdjustmentTemplatePreview />;
      case "item-barcodes":
        return <ItemBarcodeTemplatePreview />;
      default:
        return (
          <div className="text-center text-gray-400 py-20">
            <p className="text-sm">Template Preview</p>
            <p className="text-xs mt-2">
              {template?.name || "Standard Template"}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            All {typeLabel}
          </h3>
          <button className="text-gray-400 hover:text-gray-600">
            <ChevronDown size={20} />
          </button>
        </div>
      </div>

      {/* Template Preview Area */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[600px] overflow-y-auto">
        <div className="bg-white rounded shadow-sm max-w-2xl mx-auto">
          {renderTemplatePreview()}
        </div>
      </div>

      {/* Template Name with Star */}
      {template?.isDefault && (
        <div className="mt-4 flex items-center gap-2">
          <Star size={16} className="text-green-500 fill-green-500" />
          <span className="text-sm font-medium text-gray-700">
            {template.name || "Standard Template"}
          </span>
        </div>
      )}
    </div>
  );
};

export default TemplatePreview;

