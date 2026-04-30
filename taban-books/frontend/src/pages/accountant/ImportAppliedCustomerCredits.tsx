import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, ChevronDown, Lightbulb } from "lucide-react";

function ImportAppliedCustomerCredits() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
  const [isDragging, setIsDragging] = useState(false);
  const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
  const [encodingSearch, setEncodingSearch] = useState("");
  const [isFileSourceDropdownOpen, setIsFileSourceDropdownOpen] = useState(false);
  const encodingDropdownRef = useRef(null);
  const fileSourceDropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  const encodings = [
    "UTF-8 (Unicode)",
    "UTF-16 (Unicode)",
    "ISO-8859-1",
    "ISO-8859-2",
    "ISO-8859-9 (Turkish)",
    "GB2312 (Simplified Chinese)",
    "Big5 (Traditional Chinese)",
    "Shift_JIS (Japanese)"
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (encodingDropdownRef.current && !encodingDropdownRef.current.contains(event.target)) {
        setIsEncodingDropdownOpen(false);
        setEncodingSearch("");
      }
      if (fileSourceDropdownRef.current && !fileSourceDropdownRef.current.contains(event.target)) {
        setIsFileSourceDropdownOpen(false);
      }
    }

    if (isEncodingDropdownOpen || isFileSourceDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEncodingDropdownOpen, isFileSourceDropdownOpen]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
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
            Customer Credits Applied to Invoices - Select File
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
              gap: "6px",
              borderRadius: "4px",
              fontSize: "14px"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          >
            <ArrowLeft size={16} />
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
              backgroundColor: "#156372",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              1
            </div>
            <span style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>Configure</span>
          </div>
          <div style={{ width: "60px", height: "2px", backgroundColor: "#e5e7eb" }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#e5e7eb",
              color: "#9ca3af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              2
            </div>
            <span style={{ fontSize: "14px", color: "#9ca3af" }}>Map Fields</span>
          </div>
          <div style={{ width: "60px", height: "2px", backgroundColor: "#e5e7eb" }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#e5e7eb",
              color: "#9ca3af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              3
            </div>
            <span style={{ fontSize: "14px", color: "#9ca3af" }}>Preview</span>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ padding: "24px" }}>
          {/* File Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              border: isDragging ? "2px dashed #156372" : "2px dashed #d1d5db",
              borderRadius: "8px",
              padding: "40px 20px",
              textAlign: "center",
              backgroundColor: isDragging ? "#eff6ff" : "#fafafa",
              marginBottom: "24px",
              transition: "all 0.2s"
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <Download size={64} color="#9ca3af" style={{ margin: "0 auto" }} />
            </div>
            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>
              Drag and drop file to import
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0", marginBottom: "12px", position: "relative" }} ref={fileSourceDropdownRef}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  backgroundColor: "#156372",
                  color: "white",
                  border: "none",
                  borderRadius: "6px 0 0 6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.xls,.xlsx"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                Choose File
              </label>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFileSourceDropdownOpen(!isFileSourceDropdownOpen);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px 8px",
                  backgroundColor: "#156372",
                  color: "white",
                  border: "none",
                  borderLeft: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "0 6px 6px 0",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
              >
                <ChevronDown size={12} color="white" />
              </button>
              
              {isFileSourceDropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginTop: "4px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                  zIndex: 1000,
                  minWidth: "180px",
                  overflow: "hidden"
                }}>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setIsFileSourceDropdownOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      fontSize: "13px",
                      color: "#111827",
                      backgroundColor: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#156372";
                      e.target.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "#111827";
                    }}
                  >
                    Attach From Desktop
                  </button>
                  <button
                    onClick={() => {
                      // Handle cloud attachment
                      setIsFileSourceDropdownOpen(false);
                      alert("Cloud attachment feature coming soon");
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      fontSize: "13px",
                      color: "#111827",
                      backgroundColor: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#156372";
                      e.target.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "#111827";
                    }}
                  >
                    Attach From Cloud
                  </button>
                  <button
                    onClick={() => {
                      // Handle documents attachment
                      setIsFileSourceDropdownOpen(false);
                      alert("Documents attachment feature coming soon");
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      fontSize: "13px",
                      color: "#111827",
                      backgroundColor: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#156372";
                      e.target.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "#111827";
                    }}
                  >
                    Attach From Documents
                  </button>
                </div>
              )}
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>
              <p style={{ margin: "4px 0" }}>Maximum File Size: 25 MB</p>
              <p style={{ margin: "4px 0" }}>File Format: CSV or TSV or XLS</p>
            </div>
            {selectedFile && (
              <div style={{ marginTop: "12px", padding: "8px", backgroundColor: "#f0f9ff", borderRadius: "6px" }}>
                <p style={{ fontSize: "13px", color: "#0369a1", margin: 0 }}>
                  Selected: {selectedFile.name}
                </p>
              </div>
            )}
          </div>

          {/* Sample Files */}
          <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "24px", lineHeight: "1.6" }}>
            Download a{" "}
            <a href="#" style={{ color: "#156372", textDecoration: "underline" }}>sample csv file</a>
            {" "}or{" "}
            <a href="#" style={{ color: "#156372", textDecoration: "underline" }}>sample xls file</a>
            {" "}and compare it to your import file to ensure you have the file perfect for the import.
          </p>

          {/* Character Encoding */}
          <div style={{ marginBottom: "24px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#111827" }}>
                Character Encoding
              </label>
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
                ?
              </span>
            </div>
            <div
              ref={encodingDropdownRef}
              style={{ position: "relative", maxWidth: "300px", zIndex: isEncodingDropdownOpen ? 2000 : "auto" }}
            >
              <div
                onClick={() => {
                  setIsEncodingDropdownOpen(!isEncodingDropdownOpen);
                  if (!isEncodingDropdownOpen) {
                    setEncodingSearch("");
                  }
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: isEncodingDropdownOpen ? "2px solid #156372" : "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "13px",
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
                <span>{characterEncoding}</span>
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 14 14" 
                  fill="none"
                  style={{ 
                    transform: isEncodingDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", 
                    transition: "transform 0.2s ease",
                    flexShrink: 0,
                    marginLeft: "8px"
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
                    width: "100%",
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    zIndex: 2000,
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: "300px",
                    overflow: "hidden"
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Search Bar */}
                  <div style={{ 
                    padding: "10px", 
                    borderBottom: "1px solid #e5e7eb",
                    backgroundColor: "#fafafa"
                  }}>
                    <div style={{ position: "relative" }}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        style={{ 
                          position: "absolute", 
                          left: "10px", 
                          top: "50%", 
                          transform: "translateY(-50%)", 
                          color: "#9ca3af",
                          pointerEvents: "none"
                        }}
                      >
                        <path d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM13 13l-3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <input
                        type="text"
                        placeholder="Search"
                        value={encodingSearch}
                        onChange={(e) => setEncodingSearch(e.target.value)}
                        autoFocus
                        style={{
                          width: "100%",
                          padding: "8px 12px 8px 36px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "13px",
                          outline: "none",
                          backgroundColor: "white",
                          transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#156372"}
                        onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                      />
                    </div>
                  </div>

                  {/* Options List */}
                  <div style={{ 
                    overflowY: "auto", 
                    maxHeight: "240px",
                    backgroundColor: "white"
                  }}>
                    {encodings
                      .filter(encoding =>
                        !encodingSearch ||
                        encoding.toLowerCase().includes(encodingSearch.toLowerCase())
                      )
                      .map((encoding) => (
                        <div
                          key={encoding}
                          onClick={() => {
                            setCharacterEncoding(encoding);
                            setIsEncodingDropdownOpen(false);
                            setEncodingSearch("");
                          }}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontSize: "13px",
                            backgroundColor: characterEncoding === encoding ? "#156372" : "transparent",
                            color: characterEncoding === encoding ? "white" : "#111827",
                            transition: "all 0.15s ease",
                            borderLeft: characterEncoding === encoding ? "3px solid #0D4A52" : "3px solid transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between"
                          }}
                          onMouseEnter={(e) => {
                            if (characterEncoding !== encoding) {
                              e.target.style.backgroundColor = "#f3f4f6";
                              e.target.style.borderLeftColor = "#e5e7eb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (characterEncoding !== encoding) {
                              e.target.style.backgroundColor = "transparent";
                              e.target.style.borderLeftColor = "transparent";
                            }
                          }}
                        >
                          <span>{encoding}</span>
                          {characterEncoding === encoding && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M13.5 4.5l-7 7-3.5-3.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Page Tips */}
          <div style={{
            backgroundColor: "rgba(22, 98, 112, 0.1)",
            border: "1px solid #166270",
            borderRadius: "8px",
            padding: "16px",
            marginTop: "24px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Lightbulb size={20} color="#f59e0b" />
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>
                Page Tips
              </h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#6b7280", lineHeight: "1.8" }}>
              <li>
                You can download the{" "}
                <a href="#" style={{ color: "#166270", textDecoration: "underline" }}>sample xls file</a>
                {" "}to get detailed information about the data fields used while importing.
              </li>
              <li>
                If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.
              </li>
              <li>
                You can configure your import settings and save them for future too!
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "24px",
            paddingTop: "24px",
            borderTop: "1px solid #e5e7eb"
          }}>
            <button
              onClick={() => {
                // Handle next step
                if (selectedFile) {
                  // Navigate to map fields step
                  navigate("/accountant/manual-journals/import-applied-customer-credits/map-fields", {
                    state: { selectedFile, characterEncoding }
                  });
                }
              }}
              disabled={!selectedFile}
              style={{
                padding: "8px 20px",
                backgroundColor: selectedFile ? "#166270" : "#9ca3af",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "500",
                cursor: selectedFile ? "pointer" : "not-allowed",
                color: "white",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => {
                if (selectedFile) {
                  e.target.style.backgroundColor = "#114e59";
                }
              }}
              onMouseOut={(e) => {
                if (selectedFile) {
                  e.target.style.backgroundColor = "#166270";
                }
              }}
            >
              Next &gt;
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
  );
}

export default ImportAppliedCustomerCredits;
