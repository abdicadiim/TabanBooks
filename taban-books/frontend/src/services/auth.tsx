/**
 * Authentication Service
 * Handles login, signup, logout, and token management
 */
import { logFrontendRequest } from "./requestInstrumentation";
import { apiRequest } from "./api";

// Use environment variable if available, otherwise use relative URL for same-origin requests
// Type assertion for Vite's import.meta.env
const getApiBaseUrl = (): string => {
  const env = (import.meta as any).env;
  // Prefer explicit env override
  if (env?.VITE_API_BASE_URL) {
    return `${env.VITE_API_BASE_URL}/api`;
  }
  // Default: use relative path so Vite dev proxy handles CORS
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();
export const AUTH_USER_UPDATED_EVENT = 'taban:session-changed';
const LOCAL_AUTH_MODE_KEY = 'taban_auth_mode';
const LOCAL_AUTH_MODE_VALUE = 'local';
const ME_CACHE_DURATION_MS = 10 * 1000;
const BOOTSTRAP_CACHE_KEY = 'taban:bootstrap-cache';
const BOOTSTRAP_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const dispatchSessionChanged = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT));
};

// Type definitions
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationName?: string;
  profile?: {
    phone?: string;
    avatar?: string;
    timezone?: string;
  };
  permissions?: any;
}

export interface Organization {
  id: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  logo?: string;
  isVerified?: boolean;
}

export interface AuthResponse {
  user: User;
  organization: Organization;
  token: string;
}

export interface SessionBootstrapResponse {
  user: User;
  organization: Organization;
  branding?: any;
  generalSettings?: any;
  baseCurrency?: any;
  resource?: string;
  version_id?: string;
  last_updated?: string;
}

export interface BootstrapCacheSnapshot {
  branding: any;
  generalSettings: any;
  baseCurrency: any;
  version_id?: string;
  last_updated?: string;
  updatedAt: number;
  scopeKey: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

let meCache: AuthResponse | null = null;
let meCacheTimestamp = 0;
let meRequestPromise: Promise<AuthResponse | null> | null = null;

const clearMeCache = (): void => {
  meCache = null;
  meCacheTimestamp = 0;
  meRequestPromise = null;
};

const updateVerificationState = (organization?: Organization | null): void => {
  if (organization?.isVerified) {
    localStorage.setItem('account_verified', 'true');
  } else {
    localStorage.removeItem('account_verified');
  }
};

const cacheMeResponse = (response: AuthResponse | null): AuthResponse | null => {
  meCache = response;
  meCacheTimestamp = response ? Date.now() : 0;
  return response;
};

const buildLocalAuthResponse = (): AuthResponse | null => {
  const token = getToken();
  const user = getCurrentUser();
  const organization = getOrganization();

  if (!token || !user || !organization) {
    return null;
  }

  return {
    token,
    user,
    organization,
  };
};

const resolveBootstrapCacheScopeKey = (): string => {
  if (typeof window === 'undefined') return 'server';

  const authMode = localStorage.getItem(LOCAL_AUTH_MODE_KEY) || 'remote';
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    } catch {
      return null;
    }
  })();
  const organization = (() => {
    try {
      return JSON.parse(localStorage.getItem('organization') || 'null') as Organization | null;
    } catch {
      return null;
    }
  })();

  return [
    authMode,
    String(user?.id || 'anonymous'),
    String(organization?.id || 'no-organization'),
  ].join(':');
};

export const readSessionBootstrapCache = (): BootstrapCacheSnapshot | null => {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = localStorage.getItem(BOOTSTRAP_CACHE_KEY);
    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue) as Partial<BootstrapCacheSnapshot>;
    if (!parsedValue || typeof parsedValue !== 'object') {
      localStorage.removeItem(BOOTSTRAP_CACHE_KEY);
      return null;
    }

    if (String(parsedValue.scopeKey || '') !== resolveBootstrapCacheScopeKey()) {
      return null;
    }

    if (Number(parsedValue.updatedAt || 0) <= Date.now() - BOOTSTRAP_CACHE_MAX_AGE_MS) {
      localStorage.removeItem(BOOTSTRAP_CACHE_KEY);
      return null;
    }

    return {
      branding: parsedValue.branding || null,
      generalSettings: parsedValue.generalSettings || null,
      baseCurrency: parsedValue.baseCurrency || null,
      version_id: parsedValue.version_id ? String(parsedValue.version_id) : undefined,
      last_updated: parsedValue.last_updated ? String(parsedValue.last_updated) : undefined,
      updatedAt: Number(parsedValue.updatedAt || 0),
      scopeKey: String(parsedValue.scopeKey || ''),
    };
  } catch {
    localStorage.removeItem(BOOTSTRAP_CACHE_KEY);
    return null;
  }
};

export const persistSessionBootstrapCache = (
  snapshot: Omit<BootstrapCacheSnapshot, 'updatedAt' | 'scopeKey'> | null,
): void => {
  if (typeof window === 'undefined') return;

  if (!snapshot) {
    localStorage.removeItem(BOOTSTRAP_CACHE_KEY);
    return;
  }

  localStorage.setItem(
    BOOTSTRAP_CACHE_KEY,
    JSON.stringify({
      ...snapshot,
      updatedAt: Date.now(),
      scopeKey: resolveBootstrapCacheScopeKey(),
    } satisfies BootstrapCacheSnapshot),
  );
};

