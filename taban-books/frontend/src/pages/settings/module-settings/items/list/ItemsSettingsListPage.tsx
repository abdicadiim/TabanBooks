import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Info, ChevronDown, HelpCircle, Lock, Loader2, Search, Check, Plus, X } from "lucide-react";
import { getToken, API_BASE_URL, getCurrentUser } from "../../../../../services/auth";
import toast from "react-hot-toast";
import DatePicker from "../../../../../components/DatePicker";
import TabanSelect from "../../../../../components/TabanSelect";

interface OrganizationUser {
  id: string;
  name: string;
  email: string;
}

interface ItemFieldConfig {
  id: string;
  name: string;
  dataType: string;
  mandatory: boolean;
  showInAllPDFs: boolean;
  status: "Active" | "Inactive";
  locked: boolean;
  availableActions: Array<"configure-access" | "toggle-status" | "toggle-mandatory" | "toggle-pdf">;
}

interface RecordLockConfiguration {
  id: string;
  name: string;
  description: string;
  actionMode: string;
  selectedActions: string[];
  selectedFields: string[];
  roleScope: string;
  selectedRoles: string[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const formatDateForPicker = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    const [year, month, day] = trimmedValue.split("-");
    return `${day}/${month}/${year}`;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmedValue)) {
    const [day, month, year] = trimmedValue.split("/");
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }

  return "";
};

