import React, { Suspense } from "react";
import type { AccountDetailController } from "./types";

const ExpenseSidebar = React.lazy(() =>
  import("./moneyOutOverlays/ExpenseSidebar").then((module) => ({
    default: module.ExpenseSidebar,
  })),
);

const VendorAdvanceSidebar = React.lazy(() =>
  import("./moneyOutOverlays/VendorAdvanceSidebar").then((module) => ({
    default: module.VendorAdvanceSidebar,
  })),
);

const VendorPaymentSidebar = React.lazy(() =>
  import("./moneyOutOverlays/VendorPaymentSidebar").then((module) => ({
    default: module.VendorPaymentSidebar,
  })),
);

const TransferSidebar = React.lazy(() =>
  import("./moneyOutOverlays/TransferSidebar").then((module) => ({
    default: module.TransferSidebar,
  })),
);

const CardPaymentSidebar = React.lazy(() =>
  import("./moneyOutOverlays/CardPaymentSidebar").then((module) => ({
    default: module.CardPaymentSidebar,
  })),
);

const OwnerDrawingsSidebar = React.lazy(() =>
  import("./moneyOutOverlays/OwnerDrawingsSidebar").then((module) => ({
    default: module.OwnerDrawingsSidebar,
  })),
);

const DepositToOtherAccountsSidebar = React.lazy(() =>
  import("./moneyOutOverlays/DepositToOtherAccountsSidebar").then((module) => ({
    default: module.DepositToOtherAccountsSidebar,
  })),
);

type AccountDetailMoneyOutOverlaysProps = {
  controller: AccountDetailController;
};

