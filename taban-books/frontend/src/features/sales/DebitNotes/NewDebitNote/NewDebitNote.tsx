import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  X,
  Search,
  ChevronDown,
  Plus,
  Settings,
  Trash2,
  Pencil,
  ScanLine,
  CheckSquare,
  Info,
  Upload,
  CreditCard,
  MoreVertical,
  Copy,
  Image as ImageIcon
} from "lucide-react";
import { getCustomers, getSalespersons, saveSalesperson, Customer } from "../../salesModel";
import { debitNotesAPI, itemsAPI } from "../../../../services/api";
import DatePicker from "../../../../components/DatePicker";

const sampleItems = [
  { id: "1", name: "iphone", sku: "Ip011", rate: 20.00, stockOnHand: 0.00, unit: "box" },
  { id: "2", name: "laptop", sku: "Lp022", rate: 1500.00, stockOnHand: 5.00, unit: "piece" },
  { id: "3", name: "keyboard", sku: "Kb033", rate: 45.00, stockOnHand: 12.00, unit: "piece" },
  { id: "4", name: "mouse", sku: "Ms044", rate: 25.00, stockOnHand: 8.00, unit: "piece" },
  { id: "5", name: "monitor", sku: "Mn055", rate: 300.00, stockOnHand: 3.00, unit: "piece" },
];

const paymentTerms = ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60"];

