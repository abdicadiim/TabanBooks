// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { X, Eye, EyeOff, Info, ChevronDown, Search, Check, ChevronUp } from "lucide-react";

const Z = {
  primary: "#156372", // Red
  blue: "#2663eb",
  text: "#111827",
  textMuted: "#6b7280",
  line: "#e5e7eb",
  bgLight: "#eff6ff",
};

const MODULE_CATEGORIES = [
  {
    name: "Sales",
    modules: [
      "Quotes",
      "Invoices",
      "Invoice Payments",
      "Recurring Invoices",
      "Credit Notes",
      "Credit Notes Applied to Invoices",
      "Refunds"
    ]
  },
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
  },
  {
    name: "Timesheet",
    modules: ["Projects", "Timesheet", "Project Tasks"]
  },
  {
    name: "Others",
    modules: [
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
  }
];

export default function ExportVendors({ onClose, exportType = "vendors", data = [] }) {
  const [module, setModule] = useState(exportType === "current-view" ? "Vendors (Current View)" : "Vendors");
  const [exportDataType, setExportDataType] = useState("vendors");
  const [dataRange, setDataRange] = useState("all");
  const [specificPeriod, setSpecificPeriod] = useState({ start: "", end: "" });
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [exportFileFormat, setExportFileFormat] = useState("csv");
  const [includePII, setIncludePII] = useState(false);
  const [filePassword, setFilePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDecimalFormatOpen, setIsDecimalFormatOpen] = useState(false);
  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [moduleSearch, setModuleSearch] = useState("");
  const decimalFormatRef = useRef(null);
  const moduleRef = useRef(null);

  const isCurrentView = exportType === "current-view";

  const decimalFormats = [
    "1234567.89",
    "1,234,567.89",
    "1234567,89",
    "1.234.567,89",
    "1234567 89",
    "1 234 567 89"
  ];

  useEffect(() => {
    if (isCurrentView && exportFileFormat === "xlsx") {
      setExportFileFormat("csv");
    }
  }, [isCurrentView, exportFileFormat]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (decimalFormatRef.current && !decimalFormatRef.current.contains(event.target)) {
        setIsDecimalFormatOpen(false);
      }
      if (moduleRef.current && !moduleRef.current.contains(event.target)) {
        setIsModuleOpen(false);
      }
    };
    if (isDecimalFormatOpen || isModuleOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDecimalFormatOpen, isModuleOpen]);

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
      headers = ["Name", "Company Name", "Email", "Work Phone", "Payables (BCY)", "Unused Credits (BCY)"];
      rows = data.map(vendor => [
        vendor.name || vendor.displayName || "",
        vendor.companyName || "",
        vendor.email || "",
        vendor.workPhone || "",
        vendor.payables || 0,
        vendor.unusedCredits || 0
      ]);
    } else {
      headers = [
        "Salutation", "First Name", "Last Name", "Company Name", "Display Name",
        "Email", "Work Phone", "Mobile", "Website", "Vendor Language",
        "Currency", "Payment Terms", "Opening Balance", "Enable Portal",
        "Billing Attention", "Billing Street 1", "Billing Street 2", "Billing City",
        "Billing State", "Billing Zip Code", "Billing Country", "Billing Phone", "Billing Fax",
        "Shipping Attention", "Shipping Street 1", "Shipping Street 2", "Shipping City",
        "Shipping State", "Shipping Zip Code", "Shipping Country", "Shipping Phone", "Shipping Fax",
        "Remarks"
      ];
      rows = data.map(v => [
        v.salutation || "",
        v.firstName || "",
        v.lastName || "",
        v.companyName || "",
        v.displayName || v.name || "",
        v.email || "",
        v.workPhone || "",
        v.mobile || "",
        v.websiteUrl || "",
        v.vendorLanguage || "",
        v.currency || "",
        v.paymentTerms || "",
        v.openingBalance || 0,
        v.enablePortal ? "Yes" : "No",
        (v.billingAddress?.attention) || "",
        (v.billingAddress?.street1) || "",
        (v.billingAddress?.street2) || "",
        (v.billingAddress?.city) || "",
        (v.billingAddress?.state) || "",
        (v.billingAddress?.zipCode) || "",
        (v.billingAddress?.country) || "",
        (v.billingAddress?.phone) || "",
        (v.billingAddress?.fax) || "",
        (v.shippingAddress?.attention) || "",
        (v.shippingAddress?.street1) || "",
        (v.shippingAddress?.street2) || "",
        (v.shippingAddress?.city) || "",
        (v.shippingAddress?.state) || "",
        (v.shippingAddress?.zipCode) || "",
        (v.shippingAddress?.country) || "",
        (v.shippingAddress?.phone) || "",
        (v.shippingAddress?.fax) || "",
        v.remarks || ""
      ]);
    }

    let content = "";
    let mimeType = "";

    if (exportFileFormat === "csv") {
      content = [headers, ...rows].map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
      mimeType = "text/csv;charset=utf-8;";
    } else {
      // For XLS/XLSX (we use TSV as a simple Excel compatible format)
      content = [headers, ...rows].map(row => row.join("\t")).join("\n");
      mimeType = "application/vnd.ms-excel;charset=utf-8;";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${module.toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.${exportFileFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

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
      zIndex: 10000
    }}>
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
          padding: "12px 16px",
          borderBottom: `1px solid ${Z.line}`,
          backgroundColor: "#f9fafb"
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#374151", margin: 0 }}>
            {isCurrentView ? "Export Current View" : "Export Vendors"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "white",
              border: `1px solid ${Z.blue}`,
              borderRadius: "4px",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              color: Z.primary
            }}
          >
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {/* Information Banner */}
          <div style={{
            backgroundColor: Z.bgLight,
            padding: "12px 16px",
            borderRadius: "4px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            border: `1px solid ${Z.bgLight}`
          }}>
            <Info size={18} color={Z.blue} fill={Z.blue} style={{ color: "white", flexShrink: 0 }} />
            <span style={{ fontSize: "14px", color: "#374151", lineHeight: "1.5" }}>
              {isCurrentView
                ? "Only the current view with its visible columns will be exported from Taban Books in CSV or XLS format."
                : "You can export your data from Taban Books in CSV, XLS or XLSX format."
              }
            </span>
          </div>

          {/* Module - Only for Export Vendors */}
          {!isCurrentView && (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: Z.primary, marginBottom: "8px" }}>
                Module*
              </label>
              <div ref={moduleRef} style={{ position: "relative" }}>
                <div
                  onClick={() => setIsModuleOpen(!isModuleOpen)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: `1px solid ${isModuleOpen ? Z.blue : Z.line}`,
                    borderRadius: "4px",
                    fontSize: "14px",
                    backgroundColor: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#374151",
                    boxShadow: isModuleOpen ? "0 0 0 1px #2663eb" : "none"
                  }}
                >
                  <span>{module}</span>
                  {isModuleOpen ? <ChevronUp size={16} color={Z.blue} /> : <ChevronDown size={16} color={Z.textMuted} />}
                </div>

                {isModuleOpen && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    width: "100%",
                    backgroundColor: "white",
                    border: `1px solid ${Z.line}`,
                    borderRadius: "4px",
                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
                    zIndex: 2000,
                    marginTop: "4px",
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: "350px"
                  }}>
                    {/* Search Input */}
                    <div style={{ padding: "8px", borderBottom: `1px solid ${Z.line}` }}>
                      <div style={{ position: "relative" }}>
                        <Search size={14} color={Z.textMuted} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search"
                          value={moduleSearch}
                          onChange={(e) => setModuleSearch(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 10px 6px 32px",
                            border: `1px solid ${Z.line}`,
                            borderRadius: "4px",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                            transition: "border-color 0.2s"
                          }}
                          onFocus={(e) => e.target.style.borderColor = Z.blue}
                          onBlur={(e) => e.target.style.borderColor = Z.line}
                        />
                      </div>
                    </div>

                    {/* Module List */}
                    <div className="custom-scrollbar" style={{ overflowY: "auto", flex: 1 }}>
                      <style>
                        {`
                          .custom-scrollbar::-webkit-scrollbar {
                            width: 6px;
                          }
                          .custom-scrollbar::-webkit-scrollbar-track {
                            background: transparent;
                          }
                          .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: #cbd5e1;
                            border-radius: 10px;
                          }
                          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: #94a3b8;
                          }
                        `}
                      </style>
                      {MODULE_CATEGORIES.map((category) => {
                        const filteredModules = category.modules.filter(m =>
                          m.toLowerCase().includes(moduleSearch.toLowerCase())
                        );

                        if (filteredModules.length === 0) return null;

                        return (
                          <div key={category.name}>
                            <div style={{
                              padding: "8px 12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: Z.textMuted,
                              backgroundColor: "#f9fafb",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px"
                            }}>
                              {category.name}
                            </div>
                            {filteredModules.map((m) => (
                              <div
                                key={m}
                                onClick={() => {
                                  setModule(m);
                                  setIsModuleOpen(false);
                                  setModuleSearch("");
                                }}
                                style={{
                                  padding: "8px 32px",
                                  fontSize: "14px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  backgroundColor: module === m ? Z.blue : "transparent",
                                  color: module === m ? "white" : "#374151"
                                }}
                                onMouseEnter={(e) => {
                                  if (module !== m) e.target.style.backgroundColor = Z.bgLight;
                                }}
                                onMouseLeave={(e) => {
                                  if (module !== m) e.target.style.backgroundColor = "transparent";
                                }}
                              >
                                <span>{m}</span>
                                {module === m && <Check size={14} color="white" />}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {MODULE_CATEGORIES.every(cat => cat.modules.filter(m => m.toLowerCase().includes(moduleSearch.toLowerCase())).length === 0) && (
                        <div style={{ padding: "12px", textAlign: "center", fontSize: "14px", color: Z.textMuted }}>
                          No modules found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Export Data Type - Only for Export Vendors */}
          {!isCurrentView && (
            <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="exportDataType"
                  checked={exportDataType === "vendors"}
                  onChange={() => setExportDataType("vendors")}
                  style={{ accentColor: Z.blue, width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "14px", color: "#374151" }}>Vendors</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="exportDataType"
                  checked={exportDataType === "contact-persons"}
                  onChange={() => setExportDataType("contact-persons")}
                  style={{ accentColor: Z.blue, width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "14px", color: "#374151" }}>Vendor's Contact Persons</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="exportDataType"
                  checked={exportDataType === "addresses"}
                  onChange={() => setExportDataType("addresses")}
                  style={{ accentColor: Z.blue, width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "14px", color: "#374151" }}>Vendor's Addressess</span>
              </label>
              <div style={{ borderBottom: `1px solid ${Z.line}`, margin: "10px 0" }}></div>
            </div>
          )}

          {/* Data Range - Only for Export Vendors */}
          {!isCurrentView && (
            <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="dataRange"
                  checked={dataRange === "all"}
                  onChange={() => setDataRange("all")}
                  style={{ accentColor: Z.blue, width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "14px", color: "#374151" }}>All Vendors</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="dataRange"
                  checked={dataRange === "specific"}
                  onChange={() => setDataRange("specific")}
                  style={{ accentColor: Z.blue, width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "14px", color: "#374151" }}>Specific Period</span>
              </label>
              {dataRange === "specific" && (
                <div style={{ paddingLeft: "26px", display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="date"
                    value={specificPeriod.start}
                    onChange={(e) => setSpecificPeriod({ ...specificPeriod, start: e.target.value })}
                    style={{
                      padding: "6px 10px",
                      border: `1px solid ${Z.line}`,
                      borderRadius: "4px",
                      fontSize: "13px",
                      outline: "none"
                    }}
                  />
                  <span style={{ fontSize: "12px", color: Z.textMuted }}>to</span>
                  <input
                    type="date"
                    value={specificPeriod.end}
                    onChange={(e) => setSpecificPeriod({ ...specificPeriod, end: e.target.value })}
                    style={{
                      padding: "6px 10px",
                      border: `1px solid ${Z.line}`,
                      borderRadius: "4px",
                      fontSize: "13px",
                      outline: "none"
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Decimal Format */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: Z.primary, marginBottom: "8px" }}>
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
                  bottom: "100%",
                  left: 0,
                  width: "100%",
                  backgroundColor: "white",
                  border: `1px solid ${Z.line}`,
                  borderRadius: "4px",
                  boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.1)",
                  zIndex: 2000,
                  marginBottom: "4px"
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
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: Z.primary, marginBottom: "12px" }}>
              Export File Format*
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="exportFormat"
                  checked={exportFileFormat === "csv"}
                  onChange={() => setExportFileFormat("csv")}
                  style={{ accentColor: Z.blue, width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "14px", color: "#374151" }}>CSV (Comma Separated Value)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="exportFormat"
                  checked={exportFileFormat === "xls"}
                  onChange={() => setExportFileFormat("xls")}
                  style={{ accentColor: Z.blue, width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "14px", color: "#374151" }}>XLS (Microsoft Excel 1997-2004 Compatible)</span>
              </label>
              {!isCurrentView && (
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    checked={exportFileFormat === "xlsx"}
                    onChange={() => setExportFileFormat("xlsx")}
                    style={{ accentColor: Z.blue, width: "16px", height: "16px" }}
                  />
                  <span style={{ fontSize: "14px", color: "#374151" }}>XLSX (Microsoft Excel)</span>
                </label>
              )}
            </div>
          </div>

          {/* PII Inclusion */}
          {!isCurrentView && (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={includePII}
                  onChange={(e) => setIncludePII(e.target.checked)}
                  style={{ accentColor: Z.blue, width: "16px", height: "16px" }}
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
          borderTop: `1px solid ${Z.line}`,
          display: "flex",
          gap: "12px"
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


