import React from "react";
import { ExternalLink, BookOpen, PlayCircle, HelpCircle } from "lucide-react";
import HomeHeader from "./HomeHeader";
import HomeFooter from "./HomeFooter";

const updates = [
  {
    date: "26 September 2025",
    title: "View Reports as Charts",
    body: `With the chart view in reports, you can visualize your data as a chart instead of viewing it in a plain table format. This makes it easier to understand trends and patterns in your financial data at a glance.`,
    link: "Learn more...",
  },
  {
    date: "25 September 2025",
    title: "Track Customer Payments Statuses",
    body: `We've enhanced the payment tracking system. You can now manage payment statuses (Draft, Paid, Void) with more flexibility. Use the "Mark as Paid" option to quickly update payment status, or "Convert to Draft" to make changes to completed payments.`,
    link: "Learn more...",
  },
  {
    date: "25 September 2025",
    title: "Pay More Bills With a Single Check",
    body: `You can now pay up to 250 bills per check using the Pay via Check option, which was previously limited to 10 bills. This streamlines your payment process and reduces the number of checks you need to write.`,
  },
  {
    date: "24 September 2025",
    title: "View Bin Stock Details",
    body: `You can now view bin stock details directly on an item's details page. This feature is only available in Taban Inventory Add-on enabled organizations. Navigate to any item's details page to see real-time bin stock information.`,
  },
  {
    date: "20 September 2025",
    title: "Taban Books Updates for Apple Devices",
    body: `At WWDC 2025, Apple unveiled iOS 26, iPadOS 26, macOS 26, and watchOS 26. We've integrated these features into Taban Books to make your bookkeeping experience faster, smarter, and more intuitive.`,
    link: "Learn more...",
  },
  {
    date: "19 September 2025",
    title: "Image Data Type Support for Custom Fields",
    body: `We now support the Image data type for custom fields, allowing you to upload and display images on the transaction details page. This is particularly useful for receipts, invoices, and other document attachments.`,
  },
  {
    date: "18 September 2025",
    title: "Clone Custom Reports",
    body: `You can now clone your custom reports directly from the custom report list page. This makes it easy to create variations of existing reports without starting from scratch.`,
  },
  {
    date: "18 September 2025",
    title: "Enhancement to Bulk Update in Items",
    body: `The bulk update feature for items has been enhanced to support additional fields. Along with the existing ones, you can now update Brand, Manufacturer, Custom Fields, MRP, Sales Description, Purchase Price, Purchase Account, Purchase Description, Inventory Account, Inventory Valuation Method, HSN/SAC, Returnable, and Bin Tracking in bulk. This feature is only available in Taban Inventory Add-on enabled organizations.`,
  },
  {
    date: "17 September 2025",
    title: "Bulk Add and Autofill Serial Numbers",
    body: `We've added the ability to bulk add and autofill serial numbers for items. This feature significantly reduces the time spent on data entry when managing large inventories with serialized items.`,
  },
  {
    date: "11 September 2025",
    title: "Cancel or Correct Invoices",
    body: `You can now cancel or correct invoices directly from the invoice details page. This feature is available for organizations with their location set to France and helps maintain accurate financial records.`,
  },
  {
    date: "10 September 2025",
    title: "Stock Preference For Replenishment",
    body: `You can now configure stock replenishment to include "Available for Sale, Yet to Receive, and In Transit stock" for generating tasks. Navigate to Settings > General > Items and check the option. This feature is only available in Taban Inventory Add-on enabled organizations.`,
  },
  {
    date: "09 October 2025",
    title: "Introducing Simple Approval for Purchase Receives",
    body: `We've introduced Simple Approval for Purchase Receives. Users with approval permissions can submit, approve, reject, or update the status of a Purchase Receive from both the creation and Details pages. This feature is only available in Taban Inventory Add-on enabled organizations.`,
  },
  {
    date: "08 October 2025",
    title: "Enhancements to Custom Buttons and Related Lists",
    body: `We now support custom buttons and related lists for Transfer Orders, Purchase Receives, and Sales Returns. This feature is only available in Taban Inventory Add-on enabled organizations.`,
  },
  {
    date: "05 September 2025",
    title: "Customize PDF Names",
    body: `You can now customize PDF names in Invoices and Quotes using placeholders (Invoice Number, Sales Person, Due Date, Customer Name, Organization Name, and Invoice Date) with optional prefixes or suffixes. Go to Settings > Customization > PDF Templates > Invoice/Quotes > Configure Export File Name.`,
  },
  {
    date: "05 September 2025",
    title: "Bulk Update Accounts for Sales Receipts",
    body: `You now have the option to bulk update accounts for sales receipts in the Accountant module. This makes it easier to manage and organize your sales receipt accounts efficiently.`,
  },
  {
    date: "04 September 2025",
    title: "Enhancements to Custom Modules",
    body: `You now have the option to attach files to custom modules, with a limit of up to 10 files (5 MB each). You can also create lookup custom fields for Locations in both custom fields and custom modules. Additionally, you can access custom modules in the customer and vendor portal.`,
  },
  {
    date: "04 September 2025",
    title: "Customize Columns in Timesheets",
    body: `You can customize columns and create custom views in the Timesheet module. This allows you to tailor the timesheet interface to match your workflow and reporting needs.`,
  },
  {
    date: "04 September 2025",
    title: "Enhancements to WebForms",
    body: `Users of an organization can now report spam, and admins can block or unblock the reported webforms. Additionally, you can add WebForm placeholders to email and PDF templates, which makes it easier to customize your communication.`,
  },
  {
    date: "03 September 2025",
    title: "Increase API Limits",
    body: `You can now temporarily increase API limits via Settings > Developer Data > API Usage > Purchase API Add-On dropdown and select Increase API Limit Temporarily. Then, in the pop-up, click Increase Limit.`,
  },
  {
    date: "03 September 2025",
    title: "Multiple Record Locking Configuration for Sales Orders and Items",
    body: `We now support multiple record locking configuration for Sales Orders and Items. Once locked, only users with roles that have sufficient permission will be able to update records.`,
    link: "Learn more...",
  },
  {
    date: "30 October 2025",
    title: "Transaction Locking Restrictions",
    body: `We've added new restrictions to Transaction Locking. You cannot lock a period that contains transactions with negative stock or where related purchase transactions are dated after the lock period.`,
    link: "Learn more...",
  },
  {
    date: "30 October 2025",
    title: "Export Current View in Timesheets Module",
    body: `You can now export the current view in the Timesheets module. This allows you to export only the records displayed on your screen, including any filters, sorting, or column rearrangements you've made.`,
  },
  {
    date: "27 October 2025",
    title: "Sales Receipt Support in the Customer Portal",
    body: `We've added support for the Sales Receipt module in the Customer Portal. Your customers can now view both the List and Details pages of sales receipts in their portal. They can also forward, download, view attachments, print, and bulk download PDFs. To enable this, go to Settings > Module Settings > Customer Portal > General, check the option Display Sales Receipts in the portal > click Save.`,
  },
  {
    date: "23 October 2025",
    title: "Enhancements to Putaway and Move Orders",
    body: `Comments & History is now supported in Putaway, and you can also create custom views for both Move Orders and Putaway. Additionally, you can filter transactions by Move Orders and Putaway on the item's Details page under the Transactions tab. This feature is only available in Taban Inventory Add-on enabled organizations.`,
  },
  {
    date: "15 October 2025",
    title: "Translate Email Notification Templates",
    body: `We've introduced Email Notification Template Translations. Set preferred Communication Languages under your Organization Profile, and assign one to each customer while creating them. When emails are sent, the content automatically appears in the customer's language, and you can switch between translations as needed.`,
  },
];

