import React, { Suspense } from "react";
import {
  createCreditNoteRefundFormData,
  createCustomerAdvanceFormData,
  createCustomerPaymentFormData,
  createEmployeeReimbursementFormData,
  createMoneyInFormData,
  createPaymentRefundFormData,
  createTransferFromAnotherAccountFormData,
} from "./moneyInOverlayDefaults";
import type { AccountDetailController } from "./types";

const CreditNoteRefundSidebar = React.lazy(() =>
  import("./moneyInOverlays/CreditNoteRefundSidebar").then((module) => ({
    default: module.CreditNoteRefundSidebar,
  })),
);

const PaymentRefundSidebar = React.lazy(() =>
  import("./moneyInOverlays/PaymentRefundSidebar").then((module) => ({
    default: module.PaymentRefundSidebar,
  })),
);

const EmployeeReimbursementSidebar = React.lazy(() =>
  import("./moneyInOverlays/EmployeeReimbursementSidebar").then((module) => ({
    default: module.EmployeeReimbursementSidebar,
  })),
);

const CustomerAdvanceSidebar = React.lazy(() =>
  import("./moneyInOverlays/CustomerAdvanceSidebar").then((module) => ({
    default: module.CustomerAdvanceSidebar,
  })),
);

const CustomerPaymentSidebar = React.lazy(() =>
  import("./moneyInOverlays/CustomerPaymentSidebar").then((module) => ({
    default: module.CustomerPaymentSidebar,
  })),
);

const TransferFromAnotherAccountSidebar = React.lazy(() =>
  import("./moneyInOverlays/TransferFromAnotherAccountSidebar").then((module) => ({
    default: module.TransferFromAnotherAccountSidebar,
  })),
);

const MoneyInEntrySidebar = React.lazy(() =>
  import("./moneyInOverlays/MoneyInEntrySidebar").then((module) => ({
    default: module.MoneyInEntrySidebar,
  })),
);

type AccountDetailMoneyInOverlaysProps = {
  controller: AccountDetailController;
};

