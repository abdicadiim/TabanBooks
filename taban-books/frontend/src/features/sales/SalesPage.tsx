import React from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";
import AccessDenied from "../../components/AccessDenied";
import Customers from "./Customers/Customers";
import NewCustomer from "./Customers/NewCustomer/NewCustomer";
import NewCustomView from "./Customers/NewCustomView/NewCustomView";
import CustomerDetail from "./Customers/CustomerDetail/CustomerDetail";
import SendEmailStatement from "./Customers/CustomerDetail/SendEmailStatement/SendEmailStatement";
import RequestReview from "./Customers/RequestReview/RequestReview";
import ImportCustomers from "./Customers/ImportCustomers/ImportCustomers";
import Quotes from "./Quotes/Quotes";
import NewQuote from "./Quotes/NewQuote/NewQuote";
import QuoteDetail from "./Quotes/QuoteDetail/QuoteDetail";
import ImportQuotes from "./Quotes/ImportQuotes/ImportQuotes";
import SendQuoteEmail from "./Quotes/SendQuoteEmail/SendQuoteEmail";
import Invoices from "./Invoices/Invoices";
import NewInvoice from "./Invoices/NewInvoice/NewInvoice";
import NewRetailInvoice from "./Invoices/NewRetailInvoice/NewRetailInvoice";
import InvoiceDetail from "./Invoices/InvoiceDetail/InvoiceDetail";
import ImportInvoices from "./Invoices/ImportInvoices/ImportInvoices";
import SendInvoiceEmail from "./Invoices/SendInvoiceEmail/SendInvoiceEmail";
import RecurringInvoices from "./RecurringInvoices/RecurringInvoices";
import NewRecurringInvoice from "./RecurringInvoices/NewRecurringInvoice/NewRecurringInvoice";
import ImportRecurringInvoices from "./RecurringInvoices/ImportRecurringInvoices/ImportRecurringInvoices";
import RecurringInvoiceDetail from "./RecurringInvoices/RecurringInvoiceDetail/RecurringInvoiceDetail";
import PaymentsReceived from "./PaymentsReceived/PaymentsReceived";
import ImportPayments from "./PaymentsReceived/ImportPayments/ImportPayments";
import RecordPayment from "./PaymentsReceived/RecordPayment/RecordPayment";
import PaymentDetail from "./PaymentsReceived/PaymentDetail/PaymentDetail";
import FieldCustomization from "./PaymentsReceived/FieldCustomization";
import CreditNotes from "./CreditNotes/CreditNotes";
import NewCreditNote from "./CreditNotes/NewCreditNote/NewCreditNote";
import CreditNoteDetail from "./CreditNotes/CreditNoteDetail/CreditNoteDetail";
import ImportCreditNotes from "./CreditNotes/ImportCreditNotes/ImportCreditNotes";
import SendCreditNoteEmail from "./CreditNotes/SendCreditNoteEmail/SendCreditNoteEmail";
import NewDebitNote from "./DebitNotes/NewDebitNote/NewDebitNote";
import SalesReceipts from "./SalesReceipts/SalesReceipts";
import NewSalesReceipt from "./SalesReceipts/NewSalesReceipt/NewSalesReceipt";
import SalesReceiptDetail from "./SalesReceipts/SalesReceiptDetail/SalesReceiptDetail";
import ImportSalesReceipts from "./SalesReceipts/ImportSalesReceipts/ImportSalesReceipts";
import SendSalesReceiptEmail from "./SalesReceipts/SendEmail/SendSalesReceiptEmail";
import SendPaymentReceiptEmail from "./PaymentsReceived/SendEmail/SendPaymentReceiptEmail";
import NewSalesperson from "./Salespersons/NewSalesperson/NewSalesperson";

function Placeholder({ title }: { title: string }) {
  return (
    <div className="card">
      <h2 className="card-title">{title}</h2>
      <p className="card-body-text">Design this page later with full details.</p>
    </div>
  );
}

type PermissionRule = { module: string; subModule?: string; action?: string };

