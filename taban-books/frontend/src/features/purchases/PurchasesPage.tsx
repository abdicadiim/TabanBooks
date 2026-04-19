import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";
import AccessDenied from "../../components/AccessDenied";
import Vendor from "./vendor/Vendor";
import NewVendor from "./vendor/NewVendor";
import VendorDetail from "./vendor/VendorDetail";
import NewVendorCustomView from "./vendor/NewVendorCustomView";
import NewExpenseCustomView from "./expenses/NewExpenseCustomView";
import ImportVendors from "./vendor/ImportVendors";
import ImportExpenses from "./expenses/ImportExpenses";
import Expenses from "./expenses/Expenses";
import ExpenseDetail from "./expenses/ExpenseDetail";
import RecordExpense from "./expenses/RecordExpense";
import RecurringExpenses from "./expenses/RecurringExpenses";
import NewRecurringExpense from "./expenses/NewRecurringExpense";
import RecurringExpenseDetail from "./expenses/RecurringExpenseDetail";
import ImportRecurringExpenses from "./expenses/ImportRecurringExpenses";
import Bills from "./bills/Bills";
import NewBill from "./bills/NewBill";
import BillDetail from "./bills/BillDetail";
import RecurringBills from "./bills/RecurringBills";
import NewRecurringBill from "./bills/NewRecurringBill";
import RecurringBillDetail from "./bills/RecurringBillDetail";
import ImportBills from "./bills/ImportBills";
import ImportRecurringBills from "./bills/ImportRecurringBills";
import PurchaseOrders from "./purchase-orders/PurchaseOrders";
import NewPurchaseOrder from "./purchase-orders/NewPurchaseOrder";
import PurchaseOrderDetail from "./purchase-orders/PurchaseOrderDetail";
import PurchaseOrderEmailView from "./purchase-orders/PurchaseOrderEmailView";
import ImportPurchaseOrders from "./purchase-orders/ImportPurchaseOrders";
import PaymentsMade from "./payments/PaymentsMade";
import RecordPayment from "./payments/RecordPayment";
import PaymentDetail from "./payments/PaymentDetail";
import PaymentEmailView from "./payments/PaymentEmailView";
import ImportPayments from "./payments/ImportPayments";
import ImportAppliedExcessPayments from "./payments/ImportAppliedExcessPayments";
import VendorCredits from "./vendor-credits/VendorCredits";
import NewVendorCredit from "./vendor-credits/NewVendorCredit";
import VendorCreditDetail from "./vendor-credits/VendorCreditDetail";
import ImportAppliedVendorCredits from "./vendor-credits/ImportAppliedVendorCredits";
import ImportRefunds from "./vendor-credits/ImportRefunds";
import ImportVendorCredits from "./vendor-credits/ImportVendorCredits";
import ReceiptsInbox from "./receipts/ReceiptsInbox";
import UploadedDocuments from "./documents/UploadedDocuments";

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

  return (
    <div className={isVendorPage || isRecurringBillsPage || isRecurringExpensesPage || isPaymentsMadePage || isVendorCreditsPage || isExpenseDetailPage ? "page page-vendor" : "page"}>
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
    </div>
  );
}
