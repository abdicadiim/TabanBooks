import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, ChevronRight, Upload, Check, Info, ChevronDown, Search } from "lucide-react";
import * as XLSX from "xlsx";

export default function TaxImportPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const importType = location.state?.type || "taxes"; // "taxes" or "tax-group"

    const [currentStep, setCurrentStep] = useState(1);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [characterEncoding, setCharacterEncoding] = useState("UTF-8");
    const [isDragging, setIsDragging] = useState(false);
    const [saveSelections, setSaveSelections] = useState(false);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [mappings, setMappings] = useState({
        taxType: "Tax Type",
        valueAddedTax: "Value Added Tax",
        taxName: "Tax Name",
        taxPercentage: "Tax Percentage",
        accountToTrackSales: "Account To Track Sales",
        accountToTrackPurchases: "Account To Track Purchases",
    });

    const [importSummary, setImportSummary] = useState({
        ready: 0,
        skipped: 0,
        unmapped: 0,
    });

    const defaultMappingHeaders = [
        "Tax Name",
        "Tax Percentage",
        "Tax Type",
        "Account To Track Sales",
        "Account To Track Purchases",
        "Value Added Tax",
    ];
    const fileHeaders = parsedData.length > 0 ? Object.keys(parsedData[0]) : [];
    const headers = [...new Set([...fileHeaders, ...defaultMappingHeaders, "None"])];


    React.useEffect(() => {
        if (location.state?.autoDownload) {
            handleDownloadSample();
        }
    }, []);

    const handleDownloadSample = () => {
        const sampleHeaders = [
            "Tax Name",
            "Tax Percentage",
            "Tax Type",
            "Account To Track Sales",
            "Account To Track Purchases",
            "Value Added Tax"
        ];

        const data = [
            ["Sample Tax 1", 6, "tax", "Tax Payable", "Tax Payable", "TRUE"],
            ["Sample Tax 2", 2, "compound_tax", "Output Tax", "Input Tax", "TRUE"],
            ["Sample Tax 3", 3, "tax", "Output Tax", "Tax Paid Expense", "FALSE"]
        ];

        // Create a worksheet
        const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...data]);

        // Create a workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Taxes");

        // Set column widths for better visibility
        ws["!cols"] = [
            { wch: 20 }, // Tax Name
            { wch: 15 }, // Tax Percentage
            { wch: 15 }, // Tax Type
            { wch: 25 }, // Account To Track Sales
            { wch: 25 }, // Account To Track Purchases
            { wch: 15 }, // Value Added Tax
        ];

        // Generate filename
        const filename = importType === "tax-group" ? "tax_group_import_sample.xlsx" : "tax_import_sample.xlsx";

        // Trigger download
        XLSX.writeFile(wb, filename);
    };

    const parseFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            setParsedData(json);

            // Basic summary logic
            setImportSummary({
                ready: json.length,
                skipped: 0,
                unmapped: 0
            });
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            parseFile(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            setSelectedFile(file);
            parseFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const handleNext = () => {
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        } else {
            handleImport();
        }
    };

    const handleImport = async () => {
        setIsLoading(true);
        try {
            // Transform data based on mappings
            const taxesToImport = parsedData.map(row => ({
                name: row[mappings.taxName],
                rate: row[mappings.taxPercentage],
                type: (row[mappings.taxType] || "both").toLowerCase(),
                accountToTrackSales: row[mappings.accountToTrackSales],
                accountToTrackPurchases: row[mappings.accountToTrackPurchases],
                isValueAddedTax: String(row[mappings.valueAddedTax]).toLowerCase() === "true"
            })).filter(t => t.name && t.rate !== undefined);

            const token = localStorage.getItem("token");
            const response = await fetch(`${process.env.VITE_API_URL || "http://localhost:5001/api"}/settings/taxes/bulk`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ taxes: taxesToImport })
            });

            if (response.ok) {
                navigate("/settings/taxes");
            } else {
                console.error("Failed to import taxes");
            }
        } catch (error) {
            console.error("Error importing taxes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleCancel = () => {
        navigate("/settings/taxes");
    };

    const filteredHeaders = headers.filter(h =>
        h.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderMappingRow = (label: string, value: string, mappingKey: string, required: boolean = false) => {
        const isOpen = openDropdown === mappingKey;

        return (
            <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 group relative" key={mappingKey}>
                <div className="flex-1">
                    <span className={`text-[14px] ${required ? "text-[#e11d48]" : "text-[#4b4b4b]"}`}>
                        {label} {required && "*"}
                    </span>
                </div>
                <div className="flex-1 max-w-[280px]">
                    <div className="relative">
                        <div
                            onClick={() => {
                                setOpenDropdown(isOpen ? null : mappingKey);
                                setSearchTerm("");
                            }}
                            className={`h-[34px] w-full border ${isOpen ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"} rounded px-2 flex items-center justify-between text-[13px] text-gray-700 bg-white cursor-pointer transition-all`}
                        >
                            <span className="truncate">{value === "None" ? "" : value}</span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMappings(prev => ({ ...prev, [mappingKey]: "None" }));
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X size={14} />
                                </button>
                                <div className="w-[1px] h-4 bg-gray-200 mx-0.5" />
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                            </div>
                        </div>

                        {isOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Search"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full h-8 pl-8 pr-3 text-[13px] border border-gray-200 rounded focus:border-blue-500 focus:outline-none placeholder:text-gray-400"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1 text-[13px]">
                                    {filteredHeaders.length > 0 ? (
                                        filteredHeaders.map((header) => (
                                            <div
                                                key={header}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMappings(prev => ({ ...prev, [mappingKey]: header }));
                                                    setOpenDropdown(null);
                                                }}
                                                className={`px-3 py-2 cursor-pointer rounded flex items-center justify-between group/item ${value === header ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"
                                                    }`}
                                            >
                                                <span>{header}</span>
                                                {value === header && <Check size={14} />}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-3 py-4 text-center text-gray-400 italic">No headers found</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 bg-white z-[10000] flex flex-col overflow-hidden font-sans"
            onClick={() => setOpenDropdown(null)}
        >
            {/* Search Settings Top Bar */}
            <div className="h-[60px] flex items-center justify-center border-b border-gray-100 bg-white sticky top-0 z-20">
                <div className="relative w-full max-w-[340px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                    <input
                        type="text"
                        placeholder="Search settings ( / )"
                        className="w-full h-[36px] bg-[#f8f9fc] border-none rounded-md px-10 text-[14px] text-gray-700 focus:outline-none placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* Stepper Header */}
            <div className="flex flex-col items-center pt-8 bg-white border-b border-gray-50 pb-6">
                <h2 className="text-[22px] font-medium text-[#111827] mb-8">
                    {currentStep === 1 ? "Configure" : currentStep === 2 ? "Map Fields" : "Preview"}
                </h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] ${currentStep >= 1 ? "bg-green-500 text-white font-bold" : "bg-gray-200 text-gray-500"}`}>
                            {currentStep > 1 ? <Check size={14} strokeWidth={4} /> : "1"}
                        </div>
                        <span className={`text-[14px] ${currentStep >= 1 ? "text-gray-900 font-medium" : "text-gray-400"}`}>Configure</span>
                    </div>
                    <div className="w-12 h-[1px] bg-gray-200" />
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] ${currentStep >= 2 ? "bg-green-500 text-white font-bold" : "bg-gray-200 text-gray-500"}`}>
                            {currentStep > 2 ? <Check size={14} strokeWidth={4} /> : "2"}
                        </div>
                        <span className={`text-[14px] ${currentStep >= 2 ? "text-gray-900 font-medium" : "text-gray-400"}`}>Map Fields</span>
                    </div>
                    <div className="w-12 h-[1px] bg-gray-200" />
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] ${currentStep >= 3 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                            3
                        </div>
                        <span className={`text-[14px] ${currentStep >= 3 ? "text-gray-900 font-medium" : "text-gray-400"}`}>Preview</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                <div className="max-w-[850px] mx-auto px-6 pb-24 pt-10">
                    {currentStep === 1 && (
                        <div className="space-y-8 py-4">
                            {/* File Upload Area */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${isDragging ? "border-[#156372] bg-blue-50" : "border-gray-300 hover:border-gray-400"
                                    }`}
                            >
                                <Upload size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-[15px] text-gray-600 mb-6 font-normal">Drag and drop file to import</p>
                                <div className="relative inline-block">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fileInputRef.current?.click();
                                        }}
                                        className="px-6 py-2 bg-[#156372] text-white rounded font-medium text-[14px] hover:bg-[#0f4e5a] transition-colors flex items-center gap-2 mx-auto shadow-sm"
                                    >
                                        <ChevronRight size={16} className="rotate-90" />
                                        Choose File
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.tsv,.xls,.xlsx"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </div>
                                {selectedFile && (
                                    <div className="mt-6 flex items-center justify-center gap-2">
                                        <div className="w-8 h-8 bg-green-50 text-green-600 rounded flex items-center justify-center border border-green-100">
                                            <Check size={16} />
                                        </div>
                                        <span className="text-[14px] text-gray-700 font-medium">{selectedFile.name}</span>
                                    </div>
                                )}
                                <p className="mt-6 text-[12px] text-gray-400 font-normal">
                                    Maximum File Size: 25 MB â€¢ File Format: CSV or TSV or XLS
                                </p>
                            </div>

                            {/* Sample File */}
                            <div className="text-[14px] text-gray-500 font-normal leading-relaxed">
                                Download a{" "}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadSample();
                                    }}
                                    className="text-blue-600 hover:text-blue-700 font-medium hover:underline px-0.5"
                                >
                                    sample file
                                </button>{" "}
                                and compare it to your import file to ensure you have the file perfect for the import.
                            </div>

                            {/* Character Encoding */}
                            <div className="space-y-2 pt-2">
                                <div className="flex items-center gap-2">
                                    <label className="text-[14px] font-medium text-gray-700">Character Encoding</label>
                                    <Info size={14} className="text-gray-400 cursor-help" />
                                </div>
                                <select
                                    value={characterEncoding}
                                    onChange={(e) => setCharacterEncoding(e.target.value)}
                                    className="w-full h-[38px] px-3 rounded border border-gray-300 text-[14px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                    <option value="UTF-8">UTF-8 (Unicode)</option>
                                    <option value="ISO-8859-1">ISO-8859-1</option>
                                    <option value="Windows-1252">Windows-1252</option>
                                </select>
                            </div>

                            {/* Page Tips */}
                            <div className="p-5 bg-[#fefce8] border border-[#fef08a] rounded-lg">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        <Info size={18} className="text-yellow-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-[14px] font-bold text-[#854d0e]">Page Tips</h4>
                                        <ul className="text-[13px] text-[#854d0e] space-y-2 list-disc list-inside font-normal leading-relaxed opacity-90">
                                            <li>If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.</li>
                                            <li>You can configure your import settings and save them for future too!</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-10 py-4 max-w-[800px] mx-auto animate-in fade-in duration-300">
                            {/* Selected File Info */}
                            <div className="text-[15px] text-gray-700 font-normal">
                                Your Selected File : <span className="font-semibold">{selectedFile?.name || "tax_import_sample.xlsx"}</span>
                            </div>

                            {/* Info Banner */}
                            <div className="bg-[#f0f7ff] rounded-md p-4 flex items-center gap-3 border border-[#e0efff]">
                                <div className="w-5 h-5 flex items-center justify-center">
                                    <Info size={18} className="text-[#3b82f6]" strokeWidth={2.5} />
                                </div>
                                <p className="text-[13.5px] text-gray-700">
                                    The best match to each field on the selected file have been auto-selected.
                                </p>
                            </div>

                            {/* Tax Details Section */}
                            <div className="space-y-4">
                                <h3 className="text-[16px] font-bold text-[#111827]">Tax Details</h3>

                                <div className="bg-white rounded border border-gray-100 shadow-sm overflow-visible">
                                    <div className="grid grid-cols-2 bg-[#f9fafb] px-4 py-2.5 border-b border-gray-100">
                                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">TABAN BOOKS FIELD</div>
                                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">IMPORTED FILE HEADERS</div>
                                    </div>

                                    <div className="px-4 py-1">
                                        {renderMappingRow("Tax Type", mappings.taxType, "taxType")}
                                        {renderMappingRow("Value Added Tax", mappings.valueAddedTax, "valueAddedTax")}
                                        {renderMappingRow("Tax Name", mappings.taxName, "taxName", true)}
                                        {renderMappingRow("Tax Percentage", mappings.taxPercentage, "taxPercentage", true)}
                                        {renderMappingRow("Account To Track Sales", mappings.accountToTrackSales, "accountToTrackSales")}
                                        {renderMappingRow("Account To Track Purchases", mappings.accountToTrackPurchases, "accountToTrackPurchases")}
                                    </div>
                                </div>
                            </div>

                            {/* Save Selections Checkbox */}
                            <div className="flex items-center gap-2.5 pt-2">
                                <input
                                    type="checkbox"
                                    id="saveSelections"
                                    checked={saveSelections}
                                    onChange={(e) => setSaveSelections(e.target.checked)}
                                    className="w-4.5 h-4.5 border-gray-300 rounded text-blue-600 focus:ring-blue-500 rounded-sm cursor-pointer"
                                />
                                <label htmlFor="saveSelections" className="text-[14px] text-gray-600 font-normal cursor-pointer select-none">
                                    Save these selections for use during future imports.
                                </label>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-8 py-4 max-w-[800px] mx-auto animate-in fade-in duration-300">
                            {/* Summary Banner */}
                            <div className="bg-[#f0f7ff] rounded-md p-4 flex items-center gap-3 border border-[#e0efff]">
                                <div className="w-5 h-5 flex items-center justify-center">
                                    <Info size={18} className="text-[#3b82f6]" strokeWidth={2.5} />
                                </div>
                                <p className="text-[14px] text-gray-700">
                                    {importSummary.ready} of {parsedData.length} Taxes in your file are ready to be imported.
                                </p>
                            </div>

                            {/* Summary List */}
                            <div className="space-y-0 text-[14px]">
                                {/* Ready to Import */}
                                <div className="flex items-center justify-between py-4 border-b border-gray-50 flex items-center">
                                    <div className="flex items-center gap-3">
                                        <Check size={18} className="text-green-500" strokeWidth={3} />
                                        <span className="text-[#374151]">Taxes that are ready to be imported - {importSummary.ready}</span>
                                    </div>
                                    <button className="text-blue-600 hover:text-blue-700 font-normal flex items-center gap-1">
                                        View Details <ChevronDown size={14} />
                                    </button>
                                </div>

                                {/* Skipped */}
                                <div className="flex items-center justify-between py-4 border-b border-gray-50 flex items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-[18px] h-[18px] flex items-center justify-center">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
                                            </svg>
                                        </div>
                                        <span className="text-[#374151]">No. of Records skipped - {importSummary.skipped}</span>
                                    </div>
                                    <button className="text-blue-600 hover:text-blue-700 font-normal flex items-center gap-1">
                                        View Details <ChevronDown size={14} />
                                    </button>
                                </div>

                                {/* Unmapped Fields */}
                                <div className="flex items-center justify-between py-4 border-b border-gray-50 flex items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-[18px] h-[18px] flex items-center justify-center">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
                                            </svg>
                                        </div>
                                        <span className="text-[#374151]">Unmapped Fields</span>
                                    </div>
                                    <button className="text-blue-600 hover:text-blue-700 font-normal flex items-center gap-1">
                                        View Details <ChevronDown size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="h-[75px] bg-[#f8f9fc] border-t border-gray-200 px-8 flex items-center justify-between sticky bottom-0 z-20">
                <div className="flex items-center gap-2">
                    {currentStep > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrevious();
                            }}
                            className="px-5 h-[34px] bg-white border border-gray-300 text-[13px] font-medium text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                            <span className="text-[14px] leading-none mb-0.5">&lt;</span> Previous
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                        }}
                        disabled={(!selectedFile && currentStep === 1) || isLoading}
                        className={`px-6 h-[34px] bg-[#3b82f6] text-white text-[13px] font-medium rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm min-w-[90px]`}
                    >
                        {isLoading ? "Importing..." : currentStep === 3 ? "Import" : "Next"} {currentStep < 3 && !isLoading && <span className="text-[14px] leading-none mb-0.5">&gt;</span>}
                    </button>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCancel();
                    }}
                    className="px-5 h-[34px] bg-white border border-gray-300 text-[13px] font-medium text-gray-700 rounded hover:bg-gray-50 transition-colors shadow-sm"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

