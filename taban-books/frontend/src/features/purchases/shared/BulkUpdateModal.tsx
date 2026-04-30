import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Search, ChevronDown, Check } from "lucide-react";

export default function BulkUpdateModal({
  isOpen,
  onClose,
  title,
  fieldOptions = [],
  onUpdate,
  entityName = "items",
}) {
  const [selectedField, setSelectedField] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const dropdownMenuRef = useRef(null);
  const dropdownTriggerRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const normalizedFieldOptions = (Array.isArray(fieldOptions) ? fieldOptions : []).map((option) =>
    typeof option === "string" ? { value: option, label: option, type: "text" } : option
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedField("");
    setNewValue("");
    setSearchTerm("");
    setIsDropdownOpen(true);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideTrigger = dropdownRef.current && dropdownRef.current.contains(event.target);
      const clickedInsideMenu = dropdownMenuRef.current && dropdownMenuRef.current.contains(event.target);
      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return undefined;

    const updateDropdownPosition = () => {
      if (!dropdownTriggerRef.current) return;

      const rect = dropdownTriggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    };

    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [isDropdownOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!selectedField) {
      alert("Please select a field to update.");
      return;
    }
    if (newValue === "" || newValue === null || newValue === undefined) {
      alert("Please enter a new value.");
      return;
    }

    onUpdate(selectedField, newValue, selectedOption);
    setSelectedField("");
    setNewValue("");
    onClose();
  };

  const handleClose = () => {
    setSelectedField("");
    setNewValue("");
    setIsDropdownOpen(false);
    setSearchTerm("");
    onClose();
  };

  const filteredOptions = normalizedFieldOptions.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = normalizedFieldOptions.find(opt => opt.value === selectedField);
  const selectedOptionType = selectedOption?.type || "text";
  const selectedOptionChoices = Array.isArray(selectedOption?.options) ? selectedOption.options : [];

  const renderValueInput = () => {
    if (selectedOptionType === "select") {
      return (
        <select
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1.5px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "14px",
            outline: "none",
            color: "#1e293b",
            backgroundColor: "#ffffff",
            transition: "all 0.2s ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#156372";
            e.currentTarget.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <option value="">Select a value</option>
          {selectedOptionChoices.map((choice) => {
            const choiceValue = typeof choice === "object" ? choice.value : choice;
            const choiceLabel = typeof choice === "object" ? choice.label : choice;
            return (
              <option key={choiceValue} value={choiceValue}>
                {choiceLabel}
              </option>
            );
          })}
        </select>
      );
    }

    if (selectedOptionType === "date") {
      return (
        <input
          type="date"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1.5px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "14px",
            outline: "none",
            color: "#1e293b",
            backgroundColor: "#ffffff",
            transition: "all 0.2s ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#156372";
            e.currentTarget.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      );
    }

    if (selectedOptionType === "number") {
      return (
        <input
          type="number"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          min={selectedOption?.min}
          max={selectedOption?.max}
          step={selectedOption?.step || "any"}
          placeholder={selectedOption?.placeholder || ""}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1.5px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "14px",
            outline: "none",
            color: "#1e293b",
            backgroundColor: "#ffffff",
            transition: "all 0.2s ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#156372";
            e.currentTarget.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      );
    }

    return (
      <input
        type="text"
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        placeholder={selectedOption?.placeholder || ""}
        style={{
          width: "100%",
          padding: "10px 14px",
          border: "1.5px solid #e2e8f0",
          borderRadius: "8px",
          fontSize: "14px",
          outline: "none",
          color: "#1e293b",
          backgroundColor: "#ffffff",
          transition: "all 0.2s ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#156372";
          e.currentTarget.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.1)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#e2e8f0";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
    );
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          width: "90%",
          maxWidth: "700px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#1e293b",
              margin: 0,
            }}
          >
            {title}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#156372",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fee2e2"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px" }}>
          {/* Instructional Text */}
          <p
            style={{
              fontSize: "14px",
              color: "#64748b",
              marginBottom: "24px",
              marginTop: 0,
              fontWeight: "400",
            }}
          >
            Choose a field from the dropdown and update with new information.
          </p>

          {/* Input Fields */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginBottom: "24px",
              alignItems: "flex-start"
            }}
          >
            {/* Custom Searchable Dropdown */}
            <div style={{ flex: 1, position: "relative" }} ref={dropdownRef}>
              <div
                ref={dropdownTriggerRef}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: `1.5px solid ${isDropdownOpen ? "#156372" : "#e2e8f0"}`,
                  borderRadius: "8px",
                  fontSize: "14px",
                  backgroundColor: "#ffffff",
                  color: selectedField ? "#1e293b" : "#94a3b8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                  boxShadow: isDropdownOpen ? "0 0 0 4px rgba(59, 130, 246, 0.1)" : "none",
                }}
              >
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedOption ? selectedOption.label : "Select a field"}
                </span>
                <ChevronDown
                  size={18}
                  style={{
                    color: "#94a3b8",
                    transform: isDropdownOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s"
                  }}
                />
              </div>

              {isDropdownOpen &&
                createPortal(
                  <div
                    ref={dropdownMenuRef}
                    style={{
                      position: "fixed",
                      top: dropdownPosition.top,
                      left: dropdownPosition.left,
                      width: dropdownPosition.width,
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                      zIndex: 10002,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ position: "relative" }}>
                        <Search
                          size={16}
                          style={{
                            position: "absolute",
                            left: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#94a3b8"
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Search"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          autoFocus
                          style={{
                            width: "100%",
                            padding: "8px 12px 8px 34px",
                            border: "1px solid #f1f5f9",
                            backgroundColor: "#f8fafc",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none",
                            color: "#1e293b",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ maxHeight: "240px", overflowY: "auto", padding: "4px" }}>
                      {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                          <div
                            key={option.value}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedField(option.value);
                              setNewValue("");
                              setIsDropdownOpen(false);
                              setSearchTerm("");
                            }}
                            style={{
                              padding: "10px 12px",
                              fontSize: "14px",
                              cursor: "pointer",
                              backgroundColor: selectedField === option.value ? "#156372" : "transparent",
                              color: selectedField === option.value ? "#ffffff" : "#156372",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              borderRadius: "6px",
                              transition: "background-color 0.15s",
                              margin: "2px 0"
                            }}
                            onMouseEnter={(e) => {
                              if (selectedField !== option.value) {
                                e.currentTarget.style.backgroundColor = "#f1f5f9";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedField !== option.value) {
                                e.currentTarget.style.backgroundColor = "transparent";
                              }
                            }}
                          >
                            <span>{option.label}</span>
                            {selectedField === option.value && <Check size={16} />}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                          No results found
                        </div>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
            </div>

            <div style={{ flex: 1 }}>
              {renderValueInput()}
            </div>
          </div>

          <div style={{ marginTop: "32px", marginBottom: "24px" }}>
            <p
              style={{
                fontSize: "14px",
                color: "#64748b",
                margin: 0,
                lineHeight: "1.6",
                textAlign: "left"
              }}
            >
              All the selected {entityName} will be updated with the new <br />
              information and you cannot undo this action.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            backgroundColor: "#ffffff",
          }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: "600",
              backgroundColor: "#ffffff",
              color: "#156372",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f8fafc";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#ffffff";
              e.currentTarget.style.borderColor = "#e2e8f0";
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: "10px 24px",
              fontSize: "14px",
              fontWeight: "600",
              backgroundColor: "#156372",
              color: "#ffffff",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#156372";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 10px -1px rgba(59, 130, 246, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#156372";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(59, 130, 246, 0.2)";
            }}
          >
            Update
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

