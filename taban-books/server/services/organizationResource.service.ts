import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import Profile from "../models/Profile.js";
import Currency from "../models/Currency.js";

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const LANGUAGE_CODE_MAP: Record<string, string> = {
  english: "en",
  swahili: "sw",
  somali: "so",
  arabic: "ar",
  french: "fr",
};

const CURRENCY_SEED_MAP: Record<string, { name: string; symbol: string }> = {
  USD: { name: "United States Dollar", symbol: "$" },
  EUR: { name: "Euro", symbol: "EUR" },
  GBP: { name: "British Pound", symbol: "GBP" },
  KES: { name: "Kenyan Shilling", symbol: "KSh" },
  SOS: { name: "Somali Shilling", symbol: "SOS" },
  CAD: { name: "Canadian Dollar", symbol: "C$" },
  AWG: { name: "Aruban Guilder", symbol: "AWG" },
  AED: { name: "UAE Dirham", symbol: "AED" },
};

type UserLike = {
  organization?: mongoose.Types.ObjectId | string | null;
  organizationMemberships?: Array<mongoose.Types.ObjectId | string> | null;
};

export const DEFAULT_ORGANIZATION_DATE_FORMAT = "dd MMM yyyy";
export const DEFAULT_FIELD_SEPARATOR = " ";

export const generateOrganizationNumericId = (): string =>
  `${Date.now()}${Math.floor(10000 + Math.random() * 90000)}`;

export const getUserOrganizationIds = (userLike?: UserLike | null): string[] => {
  const ids = new Set<string>();

  if (userLike?.organization) {
    ids.add(String(userLike.organization));
  }

  for (const membership of userLike?.organizationMemberships || []) {
    if (membership) ids.add(String(membership));
  }

  return Array.from(ids);
};

export const normalizeLanguageCode = (value?: string | null): string => {
  const raw = String(value || "").trim();
  if (!raw) return "en";

  if (/^[a-z]{2}(?:-[A-Z]{2})?$/i.test(raw)) {
    return raw.toLowerCase();
  }

  return LANGUAGE_CODE_MAP[raw.toLowerCase()] || "en";
};

export const normalizeFieldSeparator = (explicit?: string | null, dateFormat?: string | null): string => {
  const raw = String(explicit || "").trim();
  if (raw) return raw;

  const format = String(dateFormat || "").trim();
  if (format.includes("-")) return "-";
  if (format.includes("/")) return "/";
  if (format.includes(".")) return ".";
  if (format.includes(" ")) return " ";
  return DEFAULT_FIELD_SEPARATOR;
};

export const getFiscalYearStartMonth = (value?: Date | string | null): number => {
  if (!value) return 0;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return 0;
  return parsed.getMonth();
};

export const monthNameToDate = (value?: string | null, referenceDate: Date = new Date()): Date | undefined => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return undefined;

  const monthIndex = MONTHS.findIndex((month) => month === raw);
  if (monthIndex < 0) return undefined;

  return new Date(referenceDate.getFullYear(), monthIndex, 1);
};

export const buildOrganizationFiscalYearLabel = (value?: Date | string | null): string => {
  const monthIndex = getFiscalYearStartMonth(value);
  const start = MONTHS[monthIndex] || MONTHS[0];
  const end = MONTHS[(monthIndex + 11) % 12] || MONTHS[11];
  return `${start.charAt(0).toUpperCase()}${start.slice(1)} - ${end.charAt(0).toUpperCase()}${end.slice(1)}`;
};

const formatIsoDate = (value?: Date | string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toISOString().slice(0, 10);
};

