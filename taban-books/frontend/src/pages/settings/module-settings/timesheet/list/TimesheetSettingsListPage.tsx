import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

const TIMESHEET_SIDEBAR_SETTINGS_KEY = "timesheet_sidebar_settings";

export default function TimesheetPage() {
  const [roundOffTime, setRoundOffTime] = useState("dont-round-off");
  const [enableMaxHours, setEnableMaxHours] = useState(true);
  const [maxHours, setMaxHours] = useState("24:00");
  const [trackCosts, setTrackCosts] = useState(false);
  const [enableApprovals, setEnableApprovals] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(TIMESHEET_SIDEBAR_SETTINGS_KEY);
      if (!raw) return false;
      return JSON.parse(raw)?.enableApprovals === true;
    } catch {
      return false;
    }
  });
  const [enableCustomerApprovals, setEnableCustomerApprovals] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(TIMESHEET_SIDEBAR_SETTINGS_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed?.enableApprovals === true && parsed?.enableCustomerApprovals === true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!enableApprovals && enableCustomerApprovals) {
      setEnableCustomerApprovals(false);
    }
  }, [enableApprovals, enableCustomerApprovals]);

  const handleSave = () => {
    const nextSettings = {
      enableApprovals,
      enableCustomerApprovals: enableApprovals && enableCustomerApprovals,
    };
    window.localStorage.setItem(TIMESHEET_SIDEBAR_SETTINGS_KEY, JSON.stringify(nextSettings));
    window.dispatchEvent(new Event("timesheet-sidebar-settings-updated"));
    toast.success("Timesheet settings saved successfully");
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Timesheet</h1>

      <div className="space-y-8">
          {/* Round Off Time */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Round Off Time
              </label>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              (Time entries will appear on your invoices and reports based on the selected round-off format.)
            </p>
            <div className="relative w-64">
              <select
                value={roundOffTime}
                onChange={(e) => setRoundOffTime(e.target.value)}
                className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="dont-round-off">Don't Round-off</option>
                <option value="round-to-nearest-15">Round to nearest 15 minutes</option>
                <option value="round-to-nearest-30">Round to nearest 30 minutes</option>
                <option value="round-to-nearest-hour">Round to nearest hour</option>
              </select>
              <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Set maximum hours/day */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableMaxHours}
                onChange={(e) => setEnableMaxHours(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Set maximum hours/day for logging time
                </span>
                {enableMaxHours && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={maxHours}
                      onChange={(e) => setMaxHours(e.target.value)}
                      className="h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="24:00"
                    />
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Track costs for time entries */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={trackCosts}
                onChange={(e) => setTrackCosts(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Track costs for time entries
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Enabling this option allows you to track the cost associated with paying your staff for their time entries.
                </p>
              </div>
            </label>
          </div>

          {/* Timesheet Approvals Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Timesheet Approvals</h3>
            
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableApprovals}
                  onChange={(e) => setEnableApprovals(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Enable Approvals for time entries
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    Enabling this option lets you submit time entries to the project manager for their approval before you invoice them.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableCustomerApprovals}
                  onChange={(e) => setEnableCustomerApprovals(e.target.checked)}
                  disabled={!enableApprovals}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div className={!enableApprovals ? "opacity-50" : ""}>
                  <span className="text-sm font-medium text-gray-900">
                    Enable Customer Approvals for time entries
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    Enabling this option allows you to submit time entries to your customers and get their approval before you invoice them.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-start pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center rounded-md bg-[#0f5f73] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0b4f60]"
            >
              Save
            </button>
          </div>
      </div>
    </div>
  );
}



