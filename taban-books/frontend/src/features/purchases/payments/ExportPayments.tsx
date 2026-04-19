// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { X, Eye, EyeOff, Info, ChevronDown, Search, Check, ChevronUp } from "lucide-react";

const Z = {
    primary: "#0D4A52", // Red for payments
    blue: "#156372",
    text: "#111827",
    textMuted: "#6b7280",
    line: "#e5e7eb",
    bgLight: "#eff6ff",
};

const MODULE_CATEGORIES = [
    {
        name: "Purchase",
        modules: [
            "Expenses",
            "Recurring Expenses",
            "Purchase Orders",
            "Bills",
            "Bill Payments",
            "Recurring Bills",
            "Vendor Credits",
            "Applied Vendor Credits",
            "Vendor Credit Refunds"
        ]
    }
];

export default function ExportPayments({ onClose, exportType = "payments", data = [] }) {
    const [module, setModule] = useState(exportType === "current-view" ? "Bill Payments (Current View)" : "Bill Payments");
    const [dataRange, setDataRange] = useState("all");
    const [exportFileFormat, setExportFileFormat] = useState("csv");
    const [filePassword, setFilePassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isModuleOpen, setIsModuleOpen] = useState(false);
    const [moduleSearch, setModuleSearch] = useState("");
    const moduleRef = useRef(null);

    const isCurrentView = exportType === "current-view";
    const getText = (value) => (value === null || value === undefined ? "" : value);
    const getNumber = (...values) => {
        for (const value of values) {
            if (value === null || value === undefined || value === "") continue;
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
        return 0;
    };
    const getVendorName = (payment) =>
        payment.vendorName ||
        payment.vendor_name ||
        payment.vendor ||
        "";

    const handleExport = () => {
        // Password Validation
        if (filePassword) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
            if (!passwordRegex.test(filePassword)) {
                alert("Password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.");
                return;
            }
        }

        let headers = [];
        let rows = [];

        if (isCurrentView) {
            headers = ["Payment#", "Date", "Vendor Name", "Reference#", "Bill#", "Mode", "Status", "Amount", "Unused Amount"];
            rows = data.map(p => [
                getText(p.paymentNumber || p.payment_number || p.id),
                getText(p.date),
                getText(getVendorName(p)),
                getText(p.reference || p.referenceNumber || p.reference_number),
                getText(p.billNumber || p.bill_number || p.billNo),
                getText(p.mode || p.paymentMethod || p.payment_method),
                getText(p.status),
                getNumber(p.amount, p.total),
                getNumber(p.unusedAmount, p.unused_amount)
            ]);
        } else {
            headers = ["Payment#", "Date", "Vendor Name", "Reference#", "Bill#", "Mode", "Status", "Amount", "Unused Amount", "Currency", "Description", "Paid Through Account"];
            rows = data.map(p => [
                getText(p.paymentNumber || p.payment_number || p.id),
                getText(p.date),
                getText(getVendorName(p)),
                getText(p.reference || p.referenceNumber || p.reference_number),
                getText(p.billNumber || p.bill_number || p.billNo),
                getText(p.mode || p.paymentMethod || p.payment_method),
                getText(p.status),
                getNumber(p.amount, p.total),
                getNumber(p.unusedAmount, p.unused_amount),
                getText(p.currency || p.currency_code),
                getText(p.description || p.notes),
                getText(p.accountName || p.account_name || p.paid_through_account || p.paidThroughAccount)
            ]);
        }

        let content = "";
        let mimeType = "";

        if (exportFileFormat === "csv") {
            content = [headers, ...rows].map(row => row.map(cell => `\"${(cell || "").toString().replace(/"/g, '""')}\"`).join(",")).join("\n");
            mimeType = "text/csv;charset=utf-8;";
        } else {
            content = [headers, ...rows].map(row => row.join("\t")).join("\n");
            mimeType = "application/vnd.ms-excel;charset=utf-8;";
        }

        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${module.toLowerCase().replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.${exportFileFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[3000]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-[600px] overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
                    <h2 className="text-lg font-bold text-gray-900 m-0">Export Payments</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors border-none bg-transparent cursor-pointer">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto flex-1">
                    <div className="space-y-8">
                        {/* Module Selection */}
                        <div className="relative" ref={moduleRef}>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Module</label>
                            <div
                                onClick={() => setIsModuleOpen(!isModuleOpen)}
                                className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md bg-white cursor-pointer flex items-center justify-between hover:border-teal-500 min-h-[40px]"
                            >
                                <span className="text-gray-900 font-medium">{module}</span>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isModuleOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {isModuleOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-2xl z-50 overflow-hidden flex flex-col">
                                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search modules..."
                                                value={moduleSearch}
                                                onChange={(e) => setModuleSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded outline-none focus:border-teal-600"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto max-h-[300px]">
                                        {MODULE_CATEGORIES.map((cat) => {
                                            const filteredModules = cat.modules.filter(m => m.toLowerCase().includes(moduleSearch.toLowerCase()));
                                            if (filteredModules.length === 0) return null;
                                            return (
                                                <div key={cat.name}>
                                                    <div className="px-4 py-2 text-xs font-bold text-gray-400 bg-gray-50 uppercase tracking-wider">{cat.name}</div>
                                                    {filteredModules.map((m) => (
                                                        <div
                                                            key={m}
                                                            onClick={() => {
                                                                setModule(m);
                                                                setIsModuleOpen(false);
                                                                setModuleSearch("");
                                                            }}
                                                            className="px-6 py-2.5 cursor-pointer text-sm flex items-center justify-between hover:bg-teal-50 group"
                                                        >
                                                            <span className={`transition-colors ${module === m ? 'text-teal-700 font-semibold' : 'text-gray-700 group-hover:text-teal-700'}`}>{m}</span>
                                                            {module === m && <Check size={14} className="text-teal-700" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Export File Format */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-4 tracking-tight">Export File Format</label>
                            <div className="flex gap-12">
                                <label className="flex items-center gap-2.5 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="format"
                                        value="csv"
                                        checked={exportFileFormat === "csv"}
                                        onChange={(e) => setExportFileFormat(e.target.value)}
                                        className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 cursor-pointer"
                                    />
                                    <span className={`text-sm font-medium transition-colors ${exportFileFormat === 'csv' ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}>CSV</span>
                                </label>
                                {!isCurrentView && (
                                    <label className="flex items-center gap-2.5 cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="format"
                                            value="xls"
                                            checked={exportFileFormat === "xls"}
                                            onChange={(e) => setExportFileFormat(e.target.value)}
                                            className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 cursor-pointer"
                                        />
                                        <span className={`text-sm font-medium transition-colors ${exportFileFormat === 'xls' ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}>XLS (Microsoft Excel 97-2004)</span>
                                    </label>
                                )}
                                {!isCurrentView && (
                                    <label className="flex items-center gap-2.5 cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="format"
                                            value="xlsx"
                                            checked={exportFileFormat === "xlsx"}
                                            onChange={(e) => setExportFileFormat(e.target.value)}
                                            className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 cursor-pointer"
                                        />
                                        <span className={`text-sm font-medium transition-colors ${exportFileFormat === 'xlsx' ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}>XLSX (Microsoft Excel)</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Password Protection */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Password to protect the file (Optional)</label>
                            <div className="relative max-w-sm">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={filePassword}
                                    onChange={(e) => setFilePassword(e.target.value)}
                                    placeholder="At least 12 characters"
                                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                                />
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="mt-2 flex items-start gap-2 bg-teal-50/50 p-3 rounded-md border border-blue-100">
                                <Info size={14} className="text-teal-700 mt-0.5 shrink-0" />
                                <p className="text-xs text-teal-800 leading-relaxed m-0">
                                    Password will be set for the generated file. You won't be able to retrieve it if forgotten.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="px-6 py-2 text-sm font-semibold text-white border-none rounded cursor-pointer shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                        style={{ backgroundColor: Z.primary }}
                    >
                        Export
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
