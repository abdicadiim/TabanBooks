/**
 * Settings Controller
 * Handles Organization, Users, Taxes, Currency Settings
 */

import { Request, Response } from "express";
import Organization from "../models/Organization.js";
import Profile from "../models/Profile.js";
import Branding from "../models/Branding.js";
import Location from "../models/Location.js";
import Currency from "../models/Currency.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import { sendInvitationEmail } from "../services/email.service.js";
import {
  buildMergedOrganizationProfile,
  buildOrganizationFiscalYearLabel,
  ensureOrganizationBaseCurrency,
  ensureOrganizationIdentity,
  findOrCreateOrganizationProfile,
  normalizeFieldSeparator,
  normalizeLanguageCode,
} from "../services/organizationResource.service.js";

const ACCENT_COLOR_MAP: Record<string, string> = {
  white: "#ffffff",
  blue: "#3b82f6",
  green: "#10b981",
  red: "#ef4444",
  orange: "#f97316",
  purple: "#a855f7",
};

const normalizeBrandAccentColor = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "#ffffff";
  const lower = raw.toLowerCase();
  return ACCENT_COLOR_MAP[lower] || raw;
};

// Placeholder - implement full CRUD operations
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const organization = await Organization.findById(organizationId);
    res.json({ success: true, data: organization });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch settings" });
  }
};

/**
 * Get Organization Profile
 * GET /api/settings/organization/profile
 */
export const getOrganizationProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      res.status(401).json({
        success: false,
        message: "Organization ID is required",
      });
      return;
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      res.status(404).json({
        success: false,
        message: "Organization not found",
      });
      return;
    }
    await ensureOrganizationIdentity(organization);

    const [profile, baseCurrencyDoc] = await Promise.all([
      findOrCreateOrganizationProfile(organization),
      Currency.findOne({ organization: organizationId, isBaseCurrency: true }).lean(),
    ]);

    res.json({
      success: true,
      data: buildMergedOrganizationProfile({
        organization,
        profile,
        baseCurrency: baseCurrencyDoc,
      }),
    });
  } catch (error: any) {
    console.error("Error fetching organization profile:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      organizationId: (req as any).user?.organizationId,
      hasUser: !!(req as any).user,
    });
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch organization profile",
    });
  }
};

/**
 * Update Organization Profile
 * PUT /api/settings/organization/profile
 */
