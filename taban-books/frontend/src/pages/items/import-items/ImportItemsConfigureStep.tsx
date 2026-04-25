import { Check, ChevronDown, ChevronUp, Download, HelpCircle, Lightbulb, Search } from "lucide-react";
import { PRIMARY_BUTTON_STYLE } from "./constants";
import { useImportItemsContext } from "./context";

export function ImportItemsConfigureStep() {
  const { configure, actions } = useImportItemsContext();

  return (
    <>
      <div
        className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 p-12 text-center mb-6 hover:border-blue-500 transition-colors"
        ref={configure.dropAreaRef}
        onDragOver={configure.handleDragOver}
        onDragLeave={configure.handleDragLeave}
        onDrop={configure.handleDrop}
      >
        <Download size={48} className="text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-semibold text-gray-700 mb-4">Drag and drop file to import</p>
        <div className="relative inline-block" ref={configure.fileSourceDropdownRef}>
          <button
            type="button"
            className="px-6 py-3 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 mx-auto cursor-pointer transition-all"
            style={PRIMARY_BUTTON_STYLE}
            onMouseEnter={(event) => (event.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(event) => (event.currentTarget.style.opacity = "1")}
            onClick={(event) => {
              event.stopPropagation();
              configure.toggleFileSourceDropdown();
            }}
          >
            Choose File
            <ChevronDown size={16} />
          </button>
          {configure.isFileSourceDropdownOpen && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
              {[
                { label: "Attach From Desktop", onClick: configure.handleAttachFromDesktop },
                { label: "Attach From Cloud", onClick: configure.handleAttachFromCloud },
                { label: "Attach From Documents", onClick: configure.handleAttachFromDocuments },
              ].map((option) => (
                <div
                  key={option.label}
                  className="px-4 py-3 text-sm text-gray-700 cursor-pointer transition-all"
                  style={{ color: "#156372" }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                    event.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "transparent";
                    event.currentTarget.style.color = "#156372";
                  }}
                  onClick={option.onClick}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>
        {configure.selectedFile && (
          <p className="mt-4 text-sm font-medium text-green-600">Selected: {configure.selectedFile.name}</p>
        )}
        <p className="mt-4 text-xs text-gray-500">Maximum File Size: 25 MB - File Format: CSV or TSV or XLS</p>
        <input
          ref={configure.fileInputRef}
          type="file"
          accept=".csv,.tsv,.xls,.xlsx"
          onChange={configure.handleFileSelect}
          style={{ display: "none" }}
        />
      </div>

      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
        <p className="text-sm text-gray-700">
          Download a{" "}
          <button
            type="button"
            onClick={() => actions.downloadSampleFile("csv")}
            className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none cursor-pointer p-0 inline"
          >
            sample csv file
          </button>{" "}
          or{" "}
          <button
            type="button"
            onClick={() => actions.downloadSampleFile("xls")}
            className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none cursor-pointer p-0 inline"
          >
            sample xls file
          </button>{" "}
          and compare it to your import file to ensure you have the file perfect for the import.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm font-semibold text-gray-700">Duplicate Handling:</label>
          <span className="text-red-500">*</span>
          <HelpCircle size={16} className="text-gray-400 cursor-help" />
        </div>
        <div className="space-y-4">
          {[
            {
              value: "skip",
              title: "Skip Duplicates",
              description: "Retains the items in Taban Books and does not import the duplicates in the import file.",
            },
            {
              value: "overwrite",
              title: "Overwrite items",
              description: "Imports the duplicates in the import file and overwrites the existing items in Taban Books.",
            },
            {
              value: "add",
              title: "Add duplicates as new items",
              description: "Imports the duplicates in the import file and adds them as new items in Taban Books.",
            },
          ].map((option) => (
            <label key={option.value} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="radio"
                name="duplicateHandling"
                value={option.value}
                checked={configure.duplicateHandling === option.value}
                onChange={() => configure.setDuplicateHandling(option.value as typeof configure.duplicateHandling)}
                className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{option.title}</div>
                <div className="text-xs text-gray-600 mt-1">{option.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-semibold text-gray-700">Character Encoding</span>
          <HelpCircle size={16} className="text-gray-400 cursor-help" />
        </div>
        <div className="relative" ref={configure.encodingDropdownRef}>
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-200 rounded-lg bg-white text-gray-700 hover:border-blue-500 transition-colors"
            onClick={configure.toggleEncodingDropdown}
          >
            <span className="text-sm font-medium">{configure.characterEncoding}</span>
            {configure.isEncodingDropdownOpen ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </button>
          {configure.isEncodingDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-hidden">
              <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search encoding..."
                  value={configure.encodingSearch}
                  onChange={(event) => configure.setEncodingSearch(event.target.value)}
                  className="flex-1 text-sm bg-transparent focus:outline-none"
                />
              </div>
              <div className="max-h-60 overflow-y-auto">
                {configure.filteredEncodingOptions.map((option) => (
                  <div
                    key={option}
                    className={`p-3 cursor-pointer hover:bg-blue-50 flex items-center justify-between transition-colors ${option === configure.characterEncoding ? "bg-blue-50 border-l-4 border-blue-600" : ""}`}
                    onClick={() => configure.selectEncoding(option)}
                  >
                    <span className="text-sm font-medium text-gray-900">{option}</span>
                    {option === configure.characterEncoding && <Check size={16} className="text-blue-600" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={20} className="text-yellow-600" />
          <h3 className="text-base font-semibold text-gray-900">Page Tips</h3>
        </div>
        <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
          <li>
            You can download the{" "}
            <button
              type="button"
              onClick={() => actions.downloadSampleFile("xls")}
              className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none cursor-pointer p-0 inline"
            >
              sample xls file
            </button>{" "}
            to get detailed information about the data fields used while importing.
          </li>
          <li>If you have files in other formats, you can convert it to an accepted file format using any online or offline converter.</li>
          <li>You can configure your import settings and save them for future too!</li>
        </ul>
      </div>

      <div className="flex items-center justify-end gap-3">
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
    </>
  );
}
