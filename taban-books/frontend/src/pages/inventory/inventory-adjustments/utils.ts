import {
  DEFAULT_COLUMNS,
  INVENTORY_COLUMNS_STORAGE_KEY,
} from "./constants";
import type {
  CalendarDay,
  InventoryAdjustmentColumn,
  InventoryAdjustmentSearchForm,
} from "./types";

export const parseDate = (
  dateString: string | Date | null | undefined,
): Date | null => {
  if (!dateString) {
    return null;
  }

  try {
    if (dateString instanceof Date) {
      return Number.isNaN(dateString.getTime()) ? null : dateString;
    }

    if (typeof dateString === "string" && dateString.includes("/")) {
      const parts = dateString.split("/");

      if (parts.length === 3) {
        const day = Number.parseInt(parts[0], 10);
        const month = Number.parseInt(parts[1], 10) - 1;
        const year = Number.parseInt(parts[2], 10);

        if (
          !Number.isNaN(day) &&
          !Number.isNaN(month) &&
          !Number.isNaN(year)
        ) {
          return new Date(year, month, day);
        }
      }
    }

    const parsed = new Date(dateString);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

export const formatDate = (date: Date | string | null | undefined): string => {
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return "";
  }

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = parsedDate.getFullYear();

  return `${day}/${month}/${year}`;
};

export const createInitialCalendarMonth = (): Date => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
};

export const getDaysInMonth = (date: Date): CalendarDay[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  const days: CalendarDay[] = [];

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let index = startingDayOfWeek - 1; index >= 0; index -= 1) {
    days.push({
      date: prevMonthLastDay - index,
      month: "prev",
      fullDate: new Date(year, month - 1, prevMonthLastDay - index),
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      date: day,
      month: "current",
      fullDate: new Date(year, month, day),
    });
  }

  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day += 1) {
    days.push({
      date: day,
      month: "next",
      fullDate: new Date(year, month + 1, day),
    });
  }

  return days;
};

export const formatInventoryAdjustmentDate = (
  value: string | null | undefined,
  rawValue?: string,
): string => {
  const parsedDate = rawValue ? new Date(rawValue) : parseDate(value);

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return value || "";
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatInventoryAdjustmentDateTime = (
  value: string | null | undefined,
  rawValue?: string,
): string => {
  const parsedDate = rawValue ? new Date(rawValue) : parseDate(value);

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return value || "";
  }

  const datePart = parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timePart = parsedDate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `${datePart}\n${timePart}`;
};

export const mapColumnSortField = (columnKey: string): string => {
  switch (columnKey) {
    case "date":
      return "Date";
    case "createdTime":
      return "Created Time";
    case "lastModifiedTime":
      return "Last Modified Time";
    default:
      return columnKey;
  }
};

export const loadColumnsFromStorage = (): InventoryAdjustmentColumn[] => {
  if (typeof localStorage === "undefined") {
    return DEFAULT_COLUMNS;
  }

  const savedColumns = localStorage.getItem(INVENTORY_COLUMNS_STORAGE_KEY);
  if (!savedColumns) {
    return DEFAULT_COLUMNS;
  }

  try {
    const parsedColumns = JSON.parse(savedColumns) as Array<
      Partial<InventoryAdjustmentColumn>
    >;

    return DEFAULT_COLUMNS.map((defaultColumn) => {
      const storedColumn = parsedColumns.find(
        (column) => column.key === defaultColumn.key,
      );

      return storedColumn
        ? { ...defaultColumn, ...storedColumn }
        : defaultColumn;
    });
  } catch {
    return DEFAULT_COLUMNS;
  }
};

export const persistColumns = (
  columns: InventoryAdjustmentColumn[],
): void => {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(
    INVENTORY_COLUMNS_STORAGE_KEY,
    JSON.stringify(columns),
  );
};

export const setInventorySearchCriteria = (
  criteria: InventoryAdjustmentSearchForm | null,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  const searchWindow = window as Window & {
    setInventorySearchCriteria?: (
      nextCriteria: InventoryAdjustmentSearchForm | null,
    ) => void;
  };

  searchWindow.setInventorySearchCriteria?.(criteria);
};
