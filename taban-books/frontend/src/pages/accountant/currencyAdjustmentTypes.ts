export type CurrencyAdjustmentIdentifier = string | number;

export interface CurrencyAdjustmentAffectedAccount {
  accountId: string;
  accountName: string;
  balanceFCY: number;
  balanceBCY: number;
  revaluedBalanceBCY: number;
  gainOrLossBCY: number;
  selected?: boolean;
}

export interface CurrencyAdjustment {
  _id?: string;
  id?: CurrencyAdjustmentIdentifier;
  date: string;
  currency: string;
  previousExchangeRate?: number;
  exchangeRate: number;
  gainOrLoss: number;
  notes?: string;
  createdAt?: string;
  affectedAccounts?: CurrencyAdjustmentAffectedAccount[];
}

export interface CurrencyAdjustmentPreviewResult {
  currency: string;
  previousExchangeRate: number;
  exchangeRate: number;
  affectedAccounts: CurrencyAdjustmentAffectedAccount[];
  totalGainOrLoss: number;
}
