import React from "react";

import { TransactionLockModal } from "./transactionLocking/components/TransactionLockModal";
import { TransactionLockingDashboard } from "./transactionLocking/components/TransactionLockingDashboard";
import { TransactionLockingFindAccountantsSidebar } from "./transactionLocking/components/TransactionLockingFindAccountantsSidebar";
import { TransactionLockingSettingsModal } from "./transactionLocking/components/TransactionLockingSettingsModal";
import { TransactionLockingUnlockSummaryModal } from "./transactionLocking/components/TransactionLockingUnlockSummaryModal";
import { useTransactionLockingState } from "./transactionLocking/useTransactionLockingState";

function TransactionLocking() {
  const {
    applyNegativeStockOption,
    closeConfigureModal,
    closeFindAccountants,
    closeLockModal,
    closeUnlockSummary,
    isConfigureModalOpen,
    isFindAccountantsOpen,
    isUnlockSummaryOpen,
    lockDialog,
    lockedCount,
    lockedModuleDetails,
    locks,
    negativeStockOption,
    openConfigureModal,
    openFindAccountants,
    openLockModal,
    openUnlockSummary,
    partiallyUnlockModule,
    saveLock,
    unlockModule,
    updateLockDate,
    updateLockReason,
  } = useTransactionLockingState();

  return (
    <>
      <TransactionLockingDashboard
        locks={locks}
        lockedCount={lockedCount}
        negativeStockOption={negativeStockOption}
        onOpenAccountants={openFindAccountants}
        onOpenConfigure={openConfigureModal}
        onOpenLockModal={openLockModal}
        onOpenUnlockSummary={openUnlockSummary}
        onPartialUnlock={partiallyUnlockModule}
        onUnlock={unlockModule}
      />

      <TransactionLockModal
        open={lockDialog.open}
        moduleName={lockDialog.moduleName}
        date={lockDialog.date}
        reason={lockDialog.reason}
        existingLock={Boolean(lockDialog.moduleName && locks[lockDialog.moduleName])}
        onClose={closeLockModal}
        onDateChange={updateLockDate}
        onReasonChange={updateLockReason}
        onSave={saveLock}
      />

      <TransactionLockingFindAccountantsSidebar
        open={isFindAccountantsOpen}
        onClose={closeFindAccountants}
      />

      <TransactionLockingSettingsModal
        open={isConfigureModalOpen}
        value={negativeStockOption}
        onApply={(option) => {
          applyNegativeStockOption(option);
          closeConfigureModal();
        }}
        onClose={closeConfigureModal}
      />

      <TransactionLockingUnlockSummaryModal
        open={isUnlockSummaryOpen}
        lockedModules={lockedModuleDetails}
        onClose={closeUnlockSummary}
      />
    </>
  );
}

export default TransactionLocking;
