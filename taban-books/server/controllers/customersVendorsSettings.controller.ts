/**
 * Customers & Vendors Settings Controller
 * Handles customer and vendor settings configuration
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
 * Get customers & vendors settings
 * GET /api/settings/customers-vendors
 */
export const getCustomersVendorsSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const organization = await Organization.findById(req.user.organizationId).lean();

    if (!organization) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    // Get settings with defaults - safely handle nested structure
    const orgSettings: any = (organization as any).settings || {};
    const existingSettings = orgSettings && 
                            typeof orgSettings === 'object' &&
                            'customersVendorsSettings' in orgSettings &&
                            orgSettings.customersVendorsSettings
      ? orgSettings.customersVendorsSettings
      : null;

    const settings = existingSettings ? {
      allowDuplicates: existingSettings.allowDuplicates !== undefined ? existingSettings.allowDuplicates : true,
      enableCustomerNumbers: existingSettings.enableCustomerNumbers || false,
      customerNumberPrefix: existingSettings.customerNumberPrefix || 'CUS-',
      customerNumberStart: existingSettings.customerNumberStart || '0001',
      enableVendorNumbers: existingSettings.enableVendorNumbers || false,
      vendorNumberPrefix: existingSettings.vendorNumberPrefix || 'VEN-',
      vendorNumberStart: existingSettings.vendorNumberStart || '0001',
      defaultCustomerType: existingSettings.defaultCustomerType || 'business',
      enableCreditLimit: existingSettings.enableCreditLimit || false,
      creditLimitAction: existingSettings.creditLimitAction || 'warn',
      includeSalesOrders: existingSettings.includeSalesOrders || false,
      billingAddressFormat: existingSettings.billingAddressFormat || '${CONTACT.CONTACT_DISPLAYNAME}\n${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}',
      shippingAddressFormat: existingSettings.shippingAddressFormat || '${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}',
      customFields: existingSettings.customFields || [],
      customButtons: existingSettings.customButtons || [],
      relatedLists: existingSettings.relatedLists || [],
    } : {
      allowDuplicates: true,
      enableCustomerNumbers: false,
      customerNumberPrefix: 'CUS-',
      customerNumberStart: '0001',
      enableVendorNumbers: false,
      vendorNumberPrefix: 'VEN-',
      vendorNumberStart: '0001',
      defaultCustomerType: 'business',
      enableCreditLimit: false,
      creditLimitAction: 'warn',
      includeSalesOrders: false,
      billingAddressFormat: '${CONTACT.CONTACT_DISPLAYNAME}\n${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}',
      shippingAddressFormat: '${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}',
      customFields: [],
      customButtons: [],
      relatedLists: [],
    };

    res.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error('Error fetching customers & vendors settings:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      organizationId: req.user?.organizationId,
      hasUser: !!req.user,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch customers & vendors settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update customers & vendors settings
 * PUT /api/settings/customers-vendors
 */
export const updateCustomersVendorsSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const updateData: any = {};

    // Update customersVendorsSettings
    if (req.body !== undefined) {
      updateData['settings.customersVendorsSettings'] = {
        allowDuplicates: req.body.allowDuplicates !== undefined ? req.body.allowDuplicates : true,
        enableCustomerNumbers: req.body.enableCustomerNumbers !== undefined ? req.body.enableCustomerNumbers : false,
        customerNumberPrefix: req.body.customerNumberPrefix || 'CUS-',
        customerNumberStart: req.body.customerNumberStart || '0001',
        enableVendorNumbers: req.body.enableVendorNumbers !== undefined ? req.body.enableVendorNumbers : false,
        vendorNumberPrefix: req.body.vendorNumberPrefix || 'VEN-',
        vendorNumberStart: req.body.vendorNumberStart || '0001',
        defaultCustomerType: req.body.defaultCustomerType || 'business',
        enableCreditLimit: req.body.enableCreditLimit !== undefined ? req.body.enableCreditLimit : false,
        creditLimitAction: req.body.creditLimitAction || 'warn',
        includeSalesOrders: req.body.includeSalesOrders !== undefined ? req.body.includeSalesOrders : false,
        billingAddressFormat: req.body.billingAddressFormat || '${CONTACT.CONTACT_DISPLAYNAME}\n${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}',
        shippingAddressFormat: req.body.shippingAddressFormat || '${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}',
        customFields: req.body.customFields || [],
        customButtons: req.body.customButtons || [],
        relatedLists: req.body.relatedLists || [],
      };
    }

    const organization = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!organization) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    // Safely extract settings
    const orgSettings: any = (organization as any).settings || {};
    const updatedSettings = orgSettings && 
                           typeof orgSettings === 'object' &&
                           'customersVendorsSettings' in orgSettings &&
                           orgSettings.customersVendorsSettings
      ? orgSettings.customersVendorsSettings
      : {};

    res.json({
      success: true,
      message: 'Customers & vendors settings updated successfully',
      data: updatedSettings,
    });
  } catch (error: any) {
    console.error('Error updating customers & vendors settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update customers & vendors settings',
    });
  }
};
