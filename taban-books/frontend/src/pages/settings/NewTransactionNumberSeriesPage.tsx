import React, { useState, useRef, useEffect } from "react";
import { Plus, X, Info, ChevronDown, Search, Check } from "lucide-react";
import { transactionNumberSeriesAPI, locationsAPI } from "../../services/api";
import { toast } from "react-toastify";

// Transaction Number Series - New Series Page
interface Module {
  module: string;
  prefix: string;
  startingNumber: string;
  restartNumbering: string;
  preview: string;
}

export interface TransactionNumberSeriesEditorData {
  seriesName: string;
  locationIds?: string[];
  modules?: Array<{
    module: string;
    prefix: string;
    startingNumber: string;
    restartNumbering: string;
    preview?: string;
    currentNumber?: number;
    isDefault?: boolean;
  }>;
}

interface NewTransactionNumberSeriesPageProps {
  onBack: () => void;
  mode?: "create" | "edit";
  initialData?: TransactionNumberSeriesEditorData | null;
}

const DEFAULT_MODULES: Module[] = [
  { module: "Credit Note", prefix: "CN-", startingNumber: "00001", restartNumbering: "None", preview: "CN-00001" },
  { module: "Journal", prefix: "", startingNumber: "1", restartNumbering: "None", preview: "1" },
  { module: "Customer Payment", prefix: "", startingNumber: "1", restartNumbering: "None", preview: "1" },
  { module: "Vendor Payment", prefix: "", startingNumber: "1", restartNumbering: "None", preview: "1" },
  { module: "Purchase Order", prefix: "MO-%FYE_YY%%YYYY%%DD%", startingNumber: "00001", restartNumbering: "Yearly", preview: "MO-2620261200001" },
  { module: "Sales Order", prefix: "SO-", startingNumber: "00001", restartNumbering: "None", preview: "SO-00001" },
  { module: "Retainer Invoice", prefix: "RET-", startingNumber: "00001", restartNumbering: "None", preview: "RET-00001" },
  { module: "Vendor Credits", prefix: "DN-", startingNumber: "00001", restartNumbering: "None", preview: "DN-00001" },
  { module: "Debit Note", prefix: "CDN-", startingNumber: "000001", restartNumbering: "None", preview: "CDN-000001" },
  { module: "Invoice", prefix: "INV-", startingNumber: "000001", restartNumbering: "None", preview: "INV-000001" },
  { module: "Quote", prefix: "QT-", startingNumber: "000001", restartNumbering: "None", preview: "QT-000001" },
  { module: "Sales Receipt", prefix: "SR-", startingNumber: "00001", restartNumbering: "None", preview: "SR-00001" },
  { module: "Sales Return", prefix: "RMA-", startingNumber: "00001", restartNumbering: "None", preview: "RMA-00001" },
];

const buildModulesFromInitialData = (initialData?: TransactionNumberSeriesEditorData | null): Module[] => {
  const byModule = new Map(
    (initialData?.modules || []).map((module) => [String(module.module || "").trim().toLowerCase(), module]),
  );

  const baseModules = DEFAULT_MODULES.map((module) => {
    const match = byModule.get(String(module.module).trim().toLowerCase());
    if (!match) return { ...module };
    const startingNumber = String(match.startingNumber ?? module.startingNumber ?? "");
    const prefix = String(match.prefix ?? module.prefix ?? "");
    const restartNumbering = String(match.restartNumbering ?? module.restartNumbering ?? "None");
    return {
      module: module.module,
      prefix,
      startingNumber,
      restartNumbering,
      preview: match.preview || `${prefix}${startingNumber}`,
    };
  });

  const existingModules = new Set(DEFAULT_MODULES.map((module) => module.module.toLowerCase()));
  const extraModules = (initialData?.modules || [])
    .filter((module) => !existingModules.has(String(module.module || "").trim().toLowerCase()))
    .map((module) => ({
      module: String(module.module || "").trim(),
      prefix: String(module.prefix ?? ""),
      startingNumber: String(module.startingNumber ?? "1"),
      restartNumbering: String(module.restartNumbering ?? "None"),
      preview: String(module.preview ?? `${module.prefix ?? ""}${module.startingNumber ?? "1"}`),
    }));

  return [...baseModules, ...extraModules];
};