export const updateOrganizationProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;
    console.log("📝 Update Profile Request:", {
      organizationId,
      body: req.body,
    });

    const debugProfilePayload = (label: string, payload: any) => {
      if (process.env.NODE_ENV === "development") {
        console.log(`[settings.profile] ${label}`, payload);
      }
    };

    const {
      name,
      legalName,
      industry,
      industry_type,
      email,
      phone,
      website,
      logo,
      address,
      currency,
      baseCurrency,
      currency_code,
      fiscalYearStart,
      fiscalYear,
      reportBasis,
      orgLanguage,
      commLanguage,
      timeZone,
      time_zone,
      dateFormat,
      date_format,
      dateSeparator,
      field_separator,
      companyIdType,
      companyIdValue,
      contact_name,
      additionalFields,
      custom_fields,
      paymentStubAddress,
      remit_to_address,
      showPaymentStubAddress,
      street_address1,
      street_address2,
      zip,
      postalCode,
      country,
      countryIso,
      city: bodyCity,
      state: bodyState,
      phone: bodyPhone,
      fax: bodyFax,
    } = req.body;
    if (!organizationId) {
      res.status(401).json({
        success: false,
        message: "Organization ID is required",
      });
      return;
    }

    // Validate required fields
    if (!name || name.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Organization name is required",
      });
      return;
    }

    // Check if organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      res.status(404).json({
        success: false,
        message: "Organization not found",
      });
      return;
    }
    await ensureOrganizationIdentity(organization);
    const currentBaseCurrencyCode = String(organization.currency || "USD").trim().toUpperCase() || "USD";

    // Prepare update data
    const updateData: any = {
      organization: organizationId, // Ensure organization is set
      name: name.trim(),
    };
    const organizationUpdate: any = {
      name: name.trim(),
    };

    // Add fields if they are provided (including empty strings and null)
    if (legalName !== undefined) organizationUpdate.legalName = legalName || "";
    const resolvedIndustry = industry !== undefined ? industry : industry_type;
    if (resolvedIndustry !== undefined) {
      updateData.industry = resolvedIndustry || "";
      organizationUpdate.industryType = resolvedIndustry || "";
    }
    if (contact_name !== undefined) organizationUpdate.contactName = contact_name || "";
    if (email !== undefined) {
      const normalizedEmail = email ? email.toLowerCase().trim() : "";
      updateData.email = normalizedEmail;
      organizationUpdate.email = normalizedEmail;
    }
    if (phone !== undefined) updateData.phone = phone || "";
    if (website !== undefined) updateData.website = website || "";
    if (logo !== undefined) {
      // Only set logo if it's not empty and not too large
      if (logo && logo.trim() !== "") {
        // Limit logo size to 5MB (base64 encoded)
        if (logo.length > 5000000) {
          console.warn("⚠️ Logo is too large, skipping logo update");
          // Don't update logo if it's too large - keep existing or empty
        } else {
          updateData.logo = logo;
        }
      } else {
        updateData.logo = "";
      }
    }
    const resolvedBaseCurrency = baseCurrency !== undefined ? baseCurrency : currency_code;
    if (currency !== undefined || currency_code !== undefined) {
      updateData.currency = String(resolvedBaseCurrency || "USD").trim().toUpperCase() || "USD";
    }
    if (resolvedBaseCurrency !== undefined) {
      updateData.baseCurrency = String(resolvedBaseCurrency || "USD").trim().toUpperCase() || "USD";
      organizationUpdate.currency = updateData.baseCurrency;
    }
    if (fiscalYearStart !== undefined) {
      updateData.fiscalYearStart = fiscalYearStart ? new Date(fiscalYearStart) : new Date(new Date().getFullYear(), 0, 1);
      organizationUpdate.fiscalYearStart = updateData.fiscalYearStart;
      if (fiscalYear === undefined) {
        updateData.fiscalYear = buildOrganizationFiscalYearLabel(updateData.fiscalYearStart);
      }
    }
    if (fiscalYear !== undefined) updateData.fiscalYear = fiscalYear || "January - December";
    if (reportBasis !== undefined) updateData.reportBasis = reportBasis || "Accrual";
    if (orgLanguage !== undefined) {
      updateData.orgLanguage = orgLanguage || "English";
      organizationUpdate.languageCode = normalizeLanguageCode(orgLanguage);
    }
    if (commLanguage !== undefined) updateData.commLanguage = commLanguage || "English";
    const resolvedTimeZone = timeZone !== undefined ? timeZone : time_zone;
    if (resolvedTimeZone !== undefined) {
      updateData.timeZone = resolvedTimeZone || "UTC";
      organizationUpdate.timeZone = updateData.timeZone;
    }
    const resolvedDateFormat = dateFormat !== undefined ? dateFormat : date_format;
    if (resolvedDateFormat !== undefined) {
      updateData.dateFormat = resolvedDateFormat || "dd-MM-yyyy";
      organizationUpdate.dateFormat = updateData.dateFormat;
    }
    const resolvedDateSeparator = dateSeparator !== undefined ? dateSeparator : field_separator;
    if (resolvedDateSeparator !== undefined) {
      updateData.dateSeparator = normalizeFieldSeparator(resolvedDateSeparator || "-", resolvedDateFormat || organization.dateFormat);
      organizationUpdate.fieldSeparator = updateData.dateSeparator;
    }
    if (companyIdType !== undefined) {
      updateData.companyIdType = companyIdType || "Company ID";
      organizationUpdate.companyIdLabel = updateData.companyIdType;
    }
    if (companyIdValue !== undefined) {
      updateData.companyIdValue = companyIdValue || "";
      organizationUpdate.companyIdValue = updateData.companyIdValue;
    }
    const resolvedAdditionalFields = additionalFields !== undefined ? additionalFields : custom_fields;
    if (resolvedAdditionalFields !== undefined) updateData.additionalFields = Array.isArray(resolvedAdditionalFields) ? resolvedAdditionalFields : [];
    const resolvedPaymentStubAddress = paymentStubAddress !== undefined ? paymentStubAddress : remit_to_address;
    if (resolvedPaymentStubAddress !== undefined) updateData.paymentStubAddress = resolvedPaymentStubAddress || "";
    if (showPaymentStubAddress !== undefined) updateData.showPaymentStubAddress = showPaymentStubAddress || false;

    const resolvedAddress = address && typeof address === "object" ? address : {};
    const resolvedStreet1 =
      resolvedAddress.street1 ??
      resolvedAddress.street_address1 ??
      resolvedAddress.streetAddress1 ??
      street_address1 ??
      "";
    const resolvedStreet2 =
      resolvedAddress.street2 ??
      resolvedAddress.street_address2 ??
      resolvedAddress.streetAddress2 ??
      street_address2 ??
      "";
    const resolvedCity = resolvedAddress.city ?? bodyCity ?? "";
    const resolvedState = resolvedAddress.state ?? bodyState ?? "";
    const resolvedZip =
      resolvedAddress.zipCode ??
      resolvedAddress.zip ??
      resolvedAddress.postalCode ??
      zip ??
      postalCode ??
      "";
    const resolvedCountry =
      resolvedAddress.country ??
      resolvedAddress.countryIso ??
      country ??
      countryIso ??
      "";
    const resolvedPhone = resolvedAddress.phone ?? bodyPhone ?? "";
    const resolvedFax = resolvedAddress.fax ?? bodyFax ?? "";

    // Handle address object and common aliases
    if (
      address !== undefined ||
      street_address1 !== undefined ||
      street_address2 !== undefined ||
      zip !== undefined ||
      postalCode !== undefined ||
      country !== undefined ||
      countryIso !== undefined ||
      bodyCity !== undefined ||
      bodyState !== undefined ||
      bodyPhone !== undefined ||
      bodyFax !== undefined
    ) {
      updateData.address = {
        street: resolvedAddress.street || resolvedStreet1 || "",
        street1: resolvedStreet1,
        street2: resolvedStreet2,
        city: resolvedCity,
        state: resolvedState,
        zipCode: resolvedZip,
        country: resolvedCountry,
        phone: resolvedPhone,
        fax: resolvedFax,
      };
      organizationUpdate.fax = resolvedFax || organization.fax || "";
      debugProfilePayload("address-resolved", updateData.address);
    }

    // Ensure organization is always set in updateData
    updateData.organization = organizationId;

    // Limit logo size if it's too large (MongoDB has 16MB document limit)
    if (updateData.logo && updateData.logo.length > 10000000) { // 10MB limit for logo
      console.warn("⚠️ Logo is too large, truncating...");
      updateData.logo = updateData.logo.substring(0, 10000000);
    }

    console.log("📤 Attempting to save profile with data:", {
      organizationId,
      updateDataKeys: Object.keys(updateData),
      hasLogo: !!updateData.logo,
      logoSize: updateData.logo ? updateData.logo.length : 0,
    });

    Object.assign(organization, organizationUpdate);
    await organization.save();

    // Use findOneAndUpdate with upsert to create or update
    const profile = await Profile.findOneAndUpdate(
      { organization: organizationId },
      { $set: updateData }, // Use $set operator for proper update
      {
        new: true, // Return updated document
        upsert: true, // Create if doesn't exist
        runValidators: true, // Run schema validators
        setDefaultsOnInsert: true, // Apply defaults on insert
      }
    );

    const baseCurrencyDoc =
      baseCurrency !== undefined
        ? await Currency.findOne({ organization: organizationId, code: updateData.baseCurrency }).lean()
        : await Currency.findOne({ organization: organizationId, isBaseCurrency: true }).lean();

    const nextBaseCurrencyCode = String(updateData.baseCurrency || "").trim().toUpperCase() || currentBaseCurrencyCode;
    const baseCurrencyChanged = baseCurrency !== undefined && nextBaseCurrencyCode !== currentBaseCurrencyCode;
    if (baseCurrencyChanged) {
      void ensureOrganizationBaseCurrency(organizationId, nextBaseCurrencyCode).catch((currencyError) => {
        console.error("⚠️ Background base currency sync failed:", currencyError);
      });
    }

    console.log("✅ Profile saved successfully:", {
      profileId: profile._id,
      organizationId: profile.organization,
      name: profile.name,
      logo: profile.logo ? `Logo present (${profile.logo.substring(0, 50)}...)` : "No logo",
      savedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Organization profile updated successfully",
      data: buildMergedOrganizationProfile({
        organization,
        profile,
        baseCurrency: baseCurrencyDoc || (baseCurrency !== undefined ? { code: nextBaseCurrencyCode, isBaseCurrency: true } : undefined),
      }),
    });
  } catch (error: any) {
    console.error("❌ Error updating organization profile:", error);
    console.error("❌ Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      errors: error.errors,
    });

    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const messages = Object.values((error as any).errors || {}).map((err: any) => err.message).join(', ');
      res.status(400).json({
        success: false,
        message: `Validation error: ${messages}`,
        errors: (error as any).errors,
      });
      return;
    }

    // Handle duplicate key error
    if ((error as any).code === 11000) {
      const field = Object.keys((error as any).keyPattern || {})[0] || 'field';
      res.status(400).json({
        success: false,
        message: `${field} already exists`,
        duplicateField: field,
      });
      return;
    }

    // Handle CastError (invalid ObjectId, etc.)
    if (error.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: `Invalid data type for field: ${(error as any).path}`,
        field: (error as any).path,
        value: (error as any).value,
      });
      return;
    }

    // Return detailed error response
    const errorResponse: any = {
      success: false,
      message: error.message || "Failed to update organization profile",
    };

    if (process.env.NODE_ENV === "development") {
      errorResponse.error = error.message;
      errorResponse.stack = (error as any).stack;
      errorResponse.details = {
        name: error.name,
        code: (error as any).code,
      };
    }

    res.status(500).json(errorResponse);
  }
};

