import {
  DEFAULT_TRANSACTION_LOCK_DATE,
  TRANSACTION_LOCK_STORAGE_KEY,
  TRANSACTION_LOCKING_NEGATIVE_STOCK_KEY,
} from "./config";
import type { NegativeStockOption, TransactionLockMap, TransactionLockRecord } from "./types";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LEGACY_DATE_PATTERN = /^(\d{1,2})\s([A-Za-z]{3})\s(\d{4})$/;

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function padDateSegment(value: number) {
  return value.toString().padStart(2, "0");
}

function toIsoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${padDateSegment(monthIndex + 1)}-${padDateSegment(day)}`;
}

export function normalizeLockDate(value?: string | null) {
  if (!value) {
    return DEFAULT_TRANSACTION_LOCK_DATE;
  }

  if (ISO_DATE_PATTERN.test(value)) {
    return value;
  }

  const legacyMatch = value.match(LEGACY_DATE_PATTERN);
  if (legacyMatch) {
    const day = Number.parseInt(legacyMatch[1], 10);
    const monthIndex = MONTH_LABELS.indexOf(legacyMatch[2]);
    const year = Number.parseInt(legacyMatch[3], 10);
    if (monthIndex >= 0) {
      return toIsoDate(year, monthIndex, day);
    }
  }

  const parsedDate = new Date(value);
  if (!Number.isNaN(parsedDate.getTime())) {
    return toIsoDate(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
    );
  }

  return DEFAULT_TRANSACTION_LOCK_DATE;
}

export function formatLockDate(value?: string | null) {
  const normalizedDate = normalizeLockDate(value);
  const [year, month, day] = normalizedDate.split("-");
  const monthIndex = Number.parseInt(month, 10) - 1;

  if (monthIndex < 0 || monthIndex >= MONTH_LABELS.length) {
    return normalizedDate;
  }

  return `${Number.parseInt(day, 10)} ${MONTH_LABELS[monthIndex]} ${year}`;
}

function normalizeStoredLockRecord(value: unknown): TransactionLockRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<TransactionLockRecord>;

  return {
    date: normalizeLockDate(record.date),
    reason: typeof record.reason === "string" ? record.reason : "",
    lockedAt:
      typeof record.lockedAt === "string" && record.lockedAt.length > 0
        ? record.lockedAt
        : new Date().toISOString(),
  };
}

export function readStoredTransactionLocks(): TransactionLockMap {
  if (!hasLocalStorage()) {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(TRANSACTION_LOCK_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsedValue: unknown = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.entries(parsedValue).reduce<TransactionLockMap>((locks, entry) => {
      const [moduleName, record] = entry;
      const normalizedRecord = normalizeStoredLockRecord(record);
      if (normalizedRecord) {
        locks[moduleName] = normalizedRecord;
      }
      return locks;
    }, {});
  } catch {
    return {};
  }
}

export function writeStoredTransactionLocks(locks: TransactionLockMap) {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    TRANSACTION_LOCK_STORAGE_KEY,
    JSON.stringify(locks),
  );
}

export function readStoredNegativeStockOption(): NegativeStockOption {
  if (!hasLocalStorage()) {
    return "allow";
  }

  const value = window.localStorage.getItem(TRANSACTION_LOCKING_NEGATIVE_STOCK_KEY);
  return value === "restrict" ? "restrict" : "allow";
}

export function writeStoredNegativeStockOption(option: NegativeStockOption) {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.setItem(TRANSACTION_LOCKING_NEGATIVE_STOCK_KEY, option);
}
