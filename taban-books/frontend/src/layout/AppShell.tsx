import React from "react";
import { Outlet } from "react-router-dom";

import Header from "./Header&sidebar/Header";
import Sidebar from "./Header&sidebar/sidebar";
import { useLocation } from "react-router-dom";

export default function AppShell() {
  const location = useLocation();
  const isEmbedded = new URLSearchParams(location.search).get("embed") === "1";

  if (isEmbedded) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />
      <Sidebar />

      <main className="min-h-screen pt-[110px] pl-4 pr-4 pb-4 md:pl-[calc(var(--sidebar-width)+24px)]">
        <Outlet />
      </main>
    </div>
  );
}
