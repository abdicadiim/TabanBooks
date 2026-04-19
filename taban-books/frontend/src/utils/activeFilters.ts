const toNormalizedString = (value: unknown): string => String(value ?? "").trim().toLowerCase();

const truthyByString = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  const normalized = toNormalizedString(value);
  if (!normalized) return false;
  return ["true", "1", "yes", "active", "enabled"].includes(normalized);
};

const falseyByString = (value: unknown): boolean => {
  if (typeof value === "boolean") return !value;
  const normalized = toNormalizedString(value);
  if (!normalized) return false;
  return ["false", "0", "no", "inactive", "disabled"].includes(normalized);
};

const ACTIVE_STATUSES = new Set(["active", "enabled"]);
const INACTIVE_STATUSES = new Set([
  "inactive",
  "disabled",
  "archived",
  "deleted",
  "stopped",
  "expired",
]);

export const isRecordActive = (record: unknown): boolean => {
  if (!record || typeof record !== "object") return true;

  if ("isInactive" in record && truthyByString((record as Record<string, unknown>).isInactive)) return false;

  if ("isActive" in record) return !falseyByString((record as Record<string, unknown>).isActive);
  if ("active" in record) return !falseyByString((record as Record<string, unknown>).active);

  if ("status" in record) {
    const normalizedStatus = toNormalizedString((record as Record<string, unknown>).status);
    if (!normalizedStatus) return true;
    if (INACTIVE_STATUSES.has(normalizedStatus)) return false;
    if (ACTIVE_STATUSES.has(normalizedStatus)) return true;
  }

  return true;
};

export const filterActiveRecords = <T>(records: T[] | undefined | null): T[] => {
  if (!Array.isArray(records)) return [];
  return records.filter((record) => isRecordActive(record));
};
