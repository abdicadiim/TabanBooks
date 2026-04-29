import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const SalesOrderList = lazy(() => import("./SalesOrderList"));
const SalesOrderDetail = lazy(() => import("./SalesOrderDetail/SalesOrderDetail"));
const NewSalesOrder = lazy(() => import("./newPage/NewSalesOrder"));

function RouteFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#156372] border-t-transparent"></div>
    </div>
  );
}

export default function SalesOrderRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route index element={<SalesOrderList />} />
        <Route path="new" element={<NewSalesOrder />} />
        <Route path=":id/edit" element={<NewSalesOrder />} />
        <Route path=":id" element={<SalesOrderDetail />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </Suspense>
  );
}
