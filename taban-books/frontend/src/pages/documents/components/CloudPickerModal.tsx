import React, { useMemo, useState } from "react";
import {
  Box,
  ChevronDown,
  Cloud,
  FileText,
  HardDrive,
  LayoutGrid,
  Search,
  Square,
  X,
} from "lucide-react";

export type CloudPickerFile = {
  id: string;
  name: string;
  size: number;
  modified: string;
  provider: string;
};

type CloudPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAttach: (files: CloudPickerFile[]) => void | Promise<void>;
};

const providers = [
  { id: "taban", name: "Taban Books Drive", icon: LayoutGrid },
  { id: "gdrive", name: "Google Drive", icon: HardDrive },
  { id: "dropbox", name: "Dropbox", icon: Box },
  { id: "box", name: "Box", icon: Square },
  { id: "onedrive", name: "OneDrive", icon: Cloud },
];

const mockFiles: CloudPickerFile[] = [
  { id: "c1", name: "Tax_Report_2025.pdf", size: 1258291, modified: "2 days ago", provider: "taban" },
  { id: "c2", name: "Receipt_February.png", size: 541172, modified: "5 hours ago", provider: "taban" },
  { id: "c3", name: "Supplier_Contract.pdf", size: 852172, modified: "Yesterday", provider: "gdrive" },
  { id: "c4", name: "March_Statement.xlsx", size: 324172, modified: "1 week ago", provider: "dropbox" },
];

export default function CloudPickerModal({ isOpen, onClose, onAttach }: CloudPickerModalProps) {
  const [selectedProvider, setSelectedProvider] = useState("taban");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visibleFiles = useMemo(
    () =>
      mockFiles.filter((file) => {
        const matchesProvider = file.provider === selectedProvider;
        const matchesSearch = file.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
        return matchesProvider && matchesSearch;
      }),
    [searchQuery, selectedProvider],
  );

  if (!isOpen) return null;

  const handleToggleFile = (fileId: string) => {
    setSelectedIds((current) =>
      current.includes(fileId) ? current.filter((id) => id !== fileId) : [...current, fileId],
    );
  };

  const handleAttach = async () => {
    const selectedFiles = mockFiles.filter((file) => selectedIds.includes(file.id));
    if (!selectedFiles.length) return;
    await onAttach(selectedFiles);
    setSelectedIds([]);
    setSearchQuery("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/50 px-4">
      <div className="flex h-[640px] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <aside className="flex w-52 flex-col border-r border-slate-100 bg-slate-50/60 px-3 py-4">
          <div className="mb-4 flex items-center justify-between px-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Cloud</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-1">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  setSelectedProvider(provider.id);
                  setSelectedIds([]);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                  selectedProvider === provider.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-700"
                }`}
              >
                <provider.icon size={18} />
                <span>{provider.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-center py-2 text-slate-300">
            <ChevronDown size={18} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="text-lg font-semibold text-slate-900">Attach From Cloud</h3>
            <p className="mt-1 text-sm text-slate-500">
              Pick files from your connected provider and import them into Documents.
            </p>
          </div>

          <div className="flex-1 overflow-auto px-6 py-5">
            <div className="relative mb-5">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search cloud files"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/10"
              />
            </div>

            <div className="space-y-2">
              {visibleFiles.length ? (
                visibleFiles.map((file) => {
                  const selected = selectedIds.includes(file.id);

                  return (
                    <button
                      key={file.id}
                      onClick={() => handleToggleFile(file.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                        selected
                          ? "border-[#156372] bg-[#156372]/5"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                            selected ? "bg-[#156372] text-white" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <FileText size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{file.name}</div>
                          <div className="text-xs text-slate-500">
                            Modified {file.modified} â€¢ {(file.size / 1024).toFixed(0)} KB
                          </div>
                        </div>
                      </div>

                      <div
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          selected
                            ? "border-[#156372] bg-white text-[#156372]"
                            : "border-slate-200 text-slate-500"
                        }`}
                      >
                        {selected ? "Selected" : "Select"}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
                  No files match your current search.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <div className="text-sm text-slate-500">
              {selectedIds.length ? `${selectedIds.length} file(s) selected` : "Select one or more files"}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAttach()}
                disabled={!selectedIds.length}
                className="rounded-lg bg-[#156372] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#104e59] disabled:cursor-not-allowed disabled:bg-slate-200"
              >
                Attach Files
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