export function AccountDetailMoneyInOverlays({
  controller,
}: AccountDetailMoneyInOverlaysProps) {
  const {
    resolvedBaseCurrency,
    showCreditNoteRefundSidebar,
    setShowCreditNoteRefundSidebar,
    creditNoteRefundFormData,
    setCreditNoteRefundFormData,
    creditNoteRefundCustomerOpen,
    setCreditNoteRefundCustomerOpen,
    creditNoteRefundPaidViaOpen,
    setCreditNoteRefundPaidViaOpen,
    creditNoteRefundCustomerRef,
    creditNoteRefundPaidViaRef,
    showPaymentRefundSidebar,
    setShowPaymentRefundSidebar,
    paymentRefundFormData,
    setPaymentRefundFormData,
    paymentRefundCustomerOpen,
    setPaymentRefundCustomerOpen,
    paymentRefundPaidViaOpen,
    setPaymentRefundPaidViaOpen,
    paymentRefundCustomerRef,
    paymentRefundPaidViaRef,
    showEmployeeReimbursementSidebar,
    setShowEmployeeReimbursementSidebar,
    employeeReimbursementFormData,
    setEmployeeReimbursementFormData,
    employeeReimbursementEmployeeOpen,
    setEmployeeReimbursementEmployeeOpen,
    employeeReimbursementEmployeeRef,
    showCustomerAdvanceSidebar,
    setShowCustomerAdvanceSidebar,
    customerAdvanceFormData,
    setCustomerAdvanceFormData,
    customerAdvanceCustomerOpen,
    setCustomerAdvanceCustomerOpen,
    customerAdvanceReceivedViaOpen,
    setCustomerAdvanceReceivedViaOpen,
    customerAdvanceCustomerRef,
    customerAdvanceReceivedViaRef,
    customerAdvanceFileInputRef,
    showCustomerPaymentSidebar,
    setShowCustomerPaymentSidebar,
    customerPaymentFormData,
    setCustomerPaymentFormData,
    customerPaymentCustomerOpen,
    setCustomerPaymentCustomerOpen,
    customerPaymentReceivedViaOpen,
    setCustomerPaymentReceivedViaOpen,
    customerPaymentCustomerRef,
    customerPaymentReceivedViaRef,
    customerPaymentFileInputRef,
    showTransferFromAnotherAccountSidebar,
    setShowTransferFromAnotherAccountSidebar,
    transferFromAnotherAccountFormData,
    setTransferFromAnotherAccountFormData,
    transferFromToAccountOpen,
    setTransferFromToAccountOpen,
    transferFromFromAccountOpen,
    setTransferFromFromAccountOpen,
    transferFromCurrencyOpen,
    setTransferFromCurrencyOpen,
    transferFromToAccountRef,
    transferFromFromAccountRef,
    transferFromCurrencyRef,
    transferFromFileInputRef,
    showMoneyInEntrySidebar,
    setShowMoneyInEntrySidebar,
    moneyInSidebarTitle,
    moneyInFormData,
    setMoneyInFormData,
    moneyInCurrencyOpen,
    setMoneyInCurrencyOpen,
    moneyInReceivedViaOpen,
    setMoneyInReceivedViaOpen,
    moneyInCurrencyRef,
    moneyInReceivedViaRef,
    moneyInFileInputRef,
    customerNames,
    transferBankSelectionOptions,
    handleSaveCreditNoteRefund,
    handleSavePaymentRefund,
    handleSaveEmployeeReimbursement,
    handleSaveCustomerAdvance,
    handleSaveCustomerPayment,
    handleSaveTransferFromAnotherAccount,
    handleSaveMoneyInEntry,
  } = controller;

  const closeCreditNoteRefund = () => {
    setShowCreditNoteRefundSidebar(false);
    setCreditNoteRefundFormData(createCreditNoteRefundFormData());
  };

  const closePaymentRefund = () => {
    setShowPaymentRefundSidebar(false);
    setPaymentRefundFormData(createPaymentRefundFormData());
  };

  const closeEmployeeReimbursement = () => {
    setShowEmployeeReimbursementSidebar(false);
    setEmployeeReimbursementFormData(createEmployeeReimbursementFormData());
  };

  const closeCustomerAdvance = () => {
    setShowCustomerAdvanceSidebar(false);
    setCustomerAdvanceFormData(createCustomerAdvanceFormData());
  };

  const closeCustomerPayment = () => {
    setShowCustomerPaymentSidebar(false);
    setCustomerPaymentFormData(createCustomerPaymentFormData());
  };

  const closeTransferFromAnotherAccount = () => {
    setShowTransferFromAnotherAccountSidebar(false);
    setTransferFromAnotherAccountFormData(
      createTransferFromAnotherAccountFormData(resolvedBaseCurrency),
    );
  };

  const closeMoneyInEntry = () => {
    setShowMoneyInEntrySidebar(false);
    setMoneyInFormData(createMoneyInFormData(resolvedBaseCurrency));
  };

  return (
    <>
      {showCreditNoteRefundSidebar && (
        <Suspense fallback={null}>
          <CreditNoteRefundSidebar
            creditNoteRefundFormData={creditNoteRefundFormData}
            setCreditNoteRefundFormData={setCreditNoteRefundFormData}
            creditNoteRefundCustomerOpen={creditNoteRefundCustomerOpen}
            setCreditNoteRefundCustomerOpen={setCreditNoteRefundCustomerOpen}
            creditNoteRefundPaidViaOpen={creditNoteRefundPaidViaOpen}
            setCreditNoteRefundPaidViaOpen={setCreditNoteRefundPaidViaOpen}
            creditNoteRefundCustomerRef={creditNoteRefundCustomerRef}
            creditNoteRefundPaidViaRef={creditNoteRefundPaidViaRef}
            customerNames={customerNames}
            handleSaveCreditNoteRefund={handleSaveCreditNoteRefund}
            onClose={closeCreditNoteRefund}
          />
        </Suspense>
      )}

      {showPaymentRefundSidebar && (
        <Suspense fallback={null}>
          <PaymentRefundSidebar
            paymentRefundFormData={paymentRefundFormData}
            setPaymentRefundFormData={setPaymentRefundFormData}
            paymentRefundCustomerOpen={paymentRefundCustomerOpen}
            setPaymentRefundCustomerOpen={setPaymentRefundCustomerOpen}
            paymentRefundPaidViaOpen={paymentRefundPaidViaOpen}
            setPaymentRefundPaidViaOpen={setPaymentRefundPaidViaOpen}
            paymentRefundCustomerRef={paymentRefundCustomerRef}
            paymentRefundPaidViaRef={paymentRefundPaidViaRef}
            customerNames={customerNames}
            handleSavePaymentRefund={handleSavePaymentRefund}
            onClose={closePaymentRefund}
          />
        </Suspense>
      )}

      {showEmployeeReimbursementSidebar && (
        <Suspense fallback={null}>
          <EmployeeReimbursementSidebar
            employeeReimbursementFormData={employeeReimbursementFormData}
            setEmployeeReimbursementFormData={setEmployeeReimbursementFormData}
            employeeReimbursementEmployeeOpen={employeeReimbursementEmployeeOpen}
            setEmployeeReimbursementEmployeeOpen={setEmployeeReimbursementEmployeeOpen}
            employeeReimbursementEmployeeRef={employeeReimbursementEmployeeRef}
            handleSaveEmployeeReimbursement={handleSaveEmployeeReimbursement}
            onClose={closeEmployeeReimbursement}
          />
        </Suspense>
      )}

      {showCustomerAdvanceSidebar && (
        <Suspense fallback={null}>
          <CustomerAdvanceSidebar
            customerAdvanceFormData={customerAdvanceFormData}
            setCustomerAdvanceFormData={setCustomerAdvanceFormData}
            customerAdvanceCustomerOpen={customerAdvanceCustomerOpen}
            setCustomerAdvanceCustomerOpen={setCustomerAdvanceCustomerOpen}
            customerAdvanceReceivedViaOpen={customerAdvanceReceivedViaOpen}
            setCustomerAdvanceReceivedViaOpen={setCustomerAdvanceReceivedViaOpen}
            customerAdvanceCustomerRef={customerAdvanceCustomerRef}
            customerAdvanceReceivedViaRef={customerAdvanceReceivedViaRef}
            customerAdvanceFileInputRef={customerAdvanceFileInputRef}
            customerNames={customerNames}
            handleSaveCustomerAdvance={handleSaveCustomerAdvance}
            onClose={closeCustomerAdvance}
          />
        </Suspense>
      )}

      {showCustomerPaymentSidebar && (
        <Suspense fallback={null}>
          <CustomerPaymentSidebar
            customerPaymentFormData={customerPaymentFormData}
            setCustomerPaymentFormData={setCustomerPaymentFormData}
            customerPaymentCustomerOpen={customerPaymentCustomerOpen}
            setCustomerPaymentCustomerOpen={setCustomerPaymentCustomerOpen}
            customerPaymentReceivedViaOpen={customerPaymentReceivedViaOpen}
            setCustomerPaymentReceivedViaOpen={setCustomerPaymentReceivedViaOpen}
            customerPaymentCustomerRef={customerPaymentCustomerRef}
            customerPaymentReceivedViaRef={customerPaymentReceivedViaRef}
            customerPaymentFileInputRef={customerPaymentFileInputRef}
            customerNames={customerNames}
            handleSaveCustomerPayment={handleSaveCustomerPayment}
            onClose={closeCustomerPayment}
          />
        </Suspense>
      )}

      {showTransferFromAnotherAccountSidebar && (
        <Suspense fallback={null}>
          <TransferFromAnotherAccountSidebar
            transferFromAnotherAccountFormData={transferFromAnotherAccountFormData}
            setTransferFromAnotherAccountFormData={setTransferFromAnotherAccountFormData}
            transferFromToAccountOpen={transferFromToAccountOpen}
            setTransferFromToAccountOpen={setTransferFromToAccountOpen}
            transferFromFromAccountOpen={transferFromFromAccountOpen}
            setTransferFromFromAccountOpen={setTransferFromFromAccountOpen}
            transferFromCurrencyOpen={transferFromCurrencyOpen}
            setTransferFromCurrencyOpen={setTransferFromCurrencyOpen}
            transferFromToAccountRef={transferFromToAccountRef}
            transferFromFromAccountRef={transferFromFromAccountRef}
            transferFromCurrencyRef={transferFromCurrencyRef}
            transferFromFileInputRef={transferFromFileInputRef}
            transferBankSelectionOptions={transferBankSelectionOptions}
            resolvedBaseCurrency={resolvedBaseCurrency}
            handleSaveTransferFromAnotherAccount={handleSaveTransferFromAnotherAccount}
            onClose={closeTransferFromAnotherAccount}
          />
        </Suspense>
      )}

      {showMoneyInEntrySidebar && (
        <Suspense fallback={null}>
          <MoneyInEntrySidebar
            moneyInSidebarTitle={moneyInSidebarTitle}
            moneyInFormData={moneyInFormData}
            setMoneyInFormData={setMoneyInFormData}
            moneyInCurrencyOpen={moneyInCurrencyOpen}
            setMoneyInCurrencyOpen={setMoneyInCurrencyOpen}
            moneyInReceivedViaOpen={moneyInReceivedViaOpen}
            setMoneyInReceivedViaOpen={setMoneyInReceivedViaOpen}
            moneyInCurrencyRef={moneyInCurrencyRef}
            moneyInReceivedViaRef={moneyInReceivedViaRef}
            moneyInFileInputRef={moneyInFileInputRef}
            resolvedBaseCurrency={resolvedBaseCurrency}
            handleSaveMoneyInEntry={handleSaveMoneyInEntry}
            onClose={closeMoneyInEntry}
          />
        </Suspense>
      )}
    </>
  );
}
