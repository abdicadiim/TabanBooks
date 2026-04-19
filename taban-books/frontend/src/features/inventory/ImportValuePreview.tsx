import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, ChevronLeft, CheckCircle2, AlertTriangle, Download, ChevronDown, ChevronUp, Info } from "lucide-react";
import { inventoryAdjustmentsAPI, itemsAPI, accountsAPI } from "../../services/api";
import toast from "react-hot-toast";

const allFields = [
  { id: "account", label: "Account", required: true },
  { id: "branchName", label: "Branch Name" },
  { id: "costPrice", label: "Cost Price" },
  { id: "date", label: "Date", required: true },
  { id: "description", label: "Description" },
  { id: "itemDescription", label: "Item Description" },
  { id: "itemName", label: "Item Name", required: true },
  { id: "quantityOnHand", label: "Current Value" },
  { id: "newQuantityOnHand", label: "Changed Value" },
  { id: "quantityAdjusted", label: "Adjusted Value" },
  { id: "valueOnHand", label: "Value on Hand" },
  { id: "newValue", label: "New Value" },
  { id: "valueAdjusted", label: "Value Adjusted" },
  { id: "reason", label: "Reason", required: true },
  { id: "referenceNumber", label: "Reference Number", required: true },
  { id: "sku", label: "SKU" },
  { id: "status", label: "Status" },
  { id: "unit", label: "Unit" },
  { id: "warehouseName", label: "Warehouse Name" }
];

interface MappedRow extends Record<string, any> {
  _foundItem?: any;
  _foundAccount?: any;
  referenceNumber?: string;
  adjustmentNumber?: string;
  itemName?: string;
  sku?: string;
  account?: string;
  date?: string;
  reason?: string;
  description?: string;
  status?: string;
  costPrice?: string;
  quantityOnHand?: string;
  newQuantityOnHand?: string;
  quantityAdjusted?: string;
  valueOnHand?: string;
  newValue?: string;
  valueAdjusted?: string;
}

interface ParsedData {
  originalIndex: number;
  data: Record<string, string>;
}

const normalizeText = (value: any) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizeLooseText = (value: any) =>
  normalizeText(value).replace(/[^a-z0-9]/g, "");

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim().replace(/^\uFEFF/, ""));
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim().replace(/^\uFEFF/, ""));
  return values;
};

