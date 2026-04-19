import React from "react";

interface ManualJournalAttachmentsCardProps {
  attachments: File[];
  onAddFiles: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
}

export function ManualJournalAttachmentsCard({
  attachments,
  onAddFiles,
  onRemoveFile,
}: ManualJournalAttachmentsCardProps) {
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "20px",
        backgroundColor: "#ffffff",
        padding: "24px",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: "20px",
          fontWeight: 700,
          color: "#111827",
        }}
      >
        Attachments
      </h2>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: "14px",
          color: "#6b7280",
          lineHeight: 1.6,
        }}
      >
        Keep supporting files lightweight here. The editor accepts up to five
        files for this journal.
      </p>

      <div
        style={{
          marginTop: "18px",
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        <label
          style={{
            display: "grid",
            gap: "10px",
            alignContent: "start",
            border: "1px dashed #93c5fd",
            borderRadius: "18px",
            backgroundColor: "#eff6ff",
            padding: "20px",
            color: "#1e3a8a",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 700 }}>Upload files</span>
          <span style={{ fontSize: "13px", lineHeight: 1.6 }}>
            Add receipts, memos, or working papers directly from your device.
          </span>
          <input
            type="file"
            multiple
            onChange={(event) => onAddFiles(event.target.files)}
            style={{ fontSize: "13px" }}
          />
        </label>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "18px",
            backgroundColor: "#f8fafc",
            padding: "18px",
          }}
        >
          {attachments.length === 0 ? (
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              No files attached yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {attachments.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    backgroundColor: "#ffffff",
                    padding: "14px 16px",
                  }}
                >
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
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    style={{
                      border: "1px solid #fecaca",
                      borderRadius: "10px",
                      backgroundColor: "#ffffff",
                      color: "#b91c1c",
                      cursor: "pointer",
                      padding: "8px 12px",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
