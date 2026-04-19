import React from "react";
import HomeHeader from "./HomeHeader";

const checklist = [
  {
    title: "Add organization details",
    description:
      "Add your organization’s address and tax details to auto-populate them when you create transactions.",
    actionLabel: "Add Tax Details",
    status: "done",
  },
  {
    title: "Create your first invoice",
    description: "Send a professional invoice to your customer.",
    actionLabel: "Create Invoice",
  },
  {
    title: "Create your first bill and expense",
    description: "Record vendor bills and expenses in a few clicks.",
    actionLabel: "Add Bill",
  },
  {
    title: "Set up banking and journals",
    description: "Connect banks, reconcile, and manage journals.",
    actionLabel: "Set up Banking",
  },
];

const featureCards = [
  {
    title: "Configure Chart of Accounts",
    body: "Use default accounts or create your own to fit your business.",
    primary: "Configure",
    secondary: "Watch & Learn",
  },
  {
    title: "Enter Opening Balances",
    body: "Bring in balances from your previous system to keep books intact.",
    primary: "Configure",
    secondary: "Watch & Learn",
  },
  {
    title: "Connect with Payment Gateways",
    body: "Integrate Stripe or PayPal to get paid faster by your customers.",
    primary: "Configure",
    secondary: "Watch & Learn",
  },
  {
    title: "Enable Customer and Vendor Portals",
    body: "Share transactions and collaborate securely with your contacts.",
    primary: "Set up",
    secondary: "Watch & Learn",
  },
];

const advancedActions = [
  "Add a Custom Field",
  "Set Up Approval Flow",
  "Create Tag",
  "Create Custom Functions",
];

