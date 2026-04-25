import React, { useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Scan, Info, Trash2, Check, X, Search, ChevronDown, Tag, MoreVertical, PlusCircle, GripVertical, ChevronLeft } from "lucide-react";
import { receiptsAPI } from "../../../services/api";

const RECEIPTS_KEY = "receipts_v1";

// Expense account options organized by category
const expenseAccountOptions = [
  { category: "Cost Of Goods Sold", options: ["Cost of Goods Sold"] },
  {
    category: "Expense", options: [
      "Advertising And Marketing",
      "Automobile Expense",
      "Bad Debt",
      "Bank Fees and Charges",
      "Consultant Expense",
      "Credit Card Charges",
      "Depreciation Expense",
      "Fuel/Mileage Expenses",
      "IT and Internet Expenses",
      "Janitorial Expense",
      "Lodging",
      "Meals and Entertainment",
      "Office Supplies",
      "Other Expenses",
      "Parking",
      "Postage",
      "Printing and Stationery",
      "Purchase Discounts",
      "Rent Expense",
      "Repairs and Maintenance",
      "Salaries and Employee Wages",
      "Telephone Expense",
      "Travel Expense",
    ]
  },
  {
    category: "Other Current Liability", options: [
      "Employee Reimbursements",
      "VAT Payable",
    ]
  },
  { category: "Fixed Asset", options: ["Furniture and Equipment"] },
  {
    category: "Other Current Asset", options: [
      "Advance Tax",
      "Employee Advance",
      "Prepaid Expenses",
      "Sales to Customers (Cash)",
    ]
  },
];

