import { filterActiveRecords } from "./activeFilters";

const pickFirstArray = (...values: any[]): any[] => {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
};

export const getChartAccountsFromResponse = (response: any): any[] =>
  filterActiveRecords(
    pickFirstArray(response, response?.data, response?.accounts, response?.data?.data)
  );

export const getBankAccountsFromResponse = (response: any): any[] =>
  filterActiveRecords(
    pickFirstArray(
      response,
      response?.bankaccounts,
      response?.data,
      response?.accounts,
      response?.data?.data
    )
  );

export const getAccountOptionLabel = (account: any): string =>
  String(account?.displayName || account?.accountName || account?.name || "").trim();

const isBankLikeAccount = (account: any): boolean => {
  const type = String(account?.accountType || "").toLowerCase();
  return type === "bank" || type === "credit_card";
};

const getAccountIdentity = (account: any): string => {
  const label = getAccountOptionLabel(account).toLowerCase();
  const id = String(account?._id || account?.id || "").trim().toLowerCase();
  return label || id;
};

export const mergeAccountOptions = (...collections: any[][]): any[] => {
  const seen = new Map<string, number>();
  const merged: any[] = [];

  collections.forEach((collection) => {
    if (!Array.isArray(collection)) return;

    collection.forEach((account) => {
      const identity = getAccountIdentity(account);
      if (!identity) return;

      const existingIndex = seen.get(identity);
      if (existingIndex !== undefined) {
        const existingAccount = merged[existingIndex];
        if (isBankLikeAccount(account) && !isBankLikeAccount(existingAccount)) {
          merged[existingIndex] = account;
        }
        return;
      }

      seen.set(identity, merged.length);
      merged.push(account);
    });
  });

  return merged;
};
