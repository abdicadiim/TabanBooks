/**
 * Payment Made Controller
 * Handles Vendor Payments
 */

import { Request, Response } from "express";
import PaymentMade, { IPaymentMade } from "../models/PaymentMade.js";
import Bill from "../models/Bill.js";
import JournalEntry from "../models/JournalEntry.js";
import ChartOfAccount from "../models/ChartOfAccount.js";
import mongoose from "mongoose";
import { updateAccountBalances } from "../utils/accounting.js";
import { syncLinkedBankTransaction } from "../utils/bankTransactionSync.js";
import { toPaymentMethodCode, toPaymentModeLabel } from "../utils/paymentModes.js";

interface AuthRequest extends Request {
    user?: {
        userId: string;
        organizationId: string;
        role: string;
        email?: string;
    };
}

const roundMoney = (value: number) => {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return 0;
    return Math.round(numeric * 100) / 100;
};

const normalizeDateOnly = (value?: Date | string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
};

const deriveOutstandingBillStatus = (bill: any, balance: number, settledAmount: number) => {
    const currentStatus = String(bill.status || "").toLowerCase();
    if (currentStatus === "draft" || currentStatus === "void" || currentStatus === "cancelled") {
        return currentStatus;
    }

    if (balance <= 0) {
        return "paid";
    }

    return "open";
};

// Get all payments made
export const getAllPaymentsMade = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const {
            page = '1',
            limit = '50',
            vendorId,
            billId,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query as any;

        const query: any = { organization: req.user.organizationId };

        if (vendorId) query.vendor = vendorId;
        if (billId) {
            query.allocations = { $elemMatch: { bill: billId } };
        }

        const limitNum = parseInt(limit as string) || 50;
        const pageNum = parseInt(page as string) || 1;
        const skip = (pageNum - 1) * limitNum;

        const sort: any = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const [paymentsRaw, total] = await Promise.all([
            PaymentMade.find(query)
                .populate('vendor')
                .populate({
                    path: 'allocations.bill',
                    select: 'billNumber'
                })
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            PaymentMade.countDocuments(query)
        ]);

        // Transform payments to include formatted fields
        const payments = (paymentsRaw as any[]).map(p => {
            return {
                id: p._id,
                vendor: p.vendor,
                vendorName: p.vendor?.companyName || p.vendor?.displayName || 'Unknown Vendor',
                mode: toPaymentModeLabel(p.paymentMethod),
                reference: p.paymentReference,
                amount: p.amount,
                date: p.date,
                status: 'PAID', // Payments Made are always PAID in this system
                billNumber: p.allocations
                    ? p.allocations
                        .map((a: any) => a.bill?.billNumber)
                        .filter((bn: any) => bn)
                        .join(', ')
                    : '',
                unusedAmount: p.amount - (p.allocations?.reduce((sum: number, a: any) => sum + (a.amount || 0), 0) || 0)
            };
        });

        res.json({
            success: true,
            data: payments,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error: any) {
        console.error('Error in getAllPaymentsMade:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payments made',
            error: error.message
        });
    }
};

// Get payment made by ID
export const getPaymentMadeById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const payment = await PaymentMade.findOne({
            _id: id,
            organization: req.user.organizationId
        }).populate('vendor').populate('allocations.bill').lean();

        if (!payment) {
            res.status(404).json({ success: false, message: 'Payment not found' });
            return;
        }

        const mappedPayment = {
            ...payment,
            id: (payment as any)._id,
            vendorName: (payment as any).vendor?.companyName || (payment as any).vendor?.displayName || 'Unknown Vendor',
            reference: (payment as any).paymentReference,
            mode: toPaymentModeLabel((payment as any).paymentMethod)
        };

        res.json({ success: true, data: mappedPayment });
    } catch (error: any) {
        console.error('Error in getPaymentMadeById:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment',
            error: error.message
        });
    }
};

