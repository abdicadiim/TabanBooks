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

      <main className="min-h-screen pt-[72px] pb-4 pl-0 pr-0 md:pl-[calc(var(--sidebar-width))]">
        <Outlet />
      </main>
    </div>
  );
}
