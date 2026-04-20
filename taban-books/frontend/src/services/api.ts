/**
 * API Service Layer for Taban Books
 * 
 * This file provides a centralized API interface for all backend communication.
 * All API calls go through this service layer.
 */
import { logFrontendRequest, logFrontendRequestReuse } from "./requestInstrumentation";

// Use environment variable if available, otherwise use relative URL for same-origin requests
interface ApiError extends Error {
  status?: number;
  data?: any;
}

export interface ApiRequestMeta {
  source?: string;
  cacheTtlMs?: number;
  dedupeKey?: string;
  skipCache?: boolean;
  allowNotModified?: boolean;
}

export interface ApiRequestOptions {
  headers?: Record<string, any>;
  method?: string;
  body?: any;
  meta?: ApiRequestMeta;
  [key: string]: any;
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL
  ? `${(import.meta as any).env.VITE_API_BASE_URL}/api`
  : '/api';
const API_DEBUG_ENABLED = (import.meta as any).env?.VITE_API_DEBUG === 'true';
const inflightGetRequests = new Map<string, Promise<any>>();
const cachedGetResponses = new Map<string, { expiresAt: number; data: any }>();

const PURCHASE_ENDPOINT_PATTERNS = [
  '/bills',
  '/purchase-orders',
  '/vendor-credits',
  '/payments-made',
  '/expenses',
  '/receipts',
  '/recurring-bills',
  '/recurring-expenses',
  '/vendors',
];

const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;

const normalizeCurrencyCode = (value?: string | null): string => {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  const firstToken = trimmed.split(' - ')[0]?.trim() || trimmed;
  const compactToken = firstToken.split(' ')[0]?.trim() || firstToken;
  return compactToken.toUpperCase();
};

const getBaseCurrencyCode = (): string => {
  try {
    const fromCache = normalizeCurrencyCode(localStorage.getItem('base_currency_code'));
    if (CURRENCY_CODE_REGEX.test(fromCache)) return fromCache;

    const orgRaw = localStorage.getItem('organization');
    if (orgRaw) {
      const org = JSON.parse(orgRaw);
      const fromOrg = normalizeCurrencyCode(org?.baseCurrency || org?.currency);
      if (CURRENCY_CODE_REGEX.test(fromOrg)) return fromOrg;
    }
  } catch (error) {
    console.warn('Could not resolve base currency from localStorage', error);
  }
  return 'USD';
};

const isPurchaseEndpoint = (endpoint: string): boolean => {
  return PURCHASE_ENDPOINT_PATTERNS.some((pattern) => endpoint.startsWith(pattern));
};

const withBaseCurrencyInPayload = (endpoint: string, body: any): any => {
  if (!isPurchaseEndpoint(endpoint) || !body || typeof body !== 'object' || body instanceof FormData) {
    return body;
  }
  const baseCurrency = getBaseCurrencyCode();
  if (!baseCurrency) return body;

  const forceBaseCurrency = (value: any): any => {
    if (Array.isArray(value)) return value.map(forceBaseCurrency);
    if (!value || typeof value !== 'object') return value;

    const nextValue: any = { ...value };
    Object.keys(nextValue).forEach((key) => {
      nextValue[key] = forceBaseCurrency(nextValue[key]);
    });

    if (Object.prototype.hasOwnProperty.call(nextValue, 'currency')) {
      nextValue.currency = baseCurrency;
    }
    if (Object.prototype.hasOwnProperty.call(nextValue, 'currency_code')) {
      nextValue.currency_code = baseCurrency;
    }

    return nextValue;
  };

  const nextBody: any = forceBaseCurrency(body);
  nextBody.currency = baseCurrency;
  nextBody.currency_code = baseCurrency;
  return nextBody;
};

const hasMonetaryShape = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  return [
    'total',
    'amount',
    'balance',
    'balanceDue',
    'subtotal',
    'subTotal',
    'paidAmount',
    'unitPrice',
    'rate',
  ].some((key) => obj[key] !== undefined);
};

const applyBaseCurrencyToPurchaseResponse = (endpoint: string, data: any): any => {
  if (!isPurchaseEndpoint(endpoint) || !data) return data;
  const baseCurrency = getBaseCurrencyCode();
  if (!baseCurrency) return data;

  const walk = (value: any): any => {
    if (Array.isArray(value)) return value.map(walk);
    if (!value || typeof value !== 'object') return value;

    const cloned: any = { ...value };
    Object.keys(cloned).forEach((key) => {
      cloned[key] = walk(cloned[key]);
    });

    const hasCurrencyFields = Object.prototype.hasOwnProperty.call(cloned, 'currency')
      || Object.prototype.hasOwnProperty.call(cloned, 'currency_code');

    if (hasMonetaryShape(cloned) || hasCurrencyFields) {
      cloned.currency = baseCurrency;
      cloned.currency_code = baseCurrency;
    }
    return cloned;
  };

  return walk(data);
};

// ============================================================================
// AUTH API
// ============================================================================

export const authAPI = {
  getMe: () => apiRequest('/auth/me'),
};

const buildGetRequestKey = (url: string, authorizationHeader?: string, dedupeKey?: string): string => {
  if (dedupeKey) {
    return dedupeKey;
  }

  return JSON.stringify({
    url,
    auth: authorizationHeader || "",
  });
};

/**
 * Generic API request wrapper
 * Handles errors and JSON parsing
 */
