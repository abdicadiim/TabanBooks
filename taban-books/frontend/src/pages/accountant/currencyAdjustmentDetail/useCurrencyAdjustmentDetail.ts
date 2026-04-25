import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import { accountantAPI } from "../../../services/api";
import {
  CURRENCY_ADJUSTMENT_ROUTE,
  type CurrencyAdjustmentPeriod,
} from "../currencyAdjustmentConfig";
import type { CurrencyAdjustment } from "../currencyAdjustmentTypes";
import {
  filterCurrencyAdjustmentsByPeriod,
  getCurrencyAdjustmentIdentifier,
  getCurrencyAdjustmentSequenceNumber,
} from "../currencyAdjustmentUtils";

interface UseCurrencyAdjustmentDetailResult {
  adjustment: CurrencyAdjustment | null;
  adjustmentId: string | null;
  adjustmentNumber: number | null;
  adjustments: CurrencyAdjustment[];
  filteredAdjustments: CurrencyAdjustment[];
  isLoading: boolean;
  selectedPeriod: CurrencyAdjustmentPeriod;
  setSelectedPeriod: (period: CurrencyAdjustmentPeriod) => void;
  openAdjustment: (adjustmentId: string) => void;
  openEdit: () => void;
  openList: () => void;
}

export function useCurrencyAdjustmentDetail(
  id?: string,
): UseCurrencyAdjustmentDetailResult {
  const navigate = useNavigate();
  const [adjustment, setAdjustment] = useState<CurrencyAdjustment | null>(null);
  const [adjustments, setAdjustments] = useState<CurrencyAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] =
    useState<CurrencyAdjustmentPeriod>("All");

  useEffect(() => {
    if (!id) {
      navigate(CURRENCY_ADJUSTMENT_ROUTE);
      return undefined;
    }

    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);

      try {
        const [detailResult, listResult] = await Promise.allSettled([
          accountantAPI.getCurrencyAdjustmentById(id),
          accountantAPI.getCurrencyAdjustments({ limit: 1000 }),
        ]);

        if (!isMounted) return;

        if (detailResult.status === "rejected") {
          throw detailResult.reason;
        }

        const detailResponse = detailResult.value;
        if (!detailResponse?.success || !detailResponse.data) {
          toast.error("Adjustment not found");
          navigate(CURRENCY_ADJUSTMENT_ROUTE);
          return;
        }

        setAdjustment(detailResponse.data);

        if (
          listResult.status === "fulfilled" &&
          listResult.value?.success &&
          Array.isArray(listResult.value.data)
        ) {
          setAdjustments(listResult.value.data);
          return;
        }

        if (listResult.status === "rejected") {
          console.error("Error loading adjustments list:", listResult.reason);
        }

        setAdjustments([]);
      } catch (error) {
        if (!isMounted) return;

        console.error("Error loading adjustment data:", error);
        toast.error("Failed to load adjustment data");
        navigate(CURRENCY_ADJUSTMENT_ROUTE);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  const filteredAdjustments = useMemo(
    () => filterCurrencyAdjustmentsByPeriod(adjustments, selectedPeriod),
    [adjustments, selectedPeriod],
  );

  const adjustmentId = useMemo(
    () => getCurrencyAdjustmentIdentifier(adjustment) ?? id ?? null,
    [adjustment, id],
  );

  const adjustmentNumber = useMemo(
    () => getCurrencyAdjustmentSequenceNumber(adjustments, adjustmentId),
    [adjustments, adjustmentId],
  );

  return {
    adjustment,
    adjustmentId,
    adjustmentNumber,
    adjustments,
    filteredAdjustments,
    isLoading,
    selectedPeriod,
    setSelectedPeriod,
    openAdjustment: (adjustmentId: string) => {
      navigate(`${CURRENCY_ADJUSTMENT_ROUTE}/${adjustmentId}`);
    },
    openEdit: () => {
      if (!adjustmentId) return;
      navigate(`${CURRENCY_ADJUSTMENT_ROUTE}/${adjustmentId}/edit`);
    },
    openList: () => {
      navigate(CURRENCY_ADJUSTMENT_ROUTE);
    },
  };
}
