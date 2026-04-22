import React from "react";
import bookkeepingLogo from "../assets/bookkeeping.png";

type Props = {
  title?: string;
  subtitle?: string;
  theme?: "light" | "dark";
};

export default function FullScreenLoader({
  title = "Taban Books",
  subtitle = "Loading...",
  theme = "light",
}: Props) {
  const isDark = theme === "dark";
  return (
    <div
      className={[
        "fixed inset-0 flex flex-col items-center justify-center z-[9999] overflow-hidden",
        isDark ? "bg-[#0f4e5a]" : "bg-white",
      ].join(" ")}
    >
      <div className="relative flex flex-col items-center animate-in fade-in duration-700">
        <div className="relative mb-12">
          <img
            src={bookkeepingLogo}
            className="w-32 h-32 md:w-48 md:h-48 relative object-contain animate-bounce"
            alt="Loading"
          />
        </div>

        <div
          className={[
            "w-64 h-1.5 rounded-full overflow-hidden relative border",
            isDark ? "bg-white/10 border-white/5" : "bg-black/5 border-black/5",
          ].join(" ")}
        >
          <div className="absolute top-0 left-0 h-full bg-[#156372] w-1/3 rounded-full animate-progress-flow shadow-[0_0_15px_#156372]" />
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
          <p
            className={[
              "font-semibold tracking-[0.2em] uppercase text-xs opacity-90",
              isDark ? "text-white" : "text-slate-800",
            ].join(" ")}
          >
            {title}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-[#156372] rounded-full animate-ping" />
            <p
              className={[
                "text-[10px] font-medium tracking-widest uppercase",
                isDark ? "text-white/40" : "text-slate-500",
              ].join(" ")}
            >
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

