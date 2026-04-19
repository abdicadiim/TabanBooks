import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getJournalById, getJournals, saveJournal, deleteJournal, getAccounts } from "../accountantModel";
import type { ManualJournal, ManualJournalAccount } from "../manualJournalTypes";
import {
  X, Edit, Send, FileText, MoreVertical, MoreHorizontal,
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Plus, Filter,
  ArrowUpDown, CheckSquare, Square, Search, Star, Link2, Mail, Printer, Settings,
  User, Calendar, Paperclip, MessageSquare, Copy, Trash2, CheckCircle, Upload, Bold, Italic, Underline
} from "lucide-react";

const periodOptions = ["All", "Today", "This Week", "This Month", "This Quarter", "This Year", "Custom"] as const;

type PeriodOption = (typeof periodOptions)[number];
type AccountsMap = Record<string, string>;
type TaxBreakdown = Record<string, { debits: number; credits: number }>;

interface JournalTax {
  name?: string;
  rate?: number | string;
  amount?: number | string;
}

interface JournalEntry {
  accountName?: string;
  account?: string;
  accountId?: string;
  description?: string;
  contact?: string;
  debit?: number | string;
  credit?: number | string;
  debits?: number | string;
  credits?: number | string;
  tax?: any;
  [key: string]: unknown;
}

type JournalRecord = ManualJournal & {
  id?: string;
  _id?: string;
  currency?: string;
  status?: string;
  reportingMethod?: string;
  attachments?: number;
  amount?: number;
  entries?: JournalEntry[];
  lines?: JournalEntry[];
};

interface EmailData {
  to: string;
  subject: string;
  message: string;
}

interface AttachmentItem {
  id: number;
  name: string;
  size: number;
  file: File;
}

interface CommentItem {
  id: number;
  user: string;
  date: string;
  text: string;
  icon: string;
}

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const getEntryDebit = (entry: JournalEntry): number => toNumber(entry.debits ?? entry.debit);

const getEntryCredit = (entry: JournalEntry): number => toNumber(entry.credits ?? entry.credit);

const getTaxDetails = (tax: JournalEntry["tax"]): JournalTax | null =>
  tax && typeof tax === "object" ? tax : null;

const getJournalEntries = (journal: JournalRecord | null): JournalEntry[] =>
  journal?.entries || journal?.lines || [];

const buildTaxBreakdown = (entries: JournalEntry[]): TaxBreakdown => {
  const breakdown: TaxBreakdown = {};

  entries.forEach((entry) => {
    const tax = getTaxDetails(entry.tax);
    if (!tax) {
      return;
    }

    const taxKey = `${tax.name || "Tax"} (${tax.rate || 0}%)`;
    if (!breakdown[taxKey]) {
      breakdown[taxKey] = { debits: 0, credits: 0 };
    }

    if (getEntryDebit(entry) > 0) {
      breakdown[taxKey].debits += toNumber(tax.amount);
    }

    if (getEntryCredit(entry) > 0) {
      breakdown[taxKey].credits += toNumber(tax.amount);
    }
  });

  return breakdown;
};

const isClickOutside = (
  ref: React.RefObject<HTMLElement | null>,
  target: EventTarget | null
): boolean => Boolean(ref.current && target instanceof Node && !ref.current.contains(target));

