import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, Eye, EyeOff, Plus, X, Settings2, PanelTop, FileText, TableProperties, Sigma, FileCog, Settings, Loader2, Star, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";
import { pdfTemplatesAPI } from "../../services/api";
import TemplateEditorModal from "./pdfTemplates/TemplateEditorModal";
import { TEMPLATE_TYPES, COLOR_THEMES } from "./pdfTemplates/constants";
import { useAppBootstrap } from "../../context/AppBootstrapContext";

const TYPE_ORDER = [
  "quotes",
  "sales-orders",
  "invoices",
  "sales-receipts",
  "credit-notes",
  "purchase-orders",
  "retainer-invoices",
  "payment-receipts",
  "retainer-payment-receipts",
  "customer-statements",
  "bills",
  "vendor-credits",
  "vendor-payments",
  "vendor-statements",
  "journals",
  "quantity-adjustments",
  "value-adjustments",
];

const GALLERY = [
  { id: "std-1", name: "Standard", family: "standard", preview: "standard" },
  { id: "std-2", name: "Standard - Japanese Style", family: "standard", preview: "standard" },
  { id: "std-3", name: "Standard - European Style", family: "standard", preview: "standard" },
  { id: "ss-1", name: "Spreadsheet", family: "spreadsheet", preview: "spreadsheet" },
  { id: "ss-2", name: "Spreadsheet - Compact", family: "spreadsheet", preview: "spreadsheet" },
  { id: "pr-1", name: "Premium - Clean", family: "premium", preview: "standard" },
  { id: "un-1", name: "Universal - Basic", family: "universal", preview: "standard" },
  { id: "rt-1", name: "Retail - Compact", family: "retail", preview: "spreadsheet" },
];

const GALLERY_TABS = [
  { id: "all", label: "All", family: null },
  { id: "standard", label: "Standard", family: "standard" },
  { id: "spreadsheet", label: "Spreadsheet", family: "spreadsheet" },
  { id: "premium", label: "Premium", family: "premium" },
  { id: "universal", label: "Universal", family: "universal" },
  { id: "retail", label: "Retail", family: "retail" },
];

const LANGUAGES = ["English", "Japanese", "Arabic", "French", "Spanish", "German", "Chinese", "Hindi", "Somali"];
const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();

const moduleDefaults = (type: string) => {
  if (type === "sales-orders") return { showDeliveryMethod: true, deliveryMethodLabel: "Delivery Method" };
  if (type === "invoices") return { usePaymentStub: false, showOnlinePaymentLink: true };
  if (type === "purchase-orders") return { showShipmentPreference: true, shipmentPreferenceLabel: "Shipment Preference" };
  if (type === "payment-receipts") return { showPaymentRefund: true, showInvoiceDetails: true };
  if (type === "package-slips") return { showTrackingNumber: true, trackingNumberLabel: "Tracking Number" };
  return {};
};

const buildConfig = (type: string, label: string, name: string) => ({
  general: {
    templateName: name || "Standard Template",
    paperSize: "A4",
    pdfFont: "Helvetica",
    showOrganizationLogo: true,
    attentionContent: "",
    backgroundColor: "#ffffff",
    colorTheme: "default",
    margins: { top: 0.7, right: 0.4, bottom: 0.7, left: 0.55 },
    orientation: "portrait",
    fontColor: "#333333",
    labelColor: "#334155",
    fontSize: 9,
    backgroundPosition: "Center center",
  },
  headerFooter: {
    documentTitle: label || "Document",
    titleFontSize: 18,
    titleColor: "#0f172a",
    headerContent: "",
    applyFirstPageOnly: false,
    repeatHeader: true,
    labels: {
      numberField: { label: `${label}#`, visible: true },
      dateField: { label: `${label} Date`, visible: true },
      dueDateField: { label: "Due Date", visible: true },
      referenceField: { label: "Reference#", visible: true },
      billToField: { label: "Bill To", visible: true },
      shipToField: { label: "Ship To", visible: false },
    },
  },
  transactionDetails: {
    fields: {
      item: { label: "Item", visible: true },
      description: { label: "Description", visible: true },
      quantity: { label: "Quantity", visible: true },
      rate: { label: "Rate", visible: true },
      taxPercent: { label: "Tax(%)", visible: true },
      amount: { label: "Amount", visible: true },
    },
  },
  table: {
    labels: {
      subTotal: { label: "Sub Total", visible: true },
      taxTotal: { label: "Tax Total", visible: true },
      shippingCharges: { label: "Shipping Charges", visible: true },
      total: { label: "Total", visible: true },
    },
    currencySymbolPosition: "before",
  },
  total: {
    labels: {
      total: { label: "Total", visible: true },
      subTotal: { label: "Sub Total", visible: true },
      balanceDue: { label: "Balance Due", visible: true },
    },
    fontSize: 12,
    fontColor: "#0f172a",
  },
  moduleSpecific: moduleDefaults(type),
});

const seedTemplates = () =>
  TEMPLATE_TYPES.map((row) => ({
    id: `${row.id}-default`,
    moduleType: row.id,
    name: "Standard Template",
    language: "English",
    status: "active",
    isDefault: true,
    family: "standard",
    preview: "standard",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    config: buildConfig(row.id, row.label, "Standard Template"),
  }));