/**
 * Get Organization Branding
 * GET /api/settings/organization/branding
 */
export const getOrganizationBranding = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;
    console.log("[BRANDING][GET] request", {
      organizationId,
      hasUser: Boolean((req as any).user),
      path: req.originalUrl,
    });
    if (!organizationId) {
      res.status(401).json({
        success: false,
        message: "Organization ID is required",
      });
      return;
    }

    // Read branding and profile in parallel so the page can render faster.
    const [existingBranding, profile] = await Promise.all([
      Branding.findOne({ organization: organizationId }).lean(),
      Profile.findOne({ organization: organizationId }).lean(),
    ]);

    let branding = existingBranding;

    // If branding doesn't exist, create default one
    if (!branding) {
      branding = await Branding.create({
        organization: organizationId,
        appearance: "dark",
        accentColor: "#ffffff",
      });
    }

    // Convert "system" to "dark" for backward compatibility
    const brandingData: any = typeof (branding as any).toObject === "function" ? (branding as any).toObject() : branding;
    if (brandingData.appearance === "system") {
      brandingData.appearance = "dark";
    }
    brandingData.accentColor = normalizeBrandAccentColor(brandingData.accentColor);

    res.json({
      success: true,
      data: {
        ...brandingData,
        logo: profile?.logo || "",
      },
    });
    console.log("[BRANDING][GET] success", {
      organizationId,
      appearance: brandingData.appearance,
      accentColor: brandingData.accentColor,
      hasLogo: Boolean(profile?.logo),
    });
  } catch (error: any) {
    console.error("Error fetching organization branding:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      organizationId: (req as any).user?.organizationId,
      hasUser: !!(req as any).user,
    });
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch organization branding",
    });
  }
};

/**
 * Update Organization Branding
 * PUT /api/settings/organization/branding
 */
