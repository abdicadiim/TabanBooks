import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bankAccountsAPI } from "../../../services/api";
import { dashboardService } from "../../../services/dashboardService";
import {
  BANK_STATEMENTS_INBOX_EMAIL,
  type AccountFilterOption,
  type TimePeriodOption,
} from "./constants";
import {
  getAccountDisplayName,
  getAccountId,
  matchesAccountStatusFilter,
} from "./helpers";
import type {
  BankAccount,
  BankAccountsResponse,
  BankAccountsSummary,
  BankAccountsSummaryResponse,
} from "./types";

export function useBankingPageController() {
  const navigate = useNavigate();

  const [allAccountsOpen, setAllAccountsOpen] = useState(false);
  const [chartVisible, setChartVisible] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("All Accounts");
  const [openAccountMenu, setOpenAccountMenu] = useState<string | null>(null);
  const [activeAccountsFilter, setActiveAccountsFilter] =
    useState<AccountFilterOption>("Active Accounts");
  const [activeAccountsDropdownOpen, setActiveAccountsDropdownOpen] =
    useState(false);
  const [allAccountsSectionOpen, setAllAccountsSectionOpen] = useState(true);
  const [selectedTimePeriod, setSelectedTimePeriod] =
    useState<TimePeriodOption>("Last 30 days");
  const [timePeriodDropdownOpen, setTimePeriodDropdownOpen] = useState(false);
  const [isBankStatementsModalOpen, setIsBankStatementsModalOpen] =
    useState(false);
  const [isFindAccountModalOpen, setIsFindAccountModalOpen] = useState(false);
  const [findAccountName, setFindAccountName] = useState("");
  const [findAccountCode, setFindAccountCode] = useState("");
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [summary, setSummary] = useState<BankAccountsSummary>({
    totalBalance: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);

  const allAccountsDropdownRef = useRef<HTMLDivElement | null>(null);
  const activeAccountsDropdownRef = useRef<HTMLDivElement | null>(null);
  const timePeriodDropdownRef = useRef<HTMLDivElement | null>(null);
  const accountMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchAccounts = async () => {
    try {
      setLoading(true);

      const [accountsRes, summaryRes] = await Promise.all([
        bankAccountsAPI.getAll() as Promise<BankAccountsResponse>,
        dashboardService.getBankAccountsSummary() as Promise<BankAccountsSummaryResponse>,
      ]);

      setAccounts(
        Array.isArray(accountsRes?.bankaccounts) ? accountsRes.bankaccounts : [],
      );

      if (summaryRes?.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch bank accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAccounts();
  }, []);

  useEffect(() => {
    const handleAccountDeleted: EventListener = () => {
      void fetchAccounts();
    };

    window.addEventListener("bankAccountDeleted", handleAccountDeleted);
    return () => {
      window.removeEventListener("bankAccountDeleted", handleAccountDeleted);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (
        allAccountsDropdownRef.current &&
        !allAccountsDropdownRef.current.contains(event.target)
      ) {
        setAllAccountsOpen(false);
      }

      if (
        activeAccountsDropdownRef.current &&
        !activeAccountsDropdownRef.current.contains(event.target)
      ) {
        setActiveAccountsDropdownOpen(false);
      }

      if (
        timePeriodDropdownRef.current &&
        !timePeriodDropdownRef.current.contains(event.target)
      ) {
        setTimePeriodDropdownOpen(false);
      }

      if (openAccountMenu !== null) {
        const menuRef = accountMenuRefs.current[openAccountMenu];
        if (menuRef && !menuRef.contains(event.target)) {
          setOpenAccountMenu(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openAccountMenu]);

  const accountOptions = [
    "All Accounts",
    ...Array.from(
      new Set(
        accounts
          .map(getAccountDisplayName)
          .filter((accountName) => accountName && accountName !== "Unnamed Account"),
      ),
    ),
  ];

  useEffect(() => {
    if (
      selectedAccount !== "All Accounts" &&
      !accountOptions.includes(selectedAccount)
    ) {
      setSelectedAccount("All Accounts");
    }
  }, [accountOptions, selectedAccount]);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredAccounts = accounts.filter((account) => {
    const accountName = getAccountDisplayName(account);
    const accountNumber = String(account.accountNumber || "");
    const accountCode = String(account.accountCode || "");

    const matchesSearch =
      !normalizedSearchTerm ||
      accountName.toLowerCase().includes(normalizedSearchTerm) ||
      accountNumber.toLowerCase().includes(normalizedSearchTerm) ||
      accountCode.toLowerCase().includes(normalizedSearchTerm);

    const matchesSelectedAccount =
      selectedAccount === "All Accounts" || accountName === selectedAccount;

    const matchesStatus = matchesAccountStatusFilter(
      account,
      activeAccountsFilter,
    );

    return matchesSearch && matchesSelectedAccount && matchesStatus;
  });

  const closeFindAccountModal = () => {
    setIsFindAccountModalOpen(false);
    setFindAccountName("");
    setFindAccountCode("");
  };

  const handleFindAccountSearch = () => {
    console.log("Searching for account:", findAccountName, findAccountCode);
    closeFindAccountModal();
  };

  const handleCopyInboxEmail = () => {
    if (navigator?.clipboard) {
      void navigator.clipboard.writeText(BANK_STATEMENTS_INBOX_EMAIL);
    }
  };

  const navigateToAddAccount = () => {
    navigate("/banking/add-account/form");
  };

  const navigateToAccount = (account: BankAccount) => {
    const accountId = getAccountId(account);
    if (!accountId) {
      return;
    }

    navigate(`/banking/account/${accountId}`, {
      state: { account },
    });
  };

  const editAccount = (account: BankAccount) => {
    navigate("/banking/add-account/form", {
      state: { account, isEdit: true },
    });
  };

  const toggleAccountMenu = (accountId: string) => {
    setOpenAccountMenu((currentMenu) =>
      currentMenu === accountId ? null : accountId,
    );
  };

  const setAccountMenuRef =
    (accountId: string) => (element: HTMLDivElement | null) => {
      accountMenuRefs.current[accountId] = element;
    };

  return {
    activeAccountsDropdownOpen,
    activeAccountsDropdownRef,
    activeAccountsFilter,
    allAccountsDropdownRef,
    allAccountsOpen,
    allAccountsSectionOpen,
    chartVisible,
    closeFindAccountModal,
    editAccount,
    filteredAccounts,
    findAccountCode,
    findAccountName,
    handleCopyInboxEmail,
    handleFindAccountSearch,
    isBankStatementsModalOpen,
    isFindAccountModalOpen,
    loading,
    navigateToAccount,
    navigateToAddAccount,
    openAccountMenu,
    searchTerm,
    selectedAccount,
    selectedTimePeriod,
    setAccountMenuRef,
    setActiveAccountsDropdownOpen,
    setActiveAccountsFilter,
    setAllAccountsOpen,
    setAllAccountsSectionOpen,
    setChartVisible,
    setFindAccountCode,
    setFindAccountName,
    setIsBankStatementsModalOpen,
    setIsFindAccountModalOpen,
    setSearchTerm,
    setSelectedAccount,
    setSelectedTimePeriod,
    setTimePeriodDropdownOpen,
    summary,
    timePeriodDropdownOpen,
    timePeriodDropdownRef,
    toggleAccountMenu,
    accountOptions,
  };
}