// Helper: Update bill status and balance after payment
async function updateBillAfterPayment(billId: string, orgId: string) {
    const bill = await Bill.findOne({ _id: billId, organization: orgId });
    if (!bill) return;

    // Find all payments allocated to this bill
    const payments = await PaymentMade.find({
        organization: orgId,
        'allocations.bill': billId
    });

    const totalPaid = roundMoney(payments.reduce((sum, p) => {
        const allocation = p.allocations.find(a => a.bill.toString() === billId.toString());
        return sum + (allocation ? allocation.amount : 0);
    }, 0));

    // Only trust the persisted vendor credit field here. Inferring credits from
    // a previous paidAmount can make deleted payments look like credits and keep
    // bills incorrectly marked as paid.
    const vendorCreditsApplied = roundMoney(Math.max(0, Number((bill as any).vendorCreditsApplied ?? 0)));
    const total = roundMoney(Number(bill.total || 0));
    const settledAmount = roundMoney(totalPaid + vendorCreditsApplied);
    const balance = roundMoney(Math.max(0, total - settledAmount));

    bill.paidAmount = totalPaid;
    (bill as any).vendorCreditsApplied = vendorCreditsApplied;
    bill.balance = balance;
    bill.status = deriveOutstandingBillStatus(bill, balance, settledAmount) as any;

    await bill.save();
}

// Helper: Find account by name
const findAccountByName = async (orgId: string, accountName: string): Promise<string | null> => {
    try {
        const account = await ChartOfAccount.findOne({
            organization: orgId,
            $or: [
                { accountName: accountName },
                { name: accountName },
                { accountName: new RegExp(`^${accountName}$`, 'i') }
            ]
        });
        return account ? account._id.toString() : null;
    } catch (error) {
        return null;
    }
};

// Helper: Create journal entry for payment made
const createPaymentMadeJournalEntry = async (
    payment: IPaymentMade,
    orgId: string,
    userId?: string
): Promise<mongoose.Types.ObjectId | null> => {
    try {
        // 1. Find Credit Account (Bank/Cash/Selected account)
        let creditAccountId = payment.paidThrough || payment.bankAccount;
        let creditAccountName = 'Bank/Cash';

        if (creditAccountId) {
            const coaAcc = await ChartOfAccount.findById(creditAccountId);
            if (coaAcc) {
                creditAccountName = coaAcc.accountName || coaAcc.name;
            }
        } else {
            // Fallback to Petty Cash
            const pettyCash = await ChartOfAccount.findOne({
                organization: orgId,
                $or: [{ accountName: 'Petty Cash' }, { name: 'Petty Cash' }]
            });
            if (pettyCash) {
                creditAccountId = pettyCash._id;
                creditAccountName = 'Petty Cash';
            }
        }

        // 2. Find Debit Account (Accounts Payable)
        let apAccountId = await findAccountByName(orgId, 'Accounts Payable');
        let apAccountName = 'Accounts Payable';

        if (payment.allocations && payment.allocations.length > 0) {
            const firstBill = await Bill.findById(payment.allocations[0].bill);
            if (firstBill && firstBill.accountsPayable) {
                const customAp = await findAccountByName(orgId, firstBill.accountsPayable);
                if (customAp) {
                    apAccountId = customAp;
                    apAccountName = firstBill.accountsPayable;
                }
            }
        }

        const journalNumber = `JE-PM-${payment.paymentNumber}-${Date.now()}`;
        const journalEntry = await JournalEntry.create({
            organization: orgId,
            entryNumber: journalNumber,
            date: payment.date || new Date(),
            description: `Payment Made ${payment.paymentNumber} - ${payment.notes || ''}`,
            reference: payment.paymentReference || payment.paymentNumber,
            status: 'posted',
            postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
            postedAt: new Date(),
            sourceId: payment._id,
            sourceType: 'payment_made',
            lines: [
                {
                    account: apAccountId || 'Accounts Payable',
                    accountName: apAccountName,
                    description: `Payment Made ${payment.paymentNumber}`,
                    debit: payment.amount || 0,
                    credit: 0,
                },
                {
                    account: creditAccountId || 'Bank/Cash',
                    accountName: creditAccountName,
                    description: `Payment Made ${payment.paymentNumber}`,
                    debit: 0,
                    credit: payment.amount || 0,
                },
            ],
        });

        // Update Chart of Account balances
        await updateAccountBalances(journalEntry.lines, orgId);

        return journalEntry._id;
    } catch (error: any) {
        console.error('[PAYMENTS MADE] Error creating journal entry:', error);
        return null;
    }
};

