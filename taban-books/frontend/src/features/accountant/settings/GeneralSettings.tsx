import React, { useState } from "react";

function GeneralSettings() {
  const [accountCodeMandatory, setAccountCodeMandatory] = useState(false);
  const [uniqueAccountCode, setUniqueAccountCode] = useState(false);
  const [allow13thMonth, setAllow13thMonth] = useState(false);

  return (
    <div>
      {/* Chart of Accounts Section */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <h2 style={{
            fontSize: "18px",
            fontWeight: "600",
            margin: 0,
            color: "#111827"
          }}>
            Chart of Accounts
          </h2>
          <span style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            color: "#6b7280",
            cursor: "help"
          }}>
            i
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={accountCodeMandatory}
              onChange={(e) => setAccountCodeMandatory(e.target.checked)}
              style={{ accentColor: "#156372" }}
            />
            <span style={{ fontSize: "14px", color: "#111827" }}>
              Make Account Code mandatory for new accounts.
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={uniqueAccountCode}
              onChange={(e) => setUniqueAccountCode(e.target.checked)}
              style={{ accentColor: "#156372" }}
            />
            <span style={{ fontSize: "14px", color: "#111827" }}>
              Enter a unique Account Code for accounts created.
            </span>
          </label>
        </div>
      </div>

      {/* Journals Section */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{
          fontSize: "18px",
          fontWeight: "600",
          marginBottom: "16px",
          color: "#111827"
        }}>
          Journals
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={allow13thMonth}
              onChange={(e) => setAllow13thMonth(e.target.checked)}
              style={{ marginTop: "2px", accentColor: "#156372" }}
            />
            <div>
              <span style={{ fontSize: "14px", color: "#111827" }}>
                Allow 13th Month Adjustments in manual journals.
              </span>
              <p style={{
                fontSize: "13px",
                color: "#6b7280",
                marginTop: "8px",
                marginBottom: 0,
                lineHeight: "1.6"
              }}>
                Enable this option to create a 13th month adjustment journal entry for the selected fiscal year. Once enabled, you can make end-of-period corrections or balance adjustments to your accounts for accurate financial reporting.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Recurring Journals Section */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{
          fontSize: "18px",
          fontWeight: "600",
          marginBottom: "16px",
          color: "#111827"
        }}>
          Recurring Journals
        </h2>
        <p style={{ fontSize: "14px", color: "#111827", margin: 0 }}>
          You can enable this from the{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              // Navigate to General preferences
            }}
            style={{
              color: "#156372",
              textDecoration: "none"
            }}
            onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
            onMouseLeave={(e) => e.target.style.textDecoration = "none"}
          >
            General
          </a>
          {" "}preferences section.
        </p>
      </div>

      {/* Save Button */}
      <div style={{
        marginTop: "32px",
        paddingTop: "24px",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "flex-start"
      }}>
        <button
          onClick={() => {
            // Save settings
            alert("Settings saved!");
          }}
          style={{
            padding: "10px 24px",
            backgroundColor: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#b91c1c"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "#dc2626"}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default GeneralSettings;
