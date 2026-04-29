import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import QuoteQueryWarmup from "./Quotes/QuoteQueryWarmup";

const CustomersRoutes = lazy(() => import("./Customers/CustomersRoutes"));
const InvoicesRoutes = lazy(() => import("./Invoices/InvoicesRoutes"));
const QuotesRoutes = lazy(() => import("./Quotes/QuotesRoutes"));
const CreditNotesRoutes = lazy(() => import("./CreditNotes/CreditNotesRoutes"));
const SalesReceiptsRoutes = lazy(() => import("./SalesReceipts/SalesReceiptsRoutes"));
const RetainerInvoiceRoutes = lazy(() => import("./RetainerInvoice/RetainerInvoiceRoutes"));
const RecurringInvoicesRoutes = lazy(() => import("./RecurringInvoices/RecurringInvoicesRoutes"));
const SalesOrderRoutes = lazy(() => import("./SalesOrder/SalesOrderRoutes"));
const NewDebitNote = lazy(() => import("./DebitNotes/NewDebitNote/NewDebitNote"));
const PaymentsReceivedRoutes = lazy(() => import("./PaymentsReceived/PaymentsReceivedRoutes"));

function RouteFallback() {
  return null;
}

function PaymentLinksPage() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
      Payment links are available from customer transactions in this build.
    </div>
  );
}

export default function SalesRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <QuoteQueryWarmup />
      <Routes>
        <Route index element={<Navigate to="customers" replace />} />
        <Route path="customers/*" element={<CustomersRoutes />} />
        <Route path="invoices/*" element={<InvoicesRoutes />} />
        <Route path="quotes/*" element={<QuotesRoutes />} />
        <Route path="credit-notes/*" element={<CreditNotesRoutes />} />
        <Route path="sales-receipts/*" element={<SalesReceiptsRoutes />} />
        <Route path="retainer-invoices/*" element={<RetainerInvoiceRoutes />} />
        <Route path="recurring-invoices/*" element={<RecurringInvoicesRoutes />} />
        <Route path="sales-orders/*" element={<SalesOrderRoutes />} />
        <Route path="payment-links" element={<PaymentLinksPage />} />
        <Route path="payments-received/*" element={<PaymentsReceivedRoutes />} />
        <Route path="debit-notes/new" element={<NewDebitNote />} />
        <Route path="debit-notes/:id/edit" element={<NewDebitNote />} />
        <Route path="debit-notes/:id/email" element={<NewDebitNote />} />
        <Route path="debit-notes/:id" element={<NewDebitNote />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </Suspense>
  );
}
