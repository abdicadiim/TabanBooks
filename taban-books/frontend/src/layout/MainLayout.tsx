import React from "react";
import Sidebar from "../components/Sidebar";

export default function MainLayout({ children }) {
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main
        className="flex-1 transition-all duration-300 bg-transparent w-full min-h-screen box-border overflow-x-hidden"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        {children}
      </main>
    </div>
  );
}
