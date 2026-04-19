import React, { Suspense, lazy } from "react";

const DocumentsPageContent = lazy(() => import("./DocumentsPageContent"));

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-6 text-sm font-medium text-slate-500">
          Loading documents...
        </div>
      }
    >
      <DocumentsPageContent />
    </Suspense>
  );
}
