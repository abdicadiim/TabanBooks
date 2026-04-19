import { performance } from 'perf_hooks';
import { Request, Response } from 'express';
import { ensureRequestTiming } from '../../utils/requestTiming.js';
import type { DashboardTiming } from './dashboard.types.js';

const SLOW_STEP_LOG_THRESHOLD_MS = 250;

export async function measureStep<T>(
  timings: DashboardTiming[],
  name: string,
  work: () => Promise<T>,
  req?: Request,
): Promise<T> {
  const startedAt = performance.now();
  try {
    return await work();
  } finally {
    const durationMs = performance.now() - startedAt;
    timings.push({
      name,
      durationMs,
    });
    if (req) {
      ensureRequestTiming(req as any).steps.push({
        name,
        ms: Number(durationMs.toFixed(1)),
      });
    }
  }
}

export function applyServerTiming(res: Response, timings: DashboardTiming[]) {
  if (!timings.length) return;

  const orderedTimings = [...timings].sort((left, right) => right.durationMs - left.durationMs);
  res.setHeader(
    'Server-Timing',
    orderedTimings
      .map((timing) => `${timing.name.replace(/[^a-zA-Z0-9_-]/g, '_')};dur=${timing.durationMs.toFixed(1)}`)
      .join(', '),
  );

  if (process.env.NODE_ENV !== 'production') {
    const slowSteps = orderedTimings.filter((timing) => timing.durationMs >= SLOW_STEP_LOG_THRESHOLD_MS);
    if (slowSteps.length) {
      console.info(
        `[DashboardTiming] ${slowSteps
          .map((timing) => `${timing.name}=${timing.durationMs.toFixed(1)}ms`)
          .join(', ')}`,
      );
    }
  }
}

export function measureSyncStep<T>(
  timings: DashboardTiming[],
  name: string,
  work: () => T,
  req?: Request,
): T {
  const startedAt = performance.now();
  try {
    return work();
  } finally {
    const durationMs = performance.now() - startedAt;
    timings.push({
      name,
      durationMs,
    });
    if (req) {
      ensureRequestTiming(req as any).steps.push({
        name,
        ms: Number(durationMs.toFixed(1)),
      });
    }
  }
}

export function appendAuthTimings(timings: DashboardTiming[], req: Request) {
  const authSteps = ((req as any).requestTiming?.steps || []).filter((step: any) =>
    typeof step?.name === 'string' && step.name.startsWith('auth.'),
  );

  authSteps.forEach((step: any) => {
    timings.push({
      name: step.name,
      durationMs: Number(step.ms || 0),
    });
  });
}
