import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, MoreVertical, Download, Upload, Check, Edit2, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import NewCurrencyModal from "./NewCurrencyModal";
import EditCurrencyModal from "./EditCurrencyModal";
import { useNavigate, useLocation } from "react-router-dom";
import { getToken, API_BASE_URL } from "../../../../../services/auth";
import { currenciesAPI } from "../../../../../services/api";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  isActive: boolean;
  latestRate?: number | null;
  asOfDate?: string | null;
  _raw: any;
}

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRateFeedsEnabled, setExchangeRateFeedsEnabled] = useState(false);
  const [showNewCurrencyModal, setShowNewCurrencyModal] = useState(false);
  const [showEditCurrencyModal, setShowEditCurrencyModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [threeDotsPosition, setThreeDotsPosition] = useState({ top: 0, left: 0, width: 0 });
  const threeDotsRef = useRef<HTMLDivElement>(null);
  const threeDotsMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const loadCurrencies = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await currenciesAPI.getAll({
        databaseOnly: true,
        _ts: Date.now(),
      });

      const rawRows = Array.isArray(response?.data) ? response.data : [];
      const mapped: Currency[] = rawRows.map((currency: any) => {
        const rates = Array.isArray(currency.exchangeRates) ? currency.exchangeRates : [];
        const latestRate =
          rates.length > 0
            ? [...rates].sort(
              (a: any, b: any) =>
                new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime()
            )[0]
            : null;
        return {
          id: currency._id,
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          isBase: currency.isBaseCurrency || false,
          isActive: currency.isActive !== false,
          latestRate: latestRate ? latestRate.rate : null,
          asOfDate: latestRate ? latestRate.date : null,
          _raw: currency,
        };
      });
      setCurrencies(mapped);
    } catch (err) {
      console.error("Error loading currencies:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load currencies from backend
  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies, location.key]);

  // Load exchange rate feeds status
  useEffect(() => {
    const loadExchangeRateFeedsStatus = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/settings/currencies/exchange-rate-feeds`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setExchangeRateFeedsEnabled(data.data.enableExchangeRateFeeds);
          }
        }
      } catch (err) {
        console.error("Error loading exchange rate feeds status:", err);
      }
    };

    loadExchangeRateFeedsStatus();
  }, []);

  const handleSaveNewCurrency = async (newCurrency: any) => {
    const token = getToken();
    if (!token) {
      alert("You are not logged in. Please sign in again.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/settings/currencies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: newCurrency.code,
          name: newCurrency.name,
          symbol: newCurrency.symbol,
          isBaseCurrency: newCurrency.isBaseCurrency || false,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create currency");
      }

      const currency = data.data;
      const mappedCurrency = {
        id: currency._id,
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        isBase: currency.isBaseCurrency || false,
        isActive: currency.isActive !== false,
        _raw: currency,
      };

      if (newCurrency.isBaseCurrency) {
        setCurrencies((prev) => prev.map(c => ({ ...c, isBase: false })));
      }
      setCurrencies((prev) => [...prev, mappedCurrency as Currency]);
      setShowNewCurrencyModal(false);
      setNotification("Currency created successfully");
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error("Error creating currency:", err);
      alert(err.message || "Failed to create currency");
    }
  };

  const handleEditCurrency = (currency: Currency) => {
    setEditingCurrency(currency);
    setShowEditCurrencyModal(true);
  };

  const handleSaveEditCurrency = async (updatedData: any) => {
    const token = getToken();
    if (!token) return;

    try {
      if (!editingCurrency) return;
      const response = await fetch(`${API_BASE_URL}/settings/currencies/${editingCurrency.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: updatedData.code,
          name: updatedData.name,
          symbol: updatedData.symbol,
          isBaseCurrency: updatedData.isBaseCurrency,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update currency");
      }

      if (updatedData.isBaseCurrency) {
        setCurrencies((prev) =>
          prev.map((c) =>
            editingCurrency && c.id === editingCurrency.id
              ? { ...c, ...updatedData, isBase: true }
              : { ...c, isBase: false }
          )
        );
      } else {
        setCurrencies((prev) =>
          prev.map((c) =>
            editingCurrency && c.id === editingCurrency.id
              ? { ...c, ...updatedData, isBase: updatedData.isBaseCurrency }
              : c
          )
        );
      }
      setShowEditCurrencyModal(false);
      setEditingCurrency(null);
      setNotification("Currency updated successfully");
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error("Error updating currency:", err);
      alert(err.message || "Failed to update currency");
    }
  };

  const handleDeleteCurrency = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this currency?")) return;

    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/settings/currencies/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete currency");
      }

      setCurrencies((prev) => prev.filter((c) => c.id !== id));
      setNotification("Currency deleted successfully");
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error("Error deleting currency:", err);
      alert(err.message || "Failed to delete currency");
    }
  };

  const handleMarkAsBase = async (id: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/settings/currencies/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isBaseCurrency: true,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to set base currency");
      }

      setCurrencies((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, isBase: true }
            : { ...c, isBase: false }
        )
      );
      setNotification("Base currency updated successfully");
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error("Error setting base currency:", err);
      alert(err.message || "Failed to set base currency");
    }
  };

  const handleThreeDotsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 220;
    const menuHeight = 104;
    const margin = 8;

    // Keep menu fully visible within viewport
    let left = rect.right - menuWidth;
    if (left < margin) left = margin;
    if (left + menuWidth > window.innerWidth - margin) {
      left = window.innerWidth - menuWidth - margin;
    }

    let top = rect.bottom + 8;
    if (top + menuHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - menuHeight - 8);
    }

    setThreeDotsPosition({
      top,
      left,
      width: menuWidth
    });
    setShowThreeDotsMenu(true);
  };

  const handleImportExchangeRates = () => {
    setShowThreeDotsMenu(false);
    navigate("/settings/currencies/import");
  };

  const handleExportExchangeRates = () => {
    setShowThreeDotsMenu(false);
    navigate("/settings/currencies/export");
  };

  const handleToggleExchangeRateFeeds = async () => {
    const token = getToken();
    if (!token) {
      alert("You are not logged in. Please sign in again.");
      return;
    }

    try {
      const newStatus = !exchangeRateFeedsEnabled;
      const response = await fetch(`${API_BASE_URL}/settings/currencies/exchange-rate-feeds`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: newStatus }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to toggle exchange rate feeds");
      }

      setExchangeRateFeedsEnabled(newStatus);
      setNotification(
        `Exchange rate feeds ${newStatus ? "enabled" : "disabled"} successfully`
      );
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error("Error toggling exchange rate feeds:", err);
      alert(err.message || "Failed to toggle exchange rate feeds");
    }
  };

  // Click away handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (threeDotsRef.current && !threeDotsRef.current.contains(event.target as Node) &&
        threeDotsMenuRef.current && !threeDotsMenuRef.current.contains(event.target as Node)) {
        setShowThreeDotsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="p-6">
      {/* Success Notification */}
      {notification && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#d1fae5",
            border: "1px solid #10b981",
            borderRadius: "8px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            zIndex: 10001,
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "4px",
              backgroundColor: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Check size={16} style={{ color: "#ffffff" }} />
          </div>
          <span
            style={{
              fontSize: "14px",
              color: "#065f46",
              fontWeight: "500",
            }}
          >
            {notification}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Currencies
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewCurrencyModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#156372] rounded-lg hover:bg-[#0f4f5c] flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            New Currency
          </button>
          <button
            onClick={handleToggleExchangeRateFeeds}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {Boolean(exchangeRateFeedsEnabled) ? "Disable Exchange Rate Feeds" : "Enable Exchange Rate Feeds"}
          </button>
          <div className="relative" ref={threeDotsRef}>
            <button
              onClick={handleThreeDotsClick}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <MoreVertical size={20} className="text-gray-600" />
            </button>
            {showThreeDotsMenu && createPortal(
              <div
                ref={threeDotsMenuRef}
                className="fixed bg-white rounded-lg shadow-xl border-2 border-gray-200 py-1 min-w-[220px]"
                style={{
                  top: `${threeDotsPosition.top}px`,
                  left: `${threeDotsPosition.left}px`,
                  width: `${threeDotsPosition.width || 220}px`,
                  zIndex: 10000
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleImportExchangeRates}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                >
                  <Download size={16} className="text-gray-500" />
                  Import Exchange Rates
                </button>
                <button
                  onClick={handleExportExchangeRates}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Upload size={16} className="text-gray-500" />
                  Export Exchange Rates
                </button>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">NAME</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SYMBOL</th>
              {!Boolean(exchangeRateFeedsEnabled) && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    EXCHANGE RATE (IN {currencies.find(c => c.isBase)?.code || 'BASE'})
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">AS OF DATE</th>
                </>
              )}
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={!Boolean(exchangeRateFeedsEnabled) ? 5 : 3} className="px-6 py-12 text-center text-gray-500">
                  Loading currencies...
                </td>
              </tr>
            ) : currencies.length === 0 ? (
              <tr>
                <td colSpan={!Boolean(exchangeRateFeedsEnabled) ? 5 : 3} className="px-6 py-12 text-center text-gray-500">
                  No currencies found. Click "New Currency" to create one.
                </td>
              </tr>
            ) : (
              currencies.map((currency) => (
                <tr key={currency.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {currency.code} - {currency.name}
                      </span>
                      {currency.isBase ? (
                        <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded">
                          Base Currency
                        </span>
                      ) : (
                        <button
                          onClick={() => handleMarkAsBase(currency.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs font-medium text-blue-600 hover:underline"
                        >
                          change base currency
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{currency.symbol}</span>
                  </td>
                  {!Boolean(exchangeRateFeedsEnabled) && (
                    <>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {currency.latestRate !== null && currency.latestRate !== undefined
                            ? currency.latestRate
                            : ""}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {currency.asOfDate
                            ? new Date(currency.asOfDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                            : ""}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="flex items-center gap-1 border border-gray-100 bg-white shadow-sm rounded-lg p-1">
                        <button
                          onClick={() => handleEditCurrency(currency)}
                          className="px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded"
                        >
                          Edit
                        </button>
                        {!currency.isBase && (
                          <>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleMarkAsBase(currency.id)}
                              className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                            >
                              Mark as Base
                            </button>
                          </>
                        )}
                        <span className="text-gray-300">|</span>
                        {!Boolean(exchangeRateFeedsEnabled) && (
                          <>
                            <button
                              onClick={() => navigate(`/settings/currencies/${currency.id}/exchange-rates`)}
                              className="px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded"
                            >
                              view exchange rates
                            </button>
                            <span className="text-gray-300">|</span>
                          </>
                        )}
                        {!currency.isBase && (
                          <button
                            onClick={() => handleDeleteCurrency(currency.id)}
                            className="p-1 hover:bg-red-50 text-red-400 hover:text-red-500 rounded transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Currency Modal */}
      {showNewCurrencyModal && (
        <NewCurrencyModal
          onClose={() => setShowNewCurrencyModal(false)}
          onSave={handleSaveNewCurrency}
        />
      )}

      {/* Edit Currency Modal */}
      {
        showEditCurrencyModal && (
          <EditCurrencyModal
            currency={editingCurrency}
            onClose={() => {
              setShowEditCurrencyModal(false);
              setEditingCurrency(null);
            }}
            onSave={handleSaveEditCurrency}
            onAddExchangeRate={() => {
              if (editingCurrency) {
                navigate(`/settings/currencies/${editingCurrency.id}/exchange-rates`);
              }
            }}
          />
        )
      }

    </div >
  );
}




