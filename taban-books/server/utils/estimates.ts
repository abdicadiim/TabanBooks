import mongoose from "mongoose";
import Quote from "../models/Quote.js";
import TransactionNumberSeries from "../models/TransactionNumberSeries.js";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toPlainId = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === "object") {
    const raw = value._id || value.id || value.contactPersonId || value.contact_person_id || value.projectId || value.project_id;
    if (raw) return String(raw);
  }
  return undefined;
};

const compactObject = (value: Record<string, any>) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

export const formatEstimateDate = (value: any): string | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};

export const formatEstimateTimestamp = (value: any): string | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

export const mapEstimateStatusToQuoteStatus = (status: any): string => {
  switch (String(status || "draft").trim().toLowerCase()) {
    case "sent":
      return "sent";
    case "accepted":
      return "accepted";
    case "declined":
      return "declined";
    case "expired":
      return "expired";
    case "invoiced":
      return "invoiced";
    default:
      return "draft";
  }
};

export const mapQuoteStatusToEstimateStatus = (status: any): string => {
  switch (String(status || "draft").trim().toLowerCase()) {
    case "accepted":
      return "accepted";
    case "rejected":
    case "declined":
      return "declined";
    case "expired":
      return "expired";
    case "converted":
    case "invoiced":
      return "invoiced";
    case "viewed":
    case "sent":
      return "sent";
    default:
      return "draft";
  }
};

export const mapEstimateAddressToSnapshot = (value: any = {}) => {
  if (!value || typeof value !== "object") return {};
  const addressLine = String(value.address || "").trim();
  const [street1 = "", street2 = ""] = addressLine
    ? addressLine.split(",").map((entry) => String(entry).trim())
    : [String(value.street1 || "").trim(), String(value.street2 || "").trim()];

  return compactObject({
    address: addressLine || undefined,
    street1: street1 || undefined,
    street2: street2 || undefined,
    city: value.city ? String(value.city) : undefined,
    state: value.state ? String(value.state) : undefined,
    zipCode: value.zip ? String(value.zip) : (value.zipCode ? String(value.zipCode) : undefined),
    country: value.country ? String(value.country) : undefined,
    fax: value.fax ? String(value.fax) : undefined,
    attention: value.attention ? String(value.attention) : undefined,
    phone: value.phone ? String(value.phone) : undefined,
  });
};

export const mapSnapshotToEstimateAddress = (value: any = {}) => {
  if (!value || typeof value !== "object") return undefined;
  const addressLine = String(value.address || [value.street1, value.street2].filter(Boolean).join(", ")).trim();
  const result = compactObject({
    address: addressLine || undefined,
    city: value.city ? String(value.city) : undefined,
    state: value.state ? String(value.state) : undefined,
    zip: value.zip ? String(value.zip) : (value.zipCode ? String(value.zipCode) : undefined),
    country: value.country ? String(value.country) : undefined,
    fax: value.fax ? String(value.fax) : undefined,
  });
  return Object.keys(result).length ? result : undefined;
};

const mapContactPerson = (value: any = {}) => {
  const firstName = String(value.firstName || value.first_name || "").trim();
  const lastName = String(value.lastName || value.last_name || "").trim();
  const contactPersonName = String(
    value.contactPersonName ||
    value.contact_person_name ||
    `${firstName} ${lastName}`.trim()
  ).trim();

  return compactObject({
    contact_person_id: toPlainId(value.contactPersonId || value.contact_person_id || value._id),
    contact_person_name: contactPersonName || undefined,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    contact_person_email: value.contactPersonEmail || value.contact_person_email || value.email || undefined,
    phone: value.phone || value.workPhone || value.work_phone || undefined,
    mobile: value.mobile || undefined,
    communication_preference: value.communicationPreference || value.communication_preference || undefined,
  });
};

