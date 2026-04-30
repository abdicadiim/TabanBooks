import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { saveBudget, getBudgetById, getAccounts } from "./accountantModel";
import {
  buildLinesFromSelections,
  getPeriods,
  parseFiscalYear,
} from "./budgetUtils";

interface Account {
  accountName?: string;
  name?: string;
  accountCode?: string;
  code?: string;
  accountType?: string;
  type?: string;
  isActive?: boolean;
  _id?: string;
  id?: string;
  parent?: string;
  parentAccountId?: string;
  showInWatchlist?: boolean;
  description?: string;
}

interface Budget {
  name?: string;
  fiscalYearLabel?: string;
  fiscalYear?: string | number;
  budgetPeriod?: string;
  location?: string;
  includeAssetLiabilityEquity?: boolean;
  selectedIncomeAccounts?: string[];
  selectedExpenseAccounts?: string[];
  selectedAssetAccounts?: string[];
  selectedLiabilityAccounts?: string[];
  selectedEquityAccounts?: string[];
  createForReportingTag?: boolean;
  reportingTagName?: string;
  reportingTagOption?: string;
  _id?: string;
  id?: string;
}

function NewBudget() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: "",
    fiscalYear: "Jan 2025 - Dec 2025",
    budgetPeriod: "Monthly",
    location: ""
  });

  const [isFiscalYearOpen, setIsFiscalYearOpen] = useState(false);
  const [isBudgetPeriodOpen, setIsBudgetPeriodOpen] = useState(false);
  const [fiscalYearSearch, setFiscalYearSearch] = useState("");
  const [budgetPeriodSearch, setBudgetPeriodSearch] = useState("");
  const [includeAssetLiabilityEquity, setIncludeAssetLiabilityEquity] = useState(false);
  const [selectedIncomeAccounts, setSelectedIncomeAccounts] = useState<string[]>([]);
  const [selectedExpenseAccounts, setSelectedExpenseAccounts] = useState<string[]>([]);
  const [selectedAssetAccounts, setSelectedAssetAccounts] = useState<string[]>([]);
  const [selectedLiabilityAccounts, setSelectedLiabilityAccounts] = useState<string[]>([]);
  const [selectedEquityAccounts, setSelectedEquityAccounts] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAccountType, setModalAccountType] = useState<string | null>(null);
  const [modalSelectedAccounts, setModalSelectedAccounts] = useState<string[]>([]);
  const [accountSearchTerm, setAccountSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [originalBudget, setOriginalBudget] = useState<Budget | null>(null);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [createForReportingTag, setCreateForReportingTag] = useState(false);
  const [reportingTagName, setReportingTagName] = useState("");
  const [reportingTagOption, setReportingTagOption] = useState("All");

  const fiscalYearRef = useRef<HTMLDivElement>(null);
  const budgetPeriodRef = useRef<HTMLDivElement>(null);

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadBudget = async () => {
      if (isEditMode && id) {
        const budget = await getBudgetById(id);
        if (budget) {
          const fiscalYearLabel =
            budget.fiscalYearLabel ||
            (budget.fiscalYear
              ? `Jan ${budget.fiscalYear} - Dec ${budget.fiscalYear}`
              : "Jan 2025 - Dec 2025");
          setOriginalBudget(budget);
          setFormData({
            name: budget.name || "",
            fiscalYear: fiscalYearLabel,
            budgetPeriod: budget.budgetPeriod || "Monthly",
            location: budget.location || ""
          });
          setIncludeAssetLiabilityEquity(budget.includeAssetLiabilityEquity || false);
          setSelectedIncomeAccounts(budget.selectedIncomeAccounts || []);
          setSelectedExpenseAccounts(budget.selectedExpenseAccounts || []);
          setSelectedAssetAccounts(budget.selectedAssetAccounts || []);
          setSelectedLiabilityAccounts(budget.selectedLiabilityAccounts || []);
          setSelectedEquityAccounts(budget.selectedEquityAccounts || []);
          setCreateForReportingTag(Boolean(budget.createForReportingTag));
          setReportingTagName(budget.reportingTagName || "");
          setReportingTagOption(budget.reportingTagOption || "All");
        }
      }
    };
    loadBudget();
  }, [id, isEditMode]);

  useEffect(() => {
    const fetchAccounts = async () => {
      const response = await getAccounts({ limit: 1000 });
      if (response && response.success) {
        setAllAccounts(response.data);
      }
    };
    fetchAccounts();
  }, []);

  const fiscalYears = [
    "Jan 2023 - Dec 2023",
    "Jan 2024 - Dec 2024",
    "Jan 2025 - Dec 2025",
    "Jan 2026 - Dec 2026",
    "Jan 2027 - Dec 2027"
  ];

  const budgetPeriods = ["Monthly", "Quarterly", "Half-yearly", "Yearly"];

  const getGroupedAccounts = () => {
    const filteredAccounts = allAccounts.filter(acc => {
      const type = (acc.accountType || acc.type || "").toLowerCase();
      const modalTypeLower = (modalAccountType || "").toLowerCase();
      
      if (modalTypeLower === "income") return type.includes("income");
      if (modalTypeLower === "expense") return type.includes("expense") || type.includes("cost of goods sold");
      if (modalTypeLower === "asset") return type.includes("asset") || type.includes("receivable") || type.includes("cash") || type.includes("bank");
      if (modalTypeLower === "liability") return type.includes("liability") || type.includes("payable") || type.includes("credit card");
      if (modalTypeLower === "equity") return type.includes("equity");
      return true;
    });

    const grouped: any = {};
    const modalType = modalAccountType || "Other";
    
    if (modalType === "Income") {
      grouped["Income"] = {};
      filteredAccounts.forEach(acc => {
        const type = acc.accountType || acc.type || "Other Income";
        if (!grouped["Income"][type]) grouped["Income"][type] = [];
        grouped["Income"][type].push(acc);
      });
    } else if (modalType === "Expense") {
      grouped["Expense"] = {};
      filteredAccounts.forEach(acc => {
        const type = acc.accountType || acc.type || "Other Expense";
        if (!grouped["Expense"][type]) grouped["Expense"][type] = [];
        grouped["Expense"][type].push(acc);
      });
    } else if (modalType === "Asset") {
      grouped["Assets"] = {};
      filteredAccounts.forEach(acc => {
        const type = acc.accountType || acc.type || "Other Asset";
        if (!grouped["Assets"][type]) grouped["Assets"][type] = [];
        grouped["Assets"][type].push(acc);
      });
    } else if (modalType === "Liability") {
      grouped["Liabilities"] = {};
      filteredAccounts.forEach(acc => {
        const type = acc.accountType || acc.type || "Other Liability";
        if (!grouped["Liabilities"][type]) grouped["Liabilities"][type] = [];
        grouped["Liabilities"][type].push(acc);
      });
    } else if (modalType === "Equity") {
      grouped["Equity"] = {};
      filteredAccounts.forEach(acc => {
        const type = acc.accountType || acc.type || "Equity";
        if (!grouped["Equity"][type]) grouped["Equity"][type] = [];
        grouped["Equity"][type].push(acc);
      });
    }

    return grouped;
  };

  const toggleCategory = (categoryPath: string) => {
    setExpandedCategories(prev => ({ ...prev, [categoryPath]: !prev[categoryPath] }));
  };

  const handleOpenModal = (type: string) => {
    const typeUpper = type.charAt(0).toUpperCase() + type.slice(1);
    setModalAccountType(typeUpper);
    let currentSelected: string[] = [];
    if (typeUpper === "Income") currentSelected = selectedIncomeAccounts;
    else if (typeUpper === "Expense") currentSelected = selectedExpenseAccounts;
    else if (typeUpper === "Asset") currentSelected = selectedAssetAccounts;
    else if (typeUpper === "Liability") currentSelected = selectedLiabilityAccounts;
    else if (typeUpper === "Equity") currentSelected = selectedEquityAccounts;
    
    setModalSelectedAccounts([...currentSelected]);
    setAccountSearchTerm("");
    setExpandedCategories({ [typeUpper === "Income" ? "Income" : typeUpper === "Expense" ? "Expense" : typeUpper === "Asset" ? "Assets" : typeUpper === "Liability" ? "Liabilities" : "Equity"]: true });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalAccountType(null);
    setModalSelectedAccounts([]);
    setAccountSearchTerm("");
  };

  const handleToggleAccount = (accountName: string) => {
    setModalSelectedAccounts(prev => 
      prev.includes(accountName) ? prev.filter(name => name !== accountName) : [...prev, accountName]
    );
  };

  const handleSelectAll = () => {
    const filtered = getFilteredAccountsForModal();
    const allNames = filtered.map(acc => acc.accountName || acc.name || "").filter(Boolean);
    setModalSelectedAccounts(allNames);
  };

  const getFilteredAccountsForModal = (): any[] => {
    const grouped = getGroupedAccounts();
    const accountsList: any[] = [];
    const extractAccounts = (data: any) => {
      if (Array.isArray(data)) {
        data.forEach(acc => {
          const name = acc.accountName || acc.name || "";
          const code = acc.accountCode || acc.code || "";
          if (accountSearchTerm === "" || name.toLowerCase().includes(accountSearchTerm.toLowerCase()) || code.toLowerCase().includes(accountSearchTerm.toLowerCase())) {
            accountsList.push(acc);
          }
        });
      } else if (typeof data === 'object' && data !== null) {
        Object.keys(data).forEach(key => extractAccounts(data[key]));
      }
    };
    Object.keys(grouped).forEach(key => extractAccounts(grouped[key]));
    return accountsList;
  };

  const handleUpdateAccounts = () => {
    if (modalAccountType === "Income") setSelectedIncomeAccounts([...modalSelectedAccounts]);
    else if (modalAccountType === "Expense") setSelectedExpenseAccounts([...modalSelectedAccounts]);
    else if (modalAccountType === "Asset") setSelectedAssetAccounts([...modalSelectedAccounts]);
    else if (modalAccountType === "Liability") setSelectedLiabilityAccounts([...modalSelectedAccounts]);
    else if (modalAccountType === "Equity") setSelectedEquityAccounts([...modalSelectedAccounts]);
    handleCloseModal();
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fiscalYearRef.current && !fiscalYearRef.current.contains(event.target as Node)) setIsFiscalYearOpen(false);
      if (budgetPeriodRef.current && !budgetPeriodRef.current.contains(event.target as Node)) setIsBudgetPeriodOpen(false);
    }
    if (isFiscalYearOpen || isBudgetPeriodOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFiscalYearOpen, isBudgetPeriodOpen]);

  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors };
    if (!value || value.trim() === "") newErrors[name] = "This field is required";
    else delete newErrors[name];
    setErrors(newErrors);
  };

  const handleBlur = (name: string, value: string) => {
    setTouched({ ...touched, [name]: true });
    validateField(name, value);
  };

  const getFilteredFiscalYears = () => fiscalYears.filter(year => year.toLowerCase().includes(fiscalYearSearch.toLowerCase()));
  const getFilteredBudgetPeriods = () => budgetPeriods.filter(period => period.toLowerCase().includes(budgetPeriodSearch.toLowerCase()));

  return (
    <div style={{
      padding: "32px",
      minHeight: "100vh",
      backgroundColor: "#f9fafb",
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        maxWidth: "1000px",
        margin: "0 auto",
        backgroundColor: "white",
        borderRadius: "20px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "32px",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => navigate("/accountant/budgets")}
              style={{
                backgroundColor: "#f3f4f6",
                border: "none",
                borderRadius: "10px",
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6b7280"
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#111827", margin: 0 }}>
              {isEditMode ? "Edit Budget" : "New Budget"}
            </h1>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: "40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "40px" }}>
            {/* Budget Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Budget Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="text"
                placeholder="E.g. Annual Budget 2025"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  if (touched.name) validateField("name", e.target.value);
                }}
                onBlur={(e) => handleBlur("name", e.target.value)}
                style={{
                  padding: "12px 16px",
                  border: errors.name && touched.name ? "1px solid #ef4444" : "1px solid #e5e7eb",
                  borderRadius: "12px",
                  fontSize: "15px",
                  outline: "none",
                  transition: "all 0.2s"
                }}
              />
              {errors.name && touched.name && <span style={{ fontSize: "12px", color: "#ef4444" }}>{errors.name}</span>}
            </div>

            {/* Fiscal Year */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} ref={fiscalYearRef}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Fiscal Year <span style={{ color: "#ef4444" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => setIsFiscalYearOpen(!isFiscalYearOpen)}
                  style={{
                    padding: "12px 16px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    fontSize: "15px",
                    backgroundColor: "white",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span>{formData.fiscalYear}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isFiscalYearOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </div>
                {isFiscalYearOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    zIndex: 50,
                    maxHeight: "240px",
                    overflowY: "auto"
                  }}>
                    {fiscalYears.map(year => (
                      <div
                        key={year}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, fiscalYear: year }));
                          setIsFiscalYearOpen(false);
                        }}
                        style={{
                          padding: "12px 16px",
                          cursor: "pointer",
                          fontSize: "14px",
                          backgroundColor: formData.fiscalYear === year ? "#f0fdfa" : "transparent",
                          color: formData.fiscalYear === year ? "#156372" : "#374151"
                        }}
                      >
                        {year}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "40px" }}>
            {/* Budget Period */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} ref={budgetPeriodRef}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Budget Period <span style={{ color: "#ef4444" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => setIsBudgetPeriodOpen(!isBudgetPeriodOpen)}
                  style={{
                    padding: "12px 16px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    fontSize: "15px",
                    backgroundColor: "white",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span>{formData.budgetPeriod}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isBudgetPeriodOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </div>
                {isBudgetPeriodOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    zIndex: 50
                  }}>
                    {budgetPeriods.map(period => (
                      <div
                        key={period}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, budgetPeriod: period }));
                          setIsBudgetPeriodOpen(false);
                        }}
                        style={{
                          padding: "12px 16px",
                          cursor: "pointer",
                          fontSize: "14px",
                          backgroundColor: formData.budgetPeriod === period ? "#f0fdfa" : "transparent",
                          color: formData.budgetPeriod === period ? "#156372" : "#374151"
                        }}
                      >
                        {period}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reporting Tag Option */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={createForReportingTag}
                  onChange={(e) => setCreateForReportingTag(e.target.checked)}
                  style={{ width: "16px", height: "16px" }}
                />
                Create for a reporting tag
              </label>
              {createForReportingTag && (
                <div style={{ display: "flex", gap: "12px" }}>
                  <input
                    type="text"
                    placeholder="Tag Name"
                    value={reportingTagName}
                    onChange={(e) => setReportingTagName(e.target.value)}
                    style={{ flex: 1, padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px" }}
                  />
                  <select
                    value={reportingTagOption}
                    onChange={(e) => setReportingTagOption(e.target.value)}
                    style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", backgroundColor: "white" }}
                  >
                    <option value="All">All</option>
                    <option value="Contains">Contains</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "24px" }}>
              Income and Expense Accounts
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
              {/* Income Accounts */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Income Accounts</label>
                <div style={{ padding: "16px", border: "1px solid #e5e7eb", borderRadius: "16px", minHeight: "100px", display: "flex", flexDirection: "column", gap: "12px" }}>
                   <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                     {selectedIncomeAccounts.map(acc => (
                       <span key={acc} style={{ padding: "4px 10px", backgroundColor: "#f3f4f6", borderRadius: "6px", fontSize: "13px", color: "#374151" }}>{acc}</span>
                     ))}
                   </div>
                   <button
                    onClick={() => handleOpenModal("Income")}
                    style={{ alignSelf: "flex-start", padding: "6px 12px", border: "1px dashed #3b82f6", borderRadius: "8px", backgroundColor: "transparent", color: "#3b82f6", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                   >
                     Add/Remove Accounts
                   </button>
                </div>
              </div>

              {/* Expense Accounts */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Expense Accounts</label>
                <div style={{ padding: "16px", border: "1px solid #e5e7eb", borderRadius: "16px", minHeight: "100px", display: "flex", flexDirection: "column", gap: "12px" }}>
                   <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                     {selectedExpenseAccounts.map(acc => (
                       <span key={acc} style={{ padding: "4px 10px", backgroundColor: "#f3f4f6", borderRadius: "6px", fontSize: "13px", color: "#374151" }}>{acc}</span>
                     ))}
                   </div>
                   <button
                    onClick={() => handleOpenModal("Expense")}
                    style={{ alignSelf: "flex-start", padding: "6px 12px", border: "1px dashed #3b82f6", borderRadius: "8px", backgroundColor: "transparent", color: "#3b82f6", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                   >
                     Add/Remove Accounts
                   </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "40px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "24px" }}>
              <input
                type="checkbox"
                checked={includeAssetLiabilityEquity}
                onChange={(e) => setIncludeAssetLiabilityEquity(e.target.checked)}
                style={{ width: "18px", height: "18px" }}
              />
              <span style={{ fontSize: "15px", color: "#111827", fontWeight: "500" }}>Include Asset, Liability, and Equity Accounts</span>
            </label>

            {includeAssetLiabilityEquity && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
                {/* Asset Accounts */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Asset Accounts</label>
                  <div style={{ padding: "12px", border: "1px solid #e5e7eb", borderRadius: "12px", minHeight: "80px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {selectedAssetAccounts.slice(0, 3).map(acc => <span key={acc} style={{ fontSize: "12px", color: "#6b7280" }}>• {acc}</span>)}
                      {selectedAssetAccounts.length > 3 && <span style={{ fontSize: "12px", color: "#3b82f6" }}>+{selectedAssetAccounts.length - 3} more</span>}
                    </div>
                    <button onClick={() => handleOpenModal("Asset")} style={{ alignSelf: "flex-start", fontSize: "12px", color: "#3b82f6", border: "none", background: "none", fontWeight: "600", cursor: "pointer", padding: 0 }}>Configure</button>
                  </div>
                </div>
                {/* Liability Accounts */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Liability Accounts</label>
                  <div style={{ padding: "12px", border: "1px solid #e5e7eb", borderRadius: "12px", minHeight: "80px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {selectedLiabilityAccounts.slice(0, 3).map(acc => <span key={acc} style={{ fontSize: "12px", color: "#6b7280" }}>• {acc}</span>)}
                      {selectedLiabilityAccounts.length > 3 && <span style={{ fontSize: "12px", color: "#3b82f6" }}>+{selectedLiabilityAccounts.length - 3} more</span>}
                    </div>
                    <button onClick={() => handleOpenModal("Liability")} style={{ alignSelf: "flex-start", fontSize: "12px", color: "#3b82f6", border: "none", background: "none", fontWeight: "600", cursor: "pointer", padding: 0 }}>Configure</button>
                  </div>
                </div>
                {/* Equity Accounts */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Equity Accounts</label>
                  <div style={{ padding: "12px", border: "1px solid #e5e7eb", borderRadius: "12px", minHeight: "80px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {selectedEquityAccounts.slice(0, 3).map(acc => <span key={acc} style={{ fontSize: "12px", color: "#6b7280" }}>• {acc}</span>)}
                      {selectedEquityAccounts.length > 3 && <span style={{ fontSize: "12px", color: "#3b82f6" }}>+{selectedEquityAccounts.length - 3} more</span>}
                    </div>
                    <button onClick={() => handleOpenModal("Equity")} style={{ alignSelf: "flex-start", fontSize: "12px", color: "#3b82f6", border: "none", background: "none", fontWeight: "600", cursor: "pointer", padding: 0 }}>Configure</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: "32px 40px",
          backgroundColor: "#f9fafb",
          borderTop: "1px solid #f3f4f6",
          display: "flex",
          justifyContent: "flex-end",
          gap: "16px"
        }}>
          <button
            onClick={() => navigate("/accountant/budgets")}
            style={{
              padding: "12px 24px",
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: "600",
              color: "#4b5563",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (!formData.name) {
                setErrors({ name: "Budget name is required" });
                setTouched({ name: true });
                return;
              }
              const { startDate, endDate, startYear } = parseFiscalYear(formData.fiscalYear);
              const periods = getPeriods(formData.budgetPeriod as any, formData.fiscalYear);
              const generatedLines = buildLinesFromSelections({
                periods,
                income: selectedIncomeAccounts,
                expense: selectedExpenseAccounts,
                asset: selectedAssetAccounts,
                liability: selectedLiabilityAccounts,
                equity: selectedEquityAccounts,
              });

              const budgetData = {
                ...(originalBudget || {}),
                name: formData.name,
                fiscalYear: startYear,
                fiscalYearLabel: formData.fiscalYear,
                budgetPeriod: formData.budgetPeriod,
                includeAssetLiabilityEquity: includeAssetLiabilityEquity,
                selectedIncomeAccounts,
                selectedExpenseAccounts,
                selectedAssetAccounts,
                selectedLiabilityAccounts,
                selectedEquityAccounts,
                createForReportingTag,
                reportingTagName,
                reportingTagOption,
                startDate,
                endDate,
                lines: (originalBudget as any)?.lines?.length > 0 ? (originalBudget as any).lines : generatedLines,
              };

              const success = await saveBudget(budgetData);
              if (success) navigate("/accountant/budgets");
              else toast.error("Failed to save budget.");
            }}
            style={{
              padding: "12px 32px",
              background: formData.name ? "linear-gradient(135deg, #156372 0%, #0d4d59 100%)" : "#d1d5db",
              border: "none",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: "600",
              color: "white",
              cursor: formData.name ? "pointer" : "not-allowed",
              boxShadow: formData.name ? "0 4px 12px rgba(21, 99, 114, 0.2)" : "none",
              transition: "all 0.3s"
            }}
          >
            {isEditMode ? "Update Budget" : "Create Budget"}
          </button>
        </div>
      </div>

      {/* Account Selection Modal */}
      {isModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "white",
            width: "100%",
            maxWidth: "700px",
            borderRadius: "20px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "85vh",
            overflow: "hidden"
          }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: 0 }}>Configure {modalAccountType} Accounts</h2>
              <button onClick={handleCloseModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div style={{ padding: "20px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ position: "relative" }}>
                <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} size={18} />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={accountSearchTerm}
                  onChange={(e) => setAccountSearchTerm(e.target.value)}
                  style={{ width: "100%", padding: "12px 12px 12px 40px", border: "1px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none" }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px" }}>
               {(() => {
                 const grouped = getGroupedAccounts();
                 return Object.keys(grouped).map(cat => (
                   <div key={cat} style={{ marginBottom: "16px" }}>
                     <div 
                      onClick={() => toggleCategory(cat)}
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", cursor: "pointer", borderRadius: "8px", backgroundColor: "#f8fafc" }}
                     >
                        <ChevronDown size={16} style={{ transform: expandedCategories[cat] ? "none" : "rotate(-90deg)", transition: "transform 0.2s" }} />
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>{cat}</span>
                     </div>
                     {expandedCategories[cat] && (
                       <div style={{ marginTop: "8px" }}>
                         {Object.keys(grouped[cat]).map(subCat => (
                           <div key={subCat} style={{ marginLeft: "12px", marginBottom: "8px" }}>
                             <div style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", padding: "4px 8px" }}>{subCat}</div>
                             {grouped[cat][subCat].filter((acc: any) => {
                               const name = acc.accountName || acc.name || "";
                               return accountSearchTerm === "" || name.toLowerCase().includes(accountSearchTerm.toLowerCase());
                             }).map((acc: any) => {
                               const name = acc.accountName || acc.name || "";
                               const isSelected = modalSelectedAccounts.includes(name);
                               return (
                                 <div 
                                  key={name}
                                  onClick={() => handleToggleAccount(name)}
                                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", cursor: "pointer", borderRadius: "8px", backgroundColor: isSelected ? "#f0fdfa" : "transparent" }}
                                 >
                                   <div style={{ width: "20px", height: "20px", borderRadius: "6px", border: isSelected ? "none" : "2px solid #d1d5db", backgroundColor: isSelected ? "#156372" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                     {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                   </div>
                                   <span style={{ fontSize: "14px", color: isSelected ? "#156372" : "#374151", fontWeight: isSelected ? "600" : "400" }}>{name}</span>
                                 </div>
                               );
                             })}
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 ));
               })()}
            </div>

            <div style={{ padding: "24px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between" }}>
              <button onClick={handleSelectAll} style={{ padding: "10px 16px", border: "1px solid #e5e7eb", borderRadius: "10px", backgroundColor: "white", fontSize: "14px", fontWeight: "600", color: "#374151", cursor: "pointer" }}>Select All</button>
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={handleCloseModal} style={{ padding: "10px 20px", border: "none", background: "none", fontSize: "14px", fontWeight: "600", color: "#6b7280", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleUpdateAccounts} style={{ padding: "10px 24px", backgroundColor: "#156372", color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Update Selection</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ChevronDown = ({ size, style }: { size: number, style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M6 9l6 6 6-6"></path>
  </svg>
);

const Search = ({ size, style, className }: { size: number, style?: React.CSSProperties, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

export default NewBudget;
