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

    res.json({
      success: true,
      data: {
        currency: organization.currency,
        fiscalYearStart: organization.fiscalYearStart,
        settings: organization.settings,
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

    const updateData: any = {};

    if (req.body.currency !== undefined) updateData.currency = req.body.currency;
    if (req.body.fiscalYearStart !== undefined) updateData.fiscalYearStart = req.body.fiscalYearStart;
    if (req.body.settings !== undefined) {
      // Allow partial updates of settings by merging if necessary, 
      // but for simplicity and frontend compatibility, we use $set with the provided settings object.
      updateData.settings = req.body.settings;
    }
    if (req.body.subscription !== undefined) updateData.subscription = req.body.subscription;

    const organization = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!organization) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    res.json({
      success: true,
      message: 'General settings updated successfully',
      data: {
        currency: organization.currency,
        fiscalYearStart: organization.fiscalYearStart,
        settings: organization.settings,
        subscription: organization.subscription,
      },
    });
  } catch (error: any) {
    console.error('Error updating general settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update general settings',
    });
  }
};
