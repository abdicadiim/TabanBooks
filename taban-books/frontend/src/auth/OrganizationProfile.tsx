import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Globe, MapPin, Briefcase, DollarSign, Clock, Languages, ChevronDown, Plus, Info, Settings, LogOut } from "lucide-react";
import { WORLD_COUNTRIES, getStatesByCountry } from "../constants/locationData";
import { signup } from "../services/auth";

const INDUSTRIES = [
    "Agency or Sales House",
    "Agriculture",
    "Art and Design",
    "Automotive",
    "Construction",
    "Consulting",
    "Consumer Packaged Goods",
    "Education",
    "Engineering",
    "Entertainment",
    "Financial Services",
    "Food Services (Restaurants/Fast Food)",
    "Gaming",
    "Government",
    "Health Care",
    "Interior Design",
    "Internal",
    "Legal",
    "Manufacturing",
    "Marketing",
    "Mining and Logistics",
    "Non-Profit",
    "Publishing and Web Media",
    "Real Estate",
    "Retail (E-Commerce and Offline)",
    "Services",
    "Technology",
    "Telecommunications",
    "Travel/Hospitality",
    "Web Designing",
    "Web Development",
    "Writers"
];

const LANGUAGES = [
    "English", "Arabic", "French", "Spanish", "German", "Chinese", "Hindi"
];

const CURRENCIES = [
    { code: "SOS", name: "Somali Shilling" },
    { code: "USD", name: "US Dollar" },
    { code: "EUR", name: "Euro" },
    { code: "GBP", name: "British Pound" },
    { code: "AED", name: "UAE Dirham" }
];

const CURRENCY_SYMBOLS: Record<string, string> = {
    SOS: "SOS",
    USD: "$",
    EUR: "EUR",
    GBP: "GBP",
    AED: "AED",
};

import { TIMEZONES } from "../constants/timezones";

const THEME_COLOR = "#0f4e5a";
const SIGNUP_DRAFT_STORAGE_KEY = "taban_signup_draft";
const LOCAL_AUTH_MODE_KEY = "taban_auth_mode";
const LOCAL_AUTH_MODE_VALUE = "local";
const SIGNUP_PASSWORD_SESSION_KEY = "taban_signup_password";

