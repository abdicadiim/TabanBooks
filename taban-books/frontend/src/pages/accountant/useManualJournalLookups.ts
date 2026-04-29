import { useEffect, useMemo, useState } from "react";

import { getAccounts } from "./accountantModel";
import { MANUAL_JOURNAL_CURRENCIES } from "./manualJournalConfig";
import type {
  ManualJournalAccount,
  ManualJournalContact,
  ManualJournalCurrency,
  ManualJournalLocationOption,
  ManualJournalProjectOption,
  ManualJournalReportingTagOption,
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
  locationsAPI,
  projectsAPI,
  reportingTagsAPI,
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
  const [availableLocations, setAvailableLocations] = useState<
    ManualJournalLocationOption[]
  >([]);
  const [availableProjects, setAvailableProjects] = useState<
    ManualJournalProjectOption[]
  >([]);
  const [availableReportingTags, setAvailableReportingTags] = useState<
    ManualJournalReportingTagOption[]
  >([]);
  const [availableTaxes, setAvailableTaxes] = useState<ManualJournalTax[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<any>({});

  const normalizeText = (value: unknown) => String(value || "").trim();
  const isActiveRecord = (record: any) => {
    if (typeof record?.isActive === "boolean") {
      return record.isActive;
    }

    const status = normalizeText(record?.status).toLowerCase();
    return !status || !["inactive", "disabled", "archived", "deleted"].includes(status);
  };
  const normalizeReportingTagAppliesTo = (tag: any): string[] => {
    const direct = Array.isArray(tag?.appliesTo) ? tag.appliesTo : [];
    const fromModulesObject = tag?.modules && typeof tag.modules === "object"
      ? Object.keys(tag.modules).filter((key) => Boolean(tag.modules[key]))
      : [];
    const fromModuleSettings = tag?.moduleSettings && typeof tag.moduleSettings === "object"
      ? Object.keys(tag.moduleSettings).filter((key) => Boolean(tag.moduleSettings[key]))
      : [];
    const fromAssociations = Array.isArray(tag?.associations) ? tag.associations : [];
    const fromModulesList = Array.isArray(tag?.modulesList) ? tag.modulesList : [];

    return [...direct, ...fromModulesObject, ...fromModuleSettings, ...fromAssociations, ...fromModulesList]
      .map((value: any) => normalizeText(value).toLowerCase())
      .filter(Boolean);
  };
  const normalizeReportingTagOptions = (tag: any): string[] => {
    const candidates = Array.isArray(tag?.options)
      ? tag.options
      : Array.isArray(tag?.values)
        ? tag.values
        : [];
    const seen = new Set<string>();

    return candidates
      .map((option: any) =>
        normalizeText(
          typeof option === "string"
            ? option
            : option?.value ?? option?.label ?? option?.name ?? option?.option,
        ),
      )
      .filter(Boolean)
      .filter((value: string) => {
        const key = value.toLowerCase();
        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
  };

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
    const loadLocations = async () => {
      try {
        const response = await locationsAPI.getAll();
        const rows = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        const normalizedLocations = rows
          .filter((row: any) => isActiveRecord(row))
          .map((row: any) => {
            const label = normalizeText(
              row?.locationName ||
                row?.location_name ||
                row?.name ||
                row?.label,
            );

            return {
              id: normalizeText(
                row?._id ||
                  row?.id ||
                  row?.location_id ||
                  row?.locationId ||
                  label,
              ),
              label,
              isDefault: Boolean(
                row?.isDefault ||
                  row?.default ||
                  label.toLowerCase() === "head office",
              ),
            };
          })
          .filter(
            (location: ManualJournalLocationOption) =>
              location.id && location.label,
          )
          .sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.label.localeCompare(b.label);
          });

        setAvailableLocations(
          normalizedLocations.length > 0
            ? normalizedLocations
            : [{ id: "head-office", label: "Head Office", isDefault: true }],
        );
      } catch (error) {
        console.error("Error fetching locations:", error);
        setAvailableLocations([
          { id: "head-office", label: "Head Office", isDefault: true },
        ]);
      }
    };

    loadLocations();
  }, []);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await projectsAPI.getAll();
        const rows = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        const normalizedProjects = rows
          .filter((row: any) => isActiveRecord(row))
          .map((row: any) => ({
            id: normalizeText(row?._id || row?.id),
            name: normalizeText(row?.name || row?.projectName),
          }))
          .filter(
            (project: ManualJournalProjectOption) => project.id && project.name,
          )
          .sort((a, b) => a.name.localeCompare(b.name));

        setAvailableProjects(normalizedProjects);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setAvailableProjects([]);
      }
    };

    loadProjects();
  }, []);

  useEffect(() => {
    const loadReportingTags = async () => {
      try {
        const response = await reportingTagsAPI.getAll({ limit: 10000 });
        const rows = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        const normalizedTags = rows
          .filter((row: any) => isActiveRecord(row))
          .map((row: any) => {
            const appliesTo = normalizeReportingTagAppliesTo(row);

            return {
              id: normalizeText(
                row?._id || row?.id || row?.tagId || row?.tag_id,
              ),
              name: normalizeText(row?.name || row?.tagName || row?.label),
              isRequired: Boolean(
                row?.isRequired || row?.required || row?.isMandatory,
              ),
              moduleLevel:
                row?.moduleLevel && typeof row.moduleLevel === "object"
                  ? row.moduleLevel
                  : undefined,
              options: normalizeReportingTagOptions(row),
              appliesTo,
            };
          })
          .filter(
            (tag: ManualJournalReportingTagOption) =>
              tag.id && tag.name && Array.isArray(tag.options) && tag.options.length > 0,
          )
          .sort((a, b) => a.name.localeCompare(b.name));

        const journalTags = normalizedTags.filter((tag: any) =>
          Array.isArray(tag.appliesTo)
            ? tag.appliesTo.some(
                (entry: string) => entry === "journals" || entry === "journal",
              )
            : false,
        );

        setAvailableReportingTags(
          (journalTags.length > 0 ? journalTags : normalizedTags).map(
            ({ appliesTo, ...tag }: any) => tag,
          ),
        );
      } catch (error) {
        console.error("Error fetching reporting tags:", error);
        setAvailableReportingTags([]);
      }
    };

    loadReportingTags();
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
    availableLocations,
    availableProjects,
    availableReportingTags,
    availableTaxes,
    baseCurrency,
    contacts,
    groupedAccounts,
    taxOptions,
  };
}