const normalizePickerDate = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  const match = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return "";
  }

  const [, rawDay, rawMonth, rawYear] = match;
  const day = Number(rawDay);
  const month = Number(rawMonth);
  const year = Number(rawYear);
  const parsedDate = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return "";
  }

  return `${rawYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const DEFAULT_ITEM_FIELDS: ItemFieldConfig[] = [
  {
    id: "selling-price",
    name: "Selling Price",
    dataType: "Decimal",
    mandatory: false,
    showInAllPDFs: true,
    status: "Active",
    locked: true,
    availableActions: ["configure-access"],
  },
  {
    id: "purchase-price",
    name: "Purchase Price",
    dataType: "Decimal",
    mandatory: false,
    showInAllPDFs: true,
    status: "Active",
    locked: true,
    availableActions: ["configure-access"],
  },
  {
    id: "sku",
    name: "SKU",
    dataType: "Text Box (Single Line)",
    mandatory: false,
    showInAllPDFs: false,
    status: "Inactive",
    locked: true,
    availableActions: ["toggle-status", "toggle-mandatory"],
  },
  {
    id: "image",
    name: "Image",
    dataType: "Text Box (Single Line)",
    mandatory: false,
    showInAllPDFs: false,
    status: "Active",
    locked: true,
    availableActions: ["toggle-status", "toggle-pdf"],
  },
];

const normalizeDefaultFields = (fields: any[]): ItemFieldConfig[] =>
  DEFAULT_ITEM_FIELDS.map((defaultField) => {
    const savedField = Array.isArray(fields)
      ? fields.find(
          (field) =>
            String(field?.id || "").trim() === defaultField.id ||
            String(field?.name || "").trim() === defaultField.name
        )
      : null;

    if (!savedField) {
      return defaultField;
    }

    return {
      ...defaultField,
      ...savedField,
      mandatory: Boolean(savedField.mandatory),
      showInAllPDFs: Boolean(savedField.showInAllPDFs),
      status: savedField.status === "Inactive" ? "Inactive" : "Active",
      availableActions:
        Array.isArray(savedField.availableActions) && savedField.availableActions.length > 0
          ? savedField.availableActions
          : defaultField.availableActions,
    };
  });

const RECORD_ACTION_MODE_OPTIONS = [
  { name: "Restrict All Actions" },
  { name: "Restrict Selected Actions" },
  { name: "Allow Selected Actions" },
  { name: "Allow All Actions" },
];

const RECORD_ROLE_SCOPE_OPTIONS = [
  { name: "All Roles" },
  { name: "All Roles Except" },
  { name: "Specific Roles" },
];

const RECORD_ACTION_OPTIONS = ["Default", "Edit", "Delete"];
const generalSectionClass =
  "rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm sm:px-6";

const createDefaultRecordLockConfiguration = (
  selectedFields: string[] = []
): RecordLockConfiguration => ({
  id: "",
  name: "",
  description: "",
  actionMode: "Restrict All Actions",
  selectedActions: [],
  selectedFields,
  roleScope: "All Roles",
  selectedRoles: [],
});

function SearchableMultiSelect({
  placeholder,
  options,
  selectedValues,
  onChange,
  emptyMessage = "No options found.",
}: {
  placeholder: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  emptyMessage?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchValue("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchValue.trim().toLowerCase())
  );

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((item) => item !== value));
      return;
    }

    onChange([...selectedValues, value]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setSearchValue("");
        }}
        className="w-full h-11 px-3 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={selectedValues.length > 0 ? "text-sm text-gray-900 truncate" : "text-sm text-gray-400 truncate"}>
          {selectedValues.length > 0 ? selectedValues.join(", ") : placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search"
                className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleValue(option)}
                    className={`w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left text-sm ${
                      isSelected ? "bg-[#f1f3f6] text-gray-900" : "text-gray-700 hover:bg-[#f1f3f6]"
                    }`}
                  >
                    <span className="truncate">{option}</span>
                    {isSelected && <Check size={16} className="text-gray-900 flex-shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500">{emptyMessage}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ItemsPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  
  // General tab states
  const [decimalPlaces, setDecimalPlaces] = useState("2");
  const [allowDuplicateNames, setAllowDuplicateNames] = useState(false);
  const [enableEnhancedSearch, setEnableEnhancedSearch] = useState(false);
  const [enablePriceLists, setEnablePriceLists] = useState(false);
  const [enableInventoryTracking, setEnableInventoryTracking] = useState(true);
  const [inventoryStartDate, setInventoryStartDate] = useState("");
  const [preventNegativeStock, setPreventNegativeStock] = useState(true);
  const [showOutOfStockWarning, setShowOutOfStockWarning] = useState(false);
  const [notifyReorderPoint, setNotifyReorderPoint] = useState(false);
  const [notifyReorderPointEmail, setNotifyReorderPointEmail] = useState("");
  const [organizationUsers, setOrganizationUsers] = useState<OrganizationUser[]>([]);
  const [showNotifyRecipientDropdown, setShowNotifyRecipientDropdown] = useState(false);
  const [notifyRecipientSearch, setNotifyRecipientSearch] = useState("");
  const [trackLandedCost, setTrackLandedCost] = useState(false);
  
  // Field Customization tab states
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [defaultFields, setDefaultFields] = useState<ItemFieldConfig[]>(DEFAULT_ITEM_FIELDS);
  const [activeFieldActionId, setActiveFieldActionId] = useState<string | null>(null);
  const customFieldsUsage = customFields.length;
  const maxCustomFields = 135;

  // Record locking states
  const [recordLockConfigurations, setRecordLockConfigurations] = useState<RecordLockConfiguration[]>([]);
  const [showRecordLockModal, setShowRecordLockModal] = useState(false);
  const [recordLockForm, setRecordLockForm] = useState<RecordLockConfiguration>(
    createDefaultRecordLockConfiguration()
  );
  const [roleOptions, setRoleOptions] = useState<string[]>([
    "Taban Books - Admin",
    "Taban Books - Staff",
    "Taban Books - TimesheetStaff",
    "Taban Books - Staff (Assigned Customers Only)",
  ]);
  
  // Custom Buttons tab states
  const [customButtons, setCustomButtons] = useState<any[]>([]);
  const [showNewButtonDropdown, setShowNewButtonDropdown] = useState(false);
  const [locationFilter, setLocationFilter] = useState("All");
  const newButtonDropdownRef = useRef<HTMLDivElement | null>(null);
  const notifyRecipientDropdownRef = useRef<HTMLDivElement | null>(null);
  const fieldActionDropdownRef = useRef<HTMLDivElement | null>(null);
  
  // Related Lists tab states
  const [relatedLists, setRelatedLists] = useState<any[]>([]);
  const [showNewRelatedListDropdown, setShowNewRelatedListDropdown] = useState(false);
  const newRelatedListDropdownRef = useRef<HTMLDivElement | null>(null);

  const getPreferredNotificationEmail = (users: OrganizationUser[]) => {
    const currentUserEmail = normalizeEmail(currentUser?.email || "");
    const matchingUserEmail = users.find(
      (user) => normalizeEmail(user.email) === currentUserEmail
    )?.email;

    return matchingUserEmail || currentUser?.email || users[0]?.email || "";
  };

  const filteredOrganizationUsers = organizationUsers.filter((user) => {
    const searchValue = notifyRecipientSearch.trim().toLowerCase();
    if (!searchValue) {
      return true;
    }

    return (
      user.name.toLowerCase().includes(searchValue) ||
      user.email.toLowerCase().includes(searchValue)
    );
  });

  const selectedNotifyUser = organizationUsers.find(
    (user) => normalizeEmail(user.email) === normalizeEmail(notifyReorderPointEmail)
  );
  const availableFieldNames = [
    ...defaultFields.map((field) => field.name),
    ...customFields
      .map((field: any) => String(field?.name || "").trim())
      .filter(Boolean),
  ];
  const requiresSelectedActions = [
    "Restrict Selected Actions",
    "Allow Selected Actions",
  ].includes(recordLockForm.actionMode);
  const requiresRoleSelection = recordLockForm.roleScope !== "All Roles";

  const updateDefaultField = (fieldId: string, updates: Partial<ItemFieldConfig>) => {
    setDefaultFields((currentFields) =>
      currentFields.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    );
  };

  const updateCustomField = (index: number, updates: Record<string, unknown>) => {
    setCustomFields((currentFields) =>
      currentFields.map((field: any, fieldIndex: number) =>
        fieldIndex === index ? { ...field, ...updates } : field
      )
    );
  };

  const openRecordLockModal = (selectedFields: string[] = []) => {
    setRecordLockForm(createDefaultRecordLockConfiguration(selectedFields));
    setShowRecordLockModal(true);
    setActiveFieldActionId(null);
  };

  const openConfigureAccessModal = (fieldName: string) => {
    setRecordLockForm({
      ...createDefaultRecordLockConfiguration([fieldName]),
      actionMode: "Restrict Selected Actions",
      selectedActions: ["Edit"],
    });
    setShowRecordLockModal(true);
    setActiveFieldActionId(null);
  };

  const handleSaveRecordLockConfiguration = () => {
    if (!recordLockForm.name.trim()) {
      toast.error("Enter a lock configuration name");
      return;
    }

    if (requiresSelectedActions && recordLockForm.selectedActions.length === 0) {
      toast.error("Select at least one action");
      return;
    }

    if (requiresSelectedActions && recordLockForm.selectedFields.length === 0) {
      toast.error("Select at least one field");
      return;
    }

    if (requiresRoleSelection && recordLockForm.selectedRoles.length === 0) {
      toast.error("Select at least one role");
      return;
    }

    const nextConfiguration: RecordLockConfiguration = {
      ...recordLockForm,
      id: recordLockForm.id || `lock-${Date.now()}`,
      name: recordLockForm.name.trim(),
      description: recordLockForm.description.trim(),
    };

    setRecordLockConfigurations((currentConfigurations) => {
      const hasExisting = currentConfigurations.some(
        (configuration) => configuration.id === nextConfiguration.id
      );

      if (hasExisting) {
        return currentConfigurations.map((configuration) =>
          configuration.id === nextConfiguration.id ? nextConfiguration : configuration
        );
      }

      return [...currentConfigurations, nextConfiguration];
    });

    setShowRecordLockModal(false);
    setRecordLockForm(createDefaultRecordLockConfiguration());
    toast.success("Lock configuration added");
  };

  // Load settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = getToken();
        if (!token) {
          toast.error("Please login to access settings");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/settings/items`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const settings = data.data;
            setDecimalPlaces(settings.decimalPlaces || "2");
            setAllowDuplicateNames(settings.allowDuplicateNames !== undefined ? settings.allowDuplicateNames : false);
            setEnableEnhancedSearch(settings.enableEnhancedSearch || false);
            setEnablePriceLists(settings.enablePriceLists || false);
            setEnableInventoryTracking(settings.enableInventoryTracking !== undefined ? settings.enableInventoryTracking : true);
            setInventoryStartDate(formatDateForPicker(settings.inventoryStartDate || ""));
            setPreventNegativeStock(settings.preventNegativeStock !== undefined ? settings.preventNegativeStock : true);
            setShowOutOfStockWarning(settings.showOutOfStockWarning || false);
            setNotifyReorderPoint(settings.notifyReorderPoint || false);
            setNotifyReorderPointEmail(settings.notifyReorderPointEmail || "");
            setTrackLandedCost(settings.trackLandedCost || false);
            setDefaultFields(
              Array.isArray(settings.defaultFields) && settings.defaultFields.length > 0
                ? normalizeDefaultFields(settings.defaultFields)
                : DEFAULT_ITEM_FIELDS
            );
            setCustomFields(settings.customFields || []);
            setCustomButtons(settings.customButtons || []);
            setRelatedLists(settings.relatedLists || []);
            setRecordLockConfigurations(settings.recordLockConfigurations || []);
          }
        } else {
          toast.error("Failed to load items settings");
        }
      } catch (error) {
        console.error("Error fetching items settings:", error);
        toast.error("Error loading items settings");
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchOrganizationUsers = async () => {
      try {
        const token = getToken();
        if (!token) {
          return;
        }

        const response = await fetch(`${API_BASE_URL}/settings/users?status=active`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const users = data.data
            .filter((user: any) => user?.email)
            .map((user: any) => ({
              id: String(user.id || user._id || user.email),
              name: String(user.name || user.email),
              email: String(user.email),
            }));

          setOrganizationUsers(users);
        }
      } catch (error) {
        console.error("Error fetching organization users:", error);
      }
    };

    fetchOrganizationUsers();
  }, []);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = getToken();
        if (!token) {
          return;
        }

        const response = await fetch(`${API_BASE_URL}/roles`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const nextRoleOptions = data.data
            .map((role: any) => String(role?.name || "").trim())
            .filter(Boolean)
            .map((roleName: string) => `Taban Books - ${roleName}`);

          if (nextRoleOptions.length > 0) {
            setRoleOptions(nextRoleOptions);
          }
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    };

    fetchRoles();
  }, []);

  useEffect(() => {
    if (!notifyReorderPoint || notifyReorderPointEmail) {
      return;
    }

    const preferredEmail = getPreferredNotificationEmail(organizationUsers);
    if (preferredEmail) {
      setNotifyReorderPointEmail(preferredEmail);
    }
  }, [notifyReorderPoint, notifyReorderPointEmail, organizationUsers]);

  // Save settings
  const handleSave = async () => {
    const normalizedNotifyReorderPointEmail = normalizeEmail(notifyReorderPointEmail);
    const normalizedInventoryStartDate = normalizePickerDate(inventoryStartDate);

    if (enableInventoryTracking && !normalizedInventoryStartDate) {
      toast.error("Choose an inventory start date");
      return;
    }

    if (notifyReorderPoint && !normalizedNotifyReorderPointEmail) {
      toast.error("Select who should receive reorder point notifications");
      return;
    }

    if (normalizedNotifyReorderPointEmail && !EMAIL_REGEX.test(normalizedNotifyReorderPointEmail)) {
      toast.error("Enter a valid notification email");
      return;
    }

    try {
      setSaving(true);
      const token = getToken();
      if (!token) {
        toast.error("Please login to save settings");
        return;
      }

      const payload = {
        decimalPlaces,
        allowDuplicateNames,
        enableEnhancedSearch,
        enablePriceLists,
        enableInventoryTracking,
        inventoryStartDate: normalizedInventoryStartDate,
        preventNegativeStock,
        showOutOfStockWarning,
        notifyReorderPoint,
        notifyReorderPointEmail: normalizedNotifyReorderPointEmail,
        trackLandedCost,
        defaultFields,
        customFields,
        customButtons,
        relatedLists,
        recordLockConfigurations,
      };

      const response = await fetch(`${API_BASE_URL}/settings/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifyReorderPointEmail(normalizedNotifyReorderPointEmail);
          toast.success("Items settings saved successfully!");
        } else {
          toast.error(data.message || "Failed to save settings");
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving items settings:", error);
      toast.error("Error saving items settings");
    } finally {
      setSaving(false);
    }
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (newButtonDropdownRef.current && !newButtonDropdownRef.current.contains(target)) {
        setShowNewButtonDropdown(false);
      }
      if (newRelatedListDropdownRef.current && !newRelatedListDropdownRef.current.contains(target)) {
        setShowNewRelatedListDropdown(false);
      }
      if (notifyRecipientDropdownRef.current && !notifyRecipientDropdownRef.current.contains(target)) {
        setShowNotifyRecipientDropdown(false);
        setNotifyRecipientSearch("");
      }
      if (fieldActionDropdownRef.current && !fieldActionDropdownRef.current.contains(target)) {
        setActiveFieldActionId(null);
      }
    };
    if (showNewButtonDropdown || showNewRelatedListDropdown || showNotifyRecipientDropdown || activeFieldActionId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNewButtonDropdown, showNewRelatedListDropdown, showNotifyRecipientDropdown, activeFieldActionId]);

  return (
    <div className="min-h-full px-6 py-6 pb-28 xl:px-8">
      <div className="w-full max-w-6xl">
        <div className="mb-8 max-w-3xl">
          <h1 className="text-2xl font-semibold text-gray-900">Items</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Configure how item records behave across inventory, pricing, field access, and
            related workflows.
          </p>
        </div>

      {activeTab === "general" && (
      <div className="max-w-5xl space-y-5">
          {/* Set decimal rate for item quantity */}
          <section className={generalSectionClass}>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Set a decimal rate for your item quantity:
            </label>
            <div className="relative w-32">
              <select
                value={decimalPlaces}
                onChange={(e) => setDecimalPlaces(e.target.value)}
                className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </section>

          {/* Duplicate Item Name */}
          <section className={generalSectionClass}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDuplicateNames}
                onChange={(e) => setAllowDuplicateNames(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Allow duplicate item names
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  If you allow duplicate item names, all imports involving items will use SKU as the primary field for mapping.
                </p>
                {allowDuplicateNames && (
                  <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-gray-700">
                      Before you enable this option, make the{" "}
                      <a href="#" className="text-blue-600 hover:underline">SKU field active and mandatory</a>.
                    </p>
                  </div>
                )}
              </div>
            </label>
          </section>

          {/* Enhanced Item Search */}
          <section className={generalSectionClass}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableEnhancedSearch}
                onChange={(e) => setEnableEnhancedSearch(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    Enable Enhanced Item Search
                  </span>
                  <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded">NEW</span>
                </div>
                {enableEnhancedSearch && (
                  <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-gray-700">
                      Enabling this option makes it easier to find any item using relevant keywords in any order.
                    </p>
                  </div>
                )}
              </div>
            </label>
          </section>

          {/* Price Lists */}
          <section className={generalSectionClass}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enablePriceLists}
                onChange={(e) => setEnablePriceLists(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    Enable Price Lists
                  </span>
                  <Info size={14} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Price Lists enables you to customise the rates of the items in your sales and purchase transactions.
                </p>
              </div>
            </label>
          </section>

          {/* Inventory */}
          <section className={generalSectionClass}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableInventoryTracking}
                onChange={(e) => setEnableInventoryTracking(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Enable Inventory Tracking
                </span>
                {enableInventoryTracking && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Inventory Start Date <span className="text-red-500">*</span>
                        </label>
                        <Info size={14} className="text-gray-400" />
                      </div>
                      <div className="flex items-center gap-3 max-w-sm">
                        <DatePicker
                          value={inventoryStartDate}
                          onChange={setInventoryStartDate}
                          placeholder="Select date"
                        />
                        {inventoryStartDate && (
                          <button
                            type="button"
                            onClick={() => setInventoryStartDate("")}
                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Additional Inventory Options */}
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preventNegativeStock}
                          onChange={(e) => setPreventNegativeStock(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">
                            Prevent stock from going below zero
                          </span>
                          <Info size={14} className="text-gray-400" />
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showOutOfStockWarning}
                          onChange={(e) => setShowOutOfStockWarning(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">
                            Show an Out of Stock warning when an item's stock drops below zero
                          </span>
                          <Info size={14} className="text-gray-400" />
                        </div>
                      </label>

                      <div className="flex items-start gap-3">
                        <input
                          id="notify-reorder-point"
                          type="checkbox"
                          checked={notifyReorderPoint}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setNotifyReorderPoint(checked);

                            if (!checked) {
                              setShowNotifyRecipientDropdown(false);
                              setNotifyRecipientSearch("");
                              return;
                            }

                            if (!notifyReorderPointEmail) {
                              const preferredEmail = getPreferredNotificationEmail(organizationUsers);
                              if (preferredEmail) {
                                setNotifyReorderPointEmail(preferredEmail);
                              }
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                        />
                        <div className="flex-1">
                          <label
                            htmlFor="notify-reorder-point"
                            className="text-sm text-gray-900 cursor-pointer"
                          >
                            Notify me if an item's quantity reaches the reorder point
                          </label>

                          {notifyReorderPoint && (
                            <div className="mt-3 max-w-md" ref={notifyRecipientDropdownRef}>
                              <label className="block text-sm font-medium text-red-500 mb-2">
                                Notify to<span className="text-red-500">*</span>
                              </label>

                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowNotifyRecipientDropdown((prev) => !prev);
                                    setNotifyRecipientSearch("");
                                  }}
                                  className="w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <span className={notifyReorderPointEmail ? "text-sm text-gray-900 truncate" : "text-sm text-gray-400 truncate"}>
                                    {selectedNotifyUser?.email || notifyReorderPointEmail || "Select a notification email"}
                                  </span>
                                  <ChevronDown
                                    size={16}
                                    className={`text-gray-500 transition-transform ${showNotifyRecipientDropdown ? "rotate-180" : ""}`}
                                  />
                                </button>

                                {showNotifyRecipientDropdown && (
                                  <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                                    <div className="p-2 border-b border-gray-100">
                                      <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                          type="text"
                                          value={notifyRecipientSearch}
                                          onChange={(e) => setNotifyRecipientSearch(e.target.value)}
                                          placeholder="Search"
                                          className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                    </div>

                                    <div className="max-h-56 overflow-y-auto">
                                      {filteredOrganizationUsers.length > 0 ? (
                                        filteredOrganizationUsers.map((user) => {
                                          const isSelected =
                                            normalizeEmail(user.email) === normalizeEmail(notifyReorderPointEmail);

                                          return (
                                            <button
                                              key={user.id}
                                              type="button"
                                              onClick={() => {
                                                setNotifyReorderPointEmail(user.email);
                                                setShowNotifyRecipientDropdown(false);
                                                setNotifyRecipientSearch("");
                                              }}
                                              className={`w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left text-sm ${
                                                isSelected
                                                  ? "bg-blue-50 text-blue-700"
                                                  : "text-gray-700 hover:bg-gray-50"
                                              }`}
                                            >
                                              <div className="min-w-0">
                                                <div className="truncate font-medium">{user.email}</div>
                                                <div className="truncate text-xs text-gray-500">{user.name}</div>
                                              </div>
                                              {isSelected && <Check size={16} className="text-blue-600 flex-shrink-0" />}
                                            </button>
                                          );
                                        })
                                      ) : (
                                        <div className="px-3 py-4 text-sm text-gray-500">
                                          No active users found.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={trackLandedCost}
                          onChange={(e) => setTrackLandedCost(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                        />
                        <span className="text-sm text-gray-900">
                          Track landed cost on items
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </label>
          </section>

          {/* Save Button */}
          <div
            className="fixed bottom-0 z-30 border-t border-gray-200 bg-white/95 px-6 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur supports-[backdrop-filter]:bg-white/80"
            style={{ left: "16rem", right: 0 }}
          >
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex min-h-[38px] items-center gap-2 rounded-[10px] !bg-[#22c55e] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:!bg-[#1fb157] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: "#22c55e", color: "#ffffff" }}
            >
              {saving && <Loader2 className="animate-spin" size={16} />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
      {/* Record Locking Tab Content */}
      {activeTab === "record-locking" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {recordLockConfigurations.length === 0 ? (
            <div className="py-20 px-6 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center mb-6">
                <Lock size={34} className="text-blue-600" />
              </div>
              <h3 className="text-3xl text-gray-900 mb-4">Record Locking</h3>
              <p className="max-w-2xl text-base text-gray-600 leading-8">
                Record Locking helps you control updates to records. You can specify which actions and field updates to allow or restrict after records are locked, and choose who can perform these actions. This is useful for protecting important information and preventing accidental changes.
              </p>
              <button
                onClick={() => openRecordLockModal()}
                className="mt-8 px-5 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={16} />
                New Lock Configuration
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-end">
                <button
                  onClick={() => openRecordLockModal()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus size={16} />
                  New Lock Configuration
                </button>
              </div>
              {recordLockConfigurations.map((configuration) => (
                <div key={configuration.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{configuration.name}</h3>
                      {configuration.description && (
                        <p className="text-sm text-gray-600 mt-1">{configuration.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRecordLockForm(configuration);
                        setShowRecordLockModal(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-gray-400 uppercase tracking-wide text-xs mb-1">Actions</p>
                      <p className="text-gray-700">{configuration.actionMode}</p>
                      {configuration.selectedActions.length > 0 && (
                        <p className="text-gray-500 mt-1">{configuration.selectedActions.join(", ")}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-400 uppercase tracking-wide text-xs mb-1">Fields</p>
                      <p className="text-gray-700">
                        {configuration.selectedFields.length > 0
                          ? configuration.selectedFields.join(", ")
                          : "All Fields"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 uppercase tracking-wide text-xs mb-1">Roles</p>
                      <p className="text-gray-700">{configuration.roleScope}</p>
                      {configuration.selectedRoles.length > 0 && (
                        <p className="text-gray-500 mt-1">{configuration.selectedRoles.join(", ")}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showRecordLockModal && (
            <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <h2 className="text-3xl text-gray-900">New Lock Configuration</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecordLockModal(false);
                      setRecordLockForm(createDefaultRecordLockConfiguration());
                    }}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-4 items-start">
                    <label className="pt-2 text-red-500 text-sm font-medium">
                      Lock Configuration Name*
                    </label>
                    <input
                      type="text"
                      value={recordLockForm.name}
                      onChange={(e) => setRecordLockForm((currentForm) => ({ ...currentForm, name: e.target.value }))}
                      className="h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-4 items-start">
                    <label className="pt-2 text-sm text-gray-700 font-medium">
                      Description
                    </label>
                    <textarea
                      value={recordLockForm.description}
                      onChange={(e) => setRecordLockForm((currentForm) => ({ ...currentForm, description: e.target.value }))}
                      className="min-h-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div className="border-t border-gray-200 pt-6 space-y-5">
                    <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-4 items-start">
                      <label className="pt-2 text-red-500 text-sm font-medium">
                        Allow or Restrict Actions*
                      </label>
                      <TabanSelect
                        value={recordLockForm.actionMode}
                        onChange={(value) =>
                          setRecordLockForm((currentForm) => ({
                            ...currentForm,
                            actionMode: value,
                            selectedActions: ["Restrict Selected Actions", "Allow Selected Actions"].includes(value)
                              ? currentForm.selectedActions
                              : [],
                            selectedFields: ["Restrict Selected Actions", "Allow Selected Actions"].includes(value)
                              ? currentForm.selectedFields
                              : [],
                          }))
                        }
                        options={RECORD_ACTION_MODE_OPTIONS}
                        placeholder="Select actions rule"
                      />
                    </div>

                    {requiresSelectedActions && (
                      <>
                        <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-4 items-start">
                          <label className="pt-2 text-red-500 text-sm font-medium">
                            Select restricted actions*
                          </label>
                          <SearchableMultiSelect
                            placeholder="Select restricted actions"
                            options={RECORD_ACTION_OPTIONS}
                            selectedValues={recordLockForm.selectedActions}
                            onChange={(values) =>
                              setRecordLockForm((currentForm) => ({ ...currentForm, selectedActions: values }))
                            }
                          />
                        </div>

                        <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-4 items-start">
                          <label className="pt-2 text-red-500 text-sm font-medium">
                            Allow or Restrict Fields*
                          </label>
                          <SearchableMultiSelect
                            placeholder="Select fields"
                            options={availableFieldNames}
                            selectedValues={recordLockForm.selectedFields}
                            onChange={(values) =>
                              setRecordLockForm((currentForm) => ({ ...currentForm, selectedFields: values }))
                            }
                          />
                        </div>
                      </>
                    )}

                    <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-4 items-start">
                      <label className="pt-2 text-red-500 text-sm font-medium">
                        Lock Records For*
                      </label>
                      <div className="space-y-3">
                        <TabanSelect
                          value={recordLockForm.roleScope}
                          onChange={(value) =>
                            setRecordLockForm((currentForm) => ({
                              ...currentForm,
                              roleScope: value,
                              selectedRoles: value === "All Roles" ? [] : currentForm.selectedRoles,
                            }))
                          }
                          options={RECORD_ROLE_SCOPE_OPTIONS}
                          placeholder="Select role scope"
                        />

                        {requiresRoleSelection && (
                          <SearchableMultiSelect
                            placeholder="Select Roles"
                            options={roleOptions}
                            selectedValues={recordLockForm.selectedRoles}
                            onChange={(values) =>
                              setRecordLockForm((currentForm) => ({ ...currentForm, selectedRoles: values }))
                            }
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveRecordLockConfiguration}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecordLockModal(false);
                      setRecordLockForm(createDefaultRecordLockConfiguration());
                    }}
                    className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Field Customization Tab Content */}
      {activeTab === "field-customization" && (
        <div>
          {/* Header with button */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Custom Fields Usage: {customFieldsUsage}/{maxCustomFields}
            </div>
            <button
              onClick={() => navigate("/settings/items/new-field")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Custom Field
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    FIELD NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    DATA TYPE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    MANDATORY
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    SHOW IN ALL PDFS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    STATUS
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {defaultFields.map((field, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                      {field.locked && <Lock size={14} className="text-gray-400" />}
                      {field.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory ? "Yes" : "No"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.showInAllPDFs ? "Yes" : "No"}</td>
                    <td className={`px-6 py-4 text-sm ${field.status === "Active" ? "text-green-600" : "text-gray-800"}`}>
                      {field.status}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div
                        className="relative inline-flex"
                        ref={activeFieldActionId === field.id ? fieldActionDropdownRef : null}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveFieldActionId((currentId) =>
                              currentId === field.id ? null : field.id
                            )
                          }
                          className="w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow"
                        >
                          <ChevronDown size={14} />
                        </button>

                        {activeFieldActionId === field.id && (
                          <div className="absolute top-full right-0 mt-2 min-w-[180px] bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                            {field.availableActions.includes("configure-access") && (
                              <button
                                type="button"
                                onClick={() => openConfigureAccessModal(field.name)}
                                className="w-full px-4 py-3 text-left text-sm text-white bg-blue-500 hover:bg-blue-600"
                              >
                                Configure Access
                              </button>
                            )}
                            {field.availableActions.includes("toggle-status") && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateDefaultField(field.id, {
                                    status: field.status === "Active" ? "Inactive" : "Active",
                                  });
                                  setActiveFieldActionId(null);
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {field.status === "Active" ? "Mark as Inactive" : "Mark as Active"}
                              </button>
                            )}
                            {field.availableActions.includes("toggle-mandatory") && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateDefaultField(field.id, {
                                    mandatory: !field.mandatory,
                                  });
                                  setActiveFieldActionId(null);
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {field.mandatory ? "Mark As Optional" : "Mark As Mandatory"}
                              </button>
                            )}
                            {field.availableActions.includes("toggle-pdf") && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateDefaultField(field.id, {
                                    showInAllPDFs: !field.showInAllPDFs,
                                  });
                                  setActiveFieldActionId(null);
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {field.showInAllPDFs ? "Hide from All PDFs" : "Show in All PDFs"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {customFields.length > 0 && customFields.map((field, index) => (
                  <tr key={`custom-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{field.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory ? "Yes" : "No"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.showInAllPDFs ? "Yes" : "No"}</td>
                    <td className={`px-6 py-4 text-sm ${(field.status || "Active") === "Active" ? "text-green-600" : "text-gray-800"}`}>
                      {field.status || "Active"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div
                        className="relative inline-flex"
                        ref={activeFieldActionId === `custom-${index}` ? fieldActionDropdownRef : null}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveFieldActionId((currentId) =>
                              currentId === `custom-${index}` ? null : `custom-${index}`
                            )
                          }
                          className="w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow"
                        >
                          <ChevronDown size={14} />
                        </button>

                        {activeFieldActionId === `custom-${index}` && (
                          <div className="absolute top-full right-0 mt-2 min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => openConfigureAccessModal(field.name)}
                              className="w-full px-4 py-3 text-left text-sm text-white bg-blue-500 hover:bg-blue-600"
                            >
                              Configure Access
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateCustomField(index, {
                                  status: (field.status || "Active") === "Active" ? "Inactive" : "Active",
                                });
                                setActiveFieldActionId(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              {(field.status || "Active") === "Active" ? "Mark as Inactive" : "Mark as Active"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateCustomField(index, { mandatory: !field.mandatory });
                                setActiveFieldActionId(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              {field.mandatory ? "Mark As Optional" : "Mark As Mandatory"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateCustomField(index, { showInAllPDFs: !field.showInAllPDFs });
                                setActiveFieldActionId(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              {field.showInAllPDFs ? "Hide from All PDFs" : "Show in All PDFs"}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Buttons Tab Content */}
      {activeTab === "custom-buttons" && (
        <div>
          {/* Header with actions */}
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <div className="flex items-center gap-3">
              <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                What's this?
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                View Logs
              </button>
              {/* Split Button: New Button */}
              <div className="relative" ref={newButtonDropdownRef}>
                <div className="flex">
                  <button
                    onClick={() => {
                      // Handle new button creation
                      setShowNewButtonDropdown(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-l-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <span className="text-lg">+</span>
                    New
                  </button>
                  <button
                    onClick={() => setShowNewButtonDropdown(!showNewButtonDropdown)}
                    className="px-2 py-2 text-sm font-medium text-white bg-red-600 rounded-r-lg hover:bg-red-700 border-l border-red-500"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showNewButtonDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px]">
                    <button
                      onClick={() => {
                        // Handle new button
                        setShowNewButtonDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    >
                      New Button
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Location :</label>
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="h-9 px-3 pr-8 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="All">All</option>
                  <option value="Details Page Menu">Details Page Menu</option>
                  <option value="List Page">List Page</option>
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    BUTTON NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    ACCESS PERMISSION
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    LOCATION
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customButtons.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <p className="text-gray-500 text-sm">
                        Create buttons which perform actions set by you. What are you waiting for!
                      </p>
                    </td>
                  </tr>
                ) : (
                  customButtons.map((button, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{button.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{button.accessPermission}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{button.location}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Related Lists Tab Content */}
      {activeTab === "related-lists" && (
        <div>
          {/* Header with dropdown button */}
          <div className="flex items-center justify-end mb-6">
            <button
              onClick={() => {
                // Handle new related list creation
              }}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Related List
            </button>
          </div>

          {/* Empty State with Illustration */}
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center py-12">
              {/* Illustration */}
              <div className="relative mb-8 flex items-center justify-center" style={{ width: "200px", height: "200px" }}>
                {/* Window/Frame element (background) */}
                <div 
                  className="absolute rounded-lg border-2 border-gray-300 bg-gray-50"
                  style={{
                    width: "120px",
                    height: "100px",
                    transform: "rotate(-2deg)",
                    left: "60px",
                    top: "30px",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                  }}
                >
                  {/* Window grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-2">
                    <div className="w-full h-px bg-gray-300 mb-2"></div>
                    <div className="w-full h-px bg-gray-300"></div>
                  </div>
                  <div className="absolute inset-0 flex justify-center items-center">
                    <div className="h-full w-px bg-gray-300"></div>
                  </div>
                </div>
                
                {/* Person figure */}
                <div className="relative z-10" style={{ left: "-20px", top: "10px" }}>
                  {/* Head */}
                  <div 
                    className="absolute rounded-full"
                    style={{
                      width: "50px",
                      height: "50px",
                      backgroundColor: "#fbbf24", // Pink-ish for hair
                      top: "0px",
                      left: "15px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  >
                    {/* Face */}
                    <div 
                      className="absolute rounded-full bg-white"
                      style={{
                        width: "35px",
                        height: "35px",
                        top: "8px",
                        left: "7.5px"
                      }}
                    >
                      {/* Eyes */}
                      <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                      {/* Mouth */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-1 border-b-2 border-gray-700 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Body (red shirt) */}
                  <div 
                    className="absolute rounded-lg"
                    style={{
                      width: "60px",
                      height: "70px",
                      backgroundColor: "#ef4444", // Red
                      top: "45px",
                      left: "10px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  ></div>
                  
                  {/* Arms holding circle */}
                  <div 
                    className="absolute rounded-full border-4 border-blue-500 bg-blue-100"
                    style={{
                      width: "50px",
                      height: "50px",
                      top: "60px",
                      left: "50px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  >
                    {/* Plus sign */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-0.5 bg-white"></div>
                      <div className="absolute w-0.5 h-6 bg-white"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Text */}
              <p className="text-sm text-gray-600 text-center mb-8 max-w-md">
                Create custom related lists to access relevant information available from inside or outside the application.
              </p>

              {/* New Related List Button */}
              <button
                onClick={() => {
                  // Handle new related list creation
                }}
                className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                New Related List
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}




