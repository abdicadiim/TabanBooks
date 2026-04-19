import { Calendar, Check, ChevronDown, ChevronUp, Search, Settings } from "lucide-react";
import { useNewAdjustmentFormContext } from "./context";

export function AdjustmentFormFields() {
  const { formData, errors, dates, accounts, locations, reasons, updateField } = useNewAdjustmentFormContext();

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center mb-5 gap-3 sm:gap-6">
        <label className="text-sm font-medium text-gray-700 sm:min-w-[180px]">
          <span className="text-red-500 font-medium">Mode of adjustment*</span>
        </label>
        <div className={`flex flex-wrap gap-4 sm:gap-6 p-1 rounded-md transition-all ${errors.mode ? "ring-1 ring-red-500/20 bg-red-50/10" : ""}`}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="quantity"
              checked={formData.mode === "quantity"}
              onChange={(event) => updateField("mode", event.target.value)}
              className="cursor-pointer"
            />
            <span className="text-sm text-gray-800">Quantity Adjustment</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="value"
              checked={formData.mode === "value"}
              onChange={(event) => updateField("mode", event.target.value)}
              className="cursor-pointer"
            />
            <span className="text-sm text-gray-800">Value Adjustment</span>
          </label>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center mb-5 gap-3 sm:gap-6">
        <label className="text-sm font-medium text-gray-700 sm:min-w-[180px]">Reference Number</label>
        <input
          type="text"
          value={formData.reference}
          onChange={(event) => updateField("reference", event.target.value)}
          className="w-full sm:w-[300px] px-3 py-2 border border-gray-300 rounded-md text-sm outline-none box-border focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.2)]"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center mb-5 gap-3 sm:gap-6">
        <label className="text-sm font-medium text-gray-700 sm:min-w-[180px]">
          <span className="text-red-500 font-medium">Date*</span>
        </label>
        <div className="relative" ref={dates.ref}>
          <input
            type="text"
            value={formData.date}
            readOnly
            onClick={dates.toggle}
            className={`w-full sm:w-[300px] px-3 py-2 pr-8 border rounded-md text-sm outline-none bg-white cursor-pointer box-border focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.2)] transition-all ${errors.date ? "border-red-500 ring-red-500/20 ring-1" : "border-gray-300"}`}
            required
          />
          <Calendar size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
          {dates.open && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[1000] w-full sm:w-[300px]">
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      dates.navigateMonth("prev");
                    }}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600 text-lg"
                  >
                    &laquo;
                  </button>
                  <span className="font-semibold text-gray-900 text-sm">
                    {dates.currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      dates.navigateMonth("next");
                    }}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600 text-lg"
                  >
                    &raquo;
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-xs font-semibold text-center py-1" style={{ color: "#156372" }}>
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {dates.days.map((day, index) => {
                    const isSelected =
                      day.month === "current" &&
                      day.fullDate.toDateString() === dates.selectedDate.toDateString();
                    const isToday =
                      day.month === "current" &&
                      day.fullDate.toDateString() === new Date().toDateString();

                    return (
                      <button
                        key={`${day.month}-${day.date}-${index}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (day.month === "current") {
                            dates.selectDate(day.fullDate);
                          }
                        }}
                        className={`text-sm py-2 rounded transition-colors ${day.month !== "current"
                          ? "text-gray-300 cursor-default"
                          : isSelected
                            ? "text-white font-semibold"
                            : isToday
                              ? "font-medium text-white"
                              : "text-gray-900 hover:bg-gray-100"
                          }`}
                        style={
                          isSelected || isToday
                            ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }
                            : {}
                        }
                      >
                        {day.date}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center mb-5 gap-3 sm:gap-6">
        <label className="text-sm font-medium text-gray-700 sm:min-w-[180px]">
          <span className="text-red-500 font-medium">Account*</span>
        </label>
        <div className="relative inline-block" ref={accounts.ref}>
          <input
            type="text"
            value={formData.account}
            readOnly
            onClick={accounts.toggle}
            placeholder="Select an account"
            className={`w-full sm:w-[300px] px-3 py-2 pr-8 rounded-md text-sm outline-none bg-white cursor-pointer box-border border transition-all ${errors.account ? "border-red-500 ring-red-500/20 ring-1" : accounts.open ? "border-[#156372]" : "border-gray-300"}`}
            required
          />
          {accounts.open ? (
            <ChevronUp size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          ) : (
            <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          )}

          {accounts.open && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-md z-[1000] w-full sm:w-[300px] overflow-hidden flex flex-col max-h-[300px]">
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={accounts.search}
                    onChange={(event) => accounts.setSearch(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded text-sm outline-none box-border focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.2)]"
                  />
                </div>
              </div>

              <div className="max-h-[240px] overflow-y-auto">
                {Object.keys(accounts.categories).length > 0 ? (
                  Object.entries(accounts.categories).map(([category, categoryAccounts]) => (
                    <div key={category}>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 sticky top-0">
                        {category}
                      </div>
                      {categoryAccounts.map((account) => {
                        const isSelected = formData.account === account;
                        return (
                          <div
                            key={account}
                            onClick={() => accounts.select(account)}
                            className={`px-3 py-2 pl-6 cursor-pointer text-sm flex items-center justify-between ${isSelected ? "text-white" : "text-gray-900 bg-transparent hover:bg-gray-50"}`}
                            style={isSelected ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : {}}
                          >
                            <span>{account}</span>
                            {isSelected && <Check size={16} className="text-white" strokeWidth={2.5} />}
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-500 text-sm">No accounts found</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center mb-5 gap-3 sm:gap-6">
        <label className="text-sm font-medium text-gray-700 sm:min-w-[180px]">
          <span className="text-red-500 font-medium">Reason*</span>
        </label>
        <div className="relative inline-block" ref={reasons.dropdownRef}>
          <input
            type="text"
            value={formData.reason}
            readOnly
            onClick={reasons.toggleDropdown}
            placeholder="Select a reason"
            className={`w-full sm:w-[300px] px-3 py-2 pr-8 border rounded-md text-sm outline-none bg-white cursor-pointer box-border focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.2)] transition-all ${errors.reason ? "border-red-500 ring-red-500/20 ring-1" : "border-gray-300"}`}
            required
          />
          {reasons.open ? (
            <ChevronUp size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          ) : (
            <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          )}

          {reasons.open && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-md z-[1000] w-full sm:w-[300px] overflow-hidden flex flex-col">
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={reasons.search}
                    onChange={(event) => reasons.setSearch(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded text-sm outline-none box-border"
                  />
                </div>
              </div>

              <div className="max-h-[200px] overflow-y-auto">
                {reasons.filtered.length > 0 ? (
                  reasons.filtered.map((reason) => {
                    const isSelected = formData.reason === reason;
                    return (
                      <div
                        key={reason}
                        onClick={() => reasons.select(reason)}
                        className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between ${isSelected ? "" : "text-gray-900 bg-transparent hover:bg-gray-50"}`}
                        style={isSelected ? { color: "#156372", backgroundColor: "rgba(21, 99, 114, 0.1)" } : {}}
                      >
                        <span>{reason}</span>
                        {isSelected && <Check size={16} style={{ color: "#156372" }} />}
                      </div>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-gray-500 text-sm">No reasons found</div>
                )}
              </div>

              <div
                onClick={reasons.openManageModal}
                className="px-3 py-2 border-t border-gray-200 cursor-pointer text-sm text-gray-900 flex items-center gap-2 hover:bg-gray-50"
              >
                <Settings size={16} className="text-gray-500" />
                <span>Manage Reasons</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start mb-5 gap-3 sm:gap-6">
        <label className="text-sm font-medium text-gray-700 sm:min-w-[180px] pt-2">
          <span className="text-red-500 font-medium">Location*</span>
        </label>
        <div className="relative inline-block" ref={locations.ref}>
          <input
            type="text"
            value={formData.location}
            readOnly
            onClick={locations.toggle}
            placeholder="Select a location"
            className={`w-full sm:w-[300px] px-3 py-2 pr-8 border rounded-md text-sm outline-none bg-white cursor-pointer box-border focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.2)] transition-all ${errors.location ? "border-red-500 ring-red-500/20 ring-1" : "border-gray-300"}`}
            required
          />
          {locations.open ? (
            <ChevronUp size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          ) : (
            <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          )}

          {locations.open && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[1000] w-full sm:w-[300px] overflow-hidden flex flex-col">
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={locations.search}
                    onChange={(event) => locations.setSearch(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded text-sm outline-none box-border focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.2)]"
                  />
                </div>
              </div>

              <div className="max-h-[200px] overflow-y-auto">
                {(locations.items || [])
                  .map((location) => String(location.name || location.locationName || ""))
                  .filter((name) => name.toLowerCase().includes(locations.search.toLowerCase()))
                  .map((name) => {
                    const isSelected = formData.location === name;
                    return (
                      <div
                        key={name}
                        onClick={() => locations.select(name)}
                        className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between ${isSelected ? "text-white" : "text-gray-900 bg-transparent hover:bg-gray-50"}`}
                        style={isSelected ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : {}}
                      >
                        <span>{name}</span>
                        {isSelected && <Check size={16} className="text-white" strokeWidth={2.5} />}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start mb-5 gap-6">
        <label className="text-sm font-medium text-gray-700 sm:min-w-[180px] pt-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Max. 500 characters"
          maxLength={500}
          className="w-full sm:w-[300px] px-3 py-2 border border-gray-300 rounded-md text-sm outline-none resize-y min-h-20 font-inherit box-border focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.2)]"
        />
      </div>
    </div>
  );
}
