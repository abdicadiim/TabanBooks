import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

export default function PaymentsReceivedPage() {
  const navigate = useNavigate();
  
  const [customFields, setCustomFields] = useState([]);
  const customFieldsUsage = customFields.length;
  const maxCustomFields = 59;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Payments Received</h1>

      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-600">
            Custom Fields Usage: {customFieldsUsage}/{maxCustomFields}
          </div>
          <button
            onClick={() => navigate("/settings/payments-received/new-field")}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            New Custom Field
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">FIELD NAME</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DATA TYPE</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MANDATORY</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SHOW IN ALL PDFS</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customFields.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-gray-500 text-sm">
                      Do you have information that doesn't go under any existing field? Go ahead and create a custom field.
                    </p>
                  </td>
                </tr>
              ) : (
                customFields.map((field, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                      {field.name}
                      {field.locked && <Lock size={14} className="text-gray-400" />}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.showInAllPDFs}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        field.status === "Active" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {field.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

