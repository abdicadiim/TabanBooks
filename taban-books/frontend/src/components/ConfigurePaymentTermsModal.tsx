import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { PaymentTerm } from '../hooks/usePaymentTermsDropdown';

interface ConfigurePaymentTermsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (terms: PaymentTerm[]) => void;
    initialTerms: PaymentTerm[];
}

export const ConfigurePaymentTermsModal: React.FC<ConfigurePaymentTermsModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialTerms,
}) => {
    const [terms, setTerms] = useState<PaymentTerm[]>(initialTerms);

    if (!isOpen) return null;

    const handleTermChange = (id: string, field: 'label' | 'days', value: string | number) => {
        setTerms(prevTerms =>
            prevTerms.map(term => {
                if (term.id === id) {
                    const updatedTerm = { ...term, [field]: value };
                    // Sync label and value for simplicity, or keep them separate if needed
                    if (field === 'label') {
                        updatedTerm.value = value as string;
                    }
                    return updatedTerm;
                }
                return term;
            })
        );
    };

    const handleDeleteTerm = (id: string) => {
        setTerms(prevTerms => prevTerms.filter(term => term.id !== id));
    };

    const handleAddNew = () => {
        const newId = (Math.max(...terms.map(t => parseInt(t.id) || 0), 0) + 1).toString();
        setTerms([...terms, { id: newId, label: '', value: '', days: 0 }]);
    };

    const handleSave = () => {
        onSave(terms);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Configure Payment Terms</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/3">
                                        TERM NAME
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                                        NUMBER OF DAYS
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">

                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {terms.map((term) => (
                                    <tr key={term.id} className="group hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="text"
                                                value={term.label}
                                                onChange={(e) => handleTermChange(term.id, 'label', e.target.value)}
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="Term Name"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right w-32">
                                            <input
                                                type="number"
                                                value={term.days}
                                                onChange={(e) => handleTermChange(term.id, 'days', parseInt(e.target.value) || 0)}
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-right"
                                                min="0"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-left">
                                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setTerms(prevTerms => prevTerms.map(t => ({
                                                            ...t,
                                                            isDefault: t.id === term.id
                                                        })));
                                                    }}
                                                    className={`${term.isDefault ? 'text-gray-400 cursor-default' : 'text-blue-600 hover:text-blue-800'} text-xs font-medium`}
                                                    disabled={term.isDefault}
                                                >
                                                    {term.isDefault ? 'Default' : 'Mark as Default'}
                                                </button>
                                                <span className="text-gray-300">|</span>
                                                <button
                                                    onClick={() => handleDeleteTerm(term.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1"
                                                >
                                                    <Trash2 size={12} /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button
                        onClick={handleAddNew}
                        className="mt-4 flex items-center text-blue-600 hover:text-blue-800 font-medium"
                    >
                        <Plus size={16} className="mr-1" />
                        Add New
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-start gap-3">
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Save
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
