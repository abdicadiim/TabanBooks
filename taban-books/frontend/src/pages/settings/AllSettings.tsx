import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Code2,
  Compass,
  Cpu,
  Grid2x2,
  Megaphone,
  Palette,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Users,
  X,
  Percent,
  FileText,
} from "lucide-react";

type SettingItem = {
  label: string;
  path?: string;
  badge?: string;
};

type SettingCard = {
  icon: React.ElementType;
  color: string;
  title: string;
  items: SettingItem[];
  subSections?: Omit<SettingCard, "subSections">[];
};

const toneClasses: Record<
  string,
  { header: string; iconContainer: string; iconColor: string }
> = {
  green: {
    header: "bg-emerald-50/50",
    iconContainer: "bg-white shadow-sm border border-emerald-100/50",
    iconColor: "text-emerald-600",
  },
  pink: {
    header: "bg-rose-50/50",
    iconContainer: "bg-white shadow-sm border border-rose-100/50",
    iconColor: "text-rose-500",
  },
  blue: {
    header: "bg-blue-50/50",
    iconContainer: "bg-white shadow-sm border border-blue-100/50",
    iconColor: "text-blue-600",
  },
  orange: {
    header: "bg-orange-50/50",
    iconContainer: "bg-white shadow-sm border border-orange-100/50",
    iconColor: "text-orange-500",
  },
  yellow: {
    header: "bg-amber-50/50",
    iconContainer: "bg-white shadow-sm border border-amber-100/50",
    iconColor: "text-amber-600",
  },
  red: {
    header: "bg-red-50/50",
    iconContainer: "bg-white shadow-sm border border-red-100/50",
    iconColor: "text-red-500",
  },
  cyan: {
    header: "bg-cyan-50/50",
    iconContainer: "bg-white shadow-sm border border-cyan-100/50",
    iconColor: "text-cyan-600",
  },
};

const organizationSettings: SettingCard[] = [
  {
    icon: Building2,
    color: "green",
    title: "Organization",
    items: [
      { label: "Profile", path: "/settings/profile" },
      { label: "Branding", path: "/settings/branding" },
      { label: "Custom Domain", path: "/settings/custom-domain" },
      { label: "Locations", path: "/settings/locations" },
      { label: "AI Preferences" },
      { label: "Manage Subscription", path: "/settings/subscription" },
    ],
  },
  {
    icon: Users,
    color: "pink",
    title: "Users & Roles",
    items: [
      { label: "Users", path: "/settings/users" },
      { label: "Roles", path: "/settings/roles" },
      { label: "User Preferences", path: "/settings/user-preferences" },
    ],
    subSections: [
      {
        icon: FileText,
        color: "blue",
        title: "Taxes & Compliance",
        items: [{ label: "Taxes", path: "/settings/taxes" }],
      },
    ],
  },
  {
    icon: Receipt,
    color: "orange",
    title: "Setup & Configurations",
    items: [
      { label: "General", path: "/settings/general" },
      { label: "Currencies", path: "/settings/currencies" },
      { label: "Opening Balances", path: "/settings/opening-balances" },
      { label: "Reminders", path: "/settings/reminders" },
      { label: "Customer Portal", path: "/settings/customer-portal" },
      { label: "Vendor Portal", path: "/settings/vendor-portal" },
    ],
  },
  {
    icon: Palette,
    color: "yellow",
    title: "Customization",
    items: [
      { label: "Transaction Number Series", path: "/settings/customization/transaction-number-series" },
      { label: "PDF Templates", path: "/settings/customization/pdf-templates" },
      { label: "Email Notifications", path: "/settings/customization/email-notifications" },
      { label: "Reporting Tags", path: "/settings/customization/reporting-tags" },
      { label: "Web Tabs", path: "/settings/customization/web-tabs" },
    ],
  },
  {
    icon: ShieldCheck,
    color: "red",
    title: "Automation",
    items: [
      { label: "Workflow Rules", path: "/settings/workflow-rules" },
      { label: "Workflow Actions", path: "/settings/workflow-actions" },
      { label: "Workflow Logs", path: "/settings/workflow-logs" },
      { label: "Schedules", path: "/settings/schedules" },
    ],
  },
];

const moduleSettings: SettingCard[] = [
  {
    icon: Grid2x2,
    color: "green",
    title: "General",
    items: [
      { label: "Customers and Vendors", path: "/settings/customers-vendors" },
      { label: "Items", path: "/settings/items" },
      { label: "Accountant", path: "/settings/accountant" },
      { label: "Tasks", path: "/tasks" },
      { label: "Projects", path: "/settings/projects" },
      { label: "Timesheet", path: "/settings/timesheet" },
    ],
  },
  {
    icon: ShoppingCart,
    color: "red",
    title: "Inventory",
    items: [{ label: "Inventory Adjustments", path: "/settings/inventory-adjustments" }],
  },
  {
    icon: Megaphone,
    color: "green",
    title: "Sales",
    items: [
      { label: "Quotes", path: "/settings/quotes" },
      { label: "Retainer Invoices", path: "/sales/retainer-invoices" },
      { label: "Sales Orders", path: "/sales/sales-orders" },
      { label: "Invoices", path: "/settings/invoices" },
      { label: "Recurring Invoices", path: "/settings/recurring-invoices" },
      { label: "Sales Receipts", path: "/settings/sales-receipts" },
      { label: "Payments Received", path: "/settings/payments-received" },
      { label: "Credit Notes", path: "/settings/credit-notes" },
      { label: "Delivery Notes", path: "/settings/delivery-notes" },
      { label: "Packing Slips", path: "/settings/packing-slips" },
    ],
  },
  {
    icon: ShoppingBag,
    color: "green",
    title: "Purchases",
    items: [
      { label: "Expenses", path: "/settings/expenses" },
      { label: "Recurring Expenses", path: "/settings/recurring-expenses" },
      { label: "Purchase Orders", path: "/settings/purchase-orders" },
      { label: "Bills", path: "/settings/bills" },
      { label: "Recurring Bills", path: "/settings/recurring-bills" },
      { label: "Payments Made", path: "/settings/payments-made" },
      { label: "Vendor Credits", path: "/settings/vendor-credits" },
    ],
  },
  {
    icon: Cpu,
    color: "blue",
    title: "Custom Modules",
    items: [{ label: "Overview", path: "/settings/custom-modules" }],
  },
];