const parseDateForImport = (rawDate: any, fallbackIso = new Date().toISOString()) => {
  const value = String(rawDate || "").trim();
  if (!value) return fallbackIso;

  if (!Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }

  const parts = value.split(/[\/\-.]/).map((p) => p.trim());
  if (parts.length !== 3) return fallbackIso;

  let year = "";
  let month = "";
  let day = "";

  if (parts[0].length === 4) {
    [year, month, day] = parts;
  } else if (parts[2].length === 4) {
    // Default to dd/mm/yyyy when year is last, matching current app behavior.
    [day, month, year] = parts;
  } else {
    return fallbackIso;
  }

  const iso = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000Z`;
  if (Number.isNaN(Date.parse(iso))) return fallbackIso;
  return iso;
};

const toArrayData = (response: any) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const fetchAllItemsForImport = async () => {
  const pageSize = 100;
  let page = 1;
  let pages = 1;
  const all: any[] = [];

  while (page <= pages) {
    const response = await itemsAPI.getAll({ page: String(page), limit: String(pageSize) });
    const pageItems = toArrayData(response);
    all.push(...pageItems);

    const totalPages = Number(response?.pagination?.pages || 0);
    if (totalPages > 0) {
      pages = totalPages;
    } else {
      if (pageItems.length < pageSize) break;
      pages = page + 1;
    }
    page += 1;
  }

  const seen = new Set<string>();
  return all.filter((item) => {
    const key = String(item?._id || item?.id || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function ImportValuePreview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { file, characterEncoding, type, fieldMappings, dateFormat, saveSelections } = location.state || {};

  const [allRows, setAllRows] = useState<ParsedData[]>([]);
  const [readyRows, setReadyRows] = useState<MappedRow[]>([]);
  const [skippedRows, setSkippedRows] = useState<ParsedData[]>([]);
  const [unmappedFields, setUnmappedFields] = useState<string[]>([]);
  const [importedHeaders, setImportedHeaders] = useState<string[]>([]);
  const [showReadyDetails, setShowReadyDetails] = useState(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);

  const parseAndPreview = async (itemsList: any[] = [], accountsList: any[] = []) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line: string) => line.trim());

      if (lines.length < 2) {
        toast.error("File must have headers and at least one data row");
        return;
      }

      const headerLine = lines[0];
      const headers = parseCsvLine(headerLine).map((h: string) => h.replace(/^"|"$/g, ""));
      setImportedHeaders(headers);

      const mappedHeaderValues = Object.values(fieldMappings || {}) as string[];
      const unmapped = headers.filter((h: string) => !mappedHeaderValues.includes(h));
      setUnmappedFields(unmapped);

      const allParsedRows: ParsedData[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]).map((v: string) => v.replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((header: string, index: number) => {
          row[header] = values[index] || '';
        });
        allParsedRows.push({ originalIndex: i, data: row });
      }

      const ready: MappedRow[] = [];
      const skipped: ParsedData[] = [];

      allParsedRows.forEach(({ data: row }) => {
        const mapped: MappedRow = {};
        Object.keys(fieldMappings || {}).forEach(fieldId => {
          const sourceHeader = fieldMappings[fieldId];
          if (sourceHeader) {
            mapped[fieldId] = row[sourceHeader] || '';
          }
        });

        const itemName = mapped.itemName || "";
        const itemSku = mapped.sku || "";
        const searchName = normalizeText(itemName);
        const searchNameLoose = normalizeLooseText(itemName);
        const searchSku = normalizeLooseText(itemSku);

        const foundItem = itemsList.find((item: any) => {
          if (!item) return false;
          const dbName = normalizeText(item.name);
          const dbNameLoose = normalizeLooseText(item.name);
          const dbSku = normalizeLooseText(item.sku);
          return (
            (searchSku && dbSku === searchSku) ||
            (searchName && dbName === searchName) ||
            (searchNameLoose && dbNameLoose === searchNameLoose)
          );
        });

        const accountValue = (mapped.account || '').trim().toLowerCase();
        const foundAccount = accountsList.find((acc: any) => {
          if (!acc) return false;
          const accName = (acc.accountName || acc.name || '').toLowerCase().trim();
          const accCode = (acc.accountCode || '').toLowerCase().trim();

          // Match by name or code
          if (accName === accountValue || accCode === accountValue) return true;

          // Fallback: match "Cost of Goods Sold" even if slightly different in DB
          if (accountValue === 'cost of goods sold' && (accName.includes('cost of goods sold') || acc.accountType === 'cost_of_goods_sold')) return true;
          if (accountValue === 'inventory asset' && (accName.includes('inventory asset') || acc.accountType === 'stock')) return true;
          if (accountValue && (accName.includes(accountValue) || accountValue.includes(accName))) return true;

          return false;
        });

        mapped._foundItem = foundItem;
        mapped._foundAccount = foundAccount;
        ready.push(mapped);
      });

      setAllRows(allParsedRows);
      setReadyRows(ready);
      setSkippedRows(skipped);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Failed to parse file");
    }
  };

  useEffect(() => {
    if (!file || !fieldMappings) {
      toast.error("Missing file or field mappings. Please go back.");
      navigate("/inventory/import/value");
      return;
    }

    const fetchData = async () => {
      try {
        const [itemsArray, accounts] = await Promise.all([
          fetchAllItemsForImport(),
          accountsAPI.getAll({ limit: 1000 })
        ]);
        const accountsArray = toArrayData(accounts);
        setAllItems(itemsArray);
        setAllAccounts(accountsArray);
        parseAndPreview(itemsArray, accountsArray);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load required data. Import may fail.");
        parseAndPreview([], []);
      }
    };
    fetchData();
  }, [file, fieldMappings]);

  const handleDownloadSkippedRows = async () => {
    if (skippedRows.length === 0) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line: string) => line.trim());
      const headers = parseCsvLine(lines[0]).map((h: string) => h.replace(/^"|"$/g, ""));
      const skippedIndices = skippedRows.map((s: ParsedData) => s.originalIndex);
      const csvContent = [
        headers.map((h: string) => `"${h.replace(/"/g, '""')}"`).join(','),
        ...lines.slice(1).filter((_: string, index: number) => skippedIndices.includes(index + 1)).map((line: string) => {
          const values = parseCsvLine(line).map((v: string) => v.replace(/^"|"$/g, ""));
          return values.map((v: string) => `"${String(v).replace(/"/g, '""')}"`).join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `skipped_rows_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Skipped rows downloaded successfully");
    } catch (error) {
      console.error("Error downloading skipped rows:", error);
      toast.error("Failed to download skipped rows");
    }
  };

  const handleImport = async () => {
    if (readyRows.length === 0) {
      toast.error("No valid records to import");
      return;
    }
    setLoading(true);
    try {
      const itemsCache: any[] = [...allItems];
      const accountsCache: any[] = [...allAccounts];
      const findMatchingItem = (row: MappedRow) => {
        const searchName = normalizeText(row.itemName || "");
        const searchNameLoose = normalizeLooseText(row.itemName || "");
        const searchSku = normalizeLooseText(row.sku || "");
        return itemsCache.find((item: any) => {
          if (!item) return false;
          const dbName = normalizeText(item.name);
          const dbNameLoose = normalizeLooseText(item.name);
          const dbSku = normalizeLooseText(item.sku);
          return (
            (searchSku && dbSku === searchSku) ||
            (searchName && dbName === searchName) ||
            (searchNameLoose && dbNameLoose === searchNameLoose)
          );
        });
      };

      const ensureItemForRow = async (row: MappedRow) => {
        if (row._foundItem) return row._foundItem;

        const cached = findMatchingItem(row);
        if (cached) {
          row._foundItem = cached;
          return cached;
        }

        const itemName = String(row.itemName || "").trim();
        const sku = String(row.sku || "").trim();
        if (!itemName && !sku) return null;

        try {
          const created = await itemsAPI.create({
            name: itemName || sku,
            sku: sku || undefined,
            type: "Goods",
            trackInventory: true,
            openingStock: 0,
            costPrice: parseFloat(row.costPrice || "0") || 0
          });

          const createdItem = created?.data || created;
          if (createdItem) {
            itemsCache.push(createdItem);
            row._foundItem = createdItem;
            return createdItem;
          }
        } catch (createErr) {
          try {
            const lookup = await itemsAPI.getAll({ search: itemName || sku, page: "1", limit: "100" });
            const lookupItems = toArrayData(lookup);
            const found = lookupItems.find((item: any) => {
              const dbName = normalizeText(item.name);
              const dbNameLoose = normalizeLooseText(item.name);
              const dbSku = normalizeLooseText(item.sku);
              const searchName = normalizeText(itemName);
              const searchNameLoose = normalizeLooseText(itemName);
              const searchSku = normalizeLooseText(sku);
              return (
                (searchSku && dbSku === searchSku) ||
                (searchName && dbName === searchName) ||
                (searchNameLoose && dbNameLoose === searchNameLoose)
              );
            });
            if (found) {
              itemsCache.push(found);
              row._foundItem = found;
              return found;
            }
          } catch {
            // no-op fallback
          }
          console.error("Failed to auto-create missing item during import:", createErr);
        }

        return null;
      };

      const normalizeAccount = (value: any) => String(value || "").trim().toLowerCase();
      const resolveAccount = (accountValue: any) => {
        const target = normalizeAccount(accountValue);
        if (!target) return null;
        return accountsCache.find((acc: any) => {
          const name = normalizeAccount(acc?.accountName || acc?.name);
          const code = normalizeAccount(acc?.accountCode);
          const type = normalizeAccount(acc?.accountType);
          return (
            name === target ||
            code === target ||
            (name && target && name.includes(target)) ||
            (name && target && target.includes(name)) ||
            (target.includes("cost of goods sold") && (name.includes("cost of goods sold") || type === "cost_of_goods_sold")) ||
            (target.includes("inventory") && (name.includes("inventory") || type === "stock"))
          );
        });
      };

      const defaultAccount = accountsCache.find((acc: any) => {
        const name = normalizeAccount(acc?.accountName || acc?.name);
        const type = normalizeAccount(acc?.accountType);
        return (
          type === "cost_of_goods_sold" ||
          name.includes("cost of goods sold") ||
          name.includes("inventory adjustment")
        );
      });

      const toNum = (v: any) => {
        const cleaned = String(v ?? "")
          .replace(/,/g, "")
          .replace(/[^\d.-]/g, "");
        if (!cleaned || cleaned === "-" || cleaned === ".") return 0;
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : 0;
      };

      const existingAdjustmentsResp = await inventoryAdjustmentsAPI.getAll();
      const existingRefs = new Set(
        toArrayData(existingAdjustmentsResp)
          .map((a: any) => String(a?.adjustmentNumber || a?.referenceNumber || "").trim())
          .filter(Boolean)
      );
      const ensureUniqueRef = (baseRef: string) => {
        const cleanBase = String(baseRef || "").trim() || `ADJ-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`;
        let candidate = cleanBase;
        let suffix = 1;
        while (existingRefs.has(candidate)) {
          candidate = `${cleanBase}-${suffix}`;
          suffix += 1;
        }
        existingRefs.add(candidate);
        return candidate;
      };

      let successCount = 0;
      let errorCount = 0;
      const groups = readyRows.reduce((acc: Record<string, MappedRow[]>, row: MappedRow) => {
        const ref = String(row.referenceNumber || row.adjustmentNumber || "").trim()
          || `ADJ-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`;
        if (!acc[ref]) acc[ref] = [];
        acc[ref].push(row);
        return acc;
      }, {});

      for (const [ref, rows] of Object.entries(groups)) {
        try {
          const firstRow = rows[0];
          const formattedDate = parseDateForImport(firstRow.date);
          const uniqueRef = ensureUniqueRef(ref);

          const foundAccount = firstRow._foundAccount || resolveAccount(firstRow.account) || defaultAccount;
          const resolvedAccount = foundAccount?._id || foundAccount?.id || firstRow.account || "Cost of Goods Sold";

          const adjustmentItems = [];
          for (const row of rows) {
            const foundItem = await ensureItemForRow(row);
            if (!foundItem) {
              toast.error(`Adjustment ${ref}: Item not found: "${row.itemName || row.sku || 'Unknown'}". Skipping item.`);
              continue;
            }

            const currentValueFromFile = toNum(row.quantityOnHand ?? row.valueOnHand);
            const changedValueFromFile = toNum(row.newQuantityOnHand ?? row.newValue);
            const adjustedValueFromFile = toNum(row.quantityAdjusted ?? row.valueAdjusted);

            const itemStockQty = toNum(foundItem.stockQuantity ?? foundItem.stockOnHand);
            const costPrice = toNum(row.costPrice ?? foundItem.costPrice);
            const fallbackCurrentValue = itemStockQty * costPrice;

            const quantityOnHand = currentValueFromFile || fallbackCurrentValue || 0;
            const hasChangedValue = (row.newQuantityOnHand ?? row.newValue) !== undefined && String(row.newQuantityOnHand ?? row.newValue).trim() !== "";
            const hasAdjustedValue = (row.quantityAdjusted ?? row.valueAdjusted) !== undefined && String(row.quantityAdjusted ?? row.valueAdjusted).trim() !== "";

            const newQuantity = hasChangedValue
              ? changedValueFromFile
              : (quantityOnHand + (hasAdjustedValue ? adjustedValueFromFile : 0));

            const quantityAdjusted = hasAdjustedValue
              ? adjustedValueFromFile
              : (newQuantity - quantityOnHand);

            adjustmentItems.push({
              item: foundItem._id || foundItem.id,
              itemName: row.itemName,
              itemSku: row.sku || '',
              quantityOnHand,
              quantityAdjusted,
              newQuantity,
              reason: row.reason || firstRow.reason,
              cost: costPrice
            });
          }

          if (adjustmentItems.length === 0) {
            errorCount += rows.length;
            continue;
          }

          const payload = {
            date: formattedDate,
            reason: firstRow.reason,
            notes: firstRow.description || '',
            description: firstRow.description || '',
            status: String(firstRow.status || 'DRAFT').toUpperCase(),
            adjustmentNumber: uniqueRef,
            reference: uniqueRef,
            referenceNumber: uniqueRef,
            type: 'Value',
            account: resolvedAccount,
            items: adjustmentItems,
            createdBy: "System"
          };

          await inventoryAdjustmentsAPI.create(payload);
          successCount += rows.length;
        } catch (err: any) {
          console.error(`Error creating adjustment group ${ref}:`, err);
          const errorMessage = err.message || err.response?.data?.message || 'Unknown error';
          toast.error(`Failed to import adjustment ${ref}: ${errorMessage}`);
          errorCount += rows.length;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} adjustment(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        sessionStorage.setItem('inventoryImportCompleted', 'true');
        navigate("/inventory");
        setTimeout(() => window.dispatchEvent(new CustomEvent('inventoryAdjustmentsImported')), 1000);
      } else {
        toast.error(`Failed to import adjustments. ${errorCount > 0 ? `${errorCount} row(s) failed.` : 'No valid rows to import.'}`);
      }
    } catch (error) {
      console.error("Error importing:", error);
      toast.error("Failed to import adjustments");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleHeaders = ["Date", "Status", "Reference Number", "Reason", "Description", "Cost Price", "Item Name", "SKU", "Item Description", "Unit", "Account", "Branch Name", "Warehouse Name"];
    const sampleRows = [
      ["2026-01-08", "draft", "VAL-001", "Initial stock value", "Initial audit", "10", "Bus-Powered USB 3", "USB03", "High quality USB", "No", "Cost of Goods Sold", "Head Office", "Zillium"],
      ["2026-01-08", "adjusted", "VAL-002", "Revaluation", "Price update", "12", "USB Cable-Black", "USB01", "USB Type C", "No", "Cost of Goods Sold", "Head Office", "Zylker"]
    ];
    const csvContent = [
      sampleHeaders.map((h: string) => `"${h.replace(/"/g, '""')}"`).join(","),
      ...sampleRows.map((row: string[]) => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const BOM = '\uFEFF';
    const excelContent = BOM + csvContent;
    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "value_adjustment_sample.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Sample file downloaded successfully");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Preview</h1>
          <button onClick={() => navigate("/inventory")} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={24} className="text-gray-500" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#156372] text-white flex items-center justify-center font-semibold">✓</div>
            <span className="text-gray-600">Configure</span>
          </div>
          <div className="w-16 h-0.5 bg-[#156372]"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#156372] text-white flex items-center justify-center font-semibold">✓</div>
            <span className="text-gray-600">Map Fields</span>
          </div>
          <div className="w-16 h-0.5 bg-[#156372]"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#156372] text-white flex items-center justify-center font-semibold">3</div>
            <span className="font-semibold text-[#156372]">Preview</span>
          </div>
        </div>
        <div className="mb-6 p-4 bg-[#156372]/5 border border-[#156372]/20 rounded-lg">
          <p className="text-sm text-[#156372]">
            Need a sample file? Download a{" "}
            <button onClick={handleDownloadSample} className="text-[#156372] hover:underline font-semibold cursor-pointer">sample file</button>{" "}
            to see the correct format.
          </p>
        </div>
        <div className="mb-6 space-y-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-600" />
                <span className="text-sm font-medium text-gray-700">Ready to be imported - {readyRows.length}</span>
              </div>
              <button onClick={() => setShowReadyDetails(!showReadyDetails)} className="text-sm text-[#156372] font-medium">
                {showReadyDetails ? "Hide Details" : "View Details"}
              </button>
            </div>
            {showReadyDetails && readyRows.length > 0 && (
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(fieldMappings || {}).filter(k => fieldMappings[k]).map(key => (
                        <th key={key} className="px-4 py-2 text-left font-semibold text-gray-700">{allFields.find(f => f.id === key)?.label || key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {readyRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                        {Object.keys(fieldMappings || {}).filter(k => fieldMappings[k]).map(key => (
                          <td key={key} className="px-4 py-2 text-gray-900">{row[key] || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {skippedRows.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Skipped records - {skippedRows.length}</span>
                </div>
                <button onClick={handleDownloadSkippedRows} className="text-sm text-[#156372] font-medium flex items-center gap-1">
                  <Download size={16} /> Download
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-between mt-8">
          <button onClick={() => navigate(-1)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 flex items-center gap-2">
            <ChevronLeft size={16} /> Previous
          </button>
          <div className="flex gap-3">
            <button onClick={() => navigate("/inventory")} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300">Cancel</button>
            <button
              onClick={handleImport}
              disabled={loading || readyRows.length === 0}
              className="px-6 py-2 bg-[#156372] text-white rounded-md font-medium hover:bg-[#11525e] disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Importing..." : `Import ${readyRows.length} Record(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