export function AccountDetailMoneyOutOverlays({
  controller,
}: AccountDetailMoneyOutOverlaysProps) {
  return (
    <>
      {controller.showExpenseSidebar && (
        <Suspense fallback={null}>
          <ExpenseSidebar
            expenseFormData={controller.expenseFormData}
            setExpenseFormData={controller.setExpenseFormData}
            expenseAccountOpen={controller.expenseAccountOpen}
            setExpenseAccountOpen={controller.setExpenseAccountOpen}
            vendorOpen={controller.vendorOpen}
            setVendorOpen={controller.setVendorOpen}
            customerOpen={controller.customerOpen}
            setCustomerOpen={controller.setCustomerOpen}
            currencyOpen={controller.currencyOpen}
            setCurrencyOpen={controller.setCurrencyOpen}
            expenseAccountRef={controller.expenseAccountRef}
            vendorRef={controller.vendorRef}
            customerRef={controller.customerRef}
            currencyRef={controller.currencyRef}
            fileInputRef={controller.fileInputRef}
            resolvedBaseCurrency={controller.resolvedBaseCurrency}
            vendorNames={controller.vendorNames}
            customerNames={controller.customerNames}
            handleSaveExpense={controller.handleSaveExpense}
            setShowExpenseSidebar={controller.setShowExpenseSidebar}
          />
        </Suspense>
      )}

      {controller.showVendorAdvanceSidebar && (
        <Suspense fallback={null}>
          <VendorAdvanceSidebar
            vendorAdvanceFormData={controller.vendorAdvanceFormData}
            setVendorAdvanceFormData={controller.setVendorAdvanceFormData}
            vendorAdvanceVendorOpen={controller.vendorAdvanceVendorOpen}
            setVendorAdvanceVendorOpen={controller.setVendorAdvanceVendorOpen}
            paidViaOpen={controller.paidViaOpen}
            setPaidViaOpen={controller.setPaidViaOpen}
            depositToOpen={controller.depositToOpen}
            setDepositToOpen={controller.setDepositToOpen}
            vendorAdvanceVendorRef={controller.vendorAdvanceVendorRef}
            paidViaRef={controller.paidViaRef}
            depositToRef={controller.depositToRef}
            vendorNames={controller.vendorNames}
            bankAccountNames={controller.bankAccountNames}
            handleSaveVendorAdvance={controller.handleSaveVendorAdvance}
            setShowVendorAdvanceSidebar={controller.setShowVendorAdvanceSidebar}
          />
        </Suspense>
      )}

      {controller.showVendorPaymentSidebar && (
        <Suspense fallback={null}>
          <VendorPaymentSidebar
            vendorPaymentFormData={controller.vendorPaymentFormData}
            setVendorPaymentFormData={controller.setVendorPaymentFormData}
            vendorPaymentVendorOpen={controller.vendorPaymentVendorOpen}
            setVendorPaymentVendorOpen={controller.setVendorPaymentVendorOpen}
            vendorPaymentPaidViaOpen={controller.vendorPaymentPaidViaOpen}
            setVendorPaymentPaidViaOpen={controller.setVendorPaymentPaidViaOpen}
            vendorPaymentVendorRef={controller.vendorPaymentVendorRef}
            vendorPaymentPaidViaRef={controller.vendorPaymentPaidViaRef}
            vendorNames={controller.vendorNames}
            resolvedBaseCurrency={controller.resolvedBaseCurrency}
            handleSaveVendorPayment={controller.handleSaveVendorPayment}
            setShowVendorPaymentSidebar={controller.setShowVendorPaymentSidebar}
          />
        </Suspense>
      )}

      {controller.showTransferSidebar && (
        <Suspense fallback={null}>
          <TransferSidebar
            transferFormData={controller.transferFormData}
            setTransferFormData={controller.setTransferFormData}
            fromAccountOpen={controller.fromAccountOpen}
            setFromAccountOpen={controller.setFromAccountOpen}
            toAccountOpen={controller.toAccountOpen}
            setToAccountOpen={controller.setToAccountOpen}
            transferCurrencyOpen={controller.transferCurrencyOpen}
            setTransferCurrencyOpen={controller.setTransferCurrencyOpen}
            fromAccountRef={controller.fromAccountRef}
            toAccountRef={controller.toAccountRef}
            transferCurrencyRef={controller.transferCurrencyRef}
            transferFileInputRef={controller.transferFileInputRef}
            transferBankSelectionOptions={controller.transferBankSelectionOptions}
            resolvedBaseCurrency={controller.resolvedBaseCurrency}
            handleSaveTransferOut={controller.handleSaveTransferOut}
            setShowTransferSidebar={controller.setShowTransferSidebar}
          />
        </Suspense>
      )}

      {controller.showCardPaymentSidebar && (
        <Suspense fallback={null}>
          <CardPaymentSidebar
            cardPaymentFormData={controller.cardPaymentFormData}
            setCardPaymentFormData={controller.setCardPaymentFormData}
            cardPaymentFromAccountOpen={controller.cardPaymentFromAccountOpen}
            setCardPaymentFromAccountOpen={controller.setCardPaymentFromAccountOpen}
            cardPaymentToAccountOpen={controller.cardPaymentToAccountOpen}
            setCardPaymentToAccountOpen={controller.setCardPaymentToAccountOpen}
            cardPaymentFromAccountRef={controller.cardPaymentFromAccountRef}
            cardPaymentToAccountRef={controller.cardPaymentToAccountRef}
            cardPaymentFileInputRef={controller.cardPaymentFileInputRef}
            handleSaveCardPayment={controller.handleSaveCardPayment}
            setShowCardPaymentSidebar={controller.setShowCardPaymentSidebar}
          />
        </Suspense>
      )}

      {controller.showOwnerDrawingsSidebar && (
        <Suspense fallback={null}>
          <OwnerDrawingsSidebar
            ownerDrawingsFormData={controller.ownerDrawingsFormData}
            setOwnerDrawingsFormData={controller.setOwnerDrawingsFormData}
            ownerDrawingsToAccountOpen={controller.ownerDrawingsToAccountOpen}
            setOwnerDrawingsToAccountOpen={controller.setOwnerDrawingsToAccountOpen}
            ownerDrawingsToAccountRef={controller.ownerDrawingsToAccountRef}
            ownerDrawingsFileInputRef={controller.ownerDrawingsFileInputRef}
            transferAccountSelectionOptions={controller.transferAccountSelectionOptions}
            handleSaveOwnerDrawings={controller.handleSaveOwnerDrawings}
            setShowOwnerDrawingsSidebar={controller.setShowOwnerDrawingsSidebar}
          />
        </Suspense>
      )}

      {controller.showDepositToOtherAccountsSidebar && (
        <Suspense fallback={null}>
          <DepositToOtherAccountsSidebar
            depositToOtherAccountsFormData={controller.depositToOtherAccountsFormData}
            setDepositToOtherAccountsFormData={controller.setDepositToOtherAccountsFormData}
            depositToOtherAccountsPaidViaOpen={controller.depositToOtherAccountsPaidViaOpen}
            setDepositToOtherAccountsPaidViaOpen={controller.setDepositToOtherAccountsPaidViaOpen}
            depositToOtherAccountsToAccountOpen={controller.depositToOtherAccountsToAccountOpen}
            setDepositToOtherAccountsToAccountOpen={controller.setDepositToOtherAccountsToAccountOpen}
            depositToOtherAccountsReceivedFromOpen={
              controller.depositToOtherAccountsReceivedFromOpen
            }
            setDepositToOtherAccountsReceivedFromOpen={
              controller.setDepositToOtherAccountsReceivedFromOpen
            }
            depositToOtherAccountsPaidViaRef={controller.depositToOtherAccountsPaidViaRef}
            depositToOtherAccountsToAccountRef={controller.depositToOtherAccountsToAccountRef}
            depositToOtherAccountsReceivedFromRef={
              controller.depositToOtherAccountsReceivedFromRef
            }
            depositToOtherAccountsFileInputRef={controller.depositToOtherAccountsFileInputRef}
            bankAccountNames={controller.bankAccountNames}
            customerNames={controller.customerNames}
            handleSaveDepositToOtherAccounts={controller.handleSaveDepositToOtherAccounts}
            setShowDepositToOtherAccountsSidebar={
              controller.setShowDepositToOtherAccountsSidebar
            }
          />
        </Suspense>
      )}
    </>
  );
}
