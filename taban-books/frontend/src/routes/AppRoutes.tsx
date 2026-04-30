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

// Settings & Layout
const SettingsLayout = lazy(() => import("../pages/settings/SettingsLayout"));
const AllSettings = lazy(() => import("../pages/settings/AllSettings"));

// Organization Settings
const SettingsProfilePage = lazy(() => import("../pages/settings/organization-settings/organization/profile/ProfilePage"));
const SettingsBrandingPage = lazy(() => import("../pages/settings/organization-settings/organization/branding/BrandingPage"));
const SettingsCustomDomainPage = lazy(() => import("../pages/settings/organization-settings/organization/custom-domain/CustomDomainPage"));
const SettingsSubscriptionPage = lazy(() => import("../pages/settings/organization-settings/organization/subscription/SubscriptionPage"));
const SettingsLocationsWrapper = lazy(() => import("../pages/settings/SettingsLocationsWrapper"));

// Users & Roles
const SettingsUsersPage = lazy(() => import("../pages/settings/organization-settings/users-roles/users/UsersPage"));
const SettingsRolesPage = lazy(() => import("../pages/settings/organization-settings/users-roles/roles/RolesPage"));
const SettingsNewRolePage = lazy(() => import("../pages/settings/organization-settings/users-roles/roles/new/NewRolePage"));
const SettingsUserPreferencesPage = lazy(() => import("../pages/settings/organization-settings/users-roles/user-preferences/UserPreferencesPage"));
const NewCustomFieldPage = lazy(() => import("../pages/settings/NewCustomFieldPage"));

// Taxes & Compliance
const SettingsTaxesPage = lazy(() => import("../pages/settings/organization-settings/taxes-compliance/TAX/TaxesPage"));
const SettingsVATPage = lazy(() => import("../pages/settings/VATPage"));

// Setup & Configurations
const SettingsGeneralPage = lazy(() => import("../pages/settings/organization-settings/setup-configurations/general/GeneralSettingsPage"));
const SettingsCurrenciesRouter = lazy(() => import("../pages/settings/organization-settings/setup-configurations/currencies/CurrenciesRouter"));
const SettingsOpeningBalancesRouter = lazy(() => import("../pages/settings/organization-settings/setup-configurations/opening-balances/OpeningBalancesRouter"));
const SettingsRemindersPage = lazy(() => import("../pages/settings/organization-settings/setup-configurations/reminders/RemindersPage"));

// Customization
const SettingsCustomerPortalPage = lazy(() => import("../pages/settings/CustomerPortalPage"));
const SettingsVendorPortalPage = lazy(() => import("../pages/settings/VendorPortalPage"));
const SettingsTransactionNumberSeriesPage = lazy(() => import("../pages/settings/TransactionNumberSeriesPage"));
const SettingsTemplateEditorPage = lazy(() => import("../pages/settings/TemplateEditorPage"));
const SettingsPDFTemplatesPage = lazy(() => import("../pages/settings/PDFTemplatesPage"));
const SettingsNewServerPage = lazy(() => import("../pages/settings/NewServerPage"));
const SettingsEmailNotificationsPage = lazy(() => import("../pages/settings/EmailNotificationsPage"));
const SettingsNewReportingTagPage = lazy(() => import("../pages/settings/organization-settings/customization/reporting-tags/NewReportingTagPage"));
const SettingsEditReportingTagPage = lazy(() => import("../pages/settings/organization-settings/customization/reporting-tags/ReportingTagsRouter"));
const SettingsReportingTagsPage = lazy(() => import("../pages/settings/organization-settings/customization/reporting-tags/ReportingTagsPage"));
const SettingsWebTabsPage = lazy(() => import("../pages/settings/WebTabsPage"));

// Automation
const SettingsWorkflowRulesPage = lazy(() => import("../pages/settings/organization-settings/automation/workflow-rules/SettingsWorkflowRulesWrapper"));
const SettingsWorkflowActionsPage = lazy(() => import("../pages/settings/organization-settings/automation/workflow-actions/SettingsWorkflowActionsWrapper"));
const SettingsWorkflowLogsPage = lazy(() => import("../pages/settings/organization-settings/automation/workflow-logs/SettingsWorkflowLogsWrapper"));
const SettingsSchedulesPage = lazy(() => import("../pages/settings/organization-settings/automation/schedules/SettingsSchedulesWrapper"));

