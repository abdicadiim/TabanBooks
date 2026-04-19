import { CheckCircle2, Image as ImageIcon, Plus, Search, Trash2, X } from "lucide-react";
import type { Item } from "../../items/itemsModel";
import { useNewAdjustmentFormContext } from "./context";

const getItemKey = (item: Item, fallback: number) => String(item._id || item.id || `${item.name}-${fallback}`);

export function AdjustmentModals() {
  const { reasons, itemsTable, isValueMode } = useNewAdjustmentFormContext();

  return (
    <>
      {reasons.manageModalOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={reasons.closeManageModal}
        >
          <div
            className="bg-white rounded-lg w-[90%] max-w-[500px] max-h-[90vh] overflow-auto shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 m-0">New Adjustment</h2>
              <button
                type="button"
                onClick={reasons.closeManageModal}
                className="bg-transparent border rounded cursor-pointer p-1 flex items-center justify-center"
                style={{ borderColor: "#156372", color: "#156372" }}
                onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)")}
                onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = "transparent")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <button
                type="button"
                onClick={reasons.openAddModal}
                className="w-full px-4 py-2.5 text-sm font-medium text-white border-none rounded-md cursor-pointer flex items-center justify-center gap-2 mb-6"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(event) => (event.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(event) => (event.currentTarget.style.opacity = "1")}
              >
                <Plus size={16} />
                Add new reason
              </button>

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Reason</div>
                {reasons.values.length === 0 ? (
                  <div className="py-4 text-center text-sm text-gray-500">
                    No reasons available. Add a new reason to get started.
                  </div>
                ) : (
                  reasons.values.map((reason, index) => {
                    const isDefault = reasons.defaults.includes(reason);
                    return (
                      <div key={`${reason}-${index}`}>
                        <div className="py-3 flex items-center justify-between group hover:bg-gray-50 rounded px-2 -mx-2 transition-colors">
                          <span
                            className="text-sm text-gray-900 flex-1 cursor-pointer"
                            onClick={() => reasons.selectFromManage(reason)}
                          >
                            {reason}
                          </span>
                          {!isDefault ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                reasons.requestDelete(reason);
                              }}
                              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors ml-2"
                              title="Delete reason"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 px-2 ml-2">Default</span>
                          )}
                        </div>
                        {index < reasons.values.length - 1 && <div className="h-px bg-gray-200" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {reasons.addModalOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={reasons.closeAddModal}
        >
          <div
            className="bg-white rounded-lg w-[90%] max-w-[500px] max-h-[90vh] overflow-auto shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 m-0">New Adjustment</h2>
              <button
                type="button"
                onClick={reasons.closeAddModal}
                className="bg-transparent border rounded cursor-pointer p-1 flex items-center justify-center"
                style={{ borderColor: "#156372", color: "#156372" }}
                onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)")}
                onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = "transparent")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason Name</label>
                <input
                  type="text"
                  value={reasons.newReasonName}
                  onChange={(event) => reasons.setNewReasonName(event.target.value)}
                  placeholder="Enter reason name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none box-border focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.2)]"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void reasons.addReason();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={reasons.closeAddModal}
                  className="px-4 py-2 text-sm font-medium bg-white text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void reasons.addReason();
                  }}
                  disabled={!reasons.newReasonName.trim()}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md border-none ${reasons.newReasonName.trim() ? "cursor-pointer" : "bg-gray-400 cursor-not-allowed"}`}
                  style={reasons.newReasonName.trim() ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : {}}
                  onMouseEnter={(event) => {
                    if (reasons.newReasonName.trim()) {
                      event.currentTarget.style.opacity = "0.9";
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (reasons.newReasonName.trim()) {
                      event.currentTarget.style.opacity = "1";
                    }
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reasons.deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Delete Reason</h2>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete "{reasons.deleteModal.reason}"?
                <br />
                <span className="text-red-600 font-medium">This action cannot be undone.</span>
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={reasons.closeDeleteModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void reasons.deleteSelectedReason();
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {itemsTable.bulkAddModalOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={itemsTable.cancelBulkAdd}
        >
          <div
            className="bg-white rounded-lg w-[90%] max-w-[900px] max-h-[80vh] flex flex-col shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 m-0">Add Items in Bulk</h2>
              <button
                type="button"
                onClick={itemsTable.cancelBulkAdd}
                className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded"
                style={{ color: "#156372" }}
                onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)")}
                onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = "transparent")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-[400px]">
              <div className="w-full md:w-1/2 md:border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Type to search or scan the barcode of the item."
                      value={itemsTable.bulkSearch}
                      onChange={(event) => itemsTable.setBulkSearch(event.target.value)}
                      className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-md text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.2)]"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {itemsTable.items
                    .filter((item) => {
                      if (!item.trackInventory) {
                        return false;
                      }

                      const searchTerm = itemsTable.bulkSearch.toLowerCase();
                      return (
                        (item.name || "").toLowerCase().includes(searchTerm) ||
                        (item.sku || "").toLowerCase().includes(searchTerm)
                      );
                    })
                    .map((item, index) => {
                      const isSelected = itemsTable.bulkSelectedItems.some(
                        (selected) => String(selected._id || selected.id) === String(item._id || item.id),
                      );
                      const stockOnHand = itemsTable.getStockOnHand(item);
                      const stockValue = stockOnHand !== null ? stockOnHand : 0;
                      const stockColor = stockValue < 0 ? "#ef4444" : stockValue > 0 ? "#10b981" : "#6b7280";
                      const unit = item.unit || "pcs";

                      return (
                        <div
                          key={getItemKey(item, index)}
                          onClick={() => itemsTable.toggleBulkSelectedItem(item)}
                          className={`p-3 border-b border-gray-200 cursor-pointer flex items-center justify-between ${isSelected ? "" : "bg-transparent hover:bg-gray-50"}`}
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 mb-0.5">{item.name}</div>
                            <div className="text-xs text-gray-500 mb-1">SKU: {item.sku || "no"}</div>
                            <div className="text-xs text-gray-500">
                              Stock on Hand{" "}
                              <span className="font-medium" style={{ color: stockColor }}>
                                {stockOnHand !== null ? `${stockValue.toFixed(2)} ${unit}` : "-"}
                              </span>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={20} className="text-gray-500" />}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="w-full md:w-1/2 flex flex-col">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Selected Items</span>
                    <div
                      className="text-white rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    >
                      {itemsTable.bulkSelectedItems.length}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">Total Quantity: 0</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
                  {itemsTable.bulkSelectedItems.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm">
                      Click the item names from the left pane to select them.
                    </div>
                  ) : (
                    <div className="w-full">
                      {itemsTable.bulkSelectedItems.map((item, index) => (
                        <div
                          key={getItemKey(item, index)}
                          className="p-3 border-b border-gray-200 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900 mb-0.5">{item.name}</div>
                            <div className="text-xs text-gray-500">SKU: {item.sku || "no"}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => itemsTable.removeBulkSelectedItem(item._id || item.id)}
                            className="bg-transparent border-none cursor-pointer p-1 rounded"
                            style={{ color: "#156372" }}
                            onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)")}
                            onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = "transparent")}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={itemsTable.cancelBulkAdd}
                className="px-4 py-2 text-sm font-medium bg-white text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={itemsTable.addBulkSelectedItems}
                className="px-4 py-2 text-sm font-medium text-white rounded-md border-none cursor-pointer"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(event) => (event.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(event) => (event.currentTarget.style.opacity = "1")}
              >
                Add Items
              </button>
            </div>
          </div>
        </div>
      )}

      {itemsTable.bulkUpdateModalOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={itemsTable.closeBulkUpdate}
        >
          <div
            className="bg-white rounded-lg w-[90%] max-w-[600px] shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Bulk Update Line Items</h2>
              <button
                type="button"
                onClick={itemsTable.closeBulkUpdate}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Field to Update</label>
                <select
                  value={itemsTable.bulkUpdateField}
                  onChange={(event) => itemsTable.setBulkUpdateField(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.2)]"
                >
                  <option value="">Select a field</option>
                  <option value="quantityAdjusted">{isValueMode ? "Adjusted Value" : "Quantity Adjusted"}</option>
                  <option value="newQuantityOnHand">{isValueMode ? "Changed Value" : "New Quantity On Hand"}</option>
                  {!isValueMode && <option value="costPrice">Cost Price</option>}
                  <option value="description">Description</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter Value</label>
                <input
                  type="text"
                  value={itemsTable.bulkUpdateValue}
                  onChange={(event) => itemsTable.setBulkUpdateValue(event.target.value)}
                  placeholder="Enter value to apply to all selected items"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.2)]"
                />
              </div>

              <div className="text-sm text-gray-600 mb-4">
                This will update all rows for the selected field.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={itemsTable.closeBulkUpdate}
                className="px-4 py-2 text-sm font-medium bg-white text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={itemsTable.applyBulkUpdate}
                className="px-4 py-2 text-sm font-medium text-white rounded-md border-none cursor-pointer"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(event) => (event.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(event) => (event.currentTarget.style.opacity = "1")}
              >
                Update All
              </button>
            </div>
          </div>
        </div>
      )}

      {itemsTable.reportingTagsModalOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={itemsTable.closeReportingTagsModal}
        >
          <div
            className="bg-white rounded-lg w-[90%] max-w-[400px] shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Reporting Tags</h2>
              <button
                type="button"
                onClick={itemsTable.closeReportingTagsModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-6">
              <p className="text-sm text-gray-600 text-center">
                There are no active reporting tags or you haven&apos;t created a reporting tag yet. You can
                create or edit reporting tags under settings.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-center">
              <button
                type="button"
                onClick={itemsTable.closeReportingTagsModal}
                className="px-5 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {itemsTable.documentsModalOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={itemsTable.closeDocumentsModal}
        >
          <div
            className="bg-white rounded-lg w-[90%] max-w-[800px] max-h-[90vh] shadow-xl flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Files"
                    className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.2)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={itemsTable.closeDocumentsModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-48 border-r border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Inboxes</div>
                <div className="space-y-1">
                  <button className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded-md text-gray-900">
                    Files
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                    Bank Statements
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                    All Documents
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">File Name</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Details</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Uploaded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" className="cursor-pointer" />
                          <ImageIcon size={16} className="text-gray-400" />
                          <span className="text-sm cursor-pointer hover:underline" style={{ color: "#156372" }}>
                            WhatsApp Image 2025-03-17 at 16.44.12_cbcd4c2c.jpg
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        <div>$5,000.00</div>
                        <div>Vendor: FundingPips</div>
                        <div>Date: 10/03/2025</div>
                        <div>Ref #: 99</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">Me</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={itemsTable.closeDocumentsModal}
                className="px-5 py-2 text-sm font-medium bg-white text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={itemsTable.closeDocumentsModal}
                className="px-5 py-2 text-sm font-medium text-white rounded-md border-none cursor-pointer"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(event) => (event.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(event) => (event.currentTarget.style.opacity = "1")}
              >
                Attachments
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
