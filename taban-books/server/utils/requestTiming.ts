import { Request } from "express";

export interface RequestTimingStep {
  name: string;
  ms: number;
  meta?: Record<string, unknown>;
}

export interface RequestTimingState {
  startedAt: number;
  steps: RequestTimingStep[];
}

type TimedRequest = Request & {
  requestTiming?: RequestTimingState;
};

export const ensureRequestTiming = (req: TimedRequest): RequestTimingState => {
  if (!req.requestTiming) {
    req.requestTiming = {
      startedAt: Date.now(),
      steps: [],
    };
  }

  return req.requestTiming;
};

export const recordRequestTiming = (
  req: TimedRequest,
  name: string,
  startedAt: number,
  meta?: Record<string, unknown>
): number => {
  const state = ensureRequestTiming(req);
  const ms = Date.now() - startedAt;
  state.steps.push({ name, ms, meta });
  return ms;
};

export const measureRequestStep = async <T>(
  req: TimedRequest,
  name: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>
): Promise<T> => {
  const startedAt = Date.now();
  const result = await fn();
  recordRequestTiming(req, name, startedAt, meta);
  return result;
};

export const logRequestTiming = (
  req: TimedRequest,
  context: Record<string, unknown> = {}
): void => {
  const state = ensureRequestTiming(req);
  const totalMs = Date.now() - state.startedAt;
  const slowestStep = state.steps.reduce<RequestTimingStep | null>((slowest, step) => {
    if (!slowest || step.ms > slowest.ms) return step;
    return slowest;
  }, null);

  console.log(
    `[request-timing] ${JSON.stringify({
      method: req.method,
      path: req.originalUrl || req.url,
      totalMs,
      slowestStep: slowestStep?.name || null,
      slowestMs: slowestStep?.ms || 0,
      steps: state.steps.map((step) => ({
        name: step.name,
        ms: step.ms,
        ...(step.meta ? { meta: step.meta } : {}),
      })),
      ...context,
    })}`
  );
};
