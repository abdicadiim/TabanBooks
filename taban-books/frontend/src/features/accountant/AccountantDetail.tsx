import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X } from "lucide-react";

interface Accountant {
  id: number;
  name: string;
  company: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  logoColors: { bg: string; text: string; };
  description: string;
  services: string[];
}

const accountants: Accountant[] = [
  {
    id: 1,
    name: "Pardip Rai",
    company: "IKA Three Sixty",
    country: "Kenya",
    phone: "+254734360360",
    email: "pardip@ika360.cc",
    website: "https://ika360.cc",
    logo: "IKA360",
    logoColors: { bg: "#10b981", text: "white" },
    description: "We provide services from setting up your business, analyzing and implementing processes, digital marketing, and creating work efficiency within the organization.",
    services: ["Bookkeeping", "Business Consultation", "Inventory Control", "Monthly Accounting Services", "VAT", "Taban Books Setup", "Taban Books Training"]
  },
  {
    id: 2,
    name: "Collins Mugodo",
    company: "Finlanza Limited",
    country: "Kenya",
    phone: "+254724463536",
    email: "collins@finlanza.com",
    website: "https://finlanza.com",
    logo: "finlanza",
    logoColors: { bg: "#10b981", text: "white" },
    description: "Professional accounting and financial services for businesses of all sizes.",
    services: ["Bookkeeping", "Tax Preparation", "Financial Planning", "Business Consultation"]
  },
  {
    id: 3,
    name: "Brain Mungai",
    company: "IRIS IMPORTS EXPORTS AN...",
    country: "Kenya",
    phone: "+254 718739904",
    email: "info@iris-iebs.com",
    website: "https://iris-iebs.com",
    logo: "Iris",
    logoColors: { bg: "#a855f7", text: "white" },
    description: "Comprehensive accounting and business services.",
    services: ["Bookkeeping", "Accounting Services", "Business Setup", "Tax Services"]
  },
  {
    id: 4,
    name: "Francis Waweru",
    company: "FNJ & Associates (CPAs)",
    country: "Kenya",
    phone: "+254 100 580 422",
    email: "info@fnjassociates.co.ke",
    website: "https://fnjassociates.co.ke",
    logo: "FNJ",
    logoColors: { bg: "#0d9488", text: "white" },
    description: "Certified Public Accountants providing professional accounting and advisory services.",
    services: ["Auditing", "Tax Services", "Business Consultation", "Financial Advisory"]
  }
];

function AccountantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [accountant, setAccountant] = useState<Accountant | null>(null);

  useEffect(() => {
    if (!id) return;
    const found = accountants.find(acc => acc.id === parseInt(id));
    if (found) {
      setAccountant(found);
    } else {
      navigate("/accountant/manual-journals");
    }
  }, [id, navigate]);

  if (!accountant) {
    return (
      <div style={{
        minHeight: "calc(100vh - 60px)",
        backgroundColor: "#f7f8fc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ fontSize: "16px", color: "#6b7280" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", backgroundColor: "#f7f8fc", padding: "24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => navigate("/accountant/manual-journals")}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14px"
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#111827";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#6b7280";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
          <h1 style={{
            fontSize: "24px",
            fontWeight: "600",
            margin: 0,
            color: "#111827"
          }}>
            Accountant Details
          </h1>
        </div>

        {/* Main Content Card */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          padding: "32px"
        }}>
          {/* Accountant Info Section */}
          <div style={{ display: "flex", gap: "24px", marginBottom: "32px" }}>
            {/* Logo Card */}
            <div style={{
              width: "120px",
              height: "120px",
              borderRadius: "12px",
              backgroundColor: accountant.logoColors.bg,
              color: accountant.logoColors.text,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: "700",
              flexShrink: 0,
              position: "relative"
            }}>
              {accountant.logo}
              <div style={{
                position: "absolute",
                bottom: "8px",
                left: "8px",
                right: "8px",
                fontSize: "9px",
                fontWeight: "600",
                textAlign: "center",
                padding: "4px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px"
              }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 0.5L6.125 3.875L9.5 5L6.125 6.125L5 9.5L3.875 6.125L0.5 5L3.875 3.875L5 0.5Z" fill="currentColor" />
                </svg>
                Finance Authorised Partner
              </div>
            </div>

            {/* Details */}
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: "20px",
                fontWeight: "600",
                margin: 0,
                marginBottom: "8px",
                color: "#111827"
              }}>
                {accountant.name}
              </h2>
              <div style={{
                fontSize: "16px",
                color: "#6b7280",
                marginBottom: "16px"
              }}>
                {accountant.company}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#6b7280" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <path d="M2 14C2 11.2386 4.23858 9 7 9H9C11.7614 9 14 11.2386 14 14" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                  {accountant.country}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#6b7280" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 3C3 2.44772 3.44772 2 4 2H5.5C6.32843 2 7 2.67157 7 3.5V12.5C7 13.3284 6.32843 14 5.5 14H4C3.44772 14 3 13.5523 3 13V3Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <path d="M7 4H12.5C13.3284 4 14 4.67157 14 5.5V10.5C14 11.3284 13.3284 12 12.5 12H7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                  {accountant.phone}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#6b7280" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4C2 3.44772 2.44772 3 3 3H13C13.5523 3 14 3.44772 14 4V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <path d="M2 5L8 9L14 5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                  {accountant.email}
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div style={{ marginBottom: "32px", paddingBottom: "32px", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{
              fontSize: "16px",
              fontWeight: "600",
              margin: 0,
              marginBottom: "12px",
              color: "#111827"
            }}>
              Description
            </h3>
            <p style={{
              fontSize: "14px",
              color: "#6b7280",
              lineHeight: "1.6",
              margin: 0
            }}>
              {accountant.description}
            </p>
          </div>

          {/* Services Offered Section */}
          <div style={{ marginBottom: "32px" }}>
            <h3 style={{
              fontSize: "16px",
              fontWeight: "600",
              margin: 0,
              marginBottom: "12px",
              color: "#111827"
            }}>
              Services Offered
            </h3>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px"
            }}>
              {accountant.services.map((service, index) => (
                <span
                  key={index}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "#111827"
                  }}
                >
                  {service}
                </span>
              ))}
            </div>
          </div>

          {/* Visit Website Link */}
          <div style={{
            paddingTop: "24px",
            borderTop: "1px solid #e5e7eb"
          }}>
            <a
              href={accountant.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                color: "#156372",
                textDecoration: "none",
                fontWeight: "500"
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"}
              onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M5 8L6.5 9.5L11 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Visit Website
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountantDetail;


