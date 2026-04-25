import React, { useState } from "react";
import { Plus } from "lucide-react";

function ChartOfAccountsCustomFields() {
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [isNewFieldModalOpen, setIsNewFieldModalOpen] = useState(false);

  return (
    <div>
      {/* Header with New Custom Field Button */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px"
      }}>
        <div></div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "14px", color: "#6b7280" }}>
            Custom Fields Usage: {customFields.length}/59
          </span>
          <button
            onClick={() => setIsNewFieldModalOpen(true)}
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
            onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = "#b91c1c"}
            onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = "#dc2626"}
          >
            <Plus size={16} />
            New Custom Field
          </button>
        </div>
      </div>

      {/* Table */}
      {
        customFields.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#6b7280"
          }}>
            <p style={{ fontSize: "15px", margin: 0 }}>
              Do you have information that doesn't go under any existing field? Go ahead and create a custom field.
            </p>
          </div>
        ) : (
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            overflow: "hidden"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#f9fafb" }}>
                <tr>
                  <th style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#374151",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb"
                  }}>
                    FIELD NAME
                  </th>
                  <th style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#374151",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb"
                  }}>
                    DATA TYPE
                  </th>
                  <th style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#374151",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb"
                  }}>
                    MANDATORY
                  </th>
                  <th style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#374151",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb"
                  }}>
                    SHOW IN ALL PDFS
                  </th>
                  <th style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#374151",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb"
                  }}>
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                {customFields.map((field) => (
                  <tr key={field.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                      {field.name}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                      {field.dataType}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                      {field.mandatory ? "Yes" : "No"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                      {field.showInPDFs ? "Yes" : "No"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        backgroundColor: field.status === "Active" ? "#d1fae5" : "#fee2e2",
                        color: field.status === "Active" ? "#065f46" : "#991b1b"
                      }}>
                        {field.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div >
  );
}

export default ChartOfAccountsCustomFields;

