import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, ChevronUp, Plus, Search } from "lucide-react";
import DatePicker from "../../../components/DatePicker";

export default function SearchPurchaseOrdersModal({ isOpen, onClose, onSearch }) {
  const [searchType, setSearchType] = useState("Purchase Orders");
  const [filterType, setFilterType] = useState("All");
  const [searchTypeDropdownOpen, setSearchTypeDropdownOpen] = useState(false);
  const [filterTypeDropdownOpen, setFilterTypeDropdownOpen] = useState(false);
  const [searchTypeSearchQuery, setSearchTypeSearchQuery] = useState("");
  const [addressType, setAddressType] = useState("Billing and Shipping");
  const [attentionDropdownOpen, setAttentionDropdownOpen] = useState(false);
  const [itemNameDropdownOpen, setItemNameDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [taxExemptionDropdownOpen, setTaxExemptionDropdownOpen] = useState(false);

  const searchTypeRef = useRef(null);
  const filterTypeRef = useRef(null);
  const attentionRef = useRef(null);
  const itemNameRef = useRef(null);
  const accountRef = useRef(null);
  const statusRef = useRef(null);
  const vendorRef = useRef(null);
  const projectRef = useRef(null);
  const taxExemptionRef = useRef(null);

  const [formData, setFormData] = useState({
    // Purchase Orders
    purchaseOrderNumber: "",
    dateRangeStart: "",
    dateRangeEnd: "",
    createdBetweenStart: "",
    createdBetweenEnd: "",
    itemName: "",
    totalRangeStart: "",
    totalRangeEnd: "",
    account: "",
    deliverToCustomer: "",
    attention: "",
    addressLines: [""],
    referenceNumber: "",
    expectedDeliveryDateStart: "",
    expectedDeliveryDateEnd: "",
    status: "",
    itemDescription: "",
    vendor: "",
    projectName: "",
    taxExemption: "",
    // Customers
    displayName: "",
    companyName: "",
    lastName: "",
    customerStatus: "All",
    address: "",
    customerType: "",
    firstName: "",
    email: "",
    phone: "",
    notes: "",
    // Items
    itemNameItem: "",
    description: "",
    purchaseRate: "",
    salesAccount: "",
    sku: "",
    rate: "",
    purchaseAccount: "",
    itemStatus: "All",
    // Inventory Adjustments
    itemNameAdjustment: "",
    referenceNumberAdjustment: "",
    reason: "",
    itemDescriptionAdjustment: "",
    adjustmentType: "All",
    dateRangeStartAdjustment: "",
    dateRangeEndAdjustment: "",
    // Banking
    totalRangeStartBanking: "",
    totalRangeEndBanking: "",
    statusBanking: "All",
    transactionType: "",
    dateRangeStartBanking: "",
    dateRangeEndBanking: "",
    referenceNumberBanking: "",
    // Quotes
    quoteNumber: "",
    dateRangeStartQuote: "",
    dateRangeEndQuote: "",
    itemDescriptionQuote: "",
    customerNameQuote: "",
    salesperson: "",
    referenceNumberQuote: "",
    itemNameQuote: "",
    totalRangeStartQuote: "",
    totalRangeEndQuote: "",
    projectNameQuote: "",
    taxExemptionQuote: "",
    addressTypeQuote: "Billing and Shipping",
    attentionQuote: "",
    addressLinesQuote: [""],
    // Invoices
    invoiceNumber: "",
    dateRangeStartInvoice: "",
    dateRangeEndInvoice: "",
    statusInvoice: "",
    itemDescriptionInvoice: "",
    totalRangeStartInvoice: "",
    totalRangeEndInvoice: "",
    projectNameInvoice: "",
    taxExemptionInvoice: "",
    orderNumber: "",
    createdBetweenStartInvoice: "",
    createdBetweenEndInvoice: "",
    itemNameInvoice: "",
    accountInvoice: "",
    customerNameInvoice: "",
    salespersonInvoice: "",
    addressTypeInvoice: "Billing and Shipping",
    attentionInvoice: "",
    addressLinesInvoice: [""],
    // Payments Received
    customerNamePayment: "",
    referenceNumberPayment: "",
    totalRangeStartPayment: "",
    totalRangeEndPayment: "",
    paymentMethod: "",
    paymentNumber: "",
    dateRangeStartPayment: "",
    dateRangeEndPayment: "",
    statusPayment: "",
    notesPayment: "",
    // Vendor Credits
    creditNoteNumberVendorCredit: "",
    dateRangeStartVendorCredit: "",
    dateRangeEndVendorCredit: "",
    itemNameVendorCredit: "",
    totalRangeStartVendorCredit: "",
    totalRangeEndVendorCredit: "",
    accountVendorCredit: "",
    projectNameVendorCredit: "",
    attentionVendorCredit: "",
    addressLineVendorCredit: "",
    referenceNumberVendorCredit: "",
    statusVendorCredit: "",
    itemDescriptionVendorCredit: "",
    notesVendorCredit: "",
    vendorVendorCredit: "",
    taxExemptionVendorCredit: "",
    // Projects
    projectNameProject: "",
    descriptionProject: "",
    hoursBudgetType: "",
    customerNameProject: "",
    billingMethod: "",
    statusProject: "",
    // Timesheet
    customerNameTimesheet: "",
    dateRangeStartTimesheet: "",
    dateRangeEndTimesheet: "",
    userTimesheet: "",
    statusTimesheet: "",
    projectNameTimesheet: "",
    taskNameTimesheet: "",
    notesTimesheet: "",
    // Journals
    journalNumber: "",
    dateRangeStartJournal: "",
    dateRangeEndJournal: "",
    accountJournal: "",
    totalRangeStartJournal: "",
    totalRangeEndJournal: "",
    customerNameJournal: "",
    reportingMethod: "",
    referenceNumberJournal: "",
    statusJournal: "",
    notesJournal: "",
    projectNameJournal: "",
    vendorNameJournal: "",
    journalType: "",
    // Chart of Accounts
    accountName: "",
    accountCode: "",
    // Documents
    fileName: "",
    transactionTypeDocument: "",
    // Tasks
    titleTask: "",
    descriptionTask: "",
    createdByTask: "",
    priorityTask: "",
    dateRangeStartTask: "",
    dateRangeEndTask: "",
    assignedToTask: "",
    relatedContactTask: "",
    statusTask: "",
  });

  const searchTypeOptions = [
    "Purchase Orders",
    "Customers",
    "Items",
    "Inventory Adjustments",
    "Banking",
    "Quotes",
    "Invoices",
    "Payments Received",
    "Bills",
    "Payments Made",
    "Recurring Bills",
    "Recurring Invoices",
    "Credit Notes",
    "Vendor Credits",
    "Vendors",
    "Expenses",
    "Recurring Expenses",
    "Projects",
    "Timesheet",
    "Journals",
    "Chart of Accounts",
    "Documents",
    "Tasks",
    "Recurring Expenses",
    "Projects",
    "Timesheet",
    "Journals",
    "Chart of Accounts",
    "Documents",
  ];

  const filterOptions = ["All", "Draft", "Issued", "Closed", "Canceled"];

  const statusOptions = ["Draft", "Pending Approval", "Approved", "Issued", "Closed", "Canceled"];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchTypeRef.current && !searchTypeRef.current.contains(event.target)) {
        setSearchTypeDropdownOpen(false);
      }
      if (filterTypeRef.current && !filterTypeRef.current.contains(event.target)) {
        setFilterTypeDropdownOpen(false);
      }
      if (attentionRef.current && !attentionRef.current.contains(event.target)) {
        setAttentionDropdownOpen(false);
      }
      if (itemNameRef.current && !itemNameRef.current.contains(event.target)) {
        setItemNameDropdownOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountDropdownOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
      if (vendorRef.current && !vendorRef.current.contains(event.target)) {
        setVendorDropdownOpen(false);
      }
      if (projectRef.current && !projectRef.current.contains(event.target)) {
        setProjectDropdownOpen(false);
      }
      if (taxExemptionRef.current && !taxExemptionRef.current.contains(event.target)) {
        setTaxExemptionDropdownOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddAddressLine = () => {
    const addressField = searchType === "Quotes" || searchType === "Invoices" 
      ? "addressLinesQuote" 
      : searchType === "Invoices"
      ? "addressLinesInvoice"
      : "addressLines";
    setFormData((prev) => ({
      ...prev,
      [addressField]: [...(prev[addressField] || [""]), ""],
    }));
  };

  const handleAddressLineChange = (index, value) => {
    const addressField = searchType === "Quotes" ? "addressLinesQuote" 
      : searchType === "Invoices" ? "addressLinesInvoice"
      : "addressLines";
    setFormData((prev) => {
      const newAddressLines = [...(prev[addressField] || [""])];
      newAddressLines[index] = value;
      return {
        ...prev,
        [addressField]: newAddressLines,
      };
    });
  };

  const handleSearch = () => {
    if (onSearch) {
      onSearch(formData);
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Render form fields based on search type
  const renderFormFields = () => {
    const inputStyle = {
      width: "100%",
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      outline: "none",
      boxSizing: "border-box",
    };

    const labelStyle = {
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      display: "block",
      marginBottom: "6px",
    };

    const dropdownButtonStyle = {
      width: "100%",
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      backgroundColor: "#ffffff",
      textAlign: "left",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    };

    const renderInput = (label, field, placeholder = "", type = "text") => (
      <div>
        <label style={labelStyle}>{label}</label>
        <input
          type={type}
          placeholder={placeholder}
          value={formData[field] || ""}
          onChange={(e) => handleInputChange(field, e.target.value)}
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "#156372")}
          onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
        />
      </div>
    );

    const renderDateRange = (label, startField, endField) => (
      <div>
        <label style={labelStyle}>{label}</label>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ flex: 1 }}>
            <DatePicker
              value={formData[startField] || ""}
              onChange={(value) => handleInputChange(startField, value)}
              placeholder="dd/MM/yyyy"
            />
          </div>
          <span>-</span>
          <div style={{ flex: 1 }}>
            <DatePicker
              value={formData[endField] || ""}
              onChange={(value) => handleInputChange(endField, value)}
              placeholder="dd/MM/yyyy"
            />
          </div>
        </div>
      </div>
    );

    const renderTotalRange = (label, startField, endField) => (
      <div>
        <label style={labelStyle}>{label}</label>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="text"
            value={formData[startField] || ""}
            onChange={(e) => handleInputChange(startField, e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
            onFocus={(e) => (e.target.style.borderColor = "#156372")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
          />
          <span>-</span>
          <input
            type="text"
            value={formData[endField] || ""}
            onChange={(e) => handleInputChange(endField, e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
            onFocus={(e) => (e.target.style.borderColor = "#156372")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
          />
        </div>
      </div>
    );

    const renderDropdown = (label, field, placeholder, options = [], ref = null, isOpen = false, setIsOpen = () => {}) => {
      const currentValue = formData[field] || "";
      const displayValue = currentValue || placeholder;
      
      return (
        <div>
          <label style={labelStyle}>{label}</label>
          <div style={{ position: "relative" }} ref={ref}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              style={dropdownButtonStyle}
            >
              <span style={{ color: currentValue ? "#111827" : "#9ca3af" }}>
                {displayValue}
              </span>
              <ChevronDown size={16} />
            </button>
            {isOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "4px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  zIndex: 1001,
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {options.length > 0 ? (
                  options.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        handleInputChange(field, option);
                        setIsOpen(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: "14px",
                        color: "#374151",
                        backgroundColor: currentValue === option ? "#eff6ff" : "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (currentValue !== option) {
                          e.target.style.backgroundColor = "#f9fafb";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentValue !== option) {
                          e.target.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {option}
                    </button>
                  ))
                ) : (
                  <div style={{ padding: "10px 16px", color: "#9ca3af", fontSize: "14px" }}>
                    No options available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    };

    const renderAddressSection = (addressTypeField, attentionField, addressLinesField) => {
      const currentAddressType = formData[addressTypeField] || "Billing and Shipping";
      const currentAddressLines = formData[addressLinesField] || [""];
      
      return (
        <div>
          <label style={labelStyle}>Address</label>
          <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="radio"
                name={addressTypeField}
                value="Billing and Shipping"
                checked={currentAddressType === "Billing and Shipping"}
                onChange={(e) => handleInputChange(addressTypeField, e.target.value)}
                style={{ accentColor: "#156372" }}
              />
              <span style={{ fontSize: "14px", color: "#374151" }}>Billing and Shipping</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="radio"
                name={addressTypeField}
                value="Billing"
                checked={currentAddressType === "Billing"}
                onChange={(e) => handleInputChange(addressTypeField, e.target.value)}
                style={{ accentColor: "#156372" }}
              />
              <span style={{ fontSize: "14px", color: "#374151" }}>Billing</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="radio"
                name={addressTypeField}
                value="Shipping"
                checked={currentAddressType === "Shipping"}
                onChange={(e) => handleInputChange(addressTypeField, e.target.value)}
                style={{ accentColor: "#156372" }}
              />
              <span style={{ fontSize: "14px", color: "#374151" }}>Shipping</span>
            </label>
          </div>
          {renderDropdown("Attention", attentionField, "Attention", [], attentionRef, attentionDropdownOpen, setAttentionDropdownOpen)}
          {currentAddressLines.map((line, index) => (
            <input
              key={index}
              type="text"
              value={line}
              onChange={(e) => handleAddressLineChange(index, e.target.value)}
              placeholder={`Address Line ${index + 1}`}
              style={{ ...inputStyle, marginBottom: "8px" }}
              onFocus={(e) => (e.target.style.borderColor = "#156372")}
              onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            />
          ))}
          <button
            onClick={handleAddAddressLine}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              fontSize: "14px",
              color: "#156372",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.target.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.target.style.textDecoration = "none";
            }}
          >
            <Plus size={16} />
            <span>Address Line</span>
          </button>
        </div>
      );
    };

    switch (searchType) {
      case "Customers":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Display Name", "displayName")}
              {renderInput("Company Name", "companyName")}
              {renderInput("Last Name", "lastName")}
              {renderDropdown("Status", "customerStatus", "All", ["All", "Active", "Inactive"], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderInput("Address", "address")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDropdown("Customer Type", "customerType", "Select", ["Business", "Individual"], null, false, () => {})}
              {renderInput("First Name", "firstName")}
              {renderInput("Email", "email")}
              {renderInput("Phone", "phone")}
              {renderInput("Notes", "notes")}
            </div>
          </>
        );

      case "Items":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Item Name", "itemNameItem")}
              {renderInput("Description", "description")}
              {renderInput("Purchase Rate", "purchaseRate")}
              {renderDropdown("Sales Account", "salesAccount", "Select an account", [], accountRef, accountDropdownOpen, setAccountDropdownOpen)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("SKU", "sku")}
              {renderInput("Rate", "rate")}
              {renderDropdown("Status", "itemStatus", "All", ["All", "Active", "Inactive"], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderDropdown("Purchase Account", "purchaseAccount", "Select an account", [], accountRef, accountDropdownOpen, setAccountDropdownOpen)}
            </div>
          </>
        );

      case "Inventory Adjustments":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDropdown("Item Name", "itemNameAdjustment", "Select an item", [], itemNameRef, itemNameDropdownOpen, setItemNameDropdownOpen)}
              {renderInput("Reference#", "referenceNumberAdjustment")}
              {renderDropdown("Reason", "reason", "Select", [], null, false, () => {})}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Item Description", "itemDescriptionAdjustment")}
              {renderDropdown("Adjustment Type", "adjustmentType", "All", ["All", "Increase", "Decrease"], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderDateRange("Date Range", "dateRangeStartAdjustment", "dateRangeEndAdjustment")}
            </div>
          </>
        );

      case "Banking":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderTotalRange("Total Range", "totalRangeStartBanking", "totalRangeEndBanking")}
              {renderDropdown("Status", "statusBanking", "All", ["All", "Cleared", "Uncleared"], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderDropdown("Transaction Type", "transactionType", "Select", [], null, false, () => {})}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDateRange("Date Range", "dateRangeStartBanking", "dateRangeEndBanking")}
              {renderInput("Reference#", "referenceNumberBanking")}
            </div>
          </>
        );

      case "Quotes":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Quote#", "quoteNumber")}
              {renderDateRange("Date Range", "dateRangeStartQuote", "dateRangeEndQuote")}
              {renderInput("Item Description", "itemDescriptionQuote")}
              {renderDropdown("Customer Name", "customerNameQuote", "Select customer", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderDropdown("Salesperson", "salesperson", "Select a salesperson", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderAddressSection("addressTypeQuote", "attentionQuote", "addressLinesQuote")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Reference#", "referenceNumberQuote")}
              {renderDropdown("Item Name", "itemNameQuote", "Select an item", [], itemNameRef, itemNameDropdownOpen, setItemNameDropdownOpen)}
              {renderTotalRange("Total Range", "totalRangeStartQuote", "totalRangeEndQuote")}
              {renderDropdown("Project Name", "projectNameQuote", "Select a project", [], projectRef, projectDropdownOpen, setProjectDropdownOpen)}
              {renderDropdown("Tax Exemptions", "taxExemptionQuote", "Select a Tax Exemption", [], taxExemptionRef, taxExemptionDropdownOpen, setTaxExemptionDropdownOpen)}
            </div>
          </>
        );

      case "Invoices":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Invoice#", "invoiceNumber")}
              {renderDateRange("Date Range", "dateRangeStartInvoice", "dateRangeEndInvoice")}
              {renderInput("Status", "statusInvoice")}
              {renderInput("Item Description", "itemDescriptionInvoice")}
              {renderTotalRange("Total Range", "totalRangeStartInvoice", "totalRangeEndInvoice")}
              {renderDropdown("Project Name", "projectNameInvoice", "Select a project", [], projectRef, projectDropdownOpen, setProjectDropdownOpen)}
              {renderDropdown("Tax Exemptions", "taxExemptionInvoice", "Select a Tax Exemption", [], taxExemptionRef, taxExemptionDropdownOpen, setTaxExemptionDropdownOpen)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Order Number", "orderNumber")}
              {renderDateRange("Created Between", "createdBetweenStartInvoice", "createdBetweenEndInvoice")}
              {renderDropdown("Item Name", "itemNameInvoice", "Select an item", [], itemNameRef, itemNameDropdownOpen, setItemNameDropdownOpen)}
              {renderDropdown("Account", "accountInvoice", "Select an account", [], accountRef, accountDropdownOpen, setAccountDropdownOpen)}
              {renderDropdown("Customer Name", "customerNameInvoice", "Select customer", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderDropdown("Salesperson", "salespersonInvoice", "Select a salesperson", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderAddressSection("addressTypeInvoice", "attentionInvoice", "addressLinesInvoice")}
            </div>
          </>
        );

      case "Payments Received":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDropdown("Customer Name", "customerNamePayment", "Select customer", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderInput("Reference#", "referenceNumberPayment")}
              {renderTotalRange("Total Range", "totalRangeStartPayment", "totalRangeEndPayment")}
              {renderDropdown("Payment Method", "paymentMethod", "Select", [], null, false, () => {})}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Payment #", "paymentNumber")}
              {renderDateRange("Date Range", "dateRangeStartPayment", "dateRangeEndPayment")}
              {renderDropdown("Status", "statusPayment", "Select", [], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderInput("Notes", "notesPayment")}
            </div>
          </>
        );

      case "Recurring Invoices":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Name", "nameRecurringInvoice")}
              {renderDateRange("End Date Range", "endDateRangeStartRecurringInvoice", "endDateRangeEndRecurringInvoice")}
              {renderDropdown("Item Name", "itemNameRecurringInvoice", "Select an item", [], itemNameRef, itemNameDropdownOpen, setItemNameDropdownOpen)}
              {renderInput("Notes", "notesRecurringInvoice")}
              {renderDropdown("Customer Name", "customerNameRecurringInvoice", "Select customer", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDateRange("Start Date Range", "startDateRangeStartRecurringInvoice", "startDateRangeEndRecurringInvoice")}
              {renderDropdown("Status", "statusRecurringInvoice", "", [], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderInput("Item Description", "itemDescriptionRecurringInvoice")}
              {renderDropdown("Tax Exemptions", "taxExemptionRecurringInvoice", "Select a Tax Exemption", [], taxExemptionRef, taxExemptionDropdownOpen, setTaxExemptionDropdownOpen)}
              {renderAddressSection("addressTypeRecurringInvoice", "attentionRecurringInvoice", "addressLinesRecurringInvoice")}
            </div>
          </>
        );

      case "Credit Notes":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Credit Note#", "creditNoteNumber")}
              {renderDateRange("Date Range", "dateRangeStartCreditNote", "dateRangeEndCreditNote")}
              {renderDropdown("Item Name", "itemNameCreditNote", "Select an item", [], itemNameRef, itemNameDropdownOpen, setItemNameDropdownOpen)}
              {renderDropdown("Account", "accountCreditNote", "Select an account", [], accountRef, accountDropdownOpen, setAccountDropdownOpen)}
              {renderInput("Notes", "notesCreditNote")}
              {renderDropdown("Project Name", "projectNameCreditNote", "Select a project", [], projectRef, projectDropdownOpen, setProjectDropdownOpen)}
              {renderAddressSection("addressTypeCreditNote", "attentionCreditNote", "addressLinesCreditNote")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Reference#", "referenceNumberCreditNote")}
              {renderDropdown("Status", "statusCreditNote", "", [], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderInput("Item Description", "itemDescriptionCreditNote")}
              {renderTotalRange("Total Range", "totalRangeStartCreditNote", "totalRangeEndCreditNote")}
              {renderDropdown("Customer Name", "customerNameCreditNote", "Select customer", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderDropdown("Tax Exemptions", "taxExemptionCreditNote", "Select a Tax Exemption", [], taxExemptionRef, taxExemptionDropdownOpen, setTaxExemptionDropdownOpen)}
            </div>
          </>
        );

      case "Vendors":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Display Name", "displayNameVendor")}
              {renderInput("First Name", "firstNameVendor")}
              {renderInput("Email", "emailVendor")}
              {renderInput("Phone", "phoneVendor")}
              {renderInput("Notes", "notesVendor")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Company Name", "companyNameVendor")}
              {renderInput("Last Name", "lastNameVendor")}
              {renderDropdown("Status", "statusVendor", "All Vendors", ["All Vendors", "Active", "Inactive"], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderInput("Address", "addressVendor")}
            </div>
          </>
        );

      case "Expenses":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDropdown("Expense Account", "expenseAccount", "Select", [], accountRef, accountDropdownOpen, setAccountDropdownOpen)}
              {renderInput("Notes", "notesExpense")}
              {renderDateRange("Date Range", "dateRangeStartExpense", "dateRangeEndExpense")}
              {renderTotalRange("Total Range", "totalRangeStartExpense", "totalRangeEndExpense")}
              {renderDropdown("Customer Name", "customerNameExpense", "Select customer", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderInput("Vendor", "vendorExpense")}
              {renderDropdown("Tax Exemptions", "taxExemptionExpense", "Select a Tax Exemption", [], taxExemptionRef, taxExemptionDropdownOpen, setTaxExemptionDropdownOpen)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDropdown("Paid Through", "paidThrough", "Select", [], null, false, () => {})}
              {renderInput("Reference#", "referenceNumberExpense")}
              {renderDropdown("Status", "statusExpense", "", [], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderDropdown("Source", "sourceExpense", "Select", [], null, false, () => {})}
              {renderDropdown("Employee", "employeeExpense", "Select", [], null, false, () => {})}
              {renderDropdown("Project Name", "projectNameExpense", "Select a project", [], projectRef, projectDropdownOpen, setProjectDropdownOpen)}
            </div>
          </>
        );

      case "Recurring Expenses":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Name", "nameRecurringExpense")}
              {renderDateRange("End Date Range", "endDateRangeStartRecurringExpense", "endDateRangeEndRecurringExpense")}
              {renderDropdown("Expense Account", "expenseAccountRecurring", "Select", [], accountRef, accountDropdownOpen, setAccountDropdownOpen)}
              {renderDropdown("Customer Name", "customerNameRecurringExpense", "Select customer", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderInput("Notes", "notesRecurringExpense")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDateRange("Start Date Range", "startDateRangeStartRecurringExpense", "startDateRangeEndRecurringExpense")}
              {renderTotalRange("Total Range", "totalRangeStartRecurringExpense", "totalRangeEndRecurringExpense")}
              {renderDropdown("Status", "statusRecurringExpense", "", [], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderInput("Vendor", "vendorRecurringExpense")}
              {renderDropdown("Tax Exemptions", "taxExemptionRecurringExpense", "Select a Tax Exemption", [], taxExemptionRef, taxExemptionDropdownOpen, setTaxExemptionDropdownOpen)}
            </div>
          </>
        );

      case "Bills":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Bill#", "billNumber")}
              {renderDateRange("Date Range", "dateRangeStartBill", "dateRangeEndBill")}
              {renderDateRange("Created Between", "createdBetweenStartBill", "createdBetweenEndBill")}
              {renderDropdown("Item Name", "itemNameBill", "Select an item", [], itemNameRef, itemNameDropdownOpen, setItemNameDropdownOpen)}
              {renderTotalRange("Total Range", "totalRangeStartBill", "totalRangeEndBill")}
              {renderInput("Vendor", "vendorBill")}
              {renderDropdown("Customer Name", "customerNameBill", "Select customer", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderDropdown("Tax Exemptions", "taxExemptionBill", "Select a Tax Exemption", [], taxExemptionRef, taxExemptionDropdownOpen, setTaxExemptionDropdownOpen)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("P.O#", "poNumberBill")}
              {renderDateRange("Due Date", "dueDateStartBill", "dueDateEndBill")}
              {renderDropdown("Status", "statusBill", "", [], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderInput("Item Description", "itemDescriptionBill")}
              {renderInput("Notes", "notesBill")}
              {renderDropdown("Account", "accountBill", "Select an account", [], accountRef, accountDropdownOpen, setAccountDropdownOpen)}
              {renderDropdown("Project Name", "projectNameBill", "Select a project", [], projectRef, projectDropdownOpen, setProjectDropdownOpen)}
              <div>
                <label style={labelStyle}>Billing Address</label>
                {renderDropdown("Attention", "attentionBill", "Attention", [], attentionRef, attentionDropdownOpen, setAttentionDropdownOpen)}
                <input
                  type="text"
                  placeholder="Address Line 1"
                  value={formData.addressLineBill || ""}
                  onChange={(e) => handleInputChange("addressLineBill", e.target.value)}
                  style={{ ...inputStyle, marginTop: "8px" }}
                  onFocus={(e) => (e.target.style.borderColor = "#156372")}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                />
                <button
                  onClick={() => handleInputChange("addressLineBill", formData.addressLineBill || "")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    fontSize: "14px",
                    color: "#156372",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    marginTop: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.textDecoration = "none";
                  }}
                >
                  <Plus size={16} />
                  <span>Address Line</span>
                </button>
              </div>
            </div>
          </>
        );

      case "Payments Made":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Vendor", "vendorPaymentMade")}
              {renderInput("Reference#", "referenceNumberPaymentMade")}
              {renderTotalRange("Total Range", "totalRangeStartPaymentMade", "totalRangeEndPaymentMade")}
              {renderDropdown("Payment Method", "paymentMethodPaymentMade", "Select", [], null, false, () => {})}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Payment #", "paymentNumberPaymentMade")}
              {renderDateRange("Date Range", "dateRangeStartPaymentMade", "dateRangeEndPaymentMade")}
              {renderDropdown("Status", "statusPaymentMade", "All Payments", ["All Payments", "Cleared", "Uncleared"], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderInput("Notes", "notesPaymentMade")}
            </div>
          </>
        );

      case "Recurring Bills":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Name", "nameRecurringBill")}
              {renderDateRange("End Date Range", "endDateRangeStartRecurringBill", "endDateRangeEndRecurringBill")}
              {renderInput("Notes", "notesRecurringBill")}
              {renderInput("Vendor", "vendorRecurringBill")}
              <div>
                <label style={labelStyle}>Billing Address</label>
                {renderDropdown("Attention", "attentionRecurringBill", "Attention", [], attentionRef, attentionDropdownOpen, setAttentionDropdownOpen)}
                <button
                  onClick={() => handleInputChange("addressLineRecurringBill", formData.addressLineRecurringBill || "")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    fontSize: "14px",
                    color: "#156372",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    marginTop: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.textDecoration = "none";
                  }}
                >
                  <Plus size={16} />
                  <span>Address Line</span>
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDateRange("Start Date Range", "startDateRangeStartRecurringBill", "startDateRangeEndRecurringBill")}
              {renderDropdown("Status", "statusRecurringBill", "", [], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderDropdown("Account", "accountRecurringBill", "Select an account", [], accountRef, accountDropdownOpen, setAccountDropdownOpen)}
              {renderDropdown("Tax Exemptions", "taxExemptionRecurringBill", "Select a Tax Exemption", [], taxExemptionRef, taxExemptionDropdownOpen, setTaxExemptionDropdownOpen)}
            </div>
          </>
        );

      case "Vendor Credits":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Credit Note#", "creditNoteNumberVendorCredit")}
              {renderDateRange("Date Range", "dateRangeStartVendorCredit", "dateRangeEndVendorCredit")}
              {renderDropdown("Item Name", "itemNameVendorCredit", "Select an item", [], itemNameRef, itemNameDropdownOpen, setItemNameDropdownOpen)}
              {renderTotalRange("Total Range", "totalRangeStartVendorCredit", "totalRangeEndVendorCredit")}
              {renderDropdown("Account", "accountVendorCredit", "Select an account", [], accountRef, accountDropdownOpen, setAccountDropdownOpen)}
              {renderDropdown("Project Name", "projectNameVendorCredit", "Select a project", [], projectRef, projectDropdownOpen, setProjectDropdownOpen)}
              <div>
                <label style={labelStyle}>Billing Address</label>
                {renderDropdown("Attention", "attentionVendorCredit", "Attention", [], attentionRef, attentionDropdownOpen, setAttentionDropdownOpen)}
                <button
                  onClick={() => handleInputChange("addressLineVendorCredit", formData.addressLineVendorCredit || "")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    fontSize: "14px",
                    color: "#156372",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    marginTop: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.textDecoration = "none";
                  }}
                >
                  <Plus size={16} />
                  <span>Address Line</span>
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Reference#", "referenceNumberVendorCredit")}
              {renderDropdown("Status", "statusVendorCredit", "", [], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderInput("Item Description", "itemDescriptionVendorCredit")}
              {renderInput("Notes", "notesVendorCredit")}
              {renderDropdown("Vendor", "vendorVendorCredit", "", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderDropdown("Tax Exemptions", "taxExemptionVendorCredit", "Select a Tax Exemption", [], taxExemptionRef, taxExemptionDropdownOpen, setTaxExemptionDropdownOpen)}
            </div>
          </>
        );

      case "Projects":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Project Name", "projectNameProject")}
              {renderInput("Description", "descriptionProject")}
              {renderDropdown("Hours Budget Type", "hoursBudgetType", "Select", [], null, false, () => {})}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDropdown("Customer Name", "customerNameProject", "Select customer", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderDropdown("Billing Method", "billingMethod", "Select", [], null, false, () => {})}
              {renderDropdown("Status", "statusProject", "", [], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
            </div>
          </>
        );

      case "Timesheet":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDropdown("Customer Name", "customerNameTimesheet", "Select customer", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderDateRange("Date Range", "dateRangeStartTimesheet", "dateRangeEndTimesheet")}
              {renderDropdown("User", "userTimesheet", "Select", [], null, false, () => {})}
              {renderDropdown("Status", "statusTimesheet", "", [], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDropdown("Project Name", "projectNameTimesheet", "Select a project", [], projectRef, projectDropdownOpen, setProjectDropdownOpen)}
              {renderInput("Task Name", "taskNameTimesheet")}
              {renderInput("Notes", "notesTimesheet")}
            </div>
          </>
        );

      case "Journals":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Journal#", "journalNumber")}
              {renderDateRange("Date Range", "dateRangeStartJournal", "dateRangeEndJournal")}
              {renderDropdown("Account", "accountJournal", "Select an account", [], accountRef, accountDropdownOpen, setAccountDropdownOpen)}
              {renderTotalRange("Total Range", "totalRangeStartJournal", "totalRangeEndJournal")}
              {renderDropdown("Customer Name", "customerNameJournal", "Select Customer", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderDropdown("Reporting Method", "reportingMethod", "Select Reporting Method", [], null, false, () => {})}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Reference#", "referenceNumberJournal")}
              {renderDropdown("Status", "statusJournal", "", [], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderInput("Notes", "notesJournal")}
              {renderDropdown("Project Name", "projectNameJournal", "Select a project", [], projectRef, projectDropdownOpen, setProjectDropdownOpen)}
              {renderDropdown("Vendor Name", "vendorNameJournal", "Select Vendor", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderDropdown("Journal Type", "journalType", "Select Journal Type", [], null, false, () => {})}
            </div>
          </>
        );

      case "Chart of Accounts":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Account Name", "accountName")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Account Code", "accountCode")}
            </div>
          </>
        );

      case "Documents":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("File Name", "fileName")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDropdown("Transaction Type", "transactionTypeDocument", "Select", [], null, false, () => {})}
            </div>
          </>
        );

      case "Tasks":
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Title", "titleTask")}
              {renderInput("Description", "descriptionTask")}
              {renderDropdown("Created By", "createdByTask", "Select user", [], null, false, () => {})}
              {renderDropdown("Priority", "priorityTask", "Select Priority", [], null, false, () => {})}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderDateRange("Date Range", "dateRangeStartTask", "dateRangeEndTask")}
              {renderDropdown("Assigned To", "assignedToTask", "Select Users", [], null, false, () => {})}
              {renderDropdown("Related Contact", "relatedContactTask", "Select Contact", [], null, false, () => {})}
              {renderDropdown("Status", "statusTask", "Select Status", [], statusRef, statusDropdownOpen, setStatusDropdownOpen)}
            </div>
          </>
        );

      default: // Purchase Orders
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Purchase Order#", "purchaseOrderNumber")}
              {renderDateRange("Date Range", "dateRangeStart", "dateRangeEnd")}
              {renderDateRange("Created Between", "createdBetweenStart", "createdBetweenEnd")}
              {renderDropdown("Item Name", "itemName", "Select an item", [], itemNameRef, itemNameDropdownOpen, setItemNameDropdownOpen)}
              {renderTotalRange("Total Range", "totalRangeStart", "totalRangeEnd")}
              {renderDropdown("Account", "account", "Select an account", [], accountRef, accountDropdownOpen, setAccountDropdownOpen)}
              {renderInput("Deliver To Customer", "deliverToCustomer")}
              {renderAddressSection("addressType", "attention", "addressLines")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderInput("Reference#", "referenceNumber")}
              {renderDateRange("Expected Delivery Date", "expectedDeliveryDateStart", "expectedDeliveryDateEnd")}
              {renderDropdown("Status", "status", "", statusOptions, statusRef, statusDropdownOpen, setStatusDropdownOpen)}
              {renderInput("Item Description", "itemDescription")}
              {renderDropdown("Vendor", "vendor", "", [], vendorRef, vendorDropdownOpen, setVendorDropdownOpen)}
              {renderDropdown("Project Name", "projectName", "Select a project", [], projectRef, projectDropdownOpen, setProjectDropdownOpen)}
              {renderDropdown("Tax Exemptions", "taxExemption", "Select a Tax Exemption", [], taxExemptionRef, taxExemptionDropdownOpen, setTaxExemptionDropdownOpen)}
            </div>
          </>
        );
    }
  };

  if (!isOpen || typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "900px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "16px", fontWeight: "600", color: "#111827" }}>Search</span>
            <div style={{ position: "relative" }} ref={searchTypeRef}>
              <button
                onClick={() => setSearchTypeDropdownOpen(!searchTypeDropdownOpen)}
                style={{
                  padding: "6px 12px",
                  fontSize: "14px",
                  border: "1px solid #156372",
                  borderRadius: "4px",
                  backgroundColor: "#ffffff",
                  color: "#111827",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>{searchType}</span>
                {searchTypeDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {searchTypeDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "4px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    zIndex: 1001,
                    minWidth: "200px",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  {/* Search Bar */}
                  <div
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 10px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                      }}
                    >
                      <Search size={14} style={{ color: "#9ca3af", flexShrink: 0 }} />
                      <input
                        type="text"
                        placeholder="Search"
                        value={searchTypeSearchQuery}
                        onChange={(e) => setSearchTypeSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          flex: 1,
                          border: "none",
                          outline: "none",
                          fontSize: "14px",
                          backgroundColor: "transparent",
                        }}
                      />
                    </div>
                  </div>
                  {/* Options List */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      maxHeight: "250px",
                    }}
                  >
                    {searchTypeOptions
                      .filter((option) =>
                        option.toLowerCase().includes(searchTypeSearchQuery.toLowerCase())
                      )
                      .map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setSearchType(option);
                            setSearchTypeDropdownOpen(false);
                            setSearchTypeSearchQuery("");
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 16px",
                            textAlign: "left",
                            fontSize: "14px",
                            color: "#374151",
                            backgroundColor: searchType === option ? "#eff6ff" : "transparent",
                            border: "none",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            if (searchType !== option) {
                              e.target.style.backgroundColor = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (searchType !== option) {
                              e.target.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          {option}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
            <span style={{ fontSize: "16px", fontWeight: "600", color: "#111827" }}>Filter</span>
            <div style={{ position: "relative" }} ref={filterTypeRef}>
              <button
                onClick={() => setFilterTypeDropdownOpen(!filterTypeDropdownOpen)}
                style={{
                  padding: "6px 12px",
                  fontSize: "14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  backgroundColor: "#ffffff",
                  color: "#111827",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>{filterType}</span>
                {filterTypeDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {filterTypeDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "4px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    zIndex: 1001,
                    minWidth: "150px",
                  }}
                >
                  {filterOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setFilterType(option);
                        setFilterTypeDropdownOpen(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: "14px",
                        color: "#374151",
                        backgroundColor: filterType === option ? "#eff6ff" : "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (filterType !== option) {
                          e.target.style.backgroundColor = "#f9fafb";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (filterType !== option) {
                          e.target.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "#111827";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "#6b7280";
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "20px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", minWidth: 0 }}>
            {renderFormFields()}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            onClick={handleSearch}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#ffffff",
              backgroundColor: "#0D4A52",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#0D4A52";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#0D4A52";
            }}
          >
            Search
          </button>
          <button
            onClick={handleCancel}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f9fafb";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#ffffff";
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
