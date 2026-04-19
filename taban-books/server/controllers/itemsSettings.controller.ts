import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import Organization from '../models/Organization.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeInventoryStartDate = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  const pickerMatch = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!pickerMatch) {
    return '';
  }

  const [, rawDay, rawMonth, rawYear] = pickerMatch;
  const day = Number(rawDay);
  const month = Number(rawMonth);
  const year = Number(rawYear);
  const parsedDate = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return '';
  }

  return `${rawYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Get Items Settings
 * GET /api/settings/items
 */
export const getItemsSettings = async (req: AuthRequest, res: Response): Promise<void> => {
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
                            'itemsSettings' in orgSettings &&
                            orgSettings.itemsSettings
      ? orgSettings.itemsSettings
      : null;

    const settings = existingSettings ? {
      decimalPlaces: existingSettings.decimalPlaces || '2',
      allowDuplicateNames: existingSettings.allowDuplicateNames !== undefined ? existingSettings.allowDuplicateNames : false,
      enableEnhancedSearch: existingSettings.enableEnhancedSearch || false,
      enablePriceLists: existingSettings.enablePriceLists || false,
      enableInventoryTracking: existingSettings.enableInventoryTracking !== undefined ? existingSettings.enableInventoryTracking : true,
      inventoryStartDate: existingSettings.inventoryStartDate || '',
      preventNegativeStock: existingSettings.preventNegativeStock !== undefined ? existingSettings.preventNegativeStock : true,
      showOutOfStockWarning: existingSettings.showOutOfStockWarning || false,
      notifyReorderPoint: existingSettings.notifyReorderPoint || false,
      notifyReorderPointEmail: existingSettings.notifyReorderPointEmail || '',
      trackLandedCost: existingSettings.trackLandedCost || false,
      defaultFields: existingSettings.defaultFields || [],
      customFields: existingSettings.customFields || [],
      customButtons: existingSettings.customButtons || [],
      relatedLists: existingSettings.relatedLists || [],
      recordLockConfigurations: existingSettings.recordLockConfigurations || [],
    } : {
      decimalPlaces: '2',
      allowDuplicateNames: false,
      enableEnhancedSearch: false,
      enablePriceLists: false,
      enableInventoryTracking: true,
      inventoryStartDate: '',
      preventNegativeStock: true,
      showOutOfStockWarning: false,
      notifyReorderPoint: false,
      notifyReorderPointEmail: '',
      trackLandedCost: false,
      defaultFields: [],
      customFields: [],
      customButtons: [],
      relatedLists: [],
      recordLockConfigurations: [],
    };

    res.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error('Error fetching items settings:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      organizationId: req.user?.organizationId,
      hasUser: !!req.user,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch items settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update Items Settings
 * PUT /api/settings/items
 */
export const updateItemsSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      decimalPlaces,
      allowDuplicateNames,
      enableEnhancedSearch,
      enablePriceLists,
      enableInventoryTracking,
      inventoryStartDate,
      preventNegativeStock,
      showOutOfStockWarning,
      notifyReorderPoint,
      notifyReorderPointEmail,
      trackLandedCost,
      defaultFields,
      customFields,
      customButtons,
      relatedLists,
      recordLockConfigurations,
    } = req.body;

    const normalizedNotifyReorderPointEmail =
      typeof notifyReorderPointEmail === 'string'
        ? notifyReorderPointEmail.trim().toLowerCase()
        : '';
    const normalizedInventoryStartDate = normalizeInventoryStartDate(inventoryStartDate);

    if (enableInventoryTracking && !normalizedInventoryStartDate) {
      res.status(400).json({
        success: false,
        message: 'Choose a valid inventory start date',
      });
      return;
    }

    if (notifyReorderPoint && !normalizedNotifyReorderPointEmail) {
      res.status(400).json({
        success: false,
        message: 'Select a notification email for reorder point alerts',
      });
      return;
    }

    if (normalizedNotifyReorderPointEmail && !EMAIL_REGEX.test(normalizedNotifyReorderPointEmail)) {
      res.status(400).json({
        success: false,
        message: 'Enter a valid notification email for reorder point alerts',
      });
      return;
    }

    // Build update object
    const updateData: any = {
      'settings.itemsSettings.decimalPlaces': decimalPlaces || '2',
      'settings.itemsSettings.allowDuplicateNames': allowDuplicateNames !== undefined ? allowDuplicateNames : false,
      'settings.itemsSettings.enableEnhancedSearch': enableEnhancedSearch !== undefined ? enableEnhancedSearch : false,
      'settings.itemsSettings.enablePriceLists': enablePriceLists !== undefined ? enablePriceLists : false,
      'settings.itemsSettings.enableInventoryTracking': enableInventoryTracking !== undefined ? enableInventoryTracking : true,
      'settings.itemsSettings.inventoryStartDate': normalizedInventoryStartDate,
      'settings.itemsSettings.preventNegativeStock': preventNegativeStock !== undefined ? preventNegativeStock : true,
      'settings.itemsSettings.showOutOfStockWarning': showOutOfStockWarning !== undefined ? showOutOfStockWarning : false,
      'settings.itemsSettings.notifyReorderPoint': notifyReorderPoint !== undefined ? notifyReorderPoint : false,
      'settings.itemsSettings.notifyReorderPointEmail': normalizedNotifyReorderPointEmail,
      'settings.itemsSettings.trackLandedCost': trackLandedCost !== undefined ? trackLandedCost : false,
      'settings.itemsSettings.defaultFields': Array.isArray(defaultFields) ? defaultFields : [],
      'settings.itemsSettings.customFields': customFields || [],
      'settings.itemsSettings.customButtons': customButtons || [],
      'settings.itemsSettings.relatedLists': relatedLists || [],
      'settings.itemsSettings.recordLockConfigurations': Array.isArray(recordLockConfigurations) ? recordLockConfigurations : [],
    };

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
      message: 'Items settings updated successfully',
      data: (organization as any).settings?.itemsSettings || {},
    });
  } catch (error: any) {
    console.error('Error updating items settings:', error);
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
      message: error.message || 'Failed to update items settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
