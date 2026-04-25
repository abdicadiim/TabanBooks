export function AccountDetailModalOverlays({ controller }: { controller: any }) {
  const {
    navigate,
    location,
    id,
    account,
    setAccount,
    transactions,
    setTransactions,
    referenceBankAccounts,
    setReferenceBankAccounts,
    referenceChartAccounts,
    setReferenceChartAccounts,
    referenceCustomers,
    setReferenceCustomers,
    referenceVendors,
    setReferenceVendors,
    baseCurrencyCode,
    resolvedBaseCurrency,
    isSavingTransaction,
    setIsSavingTransaction,
    fetchAccountData,
    activeTab,
    setActiveTab,
    isAddTransactionDropdownOpen,
    setIsAddTransactionDropdownOpen,
    isSettingsDropdownOpen,
    setIsSettingsDropdownOpen,
    isAccountMenuOpen,
    setIsAccountMenuOpen,
    isSearchModalOpen,
    setIsSearchModalOpen,
    searchCategory,
    setSearchCategory,
    searchIn,
    setSearchIn,
    isCategoryDropdownOpen,
    setIsCategoryDropdownOpen,
    categorySearchTerm,
    setCategorySearchTerm,
    searchFormData,
    setSearchFormData,
    selectedTransactions,
    setSelectedTransactions,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showExpenseSidebar,
    setShowExpenseSidebar,
    showVendorAdvanceSidebar,
    setShowVendorAdvanceSidebar,
    showVendorPaymentSidebar,
    setShowVendorPaymentSidebar,
    showTransferSidebar,
    setShowTransferSidebar,
    showCardPaymentSidebar,
    setShowCardPaymentSidebar,
    showOwnerDrawingsSidebar,
    setShowOwnerDrawingsSidebar,
    showDepositToOtherAccountsSidebar,
    setShowDepositToOtherAccountsSidebar,
    showCreditNoteRefundSidebar,
    setShowCreditNoteRefundSidebar,
    showPaymentRefundSidebar,
    setShowPaymentRefundSidebar,
    showEmployeeReimbursementSidebar,
    setShowEmployeeReimbursementSidebar,
    showCustomerAdvanceSidebar,
    setShowCustomerAdvanceSidebar,
    showCustomerPaymentSidebar,
    setShowCustomerPaymentSidebar,
    showTransferFromAnotherAccountSidebar,
    setShowTransferFromAnotherAccountSidebar,
    expenseFormData,
    setExpenseFormData,
    vendorAdvanceFormData,
    setVendorAdvanceFormData,
    vendorPaymentFormData,
    setVendorPaymentFormData,
    transferFormData,
    setTransferFormData,
    cardPaymentFormData,
    setCardPaymentFormData,
    ownerDrawingsFormData,
    setOwnerDrawingsFormData,
    depositToOtherAccountsFormData,
    setDepositToOtherAccountsFormData,
    creditNoteRefundFormData,
    setCreditNoteRefundFormData,
    paymentRefundFormData,
    setPaymentRefundFormData,
    employeeReimbursementFormData,
    setEmployeeReimbursementFormData,
    customerAdvanceFormData,
    setCustomerAdvanceFormData,
    customerPaymentFormData,
    setCustomerPaymentFormData,
    transferFromAnotherAccountFormData,
    setTransferFromAnotherAccountFormData,
    expenseAccountOpen,
    setExpenseAccountOpen,
    vendorOpen,
    setVendorOpen,
    customerOpen,
    setCustomerOpen,
    currencyOpen,
    setCurrencyOpen,
    vendorAdvanceVendorOpen,
    setVendorAdvanceVendorOpen,
    vendorAdvanceCurrencyOpen,
    setVendorAdvanceCurrencyOpen,
    paidViaOpen,
    setPaidViaOpen,
    depositToOpen,
    setDepositToOpen,
    vendorPaymentVendorOpen,
    setVendorPaymentVendorOpen,
    vendorPaymentPaidViaOpen,
    setVendorPaymentPaidViaOpen,
    fromAccountOpen,
    setFromAccountOpen,
    toAccountOpen,
    setToAccountOpen,
    transferCurrencyOpen,
    setTransferCurrencyOpen,
    cardPaymentFromAccountOpen,
    setCardPaymentFromAccountOpen,
    cardPaymentToAccountOpen,
    setCardPaymentToAccountOpen,
    cardPaymentCurrencyOpen,
    setCardPaymentCurrencyOpen,
    ownerDrawingsToAccountOpen,
    setOwnerDrawingsToAccountOpen,
    depositToOtherAccountsPaidViaOpen,
    setDepositToOtherAccountsPaidViaOpen,
    depositToOtherAccountsToAccountOpen,
    setDepositToOtherAccountsToAccountOpen,
    depositToOtherAccountsReceivedFromOpen,
    setDepositToOtherAccountsReceivedFromOpen,
    creditNoteRefundCustomerOpen,
    setCreditNoteRefundCustomerOpen,
    creditNoteRefundPaidViaOpen,
    setCreditNoteRefundPaidViaOpen,
    paymentRefundCustomerOpen,
    setPaymentRefundCustomerOpen,
    paymentRefundPaidViaOpen,
    setPaymentRefundPaidViaOpen,
    employeeReimbursementEmployeeOpen,
    setEmployeeReimbursementEmployeeOpen,
    customerAdvanceCustomerOpen,
    setCustomerAdvanceCustomerOpen,
    customerAdvanceReceivedViaOpen,
    setCustomerAdvanceReceivedViaOpen,
    customerPaymentCustomerOpen,
    setCustomerPaymentCustomerOpen,
    customerPaymentReceivedViaOpen,
    setCustomerPaymentReceivedViaOpen,
    transferFromToAccountOpen,
    setTransferFromToAccountOpen,
    transferFromFromAccountOpen,
    setTransferFromFromAccountOpen,
    transferFromCurrencyOpen,
    setTransferFromCurrencyOpen,
    dropdownRef,
    settingsDropdownRef,
    accountMenuRef,
    categoryDropdownRef,
    expenseAccountRef,
    vendorRef,
    customerRef,
    currencyRef,
    fileInputRef,
    vendorAdvanceVendorRef,
    vendorAdvanceCurrencyRef,
    paidViaRef,
    depositToRef,
    vendorPaymentVendorRef,
    vendorPaymentPaidViaRef,
    fromAccountRef,
    toAccountRef,
    transferCurrencyRef,
    transferFileInputRef,
    cardPaymentFromAccountRef,
    cardPaymentToAccountRef,
    cardPaymentCurrencyRef,
    cardPaymentFileInputRef,
    ownerDrawingsToAccountRef,
    ownerDrawingsFileInputRef,
    depositToOtherAccountsPaidViaRef,
    depositToOtherAccountsToAccountRef,
    depositToOtherAccountsReceivedFromRef,
    depositToOtherAccountsFileInputRef,
    creditNoteRefundCustomerRef,
    creditNoteRefundPaidViaRef,
    paymentRefundCustomerRef,
    paymentRefundPaidViaRef,
    employeeReimbursementEmployeeRef,
    customerAdvanceCustomerRef,
    customerAdvanceReceivedViaRef,
    customerAdvanceFileInputRef,
    customerPaymentCustomerRef,
    customerPaymentReceivedViaRef,
    customerPaymentFileInputRef,
    transferFromToAccountRef,
    transferFromFromAccountRef,
    transferFromCurrencyRef,
    transferFromFileInputRef,
    isCreditCardAccount,
    moneyOutTransactionOptions,
    moneyInTransactionOptions,
    filteredCategories,
    handleDeleteAccount,
    handleMarkInactive,
    handleDeleteSelectedTransactions,
    bankAccountNames,
    chartAccountNames,
    transferAccountNames,
    transferAccountSelectionOptions,
    transferBankSelectionOptions,
    customerNames,
    vendorNames,
    resolveBankAccountId,
    resolveChartAccountId,
    resolveAnyAccountId,
    resolveCustomerId,
    resolveVendorId,
    saveManualTransaction,
    handleSaveExpense,
    handleSaveVendorAdvance,
    handleSaveVendorPayment,
    handleSaveTransferOut,
    handleSaveCardPayment,
    handleSaveOwnerDrawings,
    handleSaveDepositToOtherAccounts,
    handleSaveCreditNoteRefund,
    handleSavePaymentRefund,
    handleSaveEmployeeReimbursement,
    handleSaveCustomerAdvance,
    handleSaveCustomerPayment,
    handleSaveTransferFromAnotherAccount
  } = controller;

  return (
    <>
      {isSearchModalOpen && (
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
            zIndex: 10000
          }}
          onClick={() => setIsSearchModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "800px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 24px",
              borderBottom: "1px solid #e5e7eb"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "14px", color: "#6b7280" }}>Search</span>
                <div style={{ position: "relative" }} ref={categoryDropdownRef}>
                  <button
                    onClick={() => {
                      setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                      setCategorySearchTerm("");
                    }}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "white",
                      border: "1px solid #156372",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: "#111827",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      minWidth: "120px"
                    }}
                  >
                    <span>{searchCategory}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{
                      transform: isCategoryDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease"
                    }}>
                      <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {isCategoryDropdownOpen && (
                    <div style={{
                      position: "absolute",
                      bottom: "calc(100% + 4px)",
                      left: 0,
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 10001,
                      minWidth: "200px",
                      maxHeight: "300px",
                      overflow: "hidden"
                    }}>
                      <div style={{ padding: "8px" }}>
                        <input
                          type="text"
                          placeholder="Search"
                          value={categorySearchTerm}
                          onChange={(e) => setCategorySearchTerm(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none"
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#156372";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#d1d5db";
                          }}
                        />
                      </div>
                      <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                        {filteredCategories.map((category: string) => (
                          <div
                            key={category}
                            onClick={() => {
                              setSearchCategory(category);
                              setIsCategoryDropdownOpen(false);
                              setCategorySearchTerm("");
                            }}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              fontSize: "14px",
                              color: searchCategory === category ? "#2563eb" : "#111827",
                              backgroundColor: searchCategory === category ? "#eff6ff" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              transition: "background-color 0.15s ease"
                            }}
                            onMouseEnter={(e) => {
                              if (searchCategory !== category) {
                                e.currentTarget.style.backgroundColor = "#f9fafb";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (searchCategory !== category) {
                                e.currentTarget.style.backgroundColor = "transparent";
                              }
                            }}
                          >
                            <span>{category}</span>
                            {searchCategory === category && (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M13 4l-6 6-3-3" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5l10 10" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
              <h2 style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#111827",
                margin: "0 0 24px 0"
              }}>
                Search {searchCategory}
              </h2>

              {/* Search In Section */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#111827",
                  marginBottom: "12px"
                }}>
                  Search In
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    cursor: "pointer"
                  }}>
                    <input
                      type="radio"
                      name="searchIn"
                      value="Transactions"
                      checked={searchIn === "Transactions"}
                      onChange={(e) => setSearchIn(e.target.value)}
                      style={{ marginTop: "2px", cursor: "pointer" }}
                    />
                    <div>
                      <div style={{ fontSize: "14px", color: "#111827", marginBottom: "4px" }}>
                        Transactions
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        Searches through all the transactions that were created manually in the banking module and by categorising bank statements.
                      </div>
                    </div>
                  </label>
                  <label style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    cursor: "pointer"
                  }}>
                    <input
                      type="radio"
                      name="searchIn"
                      value="Statement"
                      checked={searchIn === "Statement"}
                      onChange={(e) => setSearchIn(e.target.value)}
                      style={{ marginTop: "2px", cursor: "pointer" }}
                    />
                    <div>
                      <div style={{ fontSize: "14px", color: "#111827", marginBottom: "4px" }}>
                        Statement
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        Searches through all the bank statements that were automatically fetched or imported.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Form Fields - Two Columns */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px"
              }}>
                {/* Left Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Total Range */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#111827",
                      marginBottom: "8px"
                    }}>
                      Total Range
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="Min"
                        value={searchFormData.totalRangeMin}
                        onChange={(e) => setSearchFormData({ ...searchFormData, totalRangeMin: e.target.value })}
                        style={{
                          flex: 1,
                          padding: "10px 14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#156372";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#d1d5db";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                      <span style={{ color: "#6b7280" }}>-</span>
                      <input
                        type="text"
                        placeholder="Max"
                        value={searchFormData.totalRangeMax}
                        onChange={(e) => setSearchFormData({ ...searchFormData, totalRangeMax: e.target.value })}
                        style={{
                          flex: 1,
                          padding: "10px 14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#156372";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#d1d5db";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#111827",
                      marginBottom: "8px"
                    }}>
                      Status
                    </label>
                    <select
                      value={searchFormData.status}
                      onChange={(e) => setSearchFormData({ ...searchFormData, status: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        backgroundColor: "white",
                        cursor: "pointer"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#156372";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#d1d5db";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <option value="All">All</option>
                      <option value="Matched">Matched</option>
                      <option value="Categorized">Categorized</option>
                      <option value="Manually Added">Manually Added</option>
                      <option value="Unreconciled">Unreconciled</option>
                    </select>
                  </div>

                  {/* Payee - Only for Statement */}
                  {searchIn === "Statement" && (
                    <div>
                      <label style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#111827",
                        marginBottom: "8px"
                      }}>
                        Payee
                      </label>
                      <input
                        type="text"
                        placeholder="Enter payee"
                        value={searchFormData.payee}
                        onChange={(e) => setSearchFormData({ ...searchFormData, payee: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#156372";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#d1d5db";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* Transaction Type - Only for Transactions */}
                  {searchIn === "Transactions" && (
                    <div>
                      <label style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#111827",
                        marginBottom: "8px"
                      }}>
                        Transaction Type
                      </label>
                      <select
                        value={searchFormData.transactionType}
                        onChange={(e) => setSearchFormData({ ...searchFormData, transactionType: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          backgroundColor: "white",
                          cursor: "pointer"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#156372";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#d1d5db";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <option value="">All</option>
                        <option value="Base Currency Adjustments">Base Currency Adjustments</option>
                        <option value="Card Payment">Card Payment</option>
                        <option value="Credits Or Refunds Received">Credits Or Refunds Received</option>
                        <option value="Credit Note Refund">Credit Note Refund</option>
                        <option value="Payment Refund">Payment Refund</option>
                        <option value="Customer Payment">Customer Payment</option>
                        <option value="Expense">Expense</option>
                        <option value="Expense Refund">Expense Refund</option>
                        <option value="Interest Income">Interest Income</option>
                        <option value="Opening Balances">Opening Balances</option>
                        <option value="Deposit From Other Accounts">Deposit From Other Accounts</option>
                        <option value="Other Income">Other Income</option>
                        <option value="Owner's Contribution">Owner's Contribution</option>
                        <option value="Owner Drawings">Owner Drawings</option>
                        <option value="Sales Without Invoices">Sales Without Invoices</option>
                        <option value="Transfer Fund">Transfer Fund</option>
                        <option value="Vendor Payment">Vendor Payment</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Date Range */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#111827",
                      marginBottom: "8px"
                    }}>
                      Date Range
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="dd/MM/yyyy"
                        value={searchFormData.dateRangeFrom}
                        onChange={(e) => setSearchFormData({ ...searchFormData, dateRangeFrom: e.target.value })}
                        style={{
                          flex: 1,
                          padding: "10px 14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#156372";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#d1d5db";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                      <span style={{ color: "#6b7280" }}>-</span>
                      <input
                        type="text"
                        placeholder="dd/MM/yyyy"
                        value={searchFormData.dateRangeTo}
                        onChange={(e) => setSearchFormData({ ...searchFormData, dateRangeTo: e.target.value })}
                        style={{
                          flex: 1,
                          padding: "10px 14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#156372";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#d1d5db";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </div>
                  </div>

                  {/* Reference# */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#111827",
                      marginBottom: "8px"
                    }}>
                      Reference#
                    </label>
                    <input
                      type="text"
                      placeholder="Enter reference number"
                      value={searchFormData.reference}
                      onChange={(e) => setSearchFormData({ ...searchFormData, reference: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#156372";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#d1d5db";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  {/* Description - Only for Statement */}
                  {searchIn === "Statement" && (
                    <div>
                      <label style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#111827",
                        marginBottom: "8px"
                      }}>
                        Description
                      </label>
                      <textarea
                        placeholder="Max. 500 characters"
                        value={searchFormData.description}
                        onChange={(e) => setSearchFormData({ ...searchFormData, description: e.target.value })}
                        rows={4}
                        maxLength={500}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          resize: "vertical",
                          fontFamily: "inherit"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#156372";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#d1d5db";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              padding: "16px 24px",
              borderTop: "1px solid #e5e7eb"
            }}>
              <button
                onClick={() => {
                  console.log("Search Form Data:", { searchCategory, searchIn, ...searchFormData });
                  setIsSearchModalOpen(false);
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#156372",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease"
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#0e4a5e"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#156372"}
              >
                Search
              </button>
              <button
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchFormData({
                    totalRangeMin: "",
                    totalRangeMax: "",
                    dateRangeFrom: "",
                    dateRangeTo: "",
                    status: "All",
                    payee: "",
                    reference: "",
                    transactionType: "",
                    description: ""
                  });
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  color: "#111827",
                  transition: "background-color 0.2s ease, border-color 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                  e.currentTarget.style.borderColor = "#9ca3af";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
            zIndex: 10000
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "400px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827",
              margin: "0 0 16px 0"
            }}>
              Delete Account
            </h2>
            <p style={{
              fontSize: "14px",
              color: "#6b7280",
              lineHeight: "1.6",
              margin: "0 0 24px 0"
            }}>
              Are you sure you want to delete "{account.name}"? This action cannot be undone.
            </p>
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px"
            }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  color: "#111827",
                  transition: "background-color 0.2s ease, border-color 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                  e.currentTarget.style.borderColor = "#9ca3af";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteAccount();
                  setShowDeleteConfirm(false);
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#156372",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease"
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#0e4a5e"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#156372"}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