export async function apiRequest(endpoint: string, options: ApiRequestOptions = {}): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { meta, ...requestOptions } = options;

  // Get auth token from localStorage
  const token = localStorage.getItem('auth_token');
  const isLocalAuthMode = localStorage.getItem('taban_auth_mode') === 'local';

  const config: any = {
    ...requestOptions,
    headers: {
      ...(!isLocalAuthMode && token && { 'Authorization': `Bearer ${token}` }),
      ...(requestOptions.headers || {}),
    },
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = withBaseCurrencyInPayload(endpoint, config.body);
  }

  // Don't stringify FormData
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
    // ensure JSON content-type when body is JSON
    config.headers = { 'Content-Type': 'application/json', ...(config.headers || {}) };
  }

  const requestMethod = String(config.method || 'GET').toUpperCase();
  const isGetRequest = requestMethod === 'GET';
  const requestKey = isGetRequest
    ? buildGetRequestKey(url, config.headers?.Authorization, meta?.dedupeKey)
    : null;

  if (isGetRequest && requestKey && !meta?.skipCache) {
    const cached = cachedGetResponses.get(requestKey);
    if (cached && cached.expiresAt > Date.now()) {
      logFrontendRequestReuse(requestMethod, endpoint, meta?.source, "cache");
      return cached.data;
    }

    cachedGetResponses.delete(requestKey);

    const inflight = inflightGetRequests.get(requestKey);
    if (inflight) {
      logFrontendRequestReuse(requestMethod, endpoint, meta?.source, "inflight");
      return inflight;
    }
  }

  const executeRequest = async () => {
    if (API_DEBUG_ENABLED) {
      console.debug('[API Request] ', requestMethod, url, config);
    }

    logFrontendRequest(requestMethod, endpoint, meta?.source);
    const response = await fetch(url, config);

    if (response.status === 304 && meta?.allowNotModified) {
      return {
        success: true,
        notModified: true,
        status: 304,
      };
    }

    // Handle empty responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }

    // Check if response has content before parsing JSON
    const contentType = response.headers.get('content-type');
    const isJsonResponse = Boolean(
      contentType && (contentType.includes('application/json') || contentType.includes('+json')),
    );

    if (!isJsonResponse) {
      // If not JSON, return text or null
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || `API request failed: ${response.statusText}`);
      }
      return text || null;
    }

    // Try to parse JSON
    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText} (Invalid JSON response)`);
      }
      return null;
    }

    if (!response.ok) {
      if (data) {
        console.error('[API Response Error] URL:', url, 'Status:', response.status, 'Data:', data);
      } else {
        try {
          // If we haven't parsed JSON successfully, try to get text
          const respText = await response.text();
          console.error('[API Response Error] URL:', url, 'Status:', response.status, 'Response Text:', respText);
        } catch (e) {
          console.error('[API Response Error] URL:', url, 'Status:', response.status, 'Unable to read response text');
        }
      }
      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        if (!isLocalAuthMode) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          localStorage.removeItem('organization');
          localStorage.removeItem('account_verified');
          // Redirect to login page only if not already on an auth page
          const authPaths = ['/login', '/signup', '/onboarding', '/loading', '/verify-identity'];
          if (!authPaths.includes(window.location.pathname)) {
            window.location.href = '/login';
          }
        }
      }

      // Handle unverified accounts globally - force verify flow before entering app.
      if (
        response.status === 403 &&
        data?.code === 'ACCOUNT_NOT_VERIFIED' &&
        !isLocalAuthMode
      ) {
        localStorage.removeItem('account_verified');
        try {
          const rawOrg = localStorage.getItem('organization');
          if (rawOrg) {
            const org = JSON.parse(rawOrg);
            localStorage.setItem('organization', JSON.stringify({ ...org, isVerified: false }));
          }
        } catch {
          // Ignore storage parse issues and continue redirect.
        }

        const verifyAllowedPaths = ['/login', '/signup', '/onboarding', '/verify-identity'];
        if (!verifyAllowedPaths.includes(window.location.pathname)) {
          window.location.href = '/verify-identity';
        }
      }

      const errorMessage = data?.message || data?.error || `API request failed: ${response.statusText}`;
      const error = new Error(errorMessage) as ApiError;
      error.status = response.status;
      error.data = data;

      // Log detailed validation errors if present
      if (data?.errors) {
        console.error('Validation Errors:', data.errors);
      }

      throw error;
    }

    return applyBaseCurrencyToPurchaseResponse(endpoint, data);
  };

  const requestPromise = (async () => {
    try {
      return await executeRequest();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  })();

  if (isGetRequest && requestKey && !meta?.skipCache) {
    inflightGetRequests.set(requestKey, requestPromise);
  }

  try {
    const data = await requestPromise;

    if (isGetRequest && requestKey && !meta?.skipCache && (meta?.cacheTtlMs || 0) > 0) {
      cachedGetResponses.set(requestKey, {
        data,
        expiresAt: Date.now() + Number(meta?.cacheTtlMs || 0),
      });
    }

    return data;
  } finally {
    if (isGetRequest && requestKey) {
      inflightGetRequests.delete(requestKey);
    }
  }
}

// ============================================================================
// ITEMS API
// ============================================================================

export const itemsAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/items${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/items/${id}`),
  create: (data: any) => apiRequest('/items', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/items/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/items/${id}`, { method: 'DELETE' }),
  search: (query: string) => apiRequest(`/items/search?q=${encodeURIComponent(query)}`),
};

export const productsAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/products${queryString ? `?${queryString}` : ''}`);
  },
  list: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/products${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/products/${id}`),
  create: (data: any) => apiRequest('/products', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/products/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/products/${id}`, { method: 'DELETE' }),
};

export const plansAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/plans${queryString ? `?${queryString}` : ''}`);
  },
  list: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/plans${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/plans/${id}`),
  create: (data: any) => apiRequest('/plans', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/plans/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/plans/${id}`, { method: 'DELETE' }),
};

export const priceListsAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/price-lists${queryString ? `?${queryString}` : ''}`);
  },
  list: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/price-lists${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/price-lists/${id}`),
  create: (data: any) => apiRequest('/price-lists', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/price-lists/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/price-lists/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// CUSTOMERS API
// ============================================================================

export const customersAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/customers${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/customers/${id}`),
  create: (data: any) => apiRequest('/customers', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/customers/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/customers/${id}`, { method: 'DELETE' }),
  sendInvitation: (id: any, data: any) => apiRequest(`/customers/${id}/invite`, { method: 'POST', body: data }),
  sendReviewRequest: (id: any, data: any) => apiRequest(`/customers/${id}/send-review-request`, { method: 'POST', body: data }),
  bulkDelete: (customerIds: any) => apiRequest('/customers/bulk-delete', { method: 'POST', body: { customerIds } }),
  bulkUpdate: (customerIds: any, updateData: any) => apiRequest('/customers/bulk-update', { method: 'POST', body: { customerIds, updateData } }),
  merge: (masterCustomerId: any, sourceCustomerIds: any[]) => apiRequest('/customers/merge', { method: 'POST', body: { masterCustomerId, sourceCustomerIds } }),
  sendStatement: (id: string, data: any) => apiRequest(`/customers/${id}/send-statement`, { method: 'POST', body: data }),
  search: (query: string) => apiRequest(`/customers/search?q=${encodeURIComponent(query)}`),
  getNextCustomerNumber: (data: any) => apiRequest('/customers/next-number', { method: 'POST', body: data }),
};

// ============================================================================
// SALES INVOICES API
// ============================================================================

export const invoicesAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/sales-invoices${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/sales-invoices/${id}`),
  create: (data: any) => apiRequest('/sales-invoices', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/sales-invoices/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/sales-invoices/${id}`, { method: 'DELETE' }),
  getNextNumber: (prefix: string) => apiRequest(`/sales-invoices/next-number?prefix=${encodeURIComponent(prefix || 'INV-')}`),
  getByCustomer: (customerId: any) => apiRequest(`/sales-invoices?customerId=${customerId}`),
  getByStatus: (status: string) => apiRequest(`/sales-invoices?status=${status}`),
  sendEmail: (id: any, data: any) => apiRequest(`/sales-invoices/${id}/email`, { method: 'POST', body: data }),
  sendReminder: (id: any, data: any) => apiRequest(`/sales-invoices/${id}/reminders/send`, { method: 'POST', body: data }),
  setRemindersStopped: (id: any, stopped: boolean) => apiRequest(`/sales-invoices/${id}/reminders`, { method: 'PATCH', body: { stopped } }),
};

// ============================================================================
// QUOTES API
// ============================================================================

export const quotesAPI = {
  getAll: (params: any = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.customerId) queryParams.append('customerId', params.customerId);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    const queryString = queryParams.toString();
    return apiRequest(`/quotes${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/quotes/${id}`),
  create: (data: any) => apiRequest('/quotes', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/quotes/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/quotes/${id}`, { method: 'DELETE' }),
  bulkDelete: (quoteIds: any) => apiRequest('/quotes/bulk-delete', { method: 'POST', body: { quoteIds } }),
  bulkUpdate: (quoteIds: any, updateData: any) => apiRequest('/quotes/bulk-update', { method: 'POST', body: { quoteIds, updateData } }),
  bulkMarkAsSent: (quoteIds: any) => apiRequest('/quotes/bulk-mark-as-sent', { method: 'POST', body: { quoteIds } }),
  convertToInvoice: (id: any) => apiRequest(`/quotes/${id}/convert-to-invoice`, { method: 'POST' }),
  getNextNumber: (prefix: string) => apiRequest(`/quotes/next-number?prefix=${encodeURIComponent(prefix || 'QT-')}`),
  sendEmail: (id: any, data: any) => apiRequest(`/quotes/${id}/email`, { method: 'POST', body: data }),
};

// ============================================================================
// ESTIMATES API
// ============================================================================

