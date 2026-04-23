/**
 * General Settings Controller
 * Handles general organization settings
 */

import { Request, Response } from "express";
import Organization from "../models/Organization.js";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
  };
}

const GENERAL_SETTINGS_NESTED_KEYS = [
  "modules",
  "pdfSettings",
  "discountSettings",
  "chargeSettings",
  "taxSettings",
  "roundingSettings",
  "salesSettings",
  "billingSettings",
  "documentSettings",
  "printSettings",
  "reportSettings",
  "retentionSettings",
  "pdfFormatSettings",
  "taxComplianceSettings",
  "workflowNotificationPreferences",
  "emailNotificationPreferences",
  "emailRelay",
  "emailTemplates",
  "itemsSettings",
  "quoteSettings",
  "recurringInvoiceSettings",
  "customersVendorsSettings",
  "accountantSettings",
] as const;

const toPlainObject = (value: any): Record<string, any> => {
  if (!value) return {};
  if (typeof value.toObject === "function") return value.toObject();
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (typeof value === "object") return { ...value };
  return {};
};

const mergeGeneralSettings = (current: any, incoming: any): Record<string, any> => {
  const currentSettings = toPlainObject(current);
  const nextSettings = toPlainObject(incoming);
  const merged: Record<string, any> = { ...currentSettings, ...nextSettings };

  for (const key of GENERAL_SETTINGS_NESTED_KEYS) {
    const currentNested = toPlainObject(currentSettings[key]);
    const incomingNested = nextSettings[key];
    if (incomingNested !== undefined) {
      merged[key] = { ...currentNested, ...toPlainObject(incomingNested) };
    }
  }

  return merged;
};

const buildDotPathUpdates = (
  value: any,
  prefix: string,
  target: Record<string, any> = {},
): Record<string, any> => {
  if (value === undefined) return target;

  if (value === null || typeof value !== "object" || value instanceof Date) {
    target[prefix] = value;
    return target;
  }

  if (value instanceof Map) {
    const mapped = Object.fromEntries(value.entries());
    if (Object.keys(mapped).length === 0) {
      target[prefix] = mapped;
      return target;
    }
    Object.entries(mapped).forEach(([key, nestedValue]) => {
      buildDotPathUpdates(nestedValue, `${prefix}.${key}`, target);
    });
    return target;
  }

  if (Array.isArray(value)) {
    target[prefix] = value;
    return target;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    target[prefix] = {};
    return target;
  }

  entries.forEach(([key, nestedValue]) => {
    buildDotPathUpdates(nestedValue, `${prefix}.${key}`, target);
  });

  return target;
};

const applyPathUpdatesToDocument = (document: any, updates: Record<string, any>): void => {
  Object.entries(updates).forEach(([path, value]) => {
    document.set(path, value);
  });
};

/**
 * Get general settings
 * GET /api/settings/general
 */
export const getGeneralSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const organization = await Organization.findById(req.user.organizationId);

    if (!organization) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    const organizationData = organization.toObject ? organization.toObject() : organization;

    res.json({
      success: true,
      data: {
        currency: organization.currency,
        fiscalYearStart: organization.fiscalYearStart,
        settings: toPlainObject((organizationData as any).settings),
        subscription: organization.subscription,
      },
    });
  } catch (error: any) {
    console.error('Error fetching general settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch general settings',
    });
  }
};

/**
 * Update general settings
 * PUT /api/settings/general
 */
export const updateGeneralSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const organization = await Organization.findById(req.user.organizationId);

    if (!organization) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    const updateData: Record<string, any> = {};
    if (req.body.currency !== undefined) updateData.currency = req.body.currency;
    if (req.body.fiscalYearStart !== undefined) updateData.fiscalYearStart = req.body.fiscalYearStart;
    if (req.body.settings !== undefined) {
      const currentSettings = organization.settings || {};
      const mergedSettings = mergeGeneralSettings(currentSettings, req.body.settings);
      Object.assign(updateData, buildDotPathUpdates(mergedSettings, "settings"));
    }
    if (req.body.subscription !== undefined) {
      updateData.subscription = req.body.subscription;
    }

    const updateResult = await Organization.collection.updateOne(
      { _id: organization._id },
      { $set: updateData },
    );

    if (!updateResult.matchedCount) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    const updatedOrganization = await Organization.findById(req.user.organizationId);
    if (!updatedOrganization) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    const organizationData = updatedOrganization.toObject ? updatedOrganization.toObject() : updatedOrganization;

    res.json({
      success: true,
      message: 'General settings updated successfully',
      data: {
        currency: updatedOrganization.currency,
        fiscalYearStart: updatedOrganization.fiscalYearStart,
        settings: toPlainObject((organizationData as any).settings),
        subscription: updatedOrganization.subscription,
      },
    });
  } catch (error: any) {
    console.error('Error updating general settings:', error);
    console.error('General settings update details:', {
      name: error?.name,
      message: error?.message,
      path: error?.path,
      value: error?.value,
      errors: error?.errors,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update general settings',
      ...(error?.errors ? { errors: error.errors } : {}),
      ...(process.env.NODE_ENV === 'development'
        ? {
            debug: {
              name: error?.name,
              path: error?.path,
              value: error?.value,
              stack: error?.stack,
            },
          }
        : {}),
    });
  }
};