export const updateOrganizationBranding = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const organizationId = (req as any).user?.organizationId;
    console.log("[BRANDING][PUT] request", {
      organizationId,
      userId,
      bodyKeys: Object.keys(req.body || {}),
      path: req.originalUrl,
    });

    if (!organizationId) {
      res.status(401).json({
        success: false,
        message: "Organization ID is required",
      });
      return;
    }

    const {
      appearance,
      accentColor,
      sidebarDarkFrom,
      sidebarDarkTo,
      sidebarLightFrom,
      sidebarLightTo,
      keepZohoBranding,
      logo, // Logo is stored in Profile, not Branding
    } = req.body;
    const normalizedAccentColor = accentColor !== undefined ? normalizeBrandAccentColor(accentColor) : undefined;

    // Convert "system" to "dark" if provided
    const appearanceValue = appearance === "system" ? "dark" : appearance;

    // Check if organization exists
    const organization = await Organization.findById((req as any).user.organizationId);
    if (!organization) {
      res.status(404).json({
        success: false,
        message: "Organization not found",
      });
      return;
    }

    // Prepare branding update data
    const brandingUpdateData: any = {
      organization: (req as any).user.organizationId,
    };

    if (appearance !== undefined) brandingUpdateData.appearance = appearanceValue;
    if (accentColor !== undefined) brandingUpdateData.accentColor = normalizedAccentColor;
    if (sidebarDarkFrom !== undefined) brandingUpdateData.sidebarDarkFrom = sidebarDarkFrom;
    if (sidebarDarkTo !== undefined) brandingUpdateData.sidebarDarkTo = sidebarDarkTo;
    if (sidebarLightFrom !== undefined) brandingUpdateData.sidebarLightFrom = sidebarLightFrom;
    if (sidebarLightTo !== undefined) brandingUpdateData.sidebarLightTo = sidebarLightTo;
    if (keepZohoBranding !== undefined) brandingUpdateData.keepZohoBranding = keepZohoBranding;

    // If sidebar colors are not provided, set defaults based on appearance
    if (!sidebarDarkFrom && !sidebarLightFrom) {
      brandingUpdateData.sidebarDarkFrom = "#156372"; // Solid New button color
      brandingUpdateData.sidebarDarkTo = "#156372"; // Same color for solid (no gradient)
      brandingUpdateData.sidebarLightFrom = "#f9fafb"; // bg-gray-50 (expense form background)
      brandingUpdateData.sidebarLightTo = "#f3f4f6"; // bg-gray-100
    }

    // Update or create branding
    const branding = await Branding.findOneAndUpdate(
      { organization: (req as any).user.organizationId },
      { $set: brandingUpdateData },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    // Update logo in Profile if provided
    if (logo !== undefined) {
      const profileUpdateData: any = {};
      if (logo && logo.trim() !== "") {
        if (logo.length > 5000000) {
          console.warn("⚠️ Logo is too large, skipping logo update");
        } else {
          profileUpdateData.logo = logo;
        }
      } else {
        profileUpdateData.logo = "";
      }

      if (Object.keys(profileUpdateData).length > 0) {
        await Profile.findOneAndUpdate(
          { organization: (req as any).user.organizationId },
          { $set: profileUpdateData },
          { upsert: true }
        );
      }
    }

    // Get updated profile for logo
    const profile = await Profile.findOne({ organization: (req as any).user.organizationId });

    console.log("✅ Branding saved successfully:", {
      organizationId,
      appearance: branding.appearance,
      accentColor: branding.accentColor,
      savedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Organization branding updated successfully",
      data: {
        ...branding.toObject(),
        accentColor: normalizeBrandAccentColor(branding.accentColor),
        logo: profile?.logo || "",
      },
    });
  } catch (error: any) {
    console.error("❌ Error updating organization branding:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update organization branding",
    });
  }
};

/**
 * Check if locations are enabled for organization
 * GET /api/settings/organization/locations/enabled
 */
export const getLocationsEnabledStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        message: "Organization ID is required",
      });
      return;
    }

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      res.status(404).json({
        success: false,
        message: "Organization not found",
      });
      return;
    }

    const isEnabled = organization.settings?.enableLocations || false;

    res.json({
      success: true,
      data: { enabled: isEnabled },
    });
  } catch (error: any) {
    console.error("❌ Error checking locations enabled status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check locations enabled status",
    });
  }
};

/**
 * Enable locations for organization
 * POST /api/settings/organization/locations/enable
 */
export const enableLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;


    if (!organizationId) {
      res.status(401).json({
        success: false,
        message: "Organization ID is required",
      });
      return;
    }

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      res.status(404).json({
        success: false,
        message: "Organization not found",
      });
      return;
    }

    // Enable locations in organization settings
    (organization as any).settings = (organization as any).settings || {};
    (organization as any).settings.enableLocations = true;
    await organization.save();

    // Create default "Head Office" location if no locations exist
    const existingLocations = await Location.find({
      organization: organizationId,
      isActive: true,
    });

    if (existingLocations.length === 0) {
      // Get organization profile to get country
      const profile = await Profile.findOne({ organization: organizationId });
      const country = profile?.address?.country || "United Kingdom";

      await Location.create({
        organization: organizationId,
        name: "Head Office",
        type: "Business",
        isDefault: true,
        defaultTransactionSeries: "Default Transaction Series",
        address: {
          country: country,
        },
      });
    }

    res.json({
      success: true,
      message: "Locations enabled successfully",
      data: { enabled: true },
    });
  } catch (error: any) {
    console.error("❌ Error enabling locations:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to enable locations",
    });
  }
};

/**
 * Get all locations for organization
 * GET /api/settings/organization/locations
 */
export const getLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const locations = await Location.find({
      organization: (req as any).user.organizationId,
      isActive: true,
    }).sort({ isDefault: -1, name: 1 });

    res.json({
      success: true,
      data: locations,
    });
  } catch (error: any) {
    console.error("❌ Error fetching locations:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch locations",
    });
  }
};

/**
 * Get a single location by ID
 * GET /api/settings/organization/locations/:id
 */
