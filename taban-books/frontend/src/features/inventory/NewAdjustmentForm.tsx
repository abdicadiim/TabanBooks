import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { Item } from "../items/itemsModel";
import { accountantAPI, inventoryAdjustmentsAPI, itemsAPI, locationsAPI } from "../../services/api";
import { AdjustmentFormActions } from "./new-adjustment-form/AdjustmentFormActions";
import { AdjustmentFormFields } from "./new-adjustment-form/AdjustmentFormFields";
import { AdjustmentItemsSection } from "./new-adjustment-form/AdjustmentItemsSection";
import { AdjustmentModals } from "./new-adjustment-form/AdjustmentModals";
import { NewAdjustmentFormProvider } from "./new-adjustment-form/context";
import type {
  AccountCategories,
  AdjustmentFormData,
  CustomReason,
  DeleteReasonModalState,
  ItemRow,
  LocationItem,
} from "./new-adjustment-form/types";
import {
  DEFAULT_ADJUSTMENT_ACCOUNT,
  DEFAULT_REASONS,
  clearSelectedItemFromRow,
  createEmptyItemRow,
  createRowFromItem,
  formatDate,
  getDaysInMonth,
  getItemInventoryValue,
  getItemStockQuantity,
  getItemUnitCost,
  getStockOnHand,
  getTodayDate,
  mapAdjustmentItemToRow,
  mapClonedItemToRow,
  parseDateString,
  toNumber,
} from "./new-adjustment-form/utils";

const getItemIdentity = (item?: Partial<Item> | null) => String(item?._id || item?.id || item?.name || "");

