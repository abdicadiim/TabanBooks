import type { ManualJournalCustomView } from "../manualJournalTypes";

export type ManualJournalBuiltInView = "All" | "Draft" | "Published";
export type ManualJournalExportType =
  | "journals"
  | "customerCredits"
  | "vendorCredits";

export interface ManualJournalSearchForm {
  filterType: ManualJournalBuiltInView;
  journalNumber: string;
  dateFrom: string;
  dateTo: string;
  account: string;
  totalFrom: string;
  totalTo: string;
  tax: string;
  vendorName: string;
  journalType: string;
  referenceNumber: string;
  status: string;
  notes: string;
  projectName: string;
  customerName: string;
  reportingMethod: string;
}

export interface ManualJournalFieldMapping {
  id: string;
  tabanField: string;
  exportField: string;
}

export interface ManualJournalExportTemplate {
  id: string;
  name: string;
  createdAt: string;
  mappings: ManualJournalFieldMapping[];
}

export interface ManualJournalExportSettings {
  scope: "filtered" | "all" | "custom";
  dateFrom: string;
  dateTo: string;
  selectedTemplateId: string;
  fileFormat: "csv" | "xlsx" | "xls";
  decimalFormat: string;
  password: string;
}

export interface ManualJournalViewOption {
  value: string;
  label: string;
  customView?: ManualJournalCustomView | null;
}

