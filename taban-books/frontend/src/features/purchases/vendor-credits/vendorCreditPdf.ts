import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

type OrganizationInfo = {
  companyName?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: {
    city?: string;
    country?: string;
    phone?: string;
  };
};

type VendorCreditItem = {
  item?: any;
  itemDetails?: string;
  name?: string;
  description?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  rate?: number | string;
  total?: number | string;
  amount?: number | string;
};

type VendorCreditRecord = {
  id?: string;
  _id?: string;
  vendorCreditNumber?: string;
  creditNumber?: string;
  creditNote?: string;
  orderNumber?: string;
  referenceNumber?: string;
  date?: string | Date;
  vendorName?: string;
  vendor?: any;
  currency?: string;
  items?: VendorCreditItem[];
  subtotal?: number | string;
  total?: number | string;
  amount?: number | string;
  balance?: number | string;
};

const toNumber = (value: any, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const escapeHtml = (value: any): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value: any): string => {
  if (!value) return "-";
  const raw = String(value);
  const normalized = raw.includes("T") ? raw : `${raw}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (value: any, fractionDigits = 3): string =>
  toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const formatQty = (value: any): string =>
  toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getVendorName = (credit: VendorCreditRecord): string =>
  String(
    credit.vendorName ||
      credit.vendor?.displayName ||
      credit.vendor?.name ||
      credit.vendor ||
      "Vendor Name"
  );

const getItems = (credit: VendorCreditRecord): VendorCreditItem[] =>
  Array.isArray(credit.items) ? credit.items : [];

const getItemName = (item: VendorCreditItem): string =>
  String(
    (item.item && typeof item.item === "object" ? item.item.name : undefined) ||
      item.name ||
      item.description ||
      item.itemDetails ||
      "No description"
  );

const getItemRate = (item: VendorCreditItem): number =>
  toNumber(item.unitPrice, toNumber(item.rate));

const getItemAmount = (item: VendorCreditItem): number => {
  const explicit = toNumber(item.total, Number.NaN);
  if (Number.isFinite(explicit)) return explicit;
  const fallback = toNumber(item.amount, Number.NaN);
  if (Number.isFinite(fallback)) return fallback;
  return toNumber(item.quantity) * getItemRate(item);
};

const getSubtotal = (credit: VendorCreditRecord): number => {
  const explicit = toNumber(credit.subtotal, Number.NaN);
  if (Number.isFinite(explicit)) return explicit;
  return getItems(credit).reduce((sum, item) => sum + getItemAmount(item), 0);
};

const getTotal = (credit: VendorCreditRecord): number => {
  const explicit = toNumber(credit.total, Number.NaN);
  if (Number.isFinite(explicit)) return explicit;
  const fallback = toNumber(credit.amount, Number.NaN);
  if (Number.isFinite(fallback)) return fallback;
  return getSubtotal(credit);
};

const getBalance = (credit: VendorCreditRecord): number => {
  const explicit = toNumber(credit.balance, Number.NaN);
  if (Number.isFinite(explicit)) return explicit;
  const fallback = toNumber(credit.amount, Number.NaN);
  if (Number.isFinite(fallback)) return fallback;
  return getTotal(credit);
};

const buildCreditPaperHtml = (credit: VendorCreditRecord, organizationInfo?: OrganizationInfo): string => {
  const currency = String(credit.currency || "USD");
  const creditNote = String(credit.creditNumber || credit.creditNote || credit.vendorCreditNumber || credit.id || credit._id || "VENDOR-CREDIT");
  const referenceNumber = String(credit.referenceNumber || credit.orderNumber || "N/A");
  const subtotal = getSubtotal(credit);
  const total = getTotal(credit);
  const balance = getBalance(credit);
  const creditsApplied = Math.max(0, total - balance);
  const items = getItems(credit);

  const companyName = organizationInfo?.companyName || organizationInfo?.name || "TABAN ENTERPRISES";
  const companyCity = organizationInfo?.address?.city || "";
  const companyCountry = organizationInfo?.address?.country || "";
  const companyPhone = organizationInfo?.address?.phone || organizationInfo?.phone || "";
  const companyEmail = organizationInfo?.email || "";
  const companyLocation = [companyCity, companyCountry].filter(Boolean).join(", ");

  const rows = items.length
    ? items
        .map((item, index) => {
          const amount = getItemAmount(item);
          const rate = getItemRate(item);
          return `
            <tr>
              <td class="cell idx">${index + 1}</td>
              <td class="cell">${escapeHtml(getItemName(item))}</td>
              <td class="cell right">${formatQty(item.quantity)} pcs</td>
              <td class="cell right">${formatMoney(rate)}</td>
              <td class="cell right">${formatMoney(amount)}</td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td class="cell idx">1</td>
        <td class="cell">No items</td>
        <td class="cell right">0.00 pcs</td>
        <td class="cell right">0.000</td>
        <td class="cell right">0.000</td>
      </tr>
    `;

  return `
    <div class="paper-page">
      <style>
        .paper-page {
          width: 794px;
          min-height: 1123px;
          box-sizing: border-box;
          background: #ffffff;
          border: 1px solid #d9dde3;
          margin: 0;
          position: relative;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
        }
        .corner {
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 0;
          border-top: 42px solid #0f7a82;
          border-right: 42px solid transparent;
        }
        .wrap {
          padding: 42px 44px 44px 44px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 18px;
        }
        .org-name {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .org-line {
          font-size: 13px;
          line-height: 1.5;
          color: #374151;
        }
        .doc-right {
          text-align: right;
          margin-top: 4px;
        }
        .doc-title {
          font-size: 44px;
          letter-spacing: 2px;
          font-weight: 300;
          color: #0f2643;
          margin-bottom: 6px;
        }
        .doc-note {
          font-size: 20px;
          color: #0f2643;
          font-weight: 600;
        }
        .credits-box {
          text-align: right;
          margin-top: 4px;
          margin-bottom: 24px;
        }
        .credits-label {
          color: #6b7280;
          font-size: 13px;
          margin-bottom: 4px;
        }
        .credits-val {
          font-size: 32px;
          font-weight: 700;
          color: #111827;
        }
        .meta-grid {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 22px;
        }
        .meta-label {
          color: #6b7280;
          font-size: 13px;
          margin-bottom: 6px;
        }
        .vendor-name {
          font-size: 20px;
          font-weight: 600;
          color: #0f2643;
        }
        .meta-right {
          min-width: 250px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .meta-key {
          color: #6b7280;
        }
        .meta-value {
          font-weight: 600;
          color: #111827;
        }
        .items {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          margin-bottom: 22px;
        }
        .head th {
          background: #33363d;
          color: #ffffff;
          font-size: 12px;
          text-transform: uppercase;
          padding: 10px;
          text-align: left;
          font-weight: 700;
          letter-spacing: .2px;
        }
        .head .right,
        .right {
          text-align: right;
        }
        .cell {
          font-size: 14px;
          color: #111827;
          padding: 11px 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        .idx {
          width: 36px;
        }
        .totals {
          width: 310px;
          margin-left: auto;
          margin-bottom: 22px;
        }
        .t-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 15px;
        }
        .t-row.muted {
          color: #0f7a82;
        }
        .t-row.total {
          margin-top: 16px;
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }
        .bottom-box {
          margin-top: 14px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          padding: 12px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 16px;
        }
        .bottom-box .label {
          color: #6b7280;
          font-weight: 600;
        }
        .bottom-box .value {
          color: #111827;
          font-weight: 700;
          font-size: 22px;
        }
      </style>
      <div class="corner"></div>
      <div class="wrap">
        <div class="header">
          <div>
            <div class="org-name">${escapeHtml(companyName)}</div>
            ${companyLocation ? `<div class="org-line">${escapeHtml(companyLocation)}</div>` : ""}
            ${companyPhone ? `<div class="org-line">${escapeHtml(companyPhone)}</div>` : ""}
            ${companyEmail ? `<div class="org-line">${escapeHtml(companyEmail)}</div>` : ""}
          </div>
          <div class="doc-right">
            <div class="doc-title">VENDOR CREDITS</div>
            <div class="doc-note">CreditNote# ${escapeHtml(creditNote)}</div>
          </div>
        </div>

        <div class="credits-box">
          <div class="credits-label">Credits Remaining</div>
          <div class="credits-val">$${formatMoney(balance)}</div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-label">Vendor Address</div>
            <div class="vendor-name">${escapeHtml(getVendorName(credit))}</div>
          </div>
          <div class="meta-right">
            <div class="meta-row"><span class="meta-key">Date :</span><span class="meta-value">${escapeHtml(formatDate(credit.date))}</span></div>
            <div class="meta-row"><span class="meta-key">Reference# :</span><span class="meta-value">${escapeHtml(referenceNumber)}</span></div>
          </div>
        </div>

        <table class="items">
          <thead class="head">
            <tr>
              <th class="idx">#</th>
              <th>Item &amp; Description</th>
              <th class="right">Qty</th>
              <th class="right">Rate</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="totals">
          <div class="t-row"><span>Sub Total</span><span>${formatMoney(subtotal)}</span></div>
          <div class="t-row muted"><span>Credits Applied</span><span>(-) ${formatMoney(creditsApplied)}</span></div>
          <div class="t-row total"><span>Total</span><span>${escapeHtml(currency)} ${formatMoney(total)}</span></div>
        </div>

        <div class="bottom-box">
          <div class="label">Credits Remaining</div>
          <div class="value">${escapeHtml(currency)} ${formatMoney(balance)}</div>
        </div>
      </div>
    </div>
  `;
};

const renderCreditToCanvas = async (
  credit: VendorCreditRecord,
  organizationInfo?: OrganizationInfo
): Promise<HTMLCanvasElement> => {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.zIndex = "-1";
  host.style.background = "#ffffff";
  host.innerHTML = buildCreditPaperHtml(credit, organizationInfo);

  document.body.appendChild(host);
  try {
    const page = host.firstElementChild as HTMLElement;
    return await html2canvas(page, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: page.scrollWidth,
      windowHeight: page.scrollHeight,
    });
  } finally {
    document.body.removeChild(host);
  }
};

export const downloadVendorCreditsPaperPdf = async (
  credits: VendorCreditRecord[],
  organizationInfo?: OrganizationInfo
): Promise<void> => {
  if (!Array.isArray(credits) || credits.length === 0) return;

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let index = 0; index < credits.length; index += 1) {
    const credit = credits[index];
    const canvas = await renderCreditToCanvas(credit, organizationInfo);
    const imgData = canvas.toDataURL("image/png");

    const imgRatio = canvas.width / canvas.height;
    let imgWidth = pageWidth;
    let imgHeight = imgWidth / imgRatio;

    if (imgHeight > pageHeight) {
      imgHeight = pageHeight;
      imgWidth = imgHeight * imgRatio;
    }

    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    if (index > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight, undefined, "FAST");
  }

  const singleCreditName = credits.length === 1
    ? String(
        credits[0]?.creditNote ||
          credits[0]?.creditNumber ||
          credits[0]?.vendorCreditNumber ||
          credits[0]?.id ||
          "vendor-credit"
      )
    : `vendor-credits-${new Date().toISOString().slice(0, 10)}`;

  pdf.save(`${singleCreditName.replace(/[^a-z0-9-_]/gi, "_")}.pdf`);
};