export const estimatesAPI = {
  getAll: (params: any = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.estimate_number) queryParams.append('estimate_number', params.estimate_number);
    if (params.reference_number) queryParams.append('reference_number', params.reference_number);
    if (params.customer_name) queryParams.append('customer_name', params.customer_name);
    if (params.customer_id) queryParams.append('customer_id', params.customer_id);
    if (params.date) queryParams.append('date', params.date);
    if (params.date_start) queryParams.append('date_start', params.date_start);
    if (params.date_end) queryParams.append('date_end', params.date_end);
    if (params.date_before) queryParams.append('date_before', params.date_before);
    if (params.date_after) queryParams.append('date_after', params.date_after);
    if (params.expiry_date) queryParams.append('expiry_date', params.expiry_date);
    if (params.status) queryParams.append('status', params.status);
    if (params.filter_by) queryParams.append('filter_by', params.filter_by);
    if (params.search_text) queryParams.append('search_text', params.search_text);
    if (params.sort_column) queryParams.append('sort_column', params.sort_column);
    const queryString = queryParams.toString();
    return apiRequest(`/estimates${queryString ? `?${queryString}` : ''}`);
  },
  getById: (estimateId: any) => apiRequest(`/estimates/${estimateId}`),
  create: (data: any, params: { send?: boolean; ignore_auto_number_generation?: boolean } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.send !== undefined) queryParams.append('send', String(params.send));
    if (params.ignore_auto_number_generation !== undefined) {
      queryParams.append('ignore_auto_number_generation', String(params.ignore_auto_number_generation));
    }
    const queryString = queryParams.toString();
    return apiRequest(`/estimates${queryString ? `?${queryString}` : ''}`, { method: 'POST', body: data });
  },
};

// ============================================================================
// APPROVAL RULES API
// ============================================================================

