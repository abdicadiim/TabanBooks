import React, { useEffect, useState } from "react";
import { FileSpreadsheet, FileText, Image as ImageIcon, Trash2, X } from "lucide-react";
import {
  formatFileSize,
  getDocumentFolderName,
  getDocumentKind,
  getDocumentStatus,
  isImageDocument,
} from "../helpers";
import type { DocumentItem } from "../types";

type DocumentDetailPanelProps = {
  document: DocumentItem;
  canEdit: boolean;
  canDelete: boolean;
  folderOptions: string[];
  onClose: () => void;
  onRename: (documentId: string, name: string) => void | Promise<void>;
  onMove: (documentId: string, folderName: string) => void | Promise<void>;
  onDelete: (documentId: string) => void | Promise<void>;
};

export default function DocumentDetailPanel({
  document,
  canEdit,
  canDelete,
  folderOptions,
  onClose,
  onRename,
  onMove,
  onDelete,
}: DocumentDetailPanelProps) {
  const [name, setName] = useState(document.name);
  const [movingTo, setMovingTo] = useState(getDocumentFolderName(document));

  useEffect(() => {
    setName(document.name);
    setMovingTo(getDocumentFolderName(document));
  }, [document]);

  const handleRename = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === document.name) return;
    await onRename(document.id, trimmedName);
  };

  const handleMove = async (folderName: string) => {
    setMovingTo(folderName);
    await onMove(document.id, folderName);
  };

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Document Details</h2>
          <p className="text-sm text-slate-500">Preview and manage the selected file.</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-auto px-6 py-5">
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#156372] shadow-sm">
            {isImageDocument(document) ? (
              <ImageIcon size={22} />
            ) : getDocumentKind(document) === "Sheet" ? (
              <FileSpreadsheet size={22} />
            ) : (
              <FileText size={22} />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">{document.name}</div>
            <div className="mt-1 text-xs text-slate-500">
              {getDocumentKind(document)} • {formatFileSize(document.size)}
            </div>
          </div>
        </div>

        {isImageDocument(document) && document.previewUrl ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
            <img src={document.previewUrl} alt={document.name} className="h-64 w-full object-cover" />
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">File Name</label>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canEdit}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/10 disabled:bg-slate-50"
            />
            {canEdit ? (
              <button
                onClick={() => void handleRename()}
                className="rounded-xl bg-[#156372] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#104e59]"
              >
                Save
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Move To</label>
          <select
            value={movingTo}
            onChange={(event) => void handleMove(event.target.value)}
            disabled={!canEdit}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/10 disabled:bg-slate-50"
          >
            {folderOptions.map((folderName) => (
              <option key={folderName} value={folderName}>
                {folderName}
              </option>
            ))}
          </select>
        </div>

        <dl className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <div>
            <dt className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Status</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">{getDocumentStatus(document)}</dd>
          </div>
          <div>
            <dt className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Folder</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">{getDocumentFolderName(document)}</dd>
          </div>
          <div>
            <dt className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Uploaded By</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">{document.uploadedBy || "Me"}</dd>
          </div>
          <div>
            <dt className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Uploaded On</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {document.uploadedOnFormatted || document.uploadedOn || "Recently"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Associated To</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">{String(document.associatedTo || "Not linked")}</dd>
          </div>
        </dl>
      </div>

      {canDelete ? (
        <div className="border-t border-slate-100 px-6 py-4">
          <button
            onClick={() => void onDelete(document.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={16} />
            Delete Document
          </button>
        </div>
      ) : null}
    </aside>
  );
}
