// src/features/reports/reportsModel.js

// LEFT: Home section items (order matters)
export const HOME_FILTERS = [
  { id: "home", label: "Home" },
  { id: "favorites", label: "Favorites" },
  { id: "shared", label: "Shared Reports" },
  { id: "my", label: "My Reports" },
  { id: "scheduled", label: "Scheduled Reports" },
];

// Long category list (used for sidebar order)
export const CATEGORY_ORDER = [
  "Business Overview",
  "Sales",
  "Inventory",
  "Receivables",
  "Payments Received",
  "Recurring Invoices",
  "Payables",
  "Purchases and Expenses",
  "Taxes",
  "Banking",
  "Projects and Timesheet",
  "Accountant",
  "Budgets",
  "Currency",
  "Activity",
  "Automation",
];

// Seed reports to populate the center table
export const REPORTS = [
  // Business Overview
  {
    id: "cash_flow_statement",
    name: "Cash Flow Statement",
    category: "Business Overview",
    createdBy: "System Generated",
    lastVisited: "A few seconds ago",
  },
  {
    id: "balance_sheet",
    name: "Balance Sheet",
    category: "Business Overview",
    createdBy: "System Generated",
    lastVisited: "A few seconds ago",
  },
  {
    id: "business_performance_ratios",
    name: "Business Performance Ratios",
    category: "Business Overview",
    createdBy: "System Generated",
    lastVisited: "-",
  },
  {
    id: "cash_flow_forecasting",
    name: "Cash Flow Forecasting",
    category: "Business Overview",
    createdBy: "System Generated",
    lastVisited: "A few seconds ago",
  },
  {
    id: "movement_of_equity",
    name: "Movement of Equity",
    category: "Business Overview",
    createdBy: "System Generated",
    lastVisited: "-",
  },

  // Sales
  {
    id: "sales_by_customer",
    name: "Sales by Customer",
    category: "Sales",
    createdBy: "System Generated",
    lastVisited: "-",
  },
  {
    id: "sales_by_item",
    name: "Sales by Item",
    category: "Sales",
    createdBy: "System Generated",
    lastVisited: "-",
  },
  {
    id: "sales_by_salesperson",
    name: "Sales by Sales Person",
    category: "Sales",
    createdBy: "System Generated",
    lastVisited: "-",
  },
  {
    id: "sales_summary",
    name: "Sales Summary",
    category: "Sales",
    createdBy: "System Generated",
    lastVisited: "-",
  },

  // Inventory
  {
    id: "inventory_summary",
    name: "Inventory Summary",
    category: "Inventory",
    createdBy: "System Generated",
    lastVisited: "-",
  },
  {
    id: "committed_stock_details",
    name: "Committed Stock Details",
    category: "Inventory",
    createdBy: "System Generated",
    lastVisited: "-",
  },
  {
    id: "inventory_valuation_summary",
    name: "Inventory Valuation Summary",
    category: "Inventory",
    createdBy: "System Generated",
    lastVisited: "-",
  },
  {
    id: "fifo_cost_lot_tracking",
    name: "FIFO Cost Lot Tracking",
    category: "Inventory",
    createdBy: "System Generated",
    lastVisited: "-",
  },
  {
    id: "inventory_aging_summary",
    name: "Inventory Aging Summary",
    category: "Inventory",
    createdBy: "System Generated",
    lastVisited: "-",
  },
  {
    id: "product_sales_report",
    name: "Product Sales Report",
    category: "Inventory",
    createdBy: "System Generated",
    lastVisited: "-",
  },
];

// Build sidebar counts for each CATEGORY_ORDER item (even if 0)
export function getCategoriesWithCounts() {
  const counts = REPORTS.reduce((m, r) => {
    m[r.category] = (m[r.category] || 0) + 1;
    return m;
  }, {});
  return CATEGORY_ORDER.map((cat) => ({
    id: cat.toLowerCase().replace(/\s+/g, "_"),
    label: cat,
    count: counts[cat] || 0,
  }));
}
