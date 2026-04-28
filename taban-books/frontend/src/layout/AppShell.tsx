import React from "react";
import { Outlet } from "react-router-dom";

import Header from "./Header&sidebar/Header";
import Sidebar from "./Header&sidebar/sidebar";
import { useLocation } from "react-router-dom";

export default function AppShell() {
  const location = useLocation();
  const isEmbedded = new URLSearchParams(location.search).get("embed") === "1";
  const desktopShellGapClass = "md:[--shell-gap:24px]";
  const isPurchaseOrdersListPage = /^\/purchases(?:\/purchase-orders)?\/?$/.test(
    location.pathname
  );
  const isVendorsListPage = location.pathname === "/purchases/vendors";
  const isQuoteDetailPage = /^\/sales\/quotes\/[^/]+\/?$/.test(location.pathname);
  const isCreditNoteDetailPage = /^\/sales\/credit-notes\/[^/]+\/?$/.test(location.pathname);

  if (isEmbedded) {
    return (
      <div className="h-screen overflow-hidden bg-white text-slate-900">
        <Outlet />
      </div>
    );
  }

  return (
    <div className={`h-screen overflow-hidden bg-white text-slate-900 ${desktopShellGapClass}`}>
      <Header />
      <Sidebar />

      <main
        className={`h-full min-h-0 box-border overflow-x-hidden pt-[96px] scroll-pt-[96px] pb-4 pl-0 ${
          isQuoteDetailPage || isCreditNoteDetailPage ? "overflow-hidden" : "overflow-y-auto"
        } ${
          isPurchaseOrdersListPage
            ? "pr-0 md:pl-[calc(var(--sidebar-width)+var(--shell-gap))]"
            : isVendorsListPage
              ? "pr-4 md:pl-[calc(var(--sidebar-width)+var(--shell-gap))]"
            : "pr-4 md:pl-[calc(var(--sidebar-width)+var(--shell-gap))]"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
