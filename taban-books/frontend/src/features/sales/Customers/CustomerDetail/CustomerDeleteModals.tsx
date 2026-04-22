import React from "react";
import { X } from "lucide-react";

type CustomerDeleteConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
};

type CustomerDeleteContactPersonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
};

type CustomerUnlinkVendorModalProps = {
  isOpen: boolean;
  customerName: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isUnlinking?: boolean;
};

export function CustomerDeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}: CustomerDeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
          <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
            !
          </div>
          <h3 className="text-[15px] font-semibold text-slate-800 flex-1">Delete customer?</h3>
          <button
            type="button"
            className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-3 text-[13px] text-slate-600">
          You cannot retrieve this customer once they have been deleted.
        </div>
        <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            className="px-4 py-1.5 rounded-md bg-[#0f766e] text-white text-[12px] hover:bg-[#115e59]"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <button
            type="button"
            className="px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomerDeleteContactPersonModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}: CustomerDeleteContactPersonModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
          <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
            !
          </div>
          <h3 className="text-[15px] font-semibold text-slate-800 flex-1">
            Do you want to delete the contact person?
          </h3>
          <button
            type="button"
            className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            className="px-4 py-1.5 rounded-md bg-[#0f766e] text-white text-[12px] hover:bg-[#115e59]"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <button
            type="button"
            className="px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomerUnlinkVendorModal({
  isOpen,
  customerName,
  onClose,
  onConfirm,
  isUnlinking = false,
}: CustomerUnlinkVendorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
          <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
            !
          </div>
          <h3 className="text-[15px] font-semibold text-slate-800 flex-1">Unlink vendor?</h3>
          <button
            type="button"
            className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-3 text-[13px] text-slate-600">
          Are you sure you want to unlink "{customerName}" from its associated vendor?
        </div>
        <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            className="px-4 py-1.5 rounded-md bg-[#0f766e] text-white text-[12px] hover:bg-[#115e59]"
            onClick={onConfirm}
            disabled={isUnlinking}
          >
            {isUnlinking ? "Unlinking..." : "Unlink"}
          </button>
          <button
            type="button"
            className="px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={isUnlinking}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
