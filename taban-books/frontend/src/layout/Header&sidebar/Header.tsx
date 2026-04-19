import React, { useEffect, useRef, useState } from "react";
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Grid3x3,
  Loader2,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import { setOrganization } from "../../services/auth";
import { useAppBootstrap } from "../../context/AppBootstrapContext";

export default function Header() {
  const navigate = useNavigate();
  const { authenticated, currentUser, organization } = useAppBootstrap();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchScope, setSearchScope] = useState("Products");
  const [searchQuery, setSearchQuery] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [copiedOrgId, setCopiedOrgId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const orgButtonRef = useRef<HTMLButtonElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);
  const [orgPanelStyle, setOrgPanelStyle] = useState<{ top: number; pointerLeft: number } | null>(null);

  const orgName = String(organization?.name || "Organization");
  const orgLabel = orgName.trim().split(" ")[0] || orgName;
  const userInitial = orgName.trim().charAt(0).toUpperCase() || "T";

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
    navigate(path);
  };

  const handleSearchScopeChange = (option: { label: string; path: string }) => {
    setSearchScope(option.label);
    setSearchDropdownOpen(false);
    navigate(option.path);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = searchQuery.trim();
    if (!query) return;

    const target = searchOptions.find((option) => option.label === searchScope) || searchOptions[0];
    const params = new URLSearchParams();
    params.set("search", query);

    navigate(`${target.path}?${params.toString()}`);
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

  return (
    <header
      className="fixed top-3 left-3 right-3 z-[80] h-[44px] rounded-[14px] px-4 shadow-[0_12px_28px_rgba(4,38,46,0.14)] border border-white/10 md:left-[calc(var(--sidebar-width)+24px)]"
      style={{
        background: "linear-gradient(90deg, #0f5f6c 0%, #156372 100%)",
      }}
    >
      <div className="flex h-full items-center justify-between gap-3">
        <form className="relative flex min-w-0 flex-1 items-center" ref={searchRef} onSubmit={handleSearchSubmit}>
          <div className="flex h-8 w-full max-w-[360px] items-stretch overflow-hidden rounded-lg border border-white/15 bg-white/10 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus-within:ring-2 focus-within:ring-white/25">
            <button
              type="button"
              onClick={() => {
                setSearchDropdownOpen((current) => !current);
                setQuickCreateOpen(false);
                setOrgDropdownOpen(false);
              }}
              className="flex w-9 shrink-0 items-center justify-center text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Search"
              title="Search"
            >
              <Search size={14} />
            </button>

            <button
              type="button"
              onClick={() => {
                setSearchDropdownOpen((current) => !current);
                setQuickCreateOpen(false);
                setOrgDropdownOpen(false);
              }}
              className="flex w-7 shrink-0 items-center justify-center border-r border-white/10 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Open search models"
              title="Open search models"
            >
              {searchDropdownOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`Search in ${searchScope} ( / )`}
              className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-[12px] text-white/85 outline-none placeholder:text-white/60"
            />
          </div>

          {searchDropdownOpen && (
            <div className="absolute left-0 top-full z-[120] mt-2 w-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
              <div className="max-h-[500px] overflow-y-auto py-2">
                {searchOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleSearchScopeChange(option)}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-blue-50 ${
                      searchScope === option.label ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className={searchScope === option.label ? "font-medium text-blue-600" : "text-slate-700"}>
                      {option.label}
                    </span>
                    {searchScope === option.label ? <Check size={16} className="text-blue-600" /> : null}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center gap-2">
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
              className="flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[12px] font-medium text-white transition-colors hover:bg-white/15"
              aria-label="Organizations"
            >
              <span className="max-w-[120px] truncate">{orgLabel}</span>
              {orgDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {orgDropdownOpen && (
              <div
                className="fixed inset-0 z-[120]"
                style={{
                  top: orgPanelStyle?.top ?? 0,
                }}
              >
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
                          className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:text-blue-700"
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
                                className={`w-full rounded-[18px] border px-3 py-3 text-left transition-colors ${
                                  isActive ? "border-blue-200 bg-blue-50" : "border-transparent hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-slate-200 bg-white text-slate-500">
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
                                      <div className="truncate text-[13px] font-semibold text-slate-900">
                                        {displayName}
                                      </div>
                                      {planName ? (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                                          {planName}
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                                      <span className="truncate">Organization ID: {orgId}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void handleCopyOrgId(orgId);
                                        }}
                                        className="text-slate-400 hover:text-slate-600"
                                        aria-label="Copy organization ID"
                                      >
                                        {copiedOrgId === orgId ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center pt-0.5">
                                    {isActive ? (
                                      <div className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-white">
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
              }}
              className="grid h-8 w-8 place-items-center rounded-md bg-white/10 text-white transition-colors hover:bg-white/15"
              aria-label="Quick Create"
              title="Quick Create"
            >
              <Plus size={16} />
            </button>

            {quickCreateOpen && (
              <div className="absolute right-0 top-full z-[120] mt-2 w-[700px] rounded-xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                <div className="grid grid-cols-5 gap-4">
                  {Object.entries(quickCreateItems).map(([category, items]) => (
                    <div key={category} className="flex flex-col">
                      <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase text-slate-600">
                        {category === "GENERAL" && <Grid3x3 size={16} className="text-slate-500" />}
                        {category === "INVENTORY" && <ShoppingCart size={16} className="text-slate-500" />}
                        {category === "SALES" && <ShoppingBag size={16} className="text-slate-500" />}
                        {category === "PURCHASES" && <ShoppingBag size={16} className="text-slate-500" />}
                        {category === "BANKING" && <Building2 size={16} className="text-slate-500" />}
                        <span>{category}</span>
                      </div>

                      <div className="space-y-1">
                        {items.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handleQuickCreateClick(item.path)}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-blue-50 hover:text-blue-700"
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

          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
            aria-label="Users"
          >
            <Users size={15} />
          </button>

          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
            aria-label="Notifications"
          >
            <Bell size={15} />
          </button>

          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={15} />
          </button>

          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#0f5f6c] shadow-sm md:hidden"
            aria-label={orgName}
          >
            {organization?.logo ? (
              <img
                src={organization.logo}
                alt={orgName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="text-[11px] font-semibold">{userInitial}</span>
            )}
          </button>

          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
            aria-label="App launcher"
          >
            <Grid3x3 size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
