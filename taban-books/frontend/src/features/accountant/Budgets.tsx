import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getBudgets, deleteBudget, getBudgetById, saveBudget } from "./accountantModel";
import { ChevronDown, Pencil, Copy, Trash2 } from "lucide-react";

function Budgets() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const dropdownRefs = useRef({});

  const fetchBudgets = async () => {
    const response = await getBudgets();
    if (response && response.success) {
      setBudgets(response.data);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdownId) {
        const dropdownRef = dropdownRefs.current[openDropdownId];
        if (dropdownRef && !dropdownRef.contains(event.target)) {
          setOpenDropdownId(null);
        }
      }
    };

    if (openDropdownId) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdownId]);



  const handleDelete = async (budgetId, e) => {
    if (e) e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this budget?")) {
      const success = await deleteBudget(budgetId);
      if (success) {
        fetchBudgets();
        setOpenDropdownId(null);
      }
    }
  };

  const handleViewBudgetVsActuals = (budgetId) => {
    // Navigate to budget vs actuals view
    navigate(`/accountant/budgets/${budgetId}/actuals`);
  };

  const handleEdit = (budgetId) => {
    navigate(`/accountant/budgets/${budgetId}/edit`);
    setOpenDropdownId(null);
  };

  const handleClone = async (budgetId) => {
    const budget = await getBudgetById(budgetId);
    if (!budget) return;

    // Create cloned budget data
    const clonedBudget = {
      ...budget,
      id: undefined, // Remove ID to create new
      _id: undefined,
      name: `${budget.name} (Copy)`,
      createdAt: undefined,
      updatedAt: undefined
    };

    // Save the cloned budget
    const success = await saveBudget(clonedBudget);

    if (success) {
      // Refresh the budgets list
      fetchBudgets();
      setOpenDropdownId(null);
      // Show success message
      alert(`Budget "${clonedBudget.name}" has been created successfully.`);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="p-6">
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "40px",
          paddingBottom: "20px",
          borderBottom: "1px solid #e5e7eb"
        }}>
          <h1 style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#111827",
            margin: 0
          }}>
            Budgets
          </h1>

          <button
            onClick={() => navigate("/accountant/budgets/new")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              backgroundColor: "#156372",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s ease"
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#0D4A52"}
            onMouseOut={(e) => e.target.style.backgroundColor = "#156372"}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3.5v9M3.5 8h9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Create
          </button>
        </div>

        {/* Table */}
        {budgets.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px"
            }}>
              <thead>
                <tr style={{
                  backgroundColor: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb"
                }}>
                  <th style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontWeight: "500",
                    color: "#6b7280",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    NAME
                  </th>
                  <th style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontWeight: "500",
                    color: "#6b7280",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    FISCAL YEAR
                  </th>
                  <th style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontWeight: "500",
                    color: "#6b7280",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    BUDGET PERIOD
                  </th>
                  <th style={{
                    padding: "12px 16px",
                    textAlign: "right",
                    fontWeight: "500",
                    color: "#6b7280",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                  </th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => {
                  const budgetId = budget._id || budget.id;
                  return (
                  <tr
                    key={budgetId}
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      transition: "background-color 0.2s",
                      cursor: "pointer",
                      position: "relative"
                    }}
                    onClick={(e) => {
                      // Don't navigate if clicking on action buttons or links
                      if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.budget-action-container')) {
                        navigate(`/accountant/budgets/${budgetId}`);
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f9fafb";
                      setHoveredRowId(budgetId);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      setHoveredRowId(null);
                    }}
                  >
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{
                          color: "#156372",
                          fontWeight: "500"
                        }}
                      >
                        {budget.name || "Untitled Budget"}
                      </span>
                    </td>
                    <td style={{
                      padding: "16px",
                      textAlign: "center",
                      color: "#374151"
                    }}>
                      {budget.fiscalYear || "-"}
                    </td>
                    <td style={{
                      padding: "16px",
                      textAlign: "center",
                      color: "#374151"
                    }}>
                      {budget.budgetPeriod || "-"}
                    </td>
                    <td style={{
                      padding: "16px",
                      textAlign: "right",
                      position: "relative"
                    }}>
                      <div
                        className="budget-action-container"
                        style={{
                          display: hoveredRowId === budgetId ? "flex" : "none",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "12px"
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => setHoveredRowId(budgetId)}
                        onMouseLeave={() => setHoveredRowId(null)}
                      >
                        <span
                          style={{
                            color: "#111827",
                            fontSize: "14px",
                            cursor: "pointer",
                            fontWeight: "500"
                          }}
                          onClick={() => handleViewBudgetVsActuals(budgetId)}
                          onMouseEnter={(e) => {
                            e.target.style.textDecoration = "underline";
                            e.target.style.color = "#156372";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.textDecoration = "none";
                            e.target.style.color = "#111827";
                          }}
                        >
                          View Budget vs Actuals
                        </span>
                        <div
                          style={{ position: "relative" }}
                          ref={(el) => {
                            if (el) {
                              dropdownRefs.current[budgetId] = el;
                            }
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === budgetId ? null : budgetId);
                            }}
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              border: "none",
                              backgroundColor: "#156372",
                              color: "white",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
                          >
                            <ChevronDown size={16} />
                          </button>
                          {openDropdownId === budgetId && (
                            <div style={{
                              position: "absolute",
                              top: "calc(100% + 8px)",
                              right: 0,
                              backgroundColor: "#ffffff",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                              zIndex: 9999,
                              minWidth: "180px",
                              padding: "4px",
                              overflow: "hidden"
                            }}
                              onClick={(e) => e.stopPropagation()}>
                              <div
                                style={{
                                  padding: "10px 12px",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  color: "#ffffff",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  transition: "all 0.15s",
                                  borderRadius: "4px",
                                  margin: "2px",
                                  border: "1px solid #156372",
                                  backgroundColor: "#156372"
                                }}
                                onClick={() => handleEdit(budgetId)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#0D4A52";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "#156372";
                                }}
                              >
                                <Pencil size={16} color="#ffffff" />
                                <span>Edit</span>
                              </div>
                              <div
                                style={{
                                  padding: "10px 12px",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  color: "#111827",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  transition: "background-color 0.15s",
                                  borderRadius: "4px",
                                  margin: "2px"
                                }}
                                onClick={() => handleClone(budgetId)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#f9fafb";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "transparent";
                                }}
                              >
                                <Copy size={16} color="#6b7280" />
                                <span>Clone</span>
                              </div>
                              <div
                                style={{
                                  padding: "10px 12px",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  color: "#111827",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  transition: "background-color 0.15s",
                                  borderRadius: "4px",
                                  margin: "2px"
                                }}
                                onClick={(e) => handleDelete(budgetId, e)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#f9fafb";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "transparent";
                                }}
                              >
                                <Trash2 size={16} color="#6b7280" />
                                <span>Delete</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            textAlign: "center",
            padding: "40px 20px"
          }}>
            <h2 style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#111827",
              marginBottom: "16px",
              lineHeight: "1.2"
            }}>
              Budget your business finance. Stay on top of your expenses.
            </h2>

            <p style={{
              fontSize: "16px",
              color: "#6b7280",
              marginBottom: "32px",
              maxWidth: "600px",
              lineHeight: "1.6"
            }}>
              Create budgets for the various activities of your business, compare them with the actuals, and see how your business is performing.
            </p>

            <button
              onClick={() => navigate("/accountant/budgets/new")}
              style={{
                padding: "12px 24px",
                backgroundColor: "#156372",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                textTransform: "uppercase",
                cursor: "pointer",
                letterSpacing: "0.5px",
                transition: "background-color 0.2s ease"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#0D4A52"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#156372"}
            >
              CREATE BUDGET
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Budgets;

