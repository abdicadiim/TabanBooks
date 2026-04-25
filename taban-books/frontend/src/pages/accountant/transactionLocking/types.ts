export type NegativeStockOption = "allow" | "restrict";

export interface TransactionModuleDefinition {
  name: string;
  accentColor: string;
  surfaceColor: string;
  description: string;
}

export interface TransactionLockRecord {
  date: string;
  reason: string;
  lockedAt: string;
}

export type TransactionLockMap = Record<string, TransactionLockRecord>;

export interface TransactionLockDialogState {
  open: boolean;
  moduleName: string | null;
  date: string;
  reason: string;
}
