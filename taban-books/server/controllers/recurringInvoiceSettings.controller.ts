/**
 * Recurring Invoice Settings Controller
 * Handles organization-level recurring invoice preferences
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

const DEFAULT_SETTINGS = {
  invoiceMode: "draft" as const, // "draft" | "sent"
  sendEmailToCustomer: false,
};

/**
 * Get recurring invoice settings
 * GET /api/settings/recurring-invoices
 */
export const getRecurringInvoiceSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const organization = await Organization.findById(req.user.organizationId).lean();
    if (!organization) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }

    const settings = (organization as any)?.settings?.recurringInvoiceSettings || DEFAULT_SETTINGS;

    res.json({
      success: true,
      data: {
        ...DEFAULT_SETTINGS,
        ...settings,
      },
    });
  } catch (error: any) {
    console.error("Error fetching recurring invoice settings:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch recurring invoice settings",
    });
  }
};

/**
 * Update recurring invoice settings
 * PUT /api/settings/recurring-invoices
 */
export const updateRecurringInvoiceSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const organization = await Organization.findById(req.user.organizationId);
    if (!organization) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }

    const incoming: any = req.body || {};

    if (incoming.invoiceMode !== undefined) {
      const mode = String(incoming.invoiceMode).toLowerCase();
      if (!["draft", "sent"].includes(mode)) {
        res.status(400).json({ success: false, message: 'Invalid invoiceMode. Use "draft" or "sent".' });
        return;
      }
      incoming.invoiceMode = mode;
    }

    if (incoming.sendEmailToCustomer !== undefined) {
      incoming.sendEmailToCustomer = Boolean(incoming.sendEmailToCustomer);
    }

    const existingSettings = (organization.settings as any)?.recurringInvoiceSettings
      ? JSON.parse(JSON.stringify((organization.settings as any).recurringInvoiceSettings))
      : {};

    (organization.settings as any).recurringInvoiceSettings = {
      ...DEFAULT_SETTINGS,
      ...existingSettings,
      ...incoming,
    };

    await organization.save();

    res.json({
      success: true,
      message: "Recurring invoice settings updated successfully",
      data: (organization.settings as any).recurringInvoiceSettings,
    });
  } catch (error: any) {
    console.error("Error updating recurring invoice settings:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update recurring invoice settings",
    });
  }
};