export const getLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const location = await Location.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!location) {
      res.status(404).json({
        success: false,
        message: "Location not found",
      });
      return;
    }

    res.json({
      success: true,
      data: location,
    });
  } catch (error: any) {
    console.error("❌ Error fetching location:", error);

    if (error.name === "CastError") {
      res.status(400).json({
        success: false,
        message: "Invalid location ID",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch location",
    });
  }
};

/**
 * Create a new location
 * POST /api/settings/organization/locations
 */
export const createLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      type,
      isDefault,
      defaultTransactionSeries,
      address,
      contactPerson,
      notes,
      parentLocation,
      logo,
    } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: "Location name is required",
      });
      return;
    }

    // Check if location name already exists for this organization
    const existingLocation = await Location.findOne({
      organization: (req as any).user.organizationId,
      name: name.trim(),
    });

    if (existingLocation) {
      res.status(400).json({
        success: false,
        message: "Location with this name already exists",
      });
      return;
    }

    // Validate parentLocation if provided
    let validatedParentLocation: any = null;
    if (parentLocation) {
      try {
        // Check if parent location exists and belongs to the same organization
        const parentLoc = await Location.findOne({
          _id: parentLocation,
          organization: (req as any).user.organizationId,
        });

        if (!parentLoc) {
          res.status(400).json({
            success: false,
            message: "Parent location not found or does not belong to your organization",
          });
          return;
        }

        validatedParentLocation = parentLocation;
      } catch (err: any) {
        res.status(400).json({
          success: false,
          message: "Invalid parent location ID",
        });
        return;
      }
    }

    // Truncate logo if it's too large (base64 strings can be very long)
    let validatedLogo = logo || "";
    if (validatedLogo && validatedLogo.length > 1000000) { // 1MB limit for base64
      res.status(400).json({
        success: false,
        message: "Logo file is too large. Maximum size is 1MB",
      });
      return;
    }

    const location = await Location.create({
      organization: (req as any).user.organizationId,
      name: name.trim(),
      type: type || "Business",
      isDefault: isDefault || false,
      defaultTransactionSeries: defaultTransactionSeries || "Default Transaction Series",
      address: address || {},
      contactPerson: contactPerson || {},
      notes: notes || "",
      parentLocation: validatedParentLocation,
      logo: validatedLogo,
    });

    res.status(201).json({
      success: true,
      message: "Location created successfully",
      data: location,
    });
  } catch (error: any) {
    console.error("❌ Error creating location:", error);
    console.error("❌ Error stack:", error.stack);

    if (error.name === "ValidationError") {
      res.status(400).json({
        success: false,
        message: Object.values((error as any).errors || {}).map((e: any) => e.message).join(", "),
      });
    }

    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "Location with this name already exists for this organization",
      });
    }

    if (error.name === "CastError") {
      res.status(400).json({
        success: false,
        message: "Invalid data format provided",
      });
    }

    // Ensure we always send a JSON response
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create location. Please check the server logs for details.",
    });
  }
};

/**
 * Update a location
 * PUT /api/settings/organization/locations/:id
 */
export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      isDefault,
      defaultTransactionSeries,
      address,
      contactPerson,
      notes,
      isActive,
      parentLocation,
      logo,
    } = req.body;

    const location = await Location.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!location) {
      res.status(404).json({
        success: false,
        message: "Location not found",
      });
      return;
    }

    // Validate parentLocation if provided
    let validatedParentLocation: any = location.parentLocation;
    if (parentLocation !== undefined) {
      if (parentLocation === null || parentLocation === "") {
        validatedParentLocation = undefined;
      } else {
        try {
          // Check if parent location exists and belongs to the same organization
          const parentLoc = await Location.findOne({
            _id: parentLocation,
            organization: (req as any).user.organizationId,
          }).where('_id').ne(id);

          if (!parentLoc) {
            res.status(400).json({
              success: false,
              message: "Parent location not found or does not belong to your organization",
            });
            return;
          }

          validatedParentLocation = parentLocation;
        } catch (err: any) {
          res.status(400).json({
            success: false,
            message: "Invalid parent location ID",
          });
          return;
        }
      }
    }

    // Validate logo size if provided
    let validatedLogo = location.logo;
    if (logo !== undefined) {
      if (logo && logo.length > 1000000) { // 1MB limit for base64
        res.status(400).json({
          success: false,
          message: "Logo file is too large. Maximum size is 1MB",
        });
        return;
      }
      validatedLogo = logo || "";
    }

    // Update fields
    if (name !== undefined) location.name = name.trim();
    if (type !== undefined) location.type = type;
    if (isDefault !== undefined) location.isDefault = isDefault;
    if (defaultTransactionSeries !== undefined) location.defaultTransactionSeries = defaultTransactionSeries;
    if (address !== undefined) location.address = { ...location.address, ...address };
    if (contactPerson !== undefined) location.contactPerson = { ...location.contactPerson, ...contactPerson };
    if (notes !== undefined) location.notes = notes;
    if (isActive !== undefined) location.isActive = isActive;
    if (parentLocation !== undefined) location.parentLocation = validatedParentLocation;
    if (logo !== undefined) location.logo = validatedLogo;

    await location.save();

    res.json({
      success: true,
      message: "Location updated successfully",
      data: location,
    });
  } catch (error: any) {
    console.error("❌ Error updating location:", error);
    console.error("❌ Error stack:", error.stack);

    if (error.name === "ValidationError") {
      res.status(400).json({
        success: false,
        message: Object.values((error as any).errors || {}).map((e: any) => e.message).join(", "),
      });
    }

    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "Location with this name already exists for this organization",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update location. Please check the server logs for details.",
    });
  }
};

