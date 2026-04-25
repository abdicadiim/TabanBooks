import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
    X,
    Info,
    Phone,
    Mail,
    Upload as UploadIcon,
    ChevronDown,
    Plus,
    Globe,
    Paperclip,
    Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import { vendorsAPI } from "../../services/api";
import { WORLD_COUNTRIES, getStatesByCountry } from "../../constants/locationData";

interface NewVendorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (vendor: any) => void;
}

export default function NewVendorModal({ isOpen, onClose, onCreated }: NewVendorModalProps) {
    const [formData, setFormData] = useState({
        salutation: "",
        firstName: "",
        lastName: "",
        companyName: "",
        displayName: "",
        email: "",
        workPhone: "",
        mobile: "",
        vendorLanguage: "English",
        taxRate: "",
        companyId: "",
        currency: "KES- Kenyan Shilling",
        accountsPayable: "",
        openingBalance: "",
        paymentTerms: "Due on Receipt",
        enablePortal: false,
        billingAttention: "",
        billingCountry: "",
        billingStreet1: "",
        billingStreet2: "",
        billingCity: "",
        billingState: "",
        billingZipCode: "",
        billingPhone: "",
        billingFax: "",
        shippingAttention: "",
        shippingCountry: "",
        shippingStreet1: "",
        shippingStreet2: "",
        shippingCity: "",
        shippingState: "",
        shippingZipCode: "",
        shippingPhone: "",
        shippingFax: "",
        remarks: "",
        websiteUrl: "",
        department: "",
        designation: "",
        xSocial: "",
        skypeName: "",
        facebook: "",
    });
    const [activeTab, setActiveTab] = useState("Other Details");
    const [documents, setDocuments] = useState<any[]>([]);
    const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false);
    const [displayNameDropdownOpen, setDisplayNameDropdownOpen] = useState(false);
    const [showMoreDetails, setShowMoreDetails] = useState(false);
    const [contactPersons, setContactPersons] = useState([
        { id: Date.now(), salutation: "", firstName: "", lastName: "", email: "", workPhone: "", mobile: "", skypeName: "", designation: "", department: "" }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const billingStates = getStatesByCountry(formData.billingCountry);
    const shippingStates = getStatesByCountry(formData.shippingCountry);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadDropdownRef = useRef<HTMLDivElement>(null);
    const displayNameDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            // Reset form when modal closes
            setFormData({
                salutation: "",
                firstName: "",
                lastName: "",
                companyName: "",
                displayName: "",
                email: "",
                workPhone: "",
                mobile: "",
                vendorLanguage: "English",
                taxRate: "",
                companyId: "",
                currency: "KES- Kenyan Shilling",
                accountsPayable: "",
                openingBalance: "",
                paymentTerms: "Due on Receipt",
                enablePortal: false,
                billingAttention: "",
                billingCountry: "",
                billingStreet1: "",
                billingStreet2: "",
                billingCity: "",
                billingState: "",
                billingZipCode: "",
                billingPhone: "",
                billingFax: "",
                shippingAttention: "",
                shippingCountry: "",
                shippingStreet1: "",
                shippingStreet2: "",
                shippingCity: "",
                shippingState: "",
                shippingZipCode: "",
                shippingPhone: "",
                shippingFax: "",
                remarks: "",
                websiteUrl: "",
                department: "",
                designation: "",
                xSocial: "",
                skypeName: "",
                facebook: "",
            });
            setActiveTab("Other Details");
            setDocuments([]);
            setContactPersons([{ id: Date.now(), salutation: "", firstName: "", lastName: "", email: "", workPhone: "", mobile: "", skypeName: "", designation: "", department: "" }]);
            setIsLoading(false);
            setDisplayNameDropdownOpen(false);
        }
    }, [isOpen]);

    const displayNameOptions = useMemo(() => {
        const options = generateDisplayNameOptions({
            salutation: formData.salutation,
            firstName: formData.firstName,
            lastName: formData.lastName,
            companyName: formData.companyName,
        });
        const current = String(formData.displayName || "").trim();
        if (current && !options.includes(current)) {
            options.unshift(current);
        }
        return Array.from(new Set(options.filter(Boolean)));
    }, [formData.salutation, formData.firstName, formData.lastName, formData.companyName, formData.displayName]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(target)) {
                setUploadDropdownOpen(false);
            }
            if (displayNameDropdownRef.current && !displayNameDropdownRef.current.contains(target)) {
                setDisplayNameDropdownOpen(false);
            }
        };
        if (uploadDropdownOpen || displayNameDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [uploadDropdownOpen, displayNameDropdownOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        // Handle checkbox
        const checked = (e.target as HTMLInputElement).checked;

        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));

        // Auto-generate display name options
        if (name === "firstName" || name === "lastName" || name === "companyName") {
            const updatedData = { ...formData, [name]: value };
            const options = generateDisplayNameOptions(updatedData);
            if (options.length > 0 && !formData.displayName) {
                setFormData((prev) => ({ ...prev, displayName: options[0] }));
            }
        }
    };

    const generateDisplayNameOptions = (data: any) => {
        const { firstName, lastName, companyName } = data;
        const options = [];

        if (companyName) {
            options.push(companyName);
        }

        if (firstName && lastName) {
            options.push(`${firstName} ${lastName}`);
            options.push(`${lastName}, ${firstName}`);
        } else if (firstName) {
            options.push(firstName);
        } else if (lastName) {
            options.push(lastName);
        }

        if (companyName && firstName && lastName) {
            options.push(`${companyName} (${firstName} ${lastName})`);
        }

        return options.length > 0 ? options : [""];
    };

    const handleFileUpload = (files: FileList) => {
        const newDocuments = Array.from(files).map((file) => ({
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            file: file,
        }));
        setDocuments((prev) => [...prev, ...newDocuments]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsLoading(true);

        // Create vendorData object matching API structure
        const displayName = formData.displayName || formData.companyName || `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Vendor';

        const vendorData = {
            displayName: displayName,
            name: displayName, // Ensure name is set for consistency
            vendorType: (formData.companyName && formData.companyName.trim()) ? 'business' : 'individual',
            salutation: formData.salutation || '',
            firstName: formData.firstName || '',
            lastName: formData.lastName || '',
            companyName: formData.companyName || '',
            email: formData.email || '',
            workPhone: formData.workPhone || '',
            mobile: formData.mobile || '',
            websiteUrl: formData.websiteUrl || '',
            xHandle: formData.xSocial || '',
            skypeName: formData.skypeName || '',
            facebook: formData.facebook || '',
            vendorLanguage: formData.vendorLanguage || 'english',
            taxRate: formData.taxRate || '',
            companyId: formData.companyId || '',
            currency: formData.currency?.split("-")[0]?.trim() || 'USD',
            paymentTerms: formData.paymentTerms || 'net_30',
            department: formData.department || '',
            designation: formData.designation || '',
            openingBalance: formData.openingBalance || '0.00',
            enablePortal: formData.enablePortal || false,
            remarks: formData.remarks || '',
            billingAddress: {
                attention: formData.billingAttention || '',
                country: formData.billingCountry || '',
                street1: formData.billingStreet1 || '',
                street2: formData.billingStreet2 || '',
                city: formData.billingCity || '',
                state: formData.billingState || '',
                zipCode: formData.billingZipCode || '',
                phone: formData.billingPhone || '',
                fax: formData.billingFax || ''
            },
            shippingAddress: {
                attention: formData.shippingAttention || '',
                country: formData.shippingCountry || '',
                street1: formData.shippingStreet1 || '',
                street2: formData.shippingStreet2 || '',
                city: formData.shippingCity || '',
                state: formData.shippingState || '',
                zipCode: formData.shippingZipCode || '',
                phone: formData.shippingPhone || '',
                fax: formData.shippingFax || ''
            },
            contactPersons: contactPersons.filter(cp => cp.firstName || cp.lastName).map(cp => ({
                salutation: cp.salutation || '',
                firstName: cp.firstName,
                lastName: cp.lastName,
                email: cp.email || '',
                workPhone: cp.workPhone || '',
                mobile: cp.mobile || '',
                designation: cp.designation || '',
                department: cp.department || '',
                skypeName: cp.skypeName || ''
            })),
            // Note: Documents handling would need backend support for file uploads which might be different than just sending an array
            // For now we skip documents to avoid errors if backend expects multipart/form-data
        };

        try {
            const response = await vendorsAPI.create(vendorData);
            if (response.success || response) {
                toast.success("Vendor created successfully");
                const newVendor = response.data || response;
                onCreated(newVendor);
                onClose();
            }
        } catch (error: any) {
            console.error('Error saving vendor:', error);
            toast.error(error.message || "Failed to create vendor");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const modalStyles = {
        overlay: {
            position: "fixed" as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
        },
        modal: {
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            width: "100%",
            maxWidth: "1200px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column" as const,
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
        },
        header: {
            padding: "16px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
        },
        title: {
            fontSize: "24px",
            fontWeight: "600",
            color: "#111827",
            margin: 0,
        },
        close: {
            color: "#ef4444",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
        },
        body: {
            padding: "24px",
            flex: 1,
            overflowY: "auto" as const,
        },
        section: {
            marginBottom: "24px",
        },
        sectionTitle: {
            fontSize: "16px",
            fontWeight: "600",
            color: "#111827",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
        },
        row: {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
        },
        label: {
            fontSize: "14px",
            fontWeight: "500",
            color: "#374151",
            marginBottom: "4px",
            display: "block"
        },
        input: {
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            width: "100%",
            boxSizing: "border-box" as const,
            outline: "none"
        },
        select: {
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            width: "100%",
            boxSizing: "border-box" as const,
            backgroundColor: "#ffffff",
            outline: "none"
        },
        infoIcon: {
            color: "#6b7280",
            cursor: "pointer",
        },
        formGroup: {
            marginBottom: "16px",
            display: "grid",
            gridTemplateColumns: "200px 1fr",
            gap: "24px",
            alignItems: "flex-start",
        },
        formRow: {
            display: "grid",
            gridTemplateColumns: "200px 1fr",
            gap: "24px",
            alignItems: "flex-start",
            marginBottom: "20px",
        },
        formRowLabel: {
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "14px",
            color: "#374151",
        },
        formRowInput: {
            display: "flex",
            flexDirection: "column" as const,
            width: "100%"
        },
        tabs: {
            display: "flex",
            borderBottom: "1px solid #e5e7eb",
            marginBottom: "24px",
            gap: "0",
        },
        tab: {
            padding: "12px 24px",
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: "14px",
            color: "#6b7280",
            borderBottom: "2px solid transparent",
        },
        tabActive: {
            color: "#2563eb",
            borderBottomColor: "#2563eb",
        },
        checkboxGroup: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
        },
        checkbox: {
            width: "16px",
            height: "16px",
            cursor: "pointer",
        },
        uploadButton: {
            padding: "8px 12px",
            fontSize: "14px",
            border: "2px dashed #d1d5db",
            borderRadius: "6px",
            backgroundColor: "#f9fafb",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#374151",
            fontWeight: "500",
            transition: "all 0.2s",
        },
        uploadDropdown: {
            position: "absolute" as const,
            top: "100%",
            left: 0,
            marginTop: "4px",
            backgroundColor: "#ffffff",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
            minWidth: "200px",
        },
        uploadDropdownItem: {
            padding: "8px 12px",
            fontSize: "14px",
            border: "none",
            background: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            textAlign: "left" as const,
        },
        footer: {
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
        },
        button: {
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "500",
            borderRadius: "6px",
            cursor: "pointer",
            border: "none",
        },
        buttonCancel: {
            backgroundColor: "#ffffff",
            color: "#374151",
            border: "1px solid #d1d5db",
        },
        buttonSave: {
            backgroundColor: "#ef4444",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: "8px"
        },
    };

    const modalContent = (
        <div
            style={modalStyles.overlay}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={modalStyles.header}>
                    <h2 style={modalStyles.title}>New Vendor</h2>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                        style={modalStyles.close}
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={modalStyles.body}>
                    {/* Primary Contact through Vendor Language Section */}
                    <div style={{ backgroundColor: "#f9fafb", padding: "24px", borderRadius: "8px", marginBottom: "24px" }}>
                        <div style={modalStyles.section}>
                            <div style={{ ...modalStyles.sectionTitle, gridColumn: "1 / -1", marginBottom: "16px" }}>
                                Primary Contact
                                <Info size={16} style={modalStyles.infoIcon} />
                            </div>
                            <div style={modalStyles.row}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <label style={modalStyles.label}>Salutation</label>
                                    <select
                                        name="salutation"
                                        value={formData.salutation}
                                        onChange={handleChange}
                                        style={modalStyles.select}
                                    >
                                        <option>Salutation</option>
                                        <option>Mr.</option>
                                        <option>Mrs.</option>
                                        <option>Ms.</option>
                                        <option>Dr.</option>
                                    </select>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <label style={modalStyles.label}>First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        placeholder="First Name"
                                        style={modalStyles.input}
                                    />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <label style={modalStyles.label}>Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        placeholder="Last Name"
                                        style={modalStyles.input}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Company Name */}
                        <div style={modalStyles.formGroup}>
                            <label style={modalStyles.label}>Company Name</label>
                            <input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                placeholder="Company Name"
                                style={modalStyles.input}
                            />
                        </div>

                        {/* Display Name */}
                        <div style={modalStyles.formGroup}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <label style={modalStyles.label}>Display Name</label>
                                <Info size={16} style={modalStyles.infoIcon} />
                                <span style={{ color: "#ef4444" }}>*</span>
                            </div>
                            <div style={{ position: "relative" }} ref={displayNameDropdownRef}>
                                <input
                                    type="text"
                                    name="displayName"
                                    value={formData.displayName}
                                    onChange={handleChange}
                                    onFocus={() => setDisplayNameDropdownOpen(true)}
                                    placeholder="Select or type to add"
                                    style={{
                                        ...modalStyles.input,
                                        paddingRight: "40px",
                                        borderColor: displayNameDropdownOpen ? "#3b82f6" : modalStyles.input.borderColor,
                                        boxShadow: displayNameDropdownOpen ? "0 0 0 3px rgba(59,130,246,0.12)" : modalStyles.input.boxShadow,
                                    }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setDisplayNameDropdownOpen((prev) => !prev)}
                                    style={{
                                        position: "absolute",
                                        right: "10px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        border: "none",
                                        background: "transparent",
                                        padding: "2px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        color: displayNameDropdownOpen ? "#3b82f6" : "#6b7280",
                                    }}
                                >
                                    <ChevronDown size={16} style={{ transform: displayNameDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
                                </button>
                                {displayNameDropdownOpen && displayNameOptions.length > 0 && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: 0,
                                            right: 0,
                                            top: "calc(100% + 6px)",
                                            zIndex: 50,
                                            backgroundColor: "#ffffff",
                                            border: "1px solid #dbe1ea",
                                            borderRadius: "8px",
                                            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.16)",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div style={{ maxHeight: "220px", overflowY: "auto", padding: "6px 0" }}>
                                            {displayNameOptions.map((option) => {
                                                const isSelected = String(formData.displayName || "").trim() === option;
                                                return (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData((prev) => ({ ...prev, displayName: option }));
                                                            setDisplayNameDropdownOpen(false);
                                                        }}
                                                        style={{
                                                            width: "100%",
                                                            border: "none",
                                                            background: isSelected ? "#eef2ff" : "transparent",
                                                            padding: "10px 14px",
                                                            textAlign: "left",
                                                            cursor: "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            fontSize: "14px",
                                                            color: "#1f2937",
                                                        }}
                                                    >
                                                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{option}</span>
                                                        <span style={{ color: isSelected ? "#3b82f6" : "transparent", fontWeight: 700 }}>✓</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Email Address */}
                        <div style={modalStyles.formGroup}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <label style={modalStyles.label}>Email Address</label>
                                <Info size={16} style={modalStyles.infoIcon} />
                            </div>
                            <div style={{ position: "relative" }}>
                                <Mail size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Email Address"
                                    style={{ ...modalStyles.input, paddingLeft: "40px" }}
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div style={modalStyles.formGroup}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <label style={modalStyles.label}>Phone</label>
                                <Info size={16} style={modalStyles.infoIcon} />
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <div style={{ position: "relative", flex: 1 }}>
                                    <Phone size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
                                    <input
                                        type="tel"
                                        name="workPhone"
                                        value={formData.workPhone}
                                        onChange={handleChange}
                                        placeholder="Work Phone"
                                        style={{ ...modalStyles.input, paddingLeft: "40px" }}
                                    />
                                </div>
                                <div style={{ position: "relative", flex: 1 }}>
                                    <Phone size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
                                    <input
                                        type="tel"
                                        name="mobile"
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        placeholder="Mobile"
                                        style={{ ...modalStyles.input, paddingLeft: "40px" }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Vendor Language */}
                        <div style={modalStyles.formGroup}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <label style={modalStyles.label}>Vendor Language</label>
                                <Info size={16} style={modalStyles.infoIcon} />
                            </div>
                            <select
                                name="vendorLanguage"
                                value={formData.vendorLanguage}
                                onChange={handleChange}
                                style={modalStyles.select}
                            >
                                <option>English</option>
                                <option>Spanish</option>
                                <option>French</option>
                                <option>German</option>
                            </select>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={modalStyles.tabs}>
                        {["Other Details", "Address", "Contact Persons", "Custom Fields", "Reporting Tags", "Remarks"].map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                style={{
                                    ...modalStyles.tab,
                                    ...(activeTab === tab ? modalStyles.tabActive : {}),
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveTab(tab);
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === "Other Details" && (
                        <>
                            {/* Currency */}
                            <div style={modalStyles.formRow}>
                                <div style={modalStyles.formRowLabel}>
                                    <span>Currency</span>
                                </div>
                                <div style={modalStyles.formRowInput}>
                                    <select
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleChange}
                                        style={{ ...modalStyles.select, maxWidth: "none" }}
                                    >
                                        <option>KES- Kenyan Shilling</option>
                                        <option>SOS- Somali Shilling</option>
                                        <option>USD- United States Dollar</option>
                                        <option>AWG- Aruban Guilder</option>
                                        <option>EUR- Euro</option>
                                        <option>CAD- Canadian Dollar</option>
                                        <option>GBP- British Pound</option>
                                    </select>
                                </div>
                            </div>

                            {/* Opening Balance */}
                            <div style={modalStyles.formRow}>
                                <div style={modalStyles.formRowLabel}>
                                    <span>Opening Balance</span>
                                </div>
                                <div style={modalStyles.formRowInput}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontSize: "14px", color: "#374151", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px 0 0 6px", backgroundColor: "#f9fafb", borderRight: "none" }}>
                                            {formData.currency ? formData.currency.substring(0, 3) : "USD"}
                                        </span>
                                        <input
                                            type="text"
                                            name="openingBalance"
                                            value={formData.openingBalance}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            style={{ ...modalStyles.input, borderRadius: "0 6px 6px 0", borderLeft: "none", flex: 1 }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Terms */}
                            <div style={modalStyles.formRow}>
                                <div style={modalStyles.formRowLabel}>
                                    <span>Payment Terms</span>
                                </div>
                                <div style={modalStyles.formRowInput}>
                                    <select
                                        name="paymentTerms"
                                        value={formData.paymentTerms}
                                        onChange={handleChange}
                                        style={{ ...modalStyles.select, maxWidth: "none" }}
                                    >
                                        <option>Due on Receipt</option>
                                        <option>Net 15</option>
                                        <option>Net 30</option>
                                        <option>Net 60</option>
                                    </select>
                                </div>
                            </div>

                            {/* Enable Portal */}
                            <div style={modalStyles.formRow}>
                                <div style={modalStyles.formRowLabel}>
                                    <span>Enable Portal?</span>
                                    <Info size={16} style={modalStyles.infoIcon} />
                                </div>
                                <div style={modalStyles.formRowInput}>
                                    <div style={modalStyles.checkboxGroup}>
                                        <input
                                            type="checkbox"
                                            name="enablePortal"
                                            checked={formData.enablePortal}
                                            onChange={handleChange}
                                            style={modalStyles.checkbox}
                                        />
                                        <label style={{ fontSize: "14px", color: "#374151" }}>Allow portal access for this vendor</label>
                                    </div>
                                </div>
                            </div>

                            {/* Documents */}
                            <div style={modalStyles.formGroup}>
                                <label style={modalStyles.label}>Documents</label>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                    <div style={{ position: "relative", display: "inline-block" }} ref={uploadDropdownRef}>
                                        <button
                                            type="button"
                                            style={modalStyles.uploadButton}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setUploadDropdownOpen(!uploadDropdownOpen);
                                            }}
                                        >
                                            <UploadIcon size={16} />
                                            Upload File
                                            <ChevronDown size={16} />
                                        </button>
                                        {uploadDropdownOpen && (
                                            <div style={modalStyles.uploadDropdown}>
                                                <button
                                                    type="button"
                                                    style={modalStyles.uploadDropdownItem}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        fileInputRef.current?.click();
                                                        setUploadDropdownOpen(false);
                                                    }}
                                                >
                                                    <UploadIcon size={16} />
                                                    Upload from Computer
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {documents.length > 0 && (
                                        <button
                                            type="button"
                                            style={{
                                                padding: "8px 12px",
                                                fontSize: "14px",
                                                backgroundColor: "#2563eb",
                                                color: "#ffffff",
                                                border: "none",
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                fontWeight: "500",
                                            }}
                                        >
                                            <Paperclip size={16} />
                                            {documents.length}
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    style={{ display: "none" }}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            handleFileUpload(e.target.files);
                                        }
                                    }}
                                />
                                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                                    You can upload a maximum of 10 files, 10MB each
                                </div>
                            </div>

                            {/* Add more details */}
                            <div style={modalStyles.formRow}>
                                <div style={modalStyles.formRowLabel}></div>
                                <div style={modalStyles.formRowInput}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowMoreDetails(!showMoreDetails);
                                        }}
                                        style={{
                                            fontSize: "14px",
                                            color: "#2563eb",
                                            border: "none",
                                            background: "none",
                                            cursor: "pointer",
                                            padding: 0,
                                            textAlign: "left",
                                            marginTop: "16px"
                                        }}
                                    >
                                        Add more details
                                    </button>
                                </div>
                            </div>

                            {showMoreDetails && (
                                <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
                                    {/* Website URL */}
                                    <div style={modalStyles.formRow}>
                                        <div style={modalStyles.formRowLabel}>
                                            <span>Website URL</span>
                                        </div>
                                        <div style={modalStyles.formRowInput}>
                                            <div style={{ position: "relative" }}>
                                                <Globe size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
                                                <input
                                                    type="url"
                                                    name="websiteUrl"
                                                    value={formData.websiteUrl}
                                                    onChange={handleChange}
                                                    placeholder="ex: www.zylker.com"
                                                    style={{ ...modalStyles.input, paddingLeft: "36px", maxWidth: "none" }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Department */}
                                    <div style={modalStyles.formRow}>
                                        <div style={modalStyles.formRowLabel}>
                                            <span>Department</span>
                                        </div>
                                        <div style={modalStyles.formRowInput}>
                                            <input
                                                type="text"
                                                name="department"
                                                value={formData.department}
                                                onChange={handleChange}
                                                placeholder="Department"
                                                style={{ ...modalStyles.input, maxWidth: "none" }}
                                            />
                                        </div>
                                    </div>

                                    {/* Designation */}
                                    <div style={modalStyles.formRow}>
                                        <div style={modalStyles.formRowLabel}>
                                            <span>Designation</span>
                                        </div>
                                        <div style={modalStyles.formRowInput}>
                                            <input
                                                type="text"
                                                name="designation"
                                                value={formData.designation}
                                                onChange={handleChange}
                                                placeholder="Designation"
                                                style={{ ...modalStyles.input, maxWidth: "none" }}
                                            />
                                        </div>
                                    </div>

                                    {/* X (Twitter) */}
                                    <div style={modalStyles.formRow}>
                                        <div style={modalStyles.formRowLabel}>
                                            <span>X</span>
                                        </div>
                                        <div style={modalStyles.formRowInput}>
                                            <div style={{ position: "relative" }}>
                                                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontSize: "12px", fontWeight: "600", pointerEvents: "none" }}>X</span>
                                                <input
                                                    type="url"
                                                    name="xSocial"
                                                    value={formData.xSocial}
                                                    onChange={handleChange}
                                                    placeholder="https://x.com/"
                                                    style={{ ...modalStyles.input, paddingLeft: "36px", maxWidth: "none" }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Skype Name/Number */}
                                    <div style={modalStyles.formRow}>
                                        <div style={modalStyles.formRowLabel}>
                                            <span>Skype Name/Number</span>
                                        </div>
                                        <div style={modalStyles.formRowInput}>
                                            <div style={{ position: "relative" }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#00AFF0" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                                                    <path d="M12.015 0C5.398 0 .006 5.388.006 12.002c0 5.098 3.158 9.478 7.618 11.239-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.222.083.343-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.015 24.009c6.624 0 11.99-5.388 11.99-12.002C24.005 5.388 18.641.001 12.015.001z" />
                                                </svg>
                                                <input
                                                    type="text"
                                                    name="skypeName"
                                                    value={formData.skypeName}
                                                    onChange={handleChange}
                                                    placeholder="Skype Name/Number"
                                                    style={{ ...modalStyles.input, paddingLeft: "36px", maxWidth: "none" }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Facebook */}
                                    <div style={modalStyles.formRow}>
                                        <div style={modalStyles.formRowLabel}>
                                            <span>Facebook</span>
                                        </div>
                                        <div style={modalStyles.formRowInput}>
                                            <div style={{ position: "relative" }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                </svg>
                                                <input
                                                    type="url"
                                                    name="facebook"
                                                    value={formData.facebook}
                                                    onChange={handleChange}
                                                    placeholder="http://www.facebook.com/"
                                                    style={{ ...modalStyles.input, paddingLeft: "36px", maxWidth: "none" }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === "Address" && (
                        <div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                                {/* Billing Address */}
                                <div>
                                    <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Billing Address</h3>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                        <div>
                                            <label style={modalStyles.label}>Attention</label>
                                            <input
                                                type="text"
                                                name="billingAttention"
                                                value={formData.billingAttention}
                                                onChange={handleChange}
                                                style={modalStyles.input}
                                            />
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>Country/Region</label>
                                            <select
                                                name="billingCountry"
                                                value={formData.billingCountry}
                                                onChange={handleChange}
                                                style={modalStyles.select}
                                            >
                                                <option value="">Select or type to add</option>
                                                {WORLD_COUNTRIES.map((country) => (
                                                    <option key={country} value={country}>{country}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>Address</label>
                                            <textarea
                                                name="billingStreet1"
                                                value={formData.billingStreet1}
                                                onChange={handleChange}
                                                placeholder="Street 1"
                                                style={{ ...modalStyles.input, minHeight: "60px", resize: "vertical" }}
                                            />
                                            <textarea
                                                name="billingStreet2"
                                                value={formData.billingStreet2}
                                                onChange={handleChange}
                                                placeholder="Street 2"
                                                style={{ ...modalStyles.input, minHeight: "60px", resize: "vertical", marginTop: "8px" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>City</label>
                                            <input
                                                type="text"
                                                name="billingCity"
                                                value={formData.billingCity}
                                                onChange={handleChange}
                                                style={modalStyles.input}
                                            />
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>State</label>
                                            <input
                                                list="new-vendor-billing-state-options"
                                                name="billingState"
                                                value={formData.billingState}
                                                onChange={handleChange}
                                                placeholder="Select or type to add"
                                                style={modalStyles.input}
                                            />
                                            <datalist id="new-vendor-billing-state-options">
                                                {billingStates.map((state) => (
                                                    <option key={state} value={state} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>ZIP Code</label>
                                            <input
                                                type="text"
                                                name="billingZipCode"
                                                value={formData.billingZipCode}
                                                onChange={handleChange}
                                                style={modalStyles.input}
                                            />
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>Phone</label>
                                            <div style={{ display: "flex", gap: "8px" }}>
                                                <select style={{ ...modalStyles.select, width: "100px" }}>
                                                    <option>+254</option>
                                                </select>
                                                <input
                                                    type="tel"
                                                    name="billingPhone"
                                                    value={formData.billingPhone}
                                                    onChange={handleChange}
                                                    style={{ ...modalStyles.input, flex: 1 }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>Fax Number</label>
                                            <input
                                                type="text"
                                                name="billingFax"
                                                value={formData.billingFax}
                                                onChange={handleChange}
                                                style={modalStyles.input}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Shipping Address */}
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                                        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827" }}>Shipping Address</h3>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setFormData(prev => ({
                                                    ...prev,
                                                    shippingAttention: prev.billingAttention,
                                                    shippingCountry: prev.billingCountry,
                                                    shippingStreet1: prev.billingStreet1,
                                                    shippingStreet2: prev.billingStreet2,
                                                    shippingCity: prev.billingCity,
                                                    shippingState: prev.billingState,
                                                    shippingZipCode: prev.billingZipCode,
                                                    shippingPhone: prev.billingPhone,
                                                    shippingFax: prev.billingFax,
                                                }));
                                            }}
                                            style={{
                                                fontSize: "14px",
                                                color: "#2563eb",
                                                border: "none",
                                                background: "none",
                                                cursor: "pointer",
                                                padding: 0,
                                            }}
                                        >
                                            ( Copy billing address )
                                        </button>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                        <div>
                                            <label style={modalStyles.label}>Attention</label>
                                            <input
                                                type="text"
                                                name="shippingAttention"
                                                value={formData.shippingAttention}
                                                onChange={handleChange}
                                                style={modalStyles.input}
                                            />
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>Country/Region</label>
                                            <select
                                                name="shippingCountry"
                                                value={formData.shippingCountry}
                                                onChange={handleChange}
                                                style={modalStyles.select}
                                            >
                                                <option value="">Select or type to add</option>
                                                {WORLD_COUNTRIES.map((country) => (
                                                    <option key={country} value={country}>{country}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>Address</label>
                                            <textarea
                                                name="shippingStreet1"
                                                value={formData.shippingStreet1}
                                                onChange={handleChange}
                                                placeholder="Street 1"
                                                style={{ ...modalStyles.input, minHeight: "60px", resize: "vertical" }}
                                            />
                                            <textarea
                                                name="shippingStreet2"
                                                value={formData.shippingStreet2}
                                                onChange={handleChange}
                                                placeholder="Street 2"
                                                style={{ ...modalStyles.input, minHeight: "60px", resize: "vertical", marginTop: "8px" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>City</label>
                                            <input
                                                type="text"
                                                name="shippingCity"
                                                value={formData.shippingCity}
                                                onChange={handleChange}
                                                style={modalStyles.input}
                                            />
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>State</label>
                                            <input
                                                list="new-vendor-shipping-state-options"
                                                name="shippingState"
                                                value={formData.shippingState}
                                                onChange={handleChange}
                                                placeholder="Select or type to add"
                                                style={modalStyles.input}
                                            />
                                            <datalist id="new-vendor-shipping-state-options">
                                                {shippingStates.map((state) => (
                                                    <option key={state} value={state} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>ZIP Code</label>
                                            <input
                                                type="text"
                                                name="shippingZipCode"
                                                value={formData.shippingZipCode}
                                                onChange={handleChange}
                                                style={modalStyles.input}
                                            />
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>Phone</label>
                                            <div style={{ display: "flex", gap: "8px" }}>
                                                <select style={{ ...modalStyles.select, width: "100px" }}>
                                                    <option>+254</option>
                                                </select>
                                                <input
                                                    type="tel"
                                                    name="shippingPhone"
                                                    value={formData.shippingPhone}
                                                    onChange={handleChange}
                                                    style={{ ...modalStyles.input, flex: 1 }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={modalStyles.label}>Fax Number</label>
                                            <input
                                                type="text"
                                                name="shippingFax"
                                                value={formData.shippingFax}
                                                onChange={handleChange}
                                                style={modalStyles.input}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Contact Persons" && (
                        <div>
                            <div style={{ marginBottom: "16px" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>SALUTATION</th>
                                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>FIRST NAME</th>
                                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>LAST NAME</th>
                                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>EMAIL ADDRESS</th>
                                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>WORK PHONE</th>
                                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>MOBILE</th>
                                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contactPersons.map((person, index) => (
                                            <tr key={person.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                                <td style={{ padding: "12px" }}>
                                                    <select
                                                        value={person.salutation}
                                                        onChange={(e) => {
                                                            const updated = [...contactPersons];
                                                            updated[index].salutation = e.target.value;
                                                            setContactPersons(updated);
                                                        }}
                                                        style={{ ...modalStyles.select, width: "100%" }}
                                                    >
                                                        <option value="">Select</option>
                                                        <option>Mr.</option>
                                                        <option>Mrs.</option>
                                                        <option>Ms.</option>
                                                        <option>Dr.</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: "12px" }}>
                                                    <input
                                                        type="text"
                                                        placeholder="First Name"
                                                        value={person.firstName}
                                                        onChange={(e) => {
                                                            const updated = [...contactPersons];
                                                            updated[index].firstName = e.target.value;
                                                            setContactPersons(updated);
                                                        }}
                                                        style={{ ...modalStyles.input, width: "100%" }}
                                                    />
                                                </td>
                                                <td style={{ padding: "12px" }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Last Name"
                                                        value={person.lastName}
                                                        onChange={(e) => {
                                                            const updated = [...contactPersons];
                                                            updated[index].lastName = e.target.value;
                                                            setContactPersons(updated);
                                                        }}
                                                        style={{ ...modalStyles.input, width: "100%" }}
                                                    />
                                                </td>
                                                <td style={{ padding: "12px" }}>
                                                    <input
                                                        type="email"
                                                        placeholder="Email Address"
                                                        value={person.email}
                                                        onChange={(e) => {
                                                            const updated = [...contactPersons];
                                                            updated[index].email = e.target.value;
                                                            setContactPersons(updated);
                                                        }}
                                                        style={{ ...modalStyles.input, width: "100%" }}
                                                    />
                                                </td>
                                                <td style={{ padding: "12px" }}>
                                                    <input
                                                        type="tel"
                                                        placeholder="Work Phone"
                                                        value={person.workPhone}
                                                        onChange={(e) => {
                                                            const updated = [...contactPersons];
                                                            updated[index].workPhone = e.target.value;
                                                            setContactPersons(updated);
                                                        }}
                                                        style={{ ...modalStyles.input, width: "100%" }}
                                                    />
                                                </td>
                                                <td style={{ padding: "12px" }}>
                                                    <input
                                                        type="tel"
                                                        placeholder="Mobile"
                                                        value={person.mobile}
                                                        onChange={(e) => {
                                                            const updated = [...contactPersons];
                                                            updated[index].mobile = e.target.value;
                                                            setContactPersons(updated);
                                                        }}
                                                        style={{ ...modalStyles.input, width: "100%" }}
                                                    />
                                                </td>
                                                <td style={{ padding: "12px" }}>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setContactPersons(contactPersons.filter((_, i) => i !== index));
                                                        }}
                                                        style={{
                                                            background: "none",
                                                            border: "none",
                                                            cursor: "pointer",
                                                            color: "#ef4444",
                                                            padding: "4px"
                                                        }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setContactPersons([...contactPersons, { id: Date.now(), salutation: "", firstName: "", lastName: "", email: "", workPhone: "", mobile: "", skypeName: "", designation: "", department: "" }]);
                                    }}
                                    style={{
                                        marginTop: "16px",
                                        padding: "8px 16px",
                                        fontSize: "14px",
                                        color: "#2563eb",
                                        backgroundColor: "#eff6ff",
                                        border: "1px solid #bfdbfe",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px"
                                    }}
                                >
                                    <Plus size={16} />
                                    Add Contact Person
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "Custom Fields" && (
                        <div style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>
                            <p style={{ fontSize: "14px", margin: 0 }}>
                                Start adding custom fields for your Customers and Vendors by going to Settings → Preferences → Customers and Vendors. You can also refine
                            </p>
                        </div>
                    )}

                    {activeTab === "Reporting Tags" && (
                        <div style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>
                            <p style={{ fontSize: "14px", margin: 0 }}>Reporting tags functionality coming soon</p>
                        </div>
                    )}

                    {activeTab === "Remarks" && (
                        <div>
                            <label style={modalStyles.label}>Remarks</label>
                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleChange}
                                placeholder="Add any additional notes or remarks here..."
                                style={{ ...modalStyles.input, minHeight: "200px", resize: "vertical" }}
                            />
                        </div>
                    )}

                    {/* Footer */}
                    <div style={modalStyles.footer}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onClose();
                            }}
                            style={{ ...modalStyles.button, ...modalStyles.buttonCancel }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{ ...modalStyles.button, ...modalStyles.buttonSave, opacity: isLoading ? 0.7 : 1 }}
                        >
                            {isLoading && <Loader2 className="animate-spin" size={16} />}
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
