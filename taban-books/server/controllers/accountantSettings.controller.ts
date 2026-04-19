/**
 * Accountant Settings Controller
 * Handles accountant settings configuration
 */

import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import Organization from '../models/Organization.js';

/**
 * Get Accountant Settings
 * GET /api/settings/accountant
 */
export const getAccountantSettings = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const orgSettings: any = (organization as any).settings || {};
    const existingSettings = orgSettings &&
                            typeof orgSettings === 'object' &&
                            'accountantSettings' in orgSettings &&
                            orgSettings.accountantSettings
      ? orgSettings.accountantSettings
      : null;

    const settings = existingSettings ? {
      chartOfAccounts: {
        makeAccountCodeMandatory: existingSettings.chartOfAccounts?.makeAccountCodeMandatory !== undefined ? existingSettings.chartOfAccounts.makeAccountCodeMandatory : false,
        uniqueAccountCode: existingSettings.chartOfAccounts?.uniqueAccountCode !== undefined ? existingSettings.chartOfAccounts.uniqueAccountCode : false,
      },
      currencyExchange: {
        trackingMethod: existingSettings.currencyExchange?.trackingMethod || 'same',
        sameAccount: existingSettings.currencyExchange?.sameAccount || 'Exchange Gain or Loss',
        gainAccount: existingSettings.currencyExchange?.gainAccount || '',
        lossAccount: existingSettings.currencyExchange?.lossAccount || '',
      },
      exchangeAdjustments: {
        defaultAccount: existingSettings.exchangeAdjustments?.defaultAccount || 'Exchange Gain or Loss',
      },
      journals: {
        allow13thMonthAdjustments: existingSettings.journals?.allow13thMonthAdjustments !== undefined ? existingSettings.journals.allow13thMonthAdjustments : false,
      },
      journalApprovals: {
        approvalType: existingSettings.journalApprovals?.approvalType || 'no-approval',
      },
      defaultAccountTracking: existingSettings.defaultAccountTracking || {
        items: {},
        customers: {},
        vendors: {},
        assets: {},
        liabilities: {},
        equity: {},
        income: {},
        expense: {},
      },
      journalCustomFields: existingSettings.journalCustomFields || [],
      chartCustomFields: existingSettings.chartCustomFields || [],
    } : {
      chartOfAccounts: {
        makeAccountCodeMandatory: false,
        uniqueAccountCode: false,
      },
      currencyExchange: {
        trackingMethod: 'same',
        sameAccount: 'Exchange Gain or Loss',
        gainAccount: '',
        lossAccount: '',
      },
      exchangeAdjustments: {
        defaultAccount: 'Exchange Gain or Loss',
      },
      journals: {
        allow13thMonthAdjustments: false,
      },
      journalApprovals: {
        approvalType: 'no-approval',
      },
      defaultAccountTracking: {
        items: {},
        customers: {},
        vendors: {},
        assets: {},
        liabilities: {},
        equity: {},
        income: {},
        expense: {},
      },
      journalCustomFields: [],
      chartCustomFields: [],
    };

    res.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error('Error fetching accountant settings:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      organizationId: req.user?.organizationId,
      hasUser: !!req.user,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch accountant settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update Accountant Settings
 * PUT /api/settings/accountant
 */
export const updateAccountantSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      chartOfAccounts,
      currencyExchange,
      exchangeAdjustments,
      journals,
      journalApprovals,
      defaultAccountTracking,
      journalCustomFields,
      chartCustomFields,
    } = req.body;

    // Build update object
    const updateData: any = {
      'settings.accountantSettings.chartOfAccounts.makeAccountCodeMandatory': chartOfAccounts?.makeAccountCodeMandatory !== undefined ? chartOfAccounts.makeAccountCodeMandatory : false,
      'settings.accountantSettings.chartOfAccounts.uniqueAccountCode': chartOfAccounts?.uniqueAccountCode !== undefined ? chartOfAccounts.uniqueAccountCode : false,
      'settings.accountantSettings.currencyExchange.trackingMethod': currencyExchange?.trackingMethod || 'same',
      'settings.accountantSettings.currencyExchange.sameAccount': currencyExchange?.sameAccount || 'Exchange Gain or Loss',
      'settings.accountantSettings.currencyExchange.gainAccount': currencyExchange?.gainAccount || '',
      'settings.accountantSettings.currencyExchange.lossAccount': currencyExchange?.lossAccount || '',
      'settings.accountantSettings.exchangeAdjustments.defaultAccount': exchangeAdjustments?.defaultAccount || 'Exchange Gain or Loss',
      'settings.accountantSettings.journals.allow13thMonthAdjustments': journals?.allow13thMonthAdjustments !== undefined ? journals.allow13thMonthAdjustments : false,
      'settings.accountantSettings.journalApprovals.approvalType': journalApprovals?.approvalType || 'no-approval',
      'settings.accountantSettings.defaultAccountTracking': defaultAccountTracking || {
        items: {},
        customers: {},
        vendors: {},
        assets: {},
        liabilities: {},
        equity: {},
        income: {},
        expense: {},
      },
      'settings.accountantSettings.journalCustomFields': journalCustomFields || [],
      'settings.accountantSettings.chartCustomFields': chartCustomFields || [],
    };

    const organization = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!organization) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Accountant settings updated successfully',
      data: (organization as any).settings?.accountantSettings || {},
    });
  } catch (error: any) {
    console.error('Error updating accountant settings:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      organizationId: req.user?.organizationId,
      hasUser: !!req.user,
      requestBody: req.body,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update accountant settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
