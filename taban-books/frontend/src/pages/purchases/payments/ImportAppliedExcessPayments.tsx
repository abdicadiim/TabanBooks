import React, {
    useState,
    useRef,
    useEffect,
    type ChangeEvent,
    type DragEvent,
    type MouseEvent as ReactMouseEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { X, HelpCircle, Download as DownloadIcon, ChevronRight, Search, Lightbulb, RefreshCw } from "lucide-react";

export default function ImportAppliedExcessPayments() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
    const [isDragging, setIsDragging] = useState(false);
    const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
    const [encodingSearch, setEncodingSearch] = useState("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const encodingDropdownRef = useRef<HTMLDivElement | null>(null);

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

    const getFileExtension = (file: File) => `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;

    // Close encoding dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (encodingDropdownRef.current && event.target instanceof Node && !encodingDropdownRef.current.contains(event.target)) {
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

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (25 MB)
            if (file.size > 25 * 1024 * 1024) {
                alert("File size exceeds 25 MB limit.");
                return;
            }
            // Validate file type
            const validExtensions = [".csv", ".tsv", ".xls", ".xlsx"];
            const fileExtension = getFileExtension(file);
            if (!validExtensions.includes(fileExtension)) {
                alert("Invalid file format. Please select a CSV, TSV, or XLS file.");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (file.size > 25 * 1024 * 1024) {
                alert("File size exceeds 25 MB limit.");
                return;
            }
            const validExtensions = [".csv", ".tsv", ".xls", ".xlsx"];
            const fileExtension = getFileExtension(file);
            if (!validExtensions.includes(fileExtension)) {
                alert("Invalid file format. Please select a CSV, TSV, or XLS file.");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
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
                        onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => {
                            e.currentTarget.style.backgroundColor = "#f3f4f6";
                            e.currentTarget.style.color = "#111827";
                        }}
                        onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "#6b7280";
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
                <button
                    onClick={handleCancel}
                    style={{
                        padding: "8px",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "6px",
                        color: "#0D4A52",
                    }}
                    onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => {
                        e.currentTarget.style.backgroundColor = "#fef2f2";
                    }}
                    onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    title="Close"
                >
                    <X size={24} />
                </button>
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
                    Applied Excess Payments - Select File
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
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            margin: "0 auto 16px",
                        }}
                        onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = PRIMARY_HOVER}
                        onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = PRIMARY_COLOR}
                    >
                        Choose File
                        <ChevronRight size={16} style={{ transform: "rotate(-90deg)" }} />
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
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                // Handle sample CSV file download
                            }}
                            style={{
                                color: "#156372",
                                textDecoration: "underline",
                                cursor: "pointer",
                            }}
                            onMouseEnter={(e: ReactMouseEvent<HTMLAnchorElement>) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={(e: ReactMouseEvent<HTMLAnchorElement>) => e.currentTarget.style.textDecoration = "underline"}
                        >
                            sample csv file
                        </a>
                        {" "}or{" "}
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                // Handle sample XLS file download
                            }}
                            style={{
                                color: "#156372",
                                textDecoration: "underline",
                                cursor: "pointer",
                            }}
                            onMouseEnter={(e: ReactMouseEvent<HTMLAnchorElement>) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={(e: ReactMouseEvent<HTMLAnchorElement>) => e.currentTarget.style.textDecoration = "underline"}
                        >
                            sample xls file
                        </a>
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
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEncodingSearch(e.target.value)}
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
                                        onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => {
                                            if (characterEncoding !== encoding) {
                                                e.currentTarget.style.backgroundColor = "#f9fafb";
                                            }
                                        }}
                                        onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => {
                                            if (characterEncoding !== encoding) {
                                                e.currentTarget.style.backgroundColor = "transparent";
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

                {/* Notes Section */}
                <div style={{
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    padding: "16px",
                    marginBottom: "24px",
                }}>
                    <h3 style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#111827",
                        marginBottom: "12px",
                        textTransform: "uppercase",
                    }}>
                        NOTES:
                    </h3>
                    <ul style={{
                        margin: 0,
                        paddingLeft: "20px",
                        fontSize: "13px",
                        color: "#374151",
                        lineHeight: "1.6",
                    }}>
                        <li style={{ marginBottom: "8px" }}>
                            When you import applied excess payments, the excess payment amount will be added to the existing bill amount if you've already applied payment to it in Taban Books.
                        </li>
                        <li>
                            Bill payments will not be imported for bills in the Draft or the Paid status.
                        </li>
                    </ul>
                </div>

                {/* Page Tips */}
                <div style={{
                    backgroundColor: "#fef3c7",
                    border: "1px solid #fde68a",
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
                            You can download the{" "}
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    // Handle sample XLS file download
                                }}
                                style={{
                                    color: "#156372",
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                }}
                            >
                                sample xls file
                            </a>
                            {" "}to get detailed information about the data fields used while importing.
                        </li>
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
                        onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                        onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = "#ffffff"}
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
                        onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => {
                            if (selectedFile) {
                                e.currentTarget.style.backgroundColor = PRIMARY_HOVER;
                            }
                        }}
                        onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => {
                            if (selectedFile) {
                                e.currentTarget.style.backgroundColor = PRIMARY_COLOR;
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








