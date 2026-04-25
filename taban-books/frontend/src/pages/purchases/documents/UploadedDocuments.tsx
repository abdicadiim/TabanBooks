import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  MoreVertical,
  Upload,
  FileText,
  RefreshCw,
  Filter,
  Search,
  List,
  Calendar,
  Scan,
} from "lucide-react";

type BillId = string | number;

interface BillRecord {
  id?: BillId;
  _id?: BillId;
  [key: string]: unknown;
}

export default function UploadedDocuments() {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All Documents");
  const [isDragging, setIsDragging] = useState(false);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const uploadMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  // Load bills from localStorage
  useEffect(() => {
    const loadBills = () => {
      const savedBills = JSON.parse(localStorage.getItem("bills") || "[]") as unknown;
      const normalizedBills = Array.isArray(savedBills) ? (savedBills as BillRecord[]) : [];
      setBills(normalizedBills);
    };

    loadBills();

    // Listen for updates
    const handleBillsUpdate = () => {
      loadBills();
    };

    window.addEventListener("billsUpdated", handleBillsUpdate);
    window.addEventListener("storage", handleBillsUpdate);
    window.addEventListener("focus", handleBillsUpdate);

    return () => {
      window.removeEventListener("billsUpdated", handleBillsUpdate);
      window.removeEventListener("storage", handleBillsUpdate);
      window.removeEventListener("focus", handleBillsUpdate);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreMenuOpen(false);
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(target)) {
        setUploadMenuOpen(false);
      }
    };

    if (dropdownOpen || moreMenuOpen || uploadMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, moreMenuOpen, uploadMenuOpen]);

  const handleAttachFromDesktop = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log("Files selected:", files);
      // Handle file upload logic here
    }
    setUploadMenuOpen(false);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      console.log("Files dropped:", files);
      // Handle file upload logic here
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate().toString().padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(
        bills
          .map((bill) => String(bill.id ?? bill._id ?? ""))
          .filter((id) => id.length > 0)
      );
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      width: "100%",
      backgroundColor: "#ffffff",
    },
    header: {
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
    },
    headerContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "24px",
      flex: 1,
    },
    navTab: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#6b7280",
      textDecoration: "none",
      padding: "8px 0",
      borderBottom: "2px solid transparent",
      transition: "all 0.2s",
      background: "none",
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      cursor: "pointer",
    },
    navTabActive: {
      color: "#156372",
      borderBottomColor: "#156372",
    },
    dropdownWrapper: {
      position: "relative",
      display: "inline-block",
    },
    dropdownButton: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#156372",
      textDecoration: "none",
      padding: "8px 0",
      borderBottom: "2px solid #156372",
      background: "none",
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "180px",
      zIndex: 100,
      padding: "4px 0",
    },
    dropdownItem: {
      display: "block",
      width: "100%",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#374151",
      cursor: "pointer",
      border: "none",
      background: "none",
      textAlign: "left",
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    autoscansBadge: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "14px",
      color: "#374151",
      padding: "6px 12px",
      backgroundColor: "#f9fafb",
      borderRadius: "6px",
    },
    uploadWrapper: {
      position: "relative",
      display: "inline-block",
    },
    uploadButton: {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#111827",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    uploadMenu: {
      position: "absolute",
      top: "100%",
      right: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "200px",
      zIndex: 100,
      padding: "4px 0",
    },
    uploadMenuItem: {
      display: "block",
      width: "100%",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      textAlign: "left",
    },
    newButton: {
      padding: "8px 16px",
      backgroundColor: "#156372",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      transition: "background-color 0.2s",
    },
    content: {
      padding: "48px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100vh - 200px)",
      backgroundColor: "#ffffff",
    },
    dropZone: {
      width: "100%",
      maxWidth: "600px",
      border: "2px dashed #d1d5db",
      borderRadius: "12px",
      padding: "64px 32px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#fafafa",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    dropZoneDragging: {
      borderColor: "#156372",
      backgroundColor: "#eff6ff",
    },
    uploadIcon: {
      width: "120px",
      height: "120px",
      marginBottom: "24px",
      position: "relative",
    },
    cloud1: {
      position: "absolute",
      top: "20px",
      left: "10px",
      width: "50px",
      height: "50px",
      backgroundColor: "#fbbf24",
      borderRadius: "50px 50px 50px 0",
      transform: "rotate(-20deg)",
    },
    cloud2: {
      position: "absolute",
      top: "30px",
      right: "15px",
      width: "60px",
      height: "60px",
      backgroundColor: "#fb923c",
      borderRadius: "50px 50px 0 50px",
      transform: "rotate(20deg)",
    },
    arrow: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "0",
      height: "0",
      borderLeft: "12px solid transparent",
      borderRight: "12px solid transparent",
      borderBottom: "20px solid #ffffff",
      zIndex: 1,
    },
    dropZoneTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "8px",
      textAlign: "center",
    },
    dropZoneSubtitle: {
      fontSize: "14px",
      color: "#6b7280",
      marginBottom: "24px",
      textAlign: "center",
    },
    chooseFilesButton: {
      padding: "10px 24px",
      backgroundColor: "#156372",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      transition: "background-color 0.2s",
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <div style={{ fontSize: "20px", fontWeight: "600", color: "#111827" }}>
              Uploaded Documents
            </div>
            <div style={styles.dropdownWrapper} ref={dropdownRef}>
              <button
                style={styles.dropdownButton}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {selectedView}
                {dropdownOpen ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
              {dropdownOpen && (
                <div style={styles.dropdown}>
                  {["All Documents", "Draft", "Open", "Paid", "Overdue"].map((option) => (
                    <button
                      key={option}
                      style={styles.dropdownItem}
                      onClick={() => {
                        setSelectedView(option);
                        setDropdownOpen(false);
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <NavLink
              to="/purchases/bills"
              style={({ isActive }) => ({
                ...styles.navTab,
                ...(isActive ? styles.navTabActive : {}),
              })}
            >
              Bills
            </NavLink>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.autoscansBadge}>
              <Scan size={16} />
              <span>Available Autoscans: 2</span>
            </div>
            <button
              style={{
                padding: "8px",
                color: "#6b7280",
                backgroundColor: "#f3f4f6",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
              }}
            >
              <List size={18} />
            </button>
            <button
              style={{
                padding: "8px",
                color: "#6b7280",
                backgroundColor: "#f3f4f6",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
              }}
            >
              <Calendar size={18} />
            </button>
            <div style={styles.uploadWrapper} ref={uploadMenuRef}>
              <button
                style={styles.uploadButton}
                onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                  e.currentTarget.style.borderColor = "#9ca3af";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
              >
                Upload Bill
                <ChevronDown size={14} />
              </button>
              {uploadMenuOpen && (
                <div style={styles.uploadMenu}>
                  <button
                    style={styles.uploadMenuItem}
                    onClick={handleAttachFromDesktop}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    Attach From Desktop
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>
            <button
              style={styles.newButton}
              onClick={() => navigate("/purchases/bills/new")}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0D4A52")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#156372")}
            >
              <Plus size={16} />
              New
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Always show Drop Zone */}
      <div style={styles.content}>
        <div
          ref={dropZoneRef}
          style={{
            ...styles.dropZone,
            ...(isDragging ? styles.dropZoneDragging : {}),
          }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={styles.uploadIcon}>
            <div style={styles.cloud1}></div>
            <div style={styles.cloud2}></div>
            <div style={styles.arrow}></div>
          </div>
          <h2 style={styles.dropZoneTitle}>Drag & Drop Files Here</h2>
          <p style={styles.dropZoneSubtitle}>
            Upload your documents (Images, PDF, Docs or Sheets) here
          </p>
          <button
            type="button"
            style={styles.chooseFilesButton}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0D4A52")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#156372")}
          >
            Choose files to upload
          </button>
        </div>
      </div>
    </div>
  );
}