/**
 * Delete a location
 * DELETE /api/settings/organization/locations/:id
 */
export const deleteLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const location = await Location.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!location) {
      res.status(404).json({
        success: false,
        message: "Location not found",
      });
      return;
    }

    // Soft delete - mark as inactive instead of actually deleting
    location.isActive = false;
    await location.save();

    res.json({
      success: true,
      message: "Location deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting location:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete location",
    });
  }
};

/**
 * Get all users for organization
 * GET /api/settings/users
 */
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query; // Filter by status: 'active', 'inactive', or all

    const query: any = {
      organization: (req as any).user.organizationId,
    };

    // Filter by status if provided
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const users = await User.find(query)
      .select('-password') // Exclude password
      .sort({ createdAt: -1 }) // Sort by newest first
      .lean();

    // Format users for frontend
    const formattedUsers = users.map(user => {
      // Determine status: Invited if no lastLogin and not active, Active if isActive, Inactive otherwise
      const userStatus = !user.lastLogin && !user.isActive ? 'Invited' : (user.isActive ? 'Active' : 'Inactive');

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.charAt(0).toUpperCase() + user.role.slice(1), // Capitalize role
        status: userStatus,
        avatar: user.name.charAt(0).toUpperCase(),
        createdAt: (user as any).createdAt,
        lastLogin: (user as any).lastLogin,
      };
    });

    res.json({
      success: true,
      data: formattedUsers,
    });
  } catch (error: any) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users",
    });
  }
};

/**
 * Get a single user by ID
 * GET /api/settings/users/:id
 */
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    }).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Determine status: Invited if no lastLogin and not active, Active if isActive, Inactive otherwise
    const userStatus = !user.lastLogin && !user.isActive ? 'Invited' : (user.isActive ? 'Active' : 'Inactive');

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: userStatus,
        profile: user.profile,
        createdAt: (user as any).createdAt,
        lastLogin: (user as any).lastLogin,
        accessibleLocations: user.accessibleLocations,
        defaultBusinessLocation: user.defaultBusinessLocation,
        defaultWarehouseLocation: user.defaultWarehouseLocation,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching user:", error);

    if (error.name === "CastError") {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user",
    });
  }
};

/**
 * Create/Invite a new user
 * POST /api/settings/users
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, role, password, accessibleLocations, defaultBusinessLocation, defaultWarehouseLocation } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: "Name is required",
      });
      return;
    }

    if (!email || !email.trim()) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
      return;
    }

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
      return;
    }

    // Validate role
    const validRoles = ["owner", "admin", "accountant", "manager", "staff", "staff_assigned", "timesheet_staff", "viewer"];
    const userRole = role ? role.toLowerCase() : "staff";
    if (!validRoles.includes(userRole)) {
      res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
      return;
    }

    // Check if trying to create owner role (only during signup)
    if (userRole === "owner") {
      res.status(403).json({
        success: false,
        message: "Cannot create owner role through user management",
      });
      return;
    }

    // Generate a random password if not provided (for invitation)
    let userPassword = password;
    if (!userPassword) {
      // Generate a secure random password
      userPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + "A1!";
    }

    // Create user with "Invited" status (isActive: false, lastLogin: null)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: userPassword,
      role: userRole,
      organization: (req as any).user.organizationId,
      organizationMemberships: [(req as any).user.organizationId],
      isActive: false, // Invited users start as inactive until they log in
      accessibleLocations: accessibleLocations || [],
      defaultBusinessLocation: defaultBusinessLocation || null,
      defaultWarehouseLocation: defaultWarehouseLocation || null,
    });

    // Send invitation email (only if skipEmail is not true)
    const skipEmail = req.body.skipEmail === true;
    if (!skipEmail) {
      try {
        await sendInvitationEmail({
          name: user.name,
          email: user.email,
          password: userPassword,
          role: userRole.charAt(0).toUpperCase() + userRole.slice(1),
          organizationId: (req as any).user.organizationId,
        });
        console.log(`✅ Invitation email sent to ${user.email}`);
      } catch (emailError: any) {
        console.error("❌ Error sending invitation email:", emailError);
        // Don't fail the request if email fails, user is still created
      }
    } else {
      console.log(`⏸️ Email sending skipped for user ${user.email}. Will be sent via send-invitation endpoint.`);
    }

    // Return user without password
    const userResponse: any = user.toObject();
    if (userResponse.password) {
      delete userResponse.password;
    }

    // Determine status: Invited if no lastLogin, Active if isActive, Inactive otherwise
    const userStatus = !user.lastLogin && !user.isActive ? 'Invited' : (user.isActive ? 'Active' : 'Inactive');

    res.status(201).json({
      success: true,
      message: "User created successfully. Invitation email sent.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
        status: userStatus,
        avatar: user.name.charAt(0).toUpperCase(),
      },
    });
  } catch (error: any) {
    console.error("❌ Error creating user:", error);

    if (error.name === "ValidationError") {
      res.status(400).json({
        success: false,
        message: Object.values((error as any).errors || {}).map((e: any) => e.message).join(", "),
      });
    }

    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create user",
    });
  }
};

/**
 * Update a user
 * PUT /api/settings/users/:id
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive, profile, accessibleLocations, defaultBusinessLocation, defaultWarehouseLocation } = req.body;

    const user = await User.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Update fields if provided
    if (name !== undefined && name.trim() !== "") {
      user.name = name.trim();
    }

    if (email !== undefined && email.trim() !== "") {
      // Validate email format
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
        return;
      }

      // Check if email is already taken by another user
      const existingUser = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: id },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: "Email is already taken by another user",
        });
        return;
      }

      user.email = email.toLowerCase().trim();
    }

    if (role !== undefined) {
      const validRoles = ["owner", "admin", "accountant", "manager", "staff", "staff_assigned", "timesheet_staff", "viewer"];
      const userRole = role.toLowerCase();
      if (!validRoles.includes(userRole)) {
        res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        });
        return;
      }

      // Prevent changing to owner role
      if (userRole === "owner" && user.role !== "owner") {
        res.status(403).json({
          success: false,
          message: "Cannot change user role to owner",
        });
        return;
      }

      user.role = userRole;
    }

    if (isActive !== undefined) {
      // Prevent deactivating the last owner
      if (!isActive && user.role === "owner") {
        const ownerCount = await User.countDocuments({
          organization: (req as any).user.organizationId,
          role: "owner",
          isActive: true,
        });

        if (ownerCount <= 1) {
          res.status(400).json({
            success: false,
            message: "Cannot deactivate the last owner",
          });
          return;
        }
      }

      user.isActive = isActive;
    }

    if (profile !== undefined) {
      user.profile = { ...user.profile, ...profile };
    }

    if (accessibleLocations !== undefined) {
      user.accessibleLocations = accessibleLocations;
    }

    if (defaultBusinessLocation !== undefined) {
      user.defaultBusinessLocation = defaultBusinessLocation || null;
    }

    if (defaultWarehouseLocation !== undefined) {
      user.defaultWarehouseLocation = defaultWarehouseLocation || null;
    }

    await user.save();

    // Determine status: Invited if no lastLogin and not active, Active if isActive, Inactive otherwise
    const userStatus = !user.lastLogin && !user.isActive ? 'Invited' : (user.isActive ? 'Active' : 'Inactive');

    res.json({
      success: true,
      message: "User updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
        status: userStatus,
        avatar: user.name.charAt(0).toUpperCase(),
        profile: user.profile,
      },
    });
  } catch (error: any) {
    console.error("❌ Error updating user:", error);

    if (error.name === "ValidationError") {
      res.status(400).json({
        success: false,
        message: Object.values((error as any).errors || {}).map((e: any) => e.message).join(", "),
      });
    }

    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "Email is already taken by another user",
      });
    }

    if (error.name === "CastError") {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update user",
    });
  }
};

/**
 * Send invitation email to user
 * POST /api/settings/users/:id/send-invitation
 */
