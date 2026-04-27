import React, { Suspense, lazy } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";
import AccessDenied from "../../components/AccessDenied";

import Vendor from "./vendor/Vendor";
import VendorDetail from "./vendor/VendorDetail";
const NewVendor = lazy(() => import("./vendor/NewVendor"));
const NewVendorCustomView = lazy(() => import("./vendor/NewVendorCustomView"));
const NewExpenseCustomView = lazy(() => import("./expenses/NewExpenseCustomView"));
const ImportVendors = lazy(() => import("./vendor/ImportVendors"));
const ImportExpenses = lazy(() => import("./expenses/ImportExpenses"));
const Expenses = lazy(() => import("./expenses/Expenses"));
const ExpenseDetail = lazy(() => import("./expenses/ExpenseDetail"));
const RecordExpense = lazy(() => import("./expenses/RecordExpense"));
const RecurringExpenses = lazy(() => import("./expenses/RecurringExpenses"));
const NewRecurringExpense = lazy(() => import("./expenses/NewRecurringExpense"));
const RecurringExpenseDetail = lazy(() => import("./expenses/RecurringExpenseDetail"));
const ImportRecurringExpenses = lazy(() => import("./expenses/ImportRecurringExpenses"));
const Bills = lazy(() => import("./bills/Bills"));
const NewBill = lazy(() => import("./bills/NewBill"));
const BillDetail = lazy(() => import("./bills/BillDetail"));
const RecurringBills = lazy(() => import("./bills/RecurringBills"));
const NewRecurringBill = lazy(() => import("./bills/NewRecurringBill"));
const RecurringBillDetail = lazy(() => import("./bills/RecurringBillDetail"));
const ImportBills = lazy(() => import("./bills/ImportBills"));
const ImportRecurringBills = lazy(() => import("./bills/ImportRecurringBills"));
const PurchaseOrders = lazy(() => import("./purchase-orders/PurchaseOrders"));
const NewPurchaseOrder = lazy(() => import("./purchase-orders/NewPurchaseOrder"));
const PurchaseOrderDetail = lazy(() => import("./purchase-orders/PurchaseOrderDetail"));
const PurchaseOrderEmailView = lazy(() => import("./purchase-orders/PurchaseOrderEmailView"));
const ImportPurchaseOrders = lazy(() => import("./purchase-orders/ImportPurchaseOrders"));
const PaymentsMade = lazy(() => import("./payments/PaymentsMade"));
const RecordPayment = lazy(() => import("./payments/RecordPayment"));
const PaymentDetail = lazy(() => import("./payments/PaymentDetail"));
const PaymentEmailView = lazy(() => import("./payments/PaymentEmailView"));
const ImportPayments = lazy(() => import("./payments/ImportPayments"));
const ImportAppliedExcessPayments = lazy(() => import("./payments/ImportAppliedExcessPayments"));
const VendorCredits = lazy(() => import("./vendor-credits/VendorCredits"));
const NewVendorCredit = lazy(() => import("./vendor-credits/NewVendorCredit"));
const VendorCreditDetail = lazy(() => import("./vendor-credits/VendorCreditDetail"));
const ImportAppliedVendorCredits = lazy(() => import("./vendor-credits/ImportAppliedVendorCredits"));
const ImportRefunds = lazy(() => import("./vendor-credits/ImportRefunds"));
const ImportVendorCredits = lazy(() => import("./vendor-credits/ImportVendorCredits"));
const ReceiptsInbox = lazy(() => import("./receipts/ReceiptsInbox"));
const UploadedDocuments = lazy(() => import("./documents/UploadedDocuments"));

function SendEmailStatement() {
  return (
    <div className="card">
      <h2 className="card-title">Send statement</h2>
      <p className="card-body-text">This statement screen is not available in the current build.</p>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="card">
      <h2 className="card-title">{title}</h2>
      <p className="card-body-text">Design this page later with full purchase details.</p>
    </div>
  );
}

type PermissionRule = { module: string; subModule?: string; action?: string };

