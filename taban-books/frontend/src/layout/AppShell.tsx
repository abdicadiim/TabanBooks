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
  const isVendorsListPage = location.pathname === "/purchases/vendors";
  const isQuoteDetailPage = /^\/sales\/quotes\/[^/]+\/?$/.test(location.pathname);

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
        className={`h-full min-h-0 box-border overflow-x-hidden pt-[92px] scroll-pt-[92px] pb-4 pl-0 ${
          isQuoteDetailPage ? "overflow-hidden" : "overflow-y-auto"
        } ${
          isPurchaseOrdersListPage
            ? "pr-0 md:pl-[var(--sidebar-width)]"
            : isVendorsListPage
              ? "pr-4 md:pl-[var(--sidebar-width)]"
            : "pr-4 md:pl-[var(--sidebar-width)]"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
