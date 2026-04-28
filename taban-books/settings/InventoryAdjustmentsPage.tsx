import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function InventoryAdjustmentsPage() {
  const navigate = useNavigate();
  const [approvalType, setApprovalType] = useState("no-approval");
  const approvalOptions = [
    {
      value: "no-approval",
      title: "No Approval",
      description: "Create Inventory Adjustment and perform further actions without approval.",
    },
    {
      value: "simple-approval",
      title: "Simple Approval",
      description: "Any user with approve permission can approve the Inventory Adjustment.",
    },
    {
      value: "multi-level-approval",
      title: "Multi-Level Approval",
      description: "Set many levels of approval. The Inventory Adjustment will be approved only when all the approvers approve.",
    },
    {
      value: "custom-approval",
      title: "Custom Approval",
      description: "Create a customized approval flow by adding one or more criteria.",
    },
  ];

  const handleSave = () => {
    toast.success("Inventory adjustment settings saved successfully");
  };

  return (
    <div className="p-6 max-w-7xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Inventory Adjustments</h1>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Approval Type</h3>
          
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {approvalOptions.map((option) => {
            const isSelected = approvalType === option.value;
            return (
              <label
                key={option.value}
                className={`flex min-h-[110px] cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="approvalType"
                  value={option.value}
                  checked={isSelected}
                  onChange={(e) => setApprovalType(e.target.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">{option.title}</span>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{option.description}</p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-start border-t border-gray-200 pt-5">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex min-h-[38px] items-center rounded-[9px] bg-[#156b7d] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#115766]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}