// Helper: Get next payment number
const getNextPaymentNumber = async (orgId: string): Promise<string> => {
    try {
        const lastPayment = await PaymentMade.findOne({ organization: orgId })
            .sort({ createdAt: -1 });

        let nextNumber = 1;
        if (lastPayment && lastPayment.paymentNumber) {
            const lastNum = parseInt(lastPayment.paymentNumber.replace(/\D/g, '')); // Extract number
            if (!isNaN(lastNum)) {
                nextNumber = lastNum + 1;
            }
        }
        return nextNumber.toString();
    } catch (e) {
        return "1";
    }
};

// Create payment made
export const createPaymentMade = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const paymentDate = req.body.date ? new Date(req.body.date) : new Date();
        if (isNaN(paymentDate.getTime())) {
            res.status(400).json({ success: false, message: 'Invalid payment date' });
            return;
        }

        // Logic to ensure unique payment number
        let paymentNumber = req.body.paymentNumber;
        const existingPayment = await PaymentMade.findOne({
            organization: req.user.organizationId,
            paymentNumber: paymentNumber
        });

        if (existingPayment || !paymentNumber) {
            paymentNumber = await getNextPaymentNumber(req.user.organizationId);
        }

        const paymentData: any = {
            ...req.body,
            organization: req.user.organizationId,
            paymentNumber: paymentNumber,
            date: paymentDate,
            vendor: req.body.vendorId || req.body.vendor,
            paymentMethod: toPaymentMethodCode(req.body.mode || req.body.paymentMethod, 'cash'),
            paymentReference: req.body.reference || req.body.paymentReference,
        };

        // Fix: Ensure empty strings don't crash ObjectId casting
        if (paymentData.vendor === "") delete paymentData.vendor;
        if (paymentData.paidThrough === "") delete paymentData.paidThrough;
        if (paymentData.bankAccount === "") delete paymentData.bankAccount;
        if (paymentData.journalEntryId === "") delete paymentData.journalEntryId;

        // Map frontend 'paidThrough' or 'bankAccount' to model fields
        if (req.body.paidThrough) {
            const val = req.body.paidAccount || req.body.paidThrough;
            if (val && val !== "") {
                paymentData.paidThrough = val;
            }
        }

        // Map allocations billId to bill
        let totalAllocated = 0;
        if (req.body.allocations && Array.isArray(req.body.allocations)) {
            paymentData.allocations = req.body.allocations.map((a: any) => {
                const amount = parseFloat(a.amount) || 0;
                totalAllocated += amount;
                return {
                    bill: a.billId || a.bill,
                    amount: amount
                };
            }).filter((a: any) => a.amount > 0); // Only include positive allocations
        }

        // Validate allocations vs total amount
        const paymentAmount = parseFloat(req.body.amount) || 0;

        // Strict check: Allocated cannot exceed Payment Amount
        if (totalAllocated > paymentAmount + 0.01) {
            res.status(400).json({
                success: false,
                message: `Total allocated amount (${totalAllocated.toFixed(2)}) cannot exceed payment amount (${paymentAmount.toFixed(2)})`
            });
            return;
        }

        // Validate each allocation does not exceed the bill's current outstanding amount.
        const allocationVendorIds = new Set<string>();
        if (paymentData.allocations && Array.isArray(paymentData.allocations)) {
            for (const alloc of paymentData.allocations) {
                const bill = await Bill.findOne({ _id: alloc.bill, organization: req.user.organizationId }).lean();
                if (!bill) {
                    res.status(400).json({ success: false, message: `Bill not found: ${alloc.bill}` });
                    return;
                }
                const billVendorId = (bill as any).vendor ? String((bill as any).vendor) : '';
                if (billVendorId) {
                    allocationVendorIds.add(billVendorId);
                }
                const billBalance = Math.max(
                    0,
                    Number((bill as any).balance ?? (Number((bill as any).total || 0) - Number((bill as any).paidAmount || 0) - Number((bill as any).vendorCreditsApplied || 0)))
                );
                if (Number(alloc.amount || 0) > billBalance + 0.0001) {
                    res.status(400).json({
                        success: false,
                        message: `Allocation exceeds bill balance for bill ${(bill as any).billNumber || alloc.bill}. Balance: ${billBalance.toFixed(2)}, Attempted: ${Number(alloc.amount || 0).toFixed(2)}`
                    });
                    return;
                }
            }
        }

        const providedVendorId = paymentData.vendor ? String(paymentData.vendor) : '';
        if (!providedVendorId && allocationVendorIds.size === 1) {
            paymentData.vendor = Array.from(allocationVendorIds)[0];
        } else if (providedVendorId && allocationVendorIds.size > 0 && !allocationVendorIds.has(providedVendorId)) {
            res.status(400).json({
                success: false,
                message: 'Selected vendor does not match the vendor on the allocated bill(s).'
            });
            return;
        }

        if (!paymentData.vendor) {
            res.status(400).json({
                success: false,
                message: 'A vendor is required to create a payment.'
            });
            return;
        }

        console.log('[PAYMENT_CREATE] Data prepared:', JSON.stringify(paymentData, null, 2));

        const payment = await PaymentMade.create(paymentData);
        const createdPayment = payment;

        // Create journal entry for payment
        try {
            const journalId = await createPaymentMadeJournalEntry(
                createdPayment,
                req.user.organizationId,
                req.user.userId
            );

            if (journalId) {
                createdPayment.journalEntryId = journalId;
                await createdPayment.save();
            }
        } catch (jeError) {
            console.error('[PAYMENT_CREATE] Journal Entry creation failed (non-fatal):', jeError);
        }

        // Update allocated bills using reliable helper
        if (paymentData.allocations && Array.isArray(paymentData.allocations)) {
            for (const alloc of paymentData.allocations) {
                const billId = alloc.bill;
                if (billId) {
                    try {
                        await updateBillAfterPayment(billId.toString(), req.user.organizationId);
                    } catch (billError) {
                        console.error(`[PAYMENT_CREATE] Error updating bill ${billId}:`, billError);
                    }
                }
            }
        }

        await syncLinkedBankTransaction({
            organizationId: req.user.organizationId,
            transactionKey: `payment_made:${createdPayment._id}`,
            source: "payment_made",
            accountCandidates: [
                createdPayment.bankAccount,
                createdPayment.paidThrough,
                req.body.paidAccount,
                req.body.paidThrough
            ],
            amount: createdPayment.amount,
            date: createdPayment.date,
            referenceNumber: createdPayment.paymentReference || createdPayment.paymentNumber,
            description: createdPayment.notes,
            paymentMode: toPaymentModeLabel(req.body.mode || createdPayment.paymentMethod),
            transactionType: "withdrawal",
            debitOrCredit: "debit",
            vendorId: createdPayment.vendor,
            vendorName: req.body.vendorName,
            fallbackDescription: `Payment made ${createdPayment.paymentNumber}`,
        });

        // Automatically send payment email to vendor
        try {
            // Populate vendor to get email
            await createdPayment.populate('vendor');
            const vendor = createdPayment.vendor as any;
            const vendorEmail = vendor?.email || vendor?.primaryContact?.email;

            if (vendorEmail) {
                console.log('[PAYMENT_CREATE] Sending automatic email to vendor:', vendorEmail);

                // Get organization info for email
                const Organization = (await import('../models/Organization.js')).default;
                const org = await Organization.findById(req.user.organizationId);

                if (org) {
                    const vendorName = vendor?.companyName || vendor?.displayName || 'Vendor';
                    const orgName = (org as any)?.companyName || (org as any)?.name || 'Company';

                    // Format payment date
                    const paymentDate = createdPayment.date ? new Date(createdPayment.date) : new Date();
                    const formattedDate = paymentDate.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    });

                    // Format amount
                    const amount = parseFloat(createdPayment.amount?.toString() || '0').toFixed(2);
                    const currency = createdPayment.currency || 'AED';

                    // Get bill number from allocations
                    const billNumber = createdPayment.allocations && createdPayment.allocations.length > 0
                        ? (createdPayment.allocations[0] as any).bill?.billNumber || '---'
                        : '---';

                    // Build email HTML
                    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Made</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background-color: #3b82f6; color: #ffffff; padding: 40px; text-align: center; font-size: 24px; font-weight: 500;">
            Payment Made
        </div>
        <div style="padding: 40px;">
            <div style="text-align: center; margin-bottom: 32px; color: #4b5563; font-size: 16px;">
                Hi ${vendorName},
            </div>
            <div style="text-align: center; margin-bottom: 32px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We have made the payment for your invoice(s). It's been a pleasure doing business
            </div>
            <div style="background-color: #fffdf0; border: 1px solid #fef3c7; padding: 40px; text-align: center; margin-bottom: 40px;">
                <div style="font-size: 18px; color: #111827; margin-bottom: 16px;">
                    Payment Made
                </div>
                <div style="font-size: 32px; font-weight: 700; color: #10b981;">
                    ${currency} ${amount}
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; color: #6b7280; font-size: 14px; margin-bottom: 16px;">
                <div>
                    Invoice Number <span style="font-weight: 600; color: #111827;">${billNumber}</span>
                </div>
                <div>
                    Payment Date <span style="font-weight: 600; color: #111827;">${formattedDate}</span>
                </div>
            </div>
            <div style="margin-top: 64px; color: #6b7280; font-size: 14px;">
                Regards,<br>
                <span style="color: #4b5563; font-weight: 500;">${orgName}</span><br>
                <div style="margin-top: 8px; font-size: 12px;">${org?.email || ''}</div>
            </div>
        </div>
        <div style="padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
            <p style="font-size: 12px; color: #999; margin: 0;">This email was sent via Taban Books.</p>
        </div>
    </div>
</body>
</html>
                    `;

                    const text = `Payment Made\n\nHi ${vendorName},\n\nWe have made the payment for your invoice(s). It's been a pleasure doing business.\n\nPayment Made: ${currency} ${amount}\nInvoice Number: ${billNumber}\nPayment Date: ${formattedDate}\n\nRegards,\n${orgName}\n${org?.email || ''}\n\n---\nThis email was sent via Taban Books.`;

                    // Import and send email
                    const { sendEmail } = await import('../services/email.service.js');
                    const emailResult = await sendEmail({
                        to: vendorEmail,
                        subject: 'Payment has been made for your invoice(s)',
                        html,
                        text,
                        from: process.env.SMTP_FROM || process.env.SMTP_USER
                    });

                    if (emailResult.success) {
                        console.log('[PAYMENT_CREATE] Email sent successfully to vendor');
                    } else {
                        console.error('[PAYMENT_CREATE] Email failed (non-fatal):', emailResult.error);
                    }
                }
            } else {
                console.log('[PAYMENT_CREATE] No vendor email found, skipping automatic email');
            }
        } catch (emailError: any) {
            // Log but don't fail the payment creation
            console.error('[PAYMENT_CREATE] Automatic email failed (non-fatal):', emailError.message);
        }

        res.status(201).json({ success: true, data: createdPayment });
    } catch (error: any) {
        console.error('Error in createPaymentMade:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating payment: ' + (error.message || 'Unknown error'),
            error: error.message
        });
    }
};


