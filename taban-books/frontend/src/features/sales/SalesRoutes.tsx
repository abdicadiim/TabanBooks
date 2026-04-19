import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const CustomersRoutes = lazy(() => import("./Customers/CustomersRoutes"));
const InvoicesRoutes = lazy(() => import("./Invoices/InvoicesRoutes"));
const QuotesRoutes = lazy(() => import("./Quotes/QuotesRoutes"));
const CreditNotesRoutes = lazy(() => import("./CreditNotes/CreditNotesRoutes"));
const SalesReceiptsRoutes = lazy(() => import("./SalesReceipts/SalesReceiptsRoutes"));
const RetainerInvoiceRoutes = lazy(() => import("./RetainerInvoice/RetainerInvoiceRoutes"));
const SubscriptionsRoutes = lazy(() => import("./subscriptions/SubscriptionsRoutes"));
const NewDebitNote = lazy(() => import("./DebitNotes/NewDebitNote/NewDebitNote"));

function RouteFallback() {
  return null;
}

export default function SalesRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route index element={<Navigate to="customers" replace />} />
        <Route path="customers/*" element={<CustomersRoutes />} />
        <Route path="invoices/*" element={<InvoicesRoutes />} />
        <Route path="quotes/*" element={<QuotesRoutes />} />
        <Route path="credit-notes/*" element={<CreditNotesRoutes />} />
        <Route path="sales-receipts/*" element={<SalesReceiptsRoutes />} />
        <Route path="retainer-invoices/*" element={<RetainerInvoiceRoutes />} />
        <Route path="subscriptions/*" element={<SubscriptionsRoutes />} />
        <Route path="debit-notes/new" element={<NewDebitNote />} />
        <Route path="debit-notes/:id/edit" element={<NewDebitNote />} />
        <Route path="debit-notes/:id/email" element={<NewDebitNote />} />
        <Route path="debit-notes/:id" element={<NewDebitNote />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </Suspense>
  );
}