export default function NewTransactionNumberSeriesPage({
  onBack,
  mode = "create",
  initialData = null,
}: NewTransactionNumberSeriesPageProps) {
  const primaryColor = "#156372";
  const [seriesName, setSeriesName] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [fetchingLocations, setFetchingLocations] = useState(true);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [modules, setModules] = useState<Module[]>(() => buildModulesFromInitialData(initialData));

  useEffect(() => {
    fetchLocations();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchLocations = async () => {
    try {
      setFetchingLocations(true);
      const response = await locationsAPI.getAll();
      if (response && response.success) {
        setLocations(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setFetchingLocations(false);
    }
  };

  useEffect(() => {
    if (mode === "edit" && initialData) {
      setSeriesName(initialData.seriesName || "");
      setModules(buildModulesFromInitialData(initialData));
    } else if (mode === "create") {
      setSeriesName("");
      setModules(buildModulesFromInitialData(null));
      setSelectedLocations([]);
    }
  }, [mode, initialData]);

  useEffect(() => {
    if (mode !== "edit" || !initialData || !locations.length) return;
    const locationIds = new Set((initialData.locationIds || []).map((id) => String(id)));
    setSelectedLocations(locations.filter((loc) => locationIds.has(String(loc._id))));
  }, [mode, initialData, locations]);

  const handleModuleChange = (index: number, field: keyof Module, value: string) => {
    const newModules = [...modules];
    (newModules[index] as any)[field] = value;

    if (field === 'prefix' || field === 'startingNumber') {
      newModules[index].preview = newModules[index].prefix + newModules[index].startingNumber;
    }

    setModules(newModules);
  };

  const toggleLocation = (loc: any) => {
    const isSelected = selectedLocations.some(item => item._id === loc._id);
    if (isSelected) {
      setSelectedLocations(selectedLocations.filter(item => item._id !== loc._id));
    } else {
      setSelectedLocations([...selectedLocations, loc]);
    }
  };

  const handleSave = async () => {
    if (!seriesName.trim()) {
      alert("Please enter a series name");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        seriesName: seriesName.trim(),
        locationIds: selectedLocations.map(loc => loc._id),
        modules: modules.map(module => ({
          module: module.module,
          prefix: module.prefix,
          startingNumber: module.startingNumber,
          currentNumber: parseInt(module.startingNumber) || 1,
          restartNumbering: module.restartNumbering.toLowerCase(),
          isDefault: false
        }))
      };

      if (mode === "edit") {
        await transactionNumberSeriesAPI.updateMultiple({
          ...payload,
          originalName: initialData?.seriesName || payload.seriesName,
        });
        toast.success("Transaction number series updated successfully.");
      } else {
        await transactionNumberSeriesAPI.createMultiple(payload);
        toast.success("Transaction number series created successfully.");
      }
      onBack();
    } catch (error: any) {
      console.error("Error saving transaction number series:", error);
      toast.error(error.message || "Failed to save transaction number series.");
      alert(error.message || "Failed to save transaction number series");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const getDisplayValue = () => {
    if (selectedLocations.length === 0) return 'Add Location';
    if (selectedLocations.length === 1) return selectedLocations[0].name;
    return `${selectedLocations[0].name} (+${selectedLocations.length - 1})`;
  };

  return (
    <div className="flex min-w-0 flex-col font-sans bg-transparent">
      <div className="sticky top-0 z-20 bg-[#fcfdff] pb-4">
        {/* Title with Close icon */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-gray-800">{mode === "edit" ? "Edit Series" : "New Series"}</h2>
          <button
            onClick={onBack}
            className="rounded-md p-1 text-red-500 transition-colors hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Content */}
        <div className="mb-0 space-y-5">
          <div className="flex items-start">
            <label className="mt-2 w-[160px] text-[13px] font-medium text-red-400">
              Series Name*
            </label>
            <div className="flex-1 max-w-[380px] xl:max-w-[420px]">
              <input
                type="text"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                className="w-full h-[36px] bg-white border border-[#e2e8f0] rounded px-3 text-[14px] text-gray-700 focus:outline-none focus:border-[#156372] transition-all"
                style={{ caretColor: primaryColor }}
              />
            </div>
          </div>

          <div className="flex items-start">
            <label className="mt-2 w-[160px] text-[13px] font-medium text-gray-500">
              Location
            </label>
            <div className="relative flex-1 max-w-[380px] xl:max-w-[420px]" ref={dropdownRef}>
              <div
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className={`w-full h-[36px] bg-white border ${showLocationDropdown ? 'border-[#156372] ring-2 ring-[#e6f4f1]' : 'border-[#e2e8f0]'} rounded px-3 flex items-center justify-between text-[14px] text-gray-600 cursor-pointer transition-all`}
              >
                <span className={selectedLocations.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
                  {getDisplayValue()}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
              </div>

              {showLocationDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 border-b border-gray-50">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search"
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        className="w-full h-[36px] pl-9 pr-3 bg-white border border-gray-200 rounded-md text-[13px] focus:outline-none focus:border-[#156372]"
                        style={{ caretColor: primaryColor }}
                      />
                    </div>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1">
                    {fetchingLocations ? (
                      <div className="p-3 text-center text-gray-400 text-[13px]">Loading locations...</div>
                    ) : filteredLocations.length > 0 ? (
                      filteredLocations.map((loc) => {
                        const isSelected = selectedLocations.some(item => item._id === loc._id);
                        return (
                          <div
                            key={loc._id}
                            onClick={() => toggleLocation(loc)}
                            className={`flex items-center justify-between px-3 py-2.5 text-[14px] rounded cursor-pointer transition-colors ${isSelected
                              ? 'bg-[#e6f4f1] text-[#156372] font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <span>{loc.name}</span>
                            {isSelected && <Check size={16} className="text-[#156372]" />}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-gray-400 text-[13px]">No locations found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mb-10 min-w-0 overflow-hidden bg-transparent rounded-none border-0 shadow-none">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#f8fafc] border-b border-[#edf2f7]">
            <tr>
              <th className="w-[22%] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">MODULE</th>
              <th className="w-[22%] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">PREFIX</th>
              <th className="w-[18%] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <div className="flex items-center gap-1.5">
                  STARTING NUMBER
                  <Info size={13} className="text-gray-400" />
                </div>
              </th>
              <th className="w-[18%] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <div className="flex items-center gap-1.5">
                  RESTART NUMBERING
                  <Info size={13} className="text-gray-400" />
                </div>
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <div className="flex items-center gap-1.5">
                  PREVIEW
                  <Info size={13} className="text-gray-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {modules.map((item, index) => (
              <tr key={index} className="hover:bg-[#fcfdff] transition-colors group">
                <td className="px-4 py-3.5">
                  <span className="text-[14px] font-medium text-gray-700">{item.module}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={item.prefix}
                      onChange={(e) => handleModuleChange(index, 'prefix', e.target.value)}
                      className="w-full h-[32px] bg-white border border-[#e2e8f0] rounded px-2 pr-8 text-[13px] text-gray-600 focus:outline-none focus:border-[#156372] transition-all"
                      style={{ caretColor: primaryColor }}
                    />
                    <button className="absolute right-2 text-[#156372] hover:text-[#0f4f5c] p-0.5 rounded">
                      <Plus size={14} strokeWidth={3} />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <input
                    type="text"
                    value={item.startingNumber}
                    onChange={(e) => handleModuleChange(index, 'startingNumber', e.target.value)}
                    className="w-full h-[32px] bg-white border border-[#e2e8f0] rounded px-2 text-[13px] text-gray-600 focus:outline-none focus:border-[#156372] transition-all"
                    style={{ caretColor: primaryColor }}
                  />
                </td>
                <td className="px-4 py-3.5">
                  <div className="relative">
                    <select
                      value={item.restartNumbering}
                      onChange={(e) => handleModuleChange(index, 'restartNumbering', e.target.value)}
                      className="w-full h-[32px] bg-white border border-[#e2e8f0] rounded px-2 pr-8 text-[13px] text-gray-600 focus:outline-none focus:border-[#156372] transition-all appearance-none"
                    >
                      <option value="None">None</option>
                      <option value="Yearly">Yearly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[13px] text-gray-500">{item.preview}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-0 z-30 -mx-0 border-t border-gray-100 bg-[#fcfdff] pt-4 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 h-[34px] bg-[#156372] text-white text-[13px] font-medium rounded hover:bg-[#0f4f5c] transition-colors shadow-sm disabled:bg-gray-300 min-w-[80px]"
          >
            {isLoading ? "Saving..." : mode === "edit" ? "Update" : "Save"}
          </button>
          <button
            onClick={onBack}
            className="px-5 h-[34px] bg-white border border-[#e2e8f0] text-[13px] font-medium text-gray-700 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
