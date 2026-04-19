import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onOutside?: () => void,
) {
  useEffect(() => {
    const handler = (event: MouseEvent | TouchEvent) => {
      if (!ref.current) return;
      if (event.target instanceof Node && !ref.current.contains(event.target)) {
        onOutside?.();
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [ref, onOutside]);
}

export default function NeedAssistance() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

  // Hide the widget on any route that includes the `all` segment (e.g. /all)
  const pathSegments = location?.pathname?.split("/") || [];
  if (pathSegments.includes("all")) return null;

  useClickOutside(panelRef, () => setOpen(false));

  return (
    <div className="fixed bottom-5 right-5 z-[90]">
      {open && (
        <div
          ref={panelRef}
          className="mb-3 w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="font-semibold text-slate-900">Need Assistance?</div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-800"
            >
              x
            </button>
          </div>

          <div className="space-y-3 p-4 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="font-medium text-slate-900">Contact Support</div>
              <div className="text-[12px] text-slate-500">Mon-Fri 9:00-18:00</div>
              <div className="mt-2 font-semibold text-slate-800">+252 61 0000000</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] hover:bg-slate-50">
                Knowledge Base
              </button>
              <button className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] hover:bg-slate-50">
                Help Docs
              </button>
              <button className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] hover:bg-slate-50">
                Webinar
              </button>
              <button className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] hover:bg-slate-50">
                Developer API
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 shadow-lg hover:bg-slate-50"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100">
          AI
        </span>
        <span className="text-[13px] font-semibold text-slate-900">
          Need Assistance?
        </span>
      </button>
    </div>
  );
}
