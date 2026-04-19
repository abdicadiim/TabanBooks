import { isRecordActive } from "../../purchases/shared/activeFilters";
import { CHART_MAX_VALUE, type AccountFilterOption } from "./constants";
import type { BankAccount } from "./types";

const chartStartDate = new Date(2024, 10, 25);
const chartEndDate = new Date(2024, 11, 23);
const chartDayIncrement = 2;

export const getAccountId = (account: BankAccount): string =>
  String(
    account._id ||
      account.id ||
      account.accountNumber ||
      account.accountCode ||
      account.accountName ||
      "",
  ).trim();

export const getAccountDisplayName = (account: BankAccount): string =>
  String(account.accountName || "Unnamed Account").trim();

export const getAccountCurrencySymbol = (account: BankAccount): string =>
  account.currencySymbol || "KSh";

export const getDisplayedBankBalance = (account: BankAccount): number => {
  const bankBalance = Number(account.bankBalance || 0);
  const booksBalance = Number(account.balance || 0);

  if (bankBalance === 0 && booksBalance !== 0) {
    return booksBalance;
  }

  return bankBalance;
};

export const formatCurrencyAmount = (symbol: string, value: number): string =>
  `${symbol}${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  })}`;

export const formatKesCurrency = (value: number): string =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "KES",
  });

export const matchesAccountStatusFilter = (
  account: BankAccount,
  filter: AccountFilterOption,
): boolean => {
  if (filter === "All Accounts") {
    return true;
  }

  const isActive = isRecordActive(account);
  return filter === "Active Accounts" ? isActive : !isActive;
};

export const buildChartDates = (): string[] => {
  const dates: string[] = [];
  const currentDate = new Date(chartStartDate);

  while (currentDate <= chartEndDate) {
    dates.push(
      `${currentDate.getDate()} ${currentDate.toLocaleString("default", {
        month: "short",
      })}`,
    );
    currentDate.setDate(currentDate.getDate() + chartDayIncrement);
  }

  return dates;
};

export const getCashInHandValue = (dateIndex: number): number => {
  const date = new Date(chartStartDate);
  date.setDate(date.getDate() + dateIndex * chartDayIncrement);

  const day = date.getDate();
  const month = date.getMonth();

  if (month < 11 || (month === 10 && day < 1)) {
    return 0;
  }

  if (month === 11 && day === 1) {
    return 0;
  }

  if (month === 11 && day > 1 && day < 3) {
    return (day - 1) * (3578 / 2);
  }

  return 3578;
};

export const getCashInHandChartPoints = (chartDates: string[]): string =>
  chartDates
    .map((_, index) => {
      const value = getCashInHandValue(index);
      const x = (index / (chartDates.length - 1)) * 100;
      const y = 100 - (value / CHART_MAX_VALUE) * 100;
      return `${x},${y}`;
    })
    .join(" ");