const purchasesPathPermissionRules: Array<{ match: (pathname: string) => boolean; anyOf: PermissionRule[] }> = [
  {
    match: (p) => /\/purchases\/vendors\/new|\/purchases\/vendors\/import|\/purchases\/vendors\/custom-view\/new/.test(p),
    anyOf: [{ module: "contacts", subModule: "vendors", action: "create" }],
  },
  {
    match: (p) => /\/purchases\/vendors\/[^/]+\/edit/.test(p),
    anyOf: [{ module: "contacts", subModule: "vendors", action: "edit" }],
  },
  {
    match: (p) => /\/purchases\/expenses\/new|\/purchases\/expenses\/import|\/purchases\/expenses\/custom-view\/new/.test(p),
    anyOf: [{ module: "purchases", subModule: "expenses", action: "create" }],
  },
  {
    match: (p) => /\/purchases\/recurring-expenses\/new|\/purchases\/recurring-expenses\/import/.test(p),
    anyOf: [{ module: "purchases", subModule: "expenses", action: "create" }],
  },
  {
    match: (p) => /\/purchases\/purchase-orders\/new|\/purchases\/purchase-orders\/import/.test(p),
    anyOf: [{ module: "purchases", subModule: "purchaseOrders", action: "create" }],
  },
  {
    match: (p) => /\/purchases\/purchase-orders\/[^/]+\/edit/.test(p),
    anyOf: [{ module: "purchases", subModule: "purchaseOrders", action: "edit" }],
  },
  {
    match: (p) => /\/purchases\/bills\/new|\/purchases\/bills\/import/.test(p),
    anyOf: [{ module: "purchases", subModule: "bills", action: "create" }],
  },
  {
    match: (p) => /\/purchases\/bills\/[^/]+\/edit/.test(p),
    anyOf: [{ module: "purchases", subModule: "bills", action: "edit" }],
  },
  {
    match: (p) => /\/purchases\/recurring-bills\/new|\/purchases\/recurring-bills\/import/.test(p),
    anyOf: [{ module: "purchases", subModule: "bills", action: "create" }],
  },
  {
    match: (p) => /\/purchases\/recurring-bills\/[^/]+\/edit/.test(p),
    anyOf: [{ module: "purchases", subModule: "bills", action: "edit" }],
  },
  {
    match: (p) => /\/purchases\/payments-made\/new|\/purchases\/payments-made\/import/.test(p),
    anyOf: [{ module: "purchases", subModule: "vendorPayments", action: "create" }],
  },
  {
    match: (p) => /\/purchases\/payments-made\/[^/]+\/edit/.test(p),
    anyOf: [{ module: "purchases", subModule: "vendorPayments", action: "edit" }],
  },
  {
    match: (p) => /\/purchases\/vendor-credits\/new|\/purchases\/vendor-credits\/import/.test(p),
    anyOf: [{ module: "purchases", subModule: "vendorCredits", action: "create" }],
  },
  {
    match: (p) => /\/purchases\/vendor-credits\/[^/]+\/edit/.test(p),
    anyOf: [{ module: "purchases", subModule: "vendorCredits", action: "edit" }],
  },
  { match: (p) => p.startsWith("/purchases/vendors"), anyOf: [{ module: "contacts", subModule: "vendors", action: "view" }] },
  { match: (p) => p.startsWith("/purchases/expenses"), anyOf: [{ module: "purchases", subModule: "expenses", action: "view" }] },
  { match: (p) => p.startsWith("/purchases/recurring-expenses"), anyOf: [{ module: "purchases", subModule: "expenses", action: "view" }] },
  { match: (p) => p.startsWith("/purchases/purchase-orders"), anyOf: [{ module: "purchases", subModule: "purchaseOrders", action: "view" }] },
  { match: (p) => p.startsWith("/purchases/bills"), anyOf: [{ module: "purchases", subModule: "bills", action: "view" }] },
  { match: (p) => p.startsWith("/purchases/recurring-bills"), anyOf: [{ module: "purchases", subModule: "bills", action: "view" }] },
  { match: (p) => p.startsWith("/purchases/payments-made"), anyOf: [{ module: "purchases", subModule: "vendorPayments", action: "view" }] },
  { match: (p) => p.startsWith("/purchases/vendor-credits"), anyOf: [{ module: "purchases", subModule: "vendorCredits", action: "view" }] },
  { match: (p) => p.startsWith("/purchases/debit-notes"), anyOf: [{ module: "purchases", subModule: "bills", action: "view" }] },
  { match: (p) => p.startsWith("/purchases/self-billed-invoices"), anyOf: [{ module: "purchases", subModule: "bills", action: "view" }] },
  { match: (p) => p.startsWith("/purchases/receipts-inbox"), anyOf: [{ module: "documents", action: "view" }] },
  { match: (p) => p.startsWith("/purchases/uploaded-documents"), anyOf: [{ module: "documents", action: "view" }] },
];

