import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Calendar,
  HelpCircle,
  Info,
  LayoutGrid,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  UploadCloud,
  X,
  PlusCircle,
  Mail,
  Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConfigurePaymentTermsModal } from "../../../../components/ConfigurePaymentTermsModal";
import { defaultPaymentTerms, PaymentTerm } from "../../../../hooks/usePaymentTermsDropdown";
import { customersAPI, itemsAPI, locationsAPI, salespersonsAPI } from "../../../../services/api";
import { salesOrdersAPI } from "../salesOrderApi";

const LABEL_CLASS = "w-36 shrink-0 text-sm font-medium text-gray-700";
const REQUIRED_LABEL_CLASS = `${LABEL_CLASS} text-red-500`;
const INPUT_CLASS =
  "w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-700 outline-none transition focus:border-[#156372] focus:ring-1 focus:ring-[#156372]";
const SELECT_CLASS =
  "w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-700 outline-none transition focus:border-[#156372] focus:ring-1 focus:ring-[#156372]";
const SECTION_LINE = "my-7 h-px bg-slate-200/80";

function Row({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <label className={required ? REQUIRED_LABEL_CLASS : LABEL_CLASS}>
        {label}
        {required ? "*" : null}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function LabeledValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-[12px] text-gray-700">
      <span className="min-w-24 text-slate-500">{label}</span>
      <span className="border-b border-dashed border-slate-300 pb-0.5">{value}</span>
    </div>
  );
}

interface NewSalesOrderProps {
  onCancel?: () => void;
  onSaved?: (salesOrder: any) => void;
}

type LocationOption = {
  id: string;
  label: string;
  isDefault?: boolean;
};

type ItemOption = {
  id: string;
  sourceId: string;
  name: string;
  sku: string;
  rate: number;
  stockOnHand: number;
  unit: string;
};

