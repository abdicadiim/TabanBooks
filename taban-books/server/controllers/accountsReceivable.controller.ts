import { Request, Response } from 'express';
import JournalEntry from '../models/JournalEntry.js';
import Invoice from '../models/Invoice.js';
import PaymentReceived from '../models/PaymentReceived.js';
import CreditNote from '../models/CreditNote.js';
// import Customer from '../models/Customer.js';

// Get Accounts Receivable balance from control account ledger
export const getAccountsReceivableBalance = async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Organization ID is required' });
      return;
    }

    // Find all journal entries that affect Accounts Receivable
    const arJournalEntries = await JournalEntry.find({
      organization: organizationId,
      'lines.accountName': 'Accounts Receivable',
      status: 'posted'
    }).sort({ date: -1 });

    let totalDebits = 0;
    let totalCredits = 0;
    const recentTransactionsRaw = [];
    const sourceIds: any = {
      invoice: new Set(),
      payment_received: new Set(),
      credit_note: new Set(),
      sales_receipt: new Set(),
      refund: new Set()
    };

    for (const entry of arJournalEntries) {
      const arLine = entry.lines.find(
        (line: any) => line.accountName === 'Accounts Receivable'
      );

      if (arLine) {
        totalDebits += arLine.debit || 0;
        totalCredits += arLine.credit || 0;

        recentTransactionsRaw.push({
          entry,
          arLine
        });

        if (entry.sourceId && entry.sourceType && sourceIds[entry.sourceType]) {
          sourceIds[entry.sourceType].add(entry.sourceId.toString());
        }
      }
    }

    // Fetch all source documents to get customer details
    const sources: any = {};

    if (sourceIds.invoice.size > 0) {
      const invoices = await Invoice.find({ _id: { $in: Array.from(sourceIds.invoice) } }).populate('customer');
      invoices.forEach(inv => sources[inv._id.toString()] = inv);
    }
    if (sourceIds.payment_received.size > 0) {
      const payments = await PaymentReceived.find({ _id: { $in: Array.from(sourceIds.payment_received) } }).populate('customer');
      payments.forEach(p => sources[p._id.toString()] = p);
    }
    if (sourceIds.credit_note.size > 0) {
      const cns = await CreditNote.find({ _id: { $in: Array.from(sourceIds.credit_note) } }).populate('customer');
      cns.forEach(cn => sources[cn._id.toString()] = cn);
    }

    const recentTransactions = [];
    const customerBalancesMap = new Map();

    for (const item of recentTransactionsRaw) {
      const { entry, arLine } = item;
      const source = entry.sourceId ? sources[entry.sourceId.toString()] : null;
      let customerName = 'Unknown Customer';

      if (source && source.customer) {
        customerName = source.customer.displayName || source.customer.companyName || `${source.customer.firstName || ''} ${source.customer.lastName || ''}`.trim() || 'Unnamed Customer';
      } else if (entry.description) {
        const customerMatch = entry.description.match(/(?:to|from|for|of)\s+([A-Za-z0-9\s&.-]+)/i);
        if (customerMatch) customerName = customerMatch[1].trim();
      }

      if (customerName === 'Unknown Customer' && entry.reference && !entry.reference.startsWith('INV-')) {
        customerName = entry.reference;
      }

      // Add to customer balances
      if (!customerBalancesMap.has(customerName)) {
        customerBalancesMap.set(customerName, { debit: 0, credit: 0 });
      }
      const cb = customerBalancesMap.get(customerName);
      cb.debit += arLine.debit || 0;
      cb.credit += arLine.credit || 0;

      recentTransactions.push({
        id: entry._id,
        date: entry.date,
        customerName: customerName,
        type: determineTransactionType(entry),
        debit: arLine.debit || 0,
        credit: arLine.credit || 0,
        referenceNumber: entry.reference,
        description: entry.description
      });
    }

    // Calculate total unpaid invoices and overdue invoices for the summary
    const totalUnpaidInvoices = await Invoice.countDocuments({
      organization: organizationId,
      status: { $in: ['sent', 'viewed', 'partially paid', 'overdue'] }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueInvoices = await Invoice.countDocuments({
      organization: organizationId,
      status: { $in: ['sent', 'viewed', 'partially paid', 'overdue'] },
      dueDate: { $lt: today }
    });

    const closingBalance = totalDebits - totalCredits;

    // Calculate unpaid customer balances
    const unpaidCustomerBalances: any[] = [];
    customerBalancesMap.forEach((balance, customerName) => {
      const customerBalance = balance.debit - balance.credit;
      if (Math.abs(customerBalance) > 0.01) {
        unpaidCustomerBalances.push({
          customerName,
          balance: customerBalance
        });
      }
    });

    res.json({
      success: true,
      data: {
        balance: closingBalance,
        totalDebits,
        totalCredits,
        totalInvoices: totalUnpaidInvoices,
        overdueInvoices,
        recentTransactions: recentTransactions.slice(0, 10),
        unpaidCustomerBalances: unpaidCustomerBalances.sort((a, b) => b.balance - a.balance),
        customerCount: unpaidCustomerBalances.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching Accounts Receivable balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Accounts Receivable balance',
      error: error.message
    });
  }
};

// Get full Accounts Receivable ledger
export const getAccountsReceivableLedger = async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Organization ID is required' });
      return;
    }

    // Find all journal entries that affect Accounts Receivable
    const journalEntries = await JournalEntry.find({
      organization: organizationId,
      'lines.accountName': 'Accounts Receivable',
      status: 'posted'
    }).sort({ date: -1 });

    const sourceIds: any = {
      invoice: new Set(),
      payment_received: new Set(),
      credit_note: new Set()
    };

    journalEntries.forEach(entry => {
      if (entry.sourceId && entry.sourceType && sourceIds[entry.sourceType]) {
        sourceIds[entry.sourceType].add(entry.sourceId.toString());
      }
    });

    const sources: any = {};
    if (sourceIds.invoice.size > 0) {
      const invoices = await Invoice.find({ _id: { $in: Array.from(sourceIds.invoice) } }).populate('customer');
      invoices.forEach(inv => sources[inv._id.toString()] = inv);
    }
    if (sourceIds.payment_received.size > 0) {
      const payments = await PaymentReceived.find({ _id: { $in: Array.from(sourceIds.payment_received) } }).populate('customer');
      payments.forEach(p => sources[p._id.toString()] = p);
    }
    if (sourceIds.credit_note.size > 0) {
      const cns = await CreditNote.find({ _id: { $in: Array.from(sourceIds.credit_note) } }).populate('customer');
      cns.forEach(cn => sources[cn._id.toString()] = cn);
    }

    const ledgerTransactions = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of journalEntries) {
      const arLine = entry.lines.find(
        (line: any) => line.accountName === 'Accounts Receivable'
      );

      if (arLine) {
        const source = entry.sourceId ? sources[entry.sourceId.toString()] : null;
        let customerName = 'Unknown Customer';

        if (source && source.customer) {
          customerName = source.customer.displayName || source.customer.companyName || `${source.customer.firstName || ''} ${source.customer.lastName || ''}`.trim() || 'Unnamed Customer';
        } else if (entry.description) {
          const customerMatch = entry.description.match(/(?:to|from|for|of)\s+([A-Za-z0-9\s&.-]+)/i);
          if (customerMatch) customerName = customerMatch[1].trim();
        }

        const transaction = {
          id: entry._id,
          date: entry.date,
          customerName: customerName,
          transactionType: determineTransactionType(entry),
          debit: arLine.debit || 0,
          credit: arLine.credit || 0,
          referenceNumber: entry.reference,
          description: entry.description,
          sourceId: entry.sourceId,
          sourceType: entry.sourceType
        };

        ledgerTransactions.push(transaction);
        totalDebits += arLine.debit || 0;
        totalCredits += arLine.credit || 0;
      }
    }

    res.json({
      success: true,
      data: {
        transactions: ledgerTransactions,
        totalDebits,
        totalCredits,
        closingBalance: totalDebits - totalCredits
      }
    });
  } catch (error: any) {
    console.error('Error fetching Accounts Receivable ledger:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Accounts Receivable ledger',
      error: error.message
    });
  }
};

// Helper functions
function determineTransactionType(journalEntry: any): string {
  if (journalEntry.sourceType) {
    switch (journalEntry.sourceType) {
      case 'invoice': return 'Invoice';
      case 'payment_received': return 'Payment';
      case 'credit_note': return 'Credit Note';
      case 'refund': return 'Refund';
      case 'sales_receipt': return 'Sales Receipt';
      case 'manual_journal': return 'Manual Journal';
      default: return journalEntry.sourceType.charAt(0).toUpperCase() + journalEntry.sourceType.slice(1);
    }
  }

  const arLine = journalEntry.lines?.find(
    (line: any) => line.accountName === 'Accounts Receivable'
  );

  if (arLine) {
    if (arLine.debit > 0) return 'Invoice';
    if (arLine.credit > 0) {
      return journalEntry.description?.toLowerCase().includes('credit') ? 'Credit Note' : 'Payment';
    }
  }

  return 'Journal Entry';
}
