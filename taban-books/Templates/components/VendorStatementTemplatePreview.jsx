import React from "react";
import CompanyHeader from "./shared/CompanyHeader";
import AddressSection from "./shared/AddressSection";

const VendorStatementTemplatePreview = () => {
  const transactions = [
    { date: "01 Dec 2025", description: "Bill BILL-15", debit: 0, credit: 500.00, balance: 500.00 },
    { date: "05 Dec 2025", description: "Payment", debit: 200.00, credit: 0, balance: 300.00 },
    { date: "06 Dec 2025", description: "Bill BILL-17", debit: 0, credit: 630.00, balance: 930.00 },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <CompanyHeader />
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Statement</h1>
          <div className="text-sm text-gray-600">Statement Period: 01 Dec - 06 Dec 2025</div>
        </div>
      </div>

      <AddressSection />

      <table className="w-full mt-6">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold">Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold">Description</th>
            <th className="px-4 py-3 text-right text-xs font-semibold">Debit</th>
            <th className="px-4 py-3 text-right text-xs font-semibold">Credit</th>
            <th className="px-4 py-3 text-right text-xs font-semibold">Balance</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((txn, idx) => (
            <tr key={idx}>
              <td className="px-4 py-3 text-sm text-gray-700">{txn.date}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{txn.description}</td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">{txn.debit > 0 ? `$${txn.debit.toFixed(2)}` : "-"}</td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">{txn.credit > 0 ? `$${txn.credit.toFixed(2)}` : "-"}</td>
              <td className="px-4 py-3 text-sm text-gray-900 font-semibold text-right">${txn.balance.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mt-6">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between font-semibold pt-2 border-t-2 border-gray-400">
            <span className="text-gray-900">Outstanding Balance</span>
            <span className="text-gray-900">$930.00</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorStatementTemplatePreview;

