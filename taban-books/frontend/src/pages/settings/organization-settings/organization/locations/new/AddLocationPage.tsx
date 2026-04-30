import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../../../../../services/auth";
import { Upload, X, ChevronDown, ChevronUp, Search, Check, Plus } from "lucide-react";
import { toast } from "react-toastify";
import { locationsAPI, settingsAPI, usersAPI } from "../../../../../../services/api";
import { WORLD_COUNTRIES as COUNTRIES } from "../../../../../../constants/locationData";
import SearchableDropdown from "../../../../../../components/ui/SearchableDropdown";
import { readJsonStorage, safeSetJsonStorage } from "../../../../../../utils/storage";
import {
  readLocations,
  writeLocations,
  writeLocationsEnabled,
} from "../storage";

type LocationAddress = {
  attention: string;
  street1: string;
  street2: string;
  city: string;
  zipCode: string;
  country: string;
  state: string;
  phone: string;
  fax: string;
};

type LocationAccessEntry = {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
};

type UserRecord = {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: any;
};

type LocationRecord = {
  _id?: string;
  id?: string;
  name?: string;
  isActive?: boolean;
  address?: Partial<LocationAddress> & Record<string, any>;
  [key: string]: any;
};

type LocationFormState = {
  type: "Business" | "Warehouse";
  logo: string;
  name: string;
  locationCode: string;
  isChildLocation: boolean;
  parentLocation: string;
  address: LocationAddress;
  website: string;
  primaryContact: string;
  transactionSeries: string;
  defaultTransactionSeries: string;
  locationAccess: LocationAccessEntry[];
};

const USER_CACHE_KEY = "taban_users_cache_v1";
const USER_CACHE_KEYS = [USER_CACHE_KEY, "taban_users_cache", "users_cache"];
const ORG_PROFILE_KEYS = ["organization_profile", "org_profile", "organization"];

const safeParse = (value: string | null): any => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeUserRecord = (user: any): UserRecord | null => {
  const id = String(user?._id || user?.id || "").trim();
  if (!id) return null;
  const name = String(user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || id).trim();
  return {
    ...user,
    _id: id,
    id,
    name,
    email: String(user?.email || "").trim(),
    role: user?.role || "User",
  };
};

const readCachedUsers = (): UserRecord[] => {
  const collected: UserRecord[] = [];

  for (const key of USER_CACHE_KEYS) {
    const parsed = readJsonStorage<any>(key, null);
    if (!Array.isArray(parsed)) continue;
    for (const row of parsed) {
      const normalized = normalizeUserRecord(row);
      if (normalized) collected.push(normalized);
    }
    if (collected.length > 0) break;
  }

  const currentUser = getCurrentUser();
  const normalizedCurrentUser = normalizeUserRecord(currentUser);
  if (normalizedCurrentUser && !collected.some((user) => user.id === normalizedCurrentUser.id)) {
    collected.unshift(normalizedCurrentUser);
  }

  const uniqueById = new Map<string, UserRecord>();
  for (const row of collected) {
    uniqueById.set(String(row.id || row._id), row);
  }
  return Array.from(uniqueById.values());
};

const readCachedOrgCountry = (): string => {
  for (const key of ORG_PROFILE_KEYS) {
    const parsed = readJsonStorage<any>(key, null);
    const country = String(
      parsed?.location ||
        parsed?.address?.country ||
        parsed?.country ||
        "",
    ).trim();
    if (country) return country;
  }
  return "";
};

const buildInitialLocationAccess = (user: UserRecord | null): LocationAccessEntry[] => {
  if (!user) return [];
  return [{
    userId: String(user.id || user._id || ""),
    userName: user.name || "",
    userEmail: user.email || "",
    role: user.role || "Admin",
  }];
};

