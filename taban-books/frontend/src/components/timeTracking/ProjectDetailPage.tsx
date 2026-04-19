import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectsAPI, timeEntriesAPI } from "../../services/api";
import toast from "react-hot-toast";
import { useCurrency } from "../../hooks/useCurrency";
import NewLogEntryForm from "./NewLogEntryForm";
import { ChevronDown, ChevronUp, ChevronRight, Search, ArrowUpDown, X, MessageSquare, Briefcase, User, Calendar, Plus, Paperclip, Minus, Check, Trash2, MoreVertical, Edit3 } from "lucide-react";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { code: rawCurrencyCode } = useCurrency();
  const baseCurrencyCode = rawCurrencyCode ? rawCurrencyCode.split(' ')[0].substring(0, 3).toUpperCase() : "KES";
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [showLogEntryForm, setShowLogEntryForm] = useState(false);
  const [showTransactionDropdown, setShowTransactionDropdown] = useState(false);
  const [hoveredTransaction, setHoveredTransaction] = useState(null);
  const transactionDropdownRef = useRef(null);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [hoveredMoreOption, setHoveredMoreOption] = useState(null);
  const moreDropdownRef = useRef(null);
  const sortDataDropdownRef = useRef(null);
  const itemNameDropdownRef = useRef(null);
  const itemDescriptionDropdownRef = useRef(null);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [showInvoicePreferences, setShowInvoicePreferences] = useState(false);
  const [showProjectInvoiceInfo, setShowProjectInvoiceInfo] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneFormData, setCloneFormData] = useState({
    projectName: '',
    description: ''
  });
  const [invoiceInfoData, setInvoiceInfoData] = useState({
    sortData: "Single Line For The Project",
    itemName: ["Project Name"],
    itemDescription: ["Project Description"],
    tax: "",
    includeUnbilledExpenses: false
  });
  const [itemNameDropdownOpen, setItemNameDropdownOpen] = useState(false);
  const [itemDescriptionDropdownOpen, setItemDescriptionDropdownOpen] = useState(false);
  const [taxDropdownOpen, setTaxDropdownOpen] = useState(false);
  const [sortDataDropdownOpen, setSortDataDropdownOpen] = useState(false);
  const [sortDataSearch, setSortDataSearch] = useState('');
  const [itemNameSearch, setItemNameSearch] = useState('');
  const [itemDescriptionSearch, setItemDescriptionSearch] = useState('');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [showNewBudgetForm, setShowNewBudgetForm] = useState(false);
  const [budgetFormData, setBudgetFormData] = useState({
    name: "",
    fiscalYear: "Jul 2025 - Jun 2026",
    budgetPeriod: "Monthly",
    includeAssetLiabilityEquity: false
  });
  const [incomeAccounts, setIncomeAccounts] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [hoveredEntryId, setHoveredEntryId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [expenses, setExpenses] = useState([]);
  const [bills, setBills] = useState([]);
  const [expensesExpanded, setExpensesExpanded] = useState(true);
  const [billsExpanded, setBillsExpanded] = useState(false);
  const [purchaseOrdersExpanded, setPurchaseOrdersExpanded] = useState(false);
  const [vendorCreditsExpanded, setVendorCreditsExpanded] = useState(false);
  const [activePurchaseSection, setActivePurchaseSection] = useState("Expenses"); // Track which section is active
  const [invoicesExpanded, setInvoicesExpanded] = useState(true);
  const [quotesExpanded, setQuotesExpanded] = useState(false);
  const [creditNotesExpanded, setCreditNotesExpanded] = useState(false);
  const [activeSalesSection, setActiveSalesSection] = useState("Invoices"); // Track which section is active
  const [invoicesStatusFilter, setInvoicesStatusFilter] = useState("All");
  const [expensesStatusFilter, setExpensesStatusFilter] = useState("All");
  const [billsStatusFilter, setBillsStatusFilter] = useState("All");
  const [expensesSearch, setExpensesSearch] = useState("");
  const [billsSearch, setBillsSearch] = useState("");
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [hoursView, setHoursView] = useState("Project Hours"); // "Project Hours" or "Profitability Summary"
  const [dateRange, setDateRange] = useState("This Week");
  const [showConfigureAccountsModal, setShowConfigureAccountsModal] = useState(false);
  const [configureAccountsType, setConfigureAccountsType] = useState(null); // "income" or "expense"
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [accountSearchTerm, setAccountSearchTerm] = useState("");
  const [expandedAccountCategories, setExpandedAccountCategories] = useState({});

  // Close dropdowns when modal closes
  useEffect(() => {
    if (!showProjectInvoiceInfo) {
      setItemNameDropdownOpen(false);
      setItemDescriptionDropdownOpen(false);
      setTaxDropdownOpen(false);
      setSortDataDropdownOpen(false);
      setSortDataSearch('');
      setItemNameSearch('');
      setItemDescriptionSearch('');
    }
  }, [showProjectInvoiceInfo]);

  // Load comments for this project
  useEffect(() => {
    if (projectId) {
      const allComments = JSON.parse(localStorage.getItem('projectComments') || '{}');
      const projectComments = allComments[projectId] || [];
      setComments(projectComments);
    }
  }, [projectId]);

  // Load time entries for this project
  useEffect(() => {
    const loadTimeEntries = async () => {
      if (!project || !projectId) return;

      try {
        const response = await timeEntriesAPI.getByProject(projectId);
        const data = Array.isArray(response) ? response : (response?.data || []);

        // Transform database entries to match frontend format
        const transformedEntries = data.map(entry => ({
          id: entry._id || entry.id,
          projectId: entry.project?._id || entry.projectId,
          projectName: entry.project?.name || entry.projectName,
          userId: entry.user?._id || entry.userId,
          userName: entry.user?.name || entry.userName,
          date: entry.date ? new Date(entry.date).toLocaleDateString() : '--',
          hours: entry.hours || 0,
          minutes: entry.minutes || 0,
          timeSpent: entry.hours ? `${entry.hours}h ${entry.minutes || 0}m` : '0h',
          description: entry.description || '',
          task: entry.task || entry.taskName || '',
          taskName: entry.task || entry.taskName || '',
          billable: entry.billable !== undefined ? entry.billable : true,
          notes: entry.description || entry.notes || '',
          billingStatus: entry.billingStatus || 'Unbilled',
        }));

        setTimeEntries(transformedEntries);
      } catch (error) {
        console.error("Error loading time entries:", error);
        toast.error("Failed to load time entries");
        setTimeEntries([]);
      }
    };

    if (project && projectId) {
      loadTimeEntries();
    }

    // Listen for time entry updates
    const handleTimeEntryUpdate = () => {
      loadTimeEntries();
    };
    window.addEventListener('timeEntryUpdated', handleTimeEntryUpdate);

    return () => {
      window.removeEventListener('timeEntryUpdated', handleTimeEntryUpdate);
    };
  }, [project, projectId]);

  // Load expenses and bills for this project
  useEffect(() => {
    const loadPurchases = () => {
      if (!project) return;

      const projectName = project.name || project.projectName || '';

      // Load expenses
      const allExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      const projectExpenses = allExpenses.filter(expense =>
        expense.customerName === projectName ||
        expense.projectName === projectName ||
        expense.projectId === projectId
      );
      setExpenses(projectExpenses);

      // Load bills
      const allBills = JSON.parse(localStorage.getItem('bills') || '[]');
      const projectBills = allBills.filter(bill =>
        bill.customerName === projectName ||
        bill.projectName === projectName ||
        bill.projectId === projectId
      );
      setBills(projectBills);
    };

    if (project) {
      loadPurchases();
    }

    // Listen for updates
    const handleExpensesUpdate = () => {
      loadPurchases();
    };
    const handleBillsUpdate = () => {
      loadPurchases();
    };

    window.addEventListener('expensesUpdated', handleExpensesUpdate);
    window.addEventListener('billsUpdated', handleBillsUpdate);
    window.addEventListener('storage', handleExpensesUpdate);

    return () => {
      window.removeEventListener('expensesUpdated', handleExpensesUpdate);
      window.removeEventListener('billsUpdated', handleBillsUpdate);
      window.removeEventListener('storage', handleExpensesUpdate);
    };
  }, [project, projectId]);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const response = await projectsAPI.getById(projectId);
        // Handle response format: { success: true, data: {...} } or direct object
        const projectData = response?.data || response;

        if (!projectData) {
          toast.error("Project not found");
          navigate('/time-tracking');
          return;
        }

        // Transform database project to match frontend format
        const transformedProject = {
          id: projectData._id || projectData.id,
          projectName: projectData.name || projectData.projectName,
          projectNumber: projectData.projectNumber || projectData.id,
          customerName: projectData.customer?.name || projectData.customerName,
          customerId: projectData.customer?._id || projectData.customerId,
          description: projectData.description || '',
          startDate: projectData.startDate || '',
          endDate: projectData.endDate || '',
          status: projectData.status || 'planning',
          budget: projectData.budget || 0,
          currency: projectData.currency || 'USD',
          billable: projectData.billable !== undefined ? projectData.billable : true,
          billingRate: projectData.billingRate || 0,
          billingMethod: projectData.billingMethod || 'hourly',
          assignedTo: projectData.assignedTo || [],
          tags: projectData.tags || [],
          tasks: projectData.tasks || [],
          users: projectData.assignedTo || [],
          isActive: projectData.status !== 'cancelled' && projectData.status !== 'completed',
          ...projectData // Keep all other fields
        };

        setProject(transformedProject);
      } catch (error) {
        console.error("Error loading project:", error);
        toast.error("Failed to load project: " + (error.message || "Unknown error"));
        navigate('/time-tracking');
      }
    };

    loadProject();

    // Reload project when updated from other components
    const handleProjectUpdate = () => {
      loadProject();
    };

    window.addEventListener('projectUpdated', handleProjectUpdate);

    // Also check on focus (when returning from edit page)
    const handleFocus = () => {
      loadProject();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('projectUpdated', handleProjectUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, [projectId, navigate]);

  // Handle click outside transaction dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (transactionDropdownRef.current && !transactionDropdownRef.current.contains(event.target)) {
        setShowTransactionDropdown(false);
        setHoveredTransaction(null);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setShowMoreDropdown(false);
        setHoveredMoreOption(null);
      }
      if (sortDataDropdownRef.current && !sortDataDropdownRef.current.contains(event.target)) {
        setSortDataDropdownOpen(false);
        setSortDataSearch('');
      }
      if (itemNameDropdownRef.current && !itemNameDropdownRef.current.contains(event.target)) {
        setItemNameDropdownOpen(false);
        setItemNameSearch('');
      }
      if (itemDescriptionDropdownRef.current && !itemDescriptionDropdownRef.current.contains(event.target)) {
        setItemDescriptionDropdownOpen(false);
        setItemDescriptionSearch('');
      }
    }

    if (showTransactionDropdown || showMoreDropdown || sortDataDropdownOpen || itemNameDropdownOpen || itemDescriptionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTransactionDropdown, showMoreDropdown, sortDataDropdownOpen, itemNameDropdownOpen, itemDescriptionDropdownOpen]);

  // Handle Esc key to clear selection
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape" && selectedEntries.length > 0) {
        setSelectedEntries([]);
      }
    };
    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [selectedEntries.length]);

  // Helper function to parse time string to minutes
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const time = timeStr.trim();
    if (time.includes(":")) {
      const [hours, minutes] = time.split(":").map(Number);
      return (hours || 0) * 60 + (minutes || 0);
    } else if (time.includes("h") || time.includes("m")) {
      const hoursMatch = time.match(/(\d+)h/);
      const minutesMatch = time.match(/(\d+)m/);
      return (hoursMatch ? parseInt(hoursMatch[1]) : 0) * 60 + (minutesMatch ? parseInt(minutesMatch[1]) : 0);
    } else {
      const decimal = parseFloat(time);
      if (!isNaN(decimal)) {
        return Math.floor(decimal) * 60 + (decimal % 1) * 60;
      }
    }
    return 0;
  };

  // Helper function to format minutes to HH:MM
  const formatMinutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Calculate hours from time entries
  const calculateHours = () => {
    let loggedMinutes = 0;
    let billableMinutes = 0;
    let billedMinutes = 0;
    let unbilledMinutes = 0;

    timeEntries.forEach(entry => {
      const minutes = parseTimeToMinutes(entry.timeSpent);
      loggedMinutes += minutes;

      if (entry.billable) {
        billableMinutes += minutes;
        if (entry.billingStatus === "Invoiced" || entry.billingStatus === "Billed") {
          billedMinutes += minutes;
        } else {
          unbilledMinutes += minutes;
        }
      }
    });

    return {
      logged: formatMinutesToTime(loggedMinutes),
      billable: formatMinutesToTime(billableMinutes),
      billed: formatMinutesToTime(billedMinutes),
      unbilled: formatMinutesToTime(unbilledMinutes),
      loggedMinutes,
      billableMinutes,
      billedMinutes,
      unbilledMinutes
    };
  };

  // Calculate hours for a specific user
  const calculateUserHours = (userEmail) => {
    let loggedMinutes = 0;
    let billedMinutes = 0;
    let unbilledMinutes = 0;

    timeEntries.forEach(entry => {
      if (entry.user === userEmail || entry.userEmail === userEmail) {
        const minutes = parseTimeToMinutes(entry.timeSpent);
        loggedMinutes += minutes;

        if (entry.billable) {
          if (entry.billingStatus === "Invoiced" || entry.billingStatus === "Billed") {
            billedMinutes += minutes;
          } else {
            unbilledMinutes += minutes;
          }
        }
      }
    });

    return {
      logged: formatMinutesToTime(loggedMinutes),
      billed: formatMinutesToTime(billedMinutes),
      unbilled: formatMinutesToTime(unbilledMinutes)
    };
  };

  // Calculate hours for a specific task
  const calculateTaskHours = (taskName) => {
    let loggedMinutes = 0;
    let billedMinutes = 0;
    let unbilledMinutes = 0;

    timeEntries.forEach(entry => {
      if (entry.taskName === taskName) {
        const minutes = parseTimeToMinutes(entry.timeSpent);
        loggedMinutes += minutes;

        if (entry.billable) {
          if (entry.billingStatus === "Invoiced" || entry.billingStatus === "Billed") {
            billedMinutes += minutes;
          } else {
            unbilledMinutes += minutes;
          }
        }
      }
    });

    return {
      logged: formatMinutesToTime(loggedMinutes),
      billed: formatMinutesToTime(billedMinutes),
      unbilled: formatMinutesToTime(unbilledMinutes)
    };
  };

  const hoursData = calculateHours();

  if (!project) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Project not found</p>
        <button onClick={() => navigate("/time-tracking/projects")}>
          Back to Projects
        </button>
      </div>
    );
  }

  const tabs = ["Overview", "Timesheet", "Purchases", "Sales", "Budget Configuration", "Journals"];

  return (
    <div style={{ width: "100%", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Top Navigation Bar */}
      <div style={{
        backgroundColor: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "16px 24px"
      }}>
        <div style={{
          marginBottom: "16px"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => navigate("/time-tracking/projects")}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                ←
              </button>
              <span style={{ fontSize: "16px", fontWeight: "500", color: "#333" }}>
                taban
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
              <button
                onClick={() => navigate(`/time-tracking/projects/${projectId}/edit`)}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Edit
              </button>
              <button
                onClick={() => setShowLogEntryForm(true)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: "#156372",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
              >
                Log Time
              </button>
              <div style={{ position: "relative" }} ref={transactionDropdownRef}>
                <button
                  onMouseEnter={() => setShowTransactionDropdown(true)}
                  onMouseLeave={() => {
                    // Delay to allow moving to dropdown
                    setTimeout(() => {
                      if (!transactionDropdownRef.current?.matches(':hover')) {
                        setShowTransactionDropdown(false);
                      }
                    }, 100);
                  }}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  New Transaction
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 4.5l3 3 3-3" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Transaction Dropdown */}
                {showTransactionDropdown && (
                  <div
                    onMouseEnter={() => setShowTransactionDropdown(true)}
                    onMouseLeave={() => {
                      setShowTransactionDropdown(false);
                      setHoveredTransaction(null);
                    }}
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: "4px",
                      backgroundColor: "white",
                      borderRadius: "6px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      minWidth: "220px",
                      maxHeight: "500px",
                      zIndex: 1000,
                      border: "1px solid #e5e7eb",
                      overflowY: "auto"
                    }}
                  >
                    {/* SALES Section */}
                    <div style={{
                      padding: "8px 0"
                    }}>
                      <div style={{
                        padding: "8px 16px 4px 16px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        SALES
                      </div>
                      {['Create Quote', 'Create Invoice', 'Create Recurring Invoice', 'Create Credit Note'].map((option) => (
                        <div
                          key={option}
                          onMouseEnter={() => setHoveredTransaction(option)}
                          onMouseLeave={() => setHoveredTransaction(null)}
                          onClick={() => {
                            setShowTransactionDropdown(false);
                            // Navigate to the appropriate form page
                            switch (option) {
                              case 'Create Quote':
                                navigate('/sales/quotes/new');
                                break;
                              case 'Create Invoice':
                                navigate('/sales/invoices/new');
                                break;
                              case 'Create Recurring Invoice':
                                navigate('/sales/recurring-invoices/new');
                                break;
                              case 'Create Credit Note':
                                navigate('/sales/credit-notes/new');
                                break;
                              default:
                                break;
                            }
                          }}
                          style={{
                            padding: "10px 16px",
                            fontSize: "14px",
                            color: hoveredTransaction === option ? "white" : "#1f2937",
                            cursor: "pointer",
                            backgroundColor: hoveredTransaction === option ? "#156372" : "transparent",
                            border: hoveredTransaction === option ? "1px solid #156372" : "1px solid transparent",
                            margin: hoveredTransaction === option ? "0" : "1px 0"
                          }}
                        >
                          {option}
                        </div>
                      ))}
                    </div>

                    {/* Divider */}
                    <div style={{
                      height: "1px",
                      backgroundColor: "#e5e7eb",
                      margin: "4px 0"
                    }}></div>

                    {/* PURCHASES Section */}
                    <div style={{
                      padding: "8px 0"
                    }}>
                      <div style={{
                        padding: "8px 16px 4px 16px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        PURCHASES
                      </div>
                      {['Create Expense', 'Create Recurring Expense', 'Create Bill', 'Create Vendor Credits'].map((option) => (
                        <div
                          key={option}
                          onMouseEnter={() => setHoveredTransaction(option)}
                          onMouseLeave={() => setHoveredTransaction(null)}
                          onClick={() => {
                            setShowTransactionDropdown(false);
                            // Navigate to the appropriate form page
                            switch (option) {
                              case 'Create Expense':
                                navigate('/purchases/expenses/new');
                                break;
                              case 'Create Recurring Expense':
                                navigate('/purchases/recurring-expenses/new');
                                break;
                              case 'Create Bill':
                                navigate('/purchases/bills/new');
                                break;
                              case 'Create Vendor Credits':
                                navigate('/purchases/vendor-credits/new');
                                break;
                              default:
                                break;
                            }
                          }}
                          style={{
                            padding: "10px 16px",
                            fontSize: "14px",
                            color: hoveredTransaction === option ? "white" : "#1f2937",
                            cursor: "pointer",
                            backgroundColor: hoveredTransaction === option ? "#156372" : "transparent",
                            border: hoveredTransaction === option ? "1px solid #156372" : "1px solid transparent",
                            margin: hoveredTransaction === option ? "0" : "1px 0"
                          }}
                        >
                          {option}
                        </div>
                      ))}
                    </div>

                    {/* Divider */}
                    <div style={{
                      height: "1px",
                      backgroundColor: "#e5e7eb",
                      margin: "4px 0"
                    }}></div>

                    {/* Create Manual Journal */}
                    <div
                      onMouseEnter={() => setHoveredTransaction('Create Manual Journal')}
                      onMouseLeave={() => setHoveredTransaction(null)}
                      onClick={() => {
                        setShowTransactionDropdown(false);
                        navigate('/accountant/manual-journals/new');
                      }}
                      style={{
                        padding: "10px 16px",
                        fontSize: "14px",
                        color: hoveredTransaction === 'Create Manual Journal' ? "white" : "#1f2937",
                        cursor: "pointer",
                        backgroundColor: hoveredTransaction === 'Create Manual Journal' ? "#156372" : "transparent",
                        border: hoveredTransaction === 'Create Manual Journal' ? "1px solid #156372" : "1px solid transparent",
                        margin: hoveredTransaction === 'Create Manual Journal' ? "0" : "1px 0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}
                    >
                      <span>Create Manual Journal</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 4.5l3 3 3-3" stroke={hoveredTransaction === 'Create Manual Journal' ? "white" : "#666"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowAttachmentsModal(true)}
                style={{
                  width: "36px",
                  height: "36px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#666"
                }}
              >
                <Paperclip size={18} />
              </button>
              <div style={{ position: "relative" }} ref={moreDropdownRef}>
                <button
                  onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  More
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 4.5l3 3 3-3" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* More Dropdown Menu */}
                {showMoreDropdown && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "4px",
                    backgroundColor: "white",
                    borderRadius: "6px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    minWidth: "200px",
                    zIndex: 1000,
                    border: "1px solid #e5e7eb",
                    overflow: "hidden"
                  }}>
                    {/* Invoice Preferences */}
                    <div
                      onMouseEnter={() => setHoveredMoreOption('Invoice Preferences')}
                      onMouseLeave={() => setHoveredMoreOption(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreDropdown(false);
                        setShowProjectInvoiceInfo(true);
                      }}
                      style={{
                        padding: "10px 16px",
                        fontSize: "14px",
                        color: hoveredMoreOption === 'Invoice Preferences' ? "white" : "#1f2937",
                        cursor: "pointer",
                        backgroundColor: hoveredMoreOption === 'Invoice Preferences' ? "#156372" : "transparent"
                      }}
                    >
                      Invoice Preferences
                    </div>

                    {/* Mark as Inactive */}
                    <div
                      onMouseEnter={() => setHoveredMoreOption('Mark as Inactive')}
                      onMouseLeave={() => setHoveredMoreOption(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreDropdown(false);
                        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
                        const updatedProjects = projects.map(p =>
                          p.id === projectId ? { ...p, isActive: false } : p
                        );
                        localStorage.setItem('projects', JSON.stringify(updatedProjects));
                        window.dispatchEvent(new Event('projectUpdated'));
                        setProject({ ...project, isActive: false });
                        alert('Project marked as inactive');
                      }}
                      style={{
                        padding: "10px 16px",
                        fontSize: "14px",
                        color: hoveredMoreOption === 'Mark as Inactive' ? "white" : "#1f2937",
                        cursor: "pointer",
                        backgroundColor: hoveredMoreOption === 'Mark as Inactive' ? "#156372" : "transparent"
                      }}
                    >
                      Mark as Inactive
                    </div>

                    {/* Clone */}
                    <div
                      onMouseEnter={() => setHoveredMoreOption('Clone')}
                      onMouseLeave={() => setHoveredMoreOption(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreDropdown(false);
                        // Initialize clone form with project data
                        if (project) {
                          setCloneFormData({
                            projectName: `${project.projectName || project.name} (Copy)`,
                            description: project.description || ''
                          });
                        }
                        setShowCloneModal(true);
                      }}
                      style={{
                        padding: "10px 16px",
                        fontSize: "14px",
                        color: hoveredMoreOption === 'Clone' ? "white" : "#1f2937",
                        cursor: "pointer",
                        backgroundColor: hoveredMoreOption === 'Clone' ? "#156372" : "transparent"
                      }}
                    >
                      Clone
                    </div>

                    {/* Add Project Task */}
                    <div
                      onMouseEnter={() => setHoveredMoreOption('Add Project Task')}
                      onMouseLeave={() => setHoveredMoreOption(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreDropdown(false);
                        setShowAddTaskModal(true);
                      }}
                      style={{
                        padding: "10px 16px",
                        fontSize: "14px",
                        color: hoveredMoreOption === 'Add Project Task' ? "white" : "#1f2937",
                        cursor: "pointer",
                        backgroundColor: hoveredMoreOption === 'Add Project Task' ? "#156372" : "transparent"
                      }}
                    >
                      Add Project Task
                    </div>

                    {/* Add User */}
                    <div
                      onMouseEnter={() => setHoveredMoreOption('Add User')}
                      onMouseLeave={() => setHoveredMoreOption(null)}
                      onClick={() => {
                        setShowMoreDropdown(false);
                        setShowAddUserModal(true);
                      }}
                      style={{
                        padding: "10px 16px",
                        fontSize: "14px",
                        color: hoveredMoreOption === 'Add User' ? "white" : "#1f2937",
                        cursor: "pointer",
                        backgroundColor: hoveredMoreOption === 'Add User' ? "#156372" : "transparent"
                      }}
                    >
                      Add User
                    </div>

                    {/* Delete */}
                    <div
                      onMouseEnter={() => setHoveredMoreOption('Delete')}
                      onMouseLeave={() => setHoveredMoreOption(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreDropdown(false);
                        if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                          const projects = JSON.parse(localStorage.getItem('projects') || '[]');
                          const updatedProjects = projects.filter(p => p.id !== projectId);
                          localStorage.setItem('projects', JSON.stringify(updatedProjects));
                          window.dispatchEvent(new Event('projectUpdated'));
                          navigate('/time-tracking/projects');
                        }
                      }}
                      style={{
                        padding: "10px 16px",
                        fontSize: "14px",
                        color: hoveredMoreOption === 'Delete' ? "white" : "#1f2937",
                        cursor: "pointer",
                        backgroundColor: hoveredMoreOption === 'Delete' ? "#156372" : "transparent"
                      }}
                    >
                      Delete
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate("/time-tracking/projects")}
                style={{
                  padding: "8px",
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  fontSize: "20px",
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <div style={{ display: "flex", gap: "0px" }}>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderBottom: activeTab === tab ? "2px solid #156372" : "2px solid transparent",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: activeTab === tab ? "600" : "400",
                    color: activeTab === tab ? "#156372" : "#666"
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={() => setActiveTab("Comments")}
              style={{
                padding: "8px 16px",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: activeTab === "Comments" ? "#156372" : "#666",
                borderBottom: activeTab === "Comments" ? "2px solid #156372" : "2px solid transparent",
                fontWeight: activeTab === "Comments" ? "600" : "400"
              }}
            >
              <MessageSquare size={16} />
              Comments
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "24px", padding: "24px" }}>
        {/* Left Sidebar - Project Details */}
        <div style={{
          width: "300px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          padding: "24px",
          height: "fit-content",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          {/* Project Header */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "4px" }}>
              <div style={{ marginTop: "4px" }}>
                <Briefcase size={20} style={{ color: "#4b5563" }} />
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "600", color: "#1f2937", lineHeight: "1.2" }}>
                  {project.projectName || "taban"}
                </div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
                  {project.customerName || "fsdv"}
                </div>
              </div>
            </div>
          </div>

          {/* User/Client Link */}
          <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "24px",
              display: "flex",
              justifyContent: "center"
            }}>
              <User size={20} style={{ color: "#4b5563" }} />
            </div>
            <div>
              <span style={{ color: "#2563eb", fontWeight: "500", fontSize: "15px", cursor: "pointer" }}>
                {project.customerName || "KOWNI"}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", backgroundColor: "#e5e7eb", margin: "0 0 24px 0" }}></div>

          {/* Details List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Project Code */}
            <div>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>
                Project Code
              </div>
              <div style={{ fontSize: "14px", color: "#374151", fontWeight: "400" }}>
                {project.projectCode || "afv"}
              </div>
            </div>

            {/* Billing Method */}
            <div>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>
                Billing Method
              </div>
              <div style={{ fontSize: "14px", color: "#374151", fontWeight: "400" }}>
                Hourly Rate Per Task
              </div>
            </div>

            {/* Watchlist */}
            <div>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>
                Add to dashboard watchlist.
              </div>
              <div style={{ fontSize: "13px" }}>
                <span style={{ color: "#374151" }}>Enabled</span>
                <span style={{ color: "#9ca3af", margin: "0 6px" }}>-</span>
                <span style={{ color: "#2563eb", cursor: "pointer" }}>Disable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1 }}>
          {activeTab === "Overview" && (
            <>
              {/* Project Hours & Summary */}
              <div style={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                padding: "24px",
                marginBottom: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px"
                }}>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setHoursView("Project Hours")}
                        style={{
                          padding: "0 4px 8px 4px",
                          border: "none",
                          borderBottom: hoursView === "Project Hours" ? "2px solid #156372" : "2px solid transparent",
                          backgroundColor: "transparent",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: hoursView === "Project Hours" ? "600" : "400",
                          color: hoursView === "Project Hours" ? "#156372" : "#6b7280"
                        }}
                      >
                        Project Hours
                      </button>
                    </div>
                    <div style={{ width: "1px", height: "16px", backgroundColor: "#e5e7eb" }}></div>
                    <button
                      onClick={() => setHoursView("Profitability Summary")}
                      style={{
                        padding: "0 4px 8px 4px",
                        border: "none",
                        borderBottom: hoursView === "Profitability Summary" ? "2px solid #156372" : "2px solid transparent",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: hoursView === "Profitability Summary" ? "600" : "400",
                        color: hoursView === "Profitability Summary" ? "#156372" : "#6b7280"
                      }}
                    >
                      Profitability Summary
                    </button>
                  </div>
                  {hoursView === "Profitability Summary" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                      <span style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>{dateRange}</span>
                      <ChevronDown size={14} color="#6b7280" />
                      <Calendar size={14} color="#6b7280" style={{ marginLeft: "4px" }} />
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", color: "#6b7280" }}>This Fiscal Year</span>
                      <span style={{ fontSize: "13px", color: "#6b7280" }}>-</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                        <span style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>Cash</span>
                        <ChevronDown size={14} color="#6b7280" />
                      </div>
                    </div>
                  )}
                </div>

                {hoursView === "Profitability Summary" ? (
                  <>
                    {/* Profitability Summary - Line Chart */}
                    <div style={{
                      height: "300px",
                      position: "relative",
                      marginBottom: "24px"
                    }}>
                      <div style={{
                        height: "260px",
                        paddingLeft: "40px",
                        paddingRight: "20px",
                        borderBottom: "1px solid #e5e7eb",
                        position: "relative"
                      }}>
                        {/* Y-axis labels */}
                        <div style={{
                          position: "absolute",
                          left: "0",
                          top: "0",
                          bottom: "0",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: "#9ca3af",
                          paddingBottom: "10px",
                          width: "35px"
                        }}>
                          <span>5K</span>
                          <span>4K</span>
                          <span>3K</span>
                          <span>2K</span>
                          <span>1K</span>
                          <span>0</span>
                        </div>

                        {/* Line Chart Area */}
                        <div style={{
                          height: "100%",
                          paddingTop: "10px",
                          paddingBottom: "30px",
                          position: "relative",
                          marginLeft: "40px"
                        }}>
                          <svg
                            width="100%"
                            height="100%"
                            viewBox="0 0 600 230"
                            preserveAspectRatio="none"
                            style={{ position: "absolute", top: "10px", left: 0 }}
                          >
                            {/* Grid lines */}
                            {[0, 1, 2, 3, 4, 5].map(i => {
                              const y = (i / 5) * 230;
                              return (
                                <line
                                  key={i}
                                  x1="0"
                                  y1={y}
                                  x2="600"
                                  y2={y}
                                  stroke="#f3f4f6"
                                  strokeWidth="1"
                                />
                              );
                            })}
                            {/* Billable Hours line (light blue) - flat line at bottom (no data) */}
                            <polyline
                              points="0,230 100,230 200,230 300,230 400,230 500,230 600,230"
                              fill="none"
                              stroke="#93c5fd"
                              strokeWidth="2"
                            />
                            {/* Unbilled Hours line (yellow-orange) - flat line at bottom (no data) */}
                            <polyline
                              points="0,230 100,230 200,230 300,230 400,230 500,230 600,230"
                              fill="none"
                              stroke="#fb923c"
                              strokeWidth="2"
                            />
                          </svg>

                          {/* Date labels on X-axis */}
                          <div style={{
                            position: "absolute",
                            bottom: "-25px",
                            left: "0",
                            right: "40px",
                            display: "flex",
                            justifyContent: "space-between"
                          }}>
                            {['21 Dec', '22 Dec', '23 Dec', '24 Dec', '25 Dec', '26 Dec', '27 Dec'].map((date, i) => (
                              <span key={i} style={{ fontSize: "11px", color: "#9ca3af" }}>
                                {date}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Legend */}
                      <div style={{
                        display: "flex",
                        gap: "24px",
                        marginTop: "20px",
                        paddingLeft: "40px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "16px", height: "4px", backgroundColor: "#93c5fd", borderRadius: "2px" }}></div>
                          <span style={{ fontSize: "13px", color: "#374151" }}>Billable Hours</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "16px", height: "4px", backgroundColor: "#fb923c", borderRadius: "2px" }}></div>
                          <span style={{ fontSize: "13px", color: "#374151" }}>Unbilled Hours</span>
                        </div>
                      </div>
                    </div>

                    {/* Divider Line */}
                    <div style={{ height: "1px", backgroundColor: "#f3f4f6", margin: "0 -24px 24px -24px" }}></div>

                    {/* Summary Cards */}
                    <div style={{
                      display: "flex",
                      width: "100%",
                      gap: "24px"
                    }}>
                      {/* Logged Hours Card */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Logged Hours</div>
                        <div style={{ fontSize: "16px", fontWeight: "600", color: "#156372", marginBottom: "4px" }}>
                          {hoursData.logged}
                        </div>
                        <div style={{ fontSize: "14px", color: "#1f2937" }}>{baseCurrencyCode}0.00</div>
                      </div>

                      {/* Billable Hours Card */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Billable Hours</div>
                        <div style={{ fontSize: "16px", fontWeight: "600", color: "#156372", marginBottom: "4px" }}>
                          {hoursData.billable}
                        </div>
                        <div style={{ fontSize: "14px", color: "#1f2937" }}>{baseCurrencyCode}0.00</div>
                      </div>

                      {/* Billed Hours Card */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Billed Hours</div>
                        <div style={{ fontSize: "16px", fontWeight: "600", color: "#156372", marginBottom: "4px" }}>
                          {hoursData.billed}
                        </div>
                        <div style={{ fontSize: "14px", color: "#1f2937" }}>{baseCurrencyCode}0.00</div>
                      </div>

                      {/* Unbilled Hours Card */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Unbilled Hours</div>
                        <div style={{ fontSize: "16px", fontWeight: "600", color: "#156372", marginBottom: "4px" }}>
                          {hoursData.unbilled}
                        </div>
                        <div style={{ fontSize: "14px", color: "#1f2937" }}>{baseCurrencyCode}0.00</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Project Hours - Bar Chart */}
                    <div style={{
                      height: "300px",
                      position: "relative",
                      marginBottom: "24px"
                    }}>
                      <div style={{
                        display: "flex",
                        height: "260px",
                        alignItems: "flex-end",
                        justifyContent: "space-between",
                        paddingLeft: "40px",
                        paddingRight: "20px",
                        borderBottom: "1px solid #e5e7eb",
                        position: "relative"
                      }}>
                        {/* Y-axis labels */}
                        <div style={{
                          position: "absolute",
                          left: "0",
                          top: "0",
                          bottom: "0",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: "#9ca3af",
                          paddingBottom: "10px"
                        }}>
                          <span>5 K</span>
                          <span>4 K</span>
                          <span>3 K</span>
                          <span>2 K</span>
                          <span>1 K</span>
                          <span>0</span>
                        </div>

                        {/* Chart Bars - Mocking 12 months for "This Fiscal Year" look */}
                        {['Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'].map((month, i) => (
                          <div key={i} style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "6px",
                            flex: 1,
                            height: "100%",
                            justifyContent: "flex-end"
                          }}>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "100%" }}>
                              {/* Income Bar (Blue) */}
                              <div style={{
                                width: "8px",
                                height: i === 0 ? "40px" : "2px", // Mock data for demo
                                backgroundColor: "#60a5fa",
                                borderRadius: "2px 2px 0 0"
                              }}></div>
                              {/* Expense Bar (Yellow) */}
                              <div style={{
                                width: "8px",
                                height: "2px",
                                backgroundColor: "#fbbf24",
                                borderRadius: "2px 2px 0 0"
                              }}></div>
                            </div>
                            <div style={{
                              fontSize: "10px",
                              color: "#9ca3af",
                              textAlign: "center",
                              lineHeight: "1.2",
                              width: "30px"
                            }}>
                              {month.split(' ').map((part, idx) => (
                                <div key={idx}>{part}</div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Legend & Report Link */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "20px"
                      }}>
                        <div style={{ display: "flex", gap: "24px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "16px", height: "4px", backgroundColor: "#60a5fa", borderRadius: "2px" }}></div>
                            <span style={{ fontSize: "13px", color: "#374151" }}>Income</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "16px", height: "4px", backgroundColor: "#fbbf24", borderRadius: "2px" }}></div>
                            <span style={{ fontSize: "13px", color: "#374151" }}>Expense</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "#156372" }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.5 11.5V6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M7 11.5V2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M11.5 11.5V4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span style={{ fontSize: "13px" }}>Profitability Report</span>
                        </div>
                      </div>
                    </div>

                    {/* Divider Line */}
                    <div style={{ height: "1px", backgroundColor: "#f3f4f6", margin: "0 -24px 24px -24px" }}></div>

                    {/* Actual Cost & Revenue Cards - Clean layout matching design */}
                    <div style={{
                      display: "flex",
                      width: "100%"
                    }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", borderRight: "1px solid #f3f4f6" }}>
                        <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Actual Cost</div>
                        <div style={{ fontSize: "20px", fontWeight: "600", color: "#1f2937" }}>
                          {baseCurrencyCode}0.00
                        </div>
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Actual Revenue</div>
                        <div style={{ fontSize: "20px", fontWeight: "600", color: "#1f2937" }}>
                          {baseCurrencyCode}0.00
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Users Section */}
              <div style={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                padding: "24px",
                marginBottom: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px"
                }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333", margin: 0 }}>
                    Users
                  </h3>
                  <button
                    onClick={() => setShowAddUserModal(true)}
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "4px",
                      backgroundColor: "transparent",
                      color: "#156372",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <Plus size={14} />
                    Add User
                  </button>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        NAME
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        LOGGED HOURS
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        BILLED HOURS
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        UNBILLED HOURS
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        ROLE
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.users && project.users.length > 0 ? (
                      project.users.map((user, index) => {
                        const userHours = calculateUserHours(user.email || user.name);
                        return (
                          <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>
                              <div>
                                <div style={{ fontWeight: "500" }}>{user.name || user.email}</div>
                                <div style={{ fontSize: "12px", color: "#666" }}>{user.email}</div>
                              </div>
                            </td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{userHours.logged}</td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{userHours.billed}</td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{userHours.unbilled}</td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>
                              {user.role || "Admin"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                          No users added
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Project Tasks Section */}
              <div style={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px"
                }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333", margin: 0 }}>
                    Project Tasks
                  </h3>
                  <button
                    onClick={() => setShowAddTaskModal(true)}
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "4px",
                      backgroundColor: "transparent",
                      color: "#156372",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <Plus size={14} />
                    Add Task
                  </button>
                </div>

                {project.tasks && project.tasks.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          NAME
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          LOGGED HOURS
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          BILLED HOURS
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          UNBILLED HOURS
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          RATE ({baseCurrencyCode})
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          TYPE
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.tasks.map((task, index) => {
                        const taskHours = calculateTaskHours(task.taskName);
                        return (
                          <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{task.taskName}</td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{taskHours.logged}</td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{taskHours.billed}</td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{taskHours.unbilled}</td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>
                              {baseCurrencyCode}{task.rate || task.hourlyRate || "0.00"}
                            </td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>
                              {task.billable ? "Billable" : "Non-Billable"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: "#666", fontSize: "14px" }}>
                    No project tasks have been added.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Timesheet Tab */}
          {activeTab === "Timesheet" && (
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              padding: "24px"
            }}>
              {/* VIEW BY Filters */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "24px"
              }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>VIEW BY:</span>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      border: "none",
                      padding: "6px 28px 6px 12px",
                      borderRadius: "4px",
                      fontSize: "14px",
                      cursor: "pointer",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 8px center",
                      paddingRight: "28px"
                    }}
                  >
                    <option value="All">Status: All</option>
                    <option value="Billable">Status: Billable</option>
                    <option value="Non-Billable">Status: Non-Billable</option>
                  </select>
                </div>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    style={{
                      border: "none",
                      padding: "6px 28px 6px 12px",
                      borderRadius: "4px",
                      fontSize: "14px",
                      cursor: "pointer",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 8px center",
                      paddingRight: "28px"
                    }}
                  >
                    <option value="All">Period: All</option>
                    <option value="This Week">Period: This Week</option>
                    <option value="This Month">Period: This Month</option>
                    <option value="This Year">Period: This Year</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons - Show when entries are selected */}
              {selectedEntries.length > 0 && (
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid #e5e7eb"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                  }}>
                    <button
                      onClick={() => {
                        // Handle Create Invoice
                        alert(`Create Invoice for ${selectedEntries.length} timesheet(s)`);
                      }}
                      style={{
                        padding: "8px 16px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "#f3f4f6",
                        color: "#111827",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}
                    >
                      Create Invoice
                    </button>
                    <button
                      onClick={() => {
                        // Handle Mark as Invoiced
                        alert(`Mark ${selectedEntries.length} timesheet(s) as Invoiced`);
                      }}
                      style={{
                        padding: "8px 16px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "#f3f4f6",
                        color: "#111827",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}
                    >
                      Mark as Invoiced
                    </button>
                    <button
                      onClick={() => {
                        // Handle Delete
                        if (window.confirm(`Are you sure you want to delete ${selectedEntries.length} timesheet(s)?`)) {
                          setSelectedEntries([]);
                        }
                      }}
                      style={{
                        padding: "8px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "#f3f4f6",
                        color: "#111827",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        // Handle More Options
                        alert("More options menu");
                      }}
                      style={{
                        padding: "8px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "#f3f4f6",
                        color: "#111827",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#156372"
                    }}></div>
                    <span style={{
                      fontSize: "14px",
                      color: "#111827",
                      fontWeight: "500"
                    }}>
                      {selectedEntries.length} Timesheet{selectedEntries.length !== 1 ? 's' : ''} Selected
                    </span>
                  </div>
                </div>
              )}

              {/* Timesheet Table */}
              {(() => {
                // Filter entries based on status and period
                let filteredEntries = [...timeEntries];

                if (statusFilter === "Billable") {
                  filteredEntries = filteredEntries.filter(entry => entry.billable === true);
                } else if (statusFilter === "Non-Billable") {
                  filteredEntries = filteredEntries.filter(entry => entry.billable === false);
                }

                if (periodFilter !== "All") {
                  const now = new Date();
                  filteredEntries = filteredEntries.filter(entry => {
                    if (!entry.date) return false;

                    // Try to parse date - could be in different formats
                    let entryDate;
                    if (typeof entry.date === 'string') {
                      // Try parsing as "DD MMM YYYY" format (e.g., "09 Dec 2025")
                      const dateMatch = entry.date.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
                      if (dateMatch) {
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const monthIndex = months.indexOf(dateMatch[2]);
                        if (monthIndex !== -1) {
                          entryDate = new Date(parseInt(dateMatch[3]), monthIndex, parseInt(dateMatch[1]));
                        } else {
                          entryDate = new Date(entry.date);
                        }
                      } else {
                        entryDate = new Date(entry.date);
                      }
                    } else {
                      entryDate = new Date(entry.date);
                    }

                    if (isNaN(entryDate.getTime())) return false;

                    if (periodFilter === "This Week") {
                      const weekStart = new Date(now);
                      weekStart.setDate(now.getDate() - now.getDay());
                      weekStart.setHours(0, 0, 0, 0);
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekStart.getDate() + 6);
                      weekEnd.setHours(23, 59, 59, 999);
                      return entryDate >= weekStart && entryDate <= weekEnd;
                    } else if (periodFilter === "This Month") {
                      return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
                    } else if (periodFilter === "This Year") {
                      return entryDate.getFullYear() === now.getFullYear();
                    }
                    return true;
                  });
                }

                // Helper function to format date as DD/MM/YYYY
                const formatDateDDMMYYYY = (dateString) => {
                  if (!dateString) return "";
                  try {
                    let date;
                    if (typeof dateString === 'string') {
                      // Try parsing as "DD MMM YYYY" format (e.g., "09 Dec 2025")
                      const dateMatch = dateString.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
                      if (dateMatch) {
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const monthIndex = months.indexOf(dateMatch[2]);
                        if (monthIndex !== -1) {
                          date = new Date(parseInt(dateMatch[3]), monthIndex, parseInt(dateMatch[1]));
                        } else {
                          date = new Date(dateString);
                        }
                      } else {
                        date = new Date(dateString);
                      }
                    } else {
                      date = new Date(dateString);
                    }
                    if (isNaN(date.getTime())) return dateString;
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    return `${day}/${month}/${year}`;
                  } catch {
                    return dateString;
                  }
                };

                return (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                          <input
                            type="checkbox"
                            checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0 && filteredEntries.every(entry => selectedEntries.includes(entry.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEntries(filteredEntries.map(entry => entry.id));
                              } else {
                                setSelectedEntries([]);
                              }
                            }}
                            style={{
                              marginRight: "8px",
                              cursor: "pointer",
                              accentColor: "#2563eb"
                            }}
                          />
                          DATE
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                          TASK
                          <ArrowUpDown size={12} style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }} />
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                          USER
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                          TIME
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                          BILLING STATUS
                        </th>
                        <th style={{ padding: "12px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase", width: "80px" }}>
                          {/* Actions column header */}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
                            There are no timesheets.
                          </td>
                        </tr>
                      ) : (
                        filteredEntries.map((entry) => {
                          // Format billing status
                          let billingStatusText = "Unbilled";
                          let billingStatusColor = "#f97316"; // orange
                          if (entry.billingStatus === "Invoiced" || entry.billingStatus === "Billed") {
                            billingStatusText = entry.billingStatus;
                            billingStatusColor = "#10b981"; // green
                          } else if (entry.billingStatus) {
                            billingStatusText = entry.billingStatus;
                          } else if (!entry.billable) {
                            billingStatusText = "Non-Billable";
                            billingStatusColor = "#6b7280"; // grey
                          }

                          // Handle multiple task names (split by newline or comma)
                          const taskNames = entry.taskName ? entry.taskName.split(/[,\n]/).map(t => t.trim()).filter(t => t) : ["N/A"];
                          const isHovered = hoveredEntryId === entry.id;

                          return (
                            <tr
                              key={entry.id}
                              onMouseEnter={() => setHoveredEntryId(entry.id)}
                              onMouseLeave={() => setHoveredEntryId(null)}
                              style={{
                                borderBottom: "1px solid #e5e7eb",
                                backgroundColor: isHovered ? "#f9fafb" : "transparent"
                              }}
                            >
                              <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                                <input
                                  type="checkbox"
                                  checked={selectedEntries.includes(entry.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (e.target.checked) {
                                      setSelectedEntries([...selectedEntries, entry.id]);
                                    } else {
                                      setSelectedEntries(selectedEntries.filter(id => id !== entry.id));
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    marginRight: "8px",
                                    cursor: "pointer",
                                    accentColor: "#2563eb"
                                  }}
                                />
                                {formatDateDDMMYYYY(entry.date)}
                              </td>
                              <td style={{ padding: "12px", fontSize: "14px", color: "#111827", lineHeight: "1.5" }}>
                                {taskNames.map((task, idx) => (
                                  <div key={idx}>{task}</div>
                                ))}
                              </td>
                              <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                                {entry.user || entry.userEmail || "N/A"}
                              </td>
                              <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                                {entry.timeSpent || "00:00"}
                              </td>
                              <td style={{ padding: "12px", fontSize: "14px", color: billingStatusColor }}>
                                {billingStatusText}
                              </td>
                              <td style={{ padding: "12px", textAlign: "right" }}>
                                <div style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                  gap: "8px",
                                  opacity: isHovered ? 1 : 0,
                                  transition: "opacity 0.2s"
                                }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Handle edit action
                                      setShowLogEntryForm(true);
                                    }}
                                    style={{
                                      padding: "6px",
                                      border: "1px solid #d1d5db",
                                      borderRadius: "4px",
                                      backgroundColor: "#fff",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = "#f3f4f6";
                                      e.target.style.borderColor = "#9ca3af";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = "#fff";
                                      e.target.style.borderColor = "#d1d5db";
                                    }}
                                  >
                                    <Edit3 size={16} color="#374151" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Handle more options
                                      alert("More options menu");
                                    }}
                                    style={{
                                      padding: "6px",
                                      border: "1px solid #d1d5db",
                                      borderRadius: "4px",
                                      backgroundColor: "#fff",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = "#f3f4f6";
                                      e.target.style.borderColor = "#9ca3af";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = "#fff";
                                      e.target.style.borderColor = "#d1d5db";
                                    }}
                                  >
                                    <MoreVertical size={16} color="#374151" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}

          {/* Purchases Tab */}
          {activeTab === "Purchases" && (() => {
            // Helper function to format date
            const formatDate = (dateString) => {
              if (!dateString) return "";
              try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) {
                  return dateString;
                }
                return date.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });
              } catch {
                return dateString;
              }
            };

            // Filter expenses
            let filteredExpenses = expenses;
            if (expensesSearch) {
              filteredExpenses = filteredExpenses.filter(expense =>
                (expense.vendor || "").toLowerCase().includes(expensesSearch.toLowerCase()) ||
                (expense.reference || "").toLowerCase().includes(expensesSearch.toLowerCase()) ||
                (expense.customerName || "").toLowerCase().includes(expensesSearch.toLowerCase())
              );
            }
            if (expensesStatusFilter !== "All") {
              filteredExpenses = filteredExpenses.filter(expense =>
                (expense.status || "").toLowerCase() === expensesStatusFilter.toLowerCase()
              );
            }

            return (
              <div style={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                padding: "24px"
              }}>
                {/* Go to transactions */}
                <div style={{ marginBottom: "24px" }}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/purchases");
                    }}
                    style={{
                      color: "#156372",
                      fontSize: "14px",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    Go to transactions
                    <ChevronDown size={12} />
                  </a>
                </div>

                {/* Expenses Section */}
                <div style={{ marginBottom: "32px" }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px"
                  }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        padding: "8px 12px",
                        border: activePurchaseSection === "Expenses" ? "1px solid #156372" : "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "#fff"
                      }}
                      onClick={() => {
                        setActivePurchaseSection("Expenses");
                        setExpensesExpanded(!expensesExpanded);
                      }}
                    >
                      {expensesExpanded ? (
                        <ChevronDown size={16} color="#156372" />
                      ) : (
                        <ChevronRight size={16} color="#666" />
                      )}
                      <span style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: activePurchaseSection === "Expenses" ? "#156372" : "#111827"
                      }}>
                        Expenses
                      </span>
                    </div>
                    {expensesExpanded && (
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <select
                          value={expensesStatusFilter}
                          onChange={(e) => setExpensesStatusFilter(e.target.value)}
                          style={{
                            border: "none",
                            padding: "6px 28px 6px 12px",
                            borderRadius: "4px",
                            fontSize: "14px",
                            cursor: "pointer",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            appearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 8px center",
                            paddingRight: "28px"
                          }}
                        >
                          <option value="All">Status: All</option>
                          <option value="Paid">Status: Paid</option>
                          <option value="Unpaid">Status: Unpaid</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {expensesExpanded && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                            DATE
                          </th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>EXPENSE ACCOUNT</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>REFERENCE#</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>VENDOR NAME</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>PAID THROUGH</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>CUSTOMER NAME</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>AMOUNT</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.length === 0 ? (
                          <tr>
                            <td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
                              There are no expenses.
                            </td>
                          </tr>
                        ) : (
                          filteredExpenses.map((expense) => (
                            <tr
                              key={expense.id}
                              style={{ borderBottom: "1px solid #e5e7eb" }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ffffff"}
                            >
                              <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                                {formatDate(expense.date)}
                              </td>
                              <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                                {expense.expenseAccount || "-"}
                              </td>
                              <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                                {expense.reference || "-"}
                              </td>
                              <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                                {expense.vendor || "-"}
                              </td>
                              <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                                {expense.paidThrough || "-"}
                              </td>
                              <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                                {expense.customerName || "-"}
                              </td>
                              <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                                {expense.currency || "$"} {parseFloat(expense.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>
                                <span style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: "500",
                                  backgroundColor: (expense.status || "").toLowerCase() === "paid" ? "#d1fae5" : "#f3f4f6",
                                  color: (expense.status || "").toLowerCase() === "paid" ? "#065f46" : "#374151"
                                }}>
                                  {expense.status || "Unpaid"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Bills Section */}
                <div style={{ marginBottom: "32px" }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px"
                  }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        padding: "8px 12px",
                        border: activePurchaseSection === "Bills" ? "1px solid #156372" : "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "#fff"
                      }}
                      onClick={() => {
                        setActivePurchaseSection("Bills");
                        setBillsExpanded(!billsExpanded);
                      }}
                    >
                      {billsExpanded ? (
                        <ChevronDown size={16} color="#156372" />
                      ) : (
                        <ChevronRight size={16} color="#666" />
                      )}
                      <span style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: activePurchaseSection === "Bills" ? "#156372" : "#111827"
                      }}>
                        Bills
                      </span>
                    </div>
                    {billsExpanded && (
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <select
                          value={billsStatusFilter}
                          onChange={(e) => setBillsStatusFilter(e.target.value)}
                          style={{
                            border: "none",
                            padding: "6px 28px 6px 12px",
                            borderRadius: "4px",
                            fontSize: "14px",
                            cursor: "pointer",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            appearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 8px center",
                            paddingRight: "28px"
                          }}
                        >
                          <option value="All">Status: All</option>
                          <option value="PAID">Status: Paid</option>
                          <option value="OPEN">Status: Open</option>
                          <option value="OVERDUE">Status: Overdue</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {billsExpanded && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>DATE</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>BILL#</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>REFERENCE#</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>VENDOR NAME</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>AMOUNT</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
                            There are no bills.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Purchase Orders Section */}
                <div style={{ marginBottom: "32px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      padding: "8px 12px",
                      border: activePurchaseSection === "Purchase Orders" ? "1px solid #156372" : "1px solid #d1d5db",
                      borderRadius: "6px",
                      backgroundColor: "#fff",
                      marginBottom: "16px"
                    }}
                    onClick={() => {
                      setActivePurchaseSection("Purchase Orders");
                      setPurchaseOrdersExpanded(!purchaseOrdersExpanded);
                    }}
                  >
                    {purchaseOrdersExpanded ? (
                      <ChevronDown size={16} color="#156372" />
                    ) : (
                      <ChevronRight size={16} color="#666" />
                    )}
                    <span style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: activePurchaseSection === "Purchase Orders" ? "#156372" : "#111827"
                    }}>
                      Purchase Orders
                    </span>
                  </div>
                  {purchaseOrdersExpanded && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>DATE</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>PO#</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>VENDOR NAME</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>AMOUNT</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
                            There are no purchase orders.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Vendor Credits Section */}
                <div style={{ marginBottom: "32px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      padding: "8px 12px",
                      border: activePurchaseSection === "Vendor Credits" ? "1px solid #156372" : "1px solid #d1d5db",
                      borderRadius: "6px",
                      backgroundColor: "#fff",
                      marginBottom: "16px"
                    }}
                    onClick={() => {
                      setActivePurchaseSection("Vendor Credits");
                      setVendorCreditsExpanded(!vendorCreditsExpanded);
                    }}
                  >
                    {vendorCreditsExpanded ? (
                      <ChevronDown size={16} color="#156372" />
                    ) : (
                      <ChevronRight size={16} color="#666" />
                    )}
                    <span style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: activePurchaseSection === "Vendor Credits" ? "#156372" : "#111827"
                    }}>
                      Vendor Credits
                    </span>
                  </div>
                  {vendorCreditsExpanded && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>DATE</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>VENDOR CREDIT#</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>VENDOR NAME</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>AMOUNT</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
                            There are no vendor credits.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Sales Tab */}
          {activeTab === "Sales" && (
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              padding: "24px"
            }}>
              {/* Go to transactions */}
              <div style={{ marginBottom: "24px" }}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/sales");
                  }}
                  style={{
                    color: "#156372",
                    fontSize: "14px",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  Go to transactions
                  <ChevronDown size={12} />
                </a>
              </div>

              {/* Invoices Section */}
              <div style={{ marginBottom: "32px" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px"
                }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      padding: "8px 12px",
                      border: activeSalesSection === "Invoices" ? "1px solid #156372" : "1px solid #d1d5db",
                      borderRadius: "6px",
                      backgroundColor: "#fff"
                    }}
                    onClick={() => {
                      setActiveSalesSection("Invoices");
                      setInvoicesExpanded(!invoicesExpanded);
                    }}
                  >
                    {invoicesExpanded ? (
                      <ChevronDown size={16} color="#156372" />
                    ) : (
                      <ChevronRight size={16} color="#666" />
                    )}
                    <span style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: activeSalesSection === "Invoices" ? "#156372" : "#111827"
                    }}>
                      Invoices
                    </span>
                  </div>
                  {invoicesExpanded && (
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <select
                        value={invoicesStatusFilter}
                        onChange={(e) => setInvoicesStatusFilter(e.target.value)}
                        style={{
                          border: "none",
                          padding: "6px 28px 6px 12px",
                          borderRadius: "4px",
                          fontSize: "14px",
                          cursor: "pointer",
                          backgroundColor: "#f3f4f6",
                          color: "#374151",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 8px center",
                          paddingRight: "28px"
                        }}
                      >
                        <option value="All">Status: All</option>
                        <option value="Paid">Status: Paid</option>
                        <option value="Unpaid">Status: Unpaid</option>
                      </select>
                    </div>
                  )}
                </div>
                {invoicesExpanded && (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          DATE
                          <ArrowUpDown size={12} style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }} />
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>INVOICE#</th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                            textTransform: "uppercase",
                            cursor: "pointer"
                          }}
                          onClick={() => setShowProjectInvoiceInfo(true)}
                          title="Click to configure invoice information"
                        >
                          REFERENCE#
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>PROJECT FEE</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>AMOUNT</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>BALANCE DUE</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
                          There are no invoices.
                        </td>
                      </tr>
                      {/* Example row with clickable reference - remove this when you have actual invoice data */}
                      {/* <tr>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>-</td>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>-</td>
                      <td 
                        style={{ 
                          padding: "12px", 
                          fontSize: "14px", 
                          color: "#156372", 
                          cursor: "pointer",
                          textDecoration: "underline"
                        }}
                        onClick={() => setShowProjectInvoiceInfo(true)}
                      >
                        Click here
                      </td>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>-</td>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>-</td>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>-</td>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#111827" }}>-</td>
                    </tr> */}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Quotes Section */}
              <div style={{ marginBottom: "32px" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px"
                }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      padding: "8px 12px",
                      border: activeSalesSection === "Quotes" ? "1px solid #156372" : "1px solid #d1d5db",
                      borderRadius: "6px",
                      backgroundColor: "#fff"
                    }}
                    onClick={() => {
                      setActiveSalesSection("Quotes");
                      setQuotesExpanded(!quotesExpanded);
                    }}
                  >
                    {quotesExpanded ? (
                      <ChevronDown size={16} color="#156372" />
                    ) : (
                      <ChevronRight size={16} color="#666" />
                    )}
                    <span style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: activeSalesSection === "Quotes" ? "#156372" : "#111827"
                    }}>
                      Quotes
                    </span>
                  </div>
                  {quotesExpanded && (
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <select
                        style={{
                          border: "none",
                          padding: "6px 28px 6px 12px",
                          borderRadius: "4px",
                          fontSize: "14px",
                          cursor: "pointer",
                          backgroundColor: "#f3f4f6",
                          color: "#374151",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 8px center",
                          paddingRight: "28px"
                        }}
                      >
                        <option>Status: All</option>
                      </select>
                    </div>
                  )}
                </div>
                {quotesExpanded && (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          DATE
                          <ArrowUpDown size={12} style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }} />
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>QUOTE#</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>REFERENCE#</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>AMOUNT</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
                          There are no quotes.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* Credit Notes Section */}
              <div style={{ marginBottom: "32px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "8px 12px",
                    border: activeSalesSection === "Credit Notes" ? "1px solid #156372" : "1px solid #d1d5db",
                    borderRadius: "6px",
                    backgroundColor: "#fff",
                    marginBottom: "16px"
                  }}
                  onClick={() => {
                    setActiveSalesSection("Credit Notes");
                    setCreditNotesExpanded(!creditNotesExpanded);
                  }}
                >
                  {creditNotesExpanded ? (
                    <ChevronDown size={16} color="#156372" />
                  ) : (
                    <ChevronRight size={16} color="#666" />
                  )}
                  <span style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: activeSalesSection === "Credit Notes" ? "#156372" : "#111827"
                  }}>
                    Credit Notes
                  </span>
                </div>
                {creditNotesExpanded && (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          DATE
                          <ArrowUpDown size={12} style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }} />
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>CREDIT NOTE#</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>REFERENCE#</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>AMOUNT</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
                          There are no credit notes.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Budget Configuration Tab */}
          {activeTab === "Budget Configuration" && (
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              padding: "60px 40px",
              textAlign: "center"
            }}>
              <h2 style={{
                fontSize: "28px",
                fontWeight: "600",
                color: "#1f2937",
                marginBottom: "16px"
              }}>
                Budget your business finance. Stay on top of your expenses.
              </h2>
              <p style={{
                fontSize: "16px",
                color: "#1f2937",
                marginBottom: "32px",
                maxWidth: "600px",
                margin: "0 auto 32px"
              }}>
                Create budgets for the various activities of your business, compare them with the actuals, and see how your business is performing.
              </p>
              <button
                onClick={() => setShowNewBudgetForm(true)}
                style={{
                  padding: "12px 32px",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: "#156372",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "600",
                  textTransform: "uppercase"
                }}
              >
                CREATE BUDGET
              </button>
            </div>
          )}

          {/* Journals Tab */}
          {activeTab === "Journals" && (
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              padding: "40px",
              textAlign: "center",
              color: "#6b7280",
              fontSize: "14px"
            }}>
              There are no journals associated with this project.
            </div>
          )}

          {activeTab === "Comments" && (
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              padding: "24px"
            }}>
              {/* Comment Input Area */}
              <div style={{ marginBottom: "32px" }}>
                {/* Formatting Buttons */}
                <div style={{
                  display: "flex",
                  gap: "4px",
                  marginBottom: "8px"
                }}>
                  <button
                    onClick={() => setIsBold(!isBold)}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: isBold ? "#f0f0f0" : "#fff",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "bold"
                    }}
                  >
                    B
                  </button>
                  <button
                    onClick={() => setIsItalic(!isItalic)}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: isItalic ? "#f0f0f0" : "#fff",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontStyle: "italic"
                    }}
                  >
                    I
                  </button>
                  <button
                    onClick={() => setIsUnderline(!isUnderline)}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: isUnderline ? "#f0f0f0" : "#fff",
                      cursor: "pointer",
                      fontSize: "14px",
                      textDecoration: "underline"
                    }}
                  >
                    U
                  </button>
                </div>

                {/* Comment Text Area */}
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  style={{
                    width: "100%",
                    minHeight: "120px",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    fontWeight: isBold ? "bold" : "normal",
                    fontStyle: isItalic ? "italic" : "normal",
                    textDecoration: isUnderline ? "underline" : "none"
                  }}
                />

                {/* Add Comment Button */}
                <button
                  onClick={() => {
                    if (!commentText.trim()) {
                      return;
                    }
                    const newComment = {
                      id: Date.now().toString(),
                      text: commentText,
                      author: "Current User", // You can replace this with actual user info
                      createdAt: new Date().toISOString(),
                      isBold,
                      isItalic,
                      isUnderline
                    };
                    const updatedComments = [...comments, newComment];
                    setComments(updatedComments);

                    // Save to localStorage
                    const allComments = JSON.parse(localStorage.getItem('projectComments') || '{}');
                    allComments[projectId] = updatedComments;
                    localStorage.setItem('projectComments', JSON.stringify(allComments));

                    // Reset form
                    setCommentText("");
                    setIsBold(false);
                    setIsItalic(false);
                    setIsUnderline(false);
                  }}
                  style={{
                    marginTop: "12px",
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "4px",
                    backgroundColor: "#156372",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
                >
                  Add Comment
                </button>
              </div>

              {/* All Comments Section */}
              <div>
                <h3 style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#333",
                  marginBottom: "16px"
                }}>
                  ALL COMMENTS
                </h3>

                {comments.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#6b7280",
                    fontSize: "14px"
                  }}>
                    No comments yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        style={{
                          padding: "16px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          backgroundColor: "#fafafa"
                        }}
                      >
                        <div style={{
                          fontSize: "14px",
                          color: "#333",
                          whiteSpace: "pre-wrap",
                          fontWeight: comment.isBold ? "bold" : "normal",
                          fontStyle: comment.isItalic ? "italic" : "normal",
                          textDecoration: comment.isUnderline ? "underline" : "none"
                        }}>
                          {comment.text}
                        </div>
                        <div style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "8px"
                        }}>
                          {comment.author} • {new Date(comment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Log Entry Form Modal */}
      {showLogEntryForm && (
        <NewLogEntryForm
          onClose={() => setShowLogEntryForm(false)}
          defaultProjectName={project?.projectName || ""}
        />
      )}

      {/* Attachments Modal */}
      {showAttachmentsModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAttachmentsModal(false);
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Attachments
              </h2>
              <button
                onClick={() => setShowAttachmentsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#156372',
                  padding: '4px',
                  lineHeight: 1,
                  fontWeight: 'bold',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#0D4A52'}
                onMouseLeave={(e) => e.target.style.color = '#156372'}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {/* Status Message */}
              {attachedFiles.length === 0 && (
                <div style={{
                  marginBottom: '24px',
                  fontSize: '14px',
                  color: '#6b7280',
                  textAlign: 'center'
                }}>
                  No Files Attached
                </div>
              )}

              {/* Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '60px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#f9fafb',
                  transition: 'all 0.2s',
                  marginBottom: '16px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#156372';
                  e.currentTarget.style.backgroundColor = '#f0f7ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
              >
                <div style={{
                  fontSize: '32px',
                  marginBottom: '12px'
                }}>
                  ⬆
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  Upload your Files
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 4.5l3 3 3-3" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* File Input (Hidden) */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  // Check file count limit
                  if (attachedFiles.length + files.length > 20) {
                    alert('Maximum 20 files allowed. Please select fewer files.');
                    return;
                  }

                  // Check file size (10MB each)
                  const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
                  if (invalidFiles.length > 0) {
                    alert('Some files exceed 10MB limit. Please select smaller files.');
                    return;
                  }

                  // Add files to state
                  const newFiles = files.map(file => ({
                    id: Date.now() + Math.random(),
                    name: file.name,
                    size: file.size,
                    file: file
                  }));
                  setAttachedFiles([...attachedFiles, ...newFiles]);
                }}
              />

              {/* Upload Limits */}
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                You can upload a maximum of 20 files, 10MB each.
              </div>

              {/* Attached Files List */}
              {attachedFiles.length > 0 && (
                <div style={{
                  marginTop: '24px'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '12px'
                  }}>
                    Attached Files ({attachedFiles.length}/20)
                  </div>
                  {attachedFiles.map((fileItem) => (
                    <div
                      key={fileItem.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        backgroundColor: '#fff'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px'
                        }}>
                          📄
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#1f2937',
                            marginBottom: '2px'
                          }}>
                            {fileItem.name}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280'
                          }}>
                            {(fileItem.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setAttachedFiles(attachedFiles.filter(f => f.id !== fileItem.id));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#156372',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#0D4A52'}
                        onMouseLeave={(e) => e.target.style.color = '#156372'}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid #e5e7eb',
                marginTop: '24px'
              }}>
                <button
                  onClick={() => setShowAttachmentsModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Save attachments to localStorage or handle save logic here
                    // For now, just close the modal
                    setShowAttachmentsModal(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#156372',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preferences Modal */}
      {showInvoicePreferences && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowInvoicePreferences(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Invoice Preferences</h2>
              <button
                onClick={() => setShowInvoicePreferences(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Invoice Template
              </label>
              <select style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <option>Default Template</option>
                <option>Custom Template</option>
              </select>
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '24px'
            }}>
              <button
                onClick={() => setShowInvoicePreferences(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowInvoicePreferences(false);
                  alert('Invoice preferences saved');
                }}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#156372',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Invoice Information Modal */}
      {showProjectInvoiceInfo && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowProjectInvoiceInfo(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '600px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            overflowX: 'visible',
            position: 'relative'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Project Invoice Information</h2>
              <button
                onClick={() => setShowProjectInvoiceInfo(false)}
                style={{
                  backgroundColor: '#156372',
                  border: '2px solid #156372',
                  borderRadius: '4px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
              >
                ×
              </button>
            </div>

            {/* How to sort data on invoice */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                How to sort data on invoice<span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }} ref={sortDataDropdownRef}>
                <div
                  onClick={() => setSortDataDropdownOpen(!sortDataDropdownOpen)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    minHeight: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundImage: sortDataDropdownOpen ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 3L11 8H1z'/%3E%3C/svg%3E")` : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px'
                  }}
                >
                  <span>{invoiceInfoData.sortData}</span>
                </div>
                {sortDataDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 10005,
                    maxHeight: '400px',
                    overflowY: 'auto',
                    isolation: 'isolate'
                  }}>
                    {/* Search bar */}
                    <div style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                        <input
                          type="text"
                          placeholder="Search"
                          value={sortDataSearch}
                          onChange={(e) => setSortDataSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100%',
                            padding: '8px 12px 8px 36px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                    {[
                      { value: 'Single Line For The Project', description: 'Display the entire project information as a single line item' },
                      { value: 'Show All Timesheet Entries Individually', description: 'Show all time sheet entries as individual line items' },
                      { value: 'Group By Project Tasks', description: 'List the entries for each project task as a single line item' },
                      { value: 'Group By Project Tasks And Users', description: 'List each line item as a combination of users and tasks' }
                    ]
                      .filter(option =>
                        option.value.toLowerCase().includes(sortDataSearch.toLowerCase()) ||
                        option.description.toLowerCase().includes(sortDataSearch.toLowerCase())
                      )
                      .map((option) => {
                        const isSelected = invoiceInfoData.sortData === option.value;
                        return (
                          <div
                            key={option.value}
                            onClick={() => {
                              setInvoiceInfoData({ ...invoiceInfoData, sortData: option.value });
                              setSortDataDropdownOpen(false);
                              setSortDataSearch('');
                            }}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: isSelected ? 'white' : '#111827',
                              backgroundColor: isSelected ? '#156372' : 'transparent',
                              borderBottom: '1px solid #f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'rgba(21, 99, 114, 0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: isSelected ? '500' : '400', marginBottom: '4px' }}>{option.value}</div>
                              <div style={{ fontSize: '12px', color: isSelected ? 'rgba(255,255,255,0.9)' : '#6b7280' }}>{option.description}</div>
                            </div>
                            {isSelected && <Check size={16} color="white" />}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
              <p style={{
                marginTop: '6px',
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: 0
              }}>
                {invoiceInfoData.sortData === 'Single Line For The Project' && 'Display the entire project information as a single line item'}
                {invoiceInfoData.sortData === 'Show All Timesheet Entries Individually' && 'Show all time sheet entries as individual line items'}
                {invoiceInfoData.sortData === 'Group By Project Tasks' && 'List the entries for each project task as a single line item'}
                {invoiceInfoData.sortData === 'Group By Project Tasks And Users' && 'List each line item as a combination of users and tasks'}
              </p>
            </div>

            {/* Show in item name */}
            <div style={{ marginBottom: '24px', position: 'relative', zIndex: 1 }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Show in item name<span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative', zIndex: 10001 }} ref={itemNameDropdownRef}>
                <div
                  onClick={() => setItemNameDropdownOpen(!itemNameDropdownOpen)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    minHeight: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px'
                  }}
                >
                  {invoiceInfoData.itemName.length > 0 ? (
                    invoiceInfoData.itemName.map((item, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          backgroundColor: 'rgba(21, 99, 114, 0.1)',
                          color: '#156372',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const newItems = invoiceInfoData.itemName.filter((_, i) => i !== index);
                          setInvoiceInfoData({ ...invoiceInfoData, itemName: newItems });
                          setItemNameDropdownOpen(true);
                        }}
                      >
                        {item}
                        <span style={{ cursor: 'pointer', fontSize: '16px', lineHeight: '1' }}>×</span>
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#9ca3af' }}>Select items...</span>
                  )}
                </div>
                {itemNameDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 10005,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    isolation: 'isolate'
                  }}>
                    {/* Search bar */}
                    <div style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                        <input
                          type="text"
                          placeholder="Search"
                          value={itemNameSearch}
                          onChange={(e) => setItemNameSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100%',
                            padding: '8px 12px 8px 36px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                    {['Project Name', 'Project Code']
                      .filter(option => option.toLowerCase().includes(itemNameSearch.toLowerCase()))
                      .map((option) => {
                        const isSelected = invoiceInfoData.itemName.includes(option);
                        return (
                          <div
                            key={option}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isSelected) {
                                setInvoiceInfoData({
                                  ...invoiceInfoData,
                                  itemName: [...invoiceInfoData.itemName, option]
                                });
                              }
                              setItemNameSearch('');
                              setItemNameDropdownOpen(false);
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: isSelected ? 'white' : '#111827',
                              backgroundColor: isSelected ? '#156372' : 'transparent',
                              borderBottom: '1px solid #f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'rgba(21, 99, 114, 0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            {option}
                            {isSelected && <Check size={16} color="white" />}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Show in item description */}
            <div style={{ marginBottom: '24px', position: 'relative', zIndex: 1 }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Show in item description
              </label>
              <div style={{ position: 'relative', zIndex: 10001 }} ref={itemDescriptionDropdownRef}>
                <div
                  onClick={() => setItemDescriptionDropdownOpen(!itemDescriptionDropdownOpen)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    minHeight: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px'
                  }}
                >
                  {invoiceInfoData.itemDescription.length > 0 ? (
                    invoiceInfoData.itemDescription.map((item, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          backgroundColor: 'rgba(21, 99, 114, 0.1)',
                          color: '#156372',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const newItems = invoiceInfoData.itemDescription.filter((_, i) => i !== index);
                          setInvoiceInfoData({ ...invoiceInfoData, itemDescription: newItems });
                          setItemDescriptionDropdownOpen(true);
                        }}
                      >
                        {item}
                        <span style={{ cursor: 'pointer', fontSize: '16px', lineHeight: '1' }}>×</span>
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#9ca3af' }}>Select items...</span>
                  )}
                </div>
                {itemDescriptionDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 10005,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    isolation: 'isolate'
                  }}>
                    {/* Search bar */}
                    <div style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                        <input
                          type="text"
                          placeholder="Search"
                          value={itemDescriptionSearch}
                          onChange={(e) => setItemDescriptionSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100%',
                            padding: '8px 12px 8px 36px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                    {['Date Range', 'Project Description', 'Project Name', 'Project Code', 'Billed Hours']
                      .filter(option => option.toLowerCase().includes(itemDescriptionSearch.toLowerCase()))
                      .map((option) => {
                        const isSelected = invoiceInfoData.itemDescription.includes(option);
                        return (
                          <div
                            key={option}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isSelected) {
                                setInvoiceInfoData({
                                  ...invoiceInfoData,
                                  itemDescription: [...invoiceInfoData.itemDescription, option]
                                });
                              }
                              setItemDescriptionSearch('');
                              setItemDescriptionDropdownOpen(false);
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: isSelected ? 'white' : '#111827',
                              backgroundColor: isSelected ? '#156372' : 'transparent',
                              borderBottom: '1px solid #f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'rgba(21, 99, 114, 0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            {option}
                            {isSelected && <Check size={16} color="white" />}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Checkbox */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#111827'
              }}>
                <input
                  type="checkbox"
                  checked={invoiceInfoData.includeUnbilledExpenses}
                  onChange={(e) => setInvoiceInfoData({ ...invoiceInfoData, includeUnbilledExpenses: e.target.checked })}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <span>Always include all unbilled expenses associated with this project</span>
              </label>
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setShowProjectInvoiceInfo(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle save logic here
                  setShowProjectInvoiceInfo(false);
                  alert('Project invoice information saved');
                }}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#156372',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Project Modal */}
      {showCloneModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowCloneModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Clone this project</h2>
              <button
                onClick={() => setShowCloneModal(false)}
                style={{
                  backgroundColor: '#156372',
                  border: '2px solid #156372',
                  borderRadius: '4px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
              >
                ×
              </button>
            </div>

            {/* Project Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Project Name<span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={cloneFormData.projectName}
                onChange={(e) => setCloneFormData({ ...cloneFormData, projectName: e.target.value })}
                placeholder="Enter project name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#156372'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Description
              </label>
              <textarea
                value={cloneFormData.description}
                onChange={(e) => setCloneFormData({ ...cloneFormData, description: e.target.value })}
                placeholder="Enter project description"
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#156372'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setShowCloneModal(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!cloneFormData.projectName.trim()) {
                    toast.error('Please enter a project name');
                    return;
                  }

                  try {
                    // Create cloned project data
                    const clonedProjectData = {
                      name: cloneFormData.projectName.trim(),
                      description: cloneFormData.description.trim() || '',
                      status: project?.status || 'planning',
                      budget: project?.budget || 0,
                      currency: project?.currency || 'USD',
                      billable: project?.billable !== undefined ? project.billable : true,
                      billingRate: project?.billingRate || 0,
                      startDate: new Date(),
                      endDate: project?.endDate ? new Date(project.endDate) : null,
                      tags: project?.tags || [],
                      hoursBudgetType: project?.hoursBudgetType || '',
                      totalBudgetHours: project?.totalBudgetHours || '',
                    };

                    // Copy customer if exists
                    if (project?.customer || project?.customerId) {
                      clonedProjectData.customer = project.customer || project.customerId;
                    }

                    // Copy assigned users if exists
                    if (project?.assignedTo && Array.isArray(project.assignedTo) && project.assignedTo.length > 0) {
                      clonedProjectData.assignedTo = project.assignedTo.map(user =>
                        typeof user === 'object' ? user._id || user.id : user
                      ).filter(id => id && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/));
                    }

                    // Copy tasks if exists
                    if (project?.tasks && Array.isArray(project.tasks) && project.tasks.length > 0) {
                      clonedProjectData.tasks = project.tasks.map(task => ({
                        taskName: task.taskName || '',
                        description: task.description || '',
                        billable: task.billable !== undefined ? task.billable : true,
                        budgetHours: task.budgetHours || '',
                      }));
                    }

                    // Copy user budget hours if exists
                    if (project?.userBudgetHours && Array.isArray(project.userBudgetHours) && project.userBudgetHours.length > 0) {
                      clonedProjectData.userBudgetHours = project.userBudgetHours
                        .filter(ubh => ubh && ubh.user)
                        .map(ubh => ({
                          user: typeof ubh.user === 'object' ? (ubh.user._id || ubh.user.id) : ubh.user,
                          budgetHours: ubh.budgetHours || '',
                        }))
                        .filter(ubh => ubh.user && typeof ubh.user === 'string' && ubh.user.match(/^[0-9a-fA-F]{24}$/));
                    }

                    // Create the cloned project
                    const response = await projectsAPI.create(clonedProjectData);

                    toast.success('Project cloned successfully!');

                    // Trigger project update event
                    window.dispatchEvent(new Event('projectUpdated'));

                    // Close modal
                    setShowCloneModal(false);

                    // Navigate to the new project
                    const newProjectId = response?.data?._id || response?.data?.id || response?._id || response?.id;
                    if (newProjectId) {
                      navigate(`/time-tracking/projects/${newProjectId}`);
                    } else {
                      navigate('/time-tracking/projects');
                    }
                  } catch (error) {
                    console.error('Error cloning project:', error);
                    toast.error('Failed to clone project: ' + (error.message || 'Unknown error'));
                  }
                }}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#156372',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Task Modal */}
      {showAddTaskModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowAddTaskModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Add Project Task</h2>
              <button
                onClick={() => setShowAddTaskModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Task Name<span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Enter task name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '24px'
            }}>
              <button
                onClick={() => {
                  setShowAddTaskModal(false);
                  setNewTaskName('');
                }}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newTaskName.trim()) {
                    toast.error('Please enter a task name');
                    return;
                  }

                  try {
                    // Get current tasks
                    const currentTasks = project.tasks || [];

                    // Add new task
                    const newTask = {
                      taskName: newTaskName,
                      description: '',
                      billable: false,
                      budgetHours: ''
                    };

                    const updatedTasks = [...currentTasks, newTask];

                    // Update project in database
                    await projectsAPI.update(projectId, {
                      tasks: updatedTasks
                    });

                    // Update local project state
                    setProject({
                      ...project,
                      tasks: updatedTasks
                    });

                    // Dispatch custom event to notify other components
                    window.dispatchEvent(new Event('projectUpdated'));

                    setShowAddTaskModal(false);
                    setNewTaskName('');
                    toast.success('Task added successfully');
                  } catch (error) {
                    console.error("Error adding task:", error);
                    toast.error("Failed to add task: " + (error.message || "Unknown error"));
                  }
                }}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#156372',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowAddUserModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Add User</h2>
              <button
                onClick={() => setShowAddUserModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Name<span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Enter user name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Email
              </label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Enter user email"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '24px'
            }}>
              <button
                onClick={() => {
                  setShowAddUserModal(false);
                  setNewUserName('');
                  setNewUserEmail('');
                }}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newUserName.trim()) {
                    alert('Please enter a user name');
                    return;
                  }
                  const projects = JSON.parse(localStorage.getItem('projects') || '[]');
                  const updatedProjects = projects.map(p => {
                    if (p.id === projectId) {
                      const users = p.users || [];
                      const newUser = {
                        id: Date.now().toString(),
                        name: newUserName,
                        email: newUserEmail
                      };
                      return { ...p, users: [...users, newUser] };
                    }
                    return p;
                  });
                  localStorage.setItem('projects', JSON.stringify(updatedProjects));
                  window.dispatchEvent(new Event('projectUpdated'));
                  setProject(updatedProjects.find(p => p.id === projectId));
                  setShowAddUserModal(false);
                  setNewUserName('');
                  setNewUserEmail('');
                  alert('User added successfully');
                }}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#156372',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Budget Form Modal */}
      {showNewBudgetForm && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowNewBudgetForm(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                New Budget
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setActiveTab("Comments")}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#156372'
                  }}
                >
                  Comments
                </button>
                <button
                  onClick={() => setShowNewBudgetForm(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div style={{ padding: '24px' }}>
              {/* Name Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Name<span style={{ color: '#d32f2f' }}>*</span>
                </label>
                <input
                  type="text"
                  value={budgetFormData.name}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #156372',
                    borderRadius: '4px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  placeholder="Enter budget name"
                />
              </div>

              {/* Fiscal Year Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Fiscal Year<span style={{ color: '#d32f2f' }}>*</span>
                </label>
                <select
                  value={budgetFormData.fiscalYear}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, fiscalYear: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    outline: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 4.5l3 3 3-3' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px'
                  }}
                >
                  <option value="Jul 2025 - Jun 2026">Jul 2025 - Jun 2026</option>
                  <option value="Jul 2024 - Jun 2025">Jul 2024 - Jun 2025</option>
                  <option value="Jul 2026 - Jun 2027">Jul 2026 - Jun 2027</option>
                </select>
              </div>

              {/* Budget Period Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Budget Period<span style={{ color: '#d32f2f' }}>*</span>
                </label>
                <select
                  value={budgetFormData.budgetPeriod}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, budgetPeriod: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    outline: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 4.5l3 3 3-3' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px'
                  }}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>

              {/* Project Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Project
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#f9fafb'
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 2h8v12H4V2z" stroke="#666" strokeWidth="1.5" fill="none" />
                    <path d="M6 5h4M6 8h4M6 11h2" stroke="#666" strokeWidth="1.5" />
                  </svg>
                  <span style={{ fontSize: '14px', color: '#333' }}>
                    {project?.projectName || 'taban'}
                  </span>
                </div>
              </div>

              {/* Income and Expense Accounts Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  INCOME AND EXPENSE ACCOUNTS
                </h3>

                {/* Income Accounts */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#333'
                  }}>
                    Income Accounts
                  </label>
                  <div
                    onClick={() => {
                      setConfigureAccountsType("income");
                      setSelectedAccounts([...incomeAccounts]);
                      setShowConfigureAccountsModal(true);
                      setExpandedAccountCategories({ "Income": true, "Income_Income": true });
                      setAccountSearchTerm("");
                    }}
                    style={{
                      padding: '20px',
                      border: '2px dashed #ddd',
                      borderRadius: '4px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <span style={{ color: '#156372', fontSize: '14px' }}>Add Accounts</span>
                  </div>
                </div>

                {/* Expense Accounts */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#333'
                  }}>
                    Expense Accounts
                  </label>
                  <div
                    onClick={() => {
                      setConfigureAccountsType("expense");
                      setSelectedAccounts([...expenseAccounts]);
                      setShowConfigureAccountsModal(true);
                      setExpandedAccountCategories({
                        "Expense": true,
                        "Expense_Cost Of Goods Sold": true,
                        "Expense_Expense": true,
                        "Expense_Other Expense": true
                      });
                      setAccountSearchTerm("");
                    }}
                    style={{
                      padding: '20px',
                      border: '2px dashed #ddd',
                      borderRadius: '4px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <span style={{ color: '#156372', fontSize: '14px' }}>Add Accounts</span>
                  </div>
                </div>
              </div>

              {/* Include Asset, Liability, and Equity Accounts */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#333'
                }}>
                  <input
                    type="checkbox"
                    checked={budgetFormData.includeAssetLiabilityEquity}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, includeAssetLiabilityEquity: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <Plus size={16} color="#156372" />
                  <span>Include Asset, Liability, and Equity Accounts in Budget</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '24px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => {
                    setShowNewBudgetForm(false);
                    setBudgetFormData({
                      name: "",
                      fiscalYear: "Jul 2025 - Jun 2026",
                      budgetPeriod: "Monthly",
                      includeAssetLiabilityEquity: false
                    });
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#333'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!budgetFormData.name.trim()) {
                      alert('Please enter a budget name');
                      return;
                    }
                    // Save budget logic here
                    alert('Budget created successfully');
                    setShowNewBudgetForm(false);
                    setBudgetFormData({
                      name: "",
                      fiscalYear: "Jul 2025 - Jun 2026",
                      budgetPeriod: "Monthly",
                      includeAssetLiabilityEquity: false
                    });
                  }}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#156372',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
                >
                  Create Budget
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configure Accounts Modal */}
      {showConfigureAccountsModal && (() => {
        // Account structure for Income
        const incomeAccountStructure = {
          "Income": {
            "Income": [
              "Discount",
              "General Income",
              "Interest Income",
              "Late Fee Income",
              "Other Charges",
              "Sales",
              "Shipping Charge"
            ]
          },
          "Other Income": []
        };

        // Account structure for Expense
        const expenseAccountStructure = {
          "Expense": {
            "Cost Of Goods Sold": [
              "Cost of Goods Sold"
            ],
            "Expense": [
              "Advertising And Marketing",
              "Automobile Expense",
              "Bad Debt",
              "Bank Fees and Charges",
              "Consultant Expense",
              "Credit Card Charges",
              "Depreciation Expense",
              "Fuel/Mileage Expenses",
              "IT and Internet Expenses",
              "Janitorial Expense",
              "Lodging",
              "Meals and Entertainment",
              "Office Supplies",
              "Other Expenses",
              "Parking",
              "Postage",
              "Printing and Stationery",
              "Purchase Discounts",
              "Rent Expense",
              "Repairs and Maintenance",
              "Salaries and Employee Wages",
              "Telephone Expense",
              "Travel Expense"
            ],
            "Other Expense": [
              "Exchange Gain or Loss"
            ]
          }
        };

        // Get the appropriate structure based on type
        const accountStructure = configureAccountsType === "income" ? incomeAccountStructure : expenseAccountStructure;

        // Get all account names from the structure
        const getAllAccountNames = () => {
          const accounts = [];
          Object.keys(accountStructure).forEach(category => {
            if (accountStructure[category] && typeof accountStructure[category] === 'object') {
              Object.keys(accountStructure[category]).forEach(subCategory => {
                if (Array.isArray(accountStructure[category][subCategory])) {
                  accountStructure[category][subCategory].forEach(account => {
                    accounts.push(account);
                  });
                }
              });
            }
          });
          return accounts;
        };

        const allAccountNames = getAllAccountNames();

        // Filter accounts based on search term
        const filteredAccounts = accountSearchTerm
          ? allAccountNames.filter(account =>
            account.toLowerCase().includes(accountSearchTerm.toLowerCase())
          )
          : allAccountNames;

        // Check if all accounts are selected
        const allSelected = filteredAccounts.length > 0 && filteredAccounts.every(account => selectedAccounts.includes(account));

        // Toggle category expansion
        const toggleCategory = (categoryKey) => {
          setExpandedAccountCategories(prev => ({
            ...prev,
            [categoryKey]: !prev[categoryKey]
          }));
        };

        // Toggle account selection
        const toggleAccount = (accountName) => {
          setSelectedAccounts(prev => {
            if (prev.includes(accountName)) {
              return prev.filter(acc => acc !== accountName);
            } else {
              return [...prev, accountName];
            }
          });
        };

        // Select all accounts
        const handleSelectAll = () => {
          if (allSelected) {
            setSelectedAccounts(prev => prev.filter(acc => !filteredAccounts.includes(acc)));
          } else {
            setSelectedAccounts(prev => {
              const newAccounts = [...prev];
              filteredAccounts.forEach(acc => {
                if (!newAccounts.includes(acc)) {
                  newAccounts.push(acc);
                }
              });
              return newAccounts;
            });
          }
        };

        // Handle update
        const handleUpdate = () => {
          if (configureAccountsType === "income") {
            setIncomeAccounts(selectedAccounts);
          } else if (configureAccountsType === "expense") {
            setExpenseAccounts(selectedAccounts);
          }
          setShowConfigureAccountsModal(false);
          setAccountSearchTerm("");
        };

        // Handle cancel
        const handleCancel = () => {
          setShowConfigureAccountsModal(false);
          setAccountSearchTerm("");
          // Reset to original selected accounts
          if (configureAccountsType === "income") {
            setSelectedAccounts([...incomeAccounts]);
          } else if (configureAccountsType === "expense") {
            setSelectedAccounts([...expenseAccounts]);
          }
        };

        return (
          <div
            onClick={(e) => e.target === e.currentTarget && handleCancel()}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2100,
              padding: '20px'
            }}
          >
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '24px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0
                }}>
                  Configure Accounts
                </h2>
                <button
                  onClick={handleCancel}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#111827'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div style={{
                padding: '24px',
                flex: 1,
                overflowY: 'auto'
              }}>
                {/* Select Accounts Label and Select All */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#ef4444'
                  }}>
                    Select Accounts*
                  </label>
                  <button
                    onClick={handleSelectAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#156372',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Select All
                  </button>
                </div>

                {/* Search Bar */}
                <div style={{
                  position: 'relative',
                  marginBottom: '16px'
                }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }}
                  />
                  <input
                    type="text"
                    value={accountSearchTerm}
                    onChange={(e) => setAccountSearchTerm(e.target.value)}
                    placeholder="Search accounts..."
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Account Tree */}
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  {Object.keys(accountStructure).map((category) => {
                    const categoryKey = category;
                    const isCategoryExpanded = expandedAccountCategories[categoryKey];
                    const categoryData = accountStructure[category];

                    return (
                      <div key={category}>
                        {/* Category Header */}
                        <div
                          onClick={() => toggleCategory(categoryKey)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: '#fff',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          {isCategoryExpanded ? (
                            <Minus size={16} color="#156372" />
                          ) : (
                            <Plus size={16} color="#156372" />
                          )}
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#111827'
                          }}>
                            {category}
                          </span>
                        </div>

                        {/* Sub-categories and Accounts */}
                        {isCategoryExpanded && (
                          <div>
                            {typeof categoryData === 'object' && Object.keys(categoryData).map((subCategory) => {
                              const subCategoryKey = `${category}_${subCategory}`;
                              const isSubCategoryExpanded = expandedAccountCategories[subCategoryKey];
                              const accounts = Array.isArray(categoryData[subCategory]) ? categoryData[subCategory] : [];

                              return (
                                <div key={subCategory}>
                                  {/* Sub-category Header */}
                                  <div
                                    onClick={() => toggleCategory(subCategoryKey)}
                                    style={{
                                      padding: '12px 16px 12px 40px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      backgroundColor: '#fff',
                                      borderBottom: '1px solid #e5e7eb'
                                    }}
                                  >
                                    {isSubCategoryExpanded ? (
                                      <Minus size={16} color="#156372" />
                                    ) : (
                                      <Plus size={16} color="#156372" />
                                    )}
                                    <span style={{
                                      fontSize: '14px',
                                      fontWeight: '500',
                                      color: '#111827'
                                    }}>
                                      {subCategory}
                                    </span>
                                  </div>

                                  {/* Accounts - Only show if subcategory is expanded and has accounts */}
                                  {isSubCategoryExpanded && accounts.length > 0 && (
                                    <div>
                                      {accounts.map((accountName) => {
                                        const isSelected = selectedAccounts.includes(accountName);
                                        const shouldShow = !accountSearchTerm || accountName.toLowerCase().includes(accountSearchTerm.toLowerCase());

                                        if (!shouldShow) return null;

                                        return (
                                          <div
                                            key={accountName}
                                            onClick={() => toggleAccount(accountName)}
                                            style={{
                                              padding: '12px 16px 12px 72px',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              backgroundColor: isSelected ? '#f3f4f6' : '#fff',
                                              borderBottom: '1px solid #e5e7eb'
                                            }}
                                          >
                                            <span style={{
                                              fontSize: '14px',
                                              color: '#111827'
                                            }}>
                                              {accountName}
                                            </span>
                                            {isSelected && (
                                              <Check size={16} color="#111827" />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: '#f3f4f6',
                    color: '#111827',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#156372',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

