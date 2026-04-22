// frontend/src/components/Sidebar.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home,
  Package,
  Boxes,
  ShoppingCart,
  ShoppingBag,
  Timer,
  Banknote,
  UserCog,
  BarChart3,
  FileText,
  ChevronRight,
  Menu,
  LogOut,
  ListTodo,
  Link,
  ClipboardList,
  Building2,
  FileSpreadsheet,
  Receipt,
  LayoutList,
} from "lucide-react";
import {
  logout,
} from "../services/auth";
import { usePermissions } from "../hooks/usePermissions";
import { useAppBootstrap } from "../context/AppBootstrapContext";

const menu = [
  { label: "Home", icon: Home, path: "/" },
  {
    label: "Items",
    icon: Package,
    path: "/items",
    children: [{ label: "Items", path: "/items" }],
  },
  {
    label: "Inventory",
    icon: Boxes,
    path: "/inventory",
    moduleKey: "inventory", // Check enableInventory specifically
    children: [{ label: "Inventory Adjustments", path: "/inventory" }],
  },
  {
    label: "Sales",
    icon: ShoppingCart,
    path: "/sales",
    children: [
      { label: "Customers", path: "/sales/customers" },
      { label: "Quotes", path: "/sales/quotes", moduleKey: "quotes" },
      { label: "Retainer Invoices", path: "/sales/retainer-invoices" },
      { label: "Sales Orders", path: "/sales/sales-orders", moduleKey: "salesOrders" },
      { label: "Invoices", path: "/sales/invoices" },
      { label: "Sales Receipts", path: "/sales/sales-receipts", moduleKey: "salesReceipts" },
      { label: "Recurring Invoices", path: "/sales/recurring-invoices", moduleKey: "recurringInvoice" },
      { label: "Subscriptions", path: "/sales/subscriptions" },
      { label: "Debit Notes", path: "/sales/debit-notes" },
      { label: "Payment Links", path: "/sales/payment-links" },
      { label: "Payments Received", path: "/sales/payments-received" },
      { label: "Credit Notes", path: "/sales/credit-notes", moduleKey: "creditNote" },
    ],
  },
  {
    label: "Purchases",
    icon: ShoppingBag,
    path: "/purchases",
    children: [
      { label: "Vendors", path: "/purchases/vendors" },
      { label: "Expenses", path: "/purchases/expenses" },
      { label: "Recurring Expenses", path: "/purchases/recurring-expenses", moduleKey: "recurringExpense" },
      { label: "Purchase Orders", path: "/purchases/purchase-orders", moduleKey: "purchaseOrders" },
      { label: "Bills", path: "/purchases/bills" },
      { label: "Recurring Bills", path: "/purchases/recurring-bills", moduleKey: "recurringBills" },
      { label: "Payments Made", path: "/purchases/payments-made" },
      { label: "Vendor Credits", path: "/purchases/vendor-credits" },
    ],
  },
  {
    label: "Time Tracking",
    icon: Timer,
    path: "/time-tracking",
    moduleKey: "timeTracking",
    children: [
      { label: "Projects", path: "/time-tracking/projects" },
      { label: "Timesheet", path: "/time-tracking/timesheet" },
      { label: "Approvals", path: "/time-tracking/approvals" },
      { label: "Customer Approvals", path: "/time-tracking/customer-approvals" },
    ],
  },
  {
    label: "Banking",
    icon: Banknote,
    path: "/banking",
  },
  {
    label: "Accountant",
    icon: UserCog,
    path: "/accountant",
    children: [
      { label: "Journal Entries", path: "/accountant/manual-journals" },
      { label: "Recurring Journals", path: "/accountant/recurring-journals", moduleKey: "recurringJournals" },
      { label: "Bulk Update", path: "/accountant/bulk-update" },
      { label: "Currency Adjustments", path: "/accountant/currency-adjustments" },
      { label: "Chart of Accounts", path: "/accountant/chart-of-accounts" },
      { label: "Budgets", path: "/accountant/budgets" },
      { label: "Transaction Locking", path: "/accountant/transaction-locking" },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    path: "/reports",
  },
  {
    label: "Documents",
    icon: FileText,
    path: "/documents",
  },
];

const menuPermissionRules: Record<string, Array<{ module: string; subModule?: string; action?: string }>> = {
  Home: [{ module: "dashboard", action: "view" }],
  Items: [{ module: "items", subModule: "item", action: "view" }],
  Inventory: [{ module: "items", subModule: "inventoryAdjustments", action: "view" }],
  Sales: [
    { module: "contacts", subModule: "customers", action: "view" },
    { module: "sales", subModule: "invoices", action: "view" },
    { module: "sales", subModule: "customerPayments", action: "view" },
    { module: "sales", subModule: "quotes", action: "view" },
    { module: "sales", subModule: "salesReceipt", action: "view" },
    { module: "sales", subModule: "salesOrders", action: "view" },
    { module: "sales", subModule: "creditNotes", action: "view" },
  ],
  Purchases: [
    { module: "contacts", subModule: "vendors", action: "view" },
    { module: "purchases", subModule: "bills", action: "view" },
    { module: "purchases", subModule: "vendorPayments", action: "view" },
    { module: "purchases", subModule: "expenses", action: "view" },
    { module: "purchases", subModule: "purchaseOrders", action: "view" },
    { module: "purchases", subModule: "vendorCredits", action: "view" },
  ],
  "Time Tracking": [{ module: "timesheets", subModule: "projects", action: "view" }],
  Banking: [{ module: "banking", subModule: "banking", action: "view" }],
  Accountant: [
    { module: "accountant", subModule: "chartOfAccounts", action: "view" },
    { module: "accountant", subModule: "journals", action: "view" },
    { module: "accountant", subModule: "budget", action: "view" },
  ],
  Reports: [{ module: "reports", action: "view" }],
  Documents: [{ module: "documents", action: "view" }],
};

const childPermissionRules: Record<string, Array<{ module: string; subModule?: string; action?: string }>> = {
  "/sales/customers": [{ module: "contacts", subModule: "customers", action: "view" }],
  "/sales/quotes": [{ module: "sales", subModule: "quotes", action: "view" }],
  "/sales/sales-orders": [{ module: "sales", subModule: "salesOrders", action: "view" }],
  "/sales/invoices": [{ module: "sales", subModule: "invoices", action: "view" }],
  "/sales/retainer-invoices": [{ module: "sales", subModule: "invoices", action: "view" }],
  "/sales/recurring-invoices": [{ module: "sales", subModule: "invoices", action: "view" }],
  "/sales/subscriptions": [{ module: "sales", subModule: "invoices", action: "view" }],
  "/sales/debit-notes": [{ module: "sales", subModule: "invoices", action: "view" }],
  "/sales/sales-receipts": [{ module: "sales", subModule: "salesReceipt", action: "view" }],
  "/sales/payment-links": [{ module: "sales", subModule: "customerPayments", action: "view" }],
  "/sales/payments-received": [{ module: "sales", subModule: "customerPayments", action: "view" }],
  "/sales/credit-notes": [{ module: "sales", subModule: "creditNotes", action: "view" }],
  "/purchases/vendors": [{ module: "contacts", subModule: "vendors", action: "view" }],
  "/purchases/expenses": [{ module: "purchases", subModule: "expenses", action: "view" }],
  "/purchases/recurring-expenses": [{ module: "purchases", subModule: "expenses", action: "view" }],
  "/purchases/purchase-orders": [{ module: "purchases", subModule: "purchaseOrders", action: "view" }],
  "/purchases/bills": [{ module: "purchases", subModule: "bills", action: "view" }],
  "/purchases/recurring-bills": [{ module: "purchases", subModule: "bills", action: "view" }],
  "/purchases/payments-made": [{ module: "purchases", subModule: "vendorPayments", action: "view" }],
  "/purchases/vendor-credits": [{ module: "purchases", subModule: "vendorCredits", action: "view" }],
  "/purchases/debit-notes": [{ module: "purchases", subModule: "bills", action: "view" }],
  "/purchases/self-billed-invoices": [{ module: "purchases", subModule: "bills", action: "view" }],
  "/time-tracking/projects": [{ module: "timesheets", subModule: "projects", action: "view" }],
  "/time-tracking/tasks": [{ module: "timesheets", subModule: "projects", action: "view" }],
  "/time-tracking/timesheet": [{ module: "timesheets", subModule: "projects", action: "view" }],
  "/time-tracking/approvals": [{ module: "timesheets", subModule: "projects", action: "view" }],
  "/time-tracking/customer-approvals": [{ module: "timesheets", subModule: "projects", action: "view" }],
  "/time-tracking/customer-approvals/new": [{ module: "timesheets", subModule: "projects", action: "view" }],
};

const isRouteMatch = (pathname: string, route: string): boolean => {
  if (pathname === route) return true;
  if (route === "/") return false;
  return pathname.startsWith(`${route}/`);
};

function SidebarSection({
  item,
  isCollapsed,
  appearance,
  accentColor,
  openSection,
  setOpenSection,
  onLinkClick,
  onChildHover,
}: any) {
  const Icon = item.icon;
  const hasChildren = item.children?.length;
  const location = useLocation();

  const baseActive =
    isRouteMatch(location.pathname, item.path) ||
    (hasChildren &&
      item.path !== "/" &&
      location.pathname.startsWith(item.path));

  const isOpen = openSection === item.label;

  return (
    <div className="mb-1">
      {hasChildren ? (
        <>
          <div
            onClick={() => setOpenSection(isOpen ? null : item.label)}
            className={`
              flex items-center w-full rounded-xl no-underline text-sm font-medium
              transition-all duration-300 relative cursor-pointer
              ${isCollapsed ? 'gap-0 p-2 justify-center' : 'gap-2 px-3 py-2 justify-start'}
              ${baseActive
                ? ''
                : appearance === 'light'
                  ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:translate-x-1'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white hover:translate-x-1'
              }
            `}
            style={baseActive ? { backgroundColor: accentColor, color: 'white' } : {}}
          >
            {!isCollapsed && (
              <ChevronRight
                size={16}
                className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'} ${baseActive ? 'text-black' : appearance === 'light' ? 'text-gray-400' : 'text-slate-400'}`}
              />
            )}
            <Icon
              size={20}
              className={`flex-shrink-0 ${baseActive ? 'text-white' : appearance === 'light' ? 'text-gray-500' : 'text-slate-400'}`}
            />
            {!isCollapsed && <span className={baseActive ? 'text-white font-semibold' : appearance === 'light' ? 'text-gray-700' : 'text-slate-300'}>{item.label}</span>}
          </div>
          {!isCollapsed && isOpen && (
            <div className="mt-1.5 ml-3 pl-5 border-l-2 border-dashed border-white/20">
              {item.children.map((child: any) => {
                const isChildActive = isRouteMatch(location.pathname, child.path);
                return (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    onClick={onLinkClick}
                    onMouseEnter={() => onChildHover?.(child.path)}
                    onFocus={() => onChildHover?.(child.path)}
                    className={({ isActive }) => `
                      block py-2 px-3 mb-1 rounded-[10px] no-underline text-[13px]
                      transition-all duration-300
                      ${isActive || isChildActive
                        ? 'text-white font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.05)]'
                        : appearance === 'light'
                          ? 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900 hover:translate-x-1'
                          : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white hover:translate-x-1'
                      }
                    `}
                    style={({ isActive }) => (isActive || isChildActive ? { backgroundColor: accentColor } : {})}
                  >
                    {child.label}
                  </NavLink>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <NavLink
          to={item.path}
          end={item.path === "/"}
          onClick={onLinkClick}
          className={({ isActive }) => `
            flex items-center w-full rounded-xl no-underline text-sm font-medium
            transition-all duration-300 relative
            ${isCollapsed ? 'gap-0 p-2 justify-center' : 'gap-2 px-3 py-2 justify-start'}
            ${isActive || baseActive
              ? 'text-white shadow-[0_4px_12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.05)]'
              : appearance === 'light'
                ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:translate-x-1'
                : 'text-slate-300 hover:bg-white/10 hover:text-white hover:translate-x-1'
            }
          `}
          style={({ isActive }) => (isActive || baseActive ? { backgroundColor: accentColor } : {})}
        >
          {!isCollapsed && <div className="w-4" />}
          <Icon
            size={20}
            className={`flex-shrink-0 ${baseActive ? 'text-white' : appearance === 'light' ? 'text-gray-500' : 'text-slate-400'}`}
          />
          {!isCollapsed && <span className={baseActive ? 'text-white' : appearance === 'light' ? 'text-gray-700' : 'text-slate-300'}>{item.label}</span>}
        </NavLink>
      )}
    </div>
  );
}

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [organizationLogoBroken, setOrganizationLogoBroken] = useState(false);
  const queryClient = useQueryClient();
  const hasPreloadedQuotesRef = useRef(false);
  const {
    currentUser,
    organization,
    branding,
    enabledModules,
    resetBootstrap,
  } = useAppBootstrap();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const appearance = branding.appearance || "dark";
  const sidebarColors = {
    darkFrom: branding.sidebarDarkFrom || "#0f4e5a",
    darkTo: branding.sidebarDarkTo || "#156372",
    lightFrom: branding.sidebarLightFrom || "#f9fafb",
    lightTo: branding.sidebarLightTo || "#f3f4f6",
    accentColor: branding.accentColor || "#3b82f6",
  };
  const userRole = (currentUser?.role || "").replace(/_/g, " ");
  const organizationName = String(
    organization?.name ||
    organization?.legalName ||
    currentUser?.organizationName ||
    "Organization"
  );
  const organizationLogo = String(organization?.logo || "").trim();
  const organizationInitials = organizationName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "TB";

  const location = useLocation();
  const collapsedBeforeReportsRef = useRef(false);
  const inReportsRef = useRef(false);

  const preloadQuotesList = () => {
    if (hasPreloadedQuotesRef.current) return;
    hasPreloadedQuotesRef.current = true;

    void import("../features/sales/Quotes/quoteQueries").then(({ fetchQuotesList, quoteQueryKeys }) => {
      void queryClient.prefetchQuery({
        queryKey: quoteQueryKeys.list(),
        queryFn: fetchQuotesList,
      });
    });
  };

  useEffect(() => {
    setOrganizationLogoBroken(false);
  }, [organizationLogo]);

  const hasAnyPermission = (rules: Array<{ module: string; subModule?: string; action?: string }> = []) => {
    if (permissionsLoading) return true;
    if (!rules.length) return true;
    return rules.some((rule) => hasPermission(rule.module, rule.subModule, rule.action || "view"));
  };

  // Filter menu based on enabled modules + role permissions
  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      const topLevelRules = menuPermissionRules[item.label] || [];
      const hasTopLevelAccess = hasAnyPermission(topLevelRules);
      if (!hasTopLevelAccess) return false;

      if (item.moduleKey) {
        if (item.moduleKey === 'inventory') return enabledModules.inventory !== false;
        return enabledModules[item.moduleKey] !== false;
      }
      return true;
    }).map(item => {
      if (item.children) {
        const filteredChildren = item.children.filter((child: any) => {
          const rules = childPermissionRules[child.path] || [];
          if (!hasAnyPermission(rules)) return false;
          if (child.moduleKey) return enabledModules[child.moduleKey] !== false;
          return true;
        });

        // Hide parent if all child entries are filtered out
        if (!filteredChildren.length) {
          return null;
        }

        return {
          ...item,
          children: filteredChildren
        };
      }
      return item;
    }).filter(Boolean) as any[];
  }, [enabledModules, permissionsLoading, hasPermission]);

  const prevPathRef = useRef(location.pathname);

  // Auto-expand active section on navigation
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      const activeItem = filteredMenu.find(item =>
        item.children && location.pathname !== "/" && location.pathname.startsWith(item.path)
      );

      if (activeItem) {
        setOpenSection(activeItem.label);
      } else if (location.pathname === "/") {
        // Collapse all when going Home
        setOpenSection(null);
      }
      prevPathRef.current = location.pathname;
    }
  }, [location.pathname, filteredMenu]);

  // Auto-minimize main sidebar on reports routes to avoid double sidebar layout.
  useEffect(() => {
    const isReportsRoute = location.pathname.startsWith("/reports");

    if (isReportsRoute && !inReportsRef.current) {
      collapsedBeforeReportsRef.current = isCollapsed;
      inReportsRef.current = true;
      if (!isCollapsed) {
        setIsCollapsed(true);
      }
      return;
    }

    if (!isReportsRoute && inReportsRef.current) {
      inReportsRef.current = false;
      setIsCollapsed(collapsedBeforeReportsRef.current);
    }
  }, [location.pathname, isCollapsed]);

  // Initial expand on mount
  useEffect(() => {
    const activeItem = filteredMenu.find(item =>
      item.children && location.pathname !== "/" && location.pathname.startsWith(item.path)
    );
    if (activeItem) {
      setOpenSection(activeItem.label);
    }
  }, []); // Run once on mount

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      const isMobile = window.innerWidth <= 768;
      document.documentElement.style.setProperty(
        '--sidebar-width',
        isMobile ? '0px' : (isCollapsed ? '80px' : '260px')
      );
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [isCollapsed]);

  // Listen for mobile toggle event
  useEffect(() => {
    const handleToggle = () => setIsMobileOpen(prev => !prev);
    window.addEventListener('toggleMobileSidebar', handleToggle);
    return () => window.removeEventListener('toggleMobileSidebar', handleToggle);
  }, []);

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[999] ${isMobileOpen ? 'block' : 'hidden'}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Mobile Menu Button */}
      {/* Mobile Menu Button - Styled more cleanly */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-2.5 left-3 z-[1001] h-9 w-9 flex items-center justify-center rounded-lg bg-[rgba(21,99,114,1)] border-none text-white cursor-pointer shadow-md md:hidden hover:bg-[rgba(21,99,114,0.9)] transition-colors active:scale-95"
      >
        <Menu size={20} />
      </button>

      {/* Desktop Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen
        border-r p-3 flex flex-col gap-3 z-[1000]
        shadow-[4px_0_24px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)]
        transition-all duration-300 overflow-hidden
        ${isCollapsed ? 'w-20' : 'w-[260px]'}
        max-md:hidden
      `}
        style={{
          background: appearance === "light"
            ? `linear-gradient(to bottom, ${sidebarColors.lightFrom}, ${sidebarColors.lightTo})`
            : `linear-gradient(to bottom, ${sidebarColors.darkFrom}, ${sidebarColors.darkTo})`,
          borderColor: appearance === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"
        }}>
        {/* Logo Section */}
        <div className={`
          flex items-center rounded-[14px] border
          transition-all duration-300
          ${isCollapsed ? 'gap-0 p-2 justify-center mb-2' : 'gap-2 p-3 justify-start mb-0'}
          ${appearance === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-white/8 border-white/10'}
        `}>
          {organizationLogo && !organizationLogoBroken ? (
            <img
              src={organizationLogo}
              alt={organizationName}
              className={`rounded-full object-cover flex-shrink-0 shadow-[0_4px_12px_rgba(15,148,172,0.35)] ${isCollapsed ? "w-9 h-9" : "w-10 h-10"}`}
              onError={() => setOrganizationLogoBroken(true)}
            />
          ) : (
            <div className={`
              rounded-full bg-gradient-to-br from-[#0f94ac] to-[#0d7a8f]
              flex items-center justify-center text-white font-bold flex-shrink-0
              shadow-[0_4px_12px_rgba(15,148,172,0.4)]
              ${isCollapsed ? 'w-9 h-9 text-sm' : 'w-10 h-10 text-base'}
            `}>
              {organizationInitials}
            </div>
          )}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className={`text-[15px] font-bold leading-tight ${appearance === 'light' ? 'text-gray-900' : 'text-white'}`}>
                {organizationName}
              </div>
              <div className={`text-[11px] mt-0.5 ${appearance === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                Inventory & Accounting
              </div>
              {userRole && (
                <div className={`text-[10px] mt-0.5 capitalize ${appearance === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                  Role: {userRole}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center justify-center w-full p-2 mb-1 rounded-[10px] border cursor-pointer transition-all duration-300 ${appearance === 'light'
            ? 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
        >
          <Menu
            size={18}
            className={`transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
          />
        </button>

        {/* Navigation Menu - Scrollable */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden pr-1 -mr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-track]:rounded-[10px] [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-[10px] [&::-webkit-scrollbar-thumb]:hover:bg-white/30">
          <div className="flex flex-col gap-1">
            {filteredMenu.map((item: any) => (
              <SidebarSection
                key={item.label}
                item={item}
                isCollapsed={isCollapsed}
                appearance={appearance}
                accentColor={sidebarColors.accentColor}
                openSection={openSection}
                setOpenSection={setOpenSection}
                onLinkClick={() => setIsMobileOpen(false)}
                onChildHover={(path: string) => {
                  if (path === "/sales/quotes") {
                    preloadQuotesList();
                  }
                }}
              />
            ))}
          </div>
        </nav>

        {/* Logout Button */}
        <button
          onClick={async () => {
            await logout();
            resetBootstrap();
            window.location.href = "/login";
          }}
          className={`
            flex items-center w-full rounded-xl text-sm font-semibold cursor-pointer
            transition-all duration-300 mt-auto
            bg-red-500/10 border border-red-500/20 text-red-300
            hover:bg-red-500/20 hover:border-red-500/30 hover:text-white hover:translate-x-1
            ${isCollapsed ? 'gap-0 p-2 justify-center' : 'gap-2 px-3 py-2.5 justify-start'}
          `}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen w-[260px]
        border-r p-3 flex flex-col gap-3 z-[1000]
        shadow-[4px_0_24px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)]
        transition-transform duration-300 overflow-hidden
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:hidden
      `}
        style={{
          background: appearance === "light"
            ? `linear-gradient(to bottom, ${sidebarColors.lightFrom}, ${sidebarColors.lightTo})`
            : `linear-gradient(to bottom, ${sidebarColors.darkFrom}, ${sidebarColors.darkTo})`,
          borderColor: appearance === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"
        }}>
        {/* Logo Section */}
        <div className={`flex items-center gap-2 p-3 rounded-[14px] border mb-3 ${appearance === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-white/8 border-white/10'
          }`}>
          {organizationLogo && !organizationLogoBroken ? (
            <img
              src={organizationLogo}
              alt={organizationName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-[0_4px_12px_rgba(15,148,172,0.35)]"
              onError={() => setOrganizationLogoBroken(true)}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0f94ac] to-[#0d7a8f] flex items-center justify-center text-white font-bold text-base shadow-[0_4px_12px_rgba(15,148,172,0.4)]">
              {organizationInitials}
            </div>
          )}
          <div className="flex-1">
            <div className={`text-[15px] font-bold leading-tight ${appearance === 'light' ? 'text-gray-900' : 'text-white'}`}>
              {organizationName}
            </div>
            <div className={`text-[11px] mt-0.5 ${appearance === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
              Inventory & Accounting
            </div>
            {userRole && (
              <div className={`text-[10px] mt-0.5 capitalize ${appearance === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                Role: {userRole}
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden pr-1 -mr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-track]:rounded-[10px] [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-[10px] [&::-webkit-scrollbar-thumb]:hover:bg-white/30">
          <div className="flex flex-col gap-1">
            {filteredMenu.map((item: any) => (
              <SidebarSection
                key={item.label}
                item={item}
                isCollapsed={false}
                appearance={appearance}
                accentColor={sidebarColors.accentColor}
                openSection={openSection}
                setOpenSection={setOpenSection}
                onLinkClick={() => setIsMobileOpen(false)}
                onChildHover={(path: string) => {
                  if (path === "/sales/quotes") {
                    preloadQuotesList();
                  }
                }}
              />
            ))}
          </div>
        </nav>

        <button
          onClick={async () => {
            await logout();
            resetBootstrap();
            setIsMobileOpen(false);
            window.location.href = "/login";
          }}
          className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-semibold cursor-pointer transition-all duration-300 mt-auto hover:bg-red-500/20 hover:text-white"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>
    </>
  );
}
