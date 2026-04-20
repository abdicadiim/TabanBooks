import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { getPaymentTerms, savePaymentTerms } from "../shared/purchasesModel";

type PaymentTerm = {
    id: string;
    name: string;
    days: number;
};

type ConfigurePaymentTermsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (terms: PaymentTerm[]) => void;
};

export default function ConfigurePaymentTermsModal({ isOpen, onClose, onSave }: ConfigurePaymentTermsModalProps) {
    const [terms, setTerms] = useState<PaymentTerm[]>([]);
    const [newTermName, setNewTermName] = useState("");
    const [newTermDays, setNewTermDays] = useState("");

    useEffect(() => {
        if (isOpen) {
            setTerms(getPaymentTerms());
        }
    }, [isOpen]);

    const handleAddTerm = () => {
        if (newTermName.trim()) {
            const newTerm = {
                id: Date.now().toString(),
                name: newTermName,
                days: parseInt(newTermDays) || 0,
            };
            const updatedTerms = [...terms, newTerm];
            setTerms(updatedTerms);
            setNewTermName("");
            setNewTermDays("");
        }
    };

    const handleRemoveTerm = (id: string) => {
        setTerms(terms.filter((term) => term.id !== id));
    };

    const handleSave = () => {
        savePaymentTerms(terms);
        if (onSave) onSave(terms);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.header}>
                    <h3 style={styles.title}>Configure Payment Terms</h3>
                    <button onClick={onClose} style={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div style={styles.body}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeader}>
                                <th style={styles.th}>TERM NAME</th>
                                <th style={styles.th}>NUMBER OF DAYS</th>
                                <th style={styles.th}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {terms.map((term) => (
                                <tr key={term.id} style={styles.tr}>
                                    <td style={styles.td}>{term.name}</td>
                                    <td style={styles.td}>{term.days}</td>
                                    <td style={styles.td}>
                                        <button
                                            onClick={() => handleRemoveTerm(term.id)}
                                            style={styles.deleteBtn}
                                        >
                                            <X size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            <tr style={styles.tr}>
                                <td style={styles.td}>
                                    <input
                                        type="text"
                                        value={newTermName}
                                        onChange={(e) => setNewTermName(e.target.value)}
                                        placeholder="Net"
                                        style={styles.input}
                                    />
                                </td>
                                <td style={styles.td}>
                                    <input
                                        type="number"
                                        value={newTermDays}
                                        onChange={(e) => setNewTermDays(e.target.value)}
                                        placeholder="0"
                                        style={styles.input}
                                    />
                                </td>
                                <td style={styles.td}></td>
                            </tr>
                        </tbody>
                    </table>

                    <button onClick={handleAddTerm} style={styles.addNewBtn}>
                        <Plus size={16} />
                        Add New
                    </button>
                </div>

                <div style={styles.footer}>
                    <button onClick={handleSave} style={styles.saveBtn}>
                        Save
                    </button>
                    <button onClick={onClose} style={styles.cancelBtn}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
    },
    modal: {
        backgroundColor: "white",
        borderRadius: "8px",
        width: "600px",
        maxWidth: "95%",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        display: "flex",
        flexDirection: "column",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 24px",
        borderBottom: "1px solid #e5e7eb",
    },
    title: {
        fontSize: "18px",
        fontWeight: "500",
        color: "#374151",
        margin: 0,
    },
    closeBtn: {
        background: "none",
        border: "none",
        color: "#156372",
        cursor: "pointer",
        padding: "4px",
    },
    body: {
        padding: "24px",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        marginBottom: "16px",
        border: "1px solid #e1e5eb",
    },
    tableHeader: {
        backgroundColor: "#ffffff",
    },
    th: {
        textAlign: "left",
        padding: "10px 12px",
        fontSize: "12px",
        fontWeight: "600",
        color: "#6b7280",
        textTransform: "uppercase",
        borderBottom: "1px solid #e1e5eb",
        borderRight: "1px solid #e1e5eb",
    },
    tr: {
        borderBottom: "1px solid #e1e5eb",
    },
    td: {
        padding: "10px 12px",
        fontSize: "14px",
        color: "#374151",
        borderRight: "1px solid #e1e5eb",
    },
    input: {
        width: "100%",
        padding: "6px 12px",
        border: "1px solid #156372",
        borderRadius: "4px",
        fontSize: "14px",
        outline: "none",
    },
    deleteBtn: {
        background: "none",
        border: "none",
        color: "#156372",
        cursor: "pointer",
        padding: "4px",
        borderRadius: "4px",
    },
    addNewBtn: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        background: "none",
        border: "none",
        color: "#156372",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        padding: "4px 0",
    },
    footer: {
        padding: "20px 24px",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        gap: "12px",
    },
    saveBtn: {
        backgroundColor: "#156372",
        color: "white",
        padding: "8px 20px",
        borderRadius: "6px",
        border: "none",
        fontWeight: "500",
        cursor: "pointer",
        fontSize: "14px",
    },
    cancelBtn: {
        backgroundColor: "#ffffff",
        color: "#374151",
        padding: "8px 20px",
        borderRadius: "6px",
        border: "1px solid #d1d5db",
        fontWeight: "500",
        cursor: "pointer",
        fontSize: "14px",
    },
};
