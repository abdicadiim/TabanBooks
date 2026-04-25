import {
  CURRENCY_ADJUSTMENT_EMPTY_NOTES_LABEL,
  type CurrencyAdjustmentPeriod,
} from "./currencyAdjustmentConfig";
import type {
  CurrencyAdjustment,
  CurrencyAdjustmentIdentifier,
} from "./currencyAdjustmentTypes";

const SHORT_MONTHS = [
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

const SHORT_MONTH_LOOKUP = new Map<string, number>(
  SHORT_MONTHS.map((month, index) => [month, index]),
);

const createLocalDate = (
  year: number,
  monthIndex: number,
  day: number,
): Date | null => {
  const date = new Date(year, monthIndex, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatCurrencyAdjustmentMoney = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export const formatCurrencyAdjustmentSignedValue = (
  value: number,
  suffix?: string,
): string => {
  const signedAmount = `${value >= 0 ? "+" : ""}${formatCurrencyAdjustmentMoney(
    value,
  )}`;

  return suffix ? `${signedAmount} ${suffix}` : signedAmount;
};

export const getCurrencyAdjustmentIdentifier = (
  adjustment?: Pick<CurrencyAdjustment, "_id" | "id"> | null,
): string | null => {
  if (!adjustment) return null;
  if (adjustment._id) return String(adjustment._id);
  if (adjustment.id !== undefined && adjustment.id !== null) {
    return String(adjustment.id);
  }
  return null;
};

export const matchesCurrencyAdjustmentId = (
  adjustment: Pick<CurrencyAdjustment, "_id" | "id"> | null | undefined,
  candidateId?: CurrencyAdjustmentIdentifier | null,
): boolean => {
  if (candidateId === undefined || candidateId === null) return false;
  const adjustmentId = getCurrencyAdjustmentIdentifier(adjustment);
  return adjustmentId === String(candidateId);
};

export const getCurrencyAdjustmentSequenceNumber = (
  adjustments: Array<Pick<CurrencyAdjustment, "_id" | "id">>,
  candidateId?: CurrencyAdjustmentIdentifier | null,
): number | null => {
  if (candidateId === undefined || candidateId === null) return null;
  const index = adjustments.findIndex((adjustment) =>
    matchesCurrencyAdjustmentId(adjustment, candidateId),
  );
  return index === -1 ? null : index + 1;
};

export const getCurrencyCode = (currency: string): string => {
  const [code] = currency.split(" - ");
  return code?.trim() || currency;
};

export const parseCurrencyAdjustmentDate = (
  value?: string,
): Date | null => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    const [year, month, day] = trimmedValue.split("-").map(Number);
    return createLocalDate(year, month - 1, day);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmedValue)) {
    const [day, month, year] = trimmedValue.split("/").map(Number);
    return createLocalDate(year, month - 1, day);
  }

  const namedMonthParts = trimmedValue.split(" ");
  if (namedMonthParts.length === 3) {
    const [dayText, monthText, yearText] = namedMonthParts;
    const monthIndex = SHORT_MONTH_LOOKUP.get(monthText);
    const day = Number(dayText);
    const year = Number(yearText);
    if (monthIndex !== undefined && !Number.isNaN(day) && !Number.isNaN(year)) {
      return createLocalDate(year, monthIndex, day);
    }
  }

  const parsedDate = new Date(trimmedValue);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return createLocalDate(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
  );
};

export const toCurrencyAdjustmentInputDate = (value: string): string => {
  const parsedDate = parseCurrencyAdjustmentDate(value);
  if (!parsedDate) return "";

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const isCurrencyAdjustmentInPeriod = (
  dateText: string,
  period: CurrencyAdjustmentPeriod,
  now: Date = new Date(),
): boolean => {
  if (period === "All" || period === "Custom") return true;

  const parsedDate = parseCurrencyAdjustmentDate(dateText);
  if (!parsedDate) return false;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const testDate = new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
  );

  if (period === "Today") {
    return testDate.getTime() === today.getTime();
  }

  if (period === "This Week") {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    return testDate >= weekStart && testDate <= today;
  }

  if (period === "This Month") {
    return (
      testDate.getMonth() === today.getMonth() &&
      testDate.getFullYear() === today.getFullYear()
    );
  }

  if (period === "This Quarter") {
    const quarterStart = new Date(
      today.getFullYear(),
      Math.floor(today.getMonth() / 3) * 3,
      1,
    );
    return testDate >= quarterStart && testDate <= today;
  }

  return testDate.getFullYear() === today.getFullYear();
};

export const filterCurrencyAdjustmentsByPeriod = (
  adjustments: CurrencyAdjustment[],
  period: CurrencyAdjustmentPeriod,
): CurrencyAdjustment[] =>
  adjustments.filter((adjustment) =>
    isCurrencyAdjustmentInPeriod(adjustment.date, period),
  );

export const formatCurrencyAdjustmentCreatedDate = (
  createdAt?: string,
): string | null => {
  if (!createdAt) return null;

  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) return null;

  return createdDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const getCurrencyAdjustmentNotes = (notes?: string): string =>
  notes?.trim() || CURRENCY_ADJUSTMENT_EMPTY_NOTES_LABEL;

export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