export const approvalRulesAPI = {
  getAll: () => apiRequest('/settings/approval-rules'),
  getById: (id: any) => apiRequest(`/settings/approval-rules/${id}`),
  create: (data: any) => apiRequest('/settings/approval-rules', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/settings/approval-rules/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/settings/approval-rules/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// RECURRING INVOICES API
// ============================================================================

export const recurringInvoicesAPI = {
  getAll: () => apiRequest('/recurring-invoices'),
  getById: (id: any) => apiRequest(`/recurring-invoices/${id}`),
  create: (data: any) => apiRequest('/recurring-invoices', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/recurring-invoices/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/recurring-invoices/${id}`, { method: 'DELETE' }),
  generateInvoice: (id: any) => apiRequest(`/recurring-invoices/${id}/generate-invoice`, { method: 'POST' }),
};

// ============================================================================
// SUBSCRIPTIONS API
// ============================================================================

export const subscriptionsAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/subscriptions${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/subscriptions/${id}`),
  create: (data: any) => apiRequest('/subscriptions', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/subscriptions/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/subscriptions/${id}`, { method: 'DELETE' }),
  getByCustomer: (customerId: any) => apiRequest(`/subscriptions?customerId=${customerId}`),
};

// ============================================================================
// RETAINER INVOICES API
// ============================================================================

export const retainerInvoicesAPI = {
  getAll: () => apiRequest('/retainer-invoices'),
  getById: (id: any) => apiRequest(`/retainer-invoices/${id}`),
  create: (data: any) => apiRequest('/retainer-invoices', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/retainer-invoices/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/retainer-invoices/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// DEBIT NOTES API
// ============================================================================

export const debitNotesAPI = {
  getAll: () => apiRequest('/debit-notes'),
  getById: (id: any) => apiRequest(`/debit-notes/${id}`),
  create: (data: any) => apiRequest('/debit-notes', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/debit-notes/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/debit-notes/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// SALES RECEIPTS API
// ============================================================================

export const salesReceiptsAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/sales-receipts${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/sales-receipts/${id}`),
  create: (data: any) => apiRequest('/sales-receipts', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/sales-receipts/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/sales-receipts/${id}`, { method: 'DELETE' }),
  getNextNumber: () => apiRequest('/sales-receipts/next-number'),
  sendEmail: (id: any, data: any) => apiRequest(`/sales-receipts/${id}/email`, { method: 'POST', body: data }),
};

// ============================================================================
// VENDORS API
// ============================================================================

export const vendorsAPI = {
  getAll: (params: any = {}) => {
    // Always request all vendors (no pagination limit) unless explicitly specified
    const queryParams = { ...params };
    if (!queryParams.limit) {
      queryParams.limit = 1000; // Request up to 1000 vendors to get all
    }
    const queryString = Object.keys(queryParams).length > 0
      ? '?' + new URLSearchParams(queryParams).toString()
      : '';
    return apiRequest(`/vendors${queryString}`);
  },
  getById: (id: any) => {
    return apiRequest(`/vendors/${id}`);
  },
  create: (data: any) => apiRequest('/vendors', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/vendors/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/vendors/${id}`, { method: 'DELETE' }),
  bulkDelete: (vendorIds: any) => apiRequest('/vendors/bulk-delete', { method: 'POST', body: { ids: vendorIds, vendorIds } }),
  bulkUpdate: (vendorIds: any, updateData: any) => apiRequest('/vendors/bulk-update', { method: 'POST', body: { ids: vendorIds, vendorIds, updates: updateData, updateData } }),
  merge: (masterVendorId: any, sourceVendorIds: any[]) => apiRequest('/vendors/merge', { method: 'POST', body: { masterVendorId, sourceVendorIds } }),
  sendStatement: (id: string, data: any) => apiRequest(`/vendors/${id}/send-statement`, { method: 'POST', body: data }),
  search: (query: string) => apiRequest(`/vendors/search?q=${encodeURIComponent(query)}`),
  getNextVendorNumber: (data: any) => apiRequest('/vendors/next-number', { method: 'POST', body: data }),
};

// ============================================================================
// PURCHASE BILLS API
// ============================================================================

export const billsAPI = {
  getAll: (params: any = {}, options: ApiRequestOptions = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/bills${queryString ? `?${queryString}` : ''}`, options);
  },
  getById: (id: any) => apiRequest(`/bills/${id}`),
  create: (data: any) => apiRequest('/bills', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/bills/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/bills/${id}`, { method: 'DELETE' }),
  getByVendor: (vendorId: any) => apiRequest(`/bills?vendorId=${vendorId}`),
  getByStatus: (status: string) => apiRequest(`/bills?status=${status}`),
};

// ============================================================================
// PURCHASE ORDERS API
// ============================================================================

export const purchaseOrdersAPI = {
  getAll: () => apiRequest('/purchase-orders'),
  getById: (id: any) => apiRequest(`/purchase-orders/${id}`),
  create: (data: any) => apiRequest('/purchase-orders', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/purchase-orders/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/purchase-orders/${id}`, { method: 'DELETE' }),
  getByStatus: (status: string) => apiRequest(`/purchase-orders?status=${status}`),
  getNextNumber: () => apiRequest('/purchase-orders/next-number'),
  sendEmail: (id: any, data: any) => apiRequest(`/purchase-orders/${id}/email`, { method: 'POST', body: data }),
};

// ============================================================================
// EXPENSES API
// ============================================================================

export const expensesAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/expenses${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/expenses/${id}`),
  create: (data: any) => apiRequest('/expenses', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/expenses/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/expenses/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// RECURRING EXPENSES API
// ============================================================================

export const recurringExpensesAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/recurring-expenses${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/recurring-expenses/${id}`),
  create: (data: any) => apiRequest('/recurring-expenses', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/recurring-expenses/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/recurring-expenses/${id}`, { method: 'DELETE' }),
  updateStatus: (id: any, status: string) => apiRequest(`/recurring-expenses/${id}/status`, { method: 'POST', body: { status } }),
  generateExpense: (id: any) => apiRequest(`/recurring-expenses/${id}/generate-expense`, { method: 'POST' }),
};

// ============================================================================
// RECEIPTS API
// ============================================================================

export const receiptsAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/receipts${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/receipts/${id}`),
  create: (data: any) => apiRequest('/receipts', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/receipts/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/receipts/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids: any) => apiRequest('/receipts/bulk-delete', { method: 'POST', body: { ids } }),
};

// ============================================================================
// RECURRING BILLS API
// ============================================================================

export const recurringBillsAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/recurring-bills${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/recurring-bills/${id}`),
  create: (data: any) => apiRequest('/recurring-bills', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/recurring-bills/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/recurring-bills/${id}`, { method: 'DELETE' }),
  updateStatus: (id: any, status: string) => apiRequest(`/recurring-bills/${id}/status`, { method: 'POST', body: { status } }),
  generateBill: (id: any) => apiRequest(`/recurring-bills/${id}/generate-bill`, { method: 'POST' }),
};

// ============================================================================
// PAYMENT TERMS API
// ============================================================================

export const paymentTermsAPI = {
  getAll: () => apiRequest('/payment-terms'),
  create: (data: any) => apiRequest('/payment-terms', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/payment-terms/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/payment-terms/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// PROJECTS API
// ============================================================================

export const projectsAPI = {
  getAll: () => apiRequest('/projects'),
  getById: (id: any) => apiRequest(`/projects/${id}`),
  create: (data: any) => apiRequest('/projects', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/projects/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/projects/${id}`, { method: 'DELETE' }),
  getByCustomer: (customerId: any) => apiRequest(`/projects?customerId=${customerId}`),
};

// ============================================================================
// TIME ENTRIES API
// ============================================================================

export const timeEntriesAPI = {
  getAll: () => apiRequest('/time-entries'),
  getById: (id: any) => apiRequest(`/time-entries/${id}`),
  create: (data: any) => apiRequest('/time-entries', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/time-entries/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/time-entries/${id}`, { method: 'DELETE' }),
  getByProject: (projectId: any) => apiRequest(`/time-entries?projectId=${projectId}`),
  getByDateRange: (startDate: string, endDate: string) =>
    apiRequest(`/time-entries?startDate=${startDate}&endDate=${endDate}`),
};

// ============================================================================
// BANK ACCOUNTS API
// ============================================================================

export const bankAccountsAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/bankaccounts${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/bankaccounts/${id}`),
  create: (data: any) => apiRequest('/bankaccounts', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/bankaccounts/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/bankaccounts/${id}`, { method: 'DELETE' }),
  markInactive: (id: any) => apiRequest(`/bankaccounts/${id}/inactive`, { method: 'POST' }),
  markActive: (id: any) => apiRequest(`/bankaccounts/${id}/active`, { method: 'POST' }),
  getLastImportedStatement: (id: any) => apiRequest(`/bankaccounts/${id}/statement/lastimported`),
  deleteImportedStatement: (accountId: any, statementId: any) =>
    apiRequest(`/bankaccounts/${accountId}/statement/${statementId}`, { method: 'DELETE' }),
};

export const bankTransactionsAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/banktransactions${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/banktransactions/${id}`),
  create: (data: any) => apiRequest('/banktransactions', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/banktransactions/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/banktransactions/${id}`, { method: 'DELETE' }),
  getMatches: (id: any, params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/banktransactions/uncategorized/${id}/match${queryString ? `?${queryString}` : ''}`);
  },
  match: (id: any, transactionsToBeMatched: any[]) =>
    apiRequest(`/banktransactions/uncategorized/${id}/match`, {
      method: 'POST',
      body: { transactions_to_be_matched: transactionsToBeMatched },
    }),
  unmatch: (id: any) => apiRequest(`/banktransactions/${id}/unmatch`, { method: 'POST' }),
  exclude: (id: any) => apiRequest(`/banktransactions/uncategorized/${id}/exclude`, { method: 'POST' }),
  restore: (id: any) => apiRequest(`/banktransactions/uncategorized/${id}/restore`, { method: 'POST' }),
  categorize: (id: any, data: any = {}) =>
    apiRequest(`/banktransactions/uncategorized/${id}/categorize`, { method: 'POST', body: data }),
  uncategorize: (id: any) => apiRequest(`/banktransactions/${id}/uncategorize`, { method: 'POST' }),
};

export const bankStatementsAPI = {
  import: (data: any) => apiRequest('/bankstatements', { method: 'POST', body: data }),
};

export const bankReconciliationsAPI = {
  list: (accountId: any, params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/bankaccounts/${accountId}/reconciliations${queryString ? `?${queryString}` : ''}`);
  },
  getById: (accountId: any, reconciliationId: any) =>
    apiRequest(`/bankaccounts/${accountId}/reconciliations/${reconciliationId}`),
  create: (accountId: any, data: any) =>
    apiRequest(`/bankaccounts/${accountId}/reconciliations`, { method: 'POST', body: data }),
  undo: (accountId: any, reconciliationId: any) =>
    apiRequest(`/bankaccounts/${accountId}/reconciliations/${reconciliationId}/undo`, { method: 'POST' }),
  delete: (accountId: any, reconciliationId: any) =>
    apiRequest(`/bankaccounts/${accountId}/reconciliations/${reconciliationId}`, { method: 'DELETE' }),
};

// ============================================================================
// JOURNAL ENTRIES API
// ============================================================================

// export const journalEntriesAPI = {
//   getAll: () => apiRequest('/journal-entries'),
//   getById: (id: any) => apiRequest(`/journal-entries/${id}`),
//   create: (data: any) => apiRequest('/journal-entries', { method: 'POST', body: data }),
//   update: (id: any, data: any) => apiRequest(`/journal-entries/${id}`, { method: 'PUT', body: data }),
//   delete: (id: any) => apiRequest(`/journal-entries/${id}`, { method: 'DELETE' }),
//   getByDateRange: (startDate: string, endDate: string) =>
//     apiRequest(`/journal-entries?startDate=${startDate}&endDate=${endDate}`),
// };

// ============================================================================
// BUDGETS API
// ============================================================================

export const budgetsAPI = {
  getAll: () => apiRequest('/budgets'),
  getById: (id: any) => apiRequest(`/budgets/${id}`),
  create: (data: any) => apiRequest('/budgets', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/budgets/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/budgets/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// DOCUMENTS API
// ============================================================================

export const documentsAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/documents${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/documents/${id}`),
  create: (data: any) => apiRequest('/documents', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/documents/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/documents/${id}`, { method: 'DELETE' }),
  upload: (file: any, metadata: Record<string, any> = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(metadata || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });
    return apiRequest('/documents', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  },
};

// ============================================================================
// INVENTORY ADJUSTMENTS API
// ============================================================================

export const inventoryAdjustmentsAPI = {
  getAll: () => apiRequest('/inventory-adjustments'),
  getById: (id: any) => apiRequest(`/inventory-adjustments/${id}`),
  create: (data: any) => apiRequest('/inventory-adjustments', { method: 'POST', body: data }),
  clone: (id: any) => apiRequest(`/inventory-adjustments/${id}/clone`, { method: 'POST' }),
  update: (id: any, data: any) => apiRequest(`/inventory-adjustments/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/inventory-adjustments/${id}`, { method: 'DELETE' }),
  getByItem: (itemId: any) => apiRequest(`/inventory-adjustments?itemId=${itemId}`),
  getReasons: () => apiRequest('/adjustment-reasons'),
  createReason: (data: any) => apiRequest('/adjustment-reasons', { method: 'POST', body: data }),
  deleteReason: (id: any) => apiRequest(`/adjustment-reasons/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// PAYMENTS RECEIVED API
// ============================================================================

export const paymentsReceivedAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/payments-received${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/payments-received/${id}`),
  create: (data: any) => apiRequest('/payments-received', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/payments-received/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/payments-received/${id}`, { method: 'DELETE' }),
  getByInvoice: (invoiceId: any) => apiRequest(`/payments-received?invoiceId=${invoiceId}`),
  sendEmail: (id: any, data: any) => apiRequest(`/payments-received/${id}/email`, { method: 'POST', body: data }),
};

// ============================================================================
// REFUNDS API
// ============================================================================
export const refundsAPI = {
  getAll: () => apiRequest('/refunds'),
  getById: (id: any) => apiRequest(`/refunds/${id}`),
  getByPaymentId: (paymentId: any) => apiRequest(`/payments-received/${paymentId}/refunds`),
  getByCreditNoteId: (creditNoteId: any) => apiRequest(`/credit-notes/${creditNoteId}/refunds`),
  create: (data: any) => apiRequest('/refunds', { method: 'POST', body: data }),
};

// ============================================================================
// SALESPERSONS API
// ============================================================================

export const salespersonsAPI = {
  getAll: () => apiRequest('/salespersons'),
  getById: (id: any) => apiRequest(`/salespersons/${id}`),
  create: (data: any) => apiRequest('/salespersons', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/salespersons/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/salespersons/${id}`, { method: 'DELETE' }),
};

// Quotes API is defined above (line 151)

// ============================================================================
// PAYMENTS MADE API
// ============================================================================

export const paymentsMadeAPI = {
  getAll: () => apiRequest('/payments-made'),
  getById: (id: any) => apiRequest(`/payments-made/${id}`),
  create: (data: any) => apiRequest('/payments-made', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/payments-made/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/payments-made/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids: any) => apiRequest('/payments-made/bulk-delete', { method: 'POST', body: { ids } }),
  getByBill: (billId: any) => apiRequest(`/payments-made?billId=${billId}`),
  sendEmail: (id: any, data: any) => apiRequest(`/payments-made/${id}/email`, { method: 'POST', body: data }),
};

// ============================================================================
// CREDIT NOTES API
// ============================================================================

export const creditNotesAPI = {
  getAll: () => apiRequest('/credit-notes'),
  getById: (id: any) => apiRequest(`/credit-notes/${id}`),
  getNextNumber: () => apiRequest('/credit-notes/next-number'),
  create: (data: any) => apiRequest('/credit-notes', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/credit-notes/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/credit-notes/${id}`, { method: 'DELETE' }),
  getByInvoice: (invoiceId: any) => apiRequest(`/credit-notes?invoiceId=${invoiceId}`),
  getByCustomer: (customerId: any) => apiRequest(`/credit-notes?customerId=${customerId}`),
  applyToInvoices: (id: any, allocations: any[]) => apiRequest(`/credit-notes/${id}/apply-to-invoices`, { method: 'POST', body: { allocations } }),
};

// ============================================================================
// VENDOR CREDITS API
// ============================================================================

export const vendorCreditsAPI = {
  getAll: () => apiRequest('/vendor-credits'),
  getById: (id: any) => apiRequest(`/vendor-credits/${id}`),
  create: (data: any) => apiRequest('/vendor-credits', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/vendor-credits/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/vendor-credits/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids: any) => apiRequest('/vendor-credits/bulk-delete', { method: 'POST', body: { ids } }),
  applyToBills: (id: any, allocations: any[]) => apiRequest(`/vendor-credits/${id}/apply-to-bills`, { method: 'POST', body: { allocations } }),
  getByBill: (billId: any) => apiRequest(`/vendor-credits?billId=${billId}`),
};

// ============================================================================
// USERS API
// ============================================================================

export const usersAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/users${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/users/${id}`),
  create: (data: any) => apiRequest('/users', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/users/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
  sendInvitation: (id: any, data: any) => apiRequest(`/users/${id}/invite`, { method: 'POST', body: data }),
};

// ============================================================================
// ROLES API
// ============================================================================

export const rolesAPI = {
  getAll: () => apiRequest('/roles'),
  getById: (id: any) => apiRequest(`/roles/${id}`),
  create: (data: any) => apiRequest('/roles', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/roles/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/roles/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// LOCATIONS API
// ============================================================================

export const locationsAPI = {
  getAll: () => apiRequest('/settings/organization/locations'),
  getById: (id: any) => apiRequest(`/settings/organization/locations/${id}`),
  create: (data: any) => apiRequest('/settings/organization/locations', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/settings/organization/locations/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/settings/organization/locations/${id}`, { method: 'DELETE' }),
  getEnabledStatus: () => apiRequest('/settings/organization/locations/enabled'),
  enable: () => apiRequest('/settings/organization/locations/enable', { method: 'POST' }),
};

// Force module reload - locationsAPI export

// ============================================================================
// ============================================================================
// ACCOUNTANT API
// ============================================================================

export const accountsAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/accounts${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: string) => apiRequest(`/accounts/${id}`),
  create: (data: any) => apiRequest('/accounts', { method: 'POST', body: data }),
  update: (id: string, data: any) => apiRequest(`/accounts/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => apiRequest(`/accounts/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids: string[]) => apiRequest('/accounts/bulk-delete', { method: 'POST', body: { ids } }),
  bulkStatus: (ids: string[], isActive: boolean) => apiRequest('/accounts/bulk-status', { method: 'PATCH', body: { ids, isActive } }),
};

