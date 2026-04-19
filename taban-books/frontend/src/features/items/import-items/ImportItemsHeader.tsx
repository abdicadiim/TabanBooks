import { X } from "lucide-react";
import { useImportItemsContext } from "./context";

const TITLES = {
  configure: "Items - Select File",
  mapFields: "Map Fields",
  preview: "Preview",
} as const;

export function ImportItemsHeader() {
  const { currentStep, actions } = useImportItemsContext();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{TITLES[currentStep]}</h1>
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-lg text-red-500 hover:text-red-600 transition-colors"
          onClick={actions.close}
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
}
