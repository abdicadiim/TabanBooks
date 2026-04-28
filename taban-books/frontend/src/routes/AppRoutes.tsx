import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import AppShell from "../layout/AppShell";
import PermissionRoute from "../components/PermissionRoute";
import ProtectedRoute from "../components/ProtectedRoute";
import { usePermissions } from "../hooks/usePermissions";
import { lazyRetry } from "../utils/lazyRetry";

const Login = lazy(() => import("../auth/Login"));
const Signup = lazy(() => import("../auth/Signup"));
const OrganizationProfile = lazy(() => import("../auth/OrganizationProfile"));
const LoadingPage = lazy(() => import("../auth/LoadingPage"));
const VerifyIdentity = lazy(() => import("../auth/VerifyIdentity"));
const AcceptInvitation = lazy(() => import("../auth/AcceptInvitation"));

const HomeDashboard = lazy(() => import("../pages/home/HomeDashboard"));
const GettingStartedPage = lazy(() => import("../pages/home/GettingStartedPage"));
const RecentUpdatesPage = lazy(() => import("../pages/home/RecentUpdatesPage"));


const ItemsPage = lazy(() => import("../pages/items/ItemsPage"));
const NewCustomView = lazy(() => import("../pages/items/NewCustomView"));
const ImportItems = lazy(() => import("../pages/items/ImportItems"));

const InventoryPage = lazy(() => import("../pages/inventory/InventoryPage"));
const NewAdjustmentForm = lazy(() => import("../pages/inventory/NewAdjustmentForm"));
const InventoryNewCustomView = lazy(() => import("../pages/inventory/NewCustomView"));
const ImportQuantityAdjustments = lazy(() => import("../pages/inventory/ImportQuantityAdjustments"));
const ImportValueAdjustments = lazy(() => import("../pages/inventory/ImportValueAdjustments"));
const ImportQuantityMapFields = lazy(() => import("../pages/inventory/ImportQuantityMapFields"));
const ImportQuantityPreview = lazy(() => import("../pages/inventory/ImportQuantityPreview"));
const ImportValueMapFields = lazy(() => import("../pages/inventory/ImportValueMapFields"));
const ImportValuePreview = lazy(() => import("../pages/inventory/ImportValuePreview"));

const SalesPage = lazy(() => import("../pages/sales/SalesRoutes"));

function LegacyPaymentsReceivedRedirect() {
  const location = useLocation();
  const path = location.pathname || "";
  const suffix = path.startsWith("/payments/payments-received")
    ? path.slice("/payments/payments-received".length)
    : "";
  const next = `/sales/payments-received${suffix}${location.search || ""}${location.hash || ""}`;
  return <Navigate to={next} replace state={location.state} />;
}
function AccountsReceivableDashboard() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
      Accounts receivable is not available in this sales module build.
    </div>
  );
}

function AccountsReceivableLedger() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
      Accounts receivable ledger is not available in this sales module build.
    </div>
  );
}

const PurchasesPage = lazy(() => lazyRetry(() => import("../pages/purchases/PurchasesPage")));
const TimeTrackingPage = lazy(() => import("../pages/timeTracking/TimeTrackingPage"));
const ProjectsGuidePage = lazy(() => import("../pages/timeTracking/ProjectsGuidePage"));

const BankingPage = lazy(() => import("../pages/banking/BankingPage"));
const AddBankAccount = lazy(() => import("../pages/banking/AddBankAccount"));
const AccountDetail = lazy(() => import("../pages/banking/AccountDetail"));
const ImportStatement = lazy(() => import("../pages/banking/ImportStatement"));
const AddBankForm = lazy(() => import("../pages/banking/AddBankForm"));
const Reconciliations = lazy(() => import("../pages/banking/Reconciliations"));
const StartReconciliation = lazy(() => import("../pages/banking/StartReconciliation"));

