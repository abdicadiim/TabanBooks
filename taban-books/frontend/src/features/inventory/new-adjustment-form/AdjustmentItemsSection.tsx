import { Check, ChevronDown, GripVertical, Image as ImageIcon, MoreVertical, X } from "lucide-react";
import type { Item } from "../../items/itemsModel";
import { useNewAdjustmentFormContext } from "./context";

const getItemKey = (item: Item, fallback: number) => String(item._id || item.id || `${item.name}-${fallback}`);

export function AdjustmentItemsSection() {
  const { errors, isValueMode, itemsTable } = useNewAdjustmentFormContext();

  return (
    <div className="mb-8">
      <div className="rounded-md border border-gray-200 overflow-visible">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-[22px] md:text-base font-semibold text-gray-900">Item Table</h3>
          <div className="relative" ref={itemsTable.bulkActionsRef}>
            <button
              type="button"
              onClick={itemsTable.toggleBulkActions}
              className={`px-2 py-1.5 text-sm rounded-md cursor-pointer flex items-center gap-1.5 ${isValueMode ? "text-[#2563eb] bg-transparent border-none" : "text-white border"}`}
              style={isValueMode ? {} : { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)", borderColor: "#0D4A52" }}
            >
              <Check size={14} />
              Bulk Actions
              <ChevronDown size={14} className={itemsTable.bulkActionsDropdownOpen ? "rotate-180" : ""} />
            </button>
            {itemsTable.bulkActionsDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[1000] min-w-[220px]">
                <button
                  type="button"
                  onClick={itemsTable.openBulkUpdate}
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 cursor-pointer"
                  onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)")}
                  onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = "transparent")}
                >
                  Bulk Update Line Items
                </button>
                <button
                  type="button"
                  onClick={itemsTable.hideAdditionalInfo}
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Hide All Additional Information
                </button>
              </div>
            )}
          </div>
        </div>

        {isValueMode && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-900">
            <span className="font-semibold">Value Adjustment Formula:</span>{" "}
            Current Value = Stock Qty x Unit Cost, Adjusted Value = Changed Value - Current Value.
            Enter either Changed Value or Adjusted Value; the other field auto-calculates.
          </div>
        )}

        <div className={`hidden md:block transition-all ${errors.items ? "p-1 border border-red-500/50 rounded-lg bg-red-50/10" : ""}`}>
          <table className="w-full border-collapse mt-4">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase border-b border-gray-200 w-[350px]">
                  Item Details
                </th>
                {isValueMode ? (
                  <>
                    <th className="p-3 text-right text-xs font-semibold text-gray-700 uppercase border-b border-gray-200 whitespace-nowrap">
                      Current Value
                    </th>
                    <th className="p-3 text-right text-xs font-semibold text-gray-700 uppercase border-b border-gray-200 whitespace-nowrap">
                      Changed Value
                    </th>
                    <th className="p-3 text-right text-xs font-semibold text-gray-700 uppercase border-b border-gray-200 whitespace-nowrap">
                      Adjusted Value
                    </th>
                  </>
                ) : (
                  <>
                    <th className="p-3 text-right text-xs font-semibold text-gray-700 uppercase border-b border-gray-200 whitespace-nowrap">
                      Quantity Available
                    </th>
                    <th className="p-3 text-right text-xs font-semibold text-gray-700 uppercase border-b border-gray-200 whitespace-nowrap">
                      New Quantity On Hand
                    </th>
                    <th className="p-3 text-right text-xs font-semibold text-gray-700 uppercase border-b border-gray-200 whitespace-nowrap">
                      Quantity Adjusted
                    </th>
                    <th className="p-3 text-right text-xs font-semibold text-gray-700 uppercase border-b border-gray-200 whitespace-nowrap">
                      Cost Price
                    </th>
                  </>
                )}
                <th className="p-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200 w-[80px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {itemsTable.rows.map((item, index) => {
                const rowItems = itemsTable.filteredItems(index);
                return (
                  <tr key={item.id} className="group align-top">
                    <td className="p-3 border-b border-gray-200">
                      <div
                        className={`relative ${itemsTable.itemDropdownOpen[index] ? "z-[10]" : ""}`}
                        ref={(element) => {
                          itemsTable.itemRefs.current[index] = element;
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical size={16} className="text-gray-400 cursor-grab mt-1 shrink-0" />
                          <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-gray-400 shrink-0">
                            <ImageIcon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {item.selectedItem ? (
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 pr-2 flex-1">
                                  <div className="text-sm font-semibold text-gray-900 truncate">
                                    {item.selectedItem.name || item.itemDetails}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    SKU: {item.selectedItem.sku || "no"}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => itemsTable.clearSelectedItem(index)}
                                  className="bg-transparent border-none cursor-pointer p-1 flex items-center rounded-full w-6 h-6 justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="pt-2">
                                <input
                                  type="text"
                                  placeholder="Type or click to select an item."
                                  value={item.itemDetails}
                                  onChange={(event) => itemsTable.handleItemSearchChange(index, event.target.value)}
                                  onFocus={() => itemsTable.openItemDropdown(index)}
                                  className={`w-full px-3 py-2 rounded-md text-sm outline-none border ${itemsTable.itemDropdownOpen[index] ? "border-[#156372] ring-1 ring-[#156372]" : "border-gray-300"}`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        {itemsTable.itemDropdownOpen[index] && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[9999] max-h-[300px] overflow-y-auto">
                            {rowItems.length > 0 ? (
                              rowItems.map((itemOption, optionIndex) => {
                                const stockOnHand = itemsTable.getStockOnHand(itemOption);
                                const stockValue = stockOnHand !== null ? stockOnHand : 0;
                                const stockColor = stockValue < 0 ? "#ef4444" : stockValue > 0 ? "#10b981" : "#6b7280";
                                const unit = itemOption.unit || "pcs";

                                return (
                                  <div
                                    key={getItemKey(itemOption, optionIndex)}
                                    className={`px-4 py-3 cursor-pointer flex items-center justify-between ${optionIndex < rowItems.length - 1 ? "border-b border-gray-100" : ""} group`}
                                    onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = "#f9fafb")}
                                    onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = "transparent")}
                                    onClick={() => {
                                      void itemsTable.selectItem(index, itemOption);
                                    }}
                                  >
                                    <div className="flex-1">
                                      <div className="item-name text-sm font-semibold text-gray-900 mb-0.5">
                                        {typeof itemOption.name === "string" ? itemOption.name : String(itemOption)}
                                      </div>
                                      <div className="item-sku text-xs text-gray-500">
                                        SKU: {itemOption.sku || "no"}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="stock-label text-[10px] text-gray-500 uppercase font-semibold">
                                        Stock on Hand
                                      </div>
                                      <div className="stock-value text-[13px] font-bold" style={{ color: stockColor }}>
                                        {stockOnHand !== null ? `${stockValue.toFixed(2)} ${unit}` : "-"}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="px-3 py-4 text-gray-500 text-sm text-center">No items found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 border-b border-gray-200">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{item.quantityAvailable || "0.00"}</div>
                        {!isValueMode && (
                          <div className="text-xs text-gray-500">{item.selectedItem?.unit || "pcs"}</div>
                        )}
                      </div>
                    </td>
                    {isValueMode ? (
                      <>
                        <td className="p-3 border-b border-gray-200">
                          <input
                            type="text"
                            value={item.newQuantityOnHand}
                            onChange={(event) => itemsTable.handleRowFieldChange(index, "newQuantityOnHand", event.target.value)}
                            placeholder="New total value"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none text-right focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                          />
                        </td>
                        <td className="p-3 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Difference e.g. +10, -10"
                            value={item.quantityAdjusted}
                            onChange={(event) => itemsTable.handleRowFieldChange(index, "quantityAdjusted", event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none text-right focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 border-b border-gray-200">
                          <input
                            type="text"
                            value={item.newQuantityOnHand}
                            onChange={(event) => itemsTable.handleRowFieldChange(index, "newQuantityOnHand", event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none text-right focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                          />
                        </td>
                        <td className="p-3 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Eg. +10, -10"
                            value={item.quantityAdjusted}
                            onChange={(event) => itemsTable.handleRowFieldChange(index, "quantityAdjusted", event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none text-right focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                          />
                        </td>
                        <td className="p-3 border-b border-gray-200">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              ${parseFloat(String(item.costPrice) || "0").toFixed(2)}
                            </div>
                            <button
                              type="button"
                              onClick={() => itemsTable.editCostPrice(index)}
                              className="text-xs text-[#156372] hover:underline bg-transparent border-none cursor-pointer mt-1"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                    <td className="p-3 border-b border-gray-200">
                      <div className="flex items-center justify-center gap-1">
                        <div
                          className="relative"
                          ref={(element) => {
                            itemsTable.rowMenuRefs.current[index] = element;
                          }}
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              itemsTable.toggleRowMenu(index);
                            }}
                            className="bg-transparent border-none cursor-pointer text-gray-400 p-1.5 flex items-center rounded-full hover:bg-gray-100 hover:text-gray-600"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {itemsTable.rowMenuOpen[index] && (
                            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[1001] min-w-[200px] overflow-hidden">
                              <div
                                className="w-full px-4 py-2 text-sm font-medium text-[#156372] bg-[#eff6ff] cursor-pointer flex items-center justify-between"
                                onClick={() => {
                                  itemsTable.hideAdditionalInfo();
                                  itemsTable.setRowMenuVisibility(index, false);
                                }}
                              >
                                <span>Hide Additional Information</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  itemsTable.addNewRow();
                                  itemsTable.setRowMenuVisibility(index, false);
                                }}
                                className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                              >
                                Insert New Row
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  itemsTable.openBulkAdd();
                                  itemsTable.setRowMenuVisibility(index, false);
                                }}
                                className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                              >
                                Insert Items in Bulk
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => itemsTable.removeRow(index)}
                          className="bg-transparent border-none cursor-pointer p-1.5 flex items-center rounded-full text-red-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden mt-4 space-y-3">
          {itemsTable.rows.map((item, index) => (
            <div key={String(item.id)} className="p-3 border border-gray-200 rounded-md bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {item.selectedItem ? (
                    <div>
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {item.selectedItem.name || item.itemDetails}
                      </div>
                      <div className="text-xs text-gray-500">SKU: {item.selectedItem.sku || "no"}</div>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Type or click to select an item."
                      value={item.itemDetails}
                      onChange={(event) => itemsTable.handleItemSearchChange(index, event.target.value)}
                      onFocus={() => itemsTable.openItemDropdown(index)}
                      className={`w-full px-3 py-2 rounded-md text-sm outline-none border ${itemsTable.itemDropdownOpen[index] ? "border-[#156372] ring-1 ring-[#156372]" : "border-gray-300"}`}
                    />
                  )}
                </div>
                <div className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => itemsTable.removeRow(index)}
                    className="bg-transparent border-none cursor-pointer p-1.5 flex items-center rounded-full text-red-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500">{isValueMode ? "Current Value" : "Quantity Available"}</div>
                  <div className="text-sm font-medium">{item.quantityAvailable || "0.00"}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">{isValueMode ? "Changed Value" : "New Quantity On Hand"}</div>
                  <input
                    type="text"
                    value={item.newQuantityOnHand}
                    onChange={(event) => itemsTable.handleRowFieldChange(index, "newQuantityOnHand", event.target.value)}
                    placeholder={isValueMode ? "New total value" : undefined}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none text-right focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-500">{isValueMode ? "Adjusted Value" : "Quantity Adjusted"}</div>
                  <input
                    type="text"
                    placeholder={isValueMode ? "Difference e.g. +10, -10" : "Eg. +10, -10"}
                    value={item.quantityAdjusted}
                    onChange={(event) => itemsTable.handleRowFieldChange(index, "quantityAdjusted", event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none text-right focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                  />
                </div>

                {!isValueMode && (
                  <div>
                    <div className="text-xs text-gray-500">Cost Price</div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">${parseFloat(String(item.costPrice) || "0").toFixed(2)}</div>
                      <button
                        type="button"
                        onClick={() => itemsTable.editCostPrice(index)}
                        className="text-xs text-[#156372] hover:underline bg-transparent border-none cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
