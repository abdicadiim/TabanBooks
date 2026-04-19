/**
 * Items Settings Utility
 * Fetches and caches items settings for use throughout the application
 */

import { getToken, API_BASE_URL } from "../services/auth";

let cachedSettings: any = null;
let settingsPromise: Promise<any> | null = null;

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
 * Get items settings (cached)
 */
export const getItemsSettings = async (): Promise<ItemsSettings> => {
  // Return cached settings if available
  if (cachedSettings) {
    return cachedSettings;
  }

  // Return existing promise if already fetching
  if (settingsPromise) {
    return settingsPromise;
  }

  // Fetch settings
  settingsPromise = (async () => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch(`${API_BASE_URL}/settings/items`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          cachedSettings = data.data;
          return cachedSettings;
        }
      }

      // Return defaults if fetch fails
      return getDefaultSettings();
    } catch (error) {
      console.error("Error fetching items settings:", error);
      return getDefaultSettings();
    } finally {
      settingsPromise = null;
    }
  })();

  return settingsPromise;
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
 * Clear cached settings (call after updating settings)
 */
export const clearItemsSettingsCache = () => {
  cachedSettings = null;
  settingsPromise = null;
};

/**
 * Format quantity based on decimal places setting
 */
export const formatQuantity = (quantity: number, decimalPlaces: string): string => {
  const places = parseInt(decimalPlaces) || 2;
  return quantity.toFixed(places);
};

/**
 * Get step value for quantity input based on decimal places
 */
export const getQuantityStep = (decimalPlaces: string): string => {
  const places = parseInt(decimalPlaces) || 2;
  if (places === 0) return "1";
  return `0.${"0".repeat(places - 1)}1`;
};
