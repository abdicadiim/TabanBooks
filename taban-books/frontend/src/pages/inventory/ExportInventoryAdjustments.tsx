import React, { useState, useEffect, useRef } from "react";
import { X, Info as InfoIcon, Loader2, Eye, EyeOff, HelpCircle, Search, Plus, ChevronUp, Calendar } from "lucide-react";
import { inventoryAdjustmentsAPI } from "../../services/api";
import toast from "react-hot-toast";

interface Item {
  item?: { name?: string };
  itemName?: string;
  itemDetails?: string;
  quantityAdjusted?: number;
  newQuantity?: number;
  cost?: number;
  costPrice?: number;
}

interface Adjustment {
  adjustmentNumber?: string;
  referenceNumber?: string;
  date?: string;
  reason?: string;
  status?: string;
  type?: string;
  account?: string;
  createdBy?: string;
  createdAt?: string;
  createdTime?: string;
  items?: Item[];
  itemRows?: Item[];
}

interface ExportInventoryAdjustmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to parse date from dd/MM/yyyy format
const parseDateInternal = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  try {
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
    }
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) return parsed;
    return null;
  } catch (e) {
    return null;
  }
};

export default function ExportInventoryAdjustmentsModal({ isOpen, onClose }: ExportInventoryAdjustmentsModalProps) {
  const [module, setModule] = useState("Inventory Adjustments");
  const [adjustmentSelection, setAdjustmentSelection] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [fileFormat, setFileFormat] = useState("csv");
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("Select an Export Template");
  const [selectedDecimalFormat, setSelectedDecimalFormat] = useState("1234567.89");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedSubModule, setSelectedSubModule] = useState("");
  const [selectedDocumentSource, setSelectedDocumentSource] = useState("Select a document source");

  const [isModuleMenuOpen, setIsModuleMenuOpen] = useState(false);
  const [isDecimalMenuOpen, setIsDecimalMenuOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isDocumentSourceMenuOpen, setIsDocumentSourceMenuOpen] = useState(false);
  const [moduleSearch, setModuleSearch] = useState("");

  const [dateFromPickerOpen, setDateFromPickerOpen] = useState(false);
  const [dateToPickerOpen, setDateToPickerOpen] = useState(false);
  const [dateFromCalendar, setDateFromCalendar] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [dateToCalendar, setDateToCalendar] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const templateMenuRef = useRef<HTMLDivElement>(null);
  const moduleMenuRef = useRef<HTMLDivElement>(null);
  const decimalMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const documentSourceMenuRef = useRef<HTMLDivElement>(null);
  const dateFromPickerRef = useRef<HTMLDivElement>(null);
  const dateToPickerRef = useRef<HTMLDivElement>(null);

  const modulesByGroup = [
    {
      group: "Sales",
      items: ["Quotes", "Sales Receipt", "Invoices", "Invoice Payments", "Recurring Invoices", "Credit Notes", "Credit Notes Applied to Invoices", "Refunds"]
    },
    {
      group: "Purchase",
      items: ["Expenses", "Recurring Expenses", "Purchase Orders", "Bills", "Bill Payments", "Recurring Bills", "Vendor Credits", "Applied Vendor Credits", "Vendor Credit Refunds"]
    },
    {
      group: "Timesheet",
      items: ["Projects", "Timesheet", "Project Tasks"]
    },
    {
      group: "Others",
      items: ["Customers", "Vendors", "Tasks", "Items", "Inventory Adjustments", "Exchange Rates", "Users", "Chart of Accounts", "Manual Journals", "Tax", "Tax Group", "Documents"]
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(event.target as Node)) {
        setIsTemplateMenuOpen(false);
      }
      if (moduleMenuRef.current && !moduleMenuRef.current.contains(event.target as Node)) {
        setIsModuleMenuOpen(false);
      }
      if (decimalMenuRef.current && !decimalMenuRef.current.contains(event.target as Node)) {
        setIsDecimalMenuOpen(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
      if (documentSourceMenuRef.current && !documentSourceMenuRef.current.contains(event.target as Node)) {
        setIsDocumentSourceMenuOpen(false);
      }
      if (dateFromPickerRef.current && !dateFromPickerRef.current.contains(event.target as Node)) {
        setDateFromPickerOpen(false);
      }
      if (dateToPickerRef.current && !dateToPickerRef.current.contains(event.target as Node)) {
        setDateToPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({ date: prevMonthLastDay - i, month: "prev", fullDate: new Date(year, month - 1, prevMonthLastDay - i) });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: i, month: "current", fullDate: new Date(year, month, i) });
    }
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: i, month: "next", fullDate: new Date(year, month + 1, i) });
    }
    return days;
  };

  const formatDateInternal = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const navigateDateFromMonth = (direction: "prev" | "next") => {
    setDateFromCalendar(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(direction === "prev" ? prev.getMonth() - 1 : prev.getMonth() + 1);
      return newDate;
    });
  };

  const navigateDateToMonth = (direction: "prev" | "next") => {
    setDateToCalendar(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(direction === "prev" ? prev.getMonth() - 1 : prev.getMonth() + 1);
      return newDate;
    });
  };

  const handleDateFromSelect = (date: Date) => {
    setDateFrom(formatDateInternal(date));
    setDateFromPickerOpen(false);
  };

  const handleDateToSelect = (date: Date) => {
    setDateTo(formatDateInternal(date));
    setDateToPickerOpen(false);
  };

  // Load adjustments from backend API when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchAdjustments = async () => {
        setLoading(true);
        try {
          const response = await inventoryAdjustmentsAPI.getAll();
          setAdjustments(Array.isArray(response) ? response : (response?.data || []));
        } catch (error) {
          console.error("Error fetching adjustments:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchAdjustments();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getFileName = (extension: string) => {
    const date = new Date().toISOString().split('T')[0];
    const sanitizedModule = module.toLowerCase().replace(/\s+/g, '-');
    return `${sanitizedModule}-${date}.${extension}`;
  };

  const getModuleHeaders = (moduleName: string) => {
    switch (moduleName) {
      case "Invoices": return ["Invoice#", "Date", "Customer Name", "Status", "Due Date", "Amount", "Balance Due", "Created By"];
      case "Quotes": return ["Quote#", "Date", "Customer Name", "Status", "Expiry Date", "Amount", "Created By"];
      case "Sales Receipt": return ["Receipt#", "Date", "Customer Name", "Status", "Amount", "Payment Mode"];
      case "Credit Notes": return ["Credit Note#", "Date", "Customer Name", "Status", "Amount", "Balance"];
      case "Bills": return ["Bill#", "Date", "Vendor Name", "Status", "Due Date", "Amount", "Balance Due"];
      case "Purchase Orders": return ["PO#", "Date", "Vendor Name", "Status", "Expected Delivery Date", "Amount"];
      case "Vendor Credits": return ["Vendor Credit#", "Date", "Vendor Name", "Status", "Amount", "Balance"];
      case "Expenses": return ["Date", "Expense Account", "Vendor Name", "Status", "Amount", "Reference#"];
      case "Customers": return ["Customer Name", "Company Name", "Contact Email", "Work Phone", "Receivables (BCY)", "Unused Credits (BCY)"];
      case "Vendors": return ["Vendor Name", "Company Name", "Contact Email", "Work Phone", "Payables (BCY)", "Unused Credits (BCY)"];
      case "Items": return ["Item Name", "SKU", "Usage Unit", "Sales Rate", "Purchase Rate", "Stock on Hand", "Item Type"];
      case "Inventory Adjustments": return ["Date", "Reference#", "Reason", "Status", "Type", "Account", "Created By", "Quantity Adjusted", "Cost Price"];
      case "Manual Journals": return ["Journal#", "Date", "Notes", "Status", "Reference#", "Amount"];
      case "Chart of Accounts": return ["Account Name", "Account Code", "Account Type", "Status", "Description"];
      case "Projects": return ["Project Name", "Customer Name", "Billing Method", "Status", "Budget", "Created By"];
      case "Tasks": return ["Task Name", "Project Name", "Associated Team", "Status", "Created By"];
      case "Users": return ["Name", "Email", "User Role", "Status", "Department"];
      case "Tax": return ["Tax Name", "Tax Rate (%)", "Tax Type", "Tax Authority"];
      case "Tax Group": return ["Group Name", "Tax Components", "Combined Rate (%)"];
      default: return ["Date", "Name", "Reference#", "Status", "Amount", "Created By"];
    }
  };

  const mapDataToRows = (data: any[], moduleName: string, headers: string[]) => {
    // If it's inventory adjustments, we use the real data
    if (moduleName === "Inventory Adjustments") {
      const rows: string[][] = [];
      data.forEach((adj) => {
        const itemRows = adj.items || adj.itemRows || [];
        if (itemRows.length > 0) {
          itemRows.forEach((item: any) => {
            rows.push([
              adj.date || "",
              adj.adjustmentNumber || adj.referenceNumber || "",
              adj.reason || "",
              adj.status || "",
              adj.type || "",
              adj.account || "",
              adj.createdBy || "",
              String(item.quantityAdjusted || item.newQuantity || ""),
              String(item.cost || item.costPrice || "")
            ]);
          });
        } else {
          rows.push([adj.date || "", adj.adjustmentNumber || adj.referenceNumber || "", adj.reason || "", adj.status || "", adj.type || "", adj.account || "", adj.createdBy || "", "", ""]);
        }
      });
      return rows;
    }

    // For other modules, provide placeholder rows since full integration might be pending
    // This allows the user to see the correct column structure
    return data.length > 0 ? [headers.map(() => "")] : [];
  };

  const handleExport = () => {
    let adjustmentsToExport = adjustments;

    if (fileFormat === "csv") {
      exportToCSV(adjustmentsToExport);
    } else if (fileFormat === "xls" || fileFormat === "xlsx") {
      exportToExcel(adjustmentsToExport, fileFormat);
    }
  };



  const exportToCSV = (data: Adjustment[]) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = getModuleHeaders(module);
    const rows = mapDataToRows(data, module, headers);
    // Data generation is now handled by mapDataToRows above

    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.map((h: string) => `"${String(h).replace(/"/g, '""')}"`).join(","),
      ...rows.map((row: string[]) => row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getFileName('csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Export successful");
    onClose();
  };

  const exportToExcel = (data: Adjustment[], format: string) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = getModuleHeaders(module);
    const rows = mapDataToRows(data, module, headers);

    let html = '<table><thead><tr>' + headers.map((h: string) => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';

    rows.forEach((row: string[]) => {
      html += '<tr>' + row.map((cell: string) => `<td>${cell}</td>`).join('') + '</tr>';
    });

    html += '</tbody></table>';

    const fileName = getFileName(format);

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Export successful");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[650px] max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5">
          <h2 className="text-[20px] font-medium text-[#4b4b4b]">Export {module}</h2>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] flex items-center justify-center rounded bg-[#156372] text-white hover:bg-[#0D4A52] transition-all hover:scale-110 shadow-sm"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto px-10 py-6 space-y-8 custom-scrollbar">

          {/* Info Banner */}
          <div className="bg-[#f0f9fa] border border-[rgba(21,99,114,0.1)] rounded-md p-4 flex items-start gap-4 mx-2">
            <div className="bg-[#156372] rounded-full p-1 mt-0.5">
              <InfoIcon size={14} className="text-white" />
            </div>
            <p className="text-[14px] text-[#4b4b4b] font-normal leading-relaxed">
              You can export your data from Taban Books in CSV, XLS or XLSX format.
            </p>
          </div>

          <div className="space-y-6 px-1">
            {/* Module Field */}
            <div className="space-y-2">
              <label className="block text-[14px] font-normal text-[#dc2626]">Module*</label>
              <div className="relative" ref={moduleMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsModuleMenuOpen(!isModuleMenuOpen)}
                  className={`w-full h-[38px] border flex items-center justify-between px-3 rounded text-[14px] text-left transition-all ${isModuleMenuOpen ? 'border-[#156372] ring-2 ring-[rgba(21,99,114,0.1)]' : 'border-[#d6d6d6]'}`}
                >
                  <span className="text-[#4b4b4b]">{module}</span>
                  {isModuleMenuOpen ? <ChevronUp size={14} className="text-[#156372]" /> : <ChevronDown size={14} className="text-[#999]" />}
                </button>

                {isModuleMenuOpen && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#d6d6d6] rounded shadow-xl z-[1300] overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[400px]">
                    <div className="p-2 border-b border-[#f0f0f0] sticky top-0 bg-white">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search Module"
                          value={moduleSearch}
                          onChange={(e) => setModuleSearch(e.target.value)}
                          className="w-full h-[34px] pl-9 pr-3 border border-[#156372] rounded text-[14px] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                      {modulesByGroup.map((group) => {
                        const filteredItems = group.items.filter(item =>
                          item.toLowerCase().includes(moduleSearch.toLowerCase())
                        );

                        if (filteredItems.length === 0) return null;

                        return (
                          <div key={group.group}>
                            <div className="px-4 py-2 bg-[#f8f9fa] text-[11px] font-bold text-[#666] uppercase tracking-wider">
                              {group.group}
                            </div>
                            {filteredItems.map((item) => (
                              <button
                                key={item}
                                type="button"
                                className={`w-full text-left px-4 py-2 text-[14px] transition-colors hover:bg-[#f1f8ff] ${module === item ? 'bg-[#f0f9fa] text-[#156372] font-medium' : 'text-[#4b4b4b]'}`}
                                onClick={() => {
                                  setModule(item);
                                  if (item === "Customers") setSelectedSubModule("Customers");
                                  else if (item === "Vendors") setSelectedSubModule("Vendors");
                                  else setSelectedSubModule("");

                                  if (item === "Documents") setSelectedDocumentSource("Select a document source");
                                  else setSelectedDocumentSource("");

                                  setIsModuleMenuOpen(false);
                                  setModuleSearch("");
                                }}
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                      {modulesByGroup.every(g => g.items.filter(i => i.toLowerCase().includes(moduleSearch.toLowerCase())).length === 0) && (
                        <div className="py-4 px-4 text-center">
                          <span className="text-[13px] text-[#888] font-medium tracking-wide">NO MODULES FOUND</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {["Customers", "Vendors"].includes(module) && (
              <div className="space-y-4 pt-2 -mt-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    checked={selectedSubModule === module}
                    onChange={() => setSelectedSubModule(module)}
                    className="w-[18px] h-[18px] text-[#156372] border-[#d6d6d6] focus:ring-[#156372]"
                  />
                  <span className="text-[14px] text-[#4b4b4b] font-normal">{module}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    checked={selectedSubModule === `${module === "Customers" ? "Customer's" : "Vendor's"} Contact Persons`}
                    onChange={() => setSelectedSubModule(`${module === "Customers" ? "Customer's" : "Vendor's"} Contact Persons`)}
                    className="w-[18px] h-[18px] text-[#156372] border-[#d6d6d6] focus:ring-[#156372]"
                  />
                  <span className="text-[14px] text-[#4b4b4b] font-normal">{module === "Customers" ? "Customer's" : "Vendor's"} Contact Persons</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    checked={selectedSubModule === `${module === "Customers" ? "Customer's" : "Vendor's"} Addresses`}
                    onChange={() => setSelectedSubModule(`${module === "Customers" ? "Customer's" : "Vendor's"} Addresses`)}
                    className="w-[18px] h-[18px] text-[#156372] border-[#d6d6d6] focus:ring-[#156372]"
                  />
                  <span className="text-[14px] text-[#4b4b4b] font-normal">{module === "Customers" ? "Customer's" : "Vendor's"} Addresses</span>
                </label>
                <div className="border-b border-[#f0f0f0] my-2"></div>
              </div>
            )}

            {/* Document Source for Documents module */}
            {module === "Documents" && (
              <div className="space-y-2 pt-2 -mt-4">
                <label className="block text-[14px] text-[#4b4b4b] font-normal">Document source</label>
                <div className="relative" ref={documentSourceMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsDocumentSourceMenuOpen(!isDocumentSourceMenuOpen)}
                    className={`w-full h-[38px] border flex items-center justify-between px-3 rounded text-[14px] text-left transition-all ${isDocumentSourceMenuOpen ? 'border-[#156372] ring-2 ring-[rgba(21,99,114,0.1)]' : 'border-[#d6d6d6]'}`}
                  >
                    <span className={selectedDocumentSource === "Select a document source" ? "text-[#999]" : "text-[#4b4b4b]"}>
                      {selectedDocumentSource}
                    </span>
                    {isDocumentSourceMenuOpen ? <ChevronUp size={14} className="text-[#156372]" /> : <ChevronDown size={14} className="text-[#999]" />}
                  </button>

                  {isDocumentSourceMenuOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#d6d6d6] rounded shadow-lg z-[1100] overflow-hidden animate-in fade-in zoom-in-95 duration-100 bg-white">
                      {["My Documents", "Folder A", "Folder B", "Shared with Me"].map((source) => (
                        <button
                          key={source}
                          type="button"
                          className={`w-full text-left px-4 py-3 text-[14px] hover:bg-[#f1f8ff] transition-colors ${selectedDocumentSource === source ? 'bg-[#f0f9fa] text-[#156372] font-medium' : 'text-[#4b4b4b]'}`}
                          onClick={() => { setSelectedDocumentSource(source); setIsDocumentSourceMenuOpen(false); }}
                        >
                          {source}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-b border-[#f0f0f0] my-2 pt-2"></div>
              </div>
            )}

            {/* Conditional Layout based on Module Group */}
            {["Quotes", "Invoices"].includes(module) ? (
              <div className="space-y-6">
                {/* Select Status */}
                <div className="space-y-2">
                  <label className="block text-[14px] font-normal text-[#dc2626]">Select Status*</label>
                  <div className="relative" ref={statusMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                      className={`w-full h-[38px] border flex items-center justify-between px-3 rounded text-[14px] text-left transition-all ${isStatusMenuOpen ? 'border-[#156372] ring-2 ring-[rgba(21,99,114,0.1)]' : 'border-[#d6d6d6]'}`}
                    >
                      <span className="text-[#4b4b4b]">{selectedStatus}</span>
                      {isStatusMenuOpen ? <ChevronUp size={14} className="text-[#156372]" /> : <ChevronDown size={14} className="text-[#999]" />}
                    </button>

                    {isStatusMenuOpen && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#d6d6d6] rounded shadow-lg z-[1100] overflow-hidden animate-in fade-in zoom-in-95 duration-100 bg-white">
                        {["All", "Draft", "Sent", "Accepted", "Declined", "Invoiced", "Closed"].map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={`w-full text-left px-4 py-3 text-[14px] hover:bg-[#f1f8ff] transition-colors ${selectedStatus === status ? 'bg-[#f0f9fa] text-[#156372] font-medium' : 'text-[#4b4b4b]'}`}
                            onClick={() => { setSelectedStatus(status); setIsStatusMenuOpen(false); }}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Date Range for Sales Modules */}
                <div className="space-y-3">
                  <label className="block text-[14px] text-[#4b4b4b] font-normal">Date Range</label>
                  <div className="flex items-center gap-4">
                    <div className="relative" ref={dateFromPickerRef}>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="dd MMM yyyy"
                          value={dateFrom}
                          readOnly
                          onClick={() => {
                            setDateFromPickerOpen(!dateFromPickerOpen);
                            setDateToPickerOpen(false);
                          }}
                          className={`w-[160px] h-[38px] border rounded px-3 pr-10 text-[14px] cursor-pointer outline-none transition-all ${dateFromPickerOpen ? 'border-[#156372] ring-2 ring-[rgba(21,99,114,0.1)]' : 'border-[#d6d6d6]'}`}
                        />
                        <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none" />
                      </div>
                      {dateFromPickerOpen && (
                        <div className="absolute top-full left-0 mt-2 bg-white border border-[#d1d5db] rounded-lg shadow-xl z-[1200] w-[280px] p-4 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between mb-4">
                            <button onClick={(e) => { e.stopPropagation(); navigateDateFromMonth("prev"); }} className="p-1 hover:bg-gray-100 rounded text-gray-600">«</button>
                            <span className="text-[14px] font-semibold text-gray-900">{dateFromCalendar.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                            <button onClick={(e) => { e.stopPropagation(); navigateDateFromMonth("next"); }} className="p-1 hover:bg-gray-100 rounded text-gray-600">»</button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                              <div key={day} className="text-[11px] font-bold text-center text-[#156372]">{day}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {getDaysInMonth(dateFromCalendar).map((day, idx) => {
                              const currentDate = parseDateInternal(dateFrom);
                              const isSelected = day.month === "current" && currentDate && currentDate.getDate() === day.date && currentDate.getMonth() === dateFromCalendar.getMonth() && currentDate.getFullYear() === dateFromCalendar.getFullYear();
                              const isToday = day.month === "current" && day.fullDate.toDateString() === new Date().toDateString();
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); if (day.month === "current") handleDateFromSelect(day.fullDate); }}
                                  className={`text-[12px] p-2 rounded transition-all ${day.month !== "current" ? 'text-gray-300 cursor-default' : isSelected ? 'bg-[#156372] text-white font-bold' : isToday ? 'border border-[#156372] text-[#156372]' : 'hover:bg-gray-100 text-gray-800'}`}
                                >
                                  {day.date}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <span className="text-[#999]">-</span>

                    <div className="relative" ref={dateToPickerRef}>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="dd MMM yyyy"
                          value={dateTo}
                          readOnly
                          onClick={() => {
                            setDateToPickerOpen(!dateToPickerOpen);
                            setDateFromPickerOpen(false);
                          }}
                          className={`w-[160px] h-[38px] border rounded px-3 pr-10 text-[14px] cursor-pointer outline-none transition-all ${dateToPickerOpen ? 'border-[#156372] ring-2 ring-[rgba(21,99,114,0.1)]' : 'border-[#d6d6d6]'}`}
                        />
                        <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none" />
                      </div>
                      {dateToPickerOpen && (
                        <div className="absolute top-full left-0 mt-2 bg-white border border-[#d1d5db] rounded-lg shadow-xl z-[1200] w-[280px] p-4 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between mb-4">
                            <button onClick={(e) => { e.stopPropagation(); navigateDateToMonth("prev"); }} className="p-1 hover:bg-gray-100 rounded text-gray-600">«</button>
                            <span className="text-[14px] font-semibold text-gray-900">{dateToCalendar.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                            <button onClick={(e) => { e.stopPropagation(); navigateDateToMonth("next"); }} className="p-1 hover:bg-gray-100 rounded text-gray-600">»</button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                              <div key={day} className="text-[11px] font-bold text-center text-[#156372]">{day}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {getDaysInMonth(dateToCalendar).map((day, idx) => {
                              const currentDate = parseDateInternal(dateTo);
                              const isSelected = day.month === "current" && currentDate && currentDate.getDate() === day.date && currentDate.getMonth() === dateToCalendar.getMonth() && currentDate.getFullYear() === dateToCalendar.getFullYear();
                              const isToday = day.month === "current" && day.fullDate.toDateString() === new Date().toDateString();
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); if (day.month === "current") handleDateToSelect(day.fullDate); }}
                                  className={`text-[12px] p-2 rounded transition-all ${day.month !== "current" ? 'text-gray-300 cursor-default' : isSelected ? 'bg-[#156372] text-white font-bold' : isToday ? 'border border-[#156372] text-[#156372]' : 'hover:bg-gray-100 text-gray-800'}`}
                                >
                                  {day.date}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : ["Projects", "Timesheet", "Project Tasks", "Tasks", "Inventory Adjustments", "Exchange Rates", "Users", "Chart of Accounts"].includes(module) ? (
              // Hide everything for these modules as per screenshot
              null
            ) : (
              // Default (Inventory/Other) Layout
              <div className="space-y-4">
                <div className="border-b border-[#f0f0f0] pb-2"></div>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="selection"
                    checked={adjustmentSelection === "all"}
                    onChange={() => setAdjustmentSelection("all")}
                    className="w-[18px] h-[18px] text-[#156372] border-[#d6d6d6] focus:ring-[#156372]"
                  />
                  <span className="text-[14px] text-[#4b4b4b] font-normal">All {module}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="selection"
                    checked={adjustmentSelection === "period"}
                    onChange={() => setAdjustmentSelection("period")}
                    className="w-[18px] h-[18px] text-[#156372] border-[#d6d6d6] focus:ring-[#156372]"
                  />
                  <span className="text-[14px] text-[#4b4b4b] font-normal">Specific Period</span>
                </label>

                {adjustmentSelection === "period" && (
                  <div className="pl-7 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-4">
                      <div className="relative" ref={dateFromPickerRef}>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={dateFrom}
                            readOnly
                            onClick={() => {
                              setDateFromPickerOpen(!dateFromPickerOpen);
                              setDateToPickerOpen(false);
                            }}
                            className={`w-[160px] h-[38px] border rounded px-3 pr-10 text-[14px] cursor-pointer outline-none transition-all ${dateFromPickerOpen ? 'border-[#156372] ring-2 ring-[rgba(21,99,114,0.1)]' : 'border-[#d6d6d6]'}`}
                          />
                          <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none" />
                        </div>
                        {dateFromPickerOpen && (
                          <div className="absolute top-full left-0 mt-2 bg-white border border-[#d1d5db] rounded-lg shadow-xl z-[1200] w-[280px] p-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-4">
                              <button onClick={(e) => { e.stopPropagation(); navigateDateFromMonth("prev"); }} className="p-1 hover:bg-gray-100 rounded text-gray-600">«</button>
                              <span className="text-[14px] font-semibold text-gray-900">{dateFromCalendar.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                              <button onClick={(e) => { e.stopPropagation(); navigateDateFromMonth("next"); }} className="p-1 hover:bg-gray-100 rounded text-gray-600">»</button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                <div key={day} className="text-[11px] font-bold text-center text-[#156372]">{day}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {getDaysInMonth(dateFromCalendar).map((day, idx) => {
                                const currentDate = parseDateInternal(dateFrom);
                                const isSelected = day.month === "current" && currentDate && currentDate.getDate() === day.date && currentDate.getMonth() === dateFromCalendar.getMonth() && currentDate.getFullYear() === dateFromCalendar.getFullYear();
                                const isToday = day.month === "current" && day.fullDate.toDateString() === new Date().toDateString();
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); if (day.month === "current") handleDateFromSelect(day.fullDate); }}
                                    className={`text-[12px] p-2 rounded transition-all ${day.month !== "current" ? 'text-gray-300 cursor-default' : isSelected ? 'bg-[#156372] text-white font-bold' : isToday ? 'border border-[#156372] text-[#156372]' : 'hover:bg-gray-100 text-gray-800'}`}
                                  >
                                    {day.date}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <span className="text-[#999]">-</span>

                      <div className="relative" ref={dateToPickerRef}>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={dateTo}
                            readOnly
                            onClick={() => {
                              setDateToPickerOpen(!dateToPickerOpen);
                              setDateFromPickerOpen(false);
                            }}
                            className={`w-[160px] h-[38px] border rounded px-3 pr-10 text-[14px] cursor-pointer outline-none transition-all ${dateToPickerOpen ? 'border-[#156372] ring-2 ring-[rgba(21,99,114,0.1)]' : 'border-[#d6d6d6]'}`}
                          />
                          <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none" />
                        </div>
                        {dateToPickerOpen && (
                          <div className="absolute top-full left-0 mt-2 bg-white border border-[#d1d5db] rounded-lg shadow-xl z-[1200] w-[280px] p-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-4">
                              <button onClick={(e) => { e.stopPropagation(); navigateDateToMonth("prev"); }} className="p-1 hover:bg-gray-100 rounded text-gray-600">«</button>
                              <span className="text-[14px] font-semibold text-gray-900">{dateToCalendar.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                              <button onClick={(e) => { e.stopPropagation(); navigateDateToMonth("next"); }} className="p-1 hover:bg-gray-100 rounded text-gray-600">»</button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                <div key={day} className="text-[11px] font-bold text-center text-[#156372]">{day}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {getDaysInMonth(dateToCalendar).map((day, idx) => {
                                const currentDate = parseDateInternal(dateTo);
                                const isSelected = day.month === "current" && currentDate && currentDate.getDate() === day.date && currentDate.getMonth() === dateToCalendar.getMonth() && currentDate.getFullYear() === dateToCalendar.getFullYear();
                                const isToday = day.month === "current" && day.fullDate.toDateString() === new Date().toDateString();
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); if (day.month === "current") handleDateToSelect(day.fullDate); }}
                                    className={`text-[12px] p-2 rounded transition-all ${day.month !== "current" ? 'text-gray-300 cursor-default' : isSelected ? 'bg-[#156372] text-white font-bold' : isToday ? 'border border-[#156372] text-[#156372]' : 'hover:bg-gray-100 text-gray-800'}`}
                                  >
                                    {day.date}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-[12px] text-[#dc2626] font-normal pt-1">
                        Filter Criteria*
                      </div>
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="radio"
                          checked={true}
                          readOnly
                          className="w-[16px] h-[16px] text-[#156372] border-[#d6d6d6] focus:ring-[#156372]"
                        />
                        <span className="text-[13px] text-[#4b4b4b] font-normal">Date</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[14px] text-[#4b4b4b]">Export Template</label>
                <HelpCircle size={14} className="text-[#999] cursor-help" />
              </div>
              <div className="relative" ref={templateMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
                  className={`w-full h-[38px] border flex items-center justify-between px-3 rounded text-[14px] text-left transition-all ${isTemplateMenuOpen ? 'border-[#156372] ring-2 ring-[rgba(21,99,114,0.1)]' : 'border-[#d6d6d6]'}`}
                >
                  <span className={selectedTemplate === "Select an Export Template" ? "text-[#999]" : "text-[#4b4b4b]"}>
                    {selectedTemplate}
                  </span>
                  {isTemplateMenuOpen ? <ChevronUp size={14} className="text-[#156372]" /> : <ChevronDown size={14} className="text-[#999]" />}
                </button>

                {isTemplateMenuOpen && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#d6d6d6] rounded shadow-lg z-[1100] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-[#f0f0f0]">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search"
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          className="w-full h-[34px] pl-9 pr-3 border border-[#156372] rounded text-[14px] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="py-4 px-4 text-center">
                      <span className="text-[13px] text-[#888] font-medium tracking-wide">NO RESULTS FOUND</span>
                    </div>
                    <div className="border-t border-[#f0f0f0]">
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-4 py-3 text-[14px] text-[#156372] hover:bg-[rgba(21,99,214,0.05)] transition-colors font-normal"
                        onClick={() => {
                          toast.success("Opening New Template dialog...");
                          setIsTemplateMenuOpen(false);
                        }}
                      >
                        <Plus size={16} strokeWidth={2.5} />
                        New Template
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Decimal Format */}
            <div className="space-y-2 pt-4">
              <label className="block text-[14px] font-normal text-[#dc2626]">Decimal Format*</label>
              <div className="relative" ref={decimalMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsDecimalMenuOpen(!isDecimalMenuOpen)}
                  className={`w-full h-[38px] border flex items-center justify-between px-3 rounded text-[14px] text-left transition-all ${isDecimalMenuOpen ? 'border-[#156372] ring-2 ring-[rgba(21,99,114,0.1)]' : 'border-[#d6d6d6]'}`}
                >
                  <span className="text-[#4b4b4b]">{selectedDecimalFormat}</span>
                  {isDecimalMenuOpen ? <ChevronUp size={14} className="text-[#156372]" /> : <ChevronDown size={14} className="text-[#999]" />}
                </button>

                {isDecimalMenuOpen && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#d6d6d6] rounded shadow-lg z-[1100] overflow-hidden animate-in fade-in zoom-in-95 duration-100 bg-white">
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-3 text-[14px] hover:bg-[#f1f8ff] transition-colors ${selectedDecimalFormat === "1234567.89" ? 'bg-[#f0f9fa] text-[#156372] font-medium' : 'text-[#4b4b4b]'}`}
                      onClick={() => { setSelectedDecimalFormat("1234567.89"); setIsDecimalMenuOpen(false); }}
                    >
                      1234567.89
                    </button>
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-3 text-[14px] hover:bg-[#f1f8ff] transition-colors ${selectedDecimalFormat === "1,234,567.89" ? 'bg-[#f0f9fa] text-[#156372] font-medium' : 'text-[#4b4b4b]'}`}
                      onClick={() => { setSelectedDecimalFormat("1,234,567.89"); setIsDecimalMenuOpen(false); }}
                    >
                      1,234,567.89
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Export File Format */}
            <div className="space-y-4 pt-4">
              <label className="block text-[14px] font-normal text-[#dc2626]">Export File Format*</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={fileFormat === "csv"}
                    onChange={() => setFileFormat("csv")}
                    className="w-[18px] h-[18px] text-[#156372] border-[#d6d6d6] focus:ring-[#156372]"
                  />
                  <span className="text-[14px] text-[#4b4b4b]">CSV (Comma Separated Value)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={fileFormat === "xls"}
                    onChange={() => setFileFormat("xls")}
                    className="w-[18px] h-[18px] text-[#156372] border-[#d6d6d6] focus:ring-[#156372]"
                  />
                  <span className="text-[14px] text-[#4b4b4b]">XLS (Microsoft Excel 1997-2004 Compatible)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={fileFormat === "xlsx"}
                    onChange={() => setFileFormat("xlsx")}
                    className="w-[18px] h-[18px] text-[#156372] border-[#d6d6d6] focus:ring-[#156372]"
                  />
                  <span className="text-[14px] text-[#4b4b4b]">XLSX (Microsoft Excel)</span>
                </label>
              </div>
            </div>

            {/* Password Protection */}
            <div className="space-y-2 pt-4">
              <label className="block text-[14px] font-normal text-[#4b4b4b]">File Protection Password</label>
              <div className="relative">
                <input
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[38px] border border-[#d6d6d6] rounded pl-3 pr-10 text-[14px] focus:outline-none focus:border-[#156372] text-[#4b4b4b]"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#666] p-1"
                >
                  {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[12px] text-[#888] leading-relaxed max-w-[550px] font-normal">
                Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
              </p>
            </div>

            {/* Limits Note */}
            <div className="pt-4">
              <p className="text-[12px] text-[#4b4b4b] leading-relaxed font-normal">
                <span className="font-bold">Note:</span> You can export only the first 25,000 rows. If you have more rows, please initiate a backup for the data in your Taban Books organization, and download it. <a href="#" className="text-[#156372] hover:underline">Backup Your Data</a>
              </p>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-5 bg-[#fbfbfb] border-t border-[#f0f0f0] flex gap-3">
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-6 py-2 bg-[#156372] hover:bg-[#0D4A52] text-white rounded text-[14px] font-medium transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Export
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-[#d6d6d6] text-[#4b4b4b] rounded text-[14px] font-medium hover:bg-[#f5f5f5] transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}

const ChevronDown = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

