import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Bold, Italic, Underline, Link as LinkIcon, Paperclip, ChevronDown, Check, Search, Plus } from "lucide-react";
import { vendorsAPI, customersAPI, emailTemplatesAPI } from "../../../services/api";
import { API_BASE_URL, getToken } from "../../../services/auth";
import { applyEmailTemplate } from "../../settings/emailTemplateUtils";
import { useCurrency } from "../../../hooks/useCurrency";

interface SendPurchaseOrderEmailProps {
    purchaseOrder: any;
    organization?: any;
    onClose: () => void;
    onSend: (emailData: any) => void;
}

export default function SendPurchaseOrderEmail({ purchaseOrder, organization, onClose, onSend }: SendPurchaseOrderEmailProps) {
    const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
    const resolvedBaseCurrency = baseCurrencyCode || "USD";
    const resolvedBaseCurrencySymbol = baseCurrencySymbol || resolvedBaseCurrency;
    const [to, setTo] = useState<string[]>([]);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [attachPdf, setAttachPdf] = useState(true);
    const [cc, setCc] = useState("");
    const [bcc, setBcc] = useState("");
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);

    const [contactPersons, setContactPersons] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputContainerRef = useRef<HTMLDivElement>(null);
    const [dbContacts, setDbContacts] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (purchaseOrder) {
            const defaultSubject = `Purchase Order from Your Company (Purchase Order #: ${purchaseOrder.purchaseOrderNumber})`;
            setSubject(defaultSubject);

            // Initialize body with default template
            const defaultTemplate = `Dear ${purchaseOrder.vendor_name || "Vendor"},

The purchase order (${purchaseOrder.purchaseOrderNumber}) is attached with this email.

An overview of the purchase order is available below:

----------------------------------------------------------------------------------------
Purchase Order # : ${purchaseOrder.purchaseOrderNumber}
----------------------------------------------------------------------------------------
Order Date : ${new Date(purchaseOrder.date).toLocaleDateString()}
Amount     : ${resolvedBaseCurrencySymbol} ${parseFloat(purchaseOrder.total).toFixed(2)}
----------------------------------------------------------------------------------------

Please go through it and confirm the order. We look forward to working with you again.

Regards,
${organization?.name || "Your Company Name"}`;
            setBody(defaultTemplate);

            const loadTemplate = async () => {
                try {
                    const templateRes = await emailTemplatesAPI.getByKey("purchase_order_notification");
                    const template = templateRes?.data;
                    if (!template) return;

                    const placeholders = {
                        PurchaseOrderNumber: purchaseOrder.purchaseOrderNumber || "",
                        CompanyName: organization?.name || "Your Company Name",
                        VendorName: purchaseOrder.vendor_name || "Vendor",
                        Amount: `${resolvedBaseCurrencySymbol} ${parseFloat(purchaseOrder.total || 0).toFixed(2)}`,
                        OrderDate: purchaseOrder.date ? new Date(purchaseOrder.date).toLocaleDateString() : "",
                        SenderName: organization?.name || "Your Company Name",
                    };
                    setSubject(applyEmailTemplate(template.subject || defaultSubject, placeholders));
                    setBody(applyEmailTemplate(template.emailBody || template.body || defaultTemplate, placeholders));
                } catch (templateError) {
                    console.error("Error loading purchase order email template:", templateError);
                }
            };

            loadTemplate();

            // Fetch vendor email and contact persons
            const fetchVendorDetails = async () => {
                // More robust vendor ID extraction
                const vendorId =
                    purchaseOrder.vendor_id ||
                    purchaseOrder.vendor?._id ||
                    (typeof purchaseOrder.vendor === 'string' ? purchaseOrder.vendor : undefined);

                console.log("Fetching details for vendorId:", vendorId);

                if (vendorId) {
                    try {
                        const response = await vendorsAPI.getById(vendorId);
                        const vendorData = response.data || response.vendor;
                        if (vendorData) {
                            if (vendorData.email) {
                                setTo(prev => {
                                    if (!prev.includes(vendorData.email)) {
                                        return [...prev, vendorData.email];
                                    }
                                    return prev;
                                });
                            }
                            if (vendorData.contactPersons) {
                                setContactPersons(vendorData.contactPersons);
                            }
                        }
                    } catch (error) {
                        console.error("Error fetching vendor details:", error);
                    }
                }
            };

            fetchVendorDetails();
        }
    }, [purchaseOrder, resolvedBaseCurrencySymbol, organization?.name]);

    useEffect(() => {
        const loadGeneralSettings = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/settings/general`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                if (!response.ok) return;
                const json = await response.json();
                const attachByDefault = json?.data?.settings?.pdfSettings?.attachPDFInvoice ?? true;
                setAttachPdf(Boolean(attachByDefault));
            } catch (error) {
                console.error("Error loading general settings for PO email:", error);
            }
        };
        loadGeneralSettings();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                inputContainerRef.current && !inputContainerRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSend = () => {
        onSend({
            to,
            cc,
            bcc,
            subject,
            body,
            attachPdf,
            attachSystemPDF: attachPdf
        });
    };

    const removeRecipient = (emailToRemove: string) => {
        setTo(to.filter(email => email !== emailToRemove));
    };

    const addRecipient = (email: string) => {
        if (email && !to.includes(email)) {
            setTo([...to, email]);
        }
        setShowDropdown(false);
        setSearchTerm("");
    };

    const filteredContacts = contactPersons.filter(contact => {
        const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
        const email = contact.email?.toLowerCase() || "";
        return fullName.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    });

    // Effect to search database when searchTerm changes
    useEffect(() => {
        const searchDB = async () => {
            // Show vendor contacts immediately if searchTerm is empty
            if (!searchTerm && contactPersons.length > 0) {
                setDbContacts([]);
                return;
            }

            // Still show vendor contacts even with 1 character
            setIsSearching(true);
            try {
                const [vendorRes, customerRes] = searchTerm
                    ? await Promise.all([
                        vendorsAPI.search(searchTerm),
                        customersAPI.search(searchTerm)
                    ])
                    : [null, null];

                const searchResults: any[] = [];

                // Add vendor contacts from search results
                if (vendorRes?.success && Array.isArray(vendorRes.data)) {
                    vendorRes.data.forEach((v: any) => {
                        if (v.contactPersons) {
                            searchResults.push(...v.contactPersons.map((cp: any) => ({ ...cp, source: 'Vendor', sourceName: v.displayName || v.name })));
                        } else if (v.email && !searchResults.some(r => r.email === v.email)) {
                            searchResults.push({ firstName: v.firstName || v.displayName || v.name, lastName: v.lastName || '', email: v.email, source: 'Vendor', sourceName: v.displayName || v.name });
                        }
                    });
                }

                // Add customer contacts from search results
                if (customerRes?.success && Array.isArray(customerRes.data)) {
                    customerRes.data.forEach((c: any) => {
                        if (c.contactPersons) {
                            searchResults.push(...c.contactPersons.map((cp: any) => ({ ...cp, source: 'Customer', sourceName: c.displayName || c.name })));
                        } else if (c.email && !searchResults.some(r => r.email === c.email)) {
                            searchResults.push({ firstName: c.firstName || c.displayName || c.name, lastName: c.lastName || '', email: c.email, source: 'Customer', sourceName: c.displayName || c.name });
                        }
                    });
                }

                // Filter out duplicates and local contacts
                const localEmails = contactPersons.map(cp => cp.email);
                const uniqueResults = searchResults.filter((item, index, self) =>
                    item.email &&
                    !localEmails.includes(item.email) &&
                    index === self.findIndex((t) => t.email === item.email)
                );

                setDbContacts(uniqueResults);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(searchDB, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, contactPersons]);

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-800">Email To {purchaseOrder?.vendor_name}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* From */}
                    <div className="flex items-center gap-4">
                        <label className="w-24 text-sm font-medium text-gray-500">From</label>
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                            {organization ? (
                                `${organization.name || "Admin"} <${organization.email || "admin@example.com"}>`
                            ) : (
                                "admin username <admin@example.com>"
                            )}
                            <span className="cursor-help text-gray-400">?</span>
                        </div>
                    </div>

                    {/* To */}
                    <div className="flex items-start gap-4">
                        <label className="w-24 text-sm font-medium text-gray-500 mt-2">Send To</label>
                        <div className="flex-1 relative">
                            <div
                                ref={inputContainerRef}
                                className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md bg-white min-h-[40px] focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-[#156372] cursor-text"
                                onClick={() => setShowDropdown(true)}
                            >
                                {to.map(email => {
                                    const contact = contactPersons.find(c => c.email === email) || dbContacts.find(c => c.email === email);
                                    const displayText = contact ? `${contact.firstName} ${contact.lastName}` : email;
                                    const initials = contact ?
                                        `${(contact.firstName?.[0] || '').toUpperCase()}${(contact.lastName?.[0] || '').toUpperCase()}` :
                                        email[0].toUpperCase();

                                    return (
                                        <span key={email} className="bg-teal-50 border border-blue-100 pl-1 pr-2 py-1 rounded-full text-sm flex items-center gap-1.5 text-teal-800 font-medium">
                                            <div className="w-5 h-5 bg-[#156372] rounded-full flex items-center justify-center text-[10px] text-white">
                                                {initials || '?'}
                                            </div>
                                            <span className="truncate max-w-[200px]">{displayText}</span>
                                            <button onClick={(e) => {
                                                e.stopPropagation();
                                                removeRecipient(email);
                                            }} className="hover:text-red-500 text-blue-400 p-0.5">
                                                <X size={12} strokeWidth={3} />
                                            </button>
                                        </span>
                                    );
                                })}
                                <input
                                    type="text"
                                    className="flex-1 outline-none text-sm min-w-[200px] h-7"
                                    placeholder={to.length === 0 ? "Enter email address" : ""}
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const val = searchTerm.trim();
                                            if (val && !to.includes(val) && val.includes('@')) {
                                                addRecipient(val);
                                            }
                                        }
                                    }}
                                />
                                <div className="absolute right-2 top-2 flex gap-4">
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        setShowCc(true);
                                    }} className="text-teal-700 text-xs font-medium hover:underline">Cc</button>
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        setShowBcc(true);
                                    }} className="text-teal-700 text-xs font-medium hover:underline">Bcc</button>
                                </div>
                            </div>

                            {/* Dropdown */}
                            {showDropdown && (
                                <div
                                    ref={dropdownRef}
                                    className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden"
                                >
                                    <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-white">
                                        <Search size={16} className="text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search"
                                            className="flex-1 outline-none text-sm h-8"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {/* Vendor Contacts */}
                                        {filteredContacts.length > 0 && (
                                            <div className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase bg-gray-50">Contacts for this Vendor</div>
                                        )}
                                        {filteredContacts.map(contact => (
                                            <button
                                                key={`local-${contact.email}`}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-teal-50 flex items-center gap-3 group border-b border-gray-50"
                                                onClick={() => addRecipient(contact.email)}
                                            >
                                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-medium group-hover:bg-blue-100 group-hover:text-teal-700">
                                                    {(contact.firstName?.[0] || contact.email?.[0] || 'U').toUpperCase()}
                                                    {(contact.lastName?.[0] || '').toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{contact.firstName} {contact.lastName}</span>
                                                    <span className="text-xs text-gray-500">{contact.email}</span>
                                                </div>
                                                {to.includes(contact.email) && (
                                                    <Check size={16} className="ml-auto text-teal-700" />
                                                )}
                                            </button>
                                        ))}

                                        {/* Database Contacts */}
                                        {dbContacts.length > 0 && (
                                            <div className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase bg-gray-50">Found in Database</div>
                                        )}
                                        {dbContacts.map(contact => (
                                            <button
                                                key={`db-${contact.email}`}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-teal-50 flex items-center gap-3 group border-b border-gray-50"
                                                onClick={() => addRecipient(contact.email)}
                                            >
                                                <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 font-medium group-hover:bg-indigo-100">
                                                    {(contact.firstName?.[0] || contact.email?.[0] || 'U').toUpperCase()}
                                                    {(contact.lastName?.[0] || '').toUpperCase()}
                                                </div>
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <span className="font-medium text-gray-900 truncate">{contact.firstName} {contact.lastName}</span>
                                                    <span className="text-xs text-gray-500 truncate">{contact.email}</span>
                                                    {contact.source && (
                                                        <span className="text-[10px] text-gray-400 italic">From {contact.source}: {contact.sourceName}</span>
                                                    )}
                                                </div>
                                                {to.includes(contact.email) && (
                                                    <Check size={16} className="ml-auto text-teal-700 flex-shrink-0" />
                                                )}
                                            </button>
                                        ))}

                                        {isSearching && (
                                            <div className="px-4 py-4 text-center bg-gray-50 flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-[#156372] border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-sm text-gray-500">Searching database...</p>
                                            </div>
                                        )}

                                        {filteredContacts.length === 0 && dbContacts.length === 0 && !isSearching && (
                                            <div className="px-4 py-8 text-center bg-gray-50">
                                                <p className="text-sm text-gray-500 mb-1">NO CONTACT PERSONS FOUND.</p>
                                            </div>
                                        )}
                                    </div>
                                    <button className="w-full text-left px-4 py-3 text-teal-700 text-sm font-medium border-t border-gray-100 hover:bg-gray-50 flex items-center gap-2">
                                        <Plus size={16} />
                                        Add Contact Person
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cc */}
                    {showCc && (
                        <div className="flex items-center gap-4">
                            <label className="w-24 text-sm font-medium text-gray-500">Cc</label>
                            <input
                                type="text"
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
                                value={cc}
                                onChange={e => setCc(e.target.value)}
                                placeholder="Email addresses, separated by commas"
                            />
                        </div>
                    )}

                    {/* Bcc */}
                    {showBcc && (
                        <div className="flex items-center gap-4">
                            <label className="w-24 text-sm font-medium text-gray-500">Bcc</label>
                            <input
                                type="text"
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
                                value={bcc}
                                onChange={e => setBcc(e.target.value)}
                                placeholder="Email addresses, separated by commas"
                            />
                        </div>
                    )}

                    {/* Subject */}
                    <div className="flex items-center gap-4">
                        <label className="w-24 text-sm font-medium text-gray-500">Subject</label>
                        <input
                            type="text"
                            className="flex-1 border-b border-gray-300 px-0 py-2 text-sm focus:border-teal-600 outline-none text-gray-800"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                        />
                    </div>

                    {/* Body Editor Toolbar (Visual Only) */}
                    <div className="border border-gray-300 rounded-t-md bg-white p-2 flex gap-2">
                        <Bold size={18} className="text-gray-500 cursor-pointer hover:text-gray-800 p-1 rounded hover:bg-gray-100" />
                        <Italic size={18} className="text-gray-500 cursor-pointer hover:text-gray-800 p-1 rounded hover:bg-gray-100" />
                        <Underline size={18} className="text-gray-500 cursor-pointer hover:text-gray-800 p-1 rounded hover:bg-gray-100" />
                        <div className="w-px h-5 bg-gray-300 mx-2"></div>
                        <LinkIcon size={18} className="text-gray-500 cursor-pointer hover:text-gray-800 p-1 rounded hover:bg-gray-100" />
                    </div>

                    {/* Body Textarea */}
                    <textarea
                        className="w-full h-64 p-4 border border-t-0 border-gray-300 rounded-b-md outline-none text-sm text-gray-800 resize-none font-sans"
                        value={body}
                        onChange={e => setBody(e.target.value)}
                    />

                    {/* Attachments */}
                    <div className="border border-dashed border-gray-300 rounded-md p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer font-medium">
                                <input
                                    type="checkbox"
                                    checked={attachPdf}
                                    onChange={e => setAttachPdf(e.target.checked)}
                                    className="rounded text-teal-700 focus:ring-teal-600"
                                />
                                Attach Purchase Order PDF
                            </label>
                        </div>
                        {attachPdf && (
                            <div className="flex items-center gap-3 p-2 pr-4 border border-gray-200 rounded-md bg-white w-fit shadow-sm">
                                <div className="text-red-500 bg-red-50 p-1 rounded"><FileIcon size={20} /></div>
                                <span className="text-sm font-medium text-gray-700">{purchaseOrder.purchaseOrderNumber}</span>
                            </div>
                        )}
                    </div>

                    <button className="flex items-center gap-2 text-teal-700 text-sm font-medium hover:underline">
                        <Paperclip size={16} />
                        Attachments
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex gap-3 bg-gray-50 rounded-b-lg">
                    <button
                        onClick={handleSend}
                        className="px-6 py-2 bg-[#156372] text-white rounded text-sm font-medium hover:bg-[#0D4A52] shadow-sm"
                    >
                        Send
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 shadow-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function FileIcon({ size }: { size: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    );
}

