import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronDown, CheckCircle, AlertTriangle } from "lucide-react";

function ImportAppliedCustomerCreditsPreview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedFile, fieldMappings, dateFormat, decimalFormat } = location.state || {};
  
  const [expandedSections, setExpandedSections] = useState({
    readyToImport: false,
    skippedRecords: false,
    unmappedFields: false
  });

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  return (
    <div style={{ 
      minHeight: "calc(100vh - 60px)",
      backgroundColor: "#f7f8fc",
      padding: "20px"
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "900px",
        margin: "0 auto",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
          borderBottom: "1px solid #e5e7eb"
        }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0, color: "#111827" }}>
            Customer Credits Applied to Invoices - Preview
          </h2>
          <button
            onClick={() => navigate("/accountant/manual-journals")}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              fontSize: "14px"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 7.5l-5 5m0-5l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
        </div>

        {/* Progress Steps */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "20px",
          padding: "20px 24px",
          borderBottom: "1px solid #e5e7eb"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              <CheckCircle size={18} color="white" />
            </div>
            <span style={{ fontSize: "14px", fontWeight: "500", color: "#10b981" }}>Configure</span>
          </div>
          <div style={{ width: "60px", height: "2px", backgroundColor: "#e5e7eb" }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              <CheckCircle size={18} color="white" />
            </div>
            <span style={{ fontSize: "14px", fontWeight: "500", color: "#10b981" }}>Map Fields</span>
          </div>
          <div style={{ width: "60px", height: "2px", backgroundColor: "#e5e7eb" }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#156372",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              3
            </div>
            <span style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>Preview</span>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ padding: "24px" }}>
          {/* Warning Banner */}
          <div style={{
            backgroundColor: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            padding: "12px 16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <AlertTriangle size={20} color="#dc2626" />
            <p style={{ fontSize: "14px", color: "#991b1b", margin: 0, fontWeight: "500" }}>
              None of the rows can be imported
            </p>
          </div>

          {/* Ready to Import Section */}
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            marginBottom: "16px",
            overflow: "hidden"
          }}>
            <div style={{
              backgroundColor: "#f9fafb",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: expandedSections.readyToImport ? "1px solid #e5e7eb" : "none"
            }}>
              <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>
                Customer Credits Applied to Invoices that are ready to be imported
              </span>
              <button
                onClick={() => toggleSection("readyToImport")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#156372",
                  fontSize: "13px",
                  cursor: "pointer",
                  padding: "4px 8px"
                }}
              >
                View Details
                <ChevronDown 
                  size={14} 
                  style={{ 
                    transform: expandedSections.readyToImport ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s"
                  }} 
                />
              </button>
            </div>
            {expandedSections.readyToImport && (
              <div style={{ padding: "16px", backgroundColor: "white" }}>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                  No records ready to import.
                </p>
              </div>
            )}
          </div>

          {/* Skipped Records Section */}
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            marginBottom: "16px",
            overflow: "hidden"
          }}>
            <div style={{
              backgroundColor: "#f9fafb",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: expandedSections.skippedRecords ? "1px solid #e5e7eb" : "none"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={16} color="#f59e0b" />
                <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>
                  No. of Records skipped - 1
                </span>
              </div>
              <button
                onClick={() => toggleSection("skippedRecords")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#156372",
                  fontSize: "13px",
                  cursor: "pointer",
                  padding: "4px 8px"
                }}
              >
                View Details
                <ChevronDown 
                  size={14} 
                  style={{ 
                    transform: expandedSections.skippedRecords ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s"
                  }} 
                />
              </button>
            </div>
            {expandedSections.skippedRecords && (
              <div style={{ padding: "16px", backgroundColor: "white" }}>
                <div style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  overflow: "hidden"
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead style={{ backgroundColor: "#f9fafb" }}>
                      <tr>
                        <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>
                          Row
                        </th>
                        <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: "10px 12px", color: "#111827", borderBottom: "1px solid #e5e7eb" }}>
                          1
                        </td>
                        <td style={{ padding: "10px 12px", color: "#111827", borderBottom: "1px solid #e5e7eb" }}>
                          Missing required field: Invoice Number
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Unmapped Fields Section */}
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            marginBottom: "24px",
            overflow: "hidden"
          }}>
            <div style={{
              backgroundColor: "#f9fafb",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: expandedSections.unmappedFields ? "1px solid #e5e7eb" : "none"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={16} color="#f59e0b" />
                <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>
                  Unmapped Fields - 48
                </span>
              </div>
              <button
                onClick={() => toggleSection("unmappedFields")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#156372",
                  fontSize: "13px",
                  cursor: "pointer",
                  padding: "4px 8px"
                }}
              >
                View Details
                <ChevronDown 
                  size={14} 
                  style={{ 
                    transform: expandedSections.unmappedFields ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s"
                  }} 
                />
              </button>
            </div>
            {expandedSections.unmappedFields && (
              <div style={{ padding: "16px", backgroundColor: "white" }}>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: 0, marginBottom: "12px" }}>
                  The following fields from your import file are not mapped:
                </p>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px"
                }}>
                  {Array.from({ length: 48 }, (_, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#f3f4f6",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "#6b7280"
                      }}
                    >
                      Field {i + 1}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
            paddingTop: "24px",
            borderTop: "1px solid #e5e7eb"
          }}>
            <button
              onClick={() => navigate("/accountant/manual-journals/import-applied-customer-credits/map-fields", {
                state: { selectedFile, fieldMappings, dateFormat, decimalFormat }
              })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "500",
                cursor: "pointer",
                color: "#6b7280"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
                e.target.style.borderColor = "#d1d5db";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "white";
                e.target.style.borderColor = "#e5e7eb";
              }}
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  // Handle import
                  alert("Import functionality will be implemented");
                }}
                disabled={true}
                style={{
                  padding: "8px 20px",
                  backgroundColor: "#9ca3af",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "not-allowed",
                  color: "white"
                }}
              >
                Import
              </button>
              <button
                onClick={() => navigate("/accountant/manual-journals")}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                  color: "#6b7280"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#f9fafb";
                  e.target.style.borderColor = "#d1d5db";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "white";
                  e.target.style.borderColor = "#e5e7eb";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportAppliedCustomerCreditsPreview;





