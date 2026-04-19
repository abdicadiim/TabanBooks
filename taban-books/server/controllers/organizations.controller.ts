import { Request, Response } from "express";
import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import Profile from "../models/Profile.js";
import Currency from "../models/Currency.js";
import User from "../models/User.js";
import SenderEmail from "../models/SenderEmail.js";
import { ensureDefaultChartOfAccounts } from "../utils/defaultChartOfAccounts.js";
import {
  buildTabanOrganizationPayload,
  ensureOrganizationBaseCurrency,
  ensureOrganizationIdentity,
  findAccessibleOrganizationByIdentifier,
  findOrCreateOrganizationProfile,
  getUserOrganizationIds,
  monthNameToDate,
  normalizeFieldSeparator,
  normalizeLanguageCode,
  normalizeTabanCustomFields,
} from "../services/organizationResource.service.js";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
    email?: string;
    organizationIds?: string[];
  };
}

const PLAN_TYPE_MAP: Record<string, number> = {
  free: 0,
  basic: 100,
  professional: 130,
  enterprise: 200,
};

const canManageOrganizations = (role?: string): boolean => {
  const normalizedRole = String(role || "").trim().toLowerCase();
  return normalizedRole === "owner" || normalizedRole === "admin";
};

const normalizeAddressPayload = (address: any) => ({
  street: String(address?.street_address1 || ""),
  street1: String(address?.street_address1 || ""),
  street2: String(address?.street_address2 || ""),
  city: String(address?.city || ""),
  state: String(address?.state || ""),
  zipCode: String(address?.zip || ""),
  country: String(address?.country || ""),
  phone: "",
  fax: "",
});

const getAccessibleOrganizationIds = (req: AuthRequest): string[] =>
  Array.from(new Set((req.user?.organizationIds || [req.user?.organizationId]).filter(Boolean) as string[]));

const buildListOrganizationPayload = (organization: any, tabanPayload: any) => ({
  organization_id: tabanPayload.organization_id,
  name: tabanPayload.name,
  contact_name: tabanPayload.contact_name,
  email: tabanPayload.email,
  is_default_org: tabanPayload.is_default_org,
  plan_type: PLAN_TYPE_MAP[String(organization?.subscription?.plan || "free").toLowerCase()] ?? 0,
  tax_group_enabled: tabanPayload.tax_group_enabled,
  zi_migration_status: 0,
  plan_name: String(organization?.subscription?.plan || "free").toUpperCase(),
  plan_period: "Monthly",
  language_code: tabanPayload.language_code,
  fiscal_year_start_month: tabanPayload.fiscal_year_start_month,
  account_created_date: tabanPayload.account_created_date,
  account_created_date_formatted: tabanPayload.account_created_date_formatted,
  time_zone: tabanPayload.time_zone,
  is_org_active: tabanPayload.is_org_active,
  currency_id: tabanPayload.currency_id,
  currency_code: tabanPayload.currency_code,
  currency_symbol: tabanPayload.currency_symbol,
  currency_format: tabanPayload.currency_format,
  price_precision: tabanPayload.price_precision,
});

const resolveRequestedBaseCurrency = async ({
  organizationId,
  currencyId,
  currencyCode,
}: {
  organizationId: string;
  currencyId?: string | null;
  currencyCode?: string | null;
}): Promise<string | null> => {
  if (currencyId) {
    const currency = await Currency.findOne({
      _id: currencyId,
      organization: organizationId,
    }).lean();

    if (!currency) {
      throw new Error("currency_id is invalid for this organization");
    }

    return String(currency.code || "").trim().toUpperCase() || null;
  }

  if (currencyCode) {
    return String(currencyCode).trim().toUpperCase() || null;
  }

  return null;
};

export const listOrganizations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ code: 57, message: "Unauthorized" });
      return;
    }

    const organizationIds = getAccessibleOrganizationIds(req);
    if (!organizationIds.length) {
      res.json({ code: 0, message: "success", organizations: [] });
      return;
    }

    const [currentUser, organizations] = await Promise.all([
      User.findById(req.user.userId).select("name email role organization organizationMemberships").lean(),
      Organization.find({ _id: { $in: organizationIds } }).sort({ createdAt: 1 }),
    ]);

    await Promise.all(organizations.map((organization) => ensureOrganizationIdentity(organization)));

    const orgObjectIds = organizations.map((organization) => organization._id);
    const [profiles, baseCurrencies] = await Promise.all([
      Profile.find({ organization: { $in: orgObjectIds } }).lean(),
      Currency.find({ organization: { $in: orgObjectIds }, isBaseCurrency: true }).lean(),
    ]);

    const profileMap = new Map(profiles.map((profile: any) => [String(profile.organization), profile]));
    const baseCurrencyMap = new Map(baseCurrencies.map((currency: any) => [String(currency.organization), currency]));
    const defaultOrganizationId = String(currentUser?.organization || req.user.organizationId || "");

    const organizationsPayload = organizations.map((organization) => {
      const tabanPayload = buildTabanOrganizationPayload({
        organization,
        profile: profileMap.get(String(organization._id)),
        currentUser,
        baseCurrency: baseCurrencyMap.get(String(organization._id)),
        isDefaultOrg: String(organization._id) === defaultOrganizationId,
      });

      return buildListOrganizationPayload(organization, tabanPayload);
    });

    res.json({
      code: 0,
      message: "success",
      organizations: organizationsPayload,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 1,
      message: error.message || "Failed to list organizations",
    });
  }
};

export const getOrganization = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ code: 57, message: "Unauthorized" });
      return;
    }

    const organization = await findAccessibleOrganizationByIdentifier({
      organizationIds: getAccessibleOrganizationIds(req),
      identifier: req.params.organization_id,
    });

    if (!organization) {
      res.status(404).json({ code: 1002, message: "Organization not found" });
      return;
    }

    await ensureOrganizationIdentity(organization);

    const [currentUser, profile, baseCurrency] = await Promise.all([
      User.findById(req.user.userId).select("name email role organization").lean(),
      findOrCreateOrganizationProfile(organization),
      ensureOrganizationBaseCurrency(organization._id, organization.currency),
    ]);

    res.json({
      code: 0,
      message: "success",
      organization: buildTabanOrganizationPayload({
        organization,
        profile,
        currentUser,
        baseCurrency,
        isDefaultOrg: String(currentUser?.organization || "") === String(organization._id),
      }),
    });
  } catch (error: any) {
    res.status(500).json({
      code: 1,
      message: error.message || "Failed to fetch organization",
    });
  }
};

export const createOrganization = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ code: 57, message: "Unauthorized" });
      return;
    }

    if (!canManageOrganizations(req.user.role)) {
      res.status(403).json({ code: 58, message: "You do not have permission to create organizations" });
      return;
    }

    const { name, currency_code, time_zone, portal_name, fiscal_year_start_month, date_format, field_separator, language_code, industry_type, industry_size, remit_to_address, address } = req.body || {};

    if (!name || !currency_code || !time_zone || !portal_name) {
      res.status(400).json({
        code: 1001,
        message: "name, currency_code, time_zone and portal_name are required",
      });
      return;
    }

    const normalizedPortalName = String(portal_name || "").trim().toLowerCase();
    if (!/^[a-zA-Z0-9]{5,30}$/.test(normalizedPortalName)) {
      res.status(400).json({
        code: 1001,
        message: "portal_name must be 5-30 alphanumeric characters",
      });
      return;
    }

    const existingPortal = await Organization.findOne({ portalName: normalizedPortalName }).lean();
    if (existingPortal) {
      res.status(400).json({
        code: 1001,
        message: "portal_name is already in use",
      });
      return;
    }

    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) {
      res.status(404).json({ code: 1003, message: "User not found" });
      return;
    }

    const fiscalYearStart = monthNameToDate(fiscal_year_start_month) || new Date(new Date().getFullYear(), 0, 1);
    const normalizedCurrencyCode = String(currency_code || "USD").trim().toUpperCase() || "USD";

    const organization = await Organization.create({
      name: String(name).trim(),
      contactName: currentUser.name,
      email: currentUser.email,
      portalName: normalizedPortalName,
      timeZone: String(time_zone).trim(),
      languageCode: normalizeLanguageCode(language_code),
      dateFormat: String(date_format || "dd MMM yyyy").trim() || "dd MMM yyyy",
      fieldSeparator: normalizeFieldSeparator(field_separator, date_format),
      industryType: String(industry_type || ""),
      industrySize: String(industry_size || ""),
      fiscalYearStart,
      currency: normalizedCurrencyCode,
      companyIdLabel: "Company ID",
      companyIdValue: "",
      taxInfo: {
        taxName: "Tax ID",
        taxId: "",
      },
    });

    await ensureOrganizationIdentity(organization);

    const profile = await Profile.create({
      organization: organization._id,
      name: organization.name,
      industry: String(industry_type || ""),
      email: currentUser.email,
      currency: normalizedCurrencyCode,
      baseCurrency: normalizedCurrencyCode,
      fiscalYearStart,
      fiscalYear: "",
      reportBasis: "Accrual",
      orgLanguage: String(language_code || "English"),
      commLanguage: String(language_code || "English"),
      timeZone: String(time_zone).trim(),
      dateFormat: String(date_format || "dd MMM yyyy").trim() || "dd MMM yyyy",
      dateSeparator: normalizeFieldSeparator(field_separator, date_format),
      companyIdType: "Company ID",
      companyIdValue: "",
      paymentStubAddress: String(remit_to_address || ""),
      showPaymentStubAddress: Boolean(remit_to_address),
      address: normalizeAddressPayload(address),
      additionalFields: [],
    });

    const baseCurrency = await ensureOrganizationBaseCurrency(organization._id, normalizedCurrencyCode);

    try {
      await ensureDefaultChartOfAccounts({
        organizationId: organization._id,
        currency: normalizedCurrencyCode,
      });
    } catch (error) {
      console.warn("[Organizations] Failed to seed default chart of accounts:", error);
    }

    try {
      await SenderEmail.create({
        organization: organization._id,
        name: organization.name,
        email: currentUser.email,
        isPrimary: true,
        isVerified: true,
      });
    } catch (error) {
      console.warn("[Organizations] Failed to create default sender email:", error);
    }

    const membershipIds = getUserOrganizationIds(currentUser);
    if (!membershipIds.includes(String(organization._id))) {
      membershipIds.push(String(organization._id));
      currentUser.organizationMemberships = membershipIds.map((id) => new mongoose.Types.ObjectId(id));
      await currentUser.save();
    }

    res.status(201).json({
      code: 0,
      message: "success",
      organization: buildTabanOrganizationPayload({
        organization,
        profile,
        currentUser,
        baseCurrency,
        isDefaultOrg: String(currentUser.organization || "") === String(organization._id),
      }),
    });
  } catch (error: any) {
    res.status(500).json({
      code: 1,
      message: error.message || "Failed to create organization",
    });
  }
};

export const updateOrganization = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ code: 57, message: "Unauthorized" });
      return;
    }

    if (!canManageOrganizations(req.user.role)) {
      res.status(403).json({ code: 58, message: "You do not have permission to update organizations" });
      return;
    }

    const organization = await findAccessibleOrganizationByIdentifier({
      organizationIds: getAccessibleOrganizationIds(req),
      identifier: req.params.organization_id,
    });

    if (!organization) {
      res.status(404).json({ code: 1002, message: "Organization not found" });
      return;
    }

    await ensureOrganizationIdentity(organization);
    const currentUser = await User.findById(req.user.userId).select("name email role organization").lean();
    const profile = await findOrCreateOrganizationProfile(organization);

    const {
      name,
      fiscal_year_start_month,
      is_logo_uploaded,
      time_zone,
      date_format,
      field_separator,
      language_code,
      org_address,
      remit_to_address,
      address,
      contact_name,
      phone,
      fax,
      website,
      email,
      currency_id,
      currency_code,
      companyid_label,
      company_id_label,
      companyid_value,
      company_id_value,
      taxid_label,
      tax_id_label,
      taxid_value,
      tax_id_value,
      custom_fields,
      industry_type,
      industry_size,
      portal_name,
    } = req.body || {};

    if (portal_name !== undefined) {
      const normalizedPortalName = String(portal_name || "").trim().toLowerCase();
      if (normalizedPortalName && !/^[a-zA-Z0-9]{5,30}$/.test(normalizedPortalName)) {
        res.status(400).json({
          code: 1001,
          message: "portal_name must be 5-30 alphanumeric characters",
        });
        return;
      }

      if (normalizedPortalName) {
        const existingPortal = await Organization.findOne({
          portalName: normalizedPortalName,
          _id: { $ne: organization._id },
        }).lean();

        if (existingPortal) {
          res.status(400).json({
            code: 1001,
            message: "portal_name is already in use",
          });
          return;
        }

        organization.portalName = normalizedPortalName;
      } else {
        organization.portalName = "";
      }
    }

    if (name !== undefined) organization.name = String(name || "").trim();
    if (contact_name !== undefined) organization.contactName = String(contact_name || "").trim();
    if (industry_type !== undefined) {
      organization.industryType = String(industry_type || "");
      profile.industry = String(industry_type || "");
    }
    if (industry_size !== undefined) organization.industrySize = String(industry_size || "");
    if (time_zone !== undefined) {
      organization.timeZone = String(time_zone || "UTC").trim() || "UTC";
      profile.timeZone = organization.timeZone;
    }
    if (date_format !== undefined) {
      organization.dateFormat = String(date_format || "dd MMM yyyy").trim() || "dd MMM yyyy";
      profile.dateFormat = organization.dateFormat;
    }
    if (field_separator !== undefined) {
      organization.fieldSeparator = normalizeFieldSeparator(field_separator, date_format || organization.dateFormat);
      profile.dateSeparator = organization.fieldSeparator;
    }
    if (language_code !== undefined) {
      organization.languageCode = normalizeLanguageCode(language_code);
      profile.orgLanguage = String(language_code || "English");
    }

    if (fiscal_year_start_month !== undefined) {
      const nextFiscalYearStart = monthNameToDate(fiscal_year_start_month);
      if (!nextFiscalYearStart) {
        res.status(400).json({
          code: 1001,
          message: "Invalid fiscal_year_start_month",
        });
        return;
      }

      organization.fiscalYearStart = nextFiscalYearStart;
      profile.fiscalYearStart = nextFiscalYearStart;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      organization.email = normalizedEmail;
      profile.email = normalizedEmail;
    }
    if (website !== undefined) profile.website = String(website || "");
    if (phone !== undefined) profile.phone = String(phone || "");

    const nextFax = fax !== undefined ? String(fax || "") : undefined;
    if (nextFax !== undefined) organization.fax = nextFax;

    if (address !== undefined) {
      profile.address = normalizeAddressPayload(address) as any;
      if (nextFax !== undefined) {
        (profile.address as any).fax = nextFax;
      }
    }

    if (org_address !== undefined && !address) {
      profile.paymentStubAddress = String(org_address || "");
    }

    if (remit_to_address !== undefined) {
      profile.paymentStubAddress = String(remit_to_address || "");
      profile.showPaymentStubAddress = Boolean(remit_to_address);
    }

    const resolvedCompanyIdLabel = company_id_label ?? companyid_label;
    if (resolvedCompanyIdLabel !== undefined) {
      organization.companyIdLabel = String(resolvedCompanyIdLabel || "Company ID");
      profile.companyIdType = organization.companyIdLabel;
    }

    const resolvedCompanyIdValue = company_id_value ?? companyid_value;
    if (resolvedCompanyIdValue !== undefined) {
      organization.companyIdValue = String(resolvedCompanyIdValue || "");
      profile.companyIdValue = organization.companyIdValue;
    }

    const resolvedTaxIdLabel = tax_id_label ?? taxid_label;
    if (resolvedTaxIdLabel !== undefined) {
      organization.taxInfo = {
        ...(organization.taxInfo || {}),
        taxName: String(resolvedTaxIdLabel || "Tax ID"),
      };
    }

    const resolvedTaxIdValue = tax_id_value ?? taxid_value;
    if (resolvedTaxIdValue !== undefined) {
      organization.taxInfo = {
        ...(organization.taxInfo || {}),
        taxId: String(resolvedTaxIdValue || ""),
      };
      profile.taxId = String(resolvedTaxIdValue || "");
    }

    if (custom_fields !== undefined) {
      profile.additionalFields = normalizeTabanCustomFields(custom_fields) as any;
    }

    if (is_logo_uploaded === false) {
      profile.logo = "";
    }

    const requestedBaseCurrency = await resolveRequestedBaseCurrency({
      organizationId: String(organization._id),
      currencyId: currency_id,
      currencyCode: currency_code,
    });

    if (requestedBaseCurrency) {
      organization.currency = requestedBaseCurrency;
      profile.baseCurrency = requestedBaseCurrency;
      profile.currency = requestedBaseCurrency;
    }

    await organization.save();
    await profile.save();

    const baseCurrency = requestedBaseCurrency
      ? await ensureOrganizationBaseCurrency(organization._id, requestedBaseCurrency)
      : await ensureOrganizationBaseCurrency(organization._id, organization.currency);

    res.json({
      code: 0,
      message: "success",
      organization: buildTabanOrganizationPayload({
        organization,
        profile,
        currentUser,
        baseCurrency,
        isDefaultOrg: String(currentUser?.organization || "") === String(organization._id),
      }),
    });
  } catch (error: any) {
    const isCurrencyError = String(error?.message || "").includes("currency_id is invalid");
    res.status(isCurrencyError ? 400 : 500).json({
      code: isCurrencyError ? 1001 : 1,
      message: error.message || "Failed to update organization",
    });
  }
};

