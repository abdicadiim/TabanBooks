import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  getJournalById,
  getJournalTemplates,
  saveJournal,
} from "../accountantModel";
import type {
  ManualJournal,
  ManualJournalEntry,
} from "../manualJournalTypes";
import { useManualJournalLookups } from "../useManualJournalLookups";
import {
  createDefaultManualJournalForm,
  createEmptyManualJournalEntry,
  createInitialManualJournalEntries,
  DEFAULT_MANUAL_JOURNAL_NEW_TAX,
} from "./config";
import type {
  ManualJournalNewTaxState,
  ManualJournalTemplateRecord,
} from "./types";
import {
  applyTemplateToManualJournalForm,
  buildManualJournalPayload,
  calculateManualJournalTotals,
  getManualJournalTemplateLines,
  mapLinesToManualJournalEntries,
} from "./utils";

type ManualJournalLocationState = {
  templateData?: ManualJournalTemplateRecord;
} | null;

export function useManualJournalEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const handledTemplateQueryRef = useRef(false);

  const [formData, setFormData] = useState(createDefaultManualJournalForm);
  const [entries, setEntries] = useState<ManualJournalEntry[]>(
    createInitialManualJournalEntries,
  );
  const [attachments, setAttachments] = useState<File[]>([]);
  const [journal, setJournal] = useState<ManualJournal | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingJournal, setIsLoadingJournal] = useState(isEditMode);
  const [isTemplateSidebarOpen, setIsTemplateSidebarOpen] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [journalTemplates, setJournalTemplates] = useState<
    ManualJournalTemplateRecord[]
  >([]);
  const [taxOptions, setTaxOptions] = useState<string[]>([]);
  const [isNewTaxModalOpen, setIsNewTaxModalOpen] = useState(false);
  const [newTaxForm, setNewTaxForm] = useState<ManualJournalNewTaxState>(
    DEFAULT_MANUAL_JOURNAL_NEW_TAX,
  );
  const [newTaxEntryId, setNewTaxEntryId] = useState<number | null>(null);

  const {
    allAccounts,
    availableContacts,
    availableCurrencies,
    availableLocations,
    availableProjects,
    availableReportingTags,
    availableTaxes,
    baseCurrency,
    groupedAccounts,
    taxOptions: loadedTaxOptions,
  } = useManualJournalLookups();

  const totals = useMemo(() => calculateManualJournalTotals(entries), [entries]);

  useEffect(() => {
    setTaxOptions((current) =>
      Array.from(new Set([...loadedTaxOptions, ...current])),
    );
  }, [loadedTaxOptions]);

  useEffect(() => {
    if (!isEditMode && baseCurrency?.code) {
      setFormData((current) =>
        current.currency === baseCurrency.code
          ? current
          : { ...current, currency: baseCurrency.code },
      );
    }
  }, [baseCurrency?.code, isEditMode]);

  useEffect(() => {
    if (!isEditMode || !id) {
      setIsLoadingJournal(false);
      return;
    }

    let cancelled = false;

    const loadJournal = async () => {
      setIsLoadingJournal(true);
      try {
        const loadedJournal = await getJournalById(id);
        if (!loadedJournal || cancelled) {
          return;
        }

        setJournal(loadedJournal);
        setFormData({
          date: loadedJournal.date
            ? new Date(loadedJournal.date).toISOString().split("T")[0]
            : createDefaultManualJournalForm().date,
          journalNumber:
            loadedJournal.journalNumber ||
            loadedJournal.entryNumber ||
            loadedJournal.id ||
            "1",
          reference:
            loadedJournal.reference ||
            loadedJournal.referenceNumber ||
            "",
          notes: loadedJournal.notes || loadedJournal.description || "",
          reportingMethod:
            loadedJournal.reportingMethod || "accrual-and-cash",
          currency: loadedJournal.currency || baseCurrency?.code || "SOS",
        });

        const loadedEntries = mapLinesToManualJournalEntries(
          getManualJournalTemplateLines(loadedJournal),
        );
        setEntries(
          loadedEntries.length > 0
            ? loadedEntries
            : createInitialManualJournalEntries(),
        );
      } finally {
        if (!cancelled) {
          setIsLoadingJournal(false);
        }
      }
    };

    loadJournal();

    return () => {
      cancelled = true;
    };
  }, [baseCurrency?.code, id, isEditMode]);

  useEffect(() => {
    const state = location.state as ManualJournalLocationState;
    if (!state?.templateData) {
      return;
    }

    const template = state.templateData;
    setFormData((current) =>
      applyTemplateToManualJournalForm(current, template),
    );

    const templateEntries = mapLinesToManualJournalEntries(
      getManualJournalTemplateLines(template),
    );
    if (templateEntries.length > 0) {
      setEntries(templateEntries);
    }

    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (handledTemplateQueryRef.current) {
      return;
    }

    const params = new URLSearchParams(location.search);
    if (params.get("fromTemplate") === "true") {
      handledTemplateQueryRef.current = true;
      setIsTemplateSidebarOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (!isTemplateSidebarOpen) {
      return;
    }

    let cancelled = false;

    const loadTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const response: any = await getJournalTemplates({
          isActive: true,
          limit: 200,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (!cancelled) {
          setJournalTemplates(
            response?.success ? response.data || [] : [],
          );
        }
      } catch {
        if (!cancelled) {
          setJournalTemplates([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTemplates(false);
        }
      }
    };

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [isTemplateSidebarOpen]);

  const updateFormField = (field: keyof typeof formData, value: string) => {
    setErrorMessage("");
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const updateEntry = (
    entryId: number,
    field: keyof ManualJournalEntry,
    value: string,
  ) => {
    setErrorMessage("");
    setEntries((current) =>
      current.map((entry) =>
        entry.id === entryId ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const selectAccount = (entryId: number, accountId: string) => {
    const selectedAccount = allAccounts.find(
      (account) => String(account.id || account._id || "") === accountId,
    );

    setEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              accountId,
              account:
                selectedAccount?.accountName ||
                selectedAccount?.name ||
                "",
            }
          : entry,
      ),
    );
  };

  const addEntry = () => {
    const nextId = Math.max(0, ...entries.map((entry) => entry.id)) + 1;
    setEntries((current) => [...current, createEmptyManualJournalEntry(nextId)]);
  };

  const removeEntry = (entryId: number) => {
    setEntries((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((entry) => entry.id !== entryId);
    });
  };

  const addAttachments = (files: FileList | null) => {
    if (!files) {
      return;
    }

    const nextFiles = Array.from(files);
    if (attachments.length + nextFiles.length > 5) {
      window.alert("You can upload a maximum of 5 files.");
      return;
    }

    setAttachments((current) => [...current, ...nextFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index));
  };

  const openTemplateSidebar = () => {
    setIsTemplateSidebarOpen(true);
  };

  const closeTemplateSidebar = () => {
    setIsTemplateSidebarOpen(false);
  };

  const applyTemplate = (template: ManualJournalTemplateRecord) => {
    setFormData((current) =>
      applyTemplateToManualJournalForm(current, template),
    );

    const templateEntries = mapLinesToManualJournalEntries(
      getManualJournalTemplateLines(template),
    );
    if (templateEntries.length > 0) {
      setEntries(templateEntries);
    }

    setIsTemplateSidebarOpen(false);
  };

  const openNewTaxModal = (entryId?: number) => {
    setNewTaxEntryId(entryId ?? null);
    setNewTaxForm(DEFAULT_MANUAL_JOURNAL_NEW_TAX);
    setIsNewTaxModalOpen(true);
  };

  const closeNewTaxModal = () => {
    setNewTaxEntryId(null);
    setNewTaxForm(DEFAULT_MANUAL_JOURNAL_NEW_TAX);
    setIsNewTaxModalOpen(false);
  };

  const updateNewTaxField = (
    field: keyof ManualJournalNewTaxState,
    value: string | boolean,
  ) => {
    setNewTaxForm((current) => ({ ...current, [field]: value }));
  };

  const saveNewTax = () => {
    if (!newTaxForm.name.trim() || !newTaxForm.rate.trim()) {
      return;
    }

    setTaxOptions((current) => {
      if (current.includes(newTaxForm.name.trim())) {
        return current;
      }

      return [...current, newTaxForm.name.trim()];
    });

    if (newTaxEntryId !== null) {
      updateEntry(newTaxEntryId, "tax", newTaxForm.name.trim());
    }

    closeNewTaxModal();
  };

  const saveCurrentJournal = async (status: "draft" | "posted") => {
    const result = buildManualJournalPayload({
      attachmentsCount: attachments.length,
      availableContacts,
      availableLocations,
      availableProjects,
      availableTaxes,
      entries,
      formData,
      journal,
      status,
    });

    if (result.error || !result.payload) {
      const message = result.error || "Unable to save the journal.";
      setErrorMessage(message);
      window.alert(message);
      return;
    }

    setErrorMessage("");
    setIsSaving(true);
    try {
      const success = await saveJournal(result.payload);
      if (success) {
        navigate("/accountant/manual-journals");
      } else {
        const message = "Failed to save journal.";
        setErrorMessage(message);
        window.alert(message);
      }
    } catch (error: any) {
      const message = error?.message || "Failed to save journal.";
      setErrorMessage(message);
      window.alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    attachments,
    availableContacts,
    availableCurrencies,
    availableLocations,
    availableProjects,
    availableReportingTags,
    baseCurrency,
    closeNewTaxModal,
    closeTemplateSidebar,
    entries,
    errorMessage,
    formData,
    groupedAccounts,
    isBusy: isSaving || isLoadingJournal,
    isEditMode,
    isLoadingJournal,
    isLoadingTemplates,
    isNewTaxModalOpen,
    isSaving,
    isTemplateSidebarOpen,
    journalTemplates,
    navigateBack: () => navigate("/accountant/manual-journals"),
    newTaxForm,
    openNewTaxModal,
    openTemplateSidebar,
    removeAttachment,
    removeEntry,
    saveAsDraft: () => saveCurrentJournal("draft"),
    publishJournal: () => saveCurrentJournal("posted"),
    saveNewTax,
    selectAccount,
    taxOptions,
    totals,
    updateEntry,
    updateFormField,
    updateNewTaxField,
    addAttachments,
    addEntry,
    applyTemplate,
    openNewTemplatePage: () =>
      navigate("/accountant/manual-journals/templates/new"),
  };
}