export const accountantAPI = {
  // Chart of Accounts
  getAccounts: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/accounts${queryString ? `?${queryString}` : ''}`);
  },
  createAccount: (data: any) => apiRequest('/accounts', { method: 'POST', body: data }),
  updateAccount: (id: any, data: any) => apiRequest(`/accounts/${id}`, { method: 'PATCH', body: data }),
  deleteAccount: (id: any) => apiRequest(`/accounts/${id}`, { method: 'DELETE' }),
  bulkDeleteAccounts: (ids: any) => apiRequest('/accounts/bulk-delete', { method: 'POST', body: { ids } }),
  bulkUpdateAccountStatus: (ids: any, isActive: any) => apiRequest('/accounts/bulk-status', { method: 'PATCH', body: { ids, isActive } }),

  // Journal Entries
  getJournals: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/journal-entries${queryString ? `?${queryString}` : ''}`);
  },
  getJournalById: (id: any) => apiRequest(`/journal-entries/${id}`),
  createJournal: (data: any) => apiRequest('/journal-entries', { method: 'POST', body: data }),
  updateJournal: (id: any, data: any) => apiRequest(`/journal-entries/${id}`, { method: 'PATCH', body: data }),
  deleteJournal: (id: any) => apiRequest(`/journal-entries/${id}`, { method: 'DELETE' }),

  // Budgets
  getBudgets: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/budgets${queryString ? `?${queryString}` : ''}`);
  },
  getBudgetById: (id: any) => apiRequest(`/budgets/${id}`),
  createBudget: (data: any) => apiRequest('/budgets', { method: 'POST', body: data }),
  updateBudget: (id: any, data: any) => apiRequest(`/budgets/${id}`, { method: 'PATCH', body: data }),
  deleteBudget: (id: any) => apiRequest(`/budgets/${id}`, { method: 'DELETE' }),

  // Accountant Bulk Updates
  previewBulkUpdateTransactions: (data: any) => apiRequest('/bulk-updates/preview', { method: 'POST', body: data }),
  executeBulkUpdateTransactions: (data: any) => apiRequest('/bulk-updates/execute', { method: 'POST', body: data }),
  getBulkUpdateHistory: () => apiRequest('/bulk-updates/history'),
  getBulkUpdateHistoryById: (id: any) => apiRequest(`/bulk-updates/history/${id}`),

  // Currency Adjustments
  getCurrencyAdjustments: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/currency-adjustments${queryString ? `?${queryString}` : ''}`);
  },
  getCurrencyAdjustmentById: (id: any) => apiRequest(`/currency-adjustments/${id}`),
  createCurrencyAdjustment: (data: any) => apiRequest('/currency-adjustments', { method: 'POST', body: data }),
  previewCurrencyAdjustment: (data: any) => apiRequest('/currency-adjustments/preview', { method: 'POST', body: data }),
  updateCurrencyAdjustment: (id: any, data: any) => apiRequest(`/currency-adjustments/${id}`, { method: 'PATCH', body: data }),
  deleteCurrencyAdjustment: (id: any) => apiRequest(`/currency-adjustments/${id}`, { method: 'DELETE' }),

  // Journal Templates
  getJournalTemplates: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/journal-templates${queryString ? `?${queryString}` : ''}`);
  },
  getJournalTemplateById: (id: any) => apiRequest(`/journal-templates/${id}`),
  createJournalTemplate: (data: any) => apiRequest('/journal-templates', { method: 'POST', body: data }),
  updateJournalTemplate: (id: any, data: any) => apiRequest(`/journal-templates/${id}`, { method: 'PATCH', body: data }),
  deleteJournalTemplate: (id: any) => apiRequest(`/journal-templates/${id}`, { method: 'DELETE' }),

  // Transaction Locking
  getTransactionLocks: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/transaction-locks${queryString ? `?${queryString}` : ''}`);
  },
  createTransactionLock: (data: any) => apiRequest('/transaction-locks', { method: 'POST', body: data }),
  unlockTransaction: (id: any) => apiRequest(`/transaction-locks/${id}/unlock`, { method: 'PATCH' }),
  bulkUnlockTransactions: (modules: any) => apiRequest('/transaction-locks/bulk-unlock', { method: 'PATCH', body: { modules } }),
};