// Update payment made
export const updatePaymentMade = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const oldPayment = await PaymentMade.findOne(
            { _id: id, organization: req.user.organizationId }
        );

        if (!oldPayment) {
            res.status(404).json({ success: false, message: 'Payment not found' });
            return;
        }

        const oldBillIds = (oldPayment.allocations || []).map((a: any) => a.bill?.toString()).filter(Boolean);

        // Normalize allocations if provided from frontend format.
        const updateData: any = { ...req.body };

        if (updateData.mode || updateData.paymentMethod) {
            updateData.paymentMethod = toPaymentMethodCode(
                updateData.mode || updateData.paymentMethod,
                "cash"
            );
            delete updateData.mode;
        }

        if (updateData.reference !== undefined) {
            updateData.paymentReference = updateData.reference;
            delete updateData.reference;
        }

        if (updateData.vendorId) {
            updateData.vendor = updateData.vendorId;
            delete updateData.vendorId;
        }

        if (updateData.date) {
            updateData.date = new Date(updateData.date);
        }

        if (updateData.amount !== undefined) {
            updateData.amount = parseFloat(updateData.amount) || 0;
        }

        const paidThroughValue = updateData.paidAccount ?? updateData.paidThrough;
        if (paidThroughValue !== undefined) {
            if (paidThroughValue === "") {
                delete updateData.paidThrough;
            } else {
                updateData.paidThrough = paidThroughValue;
            }
            delete updateData.paidAccount;
        }

        if (Array.isArray(updateData.allocations)) {
            let totalAllocated = 0;
            updateData.allocations = updateData.allocations
                .map((a: any) => {
                    const amount = parseFloat(a.amount) || 0;
                    totalAllocated += amount;
                    return { bill: a.billId || a.bill, amount };
                })
                .filter((a: any) => a.bill && a.amount > 0);

            const paymentAmount = parseFloat(updateData.amount ?? oldPayment.amount ?? 0);
            if (totalAllocated > paymentAmount + 0.01) {
                res.status(400).json({
                    success: false,
                    message: `Total allocated amount (${totalAllocated.toFixed(2)}) cannot exceed payment amount (${paymentAmount.toFixed(2)})`
                });
                return;
            }

            // Validate each allocation against current bill due plus this payment's previous allocation on that bill.
            for (const alloc of updateData.allocations) {
                const bill = await Bill.findOne({ _id: alloc.bill, organization: req.user.organizationId }).lean();
                if (!bill) {
                    res.status(400).json({ success: false, message: `Bill not found: ${alloc.bill}` });
                    return;
                }
                const oldAllocForBill = (oldPayment.allocations || []).reduce((sum: number, a: any) => {
                    return sum + (a.bill?.toString() === String(alloc.bill) ? Number(a.amount || 0) : 0);
                }, 0);
                const billBalance = Math.max(
                    0,
                    Number((bill as any).balance ?? (Number((bill as any).total || 0) - Number((bill as any).paidAmount || 0) - Number((bill as any).vendorCreditsApplied || 0)))
                );
                const maxAllowed = billBalance + oldAllocForBill;
                if (Number(alloc.amount || 0) > maxAllowed + 0.0001) {
                    res.status(400).json({
                        success: false,
                        message: `Allocation exceeds bill balance for bill ${(bill as any).billNumber || alloc.bill}. Balance: ${maxAllowed.toFixed(2)}, Attempted: ${Number(alloc.amount || 0).toFixed(2)}`
                    });
                    return;
                }
            }
        }

        const payment = await PaymentMade.findOneAndUpdate(
            { _id: id, organization: req.user.organizationId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!payment) {
            res.status(404).json({ success: false, message: 'Payment not found' });
            return;
        }

        // Reverse and recreate payment journal entries so GL matches updated payment.
        const existingJournals = await JournalEntry.find({
            organization: req.user.organizationId,
            sourceId: payment._id,
            sourceType: 'payment_made'
        });
        for (const entry of existingJournals) {
            try {
                await updateAccountBalances(entry.lines, req.user.organizationId, true);
            } catch (err) {
                console.error('[PAYMENT_UPDATE] Failed to reverse journal balances:', err);
            }
        }
        await JournalEntry.deleteMany({
            organization: req.user.organizationId,
            sourceId: payment._id,
            sourceType: 'payment_made'
        });

        const newJournalId = await createPaymentMadeJournalEntry(
            payment,
            req.user.organizationId,
            req.user.userId
        );
        if (newJournalId) {
            payment.journalEntryId = newJournalId;
            await payment.save();
        }

        // Recalculate bill balances for both old and new allocations.
        const newBillIds = (payment.allocations || []).map((a: any) => a.bill?.toString()).filter(Boolean);
        const affectedBillIds = Array.from(new Set([...oldBillIds, ...newBillIds]));
        for (const billId of affectedBillIds) {
            try {
                await updateBillAfterPayment(billId, req.user.organizationId);
            } catch (billError) {
                console.error(`[PAYMENT_UPDATE] Error updating bill ${billId}:`, billError);
            }
        }

        await syncLinkedBankTransaction({
            organizationId: req.user.organizationId,
            transactionKey: `payment_made:${payment._id}`,
            source: "payment_made",
            accountCandidates: [
                payment.bankAccount,
                payment.paidThrough,
                req.body.paidAccount,
                req.body.paidThrough
            ],
            amount: payment.amount,
            date: payment.date,
            referenceNumber: payment.paymentReference || payment.paymentNumber,
            description: payment.notes,
            paymentMode: toPaymentModeLabel(req.body.mode || payment.paymentMethod),
            transactionType: "withdrawal",
            debitOrCredit: "debit",
            vendorId: payment.vendor,
            vendorName: req.body.vendorName,
            fallbackDescription: `Payment made ${payment.paymentNumber}`,
        });

        res.json({ success: true, data: payment });
    } catch (error: any) {
        console.error('Error in updatePaymentMade:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating payment',
            error: error.message
        });
    }
};

