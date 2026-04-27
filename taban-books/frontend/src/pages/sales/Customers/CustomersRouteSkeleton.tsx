import React from "react";

export default function CustomersRouteSkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <div className="space-y-0">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={`customers-skeleton-row-${index}`}
            className="flex items-center gap-3 border-b border-gray-100 px-4 py-4 animate-pulse"
          >
            <div className="h-4 w-4 rounded bg-gray-100" />
            <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-2/5 rounded bg-gray-200 mb-2" />
              <div className="h-3 w-1/2 rounded bg-gray-100" />
            </div>
            <div className="hidden md:block h-4 w-24 rounded bg-gray-100" />
            <div className="hidden md:block h-4 w-28 rounded bg-gray-100" />
            <div className="hidden md:block h-4 w-20 rounded bg-gray-100 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
