import type { AccountDetailController } from "../types";
import { MoneyInOverlayShell } from "./MoneyInOverlayShell";

type EmployeeReimbursementSidebarProps = Pick<
  AccountDetailController,
  | "employeeReimbursementFormData"
  | "setEmployeeReimbursementFormData"
  | "employeeReimbursementEmployeeOpen"
  | "setEmployeeReimbursementEmployeeOpen"
  | "employeeReimbursementEmployeeRef"
  | "handleSaveEmployeeReimbursement"
> & {
  onClose: () => void;
};

export function EmployeeReimbursementSidebar({
  employeeReimbursementFormData,
  setEmployeeReimbursementFormData,
  employeeReimbursementEmployeeOpen,
  setEmployeeReimbursementEmployeeOpen,
  employeeReimbursementEmployeeRef,
  handleSaveEmployeeReimbursement,
  onClose,
}: EmployeeReimbursementSidebarProps) {
  return (
    <MoneyInOverlayShell
      title="Employee Reimbursement"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 20px",
              backgroundColor: "white",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              color: "#111827",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "#f9fafb";
              event.currentTarget.style.borderColor = "#9ca3af";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "white";
              event.currentTarget.style.borderColor = "#d1d5db";
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              handleSaveEmployeeReimbursement();
            }}
            disabled={!employeeReimbursementFormData.employeeName}
            style={{
              padding: "10px 20px",
              backgroundColor: employeeReimbursementFormData.employeeName ? "#156372" : "#d1d5db",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: employeeReimbursementFormData.employeeName ? "pointer" : "not-allowed",
            }}
            onMouseEnter={(event) => {
              if (employeeReimbursementFormData.employeeName) {
                event.currentTarget.style.backgroundColor = "#0e4a5e";
              }
            }}
            onMouseOut={(event) => {
              if (employeeReimbursementFormData.employeeName) {
                event.currentTarget.style.backgroundColor = "#156372";
              }
            }}
          >
            Save
          </button>
        </>
      }
    >
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
          Employee Name<span style={{ color: "#ef4444" }}>*</span>
        </label>
        <div style={{ position: "relative" }} ref={employeeReimbursementEmployeeRef}>
          <button
            type="button"
            onClick={() => setEmployeeReimbursementEmployeeOpen(!employeeReimbursementEmployeeOpen)}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              background: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textAlign: "left",
              color: employeeReimbursementFormData.employeeName ? "#111827" : "#9ca3af",
            }}
          >
            <span>{employeeReimbursementFormData.employeeName || "Select"}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3.5 5.25l3.5 3.5 3.5-3.5"
                stroke="#6b7280"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {employeeReimbursementEmployeeOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                backgroundColor: "white",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                zIndex: 1000,
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {["Employee 1", "Employee 2", "Employee 3", "John Doe", "Jane Smith"].map((employee) => (
                <div
                  key={employee}
                  onClick={() => {
                    setEmployeeReimbursementFormData({
                      ...employeeReimbursementFormData,
                      employeeName: employee,
                    });
                    setEmployeeReimbursementEmployeeOpen(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#111827",
                    backgroundColor:
                      employeeReimbursementFormData.employeeName === employee
                        ? "#eff6ff"
                        : "transparent",
                  }}
                  onMouseEnter={(event) => {
                    if (employeeReimbursementFormData.employeeName !== employee) {
                      event.currentTarget.style.backgroundColor = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (employeeReimbursementFormData.employeeName !== employee) {
                      event.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {employee}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
          Date<span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          type="text"
          value={employeeReimbursementFormData.date}
          onChange={(event) =>
            setEmployeeReimbursementFormData({
              ...employeeReimbursementFormData,
              date: event.target.value,
            })
          }
          placeholder="dd/MM/yyyy"
          disabled={!employeeReimbursementFormData.employeeName}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: !employeeReimbursementFormData.employeeName ? "#f9fafb" : "white",
            color: !employeeReimbursementFormData.employeeName ? "#9ca3af" : "#111827",
            cursor: !employeeReimbursementFormData.employeeName ? "not-allowed" : "text",
          }}
        />
      </div>

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
          Reference#
        </label>
        <input
          type="text"
          value={employeeReimbursementFormData.reference}
          onChange={(event) =>
            setEmployeeReimbursementFormData({
              ...employeeReimbursementFormData,
              reference: event.target.value,
            })
          }
          disabled={!employeeReimbursementFormData.employeeName}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: !employeeReimbursementFormData.employeeName ? "#f9fafb" : "white",
            color: !employeeReimbursementFormData.employeeName ? "#9ca3af" : "#111827",
            cursor: !employeeReimbursementFormData.employeeName ? "not-allowed" : "text",
          }}
        />
      </div>

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
          Description
        </label>
        <textarea
          value={employeeReimbursementFormData.description}
          onChange={(event) =>
            setEmployeeReimbursementFormData({
              ...employeeReimbursementFormData,
              description: event.target.value,
            })
          }
          placeholder="Max 255 characters"
          maxLength={255}
          rows={4}
          disabled={!employeeReimbursementFormData.employeeName}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
            backgroundColor: !employeeReimbursementFormData.employeeName ? "#f9fafb" : "white",
            color: !employeeReimbursementFormData.employeeName ? "#9ca3af" : "#111827",
            cursor: !employeeReimbursementFormData.employeeName ? "not-allowed" : "text",
          }}
        />
      </div>
    </MoneyInOverlayShell>
  );
}