const AccountantPage = lazy(() => import("../pages/accountant/AccountantPage"));
const ReportsPage = lazy(() => import("../pages/reports/ReportsPage"));
const DocumentsPage = lazy(() => import("../pages/documents/DocumentsPage"));
const OrganizationsManagePage = lazy(() => import("../pages/organizations/OrganizationsManagePage"));

const AllSettings = lazy(() => import("../pages/settings/AllSettings"));
const SettingsProfileWrapper = lazy(() => import("../pages/settings/SettingsProfileWrapper"));
const SettingsBrandingWrapper = lazy(() => import("../pages/settings/SettingsBrandingWrapper"));
const SettingsCustomDomainWrapper = lazy(() => import("../pages/settings/SettingsCustomDomainWrapper"));
const SettingsLocationsWrapper = lazy(() => import("../pages/settings/SettingsLocationsWrapper"));
const SettingsSubscriptionWrapper = lazy(() => import("../pages/settings/SettingsSubscriptionWrapper"));
const SettingsUsersWrapper = lazy(() => import("../pages/settings/SettingsUsersWrapper"));
const SettingsRolesWrapper = lazy(() => import("../pages/settings/SettingsRolesWrapper"));
const NewRolePageWrapper = lazy(() => import("../pages/settings/NewRolePageWrapper"));
const SettingsUserPreferencesWrapper = lazy(() => import("../pages/settings/SettingsUserPreferencesWrapper"));
const NewCustomFieldPageWrapper = lazy(() => import("../pages/settings/NewCustomFieldPageWrapper"));
const SettingsTaxesWrapper = lazy(() => import("../pages/settings/SettingsTaxesWrapper"));
const SettingsVATWrapper = lazy(() => import("../pages/settings/SettingsVATWrapper"));
const SettingsGeneralWrapper = lazy(() =>
  import("../pages/settings/organization-settings/setup-configurations/general/SettingsGeneralWrapper"),
);
const SettingsCurrenciesWrapper = lazy(() =>
  import("../pages/settings/organization-settings/setup-configurations/currencies/SettingsCurrenciesWrapper"),
);
const SettingsOpeningBalancesWrapper = lazy(() =>
  import("../pages/settings/organization-settings/setup-configurations/opening-balances/SettingsOpeningBalancesWrapper"),
);
const SettingsRemindersWrapper = lazy(() =>
  import("../pages/settings/organization-settings/setup-configurations/reminders/SettingsRemindersWrapper"),
);
const SettingsCustomerPortalWrapper = lazy(() => import("../pages/settings/SettingsCustomerPortalWrapper"));
const SettingsVendorPortalWrapper = lazy(() => import("../pages/settings/SettingsVendorPortalWrapper"));
const SettingsCustomizationWrapper = lazy(() => import("../pages/settings/SettingsCustomizationWrapper"));
const SettingsWorkflowRulesWrapper = lazy(() =>
  import("../pages/settings/organization-settings/automation/workflow-rules/SettingsWorkflowRulesWrapper"),
);
const SettingsWorkflowActionsWrapper = lazy(() =>
  import("../pages/settings/organization-settings/automation/workflow-actions/SettingsWorkflowActionsWrapper"),
);
const SettingsWorkflowLogsWrapper = lazy(() =>
  import("../pages/settings/organization-settings/automation/workflow-logs/SettingsWorkflowLogsWrapper"),
);
const SettingsSchedulesWrapper = lazy(() =>
  import("../pages/settings/organization-settings/automation/schedules/SettingsSchedulesWrapper"),
);
const SettingsCustomersVendorsWrapper = lazy(() =>
  import("../pages/settings/module-settings/customers-vendors/SettingsCustomersVendorsWrapper"),
);
const NewCustomersVendorsCustomFieldPageWrapper = lazy(() =>
  import("../pages/settings/NewCustomersVendorsCustomFieldPageWrapper"),
);
const SettingsItemsWrapper = lazy(() =>
  import("../pages/settings/module-settings/items/SettingsItemsWrapper"),
);
const NewItemsCustomFieldPageWrapper = lazy(() =>
  import("../pages/settings/NewItemsCustomFieldPageWrapper"),
);
const SettingsAccountantWrapper = lazy(() =>
  import("../pages/settings/module-settings/accountant/SettingsAccountantWrapper"),
);
const SettingsTasksWrapper = lazy(() => import("../pages/settings/SettingsTasksWrapper"));
const NewAccountantCustomFieldPageWrapper = lazy(() =>
  import("../pages/settings/NewAccountantCustomFieldPageWrapper"),
);
const SettingsProjectsWrapper = lazy(() =>
  import("../pages/settings/module-settings/projects/SettingsProjectsWrapper"),
);
const NewProjectsCustomFieldPageWrapper = lazy(() =>
  import("../pages/settings/NewProjectsCustomFieldPageWrapper"),
);
const NewProjectsRelatedListPageWrapper = lazy(() =>
  import("../pages/settings/NewProjectsRelatedListPageWrapper"),
);
const SettingsTimesheetWrapper = lazy(() =>
  import("../pages/settings/module-settings/timesheet/SettingsTimesheetWrapper"),
);
const NewTimesheetCustomFieldPageWrapper = lazy(() =>
  import("../pages/settings/NewTimesheetCustomFieldPageWrapper"),
);
const SettingsInventoryAdjustmentsWrapper = lazy(() =>
  import("../pages/settings/SettingsInventoryAdjustmentsWrapper"),
);
const NewInventoryAdjustmentsCustomFieldPageWrapper = lazy(() =>
  import("../pages/settings/NewInventoryAdjustmentsCustomFieldPageWrapper"),
);
const SettingsOnlinePaymentsWrapper = lazy(() => import("../pages/settings/SettingsOnlinePaymentsWrapper"));
const SettingsQuotesWrapper = lazy(() => import("../pages/settings/SettingsQuotesWrapper"));
const SettingsRetainerInvoicesWrapper = lazy(() =>
  import("../pages/settings/SettingsRetainerInvoicesWrapper"),
);
const SettingsSalesOrdersWrapper = lazy(() =>
  import("../pages/settings/SettingsSalesOrdersWrapper"),
);
const NewQuotesCustomFieldPageWrapper = lazy(() =>
  import("../pages/settings/NewQuotesCustomFieldPageWrapper"),
);
const NewQuotesRelatedListPageWrapper = lazy(() =>
  import("../pages/settings/NewQuotesRelatedListPageWrapper"),
);
const NewCustomApprovalPageWrapper = lazy(() =>
  import("../pages/settings/NewCustomApprovalPageWrapper"),
);
const SettingsInvoicesWrapper = lazy(() => import("../pages/settings/SettingsInvoicesWrapper"));
const SettingsRecurringInvoicesWrapper = lazy(() =>
  import("../pages/settings/SettingsRecurringInvoicesWrapper"),
);
const SettingsSalesReceiptsWrapper = lazy(() =>
  import("../pages/settings/SettingsSalesReceiptsWrapper"),
);
const SettingsPaymentsReceivedWrapper = lazy(() =>
  import("../pages/settings/SettingsPaymentsReceivedWrapper"),
);
const SettingsCreditNotesWrapper = lazy(() => import("../pages/settings/SettingsCreditNotesWrapper"));
const NewCreditNotesRelatedListPageWrapper = lazy(() =>
  import("../pages/settings/NewCreditNotesRelatedListPageWrapper"),
);
const SettingsDeliveryNotesWrapper = lazy(() =>
  import("../pages/settings/SettingsDeliveryNotesWrapper"),
);
const NewDeliveryNotesRelatedListPageWrapper = lazy(() =>
  import("../pages/settings/NewDeliveryNotesRelatedListPageWrapper"),
);
const SettingsPackingSlipsWrapper = lazy(() =>
  import("../pages/settings/SettingsPackingSlipsWrapper"),
);
const NewPackingSlipsRelatedListPageWrapper = lazy(() =>
  import("../pages/settings/NewPackingSlipsRelatedListPageWrapper"),
);
const SettingsExpensesWrapper = lazy(() => import("../pages/settings/SettingsExpensesWrapper"));
const NewExpensesRelatedListPageWrapper = lazy(() =>
  import("../pages/settings/NewExpensesRelatedListPageWrapper"),
);
const SettingsPurchaseOrdersWrapper = lazy(() =>
  import("../pages/settings/SettingsPurchaseOrdersWrapper"),
);
const NewPurchaseOrdersRelatedListPageWrapper = lazy(() =>
  import("../pages/settings/NewPurchaseOrdersRelatedListPageWrapper"),
);
const SettingsBillsWrapper = lazy(() => import("../pages/settings/SettingsBillsWrapper"));
const NewBillsRelatedListPageWrapper = lazy(() =>
  import("../pages/settings/NewBillsRelatedListPageWrapper"),
);
const SettingsRecurringBillsWrapper = lazy(() =>
  import("../pages/settings/SettingsRecurringBillsWrapper"),
);
const SettingsPaymentsMadeWrapper = lazy(() =>
  import("../pages/settings/SettingsPaymentsMadeWrapper"),
);
const SettingsVendorCreditsWrapper = lazy(() =>
  import("../pages/settings/SettingsVendorCreditsWrapper"),
);
const NewVendorCreditsRelatedListPageWrapper = lazy(() =>
  import("../pages/settings/NewVendorCreditsRelatedListPageWrapper"),
);
const SettingsCustomModulesWrapper = lazy(() =>
  import("../pages/settings/SettingsCustomModulesWrapper"),
);

