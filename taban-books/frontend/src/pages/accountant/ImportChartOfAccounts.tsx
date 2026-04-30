import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function ImportChartOfAccounts() {
  const navigate = useNavigate();
  const [importStep, setImportStep] = useState(1);
  const [importData, setImportData] = useState({
    duplicateHandling: "skip",
    characterEncoding: "UTF-8",
    selectedFile: null
  });
  const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
  const encodingDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (encodingDropdownRef.current && !encodingDropdownRef.current.contains(event.target)) {
        setIsEncodingDropdownOpen(false);
      }
    }

    if (isEncodingDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEncodingDropdownOpen]);

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", backgroundColor: "#f7f8fc" }}>
      <div style={{
        backgroundColor: "white",
        maxWidth: "900px",
        margin: "40px auto",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100vh - 140px)"
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
            Accounts - Select File
          </h2>
          <button
            onClick={() => navigate("/accountant/chart-of-accounts")}
            style={{
              background: "none",
              border: "none",
              color: "#ef4444",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#fef2f2"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          padding: "16px 24px",
          borderBottom: "1px solid #e5e7eb"
        }}>
          <div style={{
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: "500",
            backgroundColor: importStep === 1 ? "#156372" : "#f3f4f6",
            color: importStep === 1 ? "white" : "#6b7280"
          }}>
            1 Configure
          </div>
          <div style={{
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: "500",
            backgroundColor: importStep === 2 ? "#156372" : "#f3f4f6",
            color: importStep === 2 ? "white" : "#6b7280"
          }}>
            2 Map Fields
          </div>
          <div style={{
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: "500",
            backgroundColor: importStep === 3 ? "#156372" : "#f3f4f6",
            color: importStep === 3 ? "white" : "#6b7280"
          }}>
            3 Preview
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {/* File Upload Section */}
          <div style={{
            border: "2px dashed #d1d5db",
            borderRadius: "8px",
            padding: "40px 20px",
            textAlign: "center",
            marginBottom: "24px",
            backgroundColor: "#f9fafb"
          }}>
            <div style={{ marginBottom: "16px" }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: "0 auto" }}>
                <path d="M24 12v12M24 24l6-6M24 24l-6-6" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 32h24" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>
              Drag and drop file to import.
            </div>
            <div style={{ position: "relative", display: "inline-block" }}>
              <input
                type="file"
                accept=".csv,.tsv,.xls,.xlsx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImportData(prev => ({ ...prev, selectedFile: e.target.files[0] }));
                  }
                }}
                style={{ display: "none" }}
                id="file-upload-input"
              />
              <label
                htmlFor="file-upload-input"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  backgroundColor: "#156372",
                  color: "white",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
              >
                Choose File
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </label>
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "12px" }}>
              Maximum File Size: 25 MB<br/>
              File Format: CSV or TSV or XLS
            </div>
          </div>

          {/* Sample File Link */}
          <div style={{ marginBottom: "24px", fontSize: "14px", color: "#6b7280" }}>
            Download a{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                // Handle sample file download
              }}
              style={{ color: "#156372", textDecoration: "none" }}
              onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
              onMouseLeave={(e) => e.target.style.textDecoration = "none"}
            >
              sample file
            </a>
            {" "}and compare it to your import file to ensure you have the file perfect for the import.
          </div>

          {/* Duplicate Handling Section */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827"
              }}>
                Duplicate Handling: <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280"
                }}
                title="Help"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M8 6v4M8 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="skip"
                  checked={importData.duplicateHandling === "skip"}
                  onChange={(e) => setImportData(prev => ({ ...prev, duplicateHandling: e.target.value }))}
                  style={{ marginTop: "2px", cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "#111827", marginBottom: "4px" }}>
                    Skip Duplicates
                  </div>
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>
                    Retains the accounts in Taban Books and does not import the duplicates in the import file.
                  </div>
                </div>
              </label>
              
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="overwrite"
                  checked={importData.duplicateHandling === "overwrite"}
                  onChange={(e) => setImportData(prev => ({ ...prev, duplicateHandling: e.target.value }))}
                  style={{ marginTop: "2px", cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "#111827", marginBottom: "4px" }}>
                    Overwrite accounts
                  </div>
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>
                    Imports the duplicates in the import file and overwrites the existing accounts in Taban Books.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Character Encoding Section */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827"
              }}>
                Character Encoding
              </label>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280"
                }}
                title="Help"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M8 6v4M8 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div ref={encodingDropdownRef} style={{ position: "relative" }}>
              <div
                onClick={() => setIsEncodingDropdownOpen(!isEncodingDropdownOpen)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: isEncodingDropdownOpen ? "2px solid #156372" : "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  background: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#111827",
                  transition: "all 0.2s ease",
                  boxShadow: isEncodingDropdownOpen ? "0 0 0 3px rgba(38, 99, 235, 0.1)" : "none"
                }}
              >
                <span>
                  {importData.characterEncoding === "UTF-8" ? "UTF-8 (Unicode)" :
                   importData.characterEncoding === "UTF-16" ? "UTF-16 (Unicode)" :
                   importData.characterEncoding === "ISO-8859-9" ? "ISO-8859-9 (Turkish)" :
                   importData.characterEncoding === "GB2312" ? "GB2312 (Simplified Chinese)" :
                   importData.characterEncoding === "Big5" ? "Big5 (Traditional Chinese)" :
                   importData.characterEncoding === "Shift_JIS" ? "Shift_JIS (Japanese)" :
                   importData.characterEncoding}
                </span>
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 14 14" 
                  fill="none"
                  style={{ 
                    transform: isEncodingDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", 
                    transition: "transform 0.2s ease"
                  }}
                >
                  <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {isEncodingDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    zIndex: 2000,
                    maxHeight: "300px",
                    overflowY: "auto"
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {[
                    { value: "UTF-8", label: "UTF-8 (Unicode)" },
                    { value: "UTF-16", label: "UTF-16 (Unicode)" },
                    { value: "ISO-8859-1", label: "ISO-8859-1" },
                    { value: "ISO-8859-2", label: "ISO-8859-2" },
                    { value: "ISO-8859-9", label: "ISO-8859-9 (Turkish)" },
                    { value: "GB2312", label: "GB2312 (Simplified Chinese)" },
                    { value: "Big5", label: "Big5 (Traditional Chinese)" },
                    { value: "Shift_JIS", label: "Shift_JIS (Japanese)" }
                  ].map((encoding) => (
                    <div
                      key={encoding.value}
                      onClick={() => {
                        setImportData(prev => ({ ...prev, characterEncoding: encoding.value }));
                        setIsEncodingDropdownOpen(false);
                      }}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        fontSize: "13px",
                        backgroundColor: importData.characterEncoding === encoding.value ? "#156372" : "transparent",
                        color: importData.characterEncoding === encoding.value ? "white" : "#111827",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (importData.characterEncoding !== encoding.value) {
                          e.target.style.backgroundColor = "#f3f4f6";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (importData.characterEncoding !== encoding.value) {
                          e.target.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {encoding.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Page Tips */}
          <div style={{
            backgroundColor: "#f3f4f6",
            borderRadius: "8px",
            padding: "16px",
            marginTop: "24px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#fbbf24" strokeWidth="1.5" fill="#fef3c7"/>
                <path d="M10 7v4M10 5v2" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                Page Tips
              </div>
            </div>
            <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#6b7280", lineHeight: "1.6" }}>
              <li style={{ marginBottom: "8px" }}>
                If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.
              </li>
              <li>
                You can configure your import settings and save them for future too!
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
          borderTop: "1px solid #e5e7eb"
        }}>
          <button
            onClick={() => {
              if (importStep < 3) {
                setImportStep(importStep + 1);
              }
            }}
            disabled={!importData.selectedFile}
            style={{
              padding: "8px 20px",
              backgroundColor: importData.selectedFile ? "#156372" : "#9ca3af",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: importData.selectedFile ? "pointer" : "not-allowed",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
            onMouseOver={(e) => {
              if (importData.selectedFile) {
                e.target.style.backgroundColor = "#0D4A52";
              }
            }}
            onMouseOut={(e) => {
              if (importData.selectedFile) {
                e.target.style.backgroundColor = "#156372";
              }
            }}
          >
            Next <span>&gt;</span>
          </button>
          <button
            onClick={() => navigate("/accountant/chart-of-accounts")}
            style={{
              padding: "8px 20px",
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "14px",
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
  );
}

export default ImportChartOfAccounts;


