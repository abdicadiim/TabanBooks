import { Request, Response } from "express";
import Invoice from "../models/Invoice.js";
import Item from "../models/Item.js";

const defaultFeatures = [
  {
    title: "Catalog control",
    text: "Centralize all book data, pricing, editions, and suppliers with clean searchable records.",
  },
  {
    title: "Sales and invoicing",
    text: "Process in-store and online orders quickly while keeping finance data synchronized.",
  },
  {
    title: "Inventory intelligence",
    text: "Prevent stockouts and overbuying with alerts, trends, and reorder recommendations.",
  },
];

const defaultWorkflow = [
  {
    title: "1. Onboarding and Setup",
    points: [
      "Create branches, team roles, and permissions.",
      "Add suppliers, categories, and tax/finance defaults.",
      "Import current catalog and stock from files.",
    ],
  },
  {
    title: "2. Daily Operations",
    points: [
      "Add new books, editions, and pricing updates.",
      "Process walk-in and online orders from one dashboard.",
      "Generate invoices and store customer history automatically.",
    ],
  },
  {
    title: "3. Inventory and Control",
    points: [
      "Track low stock, damaged stock, and out-of-stock titles.",
      "Trigger restock actions based on demand trends.",
      "Monitor branch-level movement and product performance.",
    ],
  },
  {
    title: "4. Reporting and Growth",
    points: [
      "Review real-time sales, margin, and top-title reports.",
      "Measure staff performance and conversion rates.",
      "Use insights to optimize pricing and purchasing decisions.",
    ],
  },
];

const pricingPlans = [
  {
    name: "Starter",
    description: "Perfect for small teams getting started",
    monthlyPrice: "$19",
    annualPrice: "$15",
    period: "per month",
    features: [
      { name: "Up to 5 team members", included: true },
      { name: "10GB storage", included: true },
      { name: "Basic analytics", included: true },
      { name: "Email support", included: true },
      { name: "Advanced reporting", included: false },
      { name: "Custom workflows", included: false },
      { name: "API access", included: false },
      { name: "Priority support", included: false },
    ],
  },
  {
    name: "Professional",
    description: "Ideal for growing businesses",
    monthlyPrice: "$49",
    annualPrice: "$39",
    period: "per month",
    features: [
      { name: "Up to 20 team members", included: true },
      { name: "50GB storage", included: true },
      { name: "Advanced analytics", included: true },
      { name: "Priority support", included: true },
      { name: "Advanced reporting", included: true },
      { name: "Custom workflows", included: true },
      { name: "API access", included: false },
      { name: "Dedicated account manager", included: false },
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations with complex needs",
    monthlyPrice: "$99",
    annualPrice: "$79",
    period: "per month",
    features: [
      { name: "Unlimited team members", included: true },
      { name: "500GB storage", included: true },
      { name: "Advanced analytics", included: true },
      { name: "24/7 phone support", included: true },
      { name: "Advanced reporting", included: true },
      { name: "Custom workflows", included: true },
      { name: "API access", included: true },
      { name: "Dedicated account manager", included: true },
    ],
  },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const getWebsiteHomeData = async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const [monthlySalesAgg, activeTitlesCount, ordersTodayCount, lowStockAlertsCount] = await Promise.all([
      Invoice.aggregate([
        {
          $match: {
            status: { $nin: ["draft", "void"] },
            date: { $gte: startOfMonth, $lt: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ["$total", 0] } },
          },
        },
      ]),
      Item.countDocuments({ isActive: { $ne: false } }),
      Invoice.countDocuments({
        status: { $nin: ["draft", "void"] },
        date: { $gte: startOfDay, $lt: endOfDay },
      }),
      Item.countDocuments({
        trackInventory: true,
        reorderPoint: { $gt: 0 },
        $expr: { $lte: ["$stockQuantity", "$reorderPoint"] },
      }),
    ]);

    const monthlySales = monthlySalesAgg?.[0]?.total || 0;

    res.json({
      success: true,
      data: {
        hero: {
          badge: "Bookstore management platform",
          title: "Run your complete book business from one modern dashboard.",
          subtitle:
            "Taban Books helps teams manage catalogs, sales, inventory, and customer relationships with clear workflows and live reporting.",
        },
        stats: [
          { label: "Monthly Sales", value: formatCurrency(monthlySales) },
          { label: "Active Titles", value: activeTitlesCount.toLocaleString("en-US") },
          { label: "Orders Today", value: ordersTodayCount.toLocaleString("en-US") },
          { label: "Low-Stock Alerts", value: lowStockAlertsCount.toLocaleString("en-US") },
        ],
        features: defaultFeatures,
        workflow: defaultWorkflow,
        plans: pricingPlans,
      },
    });
  } catch (error: any) {
    console.error("[WEBSITE] Error fetching homepage data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch website home data",
      error: error?.message || "Unknown error",
    });
  }
};
