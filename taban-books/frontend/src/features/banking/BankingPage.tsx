import { AllAccountsSection } from "./bankingPage/AllAccountsSection";
import { BankingPageHeader } from "./bankingPage/BankingPageHeader";
import { BankStatementsModal } from "./bankingPage/BankStatementsModal";
import { FindAccountModal } from "./bankingPage/FindAccountModal";
import { useBankingPageController } from "./bankingPage/useBankingPageController";

export default function BankingPage() {
  const controller = useBankingPageController();

  if (controller.loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f7f8fc",
        }}
      >
        <div
          style={{
            fontSize: "18px",
            color: "#156372",
            fontWeight: "500",
          }}
        >
          Loading Banking Data...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#f7f8fc",
        paddingRight: "24px",
        paddingBottom: "24px",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "24px",
        }}
      >
        <BankingPageHeader
          onAddBankAccount={controller.navigateToAddAccount}
          onOpenBankStatements={() =>
            controller.setIsBankStatementsModalOpen(true)
          }
        />

        <AllAccountsSection controller={controller} />
      </div>

      <BankStatementsModal
        isOpen={controller.isBankStatementsModalOpen}
        onClose={() => controller.setIsBankStatementsModalOpen(false)}
        onCopy={controller.handleCopyInboxEmail}
      />

      <FindAccountModal
        accountCode={controller.findAccountCode}
        accountName={controller.findAccountName}
        isOpen={controller.isFindAccountModalOpen}
        onAccountCodeChange={controller.setFindAccountCode}
        onAccountNameChange={controller.setFindAccountName}
        onClose={controller.closeFindAccountModal}
        onSearch={controller.handleFindAccountSearch}
      />
    </div>
  );
}
