import React, { Suspense } from "react";
import { AccountDetailMainContent } from "./accountDetail/AccountDetailMainContent";
import { useAccountDetailController } from "./accountDetail/useAccountDetailController";

const AccountDetailOverlays = React.lazy(() => import("./accountDetail/AccountDetailOverlays"));

export default function AccountDetail() {
  const controller = useAccountDetailController();

  const hasOpenOverlay =
    controller.isSearchModalOpen ||
    controller.showDeleteConfirm ||
    controller.showExpenseSidebar ||
    controller.showVendorAdvanceSidebar ||
    controller.showVendorPaymentSidebar ||
    controller.showTransferSidebar ||
    controller.showCardPaymentSidebar ||
    controller.showOwnerDrawingsSidebar ||
    controller.showDepositToOtherAccountsSidebar ||
    controller.showCreditNoteRefundSidebar ||
    controller.showPaymentRefundSidebar ||
    controller.showEmployeeReimbursementSidebar ||
    controller.showCustomerAdvanceSidebar ||
    controller.showCustomerPaymentSidebar ||
    controller.showTransferFromAnotherAccountSidebar ||
    controller.showMoneyInEntrySidebar;

  return (
    <div
      style={{
        paddingTop: "56px",
        backgroundColor: "#f7f8fc",
        paddingRight: "24px",
        paddingBottom: "24px",
      }}
    >
      <AccountDetailMainContent controller={controller} />
      {hasOpenOverlay && (
        <Suspense fallback={null}>
          <AccountDetailOverlays controller={controller} />
        </Suspense>
      )}
    </div>
  );
}