export default function AddLocationPage() {
  const navigate = useNavigate();
  const cachedUsers = readCachedUsers();
  const cachedCurrentUser = cachedUsers[0] || null;
  const cachedOrgCountry = readCachedOrgCountry();
  const [orgCountry, setOrgCountry] = useState<string>(cachedOrgCountry);
  const [formData, setFormData] = useState<LocationFormState>({
    type: "Business",
    logo: "Same as Organization Logo",
    name: "",
    locationCode: "",
    isChildLocation: false,
    parentLocation: "",
    address: {
      attention: "",
      street1: "",
      street2: "",
      city: "",
      zipCode: "",
      country: cachedOrgCountry || "United Kingdom",
      state: "",
      phone: "",
      fax: "",
    },
    website: "",
    primaryContact: String(cachedCurrentUser?.id || cachedCurrentUser?._id || ""),
    transactionSeries: "",
    defaultTransactionSeries: "Default Transaction Series",
    locationAccess: buildInitialLocationAccess(cachedCurrentUser),
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRecord[]>(cachedUsers);
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLogoDropdownOpen, setIsLogoDropdownOpen] = useState<boolean>(false);
  const [parentLocations, setParentLocations] = useState<LocationRecord[]>([]);
  const [isParentLocationDropdownOpen, setIsParentLocationDropdownOpen] = useState<boolean>(false);
  const [parentLocationSearch, setParentLocationSearch] = useState<string>("");
  const [allUsers, setAllUsers] = useState<UserRecord[]>(cachedUsers);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>("");
  const [provideAccessToAll, setProvideAccessToAll] = useState<boolean>(false);
  const rowClass = "grid grid-cols-1 gap-3 md:grid-cols-[170px_360px] md:gap-6 items-center";
  const rowClassStart = "grid grid-cols-1 gap-3 md:grid-cols-[170px_360px] md:gap-6 items-start";
  const rowClassFluid = "grid grid-cols-1 gap-3 md:grid-cols-[170px_minmax(0,1fr)] md:gap-6 items-start";
  const compactFieldRowClass = "grid grid-cols-1 gap-3 md:grid-cols-[220px_minmax(0,420px)] md:gap-5 items-center";
  const compactFieldRowStartClass = "grid grid-cols-1 gap-3 md:grid-cols-[220px_minmax(0,420px)] md:gap-5 items-start";
  const [transactionSeriesList, setTransactionSeriesList] = useState<string[]>(["Default Transaction Series"]);
  const [isTransactionSeriesDropdownOpen, setIsTransactionSeriesDropdownOpen] = useState<boolean>(false);
  const [isDefaultTransactionSeriesDropdownOpen, setIsDefaultTransactionSeriesDropdownOpen] = useState<boolean>(false);
  const [transactionSeriesSearch, setTransactionSeriesSearch] = useState<string>("");
  const [defaultTransactionSeriesSearch, setDefaultTransactionSeriesSearch] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoDropdownRef = useRef<HTMLDivElement | null>(null);
  const parentLocationDropdownRef = useRef<HTMLDivElement | null>(null);
  const userDropdownRef = useRef<HTMLDivElement | null>(null);
  const transactionSeriesDropdownRef = useRef<HTMLDivElement | null>(null);
  const defaultTransactionSeriesDropdownRef = useRef<HTMLDivElement | null>(null);

  // Load users for primary contact dropdown
  useEffect(() => {
    const loadUsers = async () => {
      const currentUser = getCurrentUser();
      const cachedRows = readCachedUsers();

      if (cachedRows.length > 0) {
        setUsers(cachedRows);
        setAllUsers(cachedRows);
        setFormData((prev) => {
          if (prev.primaryContact) return prev;
          const preferredCachedUser =
            cachedRows.find((u: any) => String(u.id || u._id) === String(currentUser?.id)) || cachedRows[0];
          if (!preferredCachedUser) return prev;
          return {
            ...prev,
            primaryContact: String(preferredCachedUser?.id || preferredCachedUser?._id || ""),
            locationAccess:
              prev.locationAccess.length > 0
                ? prev.locationAccess
                : buildInitialLocationAccess(preferredCachedUser),
          };
        });
      }

      try {
        const res = await usersAPI.getAll();
        const rows = Array.isArray(res?.data) ? res.data : [];
        const backendUsers = rows
          .map(normalizeUserRecord)
          .filter(Boolean)
          .filter((user: any) => String(user?.status || "").trim().toLowerCase() === "active");
        safeSetJsonStorage(USER_CACHE_KEY, backendUsers);

        const preferredUser =
          backendUsers.find((u: any) => String(u.id || u._id) === String(currentUser?.id)) || backendUsers[0];

        setUsers(backendUsers);
        setAllUsers(backendUsers);
        if (preferredUser) {
          setFormData(prev => ({
            ...prev,
            primaryContact: String(preferredUser?.id || preferredUser?._id || ""),
            locationAccess:
              prev.locationAccess.length > 0
                ? prev.locationAccess
                : [{
                    userId: String(preferredUser?.id || preferredUser?._id || ""),
                    userName: preferredUser?.name || "",
                    userEmail: preferredUser?.email || "",
                    role: preferredUser?.role || "Admin",
                  }],
          }));
        }
      } catch {
        setUsers([]);
        setAllUsers([]);
      }
    };

    void loadUsers();
  }, []);


  // Load parent locations when Warehouse is selected or child location is checked
  useEffect(() => {
    if (formData.type !== "Warehouse" && !formData.isChildLocation) {
      setParentLocations([]);
      return;
    }

    void (async () => {
      try {
        const res = await locationsAPI.getAll();
        if (res?.success) {
          const rows = Array.isArray(res.data) ? res.data : [];
          writeLocations(rows);
          setParentLocations(rows.filter((row: any) => row?.isActive !== false));
          return;
        }
      } catch {
        // ignore
      }
      setParentLocations(readLocations().filter((row: any) => row?.isActive !== false));
    })();
  }, [formData.type, formData.isChildLocation]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (logoDropdownRef.current && !logoDropdownRef.current.contains(target)) {
        setIsLogoDropdownOpen(false);
      }
      if (parentLocationDropdownRef.current && !parentLocationDropdownRef.current.contains(target)) {
        setIsParentLocationDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setIsUserDropdownOpen(false);
      }
      if (transactionSeriesDropdownRef.current && !transactionSeriesDropdownRef.current.contains(target)) {
        setIsTransactionSeriesDropdownOpen(false);
      }
      if (defaultTransactionSeriesDropdownRef.current && !defaultTransactionSeriesDropdownRef.current.contains(target)) {
        setIsDefaultTransactionSeriesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const loadOrgCountry = async () => {
      const cachedCountry = readCachedOrgCountry();
      if (cachedCountry) {
        setOrgCountry(cachedCountry);
      }

      try {
        const res = await settingsAPI.getOrganizationProfile();
        const country =
          res?.data?.location ||
          res?.data?.address?.country ||
          res?.data?.country ||
          "";
        if (res?.data) {
          safeSetJsonStorage("organization_profile", res.data);
          safeSetJsonStorage("org_profile", res.data);
        }
        if (country) setOrgCountry(String(country));
      } catch {
        // ignore
      }
    };
    void loadOrgCountry();
  }, []);

  useEffect(() => {
    if (!orgCountry) return;
    setFormData((prev) =>
      prev?.address?.country && String(prev.address.country).trim() && String(prev.address.country).trim() !== "United Kingdom"
        ? prev
        : {
            ...prev,
            address: {
              ...prev.address,
              country: orgCountry,
            },
          }
    );
  }, [orgCountry]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else if (name === 'isChildLocation') {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        parentLocation: checked ? prev.parentLocation : "", // Clear parent location if unchecked
      }));
    } else if (name === 'type') {
      // When location type changes, reset child location fields if switching to Business (but keep parent location for Warehouse)
      setFormData(prev => ({
        ...prev,
        type: value as LocationFormState["type"],
        isChildLocation: value === "Warehouse" ? false : prev.isChildLocation,
        // Don't clear parentLocation when switching to Warehouse, but clear if switching to Business and checkbox is unchecked
        parentLocation: (value === "Business" && !prev.isChildLocation) ? "" : prev.parentLocation,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  // Handle logo option selection
  const handleLogoOptionSelect = (option: string) => {
    setFormData(prev => ({ ...prev, logo: option }));
    setIsLogoDropdownOpen(false);
    
    if (option === "Upload a New Logo") {
      // Trigger file input click
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    } else {
      // Clear uploaded logo if switching back
      setLogoImage(null);
      setLogoPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
      if (!validTypes.includes(file.type)) {
        setError('Invalid file type. Please upload jpg, jpeg, png, gif, or bmp files.');
        return;
      }

      // Validate file size (1MB = 1048576 bytes)
      if (file.size > 1048576) {
        setError('File size exceeds 1MB. Please upload a smaller image.');
        return;
      }

      setLogoImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(typeof reader.result === "string" ? reader.result : null);
      };
      reader.readAsDataURL(file);
      setFormData(prev => ({ ...prev, logo: "Upload a New Logo" }));
      setError(null);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveLogo = () => {
    setLogoImage(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFormData(prev => ({ ...prev, logo: "Same as Organization Logo" }));
  };

  // Handle parent location selection
  const handleParentLocationSelect = (locationId: string) => {
    setFormData(prev => ({
      ...prev,
      parentLocation: locationId,
    }));
    setIsParentLocationDropdownOpen(false);
    setParentLocationSearch("");
  };

  // Filter parent locations based on search
  const filteredParentLocations = parentLocations.filter(location =>
    String(location.name || "").toLowerCase().includes(parentLocationSearch.toLowerCase())
  );

  // Get selected parent location name
  const selectedParentLocation = parentLocations.find(loc => loc._id === formData.parentLocation);

  // Handle transaction series selection
  const handleTransactionSeriesSelect = (series: string) => {
    setFormData(prev => ({ ...prev, transactionSeries: series }));
    setIsTransactionSeriesDropdownOpen(false);
    setTransactionSeriesSearch("");
  };

  // Handle default transaction series selection
  const handleDefaultTransactionSeriesSelect = (series: string) => {
    setFormData(prev => ({ ...prev, defaultTransactionSeries: series }));
    setIsDefaultTransactionSeriesDropdownOpen(false);
    setDefaultTransactionSeriesSearch("");
  };

  // Handle add new transaction series
  const handleAddTransactionSeries = () => {
    // Navigate to transaction series preferences page
    navigate('/settings/customization/transaction-number-series');
    setIsTransactionSeriesDropdownOpen(false);
    setIsDefaultTransactionSeriesDropdownOpen(false);
  };

  // Filter transaction series based on search
  const filteredTransactionSeries = transactionSeriesList.filter(series =>
    series.toLowerCase().includes(transactionSeriesSearch.toLowerCase())
  );

  // Filter default transaction series based on search
  const filteredDefaultTransactionSeries = transactionSeriesList.filter(series =>
    series.toLowerCase().includes(defaultTransactionSeriesSearch.toLowerCase())
  );
    const primaryContactOptions = users
      .map((user: any) => {
        const value = String(user._id || user.id || "").trim();
        if (!value) return null;
        const name = String(user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || value).trim();
        const email = String(user.email || "").trim();
        return {
          value,
          label: email ? `${name} (${email})` : name,
        };
      })
      .filter((opt: any): opt is { value: string; label: string } => Boolean(opt));
  const countryOptions = COUNTRIES.map((country) => ({ value: country, label: country }));
  const roleOptions = Array.from(
    new Set(
      allUsers
        .map((user: any) => String(user.role || "").trim())
        .filter(Boolean)
    )
  ).map((role) => ({ value: role, label: role }));

  // Handle user selection for Location Access
  const handleUserSelect = (userId: string) => {
    const user = allUsers.find(u => (u._id || u.id) === userId);
    if (user && !formData.locationAccess.find(access => access.userId === userId)) {
      setFormData(prev => ({
        ...prev,
        locationAccess: [...prev.locationAccess, {
          userId: userId,
          userName: user.name,
          userEmail: user.email,
          role: user.role || "Admin",
        }],
      }));
    }
    setIsUserDropdownOpen(false);
    setUserSearch("");
  };

  // Handle remove user from Location Access
  const handleRemoveUser = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      locationAccess: prev.locationAccess.filter(access => access.userId !== userId),
    }));
  };

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    !formData.locationAccess.find(access => access.userId === (user._id || user.id)) &&
    (user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
     user.email?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      if (!formData.name.trim()) {
        setError('Location name is required');
        setIsSaving(false);
        return;
      }

      // Validate parent location for Warehouse or Business child location
      if ((formData.type === "Warehouse" || (formData.type === "Business" && formData.isChildLocation)) && !formData.parentLocation) {
        setError('Parent Location is required');
        setIsSaving(false);
        return;
      }

      const selectedUser = users.find(u => (u._id || u.id) === formData.primaryContact);
      
      const locationData = {
        name: formData.name.trim(),
        locationCode: formData.locationCode.trim(),
        type: formData.type === "Warehouse" ? "Warehouse" : "Business",
        address: {
          attention: formData.address.attention || "",
          street1: formData.address.street1 || "",
          street2: formData.address.street2 || "",
          city: formData.address.city || "",
          zipCode: formData.address.zipCode || "",
          country: formData.address.country || "United Kingdom",
          state: formData.address.state || "",
          phone: formData.address.phone || "",
          fax: formData.address.fax || "",
        },
        defaultTransactionSeries: formData.defaultTransactionSeries || "Default Transaction Series",
        contactPerson: {
          name: selectedUser?.name || "",
          email: selectedUser?.email || "",
          phone: formData.address.phone || "",
        },
        notes: formData.website ? `Website: ${formData.website}` : "",
        parentLocation: (formData.type === "Warehouse" || (formData.type === "Business" && formData.isChildLocation)) ? formData.parentLocation : null,
        logo: formData.type === "Business" && formData.logo === "Upload a New Logo" && logoPreview ? logoPreview : "",
      };
      const now = new Date().toISOString();
      const localId = `loc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const localRow = {
        ...locationData,
        _id: localId,
        id: localId,
        isActive: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      };

      const created = await locationsAPI.create(localRow);
      if (!created?.success) {
        throw new Error(created?.message || "Failed to create location");
      }

      const list = await locationsAPI.getAll();
      if (list?.success) {
        const rows = Array.isArray(list.data) ? list.data : [];
        writeLocations(rows);
      }

      writeLocationsEnabled(true);
      toast.success("Location created successfully.");
      navigate('/settings/locations');
    } catch (error: unknown) {
      console.error('Error creating location:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while creating the location. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/settings/locations');
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-transparent">
      <div className="w-full max-w-[720px] px-4 sm:px-6 py-3.5 sm:py-5">
        <div className="mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">Add Location</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 pb-24">
        {/* Location Type Section */}
        <div className="bg-transparent rounded-none border-0 p-0 shadow-none">
          <h2 className="text-sm font-semibold text-gray-900 mb-2.5">Location Type</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <label className={`relative flex flex-col p-2.5 rounded-lg cursor-pointer transition min-h-[100px] border ${
              formData.type === "Business"
                ? "bg-blue-50 border-gray-900"
                : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  type="radio"
                  name="type"
                  value="Business"
                  checked={formData.type === "Business"}
                  onChange={handleChange}
                  className="w-3.5 h-3.5 text-blue-600"
                />
                <span className="text-[12px] font-semibold text-gray-900">Business Location</span>
              </div>
              <p className="text-[11px] leading-4 text-gray-600 ml-5">
                A Business Location represents your organization or office's operational location. It is used to record transactions, assess regional performance, and monitor stock levels for items stored at this location.
              </p>
            </label>

            <label className={`relative flex flex-col p-2.5 rounded-lg cursor-pointer transition min-h-[100px] border ${
              formData.type === "Warehouse"
                ? "bg-blue-50 border-gray-900"
                : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  type="radio"
                  name="type"
                  value="Warehouse"
                  checked={formData.type === "Warehouse"}
                  onChange={handleChange}
                  className="w-3.5 h-3.5 text-blue-600"
                />
                <span className="text-[12px] font-semibold text-gray-900">Warehouse Only Location</span>
              </div>
              <p className="text-[11px] leading-4 text-gray-600 ml-5">
                A Warehouse Only Location refers to where your items are stored. It helps track and monitor stock levels for items stored at this location.
              </p>
            </label>
          </div>
        </div>

        {/* Logo Field - Only show for Business Location */}
        {formData.type === "Business" && (
          <div className="bg-transparent rounded-none border-0 p-0 shadow-none">
            <div className={compactFieldRowClass}>
              <label className="text-sm font-medium text-gray-700 pt-1">Logo</label>
              <div className="space-y-1.5">
              {/* Logo Dropdown */}
              <div className="relative" ref={logoDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsLogoDropdownOpen(!isLogoDropdownOpen)}
                  className="w-full px-3 py-1.5 border border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm text-left flex items-center justify-between bg-transparent"
                >
                  <span>{formData.logo}</span>
                  {isLogoDropdownOpen ? (
                    <ChevronUp size={16} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-500" />
                  )}
                </button>

                {isLogoDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg shadow-lg">
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          className="w-full pl-8 pr-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => handleLogoOptionSelect("Same as Organization Logo")}
                        className={`w-full px-3 py-1 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                          formData.logo === "Same as Organization Logo" ? "bg-gray-50" : ""
                        }`}
                      >
                        <span>Same as Organization Logo</span>
                        {formData.logo === "Same as Organization Logo" && (
                          <Check size={16} className="text-gray-900" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLogoOptionSelect("Upload a New Logo")}
                        className={`w-full px-3 py-1 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                          formData.logo === "Upload a New Logo" ? "bg-gray-50" : ""
                        }`}
                      >
                        <span>Upload a New Logo</span>
                        {formData.logo === "Upload a New Logo" && (
                          <Check size={16} className="text-gray-900" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Logo Upload Area - Show when "Upload a New Logo" is selected */}
              {formData.logo === "Upload a New Logo" && (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div 
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-900 transition relative bg-gray-50 p-4"
                    onClick={handleLogoClick}
                  >
                    {logoPreview ? (
                      <>
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="max-w-full max-h-48 object-contain mb-2"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLogo();
                          }}
                          className="mt-2 px-4 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition"
                        >
                          Remove Logo
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload size={32} className="text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Upload your Location Logo</p>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 space-y-1 leading-4">
                    <p>This logo will be displayed in transaction PDFs and email notifications.</p>
                    <p>Preferred Image Dimensions: 240 x 240 pixels @ 72 DPI</p>
                    <p>Supported Files: jpg, jpeg, png, gif, bmp</p>
                    <p>Maximum File Size: 1MB</p>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* Name Field */}
        <div className="bg-transparent rounded-none border-0 p-0 shadow-none">
          <div className={compactFieldRowStartClass}>
            <label className="text-sm font-medium text-red-600 flex items-center pt-0.5">
              <span>Name</span><span className="text-red-600 ml-1">*</span>
            </label>
            <div className="space-y-1.5">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Location Name"
                required
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
              />
              {/* Only show checkbox for Business Location */}
              {formData.type === "Business" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isChildLocation"
                    checked={formData.isChildLocation}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">This is a Child Location</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {formData.type === "Business" && (
          <div className="bg-transparent rounded-none border-0 p-0 shadow-none">
          <div className={compactFieldRowClass}>
              <label className="text-sm font-medium text-gray-900 flex items-center whitespace-nowrap">
                Location Code
              </label>
              <input
                type="text"
                name="locationCode"
                value={formData.locationCode}
                onChange={handleChange}
                placeholder="Location Code"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
              />
            </div>
          </div>
        )}

        {/* Parent Location Field - Show for Warehouse or Business Location when checkbox is checked */}
        {(formData.type === "Warehouse" || (formData.type === "Business" && formData.isChildLocation)) && (
          <div className="bg-transparent rounded-none border-0 p-0 shadow-none">
            <div className="grid grid-cols-1 md:grid-cols-[140px_minmax(0,1fr)] gap-2 md:gap-3 items-center">
              <label className="text-sm font-medium text-red-600 flex items-center">
                <span>Parent Location</span><span className="text-red-600 ml-1">*</span>
              </label>
              <div className="relative" ref={parentLocationDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsParentLocationDropdownOpen(!isParentLocationDropdownOpen)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm text-left flex items-center justify-between bg-transparent"
                >
                  <span className={selectedParentLocation ? "text-gray-900" : "text-gray-500"}>
                    {selectedParentLocation ? selectedParentLocation.name : "Select Location"}
                  </span>
                  {isParentLocationDropdownOpen ? (
                    <ChevronUp size={16} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-500" />
                  )}
                </button>

                {isParentLocationDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-gray-200 sticky top-0 bg-transparent">
                      <div className="relative">
                        <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={parentLocationSearch}
                          onChange={(e) => setParentLocationSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="py-1">
                      {filteredParentLocations.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">NO RESULTS FOUND</div>
                      ) : (
                        filteredParentLocations.map((location) => {
                          const locationId = String(location._id || location.id || "").trim();
                          if (!locationId) return null;
                          return (
                          <button
                            key={locationId}
                            type="button"
                            onClick={() => handleParentLocationSelect(locationId)}
                            className={`w-full px-3 py-1 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                              formData.parentLocation === locationId ? "bg-gray-50" : ""
                            }`}
                          >
                            <span>{location.name || "Untitled Location"}</span>
                            {formData.parentLocation === locationId && (
                              <Check size={16} className="text-gray-900" />
                            )}
                          </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Address Section */}
        <div className="bg-transparent rounded-none border-0 p-0 shadow-none">
          <div className={compactFieldRowStartClass}>
            <label className="text-sm font-medium text-gray-900 pt-2">Address</label>
            <div className="space-y-3">
              <input
                type="text"
                name="address.attention"
                value={formData.address.attention}
                onChange={handleChange}
                placeholder="Attention"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
              />

              <input
                type="text"
                name="address.street1"
                value={formData.address.street1}
                onChange={handleChange}
                placeholder="Street 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
              />

              <input
                type="text"
                name="address.street2"
                value={formData.address.street2}
                onChange={handleChange}
                placeholder="Street 2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  placeholder="City"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                />
                <input
                  type="text"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                  placeholder="ZIP/Postal Code"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                />
              </div>

              <SearchableDropdown
                value={formData.address.country}
                options={countryOptions}
                onChange={(value) => setFormData((prev) => ({
                  ...prev,
                  address: { ...prev.address, country: value },
                }))}
                placeholder="Select Country"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  placeholder="State/Province"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                />
                <input
                  type="text"
                  name="address.phone"
                  value={formData.address.phone}
                  onChange={handleChange}
                  placeholder="Phone"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                />
              </div>

              <input
                type="text"
                name="address.fax"
                value={formData.address.fax}
                onChange={handleChange}
                placeholder="Fax Number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Website URL - Show for both Business and Warehouse */}
        <div className="bg-transparent rounded-none border-0 p-0 shadow-none">
          <div className={compactFieldRowClass}>
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Website URL</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="Website URL"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
            />
          </div>
        </div>

        {/* Primary Contact - Show for both Business and Warehouse */}
        <div className="bg-transparent rounded-none border-0 p-0 shadow-none">
          <div className={compactFieldRowClass}>
            <label className={`text-sm font-medium flex items-center whitespace-nowrap ${formData.type === "Business" ? "text-red-600" : "text-gray-700"}`}>
              <span>Primary Contact</span>{formData.type === "Business" && <span className="text-red-600 ml-1">*</span>}
            </label>
            <div>
              <SearchableDropdown
                value={formData.primaryContact}
                options={primaryContactOptions}
                onChange={(value) => setFormData(prev => ({ ...prev, primaryContact: value }))}
                placeholder="Select Primary Contact"
              />
            </div>
          </div>
        </div>

        {/* Transaction Number Series - Only show for Business Location */}
        {formData.type === "Business" && (
          <>
            {/* Transaction Number Series */}
            <div className="bg-transparent rounded-none border-0 p-0 shadow-none">
          <div className={compactFieldRowClass}>
                <label className="text-sm font-medium text-red-600 flex items-center whitespace-nowrap">
                  <span>Transaction Number Series</span><span className="text-red-600 ml-1">*</span>
                </label>
                <div className="relative" ref={transactionSeriesDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsTransactionSeriesDropdownOpen(!isTransactionSeriesDropdownOpen)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm text-left flex items-center justify-between bg-transparent"
                  >
                    <span className={formData.transactionSeries ? "text-gray-900" : "text-gray-500"}>
                      {formData.transactionSeries || "Add Transaction Series"}
                    </span>
                    {isTransactionSeriesDropdownOpen ? (
                      <ChevronUp size={16} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500" />
                    )}
                  </button>

                  {isTransactionSeriesDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-gray-200 sticky top-0 bg-transparent">
                        <div className="relative">
                          <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={transactionSeriesSearch}
                            onChange={(e) => setTransactionSeriesSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="py-1">
                        {filteredTransactionSeries.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">NO RESULTS FOUND</div>
                        ) : (
                          filteredTransactionSeries.map((series, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleTransactionSeriesSelect(series)}
                              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                                formData.transactionSeries === series ? "bg-gray-50" : ""
                              }`}
                            >
                              <span>{series}</span>
                              {formData.transactionSeries === series && (
                                <Check size={16} className="text-gray-900" />
                              )}
                            </button>
                          ))
                        )}
                        <button
                          type="button"
                          onClick={handleAddTransactionSeries}
                            className="w-full px-3 py-1 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-900 border-t border-gray-200 mt-1 pt-1.5"
                        >
                          <Plus size={16} className="text-gray-900" />
                          <span>Add Transaction Series</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Default Transaction Number Series */}
            <div className="bg-transparent rounded-none border-0 p-0 shadow-none">
          <div className={compactFieldRowClass}>
                <label className="text-sm font-medium text-red-600 flex items-center whitespace-nowrap">
                  <span>Default Transaction Number Series</span><span className="text-red-600 ml-1">*</span>
                </label>
                <div className="relative" ref={defaultTransactionSeriesDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDefaultTransactionSeriesDropdownOpen(!isDefaultTransactionSeriesDropdownOpen)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm text-left flex items-center justify-between bg-transparent"
                  >
                    <span className={formData.defaultTransactionSeries ? "text-gray-900" : "text-gray-500"}>
                      {formData.defaultTransactionSeries || "Default Transaction Series"}
                    </span>
                    {isDefaultTransactionSeriesDropdownOpen ? (
                      <ChevronUp size={16} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500" />
                    )}
                  </button>

                  {isDefaultTransactionSeriesDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-gray-200 sticky top-0 bg-transparent">
                        <div className="relative">
                          <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={defaultTransactionSeriesSearch}
                            onChange={(e) => setDefaultTransactionSeriesSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="py-1">
                        {filteredDefaultTransactionSeries.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">NO RESULTS FOUND</div>
                        ) : (
                          filteredDefaultTransactionSeries.map((series, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleDefaultTransactionSeriesSelect(series)}
                              className={`w-full px-3 py-1 text-left text-sm rounded-lg transition ${
                                formData.defaultTransactionSeries === series
                                  ? "bg-gray-50 text-gray-900 font-medium"
                                  : "hover:bg-gray-100 text-gray-900"
                              } flex items-center justify-between`}
                            >
                              <span>{series}</span>
                              {formData.defaultTransactionSeries === series && (
                                <Check size={16} className="text-gray-900" />
                              )}
                            </button>
                          ))
                        )}
                        <button
                          type="button"
                          onClick={handleAddTransactionSeries}
                          className="w-full px-3 py-1 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-900 border-t border-gray-200 mt-1 pt-1.5"
                        >
                          <Plus size={16} className="text-gray-900" />
                          <span>Add Transaction Series</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Location Access - Show for both Business and Warehouse */}
        <div className="bg-transparent rounded-none border-0 p-0 shadow-none">
          <div className={compactFieldRowClass}>
          <label className="text-sm font-medium text-gray-900 pt-2">Location Access</label>
          <div>
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                {formData.locationAccess.length === 0 ? (
                  <>
                    <div className="px-3 py-2 border-b border-gray-200 bg-blue-50/60">
                      <p className="text-sm font-semibold text-blue-700">No users selected</p>
                      <p className="text-xs text-gray-600">
                        Select the users who can create and access transactions for this location.
                      </p>
                    </div>
                    <div className="flex items-center justify-end px-3 py-2 border-b border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={provideAccessToAll}
                          onChange={(e) => setProvideAccessToAll(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Provide access to all users</span>
                      </label>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">USERS</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">ROLE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.locationAccess.map((access, index) => {
                          const user = allUsers.find(u => (u._id || u.id) === access.userId) || users.find(u => (u._id || u.id) === access.userId);
                          return (
                            <tr key={index} className="border-b border-gray-200 group hover:bg-gray-50">
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                                    {(user?.name || user?.firstName || access.userName || "").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{access.userName || user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim()}</div>
                                    <div className="text-xs text-gray-500">{access.userEmail || user?.email}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveUser(access.userId)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600"
                                  >
                                    <X size={14} className="text-white" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <SearchableDropdown
                                  value={access.role || ""}
                                  options={roleOptions}
                                  onChange={(role) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      locationAccess: prev.locationAccess.map((item, idx) =>
                                        idx === index ? { ...item, role } : item
                                      ),
                                    }))
                                  }
                                  placeholder="User's Role"
                                />
                              </td>
                            </tr>
                          );
                        })}
                        {!provideAccessToAll && (
                          <tr>
                            <td className="py-2 px-3">
                              <div className="relative" ref={userDropdownRef}>
                                <button
                                  type="button"
                                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm text-left flex items-center justify-between bg-transparent"
                                >
                                  <span className="text-gray-500">Select users</span>
                                  <ChevronDown size={16} className="text-gray-500" />
                                </button>

                                {isUserDropdownOpen && (
                                  <div className="absolute z-50 w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    <div className="p-2 border-b border-gray-200 sticky top-0 bg-transparent">
                                      <div className="relative">
                                        <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                          type="text"
                                          placeholder="Search"
                                          value={userSearch}
                                          onChange={(e) => setUserSearch(e.target.value)}
                                          className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                    <div className="py-1">
                                      {filteredUsers.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">NO RESULTS FOUND</div>
                                      ) : (
                                        filteredUsers.map((user) => (
                                          <button
                                            key={user._id || user.id}
                                            type="button"
                                            onClick={() => handleUserSelect(user._id || user.id)}
                                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                                          >
                                            <div className="flex items-center gap-2">
                                              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                                                {(user.name || "").charAt(0).toUpperCase()}
                                              </div>
                                              <div>
                                                <div className="font-medium text-gray-900">{user.name}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                              </div>
                                            </div>
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="w-full h-9 flex items-center px-3 border border-gray-300 rounded-lg text-sm text-gray-500 bg-gray-50/50 italic">
                                User's Role
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-2 border-b border-gray-200 bg-blue-50/60">
                      <p className="text-sm font-medium text-blue-700">
                        {formData.locationAccess.length} user(s) selected
                      </p>
                      <p className="text-xs text-gray-600">
                        Selected users can create and access transactions for this location.
                      </p>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">USERS</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">ROLE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.locationAccess.map((access, index) => {
                          const user = allUsers.find(u => (u._id || u.id) === access.userId) || users.find(u => (u._id || u.id) === access.userId);
                          return (
                            <tr 
                              key={index} 
                              className="border-b border-gray-200 group hover:bg-gray-50"
                            >
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                                    {(user?.name || user?.firstName || access.userName || '').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{access.userName || user?.name || `${user?.firstName} ${user?.lastName}`}</div>
                                    <div className="text-xs text-gray-500">{access.userEmail || user?.email}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveUser(access.userId)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600"
                                  >
                                    <X size={14} className="text-white" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-gray-700">{access.role || user?.role || "Admin"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 mt-4 border-t border-gray-200 bg-transparent px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-1.5 bg-[#156372] text-white text-sm font-medium rounded-lg hover:bg-[#0D4A52] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}


