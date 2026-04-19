import React, { useMemo, useState } from "react";

export default function Footer() {
  const slides = useMemo(
    () => [
      {
        title: "Account on the go!",
        desc: "Download the app to manage your finances from anywhere.",
        cta: "Learn More →",
      },
      {
        title: "New to accounting?",
        desc: "Business guides will help you all the way—from basics to best practices.",
        cta: "Take me there →",
      },
    ],
    []
  );

  const [idx, setIdx] = useState(0);

  const next = () => setIdx((p) => (p + 1) % slides.length);
  const prev = () => setIdx((p) => (p - 1 + slides.length) % slides.length);

  return (
    <footer className="mt-10 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-[1400px] px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr,2.2fr]">
          {/* LEFT (carousel) */}
          <div className="relative rounded-2xl border border-slate-200 p-6 overflow-hidden">
            <div className="text-lg font-semibold text-slate-900">
              {slides[idx].title}
            </div>
            <div className="mt-2 text-sm text-slate-600 max-w-[360px]">
              {slides[idx].desc}
            </div>

            {/* fake artwork area */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 h-[150px] flex items-center justify-center text-slate-400">
              (Image / QR / Illustration)
            </div>

            <button className="mt-4 text-[13px] font-medium text-blue-600 hover:underline">
              {slides[idx].cta}
            </button>

            {/* dots */}
            <div className="mt-4 flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`h-2 w-2 rounded-full ${
                    i === idx ? "bg-blue-600" : "bg-slate-200"
                  }`}
                  aria-label={`slide-${i}`}
                />
              ))}
            </div>

            {/* arrows (right side like screenshot) */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              <button
                onClick={prev}
                className="h-9 w-9 rounded-full border border-slate-200 bg-white shadow hover:bg-slate-50"
                aria-label="prev"
              >
                ‹
              </button>
              <button
                onClick={next}
                className="h-9 w-9 rounded-full border border-slate-200 bg-white shadow hover:bg-slate-50"
                aria-label="next"
              >
                ›
              </button>
            </div>
          </div>

          {/* RIGHT columns */}
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 mb-3">
                OTHER APPS
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="hover:text-slate-900 cursor-pointer">Ecommerce Software</li>
                <li className="hover:text-slate-900 cursor-pointer">Expense Reporting</li>
                <li className="hover:text-slate-900 cursor-pointer">Subscription Billing</li>
                <li className="hover:text-slate-900 cursor-pointer">100% Free Invoicing</li>
                <li className="hover:text-slate-900 cursor-pointer">Inventory Management</li>
                <li className="hover:text-slate-900 cursor-pointer">CRM & Other Apps</li>
              </ul>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900 mb-3">
                HELP & SUPPORT
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="hover:text-slate-900 cursor-pointer">Contact Support</li>
                <li className="hover:text-slate-900 cursor-pointer">Knowledge Base</li>
                <li className="hover:text-slate-900 cursor-pointer">Help Documentation</li>
                <li className="hover:text-slate-900 cursor-pointer">Webinar</li>
              </ul>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900 mb-3">
                QUICK LINKS
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="hover:text-slate-900 cursor-pointer">Getting Started</li>
                <li className="hover:text-slate-900 cursor-pointer">Mobile apps</li>
                <li className="hover:text-slate-900 cursor-pointer">Add-ons</li>
                <li className="hover:text-slate-900 cursor-pointer">What&apos;s New?</li>
                <li className="hover:text-slate-900 cursor-pointer">Developers API</li>
              </ul>
            </div>
          </div>
        </div>

        {/* bottom contact strip */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <div className="h-10 w-10 rounded-full bg-blue-50 grid place-items-center">
              📞
            </div>
            <div>
              <div className="font-medium text-slate-900">
                You can directly talk to us every Mon–Fri 9:00 AM to 6:00 PM
              </div>
              <div className="text-slate-600">
                Helpline: <span className="font-semibold">0800 000 000</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} Taban Books. All Rights Reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
