import React from "react";
import { formatCurrency, formatDate } from "../../utils/formatters"; // Adjust these imports based on existing project structure

interface TransactionPDFDocumentProps {
  data: any;
  config: any;
  moduleType: string; // 'quotes', 'invoices', 'sales_orders', 'purchase_orders', etc.
  organization: any;
  totalsMeta: any;
}

const TransactionPDFDocument: React.FC<TransactionPDFDocumentProps> = ({
  data,
  config,
  moduleType,
  organization,
  totalsMeta
}) => {
  if (!data) return null;

  const hf = config.headerFooter || {};
  const labels = hf.labels || {};
  const details = config.transactionDetails || {};
  const table = config.tableConfig || config.table || {};
  const total = config.totalConfig || config.total || {};

  const isVisible = (section: any, field: string) => {
    const val = section?.[field];
    if (val === false) return false;
    if (typeof val === "object" && val !== null) {
      return val.visible !== false;
    }
    return true;
  };

  const labelFor = (section: any, field: string, fallback: string) => {
    const val = section?.[field];
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null && val.label) return val.label;
    return fallback;
  };

  const fmt = (val: number) => {
    const s = Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const symbol = data.currency || "SOS";
    return total.currencyPosition === "after" ? `${s} ${symbol}` : `${symbol} ${s}`;
  };

  const statusRibbonConfig = (() => {
    const s = (data?.status || "draft").toUpperCase();
    switch (s) {
      case "ACCEPTED":
      case "PAID": return { label: s, color: "#10B981" };
      case "DECLINED":
      case "VOID": return { label: s, color: "#EF4444" };
      case "SENT":
      case "UNPAID": return { label: s, color: "#2563eb" };
      case "PARTIALLY_PAID": return { label: "PARTIALLY PAID", color: "#6366F1" };
      case "OVERDUE": return { label: "OVERDUE", color: "#F59E0B" };
      default: return { label: "DRAFT", color: "#9CA3AF" };
    }
  })();

  const documentTitle = labelFor(hf, "documentTitle", moduleType.replace("_", " ").toUpperCase());

  return (
    <div
      className="print-content"
      style={{ 
        width: "210mm", 
        minHeight: "297mm", 
        position: "relative",
        backgroundColor: config.general?.backgroundColor || "#ffffff",
        color: config.general?.fontColor || "#000000",
        fontFamily: config.general?.fontFamily || "Helvetica, Arial, sans-serif",
        fontSize: `${config.general?.fontSize || 9}pt`,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 20px rgba(0,0,0,0.05)",
        margin: "0 auto"
      }}
    >
      {/* Header Bar */}
      {(hf.headerBgColor || hf.bgImage) && (
        <div style={{ backgroundColor: hf.headerBgColor || "transparent", height: "40px", flexShrink: 0, width: "100%", position: "relative" }}>
          {hf.bgImage && <img src={hf.bgImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
      )}

      <div style={{ 
        padding: `${(hf.headerBgColor || hf.bgImage) ? "0.2in" : (config.general?.margins?.top || 0.7) + "in"} ${config.general?.margins?.right || 0.4}in 0 ${config.general?.margins?.left || 0.55}in`,
        flex: 1,
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Status Ribbon */}
        <div style={{
          position: "absolute",
          top: "0",
          left: "0",
          width: "200px",
          height: "200px",
          overflow: "hidden",
          zIndex: 10,
          pointerEvents: "none"
        }}>
          <div style={{
            position: "absolute",
            top: "25px",
            left: "-50px",
            width: "200px",
            backgroundColor: statusRibbonConfig.color,
            color: "#ffffff",
            textAlign: "center",
            fontSize: "11px",
            fontWeight: "700",
            padding: "6px 0",
            transform: "rotate(-45deg)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}>
            {statusRibbonConfig.label}
          </div>
        </div>

        {/* 3-Column Header Area */}
        <div className="flex justify-between items-start mb-10 pb-8" style={{ borderBottom: `2px solid ${config.general?.borderColor || "#e5e7eb"}22` }}>
          {/* Left Column: Organization Branding */}
          <div style={{ width: "33%" }}>
            {isVisible(details, "showOrgName") && (
              <div style={{ 
                fontSize: `${details.orgNameFontSize || 14}pt`, 
                fontWeight: "700", 
                color: details.orgNameColor || "#111827", 
                marginBottom: "4px" 
              }}>
                {organization?.name || "Organization Name"}
              </div>
            )}
            <div style={{ fontSize: "10pt", color: "#6b7280", lineHeight: "1.5" }}>
              {isVisible(details, "showOrgAddress") && (
                <div>{organization?.address?.city || organization?.address?.country || "Somalia"}</div>
              )}
              {isVisible(details, "showOrgEmail") && (
                <div>{organization?.email || ""}</div>
              )}
            </div>
          </div>

          {/* Middle Column: QR / Logo Placeholder Area */}
          <div style={{ width: "33%", display: "flex", justifyContent: "center" }}>
            {isVisible(details, "showOrgLogo") && (details.orgLogo || organization?.logo) && (
              <div style={{ padding: "8px", backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: "4px" }}>
                <img src={details.orgLogo || organization?.logo} alt="Logo" style={{ maxHeight: "60px", maxWidth: "120px", objectFit: "contain" }} />
              </div>
            )}
          </div>

          {/* Right Column: Title & Reference Area */}
          <div style={{ width: "33%", textAlign: "right" }}>
            {isVisible(hf, "showDocumentTitle") && (
              <div style={{ 
                fontSize: `${hf.titleFontSize || 28}pt`, 
                fontWeight: "800", 
                color: hf.titleFontColor || "#111827",
                textTransform: "uppercase", 
                letterSpacing: "1px"
              }}>
                {documentTitle}
              </div>
            )}
            <div style={{ fontSize: "14pt", fontWeight: "700", color: config.general?.fontColor || "#111827", marginTop: "-4px" }}>
              {labelFor(labels, "numberField", moduleType.replace("_", " ").toUpperCase() + "#")} {data.number || data.id || "17"}
            </div>
            <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "4px" }}>
              Phone: {organization?.phone || "000-000-0000"}<br />
              Fax: {organization?.fax || "000-000-0000"}
            </div>
          </div>
        </div>

        {/* Bill To & Date Area */}
        <div className="mb-8" style={{ borderBottom: `1px solid ${config.general?.borderColor || "#e5e7eb"}`, paddingBottom: "12px" }}>
          <div className="flex justify-between items-end">
            <div>
              <div style={{ fontSize: "11pt", color: config.general?.labelColor || "#6b7280", fontWeight: "600", marginBottom: "6px" }}>
                {labelFor(labels, "billToField", "Bill To")}
              </div>
              <div style={{ 
                fontSize: `${details.custNameFontSize || 14}pt`, 
                color: details.custNameColor || "#2563eb", 
                fontWeight: "700", 
                lineHeight: "1.2"
              }}>
                {data.customerName || "Customer Name"}
              </div>
              <div style={{ fontSize: "11px", color: "#4b5563", maxWidth: "400px", lineHeight: "1.5", marginTop: "4px" }}>
                {data.billingAddress || ""}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: "11pt", color: config.general?.fontColor || "#111827" }}>
              <div className="flex justify-end gap-2">
                <span className="font-semibold" style={{ color: config.general?.labelColor || "#6b7280" }}>Date:</span>
                <span>{formatDate(data.date || data.createdAt)}</span>
              </div>
              {data.expiryDate && (
                <div className="flex justify-end gap-2">
                  <span className="font-semibold" style={{ color: config.general?.labelColor || "#6b7280" }}>Expiry Date:</span>
                  <span>{formatDate(data.expiryDate)}</span>
                </div>
              )}
              {data.referenceNumber && (
                <div className="flex justify-end gap-2">
                  <span className="font-semibold" style={{ color: config.general?.labelColor || "#6b7280" }}>Reference#:</span>
                  <span>{data.referenceNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ 
                backgroundColor: table.showHeaderBg !== false ? (table.headerBgColor || "#f97316") : "transparent",
                color: table.headerFontColor || "#ffffff"
              }}>
                {isVisible(table.labels, "lineNumber") && (
                  <th style={{ padding: "12px 16px", textAlign: "center", fontSize: `${table.headerFontSize || 10}pt`, fontWeight: "600", width: "5%" }}>#</th>
                )}
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: `${table.headerFontSize || 10}pt`, fontWeight: "600", width: "45%" }}>Item & Description</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: `${table.headerFontSize || 10}pt`, fontWeight: "600", width: "15%" }}>Qty</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: `${table.headerFontSize || 10}pt`, fontWeight: "600", width: "15%" }}>Rate</th>
                {isVisible(table.labels, "taxPercent") && (
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: `${table.headerFontSize || 10}pt`, fontWeight: "600", width: "10%" }}>VAT %</th>
                )}
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: `${table.headerFontSize || 10}pt`, fontWeight: "600", width: "10%" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map((item: any, idx: number) => (
                <tr key={idx} style={{ 
                  backgroundColor: (idx % 2 === 0) ? (table.rowBgColor || "transparent") : (table.altRowBgColor || "transparent"),
                  borderBottom: `1px solid ${table.borderColor || "#f3f4f6"}`
                }}>
                  {isVisible(table.labels, "lineNumber") && (
                    <td style={{ padding: "12px 16px", textAlign: "center", verticalAlign: "top", color: table.rowFontColor || "#111827", fontSize: "10pt" }}>{idx + 1}</td>
                  )}
                  <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: "600", color: table.rowFontColor || "#2563eb", fontSize: "10pt" }}>{item.name || item.description || "Item"}</div>
                    <div style={{ fontSize: "9pt", color: "#6b7280", marginTop: "2px" }}>{item.description}</div>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", verticalAlign: "top", color: table.rowFontColor || "#111827", fontSize: "10pt" }}>
                    <div>{item.quantity?.toFixed(2)}</div>
                    <div style={{ fontSize: "8pt", color: "#9ca3af" }}>{item.unit || "pcs"}</div>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", verticalAlign: "top", color: table.rowFontColor || "#111827", fontSize: "10pt" }}>{fmt(item.rate || item.unitPrice || 0)}</td>
                  {isVisible(table.labels, "taxPercent") && (
                    <td style={{ padding: "12px 16px", textAlign: "right", verticalAlign: "top", color: table.rowFontColor || "#111827", fontSize: "10pt" }}>{item.taxRate || 0}%</td>
                  )}
                  <td style={{ padding: "12px 16px", textAlign: "right", verticalAlign: "top", color: table.rowFontColor || "#111827", fontSize: "10pt" }}>{fmt(item.amount || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-10">
          <div style={{ 
            width: "360px", 
            backgroundColor: total.showBg !== false ? (total.bgColor || "#ef4444") : "transparent",
            padding: "24px", 
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
          }}>
            <div className="flex justify-between py-2 items-center">
              <span style={{ fontSize: `${total.fontSize || 11}pt`, color: total.showBg !== false ? "#ffffff" : (total.fontColor || "#4b5563"), fontWeight: "600" }}>Sub Total</span>
              <span style={{ fontSize: `${total.fontSize || 11}pt`, color: total.showBg !== false ? "#ffffff" : (total.fontColor || "#111827"), fontWeight: "700" }}>{fmt(totalsMeta.subTotal || 0)}</span>
            </div>
            <div className="flex justify-between py-2 items-center">
              <span style={{ fontSize: `${total.fontSize || 11}pt`, color: total.showBg !== false ? "#ffffff" : (total.fontColor || "#4b5563"), fontWeight: "600" }}>{totalsMeta.taxLabel || "Tax"}</span>
              <span style={{ fontSize: `${total.fontSize || 11}pt`, color: total.showBg !== false ? "#ffffff" : (total.fontColor || "#111827"), fontWeight: "700" }}>{fmt(totalsMeta.taxAmount || 0)}</span>
            </div>
            <div className="flex justify-between py-2 items-center">
              <span style={{ fontSize: `${total.fontSize || 11}pt`, color: total.showBg !== false ? "#ffffff" : (total.fontColor || "#4b5563"), fontWeight: "600" }}>Shipping charge</span>
              <span style={{ fontSize: `${total.fontSize || 11}pt`, color: total.showBg !== false ? "#ffffff" : (total.fontColor || "#111827"), fontWeight: "700" }}>{fmt(data.shippingCharges || 0)}</span>
            </div>
            <div className="flex justify-between py-4 mt-4 border-t border-white/20">
              <span style={{ fontSize: `${(total.fontSize || 12) + 2}pt`, fontWeight: "800", color: "#ffffff", textTransform: "uppercase" }}>Total</span>
              <span style={{ fontSize: `${(total.fontSize || 12) + 2}pt`, fontWeight: "800", color: "#ffffff" }}>{fmt(totalsMeta.total || 0)}</span>
            </div>
          </div>
        </div>

        {total.showAmountInWords && (
          <div className="mb-8" style={{ fontSize: "11px", color: "#6b7280" }}>
            <span className="font-semibold" style={{ color: "#374151" }}>Total In Words: </span>
            {totalsMeta.totalInWords || "N/A"}
          </div>
        )}

        {/* Notes Section */}
        <div className="mt-auto pt-4" style={{ borderTop: `1px dashed ${config.general?.borderColor || "#e5e7eb"}` }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: config.general?.fontColor || "#111827", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.2px" }}>Notes</div>
          <div style={{ fontSize: "10px", color: config.general?.labelColor || "#4b5563", lineHeight: "1.6" }}>{data.customerNotes || "Looking forward for your business."}</div>
        </div>
      </div>

      {/* Footer Bar */}
      {(hf.footerBgColor || hf.footerBgImage || hf.showPageNumber !== false) && (
        <div style={{ 
          backgroundColor: hf.footerBgColor || "transparent", 
          height: "40px", 
          flexShrink: 0, 
          width: "100%", 
          position: "relative", 
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: hf.pageNumberPosition === "Left" ? "flex-start" : hf.pageNumberPosition === "Center" ? "center" : "flex-end",
          padding: "0 20px",
          backgroundImage: hf.footerBgImage ? `url(${hf.footerBgImage})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}>
          {hf.showPageNumber !== false && (
            <span style={{ 
              fontSize: "10px", 
              color: (hf.footerBgColor || hf.footerBgImage) ? "#ffffff" : (hf.footerFontColor || "#6C718A")
            }}>
              1
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionPDFDocument;
