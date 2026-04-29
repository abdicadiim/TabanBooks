import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const SalesOrderList = lazy(() => import("./SalesOrderList"));
const NewSalesOrder = lazy(() => import("./newPage/NewSalesOrder"));

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center bg-white text-sm text-gray-500">
      Loading sales orders...
    </div>
  );
}

export default function SalesOrderRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route index element={<SalesOrderList />} />
        <Route path="new" element={<NewSalesOrder />} />
        <Route path=":salesOrderId/edit" element={<NewSalesOrder />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </Suspense>
  );
}
