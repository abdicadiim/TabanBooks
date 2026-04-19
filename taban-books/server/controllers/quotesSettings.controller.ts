/**
 * Quote Settings Controller
 * Handles organization-specific quote settings
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
 * Get quote settings
 * GET /api/settings/quotes
 */
export const getQuotesSettings = async (req: AuthRequest, res: Response): Promise<void> => {
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

        // Default settings if none exist
        const defaultSettings = {
            allowEditingAcceptedQuotes: false,
            allowCustomerAcceptDecline: false,
            automationOption: 'dont-convert',
            allowProgressInvoice: false,
            approvalType: 'no-approval',
            hideZeroValueItems: false,
            retainFields: {
                customerNotes: false,
                termsConditions: false,
                address: false,
            },
            termsConditions: "",
            customerNotes: "Looking forward for your business.",
        };

        res.json({
            success: true,
            data: organization.settings.quoteSettings || defaultSettings,
        });
    } catch (error: any) {
        console.error('Error fetching quote settings:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch quote settings',
        });
    }
};

/**
 * Update quote settings
 * PUT /api/settings/quotes
 */
export const updateQuotesSettings = async (req: AuthRequest, res: Response): Promise<void> => {
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

        // Initialize settings if they don't exist
        if (!organization.settings) {
            organization.settings = {} as any;
        }

        const existingSettings = organization.settings.quoteSettings ?
            JSON.parse(JSON.stringify(organization.settings.quoteSettings)) : {};

        organization.settings.quoteSettings = {
            ...existingSettings,
            ...req.body,
        };

        await organization.save();

        res.json({
            success: true,
            message: 'Quote settings updated successfully',
            data: organization.settings.quoteSettings,
        });
    } catch (error: any) {
        console.error('Error updating quote settings:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update quote settings',
        });
    }
};
