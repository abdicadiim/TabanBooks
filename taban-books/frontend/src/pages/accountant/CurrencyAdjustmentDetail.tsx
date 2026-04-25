import React from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

import { CURRENCY_ADJUSTMENT_ATTACHMENT_COUNT } from "./currencyAdjustmentConfig";
import { CurrencyAdjustmentActionBar } from "./currencyAdjustmentDetail/components/CurrencyAdjustmentActionBar";
import { CurrencyAdjustmentOverview } from "./currencyAdjustmentDetail/components/CurrencyAdjustmentOverview";
import { CurrencyAdjustmentSidebar } from "./currencyAdjustmentDetail/components/CurrencyAdjustmentSidebar";
import { CurrencyAdjustmentTopBar } from "./currencyAdjustmentDetail/components/CurrencyAdjustmentTopBar";
import { printCurrencyAdjustment } from "./currencyAdjustmentDetail/printCurrencyAdjustment";
import { useCurrencyAdjustmentDetail } from "./currencyAdjustmentDetail/useCurrencyAdjustmentDetail";

export default function CurrencyAdjustmentDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    adjustment,
    adjustmentId,
    adjustmentNumber,
    filteredAdjustments,
    isLoading,
    openAdjustment,
    openEdit,
    openList,
    selectedPeriod,
    setSelectedPeriod,
  } = useCurrencyAdjustmentDetail(id);

  const handlePrint = () => {
    if (!adjustment) return;

    const didOpenPrintWindow = printCurrencyAdjustment({
      adjustment,
      adjustmentNumber,
    });

    if (!didOpenPrintWindow) {
      toast.error("Please allow popups to print");
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          backgroundColor: "#f7f8fc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: "16px", color: "#6b7280" }}>Loading...</div>
      </div>
    );
  }

  if (!adjustment) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "calc(100vh - 60px)",
        backgroundColor: "#f7f8fc",
      }}
    >
      <CurrencyAdjustmentSidebar
        activeAdjustmentId={adjustmentId}
        adjustments={filteredAdjustments}
        selectedPeriod={selectedPeriod}
        onSelectAdjustment={openAdjustment}
        onSelectPeriod={setSelectedPeriod}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "white",
        }}
      >
        <CurrencyAdjustmentTopBar
          adjustmentNumber={adjustmentNumber}
          attachmentCount={CURRENCY_ADJUSTMENT_ATTACHMENT_COUNT}
          onBack={openList}
          onClose={openList}
        />
        <CurrencyAdjustmentActionBar
          onDownloadPdf={handlePrint}
          onEdit={openEdit}
          onPrint={handlePrint}
        />
        <CurrencyAdjustmentOverview
          adjustment={adjustment}
          adjustmentNumber={adjustmentNumber}
          attachmentCount={CURRENCY_ADJUSTMENT_ATTACHMENT_COUNT}
        />
      </div>
    </div>
  );
}