export default function NewDebitNote() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // Generate debit note number in format CDN000001
  const generateDebitNoteNumber = () => {
    const num = Math.floor(Math.random() * 999999) + 1;
    return `CDN${String(num).padStart(6, '0')}`;
  };

  const formatDateForPicker = (date: Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [formData, setFormData] = useState({
    customerName: "",
    debitNoteNumber: generateDebitNoteNumber(),
    orderNumber: "",
    debitNoteDate: formatDateForPicker(new Date()),
    terms: "Due on Receipt",
    dueDate: formatDateForPicker(new Date()),
    salesperson: "",
    description: "",
    items: [{ id: Date.now(), description: "", rate: 0, amount: 0 }],
    subTotal: 0,
    total: 0,
    currency: "USD",
    customerNotes: "Thank you for the payment. You just made our day.",
    termsAndConditions: "",
    attachedFiles: [] as any[]
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
  const [salespersonSearch, setSalespersonSearch] = useState("");
  const [isTermsDropdownOpen, setIsTermsDropdownOpen] = useState(false);
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [openItemDropdowns, setOpenItemDropdowns] = useState<Record<string | number, boolean>>({});
  const [itemSearches, setItemSearches] = useState<Record<string | number, string>>({});
  const [availableItems, setAvailableItems] = useState<any[]>(sampleItems);
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string | number, string>>({});
  const [openItemMenuId, setOpenItemMenuId] = useState<number | null>(null);
  const itemMenuRefs = useRef<Record<string, { current: HTMLElement | null }>>({});
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [bulkAddSearch, setBulkAddSearch] = useState("");
  const [bulkSelectedItems, setBulkSelectedItems] = useState<any[]>([]);
  const [isBulkUpdateMode, setIsBulkUpdateMode] = useState(false);
  const [bulkSelectedItemIds, setBulkSelectedItemIds] = useState<any[]>([]);

  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const salespersonDropdownRef = useRef<HTMLDivElement>(null);
  const termsDropdownRef = useRef<HTMLDivElement>(null);
  const uploadDropdownRef = useRef<HTMLDivElement>(null);
  const itemDropdownRefs = useRef<Record<string, { current: HTMLElement | null }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedCustomers, loadedSalespersons, allItemsResponse] = await Promise.all([
          getCustomers(),
          getSalespersons(),
          itemsAPI.getAll()
        ]);

        setCustomers(loadedCustomers);
        setSalespersons(loadedSalespersons);

        if (allItemsResponse && allItemsResponse.success && allItemsResponse.data) {
          const transformedItems = allItemsResponse.data.map((item: any) => ({
            id: item._id || item.id,
            name: item.name,
            sku: item.sku || "",
            rate: item.sellingPrice || item.costPrice || 0,
            stockOnHand: item.stockOnHand || 0,
            unit: item.unit || "pcs"
          }));
          setAvailableItems(transformedItems);
        }
      } catch (error) {
        console.error("Error loading data for Debit Note:", error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const total = formData.items.reduce((sum, item) => sum + (parseFloat(item.amount as any) || 0), 0);
    setFormData(prev => ({ ...prev, subTotal: total, total }));
  }, [formData.items]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(target)) setIsCustomerDropdownOpen(false);
      if (salespersonDropdownRef.current && !salespersonDropdownRef.current.contains(target)) setIsSalespersonDropdownOpen(false);
      if (termsDropdownRef.current && !termsDropdownRef.current.contains(target)) setIsTermsDropdownOpen(false);
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(target)) setIsUploadDropdownOpen(false);
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(target)) setIsBulkActionsOpen(false);
      Object.keys(itemDropdownRefs.current).forEach(key => {
        if (itemDropdownRefs.current[key]?.current && !itemDropdownRefs.current[key].current?.contains(target)) {
          setOpenItemDropdowns(prev => ({ ...prev, [key]: false }));
        }
      });
      Object.keys(itemMenuRefs.current).forEach(key => {
        if (itemMenuRefs.current[key]?.current && !itemMenuRefs.current[key].current?.contains(target)) {
          setOpenItemMenuId(null);
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customerName: customer.name }));
    setIsCustomerDropdownOpen(false);
  };

  const handleSalespersonSelect = (sp: any) => {
    setFormData(prev => ({ ...prev, salesperson: sp.name }));
    setIsSalespersonDropdownOpen(false);
  };

  const handleItemChange = (itemId: any, field: any, value: any) => {
    setFormData(prev => {
      const newItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'rate') {
            updatedItem.amount = parseFloat(updatedItem.rate as any) || 0;
          }
          return updatedItem;
        }
        return item;
      });
      return { ...prev, items: newItems };
    });
  };

  const getFilteredItems = (itemId: any) => {
    const search = itemSearches[itemId] || "";
    return availableItems.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    );
  };

  const getBulkFilteredItems = () => {
    if (!bulkAddSearch.trim()) {
      return availableItems;
    }
    return availableItems.filter(item =>
      item.name.toLowerCase().includes(bulkAddSearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(bulkAddSearch.toLowerCase())
    );
  };

  const handleItemSelect = (itemId: any, selectedItem: any) => {
    setSelectedItemIds(prev => ({ ...prev, [itemId]: selectedItem.id }));
    handleItemChange(itemId, 'description', selectedItem.name);
    handleItemChange(itemId, 'rate', selectedItem.rate);
    setOpenItemDropdowns(prev => ({ ...prev, [itemId]: false }));
    setItemSearches(prev => ({ ...prev, [itemId]: "" }));
  };

  const handleBulkItemToggle = (item: any) => {
    setBulkSelectedItems(prev => {
      const exists = prev.find(selected => selected.id === item.id);
      if (exists) {
        return prev.filter(selected => selected.id !== item.id);
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const handleBulkItemQuantityChange = (itemId: any, quantity: any) => {
    setBulkSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity: Math.max(1, parseFloat(quantity as any) || 1) } : item
      )
    );
  };

  const handleAddBulkItems = () => {
    if (bulkSelectedItems.length === 0) return;

    setFormData(prev => {
      const newItems = bulkSelectedItems.map((selectedItem, index) => ({
        id: Date.now() + index,
        description: selectedItem.name,
        rate: selectedItem.rate,
        amount: selectedItem.rate
      }));

      const updatedItems = [...prev.items, ...newItems];
      const total = updatedItems.reduce((sum, item) => sum + (parseFloat(item.amount as any) || 0), 0);

      return {
        ...prev,
        items: updatedItems,
        subTotal: total,
        total
      };
    });

    setIsBulkAddModalOpen(false);
    setBulkSelectedItems([]);
    setBulkAddSearch("");
  };

  const handleCancelBulkAdd = () => {
    setIsBulkAddModalOpen(false);
    setBulkSelectedItems([]);
    setBulkAddSearch("");
  };

  const handleSelectAllItems = () => {
    setBulkSelectedItemIds(formData.items.map(item => item.id as any));
  };

  const handleDeselectAllItems = () => {
    setBulkSelectedItemIds([]);
  };

  const handleToggleItemSelection = (itemId: any) => {
    setBulkSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleDeleteSelectedItems = () => {
    if (bulkSelectedItemIds.length === 0) return;

    if (window.confirm(`Are you sure you want to delete ${bulkSelectedItemIds.length} item(s)?`)) {
      setFormData(prev => {
        const updatedItems = prev.items.filter(item => !bulkSelectedItemIds.includes(item.id));
        const total = updatedItems.reduce((sum, item) => sum + (parseFloat(item.amount as any) || 0), 0);
        return {
          ...prev,
          items: updatedItems,
          subTotal: total,
          total
        };
      });
      setBulkSelectedItemIds([]);
    }
  };

  const handleDuplicateItem = (itemId: any) => {
    const item = formData.items.find(i => i.id === itemId);
    if (item) {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { ...item, id: Date.now() }]
      }));
    }
  };

  const handleAddNewRow = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, { id: Date.now(), description: "", rate: 0, amount: 0 }] }));
  };

  const handleRemoveItem = (itemId: any) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({ ...prev, items: prev.items.filter(i => i.id !== itemId) }));
    }
  };

  const handleFileUpload = (e: any) => {
    const files = Array.from(e.target.files);
    const MAX_FILES = 10;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    const validFiles = files.filter((file: any) => {
      if (file.size > MAX_SIZE) {
        alert(`File ${file.name} exceeds 10MB limit.`);
        return false;
      }
      return true;
    });

    setFormData(prev => ({
      ...prev,
      attachedFiles: [...prev.attachedFiles, ...validFiles].slice(0, MAX_FILES)
    }));
    setIsUploadDropdownOpen(false);
  };

  const handleRemoveFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachedFiles: prev.attachedFiles.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (status = "open") => {
    try {
      if (!formData.customerName) {
        alert("Please select a customer");
        return;
      }

      const payload = {
        ...formData,
        customer: selectedCustomer?.id || formData.customerName, // Backend expects customer ID or object
        status: status,
        items: formData.items.map(item => ({
          ...item,
          item: selectedItemIds[item.id] || item.id // Ensure we send current item ID
        }))
      };

      if (isEditMode) {
        await debitNotesAPI.update(id, payload);
      } else {
        await debitNotesAPI.create(payload);
      }

      alert(`Debit Note ${isEditMode ? 'updated' : 'created'} successfully!`);
      navigate("/sales/invoices");
    } catch (error: any) {
      console.error("Error saving debit note:", error);
      alert("Error saving debit note: " + (error.message || "Unknown error"));
    }
  };

  const handleCancel = () => navigate("/sales/invoices");

  const getFilteredCustomers = () => customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()));
  const filteredSalespersons = salespersons.filter(s => s.name.toLowerCase().includes(salespersonSearch.toLowerCase()));

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">New Debit Note</h1>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings size={20} />
            </button>
            <button onClick={handleCancel} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Debit Note Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name<span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={customerDropdownRef}>
                    <input
                      type="text"
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Select or add a customer"
                      value={formData.customerName}
                      readOnly
                      onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                    />
                    <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    {isCustomerDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-gray-100">
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none"
                            placeholder="Search..."
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {getFilteredCustomers().map(c => (
                          <div
                            key={c.id}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                            onClick={() => handleCustomerSelect(c)}
                          >
                            {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Debit Note Number<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-md text-sm bg-gray-50"
                      value={formData.debitNoteNumber}
                      readOnly
                    />
                    <Info size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order Number</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                    placeholder="Enter order number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Debit Note Date<span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={formData.debitNoteDate}
                    onChange={(date) => setFormData(prev => ({ ...prev, debitNoteDate: date }))}
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                <div className="relative" ref={termsDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Terms</label>
                  <button
                    className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={() => setIsTermsDropdownOpen(!isTermsDropdownOpen)}
                  >
                    <span>{formData.terms}</span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                  {isTermsDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      {paymentTerms.map(term => (
                        <div
                          key={term}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, terms: term }));
                            setIsTermsDropdownOpen(false);
                          }}
                        >
                          {term}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <DatePicker
                    value={formData.dueDate}
                    onChange={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                <div className="relative" ref={salespersonDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salesperson</label>
                  <button
                    className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                  >
                    <span className={formData.salesperson ? "text-gray-900" : "text-gray-500"}>
                      {formData.salesperson || "Select or Add Salesperson"}
                    </span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                  {isSalespersonDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-gray-100">
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none"
                          placeholder="Search..."
                          value={salespersonSearch}
                          onChange={(e) => setSalespersonSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      {filteredSalespersons.map(sp => (
                        <div
                          key={sp.id}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                          onClick={() => handleSalespersonSelect(sp)}
                        >
                          {sp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <div className="relative">
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[100px]"
                  placeholder="Let your customer know what this Debit Note is for"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
                <Pencil size={16} className="absolute bottom-3 right-3 text-gray-400" />
              </div>
            </div>

            {/* Item Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Table</h2>
                <div className="flex items-center gap-3 mb-4">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <ScanLine size={16} />
                    Scan Item
                  </button>
                  <div className="relative" ref={bulkActionsRef}>
                    <button
                      onClick={() => setIsBulkActionsOpen(!isBulkActionsOpen)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <CheckSquare size={16} />
                      Bulk Actions
                      <ChevronDown size={14} />
                    </button>
                    {isBulkActionsOpen && (
                      <div className="absolute top-full right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 min-w-[240px] overflow-hidden">
                        <div
                          className={`px-4 py-3 text-sm cursor-pointer transition-all ${isBulkUpdateMode
                            ? "text-white"
                            : "text-gray-700 hover:bg-gray-50"
                            }`}
                          style={isBulkUpdateMode ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : {}}
                          onClick={() => {
                            setIsBulkUpdateMode(true);
                            setIsBulkActionsOpen(false);
                          }}
                        >
                          Bulk Update Line Items
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bulk Update Banner */}
              {isBulkUpdateMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                      onClick={handleDeleteSelectedItems}
                    >
                      Delete Selected ({bulkSelectedItemIds.length})
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setIsBulkUpdateMode(false);
                      setBulkSelectedItemIds([]);
                    }}
                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {isBulkUpdateMode && (
                        <th className="w-12 py-3 px-3">
                          <input
                            type="checkbox"
                            checked={bulkSelectedItemIds.length === formData.items.length && formData.items.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleSelectAllItems();
                              } else {
                                handleDeselectAllItems();
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 uppercase">DESCRIPTION</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 uppercase">
                        RATE
                        <Info size={14} className="inline-block ml-1 text-gray-400" />
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 uppercase">AMOUNT</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map(item => (
                      <tr key={item.id} className="border-b border-gray-100">
                        {isBulkUpdateMode && (
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              checked={bulkSelectedItemIds.includes(item.id)}
                              onChange={() => handleToggleItemSelection(item.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div
                            className="relative"
                            ref={el => {
                              if (!itemDropdownRefs.current[item.id]) {
                                itemDropdownRefs.current[item.id] = { current: null };
                              }
                              itemDropdownRefs.current[item.id].current = el;
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                                <ImageIcon size={14} className="text-gray-400" />
                              </div>
                              <input
                                type="text"
                                placeholder="Type or click to select an item"
                                value={item.description}
                                readOnly
                                onClick={() => setOpenItemDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none cursor-pointer"
                              />
                            </div>

                            {openItemDropdowns[item.id] && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                                <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                                  <input
                                    type="text"
                                    placeholder="Search items..."
                                    value={itemSearches[item.id] || ""}
                                    onChange={(e) => setItemSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none"
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                  />
                                </div>
                                {getFilteredItems(item.id).length > 0 ? (
                                  getFilteredItems(item.id).map(productItem => (
                                    <div
                                      key={productItem.id}
                                      className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 ${selectedItemIds[item.id] === productItem.id ? "bg-blue-50" : ""
                                        }`}
                                      onClick={() => handleItemSelect(item.id, productItem)}
                                    >
                                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                                        {productItem.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">{productItem.name}</div>
                                        <div className="text-xs text-gray-500 truncate">
                                          SKU: {productItem.sku} • Rate: {formData.currency} {productItem.rate.toFixed(2)}
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <div className="text-xs text-gray-500">Stock on Hand</div>
                                        <div className="text-xs font-medium text-gray-700">
                                          {productItem.stockOnHand.toFixed(2)} {productItem.unit}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-sm text-gray-500">
                                    {itemSearches[item.id] ? "No items found" : "No items available"}
                                  </div>
                                )}
                                <button
                                  className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm font-medium text-blue-600 cursor-pointer hover:bg-gray-100 w-full transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenItemDropdowns(prev => ({ ...prev, [item.id]: false }));
                                    // Navigate to items page
                                    navigate("/items", { state: { showNewItem: true, returnTo: window.location.pathname } });
                                  }}
                                >
                                  <Plus size={16} />
                                  Add New Item
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={item.rate}
                            onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                          />
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                          {item.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <div
                              className="relative"
                              ref={el => {
                                if (!itemMenuRefs.current[item.id]) {
                                  itemMenuRefs.current[item.id] = { current: null };
                                }
                                itemMenuRefs.current[item.id].current = el;
                              }}
                            >
                              <button
                                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenItemMenuId(openItemMenuId === item.id ? null : item.id);
                                }}
                              >
                                <MoreVertical size={16} />
                              </button>
                              {openItemMenuId === item.id && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px] overflow-hidden">
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicateItem(item.id);
                                      setOpenItemMenuId(null);
                                    }}
                                  >
                                    <Copy size={14} className="text-gray-500" />
                                    Clone
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentIndex = formData.items.findIndex(i => i.id === item.id);
                                      const newItem = { id: Date.now(), description: "", rate: 0, amount: 0 };
                                      setFormData(prev => {
                                        const newItems = [...prev.items];
                                        newItems.splice(currentIndex + 1, 0, newItem);
                                        return { ...prev, items: newItems };
                                      });
                                      setOpenItemMenuId(null);
                                    }}
                                  >
                                    <Plus size={14} className="text-gray-500" />
                                    Insert New Row
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsBulkAddModalOpen(true);
                                      setOpenItemMenuId(null);
                                    }}
                                  >
                                    <Plus size={14} className="text-gray-500" />
                                    Insert Items in Bulk
                                  </button>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleAddNewRow}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Plus size={16} />
                  Add New Row
                  <ChevronDown size={14} />
                </button>
                <button
                  onClick={() => setIsBulkAddModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Plus size={16} />
                  Add Items in Bulk
                </button>
              </div>
            </div>

            {/* Customer Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Notes</label>
              <div className="relative">
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[100px]"
                  value={formData.customerNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerNotes: e.target.value }))}
                />
                <Pencil size={16} className="absolute bottom-3 right-3 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Will be displayed on the invoice</p>
            </div>

            {/* Terms & Conditions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
              <div className="relative">
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[100px]"
                  placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                  value={formData.termsAndConditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                />
                <Pencil size={16} className="absolute bottom-3 right-3 text-gray-400" />
              </div>
            </div>

            {/* Additional Fields */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">
                Additional Fields: Start adding custom fields for your invoices by going to Settings ➡ Sales ➡ Invoices.
              </p>
            </div>
          </div>

          {/* Right Column - Summary & Attachments */}
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sub Total</span>
                  <span className="font-medium text-gray-900">{formData.subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base pt-3 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total (KES)</span>
                  <span className="font-bold text-gray-900">{formData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* File Attachments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Attach File(s) to Debit Note</label>
              <div className="relative" ref={uploadDropdownRef}>
                <button
                  onClick={() => setIsUploadDropdownOpen(!isUploadDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <Upload size={16} />
                    Upload File
                  </span>
                  <ChevronDown size={14} />
                </button>
                {isUploadDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <div
                      className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload from Computer
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">You can upload a maximum of 10 Files, 10MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              {formData.attachedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {formData.attachedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Gateway */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-3">
                <CreditCard size={20} className="text-blue-600 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Want to get paid faster?</p>
                  <p className="text-sm text-gray-600">
                    Configure payment gateways and receive payments online.{" "}
                    <a href="#" className="text-blue-600 hover:underline">Set up Payment Gateway</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave("draft")}
              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSave("sent")}
              className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Save and Send
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="text-sm font-semibold text-gray-900">
            Total Amount: KES {formData.total.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Bulk Add Items Modal */}
      {isBulkAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Items in Bulk</h2>
              <button
                onClick={handleCancelBulkAdd}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex">
              <div className="w-1/2 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Type to search or scan the barcode of the item"
                    value={bulkAddSearch}
                    onChange={(e) => setBulkAddSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {getBulkFilteredItems().length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      {availableItems.length === 0 ? "No items available. Create items first." : "No results found. Try a different keyword."}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getBulkFilteredItems().map((item) => {
                        const isSelected = bulkSelectedItems.some(selected => selected.id === item.id);
                        const selectedItem = bulkSelectedItems.find(selected => selected.id === item.id);
                        return (
                          <div
                            key={item.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                              }`}
                            onClick={() => handleBulkItemToggle(item)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{item.name}</div>
                                <div className="text-sm text-gray-500">SKU: {item.sku} • Rate: {formData.currency} {item.rate.toFixed(2)}</div>
                              </div>
                              {isSelected && (
                                <div className="ml-4">
                                  <input
                                    type="number"
                                    min="1"
                                    value={selectedItem.quantity || 1}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleBulkItemQuantityChange(item.id, e.target.value);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="w-1/2 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">Selected Items ({bulkSelectedItems.length})</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {bulkSelectedItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">No items selected</div>
                  ) : (
                    <div className="space-y-2">
                      {bulkSelectedItems.map((item) => (
                        <div key={item.id} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <button
                              onClick={() => handleBulkItemToggle(item)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm text-gray-600">Quantity:</span>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity || 1}
                              onChange={(e) => handleBulkItemQuantityChange(item.id, e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCancelBulkAdd}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBulkItems}
                disabled={bulkSelectedItems.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Items ({bulkSelectedItems.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

