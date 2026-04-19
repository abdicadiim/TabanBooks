import { useEffect, useMemo, useState } from "react";

import { DEFAULT_TRANSACTION_LOCK_DATE, TRANSACTION_MODULES } from "./config";
import type {
  NegativeStockOption,
  TransactionLockDialogState,
  TransactionLockMap,
} from "./types";
import {
  normalizeLockDate,
  readStoredNegativeStockOption,
  readStoredTransactionLocks,
  writeStoredNegativeStockOption,
  writeStoredTransactionLocks,
} from "./utils";

const EMPTY_LOCK_DIALOG: TransactionLockDialogState = {
  open: false,
  moduleName: null,
  date: DEFAULT_TRANSACTION_LOCK_DATE,
  reason: "",
};

export function useTransactionLockingState() {
  const [locks, setLocks] = useState<TransactionLockMap>(() =>
    readStoredTransactionLocks(),
  );
  const [lockDialog, setLockDialog] =
    useState<TransactionLockDialogState>(EMPTY_LOCK_DIALOG);
  const [isFindAccountantsOpen, setIsFindAccountantsOpen] = useState(false);
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false);
  const [isUnlockSummaryOpen, setIsUnlockSummaryOpen] = useState(false);
  const [negativeStockOption, setNegativeStockOption] =
    useState<NegativeStockOption>(() => readStoredNegativeStockOption());

  useEffect(() => {
    writeStoredTransactionLocks(locks);
  }, [locks]);

  useEffect(() => {
    writeStoredNegativeStockOption(negativeStockOption);
  }, [negativeStockOption]);

  const lockedModuleDetails = useMemo(
    () =>
      TRANSACTION_MODULES.filter((module) => locks[module.name]).map((module) => ({
        ...module,
        lock: locks[module.name],
      })),
    [locks],
  );

  function openLockModal(moduleName: string) {
    const existingLock = locks[moduleName];

    setLockDialog({
      open: true,
      moduleName,
      date: existingLock?.date ?? DEFAULT_TRANSACTION_LOCK_DATE,
      reason: existingLock?.reason ?? "",
    });
  }

  function closeLockModal() {
    setLockDialog(EMPTY_LOCK_DIALOG);
  }

  function updateLockDialog(
    field: keyof Omit<TransactionLockDialogState, "open" | "moduleName">,
    value: string,
  ) {
    setLockDialog((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function saveLock() {
    if (!lockDialog.moduleName || !lockDialog.reason.trim()) {
      return;
    }

    const nextReason = lockDialog.reason.trim();
    const nextDate = normalizeLockDate(lockDialog.date);

    setLocks((current) => ({
      ...current,
      [lockDialog.moduleName as string]: {
        date: nextDate,
        reason: nextReason,
        lockedAt: new Date().toISOString(),
      },
    }));

    closeLockModal();
  }

  function unlockModule(moduleName: string) {
    setLocks((current) => {
      const nextLocks = { ...current };
      delete nextLocks[moduleName];
      return nextLocks;
    });
  }

  function partiallyUnlockModule(moduleName: string) {
    console.log("Unlock partially:", moduleName);
  }

  return {
    lockDialog,
    locks,
    lockedCount: lockedModuleDetails.length,
    lockedModuleDetails,
    negativeStockOption,
    isConfigureModalOpen,
    isFindAccountantsOpen,
    isUnlockSummaryOpen,
    openConfigureModal: () => setIsConfigureModalOpen(true),
    closeConfigureModal: () => setIsConfigureModalOpen(false),
    applyNegativeStockOption: setNegativeStockOption,
    openFindAccountants: () => setIsFindAccountantsOpen(true),
    closeFindAccountants: () => setIsFindAccountantsOpen(false),
    openUnlockSummary: () => setIsUnlockSummaryOpen(true),
    closeUnlockSummary: () => setIsUnlockSummaryOpen(false),
    openLockModal,
    closeLockModal,
    updateLockDate: (date: string) => updateLockDialog("date", date),
    updateLockReason: (reason: string) => updateLockDialog("reason", reason),
    saveLock,
    unlockModule,
    partiallyUnlockModule,
  };
}
