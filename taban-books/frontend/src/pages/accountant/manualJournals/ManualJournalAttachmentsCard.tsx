import React from "react";
import {
  FileImage,
  FileSpreadsheet,
  FileText,
  Trash2,
  Upload,
} from "lucide-react";

interface ManualJournalAttachmentsCardProps {
  attachments: File[];
  isBusy: boolean;
  onAddFiles: (files: FileList | null) => void;
  onCancel: () => void;
  onPublish: () => void;
  onRemoveFile: (index: number) => void;
  onSaveDraft: () => void;
}

const brandGreen = "#0f766e";
const brandBlue = "#2563eb";

export function ManualJournalAttachmentsCard({
  attachments,
  isBusy,
  onAddFiles,
  onCancel,
  onPublish,
  onRemoveFile,
  onSaveDraft,
}: ManualJournalAttachmentsCardProps) {
  const fileInputId = "manual-journal-attachments-input";

  const getFileVisuals = (name: string) => {
    const extension = name.split(".").pop()?.toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")) {
      return {
        icon: FileImage,
        iconColor: "#0f766e",
        iconBackground: "#ccfbf1",
      };
    }

    if (["xls", "xlsx", "csv"].includes(extension || "")) {
      return {
        icon: FileSpreadsheet,
        iconColor: "#166534",
        iconBackground: "#dcfce7",
      };
    }

    return {
      icon: FileText,
      iconColor: "#1d4ed8",
      iconBackground: "#dbeafe",
    };
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <section
      style={{
        borderTop: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        padding: "14px 0 0",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: "10px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 500,
              color: "#111827",
            }}
          >
            Attachments
          </h2>
        </div>

        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          You can upload a maximum of 5 files, 10MB each
        </div>
      </div>

      <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
        <label
          htmlFor={fileInputId}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            backgroundColor: "#ffffff",
            color: "#374151",
            fontSize: "15px",
            fontWeight: 500,
            width: "fit-content",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          <Upload size={16} />
          Upload File
          <span style={{ color: "#6b7280" }}>▾</span>
          <input
            id={fileInputId}
            type="file"
            multiple
            onChange={(event) => onAddFiles(event.target.files)}
            style={{ display: "none" }}
          />
        </label>

        <div style={{ display: "grid", gap: "8px" }}>
          {attachments.length === 0 ? (
            <div style={{ fontSize: "13px", color: "#6b7280" }}>
              No files attached yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {attachments.map((file, index) => {
                const visuals = getFileVisuals(file.name);
                const FileIcon = visuals.icon;

                return (
                  <div
                    key={`${file.name}-${index}`}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "10px",
                      backgroundColor: "#ffffff",
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "10px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: visuals.iconBackground,
                          color: visuals.iconColor,
                        }}
                      >
                        <FileIcon size={16} />
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#111827",
                          }}
                        >
                          {file.name}
                        </div>

                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveFile(index)}
                      style={{
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        backgroundColor: "#ffffff",
                        color: "#374151",
                        cursor: "pointer",
                        padding: "7px 11px",
                        fontSize: "13px",
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
      </div>

      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          marginTop: "18px",
          padding: "18px 0 22px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <button
            type="button"
            onClick={onPublish}
            disabled={isBusy}
            style={{
              border: "none",
              borderRadius: "8px",
              backgroundColor: brandGreen,
              color: "#ffffff",
              cursor: isBusy ? "not-allowed" : "pointer",
              opacity: isBusy ? 0.7 : 1,
              minHeight: "40px",
              padding: "0 16px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {isBusy ? "Saving..." : "Save and Publish"}
          </button>

          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isBusy}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              color: "#111827",
              cursor: isBusy ? "not-allowed" : "pointer",
              opacity: isBusy ? 0.7 : 1,
              minHeight: "40px",
              padding: "0 14px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={onCancel}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              color: "#111827",
              cursor: "pointer",
              minHeight: "40px",
              padding: "0 14px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
        </div>

        <button
          type="button"
          style={{
            border: "none",
            backgroundColor: "transparent",
            color: brandBlue,
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500,
            padding: "4px 2px",
          }}
        >
          Make Recurring
        </button>
      </div>
    </section>
  );
}