export default function GettingStartedPage() {
  return (
    <div className="w-full mx-auto my-0 px-4 md:px-6 pt-0">
      <HomeHeader />

      <div className="flex flex-col gap-3.5">
        <header className="flex justify-between items-start gap-3 py-1 px-0.5">
          <div>
            <div className="text-xl font-semibold text-slate-800 mb-1">
              Welcome to Taban Books
            </div>
            <div className="text-sm text-slate-600">
              The easy-to-use accounting software that you can set up in no
              time!
            </div>
            <button className="bg-transparent border-none text-sm cursor-pointer mt-1.5 p-0" style={{ color: "#156372" }}>
              Overview of Taban Books
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white shadow-md p-4 md:p-5">
          <div className="flex justify-between items-center gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="text-base font-semibold text-slate-800">
                Let&apos;s get you up and running
              </div>
              <button className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs text-slate-700 shadow-sm cursor-pointer">
                Mark as Completed
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-40 h-2 bg-slate-100 rounded-full overflow-hidden">
                <span className="block h-full bg-green-500" style={{ width: "0%" }} />
              </div>
              <div className="text-xs text-green-600 font-semibold">
                <span>0%</span> Completed
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.1fr,0.9fr] gap-4 md:gap-6">
            <div className="space-y-3 border-r border-slate-100 pr-3">
              {checklist.map((item) => (
                <div key={item.title} className="flex justify-between gap-3 pb-3 border-b border-dashed border-slate-100 last:border-b-0">
                  <div className="flex gap-3">
                    <span
                      className={
                        "w-4 h-4 rounded-full text-[11px] flex items-center justify-center " +
                        (item.status === "done" ? "bg-green-500 text-white" : "bg-slate-100 text-slate-500")
                      }
                    >
                      {item.status === "done" ? "✓" : ""}
                    </span>
                    <div>
                      <div className="font-semibold text-sm text-slate-800">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {item.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <button className="bg-transparent border-none text-xs cursor-pointer p-0" style={{ color: "#156372" }}>
                      {item.actionLabel}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pl-1 md:pl-2">
              <div className="text-base font-semibold text-slate-800">
                Add organization details
              </div>
              <div className="text-sm text-slate-700 leading-6">
                Add your organization's address and tax details to auto-populate
                them when you create transactions. Also, add users to provide
                access to your employees and accountants.
              </div>
              <div className="flex items-center gap-3 flex-wrap mt-2">
                <button className="px-3 py-1.5 rounded-md text-white text-xs shadow cursor-pointer" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
                  Add Tax Details
                </button>
                <button className="bg-transparent border-none text-xs cursor-pointer p-0" style={{ color: "#156372" }}>
                  Add Address
                </button>
                <span className="text-xs text-green-600 font-semibold">
                  ✓ User invited
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="py-1 px-0.5">
          <div className="text-lg font-semibold text-slate-800">
            Explore useful features and set up Taban Books
          </div>
          <div className="text-sm text-slate-600 mt-0.5">
            Your journey to effortlessly manage your accounting starts here.
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-[0.9fr,2fr] gap-4 items-center border border-slate-200 bg-[#f9fbff] rounded-xl p-4 shadow">
          <div className="relative h-36 rounded-xl bg-gradient-to-br from-[#c8d9ff] to-[#f1f5ff] flex items-center justify-center">
            <span className="w-11 h-11 rounded-full text-white flex items-center justify-center text-lg" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
              ▶
            </span>
            <div className="absolute right-2 bottom-2 bg-black/70 text-white text-[11px] px-2 py-1 rounded">
              10:55
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-lg font-semibold text-slate-800 mb-1">
              Getting Started with Taban Books
            </div>
            <div className="text-sm text-slate-700 leading-6 mb-2">
              Watch this short overview video to get a head-start on everything
              Taban Books has to offer to manage your business finance
            </div>
            <button className="bg-transparent border-none text-sm cursor-pointer p-0" style={{ color: "#156372" }}>
              Find more videos on our YouTube channel
            </button>
          </div>
        </section>

        <section className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((card) => (
            <div key={card.title} className="border border-slate-200 rounded-xl p-3 bg-white shadow-sm flex flex-col gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center text-sm">
                ◆
              </div>
              <div className="font-semibold text-sm text-slate-800">
                {card.title}
              </div>
              <div className="text-xs text-slate-600">
                {card.body}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button className="px-3 py-1.5 rounded-md border bg-white text-xs cursor-pointer" style={{ borderColor: "#156372", color: "#156372" }}>
                  {card.primary}
                </button>
                <button className="bg-transparent border-none text-xs cursor-pointer p-0" style={{ color: "#156372" }}>
                  {card.secondary}
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="flex items-center justify-between gap-3 py-2 px-0.5">
          <div className="font-semibold text-slate-800">
            Other Advanced Features
          </div>
          <div className="flex gap-3 flex-wrap">
            {advancedActions.map((item) => (
              <button key={item} className="bg-transparent border-none text-sm cursor-pointer p-0" style={{ color: "#156372" }}>
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-sm grid grid-cols-[110px,1fr] gap-3 items-center">
            <div className="h-24 rounded-lg bg-gradient-to-br from-[#c8d9ff] to-[#f1f5ff] flex items-center justify-center">
              <span className="w-9 h-9 rounded-full text-white flex items-center justify-center" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
                ▶
              </span>
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-800">
                Configure automated email alerts
              </div>
              <ul className="mt-1 pl-4 text-xs text-slate-700 space-y-1 list-disc">
                <li>Define the criteria in the workflow rule</li>
                <li>Create an email alert</li>
                <li>Receive automated email alerts</li>
              </ul>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-sm grid grid-cols-[110px,1fr] gap-3 items-center">
            <div className="h-24 rounded-lg bg-gradient-to-br from-[#c8d9ff] to-[#f1f5ff] flex items-center justify-center">
              <span className="w-9 h-9 rounded-full text-white flex items-center justify-center" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
                ▶
              </span>
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-800">
                Make your transactions reflect your brand
              </div>
              <ul className="mt-1 pl-4 text-xs text-slate-700 space-y-1 list-disc">
                <li>Customize your templates</li>
                <li>Add your organization&apos;s logo to the templates</li>
                <li>Add the bank details to the template</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

