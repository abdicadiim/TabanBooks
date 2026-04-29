import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronDown, Edit, HelpCircle, CheckCircle } from "lucide-react";

function ImportAppliedCustomerCreditsMapFields() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedFile = location.state?.selectedFile || { name: "Quote.csv" };
  
  const [fieldMappings, setFieldMappings] = useState([
    { id: 1, tabanField: "Journal Number", importedField: "", isRequired: true, hasDateFormat: false },
    { id: 2, tabanField: "Invoice Number", importedField: "", isRequired: true, hasDateFormat: false },
    { id: 3, tabanField: "Invoice Date", importedField: "", isRequired: false, hasDateFormat: true, dateFormat: "yyyy-MM-dd" },
    { id: 4, tabanField: "Amount", importedField: "", isRequired: true, hasDateFormat: false },
    { id: 5, tabanField: "Date", importedField: "", isRequired: false, hasDateFormat: true, dateFormat: "yyyy-MM-dd" }
  ]);

  const [importedHeaders, setImportedHeaders] = useState([
    "Journal Number",
    "Invoice Number", 
    "Invoice Date",
    "Amount",
    "Date",
    "Reference",
    "Notes"
  ]);

  const [dateFormat, setDateFormat] = useState("Select format at field level");
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [isDateFormatDropdownOpen, setIsDateFormatDropdownOpen] = useState(false);
  const [isDecimalFormatDropdownOpen, setIsDecimalFormatDropdownOpen] = useState(false);
  const [isDateFormatEditOpen, setIsDateFormatEditOpen] = useState(false);
  const [saveSelections, setSaveSelections] = useState(false);
  const [openFieldDropdowns, setOpenFieldDropdowns] = useState({});
  const [openDateFormatDropdowns, setOpenDateFormatDropdowns] = useState({});

  const dateFormatOptions = [
    "yyyy-MM-dd",
    "MM/dd/yyyy",
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "yyyy/MM/dd",
    "MM-dd-yyyy"
  ];

  const dateFormatDropdownRef = useRef(null);
  const decimalFormatDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dateFormatDropdownRef.current && !dateFormatDropdownRef.current.contains(event.target)) {
        setIsDateFormatDropdownOpen(false);
      }
      if (decimalFormatDropdownRef.current && !decimalFormatDropdownRef.current.contains(event.target)) {
        setIsDecimalFormatDropdownOpen(false);
      }
      // Close field dropdowns when clicking outside
      const clickedInsideAnyFieldDropdown = Object.keys(openFieldDropdowns).some(fieldId => {
        const dropdown = document.querySelector(`[data-field-dropdown="${fieldId}"]`);
        return dropdown && dropdown.contains(event.target);
      });
      if (!clickedInsideAnyFieldDropdown) {
        setOpenFieldDropdowns({});
      }
      // Close date format dropdowns when clicking outside
      const clickedInsideAnyDateFormatDropdown = Object.keys(openDateFormatDropdowns).some(fieldId => {
        const dropdown = document.querySelector(`[data-date-format-dropdown="${fieldId}"]`);
        return dropdown && dropdown.contains(event.target);
      });
      if (!clickedInsideAnyDateFormatDropdown) {
        setOpenDateFormatDropdowns({});
      }
    }

    if (isDateFormatDropdownOpen || isDecimalFormatDropdownOpen || Object.keys(openFieldDropdowns).length > 0 || Object.keys(openDateFormatDropdowns).length > 0) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDateFormatDropdownOpen, isDecimalFormatDropdownOpen, openFieldDropdowns, openDateFormatDropdowns]);

  const handleFieldMappingChange = (id, value) => {
    setFieldMappings(fieldMappings.map(field => 
      field.id === id ? { ...field, importedField: value } : field
    ));
  };

  const handleDateFormatChange = (id, value) => {
    setFieldMappings(fieldMappings.map(field => 
      field.id === id ? { ...field, dateFormat: value } : field
    ));
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
            Customer Credits Applied to Invoices - Map Fields
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
              backgroundColor: "#156372",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              2
            </div>
            <span style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>Map Fields</span>
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
          {/* Selected File */}
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
              Your Selected File : <span style={{ fontWeight: "500", color: "#111827" }}>{selectedFile.name}</span>
            </p>
          </div>

          {/* Info Banner */}
          <div style={{
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "6px",
            padding: "12px 16px",
            marginBottom: "24px"
          }}>
            <p style={{ fontSize: "13px", color: "#1e40af", margin: 0 }}>
              The best match to each field on the selected file have been auto-selected.
            </p>
          </div>

          {/* Default Data Formats */}
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>
                Default Data Formats
              </h3>
              <button
                onClick={() => setIsDateFormatEditOpen(!isDateFormatEditOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  backgroundColor: "transparent",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: "#6b7280",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#f9fafb";
                  e.target.style.borderColor = "#9ca3af";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.borderColor = "#d1d5db";
                }}
              >
                <Edit size={14} />
                Edit
              </button>
            </div>
            
            {isDateFormatEditOpen ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                    Date
                  </label>
                  <div style={{ position: "relative" }} ref={dateFormatDropdownRef}>
                    <div
                      onClick={() => setIsDateFormatDropdownOpen(!isDateFormatDropdownOpen)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: isDateFormatDropdownOpen ? "2px solid #156372" : "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "13px",
                        background: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        color: "#111827"
                      }}
                    >
                      <span>{dateFormat}</span>
                      <ChevronDown size={14} color="#6b7280" />
                    </div>
                    {isDateFormatDropdownOpen && (
                      <div style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        width: "100%",
                        backgroundColor: "#ffffff",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        zIndex: 1000,
                        maxHeight: "200px",
                        overflowY: "auto"
                      }}>
                        {dateFormatOptions.map((format) => (
                          <div
                            key={format}
                            onClick={() => {
                              setDateFormat(format);
                              setIsDateFormatDropdownOpen(false);
                            }}
                            style={{
                              padding: "10px 12px",
                              cursor: "pointer",
                              fontSize: "13px",
                              color: "#111827",
                              backgroundColor: dateFormat === format ? "#eff6ff" : "transparent",
                              transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              if (dateFormat !== format) {
                                e.target.style.backgroundColor = "#f9fafb";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (dateFormat !== format) {
                                e.target.style.backgroundColor = "transparent";
                              }
                            }}
                          >
                            {format}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                    Decimal Format
                  </label>
                  <input
                    type="text"
                    value={decimalFormat}
                    onChange={(e) => setDecimalFormat(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "13px",
                      outline: "none"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#156372"}
                    onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <span style={{ fontSize: "13px", color: "#6b7280" }}>Date: </span>
                  <span style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>{dateFormat}</span>
                </div>
                <div>
                  <span style={{ fontSize: "13px", color: "#6b7280" }}>Decimal Format: </span>
                  <span style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>{decimalFormat}</span>
                </div>
              </div>
            )}
          </div>

          {/* Journal Details Table */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
              Journal Details
            </h3>
            <div style={{
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              overflow: "hidden"
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                      TABAN BOOKS FIELD
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                      IMPORTED FILE HEADERS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fieldMappings.map((field) => (
                    <tr key={field.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#111827" }}>
                        {field.tabanField}
                        {field.isRequired && <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ position: "relative", flex: 1 }} data-field-dropdown={field.id}>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenFieldDropdowns({ ...openFieldDropdowns, [field.id]: !openFieldDropdowns[field.id] });
                              }}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                fontSize: "13px",
                                background: "white",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                color: field.importedField ? "#111827" : "#9ca3af"
                              }}
                            >
                              <span>{field.importedField || "Select"}</span>
                              <ChevronDown size={14} color="#6b7280" />
                            </div>
                            {openFieldDropdowns[field.id] && (
                              <div style={{
                                position: "absolute",
                                top: "calc(100% + 4px)",
                                left: 0,
                                width: "100%",
                                backgroundColor: "#ffffff",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                zIndex: 1000,
                                maxHeight: "200px",
                                overflowY: "auto"
                              }}>
                                <div
                                  onClick={() => {
                                    handleFieldMappingChange(field.id, "");
                                    setOpenFieldDropdowns({ ...openFieldDropdowns, [field.id]: false });
                                  }}
                                  style={{
                                    padding: "10px 12px",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    color: "#111827",
                                    transition: "background-color 0.2s"
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                >
                                  Select
                                </div>
                                {importedHeaders.map((header) => (
                                  <div
                                    key={header}
                                    onClick={() => {
                                      handleFieldMappingChange(field.id, header);
                                      setOpenFieldDropdowns({ ...openFieldDropdowns, [field.id]: false });
                                    }}
                                    style={{
                                      padding: "10px 12px",
                                      cursor: "pointer",
                                      fontSize: "13px",
                                      color: "#111827",
                                      backgroundColor: field.importedField === header ? "#eff6ff" : "transparent",
                                      transition: "background-color 0.2s"
                                    }}
                                    onMouseEnter={(e) => {
                                      if (field.importedField !== header) {
                                        e.target.style.backgroundColor = "#f9fafb";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (field.importedField !== header) {
                                        e.target.style.backgroundColor = "transparent";
                                      }
                                    }}
                                  >
                                    {header}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {field.hasDateFormat && (
                            <div style={{ position: "relative" }} data-date-format-dropdown={field.id}>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDateFormatDropdowns({ ...openDateFormatDropdowns, [field.id]: !openDateFormatDropdowns[field.id] });
                                }}
                                style={{
                                  padding: "8px 12px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  background: "white",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  color: "#111827",
                                  minWidth: "140px"
                                }}
                              >
                                <span>{field.dateFormat || "yyyy-MM-dd"}</span>
                                <HelpCircle size={14} color="#9ca3af" />
                              </div>
                              {openDateFormatDropdowns[field.id] && (
                                <div style={{
                                  position: "absolute",
                                  top: "calc(100% + 4px)",
                                  right: 0,
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                  zIndex: 1000,
                                  minWidth: "160px",
                                  maxHeight: "200px",
                                  overflowY: "auto"
                                }}>
                                  {dateFormatOptions.map((format) => (
                                    <div
                                      key={format}
                                      onClick={() => {
                                        handleDateFormatChange(field.id, format);
                                        setOpenDateFormatDropdowns({ ...openDateFormatDropdowns, [field.id]: false });
                                      }}
                                      style={{
                                        padding: "10px 12px",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                        color: "#111827",
                                        backgroundColor: field.dateFormat === format ? "#eff6ff" : "transparent",
                                        transition: "background-color 0.2s"
                                      }}
                                      onMouseEnter={(e) => {
                                        if (field.dateFormat !== format) {
                                          e.target.style.backgroundColor = "#f9fafb";
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (field.dateFormat !== format) {
                                          e.target.style.backgroundColor = "transparent";
                                        }
                                      }}
                                    >
                                      {format}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save Selections Checkbox */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={saveSelections}
                onChange={(e) => setSaveSelections(e.target.checked)}
                style={{
                  width: "16px",
                  height: "16px",
                  cursor: "pointer"
                }}
              />
              <span style={{ fontSize: "13px", color: "#111827" }}>
                Save these selections for use during future imports.
              </span>
            </label>
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
              onClick={() => navigate("/accountant/manual-journals/import-applied-customer-credits", { state: { selectedFile } })}
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
                  // Navigate to preview step
                  navigate("/accountant/manual-journals/import-applied-customer-credits/preview", {
                    state: { selectedFile, fieldMappings, dateFormat, decimalFormat }
                  });
                }}
                style={{
                  padding: "8px 20px",
                  backgroundColor: "#156372",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                  color: "white",
                  transition: "background-color 0.2s"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#0D4A52"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#156372"}
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
    </div>
  );
}

export default ImportAppliedCustomerCreditsMapFields;

