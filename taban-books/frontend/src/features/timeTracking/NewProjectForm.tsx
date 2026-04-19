import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { customersAPI, projectsAPI } from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import toast from "react-hot-toast";
import NewCustomerForm from "./NewCustomerForm";
import { Search, Download, Plus, X, ChevronDown, Check } from "lucide-react";
import { useCurrency } from "../../hooks/useCurrency";

export default function NewProjectForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { code: rawCurrencyCode } = useCurrency();
  const baseCurrencyCode = rawCurrencyCode ? rawCurrencyCode.split(' ')[0].substring(0, 3).toUpperCase() : "KES";
  const [formData, setFormData] = useState({
    projectName: "",
    projectCode: "",
    customerName: "",
    customerId: "",
    billingMethod: "",
    description: "",
    costBudget: "",
    revenueBudget: "",
    hoursBudgetType: "",
    totalBudgetHours: "",
    addToWatchlist: true
  });
  const [showHoursBudget, setShowHoursBudget] = useState(false);

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showBillingDropdown, setShowBillingDropdown] = useState(false);
  const [billingSearch, setBillingSearch] = useState("");

  const billingMethodOptions = [
    { value: "fixed", label: "Fixed Cost for Project" },
    { value: "project-hours", label: "Based on Project Hours" },
    { value: "task-hours", label: "Based on Task Hours" },
    { value: "staff-hours", label: "Based on Staff Hours" }
  ];
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [showAdvancedSearchModal, setShowAdvancedSearchModal] = useState(false);
  const [advancedSearchType, setAdvancedSearchType] = useState("Display Name");
  const [advancedSearchValue, setAdvancedSearchValue] = useState("");
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedSearchTypeDropdown, setShowAdvancedSearchTypeDropdown] = useState(false);
  const [showImportTasksModal, setShowImportTasksModal] = useState(false);
  const [selectedProjectForImport, setSelectedProjectForImport] = useState("");

  // User dropdown states - declared early to avoid hoisting issues
  const [openUserDropdown, setOpenUserDropdown] = useState(null); // Track which user row has dropdown open
  const [userSearch, setUserSearch] = useState({}); // Search term for each user dropdown

  // Load customers from database
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const response = await customersAPI.getAll();
        // Handle response format: { success: true, data: [...] } or direct array
        const data = Array.isArray(response)
          ? response
          : (response?.data || []);

        // Transform database customers to match frontend format
        const transformedCustomers = data.map(customer => ({
          id: customer._id || customer.id,
          name: customer.name || customer.displayName || '',
          displayName: customer.name || customer.displayName || '',
          companyName: customer.companyName || customer.company || '',
          firstName: customer.firstName || customer.name?.split(' ')[0] || '',
          lastName: customer.lastName || customer.name?.split(' ').slice(1).join(' ') || '',
          email: customer.email || '',
          phone: customer.phone || customer.workPhone || customer.mobile || '',
          workPhone: customer.workPhone || customer.phone || '',
          mobile: customer.mobile || customer.phone || '',
          ...customer // Keep all other fields
        }));

        setCustomers(transformedCustomers);
      } catch (error) {
        console.error("Error loading customers:", error);
        toast.error("Failed to load customers: " + (error.message || "Unknown error"));
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();

    // Listen for customer updates (when new customer is created)
    const handleCustomerUpdate = () => {
      fetchCustomers();
    };
    window.addEventListener('customerUpdated', handleCustomerUpdate);

    return () => {
      window.removeEventListener('customerUpdated', handleCustomerUpdate);
    };
  }, []);

  // Pre-populate form data from location state (when coming from quote)
  useEffect(() => {
    if (location.state) {
      const { customerName } = location.state;
      if (customerName) {
        setFormData(prev => ({
          ...prev,
          customerName: customerName
        }));
      }
    }
  }, [location.state]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAdvancedSearchTypeDropdown && !event.target.closest('[data-dropdown]')) {
        setShowAdvancedSearchTypeDropdown(false);
      }
      if (showBillingDropdown && !event.target.closest('[data-billing-dropdown]')) {
        setShowBillingDropdown(false);
      }
      if (showCustomerDropdown && !event.target.closest('[data-customer-dropdown]')) {
        setShowCustomerDropdown(false);
      }
      if (openUserDropdown && !event.target.closest(`[data-user-dropdown="${openUserDropdown}"]`)) {
        setOpenUserDropdown(null);
      }
    };

    if (showAdvancedSearchTypeDropdown || showBillingDropdown || showCustomerDropdown || openUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAdvancedSearchTypeDropdown, showBillingDropdown, showCustomerDropdown, openUserDropdown]);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // User dropdown states (openUserDropdown and userSearch already declared above, just adding additional state)
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load available users from system
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        // Try to get users from auth/me or create a simple endpoint
        // For now, we'll use a combination of current user and a mock list
        const currentUser = getCurrentUser();
        const usersList = [];

        if (currentUser) {
          usersList.push({
            id: currentUser.id,
            name: currentUser.name || "",
            email: currentUser.email || "",
          });
        }

        // Add some default users (you can replace this with an API call)
        usersList.push(
          { id: 2, name: "JIRDE HUSSEIN KHALIF", email: "jirdehusseinkhalif@gmail.com" },
          { id: 3, name: "tabanaaaa", email: "tabanaaaa@gmail.com" },
          { id: 4, name: "user2", email: "user2@example.com" },
          { id: 5, name: "user3", email: "user3@example.com" }
        );

        setAvailableUsers(usersList);
      } catch (error) {
        console.error("Error loading users:", error);
        toast.error("Failed to load users");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Initialize users with logged-in user as default
  const getInitialUsers = () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      return [{
        id: 1,
        name: currentUser.name || "",
        email: currentUser.email || "",
        userId: currentUser.id,
        isEditable: false
      }];
    }
    return [];
  };

  const [users, setUsers] = useState(getInitialUsers);

  const [tasks, setTasks] = useState([
    { id: 1, taskName: "Task Name", description: "Description", billable: true }
  ]);

  // Filter users based on search
  const getFilteredUsers = (userId) => {
    const searchTerm = (userSearch[userId] || "").toLowerCase();
    return availableUsers.filter(u =>
      u.name.toLowerCase().includes(searchTerm) ||
      u.email.toLowerCase().includes(searchTerm)
    );
  };

  const addUser = () => {
    const newUserId = users.length + 1;
    setUsers([...users, { id: newUserId, name: "", email: "", isEditable: true }]);
  };

  const removeUser = (id) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const updateUser = (id, field, value) => {
    setUsers(users.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  const addTask = () => {
    setTasks([...tasks, { id: tasks.length + 1, taskName: "", description: "", billable: false, budgetHours: "" }]);
  };

  const removeTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateTask = (id, field, value) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  // Handle advanced search
  const handleAdvancedSearch = () => {
    let results = [];

    if (advancedSearchValue.trim() === "") {
      results = customers;
    } else {
      const searchLower = advancedSearchValue.toLowerCase();
      results = customers.filter(customer => {
        switch (advancedSearchType) {
          case "Display Name":
            return (customer.name || customer.displayName || "").toLowerCase().includes(searchLower);
          case "Company Name":
            return (customer.companyName || customer.name || "").toLowerCase().includes(searchLower);
          case "First Name":
            return (customer.firstName || customer.name?.split(' ')[0] || "").toLowerCase().includes(searchLower);
          case "Last Name":
            return (customer.lastName || customer.name?.split(' ').slice(1).join(' ') || "").toLowerCase().includes(searchLower);
          case "Email":
            return (customer.email || "").toLowerCase().includes(searchLower);
          case "Phone":
            return (customer.phone || customer.workPhone || customer.mobile || "").toLowerCase().includes(searchLower);
          default:
            return (customer.name || "").toLowerCase().includes(searchLower);
        }
      });
    }

    setAdvancedSearchResults(results);
    setCurrentPage(1);
  };

  // Initialize with all customers when modal opens
  useEffect(() => {
    if (showAdvancedSearchModal) {
      setAdvancedSearchResults(customers);
      setCurrentPage(1);
      setAdvancedSearchValue("");
    }
  }, [showAdvancedSearchModal, customers]);

  // Handle selecting a customer from advanced search
  const handleSelectCustomer = (customer) => {
    setFormData({
      ...formData,
      customerName: customer.name || customer.displayName,
      customerId: customer.id || customer._id
    });
    setShowAdvancedSearchModal(false);
    setAdvancedSearchValue("");
    setAdvancedSearchResults([]);
  };

  // Pagination helpers
  const itemsPerPage = 10;
  const totalPages = Math.ceil(advancedSearchResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedResults = advancedSearchResults.slice(startIndex, endIndex);

  return (
    <div className="w-full h-full bg-white overflow-y-auto relative z-[1]">
      <div className="max-w-[900px] p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 m-0">
            New Project
          </h2>
          <button
            onClick={() => navigate("/time-tracking/projects")}
            className="bg-transparent border-none text-2xl cursor-pointer text-gray-500 hover:text-gray-800"
          >
            ×
          </button>
        </div>

        {/* Project Details Section */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            Project Details
          </h3>

          <div className="flex flex-col gap-4">
            {/* Project Name */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-[150px] sm:text-right">
                Project Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] transition-colors"
                autoFocus
              />
            </div>

            {/* Project Code */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-[150px] sm:text-right">
                Project Code
              </label>
              <input
                type="text"
                value={formData.projectCode}
                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] transition-colors"
              />
            </div>

            {/* Customer Name */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 z-20">
              <label className="text-sm font-medium text-gray-700 min-w-[150px] sm:text-right">
                Customer Name<span className="text-red-500">*</span>
              </label>
              <div className="flex-1 flex gap-2 relative" data-customer-dropdown>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={formData.customerName || customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setFormData({ ...formData, customerName: e.target.value });
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Select customer"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] transition-colors"
                  />
                  <div
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    className="absolute right-10 top-1/2 -translate-y-1/2 cursor-pointer p-1"
                  >
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </div>
                  <button
                    onClick={() => {
                      setShowAdvancedSearchModal(true);
                      setShowCustomerDropdown(false);
                    }}
                    className="absolute right-0 top-0 bottom-0 bg-[#156372] hover:bg-[#0D4A52] text-white rounded-r px-3 flex items-center justify-center transition-colors"
                  >
                    <Search className="w-4 h-4 text-white" />
                  </button>
                </div>
                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-[300px] overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Search..."
                          className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-[#156372]"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {loadingCustomers ? (
                        <div className="p-4 text-center">
                          <div className="w-6 h-6 border-2 border-[#156372] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <div className="text-gray-500 text-sm">Loading customers...</div>
                        </div>
                      ) : filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center">
                          <div className="text-gray-500 text-sm mb-3">NO RESULTS FOUND</div>
                          <button
                            onClick={() => {
                              setShowCustomerDropdown(false);
                              setShowNewCustomerForm(true);
                            }}
                            className="text-[#156372] hover:text-[#0D4A52] font-medium text-sm flex items-center justify-center gap-2 w-full"
                          >
                            <Plus className="w-4 h-4" /> New Customer
                          </button>
                        </div>
                      ) : (
                        <div>
                          {filteredCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  customerName: customer.name || customer.displayName,
                                  customerId: customer.id || customer._id
                                });
                                setCustomerSearch("");
                                setShowCustomerDropdown(false);
                              }}
                              className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
                            >
                              {customer.name || customer.displayName}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {filteredCustomers.length > 0 && (
                      <button
                        onClick={() => {
                          setShowCustomerDropdown(false);
                          setShowNewCustomerForm(true);
                        }}
                        className="p-3 border-t border-gray-100 text-[#156372] hover:bg-[#156372]/10 font-medium text-sm flex items-center justify-center gap-2 w-full transition-colors sticky bottom-0 bg-white"
                      >
                        <Plus className="w-4 h-4" /> New Customer
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Billing Method */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 z-10">
              <label className="text-sm font-medium text-gray-700 min-w-[150px] sm:text-right">
                Billing Method<span className="text-red-500">*</span>
              </label>
              <div className="flex-1 relative" data-billing-dropdown>
                <button
                  type="button"
                  onClick={() => {
                    setShowBillingDropdown(!showBillingDropdown);
                    setBillingSearch("");
                  }}
                  className="w-full px-3 py-2 border border-[#156372] rounded text-sm text-left bg-white outline-none flex items-center justify-between"
                >
                  <span className={`${formData.billingMethod ? 'text-gray-800' : 'text-gray-400'}`}>
                    {formData.billingMethod
                      ? billingMethodOptions.find(opt => opt.value === formData.billingMethod)?.label || "Select billing method"
                      : "Select billing method"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showBillingDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showBillingDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={billingSearch}
                          onChange={(e) => setBillingSearch(e.target.value)}
                          placeholder="Search..."
                          className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-[#156372]"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="max-h-[200px] overflow-y-auto">
                      {billingMethodOptions
                        .filter(option =>
                          option.label.toLowerCase().includes(billingSearch.toLowerCase())
                        )
                        .map((option) => (
                          <div
                            key={option.value}
                            onClick={() => {
                              setFormData({ ...formData, billingMethod: option.value });
                              setShowBillingDropdown(false);
                              setBillingSearch("");
                            }}
                            className={`px-4 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-[#156372]/10 ${formData.billingMethod === option.value ? 'bg-[#156372] text-white hover:bg-[#0D4A52]' : 'text-gray-700'
                              }`}
                          >
                            <span>{option.label}</span>
                            {formData.billingMethod === option.value && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-[150px] sm:text-right pt-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Max. 2000 characters"
                rows="4"
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] transition-colors resize-y"
              />
            </div>
          </div>
        </div>

        {/* Budget Section */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            Budget
          </h3>

          <div className="flex flex-col gap-4">
            {/* Cost Budget */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-[150px] sm:text-right flex items-center justify-end gap-1">
                Cost Budget
                <span className="text-gray-400 group relative inline-block cursor-help hover:text-gray-600">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 6v2M8 10h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </label>
              <div className="flex-1 flex items-stretch border border-gray-300 rounded overflow-hidden focus-within:border-[#156372] focus-within:ring-1 focus-within:ring-[#156372] transition-colors">
                <div className="bg-gray-50 px-3 flex items-center border-r border-gray-300 text-sm text-gray-500 min-w-[60px] justify-center bg-[#f9fafb]">
                  {baseCurrencyCode || "KES"}
                </div>
                <input
                  type="text"
                  value={formData.costBudget}
                  onChange={(e) => setFormData({ ...formData, costBudget: e.target.value })}
                  className="w-full px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            {/* Revenue Budget */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-[150px] sm:text-right flex items-center justify-end gap-1">
                Revenue Budget
                <span className="text-gray-400 group relative inline-block cursor-help hover:text-gray-600">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 6v2M8 10h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </label>
              <div className="flex-1 flex items-stretch border border-gray-300 rounded overflow-hidden focus-within:border-[#156372] focus-within:ring-1 focus-within:ring-[#156372] transition-colors">
                <div className="bg-gray-50 px-3 flex items-center border-r border-gray-300 text-sm text-gray-500 min-w-[60px] justify-center bg-[#f9fafb]">
                  {baseCurrencyCode || "KES"}
                </div>
                <input
                  type="text"
                  value={formData.revenueBudget}
                  onChange={(e) => setFormData({ ...formData, revenueBudget: e.target.value })}
                  className="w-full px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            {/* Add budget link */}
            <div className="pl-0 sm:pl-[166px]">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowHoursBudget(true);
                }}
                className="text-[#156372] hover:text-[#0D4A52] text-sm hover:underline"
              >
                Add budget for project hours.
              </a>
            </div>

            {/* Hours Budget Type */}
            {showHoursBudget && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="text-sm font-medium text-gray-700 min-w-[150px] sm:text-right flex items-center justify-end gap-1">
                    Hours Budget Type
                    <span className="text-gray-400 group relative inline-block cursor-help hover:text-gray-600">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 6v2M8 10h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={formData.hoursBudgetType}
                      onChange={(e) => setFormData({ ...formData, hoursBudgetType: e.target.value, totalBudgetHours: "" })}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] transition-colors bg-white appearance-none"
                    >
                      <option value="">Select hours budget type</option>
                      <option value="total-project-hours">Total Project Hours (HH:MM)</option>
                      <option value="hours-per-task">Hours Per Task</option>
                      <option value="hours-per-staff">Hours Per Staff</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                </div>

                {/* Helper text based on selection */}
                {formData.hoursBudgetType === "total-project-hours" && (
                  <div className="pl-0 sm:pl-[166px] text-sm text-gray-600 mt-1">
                    If you select this option, you can track your budget for the total project hours.
                  </div>
                )}
                {formData.hoursBudgetType === "hours-per-task" && (
                  <div className="pl-0 sm:pl-[166px] text-sm text-gray-600 mt-1">
                    If you select this option, you can track your budget for the project tasks.
                  </div>
                )}
                {formData.hoursBudgetType === "hours-per-staff" && (
                  <div className="pl-0 sm:pl-[166px] text-sm text-gray-600 mt-1">
                    If you select this option, you can track your budget for the staff hours.
                  </div>
                )}

                {/* Total Budget Hours field - shown when "Total Project Hours" is selected */}
                {formData.hoursBudgetType === "total-project-hours" && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-4">
                    <label className="text-sm font-medium text-red-600 min-w-[150px] sm:text-right flex items-center justify-end gap-1">
                      Total Budget Hours<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.totalBudgetHours}
                      onChange={(e) => setFormData({ ...formData, totalBudgetHours: e.target.value })}
                      placeholder="Budget Hours (HH:MM)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] transition-colors"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Users Section */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            Users
          </h3>

          <div className="border border-gray-200 rounded-lg mb-4 overflow-visible relative">
            <div className="overflow-visible rounded-lg relative">
              <table className="w-full border-collapse relative overflow-visible">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                      S.NO
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      USER
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      EMAIL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 relative">
                        {user.isEditable ? (
                          <div className="relative" data-user-dropdown={user.id} style={{ zIndex: openUserDropdown === user.id ? 99999 : 'auto' }}>
                            <div className="relative">
                              <input
                                type="text"
                                value={user.name || ""}
                                onChange={(e) => {
                                  updateUser(user.id, "name", e.target.value);
                                  setUserSearch({ ...userSearch, [user.id]: e.target.value });
                                  setOpenUserDropdown(user.id);
                                }}
                                onFocus={() => setOpenUserDropdown(user.id)}
                                placeholder="Select user"
                                className="w-full px-2 py-1.5 pr-8 border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] transition-colors bg-white"
                              />
                              <div
                                onClick={() => setOpenUserDropdown(openUserDropdown === user.id ? null : user.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer p-1 z-10"
                              >
                                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openUserDropdown === user.id ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                            {openUserDropdown === user.id && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-2xl max-h-[300px] overflow-hidden flex flex-col z-[99999]">
                                <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                      type="text"
                                      value={userSearch[user.id] || ""}
                                      onChange={(e) => {
                                        setUserSearch({ ...userSearch, [user.id]: e.target.value });
                                      }}
                                      placeholder="Search"
                                      className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-[#156372]"
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                <div className="overflow-y-auto flex-1">
                                  {loadingUsers ? (
                                    <div className="p-4 text-center">
                                      <div className="w-4 h-4 border-2 border-[#156372] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                      <div className="text-gray-500 text-sm">Loading users...</div>
                                    </div>
                                  ) : getFilteredUsers(user.id).length === 0 ? (
                                    <div className="p-4 text-center">
                                      <div className="text-gray-500 text-sm mb-3">NO RESULTS FOUND</div>
                                      <button
                                        onClick={() => {
                                          setOpenUserDropdown(null);
                                          // You can add invite user functionality here
                                        }}
                                        className="text-[#156372] hover:text-[#0D4A52] font-medium text-sm flex items-center justify-center gap-2 w-full hover:underline"
                                      >
                                        <Plus className="w-4 h-4" /> Invite User
                                      </button>
                                    </div>
                                  ) : (
                                    <div>
                                      {getFilteredUsers(user.id).map((availableUser) => (
                                        <div
                                          key={availableUser.id}
                                          onClick={() => {
                                            setUsers(users.map(u =>
                                              u.id === user.id
                                                ? { ...u, name: availableUser.name, email: availableUser.email, userId: availableUser.id }
                                                : u
                                            ));
                                            setOpenUserDropdown(null);
                                            setUserSearch({ ...userSearch, [user.id]: "" });
                                          }}
                                          className="px-4 py-2 hover:bg-[#156372]/10 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
                                        >
                                          {availableUser.name}
                                        </div>
                                      ))}
                                      <div className="border-t border-gray-100 mt-1">
                                        <button
                                          onClick={() => {
                                            setOpenUserDropdown(null);
                                            // You can add invite user functionality here
                                          }}
                                          className="w-full px-4 py-2 text-[#156372] hover:bg-[#156372]/10 hover:text-[#0D4A52] font-medium text-sm flex items-center justify-center gap-2"
                                        >
                                          <Plus className="w-4 h-4" /> Invite User
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{user.name}</span>
                            {/* No remove button for default user */}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <input
                          type="email"
                          value={user.email || ""}
                          onChange={(e) => updateUser(user.id, "email", e.target.value)}
                          placeholder="Email"
                          readOnly={!user.isEditable}
                          className={`w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] transition-colors ${!user.isEditable
                            ? 'bg-gray-100 cursor-not-allowed text-gray-500'
                            : 'bg-white'
                            }`}
                        />
                      </td>
                      {formData.hoursBudgetType === "hours-per-staff" && (
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <input
                            type="text"
                            value={user.budgetHours || ""}
                            onChange={(e) => updateUser(user.id, "budgetHours", e.target.value)}
                            placeholder="HH:MM"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] transition-colors bg-white"
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={addUser}
            className="text-[#156372] hover:bg-[#156372]/10 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors border border-transparent hover:border-[#156372]/20"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {/* Project Tasks Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
            <h3 className="text-base font-semibold text-gray-800 m-0">
              Project Tasks
            </h3>
            <button
              onClick={() => setShowImportTasksModal(true)}
              className="text-[#156372] hover:text-[#0D4A52] text-sm flex items-center gap-1.5 hover:underline bg-transparent border-none cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Import project tasks from existing projects.
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                    S.NO
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    TASK NAME
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    DESCRIPTION
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                    BILLABLE
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => (
                  <tr key={task.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <input
                        type="text"
                        value={task.taskName}
                        onChange={(e) => updateTask(task.id, "taskName", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <textarea
                        value={task.description}
                        onChange={(e) => updateTask(task.id, "description", e.target.value)}
                        rows={1}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] transition-colors resize-y min-h-[34px]"
                      />
                    </td>
                    {formData.hoursBudgetType === "hours-per-task" && (
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <input
                          type="text"
                          value={task.budgetHours || ""}
                          onChange={(e) => updateTask(task.id, "budgetHours", e.target.value)}
                          placeholder="HH:MM"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] transition-colors bg-white"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="checkbox"
                          checked={task.billable}
                          onChange={(e) => updateTask(task.id, "billable", e.target.checked)}
                          className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                        />
                        <button
                          onClick={() => removeTask(task.id)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addTask}
            className="text-[#156372] hover:bg-[#156372]/10 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors border border-transparent hover:border-[#156372]/20"
          >
            <Plus className="w-4 h-4" />
            Add Project Task
          </button>
        </div>

        {/* Watchlist Checkbox */}
        <div className="mb-8">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={formData.addToWatchlist}
              onChange={(e) => setFormData({ ...formData, addToWatchlist: e.target.checked })}
              className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">
              Add to the watchlist on my dashboard
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-start gap-4 pt-4 border-t border-gray-200">
          <button
            onClick={async () => {
              // Validate required fields
              if (!formData.projectName || !formData.customerName || !formData.billingMethod) {
                toast.error("Please fill in all required fields");
                return;
              }

              if (!formData.customerId) {
                toast.error("Please select a valid customer");
                return;
              }

              try {
                // Create new project object for database
                const newProject = {
                  name: formData.projectName,
                  projectNumber: formData.projectCode || undefined, // Will be auto-generated if not provided
                  description: formData.description || '',
                  billingRate: formData.costBudget ? parseFloat(formData.costBudget) : 0,
                  budget: formData.revenueBudget ? parseFloat(formData.revenueBudget) : 0,
                  status: 'planning',
                  billable: true,
                  startDate: new Date(),
                };

                // Add customer if provided and valid
                if (formData.customerId) {
                  newProject.customer = formData.customerId;
                }

                // Map assigned users if they have valid IDs
                const assignedUserIds = users
                  .filter(u => u.userId && typeof u.userId === 'string' && u.userId.match(/^[0-9a-fA-F]{24}$/))
                  .map(u => u.userId);

                if (assignedUserIds.length > 0) {
                  newProject.assignedTo = assignedUserIds;
                }

                // Add budget hours fields
                if (formData.hoursBudgetType) {
                  newProject.hoursBudgetType = formData.hoursBudgetType;

                  // Add total budget hours if selected
                  if (formData.hoursBudgetType === 'total-project-hours' && formData.totalBudgetHours) {
                    newProject.totalBudgetHours = formData.totalBudgetHours;
                  }

                  // Add tasks with budget hours if selected
                  if (formData.hoursBudgetType === 'hours-per-task' && tasks.length > 0) {
                    newProject.tasks = tasks.map(task => ({
                      taskName: task.taskName || '',
                      description: task.description || '',
                      billable: task.billable !== undefined ? task.billable : true,
                      budgetHours: task.budgetHours || '',
                    }));
                  }

                  // Add user budget hours if selected
                  if (formData.hoursBudgetType === 'hours-per-staff' && users.length > 0) {
                    newProject.userBudgetHours = users
                      .filter(u => u.userId && typeof u.userId === 'string' && u.userId.match(/^[0-9a-fA-F]{24}$/))
                      .map(u => ({
                        user: u.userId,
                        budgetHours: u.budgetHours || '',
                      }));
                  }
                }

                // Remove undefined values (but keep null for optional fields)
                Object.keys(newProject).forEach(key => {
                  if (newProject[key] === undefined) {
                    delete newProject[key];
                  }
                });

                // Save to database
                const response = await projectsAPI.create(newProject);

                toast.success("Project created successfully!");
                const isEmbeddedQuickAction = new URLSearchParams(location.search).get("embed") === "1";
                if (isEmbeddedQuickAction && window.parent && window.parent !== window) {
                  window.parent.postMessage(
                    {
                      type: "quick-action-created",
                      entity: "project",
                      data: response?.data || null
                    },
                    window.location.origin
                  );
                }

                // Trigger project update event
                window.dispatchEvent(new Event('projectUpdated'));

                // Navigate back to projects page
                navigate("/time-tracking/projects");
              } catch (error) {
                console.error("Error creating project:", error);
                toast.error("Failed to create project: " + (error.message || "Unknown error"));
              }
            }}
            className="px-6 py-2 text-white rounded text-sm font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            Save
          </button>
          <button
            onClick={() => navigate("/time-tracking/projects")}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* New Customer Form Modal */}
      {showNewCustomerForm && (
        <div className="fixed inset-0 z-[2000]">
          <NewCustomerForm onClose={() => setShowNewCustomerForm(false)} />
        </div>
      )}

      {/* Advanced Customer Search Modal */}
      {showAdvancedSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[2000] flex items-start justify-center pt-16"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdvancedSearchModal(false);
          }}
        >
          <div className="bg-white rounded-lg w-[90%] max-w-[800px] max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 m-0">
                Advanced Customer Search
              </h2>
              <button
                onClick={() => {
                  setShowAdvancedSearchModal(false);
                  setAdvancedSearchValue("");
                  setAdvancedSearchResults([]);
                }}
                className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Controls */}
            <div className="p-6 border-b border-gray-200 flex gap-3">
              <div className="relative" data-dropdown>
                <button
                  onClick={() => setShowAdvancedSearchTypeDropdown(!showAdvancedSearchTypeDropdown)}
                  className="px-3 py-2.5 border border-gray-300 rounded bg-white text-sm text-gray-700 flex items-center justify-between min-w-[160px] hover:bg-gray-50"
                >
                  <span>{advancedSearchType}</span>
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
                {showAdvancedSearchTypeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 overflow-hidden">
                    {["Display Name", "Company Name", "First Name", "Last Name", "Email", "Phone"].map((type) => (
                      <div
                        key={type}
                        onClick={() => {
                          setAdvancedSearchType(type);
                          setShowAdvancedSearchTypeDropdown(false);
                        }}
                        className={`px-4 py-2 cursor-pointer text-sm hover:bg-gray-50 ${advancedSearchType === type ? 'bg-[#156372]/10 text-[#0D4A52] font-medium' : 'text-gray-700'
                          }`}
                      >
                        {type}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={advancedSearchValue}
                onChange={(e) => setAdvancedSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdvancedSearch();
                }}
                placeholder="Enter search value"
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] transition-colors"
              />
              <button
                onClick={handleAdvancedSearch}
                className="px-6 py-2.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                Search
              </button>
            </div>

            {/* Results Table */}
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      CUSTOMER NAME
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      EMAIL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      COMPANY NAME
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      PHONE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResults.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-gray-500 text-sm">
                        {advancedSearchValue ? "No results found" : "Enter a search term and click Search"}
                      </td>
                    </tr>
                  ) : (
                    paginatedResults.map((customer) => (
                      <tr
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="border-b border-gray-100 cursor-pointer hover:bg-[#156372]/10 transition-colors group"
                      >
                        <td className="px-4 py-3 text-sm text-[#156372] group-hover:text-[#0D4A52] font-medium">
                          {customer.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {customer.email || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {customer.companyName || customer.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {customer.phone || customer.workPhone || customer.mobile || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex justify-end items-center gap-3">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
                >
                  &lt;
                </button>
                <span className="text-sm text-gray-600 font-medium">
                  {currentPage} - {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Project Tasks Modal */}
      {showImportTasksModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[2000] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowImportTasksModal(false);
          }}
        >
          <div className="bg-white rounded-lg w-full max-w-[500px] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 m-0">
                Import Tasks
              </h2>
              <button
                onClick={() => {
                  setShowImportTasksModal(false);
                  setSelectedProjectForImport("");
                }}
                className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select an existing project
              </label>
              <div className="relative">
                <select
                  value={selectedProjectForImport}
                  onChange={(e) => setSelectedProjectForImport(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] appearance-none transition-colors"
                >
                  <option value="">Select a project</option>
                  {(() => {
                    const existingProjects = JSON.parse(localStorage.getItem('projects') || '[]');
                    return existingProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.projectName || project.name}
                      </option>
                    ));
                  })()}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportTasksModal(false);
                  setSelectedProjectForImport("");
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedProjectForImport) {
                    alert("Please select a project to import tasks from");
                    return;
                  }

                  const existingProjects = JSON.parse(localStorage.getItem('projects') || '[]');
                  const selectedProject = existingProjects.find(p => p.id === selectedProjectForImport);

                  if (selectedProject && selectedProject.tasks && selectedProject.tasks.length > 0) {
                    // Import tasks from selected project
                    const importedTasks = selectedProject.tasks.map((task, index) => ({
                      id: Date.now() + index,
                      taskName: task.taskName || task.name || "",
                      description: task.description || "",
                      billable: task.billable !== undefined ? task.billable : true
                    }));

                    setTasks([...tasks, ...importedTasks]);
                    setShowImportTasksModal(false);
                    setSelectedProjectForImport("");
                    alert(`Successfully imported ${importedTasks.length} task(s)`);
                  } else {
                    alert("Selected project has no tasks to import");
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