export default function OrganizationProfile() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showAddress, setShowAddress] = useState(false);
    const [formData, setFormData] = useState({
        organizationName: location.state?.organizationName || "",
        industry: "",
        location: location.state?.country || "Somalia",
        state: "",
        street1: "",
        street2: "",
        city: "",
        zipCode: "",
        currency: "SOS - Somali Shilling",
        language: "English",
        timezone: "(GMT 3:00) Eastern African Time (Africa/Mogadishu)",
    });
    const stateOptions = getStatesByCountry(formData.location);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        if (error) setError("");
    };

    const handlePrevious = () => {
        const signupDraft = {
            name: formData.organizationName || location.state?.organizationName || "",
            email: location.state?.email || "",
            organizationName: formData.organizationName || location.state?.organizationName || "",
            country: formData.location || location.state?.country || "Somalia",
        };

        try {
            localStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify(signupDraft));
        } catch {
            // Ignore storage failure and still navigate back.
        }

        navigate("/signup", { state: { signupDraft } });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const signupName = String(location.state?.name || formData.organizationName || "");
            const signupEmail = String(location.state?.email || "");
            const signupPassword = String(location.state?.password || sessionStorage.getItem(SIGNUP_PASSWORD_SESSION_KEY) || "");
            const signupOrganizationName = String(formData.organizationName || location.state?.organizationName || "");
            const selectedCode = formData.currency.split(" - ")[0]?.trim().toUpperCase() || "USD";

            const isLocalAuthMode = localStorage.getItem(LOCAL_AUTH_MODE_KEY) === LOCAL_AUTH_MODE_VALUE;
            let token = localStorage.getItem("auth_token");
            if (!token || isLocalAuthMode) {
                if (isLocalAuthMode) {
                    localStorage.removeItem("auth_token");
                    localStorage.removeItem("user");
                    localStorage.removeItem("organization");
                    localStorage.removeItem("account_verified");
                    localStorage.removeItem(LOCAL_AUTH_MODE_KEY);
                }

                if (!signupEmail || !signupOrganizationName || !signupPassword) {
                    throw new Error("Signup details are missing. Please go back and create your account again.");
                }

                await signup(
                    signupName || signupOrganizationName,
                    signupEmail,
                    signupPassword,
                    signupOrganizationName
                );
                token = localStorage.getItem("auth_token");
            }

            if (!token) {
                throw new Error("Could not create account.");
            }

            const profileData = {
                name: formData.organizationName,
                industry: formData.industry,
                address: {
                    street1: formData.street1,
                    street2: formData.street2,
                    city: formData.city,
                    state: formData.state,
                    zipCode: formData.zipCode,
                    country: formData.location,
                },
                baseCurrency: selectedCode,
                orgLanguage: formData.language,
                timeZone: formData.timezone,
            };

            const response = await fetch("/api/settings/organization/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(profileData),
            });

            if (!response.ok) {
                let message = "Failed to save organization profile.";
                try {
                    const data = await response.json();
                    message = data?.message || message;
                } catch {
                    // Keep default message when response is not JSON.
                }
                throw new Error(message);
            }

            localStorage.setItem("org_profile", JSON.stringify(formData));
            if (selectedCode) {
                localStorage.setItem("base_currency_code", selectedCode);
            }
            localStorage.setItem("base_currency_symbol", CURRENCY_SYMBOLS[selectedCode] || selectedCode);

            try {
                const orgRaw = localStorage.getItem("organization");
                if (orgRaw) {
                    const org = JSON.parse(orgRaw);
                    localStorage.setItem(
                        "organization",
                        JSON.stringify({
                            ...org,
                            name: formData.organizationName || org.name,
                            legalName: formData.organizationName || org.legalName,
                            baseCurrency: selectedCode,
                            currency: selectedCode,
                        })
                    );
                }
            } catch (storageError) {
                console.warn("Could not update organization in localStorage", storageError);
            }

            localStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
            sessionStorage.removeItem(SIGNUP_PASSWORD_SESSION_KEY);
            setLoading(false);
            const isVerified = localStorage.getItem("account_verified") === "true";
            navigate(isVerified ? "/loading" : "/verify-identity", { state: { isNewUser: true } });
        } catch (err: any) {
            console.error("Error saving organization profile:", err);
            setError(err?.message || "Could not save organization profile. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#0f4e5a] rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">TB</span>
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-lg font-black text-slate-800">Taban</span>
                            <span className="text-xs font-bold text-[#0f4e5a]">Taban Books</span>
                        </div>
                    </div>
                    <div className="h-8 w-[1px] bg-gray-200 mx-2"></div>
                    <p className="text-sm text-gray-400 font-medium hidden sm:block">Taban Books is your end-to-end online accounting software.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                        <span>Welcome <b>{location.state?.email || "User"}</b></span>
                        <LogOut className="w-4 h-4 cursor-pointer hover:text-red-500 transition-colors" onClick={() => navigate("/login")} />
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 flex flex-col items-center py-10 px-4">
                <div className="w-full max-w-[850px] bg-white rounded-xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_4px_6px_-2px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
                    {/* Blue top border like Taban Books */}
                    <div className="h-0.5 bg-blue-500"></div>

                    <div className="p-8 lg:p-14">
                        <div className="text-center mb-12">
                            <h1 className="text-2xl font-medium text-slate-800 tracking-tight">Set up your organization profile</h1>
                            <div className="w-8 h-[2px] bg-blue-500 mx-auto mt-4 rounded-full"></div>
                        </div>

                        {error && (
                            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-10">
                            {/* Organizational Details */}
                            <section>
                                <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6 px-1">Organizational Details</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-medium text-gray-700">
                                            Organization Name<span className="text-red-500 text-xs ml-0.5">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="organizationName"
                                            value={formData.organizationName}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all text-[13px] text-gray-800"
                                        />
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-medium text-gray-700">Industry</label>
                                        <div className="relative group">
                                            <select
                                                name="industry"
                                                value={formData.industry}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-blue-100 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none appearance-none transition-all text-[13px] bg-white cursor-pointer group-hover:border-blue-200"
                                            >
                                                <option value="">Select Industry</option>
                                                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                                                <option value="other" className="text-blue-600 font-bold border-t border-gray-100 italic">+ CANT FIND YOUR INDUSTRY?</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">
                                            Organization Location<span className="text-red-500 text-xs ml-0.5">*</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                name="location"
                                                value={formData.location}
                                                disabled
                                                className="w-full px-3 py-2 border border-gray-100 rounded-md bg-gray-50/50 outline-none appearance-none text-[13px] text-gray-500 cursor-not-allowed opacity-80"
                                            >
                                                {WORLD_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">State/Province</label>
                                        <div className="relative group">
                                            <input
                                                list="organization-state-options"
                                                name="state"
                                                value={formData.state}
                                                onChange={handleChange}
                                                placeholder="State/Province"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all text-[13px] bg-white group-hover:border-blue-300"
                                            />
                                            <datalist id="organization-state-options">
                                                {stateOptions.map((s) => (
                                                    <option key={s} value={s} />
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>

                                    {/* Conditionally Rendered Address Fields */}
                                    {showAddress && (
                                        <>
                                            <div className="md:col-span-2 space-y-1.5">
                                                <input
                                                    type="text"
                                                    name="street1"
                                                    placeholder="Street 1"
                                                    value={formData.street1}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all text-[13px] text-gray-800"
                                                />
                                            </div>
                                            <div className="md:col-span-2 space-y-1.5">
                                                <input
                                                    type="text"
                                                    name="street2"
                                                    placeholder="Street 2"
                                                    value={formData.street2}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all text-[13px] text-gray-800"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <input
                                                    type="text"
                                                    name="city"
                                                    placeholder="City"
                                                    value={formData.city}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all text-[13px] text-gray-800"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <input
                                                    type="text"
                                                    name="zipCode"
                                                    placeholder="ZIP/Postal Code"
                                                    value={formData.zipCode}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all text-[13px] text-gray-800"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {!showAddress && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAddress(true)}
                                        className="mt-5 flex items-center gap-1.5 text-blue-600 font-bold text-[11px] hover:text-blue-800 transition-colors tracking-tight"
                                    >
                                        <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                                        ADD ORGANIZATION ADDRESS
                                    </button>
                                )}
                            </section>

                            {/* Regional Settings */}
                            <section>
                                <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6 px-1">Regional Settings</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">
                                            Currency<span className="text-red-500 text-xs ml-0.5">*</span>
                                        </label>
                                        <div className="relative group">
                                            <select
                                                name="currency"
                                                value={formData.currency}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none appearance-none transition-all text-[13px] bg-white cursor-pointer group-hover:border-blue-300"
                                            >
                                                {CURRENCIES.map(c => <option key={c.code} value={`${c.code} - ${c.name}`}>{c.code} - {c.name}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">
                                            Language<span className="text-red-500 text-xs ml-0.5">*</span>
                                        </label>
                                        <div className="relative group">
                                            <select
                                                name="language"
                                                value={formData.language}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none appearance-none transition-all text-[13px] bg-white cursor-pointer group-hover:border-blue-300"
                                            >
                                                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-medium text-gray-700">
                                            Time Zone<span className="text-red-500 text-xs ml-0.5">*</span>
                                        </label>
                                        <div className="relative group">
                                            <select
                                                name="timezone"
                                                value={formData.timezone}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none appearance-none transition-all text-[13px] bg-white cursor-pointer group-hover:border-blue-300"
                                            >
                                                {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Tax Settings Hint */}
                            <section className="bg-blue-50/40 rounded-lg p-5 flex gap-4 border border-blue-100/50">
                                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tax Settings</h3>
                                    <p className="text-[13px] text-gray-600 leading-relaxed">
                                        Configure the tax rates in your organization by navigating to <span className="text-gray-900 font-semibold cursor-pointer hover:underline flex inline-flex items-center gap-1 group">Settings <ChevronDown className="w-3 h-3 -rotate-90 group-hover:text-blue-500" /> Taxes</span>.
                                    </p>
                                </div>
                            </section>

                            {/* Footer Notes */}
                            <div className="pt-10 border-t border-gray-100">
                                <div>
                                    <p className="text-[13px] font-bold text-gray-600 mb-3">Note:</p>
                                    <ul className="list-disc list-inside space-y-2.5 text-[13px] text-gray-500 ml-1">
                                        <li>You can update some of these preferences from Settings anytime.</li>
                                        <li>The language you select on this page will be the default language for the following features even if you change the language later:</li>
                                    </ul>
                                </div>                            </div>

                            {/* Submit Button */}
                            <div className="flex items-center justify-start gap-3 pt-10 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    className="bg-white border border-gray-200 text-gray-700 px-7 py-2 rounded shadow-sm hover:bg-gray-50 transition-all font-bold text-[13px] active:scale-[0.98]"
                                >
                                    Previous
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`bg-[#156372] hover:bg-[#0f4e5a] text-white px-7 py-2 rounded shadow-sm shadow-[#156372]/30 transition-all font-bold text-[13px] active:scale-[0.98] flex items-center gap-2 ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Getting Started...
                                        </>
                                    ) : 'Get Started'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>

            {/* Visual background accents */}
            <div className="fixed top-32 left-16 opacity-[0.03] pointer-events-none select-none">
                <Settings className="w-40 h-40 rotate-12" />
            </div>
            <div className="fixed bottom-20 right-16 opacity-[0.03] pointer-events-none select-none">
                <Briefcase className="w-40 h-40 -rotate-12" />
            </div>
        </div>
    );
}