// Delete payment made
export const deletePaymentMade = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const payment = await PaymentMade.findOne({
            _id: id,
            organization: req.user.organizationId
        });

        if (!payment) {
            res.status(404).json({ success: false, message: 'Payment not found' });
            return;
        }

        const allocations = [...payment.allocations];

        // Reverse GL entries before deletion.
        const journals = await JournalEntry.find({
            organization: req.user.organizationId,
            sourceId: payment._id,
            sourceType: 'payment_made'
        });
        for (const entry of journals) {
            try {
                await updateAccountBalances(entry.lines, req.user.organizationId, true);
            } catch (err) {
                console.error('[PAYMENT_DELETE] Failed to reverse journal balances:', err);
            }
        }
        await JournalEntry.deleteMany({
            organization: req.user.organizationId,
            sourceId: payment._id,
            sourceType: 'payment_made'
        });

        await syncLinkedBankTransaction({
            organizationId: req.user.organizationId,
            transactionKey: `payment_made:${payment._id}`,
            source: "payment_made",
            transactionType: "withdrawal",
            debitOrCredit: "debit",
            amount: 0,
            shouldSync: false,
        });

        await PaymentMade.deleteOne({ _id: id });

        // Revert bill balances
        for (const alloc of allocations) {
            await updateBillAfterPayment(alloc.bill.toString(), req.user.organizationId);
        }

        res.json({ success: true, message: 'Payment deleted' });
    } catch (error: any) {
        console.error('Error in deletePaymentMade:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting payment',
            error: error.message
        });
    }
};