export default function ReceiptsInbox() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [selectedReceipts, setSelectedReceipts] = useState([]);
  const [showRecordExpenseModal, setShowRecordExpenseModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [currentReceiptIndex, setCurrentReceiptIndex] = useState(0);
  const [isItemizeView, setIsItemizeView] = useState(false);
  const fileInputRef = useRef(null);

  // Form state for Record Expense modal
  const [expenseForm, setExpenseForm] = useState({
    date: "",
    expenseAccount: "",
    amount: "",
    currency: "USD",
    paidThrough: "Undeposited Funds",
    vendor: "",
    reference: "",
    description: "",
    customerName: "",
  });

  // Itemize line items
  const [expenseLineItems, setExpenseLineItems] = useState([
    { id: 1, account: "", description: "", amount: "" },
  ]);

  // Load uploaded receipts from backend
  React.useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const response = await receiptsAPI.getAll();
        if (response && response.success) {
          setUploadedFiles(response.data);
        }
      } catch (e) {
        console.error("Error loading receipts:", e);
      }
    };
    fetchReceipts();
  }, []);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processFiles = (files) => {
    const fileArray = Array.from(files);
    const newReceipts = fileArray.map((file) => {
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = (e) => {
          const receipt = {
            id: Date.now() + Math.random(),
            name: file.name,
            type: file.type,
            size: file.size,
            uploadDate: new Date().toISOString(),
            dataUrl: e.target.result,
            // Auto-generated data for demo purposes
            amount: (Math.random() * 10000).toFixed(2),
            date: new Date().toLocaleDateString("en-US", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }),
            vendor: "Unknown Vendor",
            status: "PROCESSED",
          };
          resolve(receipt);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newReceipts).then(async (receipts) => {
      try {
        const savedReceipts = [];
        for (const receipt of receipts) {
          const response = await receiptsAPI.create(receipt);
          if (response && response.success) {
            savedReceipts.push(response.data);
          }
        }
        setUploadedFiles([...uploadedFiles, ...savedReceipts]);
      } catch (error) {
        console.error("Error saving receipts to backend:", error);
        alert("Failed to save some receipts. Please try again.");
      }
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleChooseFiles = () => {
    fileInputRef.current?.click();
  };

  const formatAmount = (amount) => {
    return parseFloat(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const truncateFileName = (name, maxLength = 30) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + "...";
  };

  const openRecordExpenseModal = (receipt, index = 0) => {
    setCurrentReceipt(receipt);
    setCurrentReceiptIndex(index);
    setExpenseForm({
      date: receipt.date || new Date().toISOString().split("T")[0],
      expenseAccount: "",
      amount: receipt.amount || "",
      currency: "USD",
      paidThrough: "Undeposited Funds",
      vendor: receipt.vendor || "",
      reference: "",
      description: "",
      customerName: "",
    });
    setIsItemizeView(false);
    setExpenseLineItems([{ id: 1, account: "", description: "", amount: "" }]);
    setShowRecordExpenseModal(true);
  };

  // Itemize handlers
  const handleAddLineItem = () => {
    setExpenseLineItems([
      ...expenseLineItems,
      { id: Date.now(), account: "", description: "", amount: "" },
    ]);
  };

  const handleUpdateLineItem = (id, field, value) => {
    setExpenseLineItems(
      expenseLineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleRemoveLineItem = (id) => {
    if (expenseLineItems.length > 1) {
      setExpenseLineItems(expenseLineItems.filter((item) => item.id !== id));
    }
  };

  const calculateExpenseTotal = () => {
    return expenseLineItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const handleConvertToExpense = (receipt, e) => {
    if (e) e.stopPropagation();
    openRecordExpenseModal(receipt, 0);
  };

  const handleBulkConvertToExpense = () => {
    if (selectedReceipts.length === 0) return;
    const firstSelectedReceipt = uploadedFiles.find((r) => r.id === selectedReceipts[0]);
    if (firstSelectedReceipt) {
      openRecordExpenseModal(firstSelectedReceipt, 0);
    }
  };

  const handleDeleteReceipt = async (receiptId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this receipt?")) return;

    try {
      const response = await receiptsAPI.delete(receiptId);
      if (response && response.success) {
        const updatedReceipts = uploadedFiles.filter((r) => r.id !== receiptId);
        setUploadedFiles(updatedReceipts);
        setSelectedReceipts(selectedReceipts.filter((id) => id !== receiptId));
      }
    } catch (error) {
      console.error("Error deleting receipt:", error);
      alert("Failed to delete receipt.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReceipts.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedReceipts.length} receipts?`)) return;

    try {
      const response = await receiptsAPI.bulkDelete(selectedReceipts);
      if (response && response.success) {
        const updatedReceipts = uploadedFiles.filter((r) => !selectedReceipts.includes(r.id));
        setUploadedFiles(updatedReceipts);
        setSelectedReceipts([]);
      }
    } catch (error) {
      console.error("Error bulk deleting receipts:", error);
      alert("Failed to delete some receipts.");
    }
  };

  const handleToggleSelect = (receiptId, e) => {
    if (e) e.stopPropagation();
    if (selectedReceipts.includes(receiptId)) {
      setSelectedReceipts(selectedReceipts.filter((id) => id !== receiptId));
    } else {
      setSelectedReceipts([...selectedReceipts, receiptId]);
    }
  };

  const handleUnselectAll = () => {
    setSelectedReceipts([]);
  };

  const handleSaveExpense = async () => {
    try {
      // In a real app, you would also call expensesAPI.create(expenseForm)
      // Here we emphasize completing the Receipt lifecycle
      const response = await receiptsAPI.update(currentReceipt.id, { status: 'CONVERTED' });

      if (response && response.success) {
        // Remove the receipt from the inbox after converting
        const updatedReceipts = uploadedFiles.filter((r) => r.id !== currentReceipt.id);
        setUploadedFiles(updatedReceipts);
        setSelectedReceipts(selectedReceipts.filter((id) => id !== currentReceipt.id));

        setShowRecordExpenseModal(false);
        setCurrentReceipt(null);
      }
    } catch (error) {
      console.error("Error converting receipt to expense:", error);
      alert("Failed to save expense.");
    }
  };

  const handleSaveAndNext = async () => {
    try {
      // Convert current receipt
      const response = await receiptsAPI.update(currentReceipt.id, { status: 'CONVERTED' });

      if (response && response.success) {
        // Remove current receipt from state
        const updatedReceipts = uploadedFiles.filter((r) => r.id !== currentReceipt.id);
        const remainingSelected = selectedReceipts.filter((id) => id !== currentReceipt.id);

        setUploadedFiles(updatedReceipts);
        setSelectedReceipts(remainingSelected);

        if (remainingSelected.length > 0) {
          const nextReceipt = updatedReceipts.find((r) => r.id === remainingSelected[0]);
          if (nextReceipt) {
            openRecordExpenseModal(nextReceipt, currentReceiptIndex + 1);
          } else {
            setShowRecordExpenseModal(false);
            setCurrentReceipt(null);
          }
        } else {
          setShowRecordExpenseModal(false);
          setCurrentReceipt(null);
        }
      }
    } catch (error) {
      console.error("Error saving and moving to next:", error);
      alert("Failed to save and move to next.");
    }
  };

  const handleSkipForNow = () => {
    // Move to next without saving
    const remainingSelected = selectedReceipts.filter((id) => id !== currentReceipt.id);

    if (remainingSelected.length > 0) {
      const nextReceipt = uploadedFiles.find((r) => r.id === remainingSelected[0]);
      if (nextReceipt) {
        setSelectedReceipts(remainingSelected);
        openRecordExpenseModal(nextReceipt, currentReceiptIndex + 1);
      } else {
        setShowRecordExpenseModal(false);
        setCurrentReceipt(null);
      }
    } else {
      setShowRecordExpenseModal(false);
      setCurrentReceipt(null);
    }
  };

  const styles = {
    container: {
      width: "100%",
      backgroundColor: "#f9fafb",
      minHeight: "100vh",
    },
    header: {
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "24px",
    },
    tab: {
      fontSize: "14px",
      fontWeight: "400",
      color: "#6b7280",
      textDecoration: "none",
      paddingBottom: "8px",
      borderBottom: "2px solid transparent",
      transition: "all 0.2s",
    },
    tabActive: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      textDecoration: "none",
      paddingBottom: "8px",
      borderBottom: "2px solid #156372",
    },
    autoscansButton: {
      padding: "8px 16px",
      backgroundColor: "#eff6ff",
      color: "#156372",
      fontSize: "14px",
      fontWeight: "600",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    // Selection bar styles
    selectionBar: {
      padding: "12px 24px",
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    selectionBarLeft: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    selectionBarButton: {
      padding: "8px 16px",
      fontSize: "13px",
      fontWeight: "500",
      borderRadius: "4px",
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      color: "#374151",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    selectionCount: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginLeft: "12px",
      paddingLeft: "12px",
      borderLeft: "1px solid #e5e7eb",
    },
    selectionCountNumber: {
      color: "#156372",
      fontWeight: "600",
      fontSize: "14px",
    },
    selectionCountText: {
      color: "#6b7280",
      fontSize: "14px",
    },
    selectionBarRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: "#6b7280",
      fontSize: "14px",
      cursor: "pointer",
    },
    content: {
      padding: "24px",
      display: "flex",
      flexWrap: "wrap",
      gap: "20px",
      alignItems: "flex-start",
    },
    uploadCard: {
      width: "220px",
      height: "280px",
      padding: "24px",
      border: "2px dashed #d1d5db",
      borderRadius: "12px",
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    uploadCardDragging: {
      borderColor: "#156372",
      backgroundColor: "#eff6ff",
    },
    uploadIcon: {
      width: "64px",
      height: "64px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    handIcon: {
      fontSize: "48px",
      color: "#9ca3af",
    },
    dashedBox: {
      width: "40px",
      height: "40px",
      border: "2px dashed #9ca3af",
      borderRadius: "4px",
      position: "absolute",
      top: "0",
      left: "12px",
    },
    uploadTitle: {
      fontSize: "14px",
      fontWeight: "600",
      fontStyle: "italic",
      color: "#374151",
      margin: 0,
      textAlign: "center",
    },
    uploadLink: {
      fontSize: "14px",
      fontWeight: "600",
      fontStyle: "italic",
      color: "#156372",
      cursor: "pointer",
      textDecoration: "none",
    },
    receiptCard: {
      width: "220px",
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      cursor: "pointer",
      transition: "all 0.2s",
      position: "relative",
    },
    receiptCardHover: {
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    },
    receiptInfo: {
      padding: "16px",
    },
    receiptAmount: {
      fontSize: "22px",
      fontWeight: "700",
      color: "#111827",
      margin: "0 0 8px 0",
    },
    receiptDetail: {
      fontSize: "13px",
      color: "#6b7280",
      margin: "0 0 4px 0",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    receiptDetailValue: {
      color: "#156372",
      fontWeight: "500",
    },
    receiptFileName: {
      fontSize: "13px",
      color: "#374151",
      margin: "8px 0",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    receiptStatus: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginTop: "8px",
    },
    statusBadge: {
      padding: "4px 8px",
      backgroundColor: "#dcfce7",
      color: "#16a34a",
      fontSize: "11px",
      fontWeight: "600",
      borderRadius: "4px",
      textTransform: "uppercase",
    },
    infoButton: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "4px 8px",
      backgroundColor: "transparent",
      color: "#156372",
      fontSize: "12px",
      fontWeight: "500",
      border: "none",
      cursor: "pointer",
      borderRadius: "4px",
    },
    receiptImage: {
      width: "100%",
      height: "140px",
      objectFit: "cover",
      borderTop: "1px solid #e5e7eb",
    },
    receiptImagePlaceholder: {
      width: "100%",
      height: "140px",
      backgroundColor: "#f3f4f6",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderTop: "1px solid #e5e7eb",
      color: "#9ca3af",
      fontSize: "14px",
    },
    imageContainer: {
      position: "relative",
      width: "100%",
    },
    hoverOverlay: {
      position: "absolute",
      bottom: "0",
      left: "0",
      right: "0",
      padding: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
    },
    convertButton: {
      padding: "8px 16px",
      backgroundColor: "#156372",
      color: "#ffffff",
      fontSize: "13px",
      fontWeight: "600",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      transition: "background-color 0.2s",
    },
    deleteButton: {
      padding: "8px",
      backgroundColor: "transparent",
      color: "#156372",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background-color 0.2s",
    },
    checkboxContainer: {
      position: "absolute",
      top: "12px",
      right: "12px",
      zIndex: 10,
    },
    checkbox: {
      width: "24px",
      height: "24px",
      borderRadius: "4px",
      border: "2px solid #d1d5db",
      backgroundColor: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    checkboxSelected: {
      backgroundColor: "#156372",
      borderColor: "#156372",
    },
    // Modal styles
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      width: "95%",
      maxWidth: "1100px",
      maxHeight: "90vh",
      overflow: "hidden",
      display: "flex",
      boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
    },
    modalLeft: {
      flex: "0 0 45%",
      backgroundColor: "#f9fafb",
      borderRight: "1px solid #e5e7eb",
      display: "flex",
      flexDirection: "column",
      maxHeight: "90vh",
    },
    modalLeftHeader: {
      padding: "16px 20px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#ffffff",
    },
    modalLeftTitle: {
      fontSize: "14px",
      color: "#374151",
      margin: 0,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: "200px",
    },
    modalLeftNav: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: "#6b7280",
      fontSize: "13px",
    },
    modalLeftImage: {
      flex: 1,
      padding: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "auto",
    },
    modalLeftImageContent: {
      maxWidth: "100%",
      maxHeight: "100%",
      objectFit: "contain",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    },
    modalLeftFooter: {
      padding: "12px 20px",
      borderTop: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      backgroundColor: "#ffffff",
    },
    zoomButton: {
      padding: "8px",
      backgroundColor: "#f3f4f6",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    modalRight: {
      flex: "0 0 55%",
      display: "flex",
      flexDirection: "column",
      maxHeight: "90vh",
    },
    modalRightHeader: {
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modalRightTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
    },
    modalCloseButton: {
      padding: "8px",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "4px",
    },
    modalForm: {
      flex: 1,
      padding: "24px",
      overflowY: "auto",
    },
    formRow: {
      display: "flex",
      alignItems: "flex-start",
      marginBottom: "20px",
    },
    formLabel: {
      width: "140px",
      fontSize: "14px",
      color: "#156372",
      paddingTop: "10px",
      flexShrink: 0,
    },
    formLabelNormal: {
      width: "140px",
      fontSize: "14px",
      color: "#374151",
      paddingTop: "10px",
      flexShrink: 0,
    },
    formInput: {
      flex: 1,
      padding: "10px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      outline: "none",
      transition: "border-color 0.2s",
    },
    formSelect: {
      flex: 1,
      padding: "10px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      outline: "none",
      backgroundColor: "#ffffff",
      cursor: "pointer",
    },
    formTextarea: {
      flex: 1,
      padding: "10px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      outline: "none",
      minHeight: "80px",
      resize: "vertical",
    },
    amountRow: {
      display: "flex",
      gap: "8px",
      flex: 1,
    },
    currencySelect: {
      width: "80px",
      padding: "10px 8px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      outline: "none",
      backgroundColor: "#ffffff",
    },
    amountInput: {
      flex: 1,
      padding: "10px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      outline: "none",
    },
    exchangeRate: {
      fontSize: "12px",
      color: "#6b7280",
      marginTop: "6px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    itemizeLink: {
      fontSize: "13px",
      color: "#156372",
      cursor: "pointer",
      marginTop: "6px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    vendorInputWrapper: {
      flex: 1,
      display: "flex",
      gap: "8px",
    },
    vendorInput: {
      flex: 1,
      padding: "10px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px 0 0 4px",
      outline: "none",
    },
    vendorClearButton: {
      padding: "0 8px",
      border: "1px solid #d1d5db",
      borderLeft: "none",
      backgroundColor: "#ffffff",
      color: "#156372",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
    },
    vendorDropdownButton: {
      padding: "0 8px",
      border: "1px solid #d1d5db",
      borderLeft: "none",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
    },
    vendorSearchButton: {
      padding: "10px 12px",
      backgroundColor: "#156372",
      border: "none",
      borderRadius: "0 4px 4px 0",
      color: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
    },
    formDivider: {
      borderTop: "1px solid #e5e7eb",
      margin: "24px 0",
    },
    tagsRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    tagsLink: {
      fontSize: "14px",
      color: "#156372",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    modalFooter: {
      padding: "16px 24px",
      borderTop: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#ffffff",
    },
    modalFooterLeft: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    modalFooterRight: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    saveButton: {
      padding: "10px 16px",
      backgroundColor: "#156372",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
    },
    saveNextButton: {
      padding: "10px 16px",
      backgroundColor: "#ffffff",
      color: "#374151",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "4px",
      border: "1px solid #d1d5db",
      cursor: "pointer",
    },
    skipButton: {
      padding: "10px 16px",
      backgroundColor: "#ffffff",
      color: "#374151",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "4px",
      border: "1px solid #d1d5db",
      cursor: "pointer",
    },
    cancelButton: {
      padding: "10px 16px",
      backgroundColor: "#ffffff",
      color: "#374151",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "4px",
      border: "1px solid #d1d5db",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.container}>
      {/* Selection Bar - Shows when items are selected */}
      {selectedReceipts.length > 0 ? (
        <div style={styles.selectionBar}>
          <div style={styles.selectionBarLeft}>
            <button
              style={styles.selectionBarButton}
              onClick={handleUnselectAll}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
              }}
            >
              Unselect All
            </button>
            <button
              style={styles.selectionBarButton}
              onClick={handleBulkConvertToExpense}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
              }}
            >
              Convert to Expense
            </button>
            <button
              style={styles.selectionBarButton}
              onClick={handleBulkDelete}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
              }}
            >
              Delete
            </button>
            <div style={styles.selectionCount}>
              <span style={styles.selectionCountNumber}>{selectedReceipts.length}</span>
              <span style={styles.selectionCountText}>Selected</span>
            </div>
          </div>
          <div
            style={styles.selectionBarRight}
            onClick={handleUnselectAll}
          >
            <span>Esc</span>
            <X size={16} style={{ color: "#156372" }} />
          </div>
        </div>
      ) : (
        /* Header with tabs and actions */
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <NavLink
              to="/purchases/receipts-inbox"
              style={({ isActive }) => (isActive ? styles.tabActive : styles.tab)}
            >
              Receipts Inbox
            </NavLink>
            <NavLink
              to="/purchases/expenses"
              style={({ isActive }) => (isActive ? styles.tabActive : styles.tab)}
            >
              Expenses
            </NavLink>
          </div>
          <div>
            <button style={styles.autoscansButton}>
              <Scan size={16} />
              Available Autoscans: {uploadedFiles.length > 0 ? uploadedFiles.length : 1}
            </button>
          </div>
        </div>
      )}

      {/* Main content area - Cards Grid */}
      <div style={styles.content}>
        {/* Upload Card */}
        <div
          style={{
            ...styles.uploadCard,
            ...(isDragging ? styles.uploadCardDragging : {}),
          }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleChooseFiles}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#9ca3af";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = isDragging ? "#156372" : "#d1d5db";
          }}
        >
          <div style={styles.uploadIcon}>
            <div style={styles.dashedBox}></div>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: "absolute", bottom: "0", right: "0" }}
            >
              <path d="M18 11V6a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2" />
              <path d="M14 10h.01" />
              <path d="M6 18h.01" />
              <path d="M10 14h.01" />
              <path d="M18 18h.01" />
              <path d="M9 9h.01" />
              <path d="M6 6h.01" />
              <path d="M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" />
              <path d="M8 21v-4" />
              <path d="M16 21v-4" />
              <path d="M12 21v-4" />
              <path d="M12 12v-2" />
              <path d="M12 6V4" />
            </svg>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: "absolute", bottom: "8px", right: "8px" }}
            >
              <path d="M7 11v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" />
              <path d="M14 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
              <path d="M7 11h10a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H7" />
              <path d="M10 11V8" />
            </svg>
          </div>
          <p style={styles.uploadTitle}>
            Drag & Drop Files
            <br />
            Here to{" "}
            <span style={styles.uploadLink}>upload</span>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>

        {/* Uploaded Receipt Cards */}
        {uploadedFiles.map((receipt) => {
          const isHovered = hoveredCardId === receipt.id;
          const isSelected = selectedReceipts.includes(receipt.id);

          return (
            <div
              key={receipt.id}
              style={{
                ...styles.receiptCard,
                ...(isHovered ? { boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)", transform: "translateY(-2px)" } : {}),
              }}
              onClick={() => {
                // Navigate to receipt detail or open modal
                console.log("Receipt clicked:", receipt);
              }}
              onMouseEnter={() => setHoveredCardId(receipt.id)}
              onMouseLeave={() => setHoveredCardId(null)}
            >
              {/* Checkbox - visible on hover or when selected */}
              {(isHovered || isSelected) && (
                <div style={styles.checkboxContainer}>
                  <div
                    style={{
                      ...styles.checkbox,
                      ...(isSelected ? styles.checkboxSelected : {}),
                    }}
                    onClick={(e) => handleToggleSelect(receipt.id, e)}
                  >
                    {isSelected && <Check size={14} color="#ffffff" />}
                  </div>
                </div>
              )}

              <div style={styles.receiptInfo}>
                <p style={styles.receiptAmount}>${formatAmount(receipt.amount)}</p>
                <p style={styles.receiptDetail}>
                  Date : <span style={{ color: "#111827" }}>{receipt.date}</span>
                </p>
                <p style={styles.receiptDetail}>
                  Vendor : <span style={styles.receiptDetailValue}>{receipt.vendor}</span>
                </p>
                <p style={styles.receiptFileName}>{truncateFileName(receipt.name)}</p>
                <div style={styles.receiptStatus}>
                  <span style={styles.statusBadge}>{receipt.status}</span>
                  <button
                    style={styles.infoButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("Info clicked for:", receipt);
                    }}
                  >
                    <Info size={14} />
                    Info
                  </button>
                </div>
              </div>

              <div style={styles.imageContainer}>
                {receipt.type?.startsWith("image/") ? (
                  <img
                    src={receipt.dataUrl}
                    alt={receipt.name}
                    style={styles.receiptImage}
                  />
                ) : (
                  <div style={styles.receiptImagePlaceholder}>
                    {receipt.type?.includes("pdf") ? "PDF Document" : "Document"}
                  </div>
                )}

                {/* Hover overlay with buttons */}
                {isHovered && (
                  <div style={styles.hoverOverlay}>
                    <button
                      style={styles.convertButton}
                      onClick={(e) => handleConvertToExpense(receipt, e)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#0D4A52";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#156372";
                      }}
                    >
                      Convert to Expense
                    </button>
                    <button
                      style={styles.deleteButton}
                      onClick={(e) => handleDeleteReceipt(receipt.id, e)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Record Expense Modal */}
      {showRecordExpenseModal && currentReceipt && (
        <div style={styles.modalOverlay} onClick={() => setShowRecordExpenseModal(false)}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            width: "95%",
            maxWidth: "750px",
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: "20px 24px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#111827", margin: 0 }}>Record Expense</h2>
              <button
                style={{
                  padding: "8px",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#6b7280",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                }}
                onClick={() => setShowRecordExpenseModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
              {/* Date */}
              <div style={styles.formRow}>
                <label style={styles.formLabel}>Date*</label>
                <input
                  type="text"
                  style={styles.formInput}
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Itemize View Toggle */}
              {!isItemizeView ? (
                <>
                  {/* Expense Account - Single View */}
                  <div style={styles.formRow}>
                    <label style={styles.formLabel}>Expense Account*</label>
                    <div style={{ flex: 1 }}>
                      <select
                        style={styles.formSelect}
                        value={expenseForm.expenseAccount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, expenseAccount: e.target.value })}
                      >
                        <option value="">Select an account</option>
                        {expenseAccountOptions.map((category) => (
                          <optgroup key={category.category} label={category.category}>
                            {category.options.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <div
                        style={styles.itemizeLink}
                        onClick={() => setIsItemizeView(true)}
                      >
                        <span>⊞</span> Itemize
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={styles.formRow}>
                    <label style={styles.formLabel}>Amount*</label>
                    <div style={{ flex: 1 }}>
                      <div style={styles.amountRow}>
                        <select
                          style={styles.currencySelect}
                          value={expenseForm.currency}
                          onChange={(e) => setExpenseForm({ ...expenseForm, currency: e.target.value })}
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="USD">KES</option>
                        </select>
                        <input
                          type="text"
                          style={styles.amountInput}
                          value={expenseForm.amount}
                          onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div style={styles.exchangeRate}>
                        (As on 2025-03-10) 1 USD = 129.349373 KES
                        <span style={{ color: "#156372", cursor: "pointer" }}>✎</span>
                      </div>
                    </div>
                  </div>

                  {/* Paid Through */}
                  <div style={styles.formRow}>
                    <label style={styles.formLabel}>Paid Through*</label>
                    <select
                      style={styles.formSelect}
                      value={expenseForm.paidThrough}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paidThrough: e.target.value })}
                    >
                      <option value="Undeposited Funds">Undeposited Funds</option>
                      <option value="Petty Cash">Petty Cash</option>
                      <option value="Bank Account">Bank Account</option>
                    </select>
                  </div>

                  {/* Vendor */}
                  <div style={styles.formRow}>
                    <label style={styles.formLabelNormal}>Vendor</label>
                    <div style={styles.vendorInputWrapper}>
                      <input
                        type="text"
                        style={{ ...styles.formInput, borderRadius: "4px 0 0 4px" }}
                        value={expenseForm.vendor}
                        onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                        placeholder=""
                      />
                      <button style={styles.vendorClearButton}>
                        <X size={14} />
                      </button>
                      <button style={styles.vendorDropdownButton}>
                        <ChevronDown size={14} />
                      </button>
                      <button style={styles.vendorSearchButton}>
                        <Search size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Reference# */}
                  <div style={styles.formRow}>
                    <label style={styles.formLabelNormal}>Reference#</label>
                    <input
                      type="text"
                      style={styles.formInput}
                      value={expenseForm.reference}
                      onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                    />
                  </div>

                  {/* Description */}
                  <div style={styles.formRow}>
                    <label style={styles.formLabelNormal}>Description</label>
                    <textarea
                      style={styles.formTextarea}
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    />
                  </div>

                  <div style={styles.formDivider}></div>

                  {/* Customer Name */}
                  <div style={styles.formRow}>
                    <label style={styles.formLabelNormal}>Customer Name</label>
                    <div style={styles.vendorInputWrapper}>
                      <input
                        type="text"
                        style={{ ...styles.formInput, borderRadius: "4px 0 0 4px" }}
                        value={expenseForm.customerName}
                        onChange={(e) => setExpenseForm({ ...expenseForm, customerName: e.target.value })}
                        placeholder="Select or add a customer"
                      />
                      <button style={styles.vendorDropdownButton}>
                        <ChevronDown size={14} />
                      </button>
                      <button style={styles.vendorSearchButton}>
                        <Search size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Reporting Tags */}
                  <div style={styles.formRow}>
                    <label style={styles.formLabelNormal}>Reporting Tags</label>
                    <div style={styles.tagsLink}>
                      <Tag size={14} />
                      Associate Tags
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Itemize View - Back Link */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "#156372",
                      fontSize: "13px",
                      cursor: "pointer",
                      marginBottom: "16px",
                    }}
                    onClick={() => setIsItemizeView(false)}
                  >
                    <ChevronLeft size={16} />
                    Back to single expense view
                  </div>

                  {/* Itemize Table */}
                  <div style={{ marginBottom: "16px" }}>
                    {/* Table Header */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "24px 1fr 1.5fr 120px 40px",
                      gap: "8px",
                      padding: "8px 0",
                      borderBottom: "1px solid #e5e7eb",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#156372",
                      textTransform: "uppercase",
                    }}>
                      <div></div>
                      <div>Expense Account</div>
                      <div style={{ color: "#374151" }}>Description</div>
                      <div style={{ textAlign: "right" }}>Amount</div>
                      <div></div>
                    </div>

                    {/* Table Rows */}
                    {expenseLineItems.map((item, index) => (
                      <div
                        key={item.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "24px 1fr 1.5fr 120px 40px",
                          gap: "8px",
                          padding: "12px 0",
                          borderBottom: "1px solid #f3f4f6",
                          alignItems: "start",
                        }}
                      >
                        <div style={{ paddingTop: "8px", cursor: "grab", color: "#9ca3af" }}>
                          <GripVertical size={16} />
                        </div>
                        <select
                          style={{
                            padding: "8px 10px",
                            fontSize: "13px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            outline: "none",
                            backgroundColor: "#ffffff",
                            color: item.account ? "#111827" : "#9ca3af",
                          }}
                          value={item.account}
                          onChange={(e) => handleUpdateLineItem(item.id, "account", e.target.value)}
                        >
                          <option value="">Select an account</option>
                          {expenseAccountOptions.map((category) => (
                            <optgroup key={category.category} label={category.category}>
                              {category.options.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <textarea
                          style={{
                            padding: "8px 10px",
                            fontSize: "13px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            outline: "none",
                            resize: "vertical",
                            minHeight: "36px",
                          }}
                          value={item.description}
                          onChange={(e) => handleUpdateLineItem(item.id, "description", e.target.value)}
                          placeholder=""
                        />
                        <input
                          type="text"
                          style={{
                            padding: "8px 10px",
                            fontSize: "13px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            outline: "none",
                            textAlign: "right",
                          }}
                          value={item.amount}
                          onChange={(e) => handleUpdateLineItem(item.id, "amount", e.target.value)}
                          placeholder="0.00"
                        />
                        <button
                          style={{
                            padding: "8px",
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "#6b7280",
                          }}
                          onClick={() => handleRemoveLineItem(item.id)}
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    ))}

                    {/* Add New Row Button */}
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 14px",
                        marginTop: "12px",
                        backgroundColor: "#eff6ff",
                        color: "#156372",
                        fontSize: "13px",
                        fontWeight: "500",
                        borderRadius: "4px",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onClick={handleAddLineItem}
                    >
                      <PlusCircle size={16} />
                      Add New Row
                    </button>

                    {/* Expense Total */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "20px",
                      paddingTop: "16px",
                      borderTop: "1px solid #e5e7eb",
                    }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                        Expense Total ( $ )
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>
                        {calculateExpenseTotal().toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Vendor */}
                  <div style={styles.formRow}>
                    <label style={styles.formLabelNormal}>Vendor</label>
                    <div style={styles.vendorInputWrapper}>
                      <input
                        type="text"
                        style={{ ...styles.formInput, borderRadius: "4px 0 0 4px" }}
                        value={expenseForm.vendor}
                        onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                        placeholder=""
                      />
                      <button style={styles.vendorClearButton}>
                        <X size={14} />
                      </button>
                      <button style={styles.vendorDropdownButton}>
                        <ChevronDown size={14} />
                      </button>
                      <button style={styles.vendorSearchButton}>
                        <Search size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Reference# */}
                  <div style={styles.formRow}>
                    <label style={styles.formLabelNormal}>Reference#</label>
                    <input
                      type="text"
                      style={styles.formInput}
                      value={expenseForm.reference}
                      onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                    />
                  </div>

                  <div style={styles.formDivider}></div>

                  {/* Customer Name */}
                  <div style={styles.formRow}>
                    <label style={styles.formLabelNormal}>Customer Name</label>
                    <div style={styles.vendorInputWrapper}>
                      <input
                        type="text"
                        style={{ ...styles.formInput, borderRadius: "4px 0 0 4px" }}
                        value={expenseForm.customerName}
                        onChange={(e) => setExpenseForm({ ...expenseForm, customerName: e.target.value })}
                        placeholder="Select or add a customer"
                      />
                      <button style={styles.vendorDropdownButton}>
                        <ChevronDown size={14} />
                      </button>
                      <button style={styles.vendorSearchButton}>
                        <Search size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={styles.modalFooter}>
              <div style={styles.modalFooterLeft}>
                <button
                  style={styles.saveButton}
                  onClick={handleSaveExpense}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#0D4A52";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#156372";
                  }}
                >
                  Save <span style={{ fontSize: "11px", opacity: 0.8 }}>(alt+s)</span>
                </button>
                <button
                  style={styles.saveNextButton}
                  onClick={handleSaveAndNext}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  Save and Next <span style={{ fontSize: "11px", opacity: 0.6 }}>(alt+n)</span>
                </button>
              </div>
              <div style={styles.modalFooterRight}>
                <button
                  style={styles.skipButton}
                  onClick={handleSkipForNow}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  Skip for Now
                </button>
                <button
                  style={styles.cancelButton}
                  onClick={() => setShowRecordExpenseModal(false)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
