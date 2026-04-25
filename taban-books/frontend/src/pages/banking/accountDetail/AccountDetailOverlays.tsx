import React, { Suspense } from "react";
import type { AccountDetailController } from "./types";

const AccountDetailModalOverlays = React.lazy(() =>
  import("./AccountDetailModalOverlays").then((module) => ({
    default: module.AccountDetailModalOverlays,
  }))
);

const AccountDetailMoneyOutOverlays = React.lazy(() =>
  import("./AccountDetailMoneyOutOverlays").then((module) => ({
    default: module.AccountDetailMoneyOutOverlays,
  }))
);

const AccountDetailMoneyInOverlays = React.lazy(() =>
  import("./AccountDetailMoneyInOverlays").then((module) => ({
    default: module.AccountDetailMoneyInOverlays,
  }))
);

export default function AccountDetailOverlays({ controller }: { controller: AccountDetailController }) {
  const showModalOverlays = controller.isSearchModalOpen || controller.showDeleteConfirm;
  const showMoneyOutOverlays =
    controller.showExpenseSidebar ||
    controller.showVendorAdvanceSidebar ||
    controller.showVendorPaymentSidebar ||
    controller.showTransferSidebar ||
    controller.showCardPaymentSidebar ||
    controller.showOwnerDrawingsSidebar ||
    controller.showDepositToOtherAccountsSidebar;
  const showMoneyInOverlays =
    controller.showCreditNoteRefundSidebar ||
    controller.showPaymentRefundSidebar ||
    controller.showEmployeeReimbursementSidebar ||
    controller.showCustomerAdvanceSidebar ||
    controller.showCustomerPaymentSidebar ||
    controller.showTransferFromAnotherAccountSidebar ||
    controller.showMoneyInEntrySidebar;

  return (
    <>
      {showModalOverlays && (
        <Suspense fallback={null}>
          <AccountDetailModalOverlays controller={controller} />
        </Suspense>
      )}
      {showMoneyOutOverlays && (
        <Suspense fallback={null}>
          <AccountDetailMoneyOutOverlays controller={controller} />
        </Suspense>
      )}
      {showMoneyInOverlays && (
        <Suspense fallback={null}>
          <AccountDetailMoneyInOverlays controller={controller} />
        </Suspense>
      )}
    </>
  );
}
