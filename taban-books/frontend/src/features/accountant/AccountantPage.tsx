import React from "react";
import { Routes, Route } from "react-router-dom";
import ManualJournalsList from "./ManualJournalsList";
import ManualJournals from "./ManualJournals";
import ImportJournals from "./ImportJournals";
import ImportAppliedCustomerCredits from "./ImportAppliedCustomerCredits";
import ImportAppliedCustomerCreditsMapFields from "./ImportAppliedCustomerCreditsMapFields";
import ImportAppliedCustomerCreditsPreview from "./ImportAppliedCustomerCreditsPreview";
import ImportAppliedVendorCredits from "./ImportAppliedVendorCredits";
import JournalTemplates from "./JournalTemplates";
import NewJournalTemplate from "./NewJournalTemplate";
import AccountantSettings from "./settings/AccountantSettings";
import JournalDetail from "./JournalDetail/JournalDetail";
import BulkUpdate from "./BulkUpdate";
import CurrencyAdjustments from "./CurrencyAdjustments";
import CurrencyAdjustmentDetail from "./CurrencyAdjustmentDetail";
import EditCurrencyAdjustment from "./EditCurrencyAdjustment";
import AccountantDetail from "./AccountantDetail";
import ChartOfAccounts from "./ChartOfAccounts";
import NewCustomView from "./NewCustomView";
import ImportChartOfAccounts from "./ImportChartOfAccounts";
import Budgets from "./Budgets";
import NewBudget from "./NewBudget";
import BudgetDetail from "./BudgetDetail/BudgetDetail";
import BudgetVsActuals from "./BudgetDetail/BudgetVsActuals";
import TransactionLocking from "./TransactionLocking";

function Placeholder({ title }: { title: string }) {
  return (
    <div className="card" style={{ margin: "20px" }}>
      <h2 className="card-title">{title}</h2>
      <p className="card-body-text">Please select a section from the sidebar.</p>
    </div>
  );
}

export default function AccountantPage() {
  return (
    <Routes>
      <Route path="manual-journals" element={<ManualJournalsList />} />
      <Route path="manual-journals/new" element={<ManualJournals />} />
      <Route path="manual-journals/:id" element={<JournalDetail />} />
      <Route path="manual-journals/:id/edit" element={<ManualJournals />} />
      <Route path="manual-journals/import" element={<ImportJournals />} />
      <Route path="manual-journals/import-applied-customer-credits" element={<ImportAppliedCustomerCredits />} />
      <Route path="manual-journals/import-applied-customer-credits/map-fields" element={<ImportAppliedCustomerCreditsMapFields />} />
      <Route path="manual-journals/import-applied-customer-credits/preview" element={<ImportAppliedCustomerCreditsPreview />} />
      <Route path="manual-journals/import-applied-vendor-credits" element={<ImportAppliedVendorCredits />} />
      <Route path="manual-journals/templates" element={<JournalTemplates />} />
      <Route path="manual-journals/templates/new" element={<NewJournalTemplate />} />
      <Route path="manual-journals/new-custom-view" element={<NewCustomView module="manualJournals" />} />
      <Route path="settings/*" element={<AccountantSettings />} />
      <Route path="bulk-update" element={<BulkUpdate />} />
      <Route path="currency-adjustments" element={<CurrencyAdjustments />} />
      <Route path="currency-adjustments/:id" element={<CurrencyAdjustmentDetail />} />
      <Route path="currency-adjustments/:id/edit" element={<EditCurrencyAdjustment />} />
      <Route path="find-accountants/:id" element={<AccountantDetail />} />
      <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
      <Route path="chart-of-accounts/new-custom-view" element={<NewCustomView module="chartOfAccounts" />} />
      <Route path="chart-of-accounts/import" element={<ImportChartOfAccounts />} />
      <Route path="budgets" element={<Budgets />} />
      <Route path="budgets/new" element={<NewBudget />} />
      <Route path="budgets/:id" element={<BudgetDetail />} />
      <Route path="budgets/:id/actuals" element={<BudgetVsActuals />} />
      <Route path="budgets/:id/edit" element={<NewBudget />} />
      <Route path="transaction-locking" element={<TransactionLocking />} />
      <Route path="recurring-journals" element={<Placeholder title="Recurring Journals" />} />
      <Route path="fixed-assets" element={<Placeholder title="Fixed Assets" />} />
      <Route path="*" element={<Placeholder title="Accountant" />} />
    </Routes>
  );
}
