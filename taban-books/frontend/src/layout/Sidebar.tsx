import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  BellRing,
  Boxes,
  Warehouse,
  ShoppingCart,
  Truck,
  Clock3,
  BookOpenText,
  Landmark,
  Calculator,
  BarChart3,
  FileText,
} from "lucide-react";

const nav = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Getting Started", to: "/getting-started", icon: Sparkles },
  { label: "Recent Updates", to: "/recent-updates", icon: BellRing },

  { label: "Items", to: "/items", icon: Boxes },
  { label: "Inventory", to: "/inventory", icon: Warehouse },
  { label: "Sales", to: "/sales", icon: ShoppingCart },
  { label: "Purchases", to: "/purchases", icon: Truck },
  { label: "Time Tracking", to: "/time-tracking", icon: Clock3 },
  { label: "Projects Guide", to: "/time-tracking/projects-guide", icon: BookOpenText },
  { label: "Banking", to: "/banking", icon: Landmark },
  { label: "Accountant", to: "/accountant", icon: Calculator },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Documents", to: "/documents", icon: FileText },
];

import { getCurrentUser } from "../services/auth";

export default function Sidebar() {
  const user = getCurrentUser();
  const permissions = user?.permissions;

  const hasAccess = (moduleLabel: string) => {
    // If no user, hide everything
    if (!user) return false;

    // Owner and Admin have full access
    if (user.role === 'owner' || user.role === 'admin' || permissions === 'full_access') return true;

    // If we have a custom role but no permissions object, something is wrong (or old session).
    // Safest is to hide, but might block legitimate users until re-login.
    // For now, if no permissions and not owner/admin, assume NO access.
    if (!permissions) return false;

    switch (moduleLabel) {
      case "Dashboard":
        return true; // Everyone typically has dashboard access, or check permissions.dashboard

      case "Getting Started":
      case "Recent Updates":
        return true; // General pages

      case "Items":
        return permissions.items?.item?.view;

      case "Inventory":
        return permissions.items?.inventoryAdjustments?.view;

      case "Sales": {
        const p = permissions.sales;
        if (!p) return false;
        return p.invoices?.view || p.estimates?.view || p.salesOrders?.view || p.retainerInvoices?.view || p.salesReceipts?.view || p.paymentsReceived?.view || p.recurringInvoices?.view || p.creditNotes?.view;
      }

      case "Purchases": {
        const p = permissions.purchases;
        if (!p) return false;
        return p.expenses?.view || p.recurringExpenses?.view || p.bills?.view || p.vendorCredits?.view || p.purchaseOrders?.view || p.paymentsMade?.view || p.recurringBills?.view;
      }

      case "Time Tracking": {
        const p = permissions.timesheets;
        if (!p) return false;
        return p.projects?.view || p.timesheet?.view;
      }

      case "Projects Guide": {
        const p = permissions.timesheets;
        if (!p) return false;
        return p.projects?.view;
      }

      case "Banking":
        return permissions.banking?.banking?.view;

      case "Accountant": {
        const p = permissions.accountant;
        if (!p) return false;
        return p.manualJournals?.view || p.chartOfAccounts?.view;
      }

      case "Reports":
        // Basic check. Detailed report check should happen on Reports page.
        return true;

      case "Documents":
        return permissions.documents?.documents?.view;

      default:
        return true;
    }
  };

  const filteredNav = nav.filter(it => hasAccess(it.label));

  return (
    <aside className="hidden md:flex fixed top-14 left-0 bottom-0 z-[60] w-[72px] border-r border-slate-200 bg-white flex-col items-center py-3 gap-2">
      {filteredNav.map((it) => {
        const Icon = it.icon;
        return (
          <NavLink
            key={it.to}
            to={it.to}
            title={it.label}
            className={({ isActive }) =>
              [
                "h-11 w-11 rounded-2xl flex items-center justify-center border",
                isActive
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
              ].join(" ")
            }
          >
            <Icon size={18} />
          </NavLink>
        );
      })}
    </aside>
  );
}
