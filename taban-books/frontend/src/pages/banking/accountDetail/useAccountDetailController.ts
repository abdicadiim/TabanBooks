import { useEffect, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  bankAccountsAPI,
  bankTransactionsAPI,
  chartOfAccountsAPI,
  customersAPI,
  vendorsAPI,
} from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  ACCOUNT_DETAIL_CATEGORIES,
  formatTransactionTypeLabel,
  getAccountDisplayName,
  getChartAccountDisplayName,
  getCustomerDisplayName,
  getTransactionCounterparty,
  getTransactionId,
  getVendorDisplayName,
  moneyInDefaultDescriptionByType,
  moneyInTitleByType,
  normalizeDateInput,
  parseAmountInput,
  type MoneyInTransactionType,
} from "./helpers";
import {
  ACCOUNT_DETAIL_DEFAULT_DATE,
  createCreditNoteRefundFormData,
  createCustomerAdvanceFormData,
  createCustomerPaymentFormData,
  createEmployeeReimbursementFormData,
  createMoneyInFormData,
  createPaymentRefundFormData,
  createTransferFromAnotherAccountFormData,
} from "./moneyInOverlayDefaults";

const DEFAULT_DATE = ACCOUNT_DETAIL_DEFAULT_DATE;

export function useAccountDetailController() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { code: baseCurrencyCode } = useCurrency();

  const [account, setAccount] = useState(location.state?.account || null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [referenceBankAccounts, setReferenceBankAccounts] = useState<any[]>([]);
  const [referenceChartAccounts, setReferenceChartAccounts] = useState<any[]>([]);
  const [referenceCustomers, setReferenceCustomers] = useState<any[]>([]);
  const [referenceVendors, setReferenceVendors] = useState<any[]>([]);
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);

  const resolvedBaseCurrency = String(baseCurrencyCode || account?.currencyCode || "USD").toUpperCase();

  const [activeTab, setActiveTab] = useState("Transactions");
  const [isAddTransactionDropdownOpen, setIsAddTransactionDropdownOpen] = useState(false);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState("Banking");
  const [searchIn, setSearchIn] = useState("Statement");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [searchFormData, setSearchFormData] = useState({
    totalRangeMin: "",
    totalRangeMax: "",
    dateRangeFrom: "",
    dateRangeTo: "",
    status: "All",
    payee: "",
    reference: "",
    transactionType: "",
    description: "",
  });
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showExpenseSidebar, setShowExpenseSidebar] = useState(false);
  const [showVendorAdvanceSidebar, setShowVendorAdvanceSidebar] = useState(false);
  const [showVendorPaymentSidebar, setShowVendorPaymentSidebar] = useState(false);
  const [showTransferSidebar, setShowTransferSidebar] = useState(false);
  const [showCardPaymentSidebar, setShowCardPaymentSidebar] = useState(false);
  const [showOwnerDrawingsSidebar, setShowOwnerDrawingsSidebar] = useState(false);
  const [showDepositToOtherAccountsSidebar, setShowDepositToOtherAccountsSidebar] = useState(false);
  const [showCreditNoteRefundSidebar, setShowCreditNoteRefundSidebar] = useState(false);
  const [showPaymentRefundSidebar, setShowPaymentRefundSidebar] = useState(false);
  const [showEmployeeReimbursementSidebar, setShowEmployeeReimbursementSidebar] = useState(false);
  const [showCustomerAdvanceSidebar, setShowCustomerAdvanceSidebar] = useState(false);
  const [showCustomerPaymentSidebar, setShowCustomerPaymentSidebar] = useState(false);
  const [showTransferFromAnotherAccountSidebar, setShowTransferFromAnotherAccountSidebar] = useState(false);
  const [showMoneyInEntrySidebar, setShowMoneyInEntrySidebar] = useState(false);
  const [moneyInTransactionType, setMoneyInTransactionType] =
    useState<MoneyInTransactionType>("interest_income");

  const [expenseFormData, setExpenseFormData] = useState({
    expenseAccount: "Cost of Goods Sold",
    date: DEFAULT_DATE,
    amount: "",
    currency: resolvedBaseCurrency,
    vendor: "",
    reference: "",
    description: "",
    customer: "",
    files: [] as any[],
  });
  const [vendorAdvanceFormData, setVendorAdvanceFormData] = useState({
    vendor: "",
    amount: "",
    currency: resolvedBaseCurrency,
    date: DEFAULT_DATE,
    bankCharges: "",
    reference: "",
    paidVia: "Cash",
    depositTo: "",
    description: "",
  });
  const [vendorPaymentFormData, setVendorPaymentFormData] = useState({
    vendor: "",
    paymentNumber: "2",
    amount: "",
    currency: resolvedBaseCurrency,
    date: DEFAULT_DATE,
    bankCharges: "",
    reference: "",
    paidVia: "Cash",
    description: "",
    bills: [
      { id: 1, billNumber: "56y", showPO: true, due: "KES322.00", dueDate: "13/12/2025", paymentAmount: "0" },
      { id: 2, billNumber: "dxc(13 Dec 2025)", showPO: false, due: "KES322.00", dueDate: "13/12/2025", paymentAmount: "0" },
    ],
  });
  const [transferFormData, setTransferFormData] = useState({
    fromAccount: location.state?.account?.accountName || "",
    toAccount: "",
    date: DEFAULT_DATE,
    amount: "",
    currency: resolvedBaseCurrency,
    reference: "",
    description: "",
    files: [] as any[],
  });
  const [cardPaymentFormData, setCardPaymentFormData] = useState({
    fromAccount: location.state?.account?.accountName || "",
    toAccount: "",
    date: DEFAULT_DATE,
    amount: "",
    currency: resolvedBaseCurrency,
    reference: "",
    description: "",
    files: [] as any[],
  });
  const [ownerDrawingsFormData, setOwnerDrawingsFormData] = useState({
    toAccount: "",
    date: DEFAULT_DATE,
    amount: "",
    currency: resolvedBaseCurrency,
    reference: "",
    description: "",
    files: [] as any[],
  });
  const [depositToOtherAccountsFormData, setDepositToOtherAccountsFormData] = useState({
    date: DEFAULT_DATE,
    amount: "",
    currency: resolvedBaseCurrency,
    paidVia: "Cash",
    toAccount: "",
    receivedFrom: "",
    reference: "",
    description: "",
    files: [] as any[],
  });
  const [creditNoteRefundFormData, setCreditNoteRefundFormData] = useState(createCreditNoteRefundFormData);
  const [paymentRefundFormData, setPaymentRefundFormData] = useState(createPaymentRefundFormData);
  const [employeeReimbursementFormData, setEmployeeReimbursementFormData] =
    useState(createEmployeeReimbursementFormData);
  const [customerAdvanceFormData, setCustomerAdvanceFormData] = useState(createCustomerAdvanceFormData);
  const [customerPaymentFormData, setCustomerPaymentFormData] = useState(createCustomerPaymentFormData);
  const [transferFromAnotherAccountFormData, setTransferFromAnotherAccountFormData] = useState(() =>
    createTransferFromAnotherAccountFormData(resolvedBaseCurrency),
  );
  const [moneyInFormData, setMoneyInFormData] = useState(() => createMoneyInFormData(resolvedBaseCurrency));

  const [expenseAccountOpen, setExpenseAccountOpen] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [vendorAdvanceVendorOpen, setVendorAdvanceVendorOpen] = useState(false);
  const [vendorAdvanceCurrencyOpen, setVendorAdvanceCurrencyOpen] = useState(false);
  const [paidViaOpen, setPaidViaOpen] = useState(false);
  const [depositToOpen, setDepositToOpen] = useState(false);
  const [vendorPaymentVendorOpen, setVendorPaymentVendorOpen] = useState(false);
  const [vendorPaymentPaidViaOpen, setVendorPaymentPaidViaOpen] = useState(false);
  const [fromAccountOpen, setFromAccountOpen] = useState(false);
  const [toAccountOpen, setToAccountOpen] = useState(false);
  const [transferCurrencyOpen, setTransferCurrencyOpen] = useState(false);
  const [cardPaymentFromAccountOpen, setCardPaymentFromAccountOpen] = useState(false);
  const [cardPaymentToAccountOpen, setCardPaymentToAccountOpen] = useState(false);
  const [cardPaymentCurrencyOpen, setCardPaymentCurrencyOpen] = useState(false);
  const [ownerDrawingsToAccountOpen, setOwnerDrawingsToAccountOpen] = useState(false);
  const [depositToOtherAccountsPaidViaOpen, setDepositToOtherAccountsPaidViaOpen] = useState(false);
  const [depositToOtherAccountsToAccountOpen, setDepositToOtherAccountsToAccountOpen] = useState(false);
  const [depositToOtherAccountsReceivedFromOpen, setDepositToOtherAccountsReceivedFromOpen] = useState(false);
  const [creditNoteRefundCustomerOpen, setCreditNoteRefundCustomerOpen] = useState(false);
  const [creditNoteRefundPaidViaOpen, setCreditNoteRefundPaidViaOpen] = useState(false);
  const [paymentRefundCustomerOpen, setPaymentRefundCustomerOpen] = useState(false);
  const [paymentRefundPaidViaOpen, setPaymentRefundPaidViaOpen] = useState(false);
  const [employeeReimbursementEmployeeOpen, setEmployeeReimbursementEmployeeOpen] = useState(false);
  const [customerAdvanceCustomerOpen, setCustomerAdvanceCustomerOpen] = useState(false);
  const [customerAdvanceReceivedViaOpen, setCustomerAdvanceReceivedViaOpen] = useState(false);
  const [customerPaymentCustomerOpen, setCustomerPaymentCustomerOpen] = useState(false);
  const [customerPaymentReceivedViaOpen, setCustomerPaymentReceivedViaOpen] = useState(false);
  const [transferFromToAccountOpen, setTransferFromToAccountOpen] = useState(false);
  const [transferFromFromAccountOpen, setTransferFromFromAccountOpen] = useState(false);
  const [transferFromCurrencyOpen, setTransferFromCurrencyOpen] = useState(false);
  const [moneyInCurrencyOpen, setMoneyInCurrencyOpen] = useState(false);
  const [moneyInReceivedViaOpen, setMoneyInReceivedViaOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const settingsDropdownRef = useRef<HTMLDivElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const categoryDropdownRef = useRef<any>(null);
  const expenseAccountRef = useRef<any>(null);
  const vendorRef = useRef<any>(null);
  const customerRef = useRef<any>(null);
  const currencyRef = useRef<any>(null);
  const fileInputRef = useRef<any>(null);
  const vendorAdvanceVendorRef = useRef<any>(null);
  const vendorAdvanceCurrencyRef = useRef<any>(null);
  const paidViaRef = useRef<any>(null);
  const depositToRef = useRef<any>(null);
  const vendorPaymentVendorRef = useRef<any>(null);
  const vendorPaymentPaidViaRef = useRef<any>(null);
  const fromAccountRef = useRef<any>(null);
  const toAccountRef = useRef<any>(null);
  const transferCurrencyRef = useRef<any>(null);
  const transferFileInputRef = useRef<any>(null);
  const cardPaymentFromAccountRef = useRef<any>(null);
  const cardPaymentToAccountRef = useRef<any>(null);
  const cardPaymentCurrencyRef = useRef<any>(null);
  const cardPaymentFileInputRef = useRef<any>(null);
  const ownerDrawingsToAccountRef = useRef<any>(null);
  const ownerDrawingsFileInputRef = useRef<any>(null);
  const depositToOtherAccountsPaidViaRef = useRef<any>(null);
  const depositToOtherAccountsToAccountRef = useRef<any>(null);
  const depositToOtherAccountsReceivedFromRef = useRef<any>(null);
  const depositToOtherAccountsFileInputRef = useRef<any>(null);
  const creditNoteRefundCustomerRef = useRef<any>(null);
  const creditNoteRefundPaidViaRef = useRef<any>(null);
  const paymentRefundCustomerRef = useRef<any>(null);
  const paymentRefundPaidViaRef = useRef<any>(null);
  const employeeReimbursementEmployeeRef = useRef<any>(null);
  const customerAdvanceCustomerRef = useRef<any>(null);
  const customerAdvanceReceivedViaRef = useRef<any>(null);
  const customerAdvanceFileInputRef = useRef<any>(null);
  const customerPaymentCustomerRef = useRef<any>(null);
  const customerPaymentReceivedViaRef = useRef<any>(null);
  const customerPaymentFileInputRef = useRef<any>(null);
  const transferFromToAccountRef = useRef<any>(null);
  const transferFromFromAccountRef = useRef<any>(null);
  const transferFromCurrencyRef = useRef<any>(null);
  const transferFromFileInputRef = useRef<any>(null);
  const moneyInCurrencyRef = useRef<any>(null);
  const moneyInReceivedViaRef = useRef<any>(null);
  const moneyInFileInputRef = useRef<any>(null);

  const moneyInSidebarTitle = moneyInTitleByType[moneyInTransactionType];
  const isCreditCardAccount = String(account?.accountType || "").toLowerCase() === "credit_card";
  const moneyOutTransactionOptions = isCreditCardAccount
    ? ["Transfer To Another Account", "Card Payment"]
    : ["Transfer To Another Account", "Card Payment", "Owner Drawings"];
  const moneyInTransactionOptions = isCreditCardAccount
    ? ["Deposit", "Transfer From Another Account", "Refund"]
    : [
        "Deposit",
        "Transfer From Another Account",
        "Sales Without Invoices",
        "Interest Income",
        "Other Income",
        "Expense Refund",
        "Owner's Contribution",
      ];
  const filteredCategories = ACCOUNT_DETAIL_CATEGORIES.filter((category) =>
    category.toLowerCase().includes(categorySearchTerm.toLowerCase()),
  );

  const bankAccountNames = Array.from(
    new Set(
      [...referenceBankAccounts.map(getAccountDisplayName), getAccountDisplayName(account)].filter(Boolean),
    ),
  );
  const chartAccountNames = Array.from(
    new Set(referenceChartAccounts.map(getChartAccountDisplayName).filter(Boolean)),
  );
  const transferAccountNames = Array.from(new Set([...bankAccountNames, ...chartAccountNames]));
  const transferAccountSelectionOptions = transferAccountNames.length
    ? transferAccountNames
    : ["Petty Cash", "Main Account", "Savings Account", "Undeposited Funds"];
  const transferBankSelectionOptions = bankAccountNames.length
    ? bankAccountNames
    : ["Petty Cash", "Main Account", "Savings Account", "Undeposited Funds"];
  const customerNames = Array.from(new Set(referenceCustomers.map(getCustomerDisplayName).filter(Boolean)));
  const vendorNames = Array.from(new Set(referenceVendors.map(getVendorDisplayName).filter(Boolean)));

  const decorateTransactionsWithRunningBalance = (rawTransactions: any[], currentBalance: any) => {
    const sortedTransactions = [...rawTransactions].sort((left, right) => {
      const leftTime = new Date(left?.date || left?.createdAt || 0).getTime();
      const rightTime = new Date(right?.date || right?.createdAt || 0).getTime();
      return rightTime - leftTime;
    });

    let runningBalance = Number(currentBalance);
    if (!Number.isFinite(runningBalance)) {
      runningBalance = 0;
    }

    return sortedTransactions.map((transaction) => {
      const nextTransaction = {
        ...transaction,
        balance: Number(runningBalance.toFixed(2)),
      };

      const amount = Number(transaction?.amount || 0);
      const delta =
        String(transaction?.debitOrCredit || "").toLowerCase() === "credit"
          ? amount
          : -amount;

      if (Number.isFinite(delta)) {
        runningBalance -= delta;
      }

      return nextTransaction;
    });
  };

  const fetchAccountData = async () => {
    if (!id) return;
    try {
      const [transactionsResponse, accountResponse] = await Promise.all([
        bankTransactionsAPI.getAll({ account_id: id, sort_column: "date" }),
        bankAccountsAPI.getById(id),
      ]);

      const nextAccount = accountResponse?.bankaccount || null;
      if (nextAccount) {
        setAccount(nextAccount);
      }
      if (transactionsResponse.banktransactions) {
        const currentBalance =
          nextAccount?.balance ??
          nextAccount?.bankBalance ??
          account?.balance ??
          account?.bankBalance ??
          0;

        setTransactions(
          decorateTransactionsWithRunningBalance(transactionsResponse.banktransactions, currentBalance),
        );
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Failed to fetch account data:", error);
    }
  };

  useEffect(() => {
    void fetchAccountData();
  }, [id]);

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [accountsResponse, chartAccountsResponse, customersResponse, vendorsResponse] =
          await Promise.all([
            bankAccountsAPI.getAll(),
            chartOfAccountsAPI.getAccounts({ limit: 1000 }),
            customersAPI.getAll({ limit: 1000 }),
            vendorsAPI.getAll({ limit: 1000 }),
          ]);

        const bankAccounts = Array.isArray(accountsResponse?.bankaccounts)
          ? accountsResponse.bankaccounts
          : [];
        const chartAccounts = Array.isArray(chartAccountsResponse?.data)
          ? chartAccountsResponse.data
          : Array.isArray(chartAccountsResponse?.accounts)
            ? chartAccountsResponse.accounts
            : Array.isArray(chartAccountsResponse)
              ? chartAccountsResponse
              : [];
        const customers = Array.isArray(customersResponse?.data) ? customersResponse.data : [];
        const vendors = Array.isArray(vendorsResponse?.data) ? vendorsResponse.data : [];

        setReferenceBankAccounts(bankAccounts);
        setReferenceChartAccounts(chartAccounts);
        setReferenceCustomers(customers);
        setReferenceVendors(vendors);
      } catch (error) {
        console.error("Failed to load reference data for banking forms:", error);
      }
    };

    void loadReferenceData();
  }, []);

  useEffect(() => {
    setTransferFormData((current) =>
      current.currency && current.currency !== "USD"
        ? current
        : { ...current, currency: resolvedBaseCurrency },
    );
    setDepositToOtherAccountsFormData((current) =>
      current.currency && current.currency !== "USD"
        ? current
        : { ...current, currency: resolvedBaseCurrency },
    );
    setTransferFromAnotherAccountFormData((current) =>
      current.currency && current.currency !== "USD"
        ? current
        : { ...current, currency: resolvedBaseCurrency },
    );
  }, [resolvedBaseCurrency]);

  const resolveBankAccountId = (value: any): string | undefined => {
    const selected = String(value || "").trim();
    if (!selected) return undefined;
    if (/^[a-f\d]{24}$/i.test(selected)) return selected;
    if (String(account?._id || "") === selected) return String(account?._id || "");
    if (getAccountDisplayName(account).toLowerCase() === selected.toLowerCase()) {
      return String(account?._id || "");
    }

    const found = referenceBankAccounts.find((bankAccount) => {
      return getAccountDisplayName(bankAccount).toLowerCase() === selected.toLowerCase();
    });

    return found?._id ? String(found._id) : undefined;
  };

  const resolveChartAccountId = (value: any): string | undefined => {
    const selected = String(value || "").trim();
    if (!selected) return undefined;
    if (/^[a-f\d]{24}$/i.test(selected)) return selected;

    const found = referenceChartAccounts.find((chartAccount) => {
      return getChartAccountDisplayName(chartAccount).toLowerCase() === selected.toLowerCase();
    });

    return found?._id ? String(found._id) : found?.id ? String(found.id) : undefined;
  };

  const resolveAnyAccountId = (value: any): string | undefined => {
    return resolveBankAccountId(value) || resolveChartAccountId(value);
  };

  const resolveCustomerId = (value: any): string | undefined => {
    const selected = String(value || "").trim();
    if (!selected) return undefined;
    if (/^[a-f\d]{24}$/i.test(selected)) return selected;

    const found = referenceCustomers.find((customer) => {
      return getCustomerDisplayName(customer).toLowerCase() === selected.toLowerCase();
    });

    return found?._id ? String(found._id) : undefined;
  };

  const resolveVendorId = (value: any): string | undefined => {
    const selected = String(value || "").trim();
    if (!selected) return undefined;
    if (/^[a-f\d]{24}$/i.test(selected)) return selected;

    const found = referenceVendors.find((vendor) => {
      return getVendorDisplayName(vendor).toLowerCase() === selected.toLowerCase();
    });

    return found?._id ? String(found._id) : undefined;
  };

  const saveManualTransaction = async (payload: any) => {
    if (!account?._id) {
      throw new Error("Bank account is not loaded.");
    }

    setIsSavingTransaction(true);
    try {
      await bankTransactionsAPI.create({
        ...payload,
        account_id: String(account._id),
      });
      await fetchAccountData();
    } finally {
      setIsSavingTransaction(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!account?._id) return;
    try {
      await bankAccountsAPI.delete(account._id);
      window.dispatchEvent(new CustomEvent("bankAccountDeleted", { detail: { accountId: account._id } }));
      navigate("/banking");
    } catch (error) {
      console.error("Failed to delete bank account:", error);
      alert("Failed to delete bank account. Please try again.");
    }
  };

  const handleMarkInactive = async () => {
    if (!account?._id) return;
    try {
      await bankAccountsAPI.markInactive(account._id);
      window.dispatchEvent(new CustomEvent("bankAccountDeleted", { detail: { accountId: account._id } }));
      navigate("/banking");
    } catch (error: any) {
      console.error("Failed to mark account inactive:", error);
      alert(error?.message || "Failed to mark bank account as inactive.");
    }
  };

  const handleDeleteSelectedTransactions = async () => {
    if (!selectedTransactions.length) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedTransactions.length} transaction(s)?`,
    );
    if (!confirmed) return;

    try {
      await Promise.all(selectedTransactions.map((transactionId) => bankTransactionsAPI.delete(transactionId)));
      setSelectedTransactions([]);
      await fetchAccountData();
    } catch (error: any) {
      console.error("Failed to delete selected transactions:", error);
      alert(error?.message || "Failed to delete one or more selected transactions.");
    }
  };

  const handleSaveExpense = async () => {
    const amount = parseAmountInput(expenseFormData.amount);
    if (amount <= 0) return alert("Enter a valid amount.");

    try {
      await saveManualTransaction({
        transaction_type: "expense",
        from_account_id: String(account?._id),
        amount,
        date: normalizeDateInput(expenseFormData.date),
        payment_mode: "Cash",
        customer_id: resolveCustomerId(expenseFormData.customer),
        vendor_id: resolveVendorId(expenseFormData.vendor),
        reference_number: expenseFormData.reference,
        description: expenseFormData.description || `Expense - ${expenseFormData.expenseAccount || "General"}`,
      });
      setShowExpenseSidebar(false);
    } catch (error: any) {
      console.error("Failed to save expense transaction:", error);
      alert(error?.message || "Failed to save expense transaction.");
    }
  };

  const handleSaveVendorAdvance = async () => {
    const amount = parseAmountInput(vendorAdvanceFormData.amount);
    if (!vendorAdvanceFormData.vendor || amount <= 0) {
      return alert("Vendor and amount are required.");
    }

    try {
      await saveManualTransaction({
        transaction_type: "withdrawal",
        from_account_id: String(account?._id),
        amount,
        date: normalizeDateInput(vendorAdvanceFormData.date),
        payment_mode: vendorAdvanceFormData.paidVia,
        vendor_id: resolveVendorId(vendorAdvanceFormData.vendor),
        reference_number: vendorAdvanceFormData.reference,
        description: vendorAdvanceFormData.description || `Vendor advance - ${vendorAdvanceFormData.vendor}`,
        bank_charges: parseAmountInput(vendorAdvanceFormData.bankCharges),
      });
      setShowVendorAdvanceSidebar(false);
    } catch (error: any) {
      console.error("Failed to save vendor advance transaction:", error);
      alert(error?.message || "Failed to save vendor advance transaction.");
    }
  };

  const handleSaveVendorPayment = async () => {
    const amount = parseAmountInput(vendorPaymentFormData.amount);
    if (!vendorPaymentFormData.vendor || amount <= 0) {
      return alert("Vendor and amount are required.");
    }

    try {
      await saveManualTransaction({
        transaction_type: "withdrawal",
        from_account_id: String(account?._id),
        amount,
        date: normalizeDateInput(vendorPaymentFormData.date),
        payment_mode: vendorPaymentFormData.paidVia,
        vendor_id: resolveVendorId(vendorPaymentFormData.vendor),
        reference_number: vendorPaymentFormData.reference,
        description: vendorPaymentFormData.description || `Vendor payment - ${vendorPaymentFormData.vendor}`,
        bank_charges: parseAmountInput(vendorPaymentFormData.bankCharges),
      });
      setShowVendorPaymentSidebar(false);
    } catch (error: any) {
      console.error("Failed to save vendor payment transaction:", error);
      alert(error?.message || "Failed to save vendor payment transaction.");
    }
  };

  const handleSaveTransferOut = async () => {
    const amount = parseAmountInput(transferFormData.amount);
    const fromAccountId = resolveBankAccountId(transferFormData.fromAccount) || String(account?._id);
    const toAccountId = resolveBankAccountId(transferFormData.toAccount);
    if (amount <= 0) return alert("Enter a valid amount.");
    if (!toAccountId) return alert("Select the destination bank or credit card account.");

    try {
      await saveManualTransaction({
        transaction_type: "transfer_fund",
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount,
        date: normalizeDateInput(transferFormData.date),
        payment_mode: "Bank Transfer",
        reference_number: transferFormData.reference,
        description: transferFormData.description || `Transfer to ${transferFormData.toAccount || "another account"}`,
      });
      setShowTransferSidebar(false);
    } catch (error: any) {
      console.error("Failed to save transfer transaction:", error);
      alert(error?.message || "Failed to save transfer transaction.");
    }
  };

  const handleSaveCardPayment = async () => {
    const amount = parseAmountInput(cardPaymentFormData.amount);
    const fromAccountId = resolveBankAccountId(cardPaymentFormData.fromAccount) || String(account?._id);
    const toAccountId = resolveBankAccountId(cardPaymentFormData.toAccount);
    if (amount <= 0) return alert("Enter a valid amount.");
    if (!toAccountId) return alert("Select the card or bank account receiving the payment.");

    try {
      await saveManualTransaction({
        transaction_type: "card_payment",
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount,
        date: normalizeDateInput(cardPaymentFormData.date),
        payment_mode: "Card",
        reference_number: cardPaymentFormData.reference,
        description: cardPaymentFormData.description || `Card payment to ${cardPaymentFormData.toAccount || "card account"}`,
      });
      setShowCardPaymentSidebar(false);
    } catch (error: any) {
      console.error("Failed to save card payment transaction:", error);
      alert(error?.message || "Failed to save card payment transaction.");
    }
  };

  const handleSaveOwnerDrawings = async () => {
    const amount = parseAmountInput(ownerDrawingsFormData.amount);
    const toAccountId = resolveAnyAccountId(ownerDrawingsFormData.toAccount);
    if (amount <= 0) return alert("Enter a valid amount.");
    if (!toAccountId) return alert("Select the drawings or equity account.");

    try {
      await saveManualTransaction({
        transaction_type: "owner_drawings",
        from_account_id: String(account?._id),
        to_account_id: toAccountId,
        amount,
        date: normalizeDateInput(ownerDrawingsFormData.date),
        reference_number: ownerDrawingsFormData.reference,
        description: ownerDrawingsFormData.description || `Owner drawings - ${ownerDrawingsFormData.toAccount || "capital account"}`,
      });
      setShowOwnerDrawingsSidebar(false);
    } catch (error: any) {
      console.error("Failed to save owner drawings transaction:", error);
      alert(error?.message || "Failed to save owner drawings transaction.");
    }
  };

  const handleSaveDepositToOtherAccounts = async () => {
    const amount = parseAmountInput(depositToOtherAccountsFormData.amount);
    if (amount <= 0) return alert("Enter a valid amount.");

    try {
      await saveManualTransaction({
        transaction_type: "transfer_fund",
        from_account_id: String(account?._id),
        amount,
        date: normalizeDateInput(depositToOtherAccountsFormData.date),
        payment_mode: depositToOtherAccountsFormData.paidVia,
        reference_number: depositToOtherAccountsFormData.reference,
        description:
          depositToOtherAccountsFormData.description ||
          `Deposit to ${depositToOtherAccountsFormData.toAccount || "other account"}`,
      });
      setShowDepositToOtherAccountsSidebar(false);
    } catch (error: any) {
      console.error("Failed to save deposit to other accounts transaction:", error);
      alert(error?.message || "Failed to save deposit transaction.");
    }
  };

  const handleSaveCreditNoteRefund = async () => {
    const selected = creditNoteRefundFormData.creditNotes.find(
      (creditNote: any) => String(creditNote.id) === String(creditNoteRefundFormData.selectedCreditNote),
    );
    const amount = parseAmountInput(selected?.refundAmount || selected?.balance);
    if (!creditNoteRefundFormData.customer || amount <= 0) {
      return alert("Customer and refund amount are required.");
    }

    try {
      await saveManualTransaction({
        transaction_type: "withdrawal",
        from_account_id: String(account?._id),
        amount,
        date: normalizeDateInput(creditNoteRefundFormData.date),
        payment_mode: creditNoteRefundFormData.paidVia,
        customer_id: resolveCustomerId(creditNoteRefundFormData.customer),
        reference_number: creditNoteRefundFormData.reference,
        description:
          creditNoteRefundFormData.description ||
          `Credit note refund - ${creditNoteRefundFormData.customer}`,
      });
      setShowCreditNoteRefundSidebar(false);
    } catch (error: any) {
      console.error("Failed to save credit note refund transaction:", error);
      alert(error?.message || "Failed to save credit note refund transaction.");
    }
  };

  const handleSavePaymentRefund = async () => {
    const selected = paymentRefundFormData.payments.find(
      (payment: any) => String(payment.id) === String(paymentRefundFormData.selectedPayment),
    );
    const amount = parseAmountInput(selected?.refundAmount || selected?.balance || selected?.amount);
    if (!paymentRefundFormData.customer || amount <= 0) {
      return alert("Customer and refund amount are required.");
    }

    try {
      await saveManualTransaction({
        transaction_type: "withdrawal",
        from_account_id: String(account?._id),
        amount,
        date: normalizeDateInput(paymentRefundFormData.date),
        payment_mode: paymentRefundFormData.paidVia,
        customer_id: resolveCustomerId(paymentRefundFormData.customer),
        reference_number: paymentRefundFormData.reference,
        description: paymentRefundFormData.description || `Payment refund - ${paymentRefundFormData.customer}`,
      });
      setShowPaymentRefundSidebar(false);
    } catch (error: any) {
      console.error("Failed to save payment refund transaction:", error);
      alert(error?.message || "Failed to save payment refund transaction.");
    }
  };

  const handleSaveEmployeeReimbursement = async () => {
    if (!employeeReimbursementFormData.employeeName) {
      return alert("Employee name is required.");
    }

    try {
      await saveManualTransaction({
        transaction_type: "expense",
        from_account_id: String(account?._id),
        amount: 0,
        date: normalizeDateInput(employeeReimbursementFormData.date),
        reference_number: employeeReimbursementFormData.reference,
        description:
          employeeReimbursementFormData.description ||
          `Employee reimbursement - ${employeeReimbursementFormData.employeeName}`,
      });
      setShowEmployeeReimbursementSidebar(false);
    } catch (error: any) {
      console.error("Failed to save employee reimbursement transaction:", error);
      alert(error?.message || "Failed to save employee reimbursement transaction.");
    }
  };

  const handleSaveCustomerAdvance = async () => {
    const amount = parseAmountInput(customerAdvanceFormData.amountReceived);
    if (!customerAdvanceFormData.customer || amount <= 0) {
      return alert("Customer and amount are required.");
    }

    try {
      await saveManualTransaction({
        transaction_type: "deposit",
        to_account_id: String(account?._id),
        amount,
        date: normalizeDateInput(customerAdvanceFormData.date),
        payment_mode: customerAdvanceFormData.receivedVia,
        customer_id: resolveCustomerId(customerAdvanceFormData.customer),
        reference_number: customerAdvanceFormData.reference,
        description: customerAdvanceFormData.description || `Customer advance - ${customerAdvanceFormData.customer}`,
        bank_charges: parseAmountInput(customerAdvanceFormData.bankCharges),
        exchange_rate: parseAmountInput(customerAdvanceFormData.exchangeRate) || 1,
      });
      setShowCustomerAdvanceSidebar(false);
    } catch (error: any) {
      console.error("Failed to save customer advance transaction:", error);
      alert(error?.message || "Failed to save customer advance transaction.");
    }
  };

  const handleSaveCustomerPayment = async () => {
    const amount = parseAmountInput(customerPaymentFormData.amountReceived);
    if (!customerPaymentFormData.customer || amount <= 0) {
      return alert("Customer and amount are required.");
    }

    try {
      await saveManualTransaction({
        transaction_type: "deposit",
        to_account_id: String(account?._id),
        amount,
        date: normalizeDateInput(customerPaymentFormData.date),
        payment_mode: customerPaymentFormData.receivedVia,
        customer_id: resolveCustomerId(customerPaymentFormData.customer),
        reference_number: customerPaymentFormData.reference,
        description: customerPaymentFormData.description || `Customer payment - ${customerPaymentFormData.customer}`,
        bank_charges: parseAmountInput(customerPaymentFormData.bankCharges),
      });
      setShowCustomerPaymentSidebar(false);
    } catch (error: any) {
      console.error("Failed to save customer payment transaction:", error);
      alert(error?.message || "Failed to save customer payment transaction.");
    }
  };

  const handleSaveTransferFromAnotherAccount = async () => {
    const amount = parseAmountInput(transferFromAnotherAccountFormData.amount);
    const fromAccountId = resolveBankAccountId(transferFromAnotherAccountFormData.fromAccount);
    const toAccountId =
      resolveBankAccountId(transferFromAnotherAccountFormData.toAccount) || String(account?._id);
    if (amount <= 0) return alert("Enter a valid amount.");
    if (!fromAccountId) return alert("Select the source bank or credit card account.");

    try {
      await saveManualTransaction({
        transaction_type: "transfer_fund",
        to_account_id: toAccountId,
        from_account_id: fromAccountId,
        amount,
        date: normalizeDateInput(transferFromAnotherAccountFormData.date),
        payment_mode: "Bank Transfer",
        reference_number: transferFromAnotherAccountFormData.reference,
        description:
          transferFromAnotherAccountFormData.description ||
          `Transfer from ${transferFromAnotherAccountFormData.fromAccount || "another account"}`,
      });
      setShowTransferFromAnotherAccountSidebar(false);
    } catch (error: any) {
      console.error("Failed to save incoming transfer transaction:", error);
      alert(error?.message || "Failed to save transfer transaction.");
    }
  };

  const handleSaveMoneyInEntry = async () => {
    const amount = parseAmountInput(moneyInFormData.amount);
    if (amount <= 0) return alert("Enter a valid amount.");

    try {
      await saveManualTransaction({
        transaction_type: moneyInTransactionType,
        to_account_id: String(account?._id),
        amount,
        date: normalizeDateInput(moneyInFormData.date),
        payment_mode: moneyInFormData.receivedVia,
        reference_number: moneyInFormData.reference,
        description:
          moneyInFormData.description || moneyInDefaultDescriptionByType[moneyInTransactionType],
      });
      setShowMoneyInEntrySidebar(false);
    } catch (error: any) {
      console.error("Failed to save money in transaction:", error);
      alert(error?.message || "Failed to save money in transaction.");
    }
  };

  useEffect(() => {
    const closeIfOutside = (
      ref: RefObject<any>,
      close: Dispatch<SetStateAction<boolean>>,
      event: MouseEvent,
    ) => {
      if (ref.current && !ref.current.contains(event.target)) {
        close(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      closeIfOutside(dropdownRef, setIsAddTransactionDropdownOpen, event);
      closeIfOutside(settingsDropdownRef, setIsSettingsDropdownOpen, event);
      closeIfOutside(accountMenuRef, setIsAccountMenuOpen, event);
      closeIfOutside(categoryDropdownRef, setIsCategoryDropdownOpen, event);
      closeIfOutside(expenseAccountRef, setExpenseAccountOpen, event);
      closeIfOutside(vendorRef, setVendorOpen, event);
      closeIfOutside(customerRef, setCustomerOpen, event);
      closeIfOutside(currencyRef, setCurrencyOpen, event);
      closeIfOutside(vendorAdvanceVendorRef, setVendorAdvanceVendorOpen, event);
      closeIfOutside(vendorAdvanceCurrencyRef, setVendorAdvanceCurrencyOpen, event);
      closeIfOutside(paidViaRef, setPaidViaOpen, event);
      closeIfOutside(depositToRef, setDepositToOpen, event);
      closeIfOutside(vendorPaymentVendorRef, setVendorPaymentVendorOpen, event);
      closeIfOutside(vendorPaymentPaidViaRef, setVendorPaymentPaidViaOpen, event);
      closeIfOutside(fromAccountRef, setFromAccountOpen, event);
      closeIfOutside(toAccountRef, setToAccountOpen, event);
      closeIfOutside(transferCurrencyRef, setTransferCurrencyOpen, event);
      closeIfOutside(cardPaymentFromAccountRef, setCardPaymentFromAccountOpen, event);
      closeIfOutside(cardPaymentToAccountRef, setCardPaymentToAccountOpen, event);
      closeIfOutside(cardPaymentCurrencyRef, setCardPaymentCurrencyOpen, event);
      closeIfOutside(ownerDrawingsToAccountRef, setOwnerDrawingsToAccountOpen, event);
      closeIfOutside(depositToOtherAccountsPaidViaRef, setDepositToOtherAccountsPaidViaOpen, event);
      closeIfOutside(depositToOtherAccountsToAccountRef, setDepositToOtherAccountsToAccountOpen, event);
      closeIfOutside(depositToOtherAccountsReceivedFromRef, setDepositToOtherAccountsReceivedFromOpen, event);
      closeIfOutside(creditNoteRefundCustomerRef, setCreditNoteRefundCustomerOpen, event);
      closeIfOutside(creditNoteRefundPaidViaRef, setCreditNoteRefundPaidViaOpen, event);
      closeIfOutside(paymentRefundCustomerRef, setPaymentRefundCustomerOpen, event);
      closeIfOutside(paymentRefundPaidViaRef, setPaymentRefundPaidViaOpen, event);
      closeIfOutside(employeeReimbursementEmployeeRef, setEmployeeReimbursementEmployeeOpen, event);
      closeIfOutside(customerAdvanceCustomerRef, setCustomerAdvanceCustomerOpen, event);
      closeIfOutside(customerAdvanceReceivedViaRef, setCustomerAdvanceReceivedViaOpen, event);
      closeIfOutside(customerPaymentCustomerRef, setCustomerPaymentCustomerOpen, event);
      closeIfOutside(customerPaymentReceivedViaRef, setCustomerPaymentReceivedViaOpen, event);
      closeIfOutside(transferFromToAccountRef, setTransferFromToAccountOpen, event);
      closeIfOutside(transferFromFromAccountRef, setTransferFromFromAccountOpen, event);
      closeIfOutside(transferFromCurrencyRef, setTransferFromCurrencyOpen, event);
      closeIfOutside(moneyInCurrencyRef, setMoneyInCurrencyOpen, event);
      closeIfOutside(moneyInReceivedViaRef, setMoneyInReceivedViaOpen, event);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return {
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
    showMoneyInEntrySidebar,
    setShowMoneyInEntrySidebar,
    moneyInTransactionType,
    setMoneyInTransactionType,
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
    moneyInFormData,
    setMoneyInFormData,
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
    moneyInCurrencyOpen,
    setMoneyInCurrencyOpen,
    moneyInReceivedViaOpen,
    setMoneyInReceivedViaOpen,
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
    moneyInCurrencyRef,
    moneyInReceivedViaRef,
    moneyInFileInputRef,
    moneyInSidebarTitle,
    isCreditCardAccount,
    moneyOutTransactionOptions,
    moneyInTransactionOptions,
    filteredCategories,
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
    handleDeleteAccount,
    handleMarkInactive,
    handleDeleteSelectedTransactions,
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
    handleSaveTransferFromAnotherAccount,
    handleSaveMoneyInEntry,
    getTransactionId,
    formatTransactionTypeLabel,
    getTransactionCounterparty,
  };
}
