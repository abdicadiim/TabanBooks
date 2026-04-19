import { useEffect, useMemo, useState } from "react";

import { deleteJournal, saveJournal } from "../accountantModel";
import { exportToCSV, exportToExcel } from "../exportUtils";
import {
  MANUAL_JOURNAL_PERIOD_OPTIONS,
  MANUAL_JOURNAL_SORT_OPTIONS,
} from "../manualJournalConfig";
import {
  applyManualJournalAdvancedSearch,
  applyManualJournalCustomViewCriteria,
  filterManualJournalsByPeriod,
  parseManualJournalDate,
  sortManualJournals,
} from "../manualJournalListUtils";
import type { ManualJournal, ManualJournalCustomView } from "../manualJournalTypes";
import { useManualJournalsListData } from "../useManualJournalsListData";
import { creditNotesAPI, vendorCreditsAPI } from "../../../services/api";
import {
  DEFAULT_MANUAL_JOURNAL_EXPORT_SETTINGS,
  DEFAULT_MANUAL_JOURNAL_SEARCH_FORM,
  DEFAULT_MANUAL_JOURNAL_TEMPLATE_MAPPINGS,
  MANUAL_JOURNAL_BUILT_IN_VIEWS,
  MANUAL_JOURNAL_IMPORT_ACTIONS,
} from "./config";
import type {
  ManualJournalBuiltInView,
  ManualJournalExportSettings,
  ManualJournalExportTemplate,
  ManualJournalExportType,
  ManualJournalFieldMapping,
  ManualJournalSearchForm,
  ManualJournalViewOption,
} from "./types";

const CUSTOM_VIEW_STORAGE_KEY = "manualJournalCustomViews";
const EXPORT_TEMPLATE_STORAGE_KEY = "exportTemplates_journals";

const EXPORT_HEADERS: Record<
  ManualJournalExportType,
  {
    filename: string;
    headers: Array<{ key: string; label: string }>;
    sheetName: string;
    title: string;
  }
> = {
  journals: {
    title: "Export Journals",
    filename: "Manual_Journals",
    sheetName: "Manual Journals",
    headers: [
      { key: "date", label: "Date" },
      { key: "journalNumber", label: "Journal#" },
      { key: "referenceNumber", label: "Reference#" },
      { key: "notes", label: "Notes" },
      { key: "status", label: "Status" },
      { key: "createdBy", label: "Created By" },
      { key: "amount", label: "Amount" },
    ],
  },
  customerCredits: {
    title: "Export Applied Customer Credits",
    filename: "Applied_Customer_Credits",
    sheetName: "Applied Customer Credits",
    headers: [
      { key: "date", label: "Date" },
      { key: "creditNoteNumber", label: "Credit Note#" },
      { key: "customerName", label: "Customer Name" },
      { key: "status", label: "Status" },
      { key: "total", label: "Amount" },
      { key: "balance", label: "Balance" },
    ],
  },
  vendorCredits: {
    title: "Export Applied Vendor Credits",
    filename: "Applied_Vendor_Credits",
    sheetName: "Applied Vendor Credits",
    headers: [
      { key: "date", label: "Date" },
      { key: "vendorCreditNumber", label: "Vendor Credit#" },
      { key: "vendorName", label: "Vendor Name" },
      { key: "status", label: "Status" },
      { key: "total", label: "Amount" },
      { key: "balance", label: "Balance" },
    ],
  },
};

function readCustomViews() {
  try {
    const saved = window.localStorage.getItem(CUSTOM_VIEW_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as ManualJournalCustomView[]) : [];
  } catch {
    return [];
  }
}

function readSavedTemplates() {
  try {
    const saved = window.localStorage.getItem(EXPORT_TEMPLATE_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as ManualJournalExportTemplate[]) : [];
  } catch {
    return [];
  }
}

function writeSavedTemplates(templates: ManualJournalExportTemplate[]) {
  window.localStorage.setItem(
    EXPORT_TEMPLATE_STORAGE_KEY,
    JSON.stringify(templates),
  );
}

function isBuiltInView(value: string): value is ManualJournalBuiltInView {
  return (MANUAL_JOURNAL_BUILT_IN_VIEWS as readonly string[]).includes(value);
}

