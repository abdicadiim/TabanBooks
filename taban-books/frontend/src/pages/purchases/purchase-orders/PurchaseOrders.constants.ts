export const PURCHASE_ORDER_VIEWS = [
  "All",
  "Draft",
  "Pending Approval",
  "Approved",
  "Issued",
  "Billed",
  "Partially Billed",
  "Closed",
  "Canceled",
];

export const PURCHASE_ORDER_SORT_OPTIONS = [
  { key: "createdTime", label: "Created Time" },
  { key: "date", label: "Date" },
  { key: "purchaseOrderNumber", label: "Purchase Order#" },
  { key: "vendorName", label: "Vendor Name" },
  { key: "amount", label: "Amount" },
  { key: "deliveryDate", label: "Delivery Date" },
  { key: "lastModifiedTime", label: "Last Modified Time" },
];

export const PURCHASE_ORDER_FILTER_OPTIONS = [
  "All",
  "Purchase Orders",
  "Bills",
  "Payments Made",
  "Recurring Bills",
  "Vendor Credits",
  "Projects",
  "Timesheet",
  "Journals",
  "Chart of Accounts",
  "Documents",
  "Tasks",
];

export const getPurchaseOrderBulkUpdateFieldOptions = (displayCurrencyCode: string) => [
  {
    value: "paymentTerms",
    label: "Payment Terms",
    type: "select",
    options: [
      "Due on Receipt",
      "Net 15",
      "Net 30",
      "Net 60",
    ],
  },
  {
    value: "status",
    label: "Status",
    type: "select",
    options: [
      "DRAFT",
      "ISSUED",
      "CLOSED",
    ],
  },
  {
    value: "currency",
    label: "Currency",
    type: "select",
    options: [displayCurrencyCode],
  },
  {
    value: "billingAddress",
    label: "Billing Address",
    type: "select",
    options: [
      "Address 1",
      "Address 2",
      "Address 3",
    ],
  },
  {
    value: "shippingAddress",
    label: "Shipping Address",
    type: "select",
    options: [
      "Address 1",
      "Address 2",
      "Address 3",
    ],
  },
  {
    value: "billingAndShippingAddress",
    label: "Billing and Shipping Address",
    type: "select",
    options: [
      "Same as Billing",
      "Same as Shipping",
      "Different Addresses",
    ],
  },
  {
    value: "referenceNumber",
    label: "Reference#",
    type: "text",
    placeholder: "Enter Reference Number",
  },
  {
    value: "pdfTemplate",
    label: "PDF Template",
    type: "select",
    options: [
      "Standard",
      "Custom Template 1",
      "Custom Template 2",
    ],
  },
  {
    value: "date",
    label: "Date",
    type: "date",
  },
  {
    value: "deliveryDate",
    label: "Delivery Date",
    type: "date",
  },
  {
    value: "notes",
    label: "Notes",
    type: "text",
    placeholder: "Enter Notes",
  },
  {
    value: "termsAndConditions",
    label: "Terms & Conditions",
    type: "text",
    placeholder: "Enter Terms & Conditions",
  },
  {
    value: "shipmentPreference",
    label: "Shipment Preference",
    type: "select",
    options: [
      "Standard",
      "Express",
      "Overnight",
      "Ground",
    ],
  },
];

export const PURCHASE_ORDER_BULK_UPDATE_FIELD_MAP: Record<string, string> = {
  paymentTerms: "paymentTerms",
  status: "status",
  currency: "currency",
  billingAddress: "billingAddress",
  shippingAddress: "shippingAddress",
  billingAndShippingAddress: "billingAndShippingAddress",
  referenceNumber: "referenceNumber",
  pdfTemplate: "pdfTemplate",
  date: "date",
  deliveryDate: "expectedDate",
  notes: "notes",
  termsAndConditions: "terms",
  shipmentPreference: "shipmentPreference",
};
