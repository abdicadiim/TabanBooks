/**
 * Items Settings Utility (Backend)
 * Helper functions to get and apply items settings
 */

import Organization from "../models/Organization.js";

export interface ItemsSettings {
  decimalPlaces: string;
  allowDuplicateNames: boolean;
  enableEnhancedSearch: boolean;
  enablePriceLists: boolean;
  enableInventoryTracking: boolean;
  inventoryStartDate: string;
  preventNegativeStock: boolean;
  showOutOfStockWarning: boolean;
  notifyReorderPoint: boolean;
  notifyReorderPointEmail: string;
  trackLandedCost: boolean;
  defaultFields: any[];
  recordLockConfigurations: any[];
}

/**
 * Get items settings for an organization
 */
export const getItemsSettings = async (organizationId: string): Promise<ItemsSettings> => {
  try {
    const organization = await Organization.findById(organizationId).lean();
    
    if (!organization || !organization.settings) {
      return getDefaultSettings();
    }

    const settings = organization.settings as any;
    const itemsSettings = settings.itemsSettings;

    if (!itemsSettings) {
      return getDefaultSettings();
    }

    return {
      decimalPlaces: itemsSettings.decimalPlaces || "2",
      allowDuplicateNames: itemsSettings.allowDuplicateNames !== undefined ? itemsSettings.allowDuplicateNames : false,
      enableEnhancedSearch: itemsSettings.enableEnhancedSearch || false,
      enablePriceLists: itemsSettings.enablePriceLists || false,
      enableInventoryTracking: itemsSettings.enableInventoryTracking !== undefined ? itemsSettings.enableInventoryTracking : true,
      inventoryStartDate: itemsSettings.inventoryStartDate || "",
      preventNegativeStock: itemsSettings.preventNegativeStock !== undefined ? itemsSettings.preventNegativeStock : true,
      showOutOfStockWarning: itemsSettings.showOutOfStockWarning || false,
      notifyReorderPoint: itemsSettings.notifyReorderPoint || false,
      notifyReorderPointEmail: itemsSettings.notifyReorderPointEmail || "",
      trackLandedCost: itemsSettings.trackLandedCost || false,
      defaultFields: itemsSettings.defaultFields || [],
      recordLockConfigurations: itemsSettings.recordLockConfigurations || [],
    };
  } catch (error) {
    console.error("Error fetching items settings:", error);
    return getDefaultSettings();
  }
};

/**
 * Get default settings
 */
export const getDefaultSettings = (): ItemsSettings => {
  return {
    decimalPlaces: "2",
    allowDuplicateNames: false,
    enableEnhancedSearch: false,
    enablePriceLists: false,
    enableInventoryTracking: true,
    inventoryStartDate: "",
    preventNegativeStock: true,
    showOutOfStockWarning: false,
    notifyReorderPoint: false,
    notifyReorderPointEmail: "",
    trackLandedCost: false,
    defaultFields: [],
    recordLockConfigurations: [],
  };
};

/**
 * Format quantity based on decimal places
 */
export const formatQuantity = (quantity: number, decimalPlaces: string): number => {
  const places = parseInt(decimalPlaces) || 2;
  return parseFloat(quantity.toFixed(places));
};
