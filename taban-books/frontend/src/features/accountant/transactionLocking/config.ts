import type { NegativeStockOption, TransactionModuleDefinition } from "./types";

export const DEFAULT_TRANSACTION_LOCK_DATE = "2025-12-27";
export const TRANSACTION_LOCK_STORAGE_KEY = "transactionLocks";
export const TRANSACTION_LOCKING_NEGATIVE_STOCK_KEY =
  "transactionLockingNegativeStock";

export const TRANSACTION_MODULES: TransactionModuleDefinition[] = [
  {
    name: "Sales",
    accentColor: "#156372",
    surfaceColor: "#e0f2fe",
    description:
      "Prevent edits to invoices, customer payments, returns, and other sales transactions created on or before the lock date.",
  },
  {
    name: "Purchases",
    accentColor: "#0f9d76",
    surfaceColor: "#dcfce7",
    description:
      "Freeze bills, vendor credits, expense entries, and purchase activity that belongs to the closed period.",
  },
  {
    name: "Banking",
    accentColor: "#7c3aed",
    surfaceColor: "#ede9fe",
    description:
      "Lock reconciliations, transfers, deposits, and withdrawals so historical cash activity stays unchanged.",
  },
  {
    name: "Accountant",
    accentColor: "#d97706",
    surfaceColor: "#fef3c7",
    description:
      "Protect journal entries and accountant-led adjustments after the reporting period has been reviewed.",
  },
];

export const NEGATIVE_STOCK_OPTION_COPY: Record<
  NegativeStockOption,
  { title: string; description: string }
> = {
  allow: {
    title: "Allow transaction locking with negative stock",
    description:
      "The system may use temporary purchase rates until stock is replenished, and later purchases can still change the historical cost of goods sold.",
  },
  restrict: {
    title: "Restrict transaction locking with negative stock",
    description:
      "Users must correct stock levels before locking a period so all sales and inventory valuations reflect final cost information.",
  },
};
