import type { ManualJournalFieldMapping, ManualJournalExportSettings, ManualJournalSearchForm } from "./types";

export const MANUAL_JOURNAL_BUILT_IN_VIEWS = [
  "All",
  "Draft",
  "Published",
] as const;

export const DEFAULT_MANUAL_JOURNAL_SEARCH_FORM: ManualJournalSearchForm = {
  filterType: "All",
  journalNumber: "",
  dateFrom: "",
  dateTo: "",
  account: "",
  totalFrom: "",
  totalTo: "",
  tax: "",
  vendorName: "",
  journalType: "",
  referenceNumber: "",
  status: "",
  notes: "",
  projectName: "",
  customerName: "",
  reportingMethod: "",
};

export const MANUAL_JOURNAL_TEMPLATE_FIELD_OPTIONS = [
  "Journal Number",
  "Journal Date",
  "Reference Number",
  "Notes",
  "Amount",
  "Created By",
  "Reporting Method",
  "Status",
  "Currency",
  "Account",
  "Description",
  "Contact",
  "Transaction Type",
  "Tax",
  "Debits",
  "Credits",
];

export const DEFAULT_MANUAL_JOURNAL_TEMPLATE_MAPPINGS: ManualJournalFieldMapping[] =
  [
    {
      id: "journal-number",
      tabanField: "Journal Number",
      exportField: "Journal Number",
    },
    {
      id: "journal-date",
      tabanField: "Journal Date",
      exportField: "Journal Date",
    },
    {
      id: "notes",
      tabanField: "Notes",
      exportField: "Notes",
    },
  ];

export const DEFAULT_MANUAL_JOURNAL_EXPORT_SETTINGS: ManualJournalExportSettings =
  {
    scope: "filtered",
    dateFrom: "",
    dateTo: "",
    selectedTemplateId: "",
    fileFormat: "csv",
    decimalFormat: "1234567.89",
    password: "",
  };

export const MANUAL_JOURNAL_IMPORT_ACTIONS = [
  {
    label: "Import Journals",
    route: "/accountant/manual-journals/import",
  },
  {
    label: "Import Applied Customer Credits",
    route: "/accountant/manual-journals/import-applied-customer-credits",
  },
  {
    label: "Import Applied Vendor Credits",
    route: "/accountant/manual-journals/import-applied-vendor-credits",
  },
];

export const MANUAL_JOURNAL_EXPORT_FORMAT_OPTIONS = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "xls", label: "Excel 97-2003 (.xls)" },
];

export const MANUAL_JOURNAL_DECIMAL_FORMAT_OPTIONS = [
  "1234567.89",
  "1,234,567.89",
  "1.234.567,89",
];

