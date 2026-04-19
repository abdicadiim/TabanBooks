import { Request, Response } from 'express';
import SyncState from '../models/SyncState.js';
import { logRequestTiming } from '../utils/requestTiming.js';
import {
  applyResourceVersionHeaders,
  requestMatchesResourceVersion,
  type ResourceVersion,
} from '../utils/resourceVersion.js';
import {
  DASHBOARD_HOME_RESOURCE,
  ensureHomeDashboardSourceState,
} from '../utils/dashboardSync.js';
import { buildHomeDashboardBootstrapData, buildKpiResponseData } from './dashboard/dashboard.responses.js';
import {
  calculateAccountsPayableMetrics,
  calculateAccountsReceivableMetrics,
  calculateCashFlowMetrics,
  calculateProfitLossMetrics,
  countAccountsPayable,
  countAccountsReceivable,
  getBankAccountsSummaryInternal,
  getCashFlowBreakdown,
  getProfitLossSnapshot,
  getProjectMetrics,
  getTopExpensesData,
  getWatchlistAccounts,
} from './dashboard/dashboard.metrics.js';
import {
  appendAuthTimings,
  applyServerTiming,
  measureStep,
  measureSyncStep,
} from './dashboard/dashboard.timing.js';
import type { DashboardTiming } from './dashboard/dashboard.types.js';
type HomeDashboardSnapshotRecord = {
  versionId: string;
  lastUpdated: string;
  responseBody: string;
  refreshedAt: string | null;
};

const homeDashboardSnapshotCache = new Map<string, HomeDashboardSnapshotRecord>();
const homeDashboardRefreshTasks = new Map<string, Promise<void>>();

async function getHomeDashboardVersionState(organizationId: string) {
  const syncState = await ensureHomeDashboardSourceState(organizationId);

  return {
    resource: DASHBOARD_HOME_RESOURCE,
    version_id: String(syncState?.version_id || ''),
    last_updated: new Date(syncState?.last_updated || new Date()).toISOString(),
  };
}

function getCachedHomeDashboardSnapshot(organizationId: string) {
  return homeDashboardSnapshotCache.get(organizationId) || null;
}

function setCachedHomeDashboardSnapshot(organizationId: string, snapshot: HomeDashboardSnapshotRecord) {
  homeDashboardSnapshotCache.set(organizationId, snapshot);
}

function buildPendingHomeDashboardBootstrapResponse(versionState?: Partial<ResourceVersion>) {
  return {
    success: true,
    pending: true,
    data: {
      resource: DASHBOARD_HOME_RESOURCE,
      version_id: versionState?.version_id || '',
      last_updated: versionState?.last_updated || new Date().toISOString(),
    },
  };
}

async function loadStoredHomeDashboardSnapshot(organizationId: string) {
  const cachedSnapshot = getCachedHomeDashboardSnapshot(organizationId);
  if (cachedSnapshot) {
    return cachedSnapshot;
  }

  const storedSnapshot = await SyncState.findOne({
    organization: organizationId,
    resource: DASHBOARD_HOME_RESOURCE,
  })
    .select('version_id last_updated payload payload_refreshed_at')
    .lean();

  const responseBody = String((storedSnapshot as any)?.payload || '');
  if (!storedSnapshot || !responseBody) {
    return null;
  }

  const snapshot = {
    versionId: String(storedSnapshot.version_id || ''),
    lastUpdated: new Date(storedSnapshot.last_updated || new Date()).toISOString(),
    responseBody,
    refreshedAt: (storedSnapshot as any)?.payload_refreshed_at
      ? new Date((storedSnapshot as any).payload_refreshed_at).toISOString()
      : null,
  };

  setCachedHomeDashboardSnapshot(organizationId, snapshot);
  return snapshot;
}