export const buildCachedSessionBootstrapResponse = (): SessionBootstrapResponse | null => {
  const user = getCurrentUser();
  const organization = getOrganization();
  const cache = readSessionBootstrapCache();

  if (!user || !organization || !cache) {
    return null;
  }

  return {
    user,
    organization,
    branding: cache.branding || undefined,
    generalSettings: cache.generalSettings || undefined,
    baseCurrency: cache.baseCurrency || undefined,
    version_id: cache.version_id,
    last_updated: cache.last_updated,
  };
};

const persistSession = (auth: AuthResponse): AuthResponse => {
  setToken(auth.token);
  setCurrentUser(auth.user);
  setOrganization(auth.organization);
  localStorage.removeItem(LOCAL_AUTH_MODE_KEY);
  updateVerificationState(auth.organization);
  cacheMeResponse(auth);
  dispatchSessionChanged();
  return auth;
};

// Get token from localStorage
export const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Save token to localStorage
export const setToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

// Remove token from localStorage
export const removeToken = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('organization');
  localStorage.removeItem('account_verified');
  localStorage.removeItem(LOCAL_AUTH_MODE_KEY);
  localStorage.removeItem(BOOTSTRAP_CACHE_KEY);
  clearMeCache();
  dispatchSessionChanged();
};

// Get current user from localStorage
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// Save user to localStorage
export const setCurrentUser = (user: User): void => {
  localStorage.setItem('user', JSON.stringify(user));
  if (meCache) {
    meCache = { ...meCache, user };
    meCacheTimestamp = Date.now();
  }
};

// Get organization from localStorage
export const getOrganization = (): Organization | null => {
  const orgStr = localStorage.getItem('organization');
  return orgStr ? JSON.parse(orgStr) : null;
};

// Save organization to localStorage
export const setOrganization = (org: Organization): void => {
  localStorage.setItem('organization', JSON.stringify(org));
  updateVerificationState(org);
  if (meCache) {
    meCache = { ...meCache, organization: org };
    meCacheTimestamp = Date.now();
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

/**
 * Sign up new user
 */
export const signup = async (
  name: string,
  email: string,
  password: string,
  organizationName: string
): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password,
        organizationName,
      }),
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}`);
    }

    const data: ApiResponse<AuthResponse> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Signup failed (${response.status})`);
    }

    if (data.success && data.data) {
      return persistSession(data.data);
    }

    throw new Error('Invalid response from server');
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

/**
 * Login user
 */
export const login = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const loginUrl = `${API_BASE_URL}/auth/login`;
  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const contentType = response.headers.get('content-type');
    const responseStatus = response.status;
    const responseUrl = response.url;

    // Check if response is JSON before parsing
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      // Check if backend server is not running
      if (response.status === 404 && text.includes('<!DOCTYPE')) {
        throw new Error('Backend server is not running. Please start the server on port 5001.');
      }
      throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}`);
    }

    const data: ApiResponse<AuthResponse> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Login failed (${response.status})`);
    }

    if (data.success && data.data) {
      return persistSession(data.data);
    }

    throw new Error('Invalid response from server');
  } catch (error: any) {
    // Improve error message for network errors
    if (error.message && error.message.includes('Failed to fetch') || error.message && error.message.includes('NetworkError')) {
      console.error('Login error: Cannot connect to backend server. Make sure the server is running on port 5001.');
      throw new Error('Cannot connect to backend server. Please ensure the server is running.');
    }
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Check if user exists and their password status
 */
export const checkUser = async (email: string): Promise<{ hasPassword: boolean; isInvited: boolean }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/check-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      if (response.status === 404 && text.includes('<!DOCTYPE')) {
        throw new Error('Backend server is not running. Please start the server on port 5001.');
      }
      throw new Error(
        text
          ? `Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}`
          : `Server returned an empty response (${response.status})`,
      );
    }

    const data = await response.json().catch(() => {
      throw new Error(`Server returned invalid JSON (${response.status})`);
    });
    if (!response.ok) throw new Error(data.message || 'Error checking user');
    return data.data;
  } catch (error: any) {
    if ((error.message && error.message.includes('Failed to fetch')) || (error.message && error.message.includes('NetworkError'))) {
      console.error('Check user error: Cannot connect to backend server. Make sure the server is running on port 5001.');
      throw new Error('Cannot connect to backend server. Please ensure the server is running.');
    }
    console.error('Check user error:', error);
    throw error;
  }
};

/**
 * Send login OTP
 */
export const sendLoginOTP = async (email: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/send-login-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`);
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Error sending OTP");
  } catch (error: any) {
    console.error("Send login OTP error:", error);
    throw error;
  }
};

/**
 * Verify login OTP
 */
export const verifyLoginOTP = async (email: string, otp: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-login-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`);
    }

    const data: ApiResponse<AuthResponse> = await response.json();
    if (!response.ok) throw new Error(data.message || "Error verifying OTP");

    if (data.success && data.data) {
      return persistSession(data.data);
    }

    throw new Error("Invalid response from server");
  } catch (error) {
    console.error("Verify login OTP error:", error);
    throw error;
  }
};

