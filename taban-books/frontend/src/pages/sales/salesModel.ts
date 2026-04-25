import { useEffect, useRef, useState } from "react";
import { recurringInvoicesAPI, quotesAPI, invoicesAPI, retainerInvoicesAPI, customersAPI, taxesAPI, itemsAPI, salespersonsAPI, salesReceiptsAPI, paymentsReceivedAPI, creditNotesAPI, projectsAPI, settingsAPI, plansAPI, reportingTagsAPI } from "../../services/api";


const STORAGE_KEY = "taban_books_customers";

// Lightweight in-memory cache to reduce repeated dropdown fetches across pages.
// Keeps UI responsive when navigating between list/new/detail pages.
const MEMORY_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
type CacheEntry<T> = { ts: number; value?: T; promise?: Promise<T> };
const memoryCache = new Map<string, CacheEntry<any>>();

const shouldCacheFetchedValue = (value: any) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") {
    const data = (value as any).data;
    if (Array.isArray(data)) return data.length > 0;
  }
  return value !== undefined && value !== null;
};

const cachedFetch = async <T,>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = MEMORY_CACHE_TTL_MS
): Promise<T> => {
  const now = Date.now();
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;

  if (entry?.value !== undefined && now - entry.ts < ttlMs && shouldCacheFetchedValue(entry.value)) {
    return entry.value;
  }
  if (entry?.promise) {
    return entry.promise;
  }

  const promise = fetcher()
    .then((value) => {
      if (shouldCacheFetchedValue(value)) {
        memoryCache.set(key, { ts: Date.now(), value });
      } else {
        memoryCache.delete(key);
      }
      return value;
    })
    .catch((err) => {
      memoryCache.delete(key);
      throw err;
    });

  memoryCache.set(key, { ts: entry?.ts ?? now, value: entry?.value, promise });
  return promise;
};

export interface ContactPerson {
  id?: string;
  _id?: string;
  salutation?: string;
  firstName: string;
  lastName: string;
  email: string;
  workPhone?: string;
  mobile?: string;
  designation?: string;
  department?: string;
  skypeName?: string;
  isPrimary?: boolean;
  hasPortalAccess?: boolean;
  enablePortal?: boolean;
}

export interface Customer {
  id: string;
  _id?: string;
  name: string;
  customerName?: string;
  customerNumber?: string;
  displayName?: string;
  companyName?: string;
  email?: string;
  workPhone?: string;
  mobile?: string;
  receivables: number;
  currency: string;
  openingBalance?: string;
  customerOwner?: string;
  documents?: any[];
  contactPersons?: ContactPerson[];
  customFields?: Record<string, any>;
  reportingTags?: any[];
  comments?: Array<{
    id?: string | number;
    _id?: string;
    text: string;
    author?: string;
    timestamp?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  }>;
  remarks?: string;
  createdAt?: string;
  createdBy?: string;
  status?: string;
  isActive?: boolean;
  notes?: string;
  firstName?: string;
  lastName?: string;
  customerType?: string;
  type?: string;
  enablePortal?: boolean;
  portalEnabled?: boolean;
  portalStatus?: string;
  customerLanguage?: string;
  language?: string;
  paymentTerms?: string;
  unusedCredits?: number;
  billingAddress?: {
    attention?: string;
    country?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    phone?: string;
    fax?: string;
  };
  shippingAddress?: {
    attention?: string;
    country?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    phone?: string;
    fax?: string;
  };
  reviewRequested?: boolean;
  reviewRequestedAt?: string;
}

// Sample data for initial setup
const initialCustomers: Customer[] = [
  {
    id: "CUST-001",
    name: "mohamed Ali",
    companyName: "ss",
    email: "sss@gmail.com",
    workPhone: "22",
    receivables: 0.00,
    currency: "AMD"
  },
  {
    id: "CUST-002",
    name: "Acme Corp",
    companyName: "Acme Corporation",
    email: "billing@acme.test",
    workPhone: "+1-555-0123",
    receivables: 1500.50,
    currency: "AMD"
  },
  {
    id: "CUST-003",
    name: "Global Traders",
    companyName: "Global Trading Co.",
    email: "info@global.test",
    workPhone: "+1-555-0456",
    receivables: 2300.75,
    currency: "AMD"
  }
];

// LocalStorage utility functions
export const getCustomers = async (params: any = {}): Promise<Customer[]> => {
  // Use a large limit for dropdowns if not specified
  const finalParams = { limit: 1000, ...params };
  const cacheKey = `customers:${JSON.stringify(finalParams)}`;
  return cachedFetch(cacheKey, async () => {
    const response = await getCustomersFromAPI(finalParams);
    return response.data || [];
  });
};

export const getCustomersPaginated = async (params: any = {}): Promise<any> => {
  const { __skipCache, ...finalParams } = params || {};
  if (__skipCache) {
    return getCustomersFromAPI(finalParams);
  }
  const cacheKey = `customers:paginated:${JSON.stringify(finalParams)}`;
  return cachedFetch(cacheKey, async () => getCustomersFromAPI(finalParams), 30 * 1000);
};


export const getCustomersFromAPI = async (params: any = {}): Promise<any> => {
  try {
    const response = await customersAPI.getAll(params);
    if (response && response.success && response.data) {
      const data = response.data.map((c: any) => ({
        ...c,
        id: c._id || c.id,
        name: c.displayName || c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        email: c.email || "",
        workPhone: c.workPhone || c.mobile || ""
      }));
      return {
        data,
        pagination: (response as any).pagination || {
          total: data.length,
          page: 1,
          limit: data.length,
          pages: 1
        }
      };
    }
    return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
  } catch (error) {
    console.error("Error fetching customers from API:", error);
    return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
  }
};

