export type SyncVersionStamp = {
  version_id: string;
  last_updated: string;
};

export function createVersionStamp(): SyncVersionStamp {
  return {
    version_id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `sync-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    last_updated: new Date().toISOString(),
  };
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function attachVersionStamp<TValue>(value: TValue, stamp = createVersionStamp()) {
  if (!isPlainObject(value)) {
    return value;
  }

  return {
    ...value,
    version_id: String((value as Record<string, unknown>).version_id || stamp.version_id),
    last_updated: String((value as Record<string, unknown>).last_updated || stamp.last_updated),
  } as TValue & SyncVersionStamp;
}

export function createVersionedEnvelope<TValue>(value: TValue, stamp = createVersionStamp()) {
  return {
    version_id: String((value as Record<string, unknown>)?.version_id || stamp.version_id),
    last_updated: String((value as Record<string, unknown>)?.last_updated || stamp.last_updated),
    value,
  };
}