// ============================================================================
// UNITS API
// ============================================================================

export const unitsAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/settings/units${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/settings/units/${id}`),
  create: (data: any) => apiRequest('/settings/units', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/settings/units/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/settings/units/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// CONTACT PERSONS API
// ============================================================================

export const contactPersonsAPI = {
  getAll: (customerId: any = null) => {
    const endpoint = customerId ? `/contact-persons?customerId=${customerId}` : '/contact-persons';
    return apiRequest(endpoint);
  },
  getById: (id: any) => apiRequest(`/contact-persons/${id}`),
  create: (data: any) => apiRequest('/contact-persons', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/contact-persons/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/contact-persons/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// JOURNAL ENTRIES API
// ============================================================================

export const journalEntriesAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/journal-entries${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/journal-entries/${id}`),
  create: (data: any) => apiRequest('/journal-entries', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/journal-entries/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/journal-entries/${id}`, { method: 'DELETE' }),
  getAccountsReceivableBalance: () => apiRequest('/journal-entries/balance'),
  getAccountsReceivableLedger: () => apiRequest('/journal-entries/ledger'),
};

// ============================================================================
// CHART OF ACCOUNTS API
// ============================================================================

export const chartOfAccountsAPI = {
  getAccounts: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/accounts${queryString ? `?${queryString}` : ''}`);
  },
  createAccount: (data: any) => apiRequest('/accounts', { method: 'POST', body: data }),
  updateAccount: (id: any, data: any) => apiRequest(`/accounts/${id}`, { method: 'PATCH', body: data }),
  deleteAccount: (id: any) => apiRequest(`/accounts/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// ORGANIZATION PROFILE API
// ============================================================================

export const profileAPI = {
  get: () => apiRequest('/settings/organization/profile'),
  getOrganizationProfile: () => apiRequest('/settings/organization/profile'),
  update: (data: any) => apiRequest('/settings/organization/profile', { method: 'PUT', body: data }),
};

// ============================================================================
// CURRENCIES API
// ============================================================================

export const currenciesAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/settings/currencies${queryString ? `?${queryString}` : ''}`);
  },
  getBaseCurrency: () => apiRequest('/settings/currencies/base'),
  create: (data: any) => apiRequest('/settings/currencies', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/settings/currencies/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/settings/currencies/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// TAXES API
// ============================================================================

export const taxesAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/settings/taxes${queryString ? `?${queryString}` : ''}`);
  },
  getForTransactions: (type: "sales" | "purchase" | "both" | "" = "") => {
    const params: any = { forTransactions: "true" };
    if (type) params.type = type;
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/settings/taxes?${queryString}`);
  },
  getById: (id: any) => apiRequest(`/settings/taxes/${id}`),
  create: (data: any) => apiRequest('/settings/taxes', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/settings/taxes/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/settings/taxes/${id}`, { method: 'DELETE' }),
  createBulk: (taxes: any) => apiRequest('/settings/taxes/bulk', { method: 'POST', body: { taxes } }),
};

// ============================================================================
// OPENING BALANCES API
// ============================================================================

export const openingBalancesAPI = {
  get: () => apiRequest('/settings/opening-balances'),
  save: (data: any) => apiRequest('/settings/opening-balances', { method: 'POST', body: data }),
};

// ============================================================================
// REPORTS API
// ============================================================================

export const reportsAPI = {
  // Catalog and report execution
  getCatalog: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/reports/catalog${queryString ? `?${queryString}` : ''}`);
  },
  getByKey: (reportKey: string) => apiRequest(`/reports/${encodeURIComponent(reportKey)}`),
  run: (reportKey: string, data: any = {}) =>
    apiRequest(`/reports/${encodeURIComponent(reportKey)}/run`, { method: 'POST', body: data }),

  // Layout + settings
  getLayout: () => apiRequest('/reports/layout'),
  updateLayout: (data: any) => apiRequest('/reports/layout', { method: 'PUT', body: data }),
  getSettings: () => apiRequest('/reports/settings'),
  updateSettings: (data: any) => apiRequest('/reports/settings', { method: 'PUT', body: data }),

  // Custom reports
  getCustomReports: () => apiRequest('/reports/custom'),
  createCustomReport: (data: any) => apiRequest('/reports/custom', { method: 'POST', body: data }),
  updateCustomReport: (id: string, data: any) => apiRequest(`/reports/custom/${id}`, { method: 'PUT', body: data }),
  deleteCustomReport: (id: string) => apiRequest(`/reports/custom/${id}`, { method: 'DELETE' }),

  // Schedule reports
  getSchedules: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/reports/schedules${queryString ? `?${queryString}` : ''}`);
  },
  createSchedule: (data: any) => apiRequest('/reports/schedules', { method: 'POST', body: data }),
  updateSchedule: (id: string, data: any) => apiRequest(`/reports/schedules/${id}`, { method: 'PUT', body: data }),
  toggleSchedule: (id: string) => apiRequest(`/reports/schedules/${id}/toggle`, { method: 'PATCH' }),
  deleteSchedule: (id: string) => apiRequest(`/reports/schedules/${id}`, { method: 'DELETE' }),

  // Share reports
  getShare: (reportKey: string) => apiRequest(`/reports/${encodeURIComponent(reportKey)}/share`),
  updateShare: (reportKey: string, data: any) =>
    apiRequest(`/reports/${encodeURIComponent(reportKey)}/share`, { method: 'PUT', body: data }),
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

export const healthCheck = () => apiRequest('/health');

// ============================================================================
// SETTINGS API
// ============================================================================

export const settingsAPI = {
  getOrganizationProfile: () => apiRequest('/settings/organization/profile'),
  updateOrganizationProfile: (data: any) => apiRequest('/settings/organization/profile', { method: 'PUT', body: data }),
  getOrganizationBranding: () => apiRequest('/settings/organization/branding'),
  updateOrganizationBranding: (data: any) => apiRequest('/settings/organization/branding', { method: 'PUT', body: data }),
  getQuotesSettings: () => apiRequest('/settings/quotes'),
  updateQuotesSettings: (data: any) => apiRequest('/settings/quotes', { method: 'PUT', body: data }),
  getRecurringInvoiceSettings: () => apiRequest('/settings/recurring-invoices'),
  updateRecurringInvoiceSettings: (data: any) => apiRequest('/settings/recurring-invoices', { method: 'PUT', body: data }),
  getOwnerEmail: () => apiRequest('/settings/organization/owner-email'),
};

// ============================================================================
// TRANSACTION NUMBER SERIES API
// ============================================================================

const TRANSACTION_NUMBER_SERIES_CACHE_KEY = "taban_transaction_number_series_cache_v1";

const readTransactionNumberSeriesCache = (): any[] => {
  try {
    const raw = localStorage.getItem(TRANSACTION_NUMBER_SERIES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeTransactionNumberSeriesCache = (rows: any[]): void => {
  try {
    localStorage.setItem(
      TRANSACTION_NUMBER_SERIES_CACHE_KEY,
      JSON.stringify(Array.isArray(rows) ? rows : []),
    );
  } catch {
    // Ignore localStorage failures and continue with API behavior.
  }
};

const normalizeTransactionSeriesRows = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

const normalizeTransactionModuleName = (value: any): string =>
  String(value || "")
    .trim()
    .toLowerCase();

const getDefaultSeriesPrefix = (moduleName: string): string => {
  switch (normalizeTransactionModuleName(moduleName)) {
    case "quote":
      return "QT-";
    case "invoice":
      return "INV-";
    case "credit note":
      return "CN-";
    case "debit note":
      return "CDN-";
    case "sales receipt":
      return "SR-";
    case "retainer invoice":
      return "RET-";
    case "subscriptions":
    case "subscription":
      return "SUB-";
    case "purchase order":
      return "PO-";
    case "journal":
      return "JRN-";
    default:
      return "";
  }
};

const resolveSeriesNumberWidth = (row: any): number => {
  const starting = String(row?.startingNumber ?? "").trim();
  if (starting) return starting.length;
  const current = Number(row?.currentNumber ?? row?.nextNumber ?? 1);
  return current >= 100000 ? String(current).length : 6;
};

const formatSeriesNumber = (row: any, nextNumber: number, fallbackModule?: string): string => {
  const prefix = String(row?.prefix ?? getDefaultSeriesPrefix(fallbackModule || row?.module)).trim();
  const width = resolveSeriesNumberWidth(row);
  return `${prefix}${String(Math.max(1, Number(nextNumber) || 1)).padStart(width, "0")}`;
};

const chooseMatchingTransactionSeries = (rows: any[], lookup: any): any => {
  const moduleName = normalizeTransactionModuleName(lookup?.module);
  const seriesId = String(lookup?.seriesId || lookup?.id || "").trim();
  const seriesName = String(lookup?.seriesName || "").trim().toLowerCase();

  if (seriesId) {
    const byId = rows.find((row) => String(row?._id || row?.id || "").trim() === seriesId);
    if (byId) return byId;
  }

  let matches = rows;
  if (seriesName) {
    const byName = rows.filter(
      (row) => String(row?.seriesName || row?.name || "").trim().toLowerCase() === seriesName,
    );
    if (byName.length) matches = byName;
  }

  if (moduleName) {
    const byModule = matches.filter((row) => normalizeTransactionModuleName(row?.module) === moduleName);
    if (byModule.length) matches = byModule;
  }

  return (
    matches.find((row) => Boolean(row?.isDefault)) ||
    matches[0] ||
    null
  );
};

const updateCachedTransactionSeriesRow = (row: any): void => {
  const nextId = String(row?._id || row?.id || "").trim();
  if (!nextId) return;

  const existing = readTransactionNumberSeriesCache();
  const nextRows = existing.slice();
  const index = nextRows.findIndex((item) => String(item?._id || item?.id || "").trim() === nextId);
  if (index >= 0) {
    nextRows[index] = { ...nextRows[index], ...row };
  } else {
    nextRows.push(row);
  }
  writeTransactionNumberSeriesCache(nextRows);
};

export const transactionNumberSeriesAPI = {
  getAll: async (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiRequest(`/settings/transaction-number-series${queryString ? `?${queryString}` : ''}`);
    writeTransactionNumberSeriesCache(normalizeTransactionSeriesRows(response));
    return response;
  },
  getById: async (id: any) => {
    const response = await apiRequest(`/settings/transaction-number-series/${id}`);
    const row = response?.data || response;
    if (row && typeof row === "object") {
      updateCachedTransactionSeriesRow(row);
    }
    return response;
  },
  create: async (data: any) => {
    const response = await apiRequest('/settings/transaction-number-series', { method: 'POST', body: data });
    const row = response?.data || response;
    if (row && typeof row === "object") {
      updateCachedTransactionSeriesRow(row);
    }
    return response;
  },
  createMultiple: async (data: any) => {
    const response = await apiRequest('/settings/transaction-number-series/batch', { method: 'POST', body: data });
    const rows = normalizeTransactionSeriesRows(response);
    if (rows.length) {
      const existing = readTransactionNumberSeriesCache();
      const byId = new Map(existing.map((row) => [String(row?._id || row?.id || ""), row]));
      rows.forEach((row) => {
        byId.set(String(row?._id || row?.id || ""), { ...byId.get(String(row?._id || row?.id || "")), ...row });
      });
      writeTransactionNumberSeriesCache(Array.from(byId.values()));
    }
    return response;
  },
  update: async (id: any, data: any) => {
    const response = await apiRequest(`/settings/transaction-number-series/${id}`, { method: 'PUT', body: data });
    const row = response?.data || response;
    if (row && typeof row === "object") {
      updateCachedTransactionSeriesRow(row);
    }
    return response;
  },
  updateMultiple: async (data: any) => {
    const allSeriesResponse = await transactionNumberSeriesAPI.getAll();
    const rows = normalizeTransactionSeriesRows(allSeriesResponse);
    const originalName = String(data?.originalName || data?.seriesName || "").trim().toLowerCase();
    const modules = Array.isArray(data?.modules) ? data.modules : [];

    const matchingRows = rows.filter((row) => {
      const rowSeriesName = String(row?.seriesName || row?.name || "").trim().toLowerCase();
      return originalName ? rowSeriesName === originalName : false;
    });

    const responses = await Promise.all(
      modules.map(async (moduleConfig: any) => {
        const moduleName = normalizeTransactionModuleName(moduleConfig?.module);
        const existingRow = matchingRows.find(
          (row) => normalizeTransactionModuleName(row?.module) === moduleName,
        );
        const payload = {
          module: moduleConfig?.module,
          prefix: moduleConfig?.prefix,
          startingNumber: moduleConfig?.startingNumber,
          currentNumber: Math.max(1, parseInt(String(moduleConfig?.startingNumber || "1"), 10) || 1),
          isDefault: Boolean(moduleConfig?.isDefault),
          isActive: String(moduleConfig?.status || "Active").toLowerCase() !== "inactive",
          restartNumbering: moduleConfig?.restartNumbering,
          seriesName: data?.seriesName,
          locationIds: data?.locationIds,
        };

        if (existingRow?._id || existingRow?.id) {
          return transactionNumberSeriesAPI.update(existingRow._id || existingRow.id, payload);
        }

        return transactionNumberSeriesAPI.create(payload);
      }),
    );

    return {
      success: true,
      data: responses.map((response: any) => response?.data || response).filter(Boolean),
    };
  },
  delete: async (id: any) => {
    const response = await apiRequest(`/settings/transaction-number-series/${id}`, { method: 'DELETE' });
    const existing = readTransactionNumberSeriesCache();
    writeTransactionNumberSeriesCache(
      existing.filter((row) => String(row?._id || row?.id || "").trim() !== String(id || "").trim()),
    );
    return response;
  },
  getCachedNextNumber: (lookup: any) => {
    const rows = readTransactionNumberSeriesCache();
    const matched = chooseMatchingTransactionSeries(rows, lookup);
    if (matched) {
      const currentNumber = Number(matched?.currentNumber ?? matched?.nextNumber ?? 1);
      const nextNumber = currentNumber > 0 ? currentNumber : 1;
      return formatSeriesNumber(matched, nextNumber, lookup?.module);
    }

    const fallbackModule = String(lookup?.module || "").trim();
    const fallbackPrefix = getDefaultSeriesPrefix(fallbackModule);
    return fallbackPrefix ? `${fallbackPrefix}000001` : "";
  },
  getNextNumber: async (lookup: any) => {
    const rawId =
      typeof lookup === "string" || typeof lookup === "number"
        ? String(lookup)
        : String(lookup?.seriesId || lookup?.id || "").trim();
    const reserve = typeof lookup === "object" ? Boolean(lookup?.reserve) : true;

    if (rawId) {
      if (!reserve) {
        const rowResponse = await transactionNumberSeriesAPI.getById(rawId);
        const row = rowResponse?.data || rowResponse;
        const currentNumber = Number(row?.currentNumber ?? 1);
        const formatted = formatSeriesNumber(row, currentNumber, row?.module);
        return {
          success: true,
          data: {
            nextNumber: formatted,
            number: formatted,
            currentNumber,
          },
        };
      }

      const response = await apiRequest(`/settings/transaction-number-series/${rawId}/next`);
      const nextValue = Number(response?.data?.currentNumber ?? 1);
      updateCachedTransactionSeriesRow({
        _id: rawId,
        currentNumber: nextValue,
      });
      if (response?.data?.number && !response?.data?.nextNumber) {
        response.data.nextNumber = response.data.number;
      }
      return response;
    }

    const allSeriesResponse = await transactionNumberSeriesAPI.getAll();
    const rows = normalizeTransactionSeriesRows(allSeriesResponse);
    const matched = chooseMatchingTransactionSeries(rows, lookup);

    if (!matched?._id && !matched?.id) {
      return {
        success: true,
        data: {
          nextNumber: transactionNumberSeriesAPI.getCachedNextNumber(lookup),
          currentNumber: 1,
        },
      };
    }

    const matchedId = matched._id || matched.id;
    if (!reserve) {
      const currentNumber = Number(matched?.currentNumber ?? 1);
      const formatted = formatSeriesNumber(matched, currentNumber, matched?.module);
      return {
        success: true,
        data: {
          nextNumber: formatted,
          number: formatted,
          currentNumber,
        },
      };
    }

    const response = await apiRequest(`/settings/transaction-number-series/${matchedId}/next`);
    const nextValue = Number(response?.data?.currentNumber ?? 1);
    updateCachedTransactionSeriesRow({
      ...matched,
      _id: matchedId,
      currentNumber: nextValue,
    });
    if (response?.data?.number && !response?.data?.nextNumber) {
      response.data.nextNumber = response.data.number;
    }
    return response;
  },
};

// ============================================================================
// REPORTING TAGS API
// ============================================================================

export const reportingTagsAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/settings/reporting-tags${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: any) => apiRequest(`/settings/reporting-tags/${id}`),
  create: (data: any) => apiRequest('/settings/reporting-tags', { method: 'POST', body: data }),
  bulkCreate: (tags: any) => apiRequest('/settings/reporting-tags/bulk', { method: 'POST', body: { tags } }),
  update: (id: any, data: any) => apiRequest(`/settings/reporting-tags/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/settings/reporting-tags/${id}`, { method: 'DELETE' }),
  getByEntityType: (entityType: string) => apiRequest(`/settings/reporting-tags/by-entity/${entityType}`),
  test: () => apiRequest('/settings/reporting-tags/test'),
};

// ============================================================================
// PAYMENT MODES API
// ============================================================================

export const paymentModesAPI = {
  getAll: () => apiRequest('/settings/payment-modes'),
  create: (data: any) => apiRequest('/settings/payment-modes', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/settings/payment-modes/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/settings/payment-modes/${id}`, { method: 'DELETE' }),
  seed: () => apiRequest('/settings/payment-modes/seed', { method: 'POST' }),
};

