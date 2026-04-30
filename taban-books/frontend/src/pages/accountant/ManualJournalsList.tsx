import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { AccountantDirectorySidebar } from "./components/AccountantDirectorySidebar";
import { ManualJournalAdvancedSearchModal } from "./manualJournalsList/ManualJournalAdvancedSearchModal";
import { ManualJournalExportModal } from "./manualJournalsList/ManualJournalExportModal";
import { ManualJournalTemplateModal } from "./manualJournalsList/ManualJournalTemplateModal";
import { ManualJournalTemplateSidebar } from "./manualJournals/ManualJournalTemplateSidebar";
import { ManualJournalsListBulkActions } from "./manualJournalsList/ManualJournalsListBulkActions";
import { ManualJournalsListHeader } from "./manualJournalsList/ManualJournalsListHeader";
import { ManualJournalsListTable } from "./manualJournalsList/ManualJournalsListTable";
import { useManualJournalsListController } from "./manualJournalsList/useManualJournalsListController";

function ManualJournalsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const controller = useManualJournalsListController(location.pathname);

  const [isTemplateSidebarOpen, setIsTemplateSidebarOpen] = useState(false);

  const openNewJournal = () => {
    navigate("/accountant/manual-journals/new");
  };

  const openTemplateSidebar = () => {
    setIsTemplateSidebarOpen(true);
  };

  const closeTemplateSidebar = () => {
    setIsTemplateSidebarOpen(false);
  };

  return (
    <>
      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          backgroundColor: "#f8fafc",
        }}
      >
        <ManualJournalsListBulkActions
          isBusy={controller.isBusy}
          selectedCount={controller.selectedJournals.length}
          onClearSelection={controller.clearSelection}
          onDeleteSelection={controller.deleteSelectedJournals}
          onPublishSelection={controller.publishSelectedJournals}
        />

        <ManualJournalsListHeader
          activeViewKey={controller.activeViewKey}
          hasActiveSearch={controller.hasActiveSearch}
          importActions={controller.importActions}
          isBusy={controller.isBusy}
          periodOptions={controller.periodOptions}
          selectedPeriod={controller.selectedPeriod}
          sortBy={controller.sortBy}
          sortOrder={controller.sortOrder}
          sortOptions={controller.sortOptions}
          totalCount={controller.filteredJournals.length}
          viewOptions={controller.viewOptions}
          onChangePeriod={controller.setSelectedPeriod}
          onChangeSort={controller.setSortBy}
          onChangeView={controller.handleViewSelectionChange}
          onClearAdvancedSearch={controller.clearAdvancedSearch}
          onImport={(route) => navigate(route)}
          onManageTemplates={() =>
            navigate("/accountant/manual-journals/templates")
          }
          onNewCustomView={() =>
            navigate("/accountant/manual-journals/new-custom-view")
          }
          onNewFromTemplate={openTemplateSidebar}
          onNewJournal={openNewJournal}
          onNewTemplate={() =>
            navigate("/accountant/manual-journals/templates/new")
          }
          onOpenAccountants={controller.openAccountants}
          onOpenExport={controller.openExportModal}
          onOpenSearch={controller.openSearchModal}
          onToggleSortOrder={controller.toggleSortOrder}
        />

        <ManualJournalsListTable
          hasBaseRecords={controller.manualJournals.length > 0}
          isLoading={controller.isLoading}
          journals={controller.filteredJournals}
          selectedJournalIds={controller.selectedJournals}
          sortBy={controller.sortBy}
          sortOrder={controller.sortOrder}
          onCreateJournal={openNewJournal}
          onOpenRecurringModal={openTemplateSidebar}
          onOpenJournal={(journalId) =>
            navigate(`/accountant/manual-journals/${journalId}`)
          }
          onImportJournals={() => navigate("/accountant/manual-journals/import")}
          onOpenSearch={controller.openSearchModal}
          onSelectAll={controller.selectAllJournals}
          onSelectJournal={controller.toggleJournalSelection}
          onToggleDateSort={controller.toggleDateSort}
        />
      </div>

      <ManualJournalAdvancedSearchModal
        formData={controller.searchFormData}
        open={controller.isSearchModalOpen}
        onApply={controller.applyAdvancedSearch}
        onChange={controller.updateSearchForm}
        onClose={controller.closeSearchModal}
        onReset={controller.resetSearchForm}
      />

      <ManualJournalExportModal
        exportType={controller.exportModalType}
        exportSettings={controller.exportSettings}
        isBusy={controller.isBusy}
        open={controller.isExportModalOpen}
        templates={controller.savedTemplates}
        onChangeSettings={controller.updateExportSettings}
        onClose={controller.closeExportModal}
        onConfirmExport={controller.confirmExport}
        onOpenTemplateModal={controller.openTemplateModal}
      />

      <ManualJournalTemplateModal
        fieldMappings={controller.templateMappings}
        open={controller.isTemplateModalOpen}
        templateName={controller.templateName}
        onAddField={controller.addTemplateField}
        onChangeFieldMapping={controller.updateTemplateFieldMapping}
        onChangeTemplateName={controller.setTemplateName}
        onClose={controller.closeTemplateModal}
        onRemoveField={controller.removeTemplateField}
        onSave={controller.saveTemplate}
      />

      <ManualJournalTemplateSidebar
        open={isTemplateSidebarOpen}
        isLoading={controller.isLoading}
        templates={controller.savedTemplates}
        onClose={closeTemplateSidebar}
        onCreateTemplate={() =>
          navigate("/accountant/manual-journals/templates/new")
        }
        onApply={(template) => {
          closeTemplateSidebar();
          navigate("/accountant/manual-journals/new?fromTemplate=true", {
            state: { template },
          });
        }}
      />

      <AccountantDirectorySidebar
        description="Connect with an accountant in your region to review journal workflows, closing controls, and period-end adjustments."
        open={controller.isFindAccountantsOpen}
        title="Find Accountants"
        onClose={controller.closeAccountants}
      />
    </>
  );
}

export default ManualJournalsList;
