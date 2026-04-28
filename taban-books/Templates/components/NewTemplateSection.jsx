import React from "react";
import { Plus } from "lucide-react";

const NewTemplateSection = ({ onNewTemplate }) => {
  return (
    <div className="w-80 bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center min-h-[600px]">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">New Template</h3>
        <p className="text-sm text-gray-600 mb-6 max-w-xs">
          Click to add a template from our gallery. You can customize the template
          title, columns, and headers in line item table.
        </p>
        <button
          onClick={onNewTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={20} />
          New
        </button>
      </div>
    </div>
  );
};

export default NewTemplateSection;