const salesPathPermissionRules: Array<{ match: (pathname: string) => boolean; anyOf: PermissionRule[] }> = [
  {
    match: (p) => /\/sales\/customers\/new|\/sales\/customers\/import|\/sales\/customers\/custom-view\/new/.test(p),
    anyOf: [{ module: "contacts", subModule: "customers", action: "create" }],
  },
  {
    match: (p) => /\/sales\/customers\/[^/]+\/edit/.test(p),
    anyOf: [{ module: "contacts", subModule: "customers", action: "edit" }],
  },
  {
    match: (p) => /\/sales\/quotes\/new|\/sales\/quotes\/import|\/sales\/quotes\/custom-view\/new/.test(p),
    anyOf: [{ module: "sales", subModule: "quotes", action: "create" }],
  },
  {
    match: (p) => /\/sales\/quotes\/[^/]+\/edit/.test(p),
    anyOf: [{ module: "sales", subModule: "quotes", action: "edit" }],
  },
  {
    match: (p) => /\/sales\/invoices\/new|\/sales\/invoices\/new-retail|\/sales\/invoices\/import|\/sales\/invoices\/custom-view\/new/.test(p),
    anyOf: [{ module: "sales", subModule: "invoices", action: "create" }],
  },
  {
    match: (p) => /\/sales\/invoices\/[^/]+\/edit/.test(p),
    anyOf: [{ module: "sales", subModule: "invoices", action: "edit" }],
  },
  {
    match: (p) => /\/sales\/recurring-invoices\/new|\/sales\/recurring-invoices\/import|\/sales\/recurring-invoices\/custom-view\/new/.test(p),
    anyOf: [{ module: "sales", subModule: "invoices", action: "create" }],
  },
  {
    match: (p) => /\/sales\/recurring-invoices\/[^/]+\/edit/.test(p),
    anyOf: [{ module: "sales", subModule: "invoices", action: "edit" }],
  },
  {
    match: (p) => /\/sales\/payments-received\/new|\/sales\/payments-received\/import|\/sales\/payments-received\/custom-view\/new/.test(p),
    anyOf: [{ module: "sales", subModule: "customerPayments", action: "create" }],
  },
  {
    match: (p) => /\/sales\/payments-received\/[^/]+\/edit/.test(p),
    anyOf: [{ module: "sales", subModule: "customerPayments", action: "edit" }],
  },
  {
    match: (p) => /\/sales\/credit-notes\/new|\/sales\/credit-notes\/import|\/sales\/credit-notes\/custom-view\/new/.test(p),
    anyOf: [{ module: "sales", subModule: "creditNotes", action: "create" }],
  },
  {
    match: (p) => /\/sales\/credit-notes\/[^/]+\/edit/.test(p),
    anyOf: [{ module: "sales", subModule: "creditNotes", action: "edit" }],
  },
  {
    match: (p) => /\/sales\/sales-receipts\/new|\/sales\/sales-receipts\/import|\/sales\/sales-receipts\/custom-view\/new/.test(p),
    anyOf: [{ module: "sales", subModule: "salesReceipt", action: "create" }],
  },
  {
    match: (p) => /\/sales\/sales-receipts\/[^/]+\/edit/.test(p),
    anyOf: [{ module: "sales", subModule: "salesReceipt", action: "edit" }],
  },
  { match: (p) => p.startsWith("/sales/customers"), anyOf: [{ module: "contacts", subModule: "customers", action: "view" }] },
  { match: (p) => p.startsWith("/sales/quotes"), anyOf: [{ module: "sales", subModule: "quotes", action: "view" }] },
  { match: (p) => p.startsWith("/sales/invoices"), anyOf: [{ module: "sales", subModule: "invoices", action: "view" }] },
  { match: (p) => p.startsWith("/sales/recurring-invoices"), anyOf: [{ module: "sales", subModule: "invoices", action: "view" }] },
  { match: (p) => p.startsWith("/sales/payments-received"), anyOf: [{ module: "sales", subModule: "customerPayments", action: "view" }] },
  { match: (p) => p.startsWith("/sales/credit-notes"), anyOf: [{ module: "sales", subModule: "creditNotes", action: "view" }] },
  { match: (p) => p.startsWith("/sales/sales-receipts"), anyOf: [{ module: "sales", subModule: "salesReceipt", action: "view" }] },
  { match: (p) => p.startsWith("/sales/sales-orders"), anyOf: [{ module: "sales", subModule: "salesOrders", action: "view" }] },
  { match: (p) => p.startsWith("/sales/debit-notes"), anyOf: [{ module: "sales", subModule: "creditNotes", action: "view" }] },
  { match: (p) => p.startsWith("/sales/payment-links"), anyOf: [{ module: "sales", subModule: "customerPayments", action: "view" }] },
];