const mapLineItemToEstimate = (item: any = {}) => {
  const itemTotal = Number(item.total || 0) || 0;
  const taxRate = Number(item.taxPercentage ?? item.taxRate ?? 0) || 0;

  return compactObject({
    item_id: toPlainId(item.item),
    line_item_id: item.lineItemId || toPlainId(item._id),
    name: item.name || undefined,
    description: item.description || undefined,
    item_order: item.itemOrder,
    product_type: item.productType || undefined,
    bcy_rate: item.bcyRate,
    rate: Number(item.unitPrice || 0) || 0,
    quantity: Number(item.quantity || 0) || 0,
    unit: item.unit || undefined,
    discount_amount: item.discountAmount !== undefined ? Number(item.discountAmount || 0) || 0 : undefined,
    discount: item.discount !== undefined ? item.discount : undefined,
    tax_id: item.taxId || undefined,
    tax_name: item.taxName || undefined,
    tax_type: item.taxType || undefined,
    tax_percentage: taxRate || undefined,
    tax_treatment_code: item.taxTreatmentCode || undefined,
    item_total: itemTotal,
    location_id: item.locationId || undefined,
    location_name: item.locationName || undefined,
    tags: Array.isArray(item.tags) && item.tags.length ? item.tags : undefined,
  });
};

