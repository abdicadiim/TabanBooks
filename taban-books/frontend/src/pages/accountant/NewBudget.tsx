import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { saveBudget, getBudgetById, getAccounts } from "./accountantModel";
import {
  buildLinesFromSelections,
  getPeriods,
  parseFiscalYear,
} from "./budgetUtils";

function NewBudget() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: "",
    fiscalYear: "Jan 2025 - Dec 2025",
    budgetPeriod: "Monthly"
  });

  const [isFiscalYearOpen, setIsFiscalYearOpen] = useState(false);
  const [isBudgetPeriodOpen, setIsBudgetPeriodOpen] = useState(false);
  const [fiscalYearSearch, setFiscalYearSearch] = useState("");
  const [budgetPeriodSearch, setBudgetPeriodSearch] = useState("");
  const [includeAssetLiabilityEquity, setIncludeAssetLiabilityEquity] = useState(false);
  const [selectedIncomeAccounts, setSelectedIncomeAccounts] = useState([]);
  const [selectedExpenseAccounts, setSelectedExpenseAccounts] = useState([]);
  const [selectedAssetAccounts, setSelectedAssetAccounts] = useState([]);
  const [selectedLiabilityAccounts, setSelectedLiabilityAccounts] = useState([]);
  const [selectedEquityAccounts, setSelectedEquityAccounts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAccountType, setModalAccountType] = useState(null); // "income", "expense", "asset", "liability", "equity"
  const [modalSelectedAccounts, setModalSelectedAccounts] = useState([]);
  const [accountSearchTerm, setAccountSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({});

  const [originalBudget, setOriginalBudget] = useState(null);
  const [allAccounts, setAllAccounts] = useState([]);
  const [createForReportingTag, setCreateForReportingTag] = useState(false);
  const [reportingTagName, setReportingTagName] = useState("");
  const [reportingTagOption, setReportingTagOption] = useState("All");

  const fiscalYearRef = useRef(null);
  const budgetPeriodRef = useRef(null);

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
            budgetPeriod: budget.budgetPeriod || "Monthly"
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

  // Sample income accounts to always show in the modal
  const sampleIncomeAccounts = [
    { accountName: "Discount", type: "Income", accountCode: "INC-001" },
    { accountName: "General Income", type: "Income", accountCode: "INC-002" },
    { accountName: "Interest Income", type: "Income", accountCode: "INC-003" },
    { accountName: "Late Fee Income", type: "Income", accountCode: "INC-004" },
    { accountName: "Other Charges", type: "Income", accountCode: "INC-005" },
    { accountName: "Sales", type: "Income", accountCode: "INC-006" },
    { accountName: "Shipping Charge", type: "Income", accountCode: "INC-007" }
  ];

  // Sample expense accounts to always show in the modal
  const sampleExpenseAccounts = [
    { accountName: "Cost of Goods Sold", type: "Expense", accountCode: "EXP-001" },
    { accountName: "Automobile Expense", type: "Expense", accountCode: "EXP-002" },
    { accountName: "Bad Debt", type: "Expense", accountCode: "EXP-003" },
    { accountName: "Bank Fees and Charges", type: "Expense", accountCode: "EXP-004" },
    { accountName: "Consultant Expense", type: "Expense", accountCode: "EXP-005" },
    { accountName: "Credit Card Charges", type: "Expense", accountCode: "EXP-006" },
    { accountName: "Depreciation Expense", type: "Expense", accountCode: "EXP-007" },
    { accountName: "IT and Internet Expenses", type: "Expense", accountCode: "EXP-008" },
    { accountName: "Janitorial Expense", type: "Expense", accountCode: "EXP-009" },
    { accountName: "Lodging", type: "Expense", accountCode: "EXP-010" },
    { accountName: "Meals and entertainment", type: "Expense", accountCode: "EXP-011" },
    { accountName: "Office Supplies", type: "Expense", accountCode: "EXP-012" },
    { accountName: "Other Expenses", type: "Expense", accountCode: "EXP-013" },
    { accountName: "Postage", type: "Expense", accountCode: "EXP-014" },
    { accountName: "Printing and Stationery", type: "Expense", accountCode: "EXP-015" },
    { accountName: "Purchase Discounts", type: "Expense", accountCode: "EXP-016" },
    { accountName: "Rent Expense", type: "Expense", accountCode: "EXP-017" },
    { accountName: "Repairs and Maintenance", type: "Expense", accountCode: "EXP-018" },
    { accountName: "Salaries and Employee Wages", type: "Expense", accountCode: "EXP-019" },
    { accountName: "Telephone Expense", type: "Expense", accountCode: "EXP-020" },
    { accountName: "Travel Expense", type: "Expense", accountCode: "EXP-021" },
    { accountName: "Exchange Gain or Loss", type: "Expense", accountCode: "EXP-022" }
  ];

  // Group accounts by type for modal display with hierarchical structure
  const getGroupedAccounts = () => {
    if (modalAccountType === "income") {
      // Get income accounts from localStorage
      const storedIncomeAccounts = accounts.filter(acc => acc.type === "Income");
      const storedOtherIncomeAccounts = accounts.filter(acc => acc.type === "Other Income");

      // Always use sample income accounts for the Income sub-category
      // Merge with stored accounts if they exist, but prioritize showing sample accounts
      const incomeAccountsToUse = storedIncomeAccounts.length > 0
        ? [...sampleIncomeAccounts, ...storedIncomeAccounts.filter(acc =>
          !sampleIncomeAccounts.some(sample => sample.accountName === acc.accountName)
        )]
        : sampleIncomeAccounts;

      // Always show Income structure
      const structure = {
        "Income": {
          "Income": incomeAccountsToUse,
          "Other Income": storedOtherIncomeAccounts
        }
      };

      return structure;
    } else if (modalAccountType === "expense") {
      // For expense accounts
      const storedExpenseAccounts = accounts.filter(acc => acc.type === "Expense");

      // Always use sample expense accounts for the Cost Of Goods Sold sub-category
      // Merge with stored accounts if they exist, but prioritize showing sample accounts
      const expenseAccountsToUse = storedExpenseAccounts.length > 0
        ? [...sampleExpenseAccounts, ...storedExpenseAccounts.filter(acc =>
          !sampleExpenseAccounts.some(sample => sample.accountName === acc.accountName)
        )]
        : sampleExpenseAccounts;

      // Always show Expense structure with Cost Of Goods Sold sub-category
      const structure = {
        "Expense": {
          "Cost Of Goods Sold": expenseAccountsToUse
        }
      };

      return structure;
    } else if (modalAccountType === "asset") {
      // For asset accounts - hierarchical structure
      const storedAssetAccounts = accounts.filter(acc => acc.type === "Asset");

      // Sample asset accounts to always show
      const sampleAssetAccounts = {
        "Accounts Receivable": [
          { accountName: "Accounts Receivable", type: "Asset", accountCode: "AST-001" }
        ],
        "Other current assets": [
          { accountName: "Advance Tax", type: "Asset", accountCode: "AST-002" },
          { accountName: "Employee Advance", type: "Asset", accountCode: "AST-003" },
          { accountName: "Finished Goods", type: "Asset", accountCode: "AST-004" },
          { accountName: "Inventory Asset", type: "Asset", accountCode: "AST-005" },
          { accountName: "Prepaid Expenses", type: "Asset", accountCode: "AST-006" },
          { accountName: "Sales to Customers (Cash)", type: "Asset", accountCode: "AST-007" },
          { accountName: "Work in Progress", type: "Asset", accountCode: "AST-008" }
        ],
        "Cash": [
          { accountName: "mohamed", type: "Asset", accountCode: "AST-009" },
          { accountName: "Petty Cash", type: "Asset", accountCode: "AST-010" },
          { accountName: "Undeposited Funds", type: "Asset", accountCode: "AST-011" }
        ],
        "Bank": [
          { accountName: "salam somali bank", type: "Asset", accountCode: "AST-012" }
        ],
        "Fixed Assets": [
          { accountName: "Furniture and Equipment", type: "Asset", accountCode: "AST-013" }
        ]
      };

      // Merge with stored accounts
      const structure = {
        "Assets": {
          "Current Assets": {
            "Accounts Receivable": sampleAssetAccounts["Accounts Receivable"],
            "Other current assets": sampleAssetAccounts["Other current assets"],
            "Cash and Cash Equivalent": {
              "Cash": sampleAssetAccounts["Cash"],
              "Bank": sampleAssetAccounts["Bank"]
            }
          },
          "Other Assets": [],
          "Fixed Assets": sampleAssetAccounts["Fixed Assets"]
        }
      };

      return structure;
    } else if (modalAccountType === "liability") {
      // For liability accounts - hierarchical structure
      const storedLiabilityAccounts = accounts.filter(acc => acc.type === "Liability");

      // Sample liability accounts to always show
      const sampleLiabilityAccounts = {
        "Current Liabilities": [
          { accountName: "Accounts Payable", type: "Liability", accountCode: "LIA-001" },
          { accountName: "Employee Reimbursements", type: "Liability", accountCode: "LIA-002" },
          { accountName: "Opening Balance Adjustments", type: "Liability", accountCode: "LIA-003" },
          { accountName: "Tax Payable", type: "Liability", accountCode: "LIA-004" },
          { accountName: "Unearned Revenue", type: "Liability", accountCode: "LIA-005" }
        ],
        "Long Term Liabilities": [],
        "Other Liabilities": []
      };

      // Merge with stored accounts
      const structure = {
        "Liabilities": {
          "Current Liabilities": sampleLiabilityAccounts["Current Liabilities"],
          "Long Term Liabilities": storedLiabilityAccounts.filter(acc =>
            !sampleLiabilityAccounts["Current Liabilities"].some(sample => sample.accountName === acc.accountName)
          ),
          "Other Liabilities": []
        }
      };

      return structure;
    } else if (modalAccountType === "equity") {
      // For equity accounts - hierarchical structure
      const storedEquityAccounts = accounts.filter(acc => acc.type === "Equity");

      // Sample equity accounts to always show
      const sampleEquityAccounts = [
        { accountName: "Current Year Earnings", type: "Equity", accountCode: "EQT-001" },
        { accountName: "Drawings", type: "Equity", accountCode: "EQT-002" },
        { accountName: "Opening Balance Offset", type: "Equity", accountCode: "EQT-003" },
        { accountName: "Owner's Equity", type: "Equity", accountCode: "EQT-004" },
        { accountName: "Retained Earnings", type: "Equity", accountCode: "EQT-005" }
      ];

      // Merge with stored accounts
      const equityAccountsToUse = storedEquityAccounts.length > 0
        ? [...sampleEquityAccounts, ...storedEquityAccounts.filter(acc =>
          !sampleEquityAccounts.some(sample => sample.accountName === acc.accountName)
        )]
        : sampleEquityAccounts;

      // Always show Equities structure
      const structure = {
        "Equities": {
          "Equities": equityAccountsToUse
        }
      };

      return structure;
    }
    return {};
  };

  const toggleCategory = (categoryPath) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryPath]: !prev[categoryPath]
    }));
  };

  const getFilteredAccounts = () => {
    const grouped = getGroupedAccounts();
    const allAccounts = [];

    const extractAccounts = (data) => {
      if (Array.isArray(data)) {
        data.forEach(acc => {
          if (accountSearchTerm === "" ||
            acc.accountName?.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
            acc.accountCode?.toLowerCase().includes(accountSearchTerm.toLowerCase())) {
            allAccounts.push(acc);
          }
        });
      } else if (typeof data === 'object') {
        Object.keys(data).forEach(key => {
          extractAccounts(data[key]);
        });
      }
    };

    Object.keys(grouped).forEach(mainCategory => {
      extractAccounts(grouped[mainCategory]);
    });

    return allAccounts;
  };

  const handleOpenModal = (type) => {
    setModalAccountType(type);
    let currentSelected = [];
    if (type === "income") {
      currentSelected = selectedIncomeAccounts;
    } else if (type === "expense") {
      currentSelected = selectedExpenseAccounts;
    } else if (type === "asset") {
      currentSelected = selectedAssetAccounts;
    } else if (type === "liability") {
      currentSelected = selectedLiabilityAccounts;
    } else if (type === "equity") {
      currentSelected = selectedEquityAccounts;
    }
    setModalSelectedAccounts([...currentSelected]);
    setAccountSearchTerm("");
    // Initialize all categories as expanded
    if (type === "income") {
      setExpandedCategories({
        "Income": true,
        "Income:Income": true,
        "Income:Other Income": true
      });
    } else if (type === "expense") {
      setExpandedCategories({
        "Expense": true,
        "Expense:Cost Of Goods Sold": true
      });
    } else if (type === "asset") {
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
    } else if (type === "liability") {
      setExpandedCategories({
        "Liabilities": true,
        "Liabilities:Current Liabilities": true,
        "Liabilities:Long Term Liabilities": true,
        "Liabilities:Other Liabilities": true
      });
    } else if (type === "equity") {
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

  const handleToggleAccount = (accountName) => {
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
    const allNames = filtered.map(acc => acc.accountName).filter(Boolean);
    setModalSelectedAccounts(allNames);
  };

  const handleUpdateAccounts = () => {
    if (modalAccountType === "income") {
      setSelectedIncomeAccounts([...modalSelectedAccounts]);
    } else if (modalAccountType === "expense") {
      setSelectedExpenseAccounts([...modalSelectedAccounts]);
    } else if (modalAccountType === "asset") {
      setSelectedAssetAccounts([...modalSelectedAccounts]);
    } else if (modalAccountType === "liability") {
      setSelectedLiabilityAccounts([...modalSelectedAccounts]);
    } else if (modalAccountType === "equity") {
      setSelectedEquityAccounts([...modalSelectedAccounts]);
    }
    handleCloseModal();
  };


  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (fiscalYearRef.current && !fiscalYearRef.current.contains(event.target)) {
        setIsFiscalYearOpen(false);
      }
      if (budgetPeriodRef.current && !budgetPeriodRef.current.contains(event.target)) {
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
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    if (!value || value.trim() === "") {
      newErrors[name] = "This field is required";
    } else {
      delete newErrors[name];
    }
    setErrors(newErrors);
  };

  const handleBlur = (name, value) => {
    setTouched({ ...touched, [name]: true });
    validateField(name, value);
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      width: "100%",
      padding: "0"
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "0",
        boxShadow: "none",
        maxWidth: "100%",
        margin: "0",
        overflow: "hidden"
      }}>
        {/* Header - Fixed */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "white",
          position: "fixed",
          top: 0,
          left: "var(--sidebar-width, 260px)",
          right: 0,
          zIndex: 100,
          transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
          <h1 style={{
            fontSize: "20px",
            fontWeight: "600",
            color: "#111827",
            margin: 0
          }}>
            New Budget
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => navigate("/accountant/budgets")}
              type="button"
              aria-label="Cancel"
              style={{
                padding: "8px 16px",
                backgroundColor: "transparent",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                color: "#6b7280",
                transition: "all 0.2s ease"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
                e.target.style.borderColor = "#d1d5db";
                e.target.style.color = "#111827";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.borderColor = "#e5e7eb";
                e.target.style.color = "#6b7280";
              }}
            >
              Cancel
            </button>

            <button
              onClick={() => navigate("/accountant/budgets")}
              type="button"
              aria-label="Close"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                transition: "all 0.2s ease",
                color: "#6b7280"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f3f4f6";
                e.target.style.color = "#111827";
                e.target.style.transform = "rotate(90deg)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#6b7280";
                e.target.style.transform = "rotate(0deg)";
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{
          width: "100%",
          padding: "24px",
          minHeight: "calc(100vh - 200px)",
          marginTop: "70px"
        }}>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Name Field */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "24px"
            }}>
              <label
                htmlFor="budget-name"
                style={{
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginBottom: "6px"
                }}
              >
                Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ position: "relative", maxWidth: "400px" }}>
                <input
                  id="budget-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    if (touched.name) validateField("name", e.target.value);
                  }}
                  placeholder="Enter budget name"
                  aria-label="Budget name"
                  aria-required="true"
                  aria-invalid={errors.name ? "true" : "false"}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: errors.name && touched.name
                      ? "1px solid #ef4444"
                      : formData.name && !errors.name
                        ? "1px solid #10b981"
                        : "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    backgroundColor: "white",
                    color: "#111827",
                    transition: "all 0.2s ease",
                    boxShadow: errors.name && touched.name
                      ? "0 0 0 3px rgba(239, 68, 68, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)"
                      : formData.name && !errors.name
                        ? "0 0 0 3px rgba(16, 185, 129, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)"
                        : "0 1px 2px rgba(0, 0, 0, 0.05)"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#156372";
                    e.target.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)";
                    e.target.style.transform = "translateY(-1px)";
                  }}
                  onBlur={(e) => {
                    handleBlur("name", e.target.value);
                    if (errors.name && touched.name) {
                      e.target.style.borderColor = "#ef4444";
                      e.target.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)";
                    } else if (formData.name && !errors.name) {
                      e.target.style.borderColor = "#10b981";
                      e.target.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)";
                    } else {
                      e.target.style.borderColor = "#e5e7eb";
                      e.target.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
                    }
                    e.target.style.transform = "translateY(0)";
                  }}
                />
                {errors.name && touched.name && (
                  <div style={{
                    marginTop: "6px",
                    fontSize: "13px",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5" fill="none" />
                      <path d="M8 5v3M8 10h.01" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {errors.name}
                  </div>
                )}
                {formData.name && !errors.name && touched.name && (
                  <div style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#10b981"
                  }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" fill="#10b981" />
                      <path d="M6 10l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Fiscal Year Field */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "24px"
            }}>
              <label
                htmlFor="fiscal-year"
                style={{
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginBottom: "6px"
                }}
              >
                Fiscal Year <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div ref={fiscalYearRef} style={{ position: "relative", maxWidth: "400px" }}>
                <div
                  id="fiscal-year"
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsFiscalYearOpen(!isFiscalYearOpen)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsFiscalYearOpen(!isFiscalYearOpen);
                    }
                  }}
                  aria-label="Select fiscal year"
                  aria-expanded={isFiscalYearOpen}
                  aria-required="true"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: errors.fiscalYear && touched.fiscalYear
                      ? "1px solid #ef4444"
                      : formData.fiscalYear && !errors.fiscalYear
                        ? "1px solid #10b981"
                        : "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#111827",
                    transition: "all 0.2s ease",
                    boxShadow: isFiscalYearOpen
                      ? "0 0 0 3px rgba(38, 99, 235, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)"
                      : errors.fiscalYear && touched.fiscalYear
                        ? "0 0 0 3px rgba(239, 68, 68, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)"
                        : formData.fiscalYear && !errors.fiscalYear
                          ? "0 0 0 3px rgba(16, 185, 129, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)"
                          : "0 1px 2px rgba(0, 0, 0, 0.05)"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#156372";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onBlur={(e) => {
                    if (errors.fiscalYear && touched.fiscalYear) {
                      e.currentTarget.style.borderColor = "#ef4444";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)";
                    } else if (formData.fiscalYear && !errors.fiscalYear) {
                      e.currentTarget.style.borderColor = "#10b981";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)";
                    } else {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
                    }
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span>{formData.fiscalYear}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    style={{
                      transform: isFiscalYearOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease"
                    }}
                  >
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {isFiscalYearOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      backgroundColor: "white",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 1000,
                      maxHeight: "300px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column"
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Search Bar */}
                    <div style={{
                      padding: "8px",
                      borderBottom: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "white"
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" fill="none" />
                          <path d="M11 11l-3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search"
                          value={fiscalYearSearch}
                          onChange={(e) => setFiscalYearSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            flex: 1,
                            border: "none",
                            outline: "none",
                            fontSize: "14px",
                            background: "transparent"
                          }}
                        />
                      </div>
                    </div>

                    {/* Options List */}
                    <div style={{
                      maxHeight: "240px",
                      overflowY: "auto",
                      padding: "4px 0"
                    }}>
                      {getFilteredFiscalYears().map((year) => (
                        <div
                          key={year}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, fiscalYear: year }));
                            setIsFiscalYearOpen(false);
                            setFiscalYearSearch("");
                          }}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: formData.fiscalYear === year ? "#eff6ff" : "transparent",
                            color: "#111827",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (formData.fiscalYear !== year) {
                              e.currentTarget.style.backgroundColor = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (formData.fiscalYear !== year) {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          <span>{year}</span>
                          {formData.fiscalYear === year && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M13 4l-6 6-3-3" stroke="#156372" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Budget Period Field */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "24px"
            }}>
              <label
                htmlFor="budget-period"
                style={{
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginBottom: "6px"
                }}
              >
                Budget Period <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div ref={budgetPeriodRef} style={{ position: "relative", maxWidth: "400px" }}>
                <div
                  id="budget-period"
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsBudgetPeriodOpen(!isBudgetPeriodOpen)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsBudgetPeriodOpen(!isBudgetPeriodOpen);
                    }
                  }}
                  aria-label="Select budget period"
                  aria-expanded={isBudgetPeriodOpen}
                  aria-required="true"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: errors.budgetPeriod && touched.budgetPeriod
                      ? "1px solid #ef4444"
                      : formData.budgetPeriod && !errors.budgetPeriod
                        ? "1px solid #10b981"
                        : "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#111827",
                    transition: "all 0.2s ease",
                    boxShadow: isBudgetPeriodOpen
                      ? "0 0 0 3px rgba(38, 99, 235, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)"
                      : errors.budgetPeriod && touched.budgetPeriod
                        ? "0 0 0 3px rgba(239, 68, 68, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)"
                        : formData.budgetPeriod && !errors.budgetPeriod
                          ? "0 0 0 3px rgba(16, 185, 129, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)"
                          : "0 1px 2px rgba(0, 0, 0, 0.05)"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#156372";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onBlur={(e) => {
                    if (errors.budgetPeriod && touched.budgetPeriod) {
                      e.currentTarget.style.borderColor = "#ef4444";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)";
                    } else if (formData.budgetPeriod && !errors.budgetPeriod) {
                      e.currentTarget.style.borderColor = "#10b981";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)";
                    } else {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
                    }
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span>{formData.budgetPeriod}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    style={{
                      transform: isBudgetPeriodOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease"
                    }}
                  >
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {isBudgetPeriodOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      backgroundColor: "white",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 1000,
                      maxHeight: "300px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column"
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Search Bar */}
                    <div style={{
                      padding: "8px",
                      borderBottom: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "white"
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" fill="none" />
                          <path d="M11 11l-3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search"
                          value={budgetPeriodSearch}
                          onChange={(e) => setBudgetPeriodSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            flex: 1,
                            border: "none",
                            outline: "none",
                            fontSize: "14px",
                            background: "transparent"
                          }}
                        />
                      </div>
                    </div>

                    {/* Options List */}
                    <div style={{
                      maxHeight: "240px",
                      overflowY: "auto",
                      padding: "4px 0"
                    }}>
                      {getFilteredBudgetPeriods().map((period) => (
                        <div
                          key={period}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, budgetPeriod: period }));
                            setIsBudgetPeriodOpen(false);
                            setBudgetPeriodSearch("");
                          }}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: formData.budgetPeriod === period ? "#eff6ff" : "transparent",
                            color: "#111827",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (formData.budgetPeriod !== period) {
                              e.currentTarget.style.backgroundColor = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (formData.budgetPeriod !== period) {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          <span>{period}</span>
                          {formData.budgetPeriod === period && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M13 4l-6 6-3-3" stroke="#156372" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Income and Expense Accounts Section */}
            <div>
              <div style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#6b7280",
                textTransform: "uppercase",
                marginBottom: "20px"
              }}>
                INCOME AND EXPENSE ACCOUNTS
              </div>

              {/* Income Accounts */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", marginBottom: "24px" }}>
                <label style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#111827",
                  minWidth: "120px",
                  paddingTop: "10px"
                }}>
                  Income Accounts
                </label>
                <div style={{ flex: 1 }}>
                  <div style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "16px",
                    backgroundColor: "white",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}>
                    {selectedIncomeAccounts.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {selectedIncomeAccounts.map((account, index) => (
                          <div
                            key={index}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#f3f4f6",
                              borderRadius: "6px",
                              fontSize: "14px",
                              color: "#111827",
                              fontWeight: "400"
                            }}
                          >
                            {account}
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => handleOpenModal("income")}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "transparent",
                        color: "#60a5fa",
                        border: "1px dashed #60a5fa",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "500",
                        cursor: "pointer",
                        alignSelf: "flex-start",
                        transition: "all 0.2s ease"
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = "#e0f2fe";
                        e.target.style.borderColor = "#156372";
                        e.target.style.color = "#156372";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = "transparent";
                        e.target.style.borderColor = "#60a5fa";
                        e.target.style.color = "#60a5fa";
                      }}
                    >
                      Add or Remove Accounts
                    </button>
                  </div>
                </div>
              </div>

              {/* Expense Accounts */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", marginBottom: "24px" }}>
                <label style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#111827",
                  minWidth: "120px",
                  paddingTop: "10px"
                }}>
                  Expense Accounts
                </label>
                <div style={{ flex: 1 }}>
                  <div style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "16px",
                    backgroundColor: "white",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}>
                    {selectedExpenseAccounts.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {selectedExpenseAccounts.map((account, index) => (
                          <div
                            key={index}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#f3f4f6",
                              borderRadius: "6px",
                              fontSize: "14px",
                              color: "#111827",
                              fontWeight: "400"
                            }}
                          >
                            {account}
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => handleOpenModal("expense")}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "transparent",
                        color: "#60a5fa",
                        border: "1px dashed #60a5fa",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "500",
                        cursor: "pointer",
                        alignSelf: "flex-start",
                        transition: "all 0.2s ease"
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = "#e0f2fe";
                        e.target.style.borderColor = "#156372";
                        e.target.style.color = "#156372";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = "transparent";
                        e.target.style.borderColor = "#60a5fa";
                        e.target.style.color = "#60a5fa";
                      }}
                    >
                      Add or Remove Accounts
                    </button>
                  </div>
                </div>
              </div>

              {/* Include Asset, Liability, and Equity Accounts Checkbox - Only show when unchecked */}
              {!includeAssetLiabilityEquity && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "24px" }}>
                  <div style={{ minWidth: "120px" }}></div>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div
                        onClick={() => setIncludeAssetLiabilityEquity(!includeAssetLiabilityEquity)}
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          backgroundColor: includeAssetLiabilityEquity ? "#156372" : "transparent",
                          border: includeAssetLiabilityEquity ? "none" : "2px solid #156372",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0
                        }}
                      >
                        {includeAssetLiabilityEquity && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 3v6M3 6h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        )}
                        {!includeAssetLiabilityEquity && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 3v6M3 6h6" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: "14px", color: "#111827" }}>
                        Include Asset, Liability, and Equity Accounts in Budget
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* Reporting Tag Association */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", marginTop: "16px" }}>
                <div style={{ minWidth: "120px" }}></div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={createForReportingTag}
                      onChange={(e) => setCreateForReportingTag(e.target.checked)}
                    />
                    <span style={{ fontSize: "14px", color: "#111827" }}>
                      Create this budget for a specific reporting tag
                    </span>
                  </label>
                  {createForReportingTag && (
                    <div style={{ display: "flex", gap: "12px", maxWidth: "560px" }}>
                      <input
                        type="text"
                        value={reportingTagName}
                        onChange={(e) => setReportingTagName(e.target.value)}
                        placeholder="Tag Name"
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "14px",
                        }}
                      />
                      <select
                        value={reportingTagOption}
                        onChange={(e) => setReportingTagOption(e.target.value)}
                        style={{
                          width: "180px",
                          padding: "10px 12px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "14px",
                          backgroundColor: "white",
                        }}
                      >
                        <option value="All">All</option>
                        <option value="Contains">Contains</option>
                        <option value="Starts With">Starts With</option>
                        <option value="Ends With">Ends With</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Asset, Liability, and Equity Accounts Sections - Shown when checkbox is checked */}
              {includeAssetLiabilityEquity && (
                <>
                  {/* Asset Accounts */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", marginTop: "24px" }}>
                    <label style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#111827",
                      minWidth: "120px",
                      paddingTop: "10px"
                    }}>
                      Asset Accounts
                    </label>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "16px",
                        backgroundColor: "white",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px"
                      }}>
                        {selectedAssetAccounts.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {selectedAssetAccounts.map((account, index) => (
                              <div
                                key={index}
                                style={{
                                  padding: "6px 12px",
                                  backgroundColor: "#f3f4f6",
                                  borderRadius: "6px",
                                  fontSize: "14px",
                                  color: "#111827",
                                  fontWeight: "400"
                                }}
                              >
                                {account}
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => handleOpenModal("asset")}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "transparent",
                            color: "#60a5fa",
                            border: "1px dashed #60a5fa",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "500",
                            cursor: "pointer",
                            alignSelf: "flex-start",
                            transition: "all 0.2s ease"
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = "#e0f2fe";
                            e.target.style.borderColor = "#156372";
                            e.target.style.color = "#156372";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.borderColor = "#60a5fa";
                            e.target.style.color = "#60a5fa";
                          }}
                        >
                          Add or Remove Accounts
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Liability Accounts */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", marginTop: "16px" }}>
                    <label style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#111827",
                      minWidth: "120px",
                      paddingTop: "10px"
                    }}>
                      Liability Accounts
                    </label>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "16px",
                        backgroundColor: "white",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px"
                      }}>
                        {selectedLiabilityAccounts.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {selectedLiabilityAccounts.map((account, index) => (
                              <div
                                key={index}
                                style={{
                                  padding: "6px 12px",
                                  backgroundColor: "#f3f4f6",
                                  borderRadius: "6px",
                                  fontSize: "14px",
                                  color: "#111827",
                                  fontWeight: "400"
                                }}
                              >
                                {account}
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => handleOpenModal("liability")}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "transparent",
                            color: "#60a5fa",
                            border: "1px dashed #60a5fa",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "500",
                            cursor: "pointer",
                            alignSelf: "flex-start",
                            transition: "all 0.2s ease"
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = "#e0f2fe";
                            e.target.style.borderColor = "#156372";
                            e.target.style.color = "#156372";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.borderColor = "#60a5fa";
                            e.target.style.color = "#60a5fa";
                          }}
                        >
                          Add or Remove Accounts
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Equity Accounts */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", marginTop: "16px" }}>
                    <label style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#111827",
                      minWidth: "120px",
                      paddingTop: "10px"
                    }}>
                      Equity Accounts
                    </label>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "16px",
                        backgroundColor: "white",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px"
                      }}>
                        {selectedEquityAccounts.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {selectedEquityAccounts.map((account, index) => (
                              <div
                                key={index}
                                style={{
                                  padding: "6px 12px",
                                  backgroundColor: "#f3f4f6",
                                  borderRadius: "6px",
                                  fontSize: "14px",
                                  color: "#111827",
                                  fontWeight: "400"
                                }}
                              >
                                {account}
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => handleOpenModal("equity")}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "transparent",
                            color: "#60a5fa",
                            border: "1px dashed #60a5fa",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "500",
                            cursor: "pointer",
                            alignSelf: "flex-start",
                            transition: "all 0.2s ease"
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = "#e0f2fe";
                            e.target.style.borderColor = "#156372";
                            e.target.style.color = "#156372";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.borderColor = "#60a5fa";
                            e.target.style.color = "#60a5fa";
                          }}
                        >
                          Add or Remove Accounts
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              paddingTop: "32px",
              borderTop: "1px solid #e5e7eb",
              marginTop: "24px"
            }}>
              <button
                onClick={() => navigate("/accountant/budgets")}
                type="button"
                aria-label="Cancel form"
                style={{
                  padding: "12px 24px",
                  backgroundColor: "transparent",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                  color: "#6b7280",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#f9fafb";
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.color = "#111827";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.color = "#6b7280";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Validate all fields
                  const allValid = formData.name && formData.fiscalYear && formData.budgetPeriod;
                  if (allValid) {
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

                    // Prepare budget data
                    const budgetData = {
                      ...(originalBudget || {}),
                      name: formData.name,
                      fiscalYear: startYear,
                      fiscalYearLabel: formData.fiscalYear,
                      budgetPeriod: formData.budgetPeriod,
                      includeAssetLiabilityEquity: includeAssetLiabilityEquity,
                      selectedIncomeAccounts: selectedIncomeAccounts,
                      selectedExpenseAccounts: selectedExpenseAccounts,
                      selectedAssetAccounts: selectedAssetAccounts,
                      selectedLiabilityAccounts: selectedLiabilityAccounts,
                      selectedEquityAccounts: selectedEquityAccounts,
                      createForReportingTag,
                      reportingTagName,
                      reportingTagOption,
                      startDate,
                      endDate,
                      lines: Array.isArray((originalBudget as any)?.lines) && (originalBudget as any).lines.length > 0
                        ? (originalBudget as any).lines
                        : generatedLines,
                    };

                    // Save budget
                    const success = await saveBudget(budgetData);

                    if (success) {
                      // Navigate back to budgets list
                      navigate("/accountant/budgets");
                    } else {
                      alert("Failed to save budget. Please try again.");
                    }
                  }
                }}
                type="button"
                disabled={!formData.name || !formData.fiscalYear || !formData.budgetPeriod}
                aria-label="Save budget"
                style={{
                  padding: "12px 32px",
                  backgroundColor: formData.name && formData.fiscalYear && formData.budgetPeriod
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "#d1d5db",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: formData.name && formData.fiscalYear && formData.budgetPeriod ? "pointer" : "not-allowed",
                  color: "white",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: formData.name && formData.fiscalYear && formData.budgetPeriod
                    ? "0 4px 6px rgba(102, 126, 234, 0.4)"
                    : "none"
                }}
                onMouseOver={(e) => {
                  if (formData.name && formData.fiscalYear && formData.budgetPeriod) {
                    e.target.style.transform = "translateY(-2px) scale(1.02)";
                    e.target.style.boxShadow = "0 8px 12px rgba(102, 126, 234, 0.5)";
                  }
                }}
                onMouseOut={(e) => {
                  if (formData.name && formData.fiscalYear && formData.budgetPeriod) {
                    e.target.style.transform = "translateY(0) scale(1)";
                    e.target.style.boxShadow = "0 4px 6px rgba(102, 126, 234, 0.4)";
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Configure Accounts Modal */}
        {isModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000
            }}
            onClick={handleCloseModal}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                width: "90%",
                maxWidth: "600px",
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb"
              }}>
                <h2 style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#111827",
                  margin: 0
                }}>
                  Configure Accounts
                </h2>
                <button
                  onClick={handleCloseModal}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5l10 10" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div style={{
                padding: "20px 24px",
                overflowY: "auto",
                flex: 1
              }}>
                {/* Select Accounts Label */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px"
                }}>
                  <label style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#111827"
                  }}>
                    Select Accounts <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <button
                    onClick={handleSelectAll}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#156372",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      padding: "4px 8px"
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                    onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                  >
                    Select All
                  </button>
                </div>

                {/* Search Bar */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  backgroundColor: "#f9fafb",
                  marginBottom: "16px"
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" fill="none" />
                    <path d="M11 11l-3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search accounts..."
                    value={accountSearchTerm}
                    onChange={(e) => setAccountSearchTerm(e.target.value)}
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      fontSize: "14px",
                      background: "transparent",
                      color: "#111827"
                    }}
                  />
                </div>

                {/* Account List */}
                <div style={{
                  maxHeight: "400px",
                  overflowY: "auto"
                }}>
                  {Object.keys(getGroupedAccounts()).map(mainCategory => {
                    const categoryData = getGroupedAccounts()[mainCategory];
                    const isMainExpanded = expandedCategories[mainCategory] !== false;

                    return (
                      <div key={mainCategory} style={{ marginBottom: "8px" }}>
                        {/* Main Category (Income) */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 4px",
                            cursor: "pointer"
                          }}
                          onClick={() => toggleCategory(mainCategory)}
                        >
                          <div style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            backgroundColor: "#156372",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}>
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                            >
                              <path
                                d="M3 6h6"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                              {!isMainExpanded && (
                                <path
                                  d="M6 3v6"
                                  stroke="white"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              )}
                            </svg>
                          </div>
                          <div style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: "#156372"
                          }}></div>
                          <span style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#111827"
                          }}>
                            {mainCategory}
                          </span>
                        </div>

                        {/* Sub-categories and accounts */}
                        {isMainExpanded && Object.keys(categoryData).map(subCategory => {
                          const subCategoryData = categoryData[subCategory];
                          const isSubCategoryObject = typeof subCategoryData === 'object' && !Array.isArray(subCategoryData);
                          const categoryPath = `${mainCategory}:${subCategory}`;
                          const isSubExpanded = expandedCategories[categoryPath] !== false;

                          // If it's an object (nested structure), render nested categories
                          if (isSubCategoryObject) {
                            return (
                              <div key={subCategory} style={{ marginLeft: "20px", marginBottom: "8px" }}>
                                {/* Sub-category header */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px 4px",
                                    cursor: "pointer"
                                  }}
                                  onClick={() => toggleCategory(categoryPath)}
                                >
                                  <div style={{
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    backgroundColor: "#156372",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0
                                  }}>
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 12 12"
                                      fill="none"
                                    >
                                      <path
                                        d="M3 6h6"
                                        stroke="white"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                      />
                                      {!isSubExpanded && (
                                        <path
                                          d="M6 3v6"
                                          stroke="white"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                        />
                                      )}
                                    </svg>
                                  </div>
                                  <div style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: "#156372"
                                  }}></div>
                                  <span style={{
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    color: "#111827"
                                  }}>
                                    {subCategory}
                                  </span>
                                </div>

                                {/* Nested sub-categories (3rd level) */}
                                {isSubExpanded && Object.keys(subCategoryData).map(nestedCategory => {
                                  const nestedData = subCategoryData[nestedCategory];
                                  const isNestedObject = typeof nestedData === 'object' && !Array.isArray(nestedData);
                                  const nestedPath = `${categoryPath}:${nestedCategory}`;
                                  const isNestedExpanded = expandedCategories[nestedPath] !== false;

                                  if (isNestedObject) {
                                    // 4th level - render nested structure
                                    return (
                                      <div key={nestedCategory} style={{ marginLeft: "20px", marginBottom: "8px" }}>
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "8px 4px",
                                            cursor: "pointer"
                                          }}
                                          onClick={() => toggleCategory(nestedPath)}
                                        >
                                          <div style={{
                                            width: "20px",
                                            height: "20px",
                                            borderRadius: "50%",
                                            backgroundColor: "#156372",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0
                                          }}>
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                              <path d="M3 6h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                                              {!isNestedExpanded && (
                                                <path d="M6 3v6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                                              )}
                                            </svg>
                                          </div>
                                          <div style={{
                                            width: "6px",
                                            height: "6px",
                                            borderRadius: "50%",
                                            backgroundColor: "#156372"
                                          }}></div>
                                          <span style={{
                                            fontSize: "14px",
                                            fontWeight: "600",
                                            color: "#111827"
                                          }}>
                                            {nestedCategory}
                                          </span>
                                        </div>

                                        {/* Accounts at 4th level */}
                                        {isNestedExpanded && Array.isArray(nestedData) && (
                                          nestedData
                                            .filter(acc => {
                                              if (accountSearchTerm === "") return true;
                                              return acc.accountName?.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
                                                acc.accountCode?.toLowerCase().includes(accountSearchTerm.toLowerCase());
                                            })
                                            .map(acc => {
                                              const isSelected = modalSelectedAccounts.includes(acc.accountName);
                                              return (
                                                <div
                                                  key={acc.accountName || acc.accountCode}
                                                  style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    padding: "8px 12px",
                                                    paddingLeft: "64px",
                                                    fontSize: "14px",
                                                    color: "#111827",
                                                    cursor: "pointer",
                                                    backgroundColor: isSelected ? "#f3f4f6" : "transparent",
                                                    borderRadius: "4px"
                                                  }}
                                                  onClick={() => handleToggleAccount(acc.accountName)}
                                                  onMouseEnter={(e) => {
                                                    if (!isSelected) {
                                                      e.currentTarget.style.backgroundColor = "#f9fafb";
                                                    }
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    if (!isSelected) {
                                                      e.currentTarget.style.backgroundColor = "transparent";
                                                    }
                                                  }}
                                                >
                                                  <span>{acc.accountName || acc.accountCode}</span>
                                                  {isSelected && (
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                      <path
                                                        d="M13 4l-6 6-3-3"
                                                        stroke="#156372"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                      />
                                                    </svg>
                                                  )}
                                                </div>
                                              );
                                            })
                                        )}
                                      </div>
                                    );
                                  } else {
                                    // 3rd level accounts
                                    const accounts = Array.isArray(nestedData) ? nestedData : [];
                                    const filteredAccounts = accounts.filter(acc => {
                                      if (accountSearchTerm === "") return true;
                                      return acc.accountName?.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
                                        acc.accountCode?.toLowerCase().includes(accountSearchTerm.toLowerCase());
                                    });

                                    return (
                                      <div key={nestedCategory} style={{ marginLeft: "20px", marginBottom: "8px" }}>
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "8px 4px",
                                            cursor: "pointer"
                                          }}
                                          onClick={() => toggleCategory(nestedPath)}
                                        >
                                          <div style={{
                                            width: "20px",
                                            height: "20px",
                                            borderRadius: "50%",
                                            backgroundColor: "#156372",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0
                                          }}>
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                              <path d="M3 6h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                                              {!isNestedExpanded && (
                                                <path d="M6 3v6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                                              )}
                                            </svg>
                                          </div>
                                          <div style={{
                                            width: "6px",
                                            height: "6px",
                                            borderRadius: "50%",
                                            backgroundColor: "#156372"
                                          }}></div>
                                          <span style={{
                                            fontSize: "14px",
                                            fontWeight: "600",
                                            color: "#111827"
                                          }}>
                                            {nestedCategory}
                                          </span>
                                        </div>

                                        {isNestedExpanded && (
                                          filteredAccounts.map(acc => {
                                            const isSelected = modalSelectedAccounts.includes(acc.accountName);
                                            return (
                                              <div
                                                key={acc.accountName || acc.accountCode}
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "space-between",
                                                  padding: "8px 12px",
                                                  paddingLeft: "44px",
                                                  fontSize: "14px",
                                                  color: "#111827",
                                                  cursor: "pointer",
                                                  backgroundColor: isSelected ? "#f3f4f6" : "transparent",
                                                  borderRadius: "4px"
                                                }}
                                                onClick={() => handleToggleAccount(acc.accountName)}
                                                onMouseEnter={(e) => {
                                                  if (!isSelected) {
                                                    e.currentTarget.style.backgroundColor = "#f9fafb";
                                                  }
                                                }}
                                                onMouseLeave={(e) => {
                                                  if (!isSelected) {
                                                    e.currentTarget.style.backgroundColor = "transparent";
                                                  }
                                                }}
                                              >
                                                <span>{acc.accountName || acc.accountCode}</span>
                                                {isSelected && (
                                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path
                                                      d="M13 4l-6 6-3-3"
                                                      stroke="#156372"
                                                      strokeWidth="2"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                    />
                                                  </svg>
                                                )}
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            );
                          } else {
                            // Direct accounts array (2-level structure)
                            const allSubAccounts = Array.isArray(subCategoryData) ? subCategoryData : [];
                            const subAccounts = allSubAccounts.filter(acc => {
                              if (accountSearchTerm === "") return true;
                              return acc.accountName?.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
                                acc.accountCode?.toLowerCase().includes(accountSearchTerm.toLowerCase());
                            });

                            return (
                              <div key={subCategory} style={{ marginLeft: "20px", marginBottom: "8px" }}>
                                {/* Sub-category */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px 4px",
                                    cursor: "pointer"
                                  }}
                                  onClick={() => toggleCategory(categoryPath)}
                                >
                                  <div style={{
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    backgroundColor: "#156372",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0
                                  }}>
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 12 12"
                                      fill="none"
                                    >
                                      <path
                                        d="M3 6h6"
                                        stroke="white"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                      />
                                      {!isSubExpanded && (
                                        <path
                                          d="M6 3v6"
                                          stroke="white"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                        />
                                      )}
                                    </svg>
                                  </div>
                                  <div style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: "#156372"
                                  }}></div>
                                  <span style={{
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    color: "#111827"
                                  }}>
                                    {subCategory}
                                  </span>
                                </div>

                                {/* Individual Accounts */}
                                {isSubExpanded && (
                                  subAccounts.map(acc => {
                                    const isSelected = modalSelectedAccounts.includes(acc.accountName);
                                    return (
                                      <div
                                        key={acc.accountName || acc.accountCode}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          padding: "8px 12px",
                                          paddingLeft: "44px",
                                          fontSize: "14px",
                                          color: "#111827",
                                          cursor: "pointer",
                                          backgroundColor: isSelected ? "#f3f4f6" : "transparent",
                                          borderRadius: "4px"
                                        }}
                                        onClick={() => handleToggleAccount(acc.accountName)}
                                        onMouseEnter={(e) => {
                                          if (!isSelected) {
                                            e.currentTarget.style.backgroundColor = "#f9fafb";
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!isSelected) {
                                            e.currentTarget.style.backgroundColor = "transparent";
                                          }
                                        }}
                                      >
                                        <span>{acc.accountName || acc.accountCode}</span>
                                        {isSelected && (
                                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path
                                              d="M13 4l-6 6-3-3"
                                              stroke="#156372"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            />
                                          </svg>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            );
                          }
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                display: "flex",
                justifyContent: "flex-start",
                gap: "12px",
                padding: "16px 24px",
                borderTop: "1px solid #e5e7eb"
              }}>
                <button
                  onClick={handleUpdateAccounts}
                  style={{
                    padding: "8px 20px",
                    backgroundColor: "#156372",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer"
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = "#0D4A52"}
                  onMouseOut={(e) => e.target.style.backgroundColor = "#156372"}
                >
                  Update
                </button>
                <button
                  onClick={handleCloseModal}
                  style={{
                    padding: "8px 20px",
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    color: "#6b7280"
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#f9fafb";
                    e.target.style.borderColor = "#d1d5db";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "white";
                    e.target.style.borderColor = "#e5e7eb";
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NewBudget;

