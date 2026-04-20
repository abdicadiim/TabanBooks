import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Boxes,
  Warehouse,
  ShoppingCart,
  Truck,
  Clock3,
  Landmark,
  Calculator,
  BarChart3,
  FileText,
  Copyright,
  ChevronRight,
  Home,
  Package,
  Menu,
} from "lucide-react";
import { useAppBootstrap } from "../../context/AppBootstrapContext";

const normalizeHex = (input: string | undefined, fallback: string) => {
  const value = String(input || "").trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex, "#3b82f6");
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
};

const rgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getContrastTextClass = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "text-slate-900" : "text-white";
};

type MenuItem = {
  label: string;
  to?: string;
  icon: React.ElementType;
  children?: Array<{ label: string; to: string }>;
};

const items: MenuItem[] = [
  { label: "Home", to: "/", icon: Home },
  {
    label: "Items",
    to: "/items",
    icon: Package,
    children: [{ label: "Items", to: "/items" }],
  },
  {
    label: "Inventory",
    to: "/inventory",
    icon: Boxes,
    children: [{ label: "Inventory Adjustments", to: "/inventory" }],
  },
  {
    label: "Sales",
    to: "/sales",
    icon: ShoppingCart,
    children: [
      { label: "Customers", to: "/sales/customers" },
      { label: "Quotes", to: "/sales/quotes" },
      { label: "Sales Orders", to: "/sales/sales-orders" },
      { label: "Invoices", to: "/sales/invoices" },
      { label: "Recurring Invoices", to: "/sales/recurring-invoices" },
      { label: "Sales Receipts", to: "/sales/sales-receipts" },
      { label: "Payments Received", to: "/sales/payments-received" },
      { label: "Credit Notes", to: "/sales/credit-notes" },
    ],
  },
  {
    label: "Purchases",
    to: "/purchases",
    icon: Truck,
    children: [
      { label: "Vendors", to: "/purchases/vendors" },
      { label: "Expenses", to: "/purchases/expenses" },
      { label: "Recurring Expenses", to: "/purchases/recurring-expenses" },
      { label: "Purchase Orders", to: "/purchases/purchase-orders" },
      { label: "Bills", to: "/purchases/bills" },
      { label: "Recurring Bills", to: "/purchases/recurring-bills" },
      { label: "Payments Made", to: "/purchases/payments-made" },
      { label: "Vendor Credits", to: "/purchases/vendor-credits" },
    ],
  },
  {
    label: "Time Tracking",
    to: "/time-tracking",
    icon: Clock3,
    children: [
      { label: "Projects", to: "/time-tracking/projects" },
      { label: "Timesheet", to: "/time-tracking/timesheet" },
      { label: "Approvals", to: "/time-tracking/approvals" },
      { label: "Customer Approvals", to: "/time-tracking/customer-approvals" },
    ],
  },
  { label: "Banking", to: "/banking", icon: Landmark },
  {
    label: "Accountant",
    to: "/accountant",
    icon: Calculator,
    children: [
      { label: "Journal Entries", to: "/accountant/manual-journals" },
      { label: "Recurring Journals", to: "/accountant/recurring-journals" },
      { label: "Bulk Update", to: "/accountant/bulk-update" },
      { label: "Currency Adjustments", to: "/accountant/currency-adjustments" },
      { label: "Chart of Accounts", to: "/accountant/chart-of-accounts" },
      { label: "Budgets", to: "/accountant/budgets" },
      { label: "Transaction Locking", to: "/accountant/transaction-locking" },
    ],
  },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Documents", to: "/documents", icon: FileText },
];

