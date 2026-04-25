import React from "react";
import { Routes, Route } from "react-router-dom";
import ReportsListPage from "./pages/ReportsPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import ReportWizardShell from "./components/ReportWizardShell";
import NewReport from "./components/NewReport";
import GeneralStep from "./components/GeneralStep";
import ShowHideColumns from "./components/ShowHideColumns";
import ReportLayout from "./components/ReportLayout";
import ReportPreferences from "./components/ReportPreferences";
import { ReportWizardProvider } from "./components/ReportWizardContext";

// Wrapper component for wizard routes to maintain context
function WizardRoutes() {
  return (
    <ReportWizardProvider>
      <Routes>
        <Route path="" element={<ReportWizardShell />}>
          <Route index element={<NewReport />} />
          <Route path="general" element={<GeneralStep />} />
          <Route path="columns" element={<ShowHideColumns />} />
          <Route path="layout" element={<ReportLayout />} />
          <Route path="preferences" element={<ReportPreferences />} />
        </Route>
      </Routes>
    </ReportWizardProvider>
  );
}

export default function ReportsPage() {
  return (
    <div className="page">
      <Routes>
        {/* Main reports list */}
        <Route index element={<ReportsListPage />} />

        {/* Report detail page */}
        <Route path=":id" element={<ReportDetailPage />} />

        {/* New report wizard routes - all wrapped in single ReportWizardProvider */}
        <Route path="new/*" element={<WizardRoutes />} />

        {/* Fallback to reports list */}
        <Route path="*" element={<ReportsListPage />} />
      </Routes>
    </div>
  );
}