// Bulk delete payments made
export const bulkDeletePaymentsMade = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            res.status(400).json({ success: false, message: 'Invalid IDs' });
            return;
        }

        // Validate all IDs are valid ObjectIds to prevent CastError
        const validIds = ids.filter(id => id && mongoose.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            res.status(400).json({ success: false, message: 'No valid IDs provided' });
            return;
        }

        const payments = await PaymentMade.find({
            _id: { $in: validIds },
            organization: req.user.organizationId
        });

        const paymentIds = payments.map((payment) => payment._id);
        const allAllocations: any[] = [];
        payments.forEach(p => {
            if (p.allocations) {
                p.allocations.forEach(a => {
                    allAllocations.push(a.bill.toString());
                });
            }
        });

        const journals = await JournalEntry.find({
            organization: req.user.organizationId,
            sourceId: { $in: paymentIds },
            sourceType: 'payment_made'
        });
        for (const entry of journals) {
            try {
                await updateAccountBalances(entry.lines, req.user.organizationId, true);
            } catch (err) {
                console.error('[PAYMENT_BULK_DELETE] Failed to reverse journal balances:', err);
            }
        }
        await JournalEntry.deleteMany({
            organization: req.user.organizationId,
            sourceId: { $in: paymentIds },
            sourceType: 'payment_made'
        });

        for (const payment of payments) {
            await syncLinkedBankTransaction({
                organizationId: req.user.organizationId,
                transactionKey: `payment_made:${payment._id}`,
                source: "payment_made",
                transactionType: "withdrawal",
                debitOrCredit: "debit",
                amount: 0,
                shouldSync: false,
            });
        }

        await PaymentMade.deleteMany({
            _id: { $in: validIds },
            organization: req.user.organizationId
        });

        // Revert bill balances for all affected bills
        const uniqueBillIds = [...new Set(allAllocations)];
        for (const billId of uniqueBillIds) {
            await updateBillAfterPayment(billId, req.user.organizationId);
        }

        res.json({ success: true, message: `${payments.length} payments deleted` });
    } catch (error: any) {
        console.error('Error in bulkDeletePaymentsMade:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting payments',
            error: error.message
        });
    }
};

