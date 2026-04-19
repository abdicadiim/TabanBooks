import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, MoreVertical, Plus } from "lucide-react";

export default function OrganizationsManagePage() {
  const navigate = useNavigate();
  const [copiedOrgId, setCopiedOrgId] = useState(null);

  const organizations = [
    {
      id: "907645665",
      name: "TABAN ENTERPRISES",
      plan: "FINANCE PLUS TRIAL",
      icon: "📖",
      createdDate: "01/12/2025",
      edition: "Kenya",
      role: "admin",
    },
    {
      id: "906197271",
      name: "taban enterprise",
      plan: "PREMIUM TRIAL",
      icon: "🛡️",
      createdDate: "19 Nov 2025",
      edition: "United States",
      role: "admin",
    },
  ];

  const handleCopyOrgId = (orgId) => {
    navigator.clipboard.writeText(orgId);
    setCopiedOrgId(orgId);
    setTimeout(() => setCopiedOrgId(null), 2000);
  };

  const handleGoToOrganization = (orgId) => {
    // Navigate to the organization or switch context
    console.log("Go to organization:", orgId);
    // You can implement organization switching logic here
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 text-sm"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Hi, JIRDE HUSSEIN KHALIF!
          </h1>
          <p className="text-slate-600">
            You are a part of the following organizations. Go to the organization which you wish to access now.
          </p>
        </div>

        {/* New Organization Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => {
              // Handle new organization creation
              console.log("Create new organization");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            <span>New Organization</span>
          </button>
        </div>

        {/* Organizations List */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            My Organizations {organizations.length}
          </h2>
        </div>

        <div className="space-y-4">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Icon */}
                  <div className="text-4xl flex-shrink-0">{org.icon}</div>

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {org.name}
                      </h3>
                      <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                        {org.plan}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-slate-600">
                      <div>
                        Organization created on {org.createdDate}
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Organization ID: {org.id}</span>
                        <button
                          onClick={() => handleCopyOrgId(org.id)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                          title="Copy Organization ID"
                        >
                          {copiedOrgId === org.id ? (
                            <Check size={14} className="text-green-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                      <div>Edition: {org.edition}</div>
                      <div className="text-slate-700 font-medium">
                        You are an {org.role} in this organization
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleGoToOrganization(org.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    Go to Organization
                  </button>
                  <button
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                    title="More options"
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




