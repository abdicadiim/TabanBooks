import React, { useMemo, useState } from "react";
import { Eye, EyeOff, Plus, X } from "lucide-react";

interface ChartOfAccountsExportModalsProps {
  isExportCurrentViewModalOpen: boolean;
  isExportModalOpen: boolean;
  isNewTemplateModalOpen: boolean;
  onCloseExportCurrentViewModal: () => void;
  onCloseExportModal: () => void;
  onCloseNewTemplateModal: () => void;
  onOpenNewTemplateModal: () => void;
  selectedViewLabel: string;
}

const DEFAULT_FIELD_MAPPINGS = [
  { id: 1, tabanField: "Account Name", exportField: "Account Name" },
  { id: 2, tabanField: "Account Code", exportField: "Account Code" },
  { id: 3, tabanField: "Account Type", exportField: "Account Type" },
];

const TEMPLATE_FIELDS = [
  "Account Name",
  "Account Code",
  "Account Type",
  "Description",
  "Parent Account Name",
  "Status",
];

function ModalShell({
  children,
  onClose,
  open,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        zIndex: 2500,
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "640px",
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18)",
          overflow: "hidden",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#0f172a" }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              backgroundColor: "transparent",
              color: "#ef4444",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ChartOfAccountsExportModals({
  isExportCurrentViewModalOpen,
  isExportModalOpen,
  isNewTemplateModalOpen,
  onCloseExportCurrentViewModal,
  onCloseExportModal,
  onCloseNewTemplateModal,
  onOpenNewTemplateModal,
  selectedViewLabel,
}: ChartOfAccountsExportModalsProps) {
  const [savedTemplates, setSavedTemplates] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("exportTemplates");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [exportModule, setExportModule] = useState("Chart of Accounts");
  const [exportScope, setExportScope] = useState("all");
  const [specificPeriodStart, setSpecificPeriodStart] = useState("");
  const [specificPeriodEnd, setSpecificPeriodEnd] = useState("");
  const [filterCriteria, setFilterCriteria] = useState("accountDate");
  const [selectedExportTemplate, setSelectedExportTemplate] = useState("");
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [exportFileFormat, setExportFileFormat] = useState("csv");
  const [filePassword, setFilePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [templateName, setTemplateName] = useState("");
  const [fieldMappings, setFieldMappings] = useState(DEFAULT_FIELD_MAPPINGS);

  const templateOptions = useMemo(
    () => savedTemplates.map((template) => template.name),
    [savedTemplates],
  );

  const closeTemplateEditor = () => {
    setTemplateName("");
    setFieldMappings(DEFAULT_FIELD_MAPPINGS);
    onCloseNewTemplateModal();
  };

  const handleAddFieldMapping = () => {
    setFieldMappings((current) => [
      ...current,
      { id: Date.now(), tabanField: TEMPLATE_FIELDS[0], exportField: "" },
    ]);
  };

  const handleFieldMappingChange = (
    fieldId: number,
    nextField: "exportField" | "tabanField",
    value: string,
  ) => {
    setFieldMappings((current) =>
      current.map((mapping) =>
        mapping.id === fieldId ? { ...mapping, [nextField]: value } : mapping,
      ),
    );
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert("Please enter a template name.");
      return;
    }

    const nextTemplates = [
      ...savedTemplates,
      { id: Date.now(), name: templateName.trim(), mappings: fieldMappings },
    ];
    setSavedTemplates(nextTemplates);
    localStorage.setItem("exportTemplates", JSON.stringify(nextTemplates));
    setSelectedExportTemplate(templateName.trim());
    closeTemplateEditor();
  };

  const handleExport = (mode: "all" | "current") => {
    console.log("Exporting chart of accounts", {
      decimalFormat,
      exportFileFormat,
      exportModule,
      exportScope,
      filePassword,
      filterCriteria,
      mode,
      selectedExportTemplate,
      selectedViewLabel,
      specificPeriodEnd,
      specificPeriodStart,
    });

    if (mode === "all") {
      onCloseExportModal();
    } else {
      onCloseExportCurrentViewModal();
    }
  };

  const renderCommonFields = (mode: "all" | "current") => (
    <div style={{ display: "grid", gap: "18px", padding: "22px" }}>
      <div
        style={{
          padding: "12px 14px",
          borderRadius: "10px",
          backgroundColor: "#eff6ff",
          color: "#1d4ed8",
          fontSize: "13px",
        }}
      >
        {mode === "all"
          ? "Export the full chart setup or narrow it by period and criteria."
          : `Export the currently visible view: ${selectedViewLabel}.`}
      </div>

      {mode === "all" && (
        <>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
              Module
            </span>
            <select
              value={exportModule}
              onChange={(event) => setExportModule(event.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
              }}
            >
              <option value="Chart of Accounts">Chart of Accounts</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
              Export Scope
            </span>
            <select
              value={exportScope}
              onChange={(event) => setExportScope(event.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
              }}
            >
              <option value="all">All dates</option>
              <option value="specific">Specific period</option>
            </select>
          </label>

          {exportScope === "specific" && (
            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <label style={{ display: "grid", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                  Start Date
                </span>
                <input
                  type="date"
                  value={specificPeriodStart}
                  onChange={(event) => setSpecificPeriodStart(event.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                  End Date
                </span>
                <input
                  type="date"
                  value={specificPeriodEnd}
                  onChange={(event) => setSpecificPeriodEnd(event.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                  }}
                />
              </label>
            </div>
          )}

          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
              Filter Criteria
            </span>
            <select
              value={filterCriteria}
              onChange={(event) => setFilterCriteria(event.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
              }}
            >
              <option value="accountDate">Account Date</option>
              <option value="createdDate">Created Date</option>
            </select>
          </label>
        </>
      )}

      <div style={{ display: "grid", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
            Export Template
          </span>
          <button
            type="button"
            onClick={onOpenNewTemplateModal}
            style={{
              border: "none",
              backgroundColor: "transparent",
              color: "#156372",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            <Plus size={14} />
            New template
          </button>
        </div>
        <select
          value={selectedExportTemplate}
          onChange={(event) => setSelectedExportTemplate(event.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            fontSize: "14px",
            backgroundColor: "#ffffff",
          }}
        >
          <option value="">Select a template</option>
          {templateOptions.map((templateName) => (
            <option key={templateName} value={templateName}>
              {templateName}
            </option>
          ))}
        </select>
      </div>

      <label style={{ display: "grid", gap: "8px" }}>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
          Decimal Format
        </span>
        <select
          value={decimalFormat}
          onChange={(event) => setDecimalFormat(event.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            fontSize: "14px",
          }}
        >
          <option value="1234567.89">1234567.89</option>
          <option value="1234567,89">1234567,89</option>
        </select>
      </label>

      <div style={{ display: "grid", gap: "10px" }}>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
          File Format
        </span>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          {["csv", "xls", "xlsx"].map((format) => (
            <label
              key={format}
              style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}
            >
              <input
                type="radio"
                name={`file-format-${mode}`}
                checked={exportFileFormat === format}
                onChange={() => setExportFileFormat(format)}
              />
              <span style={{ textTransform: "uppercase" }}>{format}</span>
            </label>
          ))}
        </div>
      </div>

      <label style={{ display: "grid", gap: "8px" }}>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
          File Password
        </span>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={filePassword}
            onChange={(event) => setFilePassword(event.target.value)}
            placeholder="Optional password"
            style={{
              width: "100%",
              padding: "10px 42px 10px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              backgroundColor: "transparent",
              color: "#64748b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
          borderTop: "1px solid #e5e7eb",
          paddingTop: "18px",
        }}
      >
        <button
          type="button"
          onClick={mode === "all" ? onCloseExportModal : onCloseExportCurrentViewModal}
          style={{
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            backgroundColor: "#ffffff",
            color: "#334155",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleExport(mode)}
          style={{
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#156372",
            color: "#ffffff",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Export
        </button>
      </div>
    </div>
  );

  return (
    <>
      <ModalShell
        open={isExportModalOpen}
        onClose={onCloseExportModal}
        title="Export Chart of Accounts"
      >
        {renderCommonFields("all")}
      </ModalShell>

      <ModalShell
        open={isExportCurrentViewModalOpen}
        onClose={onCloseExportCurrentViewModal}
        title="Export Current View"
      >
        {renderCommonFields("current")}
      </ModalShell>

      <ModalShell
        open={isNewTemplateModalOpen}
        onClose={closeTemplateEditor}
        title="New Export Template"
      >
        <div style={{ display: "grid", gap: "18px", padding: "22px" }}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
              Template Name
            </span>
            <input
              type="text"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="Enter template name"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
              }}
            />
          </label>

          <div style={{ display: "grid", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                Field Mappings
              </span>
              <button
                type="button"
                onClick={handleAddFieldMapping}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  color: "#156372",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Plus size={14} />
                Add Field
              </button>
            </div>

            {fieldMappings.map((mapping) => (
              <div
                key={mapping.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                <select
                  value={mapping.tabanField}
                  onChange={(event) =>
                    handleFieldMappingChange(mapping.id, "tabanField", event.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                  }}
                >
                  {TEMPLATE_FIELDS.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={mapping.exportField}
                  onChange={(event) =>
                    handleFieldMappingChange(mapping.id, "exportField", event.target.value)
                  }
                  placeholder="Export column name"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                  }}
                />
                <button
                  type="button"
                  disabled={fieldMappings.length === 1}
                  onClick={() =>
                    setFieldMappings((current) =>
                      current.filter((fieldMapping) => fieldMapping.id !== mapping.id),
                    )
                  }
                  style={{
                    border: "none",
                    borderRadius: "8px",
                    backgroundColor:
                      fieldMappings.length === 1 ? "#e2e8f0" : "#fee2e2",
                    color: fieldMappings.length === 1 ? "#94a3b8" : "#dc2626",
                    width: "38px",
                    height: "38px",
                    cursor: fieldMappings.length === 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              borderTop: "1px solid #e5e7eb",
              paddingTop: "18px",
            }}
          >
            <button
              type="button"
              onClick={closeTemplateEditor}
              style={{
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#334155",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTemplate}
              style={{
                border: "none",
                borderRadius: "8px",
                backgroundColor: "#156372",
                color: "#ffffff",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Save Template
            </button>
          </div>
        </div>
      </ModalShell>
    </>
  );
}

