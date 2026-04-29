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
      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          backgroundColor: "#ffffff",
        }}
      >
        <ManualJournalEditorHeader
          isEditMode={controller.isEditMode}
          onChooseTemplate={controller.openTemplateSidebar}
        />

        <div
          style={{
            width: "100%",
            display: "grid",
            gap: "18px",
            padding: "12px 12px 28px",
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
            currencyCode={
              controller.baseCurrency?.code || controller.formData.currency || "SOS"
            }
            entries={controller.entries}
            groupedAccounts={controller.groupedAccounts}
            isBusy={controller.isBusy}
            locationOptions={controller.availableLocations}
            onAddRow={controller.addEntry}
            onRemoveRow={controller.removeEntry}
            onSelectAccount={controller.selectAccount}
            onUpdateEntry={controller.updateEntry}
            projectOptions={controller.availableProjects}
            reportingTagOptions={controller.availableReportingTags}
            totals={controller.totals}
          />

          <ManualJournalAttachmentsCard
            attachments={controller.attachments}
            isBusy={controller.isBusy}
            onAddFiles={controller.addAttachments}
            onCancel={controller.navigateBack}
            onPublish={controller.publishJournal}
            onRemoveFile={controller.removeAttachment}
            onSaveDraft={controller.saveAsDraft}
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
