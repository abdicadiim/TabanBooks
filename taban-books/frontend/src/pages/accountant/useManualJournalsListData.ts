import { useCallback, useEffect, useState } from "react";

import { getJournals } from "./accountantModel";
import type { ManualJournal } from "./manualJournalTypes";
import { normalizeManualJournalListItem } from "./manualJournalListUtils";

interface UseManualJournalsListDataOptions {
  page: number;
  limit: number;
  selectedView: string;
  sortBy: string;
  sortOrder: string;
}

export function useManualJournalsListData({
  page,
  limit,
  selectedView,
  sortBy,
  sortOrder,
}: UseManualJournalsListDataOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [manualJournals, setManualJournals] = useState<ManualJournal[]>([]);
  const [total, setTotal] = useState(0);

  const fetchManualJournals = useCallback(async () => {
    setIsLoading(true);

    try {
      const params: any = {
        page,
        limit,
        sortBy: sortBy.toLowerCase().replace(/\s+/g, ""),
        sortOrder,
        sourceType: "manual_journal",
      };

      if (selectedView === "Published") {
        params.status = "posted";
      } else if (selectedView !== "All") {
        params.status = selectedView.toLowerCase();
      }

      const response = await getJournals(params);

      if (response && (response.success || response.code === 0)) {
        const rawData = response.data || [];
        const normalizedData = rawData.map(normalizeManualJournalListItem);
        setManualJournals(normalizedData);
        setTotal(response.total || normalizedData.length);
        return;
      }

      setManualJournals([]);
      setTotal(0);
    } catch (error) {
      console.error("Error fetching journals:", error);
      setManualJournals([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, selectedView, sortBy, sortOrder]);

  useEffect(() => {
    fetchManualJournals();
  }, [fetchManualJournals]);

  return {
    isLoading,
    manualJournals,
    refreshData: fetchManualJournals,
    total,
  };
}
