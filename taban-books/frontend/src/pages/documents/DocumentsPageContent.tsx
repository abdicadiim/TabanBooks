import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Download,
  FolderPlus,
  Search,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { addMultipleDocuments, deleteDocument, getAllDocuments, refreshDocuments, updateDocument } from "../../utils/documentStorage";
import { usePermissions } from "../../hooks/usePermissions";
import { useDocumentsSync } from "../../hooks/useDocumentsSync";
import {
  filterDocuments,
  getDestinationFolderName,
  getDocumentFolderName,
  getViewTitle,
  isBankStatementDocument,
  isInboxDocument,
  loadStoredFolders,
  mergeFolders,
  saveStoredFolders,
  sortDocuments,
} from "./helpers";
import type { DocumentItem, DocumentSortKey, FolderItem } from "./types";
import DocumentsSidebar from "./components/DocumentsSidebar";
import DocumentsTable from "./components/DocumentsTable";
import DocumentDetailPanel from "./components/DocumentDetailPanel";
import type { CloudPickerFile } from "./components/CloudPickerModal";

const CloudPickerModal = lazy(() => import("./components/CloudPickerModal"));
const ExportDocumentsModal = lazy(() => import("./components/ExportDocumentsModal"));
const NewFolderModal = lazy(() => import("./components/NewFolderModal"));

function DocumentsModalFallback() {
  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
      <div className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-500 shadow-2xl">
        Loading...
      </div>
    </div>
  );
}

