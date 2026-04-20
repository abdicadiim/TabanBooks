import React, { useState, useEffect, useRef, CSSProperties } from "react";
import { ChevronDown, Search, Check, Settings } from "lucide-react";
import { getPaymentTerms } from "../shared/purchasesModel";

interface PaymentTerm {
    id: string | number;
    name: string;
    days?: number;
}

interface PaymentTermsDropdownProps {
    value: string;
    onChange: (value: string) => void;
    onConfigure: () => void;
}

export default function PaymentTermsDropdown({ value, onChange, onConfigure }: PaymentTermsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [terms, setTerms] = useState<PaymentTerm[]>([]);
    const [isHovered, setIsHovered] = useState<string | number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTerms(getPaymentTerms());
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredTerms = terms.filter((term) =>
        term.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={styles.container} ref={dropdownRef}>
            <div
                style={{
                    ...styles.trigger,
                    borderColor: isOpen ? "#156372" : "#d1d5db",
                    boxShadow: isOpen ? "0 0 0 3px rgba(21, 99, 114, 0.12)" : "0 1px 2px rgba(15, 23, 42, 0.06)",
                    transform: isOpen ? "translateY(-1px)" : "none",
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span style={styles.triggerText}>{value || "Select a term"}</span>
                <ChevronDown size={16} style={{ color: "#6b7280", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>

            {isOpen && (
                <div style={styles.dropdown}>
                    <div style={styles.searchContainer}>
                        <Search size={14} style={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search"
                            style={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div style={styles.list}>
                        {filteredTerms.length > 0 ? (
                            filteredTerms.map((term) => (
                                <div
                                    key={term.id}
                                    style={{
                                        ...styles.item,
                                        backgroundColor: value === term.name ? "#156372" : (isHovered === term.id ? "#f9fafb" : "transparent"),
                                        color: value === term.name ? "white" : "#374151",
                                    }}
                                    onMouseEnter={() => setIsHovered(term.id)}
                                    onMouseLeave={() => setIsHovered(null)}
                                    onClick={() => {
                                        onChange(term.name);
                                        setIsOpen(false);
                                        setSearchTerm("");
                                    }}
                                >
                                    <span style={{ fontWeight: value === term.name ? "500" : "400" }}>{term.name}</span>
                                    {value === term.name && <Check size={14} style={styles.checkIcon} />}
                                </div>
                            ))
                        ) : (
                            <div style={styles.noResults}>No terms found</div>
                        )}
                    </div>

                    <div
                        style={styles.footer}
                        onClick={() => {
                            onConfigure();
                            setIsOpen(false);
                        }}
                    >
                        <Settings size={14} style={styles.footerIcon} />
                        <span>Configure Terms</span>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles: { [key: string]: CSSProperties } = {
    container: {
        position: "relative",
        width: "100%",
    },
    trigger: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "6px",
        backgroundColor: "white",
        cursor: "pointer",
        fontSize: "14px",
        minHeight: "38px",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s ease",
    },
    triggerText: {
        color: "#374151",
    },
    dropdown: {
        position: "absolute",
        top: "calc(100% + 6px)",
        left: 0,
        right: 0,
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        boxShadow: "0 18px 30px -12px rgba(15, 23, 42, 0.22)",
        zIndex: 1000,
        overflow: "hidden",
    },
    searchContainer: {
        padding: "8px 12px",
        borderBottom: "1px solid #f3f4f6",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    searchIcon: {
        color: "#9ca3af",
    },
    searchInput: {
        border: "none",
        outline: "none",
        fontSize: "14px",
        width: "100%",
        color: "#374151",
        padding: "4px 0",
    },
    list: {
        maxHeight: "240px",
        overflowY: "auto",
        padding: "4px 0",
    },
    item: {
        padding: "8px 12px",
        fontSize: "14px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        transition: "background-color 0.2s, color 0.2s",
    },
    checkIcon: {
        color: "white",
    },
    noResults: {
        padding: "16px",
        textAlign: "center",
        color: "#6b7280",
        fontSize: "14px",
    },
    footer: {
        padding: "12px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: "#156372",
        fontSize: "14px",
        fontWeight: "400",
        cursor: "pointer",
        backgroundColor: "white",
        borderTop: "1px solid #e5e7eb",
    },
    footerIcon: {
        color: "#156372",
    },
};