async function persistHomeDashboardSnapshot(
  organizationId: string,
  versionState: ResourceVersion,
  responseBody: string,
) {
  const storedSnapshot = await SyncState.findOneAndUpdate(
    {
      organization: organizationId,
      resource: DASHBOARD_HOME_RESOURCE,
    },
    {
      $set: {
        version_id: versionState.version_id,
        last_updated: new Date(versionState.last_updated),
        payload: responseBody,
        payload_refreshed_at: new Date(),
        payload_size_bytes: Buffer.byteLength(responseBody, 'utf8'),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  const snapshot = {
    versionId: String(storedSnapshot?.version_id || versionState.version_id),
    lastUpdated: new Date(storedSnapshot?.last_updated || versionState.last_updated).toISOString(),
    responseBody: String((storedSnapshot as any)?.payload || responseBody),
    refreshedAt: (storedSnapshot as any)?.payload_refreshed_at
      ? new Date((storedSnapshot as any).payload_refreshed_at).toISOString()
      : new Date().toISOString(),
  };

  setCachedHomeDashboardSnapshot(organizationId, snapshot);
  return snapshot;
}

async function buildHomeDashboardBootstrapEnvelope(
  organizationId: string,
  versionState: { version_id: string; last_updated: string },
  timings: DashboardTiming[] = [],
  req?: Request,
) {
  const defaultCashFlowPeriod = 'this-month';
  const defaultProfitLossPeriod = 'this-fiscal-year';
  const defaultTopExpensesPeriod = 'this-fiscal-year';

  const [
    arMetrics,
    apMetrics,
    cashFlowMetrics,
    cashFlowBreakdown,
    profitLossSnapshot,
    topExpenses,
    projectMetrics,
    bankAccountsSummary,
    watchlistAccounts,
  ] = await Promise.all([
    measureStep(
      timings,
      'accounts_receivable_metrics',
      () => calculateAccountsReceivableMetrics(organizationId, req ? { timings, req } : {}),
      req,
    ),
    measureStep(timings, 'accounts_payable_metrics', () => calculateAccountsPayableMetrics(organizationId), req),
    measureStep(
      timings,
      'cash_flow_metrics',
      () => calculateCashFlowMetrics(organizationId, defaultCashFlowPeriod),
      req,
    ),
    measureStep(
      timings,
      'cash_flow_breakdown',
      () => getCashFlowBreakdown(organizationId, defaultCashFlowPeriod),
      req,
    ),
    measureStep(
      timings,
      'profit_loss_snapshot',
      () => getProfitLossSnapshot(organizationId, defaultProfitLossPeriod),
      req,
    ),
    measureStep(
      timings,
      'top_expenses',
      () => getTopExpensesData(organizationId, defaultTopExpensesPeriod, 10),
      req,
    ),
    measureStep(timings, 'project_metrics', () => getProjectMetrics(organizationId), req),
    measureStep(timings, 'bank_accounts_summary', () => getBankAccountsSummaryInternal(organizationId), req),
    measureStep(timings, 'watchlist_accounts', () => getWatchlistAccounts(organizationId), req),
  ]);

  return {
    success: true,
    data: {
      resource: DASHBOARD_HOME_RESOURCE,
      version_id: versionState.version_id,
      last_updated: versionState.last_updated,
      ...buildHomeDashboardBootstrapData({
        arMetrics,
        apMetrics,
        cashFlowMetrics,
        cashFlowBreakdown,
        profitLossSnapshot,
        topExpenses,
        projectMetrics,
        bankAccountsSummary,
        watchlistAccounts,
        defaultCashFlowPeriod,
        defaultProfitLossPeriod,
        defaultTopExpensesPeriod,
      }),
    },
  };
}

export async function primeHomeDashboardBootstrapCache(organizationId: string) {
  try {
    await loadStoredHomeDashboardSnapshot(organizationId);
    void refreshHomeDashboardBootstrapSnapshot(organizationId);
  } catch (error) {
    console.error('[dashboard-cache] Failed to prewarm home dashboard snapshot:', error);
  }
}

async function refreshHomeDashboardBootstrapSnapshot(organizationId: string) {
  const runningRefresh = homeDashboardRefreshTasks.get(organizationId);
  if (runningRefresh) {
    return runningRefresh;
  }

  const refreshTask = (async () => {
    const versionState = await getHomeDashboardVersionState(organizationId);
    const cachedSnapshot = await loadStoredHomeDashboardSnapshot(organizationId);

    if (cachedSnapshot?.versionId === versionState.version_id) {
      return;
    }

    const responseEnvelope = await buildHomeDashboardBootstrapEnvelope(organizationId, versionState);
    const responseBody = JSON.stringify(responseEnvelope);
    await persistHomeDashboardSnapshot(organizationId, versionState, responseBody);
  })().finally(() => {
    homeDashboardRefreshTasks.delete(organizationId);
  });

  homeDashboardRefreshTasks.set(organizationId, refreshTask);
  return refreshTask;
}

function scheduleHomeDashboardBootstrapRefresh(organizationId: string) {
  void refreshHomeDashboardBootstrapSnapshot(organizationId).catch((error) => {
    console.error('[dashboard-cache] Failed to refresh home dashboard snapshot:', error);
  });
}

function requireOrganizationId(req: Request, res: Response) {
  const organizationId = (req as any).user?.organizationId;
  if (!organizationId) {
    res.status(401).json({ success: false, message: 'Organization ID is required' });
    return null;
  }

  return organizationId as string;
}

export const getKpiData = async (req: Request, res: Response) => {
  const timings: DashboardTiming[] = [];

  try {
    appendAuthTimings(timings, req);

    const organizationId = requireOrganizationId(req, res);
    if (!organizationId) {
      return;
    }

    const [
      arMetrics,
      apMetrics,
      cashFlowMetrics,
      profitLossMetrics,
      projectMetrics,
      bankAccountsSummary,
      arCount,
      apCount,
      watchlistAccounts,
    ] = await Promise.all([
      measureStep(timings, 'accounts_receivable_metrics', () => calculateAccountsReceivableMetrics(organizationId)),
      measureStep(timings, 'accounts_payable_metrics', () => calculateAccountsPayableMetrics(organizationId)),
      measureStep(timings, 'cash_flow_metrics', () => calculateCashFlowMetrics(organizationId)),
      measureStep(timings, 'profit_loss_metrics', () => calculateProfitLossMetrics(organizationId)),
      measureStep(timings, 'project_metrics', () => getProjectMetrics(organizationId)),
      measureStep(timings, 'bank_accounts_summary', () => getBankAccountsSummaryInternal(organizationId)),
      measureStep(timings, 'accounts_receivable_count', () => countAccountsReceivable(organizationId)),
      measureStep(timings, 'accounts_payable_count', () => countAccountsPayable(organizationId)),
      measureStep(timings, 'watchlist_accounts', () => getWatchlistAccounts(organizationId)),
    ]);

    applyServerTiming(res, timings);

    res.json({
      success: true,
      data: buildKpiResponseData({
        arMetrics,
        apMetrics,
        cashFlowMetrics,
        profitLossMetrics,
        projectMetrics,
        bankAccountsSummary,
        watchlistAccounts,
        arCount,
        apCount,
      }),
    });
  } catch (error) {
    console.error('CRITICAL ERROR in getKpiData:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard KPI data',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    });
  }
};

export const getCashFlow = async (req: Request, res: Response) => {
  const timings: DashboardTiming[] = [];

  try {
    appendAuthTimings(timings, req);

    const organizationId = requireOrganizationId(req, res);
    if (!organizationId) {
      return;
    }

    const period = typeof req.query.period === 'string' ? req.query.period : 'this-month';

    const [cashFlowMetrics, breakdown] = await Promise.all([
      measureStep(timings, 'cash_flow_metrics', () => calculateCashFlowMetrics(organizationId, period)),
      measureStep(timings, 'cash_flow_breakdown', () => getCashFlowBreakdown(organizationId, period)),
    ]);

    applyServerTiming(res, timings);

    res.json({
      success: true,
      data: {
        period,
        ...cashFlowMetrics,
        breakdown,
      },
    });
  } catch (error) {
    console.error('CRITICAL ERROR in getCashFlow:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cash flow data',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    });
  }
};

export const getProfitLoss = async (req: Request, res: Response) => {
  const timings: DashboardTiming[] = [];

  try {
    appendAuthTimings(timings, req);

    const organizationId = requireOrganizationId(req, res);
    if (!organizationId) {
      return;
    }

    const period = typeof req.query.period === 'string' ? req.query.period : 'this-month';
    const profitLossSnapshot = await measureStep(
      timings,
      'profit_loss_snapshot',
      () => getProfitLossSnapshot(organizationId, period),
    );

    applyServerTiming(res, timings);

    res.json({
      success: true,
      data: {
        period,
        ...profitLossSnapshot,
      },
    });
  } catch (error) {
    console.error('CRITICAL ERROR in getProfitLoss:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profit loss data',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    });
  }
};