function filterJournalsForExport(
  journals: ManualJournal[],
  settings: ManualJournalExportSettings,
) {
  if (settings.scope !== "custom") {
    return journals;
  }

  const fromDate = parseManualJournalDate(settings.dateFrom);
  const toDate = parseManualJournalDate(settings.dateTo);

  return journals.filter((journal) => {
    const journalDate = parseManualJournalDate(journal.date);
    if (!journalDate) {
      return false;
    }
    if (fromDate && journalDate < fromDate) {
      return false;
    }
    if (toDate && journalDate > toDate) {
      return false;
    }
    return true;
  });
}

export function useManualJournalsListController(pathname: string) {
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [sortBy, setSortBy] = useState<string>("Date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedView, setSelectedView] =
    useState<ManualJournalBuiltInView>("All");
  const [selectedPeriod, setSelectedPeriod] = useState("All");
  const [selectedJournals, setSelectedJournals] = useState<string[]>([]);
  const [appliedAdvancedSearch, setAppliedAdvancedSearch] =
    useState<ManualJournalSearchForm | null>(null);
  const [searchFormData, setSearchFormData] = useState<ManualJournalSearchForm>(
    DEFAULT_MANUAL_JOURNAL_SEARCH_FORM,
  );
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isFindAccountantsOpen, setIsFindAccountantsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalType, setExportModalType] =
    useState<ManualJournalExportType>("journals");
  const [exportSettings, setExportSettings] =
    useState<ManualJournalExportSettings>(DEFAULT_MANUAL_JOURNAL_EXPORT_SETTINGS);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateMappings, setTemplateMappings] = useState<ManualJournalFieldMapping[]>(
    DEFAULT_MANUAL_JOURNAL_TEMPLATE_MAPPINGS,
  );
  const [savedTemplates, setSavedTemplates] =
    useState<ManualJournalExportTemplate[]>(() => readSavedTemplates());
  const [customViews, setCustomViews] = useState<ManualJournalCustomView[]>(
    () => readCustomViews(),
  );
  const [selectedCustomViewId, setSelectedCustomViewId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { isLoading, manualJournals, refreshData, total } = useManualJournalsListData({
    page: pagination.page,
    limit: pagination.limit,
    selectedView,
    sortBy,
    sortOrder,
  });

  useEffect(() => {
    setPagination((current) =>
      current.total === total ? current : { ...current, total },
    );
  }, [total]);

  useEffect(() => {
    setCustomViews(readCustomViews());
  }, [pathname]);

  const selectedCustomView = useMemo(
    () =>
      customViews.find((view) => String(view.id ?? "") === selectedCustomViewId) ??
      null,
    [customViews, selectedCustomViewId],
  );

  const filteredJournals = useMemo(() => {
    let filtered = filterManualJournalsByPeriod(manualJournals, selectedPeriod);

    if (selectedView === "Draft") {
      filtered = filtered.filter((journal) => journal.status === "DRAFT");
    } else if (selectedView === "Published") {
      filtered = filtered.filter((journal) => journal.status === "PUBLISHED");
    }

    filtered = applyManualJournalCustomViewCriteria(filtered, selectedCustomView);
    filtered = applyManualJournalAdvancedSearch(filtered, appliedAdvancedSearch);

    return sortManualJournals(filtered, sortBy, sortOrder);
  }, [
    appliedAdvancedSearch,
    manualJournals,
    selectedCustomView,
    selectedPeriod,
    selectedView,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    setSelectedJournals([]);
  }, [filteredJournals]);

  const viewOptions = useMemo<ManualJournalViewOption[]>(
    () => [
      ...MANUAL_JOURNAL_BUILT_IN_VIEWS.map((view) => ({
        value: view,
        label: view,
      })),
      ...customViews.map((view) => ({
        value: String(view.id ?? view.name ?? ""),
        label: view.name || "Custom View",
        customView: view,
      })),
    ],
    [customViews],
  );

  const hasActiveSearch = useMemo(() => {
    if (!appliedAdvancedSearch) {
      return false;
    }

    return Object.entries(appliedAdvancedSearch).some(([key, value]) => {
      if (key === "filterType") {
        return value !== "All";
      }
      return Boolean(value);
    });
  }, [appliedAdvancedSearch]);

  function handleViewSelectionChange(value: string) {
    if (isBuiltInView(value)) {
      setSelectedView(value);
      setSelectedCustomViewId("");
      return;
    }

    setSelectedView("All");
    setSelectedCustomViewId(value);
  }

  function toggleSortOrder() {
    setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
  }

  function toggleDateSort() {
    setSortBy("Date");
    setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
  }

  function selectAllJournals() {
    setSelectedJournals((current) =>
      current.length === filteredJournals.length
        ? []
        : filteredJournals.map((journal) => String(journal.id || journal._id)),
    );
  }

  function toggleJournalSelection(journalId: string) {
    setSelectedJournals((current) =>
      current.includes(journalId)
        ? current.filter((id) => id !== journalId)
        : [...current, journalId],
    );
  }

  function clearSelection() {
    setSelectedJournals([]);
  }

  async function publishSelectedJournals() {
    if (selectedJournals.length === 0) {
      window.alert("Please select at least one journal to publish.");
      return;
    }

    if (
      !window.confirm(`Publish ${selectedJournals.length} selected journal(s)?`)
    ) {
      return;
    }

    setIsProcessing(true);

    try {
      let successCount = 0;

      for (const journalId of selectedJournals) {
        const journal = manualJournals.find(
          (item) => item.id === journalId || item._id === journalId,
        );
        if (!journal) {
          continue;
        }

        const saved = await saveJournal({ ...journal, status: "PUBLISHED" });
        if (saved) {
          successCount += 1;
        }
      }

      window.alert(`Successfully published ${successCount} journal(s).`);
      setSelectedJournals([]);
      refreshData();
    } finally {
      setIsProcessing(false);
    }
  }

  async function deleteSelectedJournals() {
    if (selectedJournals.length === 0) {
      window.alert("Please select at least one journal to delete.");
      return;
    }

    if (
      !window.confirm(
        `Delete ${selectedJournals.length} selected journal(s)? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setIsProcessing(true);

    try {
      let successCount = 0;

      for (const journalId of selectedJournals) {
        const deleted = await deleteJournal(journalId);
        if (deleted) {
          successCount += 1;
        }
      }

      window.alert(`${successCount} journal(s) deleted successfully.`);
      setSelectedJournals([]);
      refreshData();
    } finally {
      setIsProcessing(false);
    }
  }

  function openSearchModal() {
    setIsSearchModalOpen(true);
    setSearchFormData(appliedAdvancedSearch ?? DEFAULT_MANUAL_JOURNAL_SEARCH_FORM);
  }

  function closeSearchModal() {
    setIsSearchModalOpen(false);
  }

  function updateSearchForm<K extends keyof ManualJournalSearchForm>(
    field: K,
    value: ManualJournalSearchForm[K],
  ) {
    setSearchFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetSearchForm() {
    setSearchFormData(DEFAULT_MANUAL_JOURNAL_SEARCH_FORM);
  }

  function applyAdvancedSearch() {
    setAppliedAdvancedSearch(searchFormData);
    setSelectedCustomViewId("");
    setSelectedView(searchFormData.filterType || "All");
    setIsSearchModalOpen(false);
  }

  function clearAdvancedSearch() {
    setAppliedAdvancedSearch(null);
    setSearchFormData(DEFAULT_MANUAL_JOURNAL_SEARCH_FORM);
  }

  function openExportModal(type: ManualJournalExportType) {
    setExportModalType(type);
    setExportSettings(DEFAULT_MANUAL_JOURNAL_EXPORT_SETTINGS);
    setIsExportModalOpen(true);
  }

  function closeExportModal() {
    setIsExportModalOpen(false);
  }

  function updateExportSettings<K extends keyof ManualJournalExportSettings>(
    field: K,
    value: ManualJournalExportSettings[K],
  ) {
    setExportSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function confirmExport() {
    setIsProcessing(true);

    try {
      const exportMeta = EXPORT_HEADERS[exportModalType];
      let dataToExport: any[] = [];

      if (exportModalType === "journals") {
        const source =
          exportSettings.scope === "all" ? manualJournals : filteredJournals;
        dataToExport = filterJournalsForExport(source, exportSettings);
      } else if (exportModalType === "customerCredits") {
        const response = await creditNotesAPI.getAll();
        dataToExport = Array.isArray(response) ? response : response?.data || [];
      } else {
        const response = await vendorCreditsAPI.getAll();
        dataToExport = Array.isArray(response) ? response : response?.data || [];
      }

      if (
        exportSettings.fileFormat === "xlsx" ||
        exportSettings.fileFormat === "xls"
      ) {
        exportToExcel(
          dataToExport,
          exportMeta.filename,
          exportMeta.headers,
          exportMeta.sheetName,
        );
      } else {
        exportToCSV(dataToExport, exportMeta.filename, exportMeta.headers);
      }

      setIsExportModalOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      window.alert("Failed to export data. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  function openTemplateModal() {
    setTemplateName("");
    setTemplateMappings(DEFAULT_MANUAL_JOURNAL_TEMPLATE_MAPPINGS);
    setIsTemplateModalOpen(true);
  }

  function closeTemplateModal() {
    setIsTemplateModalOpen(false);
    setTemplateName("");
    setTemplateMappings(DEFAULT_MANUAL_JOURNAL_TEMPLATE_MAPPINGS);
  }

  function addTemplateField() {
    setTemplateMappings((current) => [
      ...current,
      {
        id: `field-${Date.now()}`,
        tabanField: "Journal Date",
        exportField: "Journal Date",
      },
    ]);
  }

  function removeTemplateField(fieldId: string) {
    setTemplateMappings((current) =>
      current.length === 1
        ? current
        : current.filter((field) => field.id !== fieldId),
    );
  }

  function updateTemplateFieldMapping(
    fieldId: string,
    field: "tabanField" | "exportField",
    value: string,
  ) {
    setTemplateMappings((current) =>
      current.map((mapping) =>
        mapping.id === fieldId ? { ...mapping, [field]: value } : mapping,
      ),
    );
  }

  function saveTemplate() {
    if (!templateName.trim()) {
      window.alert("Please enter a template name.");
      return;
    }

    const nextTemplate: ManualJournalExportTemplate = {
      id: `template-${Date.now()}`,
      name: templateName.trim(),
      createdAt: new Date().toISOString(),
      mappings: templateMappings,
    };

    const nextTemplates = [...savedTemplates, nextTemplate];
    setSavedTemplates(nextTemplates);
    writeSavedTemplates(nextTemplates);
    setExportSettings((current) => ({
      ...current,
      selectedTemplateId: nextTemplate.id,
    }));
    closeTemplateModal();
  }

  const isBusy = isLoading || isProcessing;

  return {
    activeViewKey: selectedCustomViewId || selectedView,
    applyAdvancedSearch,
    clearAdvancedSearch,
    clearSelection,
    closeAccountants: () => setIsFindAccountantsOpen(false),
    closeExportModal,
    closeSearchModal,
    closeTemplateModal,
    confirmExport,
    deleteSelectedJournals,
    exportModalType,
    exportSettings,
    filteredJournals,
    hasActiveSearch,
    importActions: MANUAL_JOURNAL_IMPORT_ACTIONS,
    isBusy,
    isExportModalOpen,
    isFindAccountantsOpen,
    isLoading,
    isSearchModalOpen,
    isTemplateModalOpen,
    manualJournals,
    openAccountants: () => setIsFindAccountantsOpen(true),
    openExportModal,
    openSearchModal,
    openTemplateModal,
    periodOptions: MANUAL_JOURNAL_PERIOD_OPTIONS,
    publishSelectedJournals,
    savedTemplates,
    searchFormData,
    selectAllJournals,
    selectedJournals,
    selectedPeriod,
    setSelectedPeriod,
    setSortBy,
    setTemplateName,
    sortBy,
    sortOptions: MANUAL_JOURNAL_SORT_OPTIONS,
    sortOrder,
    templateMappings,
    templateName,
    toggleDateSort,
    toggleJournalSelection,
    toggleSortOrder,
    updateExportSettings,
    updateSearchForm,
    updateTemplateFieldMapping,
    viewOptions,
    handleViewSelectionChange,
    resetSearchForm,
    addTemplateField,
    removeTemplateField,
    saveTemplate,
  };
}

