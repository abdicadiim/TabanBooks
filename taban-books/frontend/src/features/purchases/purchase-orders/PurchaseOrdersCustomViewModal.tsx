// @ts-nocheck
import React, { useState } from "react";
import { ChevronRight, Plus, Star, Trash2, X } from "lucide-react";

export default function PurchaseOrdersCustomViewModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    markAsFavorite: false,
    criteria: [{ id: 1, field: "", comparator: "", value: "" }],
    availableColumns: [
      "Vendor Name",
      "Purchase Order Date",
      "Delivery Date",
      "Purchase Order Number",
      "Reference Number",
      "Amount",
      "Status",
      "Billed Status",
      "Currency",
      "Created Time",
      "Last Modified Time",
    ],
    selectedColumns: [
      "Date",
      "Purchase Order#",
      "Vendor Name",
      "Status",
      "Amount",
      "Delivery Date",
    ],
    visibility: "Only Me",
  });
  const [searchQuery, setSearchQuery] = useState("");

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCriterionChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.map((criterion) =>
        criterion.id === id ? { ...criterion, [field]: value } : criterion
      ),
    }));
  };

  const addCriterion = () => {
    setFormData((prev) => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        {
          id: Date.now(),
          field: "",
          comparator: "",
          value: "",
        },
      ],
    }));
  };

  const removeCriterion = (id) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((criterion) => criterion.id !== id),
    }));
  };

  const moveColumnToSelected = (column) => {
    setFormData((prev) => ({
      ...prev,
      availableColumns: prev.availableColumns.filter((available) => available !== column),
      selectedColumns: [...prev.selectedColumns, column],
    }));
  };

  const moveColumnToAvailable = (column) => {
    setFormData((prev) => ({
      ...prev,
      selectedColumns: prev.selectedColumns.filter((selected) => selected !== column),
      availableColumns: [...prev.availableColumns, column],
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(formData);
  };

  const fieldOptions = [
    "Date",
    "Purchase Order Number",
    "Reference Number",
    "Vendor Name",
    "Status",
    "Billed Status",
    "Amount",
    "Delivery Date",
  ];

  const comparatorOptions = [
    "equals",
    "not equals",
    "contains",
    "does not contain",
    "starts with",
    "ends with",
    "is empty",
    "is not empty",
  ];

  const filteredAvailableColumns = formData.availableColumns.filter((column) =>
    column.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>New Custom View</h2>
          <button onClick={onClose} style={modalStyles.close}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalStyles.body}>
          <div style={modalStyles.section}>
            <div style={modalStyles.nameRow}>
              <div style={{ ...modalStyles.formGroup, ...modalStyles.nameInput }}>
                <label style={modalStyles.label}>
                  Name <span style={{ color: "#156372" }}>*</span>
                </label>
                <input
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={modalStyles.input}
                />
              </div>
              <div style={modalStyles.favoriteCheckbox}>
                <input
                  type="checkbox"
                  name="markAsFavorite"
                  checked={formData.markAsFavorite}
                  onChange={handleChange}
                  id="favorite"
                  style={{ cursor: "pointer" }}
                />
                <label
                  htmlFor="favorite"
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Star
                    size={16}
                    style={{ color: formData.markAsFavorite ? "#fbbf24" : "#9ca3af" }}
                  />
                  Mark as Favorite
                </label>
              </div>
            </div>
          </div>

          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Define the criteria (if any)</div>
            <div style={modalStyles.criteriaContainer}>
              {formData.criteria.map((criterion, index) => (
                <div key={criterion.id} style={modalStyles.criterionRow}>
                  <span style={modalStyles.criterionNumber}>{index + 1}</span>
                  <select
                    style={{ ...modalStyles.input, ...modalStyles.criterionField }}
                    value={criterion.field}
                    onChange={(event) =>
                      handleCriterionChange(criterion.id, "field", event.target.value)
                    }
                  >
                    <option value="">Select a field</option>
                    {fieldOptions.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                  <select
                    style={{ ...modalStyles.input, ...modalStyles.criterionComparator }}
                    value={criterion.comparator}
                    onChange={(event) =>
                      handleCriterionChange(
                        criterion.id,
                        "comparator",
                        event.target.value
                      )
                    }
                  >
                    <option value="">Select a comparator</option>
                    {comparatorOptions.map((comparator) => (
                      <option key={comparator} value={comparator}>
                        {comparator}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    style={{ ...modalStyles.input, ...modalStyles.criterionValue }}
                    value={criterion.value}
                    onChange={(event) =>
                      handleCriterionChange(criterion.id, "value", event.target.value)
                    }
                    placeholder="Value"
                  />
                  {formData.criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriterion(criterion.id)}
                      style={modalStyles.removeButton}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addCriterion} style={modalStyles.addButton}>
              <Plus size={16} />
              Add Criterion
            </button>
          </div>

          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Select Columns</div>
            <div style={modalStyles.columnsContainer}>
              <div style={modalStyles.columnSection}>
                <div style={modalStyles.sectionTitle}>Available Columns</div>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  style={modalStyles.searchInput}
                />
                <div style={modalStyles.columnList}>
                  {filteredAvailableColumns.map((column) => (
                    <button
                      key={column}
                      type="button"
                      onClick={() => moveColumnToSelected(column)}
                      style={modalStyles.columnItem}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.backgroundColor = "#f3f4f6";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <ChevronRight
                        size={14}
                        style={{ display: "inline", marginRight: "8px" }}
                      />
                      {column}
                    </button>
                  ))}
                </div>
              </div>
              <div style={modalStyles.columnSection}>
                <div style={modalStyles.sectionTitle}>Selected Columns</div>
                <div style={modalStyles.columnList}>
                  {formData.selectedColumns.map((column) => (
                    <button
                      key={column}
                      type="button"
                      onClick={() => moveColumnToAvailable(column)}
                      style={modalStyles.columnItem}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.backgroundColor = "#f3f4f6";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <ChevronRight
                        size={14}
                        style={{
                          display: "inline",
                          marginRight: "8px",
                          transform: "rotate(180deg)",
                        }}
                      />
                      {column}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={modalStyles.section}>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Visibility</label>
              <select
                name="visibility"
                value={formData.visibility}
                onChange={handleChange}
                style={modalStyles.input}
              >
                <option value="Only Me">Only Me</option>
                <option value="All Users">All Users</option>
              </select>
            </div>
          </div>

          <div style={modalStyles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...modalStyles.footerButton, ...modalStyles.cancelButton }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ ...modalStyles.footerButton, ...modalStyles.saveButton }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    width: "90%",
    maxWidth: "800px",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
  header: {
    padding: "20px 24px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  close: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: "24px",
  },
  section: {
    marginBottom: "24px",
  },
  nameRow: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-end",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1,
  },
  nameInput: {
    flex: 1,
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
  },
  input: {
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    width: "100%",
    boxSizing: "border-box",
  },
  favoriteCheckbox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    paddingBottom: "8px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111827",
    marginBottom: "12px",
  },
  criteriaContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  criterionRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  criterionNumber: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "600",
    color: "#6b7280",
    flexShrink: 0,
  },
  criterionField: {
    flex: 2,
  },
  criterionComparator: {
    flex: 2,
  },
  criterionValue: {
    flex: 2,
  },
  removeButton: {
    padding: "6px",
    color: "#156372",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    padding: "8px 16px",
    fontSize: "14px",
    color: "#156372",
    background: "none",
    border: "1px solid #156372",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginTop: "8px",
  },
  columnsContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  columnSection: {
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "12px",
  },
  searchInput: {
    padding: "6px 8px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    width: "100%",
    marginBottom: "8px",
    boxSizing: "border-box",
  },
  columnList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    maxHeight: "200px",
    overflowY: "auto",
  },
  columnItem: {
    padding: "6px 8px",
    fontSize: "14px",
    color: "#111827",
    cursor: "pointer",
    borderRadius: "4px",
    border: "none",
    background: "none",
    textAlign: "left",
  },
  footer: {
    padding: "20px 24px",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  footerButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "500",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    color: "#111827",
  },
  saveButton: {
    backgroundColor: "#156372",
    color: "#ffffff",
  },
};
