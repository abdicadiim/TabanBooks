import React, { useState } from "react";
import { MessageCircle, X } from "lucide-react";

export default function NeedAssistance() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      {open && (
        <div className="mb-3 w-[280px] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="text-[13px] font-semibold text-slate-900">Need Assistance?</div>
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
            >
              <X size={16} className="text-slate-600" />
            </button>
          </div>

          <div className="px-4 py-3 text-[12px] text-slate-600 space-y-2">
            <button className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
              Contact Support
            </button>
            <button className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
              Knowledge Base
            </button>
            <button className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
              Raise a Ticket
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((s) => !s)}
        className="group inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 shadow-lg hover:shadow-xl"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white">
          <MessageCircle size={18} />
        </span>
        <span className="text-[13px] font-medium text-slate-800">Need Assistance?</span>
      </button>
    </div>
  );
}