export default function JournalDetail() {
  const { id } = useParams();
  const currentJournalId = id ?? "";
  const navigate = useNavigate();
  const [journal, setJournal] = useState<JournalRecord | null>(null);
  const [journals, setJournals] = useState<JournalRecord[]>([]);
  const [accountsMap, setAccountsMap] = useState<AccountsMap>({});
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAllJournalsDropdownOpen, setIsAllJournalsDropdownOpen] = useState(false);
  const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("All");
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJournals, setSelectedJournals] = useState<string[]>([]);
  const [filteredJournals, setFilteredJournals] = useState<JournalRecord[]>([]);
  const [emailData, setEmailData] = useState<EmailData>({
    to: "",
    subject: "",
    message: ""
  });
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: 1,
      user: "mahir abdullahi",
      date: "27 DEC 2025 08:08 PM",
      text: "Journal has been published.",
      icon: "edit"
    },
    {
      id: 2,
      user: "mahir abdullahi",
      date: "27 DEC 2025 07:46 PM",
      text: "Journal created for SOS666.00.",
      icon: "create"
    }
  ]);
  const [newComment, setNewComment] = useState("");
  const [isJournalDocumentHovered, setIsJournalDocumentHovered] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const allJournalsDropdownRef = useRef<HTMLDivElement | null>(null);
  const pdfDropdownRef = useRef<HTMLDivElement | null>(null);
  const emailModalRef = useRef<HTMLDivElement | null>(null);
  const attachmentsModalRef = useRef<HTMLDivElement | null>(null);
  const commentsModalRef = useRef<HTMLDivElement | null>(null);
  const periodDropdownRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parse date string to Date object
  const parseDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    try {
      // Handle format like "13 Dec 2025"
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const parts = dateString.split(' ');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = months.indexOf(parts[1]);
        const year = parseInt(parts[2]);
        if (month !== -1) {
          return new Date(year, month, day);
        }
      }
      // Try parsing as ISO date
      return new Date(dateString);
    } catch (error) {
      return null;
    }
  };

  // Filter journals based on selected period
  const filterJournalsByPeriod = (
    journalsList: JournalRecord[],
    period: PeriodOption
  ): JournalRecord[] => {
    if (period === "All") {
      return journalsList;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return journalsList.filter((j) => {
      const journalDate = parseDate(j.date);
      if (!journalDate) return false;

      const journalDateOnly = new Date(journalDate.getFullYear(), journalDate.getMonth(), journalDate.getDate());

      switch (period) {
        case "Today":
          return journalDateOnly.getTime() === today.getTime();

        case "This Week": {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
          return journalDateOnly >= startOfWeek && journalDateOnly <= endOfWeek;
        }

        case "This Month": {
          return journalDate.getMonth() === now.getMonth() &&
            journalDate.getFullYear() === now.getFullYear();
        }

        case "This Quarter": {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const journalQuarter = Math.floor(journalDate.getMonth() / 3);
          return journalQuarter === currentQuarter &&
            journalDate.getFullYear() === now.getFullYear();
        }

        case "This Year": {
          return journalDate.getFullYear() === now.getFullYear();
        }

        case "Custom":
          // For Custom, we'll show all for now (can be enhanced with date range picker)
          return true;

        default:
          return true;
      }
    });
  };

  // Update filtered journals when period or journals change
  useEffect(() => {
    const filtered = filterJournalsByPeriod(journals, selectedPeriod);
    setFilteredJournals(filtered);
  }, [selectedPeriod, journals]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (!currentJournalId) {
          navigate("/accountant/manual-journals");
          return;
        }

        const journalData = await getJournalById(currentJournalId);
        if (journalData) {
          setJournal(journalData);
        } else {
          setTimeout(() => {
            navigate("/accountant/manual-journals");
          }, 100);
          return;
        }

        // Fetch Accounts for Name Lookup
        const accountsResponse = await getAccounts();
        if (accountsResponse && (accountsResponse.success || Array.isArray(accountsResponse.data))) {
          const accounts = (
            Array.isArray(accountsResponse) ? accountsResponse : (accountsResponse.data || [])
          ) as ManualJournalAccount[];
          const map: AccountsMap = {};
          accounts.forEach((acc) => {
            const accountId = String(acc.id || acc._id || "");
            if (accountId) {
              map[accountId] = acc.accountName || acc.name || accountId;
            }
          });
          setAccountsMap(map);
        }

        const response = await getJournals({ sourceType: 'manual_journal' });
        if (response && (response.success || response.code === 0)) {
          const rawData = Array.isArray(response.data) ? (response.data as JournalRecord[]) : [];
          const normalizedData: JournalRecord[] = rawData.map((j) => ({
            ...j,
            id: String(j._id || j.id || ""),
            date: j.date,
            status: (j.status || "draft").toUpperCase() === "POSTED" ? "PUBLISHED" : (j.status || "draft").toUpperCase(),
            amount: j.amount !== undefined
              ? j.amount
              : getJournalEntries(j).reduce((sum, line) => sum + getEntryDebit(line), 0),
          }));
          setJournals(normalizedData);
        }
      } catch (e) {
        console.error("Error loading journal details:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentJournalId, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClickOutside(moreMenuRef, event.target)) {
        setIsMoreMenuOpen(false);
      }
      if (isClickOutside(allJournalsDropdownRef, event.target)) {
        setIsAllJournalsDropdownOpen(false);
      }
      if (isClickOutside(pdfDropdownRef, event.target)) {
        setIsPdfDropdownOpen(false);
      }
      if (isEmailModalOpen && isClickOutside(emailModalRef, event.target)) {
        setIsEmailModalOpen(false);
      }
      if (isAttachmentsModalOpen && isClickOutside(attachmentsModalRef, event.target)) {
        setIsAttachmentsModalOpen(false);
      }
      if (isCommentsModalOpen && isClickOutside(commentsModalRef, event.target)) {
        setIsCommentsModalOpen(false);
      }
      if (isClickOutside(periodDropdownRef, event.target)) {
        setIsPeriodDropdownOpen(false);
      }
    };

    if (isMoreMenuOpen || isAllJournalsDropdownOpen || isPdfDropdownOpen || isEmailModalOpen || isAttachmentsModalOpen || isCommentsModalOpen || isPeriodDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreMenuOpen, isAllJournalsDropdownOpen, isPdfDropdownOpen, isEmailModalOpen, isAttachmentsModalOpen, isCommentsModalOpen, isPeriodDropdownOpen]);

  const formatCurrency = (amount: unknown, currency = "AED") => {
    return `${currency}${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatAmount = (amount: unknown) => {
    return Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  // Initialize email data when journal is loaded
  useEffect(() => {
    if (journal) {
      setEmailData({
        to: "",
        subject: `Journal Entry - ${journal.journalNumber || journal.id}`,
        message: `Dear Recipient,

Please find the journal entry details below:

Journal Details:
- Journal Number: ${journal.journalNumber || journal.id}
- Date: ${formatDate(journal.date)}
- Reference Number: ${journal.referenceNumber || "—"}
- Amount: ${formatCurrency(journal.amount, journal.currency)}
- Status: ${journal.status || "DRAFT"}

Thank you!

Best regards,
Taban Books`
      });
    }
  }, [journal]);

  const handleSendEmail = () => {
    setIsEmailModalOpen(true);
  };

  const handleEmailSend = () => {
    if (!emailData.to) {
      alert("Please enter a recipient email address");
      return;
    }

    // Create mailto link
    const subject = encodeURIComponent(emailData.subject);
    const body = encodeURIComponent(emailData.message);
    const mailtoLink = `mailto:${emailData.to}?subject=${subject}&body=${body}`;

    // Open default email client
    window.location.href = mailtoLink;

    // Close modal after a short delay
    setTimeout(() => {
      setIsEmailModalOpen(false);
      alert("Email client opened. Please send the email from your email application.");
    }, 100);
  };

  const handleClone = async () => {
    if (!journal) return;
    const journalEntries = getJournalEntries(journal);

    setIsMoreMenuOpen(false);

    // Create a clone of the journal with a new ID
    const clonedJournal = {
      ...journal,
      id: Date.now().toString(),
      journalNumber: String((parseInt(String(journal.journalNumber || journal.id || "0"), 10) || 0) + 1),
      status: "DRAFT",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    };

    // Save the cloned journal
    const saved = await saveJournal(clonedJournal);

    if (saved) {
      // Navigate to the cloned journal
      navigate(`/accountant/manual-journals/${clonedJournal.id}`);
    } else {
      alert("Failed to clone journal. Please try again.");
    }
  };

  const handleCreateTemplate = () => {
    if (!journal) return;

    setIsMoreMenuOpen(false);

    // Convert reporting method format if needed
    let reportingMethod = journal.reportingMethod || "Accrual and Cash";
    if (reportingMethod === "Accrual and Cash") {
      reportingMethod = "accrual-and-cash";
    } else if (reportingMethod === "Accrual Only") {
      reportingMethod = "accrual-only";
    } else if (reportingMethod === "Cash Only") {
      reportingMethod = "cash-only";
    }

    // Navigate to template creation form with journal data
    navigate("/accountant/manual-journals/templates/new", {
      state: {
        journalData: {
          templateName: `${journal.journalNumber || journal.id} - Template`,
          referenceNumber: journal.referenceNumber || "",
          notes: journal.notes || "",
          reportingMethod: reportingMethod,
          currency: journal.currency || "SOS",
          entries: journal.entries || []
        }
      }
    });
  };

  const handleDelete = async () => {
    if (!journal) return;

    if (window.confirm("Are you sure you want to delete this journal? This action cannot be undone.")) {
      setIsMoreMenuOpen(false);

      const journalId = String(journal.id || journal._id || "");
      if (!journalId) {
        alert("This journal does not have a valid ID.");
        return;
      }

      const deleted = await deleteJournal(journalId);

      if (deleted) {
        // Navigate back to the list
        navigate("/accountant/manual-journals");
      } else {
        alert("Failed to delete journal. Please try again.");
      }
    }
  };

  const handlePublish = async () => {
    if (!journal) return;

    if (journal.status === "PUBLISHED") {
      alert("This journal is already published.");
      return;
    }

    if (window.confirm("Are you sure you want to publish this journal? Published journals cannot be edited.")) {
      // Update journal status to PUBLISHED
      const updatedJournal = {
        ...journal,
        status: "PUBLISHED"
      };

      const saved = await saveJournal(updatedJournal);

      if (saved) {
        // Reload the journal to reflect the change
        const reloadedJournal = await getJournalById(currentJournalId);
        if (reloadedJournal) {
          setJournal(reloadedJournal);
        }
        alert("Journal published successfully!");
      } else {
        alert("Failed to publish journal. Please try again.");
      }
    }
  };

  const handleDownloadPDF = () => {
    setIsPdfDropdownOpen(false);

    if (!journal) return;
    const journalEntries = getJournalEntries(journal);

    // Create a printable version of the journal
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      const entriesHtml = journalEntries.length > 0
        ? journalEntries.map((entry) => {
            const tax = getTaxDetails(entry.tax);
            const debitAmount = getEntryDebit(entry);
            const creditAmount = getEntryCredit(entry);

            return `
            <tr>
              <td>
                <div>${entry.accountName || entry.account || "—"}</div>

                ${entry.description ? `<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${entry.description}</div>` : ''}
              </td>
              <td>${entry.contact || "—"}</td>
              <td>
                ${entry.tax ? `<div>${entry.tax.amount}</div><div style="font-size: 12px; color: #6b7280;">${entry.tax.rate}%</div>` : "—"}
              </td>
              <td style="text-align: right;">${debitAmount > 0 ? formatCurrency(debitAmount, journal.currency) : "0.00"}</td>
              <td style="text-align: right;">${creditAmount > 0 ? formatCurrency(creditAmount, journal.currency) : "0.00"}</td>
            </tr>
          `;
          }).join('')
        : '<tr><td colspan="5" style="text-align: center; padding: 20px;">No entries</td></tr>';

      // Calculate totals
      const totalDebits = journal.entries?.reduce((sum, entry) => sum + (parseFloat(entry.debits) || 0), 0) || 0;
      const totalCredits = journal.entries?.reduce((sum, entry) => sum + (parseFloat(entry.credits) || 0), 0) || 0;
      const subTotalDebits = journal.entries?.reduce((sum, entry) => {
        const debit = parseFloat(entry.debits) || 0;
        const taxAmount = entry.tax && entry.debits > 0 ? parseFloat(entry.tax.amount) || 0 : 0;
        return sum + debit - taxAmount;
      }, 0) || 0;
      const subTotalCredits = journal.entries?.reduce((sum, entry) => {
        const credit = parseFloat(entry.credits) || 0;
        const taxAmount = entry.tax && entry.credits > 0 ? parseFloat(entry.tax.amount) || 0 : 0;
        return sum + credit - taxAmount;
      }, 0) || 0;

      // Tax breakdown
      const taxBreakdown: TaxBreakdown = {};
      journal.entries?.forEach(entry => {
        if (entry.tax) {
          const taxKey = `${entry.tax.name} (${entry.tax.rate}%)`;
          if (!taxBreakdown[taxKey]) {
            taxBreakdown[taxKey] = { debits: 0, credits: 0 };
          }
          if (entry.debits > 0) {
            taxBreakdown[taxKey].debits += parseFloat(entry.tax.amount) || 0;
          }
          if (entry.credits > 0) {
            taxBreakdown[taxKey].credits += parseFloat(entry.tax.amount) || 0;
          }
        }
      });

      const taxRowsHtml = Object.entries(taxBreakdown).map(([taxName, amounts]) => `
        <tr>
          <td colspan="3">${taxName}</td>
          <td style="text-align: right;">${formatCurrency(amounts.debits, journal.currency)}</td>
          <td style="text-align: right;">${formatCurrency(amounts.credits, journal.currency)}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Journal Entry - ${journal.journalNumber || journal.id}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                font-family: Arial, sans-serif;
                color: #000;
                background: #fff;
                padding: 40px;
              }
              .journal-container {
                max-width: 800px;
                margin: 0 auto;
                position: relative;
              }
              .published-ribbon {
                position: absolute;
                top: 0;
                left: 0;
                background: #10b981;
                color: white;
                padding: 8px 24px;
                transform: rotate(-45deg);
                transform-origin: top left;
                font-size: 12px;
                font-weight: 600;
                z-index: 10;
              }
              .journal-header {
                text-align: center;
                margin: 40px 0;
              }
              .journal-title {
                font-size: 32px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: #111827;
                margin-bottom: 10px;
              }
              .journal-number {
                font-size: 16px;
                color: #6b7280;
              }
              .journal-info-row {
                display: flex;
                justify-content: space-between;
                margin: 40px 0;
                padding-bottom: 32px;
                border-bottom: 1px solid #e5e7eb;
              }
              .journal-info-section {
                flex: 1;
              }
              .journal-info-label {
                font-size: 14px;
                color: #6b7280;
                font-weight: 500;
                margin-bottom: 8px;
              }
              .journal-info-value {
                font-size: 16px;
                color: #111827;
                font-weight: 500;
              }
              .notes-section {
                margin: 32px 0;
                padding-bottom: 24px;
                border-bottom: 1px solid #e5e7eb;
              }
              .notes-label {
                font-size: 14px;
                font-weight: 600;
                color: #111827;
                margin-bottom: 8px;
              }
              .notes-value {
                font-size: 14px;
                color: #6b7280;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              th {
                background-color: #374151;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
              }
              td {
                padding: 12px;
                border-bottom: 1px solid #e5e7eb;
                font-size: 14px;
                color: #111827;
              }
              .summary-row {
                background-color: #f9fafb;
              }
              .total-row {
                background-color: #f3f4f6;
                font-weight: 600;
              }
              .total-row td {
                border-top: 2px solid #e5e7eb;
                border-bottom: none;
              }
            </style>
          </head>
          <body>
            <div class="journal-container">
              ${journal.status === "PUBLISHED" ? '<div class="published-ribbon">Published</div>' : ''}
              
              <div class="journal-header">
                <div class="journal-title">JOURNAL</div>
                <div class="journal-number">#${journal.journalNumber || journal.id}</div>
              </div>
              
              <div class="journal-info-row">
                <div class="journal-info-section">
                  <div class="journal-info-label">Date</div>
                  <div class="journal-info-value">${formatDate(journal.date)}</div>
                </div>
                <div class="journal-info-section">
                  <div class="journal-info-label">Amount</div>
                  <div class="journal-info-value">${formatCurrency(journal.amount, journal.currency)}</div>
                </div>
                <div class="journal-info-section">
                  <div class="journal-info-label">Reference Number</div>
                  <div class="journal-info-value">${journal.referenceNumber || "—"}</div>
                </div>
              </div>
              
              <div class="notes-section">
                <div class="notes-label">Notes</div>
                <div class="notes-value">${journal.notes || "no note"}</div>
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Contact</th>
                    <th>Tax</th>
                    <th>Debits</th>
                    <th>Credits</th>
                  </tr>
                </thead>
                <tbody>
                  ${entriesHtml}
                  <tr class="summary-row">
                    <td colspan="3">Sub Total</td>
                    <td style="text-align: right;">${formatCurrency(subTotalDebits, journal.currency)}</td>
                    <td style="text-align: right;">${formatCurrency(subTotalCredits, journal.currency)}</td>
                  </tr>
                  ${taxRowsHtml}
                  <tr class="total-row">
                    <td colspan="3">Total</td>
                    <td style="text-align: right;">${formatCurrency(totalDebits, journal.currency)}</td>
                    <td style="text-align: right;">${formatCurrency(totalCredits, journal.currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 250);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handlePrint = () => {
    setIsPdfDropdownOpen(false);
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-white overflow-hidden font-sans">
        {/* Sidebar Skeleton */}
        <div className="w-[320px] border-r border-gray-200 flex flex-col h-full bg-white select-none">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="h-5 w-32 bg-gray-100 animate-pulse rounded"></div>
            <div className="h-8 w-16 bg-gray-100 animate-pulse rounded"></div>
          </div>
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="h-4 w-20 bg-gray-50 animate-pulse rounded"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 border-b border-gray-50 space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-gray-100 animate-pulse rounded"></div>
                  <div className="h-4 w-16 bg-gray-100 animate-pulse rounded"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-3 w-12 bg-gray-50 animate-pulse rounded"></div>
                  <div className="h-3 w-20 bg-gray-50 animate-pulse rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 flex flex-col h-full bg-[#f4f7f9] overflow-hidden">
          <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-8">
            <div className="h-6 w-32 bg-gray-100 animate-pulse rounded"></div>
            <div className="flex gap-4">
              <div className="h-8 w-8 bg-gray-100 animate-pulse rounded-full"></div>
              <div className="h-8 w-8 bg-gray-100 animate-pulse rounded-full"></div>
            </div>
          </div>
          <div className="px-8 py-3 bg-white border-b border-gray-200 flex items-center gap-6">
            <div className="h-4 w-16 bg-gray-100 animate-pulse rounded"></div>
            <div className="h-4 w-24 bg-gray-100 animate-pulse rounded"></div>
            <div className="h-4 w-12 bg-gray-100 animate-pulse rounded"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center">
            <div className="w-full max-w-[850px] bg-white shadow-sm border border-gray-100 min-h-[800px] p-20 space-y-12">
              <div className="flex flex-col items-end space-y-4">
                <div className="h-12 w-48 bg-gray-100 animate-pulse rounded"></div>
                <div className="h-6 w-32 bg-gray-100 animate-pulse rounded"></div>
                <div className="space-y-2 w-48 pt-8">
                  <div className="h-4 w-full bg-gray-50 animate-pulse rounded"></div>
                  <div className="h-4 w-full bg-gray-50 animate-pulse rounded"></div>
                  <div className="h-4 w-full bg-gray-50 animate-pulse rounded"></div>
                </div>
              </div>
              <div className="space-y-4 pt-12">
                <div className="h-10 w-full bg-black/5 animate-pulse rounded"></div>
                <div className="h-32 w-full bg-gray-50 animate-pulse rounded"></div>
              </div>
              <div className="flex flex-col items-end pt-8">
                <div className="h-24 w-64 bg-gray-50 animate-pulse rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!journal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-10 text-center">
          <div>Journal not found. Redirecting...</div>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalDebits = journal.entries?.reduce((sum, entry) => sum + (parseFloat(entry.debits) || 0), 0) || 0;
  const totalCredits = journal.entries?.reduce((sum, entry) => sum + (parseFloat(entry.credits) || 0), 0) || 0;
  const subTotalDebits = journal.entries?.reduce((sum, entry) => {
    const debit = parseFloat(entry.debits) || 0;
    const taxAmount = entry.tax && entry.debits > 0 ? parseFloat(entry.tax.amount) || 0 : 0;
    return sum + debit - taxAmount;
  }, 0) || 0;
  const subTotalCredits = journal.entries?.reduce((sum, entry) => {
    const credit = parseFloat(entry.credits) || 0;
    const taxAmount = entry.tax && entry.credits > 0 ? parseFloat(entry.tax.amount) || 0 : 0;
    return sum + credit - taxAmount;
  }, 0) || 0;

  // Tax breakdown
  const taxBreakdown: TaxBreakdown = {};
  journal.entries?.forEach(entry => {
    if (entry.tax) {
      const taxKey = `${entry.tax.name} ( ${entry.tax.rate}% )`;
      if (!taxBreakdown[taxKey]) {
        taxBreakdown[taxKey] = { debits: 0, credits: 0 };
      }
      if (entry.debits > 0) {
        taxBreakdown[taxKey].debits += parseFloat(entry.tax.amount) || 0;
      }
      if (entry.credits > 0) {
        taxBreakdown[taxKey].credits += parseFloat(entry.tax.amount) || 0;
      }
    }
  });

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      {/* Sidebar Journal List */}
      <div className="w-[320px] border-r border-gray-200 flex flex-col h-full bg-white select-none">
        {/* Sidebar Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative" ref={allJournalsDropdownRef}>
            <button
              onClick={() => setIsAllJournalsDropdownOpen(!isAllJournalsDropdownOpen)}
              className="flex items-center gap-2 text-[#111827] font-semibold text-sm hover:text-blue-600 transition-colors"
            >
              All Manual Journals
              <ChevronDown size={14} className="text-blue-500" />
            </button>
            {isAllJournalsDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-100 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                <div className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700" onClick={() => setIsAllJournalsDropdownOpen(false)}>All Manual Journals</div>
                <div className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-600 border-t border-gray-50" onClick={() => setIsAllJournalsDropdownOpen(false)}>Manage Custom Views</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <button className="h-8 px-2.5 bg-[#408dfb] text-white rounded-l hover:bg-opacity-90 flex items-center justify-center border-r border-blue-400/50">
                <Plus size={16} strokeWidth={3} />
              </button>
              <button className="h-8 px-1 bg-[#408dfb] text-white rounded-r hover:bg-opacity-90 flex items-center justify-center">
                <ChevronDown size={14} strokeWidth={3} />
              </button>
            </div>
            <button className="h-8 w-8 px-1 text-gray-400 hover:text-gray-600 transition-colors border border-gray-200 rounded flex items-center justify-center">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* Sidebar Filter */}
        <div className="px-6 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
            Period:
            <div className="relative" ref={periodDropdownRef}>
              <button
                onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                className="text-[#156372] flex items-center gap-0.5 hover:underline"
              >
                {selectedPeriod}
                <ChevronDown size={10} />
              </button>
              {isPeriodDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-100 rounded shadow-xl z-10 py-1">
                  {periodOptions.map(opt => (
                    <div
                      key={opt}
                      onClick={() => {
                        setSelectedPeriod(opt);
                        setIsPeriodDropdownOpen(false);
                      }}
                      className={`px-4 py-2 text-xs cursor-pointer ${selectedPeriod === opt ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-200">
          {filteredJournals.length > 0 ? (
            filteredJournals.map((j) => (
              <div
                key={j.id}
                onClick={() => navigate(`/accountant/manual-journals/${j.id}`)}
                className={`group px-6 py-4 border-b border-gray-100 cursor-pointer transition-all ${j.id === currentJournalId ? 'bg-[#EBF5FF]' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300" checked={j.id === currentJournalId} readOnly />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[13px] font-semibold text-gray-900 truncate">{formatDate(j.date)}</span>
                      <span className="text-[13px] font-bold text-gray-900">{formatCurrency(j.amount, j.currency)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 truncate">{j.journalNumber || j.id}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-tight ${j.status === 'PUBLISHED' ? 'text-green-500' : 'text-orange-400'}`}>
                        {j.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm italic">No journals found</div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-[#f4f7f9] overflow-hidden relative">
        {/* Header toolbar */}
        <div className="h-14 min-h-[56px] border-b border-gray-200 bg-white flex items-center justify-between px-8 shadow-sm z-20">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">{journal.journalNumber || journal.id}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAttachmentsModalOpen(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all relative"
            >
              <Paperclip size={18} />
              {(journal.attachments || attachments.length) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {journal.attachments || attachments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsCommentsModalOpen(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
            >
              <MessageSquare size={18} />
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button
              onClick={() => navigate("/accountant/manual-journals")}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Secondary Navigation toolbar */}
        <div className="px-8 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(`/accountant/manual-journals/${id}/edit`)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#156372] transition-colors"
            >
              <Edit size={14} className="text-[#156372]" /> Edit
            </button>
            <div className="relative" ref={pdfDropdownRef}>
              <button
                onClick={() => setIsPdfDropdownOpen(!isPdfDropdownOpen)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#156372] transition-colors"
              >
                <Printer size={14} className="text-[#156372]" /> PDF/Print <ChevronDown size={14} />
              </button>
              {isPdfDropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-40 bg-white border border-gray-100 rounded shadow-xl z-50 py-1">
                  <div onClick={handleDownloadPDF} className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700 block">PDF</div>
                  <div onClick={handlePrint} className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700 block border-t border-gray-50">Print</div>
                </div>
              )}
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <MoreHorizontal size={18} />
              </button>
              {isMoreMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-100 rounded shadow-xl z-50 py-1">
                  <div className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2" onClick={handleClone}>
                    <Copy size={14} /> Clone
                  </div>
                  <div className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2" onClick={handleCreateTemplate}>
                    <Settings size={14} /> Create Template
                  </div>
                  <div className="px-4 py-2 hover:bg-red-50 cursor-pointer text-sm font-medium text-red-600 border-t border-gray-100 flex items-center gap-2" onClick={handleDelete}>
                    <Trash2 size={14} /> Delete
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-gray-400">
            <button
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
              disabled={filteredJournals.findIndex(j => j.id === currentJournalId) <= 0}
              onClick={() => {
                const currentIndex = filteredJournals.findIndex(j => j.id === currentJournalId);
                const previousJournalId = filteredJournals[currentIndex - 1]?.id;
                if (currentIndex > 0 && previousJournalId) navigate(`/accountant/manual-journals/${previousJournalId}`);
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
              disabled={filteredJournals.findIndex(j => j.id === currentJournalId) === -1 || filteredJournals.findIndex(j => j.id === currentJournalId) >= filteredJournals.length - 1}
              onClick={() => {
                const currentIndex = filteredJournals.findIndex(j => j.id === currentJournalId);
                const nextJournalId = filteredJournals[currentIndex + 1]?.id;
                if (currentIndex < filteredJournals.length - 1 && nextJournalId) navigate(`/accountant/manual-journals/${nextJournalId}`);
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center">
          {/* Document Preview Card */}
          <div className="w-full max-w-[850px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 relative min-h-[900px] mb-12 flex flex-col">

            {/* Published Ribbon */}
            {journal.status === "PUBLISHED" && (
              <div className="absolute top-0 left-0 overflow-hidden w-32 h-32 pointer-events-none z-10">
                <div className="absolute top-[22px] left-[-35px] w-[140px] bg-[#2dce89] text-white text-[11px] font-bold py-1.5 transform -rotate-45 shadow-sm uppercase tracking-widest text-center">
                  Published
                </div>
              </div>
            )}

            <div className="p-20 flex-1">
              {/* Card Header Content */}
              <div className="flex flex-col items-end mb-16 text-right">
                <div className="max-w-[300px]">
                  <h1 className="text-[32px] font-medium text-gray-900 tracking-tighter leading-none mb-1">JOURNAL</h1>
                  <div className="text-xl font-medium text-gray-500 mb-12">#{journal.journalNumber || journal.id}</div>

                  <div className="grid grid-cols-[auto_1fr] gap-x-12 gap-y-4 text-sm leading-relaxed">
                    <span className="text-gray-400 text-right">Date:</span>
                    <span className="font-semibold text-gray-800">{formatDate(journal.date)}</span>

                    <span className="text-gray-400 text-right">Amount:</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(journal.amount, journal.currency)}</span>

                    <span className="text-gray-400 text-right">Reference Number:</span>
                    <span className="font-semibold text-gray-800">{journal.referenceNumber || journal.reference || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-14">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Notes</div>
                <div className="text-sm text-gray-700 font-medium leading-relaxed italic">{journal.notes || "No notes provided."}</div>
              </div>

              {/* Items Table */}
              <div className="mb-14">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-black text-white">
                      <th className="py-2 px-4 text-left text-[11px] font-bold uppercase tracking-wider">Account</th>
                      <th className="py-2 px-4 text-left text-[11px] font-bold uppercase tracking-wider">Contact</th>
                      <th className="py-2 px-4 text-right text-[11px] font-bold uppercase tracking-wider">Debits</th>
                      <th className="py-2 px-4 text-right text-[11px] font-bold uppercase tracking-wider">Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {getJournalEntries(journal).map((entry, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-6 px-4 align-top">
                          <div className="text-[13px] font-bold text-gray-800 mb-1.5 uppercase transition-colors hover:text-blue-600 cursor-default">
                            {entry.accountName || (entry.accountId ? accountsMap[entry.accountId] : undefined) || entry.account}
                          </div>
                          <div className="text-[12px] text-gray-400 leading-relaxed max-w-[220px]">{entry.description}</div>
                        </td>
                        <td className="py-6 px-4 align-top text-[13px] text-gray-600">{entry.contact || "—"}</td>
                        <td className="py-6 px-4 align-top text-right text-[13px] font-medium text-gray-800 italic">
                          {getEntryDebit(entry) > 0 ? formatAmount(getEntryDebit(entry)) : ""}
                        </td>
                        <td className="py-6 px-4 align-top text-right text-[13px] font-medium text-gray-800 italic">
                          {getEntryCredit(entry) > 0 ? formatAmount(getEntryCredit(entry)) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detailed Totals Section */}
              <div className="flex flex-col items-end">
                <div className="w-[360px]">
                  <div className="flex items-center justify-between pb-4 text-sm font-semibold text-gray-500 italic">
                    <span className="ml-auto mr-14">Sub Total</span>
                    <div className="grid grid-cols-2 gap-8 w-40 text-right">
                      <span>{formatAmount(subTotalDebits)}</span>
                      <span>{formatAmount(subTotalCredits)}</span>
                    </div>
                  </div>

                  {/* Tax Rows if any */}
                  {Object.entries(taxBreakdown).map(([taxName, amounts]) => (
                    <div key={taxName} className="flex items-center justify-between py-2 text-sm text-gray-500">
                      <span className="ml-auto mr-14">{taxName}</span>
                      <div className="grid grid-cols-2 gap-8 w-40 text-right italic">
                        <span>{formatAmount(amounts.debits)}</span>
                        <span>{formatAmount(amounts.credits)}</span>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between py-5 bg-[#f5f5f5] px-6 mt-4 rounded-sm border-t border-gray-200">
                    <span className="text-[13px] font-bold text-gray-800 ml-auto mr-12 uppercase">Total</span>
                    <div className="grid grid-cols-2 gap-8 w-40 text-right font-black text-[13px] text-gray-900">
                      <span>{journal.currency}{formatAmount(totalDebits)}</span>
                      <span>{journal.currency}{formatAmount(totalCredits)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* More Information Bottom Section */}
          <div className="w-full max-w-[850px] px-2 mb-20">
            <h3 className="text-base font-bold text-gray-700 mb-6 tracking-tight">More Information</h3>
            <div className="space-y-4 text-[13px]">
              <div className="flex items-center group">
                <span className="w-32 text-gray-500 font-medium">Journal Date</span>
                <span className="text-gray-900">: {formatDate(journal.date)}</span>
              </div>
              <div className="flex items-center group">
                <span className="w-32 text-gray-500 font-medium">Reporting Method</span>
                <span className="text-gray-900">: {journal.reportingMethod || "Accrual Only"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" ref={emailModalRef}>
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Send Journal Entry</h2>
              <button onClick={() => setIsEmailModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Recipient Email</label>
                <input type="email" value={emailData.to} onChange={(e) => setEmailData({ ...emailData, to: e.target.value })} placeholder="recipient@example.com" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#156372] focus:bg-white outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Subject</label>
                <input type="text" value={emailData.subject} onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })} className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#156372] focus:bg-white outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Message</label>
                <textarea value={emailData.message} onChange={(e) => setEmailData({ ...emailData, message: e.target.value })} rows={10} className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#156372] focus:bg-white outline-none transition-all resize-none" />
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500 font-medium p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                <FileText size={18} className="text-blue-500" />
                <span>Journal Entry PDF will be attached to this email.</span>
              </div>
            </div>
            <div className="px-8 py-6 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-4">
              <button className="px-6 py-2.5 text-gray-600 font-bold hover:text-gray-900 transition-colors" onClick={() => setIsEmailModalOpen(false)}>Cancel</button>
              <button className="px-8 py-2.5 bg-[#156372] text-white font-bold rounded-lg hover:bg-opacity-90 shadow-md flex items-center gap-2 disabled:grayscale cursor-pointer" onClick={handleEmailSend} disabled={!emailData.to}><Send size={18} /> Send Journal</button>
            </div>
          </div>
        </div>
      )}

      {/* Attachments Modal */}
      {isAttachmentsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all">
          <div ref={attachmentsModalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Attachments</h2>
              <button onClick={() => setIsAttachmentsModalOpen(false)} className="p-2 border-2 border-red-100 text-red-500 hover:bg-red-50 rounded-lg transition-all"><X size={20} /></button>
            </div>
            <div className="p-10 text-center">
              {attachments.length === 0 ? (
                <div className="py-12 flex flex-col items-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <Paperclip size={32} className="text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-400 italic mb-10">No Files Attached Yet</h3>
                  <button onClick={() => fileInputRef.current?.click()} className="px-10 py-4 border-2 border-dashed border-[#156372] rounded-xl text-[#156372] font-black hover:bg-teal-50/50 transition-all flex items-center gap-3">
                    <Upload size={20} /> UPLOAD FILES
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-left max-h-[400px] overflow-y-auto mb-8 pr-2">
                  {attachments.map((file) => (
                    <div key={file.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4 text-gray-600">
                        <FileText size={20} className="text-blue-400" />
                        <div>
                          <div className="text-sm font-bold text-gray-800">{file.name}</div>
                          <div className="text-[10px] font-medium text-gray-400 uppercase">{(file.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                      <button onClick={() => setAttachments((current) => current.filter((a) => a.id !== file.id))} className="text-gray-300 hover:text-red-500"><X size={16} /></button>
                    </div>
                  ))}
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 text-sm font-bold text-blue-600 hover:underline">Upload more...</button>
                </div>
              )}
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const files = Array.from(e.target.files || []);
                setAttachments((current) => [
                  ...current,
                  ...files.map((file, idx) => ({ id: Date.now() + idx, name: file.name, size: file.size, file }))
                ]);
              }} />
              <p className="text-xs text-gray-400">Maximum 5 files, 10MB each.</p>
            </div>
          </div>
        </div>
      )}

      {/* Comments & History Modal */}
      {isCommentsModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-end justify-end z-[100] transition-all" onClick={(e) => e.target === e.currentTarget && setIsCommentsModalOpen(false)}>
          <div ref={commentsModalRef} className="bg-white w-full max-w-[480px] h-full flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.1)] transition-transform duration-300 animate-slide-left">
            <div className="flex items-center justify-between px-10 py-8 border-b border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Activity Log</h2>
              <button onClick={() => setIsCommentsModalOpen(false)} className="p-2 bg-red-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
              {/* Comment Input Area */}
              <div className="bg-gray-50/80 p-6 rounded-2xl border border-gray-100 mb-12 shadow-inner">
                <div className="flex items-center gap-1 mb-4 opacity-40">
                  <Bold size={16} /><Italic size={16} /><Underline size={16} />
                </div>
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Share your thoughts or updates..."
                  className="w-full bg-transparent border-none outline-none text-sm text-gray-700 min-h-[120px] resize-none"
                />
                <button
                  onClick={() => {
                    if (newComment.trim()) {
                      const now = new Date();
                      setComments([{ id: Date.now(), user: "Admin", date: now.toLocaleString(), text: newComment, icon: 'msg' }, ...comments]);
                      setNewComment("");
                    }
                  }}
                  className="mt-4 px-8 py-2.5 bg-gray-900 text-white text-xs font-black rounded-lg hover:bg-black transition-all shadow-md active:scale-95 disabled:grayscale"
                  disabled={!newComment.trim()}
                >
                  ADD COMMENT
                </button>
              </div>

              {/* Feed List */}
              <div className="space-y-12">
                <div className="flex items-center gap-3 mb-4">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Recent Activity</h4>
                  <div className="bg-blue-600 h-1.5 w-1.5 rounded-full animate-pulse"></div>
                </div>
                {comments.map((comment, idx) => (
                  <div key={comment.id} className="flex gap-6 group">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-orange-200">
                        <FileText size={18} className="text-orange-600" />
                      </div>
                      {idx < comments.length - 1 && <div className="w-0.5 flex-1 bg-gradient-to-b from-orange-100 to-transparent mt-3"></div>}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-black text-gray-800">{comment.user}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{comment.date}</span>
                      </div>
                      <div className="text-[13px] text-gray-600 leading-relaxed font-medium">{comment.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