// Module Settings - General
const SettingsCustomersVendorsPage = lazy(() => import("../pages/settings/module-settings/customers-vendors/SettingsCustomersVendorsWrapper"));
const SettingsNewCustomersVendorsCustomFieldPage = lazy(() => import("../pages/settings/NewCustomersVendorsCustomFieldPage"));
const SettingsItemsSettingsPage = lazy(() => import("../pages/settings/module-settings/items/SettingsItemsWrapper"));
const SettingsNewItemsCustomFieldPage = lazy(() => import("../pages/settings/NewItemsCustomFieldPage"));
const SettingsAccountantSettingsPage = lazy(() => import("../pages/settings/module-settings/accountant/SettingsAccountantWrapper"));
const SettingsNewAccountantCustomFieldPage = lazy(() => import("../pages/settings/NewAccountantCustomFieldPage"));
const SettingsTasksSettingsPage = lazy(() => import("../pages/settings/SettingsTasksWrapper"));
const SettingsProjectsSettingsPage = lazy(() => import("../pages/settings/module-settings/projects/SettingsProjectsWrapper"));
const SettingsNewProjectsCustomFieldPage = lazy(() => import("../pages/settings/NewProjectsCustomFieldPage"));
const SettingsNewProjectsRelatedListPage = lazy(() => import("../pages/settings/NewProjectsRelatedListPage"));
const SettingsTimesheetSettingsPage = lazy(() => import("../pages/settings/module-settings/timesheet/SettingsTimesheetWrapper"));
const SettingsNewTimesheetCustomFieldPage = lazy(() => import("../pages/settings/NewTimesheetCustomFieldPage"));

// Module Settings - Inventory
const SettingsInventoryAdjustmentsSettingsPage = lazy(() => import("../pages/settings/InventoryAdjustmentsPage"));
const SettingsNewInventoryAdjustmentsCustomFieldPage = lazy(() => import("../pages/settings/NewInventoryAdjustmentsCustomFieldPage"));

// Module Settings - Sales
const SettingsOnlinePaymentsPage = lazy(() => import("../pages/settings/OnlinePaymentsPage"));
const SettingsQuotesSettingsPage = lazy(() => import("../pages/settings/QuotesPage"));
const SettingsRetainerInvoicesSettingsPage = lazy(() => import("../pages/settings/RetainerInvoicesPage"));
const SettingsSalesOrdersSettingsPage = lazy(() => import("../pages/settings/SalesOrdersPage"));
const SettingsNewQuotesCustomFieldPage = lazy(() => import("../pages/settings/NewQuotesCustomFieldPage"));
const SettingsNewQuotesRelatedListPage = lazy(() => import("../pages/settings/NewQuotesRelatedListPage"));
const SettingsNewCustomApprovalPage = lazy(() => import("../pages/settings/NewCustomApprovalPage"));
const SettingsInvoicesSettingsPage = lazy(() => import("../pages/settings/InvoicesPage"));
const SettingsRecurringInvoicesSettingsPage = lazy(() => import("../pages/settings/RecurringInvoicesPage"));
const SettingsSalesReceiptsSettingsPage = lazy(() => import("../pages/settings/SalesReceiptsPage"));
const SettingsPaymentsReceivedSettingsPage = lazy(() => import("../pages/settings/PaymentsReceivedPage"));
const SettingsCreditNotesSettingsPage = lazy(() => import("../pages/settings/CreditNotesPage"));
const SettingsNewCreditNotesRelatedListPage = lazy(() => import("../pages/settings/NewCreditNotesRelatedListPageWrapper"));
const SettingsDeliveryNotesSettingsPage = lazy(() => import("../pages/settings/DeliveryNotesPage"));
const SettingsNewDeliveryNotesRelatedListPage = lazy(() => import("../pages/settings/NewDeliveryNotesRelatedListPageWrapper"));
const SettingsPackingSlipsSettingsPage = lazy(() => import("../pages/settings/PackingSlipsPage"));
const SettingsNewPackingSlipsRelatedListPage = lazy(() => import("../pages/settings/NewPackingSlipsRelatedListPageWrapper"));

// Module Settings - Purchases
const SettingsExpensesSettingsPage = lazy(() => import("../pages/settings/ExpensesPage"));
const SettingsNewExpensesRelatedListPage = lazy(() => import("../pages/settings/NewExpensesRelatedListPageWrapper"));
const SettingsPurchaseOrdersSettingsPage = lazy(() => import("../pages/settings/PurchaseOrdersPage"));
const SettingsNewPurchaseOrdersRelatedListPage = lazy(() => import("../pages/settings/NewPurchaseOrdersRelatedListPageWrapper"));
const SettingsBillsSettingsPage = lazy(() => import("../pages/settings/BillsPage"));
const SettingsNewBillsRelatedListPage = lazy(() => import("../pages/settings/NewBillsRelatedListPageWrapper"));
const SettingsRecurringBillsSettingsPage = lazy(() => import("../pages/settings/RecurringBillsPage"));
const SettingsPaymentsMadeSettingsPage = lazy(() => import("../pages/settings/PaymentsMadePage"));
const SettingsVendorCreditsSettingsPage = lazy(() => import("../pages/settings/VendorCreditsPage"));
const SettingsNewVendorCreditsRelatedListPage = lazy(() => import("../pages/settings/NewVendorCreditsRelatedListPageWrapper"));

