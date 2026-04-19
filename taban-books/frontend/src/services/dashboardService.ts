import { apiRequest } from './api';

type DashboardCacheEntry = {
  expiresAt: number;
  value: any;
};

type HomeDashboardMetaData = {
  resource?: string;
  version_id?: string;
  last_updated?: string;
  snapshot_ready?: boolean;
  snapshot_is_current?: boolean;
  snapshot_version_id?: string | null;
  snapshot_last_updated?: string | null;
  refresh_scheduled?: boolean;
};

const DASHBOARD_CACHE_TTL_MS = 15_000;
const HOME_DASHBOARD_STORAGE_KEY = 'taban:dashboard:home-bootstrap';
const HOME_DASHBOARD_STORAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const HOME_DASHBOARD_REQUEST_KEY = 'dashboard:home-bootstrap';
const HOME_DASHBOARD_META_REQUEST_KEY = 'dashboard:home-bootstrap:meta';
const HOME_DASHBOARD_META_POLL_INTERVAL_MS = 1_000;
const HOME_DASHBOARD_META_MAX_ATTEMPTS = 8;
const dashboardCache = new Map<string, DashboardCacheEntry>();
const dashboardInflightRequests = new Map<string, Promise<any>>();

export const HOME_DASHBOARD_DEFAULT_PERIODS = {
  cashFlow: 'this-month',
  profitLoss: 'this-fiscal-year',
  topExpenses: 'this-fiscal-year',
} as const;

const getCachedDashboardResponse = (cacheKey: string) => {
  const cached = dashboardCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    dashboardCache.delete(cacheKey);
    return null;
  }
  return cached.value;
};

const cacheDashboardResponse = (cacheKey: string, value: any, ttlMs = DASHBOARD_CACHE_TTL_MS) => {
  dashboardCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
};

const resolveDashboardScopeKey = () => {
  if (typeof window === 'undefined') return 'server';

  try {
    const organization = JSON.parse(localStorage.getItem('organization') || 'null');
    return [
      localStorage.getItem('taban_auth_mode') || 'remote',
      String(organization?.id || 'no-organization'),
    ].join(':');
  } catch {
    return [
      localStorage.getItem('taban_auth_mode') || 'remote',
      'no-organization',
    ].join(':');
  }
};

const readHomeBootstrapSnapshot = (): any | null => {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = localStorage.getItem(HOME_DASHBOARD_STORAGE_KEY);
    if (!rawValue) return null;

    const snapshot = JSON.parse(rawValue);
    if (!snapshot?.value) {
      localStorage.removeItem(HOME_DASHBOARD_STORAGE_KEY);
      return null;
    }

    if (String(snapshot.scopeKey || '') !== resolveDashboardScopeKey()) {
      return null;
    }

    if (Number(snapshot.updatedAt || 0) <= Date.now() - HOME_DASHBOARD_STORAGE_MAX_AGE_MS) {
      localStorage.removeItem(HOME_DASHBOARD_STORAGE_KEY);
      return null;
    }

    return snapshot.value;
  } catch {
    return null;
  }
};

const persistHomeBootstrapSnapshot = (value: any) => {
  if (typeof window === 'undefined' || !value?.success || !value?.data) return;

  localStorage.setItem(
    HOME_DASHBOARD_STORAGE_KEY,
    JSON.stringify({
      value,
      updatedAt: Date.now(),
      scopeKey: resolveDashboardScopeKey(),
    }),
  );
};