const formatHumanDate = (value?: Date | string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const addressLinesFromProfile = (address: any): string[] => {
  if (!address || typeof address !== "object") return [];

  return [
    address.street1 || address.street || "",
    address.street2 || "",
    [address.city || "", address.state || ""].filter(Boolean).join(" ").trim(),
    address.zipCode || "",
    address.country || "",
    address.phone || "",
  ]
    .map((line) => String(line || "").trim())
    .filter(Boolean);
};

const buildOrganizationAddressString = (address: any, fallback?: string): string => {
  const lines = addressLinesFromProfile(address);
  if (lines.length) return lines.join("\n");
  return String(fallback || "").trim();
};

const mapAdditionalFieldsToCustomFields = (fields: any): Array<{ index: number; label: string; value: string }> => {
  if (!Array.isArray(fields)) return [];

  return fields.map((field, index) => ({
    index: index + 1,
    label: String(field?.label || field?.name || `Field ${index + 1}`),
    value: String(field?.value ?? ""),
  }));
};

export const normalizeTabanCustomFields = (fields: any): any[] => {
  if (!Array.isArray(fields)) return [];

  return fields.map((field, index) => ({
    index: Number(field?.index || index + 1),
    label: String(field?.label || `Field ${index + 1}`),
    value: String(field?.value ?? ""),
  }));
};

export const ensureOrganizationIdentity = async (organization: any): Promise<string> => {
  if (organization?.organizationId) {
    return String(organization.organizationId);
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    organization.organizationId = generateOrganizationNumericId();

    try {
      await organization.save();
      return String(organization.organizationId);
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
    }
  }

  throw new Error("Failed to assign a unique organization_id");
};

export const ensureOrganizationBaseCurrency = async (
  organizationId: mongoose.Types.ObjectId | string,
  currencyCode?: string | null
) => {
  const normalizedCode = String(currencyCode || "USD").trim().toUpperCase() || "USD";

  await Currency.updateMany(
    { organization: organizationId },
    { $set: { isBaseCurrency: false } }
  );

  let currency = await Currency.findOne({
    organization: organizationId,
    code: normalizedCode,
  });

  if (!currency) {
    const fallback = CURRENCY_SEED_MAP[normalizedCode] || {
      name: normalizedCode,
      symbol: normalizedCode,
    };

    currency = await Currency.create({
      organization: organizationId,
      code: normalizedCode,
      name: fallback.name,
      symbol: fallback.symbol,
      isBaseCurrency: true,
      isActive: true,
    });
  } else {
    currency.isBaseCurrency = true;
    currency.isActive = true;
    await currency.save();
  }

  return currency;
};

export const findOrCreateOrganizationProfile = async (organization: any) => {
  let profile = await Profile.findOne({ organization: organization._id });
  if (profile) return profile;

  profile = await Profile.create({
    organization: organization._id,
    name: organization.name,
    industry: organization.industryType || "",
    email: organization.email || "",
    currency: organization.currency || "USD",
    baseCurrency: organization.currency || "USD",
    fiscalYear: buildOrganizationFiscalYearLabel(organization.fiscalYearStart),
    fiscalYearStart: organization.fiscalYearStart,
    orgLanguage: organization.languageCode || "English",
    commLanguage: organization.languageCode || "English",
    timeZone: organization.timeZone || "UTC",
    dateFormat: organization.dateFormat || DEFAULT_ORGANIZATION_DATE_FORMAT,
    dateSeparator: organization.fieldSeparator || DEFAULT_FIELD_SEPARATOR,
    companyIdType: organization.companyIdLabel || "Company ID",
    companyIdValue: organization.companyIdValue || "",
  });

  return profile;
};

export const buildMergedOrganizationProfile = ({
  organization,
  profile,
  baseCurrency,
}: {
  organization: any;
  profile: any;
  baseCurrency?: any;
}) => {
  const profileData =
    profile && typeof profile.toObject === "function" ? profile.toObject() : profile || {};

  return {
    ...profileData,
    organization: organization?._id,
    organization_id: String(organization?.organizationId || ""),
    name: String(profileData.name || organization?.name || ""),
    legalName: String(organization?.legalName || ""),
    contactName: String(organization?.contactName || ""),
    industry: String(profileData.industry || organization?.industryType || ""),
    industrySize: String(organization?.industrySize || ""),
    email: String(profileData.email || organization?.email || ""),
    phone: String(profileData.phone || ""),
    fax: String(organization?.fax || profileData?.address?.fax || ""),
    website: String(profileData.website || ""),
    taxId: String(profileData.taxId || organization?.taxInfo?.taxId || ""),
    taxName: String(organization?.taxInfo?.taxName || "Tax ID"),
    currency: String(profileData.currency || organization?.currency || baseCurrency?.code || "USD").toUpperCase(),
    baseCurrency: String(baseCurrency?.code || profileData.baseCurrency || organization?.currency || "USD").toUpperCase(),
    fiscalYear: String(profileData.fiscalYear || buildOrganizationFiscalYearLabel(profileData.fiscalYearStart || organization?.fiscalYearStart)),
    fiscalYearStart: profileData.fiscalYearStart || organization?.fiscalYearStart,
    reportBasis: String(profileData.reportBasis || "Accrual"),
    orgLanguage: String(profileData.orgLanguage || organization?.languageCode || "English"),
    commLanguage: String(profileData.commLanguage || profileData.orgLanguage || organization?.languageCode || "English"),
    timeZone: String(organization?.timeZone || profileData.timeZone || "UTC"),
    dateFormat: String(organization?.dateFormat || profileData.dateFormat || DEFAULT_ORGANIZATION_DATE_FORMAT),
    dateSeparator: String(organization?.fieldSeparator || profileData.dateSeparator || DEFAULT_FIELD_SEPARATOR),
    companyIdType: String(profileData.companyIdType || organization?.companyIdLabel || "Company ID"),
    companyIdValue: String(profileData.companyIdValue || organization?.companyIdValue || ""),
    additionalFields: Array.isArray(profileData.additionalFields) ? profileData.additionalFields : [],
    paymentStubAddress: String(profileData.paymentStubAddress || ""),
    showPaymentStubAddress: Boolean(profileData.showPaymentStubAddress),
    address: profileData.address || {},
    logo: String(profileData.logo || ""),
  };
};

export const buildTabanOrganizationPayload = ({
  organization,
  profile,
  currentUser,
  baseCurrency,
  isDefaultOrg,
}: {
  organization: any;
  profile: any;
  currentUser?: { name?: string; email?: string; role?: string } | null;
  baseCurrency?: any;
  isDefaultOrg?: boolean;
}) => {
  const merged = buildMergedOrganizationProfile({ organization, profile, baseCurrency });
  const address = merged.address || {};

  return {
    organization_id: String(organization?.organizationId || ""),
    name: String(organization?.name || ""),
    is_logo_uploaded: Boolean(merged.logo),
    is_default_org: Boolean(isDefaultOrg),
    user_role: String(currentUser?.role || ""),
    account_created_date: formatIsoDate(organization?.createdAt),
    account_created_date_formatted: formatHumanDate(organization?.createdAt),
    time_zone: String(merged.timeZone || "UTC"),
    language_code: normalizeLanguageCode(organization?.languageCode || merged.orgLanguage),
    date_format: String(merged.dateFormat || DEFAULT_ORGANIZATION_DATE_FORMAT),
    field_separator: normalizeFieldSeparator(organization?.fieldSeparator || merged.dateSeparator, merged.dateFormat),
    fiscal_year_start_month: getFiscalYearStartMonth(organization?.fiscalYearStart || merged.fiscalYearStart),
    tax_group_enabled: !Boolean(organization?.settings?.taxComplianceSettings?.salesTaxDisabled),
    user_status: organization?.isActive ? "active" : "inactive",
    contact_name: String(organization?.contactName || currentUser?.name || ""),
    industry_type: String(organization?.industryType || merged.industry || ""),
    industry_size: String(organization?.industrySize || ""),
    address: {
      street_address1: String(address.street1 || address.street || ""),
      street_address2: String(address.street2 || ""),
      city: String(address.city || ""),
      state: String(address.state || ""),
      country: String(address.country || ""),
      zip: String(address.zipCode || ""),
    },
    email: String(merged.email || currentUser?.email || ""),
    phone: String(merged.phone || ""),
    fax: String(organization?.fax || merged.fax || ""),
    website: String(merged.website || ""),
    company_id_label: String(organization?.companyIdLabel || merged.companyIdType || "Company ID"),
    company_id_value: String(organization?.companyIdValue || merged.companyIdValue || ""),
    tax_id_label: String(organization?.taxInfo?.taxName || "Tax ID"),
    tax_id_value: String(organization?.taxInfo?.taxId || merged.taxId || ""),
    currency_id: String(baseCurrency?._id || ""),
    currency_code: String(baseCurrency?.code || organization?.currency || "USD").toUpperCase(),
    currency_symbol: String(baseCurrency?.symbol || "$"),
    currency_format: "###,##0.00",
    price_precision: 2,
    org_address: buildOrganizationAddressString(address),
    remit_to_address: String(merged.paymentStubAddress || ""),
    is_org_active: Boolean(organization?.isActive),
    custom_fields: mapAdditionalFieldsToCustomFields(merged.additionalFields),
    portal_name: String(organization?.portalName || ""),
  };
};

export const findAccessibleOrganizationByIdentifier = async ({
  organizationIds,
  identifier,
}: {
  organizationIds: string[];
  identifier?: string | null;
}) => {
  const normalizedIds = Array.from(new Set((organizationIds || []).map((id) => String(id)).filter(Boolean)));
  if (!normalizedIds.length) return null;

  const requested = String(identifier || "").trim();
  if (!requested) {
    return Organization.findOne({ _id: { $in: normalizedIds } });
  }

  if (mongoose.Types.ObjectId.isValid(requested)) {
    return Organization.findOne({
      _id: { $in: normalizedIds },
      $or: [{ _id: requested }, { organizationId: requested }],
    });
  }

  return Organization.findOne({
    _id: { $in: normalizedIds },
    organizationId: requested,
  });
};

