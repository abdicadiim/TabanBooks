import { useEffect, useMemo, useState } from "react";

import { getAccounts } from "./accountantModel";
import { MANUAL_JOURNAL_CURRENCIES } from "./manualJournalConfig";
import type {
  ManualJournalAccount,
  ManualJournalContact,
  ManualJournalCurrency,
  ManualJournalTax,
} from "./manualJournalTypes";
import {
  buildManualJournalAccountLookup,
  buildManualJournalContacts,
  buildManualJournalTaxOptions,
  extractManualJournalArray,
  groupManualJournalAccounts,
  mergeManualJournalAccounts,
} from "./manualJournalUtils";
import {
  bankAccountsAPI,
  currenciesAPI,
  customersAPI,
  taxesAPI,
  vendorsAPI,
} from "../../services/api";

export function useManualJournalLookups() {
  const [allAccounts, setAllAccounts] = useState<ManualJournalAccount[]>([]);
  const [availableContacts, setAvailableContacts] = useState<
    ManualJournalContact[]
  >([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<
    ManualJournalCurrency[]
  >(MANUAL_JOURNAL_CURRENCIES);
  const [availableTaxes, setAvailableTaxes] = useState<ManualJournalTax[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<any>({});

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accountsResponse = await getAccounts({ limit: 1000 });
        const chartAccounts = extractManualJournalArray(accountsResponse);

        let bankAccounts: any[] = [];
        try {
          const bankAccountsResponse = await bankAccountsAPI.getAll({
            per_page: 1000,
          });
          bankAccounts = extractManualJournalArray(bankAccountsResponse);
        } catch (error) {
          console.warn("Error fetching bank accounts:", error);
        }

        setAllAccounts(mergeManualJournalAccounts(chartAccounts, bankAccounts));
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };

    loadAccounts();
  }, []);

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const [customersResponse, vendorsResponse] = await Promise.all([
          customersAPI.getAll({ limit: 1000 }),
          vendorsAPI.getAll({ limit: 1000 }),
        ]);

        setAvailableContacts(
          buildManualJournalContacts(
            customersResponse.data || [],
            vendorsResponse.data || [],
          ),
        );
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    loadContacts();
  }, []);

  useEffect(() => {
    const loadTaxes = async () => {
      try {
        const response = await taxesAPI.getAll();
        if (response?.success) {
          setAvailableTaxes(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching taxes:", error);
      }
    };

    loadTaxes();
  }, []);

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await currenciesAPI.getAll();
        if (response?.success) {
          setAvailableCurrencies(response.data || MANUAL_JOURNAL_CURRENCIES);
        }

        const baseCurrencyResponse = await currenciesAPI.getBaseCurrency();
        if (baseCurrencyResponse?.success && baseCurrencyResponse.data) {
          setBaseCurrency(baseCurrencyResponse.data);
        }
      } catch (error) {
        console.error("Error fetching currencies:", error);
      }
    };

    loadCurrencies();
  }, []);

  const groupedAccounts = useMemo(
    () => groupManualJournalAccounts(allAccounts),
    [allAccounts],
  );

  const accountLookup = useMemo(
    () => buildManualJournalAccountLookup(allAccounts),
    [allAccounts],
  );

  const contacts = useMemo(
    () => availableContacts.map((contact) => contact.name),
    [availableContacts],
  );

  const taxOptions = useMemo(
    () => buildManualJournalTaxOptions(availableTaxes),
    [availableTaxes],
  );

  return {
    accountLookup,
    allAccounts,
    availableContacts,
    availableCurrencies,
    availableTaxes,
    baseCurrency,
    contacts,
    groupedAccounts,
    taxOptions,
  };
}
