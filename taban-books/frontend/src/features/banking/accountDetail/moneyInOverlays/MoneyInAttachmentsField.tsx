import type { RefObject } from "react";

type MoneyInAttachmentsFieldProps = {
  attachments: any[];
  inputRef: RefObject<any>;
  disabled?: boolean;
  onChangeAttachments: (attachments: any[]) => void;
};

export function MoneyInAttachmentsField({
  attachments,
  inputRef,
  disabled = false,
  onChangeAttachments,
}: MoneyInAttachmentsFieldProps) {
  const isMaxedOut = attachments.length >= 5;
  const isButtonDisabled = disabled || isMaxedOut;

  return (
    <div style={{ marginBottom: "24px" }}>
      <label
        style={{
          display: "block",
          fontSize: "14px",
          fontWeight: "500",
          color: "#111827",
          marginBottom: "8px",
        }}
      >
        Attachments
      </label>
      <div style={{ position: "relative" }}>
        <input
          type="file"
          ref={inputRef}
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            if (files.length > 5) {
              alert("You can upload a maximum of 5 files");
              return;
            }

            const validFiles = files.filter((file) => file.size <= 10 * 1024 * 1024);
            if (validFiles.length !== files.length) {
              alert("Each file must be 10MB or less");
            }

            onChangeAttachments([...attachments, ...validFiles]);
            event.currentTarget.value = "";
          }}
          style={{ display: "none" }}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => {
            if (!isButtonDisabled) {
              inputRef.current?.click();
            }
          }}
          disabled={isButtonDisabled}
          style={{
            padding: "10px 16px",
            backgroundColor: isButtonDisabled ? "#f9fafb" : "white",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: isButtonDisabled ? "not-allowed" : "pointer",
            color: isButtonDisabled ? "#9ca3af" : "#111827",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Upload File
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 4.5l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <p
        style={{
          fontSize: "12px",
          color: "#6b7280",
          marginTop: "4px",
          marginBottom: 0,
        }}
      >
        You can upload a maximum of 5 files, 10MB each
      </p>
      {attachments.length > 0 && (
        <div style={{ marginTop: "8px" }}>
          {attachments.map((file, index) => (
            <div
              key={`${file?.name || "attachment"}-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                backgroundColor: "#f9fafb",
                borderRadius: "4px",
                marginTop: "4px",
              }}
            >
              <span style={{ fontSize: "14px", color: "#111827" }}>{file.name}</span>
              <button
                type="button"
                onClick={() => {
                  onChangeAttachments(attachments.filter((_, currentIndex) => currentIndex !== index));
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#ef4444",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
