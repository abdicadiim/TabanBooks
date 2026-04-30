import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronDown, ExternalLink, X } from "lucide-react";

import {
  ACCOUNTANT_DIRECTORY_COUNTRIES,
  ACCOUNTANT_DIRECTORY_ENTRIES,
} from "../accountantDirectoryData";

interface ChartOfAccountsFindAccountantsSidebarProps {
  onClose: () => void;
  open: boolean;
}

export function ChartOfAccountsFindAccountantsSidebar({
  onClose,
  open,
}: ChartOfAccountsFindAccountantsSidebarProps) {
  const [selectedCountry, setSelectedCountry] = useState("Kenya");
  const [selectedAccountant, setSelectedAccountant] = useState<any | null>(null);

  const visibleAccountants = useMemo(
    () =>
      ACCOUNTANT_DIRECTORY_ENTRIES.filter(
        (accountant) =>
          accountant.country === selectedCountry &&
          accountant.id !== selectedAccountant?.id,
      ),
    [selectedAccountant?.id, selectedCountry],
  );

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.28)",
          zIndex: 1999,
        }}
        onClick={onClose}
      />

      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "420px",
          backgroundColor: "#ffffff",
          boxShadow: "-8px 0 24px rgba(15, 23, 42, 0.12)",
          zIndex: 2000,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#0f172a" }}>
              Find Accountants
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
              Browse trusted accounting partners by country.
            </p>
          </div>
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
              padding: "6px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px", overflowY: "auto", display: "grid", gap: "18px" }}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Country</span>
            <div style={{ position: "relative" }}>
              <select
                value={selectedCountry}
                onChange={(event) => {
                  setSelectedCountry(event.target.value);
                  setSelectedAccountant(null);
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  fontSize: "14px",
                  appearance: "none",
                }}
              >
                {ACCOUNTANT_DIRECTORY_COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "#64748b",
                }}
              />
            </div>
          </label>

          {selectedAccountant ? (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "16px",
                padding: "18px",
                display: "grid",
                gap: "16px",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedAccountant(null)}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  color: "#156372",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: 0,
                  width: "fit-content",
                }}
              >
                <ChevronLeft size={16} />
                Back to list
              </button>

              <div style={{ display: "flex", gap: "14px" }}>
                <div
                  style={{
                    width: "96px",
                    height: "96px",
                    borderRadius: "14px",
                    backgroundColor: selectedAccountant.logoColors.bg,
                    color: selectedAccountant.logoColors.text,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {selectedAccountant.logo}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#0f172a" }}>
                    {selectedAccountant.name}
                  </h3>
                  <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#64748b" }}>
                    {selectedAccountant.company}
                  </p>
                  <div
                    style={{
                      marginTop: "12px",
                      display: "grid",
                      gap: "6px",
                      fontSize: "13px",
                      color: "#156372",
                    }}
                  >
                    <div>{selectedAccountant.country}</div>
                    <div>{selectedAccountant.phone}</div>
                    <div>{selectedAccountant.email}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                  Description
                </h4>
                <p style={{ margin: "8px 0 0", fontSize: "13px", lineHeight: 1.7, color: "#156372" }}>
                  {selectedAccountant.description}
                </p>
              </div>

              <div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                  Services
                </h4>
                <p style={{ margin: "8px 0 0", fontSize: "13px", lineHeight: 1.7, color: "#156372" }}>
                  {selectedAccountant.services.join(", ")}
                </p>
              </div>

              <a
                href={selectedAccountant.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#d97706",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Visit Website
                <ExternalLink size={14} />
              </a>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {visibleAccountants.map((accountant) => (
                <button
                  key={accountant.id}
                  type="button"
                  onClick={() => setSelectedAccountant(accountant)}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "16px",
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      width: "84px",
                      height: "84px",
                      borderRadius: "12px",
                      backgroundColor: accountant.logoColors.bg,
                      color: accountant.logoColors.text,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {accountant.logo}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                      {accountant.name}
                    </div>
                    <div style={{ marginTop: "4px", fontSize: "13px", color: "#64748b" }}>
                      {accountant.company}
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "12px", lineHeight: 1.7, color: "#156372" }}>
                      {accountant.services.join(", ")}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#f8fafc",
              fontSize: "13px",
              color: "#156372",
            }}
          >
            Want to be listed as an accountant?{" "}
            <a
              href="#"
              onClick={(event) => event.preventDefault()}
              style={{ color: "#d97706", textDecoration: "none", fontWeight: 600 }}
            >
              Apply now
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