const requestDashboardData = async (
  cacheKey: string,
  request: () => Promise<any>,
  ttlMs = DASHBOARD_CACHE_TTL_MS,
) => {
  const cached = getCachedDashboardResponse(cacheKey);
  if (cached) return cached;

  const inflightRequest = dashboardInflightRequests.get(cacheKey);
  if (inflightRequest) return inflightRequest;

  const requestPromise = request()
    .then((response) => {
      cacheDashboardResponse(cacheKey, response, ttlMs);
      return response;
    })
    .finally(() => {
      dashboardInflightRequests.delete(cacheKey);
    });

  dashboardInflightRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

const primeHomeBootstrapCaches = (response: any) => {
  if (!response?.success || !response?.data) return;

  const bootstrapData = response.data;
  if (bootstrapData.kpi) {
    cacheDashboardResponse('dashboard:kpi', {
      success: true,
      data: bootstrapData.kpi,
    });
  }

  if (bootstrapData.cashFlow) {
    cacheDashboardResponse(
      `dashboard:cashflow:${bootstrapData.cashFlow.period || HOME_DASHBOARD_DEFAULT_PERIODS.cashFlow}`,
      {
        success: true,
        data: bootstrapData.cashFlow,
      },
    );
  }

  if (bootstrapData.profitLoss) {
    cacheDashboardResponse(
      `dashboard:profit-loss:${bootstrapData.profitLoss.period || HOME_DASHBOARD_DEFAULT_PERIODS.profitLoss}`,
      {
        success: true,
        data: bootstrapData.profitLoss,
      },
    );
  }

  if (bootstrapData.topExpenses) {
    cacheDashboardResponse(
      `dashboard:top-expenses:${bootstrapData.topExpenses.period || HOME_DASHBOARD_DEFAULT_PERIODS.topExpenses}`,
      {
        success: true,
        data: bootstrapData.topExpenses,
      },
    );
  }
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const cacheHomeBootstrapPayload = (response: any) => {
  if (!response?.success || !response?.data || response?.pending) return;

  cacheDashboardResponse(HOME_DASHBOARD_REQUEST_KEY, response);
  primeHomeBootstrapCaches(response);
  persistHomeBootstrapSnapshot(response);
};

const probeHomeBootstrapMeta = async (cachedSnapshot?: any | null) => {
  const headers: Record<string, string> = {};
  const cachedData = cachedSnapshot?.data;

  if (cachedData?.version_id) {
    headers['If-None-Match'] = String(cachedData.version_id);
  }
  if (cachedData?.last_updated) {
    headers['If-Modified-Since'] = String(cachedData.last_updated);
  }

  return apiRequest('/dashboard/home-bootstrap/meta', {
    headers,
    meta: {
      source: 'dashboard:getHomeBootstrap:meta',
      dedupeKey: HOME_DASHBOARD_META_REQUEST_KEY,
      allowNotModified: true,
    },
  });
};

const fetchHomeBootstrapSnapshot = async (source = 'dashboard:getHomeBootstrap:snapshot') => {
  const response = await apiRequest('/dashboard/home-bootstrap', {
    meta: {
      source,
      dedupeKey: HOME_DASHBOARD_REQUEST_KEY,
    },
  });

  cacheHomeBootstrapPayload(response);
  return response;
};

const waitForFreshHomeBootstrapSnapshot = async (targetVersionId?: string | null) => {
  for (let attempt = 0; attempt < HOME_DASHBOARD_META_MAX_ATTEMPTS; attempt += 1) {
    const cachedSnapshot = readHomeBootstrapSnapshot();
    const metaResponse = await probeHomeBootstrapMeta(cachedSnapshot);

    if (metaResponse?.notModified && cachedSnapshot) {
      return cachedSnapshot;
    }

    const metaData = metaResponse?.data as HomeDashboardMetaData | undefined;
    const snapshotReady = Boolean(metaData?.snapshot_ready);
    const snapshotMatchesTarget =
      !targetVersionId || String(metaData?.snapshot_version_id || '') === String(targetVersionId);

    if (snapshotReady && metaData?.snapshot_is_current && snapshotMatchesTarget) {
      const snapshotResponse = await fetchHomeBootstrapSnapshot('dashboard:getHomeBootstrap:refresh');
      if (snapshotResponse?.success && snapshotResponse?.data && !snapshotResponse?.pending) {
        return snapshotResponse;
      }
    }

    if (attempt < HOME_DASHBOARD_META_MAX_ATTEMPTS - 1) {
      await sleep(HOME_DASHBOARD_META_POLL_INTERVAL_MS);
    }
  }

  return readHomeBootstrapSnapshot();
};

// Dashboard data service for real-time KPI calculations
export const dashboardService = {
  getHomeBootstrap: async () => {
    const cachedSnapshot = readHomeBootstrapSnapshot();

    try {
      if (cachedSnapshot?.data) {
        const metaResponse = await probeHomeBootstrapMeta(cachedSnapshot);

        if (metaResponse?.notModified) {
          primeHomeBootstrapCaches(cachedSnapshot);
          return cachedSnapshot;
        }

        const metaData = metaResponse?.data as HomeDashboardMetaData | undefined;
        if (
          metaData?.snapshot_ready &&
          metaData.snapshot_is_current &&
          metaData.snapshot_version_id &&
          metaData.snapshot_version_id !== cachedSnapshot.data.version_id
        ) {
          const freshSnapshot = await fetchHomeBootstrapSnapshot('dashboard:getHomeBootstrap:current');
          if (freshSnapshot?.success && freshSnapshot?.data && !freshSnapshot?.pending) {
            return freshSnapshot;
          }
        }

        const freshSnapshot = await waitForFreshHomeBootstrapSnapshot(metaData?.version_id);
        if (freshSnapshot?.success && freshSnapshot?.data) {
          return freshSnapshot;
        }

        primeHomeBootstrapCaches(cachedSnapshot);
        return cachedSnapshot;
      }

      const response = await fetchHomeBootstrapSnapshot('dashboard:getHomeBootstrap');
      if (response?.pending) {
        const freshSnapshot = await waitForFreshHomeBootstrapSnapshot(response?.data?.version_id);
        if (freshSnapshot?.success && freshSnapshot?.data) {
          return freshSnapshot;
        }
        return response;
      }

      if (response?.success && response?.data) {
        const metaResponse = await probeHomeBootstrapMeta(response);

        if (!metaResponse?.notModified) {
          const metaData = metaResponse?.data as HomeDashboardMetaData | undefined;
          if (!metaData?.snapshot_is_current || metaData?.snapshot_version_id !== response.data.version_id) {
            const freshSnapshot = await waitForFreshHomeBootstrapSnapshot(metaData?.version_id);
            if (freshSnapshot?.success && freshSnapshot?.data) {
              return freshSnapshot;
            }
          }
        }
      }

      return response;
    } catch (error) {
      console.error('Error fetching home dashboard bootstrap:', error);
      if (cachedSnapshot) {
        primeHomeBootstrapCaches(cachedSnapshot);
        return cachedSnapshot;
      }
      throw error;
    }
  },

  getCachedHomeBootstrap: () => {
    const cached = getCachedDashboardResponse('dashboard:home-bootstrap') || readHomeBootstrapSnapshot();
    if (cached) {
      primeHomeBootstrapCaches(cached);
    }
    return cached;
  },

  primeHomeHydration: async () => {
    const cached = dashboardService.getCachedHomeBootstrap();
    const hydrate = () => {
      void dashboardService.getHomeBootstrap();
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(hydrate, {
        timeout: cached?.data ? 1_500 : 500,
      });
    } else if (typeof window !== 'undefined') {
      window.setTimeout(hydrate, cached?.data ? 120 : 0);
    } else {
      hydrate();
    }

    return cached;
  },

  // Get comprehensive KPI data for dashboard
  getKpiData: async () => {
    try {
      const response = await requestDashboardData('dashboard:kpi', () => apiRequest('/dashboard/kpi'));
      return response;
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      throw error;
    }
  },

  // Get cash flow data with period filtering
  getCashFlow: async (period = 'this-month') => {
    try {
      const response = await requestDashboardData(
        `dashboard:cashflow:${period}`,
        () => apiRequest(`/dashboard/cashflow?period=${period}`),
      );
      return response;
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      throw error;
    }
  },

  // Get profit and loss data
  getProfitLoss: async (period = 'this-month') => {
    try {
      const response = await requestDashboardData(
        `dashboard:profit-loss:${period}`,
        () => apiRequest(`/dashboard/profit-loss?period=${period}`),
      );
      return response;
    } catch (error) {
      console.error('Error fetching profit loss data:', error);
      throw error;
    }
  },

  // Get top expenses
  getTopExpenses: async (period = 'this-month') => {
    try {
      const response = await requestDashboardData(
        `dashboard:top-expenses:${period}`,
        () => apiRequest(`/dashboard/top-expenses?period=${period}`),
      );
      return response;
    } catch (error) {
      console.error('Error fetching top expenses:', error);
      throw error;
    }
  },

  // Get recent transactions
  getRecentTransactions: async (limit = 10) => {
    try {
      const response = await apiRequest(`/dashboard/recent-transactions?limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      throw error;
    }
  },

  // Get Accounts Receivable summary
  getAccountsReceivableSummary: async () => {
    try {
      const response = await apiRequest('/journal-entries/balance');

      if (response?.success && response.data) {
        return {
          ...response,
          data: {
            ...response.data,
            count: response.data.count ?? response.data.totalInvoices ?? 0,
            overdueCount: response.data.overdueCount ?? response.data.overdueInvoices ?? 0,
          },
        };
      }

      return response;
    } catch (error) {
      console.error('Error fetching AR summary:', error);
      throw error;
    }
  },

  // Get Accounts Payable summary
  getAccountsPayableSummary: async () => {
    try {
      const response = await apiRequest('/dashboard/accounts-payable-summary');
      return response;
    } catch (error) {
      console.error('Error fetching AP summary:', error);
      throw error;
    }
  },

  // Get projects overview
  getProjectsOverview: async () => {
    try {
      const response = await apiRequest('/dashboard/projects-overview');
      return response;
    } catch (error) {
      console.error('Error fetching projects overview:', error);
      throw error;
    }
  },

  // Get bank accounts summary
  getBankAccountsSummary: async () => {
    try {
      const response = await apiRequest('/dashboard/bank-accounts-summary');
      return response;
    } catch (error) {
      console.error('Error fetching bank accounts summary:', error);
      throw error;
    }
  }
};