export default function SalesPage() {
  const location = useLocation();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const isAllowedForRoute = (pathname: string): boolean => {
    if (pathname === "/sales" || pathname === "/sales/") return true;
    const matchedRule = salesPathPermissionRules.find((rule) => rule.match(pathname));
    if (!matchedRule) return true;
    return matchedRule.anyOf.some((rule) => hasPermission(rule.module, rule.subModule, rule.action || "view"));
  };

  const canViewQuotes = hasPermission("sales", "quotes", "view");
  const canViewInvoices = hasPermission("sales", "invoices", "view");
  const canViewRecurringInvoices = hasPermission("sales", "invoices", "view");
  const canViewPayments = hasPermission("sales", "customerPayments", "view");
  const canViewCreditNotes = hasPermission("sales", "creditNotes", "view");

  const isCustomersPage = location.pathname === "/sales/customers" || location.pathname === "/sales";
  const isNewCustomerPage = location.pathname === "/sales/customers/new" || location.pathname.match(/\/sales\/customers\/.*\/edit/);
  const isNewCustomViewPage = location.pathname === "/sales/customers/custom-view/new";
  const isCustomerDetailPage = location.pathname.match(/\/sales\/customers\/[^/]+$/) && !location.pathname.includes("/edit") && !location.pathname.includes("/new") && !location.pathname.includes("/import");
  const isImportCustomersPage = location.pathname === "/sales/customers/import";
  const isSendEmailStatementPage = location.pathname.match(/\/sales\/customers\/.*\/send-email-statement/);
  const isQuotesPage = location.pathname === "/sales/quotes";
  const isNewQuotePage = location.pathname === "/sales/quotes/new" || location.pathname.match(/\/sales\/quotes\/.*\/edit/);
  const isQuoteDetailPage = location.pathname.match(/\/sales\/quotes\/[^/]+$/) && !location.pathname.includes("/edit") && !location.pathname.includes("/new") && !location.pathname.includes("/custom-view") && !location.pathname.includes("/import") && !location.pathname.includes("/email");
  const isQuotesCustomViewPage = location.pathname === "/sales/quotes/custom-view/new";
  const isImportQuotesPage = location.pathname === "/sales/quotes/import";
  const isSendQuoteEmailPage = location.pathname.match(/\/sales\/quotes\/.*\/email/);
  const isInvoicesPage = location.pathname === "/sales/invoices";
  const isInvoiceDetailPage = location.pathname.match(/\/sales\/invoices\/[^/]+$/) && !location.pathname.includes("/edit") && !location.pathname.includes("/new") && !location.pathname.includes("/email") && !location.pathname.includes("/import");
  const isNewInvoicePage = location.pathname === "/sales/invoices/new" || location.pathname.match(/\/sales\/invoices\/.*\/edit/);
  const isSendInvoiceEmailPage = location.pathname.match(/\/sales\/invoices\/.*\/email/);
  const isImportInvoicesPage = location.pathname === "/sales/invoices/import";
  const isRecurringInvoicesPage = location.pathname === "/sales/recurring-invoices";
  const isNewRecurringInvoicePage = location.pathname === "/sales/recurring-invoices/new" || location.pathname.match(/\/sales\/recurring-invoices\/.*\/edit/);
  const isRecurringInvoiceDetailPage = location.pathname.match(/\/sales\/recurring-invoices\/[^/]+$/) && !location.pathname.includes("/edit") && !location.pathname.includes("/new") && !location.pathname.includes("/import");
  const isImportRecurringInvoicesPage = location.pathname === "/sales/recurring-invoices/import";
  const isRecurringInvoicesCustomViewPage = location.pathname === "/sales/recurring-invoices/custom-view/new";
  const isPaymentsReceivedPage = location.pathname === "/sales/payments-received";
  const isPaymentsReceivedCustomViewPage = location.pathname === "/sales/payments-received/custom-view/new";
  const isImportPaymentsPage =
    location.pathname === "/sales/payments-received/import" ||
    location.pathname === "/sales/payments-received/import-retainer" ||
    location.pathname === "/sales/payments-received/import-applied-excess";
  const isRecordPaymentPage = location.pathname === "/sales/payments-received/new" || location.pathname.match(/\/sales\/payments-received\/.*\/edit/);
  const isPaymentDetailPage = location.pathname.match(/\/sales\/payments-received\/[^/]+$/) && !location.pathname.includes("/new") && !location.pathname.includes("/edit") && !location.pathname.includes("/import") && !location.pathname.includes("/custom-view") && !location.pathname.includes("/field-customization");
  const isCreditNotesPage = location.pathname === "/sales/credit-notes";
  const isCreditNoteDetailPage = location.pathname.match(/\/sales\/credit-notes\/[^/]+$/) && !location.pathname.match(/\/sales\/credit-notes\/new/) && !location.pathname.match(/\/sales\/credit-notes\/.*\/edit/) && !location.pathname.match(/\/sales\/credit-notes\/.*\/email/);
  const isNewCreditNotePage = location.pathname === "/sales/credit-notes/new" || location.pathname.match(/\/sales\/credit-notes\/.*\/edit/);
  const isCreditNotesCustomViewPage = location.pathname === "/sales/credit-notes/custom-view/new";
  const isImportCreditNotesPage = location.pathname === "/sales/credit-notes/import" || location.pathname === "/sales/credit-notes/import-applied" || location.pathname === "/sales/credit-notes/import-refunds";
  const isSendCreditNoteEmailPage = location.pathname.match(/\/sales\/credit-notes\/.*\/email/);
  const isNewDebitNotePage = location.pathname === "/sales/debit-notes/new" || location.pathname.match(/\/sales\/debit-notes\/.*\/edit/);
  const isSalesReceiptsPage = location.pathname === "/sales/sales-receipts";
  const isNewSalesReceiptPage = location.pathname === "/sales/sales-receipts/new" || location.pathname.match(/\/sales\/sales-receipts\/.*\/edit/);
  const isSalesReceiptDetailPage = location.pathname.match(/\/sales\/sales-receipts\/[^/]+$/) && !location.pathname.includes("/new") && !location.pathname.includes("/edit") && !location.pathname.includes("/send-email");
  const isSendSalesReceiptEmailPage = location.pathname.match(/\/sales\/sales-receipts\/.*\/send-email/);
  const isSendPaymentReceiptEmailPage = location.pathname.match(/\/sales\/payments-received\/.*\/send-email/);
  const hideHeader = isCustomersPage || isNewCustomerPage || isNewCustomViewPage || isCustomerDetailPage || isImportCustomersPage || isSendEmailStatementPage || isQuotesPage || isNewQuotePage || isQuoteDetailPage || isQuotesCustomViewPage || isImportQuotesPage || isSendQuoteEmailPage || isInvoicesPage || isInvoiceDetailPage || isNewInvoicePage || isSendInvoiceEmailPage || isImportInvoicesPage || isRecurringInvoicesPage || isNewRecurringInvoicePage || isRecurringInvoiceDetailPage || isImportRecurringInvoicesPage || isRecurringInvoicesCustomViewPage || isPaymentsReceivedPage || isPaymentsReceivedCustomViewPage || isImportPaymentsPage || isRecordPaymentPage || isPaymentDetailPage || isCreditNotesPage || isCreditNoteDetailPage || isNewCreditNotePage || isCreditNotesCustomViewPage || isImportCreditNotesPage || isSendCreditNoteEmailPage || isNewDebitNotePage || isSalesReceiptsPage || isNewSalesReceiptPage || isSalesReceiptDetailPage || isSendSalesReceiptEmailPage || isSendPaymentReceiptEmailPage;

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
        title="Sales access required"
        message="Your role does not include permission for this Sales section."
      />
    );
  }

  return (
    <div className="page" style={hideHeader ? { padding: 0, maxWidth: "100%" } : {}}>
      {!hideHeader && (
        <>
          <header className="page-header">
            <h1 className="page-title">Sales</h1>
          </header>

          <div className="tabs">
            <NavLink
              to="/sales/customers"
              className={({ isActive }) => "tab" + (isActive ? " tab-active" : "")}
            >
              Customers
            </NavLink>
            {canViewQuotes && (
              <NavLink
                to="/sales/quotes"
                className={({ isActive }) => "tab" + (isActive ? " tab-active" : "")}
              >
                Quotes
              </NavLink>
            )}
            {canViewInvoices && (
              <NavLink
                to="/sales/invoices"
                className={({ isActive }) => "tab" + (isActive ? " tab-active" : "")}
              >
                Invoices
              </NavLink>
            )}
            {canViewRecurringInvoices && (
              <NavLink
                to="/sales/recurring-invoices"
                className={({ isActive }) => "tab" + (isActive ? " tab-active" : "")}
              >
                Recurring Invoices
              </NavLink>
            )}
            {canViewPayments && (
              <NavLink
                to="/sales/payments-received"
                className={({ isActive }) => "tab" + (isActive ? " tab-active" : "")}
              >
                Payments Received
              </NavLink>
            )}
            {canViewCreditNotes && (
              <NavLink
                to="/sales/credit-notes"
                className={({ isActive }) => "tab" + (isActive ? " tab-active" : "")}
              >
                Credit Notes
              </NavLink>
            )}
          </div>
        </>
      )}

      <Routes>
        <Route path="customers" element={<Customers />} />
        <Route path="customers/new" element={<NewCustomer />} />
        <Route path="customers/import" element={<ImportCustomers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customers/:id/edit" element={<NewCustomer />} />
        <Route path="customers/:id/send-email-statement" element={<SendEmailStatement />} />
        <Route path="customers/:id/request-review" element={<RequestReview />} />
        <Route path="customers/custom-view/new" element={<NewCustomView />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<NewInvoice />} />
        <Route path="invoices/new-retail" element={<NewRetailInvoice />} />
        <Route path="invoices/import" element={<ImportInvoices />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="invoices/:id/edit" element={<NewInvoice />} />
        <Route path="invoices/:id/email" element={<SendInvoiceEmail />} />
        <Route path="invoices/custom-view/new" element={<NewCustomView />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="quotes/new" element={<NewQuote />} />
        <Route path="quotes/import" element={<ImportQuotes />} />
        <Route path="quotes/:quoteId" element={<QuoteDetail />} />
        <Route path="quotes/:quoteId/edit" element={<NewQuote />} />
        <Route path="quotes/:quoteId/email" element={<SendQuoteEmail />} />
        <Route path="quotes/custom-view/new" element={<NewCustomView />} />
        <Route path="recurring-invoices" element={<RecurringInvoices />} />
        <Route path="recurring-invoices/new" element={<NewRecurringInvoice />} />
        <Route path="recurring-invoices/:id" element={<RecurringInvoiceDetail />} />
        <Route path="recurring-invoices/:id/edit" element={<NewRecurringInvoice />} />
        <Route path="recurring-invoices/import" element={<ImportRecurringInvoices />} />
        <Route path="recurring-invoices/custom-view/new" element={<NewCustomView />} />
        <Route path="payments-received/new" element={<RecordPayment />} />
        <Route path="payments-received" element={<PaymentsReceived />} />
        <Route path="payments-received/import" element={<ImportPayments />} />
        <Route path="payments-received/import-retainer" element={<ImportPayments />} />
        <Route path="payments-received/import-applied-excess" element={<ImportPayments />} />
        <Route path="payments-received/custom-view/new" element={<NewCustomView />} />
        <Route path="payments-received/field-customization" element={<FieldCustomization />} />
        <Route path="payments-received/:id/edit" element={<RecordPayment />} />
        <Route path="payments-received/:id/send-email" element={<SendPaymentReceiptEmail />} />
        <Route path="payments-received/:id" element={<PaymentDetail />} />
        <Route path="credit-notes" element={<CreditNotes />} />
        <Route path="credit-notes/new" element={<NewCreditNote />} />
        <Route path="credit-notes/import" element={<ImportCreditNotes />} />
        <Route path="credit-notes/import-applied" element={<ImportCreditNotes />} />
        <Route path="credit-notes/import-refunds" element={<ImportCreditNotes />} />
        <Route path="credit-notes/custom-view/new" element={<NewCustomView />} />
        <Route path="credit-notes/:id" element={<CreditNoteDetail />} />
        <Route path="credit-notes/:id/edit" element={<NewCreditNote />} />
        <Route path="credit-notes/:id/email" element={<SendCreditNoteEmail />} />
        <Route path="debit-notes" element={<Placeholder title="Debit Notes" />} />
        <Route path="debit-notes/new" element={<NewDebitNote />} />
        <Route path="debit-notes/:id/edit" element={<NewDebitNote />} />
        <Route path="sales-orders" element={<Placeholder title="Sales Orders" />} />
        <Route path="retainer-invoices" element={<Placeholder title="Retainer Invoices" />} />
        <Route path="payment-links" element={<Placeholder title="Payment Links" />} />
        <Route path="sales-receipts" element={<SalesReceipts />} />
        <Route path="sales-receipts/new" element={<NewSalesReceipt />} />
        <Route path="sales-receipts/import" element={<ImportSalesReceipts />} />
        <Route path="sales-receipts/custom-view/new" element={<NewCustomView />} />
        <Route path="sales-receipts/:id" element={<SalesReceiptDetail />} />
        <Route path="sales-receipts/:id/edit" element={<NewSalesReceipt />} />
        <Route path="sales-receipts/:id/send-email" element={<SendSalesReceiptEmail />} />
        <Route path="salespersons/new" element={<NewSalesperson />} />
        <Route path="salespersons/:id/edit" element={<NewSalesperson />} />
        <Route
          path="*"
          element={
            location.pathname === "/sales"
              ? <Customers />
              : <Placeholder title="Sales" />
          }
        />
      </Routes>
    </div>
  );
}
