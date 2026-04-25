import { useEffect, useRef, useState } from "react";

import { INITIAL_SEARCH_FORM } from "./constants";
import type {
  CalendarMonthDirection,
  InventoryAdjustmentSearchForm,
} from "./types";
import {
  createInitialCalendarMonth,
  formatDate,
  setInventorySearchCriteria,
} from "./utils";

type DatePickerKey = "from" | "to";

const createSearchForm = (): InventoryAdjustmentSearchForm => ({
  ...INITIAL_SEARCH_FORM,
});

export function useInventoryAdjustmentSearch(currentTypeFilter: string) {
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState(currentTypeFilter || "All");
  const [searchForm, setSearchForm] = useState<InventoryAdjustmentSearchForm>(
    createSearchForm,
  );
  const [dateFromPickerOpen, setDateFromPickerOpen] = useState(false);
  const [dateToPickerOpen, setDateToPickerOpen] = useState(false);
  const [dateFromCalendar, setDateFromCalendar] = useState(
    createInitialCalendarMonth,
  );
  const [dateToCalendar, setDateToCalendar] = useState(
    createInitialCalendarMonth,
  );
  const dateFromPickerRef = useRef<HTMLDivElement>(null);
  const dateToPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchModalOpen) {
      setSearchFilter(currentTypeFilter || "All");
    }
  }, [currentTypeFilter, searchModalOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dateFromPickerRef.current &&
        !dateFromPickerRef.current.contains(event.target as Node)
      ) {
        setDateFromPickerOpen(false);
      }

      if (
        dateToPickerRef.current &&
        !dateToPickerRef.current.contains(event.target as Node)
      ) {
        setDateToPickerOpen(false);
      }
    };

    if (dateFromPickerOpen || dateToPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }

    return undefined;
  }, [dateFromPickerOpen, dateToPickerOpen]);

  const updateSearchForm = (
    field: keyof InventoryAdjustmentSearchForm,
    value: string,
  ) => {
    setSearchForm((previousForm) => ({
      ...previousForm,
      [field]: value,
    }));
  };

  const openSearchModal = () => {
    setSearchFilter(currentTypeFilter || "All");
    setSearchModalOpen(true);
  };

  const closeSearchModal = () => {
    setSearchModalOpen(false);
    setDateFromPickerOpen(false);
    setDateToPickerOpen(false);
  };

  const toggleDatePicker = (picker: DatePickerKey) => {
    if (picker === "from") {
      setDateFromPickerOpen((previous) => !previous);
      setDateToPickerOpen(false);
      return;
    }

    setDateToPickerOpen((previous) => !previous);
    setDateFromPickerOpen(false);
  };

  const navigateCalendar = (
    picker: DatePickerKey,
    direction: CalendarMonthDirection,
  ) => {
    const setCalendar =
      picker === "from" ? setDateFromCalendar : setDateToCalendar;

    setCalendar((previousDate) => {
      const nextDate = new Date(previousDate);
      nextDate.setMonth(
        previousDate.getMonth() + (direction === "prev" ? -1 : 1),
      );
      return nextDate;
    });
  };

  const handleDateSelect = (picker: DatePickerKey, date: Date) => {
    const formattedDate = formatDate(date);

    setSearchForm((previousForm) => ({
      ...previousForm,
      [picker === "from" ? "dateFrom" : "dateTo"]: formattedDate,
    }));

    if (picker === "from") {
      setDateFromPickerOpen(false);
      return;
    }

    setDateToPickerOpen(false);
  };

  const cancelSearch = () => {
    closeSearchModal();
    setInventorySearchCriteria(null);
    setSearchForm(createSearchForm());
  };

  const submitSearch = () => {
    closeSearchModal();
    setInventorySearchCriteria({ ...searchForm });
  };

  return {
    searchModalOpen,
    searchFilter,
    setSearchFilter,
    searchForm,
    updateSearchForm,
    dateFromPickerOpen,
    dateToPickerOpen,
    dateFromCalendar,
    dateToCalendar,
    dateFromPickerRef,
    dateToPickerRef,
    openSearchModal,
    closeSearchModal,
    toggleDatePicker,
    navigateCalendar,
    handleDateSelect,
    cancelSearch,
    submitSearch,
  };
}
