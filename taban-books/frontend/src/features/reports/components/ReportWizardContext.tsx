import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export interface ReportFilterRow {
  id: string;
  field: string;
  comparator: string;
  value: string;
  value2: string;
}

export interface ReportModuleChild {
  id: string;
  module: string;
  relatedOnly: boolean;
}

export interface ReportModuleSelection {
  parent: string;
  children: ReportModuleChild[];
}

export type ReportModuleOptionsMap = Record<string, string[]>;

export interface ReportModuleOptions {
  parentOptions: string[];
  childOptionsMap: ReportModuleOptionsMap;
}

export interface ReportMargins {
  top: string;
  bottom: string;
  left: string;
  right: string;
}

export interface ReportLayoutDetails {
  showOrganizationName: boolean;
  showReportBasis: boolean;
  showPageNumber: boolean;
  showGeneratedBy: boolean;
  showGeneratedDate: boolean;
  showGeneratedTime: boolean;
}

interface ReportTemplateData {
  dateRange?: string;
  reportBy?: string;
  name?: string;
}

export interface ReportWizardContextValue {
  dateRange: string;
  setDateRange: Dispatch<SetStateAction<string>>;
  reportBy: string;
  setReportBy: Dispatch<SetStateAction<string>>;
  groupBy: string;
  setGroupBy: Dispatch<SetStateAction<string>>;
  filters: ReportFilterRow[];
  setFilters: Dispatch<SetStateAction<ReportFilterRow[]>>;
  availableCols: string[];
  setAvailableCols: Dispatch<SetStateAction<string[]>>;
  selectedCols: string[];
  setSelectedCols: Dispatch<SetStateAction<string[]>>;
  tableDensity: string;
  setTableDensity: Dispatch<SetStateAction<string>>;
  tableDesign: string;
  setTableDesign: Dispatch<SetStateAction<string>>;
  autoResize: boolean;
  setAutoResize: Dispatch<SetStateAction<boolean>>;
  paper: string;
  setPaper: Dispatch<SetStateAction<string>>;
  orientation: string;
  setOrientation: Dispatch<SetStateAction<string>>;
  font: string;
  setFont: Dispatch<SetStateAction<string>>;
  margins: ReportMargins;
  setMargins: Dispatch<SetStateAction<ReportMargins>>;
  layoutDetails: ReportLayoutDetails;
  setLayoutDetails: Dispatch<SetStateAction<ReportLayoutDetails>>;
  reportName: string;
  setReportName: Dispatch<SetStateAction<string>>;
  exportName: string;
  setExportName: Dispatch<SetStateAction<string>>;
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  shareWith: string;
  setShareWith: Dispatch<SetStateAction<string>>;
  modules: ReportModuleSelection[];
  setModules: Dispatch<SetStateAction<ReportModuleSelection[]>>;
  moduleOptions: ReportModuleOptions;
  setModuleOptions: Dispatch<SetStateAction<ReportModuleOptions>>;
}

const ReportWizardCtx = createContext<ReportWizardContextValue | null>(null);

export const useReportWizard = (): ReportWizardContextValue => {
  const context = useContext(ReportWizardCtx);
  if (!context) {
    throw new Error("useReportWizard must be used within a ReportWizardProvider");
  }
  return context;
};

const DEFAULT_AVAILABLE: string[] = [
  "Status","Quote Date","Expiry Date","Quote#","Reference#","Customer Name",
  "Invoice#","Project Name","Quote Amount","Quote Amount (FCY)","Adjustment",
  "Created Time","Notes","Currency","Accepted Date","Last Modified Time",
  "Terms and Conditions","Shipping Charge","Sales person","Created By"
];

export function ReportWizardProvider({ children }: { children: ReactNode }) {
  // Load template data from localStorage if available
  const loadTemplateData = (): ReportTemplateData | null => {
    try {
      const template = localStorage.getItem("customReportTemplate");
      if (template) {
        const data = JSON.parse(template) as ReportTemplateData;
        localStorage.removeItem("customReportTemplate"); // Clear after loading
        return data;
      }
    } catch (error) {
      console.error("Error loading template:", error);
    }
    return null;
  };

  const templateData = loadTemplateData();

  // Step 1
  const [dateRange, setDateRange] = useState(templateData?.dateRange || "Today");
  const [reportBy, setReportBy] = useState(templateData?.reportBy || "Quote Date");
  const [groupBy, setGroupBy] = useState("None");
  const [filters, setFilters] = useState<ReportFilterRow[]>([]);

  // Step 2
  const [availableCols, setAvailableCols] = useState<string[]>(DEFAULT_AVAILABLE);
  const [selectedCols, setSelectedCols] = useState<string[]>([
    "Status","Quote Date","Expiry Date","Quote#","Reference#","Customer Name","Invoice#","Project Name","Quote Amount"
  ]);

  // Step 3
  const [tableDensity, setTableDensity] = useState("Classic");
  const [tableDesign, setTableDesign] = useState("Default");
  const [autoResize, setAutoResize]   = useState(true);
  const [paper, setPaper]             = useState("A4");
  const [orientation, setOrientation] = useState("Portrait");
  const [font, setFont]               = useState("Open Sans");
  const [margins, setMargins] = useState<ReportMargins>({ top: "0.7", bottom: "0.7", left: "0.55", right: "0.2" });
  const [layoutDetails, setLayoutDetails] = useState<ReportLayoutDetails>({
    showOrganizationName: true,
    showReportBasis: true,
    showPageNumber: false,
    showGeneratedBy: true,
    showGeneratedDate: true,
    showGeneratedTime: false,
  });

  // Step 4
  const [reportName, setReportName]   = useState(templateData?.name || "");
  const [exportName, setExportName]   = useState(templateData?.name || "");
  const [description, setDescription] = useState("");
  const [shareWith, setShareWith]     = useState("Only Me");

  // Module selection (from NewReport step)
  const [modules, setModules] = useState<ReportModuleSelection[]>([]);
  const [moduleOptions, setModuleOptions] = useState<ReportModuleOptions>({
    parentOptions: [],
    childOptionsMap: {},
  });

  const value = useMemo<ReportWizardContextValue>(() => ({
    // 1
    dateRange, setDateRange, reportBy, setReportBy, groupBy, setGroupBy, filters, setFilters,
    // 2
    availableCols, setAvailableCols, selectedCols, setSelectedCols,
    // 3
    tableDensity, setTableDensity, tableDesign, setTableDesign, autoResize, setAutoResize,
    paper, setPaper, orientation, setOrientation, font, setFont, margins, setMargins,
    layoutDetails, setLayoutDetails,
    // 4
    reportName, setReportName, exportName, setExportName, description, setDescription,
    shareWith, setShareWith,
    // Module selection
    modules, setModules, moduleOptions, setModuleOptions
  }), [
    dateRange, reportBy, groupBy, filters,
    availableCols, selectedCols,
    tableDensity, tableDesign, autoResize, paper, orientation, font, margins, layoutDetails,
    reportName, exportName, description, shareWith,
    modules, moduleOptions
  ]);

  return <ReportWizardCtx.Provider value={value}>{children}</ReportWizardCtx.Provider>;
}
