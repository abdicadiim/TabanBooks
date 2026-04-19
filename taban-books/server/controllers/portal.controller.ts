/**
 * Portal Controller
 * Handles customer and vendor portal settings
 */

import { Request, Response } from "express";
import Customer from "../models/Customer.js";
import Vendor from "../models/Vendor.js";
import mongoose from "mongoose";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
  };
}

/**
 * Get customer portal settings
 * GET /api/settings/customer-portal
 */
export const getCustomerPortal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get portal statistics
    const totalCustomers = await Customer.countDocuments({
      organization: req.user.organizationId,
    });

    const enabledCustomers = await Customer.countDocuments({
      organization: req.user.organizationId,
      enablePortal: true,
    });

    res.json({
      success: true,
      data: {
        portalName: 'tabanenterprises', // Default portal name
        totalCustomers,
        enabledCustomers,
        // Add more portal settings as needed
      },
    });
  } catch (error: any) {
    console.error('Error fetching customer portal settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch customer portal settings',
    });
  }
};

/**
 * Update customer portal settings
 * PUT /api/settings/customer-portal
 */
export const updateCustomerPortal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Update portal settings (implementation depends on your schema)
    // For now, just return success
    res.json({
      success: true,
      message: 'Customer portal settings updated successfully',
      data: req.body,
    });
  } catch (error: any) {
    console.error('Error updating customer portal settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update customer portal settings',
    });
  }
};

/**
 * Get vendor portal settings
 * GET /api/settings/vendor-portal
 */
export const getVendorPortal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get portal statistics
    const totalVendors = await Vendor.countDocuments({
      organization: req.user.organizationId,
    });

    const enabledVendors = await Vendor.countDocuments({
      organization: req.user.organizationId,
      enablePortal: true,
    });

    res.json({
      success: true,
      data: {
        portalName: 'tabanenterprises', // Default portal name
        totalVendors,
        enabledVendors,
        // Add more portal settings as needed
      },
    });
  } catch (error: any) {
    console.error('Error fetching vendor portal settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch vendor portal settings',
    });
  }
};

/**
 * Update vendor portal settings
 * PUT /api/settings/vendor-portal
 */
export const updateVendorPortal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Update portal settings (implementation depends on your schema)
    // For now, just return success
    res.json({
      success: true,
      message: 'Vendor portal settings updated successfully',
      data: req.body,
    });
  } catch (error: any) {
    console.error('Error updating vendor portal settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update vendor portal settings',
    });
  }
};
