import React, { useRef } from "react";
import { X, Printer, Menu, Minus, Plus, Maximize, RotateCw, PenTool, Undo2, Redo2, Download, MoreVertical, ChevronDown } from "lucide-react";

const PrintPreviewModal = ({ isOpen, onClose, selectedCredits, allCredits, companyInfo }) => {
    const printRef = useRef();

    if (!isOpen) return null;

    const creditsToPrint = allCredits.filter((c) => selectedCredits.includes(c.id));

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open("", "_blank");
        const printStyles = `
      <style>
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }
          .page-break {
            page-break-after: always;
          }
        }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #111827;
          background: #fff;
        }
        .print-page {
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .logo-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .logo-placeholder {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a56db;
        }
        .company-info {
          font-size: 14px;
          line-height: 1.5;
        }
        .company-name {
          font-weight: 700;
          font-size: 16px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .title-section {
          text-align: right;
        }
        .main-title {
          font-size: 36px;
          font-weight: 400;
          letter-spacing: 1px;
          margin: 0;
        }
        .reference-info {
          margin-top: 12px;
          font-size: 14px;
        }
        .reference-row {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-bottom: 4px;
        }
        .label { color: #6b7280; }
        .value { font-weight: 600; }
        
        .address-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
          margin-top: 40px;
        }
        .address-section {
          font-size: 14px;
        }
        .section-label {
          color: #6b7280;
          margin-bottom: 8px;
          font-size: 13px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
        }
        th {
          background-color: #374151;
          color: #ffffff;
          padding: 12px;
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }
        .text-right { text-align: right; }
        
        .summary-section {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          width: 300px;
          font-size: 14px;
        }
        .total-row {
          font-weight: 700;
          font-size: 15px;
          margin-top: 8px;
        }
        .balance-row {
          background-color: #f9fafb;
          padding: 12px 20px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          margin-top: 12px;
        }
      </style>
    `;

        printWindow.document.write(`
      <html>
        <head>
          <title>Vendor Credits Preview</title>
          ${printStyles}
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const defaultCompanyInfo = {
        name: "TABAN ENTERPRISES",
        addressLine1: "taleex",
        addressLine2: "taleex",
        city: "mogadishu Nairobi 22223",
        country: "Kenya",
        email: "jirdehusseinkhalif@gmail.com"
    };

    const info = companyInfo || defaultCompanyInfo;

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            backgroundColor: "#f3f4f6",
            display: "flex",
            flexDirection: "column"
        }}>
            {/* Top Header */}
            <div style={{
                height: "60px",
                backgroundColor: "#ffffff",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 24px",
                flexShrink: 0
            }}>
                <div style={{ fontSize: "16px", fontWeight: "500", color: "#111827" }}>Preview</div>
                <div style={{ display: "flex", gap: "12px" }}>
                    <button
                        onClick={handlePrint}
                        style={{
                            height: "36px",
                            padding: "0 20px",
                            backgroundColor: "#ff5a5f",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer"
                        }}
                    >
                        Print
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            height: "36px",
                            padding: "0 20px",
                            backgroundColor: "#ffffff",
                            color: "#374151",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer"
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div style={{
                height: "48px",
                backgroundColor: "#333333",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                color: "#ffffff",
                flexShrink: 0
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <Menu size={18} style={{ opacity: 0.8, cursor: "pointer" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                        <span style={{ backgroundColor: "#000", padding: "2px 6px", borderRadius: "2px" }}>1</span>
                        <span style={{ opacity: 0.6 }}>/ {creditsToPrint.length}</span>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <div style={{ height: "24px", width: "1px", backgroundColor: "rgba(255,255,255,0.2)" }} />
                    <Minus size={18} style={{ opacity: 0.8, cursor: "pointer" }} />
                    <Plus size={18} style={{ opacity: 0.8, cursor: "pointer" }} />
                    <div style={{ height: "24px", width: "1px", backgroundColor: "rgba(255,255,255,0.2)" }} />
                    <Maximize size={18} style={{ opacity: 0.8, cursor: "pointer" }} />
                    <RotateCw size={18} style={{ opacity: 0.8, cursor: "pointer" }} />
                    <div style={{ height: "24px", width: "1px", backgroundColor: "rgba(255,255,255,0.2)" }} />
                    <PenTool size={18} style={{ opacity: 0.8, cursor: "pointer" }} />
                    <div style={{ height: "24px", width: "1px", backgroundColor: "rgba(255,255,255,0.2)" }} />
                    <Undo2 size={18} style={{ opacity: 0.8, cursor: "pointer" }} />
                    <Redo2 size={18} style={{ opacity: 0.8, cursor: "pointer" }} />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <Download size={18} style={{ opacity: 0.8, cursor: "pointer" }} />
                    <Printer size={18} onClick={handlePrint} style={{ opacity: 0.8, cursor: "pointer" }} />
                    <MoreVertical size={18} style={{ opacity: 0.8, cursor: "pointer" }} />
                </div>
            </div>

            {/* Document Area */}
            <div style={{
                flex: 1,
                overflow: "auto",
                padding: "40px 0",
                backgroundColor: "#525659",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "24px"
            }}>
                <div ref={printRef}>
                    {creditsToPrint.map((credit, idx) => (
                        <div
                            key={credit.id}
                            className={idx < creditsToPrint.length - 1 ? "page-break" : ""}
                            style={{
                                backgroundColor: "#ffffff",
                                width: "794px", // A4 width at 96 DPI
                                minHeight: "1123px", // A4 height
                                padding: "60px",
                                boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                                boxSizing: "border-box",
                                marginBottom: idx < creditsToPrint.length - 1 ? "0" : "40px"
                            }}
                        >
                            <div className="print-page">
                                {/* Header Section */}
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                                        <div style={{ color: "#1a56db" }}>
                                            {/* Logo: Sun over book with pen */}
                                            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="50" cy="35" r="12" fill="#FDBA74" />
                                                <path d="M50 15V22M65 21L60 26M72 35H65M65 49L60 44M50 55V48M35 49L40 44M28 35H35M35 21L40 26" stroke="#FDBA74" strokeWidth="2" strokeLinecap="round" />
                                                <path d="M25 65L50 55L75 65V75L50 85L25 75V65Z" fill="#1E3A8A" />
                                                <path d="M50 55V85" stroke="#ffffff" strokeWidth="1" />
                                                <path d="M48 90L50 82L52 90H48Z" fill="#1E3A8A" />
                                                <rect x="49" y="85" width="2" height="5" fill="#1E3A8A" />
                                                <path d="M30 68C35 64 45 64 50 66M70 68C65 64 55 64 50 66" stroke="#ffffff" strokeWidth="1" />
                                                <path d="M25 65C40 75 60 75 75 65" stroke="#059669" strokeWidth="4" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: "right" }}>
                                        <h1 style={{ fontSize: "32px", fontWeight: "400", margin: 0, color: "#000" }}>VENDOR CREDITS</h1>
                                        <div style={{ marginTop: "8px", fontSize: "14px" }}>
                                            <div style={{ marginBottom: "4px" }}>CreditNote# <span style={{ fontWeight: "700" }}>{credit.creditNote || credit.id}</span></div>
                                            <div style={{ marginTop: "16px" }}>
                                                <div style={{ color: "#6b7280", fontSize: "12px", marginBottom: "2px" }}>Credits Remaining</div>
                                                <div style={{ fontSize: "18px", fontWeight: "700" }}>KES{parseFloat(credit.balance || credit.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Info Section */}
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
                                    <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                                        <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>{info.name}</div>
                                        <div>{info.addressLine1}</div>
                                        <div>{info.addressLine2}</div>
                                        <div>{info.city}</div>
                                        <div>{info.country}</div>
                                        <div style={{ color: "#1a56db", marginTop: "4px" }}>{info.email}</div>

                                        <div style={{ marginTop: "32px" }}>
                                            <div style={{ color: "#6b7280", marginBottom: "4px" }}>Vendor Address</div>
                                            <div style={{ fontWeight: "700" }}>{credit.vendorName || "you"}</div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: "right", fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                                            <span style={{ color: "#6b7280" }}>Date :</span>
                                            <span style={{ fontWeight: "600" }}>{credit.date ? new Date(credit.date).toLocaleDateString("en-GB") : "03/12/2025"}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                                            <span style={{ color: "#6b7280" }}>Reference number :</span>
                                            <span style={{ fontWeight: "600" }}>{credit.referenceNumber || credit.creditNote || "2222"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "32px" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ backgroundColor: "#333", color: "#fff", padding: "10px", textAlign: "left", fontSize: "12px", width: "40px" }}>#</th>
                                            <th style={{ backgroundColor: "#333", color: "#fff", padding: "10px", textAlign: "left", fontSize: "12px" }}>Item & Description</th>
                                            <th style={{ backgroundColor: "#333", color: "#fff", padding: "10px", textAlign: "right", fontSize: "12px", width: "100px" }}>Qty</th>
                                            <th style={{ backgroundColor: "#333", color: "#fff", padding: "10px", textAlign: "right", fontSize: "12px", width: "100px" }}>Rate</th>
                                            <th style={{ backgroundColor: "#333", color: "#fff", padding: "10px", textAlign: "right", fontSize: "12px", width: "120px" }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(credit.items || [{ itemDetails: "qalin", quantity: 1111, rate: 322, amount: 357742 }]).map((item, i) => (
                                            <tr key={i}>
                                                <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee", fontSize: "13px" }}>{i + 1}</td>
                                                <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee", fontSize: "13px" }}>{item.itemDetails || item.itemName || "qalin"}</td>
                                                <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee", fontSize: "13px", textAlign: "right" }}>
                                                    {parseFloat(item.quantity).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                    <div style={{ fontSize: "11px", color: "#6b7280" }}>pcs</div>
                                                </td>
                                                <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee", fontSize: "13px", textAlign: "right" }}>{parseFloat(item.rate).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee", fontSize: "13px", textAlign: "right" }}>{parseFloat(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Summary */}
                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                    <div style={{ width: "300px", fontSize: "13px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                            <span style={{ color: "#6b7280" }}>Sub Total</span>
                                            <span>{parseFloat(credit.amount || 357742).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "14px", marginTop: "16px", marginBottom: "16px" }}>
                                            <span>Total</span>
                                            <span>KES{parseFloat(credit.amount || 357742).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", backgroundColor: "#f9fafb", borderRadius: "4px", fontWeight: "700" }}>
                                            <span style={{ color: "#6b7280" }}>Credits Remaining</span>
                                            <span>KES{parseFloat(credit.balance || credit.amount || 357742).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PrintPreviewModal;
