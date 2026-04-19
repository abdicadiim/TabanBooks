import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

function NewCustomView({ module = "chartOfAccounts" }) {
  const navigate = useNavigate();
  
  // Determine which module we're creating a custom view for
  const isManualJournals = module === "manualJournals";
  const storageKey = isManualJournals ? "manualJournalCustomViews" : "customViews";
  const backRoute = isManualJournals ? "/accountant/manual-journals" : "/accountant/chart-of-accounts";
  const [formData, setFormData] = useState({
    name: "",
    markAsFavorite: false,
    visibility: "onlyMe" // "onlyMe", "selectedUsers", or "everyone"
  });
  const [criteria, setCriteria] = useState([
    { field: "", comparator: "", value: "" }
  ]);
  const [logicalOperators, setLogicalOperators] = useState({}); // Store AND/OR between criteria (index: operator)
  const [openOperatorDropdowns, setOpenOperatorDropdowns] = useState({});
  const operatorDropdownRefs = useRef({});
  const [availableColumns, setAvailableColumns] = useState(
    isManualJournals
      ? ["Notes", "Reporting Method"]
      : ["Documents", "Parent Account Name"]
  );
  const [selectedColumns, setSelectedColumns] = useState(
    isManualJournals
      ? ["Journal#", "Date", "Reference Number", "Status", "Amount", "Created By"]
      : ["Account Name", "Account Code", "Type"]
  );
  const [openFieldDropdowns, setOpenFieldDropdowns] = useState({});
  const [fieldSearchTerms, setFieldSearchTerms] = useState({});
  const [hoveredField, setHoveredField] = useState({});
  const fieldDropdownRefs = useRef({});
  
  const [openComparatorDropdowns, setOpenComparatorDropdowns] = useState({});
  const [comparatorSearchTerms, setComparatorSearchTerms] = useState({});
  const [hoveredComparator, setHoveredComparator] = useState({});
  const comparatorDropdownRefs = useRef({});
  
  const [selectedUsers, setSelectedUsers] = useState([
    { name: "Mohamed Ali Hassan", email: "maxamed9885m@gmail.com", avatar: null }
  ]);
  const [isAddRolesOpen, setIsAddRolesOpen] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [hoveredRole, setHoveredRole] = useState(null);
  const [activeRolesTab, setActiveRolesTab] = useState("Roles");
  const rolesDropdownRef = useRef(null);
  
  const roles = ["Admin", "Staff", "TimesheetStaff", "Staff (Assigned Customers Only)"];

  const fields = isManualJournals 
    ? ["Journal Number", "Journal Date", "Reference Number", "Status", "Notes", "Amount", "Created By", "Reporting Method"]
    : ["Account Name", "Account Code", "Account Type", "Is System Account", "Documents", "Parent Account Name"];
  const comparators = ["is", "is not", "starts with", "contains", "doesn't contain", "is in", "is not in"];
  
  // Get data from localStorage for value dropdowns
  const getDataFromStorage = () => {
    try {
      if (isManualJournals) {
        // For manual journals, we might need to get from a different source
        // For now, return empty array - can be enhanced later
        return [];
      } else {
        const stored = localStorage.getItem("chartOfAccounts");
        return stored ? JSON.parse(stored) : [];
      }
    } catch {
      return [];
    }
  };
  
  const data = getDataFromStorage();
  
  // Get unique values for each field type
  const getUniqueAccountNames = () => {
    const names = data.map(acc => acc.name).filter(Boolean);
    return [...new Set(names)].sort();
  };
  
  const getUniqueAccountCodes = () => {
    const codes = data.map(acc => acc.code).filter(Boolean);
    return [...new Set(codes)].sort();
  };
  
  const getUniqueAccountTypes = () => {
    const types = data.map(acc => acc.type).filter(Boolean);
    return [...new Set(types)].sort();
  };
  
  const getUniqueParentAccountNames = () => {
    const parents = data.map(acc => acc.parent).filter(Boolean);
    return [...new Set(parents)].sort();
  };
  
  const getUniqueStatuses = () => {
    return ["DRAFT", "PUBLISHED"];
  };
  
  const getUniqueReportingMethods = () => {
    return ["Accrual", "Cash", "Accrual and Cash"];
  };
  
  // Get value options based on selected field
  const getValueOptions = (field) => {
    if (isManualJournals) {
      switch (field) {
        case "Status":
          return getUniqueStatuses();
        case "Reporting Method":
          return getUniqueReportingMethods();
        default:
          return [];
      }
    } else {
      switch (field) {
        case "Account Name":
          return getUniqueAccountNames();
        case "Account Code":
          return getUniqueAccountCodes();
        case "Account Type":
          return getUniqueAccountTypes();
        case "Parent Account Name":
          return getUniqueParentAccountNames();
        default:
          return [];
      }
    }
  };
  
  const [openValueDropdowns, setOpenValueDropdowns] = useState({});
  const [valueSearchTerms, setValueSearchTerms] = useState({});
  const [hoveredValue, setHoveredValue] = useState({});
  const valueDropdownRefs = useRef({});
  
  const toggleValueDropdown = (index) => {
    setOpenValueDropdowns(prev => ({ ...prev, [index]: !prev[index] }));
  };
  
  const selectValue = (index, value) => {
    const updated = [...criteria];
    updated[index].value = value;
    setCriteria(updated);
    setOpenValueDropdowns(prev => ({ ...prev, [index]: false }));
    setValueSearchTerms(prev => ({ ...prev, [index]: "" }));
  };
  
  const getFilteredValues = (index) => {
    const searchTerm = valueSearchTerms[index] || "";
    const options = getValueOptions(criteria[index].field);
    return options.filter(value => 
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  };
  
  const shouldShowValueDropdown = (field) => {
    return ["Account Name", "Account Code", "Account Type", "Parent Account Name"].includes(field);
  };

  const addCriterion = () => {
    setCriteria([...criteria, { field: "", comparator: "", value: "" }]);
  };

  const removeCriterion = (index) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const moveColumnToSelected = (column) => {
    setAvailableColumns(availableColumns.filter(c => c !== column));
    setSelectedColumns([...selectedColumns, column]);
  };

  const moveColumnToAvailable = (column) => {
    setSelectedColumns(selectedColumns.filter(c => c !== column));
    setAvailableColumns([...availableColumns, column]);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      Object.keys(openFieldDropdowns).forEach(index => {
        if (openFieldDropdowns[index] && fieldDropdownRefs.current[index] && !fieldDropdownRefs.current[index].contains(event.target)) {
          setOpenFieldDropdowns(prev => ({ ...prev, [index]: false }));
        }
      });
      Object.keys(openComparatorDropdowns).forEach(index => {
        if (openComparatorDropdowns[index] && comparatorDropdownRefs.current[index] && !comparatorDropdownRefs.current[index].contains(event.target)) {
          setOpenComparatorDropdowns(prev => ({ ...prev, [index]: false }));
        }
      });
      Object.keys(openOperatorDropdowns).forEach(index => {
        if (openOperatorDropdowns[index] && operatorDropdownRefs.current[index] && !operatorDropdownRefs.current[index].contains(event.target)) {
          setOpenOperatorDropdowns(prev => ({ ...prev, [index]: false }));
        }
      });
      Object.keys(openValueDropdowns).forEach(index => {
        if (openValueDropdowns[index] && valueDropdownRefs.current[index] && !valueDropdownRefs.current[index].contains(event.target)) {
          setOpenValueDropdowns(prev => ({ ...prev, [index]: false }));
        }
      });
      if (isAddRolesOpen && rolesDropdownRef.current && !rolesDropdownRef.current.contains(event.target)) {
        setIsAddRolesOpen(false);
      }
    }

    if (Object.values(openFieldDropdowns).some(open => open) || Object.values(openComparatorDropdowns).some(open => open) || Object.values(openOperatorDropdowns).some(open => open) || Object.values(openValueDropdowns).some(open => open) || isAddRolesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openFieldDropdowns, openComparatorDropdowns, openOperatorDropdowns, openValueDropdowns, isAddRolesOpen]);

  const toggleFieldDropdown = (index) => {
    setOpenFieldDropdowns(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const selectField = (index, field) => {
    const updated = [...criteria];
    updated[index].field = field;
    // Clear value when field changes if it's not compatible
    if (updated[index].value && !shouldShowValueDropdown(field)) {
      updated[index].value = "";
    }
    setCriteria(updated);
    setOpenFieldDropdowns(prev => ({ ...prev, [index]: false }));
    setFieldSearchTerms(prev => ({ ...prev, [index]: "" }));
  };

  const getFilteredFields = (index) => {
    const searchTerm = fieldSearchTerms[index] || "";
    return fields.filter(field => 
      field.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const toggleComparatorDropdown = (index) => {
    setOpenComparatorDropdowns(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const selectComparator = (index, comparator) => {
    const updated = [...criteria];
    updated[index].comparator = comparator;
    setCriteria(updated);
    setOpenComparatorDropdowns(prev => ({ ...prev, [index]: false }));
    setComparatorSearchTerms(prev => ({ ...prev, [index]: "" }));
  };

  const getFilteredComparators = (index) => {
    const searchTerm = comparatorSearchTerms[index] || "";
    return comparators.filter(comparator => 
      comparator.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const toggleOperatorDropdown = (index) => {
    setOpenOperatorDropdowns(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const selectOperator = (index, operator) => {
    setLogicalOperators(prev => ({ ...prev, [index]: operator }));
    setOpenOperatorDropdowns(prev => ({ ...prev, [index]: false }));
  };

  const removeUser = (index) => {
    setSelectedUsers(selectedUsers.filter((_, i) => i !== index));
  };

  const toggleRole = (role) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const getFilteredRoles = () => {
    return roles.filter(role => 
      role.toLowerCase().includes(roleSearchTerm.toLowerCase())
    );
  };

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", backgroundColor: "#f7f8fc" }}>
      <div style={{ maxWidth: "1200px", margin: "0", padding: "20px" }}>
        {/* Header */}
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "24px" }}>
          New Custom View
        </h1>

        {/* Name Section */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#ef4444" }}>
              Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder=""
              style={{
                flex: 1,
                maxWidth: "400px",
                padding: "10px 14px",
                border: "2px solid #60a5fa",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none"
              }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.markAsFavorite}
                onChange={(e) => setFormData(prev => ({ ...prev, markAsFavorite: e.target.checked }))}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <span style={{ fontSize: "14px", color: "#111827" }}>Mark as Favorite</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5L9.5 5.5L13.5 6.5L10.5 9.5L11 13.5L8 11.5L5 13.5L5.5 9.5L2.5 6.5L6.5 5.5L8 1.5Z" stroke="#9ca3af" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </label>
          </div>
        </div>

        {/* Define the criteria Section */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
            Define the criteria (if any)
          </h2>
          
          {criteria.map((criterion, index) => (
            <div key={index}>
              {/* AND/OR Dropdown - Show between criteria rows */}
              {index > 0 && (
                <div style={{ display: "flex", alignItems: "center", marginBottom: "8px", marginLeft: "44px" }}>
                  <div
                    ref={el => operatorDropdownRefs.current[index] = el}
                    style={{ position: "relative", zIndex: openOperatorDropdowns[index] ? 2000 : "auto" }}
                  >
                    <div
                      onClick={() => toggleOperatorDropdown(index)}
                      style={{
                        padding: "6px 12px",
                        border: openOperatorDropdowns[index] ? "1px solid #60a5fa" : "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        background: "#f9fafb",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: logicalOperators[index] ? "#111827" : "#6b7280",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <span>{logicalOperators[index] || "AND"}</span>
                      <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 12 12" 
                        fill="none"
                        style={{ 
                          transform: openOperatorDropdowns[index] ? "rotate(180deg)" : "rotate(0deg)", 
                          transition: "transform 0.2s ease"
                        }}
                      >
                        <path d="M3 4.5l3 3 3-3" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>

                    {openOperatorDropdowns[index] && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          left: 0,
                          backgroundColor: "white",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                          zIndex: 2000,
                          minWidth: "100px",
                          padding: "4px 0"
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          onClick={() => selectOperator(index, "AND")}
                          onMouseEnter={(e) => {
                            if (logicalOperators[index] !== "AND") {
                              e.target.style.backgroundColor = "#f3f4f6";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (logicalOperators[index] !== "AND") {
                              e.target.style.backgroundColor = "transparent";
                            }
                          }}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontSize: "14px",
                            backgroundColor: logicalOperators[index] === "AND" ? "#156372" : "transparent",
                            color: logicalOperators[index] === "AND" ? "white" : "#111827",
                            transition: "all 0.15s ease"
                          }}
                        >
                          AND
                        </div>
                        <div
                          onClick={() => selectOperator(index, "OR")}
                          onMouseEnter={(e) => {
                            if (logicalOperators[index] !== "OR") {
                              e.target.style.backgroundColor = "#f3f4f6";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (logicalOperators[index] !== "OR") {
                              e.target.style.backgroundColor = "transparent";
                            }
                          }}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontSize: "14px",
                            backgroundColor: logicalOperators[index] === "OR" ? "#156372" : "transparent",
                            color: logicalOperators[index] === "OR" ? "white" : "#111827",
                            transition: "all 0.15s ease"
                          }}
                        >
                          OR
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <div style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "50%", 
                  backgroundColor: "#f3f4f6", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#6b7280",
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>
              
                <div
                  ref={el => fieldDropdownRefs.current[index] = el}
                  style={{ flex: 1, position: "relative", zIndex: openFieldDropdowns[index] ? 2000 : "auto" }}
                >
                <div style={{ display: "flex", alignItems: "center", gap: "4px", width: "100%" }}>
                  <div
                    onClick={() => toggleFieldDropdown(index)}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      border: openFieldDropdowns[index] ? "1px solid #60a5fa" : "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "14px",
                      background: "#f9fafb",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      color: criterion.field ? "#111827" : "#9ca3af",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <span>{criterion.field || "Select a field"}</span>
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 14 14" 
                      fill="none"
                      style={{ 
                        transform: openFieldDropdowns[index] ? "rotate(180deg)" : "rotate(0deg)", 
                        transition: "transform 0.2s ease"
                      }}
                    >
                      <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {criterion.field && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = [...criteria];
                        updated[index].field = "";
                        updated[index].comparator = "";
                        updated[index].value = "";
                        setCriteria(updated);
                      }}
                      style={{
                        width: "24px",
                        height: "24px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "4px",
                        padding: "0"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fee2e2"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>

                {openFieldDropdowns[index] && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      backgroundColor: "white",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 2000,
                      maxHeight: "300px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column"
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Search Bar */}
                    <div style={{
                      padding: "8px",
                      borderBottom: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "white"
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" fill="none"/>
                          <path d="M11 11l-3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <input
                          type="text"
                          placeholder="Search"
                          value={fieldSearchTerms[index] || ""}
                          onChange={(e) => setFieldSearchTerms(prev => ({ ...prev, [index]: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            flex: 1,
                            border: "none",
                            outline: "none",
                            fontSize: "14px",
                            background: "transparent"
                          }}
                        />
                      </div>
                    </div>

                    {/* Options List */}
                    <div style={{
                      maxHeight: "240px",
                      overflowY: "auto",
                      padding: "4px 0"
                    }}>
                      {getFilteredFields(index).map((field) => (
                        <div
                          key={field}
                          onClick={() => selectField(index, field)}
                          onMouseEnter={() => setHoveredField(prev => ({ ...prev, [index]: field }))}
                          onMouseLeave={() => setHoveredField(prev => ({ ...prev, [index]: null }))}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: criterion.field === field || hoveredField[index] === field ? "#156372" : "transparent",
                            color: criterion.field === field || hoveredField[index] === field ? "white" : "#111827",
                            transition: "all 0.15s ease"
                          }}
                        >
                          <span>{field}</span>
                          {criterion.field === field && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M13 4l-6 6-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      ))}
                      {getFilteredFields(index).length === 0 && (
                        <div style={{
                          padding: "10px 14px",
                          fontSize: "14px",
                          color: "#6b7280",
                          textAlign: "center"
                        }}>
                          No results found
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </div>
              
                <div
                  ref={el => comparatorDropdownRefs.current[index] = el}
                  style={{ flex: 1, position: "relative", zIndex: openComparatorDropdowns[index] ? 2000 : "auto" }}
                >
                <div
                  onClick={() => toggleComparatorDropdown(index)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: openComparatorDropdowns[index] ? "1px solid #60a5fa" : "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#f9fafb",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: criterion.comparator ? "#111827" : "#9ca3af",
                    transition: "all 0.2s ease"
                  }}
                >
                  <span>{criterion.comparator || "Select a comparator"}</span>
                  <svg 
                    width="14" 
                    height="14" 
                    viewBox="0 0 14 14" 
                    fill="none"
                    style={{ 
                      transform: openComparatorDropdowns[index] ? "rotate(180deg)" : "rotate(0deg)", 
                      transition: "transform 0.2s ease"
                    }}
                  >
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {openComparatorDropdowns[index] && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      backgroundColor: "white",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 2000,
                      maxHeight: "300px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column"
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Search Bar */}
                    <div style={{
                      padding: "8px",
                      borderBottom: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "white"
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" fill="none"/>
                          <path d="M11 11l-3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <input
                          type="text"
                          placeholder="Search"
                          value={comparatorSearchTerms[index] || ""}
                          onChange={(e) => setComparatorSearchTerms(prev => ({ ...prev, [index]: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            flex: 1,
                            border: "none",
                            outline: "none",
                            fontSize: "14px",
                            background: "transparent"
                          }}
                        />
                      </div>
                    </div>

                    {/* Options List */}
                    <div style={{
                      maxHeight: "240px",
                      overflowY: "auto",
                      padding: "4px 0"
                    }}>
                      {getFilteredComparators(index).length > 0 ? (
                        getFilteredComparators(index).map((comparator) => (
                          <div
                            key={comparator}
                            onClick={() => selectComparator(index, comparator)}
                            onMouseEnter={() => setHoveredComparator(prev => ({ ...prev, [index]: comparator }))}
                            onMouseLeave={() => setHoveredComparator(prev => ({ ...prev, [index]: null }))}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              backgroundColor: criterion.comparator === comparator || hoveredComparator[index] === comparator ? "#156372" : "transparent",
                              color: criterion.comparator === comparator || hoveredComparator[index] === comparator ? "white" : "#111827",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <span>{comparator}</span>
                            {criterion.comparator === comparator && (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M13 4l-6 6-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        ))
                      ) : (
                        <div style={{
                          padding: "20px 14px",
                          fontSize: "14px",
                          color: "#6b7280",
                          textAlign: "center",
                          backgroundColor: "#f9fafb"
                        }}>
                          NO RESULTS FOUND
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </div>
              
                {shouldShowValueDropdown(criterion.field) ? (
                <div
                  ref={el => valueDropdownRefs.current[index] = el}
                  style={{ flex: 1, position: "relative", zIndex: openValueDropdowns[index] ? 2000 : "auto" }}
                >
                  <div
                    onClick={() => toggleValueDropdown(index)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: openValueDropdowns[index] ? "1px solid #60a5fa" : "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "14px",
                      background: "#f9fafb",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      color: criterion.value ? "#111827" : "#9ca3af",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <span>{criterion.value || `Select ${criterion.field.toLowerCase()}`}</span>
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 14 14" 
                      fill="none"
                      style={{ 
                        transform: openValueDropdowns[index] ? "rotate(180deg)" : "rotate(0deg)", 
                        transition: "transform 0.2s ease"
                      }}
                    >
                      <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {openValueDropdowns[index] && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        backgroundColor: "white",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        zIndex: 2000,
                        maxHeight: "300px",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column"
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Search Bar */}
                      <div style={{
                        padding: "8px",
                        borderBottom: "1px solid #e5e7eb",
                        backgroundColor: "#f9fafb"
                      }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          backgroundColor: "white"
                        }}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" fill="none"/>
                            <path d="M11 11l-3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                          <input
                            type="text"
                            placeholder="Search"
                            value={valueSearchTerms[index] || ""}
                            onChange={(e) => setValueSearchTerms(prev => ({ ...prev, [index]: e.target.value }))}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              flex: 1,
                              border: "none",
                              outline: "none",
                              fontSize: "14px",
                              background: "transparent"
                            }}
                          />
                        </div>
                      </div>

                      {/* Options List */}
                      <div style={{
                        maxHeight: "240px",
                        overflowY: "auto",
                        padding: "4px 0"
                      }}>
                        {getFilteredValues(index).map((value) => (
                          <div
                            key={value}
                            onClick={() => selectValue(index, value)}
                            onMouseEnter={() => setHoveredValue(prev => ({ ...prev, [index]: value }))}
                            onMouseLeave={() => setHoveredValue(prev => ({ ...prev, [index]: null }))}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              backgroundColor: criterion.value === value || hoveredValue[index] === value ? "#156372" : "transparent",
                              color: criterion.value === value || hoveredValue[index] === value ? "white" : "#111827",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <span>{value}</span>
                            {criterion.value === value && (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M13 4l-6 6-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        ))}
                        {getFilteredValues(index).length === 0 && (
                          <div style={{
                            padding: "10px 14px",
                            fontSize: "14px",
                            color: "#6b7280",
                            textAlign: "center"
                          }}>
                            No results found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={criterion.value}
                    onChange={(e) => {
                      const updated = [...criteria];
                      updated[index].value = e.target.value;
                      setCriteria(updated);
                    }}
                    placeholder="Enter value"
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none"
                    }}
                  />
                )}
              
                <button
                onClick={addCriterion}
                style={{
                  width: "32px",
                  height: "32px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3.5v9M3.5 8h9" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              
              <button
                onClick={() => removeCriterion(index)}
                style={{
                  width: "32px",
                  height: "32px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              </div>
            </div>
          ))}
          
          <button
            onClick={addCriterion}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#156372",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              padding: "8px 0"
            }}
            onMouseEnter={(e) => e.target.style.opacity = "0.8"}
            onMouseLeave={(e) => e.target.style.opacity = "1"}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#156372" strokeWidth="1.5" fill="none"/>
              <path d="M8 5v6M5 8h6" stroke="#156372" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Add Criterion
          </button>
        </div>

        {/* Columns Preference Section */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
            Columns Preference:
          </h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Available Columns */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
                AVAILABLE COLUMNS
              </h3>
              <div style={{ 
                border: "1px solid #d1d5db", 
                borderRadius: "8px", 
                padding: "10px",
                backgroundColor: "white"
              }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px", 
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  marginBottom: "8px"
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" fill="none"/>
                    <path d="M11 11l-3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      fontSize: "14px"
                    }}
                  />
                </div>
                
                <div>
                  {availableColumns.map((column, index) => (
                    <div
                      key={column}
                      onClick={() => moveColumnToSelected(column)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderRadius: "6px",
                        marginBottom: "2px"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ cursor: "grab" }}>
                        <path d="M6 4h4M6 8h4M6 12h4" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span style={{ fontSize: "14px", color: "#111827" }}>{column}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Selected Columns */}
            <div>
              <h3 style={{ 
                fontSize: "14px", 
                fontWeight: "600", 
                color: "#10b981", 
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#10b981" strokeWidth="1.5" fill="none"/>
                  <path d="M5 8l2 2 4-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                SELECTED COLUMNS
              </h3>
              <div style={{ 
                border: "1px solid #d1d5db", 
                borderRadius: "8px", 
                padding: "10px",
                backgroundColor: "white"
              }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px", 
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  marginBottom: "8px"
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" fill="none"/>
                    <path d="M11 11l-3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      fontSize: "14px"
                    }}
                  />
                </div>
                <div>
                  {selectedColumns.map((column, index) => (
                    <div
                      key={column}
                      onClick={() => moveColumnToAvailable(column)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderRadius: "6px",
                        marginBottom: "2px"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ cursor: "grab" }}>
                        <path d="M6 4h4M6 8h4M6 12h4" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span style={{ fontSize: "14px", color: "#111827" }}>
                        {column} {index < 3 && <span style={{ color: "#ef4444" }}>*</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visibility Preference Section */}
        <div style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
            Visibility
          </h3>
          <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>
            Share With
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              backgroundColor: formData.visibility === "onlyMe" ? "#eff6ff" : "white",
              border: formData.visibility === "onlyMe" ? "2px solid #156372" : "1px solid #e5e7eb",
              borderRadius: "8px",
              cursor: "pointer",
              flex: 1,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              if (formData.visibility !== "onlyMe") {
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.backgroundColor = "#f9fafb";
              }
            }}
            onMouseLeave={(e) => {
              if (formData.visibility !== "onlyMe") {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.backgroundColor = "white";
              }
            }}
            >
              <input
                type="radio"
                name="visibility"
                value="onlyMe"
                checked={formData.visibility === "onlyMe"}
                onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#156372" }}
              />
              <span style={{ fontSize: "14px", color: "#111827", fontWeight: formData.visibility === "onlyMe" ? "500" : "400" }}>Only Me</span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ marginLeft: "auto" }}>
                <rect x="3.5" y="5.5" width="11" height="9" rx="1.5" stroke={formData.visibility === "onlyMe" ? "#156372" : "#9ca3af"} strokeWidth="1.5" fill="none"/>
                <path d="M6.5 3.5v2.5M11.5 3.5v2.5" stroke={formData.visibility === "onlyMe" ? "#156372" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="9" cy="10" r="1.5" fill={formData.visibility === "onlyMe" ? "#156372" : "#9ca3af"}/>
              </svg>
            </label>
            
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              backgroundColor: formData.visibility === "selectedUsers" ? "#eff6ff" : "white",
              border: formData.visibility === "selectedUsers" ? "2px solid #156372" : "1px solid #e5e7eb",
              borderRadius: "8px",
              cursor: "pointer",
              flex: 1,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              if (formData.visibility !== "selectedUsers") {
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.backgroundColor = "#f9fafb";
              }
            }}
            onMouseLeave={(e) => {
              if (formData.visibility !== "selectedUsers") {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.backgroundColor = "white";
              }
            }}
            >
              <input
                type="radio"
                name="visibility"
                value="selectedUsers"
                checked={formData.visibility === "selectedUsers"}
                onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#156372" }}
              />
              <span style={{ fontSize: "14px", color: "#111827", fontWeight: formData.visibility === "selectedUsers" ? "500" : "400" }}>Only Selected Users & Roles</span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ marginLeft: "auto" }}>
                <circle cx="9" cy="6.5" r="2.5" stroke={formData.visibility === "selectedUsers" ? "#156372" : "#9ca3af"} strokeWidth="1.5" fill="none"/>
                <path d="M4 15.5v-2.5a5 5 0 0 1 10 0v2.5" stroke={formData.visibility === "selectedUsers" ? "#156372" : "#9ca3af"} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="13.5" cy="4.5" r="2" fill={formData.visibility === "selectedUsers" ? "#156372" : "#9ca3af"}/>
              </svg>
            </label>
            
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              backgroundColor: formData.visibility === "everyone" ? "#eff6ff" : "white",
              border: formData.visibility === "everyone" ? "2px solid #156372" : "1px solid #e5e7eb",
              borderRadius: "8px",
              cursor: "pointer",
              flex: 1,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              if (formData.visibility !== "everyone") {
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.backgroundColor = "#f9fafb";
              }
            }}
            onMouseLeave={(e) => {
              if (formData.visibility !== "everyone") {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.backgroundColor = "white";
              }
            }}
            >
              <input
                type="radio"
                name="visibility"
                value="everyone"
                checked={formData.visibility === "everyone"}
                onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#156372" }}
              />
              <span style={{ fontSize: "14px", color: "#111827", fontWeight: formData.visibility === "everyone" ? "500" : "400" }}>
                Everyone
              </span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ marginLeft: "auto" }}>
                <rect x="3.5" y="4.5" width="11" height="13" rx="1.5" stroke={formData.visibility === "everyone" ? "#156372" : "#9ca3af"} strokeWidth="1.5" fill="none"/>
                <path d="M6.5 2.5v2.5M11.5 2.5v2.5" stroke={formData.visibility === "everyone" ? "#156372" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </label>
          </div>

          {/* Users and Roles Section - Only show when "Only Selected Users & Roles" is selected */}
          {formData.visibility === "selectedUsers" && (
            <div style={{ marginTop: "24px" }}>
              {/* Users Selection */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#111827", marginBottom: "8px" }}>
                  Users
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="text"
                    placeholder="Select Users"
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                      backgroundColor: "white"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#156372"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                  <button
                    style={{
                      padding: "10px 16px",
                      backgroundColor: "#156372",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      whiteSpace: "nowrap",
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3.5v9M3.5 8h9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    + Add Users
                  </button>
                </div>
              </div>

              {/* Roles Selection */}
              <div style={{ marginBottom: "20px", position: "relative" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#111827", marginBottom: "8px" }}>
                  Roles
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <button
                      onClick={() => setIsAddRolesOpen(!isAddRolesOpen)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        color: "#6b7280",
                        textAlign: "left"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#d1d5db";
                      }}
                      onMouseLeave={(e) => {
                        if (!isAddRolesOpen) {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }
                      }}
                    >
                      <span>Add Roles</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    
                    {/* Roles Dropdown - Smaller */}
                    {isAddRolesOpen && (
                      <div
                        ref={rolesDropdownRef}
                        style={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          right: 0,
                          backgroundColor: "white",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                          zIndex: 2000,
                          maxHeight: "200px",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          minWidth: "300px"
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Search Bar - Smaller */}
                        <div style={{
                          padding: "6px",
                          borderBottom: "1px solid #e5e7eb",
                          backgroundColor: "#f9fafb"
                        }}>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            backgroundColor: "white"
                          }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="6.5" cy="6.5" r="4.5" stroke="#9ca3af" strokeWidth="1.2" fill="none"/>
                              <path d="M9.5 9.5l-2-2" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round"/>
                            </svg>
                            <input
                              type="text"
                              placeholder="Search"
                              value={roleSearchTerm}
                              onChange={(e) => setRoleSearchTerm(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                flex: 1,
                                border: "none",
                                outline: "none",
                                fontSize: "13px",
                                background: "transparent"
                              }}
                            />
                          </div>
                        </div>

                        {/* Roles List - Smaller */}
                        <div style={{
                          maxHeight: "150px",
                          overflowY: "auto",
                          padding: "2px 0"
                        }}>
                          <div style={{
                            padding: "6px 12px",
                            fontSize: "11px",
                            fontWeight: "600",
                            color: "#6b7280",
                            textTransform: "uppercase"
                          }}>
                            Roles
                          </div>
                          {getFilteredRoles().map((role) => (
                            <div
                              key={role}
                              onClick={() => toggleRole(role)}
                              onMouseEnter={() => setHoveredRole(role)}
                              onMouseLeave={() => setHoveredRole(null)}
                              style={{
                                padding: "8px 12px",
                                cursor: "pointer",
                                fontSize: "13px",
                                backgroundColor: selectedRoles.includes(role) || hoveredRole === role ? "#156372" : "transparent",
                                color: selectedRoles.includes(role) || hoveredRole === role ? "white" : "#111827",
                                transition: "all 0.15s ease"
                              }}
                            >
                              {role}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Warning if no users selected */}
              {selectedUsers.length === 0 && selectedRoles.length === 0 && (
                <div style={{
                  padding: "12px 16px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "12px"
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v5M8 11h.01" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5" fill="none"/>
                  </svg>
                  <span style={{ fontSize: "14px", color: "#ef4444" }}>Select at least one user</span>
                </div>
              )}

              {/* Access Details Section */}
              <div style={{ 
                marginTop: "24px", 
                backgroundColor: "white", 
                padding: "20px", 
                borderRadius: "12px", 
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" 
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "20px" }}>
                  Access Details
                </h3>
                
                {/* Roles Sub-section */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#111827", marginBottom: "8px" }}>
                    Roles
                  </label>
                  {selectedRoles.length === 0 ? (
                    <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>No roles selected</p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {selectedRoles.map((role) => (
                        <div
                          key={role}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            backgroundColor: "#f3f4f6",
                            borderRadius: "6px",
                            fontSize: "14px",
                            color: "#111827"
                          }}
                        >
                          <span>{role}</span>
                          <button
                            onClick={() => setSelectedRoles(selectedRoles.filter(r => r !== role))}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "0",
                              display: "flex",
                              alignItems: "center",
                              color: "#6b7280"
                            }}
                            onMouseEnter={(e) => e.target.style.color = "#ef4444"}
                            onMouseLeave={(e) => e.target.style.color = "#6b7280"}
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div style={{ height: "1px", backgroundColor: "#e5e7eb", marginBottom: "20px" }}></div>
                
                {/* Users Sub-section */}
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#111827", marginBottom: "12px" }}>
                    Users
                  </label>
                  {selectedUsers.length === 0 ? (
                    <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>No users selected</p>
                  ) : (
                    <div>
                      {selectedUsers.map((user, index) => (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 0",
                            borderBottom: index < selectedUsers.length - 1 ? "1px solid #e5e7eb" : "none"
                          }}
                        >
                          <div style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            backgroundColor: "#e5e7eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#6b7280",
                            flexShrink: 0,
                            overflow: "hidden"
                          }}>
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              user.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: "500", color: "#111827", marginBottom: "2px" }}>
                              {user.name}
                            </div>
                            <div style={{ fontSize: "13px", color: "#6b7280" }}>
                              {user.email}
                            </div>
                          </div>
                          <button
                            onClick={() => removeUser(index)}
                            style={{
                              width: "24px",
                              height: "24px",
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "4px",
                              color: "#6b7280"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f3f4f6";
                              e.currentTarget.style.color = "#ef4444";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.color = "#6b7280";
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
          <button
            onClick={() => {
              if (formData.name && formData.name.trim()) {
                try {
                  // Save custom view to localStorage
                  const customView = {
                    id: Date.now().toString(),
                    name: formData.name.trim(),
                    markAsFavorite: formData.markAsFavorite,
                    visibility: formData.visibility,
                    criteria: criteria.filter(c => c.field && c.comparator && c.value),
                    logicalOperators: logicalOperators,
                    selectedColumns: selectedColumns,
                    availableColumns: availableColumns,
                    selectedUsers: formData.visibility === "selectedUsers" ? selectedUsers : [],
                    selectedRoles: formData.visibility === "selectedUsers" ? selectedRoles : [],
                    createdAt: new Date().toISOString()
                  };
                  
                  // Get existing custom views
                  let existingViews = [];
                  try {
                    const saved = localStorage.getItem(storageKey);
                    if (saved) {
                      existingViews = JSON.parse(saved);
                    }
                  } catch (e) {
                    console.error("Error reading existing custom views:", e);
                    existingViews = [];
                  }
                  
                  // Check if a view with the same name already exists
                  const duplicateIndex = existingViews.findIndex(v => v.name === customView.name);
                  if (duplicateIndex >= 0) {
                    // Update existing view
                    existingViews[duplicateIndex] = customView;
                  } else {
                    // Add new view
                    existingViews.push(customView);
                  }
                  
                  // Save to localStorage
                  localStorage.setItem(storageKey, JSON.stringify(existingViews));
                  
                  // Navigate back
                  navigate(backRoute);
                } catch (error) {
                  console.error("Error saving custom view:", error);
                  alert("Failed to save custom view. Please try again.");
                }
              } else {
                alert("Please enter a custom view name.");
              }
            }}
            disabled={!formData.name}
            style={{
              padding: "10px 24px",
              backgroundColor: formData.name ? "#156372" : "#9ca3af",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: formData.name ? "pointer" : "not-allowed",
              color: "white"
            }}
            onMouseOver={(e) => {
              if (formData.name) {
                e.target.style.backgroundColor = "#0D4A52";
              }
            }}
            onMouseOut={(e) => {
              if (formData.name) {
                e.target.style.backgroundColor = "#156372";
              }
            }}
          >
            Save
          </button>
          <button
            onClick={() => navigate(backRoute)}
            style={{
              padding: "10px 24px",
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
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

export default NewCustomView;

