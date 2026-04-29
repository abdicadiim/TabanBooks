import React, { useState, useEffect } from 'react';
import { CreditNote } from '../../salesModel';
import TransactionPDFDocument from '../../../../components/Transactions/TransactionPDFDocument';
import { pdfTemplatesAPI } from '../../../../services/api';

interface CreditNotePreviewProps {
    creditNote: CreditNote;
    organizationProfile: any;
    baseCurrency: string;
    onCustomerClick?: (customerId: string) => void;
}

const CreditNotePreview: React.FC<CreditNotePreviewProps> = ({
    creditNote,
    organizationProfile,
    baseCurrency,
    onCustomerClick
}) => {
    const [activePdfTemplate, setActivePdfTemplate] = useState<any>(null);

    useEffect(() => {
        const fetchPdfTemplates = async () => {
            try {
                const response = await pdfTemplatesAPI.get();
                if (response?.success && Array.isArray(response.data?.templates)) {
                    const creditTemplates = response.data.templates.filter((t: any) => t.moduleType === "credit_notes");
                    const defaultTemplate = creditTemplates.find((t: any) => t.isDefault) || creditTemplates[0];
                    if (defaultTemplate) {
                        setActivePdfTemplate(defaultTemplate);
                    }
                }
            } catch (error) {
                console.error("Error fetching PDF templates:", error);
            }
        };
        fetchPdfTemplates();
    }, []);

    const items = creditNote.items || [];
    const subtotal = (creditNote.subtotal ?? creditNote.subTotal ?? items.reduce((s: any, it: any) => s + (parseFloat(it.total || it.amount || 0) || (parseFloat(it.quantity || 0) * parseFloat(it.unitPrice || it.rate || 0))), 0)) || 0;
    const total = (creditNote.total ?? creditNote.amount) || 0;
    const balance = creditNote.balance ?? total;

    return (
        <div className="w-full bg-white flex justify-center">
            <div className="w-full max-w-[920px]">
                <TransactionPDFDocument
                    data={{
                        ...creditNote,
                        number: creditNote.creditNoteNumber || creditNote.id,
                        date: creditNote.creditNoteDate || creditNote.date,
                        items: items.map((item: any) => ({
                            ...item,
                            name: item.name || item.itemDetails || "—",
                            description: item.description,
                            quantity: item.quantity || 0,
                            rate: item.unitPrice || item.rate || 0,
                            amount: item.total || item.amount || 0,
                            unit: item.unit
                        }))
                    }}
                    config={activePdfTemplate?.config || {}}
                    moduleType="credit_notes"
                    organization={organizationProfile}
                    totalsMeta={{
                        subTotal: subtotal,
                        total: total,
                        paidAmount: total - balance,
                        balance: balance
                    }}
                />
            </div>
        </div>
    );
};

export default CreditNotePreview;