export const sendUserInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { accessibleLocations, defaultBusinessLocation, defaultWarehouseLocation } = req.body;

    // Find user by ID
    const user = await User.findById(id).select("+password");

    // Check if user exists and belongs to the organization
    if (!user || user.organization.toString() !== (req as any).user.organizationId.toString()) {
      res.status(404).json({
        success: false,
        message: "This email does not exist",
      });
      return;
    }

    // Verify user has a valid email
    if (!user.email || !user.email.trim()) {
      res.status(400).json({
        success: false,
        message: "This email does not exist",
      });
      return;
    }

    // Update location access if provided
    if (accessibleLocations !== undefined) {
      user.accessibleLocations = accessibleLocations;
    }
    if (defaultBusinessLocation !== undefined) {
      user.defaultBusinessLocation = defaultBusinessLocation || null;
    }
    if (defaultWarehouseLocation !== undefined) {
      user.defaultWarehouseLocation = defaultWarehouseLocation || null;
    }
    await user.save();

    // Get user's plain password (from request or generate new one if needed)
    // Since password is hashed, we need to send a reset link or use a temp password
    // For now, let's assume we have access to original password from createUser response
    // In a real app, you'd generate a reset token instead

    // Send invitation email
    try {
      if (!req.body.tempPassword) {
        res.status(400).json({
          success: false,
          message: "Temporary password is required to send invitation",
        });
        return;
      }

      // Update password with the provided temporary password
      user.password = req.body.tempPassword;
      // Ensure user is in "Invited" status (isActive: false, lastLogin: null)
      user.isActive = false;
      if (user.lastLogin) {
        // Reset lastLogin if it exists (re-inviting a user)
        (user as any).lastLogin = undefined;
      }
      await user.save();

      await sendInvitationEmail({
        name: user.name,
        email: user.email,
        password: req.body.tempPassword,
        role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
        organizationId: (req as any).user.organizationId,
      });

      console.log(`✅ Invitation email sent to ${user.email}`);

      res.json({
        success: true,
        message: "Invitation email sent successfully",
      });
    } catch (emailError: any) {
      console.error("❌ Error sending invitation email:", emailError);
      res.status(500).json({
        success: false,
        message: emailError?.message || "User updated but failed to send invitation email",
      });
    }
  } catch (error: any) {
    console.error("❌ Error sending user invitation:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send invitation",
    });
  }
};

/**
 * Delete/Deactivate a user
 * DELETE /api/settings/users/:id
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Prevent deleting the last owner
    if (user.role === "owner") {
      const ownerCount = await User.countDocuments({
        organization: (req as any).user.organizationId,
        role: "owner",
        isActive: true,
      });

      if (ownerCount <= 1) {
        res.status(400).json({
          success: false,
          message: "Cannot delete the last owner",
        });
      }
    }

    // Soft delete - mark as inactive instead of actually deleting
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting user:", error);

    if (error.name === "CastError") {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete user",
    });
  }
};

export default {
  getSettings,
  getOrganizationProfile,
  updateOrganizationProfile,
  getOrganizationBranding,
  updateOrganizationBranding,
  getLocationsEnabledStatus,
  enableLocations,
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  getUsers,
  getUser,
  createUser,
  updateUser,
  sendUserInvitation,
  deleteUser,
};

/**
 * Get All Roles
 * GET /api/settings/roles
 */