const NewSalesOrder: React.FC<NewSalesOrderProps> = ({ onCancel, onSaved }) => {
  const navigate = useNavigate();
  const customerDropdownRef = useRef<HTMLDivElement | null>(null);
  const locationDropdownRef = useRef<HTMLDivElement | null>(null);
  const salespersonDropdownRef = useRef<HTMLDivElement | null>(null);
  const paymentTermsDropdownRef = useRef<HTMLDivElement | null>(null);
  const itemDropdownRef = useRef<HTMLTableCellElement | null>(null);
  const [salesOrderNumber] = useState("SO-00003");
  const [salesOrderDate] = useState("23/04/2026");
  const [expectedShipDate] = useState("dd/MM/yyyy");
  const [customerNotes, setCustomerNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([
    { id: "head-office", label: "Head Office", isDefault: true },
  ]);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>({
    id: "head-office",
    label: "Head Office",
    isDefault: true,
  });
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
  const [salespersonSearch, setSalespersonSearch] = useState("");
  const [salespersonOptions, setSalespersonOptions] = useState<any[]>([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState<any | null>(null);
  const [isPaymentTermsDropdownOpen, setIsPaymentTermsDropdownOpen] = useState(false);
  const [selectedPaymentTerms, setSelectedPaymentTerms] = useState("Due on Receipt");
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>(defaultPaymentTerms);
  const [isConfigureTermsOpen, setIsConfigureTermsOpen] = useState(false);
  const [isManageSalespersonsOpen, setIsManageSalespersonsOpen] = useState(false);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [customersResponse, salespersonsResponse, locationsResponse] = await Promise.allSettled([
          customersAPI.getAll({ limit: 500 }),
          salespersonsAPI.getAll(),
          locationsAPI.getAll(),
        ]);

        if (customersResponse.status === "fulfilled") {
          const customers = Array.isArray((customersResponse.value as any)?.data)
            ? (customersResponse.value as any).data
            : [];
          if (customers.length > 0) {
            setCustomerOptions(
              customers.map((customer: any) => ({
                id: String(customer.id || customer._id || ""),
                name: String(customer.name || customer.displayName || customer.companyName || "Unnamed Customer"),
                email: String(customer.email || ""),
                company: String(customer.companyName || customer.name || customer.displayName || ""),
              }))
            );
          }
        }

        if (salespersonsResponse.status === "fulfilled") {
          const salespersons = Array.isArray((salespersonsResponse.value as any)?.data)
            ? (salespersonsResponse.value as any).data
            : [];
          if (salespersons.length > 0) {
            setSalespersonOptions(
              salespersons.map((salesperson: any) => ({
                id: String(salesperson.id || salesperson._id || ""),
                name: String(salesperson.name || salesperson.displayName || "Unnamed Salesperson"),
                email: String(salesperson.email || ""),
              }))
            );
          }
        }

        if (locationsResponse.status === "fulfilled") {
          const rawLocations = Array.isArray((locationsResponse.value as any)?.data)
            ? (locationsResponse.value as any).data
            : Array.isArray((locationsResponse.value as any)?.locations)
              ? (locationsResponse.value as any).locations
              : Array.isArray(locationsResponse.value)
                ? locationsResponse.value
                : [];

          const mappedLocations = rawLocations
            .map((row: any) => {
              const label = String(
                row?.name ||
                  row?.locationName ||
                  row?.location_name ||
                  row?.branchName ||
                  row?.displayName ||
                  row?.title ||
                  ""
              ).trim();
              if (!label) return null;

              return {
                id: String(row?._id || row?.id || row?.location_id || row?.locationId || label),
                label,
                isDefault: Boolean(row?.isDefault),
              } as LocationOption;
            })
            .filter(Boolean) as LocationOption[];

          const sortedLocations = mappedLocations.sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.label.localeCompare(b.label);
          });

          if (sortedLocations.length > 0) {
            setLocationOptions(sortedLocations);
            const preferredLocation =
              sortedLocations.find((loc) => loc.isDefault) ||
              sortedLocations.find((loc) => loc.label.trim().toLowerCase() === "head office") ||
              sortedLocations[0];

            setSelectedLocation((current) => {
              const currentMatches = sortedLocations.some(
                (loc) => loc.label.trim().toLowerCase() === String(current?.label || "").trim().toLowerCase()
              );
              return currentMatches ? current : preferredLocation;
            });
          }
        }

        const itemsResponse = await itemsAPI.getAll();
        const rawItems = Array.isArray((itemsResponse as any)?.data)
          ? (itemsResponse as any).data
          : Array.isArray(itemsResponse)
            ? itemsResponse
            : [];

        const activeItems = rawItems
          .filter((item: any) => {
            if (item?.isActive === false || item?.active === false || item?.is_active === false) return false;
            return true;
          })
          .map((item: any, index: number) => ({
            id: String(item?._id || item?.id || item?.itemId || item?.item_id || item?.sku || `item-${index}`),
            sourceId: String(item?._id || item?.id || item?.itemId || item?.item_id || item?.sku || `item-${index}`),
            name: String(item?.name || item?.itemName || item?.displayName || item?.title || "Unnamed Item"),
            sku: String(item?.sku || item?.itemCode || item?.code || "").trim(),
            rate: Number(item?.sellingPrice || item?.salesPrice || item?.costPrice || item?.rate || item?.price || 0) || 0,
            stockOnHand: Number(item?.stockOnHand || item?.quantityOnHand || item?.stockQuantity || item?.openingStock || 0) || 0,
            unit: String(item?.unit || item?.uom || item?.salesUnit || "pcs").trim() || "pcs",
          }));

        setItemOptions(activeItems);
        if (!selectedItem && activeItems.length > 0) {
          setSelectedItem(activeItems[0]);
        }
      } catch (error) {
        console.error("Failed to load sales order dropdown data:", error);
      }
    };

    void loadDropdownData();

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        itemDropdownRef.current &&
        !itemDropdownRef.current.contains(event.target as Node)
      ) {
        setIsItemDropdownOpen(false);
      }
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLocationDropdownOpen(false);
      }
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
      if (
        salespersonDropdownRef.current &&
        !salespersonDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSalespersonDropdownOpen(false);
      }
      if (
        paymentTermsDropdownRef.current &&
        !paymentTermsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPaymentTermsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredCustomers = customerOptions.filter((customer) =>
    [customer.name, customer.email, customer.company]
      .join(" ")
      .toLowerCase()
      .includes(customerSearch.toLowerCase())
  );

  const customerLabel = selectedCustomer
    ? selectedCustomer.name
    : "Select or add a customer";

  const filteredLocations = locationOptions.filter((location) =>
    location.label.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const filteredItems = itemOptions.filter((item) =>
    [item.name, item.sku, String(item.rate)].join(" ").toLowerCase().includes(itemSearch.toLowerCase())
  );

  const filteredSalespersons = salespersonOptions.filter((salesperson) =>
    String(salesperson.name || "").toLowerCase().includes(salespersonSearch.toLowerCase())
  );

  const visiblePaymentTerms = paymentTerms.length > 0 ? paymentTerms : defaultPaymentTerms;

  const buildPayload = (status: "draft" | "sent") => ({
    salesOrderNumber,
    customerId: selectedCustomer?.id,
    customerName: selectedCustomer?.name,
    customerEmail: selectedCustomer?.email,
    date: salesOrderDate,
    expectedShipmentDate: expectedShipDate,
    referenceNumber: "",
    paymentTerms: selectedPaymentTerms,
    deliveryMethod,
    salespersonId: selectedSalesperson?.id,
    salespersonName: selectedSalesperson?.name,
    warehouseLocation: selectedLocation?.label || "Head Office",
    items: selectedItem
      ? [
          {
            itemId: selectedItem.sourceId,
            itemDetails: selectedItem.name,
            sku: selectedItem.sku,
            quantity: 1,
            rate: selectedItem.rate,
            amount: selectedItem.rate,
            stockOnHand: selectedItem.stockOnHand,
            unit: selectedItem.unit,
          },
        ]
      : [],
    subtotal: 0,
    total: 0,
    notes: customerNotes,
    termsAndConditions,
    attachedFiles: [],
    status,
  });

  const handleSave = async (status: "draft" | "sent") => {
    if (!selectedCustomer) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await salesOrdersAPI.create(buildPayload(status));
      const savedSalesOrder = (response as any)?.data || response;
      onSaved?.(savedSalesOrder);
      if (!onSaved) {
        navigate("/sales/sales-orders");
      }
      onCancel?.();
    } catch (error) {
      console.error("Failed to save sales order:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-5">
        <div className="flex items-center gap-2">
          <ShoppingCart className="text-gray-700" size={16} />
          <h1 className="text-[15px] font-medium text-gray-900">New Sales Order</h1>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
          <Settings size={15} className="cursor-pointer hover:text-gray-800" />
          <X size={16} className="cursor-pointer hover:text-gray-800" />
        </div>
      </header>

      <main className="px-3 py-3 sm:px-4 sm:py-4">
        <div className="max-w-[1120px]">
          <div className="rounded-sm border border-transparent bg-transparent">
            <div className="space-y-4 border-b border-gray-200 bg-white px-3 py-4 sm:px-2">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,720px)_1fr] lg:items-start">
                <div className="space-y-4">
                <Row label="Customer Name" required>
                  <div className="relative w-full max-w-[420px]" ref={customerDropdownRef}>
                    <div className="flex h-8 overflow-hidden rounded border border-gray-300 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => setIsCustomerDropdownOpen((open) => !open)}
                        className="flex flex-1 items-center justify-between px-3 text-left text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372]"
                      >
                        <span className={selectedCustomer ? "text-gray-700" : "text-gray-400"}>
                          {customerLabel}
                        </span>
                        <ChevronDown
                          size={13}
                          className={`text-gray-500 transition-transform ${isCustomerDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      <button
                        type="button"
                        className="flex w-8 items-center justify-center bg-[#22c55e] text-white hover:bg-[#16a34a]"
                        aria-label="Search customers"
                        onClick={() => setIsCustomerDropdownOpen(true)}
                      >
                        <Search size={13} />
                      </button>
                    </div>

                    {isCustomerDropdownOpen && (
                      <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl">
                        <div className="border-b border-gray-100 p-2">
                          <div className="relative">
                            <Search size={13} className="pointer-events-none absolute left-2 top-2.5 text-gray-400" />
                            <input
                              value={customerSearch}
                              onChange={(e) => setCustomerSearch(e.target.value)}
                              placeholder="Search"
                              className="w-full rounded border border-gray-300 py-1.5 pl-8 pr-3 text-[13px] text-gray-700 outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                            />
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setIsCustomerDropdownOpen(false);
                                setCustomerSearch("");
                              }}
                              className={`w-full px-3 py-2 text-left transition hover:bg-gray-50 ${
                                selectedCustomer?.id === customer.id ? "bg-gray-100 text-gray-900" : "text-gray-700"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                                  {customer.name.trim().charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[13px] font-medium capitalize">{customer.name}</div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] opacity-90">
                                    <span className="inline-flex items-center gap-1">
                                      <Mail size={11} />
                                      <span className="truncate">{customer.email}</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <Building2 size={11} className="text-gray-500" />
                                      <span className="truncate">{customer.company}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-100 bg-white p-2">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              setIsCustomerDropdownOpen(false);
                              setCustomerSearch("");
                              navigate("/sales/customers/new");
                            }}
                          >
                            <PlusCircle size={14} />
                            New Customer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Row>

                <Row label="Location">
                  <div className="relative w-full max-w-[310px]" ref={locationDropdownRef}>
                    <button
                      type="button"
                      className="flex h-8 w-full items-center justify-between rounded border border-gray-300 bg-white px-3 text-left text-[13px] text-gray-700 outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                      onClick={() => setIsLocationDropdownOpen((open) => !open)}
                    >
                      <span className={selectedLocation ? "text-gray-700" : "text-gray-400"}>
                        {selectedLocation?.label || "Head Office"}
                      </span>
                      <ChevronDown
                        size={13}
                        className={`text-gray-500 transition-transform ${isLocationDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isLocationDropdownOpen && (
                      <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl">
                        <div className="border-b border-gray-100 p-2">
                          <div className="relative">
                            <Search size={13} className="pointer-events-none absolute left-2 top-2.5 text-gray-400" />
                            <input
                              value={locationSearch}
                              onChange={(e) => setLocationSearch(e.target.value)}
                              placeholder="Search"
                              className="w-full rounded border border-gray-300 py-1.5 pl-8 pr-3 text-[13px] text-gray-700 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                            />
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {filteredLocations.length > 0 ? (
                            filteredLocations.map((location) => (
                              <button
                                key={location.id}
                                type="button"
                                onClick={() => {
                                  setSelectedLocation(location);
                                  setIsLocationDropdownOpen(false);
                                  setLocationSearch("");
                                }}
                                className={`w-full px-3 py-2 text-left text-[13px] transition hover:bg-gray-50 hover:text-gray-900 ${
                                  selectedLocation?.id === location.id ? "bg-gray-100 text-gray-900" : "text-gray-700"
                                }`}
                              >
                                {location.label}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-[13px] italic text-gray-500">No locations found</div>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="mt-1 pl-1 text-[11px] text-gray-500">Source of Supply: Nairobi</p>
                  </div>
                </Row>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-3 py-5 sm:px-2">
              <div className="grid grid-cols-1 gap-y-4 lg:grid-cols-[minmax(0,720px)_1fr] lg:gap-x-8 lg:gap-y-5">
                <div className="space-y-4">
                <Row label="Sales Order#" required>
                  <div className="relative w-full max-w-[310px]">
                    <input className={`${INPUT_CLASS} pr-8`} defaultValue={salesOrderNumber} readOnly />
                    <Settings size={12} className="absolute right-2 top-2 text-[#156372]" />
                  </div>
                </Row>

                <Row label="Reference#">
                  <div className="relative w-full max-w-[310px]">
                    <input className={INPUT_CLASS} />
                    <Info size={12} className="absolute right-2 top-2 text-gray-400" />
                  </div>
                </Row>

                <Row label="Sales Order Date" required>
                  <div className="relative w-full max-w-[310px]">
                    <input
                      className="h-8 w-full rounded border border-[#cfd7ee] bg-white px-3 pr-9 text-[13px] text-gray-700 outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      defaultValue={salesOrderDate}
                      readOnly
                    />
                    <Calendar size={14} className="absolute right-2.5 top-2 text-gray-400" />
                  </div>
                </Row>

                <Row label="Expected Shipment Date">
                  <div className="relative w-full max-w-[310px]">
                    <input
                      className="h-8 w-full rounded border border-[#cfd7ee] bg-white px-3 pr-9 text-[13px] text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      placeholder={expectedShipDate}
                    />
                    <Calendar size={14} className="absolute right-2.5 top-2 text-gray-400" />
                  </div>
                </Row>

                <Row label="Payment Terms">
                  <div className="relative w-full max-w-[310px]" ref={paymentTermsDropdownRef}>
                    <button
                      type="button"
                      className="flex h-8 w-full items-center justify-between rounded border border-gray-300 bg-white px-3 text-left text-[13px] text-gray-700 outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                      onClick={() => setIsPaymentTermsDropdownOpen((open) => !open)}
                    >
                      <span>{selectedPaymentTerms}</span>
                      <ChevronDown
                        size={13}
                        className={`text-gray-500 transition-transform ${isPaymentTermsDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isPaymentTermsDropdownOpen && (
                      <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl">
                        <div className="max-h-52 overflow-y-auto py-1">
                          {visiblePaymentTerms.map((term) => (
                            <button
                              key={term.id}
                              type="button"
                              onClick={() => {
                                setSelectedPaymentTerms(term.value);
                                setIsPaymentTermsDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-[13px] transition hover:bg-gray-50 hover:text-gray-900 ${
                                selectedPaymentTerms === term.value ? "bg-gray-100 text-gray-900" : "text-gray-700"
                              }`}
                            >
                              {term.label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 border-t border-gray-100 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                          onClick={() => {
                            setIsPaymentTermsDropdownOpen(false);
                            setIsConfigureTermsOpen(true);
                          }}
                        >
                          <PlusCircle size={14} className="text-gray-500" />
                          Manage Payment Terms
                        </button>
                      </div>
                    )}
                  </div>
                </Row>
                </div>
              </div>

              <div className={SECTION_LINE} />

              <div className="grid grid-cols-1 gap-y-4 lg:grid-cols-[minmax(0,720px)_1fr] lg:gap-x-8">
                <div className="space-y-4">
                <Row label="Delivery Method">
                  <select
                    className={`${SELECT_CLASS} w-full max-w-[310px]`}
                    value={deliveryMethod}
                    onChange={(event) => setDeliveryMethod(event.target.value)}
                  >
                    <option value="">Select a delivery method or type to add</option>
                    <option value="Courier">Courier</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Delivery">Delivery</option>
                  </select>
                </Row>
                <Row label="Salesperson">
                  <div className="relative w-full max-w-[310px]" ref={salespersonDropdownRef}>
                    <button
                      type="button"
                      className="flex h-8 w-full items-center justify-between rounded border border-gray-300 bg-white px-3 text-left text-[13px] text-gray-700 outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                      onClick={() => setIsSalespersonDropdownOpen((open) => !open)}
                    >
                      <span className={selectedSalesperson ? "text-gray-700" : "text-gray-400"}>
                        {selectedSalesperson?.name || "Select or Add Salesperson"}
                      </span>
                      <ChevronDown
                        size={13}
                        className={`text-gray-500 transition-transform ${isSalespersonDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isSalespersonDropdownOpen && (
                      <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl">
                        <div className="border-b border-gray-100 p-2">
                          <div className="relative">
                            <Search size={13} className="pointer-events-none absolute left-2 top-2.5 text-gray-400" />
                            <input
                              value={salespersonSearch}
                              onChange={(e) => setSalespersonSearch(e.target.value)}
                              placeholder="Search"
                              className="w-full rounded border border-gray-300 py-1.5 pl-8 pr-3 text-[13px] text-gray-700 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                            />
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {filteredSalespersons.length > 0 ? (
                            filteredSalespersons.map((salesperson) => (
                              <button
                                key={salesperson.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSalesperson(salesperson);
                                  setIsSalespersonDropdownOpen(false);
                                  setSalespersonSearch("");
                                }}
                                className={`w-full px-3 py-2 text-left text-[13px] transition hover:bg-gray-50 hover:text-gray-900 ${
                                  selectedSalesperson?.id === salesperson.id ? "bg-gray-100 text-gray-900" : "text-gray-700"
                                }`}
                              >
                                {salesperson.name}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-[13px] italic text-gray-500">No salespersons found</div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 border-t border-gray-100 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                          onClick={() => {
                            setIsSalespersonDropdownOpen(false);
                            setSalespersonSearch("");
                            setIsManageSalespersonsOpen(true);
                          }}
                        >
                          <PlusCircle size={14} className="text-gray-500" />
                          Manage Salespersons
                        </button>
                      </div>
                    )}
                  </div>
                </Row>
                </div>
              </div>

              <div className={SECTION_LINE} />

              <div className="pl-[160px]">
                <LabeledValue label="Warehouse Location" value={selectedLocation?.label || "Head Office"} />
              </div>

              <div className="space-y-4 pt-1">
                <div className="overflow-hidden rounded-md border border-[#dfe3f2] bg-white">
                  <div className="flex items-center justify-between border-b border-[#dfe3f2] bg-[#fafbff] px-3 py-3">
                    <h2 className="text-[13px] font-semibold text-gray-900">Item Table</h2>
                    <button className="inline-flex items-center gap-1 text-[12px] text-gray-700 hover:text-gray-900">
                      <HelpCircle size={13} className="text-gray-500" />
                      Bulk Actions
                    </button>
                  </div>

                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#dfe3f2] bg-white text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        <th className="px-3 py-2 font-semibold">Item Details</th>
                        <th className="w-32 px-3 py-2 text-right font-semibold">Quantity</th>
                        <th className="w-36 px-3 py-2 text-right font-semibold">Rate</th>
                        <th className="w-24 px-3 py-2 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[#dfe3f2]">
                        <td className="relative px-3 py-4" ref={itemDropdownRef}>
                          {selectedItem ? (
                            <div
                              role="button"
                              tabIndex={0}
                              className="w-full rounded-md border border-transparent bg-white px-0 py-0 text-left outline-none"
                              onClick={() => setIsItemDropdownOpen((open) => !open)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setIsItemDropdownOpen((open) => !open);
                                }
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-300">
                                    <LayoutGrid size={15} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate text-[13px] font-medium text-gray-900">
                                      {selectedItem.name}
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-gray-500">
                                      SKU: {selectedItem.sku || "-"} · Rate: KES{Number(selectedItem.rate || 0).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-gray-400">
                                  <button type="button" className="rounded-full p-0.5 hover:bg-gray-100" aria-label="More actions">
                                    <span className="text-lg leading-none">...</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full p-0.5 hover:bg-gray-100"
                                    aria-label="Remove item"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedItem(null);
                                      setItemSearch("");
                                      setIsItemDropdownOpen(true);
                                    }}
                                  >
                                    <X size={13} />
                                  </button>
                                  </div>
                                </div>
                              <div className="mt-3 rounded-md bg-gray-50 px-3 py-2">
                                <div className="flex items-center justify-between gap-3 text-[11px] text-gray-500">
                                  <span className="font-medium">Stock on Hand</span>
                                  <span className="font-medium text-gray-700">
                                    {Number(selectedItem.stockOnHand || 0).toFixed(2)} {selectedItem.unit}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center justify-between gap-3">
                                  <span className="text-[11px] text-[#156372]">Head Office</span>
                                  <span className="text-[11px] text-indigo-500">Recent Transactions</span>
                                  </div>
                                </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-300">
                                <LayoutGrid size={15} />
                              </div>
                              <input
                                className="w-full border-0 bg-transparent px-0 py-1 text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
                                placeholder="Type or click to select an item."
                                value={itemSearch}
                                onChange={(event) => {
                                  setItemSearch(event.target.value);
                                  setIsItemDropdownOpen(true);
                                }}
                                onFocus={() => setIsItemDropdownOpen(true)}
                              />
                            </div>
                          )}
                          {isItemDropdownOpen && (
                            <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[560px] max-w-[calc(100vw-48px)] overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl">
                              <div className="border-b border-gray-100 p-2">
                                <div className="relative">
                                  <Search size={13} className="pointer-events-none absolute left-2 top-2.5 text-gray-400" />
                                  <input
                                    value={itemSearch}
                                    onChange={(event) => setItemSearch(event.target.value)}
                                    placeholder="Search"
                                    className="w-full rounded border border-gray-300 py-1.5 pl-8 pr-3 text-[13px] text-gray-700 outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                  />
                                </div>
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                {filteredItems.length > 0 ? (
                                  filteredItems.map((item, index) => {
                                    const isSelected = selectedItem?.id === item.id;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedItem(item);
                                          setItemSearch(item.name);
                                          setIsItemDropdownOpen(false);
                                        }}
                                        className={`flex w-full items-start justify-between gap-4 px-4 py-2.5 text-left transition-colors ${
                                          isSelected ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-50"
                                        }`}
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className={`truncate text-[13px] font-medium ${isSelected ? "text-white" : "text-gray-900"}`}>
                                            {item.name}
                                          </div>
                                          <div className={`mt-0.5 text-[11px] ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
                                            SKU: {item.sku || "-"} Rate: KES{Number(item.rate || 0).toFixed(2)}
                                          </div>
                                        </div>
                                        <div className={`min-w-[120px] text-right text-[11px] ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
                                          <div className="font-medium">Stock on Hand</div>
                                          <div className={`mt-0.5 text-[13px] font-semibold ${isSelected ? "text-white" : "text-[#1f7a5a]"}`}>
                                            {Number(item.stockOnHand || 0).toFixed(2)} {item.unit}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="px-4 py-3 text-center text-[13px] text-gray-400">No items found</div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 border-t border-gray-100 bg-white px-4 py-2.5 text-left text-[13px] font-medium text-[#156372] hover:bg-gray-50"
                                onClick={() => {
                                  setIsItemDropdownOpen(false);
                                  navigate("/items/new");
                                }}
                              >
                                <PlusCircle size={14} />
                                Add New Item
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4 align-top text-right text-[13px] text-gray-700">
                          <input
                            type="number"
                            className="w-full border-0 bg-transparent px-0 py-1 text-right text-[13px] text-gray-700 outline-none"
                            defaultValue="1.00"
                          />
                          {selectedItem ? (
                            <div className="mt-2 text-center text-[11px] leading-tight text-gray-600">
                              <div className="font-medium">Stock on Hand:</div>
                              <div>
                                {Number(selectedItem.stockOnHand || 0).toFixed(2)} {selectedItem.unit}
                              </div>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-4 align-top text-right text-[13px] text-gray-700">
                          <input
                            type="number"
                            className="w-full border-0 bg-transparent px-0 py-1 text-right text-[13px] text-gray-700 outline-none"
                            value={selectedItem ? Number(selectedItem.rate || 0).toFixed(2) : "0.00"}
                            readOnly
                          />
                          {selectedItem ? (
                            <div className="mt-2 text-right text-[11px] text-indigo-500">Recent Transactions</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-4 align-top text-right text-[13px] font-semibold text-gray-900">
                          {selectedItem ? `KES${(Number(selectedItem.rate || 0) * 1).toFixed(2)}` : "0.00"}
                        </td>
                      </tr>
                      <tr className="border-b border-[#dfe3f2]">
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-300">
                              <LayoutGrid size={15} />
                            </div>
                            <input
                              className="w-full border-0 bg-transparent px-0 py-1 text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
                              placeholder="Type or click to select an item."
                            />
                          </div>
                        </td>
                        <td className="px-3 py-4 text-right text-[13px] text-gray-700">1.00</td>
                        <td className="px-3 py-4 text-right text-[13px] text-gray-700">0.00</td>
                        <td className="px-3 py-4 text-right text-[13px] font-semibold text-gray-900">0.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button className="inline-flex items-center gap-1 rounded bg-[#f2f4ff] px-3 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-[#ebeeff]">
                    <Plus size={12} className="text-[#4c6fff]" />
                    Add New Row
                    <ChevronDown size={11} className="ml-1 text-gray-400" />
                  </button>
                  <button className="inline-flex items-center gap-1 rounded bg-[#f2f4ff] px-3 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-[#ebeeff]">
                    <Plus size={12} className="text-[#4c6fff]" />
                    Add Items in Bulk
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6 pt-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-[12px] font-medium text-gray-700">Customer Notes</label>
                      <textarea
                        className="min-h-[48px] w-full resize-y rounded border border-[#ccd2eb] bg-white px-3 py-2 text-[13px] text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                        placeholder="Enter any notes to be displayed in your transaction"
                        value={customerNotes}
                        onChange={(event) => setCustomerNotes(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rounded-md bg-[#f7f8fd] p-0">
                    <div className="max-w-[460px] rounded-md border border-[#eef1f9] bg-[#f7f8fd]">
                      <div className="flex items-center justify-between border-b border-[#e7eaf5] px-3 py-4 text-[12px]">
                        <span className="font-semibold text-gray-700">Sub Total</span>
                        <span className="font-medium text-gray-700">0.00</span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-5 text-[12px]">
                        <span className="font-semibold text-gray-700">Total ( KES )</span>
                        <span className="text-[15px] font-bold text-gray-900">0.00</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 border-t border-[#edf0f7] bg-[#f7f8fd] px-0 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-gray-700">Terms & Conditions</label>
                    <textarea
                      className="min-h-[88px] w-full resize-y rounded border border-[#ccd2eb] bg-white px-3 py-2 text-[13px] text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                      value={termsAndConditions}
                      onChange={(event) => setTermsAndConditions(event.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-gray-700">Attach File(s) to Sales Order</label>
                    <div className="inline-flex items-center gap-1 rounded border border-dashed border-[#d6dcf0] bg-white px-3 py-1.5 text-[11px] text-gray-700 shadow-sm">
                      <UploadCloud size={12} className="text-gray-500" />
                      Upload File
                      <ChevronDown size={12} className="text-gray-400" />
                    </div>
                    <p className="mt-2 text-[10px] text-gray-500">You can upload a maximum of 10 files, 5MB each</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {isManageSalespersonsOpen && createPortal(
        <SalespersonManagerModal
          salespersons={salespersonOptions.map((salesperson) => salesperson.name)}
          onClose={() => setIsManageSalespersonsOpen(false)}
        />,
        document.body
      )}

      <ConfigurePaymentTermsModal
        isOpen={isConfigureTermsOpen}
        onClose={() => setIsConfigureTermsOpen(false)}
        initialTerms={visiblePaymentTerms}
        onSave={(terms) => {
          const sanitizedTerms = terms.filter((term) => term.label.trim());
          const nextTerms = sanitizedTerms.length > 0 ? sanitizedTerms : defaultPaymentTerms;
          setPaymentTerms(nextTerms);

          if (!nextTerms.some((term) => term.value === selectedPaymentTerms)) {
            setSelectedPaymentTerms(nextTerms[0]?.value || "Due on Receipt");
          }
        }}
      />

      <footer className="border-t border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSaving || !selectedCustomer}
            onClick={() => handleSave("draft")}
            className="rounded border border-gray-300 bg-gray-50 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save as Draft
          </button>
          <div className="flex items-stretch overflow-hidden rounded-md">
            <button
              type="button"
              disabled={isSaving || !selectedCustomer}
              onClick={() => handleSave("sent")}
              className="bg-[#22c55e] px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save and Send
            </button>
            <button
              type="button"
              disabled={isSaving || !selectedCustomer}
              onClick={() => handleSave("sent")}
              className="bg-[#22c55e] px-2 py-1.5 text-white hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ChevronDown size={13} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              onCancel?.();
              if (!onCancel) {
                navigate("/sales/sales-orders");
              }
            }}
            className="rounded border border-gray-300 bg-gray-50 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </footer>
    </div>
  );
};

function SalespersonManagerModal({
  salespersons,
  onClose,
}: {
  salespersons: string[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [isNewFormOpen, setIsNewFormOpen] = useState(false);
  const [newSalesperson, setNewSalesperson] = useState({ name: "", email: "" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const rows = salespersons
    .map((name, index) => ({
      id: String(index + 1),
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    }))
    .filter((salesperson) =>
      [salesperson.name, salesperson.email].join(" ").toLowerCase().includes(search.toLowerCase())
    );

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleClose = () => {
    setSearch("");
    setIsNewFormOpen(false);
    setSelectedIds([]);
    setPage(1);
    setEditingId(null);
    setNewSalesperson({ name: "", email: "" });
    onClose();
  };

  const handleStartNew = () => {
    setEditingId(null);
    setNewSalesperson({ name: "", email: "" });
    setIsNewFormOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={handleClose}>
      <div
        className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Manage Salespersons</h2>
          <button type="button" onClick={handleClose} className="text-gray-500 hover:text-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search Salesperson"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm text-gray-700 outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
              />
            </div>
            <button
              type="button"
              onClick={handleStartNew}
              className="flex items-center gap-2 rounded-md bg-[#156372] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f4f5a]"
            >
              <Plus size={16} />
              New Salesperson
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isNewFormOpen ? (
            <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                {editingId ? "Edit Salesperson" : "Add New Salesperson"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    value={newSalesperson.name}
                    onChange={(event) => setNewSalesperson((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={newSalesperson.email}
                    onChange={(event) => setNewSalesperson((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                    placeholder="Enter email"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-md bg-[#156372] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f4f5a]"
                  >
                    {editingId ? "Save Changes" : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewFormOpen(false)}
                    className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                    checked={paginatedRows.length > 0 && paginatedRows.every((sp) => selectedIds.includes(sp.id))}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedIds(paginatedRows.map((sp) => sp.id));
                      } else {
                        setSelectedIds((prev) => prev.filter((id) => !paginatedRows.some((sp) => sp.id === id)));
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">SALESPERSON NAME</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">EMAIL</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    {search ? "No salespersons found" : "No salespersons available"}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((salesperson) => (
                  <tr key={salesperson.id} className="group hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                        checked={selectedIds.includes(salesperson.id)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedIds((prev) => [...prev, salesperson.id]);
                          } else {
                            setSelectedIds((prev) => prev.filter((id) => id !== salesperson.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{salesperson.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{salesperson.email}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="hidden items-center justify-end gap-2 group-hover:flex">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(salesperson.id);
                            setNewSalesperson({ name: salesperson.name, email: salesperson.email });
                            setIsNewFormOpen(true);
                          }}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-[#156372]"
                        >
                          <Plus size={16} className="rotate-45" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-[#156372]"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <div>
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-gray-300 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="rounded border border-gray-300 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded bg-[#156372] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f4f5a]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewSalesOrder;