const extensionSettings: SettingCard[] = [
  {
    icon: Compass,
    color: "green",
    title: "Integrations & Market...",
    items: [
      { label: "Zoho Apps" },
      { label: "WhatsApp" },
      { label: "SMS Integrations" },
      { label: "Other Apps" },
      { label: "Marketplace" },
    ],
  },
  {
    icon: Code2,
    color: "orange",
    title: "Developer Data",
    items: [
      { label: "Incoming Webhooks" },
      { label: "Connections" },
      { label: "API Usage" },
      { label: "Signals" },
      { label: "Data Management" },
      { label: "Deluge Components Usage" },
      { label: "Web Forms" },
    ],
  },
];

function SettingCardBlock({
  card,
  navigate,
}: {
  card: SettingCard;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const renderSection = (
    icon: React.ElementType,
    color: string,
    title: string,
    items: SettingItem[],
    isSubSection = false
  ) => {
    const Icon = icon;
    const tone = toneClasses[color] || toneClasses.green;

    return (
      <div key={title}>
        <div
          className={`flex items-center gap-3 border-b border-slate-100 px-4 py-3 ${
            tone.header
          } ${isSubSection ? "border-t" : ""}`}
        >
          <div className={`grid h-8 w-8 place-items-center rounded-lg ${tone.iconContainer}`}>
            <Icon size={16} className={tone.iconColor} />
          </div>
          <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
        </div>

        <div className="px-4 py-3">
          <div className="space-y-1">
            {items.map((item) => {
              const row = (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </>
              );

              if (!item.path) {
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-md px-1 py-2 text-[15px] text-slate-600 opacity-80"
                  >
                    {row}
                  </div>
                );
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.path!)}
                  className="flex w-full items-center justify-between rounded-md px-1 py-2 text-left text-[15px] text-slate-900 transition-colors hover:bg-slate-50 hover:text-[#156372]"
                >
                  {row}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      {renderSection(card.icon, card.color, card.title, card.items)}
      {card.subSections?.map((sub) =>
        renderSection(sub.icon, sub.color, sub.title, sub.items, true)
      )}
    </section>
  );
}

export default function AllSettings() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filterCards = (cards: SettingCard[]) =>
      cards
        .map((card) => ({
          ...card,
          items: card.items.filter((item) => !query || item.label.toLowerCase().includes(query)),
        }))
        .filter((card) => card.items.length > 0);

    return {
      organization: filterCards(organizationSettings),
      module: filterCards(moduleSettings),
      extension: filterCards(extensionSettings),
    };
  }, [searchQuery]);

  useEffect(() => {
    const sidebar = document.querySelector("aside");
    const topBar = document.querySelector("header");

    if (sidebar) (sidebar as HTMLElement).style.display = "none";
    if (topBar) (topBar as HTMLElement).style.display = "none";

    return () => {
      if (sidebar) (sidebar as HTMLElement).style.display = "";
      if (topBar) (topBar as HTMLElement).style.display = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] min-h-screen overflow-y-auto bg-[#f4f7fb] text-slate-900">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4 rounded-[18px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              aria-label="Close settings"
            >
              <X size={16} />
            </button>
            <div>
              <h1 className="text-[22px] font-semibold text-slate-900">Organization Settings</h1>
              <p className="text-sm text-slate-500">All settings are grouped into a systematic layout for easy access.</p>
            </div>
          </div>

          <div className="hidden w-full max-w-[360px] sm:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search settings ( / )"
                className="h-11 w-full rounded-full border border-slate-200 bg-white px-4 pr-10 text-sm outline-none transition focus:border-[#156372] focus:ring-2 focus:ring-[#156372]/10"
              />
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7.333 12A4.667 4.667 0 1 0 7.333 2.667a4.667 4.667 0 0 0 0 9.333Zm5.334 1.333-2.8-2.8"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-slate-900">Organization Settings</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {filteredSections.organization.map((card) => (
              <SettingCardBlock key={card.title} card={card} navigate={navigate} />
            ))}
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-slate-900">Module Settings</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {filteredSections.module.map((card) => (
              <SettingCardBlock key={card.title} card={card} navigate={navigate} />
            ))}
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-slate-900">Extension and Developer Data</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {filteredSections.extension.map((card) => (
              <SettingCardBlock key={card.title} card={card} navigate={navigate} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
