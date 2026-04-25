import React, { useState } from "react";
import { Download, FileJson, FileSpreadsheet, X } from "lucide-react";
import { escapeCsvValue, formatFileSize, getDocumentFolderName, getDocumentKind, getDocumentStatus } from "../helpers";
import type { DocumentItem } from "../types";

type ExportDocumentsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
};

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ExportDocumentsModal({
  isOpen,
  onClose,
  documents,
}: ExportDocumentsModalProps) {
  const [format, setFormat] = useState<"csv" | "json">("csv");

  if (!isOpen) return null;

  const handleExport = () => {
    const dateStamp = new Date().toISOString().slice(0, 10);

    if (format === "json") {
      downloadFile(
        `documents-${dateStamp}.json`,
        JSON.stringify(documents, null, 2),
        "application/json;charset=utf-8",
      );
      onClose();
      return;
    }

    const rows = [
      ["Name", "Folder", "Type", "Status", "Uploaded By", "Uploaded On", "Size", "Associated To"],
      ...documents.map((document) => [
        document.name,
        getDocumentFolderName(document),
        getDocumentKind(document),
        getDocumentStatus(document),
        String(document.uploadedBy || "Me"),
        String(document.uploadedOnFormatted || document.uploadedOn || ""),
        formatFileSize(document.size),
        String(document.associatedTo || ""),
      ]),
    ];

    const csv = rows.map((row) => row.map((cell) => escapeCsvValue(cell)).join(",")).join("\n");
    downloadFile(`documents-${dateStamp}.csv`, csv, "text/csv;charset=utf-8");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Export Documents</h2>
            <p className="text-sm text-slate-500">Export the currently visible documents list.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
            {documents.length
              ? `${documents.length} document(s) will be included in the export.`
              : "There are no documents in the current view yet."}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setFormat("csv")}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                format === "csv"
                  ? "border-[#156372] bg-[#156372]/5"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="mb-3 inline-flex rounded-xl bg-white p-2 text-[#156372] shadow-sm">
                <FileSpreadsheet size={18} />
              </div>
              <div className="text-sm font-semibold text-slate-900">CSV Export</div>
              <div className="mt-1 text-xs text-slate-500">Spreadsheet-friendly columns for finance workflows.</div>
            </button>

            <button
              onClick={() => setFormat("json")}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                format === "json"
                  ? "border-[#156372] bg-[#156372]/5"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="mb-3 inline-flex rounded-xl bg-white p-2 text-[#156372] shadow-sm">
                <FileJson size={18} />
              </div>
              <div className="text-sm font-semibold text-slate-900">JSON Export</div>
              <div className="mt-1 text-xs text-slate-500">Useful if you want the raw object shape for tooling.</div>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={!documents.length}
            className="inline-flex items-center gap-2 rounded-lg bg-[#156372] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#104e59] disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
