// src/layout/AppShell.jsx
import React from "react";
import { Outlet } from "react-router-dom";

import TopBar from "./TopBar";
import Sidebar from "../components/Sidebar";

import NeedAssistance from "../components/NeedAssistance";
import { useLocation } from "react-router-dom";

export default function AppShell({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const pathSegments = location?.pathname?.split("/") || [];
  const isEmbedded = new URLSearchParams(location.search).get("embed") === "1";
  const isReportsRoute = location.pathname.startsWith("/reports");
  const isItemsRoute = location.pathname.startsWith("/items");
  const isInventoryRoute = location.pathname.startsWith("/inventory");

  if (isEmbedded) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <Outlet />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen text-slate-900 flex flex-col ${
        isInventoryRoute ? "bg-transparent" : "bg-slate-50"
      }`}
    >
      <div className="flex-none z-[100]">
        <TopBar />
      </div>

      <div className={`flex flex-1 relative ${isInventoryRoute ? "bg-transparent" : ""}`}>
        {/* Left - Big Sidebar */}
        <Sidebar />

        {/* Page content */}
        <main
          className={`flex-1 transition-all duration-300 md:pl-[var(--sidebar-width)] ${
            isInventoryRoute ? "bg-transparent" : ""
          }`}
        >
          <div
            className={
              isReportsRoute || isItemsRoute || isInventoryRoute
                ? "w-full p-0"
                : "mx-auto max-w-[1600px] p-4 md:pt-4 md:pr-4 md:pb-4 md:pl-0"
            }
          >
            {/* Body */}
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating help (hidden on routes that include 'all') */}
      {!pathSegments.includes("all") && <NeedAssistance />}
    </div>
  );
}
