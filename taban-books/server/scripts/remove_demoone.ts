#!/usr/bin/env node
/**
 * remove_demoone.ts
 * Safe one-off script to find and (optionally) remove documents matching 'demoone'
 * Usage:
 *   ts-node remove_demoone.ts             # dry-run using default mongo://127.0.0.1:27017
 *   ts-node remove_demoone.ts --mongo <uri> --confirm
 */

import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { connectDB, disconnectDB } from "../config/database";

const args = process.argv.slice(2);
const argMap: Record<string,string|boolean> = {};
for (let i=0;i<args.length;i++) {
  const a = args[i];
  if (a.startsWith("--")) {
    const key = a.replace(/^--/,"");
    const next = args[i+1] && !args[i+1].startsWith("--") ? args[i+1] : true;
    argMap[key] = next as string | boolean;
    if (next !== true) i++;
  }
}

const mongoUri = (argMap.mongo as string) || process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const confirm = !!argMap.confirm;
const term = (argMap.term as string) || "demoone";

async function run() {
  console.log(`Using Mongo URI: ${mongoUri}`);
  await connectDB(mongoUri);

  // Import models dynamically to avoid top-level requires before connection
  const Organization = (await import("../models/Organization")).default;
  const Customer = (await import("../models/Customer")).default;
  const Invoice = (await import("../models/Invoice")).default;
  const RecurringInvoice = (await import("../models/RecurringInvoice")).default;
  const User = (await import("../models/User")).default;
  const Item = (await import("../models/Item")).default;

  const regex = new RegExp(term, 'i');

  const checks = [
    { name: 'Organization', model: Organization, query: { name: regex } },
    { name: 'Customer', model: Customer, query: { $or: [{ name: regex }, { displayName: regex }, { email: regex }] } },
    { name: 'User', model: User, query: { $or: [{ name: regex }, { email: regex }] } },
    { name: 'Invoice', model: Invoice, query: { $or: [{ invoiceNumber: regex }, { customerName: regex }, { 'customer.displayName': regex }] } },
    { name: 'RecurringInvoice', model: RecurringInvoice, query: { $or: [{ profileName: regex }, { 'customer.displayName': regex }] } },
    { name: 'Item', model: Item, query: { $or: [{ name: regex }, { description: regex }] } },
  ];

  const results: Array<{collection:string,count:number,sample:any[]}> = [];

  for (const chk of checks) {
    try {
      const count = await chk.model.countDocuments(chk.query as any);
      const sample = await chk.model.find(chk.query as any).limit(5).lean();
      results.push({ collection: chk.name, count, sample });
    } catch (err) {
      console.error(`Error searching ${chk.name}:`, err.message || err);
    }
  }

  console.log('\nSearch summary for term:', term);
  for (const r of results) {
    console.log(`- ${r.collection}: ${r.count} match(es)`);
    if (r.sample && r.sample.length > 0) {
      console.log(`  samples (up to 5):`);
      r.sample.forEach((s:any) => {
        const id = s._id || s.id || '(no id)';
        const label = s.name || s.displayName || s.invoiceNumber || s.profileName || s.email || JSON.stringify(s).slice(0,60);
        console.log(`    - ${id}  ${label}`);
      });
    }
  }

  if (!confirm) {
    console.log('\nDry-run complete. No deletions were made.');
    console.log('To actually delete these records, re-run with --confirm');
    await disconnectDB();
    process.exit(0);
  }

  // Confirm deletion
  console.log('\n--confirm provided. Proceeding to delete matching documents.');

  for (const chk of checks) {
    try {
      const res = await chk.model.deleteMany(chk.query as any);
      console.log(`Deleted ${res.deletedCount || 0} documents from ${chk.name}`);
    } catch (err) {
      console.error(`Error deleting from ${chk.name}:`, err.message || err);
    }
  }

  console.log('\nDeletion complete.');
  await disconnectDB();
  process.exit(0);
}

run().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