export const getTopExpenses = async (req: Request, res: Response) => {
  const timings: DashboardTiming[] = [];

  try {
    appendAuthTimings(timings, req);

    const organizationId = requireOrganizationId(req, res);
    if (!organizationId) {
      return;
    }

    const period = typeof req.query.period === 'string' ? req.query.period : 'this-month';
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 10;

    const topExpenses = await measureStep(
      timings,
      'top_expenses',
      () => getTopExpensesData(organizationId, period, limit),
    );

    applyServerTiming(res, timings);

    res.json({
      success: true,
      data: {
        period,
        expenses: topExpenses,
      },
    });
  } catch (error) {
    console.error('Error fetching top expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top expenses',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getBankAccountsSummary = async (req: Request, res: Response) => {
  const timings: DashboardTiming[] = [];

  try {
    appendAuthTimings(timings, req);

    const organizationId = requireOrganizationId(req, res);
    if (!organizationId) {
      return;
    }

    const summary = await measureStep(timings, 'bank_accounts_summary', () =>
      getBankAccountsSummaryInternal(organizationId, { includeAccounts: true }),
    );

    applyServerTiming(res, timings);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching bank accounts summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank accounts summary',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getHomeDashboardBootstrapMeta = async (req: Request, res: Response) => {
  const timings: DashboardTiming[] = [];

  try {
    appendAuthTimings(timings, req);

    const organizationId = measureSyncStep(
      timings,
      'auth.org_context',
      () => requireOrganizationId(req, res),
      req,
    );
    if (!organizationId) {
      return;
    }

    const [cachedSnapshot, versionState] = await Promise.all([
      measureStep(timings, 'home_bootstrap.snapshot_lookup', () => loadStoredHomeDashboardSnapshot(organizationId), req),
      measureStep(timings, 'home_bootstrap.version_probe', () => getHomeDashboardVersionState(organizationId), req),
    ]);

    applyResourceVersionHeaders(res, versionState);

    if (requestMatchesResourceVersion(req, versionState)) {
      applyServerTiming(res, timings);
      res.status(304).end();
      return;
    }

    const snapshotIsCurrent = cachedSnapshot?.versionId === versionState.version_id;
    if (!snapshotIsCurrent) {
      measureSyncStep(timings, 'home_bootstrap.refresh_scheduled', () => 1, req);
      scheduleHomeDashboardBootstrapRefresh(organizationId);
    }

    applyServerTiming(res, timings);
    res.json({
      success: true,
      data: {
        resource: DASHBOARD_HOME_RESOURCE,
        version_id: versionState.version_id,
        last_updated: versionState.last_updated,
        snapshot_ready: Boolean(cachedSnapshot),
        snapshot_is_current: snapshotIsCurrent,
        snapshot_version_id: cachedSnapshot?.versionId || null,
        snapshot_last_updated: cachedSnapshot?.lastUpdated || null,
        refresh_scheduled: !snapshotIsCurrent,
      },
    });
  } catch (error) {
    console.error('CRITICAL ERROR in getHomeDashboardBootstrapMeta:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard bootstrap meta',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    });
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      logRequestTiming(req as any, {
        route: 'dashboard.home-bootstrap.meta',
      });
    }
  }
};

export const getHomeDashboardBootstrap = async (req: Request, res: Response) => {
  const timings: DashboardTiming[] = [];

  try {
    appendAuthTimings(timings, req);

    const organizationId = measureSyncStep(
      timings,
      'auth.org_context',
      () => requireOrganizationId(req, res),
      req,
    );
    if (!organizationId) {
      return;
    }

    const cachedSnapshot = await measureStep(
      timings,
      'home_bootstrap.snapshot_lookup',
      () => loadStoredHomeDashboardSnapshot(organizationId),
      req,
    );

    if (!cachedSnapshot) {
      measureSyncStep(timings, 'cache_miss.home_bootstrap', () => 0, req);
      scheduleHomeDashboardBootstrapRefresh(organizationId);
      applyServerTiming(res, timings);
      res.status(202).json(buildPendingHomeDashboardBootstrapResponse());
      return;
    }

    const snapshotVersionState: ResourceVersion = {
      resource: DASHBOARD_HOME_RESOURCE,
      version_id: cachedSnapshot.versionId,
      last_updated: cachedSnapshot.lastUpdated,
    };
    applyResourceVersionHeaders(res, snapshotVersionState);

    if (requestMatchesResourceVersion(req, snapshotVersionState)) {
      applyServerTiming(res, timings);
      res.status(304).end();
      return;
    }

    measureSyncStep(timings, 'cache_hit.home_bootstrap', () => cachedSnapshot.responseBody.length, req);
    applyServerTiming(res, timings);
    res.type('application/json').send(cachedSnapshot.responseBody);
  } catch (error) {
    console.error('CRITICAL ERROR in getHomeDashboardBootstrap:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard bootstrap data',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    });
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      logRequestTiming(req as any, {
        route: 'dashboard.home-bootstrap',
      });
    }
  }
};