// Custom Modules
const SettingsCustomModulesSettingsPage = lazy(() => import("../pages/settings/CustomModulesPage"));


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
          <Route element={<SettingsLayout />}>
            <Route path="/settings" element={<AllSettings />} />
            <Route path="/settings/profile" element={<SettingsProfilePage />} />
            <Route path="/settings/branding" element={<SettingsBrandingPage />} />
            <Route path="/settings/custom-domain" element={<SettingsCustomDomainPage />} />
            <Route path="/settings/locations/*" element={<SettingsLocationsWrapper />} />
            <Route path="/settings/subscription" element={<SettingsSubscriptionPage />} />
            <Route path="/settings/users" element={<SettingsUsersPage />} />
            <Route path="/settings/roles" element={<SettingsRolesPage />} />
            <Route path="/settings/roles/new" element={<SettingsNewRolePage />} />
            <Route path="/settings/roles/edit/:id" element={<SettingsNewRolePage />} />
            <Route path="/settings/user-preferences" element={<SettingsUserPreferencesPage />} />
            <Route path="/settings/user-preferences/new-field" element={<NewCustomFieldPage />} />
            <Route path="/settings/taxes/*" element={<SettingsTaxesPage />} />
            <Route path="/settings/vat" element={<SettingsVATPage />} />
            <Route path="/settings/general" element={<SettingsGeneralPage />} />
            <Route path="/settings/currencies/*" element={<SettingsCurrenciesRouter />} />
            <Route path="/settings/opening-balances/*" element={<SettingsOpeningBalancesRouter />} />
            <Route path="/settings/reminders" element={<SettingsRemindersPage />} />
            <Route path="/settings/customer-portal" element={<SettingsCustomerPortalPage />} />
            <Route path="/settings/vendor-portal" element={<SettingsVendorPortalPage />} />
            <Route path="/settings/customization/transaction-number-series" element={<SettingsTransactionNumberSeriesPage />} />
            <Route path="/settings/customization/pdf-templates/edit" element={<SettingsTemplateEditorPage />} />
            <Route path="/settings/customization/pdf-templates" element={<SettingsPDFTemplatesPage />} />
            <Route path="/settings/customization/email-notifications/new-server" element={<SettingsNewServerPage />} />
            <Route path="/settings/customization/email-notifications" element={<SettingsEmailNotificationsPage />} />
            <Route path="/settings/customization/reporting-tags/new" element={<SettingsNewReportingTagPage />} />
            <Route path="/settings/customization/reporting-tags/:id" element={<SettingsEditReportingTagPage />} />
            <Route path="/settings/customization/reporting-tags" element={<SettingsReportingTagsPage />} />
            <Route path="/settings/customization/web-tabs" element={<SettingsWebTabsPage />} />
            <Route path="/settings/workflow-rules" element={<SettingsWorkflowRulesPage />} />
            <Route path="/settings/workflow-actions" element={<SettingsWorkflowActionsPage />} />
            <Route path="/settings/workflow-logs" element={<SettingsWorkflowLogsPage />} />
            <Route path="/settings/schedules" element={<SettingsSchedulesPage />} />
            <Route path="/settings/customers-vendors" element={<SettingsCustomersVendorsPage />} />
            <Route path="/settings/customers-vendors/new-field" element={<SettingsNewCustomersVendorsCustomFieldPage />} />
            <Route path="/settings/items" element={<SettingsItemsSettingsPage />} />
            <Route path="/settings/items/new-field" element={<SettingsNewItemsCustomFieldPage />} />
            <Route path="/settings/accountant" element={<SettingsAccountantSettingsPage />} />
            <Route path="/settings/accountant/journal/new-field" element={<SettingsNewAccountantCustomFieldPage />} />
            <Route path="/settings/accountant/chart/new-field" element={<SettingsNewAccountantCustomFieldPage />} />
            <Route path="/settings/tasks" element={<SettingsTasksSettingsPage />} />
            <Route path="/settings/projects" element={<SettingsProjectsSettingsPage />} />
            <Route path="/settings/projects/new-field" element={<SettingsNewProjectsCustomFieldPage />} />
            <Route path="/settings/projects/new-related-list" element={<SettingsNewProjectsRelatedListPage />} />
            <Route path="/settings/timesheet" element={<SettingsTimesheetSettingsPage />} />
            <Route path="/settings/timesheet/new-field" element={<SettingsNewTimesheetCustomFieldPage />} />
            <Route path="/settings/inventory-adjustments" element={<SettingsInventoryAdjustmentsSettingsPage />} />
            <Route path="/settings/inventory-adjustments/new-field" element={<SettingsNewInventoryAdjustmentsCustomFieldPage />} />
            <Route path="/settings/online-payments" element={<SettingsOnlinePaymentsPage />} />
            <Route path="/settings/quotes" element={<SettingsQuotesSettingsPage />} />
            <Route path="/settings/retainer-invoices" element={<SettingsRetainerInvoicesSettingsPage />} />
            <Route path="/settings/sales-orders" element={<SettingsSalesOrdersSettingsPage />} />
            <Route path="/settings/quotes/new-field" element={<SettingsNewQuotesCustomFieldPage />} />
            <Route path="/settings/quotes/new-related-list" element={<SettingsNewQuotesRelatedListPage />} />
            <Route path="/settings/quotes/new-custom-approval" element={<SettingsNewCustomApprovalPage />} />
            <Route path="/settings/invoices" element={<SettingsInvoicesSettingsPage />} />
            <Route path="/settings/invoices/new-field" element={<SettingsNewQuotesCustomFieldPage />} />
            <Route path="/settings/recurring-invoices" element={<SettingsRecurringInvoicesSettingsPage />} />
            <Route path="/settings/recurring-invoices/new-field" element={<SettingsNewQuotesCustomFieldPage />} />
            <Route path="/settings/sales-receipts" element={<SettingsSalesReceiptsSettingsPage />} />
            <Route path="/settings/sales-receipts/new-field" element={<SettingsNewQuotesCustomFieldPage />} />
            <Route path="/settings/payments-received" element={<SettingsPaymentsReceivedSettingsPage />} />
            <Route path="/settings/payments-received/new-field" element={<SettingsNewQuotesCustomFieldPage />} />
            <Route path="/settings/credit-notes" element={<SettingsCreditNotesSettingsPage />} />
            <Route path="/settings/credit-notes/new-field" element={<SettingsNewQuotesCustomFieldPage />} />
            <Route path="/settings/credit-notes/new-related-list" element={<SettingsNewCreditNotesRelatedListPage />} />
            <Route path="/settings/delivery-notes" element={<SettingsDeliveryNotesSettingsPage />} />
            <Route path="/settings/delivery-notes/new-field" element={<SettingsNewQuotesCustomFieldPage />} />
            <Route path="/settings/delivery-notes/new-related-list" element={<SettingsNewDeliveryNotesRelatedListPage />} />
            <Route path="/settings/packing-slips" element={<SettingsPackingSlipsSettingsPage />} />
            <Route path="/settings/packing-slips/new-field" element={<SettingsNewQuotesCustomFieldPage />} />
            <Route path="/settings/packing-slips/new-related-list" element={<SettingsNewPackingSlipsRelatedListPage />} />
            <Route path="/settings/expenses" element={<SettingsExpensesSettingsPage />} />
            <Route path="/settings/expenses/new-field" element={<SettingsNewQuotesCustomFieldPage />} />
            <Route path="/settings/expenses/new-related-list" element={<SettingsNewExpensesRelatedListPage />} />
            <Route path="/settings/purchase-orders" element={<SettingsPurchaseOrdersSettingsPage />} />
            <Route path="/settings/purchase-orders/new-field" element={<SettingsNewQuotesCustomFieldPage />} />
            <Route path="/settings/purchase-orders/new-related-list" element={<SettingsNewPurchaseOrdersRelatedListPage />} />
            <Route path="/settings/bills" element={<SettingsBillsSettingsPage />} />
            <Route path="/settings/bills/new-field" element={<SettingsNewQuotesCustomFieldPage />} />
            <Route path="/settings/bills/new-related-list" element={<SettingsNewBillsRelatedListPage />} />
            <Route path="/settings/recurring-bills" element={<SettingsRecurringBillsSettingsPage />} />
            <Route path="/settings/payments-made" element={<SettingsPaymentsMadeSettingsPage />} />
            <Route path="/settings/payments-made/new-field" element={<SettingsNewQuotesCustomFieldPage />} />
            <Route path="/settings/vendor-credits" element={<SettingsVendorCreditsSettingsPage />} />
            <Route path="/settings/vendor-credits/new-field" element={<SettingsNewQuotesCustomFieldPage />} />
            <Route path="/settings/vendor-credits/new-related-list" element={<SettingsNewVendorCreditsRelatedListPage />} />
            <Route path="/settings/custom-modules" element={<SettingsCustomModulesSettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
