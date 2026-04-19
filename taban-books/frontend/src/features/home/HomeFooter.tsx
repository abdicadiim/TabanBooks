import React from "react";

export default function HomeFooter() {
  return (
    <footer className="mt-6 rounded-2xl border border-teal-100 bg-white p-5 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h4 className="text-[12px] tracking-wide uppercase font-semibold text-teal-900 mb-2">
            Product
          </h4>
          <ul className="space-y-1.5 text-[13px] text-slate-600">
            <li className="hover:text-teal-800 cursor-pointer">Getting Started</li>
            <li className="hover:text-teal-800 cursor-pointer">Reports</li>
            <li className="hover:text-teal-800 cursor-pointer">Integrations</li>
            <li className="hover:text-teal-800 cursor-pointer">Mobile App</li>
          </ul>
        </div>

        <div>
          <h4 className="text-[12px] tracking-wide uppercase font-semibold text-teal-900 mb-2">
            Support
          </h4>
          <ul className="space-y-1.5 text-[13px] text-slate-600">
            <li className="hover:text-teal-800 cursor-pointer">Contact Support</li>
            <li className="hover:text-teal-800 cursor-pointer">Help Documentation</li>
            <li className="hover:text-teal-800 cursor-pointer">Knowledge Base</li>
            <li className="hover:text-teal-800 cursor-pointer">System Status</li>
          </ul>
        </div>

        <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
          <h4 className="text-[13px] font-semibold text-teal-900">Need Assistance?</h4>
          <p className="mt-1 text-[12px] text-slate-600">
            Reach our support team Monday to Friday, 9:00 AM - 6:00 PM.
          </p>
          <p className="mt-2 text-[13px] font-medium text-teal-800">
            Taban Books Helpline: 0800 601 172, 0800 211 152
          </p>
        </div>
      </div>
    </footer>
  );
}

