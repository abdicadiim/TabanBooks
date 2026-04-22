import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Search,
  Plus,
  Settings,
  ChevronDown,
  ChevronUp,
  Grid3x3,
  ShoppingCart,
  ShoppingBag,
  Building2,
  X,
  User,
  LogOut,
  LogIn,
  Copy,
  Check,
} from "lucide-react";
import { logout } from "../services/auth";
import { useAppBootstrap } from "../context/AppBootstrapContext";
import { useQueryClient } from "@tanstack/react-query";
import { preloadCustomersIndexData } from "../features/sales/Customers/customerRouteLoaders";

export default function TopBar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authenticated, currentUser, organization, resetBootstrap, branding } = useAppBootstrap();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [copiedOrgId, setCopiedOrgId] = useState(null);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchScope, setSearchScope] = useState("Customers");
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [advancedSearchType, setAdvancedSearchType] = useState("Customers");
  const [advancedFilterType, setAdvancedFilterType] = useState("All Customers");
  const [searchTypeDropdownOpen, setSearchTypeDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [searchTypeQuery, setSearchTypeQuery] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [customerTypeDropdownOpen, setCustomerTypeDropdownOpen] = useState(false);
  const [statusQuery, setStatusQuery] = useState("");
  const [customerTypeQuery, setCustomerTypeQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedCustomerType, setSelectedCustomerType] = useState("");
  const isLightAppearance = String(branding?.appearance || "dark") === "light";
  const headerBackground = isLightAppearance ? "#ffffff" : "linear-gradient(90deg, #0f5f6c 0%, #156372 100%)";

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      resetBootstrap();
      setUserMenuOpen(false);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Handle sign in click
  const handleSignIn = () => {
    navigate("/login");
  };
  const searchTypeDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const customerTypeDropdownRef = useRef<HTMLDivElement>(null);

  const quickCreateRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickCreateRef.current && !quickCreateRef.current.contains(event.target)) {
        setQuickCreateOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        setHelpOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target)) {
        setOrgDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchDropdownOpen(false);
      }
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target)) {
        setSearchTypeDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setFilterDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
      if (customerTypeDropdownRef.current && !customerTypeDropdownRef.current.contains(event.target)) {
        setCustomerTypeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const quickCreateItems = {
    GENERAL: [
      { label: "Add User", path: "/settings/users" },
      { label: "Item", path: "/items/new" },
      { label: "Journal Entry", path: "/accountant/manual-journals/new" },
      { label: "Log Time", path: "/time-tracking/timesheet" },
      { label: "Weekly Log", path: "/time-tracking/timesheet/weekly" },
    ],
    INVENTORY: [
      { label: "Inventory Adjustments", path: "/inventory/new" },
    ],
    SALES: [
      { label: "Customer", path: "/sales/customers/new" },
      { label: "Quotes", path: "/sales/quotes/new" },
      { label: "Invoices", path: "/sales/invoices/new" },
      { label: "Recurring Invoice", path: "/sales/recurring-invoices/new" },
      { label: "Retail Invoice", path: "/sales/invoices/new-retail" },
      { label: "Customer Payment", path: "/sales/payments-received/new" },
      { label: "Credit Notes", path: "/sales/credit-notes/new" },
    ],
    PURCHASES: [
      { label: "Vendor", path: "/purchases/vendors/new" },
      { label: "Expenses", path: "/purchases/expenses/new" },
      { label: "Recurring Expense", path: "/purchases/recurring-expenses/new" },
      { label: "Bill", path: "/purchases/bills/new" },
      { label: "Recurring Bill", path: "/purchases/recurring-bills/new" },
      { label: "Purchase Order", path: "/purchases/purchase-orders/new" },
      { label: "Vendor Payment", path: "/purchases/payments-made/new" },
      { label: "Vendor Credit", path: "/purchases/vendor-credits/new" },
    ],
    BANKING: [
      { label: "Bank Transfer", path: "/banking" },
      { label: "Employee Reimbursement", path: "/banking" },
      { label: "Card Payment", path: "/banking" },
      { label: "Owner Drawings", path: "/banking" },
      { label: "Other Income", path: "/banking" },
    ],
  };

  const organizationId = String((organization as any)?.id || (organization as any)?._id || "");
  const organizations = organizationId
    ? [
      {
        id: organizationId,
        name: String((organization as any)?.name || "Organization"),
        plan: String((organization as any)?.planName || ""),
        icon: String((organization as any)?.icon || ""),
      },
    ]
    : [];

  const handleCopyOrgId = (orgId: string) => {
    navigator.clipboard.writeText(orgId);
    setCopiedOrgId(orgId);
    setTimeout(() => setCopiedOrgId(null), 2000);
  };

  const handleQuickCreateClick = (path: string) => {
    setQuickCreateOpen(false);
    if (path) {
      navigate(path);
    }
  };

  const searchOptions = [
    { label: "Customers", path: "/sales/customers" },
    { label: "Items", path: "/items" },
    { label: "Inventory Adjustments", path: "/inventory" },
    { label: "Banking", path: "/banking" },
    { label: "Quotes", path: "/sales/quotes" },
    { label: "Invoices", path: "/sales/invoices" },
    { label: "Credit Notes", path: "/sales/credit-notes" },
    { label: "Vendors", path: "/purchases/vendors" },
    { label: "Expenses", path: "/purchases/expenses" },
    { label: "Purchase Orders", path: "/purchases/purchase-orders" },
    { label: "Bills", path: "/purchases/bills" },
    { label: "Payments Made", path: "/purchases/payments-made" },
    { label: "Vendor Credits", path: "/purchases/vendor-credits" },
    { label: "Projects", path: "/time-tracking/projects" },
    { label: "Timesheet", path: "/time-tracking/timesheet" },
    { label: "Chart of Accounts", path: "/accountant/chart-of-accounts" },
    { label: "Documents", path: "/documents" },
    { label: "Tasks", path: "/tasks" },
  ];

  const handleSearchScopeChange = (option: string) => {
    setSearchScope(option.label);
    setSearchDropdownOpen(false);
    if (option.path) {
      navigate(option.path);
    }
  };

  const handleCustomersPrefetch = () => {
    void preloadCustomersIndexData(queryClient);
  };

  return (
    <>
      <div className={`relative z-[70] h-14 ${isLightAppearance ? "bg-white border-b border-slate-200" : "border-b border-transparent"}`} style={{ background: headerBackground }}>
        <div className="h-full px-3 md:px-5 flex items-center justify-between gap-3">
          {/* Left: App icon + menu */}
          <div className="flex items-center gap-2 min-w-0 md:min-w-[220px]">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('toggleMobileSidebar'))}
              className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center flex-shrink-0"
            >
              <Menu size={18} className="text-slate-700" />
            </button>
          </div>

          {/* Middle search removed */}

          {/* Right: org dropdown + actions */}
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0 md:min-w-[280px] justify-end">
            {/* Organization Dropdown - Only show if authenticated */}
            {authenticated && organization && (
              <div className="relative hidden md:block" ref={orgDropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOrgDropdownOpen(!orgDropdownOpen);
                    setQuickCreateOpen(false);
                    setHelpOpen(false);
                    setNotificationsOpen(false);
                    setUserMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[12px] text-slate-700"
                >
                  {organization.name || "Organization"}{" "}
                  {orgDropdownOpen ? (
                    <ChevronUp size={14} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={14} className="text-slate-400" />
                  )}
                </button>
                {orgDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[400px] bg-white border border-slate-200 rounded-lg shadow-lg z-[100]">
                    <div className="flex items-center justify-between p-4 border-b border-slate-200">
                      <h3 className="text-sm font-semibold text-slate-900">Organizations</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrgDropdownOpen(false);
                            navigate("/organizations/manage");
                          }}
                          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                        >
                          <Settings size={14} />
                          Manage
                        </button>
                        <button
                          onClick={() => setOrgDropdownOpen(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-medium text-slate-500 px-2 py-1 mb-1">My Organizations</div>
                      {organizations.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-slate-500">No organizations found</div>
                      ) : (
                        organizations.map((org, idx) => (
                          <div
                            key={org.id}
                            className={`p-3 rounded-lg cursor-pointer hover:bg-slate-100 ${idx === 0 ? "bg-slate-100" : ""
                              }`}
                            onClick={() => {
                              setOrgDropdownOpen(false);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="text-2xl">
                                  {org.icon ? (
                                    org.icon
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                                      <Building2 size={18} className="text-slate-500" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-slate-900">{org.name}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-500">
                                      Organization ID: {org.id}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyOrgId(org.id);
                                      }}
                                      className="text-slate-400 hover:text-slate-600"
                                    >
                                      {copiedOrgId === org.id ? (
                                        <Check size={12} className="text-green-600" />
                                      ) : (
                                        <Copy size={12} />
                                      )}
                                    </button>
                                  </div>
                                  {org.plan && <div className="text-xs text-slate-600 mt-1">{org.plan}</div>}
                                </div>
                              </div>
                              {idx === 0 && (
                                <div className="w-5 h-5 rounded-full text-white flex items-center justify-center" style={{ background: isLightAppearance ? "#475569" : "linear-gradient(90deg, #0f5f6c 0%, #156372 100%)" }}>
                                  <Check size={12} className="text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Create Button */}
            <div className="relative" ref={quickCreateRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickCreateOpen(!quickCreateOpen);
                  setHelpOpen(false);
                  setNotificationsOpen(false);
                  setUserMenuOpen(false);
                  setOrgDropdownOpen(false);
                }}
                className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-sm transition-colors ${
                  isLightAppearance
                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "text-white hover:opacity-90"
                }`}
                style={!isLightAppearance ? { background: "linear-gradient(90deg, #0f5f6c 0%, #156372 100%)" } : undefined}
                title="Quick Create"
              >
                <Plus size={18} className={isLightAppearance ? "text-slate-700" : "text-white"} />
              </button>
              {quickCreateOpen && (
                <div className="absolute right-0 top-full mt-2 w-[700px] bg-white border border-slate-200 rounded-lg shadow-xl z-[100] p-4">
                  <div className="grid grid-cols-5 gap-4">
                    {Object.entries(quickCreateItems).map(([category, items]) => (
                      <div key={category} className="flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                          {category === "GENERAL" && <Grid3x3 size={16} className="text-slate-500" />}
                          {category === "INVENTORY" && (
                            <ShoppingCart size={16} className="text-slate-500" />
                          )}
                          {category === "SALES" && (
                            <ShoppingBag size={16} className="text-slate-500" />
                          )}
                          {category === "PURCHASES" && (
                            <ShoppingBag size={16} className="text-slate-500" />
                          )}
                          {category === "BANKING" && (
                            <Building2 size={16} className="text-slate-500" />
                          )}
                          <span className="text-xs font-semibold text-slate-600 uppercase">
                            {category}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {items.map((item) => (
                            <button
                              key={item.label}
                              onClick={() => handleQuickCreateClick(item.path)}
                              className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-2"
                            >
                              <Plus size={12} className="text-slate-400" />
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings Button */}
            <button
              onClick={() => {
                navigate("/settings");
              }}
              className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
            >
              <Settings size={18} className="text-slate-700" />
            </button>

            {/* Sign In / User Profile Button */}
            {authenticated && currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserMenuOpen(!userMenuOpen);
                    setQuickCreateOpen(false);
                    setHelpOpen(false);
                    setNotificationsOpen(false);
                    setOrgDropdownOpen(false);
                  }}
                  className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-[12px] font-semibold overflow-hidden border border-slate-200"
                >
                  {organization?.logo ? (
                    <img
                      src={organization.logo}
                      alt={organization.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerText = (organization?.name || currentUser?.name || "U").charAt(0).toUpperCase();
                      }}
                    />
                  ) : (
                    (organization?.name || currentUser?.name || "U").charAt(0).toUpperCase()
                  )}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[250px] bg-white border border-slate-200 rounded-lg shadow-lg z-[100] py-2">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <div className="text-sm font-semibold text-slate-900">
                        {currentUser.name || "User"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {currentUser.email || ""}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigate("/settings/profile");
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <User size={16} />
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        navigate("/settings");
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Settings size={16} />
                      Account Settings
                    </button>
                    <div className="border-t border-slate-200 my-2" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[12px] font-medium text-slate-700 flex items-center gap-2"
              >
                <LogIn size={16} />
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Advanced Search Modal */}
        {advancedSearchOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Search</label>
                    <div className="relative" ref={searchTypeDropdownRef}>
                      <button
                        onClick={() => {
                          setSearchTypeDropdownOpen(!searchTypeDropdownOpen);
                          setFilterDropdownOpen(false);
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none cursor-pointer bg-white flex items-center gap-2 min-w-[150px] justify-between"
                      >
                        <span>{advancedSearchType}</span>
                        {searchTypeDropdownOpen ? (
                          <ChevronUp size={14} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={14} className="text-gray-400" />
                        )}
                      </button>
                      {searchTypeDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[300] min-w-[250px] max-h-[400px] overflow-hidden flex flex-col">
                          <div className="p-2 border-b border-gray-200">
                            <div className="relative">
                              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Q Search"
                                value={searchTypeQuery}
                                onChange={(e) => setSearchTypeQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md outline-none"
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto max-h-[350px]">
                            {[
                              "Customers",
                              "Items",
                              "Inventory Adjustments",
                              "Banking",
                              "Quotes",
                              "Invoices",
                              "Payments Received",
                              "Recurring Invoices",
                              "Credit Notes",
                              "Vendors",
                              "Expenses",
                              "Recurring Expenses",
                              "Purchase Orders",
                              "Bills",
                              "Payments Made",
                              "Recurring Bills",
                              "Vendor Credits",
                              "Projects",
                              "Timesheet",
                              "Journals",
                              "Chart of Accounts",
                              "Documents",
                              "Tasks"
                            ]
                              .filter(option => option.toLowerCase().includes(searchTypeQuery.toLowerCase()))
                              .map((option) => (
                                <div
                                  key={option}
                                  onMouseEnter={option === "Customers" ? handleCustomersPrefetch : undefined}
                                  onFocus={option === "Customers" ? handleCustomersPrefetch : undefined}
                                  onClick={() => {
                                    setAdvancedSearchType(option);
                                    setSearchTypeDropdownOpen(false);
                                    setSearchTypeQuery("");
                                  }}
                                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${advancedSearchType === option
                                    ? "bg-gray-100 text-black"
                                    : "text-black hover:bg-gray-50"
                                    }`}
                                >
                                  <span className="text-black">{option}</span>
                                  {advancedSearchType === option && (
                                    <Check size={16} className="text-black" />
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Filter</label>
                    <div className="relative" ref={filterDropdownRef}>
                      <button
                        onClick={() => {
                          setFilterDropdownOpen(!filterDropdownOpen);
                          setSearchTypeDropdownOpen(false);
                        }}
                        className="px-3 py-1.5 border border-slate-300 rounded-md text-sm outline-none cursor-pointer bg-white flex items-center gap-2 min-w-[150px] justify-between"
                      >
                        <span>{advancedFilterType}</span>
                        {filterDropdownOpen ? (
                          <ChevronUp size={14} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={14} className="text-gray-400" />
                        )}
                      </button>
                      {filterDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[300] min-w-[250px] max-h-[400px] overflow-hidden flex flex-col">
                          <div className="p-2 border-b border-gray-200">
                            <div className="relative">
                              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search"
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md outline-none"
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto max-h-[350px]">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                              Default Filters
                            </div>
                            {[
                              "All Customers",
                              "Active Customers",
                              "CRM Customers",
                              "Duplicate Customers",
                              "Inactive Customers",
                              "Customer Portal Enabled",
                              "Customer Portal Disabled",
                              "Overdue Customers",
                              "Unpaid Customers"
                            ]
                              .filter(option => option.toLowerCase().includes(filterQuery.toLowerCase()))
                              .map((option) => (
                                <div
                                  key={option}
                                  onClick={() => {
                                    setAdvancedFilterType(option);
                                    setFilterDropdownOpen(false);
                                    setFilterQuery("");
                                  }}
                                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${advancedFilterType === option
                                    ? "bg-gray-100 text-black"
                                    : "text-black hover:bg-gray-50"
                                    }`}
                                >
                                  <span className="text-black">{option}</span>
                                  {advancedFilterType === option && (
                                    <Check size={16} className="text-black" />
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setAdvancedSearchOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <div className="relative" ref={statusDropdownRef}>
                        <button
                          onClick={() => {
                            setStatusDropdownOpen(!statusDropdownOpen);
                            setCustomerTypeDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none cursor-pointer bg-white flex items-center justify-between"
                        >
                          <span>{selectedStatus || "All"}</span>
                          {statusDropdownOpen ? (
                            <ChevronUp size={16} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-400" />
                          )}
                        </button>
                        {statusDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[300] w-full overflow-hidden flex flex-col">
                            <div className="p-2 border-b border-gray-200">
                              <div className="relative">
                                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Search"
                                  value={statusQuery}
                                  onChange={(e) => setStatusQuery(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md outline-none"
                                />
                              </div>
                            </div>
                            <div className="overflow-y-auto max-h-[200px]">
                              {["All", "Active", "Inactive"]
                                .filter(option => option.toLowerCase().includes(statusQuery.toLowerCase()))
                                .map((option) => (
                                  <div
                                    key={option}
                                    onClick={() => {
                                      setSelectedStatus(option);
                                      setStatusDropdownOpen(false);
                                      setStatusQuery("");
                                    }}
                                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${selectedStatus === option
                                      ? "bg-gray-100 text-black"
                                      : "text-black hover:bg-gray-50"
                                      }`}
                                >
                                  <span className="text-black">{option}</span>
                                    {selectedStatus === option && (
                                      <Check size={16} className="text-black" />
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Type
                      </label>
                      <div className="relative" ref={customerTypeDropdownRef}>
                        <button
                          onClick={() => {
                            setCustomerTypeDropdownOpen(!customerTypeDropdownOpen);
                            setStatusDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none cursor-pointer bg-white flex items-center justify-between text-left"
                        >
                          <span className={selectedCustomerType ? "text-gray-900" : "text-gray-400"}>
                            {selectedCustomerType || "Select customer type"}
                          </span>
                          {customerTypeDropdownOpen ? (
                            <ChevronUp size={16} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-400" />
                          )}
                        </button>
                        {customerTypeDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[300] w-full overflow-hidden flex flex-col">
                            <div className="p-2 border-b border-gray-200">
                              <div className="relative">
                                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Search"
                                  value={customerTypeQuery}
                                  onChange={(e) => setCustomerTypeQuery(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md outline-none"
                                />
                              </div>
                            </div>
                            <div className="overflow-y-auto max-h-[200px]">
                              {["Business", "Individual"]
                                .filter(option => option.toLowerCase().includes(customerTypeQuery.toLowerCase()))
                                .map((option) => (
                                  <div
                                    key={option}
                                    onClick={() => {
                                      setSelectedCustomerType(option);
                                      setCustomerTypeDropdownOpen(false);
                                      setCustomerTypeQuery("");
                                    }}
                                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${selectedCustomerType === option
                                      ? "bg-gray-100 text-black"
                                      : "text-black hover:bg-gray-50"
                                      }`}
                                >
                                  <span className="text-black">{option}</span>
                                    {selectedCustomerType === option && (
                                      <Check size={16} className="text-black" />
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
                <button
                  onClick={() => setAdvancedSearchOpen(false)}
                  className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle search
                    setAdvancedSearchOpen(false);
                  }}
                  className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}


