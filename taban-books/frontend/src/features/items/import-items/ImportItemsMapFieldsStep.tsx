import { ChevronDown, ChevronLeft, Info } from "lucide-react";
import { IMPORT_FIELDS, PRIMARY_BUTTON_STYLE } from "./constants";
import { useImportItemsContext } from "./context";

export function ImportItemsMapFieldsStep() {
  const { mapping, actions } = useImportItemsContext();

  return (
    <>
      <div className="mb-4">
        <p className="text-sm text-gray-700">
          Your Selected File: <span className="font-semibold">{mapping.selectedFile?.name || "file.csv"}</span>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">The best match to each field on the selected file have been auto-selected.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Details</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-sm font-semibold text-gray-700">TABAN BOOKS FIELD</div>
          <div className="text-sm font-semibold text-gray-700">IMPORTED FILE HEADERS</div>
        </div>
        <div className="space-y-4">
          {IMPORT_FIELDS.map((item) => (
            <div key={item.field} className="grid grid-cols-2 gap-4 items-center">
              <div className="text-sm font-medium text-gray-700">
                {item.field}
                {item.required && <span className="text-red-500 ml-1">*</span>}
              </div>
              <div className="relative">
                <select
                  value={mapping.fieldMappings[item.field] || ""}
                  onChange={(event) => mapping.updateFieldMapping(item.field, event.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="">Select</option>
                  {mapping.importedFileHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={mapping.saveSelections}
            onChange={(event) => mapping.setSaveSelections(event.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Save these selections for use during future imports.</span>
        </label>
      </div>

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
            className="px-8 py-3 text-white rounded-lg text-sm font-semibold shadow-sm cursor-pointer transition-all"
            style={PRIMARY_BUTTON_STYLE}
            onMouseEnter={(event) => (event.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(event) => (event.currentTarget.style.opacity = "1")}
            onClick={actions.next}
          >
            Next &gt;
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
