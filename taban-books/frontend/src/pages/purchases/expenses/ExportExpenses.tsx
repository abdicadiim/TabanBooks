// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { X, Eye, EyeOff, Info, ChevronDown, Search, Check, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

const Z = {
    primary: "#156372", // Teal theme
    blue: "#156372",
    text: "#111827",
    textMuted: "#6b7280",
    line: "#e5e7eb",
    bgLight: "#15637210",
};

const MODULES_DATA = {
    "Sales": [
        "Quotes",
        "Invoices",
        "Invoice Payments",
        "Recurring Invoices",
        "Credit Notes",
        "Credit Notes Applied to Invoices",
        "Refunds"
    ],
    "Purchase": [
        "Expenses",
        "Recurring Expenses",
        "Purchase Orders",
        "Bills",
        "Bill Payments",
        "Recurring Bills",
        "Vendor Credits",
        "Applied Vendor Credits",
        "Vendor Credit Refunds"
    ],
    "Timesheet": [
        "Projects",
        "Timesheet",
        "Project Tasks"
    ],
    "Others": [
        "Customers",
        "Vendors",
        "Tasks",
        "Items",
        "Inventory Adjustments",
        "Exchange Rates",
        "Users",
        "Chart of Accounts",
        "Manual Journals",
        "Documents"
    ]
};

const ALL_EXPENSE_FIELDS = [
    "Expense Date",
    "Expense Account",
    "Expense Amount",
    "Reference#",
    "Vendor Name",
    "Customer Name",
    "Project Name",
    "Billable",
    "Tax Name",
    "Tax Amount",
    "Tax Percentage",
    "Currency Code",
    "Exchange Rate",
    "Description",
    "Paid Through",
    "Is Inclusive Tax"
];