// ============================================================================
// SENDER EMAILS API
// ============================================================================
export const senderEmailsAPI = {
  getPrimary: () => apiRequest('/settings/sender-emails/primary'),
  getAll: () => apiRequest('/settings/sender-emails'),
  create: (data: any) => apiRequest('/settings/sender-emails', { method: 'POST', body: data }),
  update: (id: any, data: any) => apiRequest(`/settings/sender-emails/${id}`, { method: 'PUT', body: data }),
  delete: (id: any) => apiRequest(`/settings/sender-emails/${id}`, { method: 'DELETE' }),
  resendVerification: (id: any) =>
    apiRequest(`/settings/sender-emails/${id}/resend-verification`, { method: 'POST' }),
};

// ============================================================================
// EMAIL TEMPLATES API
// ============================================================================
export const emailTemplatesAPI = {
  getAll: () => apiRequest('/settings/email-templates'),
  getByKey: (key: string) => apiRequest(`/settings/email-templates/${encodeURIComponent(key)}`),
  upsert: (key: string, data: any) => apiRequest(`/settings/email-templates/${encodeURIComponent(key)}`, { method: 'PUT', body: data }),
};

// ============================================================================
// EMAIL NOTIFICATION PREFERENCES API
// ============================================================================
export const emailNotificationPreferencesAPI = {
  get: () => apiRequest('/settings/email-notification-preferences'),
  update: (data: any) => apiRequest('/settings/email-notification-preferences', { method: 'PUT', body: data }),
};

