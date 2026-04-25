import type {
  ManualJournal,
  ManualJournalCustomView,
} from "./manualJournalTypes";

export const parseManualJournalDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;

  try {
    const monthNames = [
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
    const parts = String(dateValue).split(" ");

    if (parts.length === 3) {
      const day = Number(parts[0]);
      const month = monthNames.indexOf(parts[1]);
      const year = Number(parts[2]);

      if (!Number.isNaN(day) && month !== -1 && !Number.isNaN(year)) {
        return new Date(year, month, day);
      }
    }

    const parsedDate = new Date(dateValue);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  } catch {
    return null;
  }
};

export const formatManualJournalDate = (dateValue: any): string => {
  if (!dateValue) return "";

  const parsedDate = parseManualJournalDate(dateValue);
  if (!parsedDate) return String(dateValue);

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = parsedDate.getFullYear();

  return `${day}/${month}/${year}`;
};

export const formatManualJournalCurrency = (
  amount: any,
  currencyCode = "KES",
): string => {
  if (amount === null || amount === undefined) return `${currencyCode}0.00`;

  const numericValue =
    typeof amount === "string"
      ? parseFloat(amount.replace(/[^0-9.-]/g, "")) || 0
      : typeof amount === "number"
        ? amount
        : parseFloat(amount) || 0;

  return `${currencyCode}${numericValue.toFixed(2)}`;
};

export const normalizeManualJournalListItem = (journal: any): ManualJournal => {
  let status = String(journal.status || "draft").toUpperCase();
  if (status === "POSTED") status = "PUBLISHED";
  if (status === "PENDING_APPROVAL") status = "PENDING APPROVAL";

  return {
    ...journal,
    id: journal._id || journal.id,
    date: journal.date,
    journalNumber: journal.journalNumber || journal.entryNumber || "",
    referenceNumber: journal.referenceNumber || journal.reference || "",
    status,
    amount:
      journal.amount !== undefined
        ? journal.amount
        : journal.lines
          ? journal.lines.reduce(
              (sum: number, line: any) => sum + (line.debit || 0),
              0,
            )
          : 0,
    sourceType: journal.sourceType || "manual_journal",
    notes: journal.notes || journal.description || "",
    currency: journal.currency || "AED",
    createdBy:
      (typeof journal.createdBy === "object"
        ? journal.createdBy?.name || journal.createdBy?.email
        : journal.createdBy) ||
      journal.postedBy?.name ||
      journal.postedBy?.email ||
      "System",
    reportingMethod: journal.reportingMethod || "Accrual and Cash",
  };
};

export const filterManualJournalsByPeriod = (
  journals: ManualJournal[],
  period: string,
): ManualJournal[] => {
  if (period === "All" || period === "Custom") {
    return journals;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return journals.filter((journal) => {
    const journalDate = parseManualJournalDate(journal.date);
    if (!journalDate) return false;

    const dateOnly = new Date(
      journalDate.getFullYear(),
      journalDate.getMonth(),
      journalDate.getDate(),
    );

    switch (period) {
      case "Today":
        return dateOnly.getTime() === today.getTime();
      case "This Week": {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return dateOnly >= startOfWeek && dateOnly <= endOfWeek;
      }
      case "This Month":
        return (
          journalDate.getMonth() === now.getMonth() &&
          journalDate.getFullYear() === now.getFullYear()
        );
      case "This Quarter": {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const journalQuarter = Math.floor(journalDate.getMonth() / 3);
        return (
          journalQuarter === currentQuarter &&
          journalDate.getFullYear() === now.getFullYear()
        );
      }
      case "This Year":
        return journalDate.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  });
};

export const sortManualJournals = (
  journals: ManualJournal[],
  sortField: string,
  order: string,
): ManualJournal[] => {
  const sortedJournals = [...journals].sort((leftJournal, rightJournal) => {
    switch (sortField) {
      case "Date": {
        const leftDate = parseManualJournalDate(leftJournal.date);
        const rightDate = parseManualJournalDate(rightJournal.date);
        if (!leftDate) return 1;
        if (!rightDate) return -1;
        return leftDate.getTime() - rightDate.getTime();
      }
      case "Journal#": {
        const leftValue = leftJournal.journalNumber || "";
        const rightValue = rightJournal.journalNumber || "";
        const leftNumber = parseInt(leftValue, 10);
        const rightNumber = parseInt(rightValue, 10);
        if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
          return leftNumber - rightNumber;
        }
        return leftValue.localeCompare(rightValue);
      }
      case "Reference Number": {
        const leftValue = leftJournal.referenceNumber || "";
        const rightValue = rightJournal.referenceNumber || "";
        const leftNumber = parseInt(leftValue, 10);
        const rightNumber = parseInt(rightValue, 10);
        if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
          return leftNumber - rightNumber;
        }
        return leftValue.localeCompare(rightValue);
      }
      default:
        return 0;
    }
  });

  return order === "asc" ? sortedJournals : sortedJournals.reverse();
};