// Send payment made email
export const sendPaymentMadeEmail = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const { to, subject, body } = req.body;

        if (!to || !subject) {
            res.status(400).json({ success: false, message: 'Missing required email fields (to, subject)' });
            return;
        }

        // Get payment details
        const payment = await PaymentMade.findOne({
            _id: id,
            organization: req.user.organizationId
        }).populate('vendor').lean();

        if (!payment) {
            res.status(404).json({ success: false, message: 'Payment not found' });
            return;
        }

        // Import email service
        const { sendEmail } = await import('../services/email.service.js');

        // Convert array to string if needed
        const toString = Array.isArray(to) ? to.join(', ') : to;

        // Get vendor and organization info
        const vendor = payment.vendor as any;
        const vendorName = vendor?.companyName || vendor?.displayName || 'Vendor';

        // Get organization info
        const Organization = (await import('../models/Organization.js')).default;
        const org = await Organization.findById(req.user.organizationId);
        const orgName = (org as any)?.companyName || (org as any)?.name || 'Company';

        // Format payment date
        const paymentDate = payment.date ? new Date(payment.date) : new Date();
        const formattedDate = paymentDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        // Format amount
        const amount = parseFloat(payment.amount?.toString() || '0').toFixed(2);
        const currency = payment.currency || 'AED';

        // Get bill number from allocations
        const billNumber = payment.allocations && payment.allocations.length > 0
            ? (payment.allocations[0] as any).bill?.billNumber || '---'
            : '---';

        // Build the designed HTML template
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Made</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Blue Header Banner -->
        <div style="background-color: #3b82f6; color: #ffffff; padding: 40px; text-align: center; font-size: 24px; font-weight: 500;">
            Payment Made
        </div>
        
        <!-- Email Content -->
        <div style="padding: 40px;">
            <!-- Greeting -->
            <div style="text-align: center; margin-bottom: 32px; color: #4b5563; font-size: 16px;">
                Hi ${vendorName},
            </div>
            
            <div style="text-align: center; margin-bottom: 32px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We have made the payment for your invoice(s). It's been a pleasure doing business
            </div>
            
            <!-- Amount Summary Box -->
            <div style="background-color: #fffdf0; border: 1px solid #fef3c7; padding: 40px; text-align: center; margin-bottom: 40px;">
                <div style="font-size: 18px; color: #111827; margin-bottom: 16px;">
                    Payment Made
                </div>
                <div style="font-size: 32px; font-weight: 700; color: #10b981;">
                    ${currency} ${amount}
                </div>
            </div>
            
            <!-- Payment Details -->
            <div style="display: flex; justify-content: space-between; color: #6b7280; font-size: 14px; margin-bottom: 16px;">
                <div>
                    Invoice Number <span style="font-weight: 600; color: #111827;">${billNumber}</span>
                </div>
                <div>
                    Payment Date <span style="font-weight: 600; color: #111827;">${formattedDate}</span>
                </div>
            </div>
            
            <!-- Signature -->
            <div style="margin-top: 64px; color: #6b7280; font-size: 14px;">
                Regards,<br>
                <span style="color: #4b5563; font-weight: 500;">${orgName}</span><br>
                <div style="margin-top: 8px; font-size: 12px;">${org?.email || ''}</div>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
            <p style="font-size: 12px; color: #999; margin: 0;">This email was sent via Taban Books.</p>
        </div>
    </div>
</body>
</html>
        `;

        const text = `Payment Made

Hi ${vendorName},

We have made the payment for your invoice(s). It's been a pleasure doing business.

Payment Made: ${currency} ${amount}
Invoice Number: ${billNumber}
Payment Date: ${formattedDate}

Regards,
${orgName}
${org?.email || ''}

---
This email was sent via Taban Books.`;

        console.log('[Payment Email] Sending email to:', toString);
        const result = await sendEmail({
            to: toString,
            subject,
            html,
            text,
            from: process.env.SMTP_FROM || process.env.SMTP_USER
        });

        console.log('[Payment Email] Service result:', result);

        if (!result.success) {
            console.error('[Payment Email] Service failed to send:', result.error);
            res.status(500).json({
                success: false,
                message: 'Email delivery failed',
                error: result.error
            });
            return;
        }

        res.json({
            success: true,
            message: 'Email sent successfully',
            data: result
        });

    } catch (error: any) {
        console.error('[Payment Email] Critical error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send payment email',
            error: error.message
        });
    }
};