export default function PurchasesPage() {
  const location = useLocation();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const isAllowedForRoute = (pathname: string): boolean => {
    if (pathname === "/purchases" || pathname === "/purchases/") return true;
    const matchedRule = purchasesPathPermissionRules.find((rule) => rule.match(pathname));
    if (!matchedRule) return true;
    return matchedRule.anyOf.some((rule) => hasPermission(rule.module, rule.subModule, rule.action || "view"));
  };

  if (permissionsLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
        Loading permissions...
      </div>
    );
  }

  if (!isAllowedForRoute(location.pathname)) {
    return (
      <AccessDenied
        title="Purchases access required"
        message="Your role does not include permission for this Purchases section."
      />
    );
  }

  const isVendorPage = location.pathname.includes('/vendors') &&
    !location.pathname.includes('/vendors/new') &&
    !location.pathname.includes('/vendors/custom-view') &&
    !location.pathname.includes('/vendors/import') &&
    location.pathname !== '/purchases/vendors/new';
  const isRecurringBillsPage = location.pathname.includes('/recurring-bills') &&
    !location.pathname.includes('/recurring-bills/new');
  const isRecurringExpensesPage = location.pathname.includes('/recurring-expenses');
  const isPaymentsMadePage = location.pathname.includes('/payments-made');
  const isVendorCreditsPage = location.pathname.includes('/vendor-credits');
  const isExpenseDetailPage = location.pathname.includes('/expenses/') &&
    !location.pathname.includes('/expenses/new');

  const routeLoadingFallback = (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
      Loading purchases...
    </div>
  );

  return (
    <div className={isVendorPage || isRecurringBillsPage || isRecurringExpensesPage || isPaymentsMadePage || isVendorCreditsPage || isExpenseDetailPage ? "page page-vendor" : "page"}>
      <Suspense fallback={routeLoadingFallback}>
      <Routes>
        <Route path="vendors" element={<Vendor />} />
        <Route path="vendors/new" element={<NewVendor />} />
        <Route path="vendors/custom-view/new" element={<NewVendorCustomView />} />
        <Route path="vendors/:id" element={<VendorDetail />} />
        <Route path="vendors/:id/edit" element={<NewVendor />} />
        <Route path="vendors/:id/send-email-statement" element={<SendEmailStatement />} />
        <Route path="vendors/import" element={<ImportVendors />} />
        <Route path="receipts-inbox" element={<ReceiptsInbox />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="expenses/import" element={<ImportExpenses />} />
        <Route path="expenses/new" element={<RecordExpense />} />
        <Route path="expenses/custom-view/new" element={<NewExpenseCustomView />} />
        <Route path="expenses/:id" element={<ExpenseDetail />} />
        <Route path="recurring-expenses" element={<RecurringExpenses />} />
        <Route path="recurring-expenses/new" element={<NewRecurringExpense />} />
        <Route path="recurring-expenses/import" element={<ImportRecurringExpenses />} />
        <Route path="recurring-expenses/:id" element={<RecurringExpenseDetail />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="purchase-orders/new" element={<NewPurchaseOrder />} />
        <Route path="purchase-orders/:id/edit" element={<NewPurchaseOrder />} />
        <Route path="purchase-orders/import" element={<ImportPurchaseOrders />} />
        <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
        <Route path="purchase-orders/:id/email" element={<PurchaseOrderEmailView />} />
        <Route path="bills" element={<Bills />} />
        <Route path="bills/new" element={<NewBill />} />
        <Route path="bills/import" element={<ImportBills />} />
        <Route path="bills/:id" element={<BillDetail />} />
        <Route path="uploaded-documents" element={<UploadedDocuments />} />
        <Route path="recurring-bills" element={<RecurringBills />} />
        <Route path="recurring-bills/new" element={<NewRecurringBill />} />
        <Route path="recurring-bills/import" element={<ImportRecurringBills />} />
        <Route path="recurring-bills/:id" element={<RecurringBillDetail />} />
        <Route path="payments-made" element={<PaymentsMade />} />
        <Route path="payments-made/new" element={<RecordPayment />} />
        <Route path="payments-made/:id" element={<PaymentDetail />} />
        <Route path="payments-made/:id/email" element={<PaymentEmailView />} />
        <Route path="payments-made/import" element={<ImportPayments />} />
        <Route path="payments-made/import/excess" element={<ImportAppliedExcessPayments />} />
        <Route path="vendor-credits" element={<VendorCredits />} />
        <Route path="vendor-credits/new" element={<NewVendorCredit />} />
        <Route path="vendor-credits/:id/edit" element={<NewVendorCredit />} />
        <Route path="vendor-credits/:id" element={<VendorCreditDetail />} />
        <Route path="vendor-credits/import/applied" element={<ImportAppliedVendorCredits />} />
        <Route path="vendor-credits/import/refunds" element={<ImportRefunds />} />
        <Route path="vendor-credits/import" element={<ImportVendorCredits />} />
        <Route path="debit-notes" element={<Placeholder title="Debit Notes" />} />
        <Route path="self-billed-invoices" element={<Placeholder title="Self Billed Invoices" />} />
        <Route
          path="*"
          element={
            location.pathname === "/purchases" || location.pathname === "/purchases/"
              ? <PurchaseOrders />
              : <Placeholder title="Purchases" />
          }
        />
      </Routes>
      </Suspense>
    </div>
  );
}