const isRouteMatch = (pathname: string, route?: string): boolean => {
  if (!route) return false;
  if (pathname === route) return true;
  if (route === "/") return false;
  return pathname.startsWith(`${route}/`);
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = "taban-books-sidebar-collapsed";

export default function Sidebar() {
  const location = useLocation();
  const { currentUser, organization, branding } = useAppBootstrap();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [flyoutSection, setFlyoutSection] = useState<{
    label: string;
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  });
  const flyoutCloseTimer = useRef<number | null>(null);

  const organizationName = String(organization?.name || currentUser?.organizationName || "Taban Enterprise");
  const roleLabel = String(currentUser?.role || "Owner").replace(/_/g, " ");
  const orgInitial = organizationName.trim().charAt(0).toUpperCase() || "T";
  const isLightAppearance = String(branding?.appearance || "dark") === "light";
  const accentColor = normalizeHex(branding?.accentColor, "#3b82f6");
  const accentTextClass = getContrastTextClass(accentColor);
  const accentForeground = accentTextClass === "text-white" ? "#ffffff" : "#111827";
  const shellBackground = isLightAppearance
    ? "#ffffff"
    : "linear-gradient(180deg, #0f5f6c 0%, #156372 100%)";
  const shellBorder = isLightAppearance
    ? "border border-slate-200 shadow-[0_18px_35px_rgba(15,23,42,0.08)]"
    : "shadow-[0_18px_35px_rgba(4,38,46,0.14)]";
  const itemBaseClass = isLightAppearance
    ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    : "text-white/90 hover:bg-white/10 hover:text-white";
  const itemActiveClass = accentTextClass;
  const childBaseClass = isLightAppearance
    ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    : "text-white/75 hover:bg-white/8 hover:text-white";
  const childActiveClass = accentTextClass;
  const cardBg = isLightAppearance ? "bg-white" : "bg-white/10";
  const cardText = isLightAppearance ? "text-slate-900" : "text-white";
  const subText = isLightAppearance ? "text-slate-500" : "text-white/75";

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", isCollapsed ? "96px" : "246px");
  }, [isCollapsed]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    if (isCollapsed) {
      setOpenSection(null);
      setFlyoutSection(null);
    }
  }, [isCollapsed]);

  useEffect(() => {
    return () => {
      if (flyoutCloseTimer.current !== null) {
        window.clearTimeout(flyoutCloseTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const activeParent = items.find(
      (item) => item.children?.some((child) => isRouteMatch(location.pathname, child.to)) || isRouteMatch(location.pathname, item.to)
    );
    if (activeParent) setOpenSection(activeParent.label);
  }, [location.pathname]);

  const closeFlyoutSoon = () => {
    if (!isCollapsed) return;
    if (flyoutCloseTimer.current !== null) {
      window.clearTimeout(flyoutCloseTimer.current);
    }
    flyoutCloseTimer.current = window.setTimeout(() => {
      setFlyoutSection(null);
      flyoutCloseTimer.current = null;
    }, 120);
  };

  const cancelFlyoutClose = () => {
    if (flyoutCloseTimer.current !== null) {
      window.clearTimeout(flyoutCloseTimer.current);
      flyoutCloseTimer.current = null;
    }
  };

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;
    const hasChildren = Boolean(item.children?.length);
    const isActiveParent = hasChildren
      ? location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
      : isRouteMatch(location.pathname, item.to);
    const isOpen = openSection === item.label;

    const openFlyout = (event: React.SyntheticEvent<HTMLButtonElement>) => {
      if (!isCollapsed || !hasChildren) return;
      cancelFlyoutClose();

      const rect = event.currentTarget.getBoundingClientRect();
      const panelWidth = 240;
      const viewportGap = 16;
      const maxTop = Math.max(viewportGap, window.innerHeight - 380);
      const nextLeft = Math.min(rect.right + 20, window.innerWidth - panelWidth - viewportGap);
      const nextTop = Math.min(Math.max(rect.top - 6, viewportGap), maxTop);

      setFlyoutSection({
        label: item.label,
        top: nextTop,
        left: nextLeft,
        width: panelWidth,
      });
    };

    if (!hasChildren) {
      return (
        <NavLink
          key={item.label}
          to={item.to || "/"}
          end={item.to === "/"}
          aria-label={item.label}
          title={isCollapsed ? item.label : undefined}
          className={[
            "flex items-center rounded-[14px] py-3 text-[14px] font-semibold transition-all",
            isCollapsed ? "relative flex-col justify-center gap-1 px-2 py-3 text-center" : "gap-3 px-4",
            isActiveParent ? itemActiveClass : itemBaseClass,
          ].join(" ")}
          style={isActiveParent ? { backgroundColor: accentColor, color: accentForeground } : undefined}
        >
          <span className={isCollapsed ? "hidden" : "w-4 shrink-0"} />
          <Icon size={18} className="shrink-0" />
          <span className={isCollapsed ? "w-full truncate text-[11px] font-medium leading-tight" : "truncate"}>
            {item.label}
          </span>
        </NavLink>
      );
    }

    return (
      <div key={item.label} className="space-y-1">
        <button
          type="button"
          onClick={isCollapsed ? undefined : () => setOpenSection((current) => (current === item.label ? null : item.label))}
          onMouseEnter={isCollapsed ? openFlyout : undefined}
          onMouseLeave={isCollapsed ? closeFlyoutSoon : undefined}
          onFocus={isCollapsed ? openFlyout : undefined}
          aria-label={item.label}
          title={isCollapsed ? item.label : undefined}
          aria-expanded={!isCollapsed ? isOpen : undefined}
          className={[
            "flex w-full items-center rounded-[14px] py-3 text-[14px] font-semibold transition-all",
            isCollapsed ? "relative flex-col justify-center gap-1 px-2 py-3 text-center" : "gap-3 px-4",
            isActiveParent ? itemActiveClass : itemBaseClass,
          ].join(" ")}
          style={isActiveParent ? { backgroundColor: accentColor, color: accentForeground } : undefined}
        >
          {isCollapsed ? (
            <ChevronRight
              size={10}
              className={`absolute right-2 top-1/2 -translate-y-1/2 rotate-45 transition-transform duration-200 ${
                isActiveParent ? (accentTextClass === "text-white" ? "text-white/80" : "text-slate-900/70") : "text-white/35"
              }`}
            />
          ) : (
            <ChevronRight
              size={16}
              className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : "rotate-0"} ${isActiveParent ? (accentTextClass === "text-white" ? "text-white/90" : "text-slate-900") : "text-white/70"}`}
            />
          )}
          <Icon size={18} className="shrink-0" />
          <span className={isCollapsed ? "w-full truncate text-[11px] font-medium leading-tight" : "truncate"}>
            {item.label}
          </span>
        </button>

        {!isCollapsed && isOpen && item.children?.length ? (
          <div className={`ml-4 space-y-1 border-l pl-4 ${isLightAppearance ? "border-slate-200" : "border-white/10"}`}>
            {item.children.map((child) => {
              const isActiveChild = isRouteMatch(location.pathname, child.to);
              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  className={[
                    "flex items-center rounded-[12px] px-3 py-2 text-[13px] font-medium transition-all",
                    isActiveChild ? childActiveClass : childBaseClass,
                  ].join(" ")}
                  style={isActiveChild ? { backgroundColor: rgba(accentColor, 0.18), color: accentForeground } : undefined}
                >
                  <span className="truncate">{child.label}</span>
                </NavLink>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  const renderFlyout = () => {
    if (!isCollapsed || !flyoutSection) return null;

    const item = items.find((entry) => entry.label === flyoutSection.label);
    if (!item?.children?.length) return null;

    return (
      <div
        className={`fixed z-[95] overflow-hidden rounded-[20px] border shadow-[0_24px_45px_rgba(0,0,0,0.22)] ${isLightAppearance ? "border-slate-200" : "border-white/10"}`}
        style={{
          background: shellBackground,
          top: flyoutSection.top,
          left: flyoutSection.left,
          width: flyoutSection.width,
        }}
        onMouseEnter={cancelFlyoutClose}
        onMouseLeave={closeFlyoutSoon}
      >
        <div className={`border-b px-3 py-2.5 ${isLightAppearance ? "border-slate-200" : "border-white/10"}`}>
          <div className={`text-[11px] font-bold uppercase tracking-[0.26em] ${isLightAppearance ? "text-slate-500" : "text-white/60"}`}>{item.label}</div>
        </div>
        <div className="space-y-1 p-2.5">
          {item.children.map((child) => {
            const isActiveChild = isRouteMatch(location.pathname, child.to);
            return (
              <NavLink
                key={child.to}
                to={child.to}
                className={[
                  "flex items-center rounded-[12px] px-3 py-2 text-[13px] font-semibold transition-all",
                  isActiveChild ? childActiveClass : childBaseClass,
                ].join(" ")}
                style={isActiveChild ? { backgroundColor: rgba(accentColor, 0.18), color: accentForeground } : undefined}
              >
                <span className="truncate">{child.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .sidebar-no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .sidebar-no-scrollbar::-webkit-scrollbar {
          width: 0;
          height: 0;
        }
      `}</style>
      <aside
        className={`fixed left-3 top-3 bottom-3 z-[70] hidden overflow-visible rounded-[22px] md:flex md:flex-col transition-[width] duration-200 ${shellBorder}`}
        style={{
          width: isCollapsed ? "96px" : "246px",
          background: shellBackground,
        }}
      >
        <div className={isCollapsed ? "px-2 pt-4" : "px-4 pt-4"}>
          {isCollapsed ? (
            <div className="flex justify-center">
              <div className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border font-bold ${isLightAppearance ? "border-slate-200 bg-slate-100 text-slate-700" : "border-white/20 bg-white/10 text-white"}`}>
                {organization?.logo ? (
                  <img src={organization.logo} alt={organizationName} className="h-full w-full object-cover" />
                ) : (
                  <span>{orgInitial}</span>
                )}
              </div>
            </div>
          ) : (
            <div className={`rounded-[18px] border px-3 py-2.5 ${isLightAppearance ? "border-slate-200 bg-slate-50 text-slate-900" : "border-white/10 bg-white/10 text-white"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full font-bold ${isLightAppearance ? "bg-slate-200 text-slate-800" : "text-white"}`} style={isLightAppearance ? undefined : { background: "linear-gradient(180deg, #0f5f6c 0%, #156372 100%)" }}>
                  {organization?.logo ? (
                    <img src={organization.logo} alt={organizationName} className="h-full w-full object-cover" />
                  ) : (
                    <span>{orgInitial}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`truncate text-[17px] font-semibold leading-tight ${cardText}`}>{organizationName}</div>
                  <div className={`text-[12px] ${subText}`}>Inventory & Accounting</div>
                  <div className={`text-[11px] ${isLightAppearance ? "text-slate-400" : "text-white/55"}`}>Role: {roleLabel}</div>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed((current) => !current)}
            className={[
              "mt-4 flex h-11 items-center justify-center rounded-[12px] border",
              isCollapsed ? "mx-auto w-11" : "w-full",
              isLightAppearance ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "border-white/10 bg-white/10 text-white/90 hover:bg-white/15",
            ].join(" ")}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="sidebar-no-scrollbar flex-1 overflow-y-auto overflow-x-visible px-3 py-3.5">
          <div className="space-y-1.5">
            {items.map(renderItem)}
          </div>
        </nav>

        <div className={`flex-none w-full border-t px-4 pb-4 pt-3 text-[11px] ${isLightAppearance ? "border-slate-200 text-slate-500" : "border-white/10 text-white/70"}`} style={{ display: isCollapsed ? "none" : "block" }}>
          <div className={`font-semibold ${isLightAppearance ? "text-slate-700" : "text-white/85"}`}>Version 1.0.0</div>
          <div className="mt-1 flex items-center gap-1.5">
            <Copyright size={12} />
            <span>Taban Enterprise</span>
          </div>
        </div>
      </aside>
      {renderFlyout()}
    </>
  );
}