// ============================================================================
// EMAIL RELAY API
// ============================================================================
export const emailRelayAPI = {
  getAll: () => apiRequest('/settings/email-relay'),
  create: (data: any) => apiRequest('/settings/email-relay', { method: 'POST', body: data }),
  update: (id: string, data: any) => apiRequest(`/settings/email-relay/${id}`, { method: 'PUT', body: data }),
  toggle: (id: string, enabled: boolean) =>
    apiRequest(`/settings/email-relay/${id}/toggle`, { method: 'PATCH', body: { enabled } }),
  delete: (id: string) => apiRequest(`/settings/email-relay/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// AUTOMATION API
// ============================================================================

export const automationAPI = {
  rules: {
    getAll: (params: any = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiRequest(`/settings/workflow-rules${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id: string) => apiRequest(`/settings/workflow-rules/${id}`),
    create: (data: any) => apiRequest('/settings/workflow-rules', { method: 'POST', body: data }),
    update: (id: string, data: any) => apiRequest(`/settings/workflow-rules/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => apiRequest(`/settings/workflow-rules/${id}`, { method: 'DELETE' }),
    clone: (id: string) => apiRequest(`/settings/workflow-rules/${id}/clone`, { method: 'POST' }),
    reorder: (data: any) => apiRequest('/settings/workflow-rules/reorder', { method: 'PUT', body: data }),
    getNotificationPreferences: () => apiRequest('/settings/workflow-rules/notification-preferences'),
    updateNotificationPreferences: (data: any) =>
      apiRequest('/settings/workflow-rules/notification-preferences', { method: 'PUT', body: data }),
    getStats: () => apiRequest('/settings/workflow-rules/stats'),
  },
  actions: {
    getAll: (params: any = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiRequest(`/settings/workflow-actions${queryString ? `?${queryString}` : ''}`);
    },
    create: (data: any) => apiRequest('/settings/workflow-actions', { method: 'POST', body: data }),
    update: (id: string, data: any) => apiRequest(`/settings/workflow-actions/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => apiRequest(`/settings/workflow-actions/${id}`, { method: 'DELETE' }),
  },
  logs: {
    getAll: (params: any = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiRequest(`/settings/workflow-logs${queryString ? `?${queryString}` : ''}`);
    },
  },
  schedules: {
    getAll: (params: any = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiRequest(`/settings/workflow-schedules${queryString ? `?${queryString}` : ''}`);
    },
    create: (data: any) => apiRequest('/settings/workflow-schedules', { method: 'POST', body: data }),
    update: (id: string, data: any) => apiRequest(`/settings/workflow-schedules/${id}`, { method: 'PUT', body: data }),
    toggle: (id: string) => apiRequest(`/settings/workflow-schedules/${id}/toggle`, { method: 'PATCH' }),
    delete: (id: string) => apiRequest(`/settings/workflow-schedules/${id}`, { method: 'DELETE' }),
  },
};

// ============================================================================
// TAG ASSIGNMENTS API
// ============================================================================

export const tagAssignmentsAPI = {
  getEntityTags: (entityType: string, entityId: any) => apiRequest(`/tags/entity/${entityType}/${entityId}`),
  assignTags: (data: any) => apiRequest('/tags/assign', { method: 'POST', body: data }),
  bulkAssignTags: (data: any) => apiRequest('/tags/bulk-assign', { method: 'POST', body: data }),
  removeTag: (entityType: string, entityId: any, tagId: any) => apiRequest(`/tags/remove/${entityType}/${entityId}/${tagId}`, { method: 'DELETE' }),
  getEntitiesByTag: (tagId: any, entityType: string) => apiRequest(`/tags/entities/${tagId}/${entityType}`),
  getStats: () => apiRequest('/tags/stats'),
};



