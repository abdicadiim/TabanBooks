import React, { useEffect, useRef, useState } from "react";
import { Check, AlertCircle, Building2, User, Star, ChevronDown, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ensureDemoLocations,
  readLocations,
  readLocationsEnabled,
  writeLocationsEnabled,
  writeLocations,
} from "./storage";
import { locationsAPI } from "../../../../../services/api";

type LocationAddress = {
  attention?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  fax?: string;
};

type LocationRecord = {
  _id?: string;
  id?: string;
  name?: string;
  type?: string;
  isActive?: boolean;
  isDefault?: boolean;
  defaultTransactionSeries?: string;
  address?: LocationAddress;
  [key: string]: any;
};

export default function LocationsPage() {
  const navigate = useNavigate();
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(false);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const primaryButtonClass =
    "px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#1b6f7d] hover:bg-[#155c68] transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1b6f7d]/30";

  const loadLocations = async () => {
    setIsLoadingLocations(true);
    try {
      const res = await locationsAPI.getAll();
      if (res?.success) {
        const rows = (Array.isArray(res.data) ? res.data : []) as LocationRecord[];
        writeLocations(rows);
        setLocations(rows);
      } else {
        setLocations(readLocations() as LocationRecord[]);
      }
    } catch (error) {
      console.error("Failed to load locations:", error);
      setLocations(readLocations() as LocationRecord[]);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  useEffect(() => {
    const enabled = readLocationsEnabled();
    setIsEnabled(enabled);

    const init = async () => {
      try {
        if (!enabled) return;
        await loadLocations();
      } finally {
        // keep the initial spinner short and deterministic
      }
    };

    void init();
  }, []);

  const handleEnableLocations = async () => {
    try {
      const demo = ensureDemoLocations();
      const response = await locationsAPI.enable();
      if (!response?.success) {
        throw new Error(response?.message || "Failed to enable locations");
      }

      setIsEnabled(true);
      writeLocationsEnabled(true);

      for (const row of demo as LocationRecord[]) {
        try {
          const res = await locationsAPI.create(row);
          if (!res?.success && res?.status !== 409) {
            console.warn("Failed to seed location:", res);
          }
        } catch (e) {
          console.warn("Location seed skipped:", e);
        }
      }

      await loadLocations();
      toast.success("Locations enabled");
    } catch (error) {
      console.error("Error enabling locations:", error);
      toast.error("Failed to enable locations");
    }
  };

  const handleLocationClick = (locationId: string) => {
    navigate(`/settings/locations/edit/${locationId}`);
  };

  const handleEdit = (locationId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    navigate(`/settings/locations/edit/${locationId}`);
  };

  const handleDropdownClick = (locationId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setOpenDropdownId((current) => (current === locationId ? null : locationId));
  };

  useEffect(() => {
    if (!openDropdownId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const openRow = document.querySelector(`tr[data-location-id="${openDropdownId}"]`);
      const target = event.target as HTMLElement | null;
      const isClickInsideOpenRow = Boolean(openRow && target && openRow.contains(target));
      const isClickOnActionButton =
        Boolean(target?.closest('button[aria-label="More options"]')) ||
        Boolean(target?.closest('button[aria-label="Edit"]'));

      if (!isClickInsideOpenRow && !isClickOnActionButton) {
        setOpenDropdownId(null);
      }
    };

    const timeoutId = window.setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdownId]);

  const formatAddress = (address?: LocationAddress) => {
    if (!address) return "-";
    if (address.country && String(address.country).trim()) {
      return address.country;
    }
    const parts = [address.street1, address.street2, address.city, address.state, address.zipCode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "-";
  };

  return (
    <div className="w-full h-full">
      {!isEnabled ? (
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Locations</h1>
            <p className="text-gray-600">
              Create locations for each branch and warehouse in your organisation and manage them all in one place.
            </p>
          </div>

          <div className="mb-8">
            <button
              onClick={handleEnableLocations}
              className="px-6 py-3 rounded-lg text-white text-sm font-medium bg-[#ef3b2d] hover:bg-[#d9362a] transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ef3b2d]/30"
            >
              Enable Locations
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">KEY BENEFITS</h2>
            <div className="space-y-3">
              {[
                "Monitor Item Stocks",
                "Separate Billing and Storage",
                "Unique Transaction Numbers",
                "Location-specific Accounting",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Check size={14} className="text-white" />
                  </div>
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Points to Note</h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>- Once you enable Locations, you won't be able to disable it.</li>
                  <li>- You can delete a location if it hasn't been used in transactions or mark it as inactive.</li>
                  <li>- You can manage multiple warehouses under a single location.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex flex-col items-center">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg px-6 py-4 mb-4 flex items-center gap-3">
                <Building2 size={24} className="text-blue-600" />
                <span className="text-base font-semibold text-gray-900">YOUR ORGANISATION</span>
              </div>

              <div className="flex items-start gap-8 mb-4">
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-gray-300 mb-2" />
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 flex items-center gap-2">
                    <User size={20} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">LOCATION A</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">GENERAL LOCATION</div>
                  <div className="mt-4 flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-8 bg-gray-300 mb-2" />
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 flex items-center gap-2">
                        <User size={20} className="text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">LOCATION C</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">GENERAL LOCATION</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-8 bg-gray-300 mb-2" />
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 flex items-center gap-2">
                        <User size={20} className="text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">LOCATION D</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">GENERAL LOCATION</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-gray-300 mb-2" />
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 flex items-center gap-2">
                    <User size={20} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">LOCATION B</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">GENERAL LOCATION</div>
                  <div className="mt-4 flex flex-col items-center">
                    <div className="w-0.5 h-8 bg-gray-300 mb-2" />
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 flex items-center gap-2">
                      <Building2 size={20} className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">LOCATION E</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">ITEM LEVEL LOCATION</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col">
          <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">Locations</h1>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/settings/customization/transaction-number-series")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Transaction Series Preferences
                </button>
              <button
                onClick={() => navigate("/settings/locations/new")}
                className={primaryButtonClass}
              >
                Add Location
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="bg-transparent rounded-none border-0 overflow-visible">
                <table className="w-full">
                  <thead>
                    <tr className="bg-transparent">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        LOCATION
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        DEFAULT TRANSACTION NUMBER SERIES
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        TYPE
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        ADDRESS DETAILS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                        {/* Empty header for actions column */}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent" ref={tableBodyRef}>
                    {isLoadingLocations ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          Loading locations...
                        </td>
                      </tr>
                    ) : locations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No locations found. Click "Add Location" to create your first location.
                        </td>
                      </tr>
                    ) : (
                      locations.map((location) => {
                        const locationId = String(location._id || location.id || "");
                        return (
                          <tr
                            key={locationId}
                            data-location-id={locationId}
                            className="group relative border-0"
                            onMouseEnter={() => setHoveredRowId(locationId)}
                            onMouseLeave={() => setHoveredRowId(null)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleLocationClick(locationId)}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                                >
                                  {location.name}
                                </button>
                                {location.isDefault ? (
                                  <Star size={16} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                ) : null}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {location.defaultTransactionSeries || "Default Transaction Series"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {location.type || "Business"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {formatAddress(location.address)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap relative">
                              {(hoveredRowId === locationId || openDropdownId === locationId) && (
                                <div className="flex flex-col items-end gap-1.5">
                                  <button
                                    onClick={(e) => handleDropdownClick(locationId, e)}
                                    className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center hover:bg-gray-600 transition text-white shadow-sm"
                                    aria-label="More options"
                                  >
                                    <ChevronDown size={14} className="text-white" />
                                  </button>
                                  {openDropdownId === locationId ? (
                                    <div className="absolute right-0 top-8 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                                      <button
                                        onClick={(e) => handleEdit(locationId, e)}
                                        aria-label="Edit"
                                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <Edit size={14} />
                                        <span>Edit</span>
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
