import React from "react";

import { ManualJournalAttachmentsCard } from "./manualJournals/ManualJournalAttachmentsCard";
import { ManualJournalEditorHeader } from "./manualJournals/ManualJournalEditorHeader";
import { ManualJournalEntriesTable } from "./manualJournals/ManualJournalEntriesTable";
import { ManualJournalFormSection } from "./manualJournals/ManualJournalFormSection";
import { ManualJournalNewTaxModal } from "./manualJournals/ManualJournalNewTaxModal";
import { ManualJournalTemplateSidebar } from "./manualJournals/ManualJournalTemplateSidebar";
import { useManualJournalEditor } from "./manualJournals/useManualJournalEditor";

function ManualJournals() {
  const controller = useManualJournalEditor();

  return (
    <>
      <div style={{ minHeight: "calc(100vh - 60px)", backgroundColor: "#f8fafc" }}>
        <ManualJournalEditorHeader
          isBusy={controller.isBusy}
          isEditMode={controller.isEditMode}
          onBack={controller.navigateBack}
          onChooseTemplate={controller.openTemplateSidebar}
          onPublish={controller.publishJournal}
          onSaveDraft={controller.saveAsDraft}
        />

        <div
          style={{
            margin: "0 auto",
            maxWidth: "1400px",
            display: "grid",
            gap: "20px",
            padding: "24px",
          }}
        >
          {controller.isLoadingJournal ? (
            <div
              style={{
                border: "1px solid #dbeafe",
                borderRadius: "16px",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                padding: "16px 18px",
                fontSize: "14px",
              }}
            >
              Loading journal details...
            </div>
          ) : null}

          {controller.errorMessage ? (
            <div
              style={{
                border: "1px solid #fecaca",
                borderRadius: "16px",
                backgroundColor: "#fef2f2",
                color: "#991b1b",
                padding: "16px 18px",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {controller.errorMessage}
            </div>
          ) : null}

          <ManualJournalFormSection
            currencies={controller.availableCurrencies}
            formData={controller.formData}
            onChange={controller.updateFormField}
          />

          <ManualJournalEntriesTable
            contacts={controller.availableContacts}
            entries={controller.entries}
            groupedAccounts={controller.groupedAccounts}
            isBusy={controller.isBusy}
            onAddRow={controller.addEntry}
            onOpenNewTaxModal={controller.openNewTaxModal}
            onRemoveRow={controller.removeEntry}
            onSelectAccount={controller.selectAccount}
            onUpdateEntry={controller.updateEntry}
            taxOptions={controller.taxOptions}
            totals={controller.totals}
          />

          <ManualJournalAttachmentsCard
            attachments={controller.attachments}
            onAddFiles={controller.addAttachments}
            onRemoveFile={controller.removeAttachment}
          />
        </div>
      </div>

      <ManualJournalTemplateSidebar
        isLoading={controller.isLoadingTemplates}
        open={controller.isTemplateSidebarOpen}
        templates={controller.journalTemplates}
        onApply={controller.applyTemplate}
        onClose={controller.closeTemplateSidebar}
        onCreateTemplate={controller.openNewTemplatePage}
      />

      <ManualJournalNewTaxModal
        formData={controller.newTaxForm}
        open={controller.isNewTaxModalOpen}
        onChange={controller.updateNewTaxField}
        onClose={controller.closeNewTaxModal}
        onSave={controller.saveNewTax}
      />
    </>
  );
}

export default ManualJournals;