export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        message: "Organization ID is required. Please ensure you are authenticated.",
      });
      return;
    }

    const query: any = { organization: organizationId };

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    console.log("Fetching roles with query:", JSON.stringify(query));

    const roles = await Role.find(query)
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${roles.length} roles for organization ${organizationId}`);

    res.json({
      success: true,
      data: roles,
    });
  } catch (error: any) {
    console.error("❌ Error fetching roles:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch roles",
    });
  }
};

/**
 * Get Single Role
 * GET /api/settings/roles/:id
 */
export const getRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const role = await Role.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    }).lean();

    if (!role) {
      res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    res.json({
      success: true,
      data: role,
    });
  } catch (error: any) {
    console.error("❌ Error fetching role:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch role",
    });
  }
};

/**
 * Create Role
 * POST /api/settings/roles
 */
export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate organization ID
    if (!(req as any).user || !(req as any).user.organizationId) {
      res.status(401).json({
        success: false,
        message: "Organization ID is required. Please ensure you are authenticated.",
      });
      return;
    }

    const {
      name,
      description,
      isAccountantRole,
      contacts,
      items,
      banking,
      sales,
      purchases,
      accountant,
      timesheets,
      locations,
      vatFiling,
      documents,
      settings,
      dashboard,
      reports,
    } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: "Role name is required",
      });
      return;
    }

    // Check if role name already exists in organization
    const existingRole = await Role.findOne({
      name: name.trim(),
      organization: (req as any).user.organizationId,
    });

    if (existingRole) {
      res.status(400).json({
        success: false,
        message: "Role with this name already exists",
      });
      return;
    }

    // Create new role
    const role = await Role.create({
      name: name.trim(),
      description: description?.trim() || "",
      isAccountantRole: isAccountantRole || false,
      organization: (req as any).user.organizationId,
      contacts: contacts || {},
      items: items || {},
      banking: banking || {},
      sales: sales || {},
      purchases: purchases || {},
      accountant: accountant || {},
      timesheets: timesheets || {},
      locations: locations || {},
      vatFiling: vatFiling || {},
      documents: documents || {},
      settings: settings || {},
      dashboard: dashboard || {},
      reports: reports || {},
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: role,
      message: "Role created successfully",
    });
  } catch (error: any) {
    console.error("❌ Error creating role:", error);
    console.error("Error details:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create role",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * Update Role
 * PUT /api/settings/roles/:id
 */
export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      isAccountantRole,
      contacts,
      items,
      banking,
      sales,
      purchases,
      accountant,
      timesheets,
      locations,
      vatFiling,
      documents,
      settings,
      dashboard,
      reports,
      isActive,
    } = req.body;

    // Find role
    const role = await Role.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!role) {
      res.status(404).json({
        success: false,
        message: "Role not found",
      });
      return;
    }

    // Check if name is being changed and if it conflicts
    if (name && name.trim() !== role.name) {
      const existingRole = await Role.findOne({
        name: name.trim(),
        organization: (req as any).user.organizationId,
        _id: { $ne: id },
      });

      if (existingRole) {
        res.status(400).json({
          success: false,
          message: "Role with this name already exists",
        });
        return;
      }
    }

    // Update role
    if (name) role.name = name.trim();
    if (description !== undefined) role.description = description?.trim() || "";
    if (isAccountantRole !== undefined) role.isAccountantRole = isAccountantRole;
    if (contacts) role.contacts = contacts;
    if (items) role.items = items;
    if (banking) role.banking = banking;
    if (sales) role.sales = sales;
    if (purchases) role.purchases = purchases;
    if (accountant) role.accountant = accountant;
    if (timesheets) role.timesheets = timesheets;
    if (locations) role.locations = locations;
    if (vatFiling) role.vatFiling = vatFiling;
    if (documents) role.documents = documents;
    if (settings) role.settings = settings;
    if (dashboard) role.dashboard = dashboard;
    if (reports) role.reports = reports;
    if (isActive !== undefined) role.isActive = isActive;

    await role.save();

    res.json({
      success: true,
      data: role,
      message: "Role updated successfully",
    });
  } catch (error: any) {
    console.error("❌ Error updating role:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update role",
    });
  }
};

/**
 * Delete Role (Soft Delete)
 * DELETE /api/settings/roles/:id
 */
export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const role = await Role.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!role) {
      res.status(404).json({
        success: false,
        message: "Role not found",
      });
      return;
    }

    // Check if role is being used by any users
    const usersWithRole = await User.countDocuments({
      organization: (req as any).user.organizationId,
      role: role.name, // Assuming role name is stored in user
    });

    if (usersWithRole > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete role. It is assigned to ${usersWithRole} user(s). Please reassign users first.`,
      });
    }

    // Soft delete - set isActive to false
    role.isActive = false;
    await role.save();

    res.json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting role:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete role",
    });
  }
};

// Get owner user's email
export const getOwnerEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      res.status(401).json({
        success: false,
        message: "Organization ID is required",
      });
      return;
    }

    // Find user with owner role for this organization
    const ownerUser = await User.findOne({ 
      organization: organizationId, 
      role: "owner",
      isActive: true 
    });

    if (!ownerUser) {
      res.status(404).json({
        success: false,
        message: "Owner user not found",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        email: ownerUser.email,
        name: ownerUser.name
      }
    });
  } catch (error: any) {
    console.error("Error fetching owner email:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch owner email",
    });
  }
};


