// Template types for sidebar navigation
export const TEMPLATE_TYPES = [
  { id: "invoices", label: "Invoices", icon: "FileText" },
  { id: "sales-orders", label: "Sales Orders", icon: "ShoppingCart" },
  { id: "sales-returns", label: "Sales Returns", icon: "RotateCcw" },
  { id: "package-slips", label: "Package Slips", icon: "Package" },
  { id: "shipments", label: "Shipments", icon: "Truck" },
  { id: "sales-receipts", label: "Sales Receipts", icon: "Receipt" },
  { id: "credit-notes", label: "Credit Notes", icon: "FileMinus" },
  { id: "purchase-orders", label: "Purchase Orders", icon: "ShoppingBag" },
  { id: "purchase-receives", label: "Purchase Receives", icon: "PackageCheck" },
  { id: "retainer-invoices", label: "Retainer Invoices", icon: "FileText" },
  { id: "payment-receipts", label: "Payment Receipts", icon: "CreditCard" },
  { id: "retainer-payment-receipts", label: "Retainer Payment Receipts", icon: "CreditCard" },
  { id: "customer-statements", label: "Customer Statements", icon: "FileText" },
  { id: "bills", label: "Bills", icon: "FileText" },
  { id: "vendor-credits", label: "Vendor Credits", icon: "FileMinus" },
  { id: "vendor-payments", label: "Vendor Payments", icon: "CreditCard" },
  { id: "vendor-statements", label: "Vendor Statements", icon: "FileText" },
  { id: "quantity-adjustments", label: "Quantity Adjustments", icon: "BarChart" },
  { id: "value-adjustments", label: "Value Adjustments", icon: "TrendingUp" },
  { id: "item-barcodes", label: "Item Barcodes", icon: "Barcode" },
];

// Default template data structure
export const DEFAULT_TEMPLATE = {
  id: null,
  name: "Standard Template",
  isDefault: true,
  type: "invoice",
  preview: null,
};

// Sample template data for preview
export const SAMPLE_TEMPLATE_DATA = {
  invoice: {
    invoiceNumber: "INV-17",
    invoiceDate: "06 Dec 2025",
    dueDate: "06 Dec 2025",
    balanceDue: "$562.75",
    billTo: {
      name: "Rob & Joe Traders",
      address: "4141 Hacienda Drive",
      city: "Pleasanton",
      state: "94588 CA",
      country: "USA",
    },
    items: [
      {
        id: 1,
        name: "Brochure Design",
        description: "Brochure Design Single Sided Color",
        qty: 1.00,
        unit: "Nos",
        rate: 300.00,
        amount: 300.00,
      },
      {
        id: 2,
        name: "Web Design Packages(Template) - Basic",
        description: "Custom Themes for your business. Inclusive of 10 hours of marketing and annual training",
        qty: 1.00,
        unit: "Nos",
        rate: 250.00,
        amount: 250.00,
      },
      {
        id: 3,
        name: "Print Ad - Basic - Color",
        description: "Print Ad 1/8 size Color",
        qty: 1.00,
        unit: "Nos",
        rate: 80.00,
        amount: 80.00,
      },
    ],
    subtotal: 630.00,
    discount: 0.00,
    tax1: { name: "Sample Tax1", percent: 4.70, amount: 11.75 },
    tax2: { name: "Sample Tax2", percent: 7.80, amount: 21.00 },
    total: 662.75,
    paymentRetention: 10.00,
    paymentMade: 100.00,
    balanceDue: 562.75,
  },
};

