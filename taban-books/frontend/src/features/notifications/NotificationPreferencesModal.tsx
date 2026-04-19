import React from "react";
import { X } from "lucide-react";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPreferencesModal({
  isOpen,
  onClose,
}: NotificationPreferencesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Signals Notification Preference
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 bg-red-600 hover:bg-red-700 text-white rounded flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  SIGNAL NAME
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">
                  SERVICE
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">
                  NOTIFICATIONS
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="px-6 py-16 text-center">
                  <div className="text-slate-400 text-sm">No signal configured</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}




