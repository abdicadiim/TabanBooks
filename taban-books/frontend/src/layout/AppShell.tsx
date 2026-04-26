import React from "react";
import { Outlet } from "react-router-dom";

import Header from "./Header&sidebar/Header";
import Sidebar from "./Header&sidebar/sidebar";
import { useLocation } from "react-router-dom";

export default function AppShell() {
  const location = useLocation();
  const isEmbedded = new URLSearchParams(location.search).get("embed") === "1";
  const isPurchaseOrdersListPage = /^\/purchases(?:\/purchase-orders)?\/?$/.test(
    location.pathname
  );

  if (isEmbedded) {
    return (
      <div className="h-screen overflow-hidden bg-white text-slate-900">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-white text-slate-900">
      <Header />
      <Sidebar />

      <main
        className={`h-full min-h-0 box-border overflow-y-auto overflow-x-hidden pt-[92px] scroll-pt-[92px] pb-4 pl-0 ${
          isPurchaseOrdersListPage
            ? "pr-0 md:pl-[calc(var(--sidebar-width)+12px)]"
            : "pr-4 md:pl-[calc(var(--sidebar-width)+28px)]"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