function NewExportTemplateModal({ onClose, onSave }) {
    const [templateName, setTemplateName] = useState("");
    const [fields, setFields] = useState([
        { id: 1, tabanName: "Expense Date", exportName: "Expense Date" },
        { id: 2, tabanName: "Expense Account", exportName: "Expense Account" },
        { id: 3, tabanName: "Expense Amount", exportName: "Expense Amount" }
    ]);

    const handleAddField = () => {
        const newId = Math.max(...fields.map(f => f.id), 0) + 1;
        setFields([...fields, { id: newId, tabanName: "", exportName: "" }]);
    };

    const handleRemoveField = (id) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const handleFieldChange = (id, key, value) => {
        setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    const handleSave = () => {
        if (!templateName.trim()) {
            alert("Please enter a template name");
            return;
        }
        onSave(templateName, fields);
        onClose();
    };

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10001 // Higher than ExportExpenses
        }}>
            <div style={{
                backgroundColor: "white",
                borderRadius: "4px",
                width: "100%",
                maxWidth: "700px",
                height: "auto",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
            }}>
                {/* Header */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 24px",
                    borderBottom: `1px solid ${Z.line}`,
                    backgroundColor: "#f9fafb",
                    borderTopLeftRadius: "4px",
                    borderTopRightRadius: "4px"
                }}>
                    <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 }}>
                        New Export Template
                    </h2>
                    <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#6b7280" }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
                    <div style={{ marginBottom: "24px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: Z.primary, marginBottom: "8px" }}>
                            Template Name*
                        </label>
                        <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: `1px solid ${Z.primary}`,
                                borderRadius: "4px",
                                fontSize: "14px",
                                outline: "none"
                            }}
                            autoFocus
                        />
                    </div>

                    <div style={{ border: `1px solid ${Z.line}`, borderRadius: "4px", overflow: "hidden" }}>
                        {/* Table Header */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "30px 1fr 1fr 30px",
                            gap: "12px",
                            padding: "10px 16px",
                            backgroundColor: "#f9fafb",
                            borderBottom: `1px solid ${Z.line}`,
                            fontSize: "11px",
                            fontWeight: "600",
                            color: "#6b7280",
                            textTransform: "uppercase"
                        }}>
                            <div></div>
                            <div>FIELD NAME IN TABAN BOOKS</div>
                            <div>FIELD NAME IN EXPORT FILE</div>
                            <div></div>
                        </div>

                        {/* Table Body */}
                        <div style={{ padding: "16px" }}>
                            {fields.map((field, index) => (
                                <div key={field.id} style={{
                                    display: "grid",
                                    gridTemplateColumns: "30px 1fr 1fr 30px",
                                    gap: "12px",
                                    alignItems: "center",
                                    marginBottom: "12px"
                                }}>
                                    <div style={{ cursor: "move", color: "#9ca3af" }}>
                                        <GripVertical size={16} />
                                    </div>
                                    <div>
                                        <div style={{ position: "relative" }}>
                                            <select
                                                value={field.tabanName}
                                                onChange={(e) => {
                                                    handleFieldChange(field.id, "tabanName", e.target.value);
                                                    if (!field.exportName) {
                                                        handleFieldChange(field.id, "exportName", e.target.value);
                                                    }
                                                }}
                                                style={{
                                                    width: "100%",
                                                    padding: "8px 12px",
                                                    border: `1px solid ${Z.line}`,
                                                    borderRadius: "4px",
                                                    fontSize: "14px",
                                                    appearance: "none",
                                                    backgroundColor: "white",
                                                    cursor: "pointer",
                                                    color: "#374151"
                                                }}
                                            >
                                                <option value="" disabled>Select Field</option>
                                                {ALL_EXPENSE_FIELDS.map(f => (
                                                    <option key={f} value={f}>{f}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            value={field.exportName}
                                            onChange={(e) => handleFieldChange(field.id, "exportName", e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "8px 12px",
                                                border: `1px solid ${Z.line}`,
                                                borderRadius: "4px",
                                                fontSize: "14px",
                                                outline: "none",
                                                color: "#374151"
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => handleRemoveField(field.id)}
                                            style={{ border: "none", background: "none", cursor: "pointer", color: "#156372" }}
                                            title="Remove Field"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleAddField}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            border: "none",
                            background: "none",
                            color: Z.blue,
                            fontSize: "13px",
                            fontWeight: "500",
                            cursor: "pointer",
                            marginTop: "16px",
                            padding: 0
                        }}
                    >
                        <Plus size={16} />
                        Add a New Field
                    </button>
                </div>

                {/* Footer */}
                <div style={{
                    padding: "16px 24px",
                    backgroundColor: "#f9fafb",
                    borderTop: `1px solid ${Z.line}`,
                    display: "flex",
                    gap: "12px",
                    borderBottomLeftRadius: "4px",
                    borderBottomRightRadius: "4px"
                }}>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: Z.primary,
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer"
                        }}
                    >
                        Save and Select
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "white",
                            color: "#374151",
                            border: `1px solid ${Z.line}`,
                            borderRadius: "4px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer"
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ExportExpenses({ onClose, exportType = "expenses", data = [] }) {
    const [module, setModule] = useState("Expenses");
    const [dataRange, setDataRange] = useState("all");
    const [specificPeriod, setSpecificPeriod] = useState({ start: "", end: "" });
    const [exportTemplate, setExportTemplate] = useState("standard");
    const [decimalFormat, setDecimalFormat] = useState("1234567.89");
    const [exportFileFormat, setExportFileFormat] = useState("csv");
    const [includePII, setIncludePII] = useState(false);
    const [filePassword, setFilePassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Dropdown states
    const [isDecimalFormatOpen, setIsDecimalFormatOpen] = useState(false);

    // Module Dropdown States
    const [isModuleDropdownOpen, setIsModuleDropdownOpen] = useState(false);
    const [moduleSearchQuery, setModuleSearchQuery] = useState("");

    // Template Dropdown States
    const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
    const [templateSearchQuery, setTemplateSearchQuery] = useState("");
    const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
    const [customTemplates, setCustomTemplates] = useState([]);

    const decimalFormatRef = useRef(null);
    const moduleDropdownRef = useRef(null);
    const searchInputRef = useRef(null);
    const templateDropdownRef = useRef(null);
    const templateSearchInputRef = useRef(null);

    const isCurrentView = exportType === "current-view";

    const decimalFormats = [
        "1234567.89",
        "1,234,567.89",
        "1234567,89",
        "1.234.567,89",
        "1234567 89",
        "1 234 567 89"
    ];

    const templates = [
        { id: "standard", name: "Standard Template" },
        ...customTemplates
    ];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (decimalFormatRef.current && !decimalFormatRef.current.contains(event.target)) {
                setIsDecimalFormatOpen(false);
            }
            if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(event.target)) {
                setIsModuleDropdownOpen(false);
            }
            if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target)) {
                setIsTemplateDropdownOpen(false);
            }
        };
        if (isDecimalFormatOpen || isModuleDropdownOpen || isTemplateDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isDecimalFormatOpen, isModuleDropdownOpen, isTemplateDropdownOpen]);

    useEffect(() => {
        if (isModuleDropdownOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isModuleDropdownOpen]);

    useEffect(() => {
        if (isTemplateDropdownOpen && templateSearchInputRef.current) {
            templateSearchInputRef.current.focus();
        }
    }, [isTemplateDropdownOpen]);

    const handleExport = async () => {
        // Password Validation
        if (filePassword) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
            if (!passwordRegex.test(filePassword)) {
                alert("Password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.");
                return;
            }
        }

        const exportRows = Array.isArray(data) ? data : [];
        if (exportRows.length === 0) {
            alert("No expense data available to export.");
            return;
        }

        let headers = [];
        let rows = [];

        if (isCurrentView) {
            headers = ["Date", "Expense Account", "Reference#", "Vendor Name", "Paid Through", "Customer Name", "Status", "Amount"];
            rows = exportRows.map(exp => [
                exp.date || "",
                exp.expenseAccount || "",
                exp.reference || "",
                exp.vendor || "",
                exp.paidThrough || "",
                exp.customerName || "",
                exp.status || "",
                exp.amount || 0
            ]);
        } else {
            headers = [
                "Date", "Expense Account", "Reference#", "Vendor Name", "Paid Through",
                "Customer Name", "Status", "Amount", "Description", "Currency",
                "Tax Name", "Tax Amount"
            ];
            rows = exportRows.map(exp => [
                exp.date || "",
                exp.expenseAccount || "",
                exp.reference || "",
                exp.vendor || "",
                exp.paidThrough || "",
                exp.customerName || "",
                exp.status || "",
                exp.amount || 0,
                exp.notes || "",
                exp.currency || "",
                exp.tax_name || "",
                exp.tax_amount || 0
            ]);
        }

        if (exportFileFormat === "csv") {
            const content = [headers, ...rows]
                .map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
                .join("\n");
            const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${module.toLowerCase().replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } else {
            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
            const bookType = exportFileFormat === "xls" ? "xls" : "xlsx";
            XLSX.writeFile(
                workbook,
                `${module.toLowerCase().replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.${bookType}`,
                { bookType }
            );
        }

        onClose();
    };

    const handleSaveNewTemplate = (name, fields) => {
        const newTemplate = {
            id: `custom-${Date.now()}`,
            name: name,
            fields: fields
        };
        setCustomTemplates([...customTemplates, newTemplate]);
        setExportTemplate(newTemplate.id);
    };

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000
        }}>
            {showNewTemplateModal && (
                <NewExportTemplateModal
                    onClose={() => setShowNewTemplateModal(false)}
                    onSave={handleSaveNewTemplate}
                />
            )}

            <div style={{
                backgroundColor: "white",
                borderRadius: "4px",
                width: "100%",
                maxWidth: "600px",
                height: "auto",
                maxHeight: "95vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
            }}>
                {/* Header */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 24px",
                    borderBottom: `1px solid ${Z.line}`,
                    backgroundColor: "#f9fafb",
                    borderTopLeftRadius: "4px",
                    borderTopRightRadius: "4px"
                }}>
                    <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 }}>
                        {isCurrentView ? "Export Current View" : "Export Expenses"}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#6b7280"
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
                    {/* Information Banner */}
                    <div style={{
                        backgroundColor: "#15637210",
                        padding: "12px 16px",
                        borderRadius: "6px",
                        marginBottom: "24px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                    }}>
                        <Info size={18} style={{ color: "#156372" }} fill="#156372" color="white" />
                        <span style={{ fontSize: "14px", color: "#156372", lineHeight: "1.5" }}>
                            {isCurrentView
                                ? "Only the current view with its visible columns will be exported from Taban Books in CSV or XLS format."
                                : "You can export your data from Taban Books in CSV, XLS or XLSX format."
                            }
                        </span>
                    </div>

                    {/* Module - Only for Export Expenses */}
                    {!isCurrentView && (
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#156372", marginBottom: "8px" }}>
                                Module*
                            </label>

                            {/* Custom Searchable Dropdown */}
                            <div ref={moduleDropdownRef} style={{ position: "relative" }}>
                                <div
                                    onClick={() => setIsModuleDropdownOpen(!isModuleDropdownOpen)}
                                    style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        border: `1px solid ${isModuleDropdownOpen ? Z.blue : Z.line}`,
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                        backgroundColor: "white",
                                        color: "#374151",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        boxShadow: isModuleDropdownOpen ? `0 0 0 1px ${Z.blue}` : "none"
                                    }}
                                >
                                    <span>{module}</span>
                                    <ChevronDown size={14} className="text-gray-500" />
                                </div>

                                {isModuleDropdownOpen && (
                                    <div style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        width: "100%",
                                        backgroundColor: "white",
                                        border: `1px solid ${Z.line}`,
                                        borderRadius: "4px",
                                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                        zIndex: 2000,
                                        marginTop: "4px",
                                        maxHeight: "300px",
                                        overflowY: "auto",
                                        display: "flex",
                                        flexDirection: "column"
                                    }}>
                                        {/* Search Input */}
                                        <div style={{ padding: "8px", position: "sticky", top: 0, backgroundColor: "white", borderBottom: `1px solid ${Z.line}` }}>
                                            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                                <Search size={14} style={{ position: "absolute", left: "10px", color: "#9ca3af" }} />
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    placeholder="Search"
                                                    value={moduleSearchQuery}
                                                    onChange={(e) => setModuleSearchQuery(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        width: "100%",
                                                        padding: "6px 8px 6px 30px",
                                                        border: `1px solid ${Z.line}`,
                                                        borderRadius: "4px",
                                                        fontSize: "13px",
                                                        outline: "none"
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Grouped List */}
                                        <div style={{ padding: "4px 0" }}>
                                            {Object.entries(getFilteredModules()).map(([category, items]) => (
                                                <div key={category}>
                                                    <div style={{
                                                        padding: "8px 12px",
                                                        fontSize: "12px",
                                                        fontWeight: "600",
                                                        color: "#6b7280",
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.05em"
                                                    }}>
                                                        {category}
                                                    </div>
                                                    {items.map((item) => (
                                                        <div
                                                            key={item}
                                                            onClick={() => {
                                                                setModule(item);
                                                                setIsModuleDropdownOpen(false);
                                                                setModuleSearchQuery("");
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = Z.blue;
                                                                e.currentTarget.style.color = "white";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = "transparent";
                                                                e.currentTarget.style.color = item === module && !isModuleDropdownOpen ? Z.blue : "#374151";
                                                            }}
                                                            style={{
                                                                padding: "8px 24px",
                                                                cursor: "pointer",
                                                                fontSize: "14px",
                                                                color: item === module ? Z.blue : "#374151",
                                                                backgroundColor: "transparent",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "space-between"
                                                            }}
                                                        >
                                                            {item}
                                                            {item === module && <Check size={14} />}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                            {Object.keys(getFilteredModules()).length === 0 && (
                                                <div style={{ padding: "12px", textAlign: "center", color: Z.textMuted, fontSize: "13px" }}>
                                                    No results found
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Data Range - Only for Export Expenses */}
                    {!isCurrentView && (
                        <div style={{ marginBottom: "20px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                    <input
                                        type="radio"
                                        name="dataRange"
                                        checked={dataRange === "all"}
                                        onChange={() => setDataRange("all")}
                                        style={{ accentColor: Z.blue, margin: 0 }}
                                    />
                                    <span style={{ fontSize: "14px", color: "#374151" }}>All Expenses</span>
                                </label>

                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                        <input
                                            type="radio"
                                            name="dataRange"
                                            checked={dataRange === "specific"}
                                            onChange={() => setDataRange("specific")}
                                            style={{ accentColor: Z.blue, margin: 0 }}
                                        />
                                        <span style={{ fontSize: "14px", color: "#374151" }}>Specific Period</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Export Template - Only for Export Expenses */}
                    {!isCurrentView && (
                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: "500", color: "#6b7280", marginBottom: "8px" }}>
                                Export Template
                                <Info size={14} className="text-gray-400" />
                            </label>

                            {/* Updated Custom Searchable Dropdown for Template */}
                            <div ref={templateDropdownRef} style={{ position: "relative" }}>
                                <div
                                    onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                                    style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        border: `1px solid ${isTemplateDropdownOpen ? Z.blue : Z.line}`,
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                        backgroundColor: "white",
                                        color: exportTemplate ? "#374151" : "#9ca3af",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        boxShadow: isTemplateDropdownOpen ? `0 0 0 1px ${Z.blue}` : "none"
                                    }}
                                >
                                    <span>
                                        {templates.find(t => t.id === exportTemplate)?.name || "Select an Export Template"}
                                    </span>
                                    <ChevronDown size={14} className={`${isTemplateDropdownOpen ? "rotate-180" : ""} transition-transform text-gray-500`} />
                                </div>

                                {isTemplateDropdownOpen && (
                                    <div style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        width: "100%",
                                        backgroundColor: "white",
                                        border: `1px solid ${Z.line}`,
                                        borderRadius: "4px",
                                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                        zIndex: 2000,
                                        marginTop: "4px",
                                        overflow: "hidden"
                                    }}>
                                        {/* Search Input */}
                                        <div style={{ padding: "8px", borderBottom: `1px solid ${Z.line}` }}>
                                            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                                <Search size={14} style={{ position: "absolute", left: "10px", color: "#9ca3af" }} />
                                                <input
                                                    ref={templateSearchInputRef}
                                                    type="text"
                                                    placeholder="Search"
                                                    value={templateSearchQuery}
                                                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        width: "100%",
                                                        padding: "6px 8px 6px 30px",
                                                        border: `1px solid ${Z.blue}`,
                                                        borderRadius: "4px",
                                                        fontSize: "13px",
                                                        outline: "none"
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Template List */}
                                        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                                            {getFilteredTemplates().length === 0 ? (
                                                <div style={{ padding: "12px", textAlign: "center", color: "#9ca3af", fontSize: "12px", textTransform: "uppercase" }}>
                                                    No results found
                                                </div>
                                            ) : (
                                                getFilteredTemplates().map((template) => (
                                                    <div
                                                        key={template.id}
                                                        onClick={() => {
                                                            setExportTemplate(template.id);
                                                            setIsTemplateDropdownOpen(false);
                                                            setTemplateSearchQuery("");
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = Z.blue;
                                                            e.currentTarget.style.color = "white";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = "transparent";
                                                            e.currentTarget.style.color = template.id === exportTemplate ? Z.blue : "#374151";
                                                        }}
                                                        style={{
                                                            padding: "8px 12px",
                                                            cursor: "pointer",
                                                            fontSize: "14px",
                                                            color: template.id === exportTemplate ? Z.blue : "#374151",
                                                            backgroundColor: "transparent",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between"
                                                        }}
                                                    >
                                                        {template.name}
                                                        {template.id === exportTemplate && <Check size={14} />}
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* New Template Button */}
                                        <div
                                            onClick={() => {
                                                setIsTemplateDropdownOpen(false);
                                                setShowNewTemplateModal(true);
                                            }}
                                            style={{
                                                padding: "10px 12px",
                                                borderTop: `1px solid ${Z.line}`,
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                color: Z.blue,
                                                fontSize: "13px",
                                                fontWeight: "500"
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                                        >
                                            <div style={{
                                                width: "16px",
                                                height: "16px",
                                                borderRadius: "50%",
                                                backgroundColor: Z.blue,
                                                color: "white",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}>
                                                <Plus size={10} strokeWidth={3} />
                                            </div>
                                            New Template
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Decimal Format */}
                    <div style={{ marginBottom: "24px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#156372", marginBottom: "8px" }}>
                            Decimal Format*
                        </label>
                        <div ref={decimalFormatRef} style={{ position: "relative" }}>
                            <div
                                onClick={() => setIsDecimalFormatOpen(!isDecimalFormatOpen)}
                                style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    border: `1px solid ${Z.line}`,
                                    borderRadius: "4px",
                                    fontSize: "14px",
                                    background: "white",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    color: "#374151"
                                }}
                            >
                                <span>{decimalFormat}</span>
                                <ChevronDown size={14} color={Z.textMuted} />
                            </div>
                            {isDecimalFormatOpen && (
                                <div style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    width: "100%",
                                    backgroundColor: "white",
                                    border: `1px solid ${Z.line}`,
                                    borderRadius: "4px",
                                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                    zIndex: 2000,
                                    marginTop: "4px"
                                }}>
                                    {decimalFormats.map((format) => (
                                        <div
                                            key={format}
                                            onClick={() => { setDecimalFormat(format); setIsDecimalFormatOpen(false); }}
                                            style={{ padding: "8px 12px", cursor: "pointer", fontSize: "14px" }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = Z.bgLight}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                        >
                                            {format}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Export File Format */}
                    <div style={{ marginBottom: "24px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#156372", marginBottom: "12px" }}>
                            Export File Format*
                        </label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                                <input
                                    type="radio"
                                    name="exportFormat"
                                    checked={exportFileFormat === "csv"}
                                    onChange={() => setExportFileFormat("csv")}
                                    style={{ accentColor: Z.blue, margin: 0 }}
                                />
                                <span style={{ fontSize: "14px", color: "#374151" }}>CSV (Comma Separated Value)</span>
                            </label>

                            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                                <input
                                    type="radio"
                                    name="exportFormat"
                                    checked={exportFileFormat === "xls"}
                                    onChange={() => setExportFileFormat("xls")}
                                    style={{ accentColor: Z.blue, margin: 0 }}
                                />
                                <span style={{ fontSize: "14px", color: "#374151" }}>XLS (Microsoft Excel 1997-2004 Compatible)</span>
                            </label>

                            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                                <input
                                    type="radio"
                                    name="exportFormat"
                                    checked={exportFileFormat === "xlsx"}
                                    onChange={() => setExportFileFormat("xlsx")}
                                    style={{ accentColor: Z.blue, margin: 0 }}
                                />
                                <span style={{ fontSize: "14px", color: "#374151" }}>XLSX (Microsoft Excel)</span>
                            </label>
                        </div>
                    </div>

                    {/* PII Inclusion */}
                    {!isCurrentView && (
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "flex", alignItems: "start", gap: "10px", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={includePII}
                                    onChange={(e) => setIncludePII(e.target.checked)}
                                    style={{ accentColor: Z.blue, marginTop: "2px" }}
                                />
                                <span style={{ fontSize: "14px", color: "#374151" }}>
                                    Include Sensitive Personally Identifiable Information (PII) while exporting.
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Password */}
                    <div style={{ marginBottom: "24px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
                            File Protection Password
                        </label>
                        <div style={{ position: "relative" }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={filePassword}
                                onChange={(e) => setFilePassword(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "8px 40px 8px 12px",
                                    border: `1px solid ${Z.line}`,
                                    borderRadius: "4px",
                                    fontSize: "14px",
                                    outline: "none"
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: "absolute",
                                    right: "8px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: Z.textMuted
                                }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <p style={{ fontSize: "12px", color: Z.textMuted, marginTop: "8px", lineHeight: "1.4" }}>
                            Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
                        </p>
                    </div>

                    {/* Note */}
                    <div style={{ fontSize: "13px", color: Z.textMuted, lineHeight: "1.5" }}>
                        <span style={{ fontWeight: "600" }}>Note:</span> You can export only the first {isCurrentView ? "10,000" : "25,000"} rows. If you have more rows, please initiate a backup for the data in your Taban Books organization, and download it. <a href="#" style={{ color: Z.blue, textDecoration: "none" }}>Backup Your Data</a>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: "16px 24px",
                    backgroundColor: "#f9fafb", // Match footing background often seen
                    borderTop: `1px solid ${Z.line}`,
                    display: "flex",
                    gap: "12px",
                    borderBottomLeftRadius: "4px",
                    borderBottomRightRadius: "4px"
                }}>
                    <button
                        onClick={handleExport}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: Z.primary,
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer"
                        }}
                    >
                        Export
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "white",
                            color: "#374151",
                            border: `1px solid ${Z.line}`,
                            borderRadius: "4px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer"
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

