import React, { useState, useRef, useEffect } from "react";
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
  const [modalAccountType, setModalAccountType] = useState<string | null>(null); // "income", "expense", "asset", "liability", "equity"
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

  // Load budget data if editing
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

  // Load accounts from backend
  useEffect(() => {
    const fetchAccounts = async () => {
      const response = await getAccounts({ limit: 1000 }); // Get all for selection
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

  const accounts = allAccounts;
  const incomeAccounts = accounts.filter(acc => acc.accountType === "income");
  const expenseAccounts = accounts.filter(acc => acc.accountType === "expense");

  // Group accounts by type for modal display with hierarchical structure
  const getGroupedAccounts = () => {
    // Filter accounts based on modalAccountType
    const filteredAccounts = allAccounts.filter(acc => {
      const type = (acc.accountType || acc.type || "").toLowerCase();
      const modalTypeLower = (modalAccountType || "").toLowerCase();
      
      if (modalTypeLower === "income") {
        return type.includes("income");
      } else if (modalTypeLower === "expense") {
        return type.includes("expense") || type.includes("cost of goods sold");
      } else if (modalTypeLower === "asset") {
        return type.includes("asset") || type.includes("receivable") || type.includes("cash") || type.includes("bank");
      } else if (modalTypeLower === "liability") {
        return type.includes("liability") || type.includes("payable") || type.includes("credit card");
      } else if (modalTypeLower === "equity") {
        return type.includes("equity");
      }
      return true;
    });

    // Grouping logic
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
    } else {
      filteredAccounts.forEach(acc => {
        const type = acc.accountType || acc.type || "Other";
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(acc);
      });
    }

    return grouped;
  };

  const toggleCategory = (categoryPath: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryPath]: !prev[categoryPath]
    }));
  };

  const handleOpenModal = (type: string) => {
    setModalAccountType(type);
    let currentSelected: string[] = [];
    if (type === "Income") {
      currentSelected = selectedIncomeAccounts;
    } else if (type === "Expense") {
      currentSelected = selectedExpenseAccounts;
    } else if (type === "Asset") {
      currentSelected = selectedAssetAccounts;
    } else if (type === "Liability") {
      currentSelected = selectedLiabilityAccounts;
    } else if (type === "Equity") {
      currentSelected = selectedEquityAccounts;
    }
    setModalSelectedAccounts([...currentSelected]);
    setAccountSearchTerm("");
    // Initialize all categories as expanded
    if (type === "Income") {
      setExpandedCategories({
        "Income": true,
        "Income:Income": true,
        "Income:Other Income": true
      });
    } else if (type === "Expense") {
      setExpandedCategories({
        "Expense": true,
        "Expense:Cost Of Goods Sold": true
      });
    } else if (type === "Asset") {
      setExpandedCategories({
        "Assets": true,
        "Assets:Current Assets": true,
        "Assets:Current Assets:Accounts Receivable": true,
        "Assets:Current Assets:Other current assets": true,
        "Assets:Current Assets:Cash and Cash Equivalent": true,
        "Assets:Current Assets:Cash and Cash Equivalent:Cash": true,
        "Assets:Current Assets:Cash and Cash Equivalent:Bank": true,
        "Assets:Other Assets": true,
        "Assets:Fixed Assets": true
      });
    } else if (type === "Liability") {
      setExpandedCategories({
        "Liabilities": true,
        "Liabilities:Current Liabilities": true,
        "Liabilities:Long Term Liabilities": true,
        "Liabilities:Other Liabilities": true
      });
    } else if (type === "Equity") {
      setExpandedCategories({
        "Equities": true,
        "Equities:Equities": true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalAccountType(null);
    setModalSelectedAccounts([]);
    setAccountSearchTerm("");
  };

  const handleToggleAccount = (accountName: string) => {
    setModalSelectedAccounts(prev => {
      if (prev.includes(accountName)) {
        return prev.filter(name => name !== accountName);
      } else {
        return [...prev, accountName];
      }
    });
  };

  const handleSelectAll = () => {
    const filtered = getFilteredAccounts();
    const allNames = filtered.map(acc => acc.accountName || acc.name || "").filter(Boolean);
    setModalSelectedAccounts(allNames);
  };

  const getFilteredAccounts = (): any[] => {
    const grouped = getGroupedAccounts();
    const accountsList: any[] = [];

    const extractAccounts = (data: any) => {
      if (Array.isArray(data)) {
        data.forEach(acc => {
          const name = acc.accountName || acc.name || "";
          const code = acc.accountCode || acc.code || "";
          if (accountSearchTerm === "" ||
            name.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
            code.toLowerCase().includes(accountSearchTerm.toLowerCase())) {
            accountsList.push(acc);
          }
        });
      } else if (typeof data === 'object' && data !== null) {
        Object.keys(data).forEach(key => {
          extractAccounts(data[key]);
        });
      }
    };

    Object.keys(grouped).forEach(key => {
      extractAccounts(grouped[key]);
    });

    return accountsList;
  };

  const handleUpdateAccounts = () => {
    if (modalAccountType === "Income") {
      setSelectedIncomeAccounts([...modalSelectedAccounts]);
    } else if (modalAccountType === "Expense") {
      setSelectedExpenseAccounts([...modalSelectedAccounts]);
    } else if (modalAccountType === "Asset") {
      setSelectedAssetAccounts([...modalSelectedAccounts]);
    } else if (modalAccountType === "Liability") {
      setSelectedLiabilityAccounts([...modalSelectedAccounts]);
    } else if (modalAccountType === "Equity") {
      setSelectedEquityAccounts([...modalSelectedAccounts]);
    }
    handleCloseModal();
  };


  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fiscalYearRef.current && !fiscalYearRef.current.contains(event.target as Node)) {
        setIsFiscalYearOpen(false);
      }
      if (budgetPeriodRef.current && !budgetPeriodRef.current.contains(event.target as Node)) {
        setIsBudgetPeriodOpen(false);
      }
    }

    if (isFiscalYearOpen || isBudgetPeriodOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFiscalYearOpen, isBudgetPeriodOpen]);

  const getFilteredFiscalYears = () => {
    const searchTerm = fiscalYearSearch.toLowerCase();
    return fiscalYears.filter(year => year.toLowerCase().includes(searchTerm));
  };

  const getFilteredBudgetPeriods = () => {
    const searchTerm = budgetPeriodSearch.toLowerCase();
    return budgetPeriods.filter(period => period.toLowerCase().includes(searchTerm));
  };

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors };
    if (!value || value.trim() === "") {
      newErrors[name] = "This field is required";
    } else {
      delete newErrors[name];
    }
    setErrors(newErrors);
  };

  const handleBlur = (name: string, value: string) => {
    setTouched({ ...touched, [name]: true });
    validateField(name, value);
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "white",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      padding: "0"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "1000px",
        display: "flex",
        flexDirection: "column",
        position: "relative"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 32px",
          borderBottom: "1px solid #f3f4f6"
        }}>
          <h1 style={{
            fontSize: "24px",
            fontWeight: "500",
            color: "#111827",
            margin: 0
          }}>
            New Budget
          </h1>

          <button
            onClick={() => navigate("/accountant/budgets")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#fee2e2";
              e.currentTarget.style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#9ca3af";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <div style={{
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "24px"
        }}>
          
          {/* Name Field */}
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ width: "140px", paddingTop: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: "500", color: "#e11d48" }}>
                Name*
              </label>
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  if (touched.name) validateField("name", e.target.value);
                }}
                onBlur={(e) => handleBlur("name", e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  padding: "8px 12px",
                  border: errors.name && touched.name ? "1px solid #ef4444" : "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "14px",
                  outline: "none"
                }}
              />
              <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#156372" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
                <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: "13px", color: "#156372", textDecoration: "none" }}>
                  Create this budget for a specific reporting tag
                </a>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </div>
            </div>
          </div>

          {/* Fiscal Year Field */}
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ width: "140px", paddingTop: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: "500", color: "#e11d48" }}>
                Fiscal Year*
              </label>
            </div>
            <div style={{ flex: 1, position: "relative" }} ref={fiscalYearRef}>
              <div
                onClick={() => setIsFiscalYearOpen(!isFiscalYearOpen)}
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "14px",
                  backgroundColor: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <span>{formData.fiscalYear}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: isFiscalYearOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {isFiscalYearOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  width: "100%",
                  maxWidth: "400px",
                  marginTop: "4px",
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  zIndex: 100,
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
                        padding: "10px 14px",
                        cursor: "pointer",
                        fontSize: "14px",
                        backgroundColor: formData.fiscalYear === year ? "#f0fdfa" : "transparent",
                        color: formData.fiscalYear === year ? "#156372" : "#374151"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = formData.fiscalYear === year ? "#f0fdfa" : "transparent"}
                    >
                      {year}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Budget Period Field */}
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ width: "140px", paddingTop: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: "500", color: "#e11d48" }}>
                Budget Period*
              </label>
            </div>
            <div style={{ flex: 1, position: "relative" }} ref={budgetPeriodRef}>
              <div
                onClick={() => setIsBudgetPeriodOpen(!isBudgetPeriodOpen)}
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "14px",
                  backgroundColor: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <span>{formData.budgetPeriod}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: isBudgetPeriodOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {isBudgetPeriodOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  width: "100%",
                  maxWidth: "400px",
                  marginTop: "4px",
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  zIndex: 100
                }}>
                  {budgetPeriods.map(period => (
                    <div
                      key={period}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, budgetPeriod: period }));
                        setIsBudgetPeriodOpen(false);
                      }}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        fontSize: "14px",
                        backgroundColor: formData.budgetPeriod === period ? "#f0fdfa" : "transparent",
                        color: formData.budgetPeriod === period ? "#156372" : "#374151"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = formData.budgetPeriod === period ? "#f0fdfa" : "transparent"}
                    >
                      {period}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Location Field */}
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ width: "140px", paddingTop: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                Location
              </label>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "14px",
                  backgroundColor: "white",
                  color: "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <span>Location</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "600", marginTop: "12px", marginBottom: "4px" }}>
            ZB.ACCOUNT.PLACCOUNTS
          </div>

          {/* Income Accounts Section */}
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ width: "140px", paddingTop: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                Income Accounts
              </label>
            </div>
            <div style={{ flex: 1 }}>
              <div 
                onClick={() => handleOpenModal("Income")}
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  padding: "10px 14px",
                  border: "1px dashed #d1d5db",
                  borderRadius: "4px",
                  backgroundColor: "white",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: "13px", color: "#156372" }}>Add Accounts</span>
              </div>
              {selectedIncomeAccounts.length > 0 && (
                <div style={{ fontSize: "12px", color: "#156372", marginTop: "4px", fontWeight: "500" }}>
                  {selectedIncomeAccounts.length} accounts selected
                </div>
              )}
            </div>
          </div>

          {/* Expense Accounts Section */}
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ width: "140px", paddingTop: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                Expense Accounts
              </label>
            </div>
            <div style={{ flex: 1 }}>
              <div 
                onClick={() => handleOpenModal("Expense")}
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  padding: "10px 14px",
                  border: "1px dashed #d1d5db",
                  borderRadius: "4px",
                  backgroundColor: "white",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: "13px", color: "#156372" }}>Add Accounts</span>
              </div>
              {selectedExpenseAccounts.length > 0 && (
                <div style={{ fontSize: "12px", color: "#156372", marginTop: "4px", fontWeight: "500" }}>
                  {selectedExpenseAccounts.length} accounts selected
                </div>
              )}
            </div>
          </div>

          {!includeAssetLiabilityEquity ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
              <button 
                onClick={() => setIncludeAssetLiabilityEquity(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  color: "#156372",
                  fontSize: "13px"
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#156372" stroke="none">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16" stroke="white" strokeWidth="2"></line>
                  <line x1="8" y1="12" x2="16" y2="12" stroke="white" strokeWidth="2"></line>
                </svg>
                Include Asset, Liability, and Equity Accounts in Budget
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "600", marginTop: "24px", marginBottom: "4px" }}>
                ASSET, LIABILITY, AND EQUITY ACCOUNTS
              </div>

              {/* Asset Accounts Section */}
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ width: "140px", paddingTop: "10px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                    Asset Accounts
                  </label>
                </div>
                <div style={{ flex: 1 }}>
                  <div 
                    onClick={() => handleOpenModal("Asset")}
                    style={{
                      width: "100%",
                      maxWidth: "400px",
                      padding: "10px 14px",
                      border: "1px dashed #d1d5db",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      cursor: "pointer"
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "#156372" }}>Add Accounts</span>
                  </div>
                </div>
              </div>

              {/* Liability Accounts Section */}
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ width: "140px", paddingTop: "10px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                    Liability Accounts
                  </label>
                </div>
                <div style={{ flex: 1 }}>
                  <div 
                    onClick={() => handleOpenModal("Liability")}
                    style={{
                      width: "100%",
                      maxWidth: "400px",
                      padding: "10px 14px",
                      border: "1px dashed #d1d5db",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      cursor: "pointer"
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "#156372" }}>Add Accounts</span>
                  </div>
                </div>
              </div>

              {/* Equity Accounts Section */}
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ width: "140px", paddingTop: "10px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                    Equity Accounts
                  </label>
                </div>
                <div style={{ flex: 1 }}>
                  <div 
                    onClick={() => handleOpenModal("Equity")}
                    style={{
                      width: "100%",
                      maxWidth: "400px",
                      padding: "10px 14px",
                      border: "1px dashed #d1d5db",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      cursor: "pointer"
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "#156372" }}>Add Accounts</span>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "24px 32px",
          borderTop: "1px solid #f3f4f6"
        }}>
          <button
            onClick={async () => {
              if (!formData.name) {
                setErrors({ name: "Budget name is required" });
                setTouched({ name: true });
                return;
              }
              const success = await saveBudget({
                ...formData,
                includeAssetLiabilityEquity,
                selectedIncomeAccounts,
                selectedExpenseAccounts,
                selectedAssetAccounts,
                selectedLiabilityAccounts,
                selectedEquityAccounts,
                createForReportingTag,
                reportingTagName,
                reportingTagOption
              });
              if (success) navigate("/accountant/budgets");
            }}
            style={{
              padding: "8px 16px",
              backgroundColor: "#156372",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Create Budget
          </button>
          <button
            onClick={() => navigate("/accountant/budgets")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Account Selection Modal Overlay */}
      {isModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "white",
            width: "100%",
            maxWidth: "850px",
            borderRadius: "4px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "90vh",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "400", color: "#333", margin: 0 }}>
                Configure Accounts
              </h3>
              <button 
                onClick={handleCloseModal} 
                style={{ 
                  background: "transparent", 
                  border: "none", 
                  cursor: "pointer", 
                  color: "#666", 
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div style={{ padding: "0", flex: 1, overflowY: "auto" }}>
               <div style={{ padding: "20px 24px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontSize: "15px", color: "#333", fontWeight: "400", margin: 0 }}>
                    <span style={{ color: "#e11d48" }}>*</span>&nbsp;Select Accounts
                  </h4>
                  <h4 onClick={handleSelectAll} style={{ fontSize: "14px", color: "#156372", fontWeight: "400", margin: 0, cursor: "pointer" }}>
                    Select All
                  </h4>
               </div>

               <div style={{ padding: "0 24px 20px" }}>
                 <div style={{ display: "flex", border: "1px solid #ddd", borderRadius: "4px", overflow: "hidden", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, backgroundColor: "white" }}>
                   <span style={{ backgroundColor: "#f3f4f6", padding: "10px 14px", borderRight: "1px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                     <svg width="14" height="14" viewBox="0 0 512 512" fill="#888"><path d="M455.2 419.8L385.3 350c25.6-33.5 39.1-74.4 38.2-117.1-1-48.5-20.4-94.1-54.7-128.4-35.3-35.3-82.2-54.7-132.2-54.7h-.2c-50 0-97 19.6-132.3 55-72.5 72.8-72.5 191.2.1 264 24.8 24.8 55.9 42.1 90 50 33.1 7.7 67.6 6.2 99.9-4.2 13.1-4.2 20.3-18.3 16.1-31.5-4.2-13.1-18.3-20.3-31.5-16.1-49.3 15.9-102.6 3.1-139.1-33.5-53.2-53.3-53.3-140-.1-193.4 25.9-25.9 60.3-40.3 96.9-40.3h.1c36.6 0 71 14.2 96.8 40.1 25.1 25.1 39.4 58.5 40.1 94.1.7 35.4-12.1 69.3-36 95.3l-.1.1c-11.6 12.8-11.2 32.3 1 44.5l81.4 81.4c4.9 4.9 11.3 7.3 17.7 7.3 6.4 0 12.8-2.4 17.7-7.3 9.8-9.9 9.8-25.7.1-35.5z"></path></svg>
                   </span>
                   <input 
                    type="text" 
                    value={accountSearchTerm}
                    onChange={(e) => setAccountSearchTerm(e.target.value)}
                    style={{ flex: 1, padding: "10px 14px", border: "none", fontSize: "14px", outline: "none", color: "#333" }}
                   />
                 </div>

                 <div style={{ border: "1px solid #ddd", borderTop: "none", height: "400px", overflowY: "auto", backgroundColor: "white" }}>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {(() => {
                        const renderNode = (data: any, path: string = "", level: number = 0) => {
                          if (Array.isArray(data)) {
                            return data.map((acc, i) => {
                              const isSelected = modalSelectedAccounts.includes(acc.accountName || acc.name || "");
                              const matchesSearch = accountSearchTerm === "" || 
                                (acc.accountName || acc.name || "").toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
                                (acc.accountCode || acc.code || "").toLowerCase().includes(accountSearchTerm.toLowerCase());
                              
                              if (!matchesSearch) return null;

                              return (
                                <li 
                                  key={`${path}-${acc.accountName || acc.name || i}`} 
                                  onClick={() => handleToggleAccount(acc.accountName || acc.name || "")}
                                  style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    padding: "10px 20px", 
                                    cursor: "pointer",
                                    borderBottom: "1px solid #f9f9f9"
                                  }}
                                >
                                  <span style={{ display: "inline-block", width: `${level * 32}px` }}></span>
                                  <label style={{ fontSize: "14px", color: "#333", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", margin: 0, flex: 1 }}>
                                    {acc.accountName || acc.name}
                                    {isSelected && (
                                      <svg viewBox="0 0 512 512" width="18" height="18" fill="#156372" style={{ verticalAlign: "middle" }}>
                                        <path d="M222.7 335.9c-4.4 0-8.4-1.8-11.4-4.8l-62.4-63.9c-6.2-6.3-6.1-16.4.3-22.6 6.3-6.2 16.4-6.1 22.6.3l51.2 52.4 117.5-116.5c6.3-6.2 16.4-6.2 22.6.1s6.2 16.4-.1 22.6L234 331.3c-3 2.9-7.1 4.6-11.3 4.6z"></path>
                                      </svg>
                                    )}
                                  </label>
                                </li>
                              );
                            });
                          }

                          return Object.keys(data).map(key => {
                            const currentPath = path ? `${path}:${key}` : key;
                            const isExpanded = expandedCategories[currentPath];
                            const hasChildren = typeof data[key] === 'object';
                            
                            return (
                              <div key={currentPath}>
                                <li 
                                  onClick={() => toggleCategory(currentPath)}
                                  style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    padding: "10px 20px", 
                                    cursor: "pointer",
                                    backgroundColor: "white",
                                    borderBottom: "1px solid #f9f9f9"
                                  }}
                                >
                                  <span style={{ display: "inline-block", width: `${level * 32}px` }}></span>
                                  {hasChildren && (
                                    <button style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", marginRight: "12px" }}>
                                      <svg viewBox="0 0 512 512" width="18" height="18">
                                        <path fill="#156372" d="M256 15C122.9 15 15 122.9 15 256s107.9 241 241 241 241-107.9 241-241S389.1 15 256 15zm122 263H134c-12.2 0-22-9.8-22-22s9.8-22 22-22h244c12.2 0 22 9.8 22 22s-9.8 22-22 22z"></path>
                                        <path fill="#FFF" d="M378 234H134c-12.2 0-22 9.8-22 22s9.8 22 22 22h244c12.2 0 22-9.8 22-22s-9.8-22-22-22z"></path>
                                        {!isExpanded && <path fill="#FFF" d="M234 134v244c0 12.2 9.8 22 22 22s22-9.8 22-22V134c0-12.2-9.8-22-22-22s-22 9.8-22 22z"></path>}
                                      </svg>
                                    </button>
                                  )}
                                  <label style={{ fontSize: "14px", fontWeight: "400", color: "#333", margin: 0, cursor: "pointer" }}>
                                    {key}
                                  </label>
                                </li>
                                {isExpanded && renderNode(data[key], currentPath, level + 1)}
                              </div>
                            );
                          });
                        };

                        const grouped = getGroupedAccounts();
                        return renderNode(grouped);
                      })()}
                    </ul>
                 </div>
               </div>
            </div>

            <div style={{ padding: "20px 32px", borderTop: "1px solid #eee", display: "flex", gap: "10px", justifyContent: "flex-start" }}>
              <button onClick={handleUpdateAccounts} style={{ padding: "10px 24px", backgroundColor: "#156372", color: "white", border: "none", borderRadius: "4px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Update</button>
              <button onClick={handleCloseModal} style={{ padding: "10px 24px", backgroundColor: "white", color: "#333", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewBudget;
