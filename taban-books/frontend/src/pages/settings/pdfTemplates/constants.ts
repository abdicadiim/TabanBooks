export const TEMPLATE_TYPES = [
  { id: "quotes", label: "Quotes" },
  { id: "sales-orders", label: "Sales Orders" },
  { id: "invoices", label: "Invoices" },
  { id: "sales-receipts", label: "Sales Receipts" },
  { id: "credit-notes", label: "Credit Notes" },
  { id: "purchase-orders", label: "Purchase Orders" },
  { id: "retainer-invoices", label: "Retainer Invoices" },
  { id: "payment-receipts", label: "Payment Receipts" },
  { id: "retainer-payment-receipts", label: "Retainer Payment Receipts" },
  { id: "customer-statements", label: "Customer Statements" },
  { id: "bills", label: "Bills" },
  { id: "vendor-credits", label: "Vendor Credits" },
  { id: "vendor-payments", label: "Vendor Payments" },
  { id: "vendor-statements", label: "Vendor Statements" },
  { id: "journals", label: "Journals" },
  { id: "quantity-adjustments", label: "Quantity Adjustments" },
  { id: "value-adjustments", label: "Value Adjustments" },
] as const;

export type TemplateTypeId = (typeof TEMPLATE_TYPES)[number]["id"];

export const COLOR_THEMES = [
  { id: "default", label: "Default", group: "default", swatch: ["#111827", "#ffffff"], accent: "#111827", headerBg: "#34393f", headerText: "#ffffff" },
  { id: "blue", label: "Blue", group: "vibrant", swatch: ["#2563eb", "#bfdbfe"], accent: "#2563eb", headerBg: "#2563eb", headerText: "#ffffff" },
  { id: "green", label: "Green", group: "vibrant", swatch: ["#16a34a", "#bbf7d0"], accent: "#16a34a", headerBg: "#16a34a", headerText: "#ffffff" },
  { id: "orange", label: "Orange", group: "vibrant", swatch: ["#f97316", "#fed7aa"], accent: "#f97316", headerBg: "#f97316", headerText: "#ffffff" },
  { id: "red", label: "Red", group: "vibrant", swatch: ["#dc2626", "#fecaca"], accent: "#dc2626", headerBg: "#dc2626", headerText: "#ffffff" },
  { id: "teal", label: "Teal", group: "vibrant", swatch: ["#0f766e", "#99f6e4"], accent: "#0f766e", headerBg: "#0f766e", headerText: "#ffffff" },
  { id: "indigo", label: "Indigo", group: "formal", swatch: ["#1e3a8a", "#bfdbfe"], accent: "#1e3a8a", headerBg: "#1e3a8a", headerText: "#ffffff" },
] as const;
