const VENDORS_STORAGE_KEY = "vendors";

// ============================================================================
// VENDORS STORAGE FUNCTIONS - DEPRECATED
// ============================================================================
// NOTE: These functions are DEPRECATED and should NOT be used in new code.
// All vendor operations should use the vendorsAPI from services/api.js instead.
// These functions are kept for backward compatibility only.
// ============================================================================

/**
 * @deprecated Use vendorsAPI.getAll() instead
 * Get all vendors from localStorage (DEPRECATED)
 */
export const getVendors = () => {
  console.warn('getVendors() is deprecated. Use vendorsAPI.getAll() from services/api.js instead.');
  try {
    const stored = localStorage.getItem(VENDORS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error("Error reading vendors from localStorage:", error);
    return [];
  }
};

/**
 * @deprecated Use vendorsAPI.getById(id) instead
 * Get vendor by ID from localStorage (DEPRECATED)
 */
export const getVendorById = (vendorId) => {
  console.warn('getVendorById() is deprecated. Use vendorsAPI.getById(id) from services/api.js instead.');
  try {
    const vendors = getVendors();
    return vendors.find(vendor => String(vendor.id) === String(vendorId)) || null;
  } catch (error) {
    console.error("Error getting vendor by ID from localStorage:", error);
    return null;
  }
};

/**
 * @deprecated Use vendorsAPI.update(id, data) instead
 * Update vendor in localStorage (DEPRECATED)
 */
export const updateVendor = (vendorId, updatedData) => {
  console.warn('updateVendor() is deprecated. Use vendorsAPI.update(id, data) from services/api.js instead.');
  try {
    const vendors = getVendors();
    const index = vendors.findIndex(v => String(v.id) === String(vendorId));
    if (index !== -1) {
      vendors[index] = { ...vendors[index], ...updatedData };
      localStorage.setItem(VENDORS_STORAGE_KEY, JSON.stringify(vendors));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error updating vendor in localStorage:", error);
    return false;
  }
};


// Bills Storage
const BILLS_STORAGE_KEY = "bills";

export const getBills = () => {
  try {
    const stored = localStorage.getItem(BILLS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error("Error reading bills from localStorage:", error);
    return [];
  }
};

export const getBillById = (billId) => {
  try {
    const bills = getBills();
    return bills.find(bill => String(bill.id) === String(billId)) || null;
  } catch (error) {
    console.error("Error getting bill by ID from localStorage:", error);
    return null;
  }
};

// Payments Made Storage
const PAYMENTS_MADE_STORAGE_KEY = "payments_made";

export const getPaymentsMade = () => {
  try {
    const stored = localStorage.getItem(PAYMENTS_MADE_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error("Error reading payments made from localStorage:", error);
    return [];
  }
};

export const getPaymentMadeById = (paymentId) => {
  try {
    const payments = getPaymentsMade();
    return payments.find(payment => String(payment.id) === String(paymentId)) || null;
  } catch (error) {
    console.error("Error getting payment made by ID from localStorage:", error);
    return null;
  }
};

// Vendor Credits Storage
const VENDOR_CREDITS_STORAGE_KEY = "vendor_credits";

export const getVendorCredits = () => {
  try {
    const stored = localStorage.getItem(VENDOR_CREDITS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error("Error reading vendor credits from localStorage:", error);
    return [];
  }
};

export const getVendorCreditById = (creditId) => {
  try {
    const credits = getVendorCredits();
    return credits.find(credit => String(credit.id) === String(creditId)) || null;
  } catch (error) {
    console.error("Error getting vendor credit by ID from localStorage:", error);
    return null;
  }
};

// Expenses Storage
const EXPENSES_STORAGE_KEY = "expenses";

export const getExpenses = () => {
  try {
    const stored = localStorage.getItem(EXPENSES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading expenses from localStorage:", error);
    return [];
  }
};

// Purchase Orders Storage
const PURCHASE_ORDERS_STORAGE_KEY = "purchase_orders";

export const getPurchaseOrders = () => {
  try {
    const stored = localStorage.getItem(PURCHASE_ORDERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading purchase orders from localStorage:", error);
    return [];
  }
};

// Recurring Bills Storage
const RECURRING_BILLS_STORAGE_KEY = "recurring_bills";

export const getRecurringBills = () => {
  try {
    const stored = localStorage.getItem(RECURRING_BILLS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading recurring bills from localStorage:", error);
    return [];
  }
};

// Recurring Expenses Storage
const RECURRING_EXPENSES_STORAGE_KEY = "recurring_expenses";

export const getRecurringExpenses = () => {
  try {
    const stored = localStorage.getItem(RECURRING_EXPENSES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading recurring expenses from localStorage:", error);
    return [];
  }
};

// Journals Storage
const JOURNALS_STORAGE_KEY = "journals";

export const getJournals = () => {
  try {
    const stored = localStorage.getItem(JOURNALS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading journals from localStorage:", error);
    return [];
  }
};

// Projects Storage
const PROJECTS_STORAGE_KEY = "projects";

export const getProjects = () => {
  try {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading projects from localStorage:", error);
    return [];
  }
};

// Purchase Receipts Storage
const PURCHASE_RECEIPTS_STORAGE_KEY = "purchase_receipts";

export const getPurchaseReceipts = () => {
  try {
    const stored = localStorage.getItem(PURCHASE_RECEIPTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading purchase receipts from localStorage:", error);
    return [];
  }
};

// Payment Terms Storage
const PAYMENT_TERMS_STORAGE_KEY = "payment_terms";
const DEFAULT_PAYMENT_TERMS = [
  { id: "1", name: "Due on Receipt", days: 0 },
  { id: "2", name: "Net 15", days: 15 },
  { id: "3", name: "Net 30", days: 30 },
  { id: "4", name: "Net 45", days: 45 },
  { id: "5", name: "Net 60", days: 60 },
  { id: "6", name: "Due end of the month", days: 0 },
  { id: "7", name: "Due end of next month", days: 0 },
];

export const getPaymentTerms = () => {
  try {
    const stored = localStorage.getItem(PAYMENT_TERMS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // If not found, save defaults and return them
    localStorage.setItem(PAYMENT_TERMS_STORAGE_KEY, JSON.stringify(DEFAULT_PAYMENT_TERMS));
    return DEFAULT_PAYMENT_TERMS;
  } catch (error) {
    console.error("Error reading payment terms from localStorage:", error);
    return DEFAULT_PAYMENT_TERMS;
  }
};

export const savePaymentTerms = (terms) => {
  try {
    localStorage.setItem(PAYMENT_TERMS_STORAGE_KEY, JSON.stringify(terms));
    return true;
  } catch (error) {
    console.error("Error saving payment terms to localStorage:", error);
    return false;
  }
};

// Expense Custom Views Storage
const EXPENSE_CUSTOM_VIEWS_STORAGE_KEY = "expense_custom_views";

export const getExpenseCustomViews = () => {
  try {
    const stored = localStorage.getItem(EXPENSE_CUSTOM_VIEWS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading expense custom views from localStorage:", error);
    return [];
  }
};

export const saveExpenseCustomView = (view) => {
  try {
    const views = getExpenseCustomViews();
    // Check if updating existing view (if you were to implement edit)
    // For now, assuming new view or overwrite by name? 
    // Usually better to have IDs.
    // Let's add an ID if not present.
    if (!view.id) {
      view.id = Date.now().toString();
    }

    // Check for duplicates/updates based on ID
    const index = views.findIndex(v => v.id === view.id);
    if (index !== -1) {
      views[index] = view;
    } else {
      views.push(view);
    }

    localStorage.setItem(EXPENSE_CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(views));
    return true;
  } catch (error) {
    console.error("Error saving expense custom view to localStorage:", error);
    return false;
  }
};

// Vendor Custom Views Storage
const VENDOR_CUSTOM_VIEWS_STORAGE_KEY = "vendor_custom_views";

export const getVendorCustomViews = () => {
  try {
    const stored = localStorage.getItem(VENDOR_CUSTOM_VIEWS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading vendor custom views from localStorage:", error);
    return [];
  }
};

export const saveVendorCustomView = (view) => {
  try {
    const views = getVendorCustomViews();
    if (!view.id) {
      view.id = Date.now().toString();
    }

    const index = views.findIndex(v => v.id === view.id);
    if (index !== -1) {
      views[index] = view;
    } else {
      views.push(view);
    }

    localStorage.setItem(VENDOR_CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(views));
    return true;
  } catch (error) {
    console.error("Error saving vendor custom view to localStorage:", error);
    return false;
  }
};