const ensureDefault = (rows: any[], type: string) => {
  const inType = rows.filter((row) => row.moduleType === type);
  if (!inType.length) return rows;
  if (inType.some((row) => row.isDefault && row.status === "active")) return rows;
  const pick = inType.find((row) => row.status === "active") || inType[0];
  return rows.map((row) => (row.moduleType === type ? { ...row, isDefault: row.id === pick.id } : row));
};

function MiniSheet({ variant = "standard", config, typeId, organization }: { variant?: string; config?: any; typeId: string; organization?: any }) {
  const typeLabel = TEMPLATE_TYPES.find(t => t.id === typeId)?.label || "Document";
  const label = typeId.replace(/-/g, " ").toLowerCase();
  const isRetainer = label.includes("retainer invoice") && !label.includes("payment");
  const isSalesReceipt = label === "sales receipts" || label === "sales receipt";
  const isPaymentReceipt = (label.includes("receipt") || label.includes("payment")) && !isSalesReceipt;

  const pdfFont = config?.general?.pdfFont || "Inter, sans-serif";
  const docTitle = config?.headerFooter?.documentTitle || typeLabel.split(" ")[0];
  const bgColor = config?.general?.backgroundColor || "#ffffff";
  const fontColor = config?.general?.fontColor || "#1f2937";
  const labelColor = config?.general?.labelColor || "#6b7280";
  const themeId = config?.general?.colorTheme || "default";
  const theme = COLOR_THEMES.find((t) => t.id === themeId) || COLOR_THEMES[0];

  const headerBgColor = config?.headerFooter?.headerBgColor;
  const headerBgImage = config?.headerFooter?.bgImage;
  const footerBgColor = config?.headerFooter?.footerBgColor;
  const footerBgImage = config?.headerFooter?.footerBgImage;
  const showPageNumber = config?.headerFooter?.showPageNumber !== false;
  const pageNumberPosition = config?.headerFooter?.pageNumberPosition || "Right";

  return (
    <div
      className="h-full w-full rounded shadow-sm border border-gray-100 flex flex-col overflow-hidden text-[7px] relative"
      style={{ 
        fontFamily: pdfFont, 
        color: fontColor, 
        backgroundColor: bgColor,
        padding: "0" // Remove default padding to allow bg bars to touch edges
      }}
    >
      {/* Header Bar */}
      {(headerBgColor || headerBgImage) && (
        <div style={{ backgroundColor: headerBgColor || "transparent", height: "15px", flexShrink: 0, width: "100%", position: "relative" }}>
          {headerBgImage && <img src={headerBgImage} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        </div>
      )}

      <div style={{ padding: "8px", flex: 1, display: "flex", flexDirection: "column" }}>
      {(() => {
        const orgName = organization?.name || "Organization Name";
        const orgAddress = organization?.address;

        const headerFooter = config?.headerFooter || {};
        const general = config?.general || {};
        const billToLabel = headerFooter.labels?.billToField?.label || "Bill To";
        const billToVisible = headerFooter.labels?.billToField?.visible !== false;

        if (isRetainer) {
          return (
            <>
              <div className="flex justify-between mb-3 border-b border-gray-100 pb-1" style={{ borderColor: `${labelColor}20` }}>
                <div style={{ maxWidth: "46%" }}>
                  <div style={{ fontWeight: "700", fontSize: "8px", color: theme.accent }}>{orgName}</div>
                  <div style={{ fontSize: "5px", color: labelColor }}>{orgAddress}</div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: "14px", fontWeight: "300", textTransform: "uppercase", color: theme.accent }}>{docTitle}</div>
                  <div style={{ fontSize: "8px", fontWeight: "600", marginTop: "1px", color: fontColor }}>SOS 630.00</div>
                </div>
              </div>
              <div className="flex justify-between mb-2" style={{ fontSize: "6px" }}>
                <div>
                  {billToVisible && (
                    <>
                      <div style={{ color: labelColor }}>{billToLabel}</div>
                      <div style={{ fontWeight: "600", color: "#2563eb" }}>Rob & Joe Traders</div>
                    </>
                  )}
                </div>
                <div className="text-right" style={{ color: labelColor }}>
                  <div style={{ color: fontColor, fontWeight: "600" }}># RE-17</div>
                  <div>27/04/2026</div>
                </div>
              </div>
              <div className="border border-gray-100 rounded overflow-hidden mb-2" style={{ borderColor: `${labelColor}20` }}>
                <div className="grid grid-cols-[10px_1fr_30px] bg-[#383b3c] text-white p-1" style={{ fontSize: "4px" }}>
                  <span>#</span><span>Description</span><span className="text-right">Amount</span>
                </div>
                <div className="grid grid-cols-[10px_1fr_30px] p-1 border-t border-gray-50" style={{ borderColor: `${labelColor}10`, fontSize: "4px" }}>
                  <span>1</span><span>Project Retainer</span><span className="text-right">500.00</span>
                </div>
                <div className="grid grid-cols-[10px_1fr_30px] p-1 border-t border-gray-50" style={{ borderColor: `${labelColor}10`, fontSize: "4px" }}>
                  <span>2</span><span>Setup Fee</span><span className="text-right">130.00</span>
                </div>
              </div>
              <div className="mt-auto self-end w-20 pt-1 border-t border-gray-100" style={{ borderColor: `${labelColor}20` }}>
                <div className="flex justify-between font-bold" style={{ fontSize: "6px", color: theme.accent }}>
                  <span>TOTAL</span>
                  <span>SOS 630.00</span>
                </div>
              </div>
            </>
          );
        }

        if (isSalesReceipt) {
          return (
            <>
              {/* Mini Sales Receipt Design */}
              <div className="mb-2 border-b border-gray-100 pb-1" style={{ borderColor: `${labelColor}20` }}>
                <div style={{ fontWeight: "700", fontSize: "8px", color: theme.accent }}>{orgName}</div>
              </div>
              <div className="mb-2">
                <div style={{ fontSize: "12px", fontWeight: "700", color: theme.accent }}>{docTitle}</div>
                <div style={{ fontSize: "6px", color: labelColor }}># SR-17 | 27 Apr 2026</div>
              </div>
              <div className="flex-1 border-t border-gray-100 pt-2" style={{ borderColor: `${labelColor}20` }}>
                {billToVisible && (
                  <>
                    <div style={{ fontSize: "6px", color: labelColor, marginBottom: "2px", textTransform: "uppercase" }}>{billToLabel}</div>
                    <div style={{ fontWeight: "600", color: "#2563eb", marginBottom: "4px" }}>Rob & Joe Traders</div>
                  </>
                )}
                <div className="border border-gray-50 rounded p-1 mb-2" style={{ borderColor: `${labelColor}10` }}>
                  <div className="flex justify-between border-b border-gray-50 pb-1 mb-1" style={{ borderColor: `${labelColor}10`, fontSize: "5px", fontWeight: "600" }}>
                    <span>ITEM</span>
                    <span>TOTAL</span>
                  </div>
                  <div className="flex justify-between font-bold border-b border-gray-50 pb-1 mb-1" style={{ borderColor: `${labelColor}05`, color: fontColor }}>
                    <span>Standard Service</span>
                    <span>400.00</span>
                  </div>
                  <div className="flex justify-between font-bold" style={{ color: fontColor }}>
                    <span>Express Delivery</span>
                    <span>100.00</span>
                  </div>
                </div>
              </div>
              <div className="mt-auto border-t-2 border-gray-100 pt-1 text-right font-bold" style={{ borderColor: fontColor }}>
                <span style={{ fontSize: "5px", marginRight: "4px", color: labelColor }}>TOTAL</span>
                <span>SOS 500.00</span>
              </div>
            </>
          );
        }

        if (isPaymentReceipt) {
          return (
            <>
              {/* Mini Payment Receipt Design */}
              <div className="mb-2">
                <div style={{ fontWeight: "700", fontSize: "8px", color: theme.accent }}>{orgName}</div>
              </div>
              <div className="border-t border-gray-100 pt-2 text-center mb-3" style={{ borderColor: `${labelColor}20` }}>
                <div style={{ fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.5px", color: theme.accent }}>{docTitle} RECEIPT</div>
                <div className="mx-auto h-[1px] w-10 mt-1" style={{ backgroundColor: theme.accent }} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-1 rounded" style={{ backgroundColor: `${theme.accent}10` }}>
                  <div style={{ fontSize: "5px", color: labelColor }}>Amount Received</div>
                  <div style={{ fontWeight: "700", color: theme.accent }}>SOS 500.00</div>
                </div>
                <div className="p-1">
                  <div style={{ fontSize: "5px", color: labelColor }}>Payment Date</div>
                  <div style={{ fontWeight: "600", color: fontColor }}>27 Apr 2026</div>
                </div>
              </div>
              <div className="border-t border-gray-50 pt-2" style={{ borderColor: `${labelColor}10` }}>
                <div style={{ fontSize: "5px", color: labelColor }}>Received From</div>
                <div style={{ fontWeight: "700", color: "#2563eb" }}>Rob & Joe Traders</div>
              </div>
            </>
          );
        }

        // Standard Design (Quotes, Invoices, etc.)
        const details = config?.transactionDetails || {};
        const table = config?.table || {};
        const total = config?.total || {};
        const labels = headerFooter.labels || {};
        
        const labelFor = (obj: any, key: string, fallback: string) => (typeof obj?.[key] === "string" ? obj[key] : obj?.[key]?.label || fallback);
        const isVisible = (obj: any, key: string, fallback = true) => {
          if (!obj || obj[key] === undefined) return fallback;
          if (typeof obj[key] === "boolean") return obj[key];
          if (typeof obj[key]?.visible === "boolean") return obj[key].visible;
          return fallback;
        };

        const qtyVisible = isVisible(table.labels, "quantity");
        const rateVisible = isVisible(table.labels, "rate");
        const amountVisible = isVisible(table.labels, "amount");
        const descVisible = isVisible(table.labels, "description");

        const fmt = (val: number) => {
          const s = val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const symbol = "SOS";
          return total.currencyPosition === "after" ? `${s} ${symbol}` : `${symbol} ${s}`;
        };

        return (
          <>
            <div className="flex justify-between mb-4 border-b border-gray-100 pb-2" style={{ borderColor: `${labelColor}20` }}>
              <div style={{ maxWidth: "46%" }}>
                {isVisible(details, "showOrgLogo") && (details.orgLogo || organization?.logo) && (
                  <div className="mb-2 h-6 w-16 overflow-hidden flex items-center justify-center bg-gray-50 rounded border border-gray-100">
                    <img src={details.orgLogo || organization?.logo} alt="Org Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                {isVisible(details, "showOrgName") && (
                  <div style={{ 
                    fontWeight: "700", 
                    fontSize: `${(details.orgNameFontSize || 10) * 0.6}px`, 
                    color: details.orgNameColor || theme.accent 
                  }}>
                    {orgName}
                  </div>
                )}
                {isVisible(details, "showOrgAddress") && (
                  <div style={{ fontSize: "5px", color: labelColor, lineHeight: "1.3" }}>
                    {orgAddress?.street1 && <>{orgAddress.street1}<br /></>}
                    {(orgAddress?.city || orgAddress?.state) && <>{[orgAddress.city, orgAddress.state].filter(Boolean).join(", ")}<br /></>}
                    {orgAddress?.country && <>{orgAddress.country}</>}
                    {!orgAddress && "Location, Country"}
                  </div>
                )}
              </div>
              <div className="text-right">
                {isVisible(headerFooter, "showDocumentTitle") && (
                  <div style={{ 
                    fontSize: "14px", 
                    fontWeight: "300", 
                    textTransform: "uppercase", 
                    color: headerFooter.titleFontColor || theme.accent 
                  }}>
                    {docTitle}
                  </div>
                )}
                <div style={{ fontSize: "7px", fontWeight: "700", marginTop: "1px", color: fontColor }}>
                  {labelFor(labels, "numberField", "#")} {typeId.slice(0, 2).toUpperCase()}-17
                </div>
              </div>
            </div>

            <div className="flex justify-between mb-4 items-start" style={{ fontSize: "6px" }}>
              <div style={{ flex: 1 }}>
                {isVisible(labels, "billToField") && (
                  <div className="mb-2">
                    <div style={{ fontWeight: "600", color: labelColor, textTransform: "uppercase" }}>{labelFor(labels, "billToField", "Bill To")}</div>
                    <div style={{ 
                      fontWeight: "700", 
                      color: details.custNameColor || "#2563eb", 
                      fontSize: `${(details.custNameFontSize || 9) * 0.7}px` 
                    }}>Rob & Joe Traders</div>
                    <div style={{ fontSize: "5px", color: labelColor }}>4141 Hacienda Drive, CA</div>
                  </div>
                )}
              </div>
              <div className="text-right" style={{ color: labelColor, minWidth: "100px" }}>
                <div className="space-y-1">
                  <div className="flex justify-end gap-4">
                    <span>{labelFor(labels, "dateField", "Date")}</span>
                    <span style={{ fontWeight: "600", color: fontColor }}>27 Apr 2026</span>
                  </div>
                  {isVisible(labels, "dueDateField") && (
                    <div className="flex justify-end gap-4">
                      <span>{labelFor(labels, "dueDateField", "Due Date")}</span>
                      <span style={{ fontWeight: "600", color: fontColor }}>27 May 2026</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded overflow-hidden mb-3" style={{ 
              borderColor: table.showBorder !== false ? (table.borderColor || "#eee") : "transparent" 
            }}>
              <div 
                className="grid px-2 py-1 font-bold" 
                style={{ 
                  backgroundColor: table.showHeaderBg !== false ? (table.headerBgColor || theme.headerBg) : "transparent", 
                  color: table.headerFontColor || theme.headerText, 
                  fontSize: "5px",
                  gridTemplateColumns: `10px 1fr ${qtyVisible ? "15px" : ""} ${rateVisible ? "15px" : ""} ${amountVisible ? "20px" : ""}`.replace(/\s+/g, ' ').trim()
                }}
              >
                <div>{labelFor(table.labels, "lineNumber", "#")}</div>
                <div>{labelFor(table.labels, "item", "Item")}</div>
                {qtyVisible && <div className="text-right">{labelFor(table.labels, "quantity", "Qty")}</div>}
                {rateVisible && <div className="text-right">{labelFor(table.labels, "rate", "Rate")}</div>}
                {amountVisible && <div className="text-right">{labelFor(table.labels, "amount", "Amount")}</div>}
              </div>
              {[
                { n: "Brochure Design", d: "Single Sided Color", q: "1.00", r: "300.00", a: "300.00" },
                { n: "Web Design", d: "Custom theme", q: "1.00", r: "250.00", a: "250.00", bg: true },
                { n: "Print Ad", d: "Color 1/8 size", q: "1.00", r: "80.00", a: "80.00" },
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className="grid px-2 py-1.5 border-t border-gray-50" 
                  style={{ 
                    borderColor: table.showBorder !== false ? (table.borderColor || "#eee") : "transparent", 
                    backgroundColor: table.showRowBg !== false ? (item.bg ? (table.rowBgColor || `${theme.accent}0a`) : "transparent") : "transparent",
                    color: table.rowFontColor || fontColor, 
                    fontSize: `${(table.rowFontSize || 9) * 0.6}px`,
                    gridTemplateColumns: `10px 1fr ${qtyVisible ? "15px" : ""} ${rateVisible ? "15px" : ""} ${amountVisible ? "20px" : ""}`.replace(/\s+/g, ' ').trim()
                  }}
                >
                  <div style={{ color: labelColor }}>{idx + 1}</div>
                  <div>
                    <div style={{ fontWeight: "700" }}>{item.n}</div>
                    {descVisible && <div style={{ fontSize: `${(table.descFontSize || 8) * 0.6}px`, color: table.descFontColor || labelColor }}>{item.d}</div>}
                  </div>
                  {qtyVisible && <div className="text-right">{item.q}</div>}
                  {rateVisible && <div className="text-right">{item.r}</div>}
                  {amountVisible && <div className="text-right">{item.a}</div>}
                </div>
              ))}
            </div>

            {total.showSection !== false && (
              <div className="flex justify-end mb-4">
                <div style={{ 
                  width: "100px", 
                  backgroundColor: total.showBg !== false ? (total.bgColor || `${theme.accent}05`) : "transparent",
                  padding: "4px 6px", 
                  borderRadius: "4px",
                  fontSize: `${(total.fontSize || 9) * 0.6}px`,
                  color: total.fontColor || labelColor,
                  border: total.showBg !== false ? `0.5px solid ${theme.accent}33` : "none"
                }}>
                  {isVisible(total.labels, "subTotal") && (
                    <div className="flex justify-between py-0.5" style={{ fontWeight: "600" }}>
                      <span>{labelFor(total.labels, "subTotal", "Sub Total")}</span>
                      <span>{fmt(630)}</span>
                    </div>
                  )}
                  {total.showTaxDetails !== false && (
                    <div className="flex justify-between py-0.5" style={{ fontSize: "4px", color: labelColor }}>
                      <span>VAT (5%)</span>
                      <span>{fmt(31.5)}</span>
                    </div>
                  )}
                  {isVisible(total.labels, "total") && (
                    <div className="flex justify-between items-center py-1 mt-1 font-bold" style={{ 
                      borderTop: `1px solid ${theme.accent}33`, 
                      fontSize: `${(total.fontSize || 10) * 0.7}px`,
                      color: total.fontColor || fontColor 
                    }}>
                      <span>{labelFor(total.labels, "total", "Total")}</span>
                      <span>{fmt(661.5)}</span>
                    </div>
                  )}

                  {/* Balance Due Section */}
                  <div className="mt-1 pt-1 border-t border-dashed border-gray-100" style={{
                    backgroundColor: total.showBalanceBg !== false ? (total.balanceBgColor || "#f5f4f3") : "transparent",
                    margin: "4px -6px -4px",
                    padding: "4px 6px",
                    borderRadius: "0 0 4px 4px",
                    fontSize: `${(total.balanceFontSize || 9) * 0.6}px`,
                    color: total.balanceFontColor || "#000000",
                    fontWeight: "700"
                  }}>
                    <div className="flex justify-between items-center">
                      <span>Balance Due</span>
                      <span>{fmt(661.5)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {total.showAmountInWords && (
              <div className="mb-4" style={{ fontSize: "4px", color: labelColor }}>
                <span className="font-semibold">Total In Words: </span>
                Six Hundred Sixty One SOS Only
              </div>
            )}
          </>
        );
      })()}
      </div>
      {/* Footer Bar */}
      {(footerBgColor || footerBgImage || showPageNumber) && (
        <div style={{ backgroundColor: footerBgColor || "transparent", height: "15px", flexShrink: 0, width: "100%", position: "relative", marginTop: "auto" }}>
          {footerBgImage && <img src={footerBgImage} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          {showPageNumber && (
            <div style={{ 
              position: "absolute", 
              bottom: "4px", 
              right: pageNumberPosition === "Right" ? "8px" : "auto",
              left: pageNumberPosition === "Left" ? "8px" : "auto",
              color: (footerBgColor || footerBgImage) ? "#fff" : labelColor, 
              fontSize: "5px" 
            }}>
              1
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PDFTemplatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const validTypes = TEMPLATE_TYPES.map((row) => row.id);
  const searchType = searchParams.get("type") || "quotes";
  const currentType = validTypes.includes(searchType as any) ? searchType : "quotes";

  const { organization } = useAppBootstrap();
  const [templates, setTemplates] = useState<any[]>([]);
  const [exportNames, setExportNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuId, setMenuId] = useState("");
  const [useMenuId, setUseMenuId] = useState("");
  const [chooseOpen, setChooseOpen] = useState(false);
  const [galleryTab, setGalleryTab] = useState("all");
  const [selectedGalleryId, setSelectedGalleryId] = useState("std-1");
  const [createBase, setCreateBase] = useState<any>(null);
  const [createName, setCreateName] = useState("");
  const [createLanguage, setCreateLanguage] = useState("English");
  const [editorTemplate, setEditorTemplate] = useState<any>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportDraft, setExportDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".template-menu-root")) {
        setMenuId("");
        setUseMenuId("");
      }
      if (!target?.closest(".template-filter-root")) setFilterOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuId("");
        setUseMenuId("");
        setFilterOpen(false);
        setChooseOpen(false);
        setCreateBase(null);
        setEditorTemplate(null);
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const response = await pdfTemplatesAPI.get();
        const incomingTemplates = Array.isArray(response?.data?.templates) ? response.data.templates : [];
        const incomingExportNames = response?.data?.exportNames && typeof response.data.exportNames === "object" ? response.data.exportNames : {};
        if (!active) return;
        
        // Deduplicate incoming templates by ID
        const uniqueTemplates = incomingTemplates.length 
          ? Array.from(new Map(incomingTemplates.map((t: any) => [t.id, t])).values())
          : seedTemplates();
          
        setTemplates(uniqueTemplates);
        setExportNames(incomingExportNames);
      } catch (error) {
        console.error("Error loading PDF templates:", error);
        if (!active) return;
        setTemplates(seedTemplates());
        setExportNames({});
        toast.error("Failed to load PDF templates from the server.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const orderedTypes = useMemo(() => {
    const order = TYPE_ORDER.map((id) => TEMPLATE_TYPES.find((row) => row.id === id)).filter(Boolean);
    const rest = TEMPLATE_TYPES.filter((row) => !TYPE_ORDER.includes(row.id));
    return [...order, ...rest];
  }, []);

  const typeLabel = TEMPLATE_TYPES.find((row) => row.id === currentType)?.label || "Templates";
  const singular = typeLabel.endsWith("s") ? typeLabel.slice(0, -1) : typeLabel;
  const filterLabel: Record<string, string> = {
    all: `All ${singular} Templates`,
    active: `Active ${singular} Templates`,
    inactive: `Inactive ${singular} Templates`,
  };

  const moduleTemplates = useMemo(() => templates.filter((row) => row.moduleType === currentType), [templates, currentType]);
  const visibleTemplates = useMemo(() => {
    const rows = filter === "all" ? moduleTemplates : moduleTemplates.filter((row) => row.status === filter);
    return [...rows].sort((a, b) => (a.isDefault === b.isDefault ? a.name.localeCompare(b.name) : a.isDefault ? -1 : 1));
  }, [moduleTemplates, filter]);

  const galleryRows = useMemo(() => {
    const tab = GALLERY_TABS.find((row) => row.id === galleryTab);
    return tab?.family ? GALLERY.filter((row) => row.family === tab.family) : GALLERY;
  }, [galleryTab]);

  const galleryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    GALLERY_TABS.forEach((tab) => {
      counts[tab.id] = tab.family ? GALLERY.filter((row) => row.family === tab.family).length : GALLERY.length;
    });
    return counts;
  }, []);

  const persist = async (nextTemplates: any[], nextExportNames: Record<string, string>, successMessage?: string) => {
    setIsSaving(true);
    try {
      const response = await pdfTemplatesAPI.update({ templates: nextTemplates, exportNames: nextExportNames });
      const savedTemplates = Array.isArray(response?.data?.templates) ? response.data.templates : nextTemplates;
      const savedExportNames = response?.data?.exportNames && typeof response.data.exportNames === "object" ? response.data.exportNames : nextExportNames;
      setTemplates(savedTemplates);
      setExportNames(savedExportNames);
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      console.error("Error saving PDF templates:", error);
      toast.error("Failed to save PDF templates.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const updateType = (typeId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("type", typeId);
    setSearchParams(next);
  };

  const setDefault = async (template: any) => {
    const nextTemplates = templates.map((row) => (row.moduleType === template.moduleType ? { ...row, isDefault: row.id === template.id, status: row.id === template.id ? "active" : row.status } : row));
    setMenuId("");
    setUseMenuId("");
    await persist(nextTemplates, exportNames, "Default template updated.");
  };

  const cloneTemplate = async (template: any) => {
    const copy = { ...deepClone(template), id: `tpl-${Date.now()}`, name: `${template.name} (Copy)`, isDefault: false, status: "active", createdAt: nowIso(), updatedAt: nowIso() };
    const nextTemplates = ensureDefault([...templates, copy], template.moduleType);
    setMenuId("");
    setUseMenuId("");
    await persist(nextTemplates, exportNames, "Template cloned.");
  };

  const toggleStatus = async (template: any) => {
    const nextStatus = template.status === "active" ? "inactive" : "active";
    const nextTemplates = ensureDefault(
      templates.map((row) => (row.id === template.id ? { ...row, status: nextStatus, isDefault: nextStatus === "inactive" ? false : row.isDefault } : row)),
      template.moduleType,
    );
    setMenuId("");
    setUseMenuId("");
    await persist(nextTemplates, exportNames, `Template ${nextStatus}.`);
  };

  const createTemplate = async () => {
    if (!createBase) return;
    const displayName = String(createName || "").trim() || createBase.name;
    const created = {
      id: `tpl-${Date.now()}`,
      moduleType: currentType,
      name: displayName,
      language: createLanguage,
      status: "active",
      isDefault: false,
      family: createBase.family,
      preview: createBase.preview,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      config: buildConfig(currentType, typeLabel, displayName),
    };
    const nextTemplates = ensureDefault([...templates, created], currentType);
    setTemplates(nextTemplates);
    setCreateBase(null);
    setEditorTemplate(created);
    await persist(nextTemplates, exportNames, "Template created.");
  };

  const saveTemplate = async (draft: any) => {
    const nextTemplates = ensureDefault(templates.map((row) => (row.id === draft.id ? { ...draft, updatedAt: nowIso() } : row)), draft.moduleType);
    setEditorTemplate(null);
    await persist(nextTemplates, exportNames, "Template saved.");
  };

  const openExport = () => {
    setExportDraft(exportNames[currentType] || "{module}-{number}-{date}");
    setExportOpen(true);
  };

  const saveExport = async () => {
    const nextExportNames = { ...exportNames, [currentType]: exportDraft || "{module}-{number}-{date}" };
    setExportOpen(false);
    await persist(templates, nextExportNames, "Export file name configured.");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#156372]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white">
    <div className="flex min-h-full">
      <aside className="w-[280px] flex-shrink-0 border-r border-gray-100 bg-white">
          <div className="px-6 py-4">
            <h1 className="text-[18px] font-semibold text-gray-900">Templates</h1>
          </div>
          <div className="max-h-[calc(100vh-88px)] overflow-y-auto">
            {orderedTypes.map((type) => (
              <button
                key={type!.id}
                type="button"
                onClick={() => updateType(type!.id)}
                className={`w-full px-6 py-2.5 text-left text-[14px] transition-colors ${
                  type!.id === currentType ? "bg-[#f4f5f8] font-medium text-gray-900" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {type!.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex-1 min-w-0 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-4">
            <div className="relative template-filter-root">
              <button type="button" onClick={() => setFilterOpen((value) => !value)} className="inline-flex items-center gap-2 text-[20px] font-bold text-gray-900">
                {filterLabel[filter]}
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </button>
              {filterOpen ? (
                <div className="absolute left-0 top-[55px] z-30 w-[240px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                  {["all", "active", "inactive"].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setFilter(key);
                        setFilterOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-[13px] ${filter === key ? "bg-[#047857] text-white" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      {key === "all" ? `All ${singular} Templates` : key === "active" ? "Active Templates" : "Inactive Templates"}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-4">
              <button type="button" onClick={openExport} className="inline-flex items-center gap-2 text-[13px] font-medium text-blue-600 hover:text-blue-700">
                <Settings className="h-4 w-4" />
                Configure Export File Name
              </button>
              <button type="button" onClick={() => setChooseOpen(true)} className="rounded bg-[#156372] px-4 py-1.5 text-[14px] font-medium text-white hover:bg-[#0f4f5c]">
                + New
              </button>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleTemplates.map((template) => (
                <div key={template.id} className="flex flex-col">
                  <div className="group relative aspect-[3/4] overflow-hidden rounded border border-gray-200 bg-white transition-shadow hover:shadow-md">
                    <div className="h-full p-4">
                      <MiniSheet variant={template.preview || "standard"} config={template.config} typeId={template.moduleType} organization={organization} />
                    </div>
                    
                    {template.isDefault && (
                      <div className="absolute inset-x-0 bottom-0 bg-[#fffbeb] px-3 py-1.5 border-t border-[#fde68a] flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-[#d97706] fill-[#d97706]" />
                        <span className="text-[11px] font-bold text-[#d97706] tracking-wider uppercase">Default</span>
                      </div>
                    )}
                    

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gray-900/80 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 py-4 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
                      <button type="button" onClick={() => setEditorTemplate(deepClone(template))} className="pointer-events-auto rounded bg-[#156372] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#0f4f5c]">
                        Edit
                      </button>
                      <div className="relative template-menu-root pointer-events-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuId((value) => (value === template.id ? "" : template.id));
                            setUseMenuId("");
                          }}
                          className="rounded bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        {menuId === template.id ? (
                          <div className="absolute left-0 bottom-[44px] z-20 w-[190px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                            <button
                              type="button"
                              onClick={() => {
                                setEditorTemplate(deepClone(template));
                                setMenuId("");
                                setUseMenuId("");
                              }}
                              className="flex w-full items-center gap-2 bg-[#156372] px-3 py-2 text-left text-[14px] text-white"
                            >
                              <Eye className="h-4 w-4" />
                              Preview
                            </button>
                            <button type="button" onClick={() => setUseMenuId((value) => (value === template.id ? "" : template.id))} className="flex w-full items-center justify-between px-3 py-2 text-left text-[14px] text-gray-700 hover:bg-gray-50">
                              Use This Template For
                              <ChevronRight className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => cloneTemplate(template)} className="w-full px-3 py-2 text-left text-[14px] text-gray-700 hover:bg-gray-50">Clone</button>
                            <button type="button" onClick={() => toggleStatus(template)} className="w-full px-3 py-2 text-left text-[14px] text-gray-700 hover:bg-gray-50">{template.status === "active" ? "Deactivate" : "Activate"}</button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col items-start">
                    <span className="text-[14px] font-medium text-gray-900">{template.name}</span>
                  </div>
                </div>
              ))}

              <button 
                type="button" 
                onClick={() => setChooseOpen(true)} 
                className="flex aspect-[3/4] flex-col items-start rounded border-2 border-dashed border-gray-200 bg-white p-8 text-left transition-colors hover:border-gray-300"
              >
                <div className="mb-6">
                  <h3 className="text-[20px] font-bold text-gray-900">New Template</h3>
                  <p className="mt-4 text-[14px] leading-relaxed text-gray-500">
                    Click to add a template from our gallery. You can customize the template title, columns, and headers in line item table.
                  </p>
                </div>
                <span className="mt-auto inline-flex items-center gap-2 rounded bg-[#047857] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#065f46]">
                  <Plus className="h-4 w-4" />
                  New
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {chooseOpen ? (
        <div className="fixed inset-0 z-[130] bg-slate-900/20" onClick={() => setChooseOpen(false)}>
          <div className="m-4 h-[calc(100vh-32px)] overflow-hidden rounded border border-slate-300 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-[18px] font-medium text-slate-900">Choose a Template</h3>
              <button type="button" onClick={() => setChooseOpen(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="border-b border-slate-200 px-4">
              <div className="flex flex-wrap gap-5">
                {GALLERY_TABS.map((tab) => (
                  <button key={tab.id} type="button" onClick={() => setGalleryTab(tab.id)} className={`border-b-2 px-1 py-3 text-[12px] ${galleryTab === tab.id ? "border-[#156372] text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                    {tab.label} ({galleryCounts[tab.id] || 0})
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[calc(100%-95px)] overflow-auto p-4">
              <div className="rounded border border-[#156372] p-3">
                <div className="flex min-w-max gap-3">
                  {galleryRows.map((row) => (
                    <div key={row.id} className={`group w-[240px] rounded border ${selectedGalleryId === row.id ? "border-[#156372]" : "border-slate-200"} bg-white`}>
                      <div className="relative h-[340px] p-3">
                        <MiniSheet variant={row.preview} typeId={currentType} />
                        <div className="pointer-events-none absolute inset-x-3 bottom-3 h-[56px] bg-gradient-to-t from-slate-700/85 to-slate-700/0 opacity-0 transition-opacity group-hover:opacity-100" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGalleryId(row.id);
                            setCreateBase(row);
                            setCreateName("");
                            setCreateLanguage("English");
                            setChooseOpen(false);
                          }}
                          className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-[#156372] px-4 py-1.5 text-[12px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          Use This
                        </button>
                      </div>
                      <div className="px-3 pb-3 text-[13px] text-slate-900">{row.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {createBase ? (
        <div className="fixed inset-0 z-[141] bg-slate-900/30" onClick={() => setCreateBase(null)}>
          <div className="mx-auto mt-20 w-full max-w-[560px] rounded border border-slate-300 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-[16px] font-semibold text-slate-900">Create Template</h3>
              <button type="button" onClick={() => setCreateBase(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-4 py-4">
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700">
                Base: <span className="font-medium text-slate-900">{createBase.name}</span><br />
                Module: <span className="font-medium text-slate-900">{typeLabel}</span>
              </div>
              <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder={createBase.name} className="h-10 w-full rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" />
              <select value={createLanguage} onChange={(e) => setCreateLanguage(e.target.value)} className="h-10 w-full rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]">
                {LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button type="button" onClick={() => setCreateBase(null)} className="rounded border border-slate-300 px-4 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={() => void createTemplate()} className="rounded bg-[#156372] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0f4f5c]">Continue</button>
            </div>
          </div>
        </div>
      ) : null}

      {exportOpen ? (
        <div className="fixed inset-0 z-[141] bg-slate-900/30" onClick={() => setExportOpen(false)}>
          <div className="mx-auto mt-24 w-full max-w-[520px] rounded border border-slate-300 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-[16px] font-semibold text-slate-900">Configure Export File Name</h3>
              <button type="button" onClick={() => setExportOpen(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="text-[12px] text-slate-600">Use placeholders: <code className="rounded bg-slate-100 px-1">{`{module}`}</code>, <code className="rounded bg-slate-100 px-1">{`{number}`}</code>, <code className="rounded bg-slate-100 px-1">{`{date}`}</code>.</p>
              <input value={exportDraft} onChange={(e) => setExportDraft(e.target.value)} className="h-10 w-full rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button type="button" onClick={() => setExportOpen(false)} className="rounded border border-slate-300 px-4 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={() => void saveExport()} className="rounded bg-[#156372] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0f4f5c]">Save</button>
            </div>
          </div>
        </div>
      ) : null}

      {editorTemplate ? (
        <TemplateEditorModal
          template={editorTemplate}
          moduleLabel={TEMPLATE_TYPES.find((row) => row.id === editorTemplate.moduleType)?.label || "Template"}
          organization={organization}
          onClose={() => setEditorTemplate(null)}
          onSave={(draft) => void saveTemplate(draft)}
        />
      ) : null}

      {isSaving ? (
        <div className="fixed bottom-4 right-4 z-[250] inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving templates...
        </div>
      ) : null}
    </div>
  );
}
