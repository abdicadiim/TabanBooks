import React from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import GeneralSettings from "./GeneralSettings";
import DefaultAccountTracking from "./DefaultAccountTracking";
import JournalApprovals from "./JournalApprovals";
import JournalValidationRules from "./JournalValidationRules";
import JournalCustomFields from "./JournalCustomFields";
import ChartOfAccountsCustomFields from "./ChartOfAccountsCustomFields";

function AccountantSettings() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: "general", label: "General" },
    { path: "default-account-tracking", label: "Default Account Tracking" },
    { path: "journal-approvals", label: "Journal Approvals" },
    { path: "journal-validation-rules", label: "Journal Validation Rules" },
    { path: "journal-custom-fields", label: "Journal Custom Fields" },
    { path: "chart-of-accounts-custom-fields", label: "Chart of Accounts Custom Fields" }
  ];

  // Get current tab from pathname
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes("journal-custom-fields")) return "journal-custom-fields";
    if (path.includes("chart-of-accounts-custom-fields")) return "chart-of-accounts-custom-fields";
    if (path.includes("journal-approvals")) return "journal-approvals";
    if (path.includes("journal-validation-rules")) return "journal-validation-rules";
    if (path.includes("default-account-tracking")) return "default-account-tracking";
    return "general";
  };

  const currentTab = getCurrentTab();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "white" }}>
      {/* Main Content */}
      <div style={{ width: "100%", backgroundColor: "white" }}>
        {/* Header */}
        <div style={{
          padding: "24px 32px",
          borderBottom: "1px solid #e5e7eb"
        }}>
          <h1 style={{
            fontSize: "28px",
            fontWeight: "600",
            margin: 0,
            marginBottom: "24px",
            color: "#111827"
          }}>
            Accountant
          </h1>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #e5e7eb" }}>
            {tabs.map((tab) => {
              const isActive = currentTab === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(`/accountant/settings/${tab.path}`)}
                  style={{
                    padding: "12px 16px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: isActive ? "#156372" : "#6b7280",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: isActive ? "2px solid #156372" : "2px solid transparent",
                    cursor: "pointer",
                    marginBottom: "-1px"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#111827";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#6b7280";
                    }
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "32px" }}>
          <Routes>
            <Route index element={<GeneralSettings />} />
            <Route path="general" element={<GeneralSettings />} />
            <Route path="default-account-tracking" element={<DefaultAccountTracking />} />
            <Route path="journal-approvals" element={<JournalApprovals />} />
            <Route path="journal-validation-rules" element={<JournalValidationRules />} />
            <Route path="journal-custom-fields" element={<JournalCustomFields />} />
            <Route path="chart-of-accounts-custom-fields" element={<ChartOfAccountsCustomFields />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default AccountantSettings;

