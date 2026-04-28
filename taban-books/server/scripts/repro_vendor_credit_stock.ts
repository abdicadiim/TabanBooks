import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import Organization from "../models/Organization.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Item from "../models/Item.js";
import Bill from "../models/Bill.js";
import VendorCredit from "../models/VendorCredit.js";
import { createVendorCredit } from "../controllers/purchases.controller.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const mockRequest = (body: any, user: any) =>
  ({
    body,
    user,
    params: {},
    query: {},
  }) as any;

const mockResponse = () => {
  const res: any = {};
  res.statusCode = 200;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.data = data;
    return res;
  };
  return res;
};

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI missing");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected");

  try {
    const org = await Organization.findOne();
    if (!org) throw new Error("No org found");

    const user = await User.findOne({ organization: org._id });
    if (!user) throw new Error("No user found");

    const bill = await Bill.findOne({
      organization: org._id,
      status: "paid",
      "items.0": { $exists: true },
    }).lean();
    if (!bill) throw new Error("No paid bill found");

    const vendor = await Vendor.findById(bill.vendor).lean();
    if (!vendor) throw new Error("Vendor not found");

    const billLine = Array.isArray(bill.items) ? bill.items[0] : null;
    if (!billLine) throw new Error("Bill has no items");

    const itemId = String((billLine as any).item || "").trim();
    if (!itemId) throw new Error("Bill line has no item id");

    const item = await Item.findById(itemId);
    if (!item) throw new Error("Item not found");

    const originalStock = Number(item.stockQuantity || 0);
    console.log("Bill:", bill.billNumber);
    console.log("Item:", item.name, item._id.toString(), "TrackInventory=", item.trackInventory);
    console.log("Original stock:", originalStock);

    const payload = {
      vendor: String(vendor._id),
      vendorName: (bill as any).vendorName || (vendor as any).displayName || (vendor as any).name,
      bill: String(bill._id),
      creditNote: `VC-REPRO-${Date.now()}`,
      orderNumber: (bill as any).orderNumber || "",
      date: new Date().toISOString().slice(0, 10),
      items: [
        {
          item: itemId,
          itemId,
          name: item.name,
          itemDetails: item.name,
          description: (billLine as any).description || "",
          quantity: 2,
          rate: Number((billLine as any).unitPrice || 0),
          amount: Number((billLine as any).unitPrice || 0) * 2,
          sku: item.sku || "",
          unit: item.unit || "",
        },
      ],
      subtotal: Number((billLine as any).unitPrice || 0) * 2,
      tax: 0,
      total: Number((billLine as any).unitPrice || 0) * 2,
      status: "open",
      accountsPayable: "Accounts Payable",
      taxPreference: "Tax Inclusive",
      taxLevel: "At Transaction Level",
      currency: (bill as any).currency || "USD",
    };

    const req = mockRequest(payload, {
      organizationId: String(org._id),
      userId: String(user._id),
    });
    const res = mockResponse();

    await createVendorCredit(req, res);

    console.log("Response status:", res.statusCode);
    console.log("Response body:", JSON.stringify(res.data, null, 2));

    const createdId = res?.data?.data?._id || res?.data?.data?.id;
    if (createdId) {
      const createdCredit = await VendorCredit.findById(createdId).lean();
      console.log("Saved credit items:", JSON.stringify(createdCredit?.items || [], null, 2));
    }

    const updatedItem = await Item.findById(item._id).lean();
    console.log("Updated stock:", updatedItem?.stockQuantity);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