/**
 * Verify account with 6-digit OTP
 */
export const verifyAccount = async (otp: string): Promise<ApiResponse<any>> => {
  try {
    if (localStorage.getItem(LOCAL_AUTH_MODE_KEY) === LOCAL_AUTH_MODE_VALUE) {
      if (!/^\d{6}$/.test(String(otp || ''))) {
        throw new Error('Invalid verification code');
      }

      localStorage.setItem('account_verified', 'true');
      const org = getOrganization();
      if (org) {
        setOrganization({ ...org, isVerified: true });
      }

      return {
        success: true,
        message: 'Account verified successfully',
      };
    }

    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/auth/verify-account`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('account_verified', 'true');
      // Update organization in local storage
      const org = getOrganization();
      if (org) {
        setOrganization({ ...org, isVerified: true });
      }
    }

    return data;
  } catch (error) {
    console.error('Verify account error:', error);
    throw error;
  }
};

/**
 * Resend verification code (OTP)
 */
export const resendOTP = async (): Promise<ApiResponse<any>> => {
  try {
    if (localStorage.getItem(LOCAL_AUTH_MODE_KEY) === LOCAL_AUTH_MODE_VALUE) {
      return {
        success: true,
        message: 'Verification code resent',
      };
    }

    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Resend OTP error:', error);
    throw error;
  }
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    const token = getToken();
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    removeToken();
  }
};

/**
 * Get current user from API
 */
export const getMe = async (source = 'auth:getMe'): Promise<AuthResponse | null> => {
  try {
    if (localStorage.getItem(LOCAL_AUTH_MODE_KEY) === LOCAL_AUTH_MODE_VALUE) {
      return cacheMeResponse(buildLocalAuthResponse());
    }

    const token = getToken();
    if (!token) {
      clearMeCache();
      return null;
    }

    const now = Date.now();
    if (meCache && now - meCacheTimestamp < ME_CACHE_DURATION_MS) {
      return meCache;
    }

    if (meRequestPromise) {
      return meRequestPromise;
    }

    meRequestPromise = (async () => {
      logFrontendRequest('GET', '/auth/me', source);
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}`);
        if (response.status === 401) {
          removeToken();
        }
        return cacheMeResponse(null);
      }

      const data: ApiResponse<AuthResponse> = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          removeToken();
        }
        throw new Error(data.message || `Failed to get user (${response.status})`);
      }

      if (data.success && data.data) {
        setCurrentUser(data.data.user);
        setOrganization(data.data.organization);
        return cacheMeResponse({
          ...data.data,
          token,
        });
      }

      return cacheMeResponse(null);
    })();

    return await meRequestPromise;
  } catch (error) {
    console.error('Get me error:', error);
    return null;
  } finally {
    meRequestPromise = null;
  }
};

export const getSessionBootstrap = async (
  source = 'auth:getSessionBootstrap'
): Promise<SessionBootstrapResponse | null> => {
  try {
    if (localStorage.getItem(LOCAL_AUTH_MODE_KEY) === LOCAL_AUTH_MODE_VALUE) {
      const localSession = buildLocalAuthResponse();
      if (!localSession) {
        return null;
      }

      return {
        user: localSession.user,
        organization: localSession.organization,
      };
    }

    const token = getToken();
    if (!token) {
      clearMeCache();
      return null;
    }

    const cachedBootstrap = buildCachedSessionBootstrapResponse();
    const conditionalHeaders: Record<string, string> = {};

    if (cachedBootstrap?.version_id) {
      conditionalHeaders['If-None-Match'] = cachedBootstrap.version_id;
    }
    if (cachedBootstrap?.last_updated) {
      conditionalHeaders['If-Modified-Since'] = cachedBootstrap.last_updated;
    }

    const response = await apiRequest('/auth/bootstrap', {
      headers: conditionalHeaders,
      meta: {
        source,
        dedupeKey: 'auth:bootstrap',
        skipCache: true,
        allowNotModified: true,
      },
    });

    if (response?.notModified) {
      return cachedBootstrap;
    }

    if (!response?.success || !response?.data) {
      return cachedBootstrap;
    }

    const bootstrap = response.data as SessionBootstrapResponse;
    setCurrentUser(bootstrap.user);
    setOrganization(bootstrap.organization);
    persistSessionBootstrapCache({
      branding: bootstrap.branding || null,
      generalSettings: bootstrap.generalSettings || null,
      baseCurrency: bootstrap.baseCurrency || null,
      version_id: bootstrap.version_id,
      last_updated: bootstrap.last_updated,
    });
    cacheMeResponse({
      token,
      user: bootstrap.user,
      organization: bootstrap.organization,
    });
    return bootstrap;
  } catch (error) {
    console.error('Get bootstrap error:', error);
    return buildCachedSessionBootstrapResponse();
  }
};


