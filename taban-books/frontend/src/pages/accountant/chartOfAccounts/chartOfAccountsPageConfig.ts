import type { ChartOfAccountsCustomView } from "../chartOfAccountsTypes";

export interface ChartOfAccountsFieldMapping {
  id: number;
  tabanField: string;
  exportField: string;
}

export const CHART_OF_ACCOUNTS_VIEWS = [
  "All Accounts",
  "Active Accounts",
  "Inactive Accounts",
  "Asset Accounts",
  "Liability Accounts",
  "Equity Accounts",
  "Income Accounts",
  "Expense Accounts",
] as const;

export const CHART_OF_ACCOUNTS_EXPORT_MODULES = [
  "Sales",
  "Quotes",
  "Invoices",
  "Invoice Payments",
  "Recurring Invoices",
  "Credit Notes",
  "Credit Notes Applied to Invoices",
  "Refunds",
  "Purchase",
  "Expenses",
  "Recurring Expenses",
  "Purchase Orders",
  "Bills",
  "Bill Payments",
  "Recurring Bills",
  "Vendor Credits",
  "Applied Vendor Credits",
  "Vendor Credit Refunds",
  "Timesheet",
  "Projects",
  "Project Tasks",
  "Others",
  "Customers",
  "Vendors",
  "Items",
  "Inventory Adjustments",
  "Exchange Rates",
  "Users",
  "Chart of Accounts",
  "Manual Journals",
];

export const CHART_OF_ACCOUNTS_DECIMAL_FORMATS = [
  "1234567.89",
  "1,234,567.89",
  "1234567,89",
  "1.234.567,89",
];

export const CHART_OF_ACCOUNTS_EXPORT_FORMATS = [
  { value: "csv", label: "CSV (Comma Separated Value)" },
  { value: "xls", label: "XLS (Microsoft Excel 1997-2004 Compatible)" },
  { value: "xlsx", label: "XLSX (Microsoft Excel)" },
];

export const CHART_OF_ACCOUNTS_EXPORT_FIELDS = [
  "Account Name",
  "Account Code",
  "Account Type",
  "Parent Account",
  "Description",
  "Balance",
  "Opening Balance",
  "Current Balance",
  "Currency",
  "Is Sub Account",
  "Is Inactive",
  "Has Transactions",
  "Created Date",
  "Modified Date",
];

export const CHART_OF_ACCOUNTS_DEFAULT_FIELD_MAPPINGS: ChartOfAccountsFieldMapping[] =
  [
    { id: 1, tabanField: "Account Name", exportField: "Account Name" },
    { id: 2, tabanField: "Account Code", exportField: "Account Code" },
    { id: 3, tabanField: "Account Type", exportField: "Account Type" },
  ];

export const isChartOfAccountsCustomView = (
  value: unknown,
): value is ChartOfAccountsCustomView =>
  Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      "name" in value &&
      "criteria" in value,
  );

