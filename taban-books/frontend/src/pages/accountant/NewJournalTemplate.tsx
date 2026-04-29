import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { saveJournalTemplate } from "./accountantModel";

const currencies = [
  { code: "AED", name: "UAE Dirham" },
  { code: "AMD", name: "Armenian Dram" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "BND", name: "Brunei Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CNY", name: "Yuan Renminbi" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "Pound Sterling" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "USD", name: "Kenyan Shilling" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "USD", name: "United States Dollar" },
  { code: "ZAR", name: "South African Rand" }
];

function NewJournalTemplate() {
  const navigate = useNavigate();
  const location = useLocation();
  const templateData = location.state?.templateData || location.state?.journalData;
  const isEditMode = Boolean(templateData?._id || templateData?.id);
  
  const [formData, setFormData] = useState({
    templateName: templateData?.templateName || templateData?.name || "",
    referenceNumber: templateData?.referenceNumber || "",
    notes: templateData?.notes || templateData?.description || "",
    reportingMethod: templateData?.reportingMethod || "accrual-and-cash",
    currency: templateData?.currency || "USD"
  });

  const [enterAmount, setEnterAmount] = useState(Boolean(templateData?.enterAmount));
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const currencyDropdownRef = useRef(null);

  const [openAccountDropdown, setOpenAccountDropdown] = useState(null);
  const [accountSearch, setAccountSearch] = useState({});
  const accountRefs = useRef({});

  const [openContactDropdown, setOpenContactDropdown] = useState(null);
  const [contactSearch, setContactSearch] = useState({});
  const contactRefs = useRef({});

  const [openTypeDropdown, setOpenTypeDropdown] = useState(null);
  const typeRefs = useRef({});

  const contacts = ["Contact 1", "Contact 2", "Contact 3"];
  const transactionTypes = ["Debit", "Credit"];

  const accounts = [
    { category: "Other Current Asset", items: ["Advance Tax", "Employee Advance", "Prepaid Expenses"] },
    { category: "Cash", items: ["Cash", "Petty Cash", "Undeposited Funds"] },
    { category: "Accounts Receivable", items: ["Accounts Receivable"] },
    { category: "Fixed Asset", items: ["Furniture and Equipment"] },
    { category: "Other Current Liability", items: ["Employee Reimbursements", "Opening Balance Adjustments", "Tax Payable", "Unearned Revenue"] },
    { category: "Accounts Payable", items: ["Accounts Payable"] },
    { category: "Equity", items: ["Drawings", "Opening Balance Offset", "Owner's Equity", "Retained Earnings"] },
    { category: "Income", items: ["Discount", "General Income", "Interest Income", "Late Fee Income", "Other Charges", "Sales"] },
    { category: "Expense", items: ["Advertising And Marketing", "Automobile Expense", "Bad Debt", "Bank Fees and Charges", "Consultant Expense", "Credit Card Charges", "Depreciation Expense", "IT and Internet Expenses", "Janitorial Expense", "Lodging", "Meals and Entertainment", "Office Supplies", "Other Expenses", "Postage", "Printing and Stationery", "Purchase Discounts", "Rent Expense", "Repairs and Maintenance", "Salaries and Employee Wages", "Shipping Charge", "Telephone Expense", "Travel Expense"] },
    { category: "Cost Of Goods Sold", items: ["Cost Of Goods Sold", "Uncategorized"] },
    { category: "Other", items: ["Exchange Gain or Loss"] }
  ];

  const [templateEntries, setTemplateEntries] = useState(() => {
    const initialEntries = templateData?.lines || templateData?.entries || [];
    if (initialEntries.length > 0) {
      return initialEntries.map((entry, index) => ({
        id: index + 1,
        account: entry.accountName || entry.account || "",
        description: entry.description || "",
        contact: entry.contact || "",
        type: entry.type || (Number(entry.debit || 0) > 0 ? "Debit" : Number(entry.credit || 0) > 0 ? "Credit" : ""),
        debits: entry.debits ? String(entry.debits) : (entry.debit !== undefined ? String(entry.debit) : ""),
        credits: entry.credits ? String(entry.credits) : (entry.credit !== undefined ? String(entry.credit) : "")
      }));
    }
    return [
      {
        id: 1,
        account: "",
        description: "",
        contact: "",
        type: "",
        debits: "",
        credits: ""
      },
      {
        id: 2,
        account: "",
        description: "",
        contact: "",
        type: "",
        debits: "",
        credits: ""
      }
    ];
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
        setIsCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCurrencySelect = (currencyCode) => {
    setFormData(prev => ({ ...prev, currency: currencyCode }));
    setIsCurrencyDropdownOpen(false);
  };

  const filteredCurrencies = currencies.filter(currency =>
    currency.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
    currency.name.toLowerCase().includes(currencySearch.toLowerCase())
  );

  const selectedCurrency = currencies.find(c => c.code === formData.currency);

  const handleEntryChange = (id, field, value) => {
    setTemplateEntries(prev =>
      prev.map(entry =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const addNewRow = () => {
    const newId = Math.max(...templateEntries.map(e => e.id), 0) + 1;
    setTemplateEntries(prev => [
      ...prev,
      {
        id: newId,
        account: "",
        description: "",
        contact: "",
        type: "",
        debits: "",
        credits: ""
      }
    ]);
  };

  const deleteRow = (id) => {
    if (templateEntries.length > 1) {
      setTemplateEntries(prev => prev.filter(entry => entry.id !== id));
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "white", width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 32px", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, backgroundColor: "white", zIndex: 100 }}>
        <h1 style={{ fontSize: "24px", fontWeight: "600", margin: 0, color: "#111827" }}>{isEditMode ? "Edit Template" : "New Template"}</h1>
        <button onClick={() => navigate("/accountant/manual-journals/templates")} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" }}>
          <X size={20} />
        </button>
      </div>

      {/* Form Content */}
      <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Template Name */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
          <label style={{ fontSize: "14px", fontWeight: "500", color: "#ef4444" }}>
            Template Name<span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input type="text" name="templateName" value={formData.templateName} onChange={handleInputChange} placeholder="Enter template name" style={{ maxWidth: "400px", padding: "14px 16px", border: "2px solid #e5e7eb", borderRadius: "12px", fontSize: "15px", outline: "none" }} />
        </div>

        {/* Reference# */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
          <label style={{ fontSize: "14px", fontWeight: "500", color: "#111827" }}>Reference#</label>
          <input type="text" name="referenceNumber" value={formData.referenceNumber} onChange={handleInputChange} placeholder="Enter reference number" style={{ maxWidth: "400px", padding: "14px 16px", border: "2px solid #e5e7eb", borderRadius: "12px", fontSize: "15px", outline: "none" }} />
        </div>

        {/* Notes */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
          <label style={{ fontSize: "14px", fontWeight: "500", color: "#ef4444" }}>
            Notes<span style={{ color: "#ef4444" }}>*</span>
          </label>
          <textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Max. 500 characters" maxLength={500} rows={3} style={{ maxWidth: "800px", width: "100%", padding: "14px 16px", border: "2px solid #e5e7eb", borderRadius: "12px", fontSize: "15px", outline: "none", resize: "vertical" }} />
        </div>

        {/* Reporting Method */}
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "20px" }}>
          <label style={{ width: "150px", fontSize: "13px", fontWeight: "500", color: "#111827", paddingTop: "8px" }}>Reporting Method</label>
          <div style={{ display: "flex", gap: "20px" }}>
            {["Accrual and Cash", "Accrual Only", "Cash Only"].map(method => (
              <label key={method} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                <input type="radio" name="reportingMethod" value={method.toLowerCase().replace(/ /g, "-")} checked={formData.reportingMethod === method.toLowerCase().replace(/ /g, "-")} onChange={handleInputChange} style={{ margin: 0 }} />
                {method}
              </label>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "32px", position: "relative" }} ref={currencyDropdownRef}>
          <label style={{ fontSize: "14px", fontWeight: "500", color: "#111827" }}>Currency</label>
          <div style={{ maxWidth: "400px", position: "relative" }}>
            <div onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)} style={{ padding: "14px 16px", border: "1px solid #e5e7eb", borderRadius: "12px", fontSize: "15px", backgroundColor: "white", cursor: "pointer", display: "flex", alignItems: "center", justifySpaceBetween: "space-between", color: "#111827" }}>
              <span>{selectedCurrency ? `${selectedCurrency.code}- ${selectedCurrency.name}` : "Select Currency"}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: "auto", transform: isCurrencyDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {isCurrencyDropdownOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", zIndex: 1000, marginTop: "4px", maxHeight: "300px", overflowY: "auto" }}>
                {filteredCurrencies.map(currency => (
                  <div key={currency.code} onClick={() => handleCurrencySelect(currency.code)} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "13px", backgroundColor: formData.currency === currency.code ? "#eff6ff" : "transparent" }}>
                    {currency.code}- {currency.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Entry Table */}
        <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "12px", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)", marginBottom: "32px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
              <tr>
                <th style={{ padding: "14px 8px", width: "40px" }}></th>
                <th style={{ padding: "14px 12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Account</th>
                <th style={{ padding: "14px 12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Description</th>
                <th style={{ padding: "14px 12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Contact (Customer or Vendor)</th>
                {enterAmount ? (
                  <>
                    <th style={{ padding: "14px 12px", textAlign: "right", fontWeight: "600", color: "#374151", width: "120px" }}>Debits</th>
                    <th style={{ padding: "14px 12px", textAlign: "right", fontWeight: "600", color: "#374151", width: "120px" }}>Credits</th>
                  </>
                ) : (
                  <th style={{ padding: "14px 12px", textAlign: "left", fontWeight: "600", color: "#374151", width: "200px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      Type
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "normal", color: "#6b7280" }}>
                        <input type="checkbox" checked={enterAmount} onChange={(e) => setEnterAmount(e.target.checked)} style={{ width: "14px", height: "14px" }} />
                        Enter an amount
                      </label>
                    </div>
                  </th>
                )}
                <th style={{ padding: "14px 8px", width: "40px" }}></th>
              </tr>
            </thead>
            <tbody>
              {templateEntries.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 4px", textAlign: "center" }}>
                    <div style={{ color: "#9ca3af", cursor: "grab" }}>::</div>
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <div style={{ position: "relative" }}>
                      <div onClick={() => setOpenAccountDropdown(openAccountDropdown === entry.id ? null : entry.id)} style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "white", cursor: "pointer", color: entry.account ? "#111827" : "#9ca3af" }}>
                        {entry.account || "Select an account"}
                      </div>
                      {openAccountDropdown === entry.id && (
                        <div style={{ position: "fixed", width: "300px", backgroundColor: "white", border: "1px solid #d1d5db", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", zIndex: 9999, maxHeight: "300px", overflowY: "auto" }}>
                          {accounts.map(cat => (
                            <div key={cat.category}>
                              <div style={{ padding: "8px 12px", background: "#f9fafb", fontSize: "11px", fontWeight: "700", color: "#4b5563" }}>{cat.category}</div>
                              {cat.items.map(item => (
                                <div key={item} onClick={() => { handleEntryChange(entry.id, "account", item); setOpenAccountDropdown(null); }} style={{ padding: "8px 12px 8px 24px", cursor: "pointer", fontSize: "13px" }}>{item}</div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <input type="text" value={entry.description} onChange={(e) => handleEntryChange(entry.id, "description", e.target.value)} placeholder="Description" style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", outline: "none" }} />
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <div onClick={() => setOpenContactDropdown(openContactDropdown === entry.id ? null : entry.id)} style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "white", cursor: "pointer", color: entry.contact ? "#111827" : "#9ca3af" }}>
                      {entry.contact || "Select Contact"}
                    </div>
                  </td>
                  {enterAmount ? (
                    <>
                      <td style={{ padding: "8px 12px" }}>
                        <input type="number" value={entry.debits} onChange={(e) => handleEntryChange(entry.id, "debits", e.target.value)} placeholder="0.00" style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", textAlign: "right" }} />
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <input type="number" value={entry.credits} onChange={(e) => handleEntryChange(entry.id, "credits", e.target.value)} placeholder="0.00" style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", textAlign: "right" }} />
                      </td>
                    </>
                  ) : (
                    <td style={{ padding: "8px 12px" }}>
                      <div onClick={() => setOpenTypeDropdown(openTypeDropdown === entry.id ? null : entry.id)} style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "white", cursor: "pointer", color: entry.type ? "#111827" : "#9ca3af" }}>
                        {entry.type || "Select Type"}
                      </div>
                    </td>
                  )}
                  <td style={{ padding: "8px 4px", textAlign: "center" }}>
                    <button onClick={() => deleteRow(entry.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Row Button */}
        <button onClick={addNewRow} style={{ padding: "8px 16px", background: "#f0f7ff", border: "1px solid #e0f2fe", borderRadius: "8px", color: "#156372", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#156372", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>+</div>
          Add New Row
        </button>

        {/* Totals Section */}
        {enterAmount && (
          <div style={{ marginTop: "32px", padding: "20px", background: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb", maxWidth: "400px", marginLeft: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span>Sub Total</span>
              <div style={{ display: "flex", gap: "20px" }}>
                <span>{templateEntries.reduce((sum, e) => sum + (parseFloat(e.debits) || 0), 0).toFixed(2)}</span>
                <span>{templateEntries.reduce((sum, e) => sum + (parseFloat(e.credits) || 0), 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", padding: "24px 32px", borderTop: "1px solid #e5e7eb", backgroundColor: "#f9fafb", position: "sticky", bottom: 0 }}>
        <button onClick={() => navigate("/accountant/manual-journals/templates")} style={{ padding: "12px 24px", background: "white", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
        <button onClick={async () => {
          if (!formData.templateName.trim()) return toast.error("Template name is required");
          if (!formData.notes.trim()) return toast.error("Notes are required");

          const lines = templateEntries
            .filter((entry) => entry.account)
            .map((entry) => {
              const debit = Number(entry.debits || 0);
              const credit = Number(entry.credits || 0);
              return {
                account: entry.account,
                accountName: entry.account,
                description: entry.description || "",
                contact: entry.contact || "",
                type: entry.type ? String(entry.type).toLowerCase() : undefined,
                debit: enterAmount ? debit : 0,
                credit: enterAmount ? credit : 0
              };
            });

          if (lines.length === 0) {
            toast.error("Please add at least one account line.");
            return;
          }

          const payload: any = {
            ...(isEditMode ? { _id: templateData?._id || templateData?.id } : {}),
            templateName: formData.templateName.trim(),
            referenceNumber: formData.referenceNumber.trim(),
            notes: formData.notes.trim(),
            description: formData.notes.trim(),
            reportingMethod: formData.reportingMethod,
            currency: formData.currency,
            enterAmount,
            lines
          };

          const success = await saveJournalTemplate(payload);
          if (!success) {
            toast.error("Failed to save template.");
            return;
          }

          navigate("/accountant/manual-journals/templates");
        }} style={{ padding: "12px 32px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>{isEditMode ? "Update" : "Save"}</button>
      </div>
    </div>
  );
}

export default NewJournalTemplate;