function RouteLoadingState() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
      Loading page...
    </div>
  );
}

function RootRouteResolver() {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
        Loading permissions...
      </div>
    );
  }

  if (hasPermission("dashboard", undefined, "view")) {
    return <HomeDashboard />;
  }

  if (hasPermission("timesheets", "projects", "view")) {
    return <Navigate to="/time-tracking/timesheet" replace />;
  }

  if (
    hasPermission("contacts", "customers", "view") ||
    hasPermission("sales", "invoices", "view")
  ) {
    return <Navigate to="/sales/customers" replace />;
  }

  if (
    hasPermission("contacts", "vendors", "view") ||
    hasPermission("purchases", "bills", "view")
  ) {
    return <Navigate to="/purchases/vendors" replace />;
  }

  if (hasPermission("items", "item", "view")) {
    return <Navigate to="/items" replace />;
  }

  if (hasPermission("banking", "banking", "view")) {
    return <Navigate to="/banking" replace />;
  }

  if (hasPermission("documents", undefined, "view")) {
    return <Navigate to="/documents" replace />;
  }

  return (
    <PermissionRoute
      anyOf={[{ module: "dashboard", action: "view" }]}
      deniedTitle="No module access"
      deniedMessage="Your role does not include access to any module. Contact your admin."
    >
      <HomeDashboard />
    </PermissionRoute>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<OrganizationProfile />} />
        <Route path="/loading" element={<LoadingPage />} />
        <Route path="/verify-identity" element={<VerifyIdentity />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<RootRouteResolver />} />
            <Route path="/getting-started" element={<GettingStartedPage />} />
            <Route path="/recent-updates" element={<RecentUpdatesPage />} />


            <Route path="/items/new-custom-view" element={<PermissionRoute anyOf={[{ module: "items", subModule: "item", action: "create" }]}><NewCustomView /></PermissionRoute>} />
            <Route path="/items/import" element={<PermissionRoute anyOf={[{ module: "items", subModule: "item", action: "create" }]}><ImportItems /></PermissionRoute>} />
            <Route path="/items/*" element={<PermissionRoute anyOf={[{ module: "items", subModule: "item", action: "view" }]}><ItemsPage /></PermissionRoute>} />

            <Route path="/inventory/new" element={<PermissionRoute anyOf={[{ module: "items", subModule: "inventoryAdjustments", action: "create" }]}><NewAdjustmentForm /></PermissionRoute>} />
            <Route path="/inventory/edit/:id" element={<PermissionRoute anyOf={[{ module: "items", subModule: "inventoryAdjustments", action: "edit" }]}><NewAdjustmentForm /></PermissionRoute>} />
            <Route path="/inventory/new-custom-view" element={<PermissionRoute anyOf={[{ module: "items", subModule: "inventoryAdjustments", action: "view" }]}><InventoryNewCustomView /></PermissionRoute>} />
            <Route path="/inventory/import/quantity" element={<PermissionRoute anyOf={[{ module: "items", subModule: "inventoryAdjustments", action: "create" }]}><ImportQuantityAdjustments /></PermissionRoute>} />
            <Route path="/inventory/import/quantity/map-fields" element={<PermissionRoute anyOf={[{ module: "items", subModule: "inventoryAdjustments", action: "create" }]}><ImportQuantityMapFields /></PermissionRoute>} />
            <Route path="/inventory/import/quantity/preview" element={<PermissionRoute anyOf={[{ module: "items", subModule: "inventoryAdjustments", action: "create" }]}><ImportQuantityPreview /></PermissionRoute>} />
            <Route path="/inventory/import/value" element={<PermissionRoute anyOf={[{ module: "items", subModule: "inventoryAdjustments", action: "create" }]}><ImportValueAdjustments /></PermissionRoute>} />
            <Route path="/inventory/import/value/map-fields" element={<PermissionRoute anyOf={[{ module: "items", subModule: "inventoryAdjustments", action: "create" }]}><ImportValueMapFields /></PermissionRoute>} />
            <Route path="/inventory/import/value/preview" element={<PermissionRoute anyOf={[{ module: "items", subModule: "inventoryAdjustments", action: "create" }]}><ImportValuePreview /></PermissionRoute>} />
            <Route path="/inventory/*" element={<PermissionRoute anyOf={[{ module: "items", subModule: "inventoryAdjustments", action: "view" }]}><InventoryPage /></PermissionRoute>} />

            <Route path="/sales/*" element={<PermissionRoute anyOf={[{ module: "contacts", subModule: "customers", action: "view" }, { module: "sales", subModule: "invoices", action: "view" }, { module: "sales", subModule: "customerPayments", action: "view" }, { module: "sales", subModule: "quotes", action: "view" }, { module: "sales", subModule: "salesReceipt", action: "view" }, { module: "sales", subModule: "salesOrders", action: "view" }, { module: "sales", subModule: "creditNotes", action: "view" }]}><SalesPage /></PermissionRoute>} />
            <Route path="/sales/accounts-receivable" element={<PermissionRoute anyOf={[{ module: "sales", subModule: "invoices", action: "view" }]}><AccountsReceivableDashboard /></PermissionRoute>} />
            <Route path="/sales/accounts-receivable/ledger" element={<PermissionRoute anyOf={[{ module: "sales", subModule: "invoices", action: "view" }]}><AccountsReceivableLedger /></PermissionRoute>} />

            {/* Backward compatibility: older links used /payments/payments-received/... */}
            <Route path="/payments/payments-received/*" element={<LegacyPaymentsReceivedRedirect />} />
            <Route path="/purchases/*" element={<PermissionRoute anyOf={[{ module: "contacts", subModule: "vendors", action: "view" }, { module: "purchases", subModule: "bills", action: "view" }, { module: "purchases", subModule: "vendorPayments", action: "view" }, { module: "purchases", subModule: "expenses", action: "view" }, { module: "purchases", subModule: "purchaseOrders", action: "view" }, { module: "purchases", subModule: "vendorCredits", action: "view" }]}><PurchasesPage /></PermissionRoute>} />
            <Route path="/time-tracking/projects-guide" element={<PermissionRoute anyOf={[{ module: "timesheets", subModule: "projects", action: "view" }]}><ProjectsGuidePage /></PermissionRoute>} />
            <Route path="/time-tracking/*" element={<PermissionRoute anyOf={[{ module: "timesheets", subModule: "projects", action: "view" }]}><TimeTrackingPage /></PermissionRoute>} />

            <Route path="/banking" element={<PermissionRoute anyOf={[{ module: "banking", subModule: "banking", action: "view" }]}><BankingPage /></PermissionRoute>} />
            <Route path="/banking/add-account" element={<PermissionRoute anyOf={[{ module: "banking", subModule: "banking", action: "create" }]}><AddBankAccount /></PermissionRoute>} />
            <Route path="/banking/account/:id" element={<PermissionRoute anyOf={[{ module: "banking", subModule: "banking", action: "view" }]}><AccountDetail /></PermissionRoute>} />
            <Route path="/banking/account/:id/import" element={<PermissionRoute anyOf={[{ module: "banking", subModule: "banking", action: "create" }]}><ImportStatement /></PermissionRoute>} />
            <Route path="/banking/add-account/form" element={<PermissionRoute anyOf={[{ module: "banking", subModule: "banking", action: "create" }]}><AddBankForm /></PermissionRoute>} />
            <Route path="/banking/account/:id/reconciliations" element={<PermissionRoute anyOf={[{ module: "banking", subModule: "banking", action: "view" }]}><Reconciliations /></PermissionRoute>} />
            <Route path="/banking/account/:id/reconcile/start" element={<PermissionRoute anyOf={[{ module: "banking", subModule: "banking", action: "edit" }]}><StartReconciliation /></PermissionRoute>} />

            <Route path="/accountant/*" element={<PermissionRoute anyOf={[{ module: "accountant", subModule: "chartOfAccounts", action: "view" }, { module: "accountant", subModule: "journals", action: "view" }, { module: "accountant", subModule: "budget", action: "view" }]}><AccountantPage /></PermissionRoute>} />
            <Route path="/reports/*" element={<PermissionRoute anyOf={[{ module: "reports", action: "view" }]}><ReportsPage /></PermissionRoute>} />
            <Route path="/organizations/manage" element={<OrganizationsManagePage />} />

            <Route path="*" element={<RootRouteResolver />} />
          </Route>
        </Route>

        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <PermissionRoute anyOf={[{ module: "documents", action: "view" }]}>
                <DocumentsPage />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <PermissionRoute
                anyOf={[{ module: "settings", action: "view" }]}
                deniedTitle="Settings access required"
                deniedMessage="Your role does not include settings access."
              />
            </ProtectedRoute>
          }
        >
          <Route path="/settings" element={<AllSettings />} />
          <Route path="/settings/profile" element={<SettingsProfileWrapper />} />
          <Route path="/settings/branding" element={<SettingsBrandingWrapper />} />
          <Route path="/settings/custom-domain" element={<SettingsCustomDomainWrapper />} />
          <Route path="/settings/locations/*" element={<SettingsLocationsWrapper />} />
          <Route path="/settings/subscription" element={<SettingsSubscriptionWrapper />} />
          <Route path="/settings/users" element={<SettingsUsersWrapper />} />
          <Route path="/settings/roles" element={<SettingsRolesWrapper />} />
          <Route path="/settings/roles/new" element={<NewRolePageWrapper />} />
          <Route path="/settings/roles/edit/:id" element={<NewRolePageWrapper />} />
          <Route path="/settings/user-preferences" element={<SettingsUserPreferencesWrapper />} />
          <Route path="/settings/user-preferences/new-field" element={<NewCustomFieldPageWrapper />} />
          <Route path="/settings/taxes/*" element={<SettingsTaxesWrapper />} />
          <Route path="/settings/vat" element={<SettingsVATWrapper />} />
          <Route path="/settings/general" element={<SettingsGeneralWrapper />} />
          <Route path="/settings/currencies/*" element={<SettingsCurrenciesWrapper />} />
          <Route path="/settings/opening-balances/*" element={<SettingsOpeningBalancesWrapper />} />
          <Route path="/settings/reminders" element={<SettingsRemindersWrapper />} />
          <Route path="/settings/customer-portal" element={<SettingsCustomerPortalWrapper />} />
          <Route path="/settings/vendor-portal" element={<SettingsVendorPortalWrapper />} />
          <Route path="/settings/customization/transaction-number-series" element={<SettingsCustomizationWrapper />} />
          <Route path="/settings/customization/pdf-templates/edit" element={<SettingsCustomizationWrapper />} />
          <Route path="/settings/customization/pdf-templates" element={<SettingsCustomizationWrapper />} />
          <Route path="/settings/customization/email-notifications/new-server" element={<SettingsCustomizationWrapper />} />
          <Route path="/settings/customization/email-notifications" element={<SettingsCustomizationWrapper />} />
          <Route path="/settings/customization/reporting-tags/new" element={<SettingsCustomizationWrapper />} />
          <Route path="/settings/customization/reporting-tags/:id" element={<SettingsCustomizationWrapper />} />
          <Route path="/settings/customization/reporting-tags" element={<SettingsCustomizationWrapper />} />
          <Route path="/settings/customization/web-tabs" element={<SettingsCustomizationWrapper />} />
          <Route path="/settings/workflow-rules" element={<SettingsWorkflowRulesWrapper />} />
          <Route path="/settings/workflow-actions" element={<SettingsWorkflowActionsWrapper />} />
          <Route path="/settings/workflow-logs" element={<SettingsWorkflowLogsWrapper />} />
          <Route path="/settings/schedules" element={<SettingsSchedulesWrapper />} />
          <Route path="/settings/customers-vendors" element={<SettingsCustomersVendorsWrapper />} />
          <Route path="/settings/customers-vendors/new-field" element={<NewCustomersVendorsCustomFieldPageWrapper />} />
          <Route path="/settings/items" element={<SettingsItemsWrapper />} />
          <Route path="/settings/items/new-field" element={<NewItemsCustomFieldPageWrapper />} />
          <Route path="/settings/accountant" element={<SettingsAccountantWrapper />} />
          <Route path="/settings/accountant/journal/new-field" element={<NewAccountantCustomFieldPageWrapper />} />
          <Route path="/settings/accountant/chart/new-field" element={<NewAccountantCustomFieldPageWrapper />} />
          <Route path="/settings/tasks" element={<SettingsTasksWrapper />} />
          <Route path="/settings/projects" element={<SettingsProjectsWrapper />} />
          <Route path="/settings/projects/new-field" element={<NewProjectsCustomFieldPageWrapper />} />
          <Route path="/settings/projects/new-related-list" element={<NewProjectsRelatedListPageWrapper />} />
          <Route path="/settings/timesheet" element={<SettingsTimesheetWrapper />} />
          <Route path="/settings/timesheet/new-field" element={<NewTimesheetCustomFieldPageWrapper />} />
          <Route path="/settings/inventory-adjustments" element={<SettingsInventoryAdjustmentsWrapper />} />
          <Route path="/settings/inventory-adjustments/new-field" element={<NewInventoryAdjustmentsCustomFieldPageWrapper />} />
          <Route path="/settings/online-payments" element={<SettingsOnlinePaymentsWrapper />} />
          <Route path="/settings/quotes" element={<SettingsQuotesWrapper />} />
          <Route path="/settings/retainer-invoices" element={<SettingsRetainerInvoicesWrapper />} />
          <Route path="/settings/sales-orders" element={<SettingsSalesOrdersWrapper />} />
          <Route path="/settings/quotes/new-field" element={<NewQuotesCustomFieldPageWrapper />} />
          <Route path="/settings/quotes/new-related-list" element={<NewQuotesRelatedListPageWrapper />} />
          <Route path="/settings/quotes/new-custom-approval" element={<NewCustomApprovalPageWrapper />} />
          <Route path="/settings/invoices" element={<SettingsInvoicesWrapper />} />
          <Route path="/settings/invoices/new-field" element={<NewQuotesCustomFieldPageWrapper />} />
          <Route path="/settings/recurring-invoices" element={<SettingsRecurringInvoicesWrapper />} />
          <Route path="/settings/recurring-invoices/new-field" element={<NewQuotesCustomFieldPageWrapper />} />
          <Route path="/settings/sales-receipts" element={<SettingsSalesReceiptsWrapper />} />
          <Route path="/settings/sales-receipts/new-field" element={<NewQuotesCustomFieldPageWrapper />} />
          <Route path="/settings/payments-received" element={<SettingsPaymentsReceivedWrapper />} />
          <Route path="/settings/payments-received/new-field" element={<NewQuotesCustomFieldPageWrapper />} />
          <Route path="/settings/credit-notes" element={<SettingsCreditNotesWrapper />} />
          <Route path="/settings/credit-notes/new-field" element={<NewQuotesCustomFieldPageWrapper />} />
          <Route path="/settings/credit-notes/new-related-list" element={<NewCreditNotesRelatedListPageWrapper />} />
          <Route path="/settings/delivery-notes" element={<SettingsDeliveryNotesWrapper />} />
          <Route path="/settings/delivery-notes/new-field" element={<NewQuotesCustomFieldPageWrapper />} />
          <Route path="/settings/delivery-notes/new-related-list" element={<NewDeliveryNotesRelatedListPageWrapper />} />
          <Route path="/settings/packing-slips" element={<SettingsPackingSlipsWrapper />} />
          <Route path="/settings/packing-slips/new-field" element={<NewQuotesCustomFieldPageWrapper />} />
          <Route path="/settings/packing-slips/new-related-list" element={<NewPackingSlipsRelatedListPageWrapper />} />
          <Route path="/settings/expenses" element={<SettingsExpensesWrapper />} />
          <Route path="/settings/expenses/new-field" element={<NewQuotesCustomFieldPageWrapper />} />
          <Route path="/settings/expenses/new-related-list" element={<NewExpensesRelatedListPageWrapper />} />
          <Route path="/settings/purchase-orders" element={<SettingsPurchaseOrdersWrapper />} />
          <Route path="/settings/purchase-orders/new-field" element={<NewQuotesCustomFieldPageWrapper />} />
          <Route path="/settings/purchase-orders/new-related-list" element={<NewPurchaseOrdersRelatedListPageWrapper />} />
          <Route path="/settings/bills" element={<SettingsBillsWrapper />} />
          <Route path="/settings/bills/new-field" element={<NewQuotesCustomFieldPageWrapper />} />
          <Route path="/settings/bills/new-related-list" element={<NewBillsRelatedListPageWrapper />} />
          <Route path="/settings/recurring-bills" element={<SettingsRecurringBillsWrapper />} />
          <Route path="/settings/payments-made" element={<SettingsPaymentsMadeWrapper />} />
          <Route path="/settings/payments-made/new-field" element={<NewQuotesCustomFieldPageWrapper />} />
          <Route path="/settings/vendor-credits" element={<SettingsVendorCreditsWrapper />} />
          <Route path="/settings/vendor-credits/new-field" element={<NewQuotesCustomFieldPageWrapper />} />
          <Route path="/settings/vendor-credits/new-related-list" element={<NewVendorCreditsRelatedListPageWrapper />} />
          <Route path="/settings/custom-modules" element={<SettingsCustomModulesWrapper />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
