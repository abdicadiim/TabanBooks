import React, { useState } from "react";
import { Plus } from "lucide-react";

function JournalValidationRules() {
  const [validationRules, setValidationRules] = useState([]);

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{
          fontSize: "24px",
          fontWeight: "600",
          marginBottom: "12px",
          color: "#111827"
        }}>
          Create Validation Rules
        </h2>
        <p style={{
          fontSize: "14px",
          color: "#6b7280",
          lineHeight: "1.6",
          maxWidth: "800px"
        }}>
          Validation Rules helps you to validate the data entered while creating, editing, or converting transactions and to prevent users from performing specific actions.
        </p>
      </div>

      {/* Validation Rule Visualizer */}
      <div style={{
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "24px",
        backgroundColor: "#f9fafb",
        marginBottom: "24px"
      }}>
        <div style={{
          fontSize: "16px",
          fontWeight: "600",
          color: "#111827",
          marginBottom: "20px"
        }}>
          Validation Rule
        </div>

        {/* Visual Flow Diagram */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          position: "relative"
        }}>
          {/* WHEN Node */}
          <div style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            backgroundColor: "#156372",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            fontWeight: "600",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
          }}>
            WHEN
          </div>

          {/* Connector Line */}
          <div style={{
            width: "2px",
            height: "40px",
            backgroundColor: "#156372"
          }}></div>

          {/* Condition Box */}
          <div style={{
            minWidth: "300px",
            padding: "16px 20px",
            backgroundColor: "white",
            border: "2px solid #156372",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
          }}>
            <span style={{ fontSize: "14px", color: "#6b7280" }}>
              Add condition
            </span>
            <button
              style={{
                padding: "4px 8px",
                backgroundColor: "#f3f4f6",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3a.5.5 0 0 1 .5.5v4h4a.5.5 0 0 1 0 1h-4v4a.5.5 0 0 1-1 0v-4h-4a.5.5 0 0 1 0-1h4v-4A.5.5 0 0 1 8 3z" fill="#6b7280"/>
              </svg>
            </button>
          </div>

          {/* Branch Lines */}
          <div style={{
            display: "flex",
            gap: "40px",
            marginTop: "16px"
          }}>
            {/* Left Branch - Add Subrule */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px"
            }}>
              <div style={{
                width: "2px",
                height: "40px",
                backgroundColor: "#156372"
              }}></div>
              <div style={{
                padding: "12px 16px",
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                color: "#6b7280"
              }}>
                <Plus size={14} />
                Add Subrule
              </div>
            </div>

            {/* Right Branch - Add another validation */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px"
            }}>
              <div style={{
                width: "2px",
                height: "40px",
                backgroundColor: "#156372"
              }}></div>
              <button
                style={{
                  padding: "12px 16px",
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  color: "#6b7280",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = "#156372";
                  e.target.style.color = "#156372";
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.color = "#6b7280";
                }}
              >
                <Plus size={14} />
                Add another validation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* New Validation Rule Button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => {
            // Add new validation rule
            setValidationRules([...validationRules, { id: Date.now() }]);
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#b91c1c"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "#dc2626"}
        >
          <Plus size={16} />
          New Validation Rule
        </button>
      </div>
    </div>
  );
}

export default JournalValidationRules;

