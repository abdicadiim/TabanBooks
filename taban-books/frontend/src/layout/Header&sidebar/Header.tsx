import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Grid3x3,
  Loader2,
  LogOut,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import { logout, setOrganization } from "../../services/auth";
import { useAppBootstrap } from "../../context/AppBootstrapContext";
import { preloadCustomersIndexData } from "../../pages/sales/Customers/customerRouteLoaders";

export default function Header() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { authenticated, currentUser, organization, branding, resetBootstrap } = useAppBootstrap();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchScope, setSearchScope] = useState("Customers");
  const [searchQuery, setSearchQuery] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [copiedOrgId, setCopiedOrgId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const orgButtonRef = useRef<HTMLButtonElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);
  const [orgPanelStyle, setOrgPanelStyle] = useState<{ top: number; pointerLeft: number } | null>(null);

  const orgName = String(organization?.name || "Organization");
  const orgLabel = orgName.trim().split(" ")[0] || orgName;
  const userInitial = orgName.trim().charAt(0).toUpperCase() || "T";
  const isLightAppearance = String(branding?.appearance || "dark") === "light";
  const headerBackground = isLightAppearance
    ? "#f4f5f7"
    : "linear-gradient(90deg, #0f5f6c 0%, #156372 100%)";
  const isPurchaseOrdersListPage = /^\/purchases(?:\/purchase-orders)?\/?$/.test(
    location.pathname
  );
  const desktopShellGapClass = "md:[--shell-gap:24px]";
  const actionButtonClass = () =>
    `grid h-10 w-10 place-items-center rounded-lg bg-[#0f5f6c] text-white shadow-sm transition-colors hover:bg-[#0f5f6c] hover:text-white`;

  const handleLogout = async () => {
    try {
      await logout();
      if (resetBootstrap) resetBootstrap();
      setUserMenuOpen(false);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const quickCreateItems: Record<string, { label: string; path: string }[]> = {
    GENERAL: [
      { label: "Add User", path: "/settings/users" },
      { label: "Item", path: "/items/new" },
      { label: "Journal Entry", path: "/accountant/manual-journals/new" },
      { label: "Log Time", path: "/time-tracking/timesheet" },
      { label: "Weekly Log", path: "/time-tracking/timesheet/weekly" },
      { label: "Task", path: "/time-tracking/projects/new" },
    ],
    INVENTORY: [{ label: "Inventory Adjustments", path: "/inventory/new" }],
    SALES: [
      { label: "Customer", path: "/sales/customers/new" },
      { label: "Quotes", path: "/sales/quotes/new" },
      { label: "Invoices", path: "/sales/invoices/new" },
      { label: "Recurring Invoice", path: "/sales/recurring-invoices/new" },
      { label: "Retail Invoice", path: "/sales/invoices/new-retail" },
      { label: "Sales Receipts", path: "/sales/sales-receipts/new" },
      { label: "Retainer Invoices", path: "/sales/retainer-invoices/new" },
      { label: "Sales Order", path: "/sales/sales-orders/new" },
      { label: "Payment Links", path: "/sales/payment-links" },
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
      { label: "Card Payment", path: "/banking" },
      { label: "Owner Drawings", path: "/banking" },
      { label: "Other Income", path: "/banking" },
    ],
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

  const handleQuickCreateClick = (path: string) => {
    setQuickCreateOpen(false);
    setUserMenuOpen(false);
    setOrgDropdownOpen(false);
    navigate(path);
  };

  const handleSearchScopeChange = (option: { label: string; path: string }) => {
    setSearchScope(option.label);
    setSearchDropdownOpen(false);
    const query = searchQuery.trim();
    navigate(query ? `${option.path}?search=${encodeURIComponent(query)}` : option.path);
  };

  useEffect(() => {
    const currentOption = searchOptions.find((option) => {
      if (option.path === "/") return location.pathname === "/";
      return location.pathname === option.path || location.pathname.startsWith(`${option.path}/`);
    });

    if (currentOption) {
      setSearchScope(currentOption.label);
    }
  }, [location.pathname]);

  useEffect(() => {
    setSearchQuery(new URLSearchParams(location.search).get("search") || "");
  }, [location.pathname, location.search]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = searchQuery.trim();
    if (!query) return;

    const target = searchOptions.find((option) => option.label === searchScope) || searchOptions[0];
    const params = new URLSearchParams();
    params.set("search", query);

    navigate(`${target.path}?${params.toString()}`);
  };

  const handleCustomersPrefetch = () => {
    void preloadCustomersIndexData(queryClient);
  };

  const handleCopyOrgId = async (orgId: string) => {
    try {
      await navigator.clipboard.writeText(orgId);
      setCopiedOrgId(orgId);
      window.setTimeout(() => setCopiedOrgId(null), 1500);
    } catch {
      // Ignore clipboard failures.
    }
  };

  const loadOrganizations = async () => {
    if (loadingOrganizations || organizations.length > 0) return;

    setLoadingOrganizations(true);
    try {
      const response = await apiRequest("/organizations", { meta: { source: "header:organizations" } });
      const nextOrganizations = Array.isArray(response?.organizations) ? response.organizations : [];
      setOrganizations(nextOrganizations);
    } catch (error) {
      console.error("Failed to load organizations:", error);
      setOrganizations([]);
    } finally {
      setLoadingOrganizations(false);
    }
  };

  const updateOrgPanelPosition = () => {
    const buttonRect = orgButtonRef.current?.getBoundingClientRect();
    if (!buttonRect) return;

    const panelWidth = 386;
    const top = buttonRect.bottom + 8;
    const pointerLeft = Math.max(
      28,
      Math.min(panelWidth - 28, buttonRect.left + buttonRect.width / 2 - (window.innerWidth - panelWidth) - 8),
    );

    setOrgPanelStyle({ top, pointerLeft });
  };

  const handleSwitchOrganization = async (org: any) => {
    try {
      const response = await apiRequest(`/organizations/${encodeURIComponent(String(org.organization_id || org.id || ""))}`, {
        meta: { source: "header:switch-organization" },
      });

      const nextOrganization = response?.organization || response?.data?.organization || response?.data || org;
      setOrganization(nextOrganization);
      setOrgDropdownOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Failed to switch organization:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchDropdownOpen(false);
      }
      if (quickCreateRef.current && !quickCreateRef.current.contains(event.target as Node)) {
        setQuickCreateOpen(false);
      }
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (orgDropdownOpen) {
      void loadOrganizations();
      updateOrgPanelPosition();
    }
  }, [orgDropdownOpen]);

  useEffect(() => {
    if (!orgDropdownOpen) return;

    const handleResize = () => updateOrgPanelPosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [orgDropdownOpen]);

  useEffect(() => {
    if (!searchDropdownOpen) return;

    const handleResize = () => {
      // keep the dropdown anchored under the search box
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [searchDropdownOpen]);

  return (
    <header
      className={`fixed top-4 left-4 right-4 z-[1000] h-[68px] overflow-visible rounded-[20px] px-4 backdrop-blur-md ${desktopShellGapClass} ${
        isPurchaseOrdersListPage
          ? "md:left-[calc(var(--sidebar-width)+var(--shell-gap))]"
          : "md:left-[calc(var(--sidebar-width)+var(--shell-gap))]"
      } ${
        isLightAppearance
          ? "border border-slate-200 shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
          : "border border-white/12 shadow-[0_16px_34px_rgba(4,38,46,0.16)]"
      }`}
      style={{
        background: headerBackground,
      }}
    >
      {!isLightAppearance ? (
        <div className="pointer-events-none absolute inset-0 rounded-[20px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_65%)]" />
      ) : null}
      <div className="relative flex h-full items-center gap-3">
        <form ref={searchRef} onSubmit={handleSearchSubmit} className="relative flex min-w-0 flex-1 items-center">
          <div className="flex h-10 w-full max-w-[420px] overflow-hidden rounded-[10px] border border-slate-200 bg-[#e4f4f5] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <button
              type="button"
              onClick={() => setSearchDropdownOpen((current) => !current)}
              className="flex w-9 items-center justify-center border-r border-slate-200 text-slate-500 transition-colors hover:bg-[#0f5f6c] hover:text-white"
              aria-label="Search scope"
              title="Search scope"
            >
              <Search size={15} />
            </button>
            <button
              type="button"
              onClick={() => setSearchDropdownOpen((current) => !current)}
              className="flex w-7 items-center justify-center border-r border-slate-200 text-slate-400 transition-colors hover:bg-[#0f5f6c] hover:text-white"
              aria-label="Open search options"
            >
              {searchDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`Search in ${searchScope} ( / )`}
              className="min-w-0 flex-1 bg-transparent px-3 text-[13px] outline-none placeholder:text-slate-400"
            />
          </div>

          {searchDropdownOpen && (
            <div className="absolute left-0 top-full z-[120] mt-2 w-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
              <div className="max-h-[340px] overflow-y-auto py-2">
                {searchOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onMouseEnter={option.label === "Customers" ? handleCustomersPrefetch : undefined}
                    onFocus={option.label === "Customers" ? handleCustomersPrefetch : undefined}
                    onClick={() => handleSearchScopeChange(option)}
                    className={`group flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-[#0f5f6c] hover:text-white ${
                      searchScope === option.label ? "bg-[#d4eef0]" : ""
                    }`}
                  >
                    <span className={searchScope === option.label ? "font-medium text-slate-900" : "text-slate-700 group-hover:text-white"}>
                      {option.label}
                    </span>
                    {searchScope === option.label ? <Check size={16} className="text-slate-700" /> : null}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block" ref={orgDropdownRef}>
            <button
              ref={orgButtonRef}
              type="button"
              onClick={() => {
                setOrgDropdownOpen((current) => {
                  const next = !current;
                  if (next) {
                    window.requestAnimationFrame(updateOrgPanelPosition);
                    void loadOrganizations();
                  }
                  return next;
                });
              }}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#0f5f6c] px-2.5 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#0f5f6c] hover:text-white"
              aria-label="Organizations"
            >
              <span className="max-w-[110px] truncate">{orgLabel}</span>
              {orgDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {orgDropdownOpen && (
              <div className="fixed inset-0 z-[2000]" style={{ top: orgPanelStyle?.top ?? 0 }}>
                <button
                  type="button"
                  aria-label="Close organizations overlay"
                  className="absolute inset-0 bg-black/25"
                  onClick={() => setOrgDropdownOpen(false)}
                />
                <div className="absolute right-0 w-[386px] overflow-visible">
                  <div
                    className="absolute -top-2 h-4 w-4 rotate-45 border-l border-t border-slate-200 bg-white shadow-[-1px_-1px_2px_rgba(15,23,42,0.02)]"
                    style={{ left: `${orgPanelStyle?.pointerLeft ?? 32}px` }}
                  />
                  <div className="h-[calc(100vh-70px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
                      <div>
                        <div className="text-[13px] font-semibold text-slate-900">Organizations</div>
                        {currentUser?.name ? (
                          <div className="text-[10px] text-slate-500">Signed in as {currentUser.name}</div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setOrgDropdownOpen(false);
                            navigate("/organizations/manage");
                          }}
                          className="flex items-center gap-1.5 text-[12px] text-slate-600 hover:text-slate-900"
                        >
                          <Settings size={13} />
                          Manage
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrgDropdownOpen(false)}
                          className="text-slate-400 hover:text-slate-600"
                          aria-label="Close organizations panel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="h-[calc(100%-55px)] overflow-auto">
                      <div className="px-4 py-3">
                        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
                          My Organizations {organizations.length}
                        </div>
                      </div>

                      {loadingOrganizations ? (
                        <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                          <Loader2 size={16} className="animate-spin" />
                          Loading organizations...
                        </div>
                      ) : organizations.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500">No organizations found.</div>
                      ) : (
                        <div className="space-y-1 px-2 pb-2">
                          {organizations.map((org) => {
                            const orgId = String(org.organization_id || org.id || "");
                            const isActive =
                              String(orgId) === String(organization?.organization_id || organization?.id || organization?._id || "");
                            const displayName = String(org.name || "Organization");
                            const planName = String(org.plan_name || "").trim();

                            return (
                              <button
                                key={orgId}
                                type="button"
                                onClick={() => handleSwitchOrganization(org)}
                                className={`group w-full rounded-[18px] border px-3 py-3 text-left transition-colors ${
                                  isActive ? "border-slate-300 bg-slate-50" : "border-transparent hover:bg-[#0f5f6c] hover:text-white"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-slate-200 bg-slate-50 text-slate-500 group-hover:bg-white/15 group-hover:text-white">
                                    {org.icon ? (
                                      <span className="text-[17px] leading-none">{org.icon}</span>
                                    ) : org.logo ? (
                                      <img
                                        src={org.logo}
                                        alt={displayName}
                                        className="h-full w-full rounded-[14px] object-cover"
                                      />
                                    ) : (
                                      <Building2 size={17} />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className={`truncate text-[13px] font-semibold ${isActive ? "text-slate-900" : "text-slate-900 group-hover:text-white"}`}>
                                        {displayName}
                                      </div>
                                      {planName ? (
                                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${isActive ? "bg-slate-100 text-slate-700" : "bg-slate-100 text-slate-600 group-hover:bg-white/15 group-hover:text-white"}`}>
                                          {planName}
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className={`mt-1 flex items-center gap-2 text-[11px] ${isActive ? "text-slate-600" : "text-slate-500 group-hover:text-white/80"}`}>
                                      <span className="truncate">Organization ID: {orgId}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void handleCopyOrgId(orgId);
                                        }}
                                        className="text-slate-400 hover:text-white"
                                        aria-label="Copy organization ID"
                                      >
                                        {copiedOrgId === orgId ? <Check size={12} className="text-slate-700" /> : <Copy size={12} />}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center pt-0.5">
                                    {isActive ? (
                                      <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-slate-700">
                                        <Check size={12} />
                                      </div>
                                    ) : (
                                      <div className="h-6 w-6" />
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={quickCreateRef}>
          <button
            type="button"
              onClick={() => {
                setQuickCreateOpen((current) => !current);
                setOrgDropdownOpen(false);
                setUserMenuOpen(false);
                setSearchDropdownOpen(false);
              }}
              className="grid h-10 w-10 place-items-center rounded-lg bg-[#1a9b64] text-white shadow-sm transition-colors hover:bg-[#1a9b64]"
              aria-label="Quick Create"
              aria-expanded={quickCreateOpen}
              title="Quick Create"
            >
              <Plus size={18} />
            </button>

            {quickCreateOpen && (
              <div className="absolute right-0 top-full z-[2100] mt-2 w-[700px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                  {Object.entries(quickCreateItems).map(([category, items]) => (
                    <div key={category} className="flex flex-col">
                      <div className="mb-3 flex items-center gap-2">
                        {category === "GENERAL" && <Grid3x3 size={16} className="text-slate-500" />}
                        {category === "INVENTORY" && <ShoppingCart size={16} className="text-slate-500" />}
                        {category === "SALES" && <ShoppingBag size={16} className="text-slate-500" />}
                        {category === "PURCHASES" && <ShoppingBag size={16} className="text-slate-500" />}
                        {category === "BANKING" && <Building2 size={16} className="text-slate-500" />}
                        <span className="text-xs font-semibold uppercase text-slate-600">{category}</span>
                      </div>
                      <div className="space-y-1">
                        {items.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handleQuickCreateClick(item.path)}
                            className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-[#0f5f6c] hover:text-white"
                          >
                            <Plus size={12} className="text-slate-400 group-hover:text-white" />
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

          <button
            type="button"
            onClick={() => {
              setUserMenuOpen((current) => !current);
              setQuickCreateOpen(false);
              setOrgDropdownOpen(false);
              setSearchDropdownOpen(false);
            }}
            className={actionButtonClass()}
            aria-label="Team"
            title="Team"
          >
            <Users size={17} />
          </button>

          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-lg bg-[#0f5f6c] text-white shadow-sm transition-colors hover:bg-[#0f5f6c] hover:text-white"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={17} />
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              1
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/settings")}
            className={actionButtonClass()}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={17} />
          </button>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen((current) => !current);
                setQuickCreateOpen(false);
                setOrgDropdownOpen(false);
                setSearchDropdownOpen(false);
              }}
              className="grid h-10 w-10 place-items-center rounded-full bg-[#d97706] text-sm font-semibold text-white shadow-sm transition-colors"
              aria-label="User profile"
              aria-expanded={userMenuOpen}
            >
              {(organization?.name || currentUser?.name || "W").charAt(0).toUpperCase()}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full z-[2100] mt-2 w-[250px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
                <div className="border-b border-slate-200 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{currentUser?.name || "User"}</div>
                  <div className="mt-1 text-xs text-slate-500">{currentUser?.email || ""}</div>
                </div>

                <div className="my-2 border-t border-slate-200" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg bg-[#0f5f6c] text-white shadow-sm transition-colors hover:bg-[#0f5f6c] hover:text-white"
            aria-label="App launcher"
          >
            <Grid3x3 size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
