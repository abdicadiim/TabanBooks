import { FileText, Search, X } from "lucide-react";
import { CLOUD_PROVIDERS, DOCUMENT_CATEGORIES, PRIMARY_BUTTON_STYLE } from "./constants";
import { useImportItemsContext } from "./context";
import type { CloudProviderConfig } from "./types";

const renderCloudProviderIllustration = (provider: CloudProviderConfig) => {
  if (provider.id === "taban") {
    return null;
  }

  if (provider.id === "gdrive") {
    return (
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 256 256" className="w-full h-full">
          <path d="M128 32L32 128l96 96V32z" fill="#0F9D58" />
          <path d="M128 32l96 96-96 96V32z" fill="#4285F4" />
          <path d="M32 128l96 96V128L32 32v96z" fill="#F4B400" />
        </svg>
      </div>
    );
  }

  const IconComponent = provider.icon;
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <IconComponent size={64} className={provider.iconClassName || "text-blue-500"} />
    </div>
  );
};

export function ImportItemsModals() {
  const { modals } = useImportItemsContext();

  return (
    <>
      {modals.isCloudPickerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
          onClick={modals.closeCloudPicker}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[900px] h-[640px] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-700">Cloud Picker</h2>
              <button
                type="button"
                onClick={modals.closeCloudPicker}
                className="text-red-500 hover:text-red-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-[180px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
                <div className="p-2">
                  {CLOUD_PROVIDERS.map((provider) => {
                    const IconComponent = provider.icon;
                    const isSelected = modals.selectedCloudProvider === provider.id;
                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => modals.selectCloudProvider(provider.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isSelected ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600" : "text-gray-700 hover:bg-gray-50"}`}
                      >
                        <IconComponent size={24} className={isSelected ? "text-blue-600" : "text-gray-500"} />
                        <span>{provider.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
                <div className="flex flex-col items-center max-w-lg">
                  {renderCloudProviderIllustration(modals.selectedCloudProviderConfig) && (
                    <div className="mb-8">{renderCloudProviderIllustration(modals.selectedCloudProviderConfig)}</div>
                  )}
                  <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                    <p>{modals.selectedCloudProviderConfig.description}</p>
                  </div>
                  <button
                    type="button"
                    className={
                      modals.selectedCloudProviderConfig.id === "taban"
                        ? "px-6 py-2.5 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                        : "px-8 py-3 text-white rounded-md text-sm font-semibold shadow-sm cursor-pointer transition-all"
                    }
                    style={modals.selectedCloudProviderConfig.id === "taban" ? undefined : PRIMARY_BUTTON_STYLE}
                    onMouseEnter={(event) => {
                      if (modals.selectedCloudProviderConfig.id !== "taban") {
                        event.currentTarget.style.opacity = "0.9";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (modals.selectedCloudProviderConfig.id !== "taban") {
                        event.currentTarget.style.opacity = "1";
                      }
                    }}
                    onClick={() => window.open(modals.selectedCloudProviderConfig.authUrl, "_blank")}
                  >
                    {modals.selectedCloudProviderConfig.actionLabel}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={modals.closeCloudPicker}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={modals.attachCloudSelection}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Attach
              </button>
            </div>
          </div>
        </div>
      )}

      {modals.isDocumentsModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
          onClick={modals.closeDocumentsModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[900px] h-[640px] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Files"
                    value={modals.documentSearch}
                    onChange={(event) => modals.setDocumentSearch(event.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={modals.closeDocumentsModal}
                  className="text-red-500 hover:text-red-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-[200px] bg-gray-50 border-r border-gray-200 p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">INBOXES</h3>
                <div className="space-y-1">
                  {DOCUMENT_CATEGORIES.map((category) => {
                    const IconComponent = category.icon;
                    const isSelected = modals.selectedDocumentCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => modals.selectDocumentCategory(category.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${isSelected ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"}`}
                      >
                        <IconComponent size={18} className={isSelected ? "text-blue-600" : "text-gray-500"} />
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-700">FILE NAME</div>
                  <div className="text-sm font-semibold text-gray-700">DETAILS</div>
                  <div className="text-sm font-semibold text-gray-700">UPLOADED BY</div>
                </div>

                {modals.filteredDocuments.length > 0 ? (
                  <div className="flex-1 overflow-y-auto">
                    {modals.filteredDocuments.map((doc) => {
                      const isSelected = modals.selectedDocuments.includes(doc.id);

                      return (
                        <div
                          key={doc.id}
                          onClick={() => modals.toggleDocumentSelection(doc.id)}
                          className={`grid grid-cols-3 gap-4 px-6 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? "bg-blue-50" : ""}`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => modals.toggleDocumentSelection(doc.id)}
                              onClick={(event) => event.stopPropagation()}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-2">
                              <FileText size={18} className="text-gray-400" />
                              <span className="text-sm text-gray-900 font-medium">{doc.name}</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {String(doc.size || "N/A")} - {String(doc.type || "FILE").toUpperCase()}
                            {doc.associatedTo && <div className="text-xs text-gray-500 mt-1">Associated: {doc.associatedTo}</div>}
                          </div>
                          <div className="text-sm text-gray-600">
                            {String(doc.uploadedBy || "Me")}
                            {doc.uploadedOn && <div className="text-xs text-gray-500 mt-1">{String(doc.uploadedOn)}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-sm text-gray-600 mb-4">
                      {modals.documentSearch ? "No documents found matching your search." : "No documents available."}
                    </p>
                    {!modals.documentSearch && (
                      <button
                        type="button"
                        onClick={modals.goToDocuments}
                        className="text-blue-600 hover:text-blue-700 underline text-sm font-medium"
                      >
                        Go to Documents
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={modals.closeDocumentsModal}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={modals.attachSelectedDocuments}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={modals.selectedDocuments.length === 0}
              >
                Attach {modals.selectedDocuments.length > 0 ? `(${modals.selectedDocuments.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
