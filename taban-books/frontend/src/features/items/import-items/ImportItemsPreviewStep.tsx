import { Check, ChevronDown, ChevronLeft, HelpCircle, Info, Loader2 } from "lucide-react";
import { PRIMARY_BUTTON_STYLE } from "./constants";
import { useImportItemsContext } from "./context";

export function ImportItemsPreviewStep() {
  const { preview, actions } = useImportItemsContext();

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900">All Items in your file are ready to be imported</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Check size={20} className="text-green-600" />
            <span className="text-sm font-medium text-gray-700">
              Items that are ready to be imported - {preview.previewData.readyToImport}
            </span>
          </div>
          <button
            type="button"
            onClick={preview.toggleReadyDetails}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Details
            <ChevronDown size={16} className={preview.showReadyDetails ? "rotate-180" : ""} />
          </button>
        </div>

        <div className="flex items-center justify-between py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <HelpCircle size={20} className="text-orange-500" />
            <span className="text-sm font-medium text-gray-700">
              No. of Records skipped - {preview.previewData.skippedRecords}
            </span>
          </div>
          <button
            type="button"
            onClick={preview.toggleSkippedDetails}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Details
            <ChevronDown size={16} className={preview.showSkippedDetails ? "rotate-180" : ""} />
          </button>
        </div>

        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <HelpCircle size={20} className="text-orange-500" />
            <span className="text-sm font-medium text-gray-700">
              Unmapped Fields - {preview.previewData.unmappedFields}
            </span>
          </div>
          <button
            type="button"
            onClick={preview.toggleUnmappedDetails}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Details
            <ChevronDown size={16} className={preview.showUnmappedDetails ? "rotate-180" : ""} />
          </button>
        </div>
      </div>

      {preview.showReadyDetails && preview.previewDetails.ready.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 overflow-hidden">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Ready to Import Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.previewDetails.ready.slice(0, 100).map((row, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-sm text-gray-900">{preview.getValue(row, "Item Name")}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{preview.getValue(row, "SKU")}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{preview.getValue(row, "Product Type") || "Goods"}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{preview.getValue(row, "Selling Price")}</td>
                  </tr>
                ))}
                {preview.previewDetails.ready.length > 100 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-sm text-gray-500 italic">
                      ...and {preview.previewDetails.ready.length - 100} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview.showSkippedDetails && preview.previewDetails.skipped.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6 mb-6 overflow-hidden">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Skipped Records Analysis</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name (from file)</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.previewDetails.skipped.slice(0, 100).map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-sm font-medium text-red-600">{item.reason}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {preview.getValue(item.row, "Item Name") || <span className="text-gray-400 italic">(Missing)</span>}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">{preview.getValue(item.row, "SKU")}</td>
                  </tr>
                ))}
                {preview.previewDetails.skipped.length > 100 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-sm text-gray-500 italic">
                      ...and {preview.previewDetails.skipped.length - 100} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview.showUnmappedDetails && preview.previewDetails.unmapped.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6 mb-6">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Unmapped Fields</h3>
          <p className="text-sm text-gray-600 mb-2">
            The following Taban Books fields have not been mapped to any column in your file:
          </p>
          <ul className="list-disc list-inside bg-yellow-50 p-4 rounded-md">
            {preview.previewDetails.unmapped.map((field) => (
              <li key={field} className="text-sm text-gray-700">
                {field}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
          onClick={actions.previous}
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-8 py-3 text-white rounded-lg text-sm font-semibold shadow-sm cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            style={PRIMARY_BUTTON_STYLE}
            onMouseEnter={(event) => {
              if (!preview.isImporting) {
                event.currentTarget.style.opacity = "0.9";
              }
            }}
            onMouseLeave={(event) => {
              if (!preview.isImporting) {
                event.currentTarget.style.opacity = "1";
              }
            }}
            onClick={() => {
              void preview.handleImport();
            }}
            disabled={preview.isImporting}
          >
            {preview.isImporting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Importing...
              </>
            ) : (
              "Import"
            )}
          </button>
          <button
            type="button"
            className="px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
            onClick={actions.cancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
