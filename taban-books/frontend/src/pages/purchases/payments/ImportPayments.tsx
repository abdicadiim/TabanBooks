// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, HelpCircle, Download as DownloadIcon, ChevronRight, Search, Lightbulb, RefreshCw } from "lucide-react";

export default function ImportPayments() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedFile, setSelectedFile] = useState(null);
    const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
    const [autoGeneratePaymentNumbers, setAutoGeneratePaymentNumbers] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
    const [encodingSearch, setEncodingSearch] = useState("");
    const fileInputRef = useRef(null);
    const encodingDropdownRef = useRef(null);

    // Red color for buttons
    const PRIMARY_COLOR = "#0D4A52";
    const PRIMARY_HOVER = "#0D4A52";

    const encodings = [
        "UTF-8 (Unicode)",
        "UTF-16 (Unicode)",
        "ISO-8859-1",
        "ISO-8859-2",
        "ISO-8859-9 (Turkish)",
        "GB2312 (Simplified Chinese)",
        "Big5 (Traditional Chinese)",
    ];

    // Close encoding dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (encodingDropdownRef.current && !encodingDropdownRef.current.contains(event.target)) {
                setIsEncodingDropdownOpen(false);
                setEncodingSearch("");
            }
        };

        if (isEncodingDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isEncodingDropdownOpen]);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (25 MB)
            if (file.size > 25 * 1024 * 1024) {
                alert("File size exceeds 25 MB limit.");
                return;
            }
            // Validate file type
            const validExtensions = [".csv", ".tsv", ".xls", ".xlsx"];
            const fileExtension = "." + file.name.split(".").pop().toLowerCase();
            if (!validExtensions.includes(fileExtension)) {
                alert("Invalid file format. Please select a CSV, TSV, or XLS file.");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (file.size > 25 * 1024 * 1024) {
                alert("File size exceeds 25 MB limit.");
                return;
            }
            const validExtensions = [".csv", ".tsv", ".xls", ".xlsx"];
            const fileExtension = "." + file.name.split(".").pop().toLowerCase();
            if (!validExtensions.includes(fileExtension)) {
                alert("Invalid file format. Please select a CSV, TSV, or XLS file.");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleNext = () => {
        if (selectedFile && currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleCancel = () => {
        navigate("/purchases/payments-made");
    };

    const downloadSampleFile = (type) => {
        const headers = ["Payment Number", "Payment Date", "Vendor Name", "Amount", "Account", "Payment Mode", "Reference#", "Description"];
        const sampleData = [
            ["PMT-001", "2023-11-01", "Sample Vendor", "500.00", "Bank", "Check", "REF-123", "Payment for Bill-001"],
            ["PMT-002", "2023-11-05", "Office Depot", "150.00", "Cash", "Cash", "REF-456", "Supplies payment"]
        ];

        let content = "";
        let mimeType = "";
        let extension = "";

        if (type === 'csv') {
            content = [headers.join(","), ...sampleData.map(row => row.join(","))].join("\n");
            mimeType = "text/csv;charset=utf-8;";
            extension = "csv";
        } else {
            content = [headers.join("\t"), ...sampleData.map(row => row.join("\t"))].join("\n");
            mimeType = "application/vnd.ms-excel;charset=utf-8;";
            extension = "xls";
        }

        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `sample_payments.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const filteredEncodings = encodings.filter(enc =>
        enc.toLowerCase().includes(encodingSearch.toLowerCase())
    );

    const steps = [
        { number: 1, label: "Configure", active: currentStep === 1 },
        { number: 2, label: "Map Fields", active: currentStep === 2 },
        { number: 3, label: "Preview", active: currentStep === 3 },
    ];

    return (
        <div style={{
            width: "100%",
            backgroundColor: "#ffffff",
            minHeight: "100vh",
        }}>
            {/* Header */}
            <div style={{
                padding: "16px 24px",
                backgroundColor: "#ffffff",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                    <button
                        style={{
                            padding: "8px",
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "6px",
                            color: "#6b7280",
                        }}
                        onClick={() => navigate("/purchases/payments-made")}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#f3f4f6";
                            e.target.style.color = "#111827";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = "#6b7280";
                        }}
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
                        <Search size={16} style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#9ca3af",
                            pointerEvents: "none",
                        }} />
                        <input
                            type="text"
                            placeholder="Search in Payments Made (/)"
                            style={{
                                width: "100%",
                                padding: "8px 12px 8px 36px",
                                fontSize: "14px",
                                border: "1px solid #e5e7eb",
                                borderRadius: "6px",
                                backgroundColor: "#ffffff",
                                color: "#111827",
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{
                padding: "48px 24px",
                maxWidth: "900px",
                margin: "0 auto",
            }}>
                {/* Title */}
                <h1 style={{
                    fontSize: "24px",
                    fontWeight: "600",
                    color: "#111827",
                    marginBottom: "32px",
                }}>
                    Bill Payments - Select File
                </h1>

                {/* Progress Indicator */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "40px",
                }}>
                    {steps.map((step, index) => (
                        <React.Fragment key={step.number}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                            }}>
                                <div style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    backgroundColor: step.active ? PRIMARY_COLOR : "#e5e7eb",
                                    color: step.active ? "#ffffff" : "#6b7280",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                }}>
                                    {step.number}
                                </div>
                                <span style={{
                                    fontSize: "14px",
                                    fontWeight: step.active ? "600" : "400",
                                    color: step.active ? "#111827" : "#6b7280",
                                }}>
                                    {step.label}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <ChevronRight size={16} style={{ color: "#9ca3af" }} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* File Upload Area */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    style={{
                        border: `2px dashed ${isDragging ? PRIMARY_COLOR : "#d1d5db"}`,
                        borderRadius: "8px",
                        padding: "48px 24px",
                        textAlign: "center",
                        backgroundColor: isDragging ? "#fef2f2" : "#ffffff",
                        marginBottom: "32px",
                        transition: "all 0.2s",
                    }}
                >
                    <DownloadIcon size={48} style={{
                        color: "#9ca3af",
                        margin: "0 auto 16px",
                        display: "block",
                    }} />
                    <p style={{
                        fontSize: "16px",
                        color: "#374151",
                        marginBottom: "24px",
                    }}>
                        Drag and drop file to import
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.tsv,.xls,.xlsx"
                        onChange={handleFileSelect}
                        style={{ display: "none" }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            padding: "12px 24px",
                            backgroundColor: PRIMARY_COLOR,
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            marginBottom: "16px",
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = PRIMARY_HOVER}
                        onMouseLeave={(e) => e.target.style.backgroundColor = PRIMARY_COLOR}
                    >
                        Choose File
                    </button>
                    {selectedFile && (
                        <p style={{
                            fontSize: "14px",
                            color: "#059669",
                            marginTop: "12px",
                        }}>
                            Selected: {selectedFile.name}
                        </p>
                    )}
                    <p style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginTop: "8px",
                    }}>
                        Maximum File Size: 25 MB • File Format: CSV or TSV or XLS
                    </p>
                </div>

                {/* Sample File Download */}
                <div style={{ marginBottom: "24px" }}>
                    <p style={{
                        fontSize: "14px",
                        color: "#374151",
                    }}>
                        Download a{" "}
                        <button
                            onClick={() => downloadSampleFile('csv')}
                            style={{
                                color: "#156372",
                                textDecoration: "none",
                                cursor: "pointer",
                                border: "none",
                                background: "none",
                                padding: 0,
                                fontSize: "14px"
                            }}
                            onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                        >
                            sample csv file
                        </button>
                        {" "}or{" "}
                        <button
                            onClick={() => downloadSampleFile('xls')}
                            style={{
                                color: "#156372",
                                textDecoration: "none",
                                cursor: "pointer",
                                border: "none",
                                background: "none",
                                padding: 0,
                                fontSize: "14px"
                            }}
                            onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                        >
                            sample xls file
                        </button>
                        {" "}and compare it to your import file to ensure you have the file perfect for the import.
                    </p>
                </div>

                {/* Character Encoding */}
                <div style={{
                    marginBottom: "24px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                }}>
                    <label style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}>
                        Character Encoding
                        <HelpCircle size={16} style={{ color: "#9ca3af", cursor: "help" }} />
                    </label>
                    <div style={{ position: "relative" }} ref={encodingDropdownRef}>
                        <button
                            onClick={() => setIsEncodingDropdownOpen(!isEncodingDropdownOpen)}
                            style={{
                                padding: "8px 12px",
                                fontSize: "14px",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                backgroundColor: "#ffffff",
                                color: "#111827",
                                cursor: "pointer",
                                minWidth: "200px",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <span>{characterEncoding}</span>
                            <ChevronRight
                                size={16}
                                style={{
                                    color: "#6b7280",
                                    transform: isEncodingDropdownOpen ? "rotate(90deg)" : "rotate(0deg)",
                                    transition: "transform 0.2s",
                                }}
                            />
                        </button>
                        {isEncodingDropdownOpen && (
                            <div style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                marginTop: "4px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "6px",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                minWidth: "200px",
                                zIndex: 100,
                                maxHeight: "200px",
                                overflowY: "auto",
                            }}>
                                <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
                                    <input
                                        type="text"
                                        placeholder="Search encoding..."
                                        value={encodingSearch}
                                        onChange={(e) => setEncodingSearch(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "6px 8px",
                                            fontSize: "14px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "4px",
                                        }}
                                    />
                                </div>
                                {filteredEncodings.map((encoding) => (
                                    <button
                                        key={encoding}
                                        onClick={() => {
                                            setCharacterEncoding(encoding);
                                            setIsEncodingDropdownOpen(false);
                                            setEncodingSearch("");
                                        }}
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            fontSize: "14px",
                                            textAlign: "left",
                                            border: "none",
                                            background: characterEncoding === encoding ? "#eff6ff" : "transparent",
                                            color: characterEncoding === encoding ? "#156372" : "#111827",
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (characterEncoding !== encoding) {
                                                e.target.style.backgroundColor = "#f9fafb";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (characterEncoding !== encoding) {
                                                e.target.style.backgroundColor = "transparent";
                                            }
                                        }}
                                    >
                                        {encoding}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Auto-Generate Payment Numbers */}
                <div style={{ marginBottom: "32px" }}>
                    <label style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        cursor: "pointer",
                    }}>
                        <input
                            type="checkbox"
                            checked={autoGeneratePaymentNumbers}
                            onChange={(e) => setAutoGeneratePaymentNumbers(e.target.checked)}
                            style={{
                                width: "18px",
                                height: "18px",
                                cursor: "pointer",
                                marginTop: "2px",
                            }}
                        />
                        <div>
                            <div style={{
                                fontSize: "14px",
                                fontWeight: "500",
                                color: "#374151",
                                marginBottom: "4px",
                            }}>
                                Auto-Generate Payment Numbers
                            </div>
                            <div style={{
                                fontSize: "12px",
                                color: "#6b7280",
                            }}>
                                Payment numbers will be generated automatically according to your settings. Any Payment numbers in the import file will be ignored.
                            </div>
                        </div>
                    </label>
                </div>

                {/* Page Tips */}
                <div style={{
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    padding: "16px",
                    marginBottom: "32px",
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "12px",
                    }}>
                        <Lightbulb size={18} style={{ color: "#f59e0b" }} />
                        <h3 style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#111827",
                            margin: 0,
                        }}>
                            Page Tips
                        </h3>
                    </div>
                    <ul style={{
                        margin: 0,
                        paddingLeft: "20px",
                        fontSize: "13px",
                        color: "#374151",
                        lineHeight: "1.6",
                    }}>
                        <li style={{ marginBottom: "8px" }}>
                            If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.
                        </li>
                        <li>
                            You can configure your import settings and save them for future too!
                        </li>
                    </ul>
                </div>

                {/* Action Buttons */}
                <div style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                }}>
                    <button
                        onClick={handleCancel}
                        style={{
                            padding: "10px 24px",
                            backgroundColor: "#ffffff",
                            color: "#374151",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "#ffffff"}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={!selectedFile}
                        style={{
                            padding: "10px 24px",
                            backgroundColor: selectedFile ? PRIMARY_COLOR : "#d1d5db",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: selectedFile ? "pointer" : "not-allowed",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                        onMouseEnter={(e) => {
                            if (selectedFile) {
                                e.target.style.backgroundColor = PRIMARY_HOVER;
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (selectedFile) {
                                e.target.style.backgroundColor = PRIMARY_COLOR;
                            }
                        }}
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}