export default function DocumentsPageContent() {
  const navigate = useNavigate();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const syncState = useDocumentsSync();

  const canCreateDocuments =
    hasPermission("documents", "documents", "create") || hasPermission("documents", undefined, "create");
  const canEditDocuments =
    hasPermission("documents", "documents", "edit") || hasPermission("documents", undefined, "edit");
  const canDeleteDocuments =
    hasPermission("documents", "documents", "delete") || hasPermission("documents", undefined, "delete");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    return (getAllDocuments({ module: "Documents" }) as DocumentItem[]) || [];
  });
  const [folders, setFolders] = useState<FolderItem[]>(() => loadStoredFolders());
  const [activeView, setActiveView] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState<DocumentSortKey>("uploadedOn");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const reloadDocuments = async (quiet = false) => {
    if (!quiet && documents.length === 0) {
      setIsLoading(true);
    }
    try {
      const refreshed = ((await refreshDocuments({ module: "Documents" })) || []) as DocumentItem[];
      setDocuments(refreshed);
    } finally {
      if (!quiet && documents.length === 0) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    setDocuments(((syncState.data || []).filter((document) => document.module === "Documents")) as DocumentItem[]);
  }, [syncState.data]);

  useEffect(() => {
    void reloadDocuments(true);
    // The cache-driven table already renders instantly; this only backfills
    // if the local dataset is empty on first mount.
  }, []);

  useEffect(() => {
    const sync = () => {
      void reloadDocuments();
    };

    window.addEventListener("documentAdded", sync);
    window.addEventListener("documentDeleted", sync);
    window.addEventListener("documentUpdated", sync);

    return () => {
      window.removeEventListener("documentAdded", sync);
      window.removeEventListener("documentDeleted", sync);
      window.removeEventListener("documentUpdated", sync);
    };
  }, []);

  useEffect(() => {
    setFolders((current) => mergeFolders(current, documents));
  }, [documents]);

  useEffect(() => {
    saveStoredFolders(folders);
  }, [folders]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeView, searchQuery, statusFilter, typeFilter, sortBy]);

  useEffect(() => {
    const documentIds = new Set(documents.map((document) => document.id));
    setSelectedIds((current) => current.filter((id) => documentIds.has(id)));
    setActiveDocumentId((current) => (current && documentIds.has(current) ? current : null));
  }, [documents]);

  const visibleDocuments = useMemo(() => {
    const scopedDocuments =
      activeView === "all"
        ? documents
        : activeView === "bank"
          ? documents.filter(isBankStatementDocument)
          : activeView === "inbox"
            ? documents.filter(isInboxDocument)
            : documents.filter((document) => {
                const folderName = folders.find((folder) => folder.id === activeView)?.name;
                return folderName ? getDocumentFolderName(document) === folderName : false;
              });

    return sortDocuments(
      filterDocuments(scopedDocuments, {
        searchQuery,
        statusFilter,
        typeFilter,
      }),
      sortBy,
    );
  }, [activeView, documents, folders, searchQuery, sortBy, statusFilter, typeFilter]);

  const counts = useMemo(() => {
    const byFolder = folders.reduce<Record<string, number>>((accumulator, folder) => {
      accumulator[folder.name] = documents.filter((document) => getDocumentFolderName(document) === folder.name).length;
      return accumulator;
    }, {});

    return {
      all: documents.length,
      inbox: documents.filter(isInboxDocument).length,
      bank: documents.filter(isBankStatementDocument).length,
      byFolder,
    };
  }, [documents, folders]);

  const allVisibleSelected =
    visibleDocuments.length > 0 && visibleDocuments.every((document) => selectedIds.includes(document.id));
  const selectedCount = selectedIds.length;
  const activeDocument = documents.find((document) => document.id === activeDocumentId) || null;
  const folderOptions = ["Inbox", "Bank Statements", ...folders.map((folder) => folder.name)];
  const currentViewTitle = getViewTitle(activeView, folders);

  const handleToggleSelect = (documentId: string) => {
    setSelectedIds((current) =>
      current.includes(documentId) ? current.filter((id) => id !== documentId) : [...current, documentId],
    );
  };

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(visibleDocuments.map((document) => document.id));
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!canCreateDocuments || !fileList?.length) return;

    const folderName = getDestinationFolderName(activeView, folders);
    await addMultipleDocuments(Array.from(fileList), {
      module: "Documents",
      folder: folderName,
      status: activeView === "bank" ? "Scan In Progress" : "Processed",
    });

    await reloadDocuments(true);
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await handleUploadFiles(event.target.files);
    event.target.value = "";
  };

  const handleCloudAttach = async (cloudFiles: CloudPickerFile[]) => {
    if (!canCreateDocuments) return;

    const targetFolder = getDestinationFolderName(activeView, folders);
    const pseudoFiles = cloudFiles.map(
      (file) =>
        new File([""], file.name, {
          type: "application/octet-stream",
        }),
    );

    await addMultipleDocuments(pseudoFiles, {
      module: "Documents",
      folder: targetFolder,
      status: "Processed",
      source: "cloud-picker",
    });

    await reloadDocuments(true);
  };

  const handleMoveDocuments = async (documentIds: string[], folderName: string) => {
    if (!canEditDocuments || !folderName || !documentIds.length) return;

    await Promise.all(documentIds.map((documentId) => updateDocument(documentId, { folder: folderName })));
    await reloadDocuments(true);
  };

  const handleRenameDocument = async (documentId: string, name: string) => {
    if (!canEditDocuments) return;
    await updateDocument(documentId, { name });
    await reloadDocuments(true);
  };

  const handleDeleteDocuments = async (documentIds: string[]) => {
    if (!canDeleteDocuments || !documentIds.length) return;

    await Promise.all(documentIds.map((documentId) => deleteDocument(documentId)));
    await reloadDocuments(true);
    setSelectedIds([]);
  };

  const handleSaveFolder = async (values: { name: string; permission: string }) => {
    if (editingFolder) {
      if (!canEditDocuments) return;

      const previousFolderName = editingFolder.name;
      const renamedFolder = { ...editingFolder, ...values };
      setFolders((current) => current.map((folder) => (folder.id === editingFolder.id ? renamedFolder : folder)));

      if (previousFolderName !== values.name) {
        const folderDocuments = documents.filter((document) => getDocumentFolderName(document) === previousFolderName);
        await Promise.all(folderDocuments.map((document) => updateDocument(document.id, { folder: values.name })));
        await reloadDocuments(true);
      }

      return;
    }

    if (!canCreateDocuments) return;
    setFolders((current) => [...current, { id: `${Date.now()}`, name: values.name, permission: values.permission }]);
  };

  const handleDeleteFolder = async (folder: FolderItem) => {
    if (!canDeleteDocuments) return;

    const folderDocuments = documents.filter((document) => getDocumentFolderName(document) === folder.name);
    if (folderDocuments.length) {
      await Promise.all(folderDocuments.map((document) => updateDocument(document.id, { folder: "Inbox" })));
      await reloadDocuments(true);
    }

    setFolders((current) => current.filter((item) => item.id !== folder.id));
    if (activeView === folder.id) {
      setActiveView("inbox");
    }
  };

  if (permissionsLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading documents...</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-[#f3f4f6] text-slate-900">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(event) => void handleFileInputChange(event)}
        className="hidden"
      />

      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#156372] transition hover:text-[#104e59]"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Documents</h1>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DocumentsSidebar
          activeView={activeView}
          folders={folders}
          counts={counts}
          onSelectView={setActiveView}
          onCreateFolder={() => {
            setEditingFolder(null);
            setIsFolderModalOpen(true);
          }}
          onEditFolder={(folder) => {
            setEditingFolder(folder);
            setIsFolderModalOpen(true);
          }}
          onDeleteFolder={(folder) => void handleDeleteFolder(folder)}
          canCreate={canCreateDocuments}
          canEdit={canEditDocuments}
          canDelete={canDeleteDocuments}
        />

        <main className="flex min-w-0 flex-1 bg-white">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">{currentViewTitle}</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      {visibleDocuments.length} visible
                    </span>
                  </div>
                  {activeView === "bank" ? (
                    <p className="mt-2 text-sm text-slate-500">
                      Forward bank statements to{" "}
                      <span className="font-semibold text-slate-700">taban.documents@inbox.tabanbooks.com</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      Manage uploads, organize folders, and work from a much lighter page.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {canCreateDocuments ? (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Upload size={16} />
                        Upload
                      </button>
                      <button
                        onClick={() => setIsCloudPickerOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Upload size={16} />
                        Cloud
                      </button>
                    </>
                  ) : null}
                  {canCreateDocuments ? (
                    <button
                      onClick={() => {
                        setEditingFolder(null);
                        setIsFolderModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <FolderPlus size={16} />
                      New Folder
                    </button>
                  ) : null}
                  <button
                    onClick={() => setIsExportOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#156372] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#104e59]"
                  >
                    <Download size={16} />
                    Export
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <label className="relative min-w-[240px] flex-1 sm:max-w-sm">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search documents"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/10"
                  />
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/10"
                >
                  <option value="All">All Statuses</option>
                  <option value="Processed">Processed</option>
                  <option value="Scan In Progress">Scan In Progress</option>
                  <option value="Scan Failed">Scan Failed</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/10"
                >
                  <option value="All">All Types</option>
                  <option value="Image">Images</option>
                  <option value="PDF">PDF</option>
                  <option value="Sheet">Sheets</option>
                  <option value="Doc">Docs</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as DocumentSortKey)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/10"
                >
                  <option value="uploadedOn">Sort: Latest</option>
                  <option value="name">Sort: Name</option>
                  <option value="uploadedBy">Sort: Uploaded By</option>
                  <option value="folder">Sort: Folder</option>
                </select>
              </div>

              {syncState.isOffline || syncState.pendingOperations ? (
                <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  {syncState.isOffline
                    ? "Working offline from the local cache. Changes stay available and will sync when the network returns."
                    : `${syncState.pendingOperations} change${syncState.pendingOperations === 1 ? "" : "s"} waiting to sync.`}
                </div>
              ) : null}
            </div>

            {selectedCount ? (
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-3">
                <span className="text-sm font-semibold text-slate-700">
                  {selectedCount} selected
                </span>

                {canEditDocuments ? (
                  <select
                    value={moveTarget}
                    onChange={(event) => {
                      const folderName = event.target.value;
                      setMoveTarget(folderName);
                      void handleMoveDocuments(selectedIds, folderName).then(() => setMoveTarget(""));
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/10"
                  >
                    <option value="">Move selected to...</option>
                    {folderOptions.map((folderName) => (
                      <option key={folderName} value={folderName}>
                        {folderName}
                      </option>
                    ))}
                  </select>
                ) : null}

                {canDeleteDocuments ? (
                  <button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Delete Selected
                  </button>
                ) : null}
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Refreshing documents...</div>
            ) : (
              <DocumentsTable
                documents={visibleDocuments}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                onOpenDetails={setActiveDocumentId}
              />
            )}
          </div>

          {activeDocument ? (
            <DocumentDetailPanel
              document={activeDocument}
              canEdit={canEditDocuments}
              canDelete={canDeleteDocuments}
              folderOptions={folderOptions}
              onClose={() => setActiveDocumentId(null)}
              onRename={(documentId, name) => void handleRenameDocument(documentId, name)}
              onMove={(documentId, folderName) => void handleMoveDocuments([documentId], folderName)}
              onDelete={(documentId) =>
                void handleDeleteDocuments([documentId]).then(() => {
                  setActiveDocumentId(null);
                })
              }
            />
          ) : null}
        </main>
      </div>

      {isDeleteConfirmOpen ? (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Delete Selected Documents</h2>
              <p className="mt-1 text-sm text-slate-500">
                This permanently removes the selected files from Documents.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void handleDeleteDocuments(selectedIds).then(() => {
                    setIsDeleteConfirmOpen(false);
                  });
                }}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isFolderModalOpen ? (
        <Suspense fallback={<DocumentsModalFallback />}>
          <NewFolderModal
            isOpen={isFolderModalOpen}
            initialData={editingFolder}
            onClose={() => {
              setIsFolderModalOpen(false);
              setEditingFolder(null);
            }}
            onSave={(values) => void handleSaveFolder(values)}
          />
        </Suspense>
      ) : null}

      {isCloudPickerOpen ? (
        <Suspense fallback={<DocumentsModalFallback />}>
          <CloudPickerModal
            isOpen={isCloudPickerOpen}
            onClose={() => setIsCloudPickerOpen(false)}
            onAttach={(files) => void handleCloudAttach(files)}
          />
        </Suspense>
      ) : null}

      {isExportOpen ? (
        <Suspense fallback={<DocumentsModalFallback />}>
          <ExportDocumentsModal
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            documents={visibleDocuments}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