export const getCustomerById = async (customerId: string | number): Promise<Customer | null> => {
  try {
    const response = await customersAPI.getById(String(customerId));
    if (response && response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error("Error getting customer by ID from API:", error);
    return null;
  }
};

const CUSTOMER_LOOKUP_LIMIT = 1000;

const normalizeCustomerLookupValue = (value: any) =>
  String(value ?? "").trim().toLowerCase();

const looksLikeMongoObjectId = (value: any) =>
  /^[a-f0-9]{24}$/i.test(String(value ?? "").trim());

const getCustomerDisplayName = (customer: any) =>
  String(
    customer?.displayName ||
      customer?.companyName ||
      customer?.name ||
      customer?.customerName ||
      `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
      "",
  ).trim();

const buildCustomerNameLookup = (customers: any[] = []) => {
  const lookup = new Map<string, string>();

  (Array.isArray(customers) ? customers : []).forEach((customer: any) => {
    const name = getCustomerDisplayName(customer);
    if (!name) return;

    [
      customer?._id,
      customer?.id,
      customer?.customerId,
      customer?.customer_id,
    ].forEach((key) => {
      const normalizedKey = normalizeCustomerLookupValue(key);
      if (normalizedKey) {
        lookup.set(normalizedKey, name);
      }
    });
  });

  return lookup;
};

const resolveInvoiceCustomerName = (
  invoice: any,
  customerNameLookup?: Map<string, string>,
) => {
  const customer = invoice?.customer;
  const customerId = String(
    invoice?.customerId ||
      invoice?.customer_id ||
      customer?._id ||
      customer?.id ||
      (typeof customer === "string" ? customer : ""),
  ).trim();
  const normalizedCustomerId = normalizeCustomerLookupValue(customerId);
  const embeddedCustomerName = getCustomerDisplayName(customer);

  if (
    embeddedCustomerName &&
    normalizeCustomerLookupValue(embeddedCustomerName) !== normalizedCustomerId
  ) {
    return embeddedCustomerName;
  }

  const explicitCustomerName = String(invoice?.customerName || "").trim();
  const normalizedExplicitCustomerName =
    normalizeCustomerLookupValue(explicitCustomerName);

  if (
    explicitCustomerName &&
    normalizedExplicitCustomerName !== normalizedCustomerId &&
    !looksLikeMongoObjectId(explicitCustomerName)
  ) {
    return explicitCustomerName;
  }

  for (const candidate of [customerId, explicitCustomerName]) {
    const matchedName = customerNameLookup?.get(
      normalizeCustomerLookupValue(candidate),
    );
    if (matchedName) {
      return matchedName;
    }
  }

  if (explicitCustomerName) {
    return explicitCustomerName;
  }

  if (typeof customer === "string") {
    return customer.trim();
  }

  return "";
};

export const saveCustomer = async (customerData: Partial<Customer>): Promise<Customer> => {
  try {
    const response = await customersAPI.create(customerData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to create customer");
  } catch (error) {
    console.error("Error saving customer to API:", error);
    throw error;
  }
};

export const updateCustomer = async (customerId: string, customerData: Partial<Customer>): Promise<Customer | undefined> => {
  try {
    const response = await customersAPI.update(customerId, customerData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to update customer");
  } catch (error) {
    console.error("Error updating customer in API:", error);
    throw error;
  }
};

export const deleteCustomer = async (customerId: string): Promise<void> => {
  try {
    await customersAPI.delete(customerId);
  } catch (error) {
    console.error("Error deleting customer from API:", error);
    throw error;
  }
};

export const deleteCustomers = async (customerIds: string[]): Promise<void> => {
  try {
    await customersAPI.bulkDelete(customerIds);
  } catch (error) {
    console.error("Error deleting customers from API:", error);
    throw error;
  }
};

export interface CustomView {
  id: string;
  name: string;
  entityType: string;
  filters: any;
  columns: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  type?: string;
  criteria?: any[];
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Custom Views Storage
const CUSTOM_VIEWS_STORAGE_KEY = "taban_books_custom_views";

export const getCustomViews = (): CustomView[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_VIEWS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error("Error reading custom views from localStorage:", error);
    return [];
  }
};

export const saveCustomView = (customViewData: Partial<CustomView>): CustomView => {
  try {
    const customViews = getCustomViews();
    const newView: CustomView = {
      id: Date.now().toString(),
      name: "",
      entityType: "",
      filters: {},
      columns: [],
      sortBy: "createdAt",
      sortOrder: "desc",
      ...customViewData,
      createdAt: new Date().toISOString()
    } as CustomView;
    const updatedViews = [...customViews, newView];
    localStorage.setItem(CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(updatedViews));
    return newView;
  } catch (error) {
    console.error("Error saving custom view to localStorage:", error);
    throw error;
  }
};

export const updateCustomView = (viewId: string, customViewData: Partial<CustomView>): void => {
  try {
    const customViews = getCustomViews();
    const updatedViews = customViews.map(view =>
      view.id === viewId ? { ...view, ...customViewData, updatedAt: new Date().toISOString() } : view
    );
    localStorage.setItem(CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(updatedViews));
  } catch (error) {
    console.error("Error updating custom view in localStorage:", error);
    throw error;
  }
};

export const deleteCustomView = (viewId: string): void => {
  try {
    const customViews = getCustomViews();
    const filtered = customViews.filter(v => v.id !== viewId);
    localStorage.setItem(CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting custom view from localStorage:", error);
    throw error;
  }
};

export interface AttachedFile {
  id: string | number;
  name: string;
  size?: string | number;
  type?: string;
  url?: string;
  file?: File | null;
  documentId?: string;
  mimeType?: string;
  uploadedAt?: string;
  preview?: string | null;
}

export interface Invoice {
  id: string;
  _id?: string;
  invoiceNumber: string;
  customer?: any;
  customerId?: string;
  customerName?: string;
  date: string;
  invoiceDate?: string;
  dueDate: string;
  expectedPaymentDate?: string;
  items: any[];
  subtotal: number;
  subTotal?: number;
  tax: number;
  amount?: number;
  total: number;
  status: string;
  organization?: string;
  salesperson?: any;
  salespersonId?: string;
  orderNumber?: string;
  receipt?: string;
  accountsReceivable?: string;
  subject?: string;
  taxExclusive?: string;
  discount?: number;
  discountType?: string;
  discountAccount?: string;
  shippingCharges?: number;
  shippingChargeTax?: string;
  shipping?: number;
  adjustment?: number;
  roundOff?: number;
  currency?: string;
  customerNotes?: string;
  termsAndConditions?: string;
  attachedFiles?: AttachedFile[];
  attachments?: AttachedFile[];
  comments?: any[];
  customerAddress?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  poNumber?: string;
  balanceDue?: number;
  balance?: number;
  amountPaid?: number;
  customerViewed?: boolean;
  locked?: boolean;
  pendingApproval?: boolean;
  approved?: boolean;
  paymentInitiated?: boolean;
  void?: boolean;
  type?: string;
  debitNote?: boolean;
  writeOff?: boolean;
  lastModifiedTime?: string;
  createdAt?: string;
  updatedAt?: string;
  customerEmail?: string;
  remindersStopped?: boolean;
  remindersStoppedAt?: string;
}

// For backward compatibility
export const sampleCustomers = initialCustomers;

// Invoices Storage
const INVOICES_STORAGE_KEY = "taban_books_invoices";

export const getInvoices = async (params: any = {}): Promise<Invoice[]> => {
  const finalParams = { limit: 1000, ...params };
  const response = await getInvoicesPaginated(finalParams);
  return response.data || [];
};

export const getInvoicesPaginated = async (params: any = {}): Promise<any> => {
  try {
    const [response, customers] = await Promise.all([
      invoicesAPI.getAll(params),
      getCustomers({ limit: CUSTOMER_LOOKUP_LIMIT }).catch(() => []),
    ]);
    if (response && response.success) {
      const rows = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : Array.isArray(response?.data?.items)
              ? response.data.items
              : Array.isArray(response?.payload?.data)
                ? response.payload.data
                : [];
      const customerNameLookup = buildCustomerNameLookup(customers);
      const data = rows.map((invoice: any) => ({
        ...invoice,
        id: invoice._id || invoice.id, // Ensure id exists
        customerName: resolveInvoiceCustomerName(invoice, customerNameLookup),
        status: invoice.status || "draft"
      }));
      const pagination = response?.pagination || response?.data?.pagination || response?.meta?.pagination || null;
      return {
        data,
        pagination: pagination || {
          total: data.length,
          page: 1,
          limit: params?.limit || data.length || 50,
          pages: 1,
        }
      };
    }
    return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
  } catch (error) {
    console.error("Error fetching invoices from API:", error);
    return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
  }
};

export const getInvoiceById = async (invoiceId: string): Promise<Invoice | null> => {
  try {
    const [response, customers] = await Promise.all([
      invoicesAPI.getById(invoiceId),
      getCustomers({ limit: CUSTOMER_LOOKUP_LIMIT }).catch(() => []),
    ]);
    if (response && response.success && response.data) {
      const customerNameLookup = buildCustomerNameLookup(customers);
      const invoice = response.data;
      return {
        ...invoice,
        id: invoice._id || invoice.id,
        customerName: resolveInvoiceCustomerName(invoice, customerNameLookup),
        status: invoice.status || "draft"
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting invoice by ID from API:", error);
    return null;
  }
};

export const saveInvoice = async (invoiceData: Partial<Invoice>): Promise<Invoice> => {
  try {
    const response = await invoicesAPI.create(invoiceData);
    if (response && response.success && response.data) {
      const saved = response.data;
      return { ...saved, id: saved._id || saved.id };
    }
    const message =
      String(response?.message || response?.data?.message || response?.error || "Failed to create invoice").trim();
    const error: any = new Error(message || "Failed to create invoice");
    if (response && typeof response.status === "number") {
      error.status = response.status;
    }
    if (response?.data !== undefined) {
      error.data = response.data;
    }
    throw error;
  } catch (error) {
    const status = Number((error as any)?.status || (error as any)?.response?.status || 0);
    if (status !== 409) {
      console.error("Error saving invoice to API:", error);
    }
    throw error;
  }
};

export const updateInvoice = async (invoiceId: string, invoiceData: Partial<Invoice>): Promise<Invoice> => {
  try {
    const response = await invoicesAPI.update(invoiceId, invoiceData);
    if (response && response.success && response.data) {
      const updated = response.data;
      return { ...updated, id: updated._id || updated.id };
    }
    throw new Error("Failed to update invoice");
  } catch (error) {
    console.error("Error updating invoice in API:", error);
    throw error;
  }
};

export const deleteInvoice = async (invoiceId: string): Promise<Invoice[]> => {
  try {
    const response = await invoicesAPI.delete(invoiceId);
    if (response && response.success) {
      return await getInvoices();
    }
    throw new Error("Failed to delete invoice");
  } catch (error) {
    console.error("Error deleting invoice from API:", error);
    throw error;
  }
};

// ============================================================================
// RETAINER INVOICES 
// ============================================================================

export interface RetainerInvoice extends Omit<Invoice, 'invoiceNumber'> {
  retainerInvoiceNumber: string;
  retainerType?: 'advance' | 'deposit' | 'prepayment';
}

const normalizeRetainerInvoiceRecord = (retainer: any, customerNameLookup?: Map<string, string>) => {
  const invoiceNumber = String(retainer?.invoiceNumber || retainer?.retainerInvoiceNumber || "").trim();
  const normalized = {
    ...retainer,
    invoiceNumber,
    retainerInvoiceNumber: String(retainer?.retainerInvoiceNumber || invoiceNumber || "").trim(),
  };

  return {
    ...normalized,
    customerName: resolveInvoiceCustomerName(normalized, customerNameLookup),
    status: normalized.status || "draft",
  };
};

export const getRetainerInvoices = async (params: any = {}): Promise<RetainerInvoice[]> => {
  try {
    const [response, customers] = await Promise.all([
      retainerInvoicesAPI.getAll(params),
      getCustomers({ limit: CUSTOMER_LOOKUP_LIMIT }).catch(() => []),
    ]);
    if (response && response.success) {
      const rows = response.data || [];
      const customerNameLookup = buildCustomerNameLookup(customers);
      return rows.map((retainer: any) => ({
        ...normalizeRetainerInvoiceRecord(retainer, customerNameLookup),
        id: retainer._id || retainer.id,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching retainer invoices from API:", error);
    return [];
  }
};

export const getRetainerInvoiceById = async (id: string): Promise<RetainerInvoice | null> => {
  try {
    const [response, customers] = await Promise.all([
      retainerInvoicesAPI.getById(id),
      getCustomers({ limit: CUSTOMER_LOOKUP_LIMIT }).catch(() => []),
    ]);
    if (response && response.success && response.data) {
      const customerNameLookup = buildCustomerNameLookup(customers);
      const retainer = response.data;
      return {
        ...normalizeRetainerInvoiceRecord(retainer, customerNameLookup),
        id: retainer._id || retainer.id,
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting retainer invoice by ID from API:", error);
    return null;
  }
};

export const saveRetainerInvoice = async (retainerData: any): Promise<any> => {
  try {
    const response = await retainerInvoicesAPI.create(retainerData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error(response?.message || "Failed to create retainer invoice");
  } catch (error) {
    console.error("Error saving retainer invoice to API:", error);
    throw error;
  }
};

export const updateRetainerInvoice = async (id: string, retainerData: any): Promise<any> => {
  try {
    const response = await retainerInvoicesAPI.update(id, retainerData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to update retainer invoice");
  } catch (error) {
    console.error("Error updating retainer invoice in API:", error);
    throw error;
  }
};

export const deleteRetainerInvoice = async (id: string): Promise<void> => {
  try {
    await retainerInvoicesAPI.delete(id);
  } catch (error) {
    console.error("Error deleting retainer invoice from API:", error);
    throw error;
  }
};

export interface Tax {
  id: string;
  _id?: string;
  name: string;
  rate: number;
  type?: string;
  isCompound?: boolean;
  isRecoverable?: boolean;
  createdAt?: string;
}

// For backward compatibility
export const sampleInvoices = [];

// Taxes Storage
const TAXES_STORAGE_KEY = "taban_books_taxes";
export const TAXES_STORAGE_EVENT = "taban_books_taxes_updated";

const normalizeStoredTax = (tax: any): any => {
  if (!tax || typeof tax !== "object") return null;
  const id = String(tax._id || tax.id || tax.name || "").trim();
  return {
    ...tax,
    _id: id || tax._id || tax.id,
    id: id || tax.id || tax._id,
  };
};

export const readTaxesLocal = (): Tax[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TAXES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(normalizeStoredTax).filter(Boolean)
      : [];
  } catch (error) {
    console.error("Error reading taxes from local storage:", error);
    return [];
  }
};

export const writeTaxesLocal = (taxes: any[]): Tax[] => {
  if (typeof window === "undefined") return Array.isArray(taxes) ? taxes : [];
  const normalized = (Array.isArray(taxes) ? taxes : [])
    .map(normalizeStoredTax)
    .filter(Boolean);

  try {
    window.localStorage.setItem(TAXES_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(TAXES_STORAGE_EVENT, { detail: normalized }));
  } catch (error) {
    console.error("Error writing taxes to local storage:", error);
  }

  return normalized;
};

export const createTaxLocal = (taxData: any): Tax | null => {
  const normalizedInput = normalizeCreatedTaxPayload(taxData);
  if (!normalizedInput.name) return null;

  const nextTax = normalizeStoredTax({
    ...normalizedInput.raw,
    _id:
      String(normalizedInput.raw?._id || normalizedInput.raw?.id || normalizedInput.name)
        .trim() || normalizedInput.name,
    id:
      String(normalizedInput.raw?._id || normalizedInput.raw?.id || normalizedInput.name)
        .trim() || normalizedInput.name,
    name: normalizedInput.name,
    rate: normalizedInput.rate,
    isActive:
      typeof normalizedInput.raw?.isActive === "boolean"
        ? normalizedInput.raw.isActive
        : true,
    isCompound: normalizedInput.isCompound,
  });

  if (!nextTax) return null;

  const existing = readTaxesLocal().filter((row: any) => {
    const rowId = String(row?._id || row?.id || "").trim();
    const nextId = String(nextTax._id || nextTax.id || "").trim();
    return rowId !== nextId;
  });

  writeTaxesLocal([nextTax, ...existing]);
  return nextTax as Tax;
};

export const getTaxes = async (): Promise<Tax[]> => {
  return getTaxesFromAPI();
};

export const getTaxesFromAPI = async (): Promise<Tax[]> => {
  try {
    const response = await taxesAPI.getForTransactions();
    if (response && response.success && response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching taxes from API:", error);
    return [];
  }
};

export const saveTax = async (taxData: Partial<Tax>): Promise<Tax> => {
  try {
    const response = await taxesAPI.create(taxData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to create tax");
  } catch (error) {
    console.error("Error saving tax to API:", error);
    throw error;
  }
};

export const deleteTax = async (taxId: string): Promise<void> => {
  try {
    await taxesAPI.delete(taxId);
  } catch (error) {
    console.error("Error deleting tax from API:", error);
    throw error;
  }
};

function normalizeTaxRateValue(value: any): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export const taxLabel = (tax: any): string => {
  const raw = tax?.raw ?? tax ?? {};
  const name = String(raw?.name || raw?.taxName || raw?.label || raw?.title || "Tax").trim() || "Tax";
  const rate = normalizeTaxRateValue(raw?.rate ?? raw?.taxRate ?? raw?.percentage ?? raw?.value);
  return rate > 0 ? `${name} [${rate}%]` : name;
};

export const isTaxActive = (tax: any): boolean => {
  const raw = tax?.raw ?? tax ?? {};
  if (typeof raw?.isActive === "boolean") return raw.isActive;
  if (typeof raw?.active === "boolean") return raw.active;
  const status = String(raw?.status || "").trim().toLowerCase();
  if (!status) return true;
  return !["inactive", "disabled", "archived", "deleted"].includes(status);
};

export const normalizeCreatedTaxPayload = (payload: any) => {
  const raw = payload?.data || payload || {};
  const name = String(raw?.name || raw?.taxName || "").trim();
  const rate = normalizeTaxRateValue(raw?.rate ?? raw?.taxRate ?? raw?.percentage ?? raw?.value);
  return {
    raw,
    name,
    rate,
    isCompound: Boolean(raw?.isCompound ?? raw?.compound ?? false),
  };
};

export const buildTaxOptionGroups = (taxes: any[] = []) => {
  const groups = new Map<string, Array<{ id: string; rate: number; raw: any }>>();

  taxes.forEach((tax) => {
    const raw = tax?.raw ?? tax;
    if (!raw) return;

    const typeKey = String(raw?.type || raw?.taxType || "").trim().toLowerCase();
    const isGroup =
      Boolean(raw?.isGroup || raw?.is_group) ||
      typeKey === "tax-group" ||
      typeKey === "group" ||
      String(raw?.description || "").toLowerCase().includes("tax group") ||
      Array.isArray(raw?.groupTaxes) ||
      Array.isArray(raw?.groupTaxesIds) ||
      Array.isArray(raw?.group_tax_ids);
    const isCompound =
      Boolean(raw?.isCompound || raw?.is_compound) ||
      typeKey === "compound" ||
      typeKey === "component" ||
      String(raw?.description || "").toLowerCase().includes("compound tax");
    const label = isGroup ? "Tax Group" : isCompound ? "Component Tax" : "Tax";

    const id = String(raw?._id || raw?.id || raw?.name || taxLabel(raw)).trim();
    if (!id) return;

    const option = {
      id,
      rate: normalizeTaxRateValue(raw?.rate ?? raw?.taxRate ?? raw?.percentage ?? raw?.value),
      raw,
    };

    const existing = groups.get(label) || [];
    existing.push(option);
    groups.set(label, existing);
  });

  return Array.from(groups.entries()).map(([label, options]) => ({
    label,
    options: options.sort((a, b) => taxLabel(a.raw).localeCompare(taxLabel(b.raw))),
  }));
};

export interface RecurringInvoice extends Invoice {
  frequency: string;
  startDate: string;
  endDate?: string;
  lastGenerated?: string;
  // Additional optional fields used by the frontend UI
  profileName?: string;
  repeatEvery?: string | number;
  nextInvoiceDate?: string;
  lastInvoiceDate?: string;
  startOn?: string;
  endsOn?: string;
  paymentTerms?: string;
  // Allow flexible additional properties from API
  [key: string]: any;
}

export interface Expense {
  id: string;
  _id?: string;
  date: string;
  category: any;
  categoryId?: string;
  categoryName?: string;
  amount: number;
  currency: string;
  vendor?: any;
  vendorId?: string;
  vendorName?: string;
  customer?: any;
  customerId?: string;
  customerName?: string;
  billable?: boolean;
  status: string;
  referenceNumber?: string;
  notes?: string;
  [key: string]: any;
}

export interface RecurringExpense {
  id: string;
  _id?: string;
  profileName: string;
  amount: number;
  currency: string;
  category: any;
  categoryId?: string;
  repeatEvery: number;
  repeatUnit: string;
  startDate: string;
  endDate?: string;
  status: string;
  [key: string]: any;
}

export interface Bill {
  id: string;
  _id?: string;
  billNumber: string;
  vendor?: any;
  vendorId?: string;
  vendorName?: string;
  date: string;
  billDate?: string;
  dueDate: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  balanceDue: number;
  [key: string]: any;
}

// Recurring Invoices - Now using API instead of localStorage

export const getRecurringInvoices = async (): Promise<RecurringInvoice[]> => {
  try {
    const response = await recurringInvoicesAPI.getAll();
    if (response && response.success && response.data) {
      return response.data.map((item: any) => ({
        ...item,
        id: item._id || item.id,
        customerName: item.customerName || item.customer?.displayName || item.customer?.companyName || item.customer?.name || (typeof item.customer === 'string' ? item.customer : "")
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching recurring invoices from API:", error);
    return [];
  }
};

export const saveRecurringInvoice = async (recurringInvoiceData: Partial<RecurringInvoice>): Promise<RecurringInvoice> => {
  try {
    const response = await recurringInvoicesAPI.create(recurringInvoiceData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to save recurring invoice: Invalid response from API');
  } catch (error) {
    console.error("Error saving recurring invoice to API:", error);
    throw error;
  }
};

export const updateRecurringInvoice = async (recurringInvoiceId: string, updatedData: Partial<RecurringInvoice>): Promise<RecurringInvoice> => {
  try {
    const response = await recurringInvoicesAPI.update(recurringInvoiceId, updatedData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to update recurring invoice: Invalid response from API');
  } catch (error) {
    console.error("Error updating recurring invoice via API:", error);
    throw error;
  }
};

export const getRecurringInvoiceById = async (recurringInvoiceId: string): Promise<RecurringInvoice | null> => {
  if (!recurringInvoiceId || recurringInvoiceId === "undefined") return null;
  try {
    const response = await recurringInvoicesAPI.getById(recurringInvoiceId);
    if (response && response.success && response.data) {
      const data = response.data;
      return {
        ...data,
        id: data._id || data.id
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting recurring invoice by ID from API:", error);
    return null;
  }
};

export const deleteRecurringInvoice = async (recurringInvoiceId: string): Promise<RecurringInvoice[]> => {
  try {
    const response = await recurringInvoicesAPI.delete(recurringInvoiceId);
    if (response && response.success) {
      // Return updated list
      return await getRecurringInvoices();
    }
    throw new Error('Failed to delete recurring invoice');
  } catch (error) {
    console.error("Error deleting recurring invoice via API:", error);
    throw error;
  }
};

export const generateInvoiceFromRecurring = async (recurringInvoiceId: string): Promise<any> => {
  try {
    const response = await recurringInvoicesAPI.generateInvoice(recurringInvoiceId);
    if (response && response.success) {
      return response.data;
    }
    throw new Error('Failed to generate invoice from recurring profile');
  } catch (error) {
    console.error("Error generating invoice from recurring profile:", error);
    throw error;
  }
};

export interface Payment {
  id: string;
  _id?: string;
  customer?: any;
  customerName?: string;
  customerId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount?: number;
  amountReceived?: number;
  date: string;
  paymentDate?: string;
  paymentMethod: string;
  paymentMode?: string;
  reference?: string;
  paymentReference?: string;
  referenceNumber?: string;
  notes?: string;
  paymentNumber?: string;
  customerEmail?: string;
  currency?: string;
  thankYouRecipients?: { email: string }[];
  allocations?: any[];
  unusedAmount?: number;
  depositTo?: string;
  status?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type?: string;
    size?: number;
    preview?: string;
    uploadedAt?: string;
    uploadedBy?: string;
  }>;
  comments?: Array<{
    id: string;
    text: string;
    author?: string;
    timestamp?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  }>;
}

// Payments Received storage functions
// Payments Received storage functions
const PAYMENTS_STORAGE_KEY = "taban_books_payments_received";

export const getNextPaymentNumber = async (): Promise<string> => {
  try {
    const response = await paymentsReceivedAPI.getAll({ limit: 10000 });
    if (response && response.success && response.data && response.data.length > 0) {
      const numbers = response.data
        .map((p: any) => {
          const num = p.paymentNumber || "";
          // Extract numbers if it's like "PAY-001" or just "1"
          const match = num.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter((n: number) => n > 0);

      if (numbers.length > 0) {
        return (Math.max(...numbers) + 1).toString();
      }
      return (response.data.length + 1).toString();
    }
    return "1";
  } catch (error) {
    console.error("Error generating next payment number:", error);
    return "1";
  }
};

export const getPayments = async (): Promise<Payment[]> => {
  try {
    const response = await paymentsReceivedAPI.getAll();
    if (response && response.success && response.data) {
      return response.data.map((item: any) => ({
        ...item,
        id: item._id || item.id,
        customerName:
          item.customerName ||
          item.customer?.displayName ||
          item.customer?.name ||
          item.customer?.companyName ||
          (typeof item.customer === 'string' ? item.customer : ""),
        customerId: item.customer?._id || item.customer,
        amountReceived: item.amount,
        status: item.status || 'paid',
        paymentDate: item.date,
        paymentMode: item.paymentMethod === 'cash' ? 'Cash' :
          item.paymentMethod === 'check' ? 'Check' :
            item.paymentMethod === 'card' ? 'Credit Card' :
              item.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                (item.paymentMethod || 'Other'),
        referenceNumber: item.referenceNumber || item.paymentReference || ""
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching payments from API:", error);
    return [];
  }
};

export const getPaymentById = async (paymentId: string): Promise<Payment | null> => {
  try {
    const response = await paymentsReceivedAPI.getById(paymentId);
    if (response && response.success && response.data) {
      const payment = response.data;
      return {
        ...payment,
        id: payment._id || payment.id,
        status: payment.status || 'paid',
        amountReceived: payment.amount,
        paymentDate: payment.date,
        customerName:
          payment.customerName ||
          payment.customer?.displayName ||
          payment.customer?.name ||
          payment.customer?.companyName ||
          (typeof payment.customer === 'string' ? payment.customer : ""),
        paymentMode: payment.paymentMethod === 'cash' ? 'Cash' :
          payment.paymentMethod === 'check' ? 'Check' :
            payment.paymentMethod === 'card' ? 'Credit Card' :
              payment.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                (payment.paymentMethod || 'Other'),
        referenceNumber: payment.referenceNumber || payment.paymentReference || "",
        allocations: payment.allocations || []
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting payment by ID from API:", error);
    return null;
  }
};

export const savePayment = async (paymentData: Partial<Payment>): Promise<Payment> => {
  try {
    const response = await paymentsReceivedAPI.create(paymentData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to save payment');
  } catch (error) {
    console.error("Error saving payment to API:", error);
    throw error;
  }
};

export const updatePayment = async (paymentId: string, updatedData: Partial<Payment>): Promise<Payment> => {
  try {
    const response = await paymentsReceivedAPI.update(paymentId, updatedData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to update payment');
  } catch (error) {
    console.error("Error updating payment in API:", error);
    throw error;
  }
};

export const deletePayment = async (paymentId: string): Promise<Payment[]> => {
  try {
    const response = await paymentsReceivedAPI.delete(paymentId);
    if (response && response.success) {
      return await getPayments();
    }
    throw new Error('Failed to delete payment');
  } catch (error) {
    console.error("Error deleting payment from API:", error);
    throw error;
  }
};

export interface CreditNote {
  id: string;
  _id?: string;
  creditNoteNumber: string;
  customer?: any;
  customerName?: string;
  customerEmail?: string;
  date: string;
  creditNoteDate?: string;
  items: any[];
  subtotal: number;
  subTotal?: number;
  tax: number;
  total: number;
  amount?: number;
  amountReceived?: number;
  balance?: number;
  status: string;
  reason?: string;
  referenceNumber?: string;
  currency?: string;
  subject?: string;
  customerNotes?: string;
  termsAndConditions?: string;
  companyName?: string;
  salesperson?: any;
  salespersonId?: string;
  customerId?: string;
  attachedFiles?: AttachedFile[];
  comments?: Array<{
    id?: string | number;
    text: string;
    author?: string;
    timestamp?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  }>;
  journalEntry?: any;
  discount?: number;
  shipping?: number;
  vat?: number;
  taxes?: any[]; // For tax breakdown
}

// Credit Notes Storage
const CREDIT_NOTES_STORAGE_KEY = "taban_books_credit_notes";
const normalizeCreditNoteReference = (note: any): string =>
  String(
    note?.referenceNumber ??
    note?.reference ??
    note?.referenceNo ??
    note?.refNumber ??
    note?.ref ??
    ""
  ).trim();

export const getCreditNotes = async (): Promise<CreditNote[]> => {
  try {
    const response = await creditNotesAPI.getAll();
    if (response && response.success && response.data) {
      return response.data.map((item: any) => ({
        ...item,
        id: item._id || item.id,
        customerName: item.customerName || item.customer?.displayName || item.customer?.companyName || item.customer?.name || (typeof item.customer === 'string' ? item.customer : ""),
        referenceNumber: normalizeCreditNoteReference(item)
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching credit notes from API:", error);
    return [];
  }
};

export const getCreditNoteById = async (creditNoteId: string): Promise<CreditNote | null> => {
  try {
    const response = await creditNotesAPI.getById(creditNoteId);
    if (response && response.success && response.data) {
      const note = response.data;
      return {
        ...note,
        id: note._id || note.id,
        customerId: note.customer?._id || note.customer,
        customerName: note.customer?.displayName || note.customer?.name || "",
        customerEmail: note.customer?.email || "",
        referenceNumber: normalizeCreditNoteReference(note)
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting credit note by ID from API:", error);
    return null;
  }
};

export const saveCreditNote = async (creditNoteData: Partial<CreditNote>): Promise<CreditNote> => {
  try {
    const toISO = (dateVal: any) => {
      if (!dateVal) return undefined;
      try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) return d.toISOString();
        if (typeof dateVal === "string" && dateVal.includes("/")) {
          const parts = dateVal.split("/");
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const dd = new Date(year, month, day);
            if (!isNaN(dd.getTime())) return dd.toISOString();
          }
        }
      } catch {}
      return undefined;
    };

    const apiData: any = {
      ...creditNoteData,
      creditNoteNumber: String((creditNoteData as any).creditNoteNumber || (creditNoteData as any).number || ""),
      referenceNumber: normalizeCreditNoteReference(creditNoteData as any),
      reference: normalizeCreditNoteReference(creditNoteData as any),
      customer: creditNoteData.customerId || (creditNoteData as any).customer,
      customerId: creditNoteData.customerId || (creditNoteData as any).customer,
      customerName:
        creditNoteData.customerName ||
        (typeof (creditNoteData as any).customer === "object" && (creditNoteData as any).customer
          ? ((creditNoteData as any).customer.displayName || (creditNoteData as any).customer.name || (creditNoteData as any).customer.companyName || "")
          : ""),
      invoiceId: String((creditNoteData as any).invoiceId || (creditNoteData as any).invoice || ""),
      invoiceNumber: String((creditNoteData as any).invoiceNumber || ""),
      date: toISO((creditNoteData as any).creditNoteDate || (creditNoteData as any).date) || new Date().toISOString(),
      subtotal: Number((creditNoteData as any).subtotal ?? (creditNoteData as any).subTotal ?? 0) || 0,
      subTotal: Number((creditNoteData as any).subtotal ?? (creditNoteData as any).subTotal ?? 0) || 0,
      tax: Number((creditNoteData as any).tax ?? (creditNoteData as any).taxAmount ?? 0) || 0,
      discount: Number((creditNoteData as any).discount ?? 0) || 0,
      discountType: (creditNoteData as any).discountType || "percent",
      shippingCharges: Number((creditNoteData as any).shippingCharges ?? 0) || 0,
      shippingChargeTax: String((creditNoteData as any).shippingChargeTax || ""),
      adjustment: Number((creditNoteData as any).adjustment ?? 0) || 0,
      roundOff: Number((creditNoteData as any).roundOff ?? 0) || 0,
      total: Number((creditNoteData as any).total ?? 0) || 0,
      balance: Number((creditNoteData as any).balance ?? (creditNoteData as any).total ?? 0) || 0,
      status: (creditNoteData as any).status || "open",
    };

    const response = await creditNotesAPI.create(apiData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to save credit note');
  } catch (error) {
    console.error("Error saving credit note to API:", error);
    throw error;
  }
};

export const updateCreditNote = async (creditNoteId: string, creditNoteData: Partial<CreditNote>): Promise<CreditNote> => {
  try {
    const toISO = (dateVal: any) => {
      if (!dateVal) return undefined;
      try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) return d.toISOString();
        if (typeof dateVal === "string" && dateVal.includes("/")) {
          const parts = dateVal.split("/");
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const dd = new Date(year, month, day);
            if (!isNaN(dd.getTime())) return dd.toISOString();
          }
        }
      } catch {}
      return undefined;
    };

    const apiData: any = {
      ...creditNoteData,
      creditNoteNumber: String((creditNoteData as any).creditNoteNumber || (creditNoteData as any).number || ""),
      referenceNumber: normalizeCreditNoteReference(creditNoteData as any),
      reference: normalizeCreditNoteReference(creditNoteData as any),
      customer: creditNoteData.customerId || (creditNoteData as any).customer,
      customerId: creditNoteData.customerId || (creditNoteData as any).customer,
      customerName:
        creditNoteData.customerName ||
        (typeof (creditNoteData as any).customer === "object" && (creditNoteData as any).customer
          ? ((creditNoteData as any).customer.displayName || (creditNoteData as any).customer.name || (creditNoteData as any).customer.companyName || "")
          : ""),
      invoiceId: String((creditNoteData as any).invoiceId || (creditNoteData as any).invoice || ""),
      invoiceNumber: String((creditNoteData as any).invoiceNumber || ""),
      date: toISO((creditNoteData as any).creditNoteDate || (creditNoteData as any).date),
      subtotal: Number((creditNoteData as any).subtotal ?? (creditNoteData as any).subTotal ?? 0) || 0,
      subTotal: Number((creditNoteData as any).subtotal ?? (creditNoteData as any).subTotal ?? 0) || 0,
      tax: Number((creditNoteData as any).tax ?? (creditNoteData as any).taxAmount ?? 0) || 0,
      discount: Number((creditNoteData as any).discount ?? 0) || 0,
      discountType: (creditNoteData as any).discountType || "percent",
      shippingCharges: Number((creditNoteData as any).shippingCharges ?? 0) || 0,
      shippingChargeTax: String((creditNoteData as any).shippingChargeTax || ""),
      adjustment: Number((creditNoteData as any).adjustment ?? 0) || 0,
      roundOff: Number((creditNoteData as any).roundOff ?? 0) || 0,
      total: Number((creditNoteData as any).total ?? 0) || 0,
      balance: Number((creditNoteData as any).balance ?? (creditNoteData as any).total ?? 0) || 0,
      status: (creditNoteData as any).status || "open",
    };

    const response = await creditNotesAPI.update(creditNoteId, apiData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to update credit note');
  } catch (error) {
    console.error("Error updating credit note in API:", error);
    throw error;
  }
};

export const deleteCreditNote = async (creditNoteId: string): Promise<CreditNote[]> => {
  try {
    const response = await creditNotesAPI.delete(creditNoteId);
    if (response && response.success) {
      return await getCreditNotes();
    }
    throw new Error('Failed to delete credit note');
  } catch (error) {
    console.error("Error deleting credit note from API:", error);
    throw error;
  }
};

export const getCreditNotesByInvoiceId = async (invoiceId: string): Promise<CreditNote[]> => {
  try {
    const normalizedInvoiceId = String(invoiceId || "");
    const response = await creditNotesAPI.getByInvoice(normalizedInvoiceId);
    const directRows: CreditNote[] =
      response && response.success && Array.isArray(response.data) ? response.data : [];

    const allResponse = await creditNotesAPI.getAll({ limit: 10000 });
    const allRows: CreditNote[] =
      allResponse && allResponse.success && Array.isArray(allResponse.data) ? allResponse.data : [];

    const fromAllocations = allRows.filter((note: any) =>
      Array.isArray(note?.allocations) &&
      note.allocations.some((allocation: any) => {
        const allocationInvoiceId = String(
          allocation?.invoiceId ||
          allocation?.invoice?._id ||
          allocation?.invoice?.id ||
          allocation?.invoice ||
          ""
        );
        return allocationInvoiceId === normalizedInvoiceId;
      })
    );

    const merged = [...directRows, ...fromAllocations];
    const seen = new Set<string>();
    return merged.filter((note: any) => {
      const noteId = String(note?.id || note?._id || "");
      if (!noteId || seen.has(noteId)) return false;
      seen.add(noteId);
      return true;
    });
  } catch (error) {
    console.error("Error fetching credit notes by invoice ID:", error);
    return [];
  }
};

export interface SalesReceipt {
  id: string;
  _id?: string;
  receiptNumber: string;
  customer?: any;
  customerName?: string;
  customerId?: string;
  referenceNumber?: string;
  receiptDate?: string;
  date: string;
  items: any[];
  subtotal: number;
  tax: number;
  discount?: number;
  discountType?: "percent" | "amount" | string;
  shippingCharges?: number;
  shippingChargeTax?: string;
  adjustment?: number;
  total: number;
  amount?: number;
  status: string;
  paymentMethod?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type?: string;
    size?: number;
    preview?: string;
    uploadedAt?: string;
    uploadedBy?: string;
  }>;
  comments?: Array<{
    id: string;
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    author?: string;
    timestamp?: string;
  }>;
}

// Sales Receipts Storage
const SALES_RECEIPTS_STORAGE_KEY = "taban_books_sales_receipts";

export const getSalesReceipts = async (params: any = {}): Promise<SalesReceipt[]> => {
  const finalParams = { limit: 1000, ...params };
  const response = await getSalesReceiptsPaginated(finalParams);
  return response.data || [];
};

export const getSalesReceiptsPaginated = async (params: any = {}): Promise<any> => {
  try {
    const finalParams = { ...params };
    if (String(finalParams.status || "").toLowerCase() === "all") {
      delete finalParams.status;
    }
    const response = await salesReceiptsAPI.getAll(finalParams);
    if (response && response.success && response.data) {
      const data = response.data.map((item: any) => ({
        ...item,
        id: item._id || item.id,
        customerName: item.customerName || item.customer?.displayName || item.customer?.companyName || item.customer?.name || (typeof item.customer === 'string' ? item.customer : "")
      }));
      return {
        data,
        pagination: response.pagination || {
          total: data.length,
          page: 1,
          limit: data.length,
          pages: 1
        }
      };
    }
    return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
  } catch (error) {
    console.error("Error fetching sales receipts from API:", error);
    return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
  }
};

export const getSalesReceiptById = async (receiptId: string): Promise<SalesReceipt | null> => {
  try {
    const response = await salesReceiptsAPI.getById(receiptId);
    if (response && response.success && response.data) {
      const data = response.data;
      return {
        ...data,
        id: data._id || data.id
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting sales receipt by ID from API:", error);
    return null;
  }
};

export const saveSalesReceipt = async (receiptData: Partial<SalesReceipt>): Promise<SalesReceipt> => {
  try {
    const normalizeSavedReceipt = async (response: any) => {
      const payload = response?.data?.data ?? response?.data ?? response?.result ?? response ?? {};
      let id = String(
        payload?.id ||
        payload?._id ||
        payload?.receiptId ||
        payload?.salesReceiptId ||
        payload?.documentId ||
        payload?.uuid ||
        ""
      ).trim();
      if (!id && payload?.receiptNumber) {
        try {
          const listResponse: any = await salesReceiptsAPI.getAll({
            limit: 100000,
            _cacheBust: Date.now(),
          });
          const rows = Array.isArray(listResponse?.data)
            ? listResponse.data
            : Array.isArray(listResponse?.data?.data)
              ? listResponse.data.data
              : [];
          const match = [...rows].reverse().find(
            (row: any) =>
              String(row?.receiptNumber || "").trim() === String(payload?.receiptNumber || "").trim(),
          );
          id = String(match?.id || match?._id || match?.receiptId || "").trim();
        } catch {}
      }
      return {
        ...payload,
        id,
        _id: id,
      };
    };

    const toISO = (dateVal: any) => {
      if (!dateVal) return undefined;
      try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) return d.toISOString();
        if (typeof dateVal === "string" && dateVal.includes("/")) {
          const parts = dateVal.split("/");
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const dd = new Date(year, month, day);
            if (!isNaN(dd.getTime())) return dd.toISOString();
          }
        }
      } catch {}
      return undefined;
    };

    const apiData: any = {
      ...receiptData,
      receiptNumber: String(receiptData.receiptNumber || ""),
      customer: receiptData.customerId || (receiptData as any).customer,
      customerId: receiptData.customerId || (receiptData as any).customer,
      customerName:
        receiptData.customerName ||
        (typeof (receiptData as any).customer === "object" && (receiptData as any).customer
          ? ((receiptData as any).customer.displayName || (receiptData as any).customer.name || (receiptData as any).customer.companyName || "")
          : ""),
      date: toISO((receiptData as any).receiptDate || (receiptData as any).date) || new Date().toISOString(),
      receiptDate: toISO((receiptData as any).receiptDate || (receiptData as any).date) || new Date().toISOString(),
      subtotal: Number(receiptData.subtotal ?? (receiptData as any).subTotal ?? 0) || 0,
      subTotal: Number(receiptData.subtotal ?? (receiptData as any).subTotal ?? 0) || 0,
      tax: Number((receiptData as any).tax ?? (receiptData as any).taxAmount ?? 0) || 0,
      discount: Number(receiptData.discount ?? 0) || 0,
      discountType: receiptData.discountType || "percent",
      shippingCharges: Number(receiptData.shippingCharges ?? 0) || 0,
      shippingChargeTax: String(receiptData.shippingChargeTax || ""),
      adjustment: Number(receiptData.adjustment ?? 0) || 0,
      roundOff: Number((receiptData as any).roundOff ?? 0) || 0,
      total: Number(receiptData.total ?? 0) || 0,
      status: receiptData.status || "paid",
    };

    if (apiData.receiptDate && apiData.date) delete apiData.receiptDate;

    const response = await salesReceiptsAPI.create(apiData);
    if (response && response.success && response.data) {
      return normalizeSavedReceipt(response);
    }
    throw new Error((response as any)?.message || (response as any)?.error || "Failed to save sales receipt");
  } catch (error) {
    console.error("Error saving sales receipt to API:", error);
    throw error;
  }
};

export const updateSalesReceipt = async (receiptId: string, receiptData: Partial<SalesReceipt>): Promise<SalesReceipt> => {
  try {
    const normalizeSavedReceipt = async (response: any) => {
      const payload = response?.data?.data ?? response?.data ?? response?.result ?? response ?? {};
      let id = String(
        payload?.id ||
        payload?._id ||
        payload?.receiptId ||
        payload?.salesReceiptId ||
        payload?.documentId ||
        payload?.uuid ||
        receiptId ||
        ""
      ).trim();
      return {
        ...payload,
        id,
        _id: id,
      };
    };

    const toISO = (dateVal: any) => {
      if (!dateVal) return undefined;
      try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) return d.toISOString();
        if (typeof dateVal === "string" && dateVal.includes("/")) {
          const parts = dateVal.split("/");
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const dd = new Date(year, month, day);
            if (!isNaN(dd.getTime())) return dd.toISOString();
          }
        }
      } catch {}
      return undefined;
    };

    const apiData: any = {
      ...receiptData,
      receiptNumber: String(receiptData.receiptNumber || ""),
      customer: receiptData.customerId || (receiptData as any).customer,
      customerId: receiptData.customerId || (receiptData as any).customer,
      customerName:
        receiptData.customerName ||
        (typeof (receiptData as any).customer === "object" && (receiptData as any).customer
          ? ((receiptData as any).customer.displayName || (receiptData as any).customer.name || (receiptData as any).customer.companyName || "")
          : ""),
      date: toISO((receiptData as any).receiptDate || (receiptData as any).date),
      subtotal: Number(receiptData.subtotal ?? (receiptData as any).subTotal ?? 0) || 0,
      subTotal: Number(receiptData.subtotal ?? (receiptData as any).subTotal ?? 0) || 0,
      tax: Number((receiptData as any).tax ?? (receiptData as any).taxAmount ?? 0) || 0,
      discount: Number(receiptData.discount ?? 0) || 0,
      discountType: receiptData.discountType || "percent",
      shippingCharges: Number(receiptData.shippingCharges ?? 0) || 0,
      shippingChargeTax: String(receiptData.shippingChargeTax || ""),
      adjustment: Number(receiptData.adjustment ?? 0) || 0,
      roundOff: Number((receiptData as any).roundOff ?? 0) || 0,
      total: Number(receiptData.total ?? 0) || 0,
      status: receiptData.status || "paid",
    };

    const response = await salesReceiptsAPI.update(receiptId, apiData);
    if (response && response.success && response.data) {
      return normalizeSavedReceipt(response);
    }
    throw new Error((response as any)?.message || (response as any)?.error || "Failed to update sales receipt");
  } catch (error) {
    console.error("Error updating sales receipt via API:", error);
    throw error;
  }
};

export const deleteSalesReceipt = async (receiptId: string): Promise<boolean> => {
  try {
    const response = await salesReceiptsAPI.delete(receiptId);
    if (response && response.success) {
      return true;
    }
    throw new Error('Failed to delete sales receipt');
  } catch (error) {
    console.error("Error deleting sales receipt via API:", error);
    throw error;
  }
};

export interface Quote {
  id: string;
  _id?: string;
  quoteNumber: string;
  customer?: any;
  customerId?: string;
  customerName?: string;
  priceListId?: string;
  priceListName?: string;
  customerEmail?: string;
  salesperson?: any;
  salespersonId?: string;
  project?: any;
  projectId?: string;
  projectName?: string;
  date: string;
  quoteDate?: string;
  expiryDate?: string;
  productId?: string;
  productName?: string;
  planName?: string;
  addonLines?: any[];
  items: any[];
  subTotal: number;
  subtotal: number;
  tax?: number;
  taxAmount?: number;
  totalTax?: number;
  taxName?: string;
  discount: number;
  discountType?: string;
  discountAccount?: string;
  shippingCharges?: number;
  shippingChargeTax?: string;
  shippingTaxAmount?: number;
  shippingTaxName?: string;
  shippingTaxRate?: number;
  adjustment?: number;
  roundOff?: number;
  total: number;
  amount?: number;
  currency: string;
  status: string;
  notes?: string;
  customerNotes?: string;
  termsAndConditions?: string;
  terms?: string;
  subject?: string;
  taxExclusive?: string;
  referenceNumber?: string;
  attachedFiles?: AttachedFile[];
  comments?: QuoteComment[];
  activityLogs?: any[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteComment {
  id: string | number;
  text: string;
  content: string;
  author: string;
  authorName?: string;
  authorInitial?: string;
  timestamp: string;
  createdAt?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

const mapQuoteAttachedFiles = (quote: any): AttachedFile[] => {
  if (!Array.isArray(quote?.attachedFiles)) return [];
  return quote.attachedFiles.map((file: any, index: number) => {
    const mimeType = file?.mimeType || file?.type || "";
    const fileUrl = file?.url || "";
    return {
      id: file?.documentId || file?._id || file?.id || `${quote?._id || quote?.id || 'quote'}-file-${index}`,
      name: file?.name || "Attachment",
      size: file?.size || 0,
      type: mimeType,
      mimeType,
      url: fileUrl,
      documentId: file?.documentId || file?._id || file?.id,
      uploadedAt: file?.uploadedAt || file?.createdAt || "",
      preview: mimeType.startsWith("image/") ? fileUrl : null
    };
  });
};

const mapQuoteComments = (quote: any): QuoteComment[] => {
  if (!Array.isArray(quote?.comments)) return [];
  return quote.comments
    .filter((comment: any) => comment && String(comment.text || comment.content || "").trim())
    .map((comment: any, index: number) => ({
      id: comment?._id || comment?.id || `${quote?._id || quote?.id || 'quote'}-comment-${index}`,
      text: String(comment?.text || ""),
      content: String(comment?.content || comment?.text || ""),
      author: comment?.author || comment?.authorName || "User",
      authorName: String(comment?.authorName || comment?.author || "User"),
      authorInitial: String(comment?.authorInitial || String(comment?.authorName || comment?.author || "User").charAt(0).toUpperCase() || "U").trim() || "U",
      timestamp: comment?.timestamp || comment?.createdAt || new Date().toISOString(),
      createdAt: comment?.createdAt || comment?.timestamp || new Date().toISOString(),
      bold: Boolean(comment?.bold),
      italic: Boolean(comment?.italic),
      underline: Boolean(comment?.underline)
    }));
};

export const mapQuoteFromApi = (quote: any): Quote => {
  // Extract customer name safely
  let customerName = '';
  if (quote?.customer) {
    if (typeof quote.customer === 'object') {
      customerName = quote.customer.displayName || quote.customer.name || quote.customer.companyName || 'Unknown Customer';
    } else {
      customerName = String(quote.customer);
    }
  }

  const subtotalValue = Number(quote?.subtotal ?? quote?.subTotal ?? 0) || 0;
  const taxValue = Number(quote?.tax ?? quote?.taxAmount ?? quote?.totalTax ?? 0) || 0;
  const taxExclusive = quote?.taxExclusive || 'Tax Exclusive';
  const taxLabel = quote?.taxName || (taxValue > 0 ? (taxExclusive === 'Tax Inclusive' ? 'Tax (Included)' : 'Tax') : '');

  return {
    id: quote?._id || quote?.id,
    _id: quote?._id,
    quoteNumber: quote?.quoteNumber,
    customerId: quote?.customer?._id || quote?.customer,
    customerName: customerName || quote?.customerName || '',
    customerEmail: String(quote?.customerEmail || quote?.email || quote?.customer?.email || quote?.customer?.primaryEmail || '').trim(),
    priceListId: String(quote?.priceListId || quote?.priceList?._id || quote?.priceList?.id || ""),
    priceListName: String(quote?.priceListName || quote?.priceList?.name || ""),
    customer: quote?.customer,
    salesperson: quote?.salesperson?.name || quote?.salesperson,
    salespersonId: quote?.salesperson?._id || quote?.salesperson,
    project: quote?.project,
    projectId: quote?.project?._id || quote?.project,
    projectName: quote?.project?.name || quote?.projectName || '',
    productId: String(quote?.productId || quote?.product?._id || quote?.product?.id || ""),
    productName: String(quote?.productName || quote?.product?.name || quote?.product?.productName || ""),
    planName: String(quote?.planName || ""),
    addonLines: Array.isArray(quote?.addonLines) ? quote.addonLines : [],
    date: quote?.quoteDate || quote?.date || quote?.createdAt,
    quoteDate: quote?.quoteDate || quote?.date || quote?.createdAt,
    expiryDate: quote?.expiryDate,
    items: quote?.items || [],
    subTotal: subtotalValue,
    subtotal: subtotalValue,
    tax: taxValue,
    taxAmount: taxValue,
    totalTax: Number(quote?.totalTax ?? taxValue) || taxValue,
    taxName: taxLabel,
    discount: Number(quote?.discount || 0) || 0,
    discountType: quote?.discountType || 'percent',
    discountAccount: quote?.discountAccount || 'General Income',
    shippingCharges: Number(quote?.shippingCharges || 0) || 0,
    shippingChargeTax: String(quote?.shippingChargeTax || ''),
    shippingTaxAmount: Number(quote?.shippingTaxAmount ?? quote?.shippingTax ?? 0) || 0,
    shippingTaxName: String(quote?.shippingTaxName || ''),
    shippingTaxRate: Number(quote?.shippingTaxRate || 0) || 0,
    adjustment: Number(quote?.adjustment || 0) || 0,
    roundOff: Number(quote?.roundOff || 0) || 0,
    total: Number(quote?.total || 0) || 0,
    currency: quote?.currency,
    status: quote?.status || 'draft',
    notes: quote?.notes || quote?.customerNotes || '',
    customerNotes: quote?.customerNotes || quote?.notes || '',
    termsAndConditions: quote?.termsAndConditions || quote?.terms || '',
    referenceNumber: quote?.referenceNumber || '',
    taxExclusive: taxExclusive,
    attachedFiles: mapQuoteAttachedFiles(quote),
    comments: mapQuoteComments(quote),
    createdAt: quote?.createdAt,
    updatedAt: quote?.updatedAt
  };
};

// Quotes Storage - Now using API instead of localStorage

export const getQuotes = async (): Promise<Quote[]> => {
  try {
    const response = await quotesAPI.getAll();
    if (response && response.success) {
      const payload: any = response.data;
      const rows =
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.quotes)
              ? payload.quotes
              : Array.isArray(payload?.items)
                ? payload.items
                : Array.isArray(payload?.data?.data)
                  ? payload.data.data
                  : [];
      return rows.map((quote: any) => mapQuoteFromApi(quote));
    }
    return [];
  } catch (error) {
    console.error("Error fetching quotes from API:", error);
    // Fallback to empty array on error
    return [];
  }
};

export const getQuoteById = async (quoteId: string): Promise<Quote | null> => {
  try {
    const response = await quotesAPI.getById(quoteId);
    if (response && response.success) {
      const payload: any = response.data;
      const row = payload?.data || payload?.quote || payload || null;
      if (row) return mapQuoteFromApi(row);
    }
    return null;
  } catch (error) {
    console.error("Error getting quote by ID from API:", error);
    return null;
  }
};

export const saveQuote = async (quoteData: Partial<Quote>, retryCount = 0): Promise<Quote> => {
  try {
    // Helper to normalize dates to ISO format
    const toISO = (dateVal: any) => {
      if (!dateVal) return undefined;
      try {
        // If it's already an ISO string or a Date object that's valid
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          return d.toISOString();
        }

        // Try parsing DD/MM/YYYY
        if (typeof dateVal === 'string' && dateVal.includes('/')) {
          const parts = dateVal.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const dd = new Date(year, month, day);
            if (!isNaN(dd.getTime())) return dd.toISOString();
          }
        }
        return undefined;
      } catch (e) {
        return undefined;
      }
    };

    const normalizeQuoteDiscountType = (value: any): "percent" | "amount" => {
      const normalized = String(value || "").trim().toLowerCase();
      if (normalized === "fixed" || normalized === "amount") return "amount";
      return "percent";
    };

    // Prepare data for backend API
    const apiData: any = {
      ...quoteData,
      quoteNumber: String(quoteData.quoteNumber || ''),
      customer: quoteData.customerId || quoteData.customer, // Use ID as priority
      customerId: quoteData.customerId || quoteData.customer,
      customerName:
        quoteData.customerName ||
        (typeof (quoteData as any).customer === "object" && (quoteData as any).customer
          ? ((quoteData as any).customer.displayName || (quoteData as any).customer.name || (quoteData as any).customer.companyName || "")
          : ""),
      priceListId: String((quoteData as any).priceListId || ""),
      priceListName: String((quoteData as any).priceListName || ""),
      date: toISO(quoteData.quoteDate || quoteData.date) || new Date().toISOString(),
      quoteDate: toISO(quoteData.quoteDate || quoteData.date) || new Date().toISOString(),
      expiryDate: toISO(quoteData.expiryDate),
      subtotal: parseFloat(String(quoteData.subTotal || quoteData.subtotal || 0)) || 0,
      subTotal: parseFloat(String(quoteData.subTotal || quoteData.subtotal || 0)) || 0,
      tax: parseFloat(String(quoteData.tax ?? quoteData.taxAmount ?? quoteData.totalTax ?? 0)) || 0,
      totalTax: parseFloat(String(quoteData.totalTax ?? quoteData.taxAmount ?? quoteData.tax ?? 0)) || 0,
      discount: parseFloat(String(quoteData.discount || 0)) || 0,
      discountType: normalizeQuoteDiscountType(quoteData.discountType),
      discountAccount: quoteData.discountAccount || 'General Income',
      shippingCharges: parseFloat(String(quoteData.shippingCharges || 0)) || 0,
      shippingChargeTax: String(quoteData.shippingChargeTax || ''),
      adjustment: parseFloat(String(quoteData.adjustment || 0)) || 0,
      taxExclusive: quoteData.taxExclusive || 'Tax Exclusive',
      total: parseFloat(String(quoteData.total || 0)) || 0,
      status: quoteData.status || 'draft'
    };

    // Clean up redundant fields that might cause confusion on backend
    if (apiData.quoteDate && apiData.date) delete apiData.quoteDate;

    console.log('Sending quote data to API:', apiData);
    const response: any = await quotesAPI.create(apiData);
    if (response && response.success && response.data) {
      return mapQuoteFromApi(response.data);
    }
    const apiMessage = response?.message || response?.data?.message || response?.error || "Invalid response from API";
    throw new Error(`Failed to save quote: ${apiMessage}`);
  } catch (error) {
    const msg = String((error as any)?.message || "");
    if (
      retryCount < 2 &&
      (msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("duplicate"))
    ) {
      try {
        const rawNumber = String(quoteData.quoteNumber || "QT-").trim();
        const prefixMatch = rawNumber.match(/^(.*?)(\d+)\s*$/);
        const prefix = prefixMatch && String(prefixMatch[1] || "").trim() ? prefixMatch[1] : "QT-";
        let nextNumber = "";
        try {
          const next = await quotesAPI.getNextNumber(prefix);
          nextNumber =
            next?.data?.nextNumber ||
            next?.data?.quoteNumber ||
            next?.nextNumber ||
            next?.quoteNumber ||
            "";
        } catch (nextErr) {
          console.warn("Quote next-number endpoint failed, falling back to local scan.", nextErr);
        }

        if (!nextNumber) {
          const existing = await getQuotes();
          const maxSuffix = existing
            .map((q) => String((q as any)?.quoteNumber || ""))
            .filter((num) => num.startsWith(prefix))
            .map((num) => {
              const digits = num.match(/\d+$/);
              return digits ? parseInt(digits[0], 10) : 0;
            })
            .reduce((max, cur) => (cur > max ? cur : max), 0);
          nextNumber = `${prefix}${String(maxSuffix + 1).padStart(6, "0")}`;
        }

        if (nextNumber) {
          const retryData = { ...quoteData, quoteNumber: String(nextNumber).trim() };
          return await saveQuote(retryData, retryCount + 1);
        }
      } catch (retryError) {
        console.error("Error retrying quote number:", retryError);
      }
    }
    console.error("Error saving quote to API:", error);
    throw error;
  }
};

export const updateQuote = async (quoteId: string, quoteData: Partial<Quote>): Promise<Quote> => {
  try {
    // Helper to normalize dates to ISO format
    const toISO = (dateVal: any) => {
      if (!dateVal) return undefined;
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) {
          if (typeof dateVal === 'string' && dateVal.includes('/')) {
            const parts = dateVal.split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
              const dd = new Date(year, month, day);
              if (!isNaN(dd.getTime())) return dd.toISOString();
            }
          }
          return undefined;
        }
        return d.toISOString();
      } catch (e) {
        return undefined;
      }
    };

    const normalizeQuoteDiscountType = (value: any): "percent" | "amount" => {
      const normalized = String(value || "").trim().toLowerCase();
      if (normalized === "fixed" || normalized === "amount") return "amount";
      return "percent";
    };

    // Prepare data for backend API without forcing defaults on partial updates
    const apiData: any = { ...quoteData };

    const normalizedQuoteDate = toISO(quoteData.quoteDate || quoteData.date);
    if (normalizedQuoteDate) {
      apiData.date = normalizedQuoteDate;
      delete apiData.quoteDate;
    }

    if (quoteData.expiryDate !== undefined) {
      apiData.expiryDate = toISO(quoteData.expiryDate) || quoteData.expiryDate;
    }

    if (quoteData.customerId !== undefined || quoteData.customer !== undefined) {
      const customerRef = quoteData.customerId || quoteData.customer;
      const customerId = typeof customerRef === 'object' && customerRef ? (customerRef._id || customerRef.id) : customerRef;
      apiData.customerId = customerId;
      apiData.customer = customerId;
    }

    if (Array.isArray(quoteData.items)) {
      apiData.items = quoteData.items.map((item: any) => ({
        ...item,
        item: typeof item.item === 'object' && item.item ? (item.item._id || item.item.id) : item.item,
        itemId: typeof item.item === 'object' && item.item ? (item.item._id || item.item.id) : (item.itemId || item.item)
      }));
    }

    // Clean up readonly fields to prevent validation errors
    delete apiData._id;
    delete apiData.createdAt;
    delete apiData.updatedAt;
    delete apiData.__v;
    delete apiData.id;

    if (quoteData.customerNotes !== undefined || quoteData.notes !== undefined) {
      apiData.customerNotes = quoteData.customerNotes ?? quoteData.notes;
    }

    if (quoteData.termsAndConditions !== undefined || quoteData.terms !== undefined) {
      apiData.termsAndConditions = quoteData.termsAndConditions ?? quoteData.terms;
    }

    if (quoteData.subTotal !== undefined || quoteData.subtotal !== undefined) {
      const subtotalValue = parseFloat(String(quoteData.subTotal ?? quoteData.subtotal ?? 0));
      apiData.subTotal = subtotalValue;
      apiData.subtotal = subtotalValue;
    }
    if (quoteData.tax !== undefined || quoteData.taxAmount !== undefined || quoteData.totalTax !== undefined) {
      apiData.tax = parseFloat(String(quoteData.tax ?? quoteData.taxAmount ?? quoteData.totalTax ?? 0)) || 0;
      apiData.totalTax = parseFloat(String(quoteData.totalTax ?? quoteData.taxAmount ?? quoteData.tax ?? 0)) || 0;
    }

    if (quoteData.customerName !== undefined) {
      apiData.customerName = String(quoteData.customerName || "");
    }

    if ((quoteData as any).priceListId !== undefined) {
      apiData.priceListId = String((quoteData as any).priceListId || "");
    }
    if ((quoteData as any).priceListName !== undefined) {
      apiData.priceListName = String((quoteData as any).priceListName || "");
    }

    if (quoteData.discountType !== undefined) {
      apiData.discountType = normalizeQuoteDiscountType(quoteData.discountType);
    }
    if (quoteData.discountAccount !== undefined) {
      apiData.discountAccount = quoteData.discountAccount;
    }
    if (quoteData.taxExclusive !== undefined) {
      apiData.taxExclusive = quoteData.taxExclusive;
    }
    if (quoteData.shippingCharges !== undefined) {
      apiData.shippingCharges = parseFloat(String(quoteData.shippingCharges || 0)) || 0;
    }
    if (quoteData.shippingChargeTax !== undefined) {
      apiData.shippingChargeTax = String(quoteData.shippingChargeTax || '');
    }
    if (quoteData.adjustment !== undefined) {
      apiData.adjustment = parseFloat(String(quoteData.adjustment || 0)) || 0;
    }

    const response: any = await quotesAPI.update(quoteId, apiData);
    if (response && response.success && response.data) {
      return mapQuoteFromApi(response.data);
    }
    const apiMessage = response?.message || response?.data?.message || response?.error || "Invalid response from API";
    throw new Error(`Failed to update quote: ${apiMessage}`);
  } catch (error) {
    console.error("Error updating quote via API:", error);
    throw error;
  }
};

export const deleteQuote = async (quoteId: string): Promise<Quote[]> => {
  try {
    const response = await quotesAPI.delete(quoteId);
    if (response && response.success) {
      // Return updated list
      return await getQuotes();
    }
    throw new Error('Failed to delete quote');
  } catch (error) {
    console.error("Error deleting quote via API:", error);
    throw error;
  }
};

export const deleteQuotes = async (quoteIds: string[]): Promise<Quote[]> => {
  try {
    const response = await quotesAPI.bulkDelete(quoteIds);
    if (response && response.success) {
      // Return updated list
      return await getQuotes();
    }
    const apiMessage = (response as any)?.message || (response as any)?.data?.message || "Failed to delete quotes";
    throw new Error(apiMessage);
  } catch (error) {
    console.error("Error deleting quotes via API:", error);
    throw error;
  }
};

export interface Project {
  id: string;
  _id?: string;
  name?: string;
  projectName?: string;
  projectCode?: string;
  customer?: any;
  customerId?: string;
  customerName?: string;
  status?: string;
  budget?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Projects Storage
const PROJECTS_STORAGE_KEY = "taban_books_projects";

export const getProjects = async (): Promise<Project[]> => {
  return cachedFetch("projects:all", async () => {
    try {
      const response = await projectsAPI.getAll();
      if (response && response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching projects from API:", error);
      return [];
    }
  });
};

export const getProjectById = async (projectId: string): Promise<Project | null> => {
  try {
    const response = await projectsAPI.getById(projectId);
    if (response && response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error("Error getting project by ID from API:", error);
    return null;
  }
};

export const saveProject = async (projectData: Partial<Project>): Promise<Project> => {
  try {
    const response = await projectsAPI.create(projectData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to create project");
  } catch (error) {
    console.error("Error saving project to API:", error);
    throw error;
  }
};

export const updateProject = async (projectId: string, projectData: Partial<Project>): Promise<Project | undefined> => {
  try {
    const response = await projectsAPI.update(projectId, projectData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to update project");
  } catch (error) {
    console.error("Error updating project via API:", error);
    throw error;
  }
};

export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    await projectsAPI.delete(projectId);
  } catch (error) {
    console.error("Error deleting project from API:", error);
    throw error;
  }
};

export interface Salesperson {
  id: string;
  _id?: string;
  name: string;
  email: string;
  status?: string;
  displayName?: string;
  fullName?: string;
}

export const getSalespersonsFromAPI = async (): Promise<Salesperson[]> => {
  return cachedFetch("salespersons:all", async () => {
    try {
      const response = await salespersonsAPI.getAll();
      if (response && response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching salespersons from API:", error);
      return [];
    }
  });
};

export const getItemsFromAPI = async (): Promise<any[]> => {
  return cachedFetch("items:all", async () => {
    try {
      const limit = 100;
      let page = 1;
      let totalPages = 1;
      const allItems: any[] = [];

      do {
        const response = await itemsAPI.getAll({ page, limit, _ts: Date.now() });
        const batch = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data?.items)
              ? response.data.items
              : Array.isArray(response?.data?.data)
                ? response.data.data
                : [];
        if (batch.length > 0) {
          allItems.push(...batch);
        }

        const paginationPages = Number((response as any)?.pagination?.pages || 0);
        if (paginationPages > 0) {
          totalPages = paginationPages;
        } else if (batch.length < limit) {
          totalPages = page;
        } else {
          totalPages = page + 1;
        }

        page += 1;
      } while (page <= totalPages && page <= 100);

      if (allItems.length > 0) {
        const byId = new Map<string, any>();
        for (const item of allItems) {
          const key = String(item?._id || item?.id || "").trim();
          if (key) {
            byId.set(key, item);
          }
        }
        return byId.size > 0 ? Array.from(byId.values()) : allItems;
      }
      return [];
    } catch (error) {
      console.error("Error fetching items from API:", error);
      return [];
    }
  });
};

// Salespersons Storage
const SALESPERSONS_STORAGE_KEY = "taban_books_salespersons";

export const getSalespersons = async (): Promise<Salesperson[]> => {
  return getSalespersonsFromAPI();
};

export const getSalespersonById = async (salespersonId: string): Promise<Salesperson | null> => {
  try {
    const response = await salespersonsAPI.getById(salespersonId);
    if (response && response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error("Error getting salesperson by ID from API:", error);
    return null;
  }
};

export const saveSalesperson = async (salespersonData: Partial<Salesperson>): Promise<Salesperson> => {
  try {
    const response = await salespersonsAPI.create(salespersonData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to create salesperson");
  } catch (error) {
    console.error("Error saving salesperson to API:", error);
    throw error;
  }
};

export const updateSalesperson = async (salespersonId: string, salespersonData: Partial<Salesperson>): Promise<Salesperson | undefined> => {
  try {
    const response = await salespersonsAPI.update(salespersonId, salespersonData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to update salesperson");
  } catch (error) {
    console.error("Error updating salesperson via API:", error);
    throw error;
  }
};

export const deleteSalesperson = async (salespersonId: string): Promise<void> => {
  try {
    await salespersonsAPI.delete(salespersonId);
  } catch (error) {
    console.error("Error deleting salesperson from API:", error);
    throw error;
  }
};

// Settings
export const getBaseCurrency = async (): Promise<string> => {
  try {
    const response = await settingsAPI.getOrganizationProfile();
    if (response && response.success && response.data) {
      return response.data.baseCurrency || 'USD';
    }
    return 'USD';
  } catch (error) {
    console.error('Error fetching base currency:', error);
    return 'USD';
  }
};

export const getPlansFromAPI = async (): Promise<any[]> => {
  return cachedFetch("plans:all", async () => {
    try {
      const response = await plansAPI.getAll();
      if (response && response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching plans from API:", error);
      return [];
    }
  });
};

export interface ReportingTag {
  id: string;
  _id?: string;
  name: string;
  status?: string;
}

export const getReportingTagsFromAPI = async (): Promise<ReportingTag[]> => {
  return cachedFetch("reportingTags:all", async () => {
    try {
      const response = await reportingTagsAPI.getAll();
      if (response && response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching reporting tags from API:", error);
      return [];
    }
  });
};

type QueryKey = readonly unknown[] | unknown;
type QueryStatus = "pending" | "success" | "error";

type QueryRecord<T = any> = {
  key: readonly unknown[];
  data?: T;
  error?: unknown;
  status: QueryStatus;
  isFetching: boolean;
  updatedAt: number;
  queryFn?: () => Promise<T>;
  listeners: Set<() => void>;
  promise?: Promise<T>;
};

const queryCache = new Map<string, QueryRecord<any>>();

const stableStringify = (value: any): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
};

const normalizeQueryKey = (key: QueryKey): readonly unknown[] => (Array.isArray(key) ? key : [key]);

const queryKeyToCacheId = (key: QueryKey): string => stableStringify(normalizeQueryKey(key));

const isPrefixMatch = (candidate: readonly unknown[], partial?: QueryKey): boolean => {
  if (!partial) return true;
  const normalizedPartial = normalizeQueryKey(partial);
  if (normalizedPartial.length > candidate.length) return false;
  return normalizedPartial.every((part, index) => stableStringify(candidate[index]) === stableStringify(part));
};

const getOrCreateQueryRecord = (key: QueryKey): QueryRecord<any> => {
  const cacheId = queryKeyToCacheId(key);
  const existing = queryCache.get(cacheId);
  if (existing) return existing;

  const record: QueryRecord<any> = {
    key: normalizeQueryKey(key),
    status: "pending",
    isFetching: false,
    updatedAt: 0,
    listeners: new Set(),
  };
  queryCache.set(cacheId, record);
  return record;
};

const notifyQueryRecord = (record: QueryRecord<any>) => {
  record.listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Error notifying query listener:", error);
    }
  });
};

const snapshotFromQueryRecord = (record: QueryRecord<any>) => {
  const hasData = record.data !== undefined;
  const isSuccess = record.status === "success" && hasData;
  const isError = record.status === "error";
  const isPending = record.status === "pending" && !hasData;

  return {
    data: record.data,
    error: record.error,
    status: record.status,
    isPending,
    isFetching: record.isFetching,
    isLoading: record.isFetching,
    isError,
    isSuccess,
  };
};

const fetchQueryRecord = async <T,>(
  record: QueryRecord<T>,
  queryFn: () => Promise<T>,
  options?: { force?: boolean; staleTime?: number }
): Promise<T> => {
  const staleTime = Number(options?.staleTime ?? 0);
  const isFresh = record.data !== undefined && staleTime > 0 && Date.now() - record.updatedAt < staleTime;
  if (!options?.force && isFresh) {
    return Promise.resolve(record.data as T);
  }

  if (record.promise) {
    return record.promise;
  }

  record.queryFn = queryFn;
  record.error = undefined;
  record.status = record.data === undefined ? "pending" : "success";
  record.isFetching = true;
  notifyQueryRecord(record);

  const promise = Promise.resolve()
    .then(() => queryFn())
    .then((data) => {
      record.data = data;
      record.error = undefined;
      record.status = "success";
      record.isFetching = false;
      record.updatedAt = Date.now();
      record.promise = undefined;
      notifyQueryRecord(record);
      return data;
    })
    .catch((error) => {
      record.error = error;
      record.status = "error";
      record.isFetching = false;
      record.promise = undefined;
      notifyQueryRecord(record);
      throw error;
    });

  record.promise = promise;
  return promise;
};

export const keepPreviousData = Symbol("keepPreviousData");

export type QueryClient = {
  getQueriesData<T = any>(filters?: { queryKey?: QueryKey }): Array<[readonly unknown[], T | undefined]>;
  getQueryData<T = any>(queryKey: QueryKey): T | undefined;
  setQueryData<T = any>(
    queryKey: QueryKey,
    updater: T | ((previousData: T | undefined) => T | undefined)
  ): T | undefined;
  removeQueries(filters?: { queryKey?: QueryKey }): void;
  invalidateQueries(filters?: { queryKey?: QueryKey }): Promise<void>;
  prefetchQuery<T = any>(options: { queryKey: QueryKey; queryFn: () => Promise<T>; staleTime?: number }): Promise<T>;
  fetchQuery<T = any>(options: { queryKey: QueryKey; queryFn: () => Promise<T>; staleTime?: number }): Promise<T>;
};

const queryClient: QueryClient = {
  getQueriesData<T = any>(filters?: { queryKey?: QueryKey }) {
    return Array.from(queryCache.values())
      .filter((record) => isPrefixMatch(record.key, filters?.queryKey))
      .map((record) => [record.key, record.data as T | undefined]);
  },
  getQueryData<T = any>(queryKey: QueryKey) {
    const record = queryCache.get(queryKeyToCacheId(queryKey));
    return record?.data as T | undefined;
  },
  setQueryData<T = any>(queryKey: QueryKey, updater: T | ((previousData: T | undefined) => T | undefined)) {
    const record = getOrCreateQueryRecord(queryKey) as QueryRecord<T>;
    const previousData = record.data as T | undefined;
    const nextValue =
      typeof updater === "function"
        ? (updater as (previousData: T | undefined) => T | undefined)(previousData)
        : updater;

    if (previousData === nextValue || stableStringify(previousData) === stableStringify(nextValue)) {
      return previousData as T | undefined;
    }

    record.data = nextValue;
    record.error = undefined;
    record.status = "success";
    record.isFetching = false;
    record.updatedAt = Date.now();
    notifyQueryRecord(record);
    return nextValue;
  },
  removeQueries(filters?: { queryKey?: QueryKey }) {
    Array.from(queryCache.entries()).forEach(([cacheId, record]) => {
      if (isPrefixMatch(record.key, filters?.queryKey)) {
        queryCache.delete(cacheId);
      }
    });
  },
  async invalidateQueries(filters?: { queryKey?: QueryKey }) {
    const matches = Array.from(queryCache.values()).filter((record) => isPrefixMatch(record.key, filters?.queryKey));
    await Promise.all(
      matches.map((record) => {
        if (!record.queryFn) return Promise.resolve();
        return fetchQueryRecord(record, record.queryFn, { force: true });
      })
    );
  },
  prefetchQuery<T = any>(options: { queryKey: QueryKey; queryFn: () => Promise<T>; staleTime?: number }) {
    const record = getOrCreateQueryRecord(options.queryKey) as QueryRecord<T>;
    return fetchQueryRecord(record, options.queryFn, { staleTime: options.staleTime });
  },
  fetchQuery<T = any>(options: { queryKey: QueryKey; queryFn: () => Promise<T>; staleTime?: number }) {
    const record = getOrCreateQueryRecord(options.queryKey) as QueryRecord<T>;
    return fetchQueryRecord(record, options.queryFn, { force: true, staleTime: options.staleTime });
  },
};

export const useQueryClient = (): QueryClient => queryClient;

type UseQueryOptions<TData = any> = {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  enabled?: boolean;
  staleTime?: number;
  placeholderData?: unknown;
  initialData?: TData;
};

type UseQueryResult<TData = any> = {
  data?: TData;
  error?: unknown;
  status: QueryStatus;
  isPending: boolean;
  isFetching: boolean;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<{ data?: TData; error?: unknown }>;
};

type UseMutationOptions<TData = any, TVariables = void> = {
  mutationKey?: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  onError?: (error: unknown, variables: TVariables) => void | Promise<void>;
};

type UseMutationResult<TData = any, TVariables = void> = {
  data?: TData;
  error?: unknown;
  status: QueryStatus;
  isPending: boolean;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
};

const readQuerySnapshot = <TData,>(record: QueryRecord<TData>, fallbackData?: TData): UseQueryResult<TData> => {
  const snapshot = snapshotFromQueryRecord(record);
  const data = record.data !== undefined ? record.data : fallbackData;

  return {
    data,
    error: snapshot.error,
    status: snapshot.status,
    isPending: snapshot.isPending && data === undefined,
    isFetching: snapshot.isFetching,
    isLoading: snapshot.isFetching,
    isError: snapshot.isError,
    isSuccess: snapshot.isSuccess,
    refetch: async () => {
      if (!record.queryFn) {
        return { data: record.data, error: record.error };
      }
      const nextData = await fetchQueryRecord(record, record.queryFn, { force: true });
      return { data: nextData, error: undefined };
    },
  };
};

export const useQuery = <TData = any>(options: UseQueryOptions<TData>): UseQueryResult<TData> => {
  const queryFnRef = useRef(options.queryFn);
  queryFnRef.current = options.queryFn;
  const placeholderDataRef = useRef(options.placeholderData);
  placeholderDataRef.current = options.placeholderData;
  const initialDataRef = useRef(options.initialData);
  initialDataRef.current = options.initialData;
  const cacheId = queryKeyToCacheId(options.queryKey);
  const record = getOrCreateQueryRecord(options.queryKey) as QueryRecord<TData>;

  if (options.initialData !== undefined && record.data === undefined) {
    record.data = options.initialData;
    record.status = "success";
    record.updatedAt = Date.now();
  }

  const [snapshot, setSnapshot] = useState<UseQueryResult<TData>>(() => readQuerySnapshot(record, options.initialData));
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    let active = true;
    const syncSnapshot = () => {
      if (!active) return;
      const nextSnapshot = readQuerySnapshot(
        record,
        placeholderDataRef.current === keepPreviousData ? snapshotRef.current.data : initialDataRef.current
      );
      const currentSnapshot = snapshotRef.current;
      if (
        currentSnapshot.data === nextSnapshot.data &&
        currentSnapshot.error === nextSnapshot.error &&
        currentSnapshot.status === nextSnapshot.status &&
        currentSnapshot.isPending === nextSnapshot.isPending &&
        currentSnapshot.isFetching === nextSnapshot.isFetching &&
        currentSnapshot.isLoading === nextSnapshot.isLoading &&
        currentSnapshot.isError === nextSnapshot.isError &&
        currentSnapshot.isSuccess === nextSnapshot.isSuccess
      ) {
        return;
      }
      setSnapshot(nextSnapshot);
    };

    record.queryFn = () => queryFnRef.current();
    record.listeners.add(syncSnapshot);
    syncSnapshot();

    if (options.enabled !== false) {
      void fetchQueryRecord(record, () => queryFnRef.current(), { staleTime: options.staleTime });
    }

    return () => {
      active = false;
      record.listeners.delete(syncSnapshot);
    };
  }, [cacheId, options.enabled, options.staleTime, record]);

  return snapshot;
};

export const useMutation = <TData = any, TVariables = void>(
  options: UseMutationOptions<TData, TVariables>
): UseMutationResult<TData, TVariables> => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);
  const [status, setStatus] = useState<QueryStatus>("pending");

  const mutateAsync = async (variables: TVariables): Promise<TData> => {
    setStatus("pending");
    setError(undefined);

    try {
      const result = await optionsRef.current.mutationFn(variables);
      setData(result);
      setStatus("success");
      await optionsRef.current.onSuccess?.(result, variables);
      return result;
    } catch (mutationError) {
      setError(mutationError);
      setStatus("error");
      await optionsRef.current.onError?.(mutationError, variables);
      throw mutationError;
    }
  };

  const mutate = (variables: TVariables) => {
    void mutateAsync(variables);
  };

  const reset = () => {
    setData(undefined);
    setError(undefined);
    setStatus("pending");
  };

  return {
    data,
    error,
    status,
    isPending: status === "pending",
    isLoading: status === "pending",
    isError: status === "error",
    isSuccess: status === "success",
    mutate,
    mutateAsync,
    reset,
  };
};
