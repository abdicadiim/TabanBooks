import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const PaymentsReceivedListPage = lazy(() => import("./PaymentsReceived"));
const RecordPaymentPage = lazy(() => import("./RecordPayment/RecordPayment"));
const ImportPaymentsPage = lazy(() => import("./ImportPayments/ImportPayments"));
const PaymentDetailPage = lazy(() => import("./PaymentDetail/PaymentDetail"));
const SendPaymentReceiptEmailPage = lazy(() => import("./SendEmail/SendPaymentReceiptEmail"));

function RouteFallback() {
  return null;
}

export default function PaymentsReceivedRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route index element={<PaymentsReceivedListPage />} />
        <Route path="new" element={<RecordPaymentPage />} />
        <Route path="import" element={<ImportPaymentsPage />} />
        <Route path="import-applied-excess" element={<ImportPaymentsPage />} />
        <Route path=":id" element={<PaymentDetailPage />} />
        <Route path=":id/edit" element={<RecordPaymentPage />} />
        <Route path=":id/send-email" element={<SendPaymentReceiptEmailPage />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </Suspense>
  );
}

