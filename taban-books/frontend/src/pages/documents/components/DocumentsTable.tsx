import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, FileText, Image as ImageIcon } from "lucide-react";
import {
  formatFileSize,
  getDocumentFolderName,
  getDocumentKind,
  getDocumentStatus,
  isImageDocument,
} from "../helpers";
import type { DocumentItem } from "../types";

type DocumentsTableProps = {
  documents: DocumentItem[];
  selectedIds: string[];
  onToggleSelect: (documentId: string) => void;
  onToggleSelectAll: () => void;
  onOpenDetails: (documentId: string) => void;
};

function FileTypeIcon({ document }: { document: DocumentItem }) {
  if (isImageDocument(document)) {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <ImageIcon size={20} />
      </div>
    );
  }

  if (getDocumentKind(document) === "Sheet") {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
        <FileSpreadsheet size={20} />
      </div>
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
      <FileText size={20} />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles =
    status === "Pending Sync"
      ? "bg-sky-50 text-sky-700"
      : status === "Scan In Progress"
      ? "bg-amber-50 text-amber-700"
      : status === "Scan Failed"
        ? "bg-red-50 text-red-700"
        : "bg-emerald-50 text-emerald-700";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{status}</span>;
}

export default function DocumentsTable({
  documents,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenDetails,
}: DocumentsTableProps) {
  const allSelected = documents.length > 0 && documents.every((document) => selectedIds.includes(document.id));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const ROW_HEIGHT = 92;
  const OVERSCAN = 6;

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      setViewportHeight(element?.clientHeight || 0);
      return;
    }

    const observer = new ResizeObserver(() => {
      setViewportHeight(element.clientHeight);
    });

    observer.observe(element);
    setViewportHeight(element.clientHeight);

    return () => observer.disconnect();
  }, []);

  const virtualWindow = useMemo(() => {
    const totalRows = documents.length;
    if (!totalRows) {
      return { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0, visible: [] as typeof documents };
    }

    if (!viewportHeight) {
      return {
        start: 0,
        end: totalRows,
        topSpacer: 0,
        bottomSpacer: 0,
        visible: documents,
      };
    }

    const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT);
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(totalRows, start + visibleCount + OVERSCAN * 2);
    const visible = documents.slice(start, end);

    return {
      start,
      end,
      topSpacer: start * ROW_HEIGHT,
      bottomSpacer: Math.max(0, (totalRows - end) * ROW_HEIGHT),
      visible,
    };
  }, [documents, scrollTop, viewportHeight]);

  return (
    <div
      ref={containerRef}
      className="min-h-0 flex-1 overflow-auto"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <table className="min-w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="text-left">
            <th className="w-14 border-b border-slate-100 px-6 py-4">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 accent-[#156372]"
              />
            </th>
            <th className="border-b border-slate-100 px-6 py-4 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
              Document
            </th>
            <th className="border-b border-slate-100 px-6 py-4 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
              Folder
            </th>
            <th className="border-b border-slate-100 px-6 py-4 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
              Status
            </th>
            <th className="border-b border-slate-100 px-6 py-4 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
              Uploaded
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.length ? (
            <>
              {virtualWindow.topSpacer > 0 ? (
                <tr aria-hidden="true">
                  <td colSpan={5} style={{ height: `${virtualWindow.topSpacer}px` }} />
                </tr>
              ) : null}
              {virtualWindow.visible.map((document) => {
              const selected = selectedIds.includes(document.id);

              return (
                <tr
                  key={document.id}
                  className={`cursor-pointer transition hover:bg-slate-50/80 ${
                    selected ? "bg-[#156372]/5" : "bg-white"
                  }`}
                  onClick={() => onOpenDetails(document.id)}
                >
                  <td className="border-b border-slate-100 px-6 py-4" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleSelect(document.id)}
                      className="h-4 w-4 rounded border-slate-300 accent-[#156372]"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-4">
                      <FileTypeIcon document={document} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{document.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {getDocumentKind(document)} • {formatFileSize(document.size)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-6 py-4 text-sm text-slate-600">
                    {getDocumentFolderName(document)}
                  </td>
                  <td className="border-b border-slate-100 px-6 py-4">
                    <StatusPill status={getDocumentStatus(document)} />
                  </td>
                  <td className="border-b border-slate-100 px-6 py-4 text-sm text-slate-600">
                    <div>{document.uploadedBy || "Me"}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {document.uploadedOnFormatted || document.uploadedOn || "Recently"}
                    </div>
                  </td>
                </tr>
              );
              })}
              {virtualWindow.bottomSpacer > 0 ? (
                <tr aria-hidden="true">
                  <td colSpan={5} style={{ height: `${virtualWindow.bottomSpacer}px` }} />
                </tr>
              ) : null}
            </>
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-20 text-center">
                <div className="mx-auto max-w-sm rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-8 py-10">
                  <div className="text-base font-semibold text-slate-700">No documents in this view</div>
                  <p className="mt-2 text-sm text-slate-400">
                    Upload files, attach from cloud, or change your filters to see more results.
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