export default function NewAdjustmentForm({ items: propItems = [] }: { items?: Item[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [items, setItems] = useState<Item[]>(propItems);
  const [loading, setLoading] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState<AdjustmentFormData>({
    mode: "quantity",
    reference: "",
    date: getTodayDate(),
    account: DEFAULT_ADJUSTMENT_ACCOUNT,
    reason: "",
    location: "",
    description: "",
  });
  const [itemRows, setItemRows] = useState<ItemRow[]>([createEmptyItemRow(1)]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [itemDropdownOpen, setItemDropdownOpen] = useState<Record<string, boolean>>({});
  const [itemSearch, setItemSearch] = useState<Record<string, string>>({});
  const [bulkAddModalOpen, setBulkAddModalOpen] = useState(false);
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkSelectedItems, setBulkSelectedItems] = useState<Item[]>([]);
  const [bulkUpdateModalOpen, setBulkUpdateModalOpen] = useState(false);
  const [bulkActionsDropdownOpen, setBulkActionsDropdownOpen] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState("");
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");
  const [attachedFiles] = useState<File[]>([]);
  const [rowMenuOpen, setRowMenuOpen] = useState<Record<string, boolean>>({});
  const [reportingTagsModalOpen, setReportingTagsModalOpen] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);

  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bulkActionsRef = useRef<HTMLDivElement>(null);
  const rowMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [reasonDropdownOpen, setReasonDropdownOpen] = useState(false);
  const [reasonSearch, setReasonSearch] = useState("");
  const [manageReasonsModalOpen, setManageReasonsModalOpen] = useState(false);
  const [addReasonModalOpen, setAddReasonModalOpen] = useState(false);
  const [newReasonName, setNewReasonName] = useState("");
  const [deleteReasonModal, setDeleteReasonModal] = useState<DeleteReasonModalState>({ open: false, reason: "" });
  const reasonDropdownRef = useRef<HTMLDivElement>(null);
  const [reasons, setReasons] = useState<string[]>([...DEFAULT_REASONS]);
  const [customReasons, setCustomReasons] = useState<CustomReason[]>([]);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateCalendar, setDateCalendar] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const [accountCategories, setAccountCategories] = useState<AccountCategories>({});
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const [locationItems, setLocationItems] = useState<LocationItem[]>([]);

  useEffect(() => {
    if (propItems.length > 0) {
      setItems(propItems);
      return;
    }

    if (items.length > 0) {
      return;
    }

    let cancelled = false;

    const fetchItems = async () => {
      try {
        const response = await itemsAPI.getAll();
        const nextItems = Array.isArray(response) ? response : response?.data || [];

        if (!cancelled) {
          setItems(nextItems);
        }
      } catch (error) {
        console.error("Error loading items:", error);
      }
    };

    void fetchItems();

    return () => {
      cancelled = true;
    };
  }, [items.length, propItems]);

  useEffect(() => {
    const fetchAdjustment = async () => {
      if (!id) {
        return;
      }

      setLoading(true);

      try {
        const response = await inventoryAdjustmentsAPI.getById(id);
        const adjustment = response?.data || response;

        if (!adjustment) {
          return;
        }

        let formattedDate = adjustment.date || getTodayDate();
        if (adjustment.date && !adjustment.date.includes("/")) {
          formattedDate = formatDate(parseDateString(adjustment.date));
        }

        setFormData({
          mode: adjustment.type === "Quantity" || adjustment.type === "quantity" ? "quantity" : "value",
          reference: adjustment.adjustmentNumber || adjustment.referenceNumber || "",
          date: formattedDate,
          account: adjustment.account || DEFAULT_ADJUSTMENT_ACCOUNT,
          reason: adjustment.reason || "",
          location: adjustment.location || adjustment.locationName || "",
          description: adjustment.description || adjustment.notes || "",
        });

        if (Array.isArray(adjustment.items) && adjustment.items.length > 0) {
          const isValueAdjustment = adjustment.type === "Value" || adjustment.type === "value";
          setItemRows(adjustment.items.map((item: any) => mapAdjustmentItemToRow(item, isValueAdjustment)));
        } else if (Array.isArray(adjustment.itemRows) && adjustment.itemRows.length > 0) {
          setItemRows(adjustment.itemRows as ItemRow[]);
        }

        const adjustmentDate = parseDateString(formattedDate);
        setDateCalendar(new Date(adjustmentDate.getFullYear(), adjustmentDate.getMonth(), 1));
      } catch (error) {
        console.error("Error loading adjustment:", error);
        alert("Failed to load adjustment details");
        navigate("/inventory");
      } finally {
        setLoading(false);
      }
    };

    if (isEditMode && id) {
      void fetchAdjustment();
    }
  }, [id, isEditMode, navigate]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    const cloned = (location.state as any)?.clonedAdjustmentData;
    if (!cloned) {
      return;
    }

    setFormData({
      mode: cloned.mode || "quantity",
      reference: cloned.reference || "",
      date: cloned.date || getTodayDate(),
      account: cloned.account || DEFAULT_ADJUSTMENT_ACCOUNT,
      reason: cloned.reason || "",
      location: cloned.location || "",
      description: cloned.description || "",
    });

    if (Array.isArray(cloned.items) && cloned.items.length > 0) {
      setItemRows(cloned.items.map((item: any) => mapClonedItemToRow(item, cloned.mode === "value")));
    }
  }, [isEditMode, location.state]);

  useEffect(() => {
    const fetchReasons = async () => {
      try {
        const response = await inventoryAdjustmentsAPI.getReasons();
        if (!response) {
          return;
        }

        setCustomReasons(response);
        setReasons([...DEFAULT_REASONS, ...response.map((reason: CustomReason) => reason.name)]);
      } catch (error) {
        console.error("Failed to fetch adjustment reasons:", error);
      }
    };

    void fetchReasons();
  }, []);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await accountantAPI.getAccounts();
        const accounts = Array.isArray(response) ? response : response?.data || [];
        const categorized: AccountCategories = {};

        accounts.forEach((account: any) => {
          const category = account.accountTypeFormatted || account.accountType || "Uncategorized";
          const rawName =
            account.name ||
            account.accountName ||
            account.displayName ||
            account.title ||
            account.label ||
            account.description ||
            account.account ||
            account.nameFormatted ||
            "";
          const fallbackId = account.id || account._id || account.accountId || "";
          const accountName = String(rawName || `Account ${fallbackId}`).trim();

          if (!categorized[category]) {
            categorized[category] = [];
          }

          categorized[category].push(accountName);
        });

        setAccountCategories(categorized);
      } catch (error) {
        console.error("Error fetching accounts:", error);
        setAccountCategories({
          "Cost Of Goods Sold": [DEFAULT_ADJUSTMENT_ACCOUNT],
        });
      }
    };

    void fetchAccounts();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await locationsAPI.getAll();
        const locations = Array.isArray(response) ? response : response?.data || [];
        setLocationItems(locations);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setLocationItems([{ name: "Head Office" }]);
      }
    };

    void fetchLocations();
  }, []);

  useEffect(() => {
    setItemRows((previousRows) =>
      previousRows.map((row) => {
        if (!row.selectedItem) {
          return row;
        }

        const stockQuantity = getItemStockQuantity(row.selectedItem);
        const unitCost = getItemUnitCost(row.selectedItem);
        const currentValue = stockQuantity * unitCost;

        if (formData.mode === "value") {
          return {
            ...row,
            stockQuantity: stockQuantity.toFixed(2),
            costPrice: unitCost.toFixed(2),
            quantityAvailable: currentValue.toFixed(2),
            newQuantityOnHand: currentValue.toFixed(2),
            quantityAdjusted: "",
          };
        }

        return {
          ...row,
          stockQuantity: stockQuantity.toFixed(2),
          costPrice: unitCost.toFixed(2),
          quantityAvailable: stockQuantity.toFixed(2),
          newQuantityOnHand: stockQuantity.toFixed(2),
          quantityAdjusted: "",
        };
      }),
    );
  }, [formData.mode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(itemRefs.current).forEach((index) => {
        const target = itemRefs.current[index];
        if (target && !target.contains(event.target as Node)) {
          setItemDropdownOpen((previous) => ({ ...previous, [index]: false }));
        }
      });

      if (reasonDropdownRef.current && !reasonDropdownRef.current.contains(event.target as Node)) {
        setReasonDropdownOpen(false);
      }

      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setAccountDropdownOpen(false);
      }

      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setLocationDropdownOpen(false);
      }

      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setDatePickerOpen(false);
      }

      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target as Node)) {
        setBulkActionsDropdownOpen(false);
      }

      Object.keys(rowMenuRefs.current).forEach((index) => {
        const target = rowMenuRefs.current[index];
        if (target && !target.contains(event.target as Node)) {
          setRowMenuOpen((previous) => ({ ...previous, [index]: false }));
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateField = (field: keyof AdjustmentFormData, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: false }));
    }
  };

  const handleAccountSelect = (account: string) => {
    updateField("account", account);
    setAccountDropdownOpen(false);
    setAccountSearch("");
  };

  const handleReasonSelect = (reason: string) => {
    updateField("reason", reason);
    setReasonDropdownOpen(false);
    setReasonSearch("");
  };

  const handleAddNewReason = async () => {
    const trimmedReason = newReasonName.trim();

    if (!trimmedReason) {
      toast.error("Please enter a reason name");
      return;
    }

    if (reasons.includes(trimmedReason)) {
      toast.error("This reason already exists");
      return;
    }

    try {
      const savedReason = await inventoryAdjustmentsAPI.createReason({ reason: trimmedReason });
      const updatedCustomReasons = [...customReasons, savedReason];

      setCustomReasons(updatedCustomReasons);
      setReasons([...DEFAULT_REASONS, ...updatedCustomReasons.map((reason) => reason.name)]);
      updateField("reason", trimmedReason);
      setNewReasonName("");
      setAddReasonModalOpen(false);
      setManageReasonsModalOpen(false);
      toast.success("Reason added successfully");
    } catch (error) {
      console.error("Error adding reason:", error);
      toast.error("Failed to save reason");
    }
  };

  const deleteSelectedReason = async () => {
    const reasonToDelete = deleteReasonModal.reason;
    const customReason = customReasons.find((reason) => reason.name === reasonToDelete);

    try {
      if (customReason?._id) {
        await inventoryAdjustmentsAPI.deleteReason(customReason._id);
        const updatedCustomReasons = customReasons.filter((reason) => reason._id !== customReason._id);
        setCustomReasons(updatedCustomReasons);
        setReasons([...DEFAULT_REASONS, ...updatedCustomReasons.map((reason) => reason.name)]);
      } else {
        setReasons((previous) => previous.filter((reason) => reason !== reasonToDelete));
      }

      if (formData.reason === reasonToDelete) {
        updateField("reason", "");
      }

      toast.success("Reason deleted successfully");
      setDeleteReasonModal({ open: false, reason: "" });
    } catch (error) {
      console.error("Error deleting reason:", error);
      toast.error("Failed to delete reason");
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setDateCalendar((previous) => {
      const nextDate = new Date(previous);
      nextDate.setMonth(previous.getMonth() + (direction === "prev" ? -1 : 1));
      return nextDate;
    });
  };

  const handleDateSelect = (date: Date) => {
    updateField("date", formatDate(date));
    setDatePickerOpen(false);
  };

  const filteredAccountCategories = Object.entries(accountCategories).reduce<AccountCategories>((result, [category, categoryAccounts]) => {
    const filtered = categoryAccounts.filter((account) =>
      account.toLowerCase().includes(accountSearch.toLowerCase()),
    );

    if (filtered.length > 0) {
      result[category] = filtered;
    }

    return result;
  }, {});

  const filteredReasons = reasonSearch.trim()
    ? reasons.filter((reason) => reason.toLowerCase().includes(reasonSearch.toLowerCase()))
    : reasons;

  const handleItemChange = (index: number, field: keyof ItemRow, value: string) => {
    setItemRows((previousRows) => {
      const nextRows = [...previousRows];
      const row = { ...nextRows[index], [field]: value };

      if (formData.mode === "value") {
        if (field === "quantityAdjusted") {
          if (String(value).trim() === "") {
            row.quantityAdjusted = "";
            row.newQuantityOnHand = "";
            nextRows[index] = row;
            return nextRows;
          }

          const adjustedValue = toNumber(value);
          const currentValue = toNumber(row.quantityAvailable);
          row.newQuantityOnHand = (currentValue + adjustedValue).toFixed(2);
        } else if (field === "newQuantityOnHand") {
          if (String(value).trim() === "") {
            row.newQuantityOnHand = "";
            row.quantityAdjusted = "";
            nextRows[index] = row;
            return nextRows;
          }

          const changedValue = toNumber(value);
          const currentValue = toNumber(row.quantityAvailable);
          const difference = changedValue - currentValue;
          row.quantityAdjusted = difference > 0 ? `+${difference.toFixed(2)}` : difference.toFixed(2);
        }
      } else if (field === "quantityAdjusted") {
        const adjusted = toNumber(value);
        const available = toNumber(row.quantityAvailable);
        row.newQuantityOnHand = (available + adjusted).toFixed(2);
      } else if (field === "newQuantityOnHand") {
        const newQuantity = toNumber(value);
        const available = toNumber(row.quantityAvailable);
        const difference = newQuantity - available;
        row.quantityAdjusted = difference > 0 ? `+${difference}` : difference.toString();
      }

      nextRows[index] = row;
      return nextRows;
    });
  };

  const handleItemSelect = async (index: number, item: Item) => {
    let latestItem = item;
    const itemId = item._id || item.id;

    if (itemId) {
      try {
        const response = await itemsAPI.getById(itemId);
        latestItem = response?.data || response;
      } catch (error) {
        console.error("Error fetching latest item data:", error);
      }
    }

    setItemRows((previousRows) => {
      const nextRows = [...previousRows];
      const stockOnHand = getItemStockQuantity(latestItem);
      const currentValue = getItemInventoryValue(latestItem);

      nextRows[index] = {
        ...nextRows[index],
        itemDetails: typeof latestItem.name === "string" ? latestItem.name : String(latestItem),
        selectedItem: latestItem,
        description: latestItem.salesDescription || latestItem.purchaseDescription || "",
        stockQuantity: stockOnHand.toFixed(2),
        costPrice: getItemUnitCost(latestItem).toFixed(2),
        quantityAvailable: formData.mode === "value" ? currentValue.toFixed(2) : stockOnHand.toFixed(2),
        newQuantityOnHand: formData.mode === "value" ? currentValue.toFixed(2) : stockOnHand.toFixed(2),
        quantityAdjusted: "",
      };

      return nextRows;
    });

    setItemDropdownOpen((previous) => ({ ...previous, [index]: false }));
    setItemSearch((previous) => ({ ...previous, [index]: "" }));

    if (errors.items) {
      setErrors((previous) => ({ ...previous, items: false }));
    }
  };

  const filteredItems = (index: number | string) => {
    const searchTerm = (itemSearch[index] || "").toLowerCase();
    const trackableItems = items.filter((item) => item.trackInventory);

    if (!searchTerm) {
      return trackableItems;
    }

    return trackableItems.filter((item) =>
      (item.name || "").toLowerCase().includes(searchTerm) ||
      (item.sku || "").toLowerCase().includes(searchTerm),
    );
  };

  const addNewRow = () => {
    setItemRows((previous) => [...previous, createEmptyItemRow(Date.now())]);
  };

  const removeRow = (index: number) => {
    setItemRows((previous) => (previous.length > 1 ? previous.filter((_, rowIndex) => rowIndex !== index) : previous));
  };

  const handleItemSearchChange = (index: number, value: string) => {
    handleItemChange(index, "itemDetails", value);
    setItemSearch((previous) => ({ ...previous, [index]: value }));
    setItemDropdownOpen((previous) => ({ ...previous, [index]: true }));
  };

  const openItemDropdown = (index: number | string) => {
    setItemDropdownOpen((previous) => ({ ...previous, [index]: true }));
  };

  const clearSelectedItem = (index: number) => {
    setItemRows((previous) =>
      previous.map((row, rowIndex) => (rowIndex === index ? clearSelectedItemFromRow(row) : row)),
    );
  };

  const editCostPrice = (index: number) => {
    const newPrice = prompt("Enter cost price:", String(itemRows[index]?.costPrice || "60.00"));
    if (newPrice !== null && !Number.isNaN(parseFloat(newPrice))) {
      handleItemChange(index, "costPrice", newPrice);
    }
  };

  const toggleBulkActions = () => {
    setBulkActionsDropdownOpen((previous) => !previous);
  };

  const hideAdditionalInfo = () => {
    setBulkActionsDropdownOpen(false);
    setRowMenuOpen({});
  };

  const toggleRowMenu = (index: number) => {
    setRowMenuOpen((previous) => ({ ...previous, [index]: !previous[index] }));
  };

  const setRowMenuVisibility = (index: number, open: boolean) => {
    setRowMenuOpen((previous) => ({ ...previous, [index]: open }));
  };

  const openBulkAdd = () => {
    setBulkAddModalOpen(true);
    setBulkSelectedItems([]);
    setBulkSearch("");
  };

  const cancelBulkAdd = () => {
    setBulkAddModalOpen(false);
    setBulkSelectedItems([]);
    setBulkSearch("");
  };

  const toggleBulkSelectedItem = (item: Item) => {
    const nextId = getItemIdentity(item);

    setBulkSelectedItems((previous) =>
      previous.some((selectedItem) => getItemIdentity(selectedItem) === nextId)
        ? previous.filter((selectedItem) => getItemIdentity(selectedItem) !== nextId)
        : [...previous, item],
    );
  };

  const removeBulkSelectedItem = (itemId: string | number | undefined) => {
    setBulkSelectedItems((previous) =>
      previous.filter((item) => getItemIdentity(item) !== String(itemId || "")),
    );
  };

  const addBulkSelectedItems = () => {
    setItemRows((previous) => [...previous, ...bulkSelectedItems.map((item) => createRowFromItem(item, formData.mode === "value"))]);
    setBulkSelectedItems([]);
    setBulkAddModalOpen(false);
    setBulkSearch("");
  };

  const openBulkUpdate = () => {
    setBulkUpdateModalOpen(true);
    setBulkActionsDropdownOpen(false);
  };

  const closeBulkUpdate = () => {
    setBulkUpdateModalOpen(false);
    setBulkUpdateField("");
    setBulkUpdateValue("");
  };

  const applyBulkUpdate = () => {
    if (!bulkUpdateField || !bulkUpdateValue.trim()) {
      alert("Please select a field and enter a value.");
      return;
    }

    setItemRows((previousRows) =>
      previousRows.map((row) => {
        const updatedRow = { ...row };
        if (bulkUpdateField === "quantityAdjusted") {
          updatedRow.quantityAdjusted = bulkUpdateValue;
        } else if (bulkUpdateField === "newQuantityOnHand") {
          updatedRow.newQuantityOnHand = bulkUpdateValue;
        } else if (bulkUpdateField === "costPrice") {
          updatedRow.costPrice = bulkUpdateValue;
        } else if (bulkUpdateField === "description") {
          updatedRow.description = bulkUpdateValue;
        }

        return updatedRow;
      }),
    );

    closeBulkUpdate();
  };

  const handleSubmit = async (event: React.SyntheticEvent, status = "DRAFT") => {
    event.preventDefault();

    const nextErrors: Record<string, boolean> = {};
    if (!formData.mode) {
      nextErrors.mode = true;
    }
    if (!formData.date) {
      nextErrors.date = true;
    }
    if (!formData.account.trim()) {
      nextErrors.account = true;
    }
    if (!formData.reason.trim()) {
      nextErrors.reason = true;
    }
    if (!formData.location.trim()) {
      nextErrors.location = true;
    }
    if (!itemRows.some((row) => row.selectedItem)) {
      nextErrors.items = true;
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.items) {
        toast.error("Please add at least one item to adjust");
      } else {
        toast.error("Please fill in all required fields");
      }
      return;
    }

    setLoading(true);
    setSubmittingStatus(status);

    const userValue = localStorage.getItem("user");
    let currentUser = "System";

    if (userValue) {
      try {
        const user = JSON.parse(userValue);
        currentUser = user.name || user.displayName || user.fullName || user.username || user.email || "System";
      } catch (error) {
        console.error("Error parsing user from localStorage:", error);
      }
    }

    const processedAttachments = await Promise.all(
      attachedFiles.map(
        (file) =>
          new Promise<{ name: string; size: string; type: string; preview: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () =>
              resolve({
                name: file.name,
                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                type: file.type,
                preview: reader.result as string,
              });
            reader.onerror = (fileError) => reject(fileError);
          }),
      ),
    );

    const payload = {
      date: parseDateString(formData.date),
      reason: formData.reason,
      location: formData.location,
      notes: formData.description || "",
      description: formData.description || "",
      status,
      adjustmentNumber: formData.reference || `ADJ-${Date.now().toString()}`,
      reference: formData.reference,
      type: formData.mode === "quantity" ? "Quantity" : "Value",
      account: formData.account,
      attachments: processedAttachments,
      items: itemRows
        .filter((row) => row.selectedItem)
        .map((row) =>
          formData.mode === "value"
            ? {
                item: row.selectedItem?._id || row.selectedItem?.id || "",
                itemName: row.selectedItem?.name || "",
                itemSku: row.selectedItem?.sku || "",
                quantityOnHand: parseFloat(String(row.stockQuantity || 0)),
                quantityAdjusted: parseFloat(String(row.quantityAdjusted || 0)),
                newQuantity: parseFloat(String(row.newQuantityOnHand || 0)),
                cost:
                  (parseFloat(String(row.stockQuantity || 0)) || 0) > 0
                    ? (parseFloat(String(row.newQuantityOnHand || 0)) || 0) /
                      (parseFloat(String(row.stockQuantity || 0)) || 1)
                    : parseFloat(String(row.costPrice || 0)),
              }
            : {
                item: row.selectedItem?._id || row.selectedItem?.id || "",
                itemName: row.selectedItem?.name || "",
                itemSku: row.selectedItem?.sku || "",
                quantityOnHand: parseFloat(String(row.quantityAvailable || 0)),
                quantityAdjusted: parseFloat(String(row.quantityAdjusted || 0)),
                newQuantity: parseFloat(String(row.newQuantityOnHand || 0)),
                cost: parseFloat(String(row.costPrice || 0)),
              },
        ),
      lastModifiedBy: currentUser,
    };

    try {
      if (isEditMode && id) {
        await inventoryAdjustmentsAPI.update(id, payload);
        toast.success("Adjustment updated successfully");
      } else {
        await inventoryAdjustmentsAPI.create({
          ...payload,
          createdBy: currentUser,
        });
        toast.success("Adjustment created successfully");
      }

      navigate("/inventory");
    } catch (error) {
      console.error("Error saving adjustment:", error);
      toast.error(`Failed to save adjustment: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
      setSubmittingStatus(null);
    }
  };

  const handleConvertToAdjusted = (event: React.SyntheticEvent) => {
    void handleSubmit(event, "ADJUSTED");
  };

  const handleCancel = () => {
    navigate("/inventory");
  };

  const contextValue = {
    formData,
    errors,
    isEditMode,
    isValueMode: formData.mode === "value",
    loading,
    submittingStatus,
    updateField,
    dates: {
      open: datePickerOpen,
      currentMonth: dateCalendar,
      selectedDate: parseDateString(formData.date),
      days: getDaysInMonth(dateCalendar),
      ref: datePickerRef,
      toggle: () => setDatePickerOpen((previous) => !previous),
      navigateMonth,
      selectDate: handleDateSelect,
    },
    accounts: {
      open: accountDropdownOpen,
      search: accountSearch,
      categories: filteredAccountCategories,
      ref: accountDropdownRef,
      toggle: () => setAccountDropdownOpen((previous) => !previous),
      setSearch: setAccountSearch,
      select: handleAccountSelect,
    },
    locations: {
      open: locationDropdownOpen,
      search: locationSearch,
      items: locationItems,
      ref: locationDropdownRef,
      toggle: () => setLocationDropdownOpen((previous) => !previous),
      setSearch: setLocationSearch,
      select: (location: string) => {
        updateField("location", location);
        setLocationDropdownOpen(false);
        setLocationSearch("");
      },
    },
    reasons: {
      open: reasonDropdownOpen,
      search: reasonSearch,
      filtered: filteredReasons,
      dropdownRef: reasonDropdownRef,
      values: reasons,
      defaults: DEFAULT_REASONS,
      manageModalOpen: manageReasonsModalOpen,
      addModalOpen: addReasonModalOpen,
      newReasonName,
      deleteModal: deleteReasonModal,
      toggleDropdown: () => setReasonDropdownOpen((previous) => !previous),
      setSearch: setReasonSearch,
      select: handleReasonSelect,
      openManageModal: () => {
        setReasonDropdownOpen(false);
        setManageReasonsModalOpen(true);
      },
      closeManageModal: () => setManageReasonsModalOpen(false),
      openAddModal: () => {
        setManageReasonsModalOpen(false);
        setAddReasonModalOpen(true);
      },
      closeAddModal: () => {
        setAddReasonModalOpen(false);
        setNewReasonName("");
      },
      setNewReasonName,
      addReason: handleAddNewReason,
      selectFromManage: (reason: string) => {
        updateField("reason", reason);
        setManageReasonsModalOpen(false);
      },
      requestDelete: (reason: string) => setDeleteReasonModal({ open: true, reason }),
      closeDeleteModal: () => setDeleteReasonModal({ open: false, reason: "" }),
      deleteSelectedReason,
    },
    itemsTable: {
      rows: itemRows,
      items,
      itemDropdownOpen,
      itemSearch,
      rowMenuOpen,
      itemRefs,
      rowMenuRefs,
      bulkActionsRef,
      bulkActionsDropdownOpen,
      bulkAddModalOpen,
      bulkSearch,
      bulkSelectedItems,
      bulkUpdateModalOpen,
      bulkUpdateField,
      bulkUpdateValue,
      reportingTagsModalOpen,
      documentsModalOpen,
      toggleBulkActions,
      hideAdditionalInfo,
      filteredItems,
      handleRowFieldChange: handleItemChange,
      handleItemSearchChange,
      openItemDropdown,
      selectItem: handleItemSelect,
      clearSelectedItem,
      editCostPrice,
      removeRow,
      addNewRow,
      toggleRowMenu,
      setRowMenuVisibility,
      openBulkAdd,
      cancelBulkAdd,
      setBulkSearch,
      toggleBulkSelectedItem,
      removeBulkSelectedItem,
      addBulkSelectedItems,
      openBulkUpdate,
      closeBulkUpdate,
      setBulkUpdateField,
      setBulkUpdateValue,
      applyBulkUpdate,
      closeReportingTagsModal: () => setReportingTagsModalOpen(false),
      closeDocumentsModal: () => setDocumentsModalOpen(false),
      getStockOnHand,
      getItemUnitCost: (item: Item) => getItemUnitCost(item),
      getItemInventoryValue: (item: Item) => getItemInventoryValue(item),
    },
    actions: {
      cancel: handleCancel,
      convertToAdjusted: handleConvertToAdjusted,
    },
  } satisfies Parameters<typeof NewAdjustmentFormProvider>[0]["value"];

  return (
    <NewAdjustmentFormProvider value={contextValue}>
      <div className="bg-[#f6f7fb] min-h-screen">
        <div className="max-w-full m-0 p-3 md:p-6 overflow-x-hidden bg-[#f6f7fb]">
          <div className="flex items-start justify-between mb-8">
            <h1 className="text-[28px] font-bold text-black m-0">
              {isEditMode ? "Edit Adjustment" : "New Adjustment"}
            </h1>
            <button
              type="button"
              onClick={() => navigate("/inventory")}
              aria-label="Close"
              title="Back to list"
              className="ml-3 p-3 rounded-md bg-transparent hover:bg-gray-100 border-none text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="-mx-3 md:-mx-6 py-2">
            <hr className="border-t border-transparent" />
          </div>

          <form
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <AdjustmentFormFields />
            <AdjustmentItemsSection />
            <AdjustmentFormActions />
            <AdjustmentModals />
          </form>
        </div>
      </div>
    </NewAdjustmentFormProvider>
  );
}