export const mapQuoteToEstimate = (quote: any, options: { summary?: boolean } = {}) => {
  const customer = quote?.customer && typeof quote.customer === "object" ? quote.customer : null;
  const salesperson = quote?.salesperson && typeof quote.salesperson === "object" ? quote.salesperson : null;
  const subTotal = Number(quote?.subtotal ?? quote?.subTotal ?? 0) || 0;
  const taxTotal = Number(quote?.tax ?? 0) || 0;
  const shippingCharge = Number(quote?.shippingCharges ?? 0) || 0;
  const adjustment = Number(quote?.adjustment ?? 0) || 0;
  const isViewedByClient = Boolean(quote?.isViewedByClient);
  const explicitTaxes = Array.isArray(quote?.taxes) ? quote.taxes : [];
  const taxes = explicitTaxes.length
    ? explicitTaxes.map((entry: any) => compactObject({
        tax_name: entry.tax_name || entry.taxName || undefined,
        tax_amount: entry.tax_amount !== undefined ? Number(entry.tax_amount || 0) || 0 : (entry.taxAmount !== undefined ? Number(entry.taxAmount || 0) || 0 : undefined),
      }))
    : (taxTotal > 0 ? [{ tax_name: "Tax", tax_amount: taxTotal }] : []);

  const estimate = compactObject({
    estimate_id: toPlainId(quote?._id || quote?.id),
    estimate_number: quote?.quoteNumber || undefined,
    date: formatEstimateDate(quote?.date),
    reference_number: quote?.referenceNumber || undefined,
    place_of_supply: quote?.placeOfSupply || undefined,
    gst_no: quote?.gstNo || undefined,
    gst_treatment: quote?.gstTreatment || undefined,
    tax_treatment: quote?.taxTreatment || undefined,
    is_reverse_charge_applied: quote?.isReverseChargeApplied !== undefined ? Boolean(quote.isReverseChargeApplied) : undefined,
    status: mapQuoteStatusToEstimateStatus(quote?.status),
    customer_id: toPlainId(customer?._id || quote?.customer),
    customer_name: customer?.displayName || customer?.name || customer?.companyName || undefined,
    contact_persons_associated: (() => {
      const contactsSource = Array.isArray(quote?.contactPersonsAssociated) && quote.contactPersonsAssociated.length
        ? quote.contactPersonsAssociated
        : (Array.isArray(customer?.contactPersons) ? customer.contactPersons : []);
      const contacts = contactsSource.map(mapContactPerson).filter((entry) => Object.keys(entry).length > 0);
      return contacts.length ? contacts : undefined;
    })(),
    currency_id: toPlainId(quote?.currencyId),
    currency_code: quote?.currency || undefined,
    exchange_rate: quote?.exchangeRate !== undefined ? Number(quote.exchangeRate || 1) || 1 : undefined,
    expiry_date: formatEstimateDate(quote?.expiryDate),
    discount: quote?.discount !== undefined ? Number(quote.discount || 0) || 0 : undefined,
    is_discount_before_tax: quote?.isDiscountBeforeTax !== undefined ? Boolean(quote.isDiscountBeforeTax) : undefined,
    discount_type: quote?.discountScope || undefined,
    is_inclusive_tax: String(quote?.taxExclusive || "").toLowerCase().includes("inclusive"),
    is_viewed_by_client: options.summary ? (isViewedByClient || undefined) : (quote?.isViewedByClient !== undefined ? isViewedByClient : undefined),
    client_viewed_time: options.summary ? formatEstimateTimestamp(quote?.clientViewedTime) : undefined,
    line_items: Array.isArray(quote?.items) ? quote.items.map(mapLineItemToEstimate) : [],
    location_id: quote?.locationId || undefined,
    location_name: quote?.locationName || undefined,
    shipping_charge: shippingCharge,
    adjustment: adjustment,
    adjustment_description: quote?.adjustmentDescription || undefined,
    sub_total: subTotal,
    total: Number(quote?.total || 0) || 0,
    tax_total: taxTotal,
    price_precision: Number(quote?.pricePrecision ?? 2) || 2,
    taxes: taxes.length ? taxes : undefined,
    billing_address: mapSnapshotToEstimateAddress(quote?.billingAddress || customer?.billingAddress),
    shipping_address: mapSnapshotToEstimateAddress(quote?.shippingAddress || customer?.shippingAddress),
    notes: quote?.notes || undefined,
    terms: quote?.terms || undefined,
    custom_fields: Array.isArray(quote?.customFields) && quote.customFields.length ? quote.customFields : undefined,
    template_id: quote?.templateId || undefined,
    template_name: quote?.templateName || undefined,
    created_time: formatEstimateTimestamp(quote?.createdAt),
    last_modified_time: formatEstimateTimestamp(quote?.updatedAt),
    salesperson_id: toPlainId(salesperson?._id || quote?.salesperson),
    salesperson_name: salesperson?.name || quote?.salespersonName || undefined,
    project: (quote?.projectId || quote?.projectName)
      ? compactObject({
          project_id: toPlainId(quote?.projectId),
          project_name: quote?.projectName || undefined,
        })
      : undefined,
    tags: Array.isArray(quote?.tags) && quote.tags.length ? quote.tags : undefined,
  });

  if (options.summary) {
    return compactObject({
      estimate_id: estimate.estimate_id,
      customer_name: estimate.customer_name,
      customer_id: estimate.customer_id,
      status: estimate.status,
      estimate_number: estimate.estimate_number,
      reference_number: estimate.reference_number,
      date: estimate.date,
      currency_id: estimate.currency_id,
      currency_code: estimate.currency_code,
      total: estimate.total,
      location_id: estimate.location_id,
      location_name: estimate.location_name,
      created_time: estimate.created_time,
      last_modified_time: estimate.last_modified_time,
      accepted_date: formatEstimateDate(quote?.acceptedDate),
      declined_date: formatEstimateDate(quote?.declinedDate),
      expiry_date: estimate.expiry_date,
      has_attachment: Array.isArray(quote?.attachedFiles) ? quote.attachedFiles.length > 0 : undefined,
      is_viewed_by_client: estimate.is_viewed_by_client,
      client_viewed_time: estimate.client_viewed_time,
    });
  }

  return estimate;
};

export const generateNextEstimateNumber = async (
  organizationId: string,
  prefixOverride?: string
): Promise<string> => {
  const series = await TransactionNumberSeries.findOne({
    organization: new mongoose.Types.ObjectId(organizationId),
    module: "Quote",
    isDefault: true,
    isActive: true,
  });

  if (series) {
    const nextNumber = (series.currentNumber || 0) + 1;
    const prefix = prefixOverride || series.prefix || "EST-";
    const paddedNumber = String(nextNumber).padStart(series.startingNumber?.length || 6, "0");
    return `${prefix}${paddedNumber}`;
  }

  const prefix = prefixOverride || "EST-";
  const lastQuote = await Quote.findOne({
    organization: new mongoose.Types.ObjectId(organizationId),
    quoteNumber: new RegExp(`^${escapeRegex(prefix)}`),
  })
    .sort({ quoteNumber: -1 })
    .select("quoteNumber")
    .lean();

  let nextNumber = 1;
  if (lastQuote?.quoteNumber) {
    const match = String(lastQuote.quoteNumber).match(/\d+$/);
    if (match) nextNumber = parseInt(match[0], 10) + 1;
  }

  return `${prefix}${String(nextNumber).padStart(6, "0")}`;
};