export const applyManualJournalCustomViewCriteria = (
  journals: ManualJournal[],
  customView: ManualJournalCustomView | null,
): ManualJournal[] => {
  if (!customView || !customView.criteria?.length) {
    return journals;
  }

  const operators = customView.logicalOperators || {};

  return journals.filter((journal) => {
    let result = true;

    customView.criteria.forEach((criterion, index) => {
      if (!criterion.field || !criterion.comparator || !criterion.value) {
        return;
      }

      const fieldValue = String(
        journal[criterion.field.toLowerCase().replace(/\s+/g, "")] ||
          journal[criterion.field] ||
          "",
      ).toLowerCase();
      const criterionValue = String(criterion.value).toLowerCase();

      let matches = false;
      switch (criterion.comparator) {
        case "is":
          matches = fieldValue === criterionValue;
          break;
        case "is not":
          matches = fieldValue !== criterionValue;
          break;
        case "starts with":
          matches = fieldValue.startsWith(criterionValue);
          break;
        case "contains":
          matches = fieldValue.includes(criterionValue);
          break;
        case "doesn't contain":
          matches = !fieldValue.includes(criterionValue);
          break;
        default:
          matches = true;
      }

      if (index === 0) {
        result = matches;
        return;
      }

      const operator = operators[index] || "AND";
      result = operator === "AND" ? result && matches : result || matches;
    });

    return result;
  });
};

export const applyManualJournalAdvancedSearch = (
  journals: ManualJournal[],
  appliedAdvancedSearch: any,
): ManualJournal[] => {
  if (!appliedAdvancedSearch) {
    return journals;
  }

  const toLower = (value: any) => String(value || "").toLowerCase();
  const parseAmount = (value: any) =>
    parseFloat(String(value || 0).replace(/[^0-9.-]/g, "")) || 0;

  return journals.filter((journal) => {
    if (
      appliedAdvancedSearch.journalNumber &&
      !toLower(journal.journalNumber).includes(
        toLower(appliedAdvancedSearch.journalNumber),
      )
    ) {
      return false;
    }
    if (
      appliedAdvancedSearch.referenceNumber &&
      !toLower(journal.referenceNumber).includes(
        toLower(appliedAdvancedSearch.referenceNumber),
      )
    ) {
      return false;
    }
    if (
      appliedAdvancedSearch.account &&
      !toLower(journal.account || journal.accountName).includes(
        toLower(appliedAdvancedSearch.account),
      )
    ) {
      return false;
    }
    if (
      appliedAdvancedSearch.tax &&
      !toLower(journal.tax).includes(toLower(appliedAdvancedSearch.tax))
    ) {
      return false;
    }
    if (
      appliedAdvancedSearch.vendorName &&
      !toLower(journal.vendorName).includes(
        toLower(appliedAdvancedSearch.vendorName),
      )
    ) {
      return false;
    }
    if (
      appliedAdvancedSearch.journalType &&
      !toLower(journal.type || journal.journalType).includes(
        toLower(appliedAdvancedSearch.journalType),
      )
    ) {
      return false;
    }
    if (
      appliedAdvancedSearch.status &&
      !toLower(journal.status).includes(toLower(appliedAdvancedSearch.status))
    ) {
      return false;
    }
    if (
      appliedAdvancedSearch.notes &&
      !toLower(journal.notes).includes(toLower(appliedAdvancedSearch.notes))
    ) {
      return false;
    }
    if (
      appliedAdvancedSearch.projectName &&
      !toLower(journal.projectName).includes(
        toLower(appliedAdvancedSearch.projectName),
      )
    ) {
      return false;
    }
    if (
      appliedAdvancedSearch.customerName &&
      !toLower(journal.customerName).includes(
        toLower(appliedAdvancedSearch.customerName),
      )
    ) {
      return false;
    }
    if (
      appliedAdvancedSearch.reportingMethod &&
      !toLower(journal.reportingMethod).includes(
        toLower(appliedAdvancedSearch.reportingMethod),
      )
    ) {
      return false;
    }

    const total = parseAmount(journal.amount);
    const min = appliedAdvancedSearch.totalFrom
      ? parseAmount(appliedAdvancedSearch.totalFrom)
      : null;
    const max = appliedAdvancedSearch.totalTo
      ? parseAmount(appliedAdvancedSearch.totalTo)
      : null;
    if (min !== null && total < min) return false;
    if (max !== null && total > max) return false;

    const journalDate = parseManualJournalDate(journal.date);
    const fromDate = parseManualJournalDate(appliedAdvancedSearch.dateFrom);
    const toDate = parseManualJournalDate(appliedAdvancedSearch.dateTo);
    if (fromDate && journalDate && journalDate < fromDate) return false;
    if (toDate && journalDate && journalDate > toDate) return false;

    return true;
  });
};