export default function RecentUpdatesPage() {
  return (
    <div className="w-full mx-auto my-0 px-4 md:px-6 pt-0 pb-8">
      <HomeHeader />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6 mt-6">
        {/* Main Content - Updates Timeline */}
        <div className="w-full">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">What's New</h1>
            <p className="text-sm text-slate-600">Stay updated with the latest features and enhancements</p>
          </div>

          <div
            className="relative pl-6 mt-2"
            style={{
              position: 'relative'
            }}
          >
            <div
              className="absolute left-1.5 top-0 bottom-0 w-0.5"
              style={{
                background: "linear-gradient(to bottom, #156372 0%, #0D4A52 100%)"
              }}
            />
            {updates.map((item, idx) => (
              <div key={item.title + idx} className="relative py-4.5 pb-7">
                <div
                  className="absolute -left-2 top-7 w-3 h-3 rounded-full bg-white border-2 shadow-sm"
                  style={{ borderColor: idx === 0 ? "#156372" : "#0D4A52" }}
                  aria-hidden="true"
                >
                  {idx === 0 && (
                    <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }} />
                  )}
                </div>
                <div className="ml-4.5">
                  <div className="text-xs text-slate-500 mb-1.5 font-medium">
                    {item.date}
                  </div>
                  <h3 className="m-0 mb-2.5 text-xl font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="m-0 text-[#1f2937] leading-7 text-[15px] mb-2">
                    {item.body}
                  </p>
                  {item.link ? (
                    <button
                      className="mt-2.5 bg-transparent border-none text-sm cursor-pointer p-0 font-medium transition-colors hover:opacity-80"
                      style={{ color: "#156372" }}
                      type="button"
                    >
                      {item.link}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <button
              className="bg-transparent border-none text-sm cursor-pointer font-medium transition-colors hover:opacity-80 inline-flex items-center gap-1"
              style={{ color: "#156372" }}
              type="button"
            >
              More Updates →
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Help Resources Card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            {/* Illustration */}
            <div className="mb-4 h-32 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(21, 99, 114, 0.1) 10px, rgba(21, 99, 114, 0.1) 20px)`
                }} />
              </div>
              <div className="relative z-10 flex items-center gap-3">
                <BookOpen size={32} style={{ color: "#156372", opacity: 0.6 }} />
                <HelpCircle size={28} style={{ color: "#0D4A52", opacity: 0.5 }} />
                <div className="w-12 h-12 rounded-lg border-2 border-dashed" style={{ borderColor: "#156372", opacity: 0.3 }} />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={18} style={{ color: "#156372" }} />
              <h3 className="text-sm font-semibold uppercase tracking-wider m-0" style={{ color: "#156372" }}>
                HELP RESOURCES
              </h3>
            </div>

            <h4 className="text-base font-semibold text-slate-900 mb-2">
              Want to understand how Taban Books works?
            </h4>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Read our help resources to understand Taban Books in-depth and how you can make the most of the features.
            </p>

            <div className="flex flex-col gap-2">
              <button
                className="px-4 py-2.5 rounded-lg text-white text-sm font-medium cursor-pointer transition-all hover:opacity-90 shadow-md border-none inline-flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                type="button"
              >
                Visit Help Doc
                <ExternalLink size={16} />
              </button>
              <button
                className="px-4 py-2 text-sm font-medium cursor-pointer transition-colors hover:opacity-80 bg-transparent border-none text-left inline-flex items-center gap-2"
                style={{ color: "#156372" }}
                type="button"
              >
                FAQ
                <ExternalLink size={14} />
              </button>
            </div>
          </div>

          {/* Video Tutorials Card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <PlayCircle size={18} style={{ color: "#156372" }} />
              <h3 className="text-sm font-semibold uppercase tracking-wider m-0" style={{ color: "#156372" }}>
                VIDEO TUTORIALS
              </h3>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Visit our YouTube channel and watch the videos and webinars to learn everything about Taban Books.
            </p>

            <button
              className="w-full px-4 py-2 text-sm font-medium cursor-pointer transition-colors hover:opacity-80 bg-transparent border-none text-left inline-flex items-center gap-2"
              style={{ color: "#156372" }}
              type="button"
            >
              Go To YouTube Channel
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <HomeFooter />
    </div>
  );
}
