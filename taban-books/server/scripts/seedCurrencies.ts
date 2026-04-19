/**
 * Seed default currencies into the database
 * Run this script to populate the currencies collection
 */

import mongoose from "mongoose";
import Currency from "../models/Currency.js";
import Organization from "../models/Organization.js";
import dotenv from "dotenv";

dotenv.config();

const defaultCurrencies = [
  { code: "USD", name: "United States Dollar", symbol: "$", isBaseCurrency: true },
  { code: "EUR", name: "Euro", symbol: "€", isBaseCurrency: false },
  { code: "GBP", name: "British Pound", symbol: "£", isBaseCurrency: false },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", isBaseCurrency: false },
  { code: "SOS", name: "Somali Shilling", symbol: "SOS", isBaseCurrency: false },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", isBaseCurrency: false },
  { code: "AWG", name: "Aruban Guilder", symbol: "ƒ", isBaseCurrency: false },
];

async function seedCurrencies() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/taban-books";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Get all organizations
    const organizations = await Organization.find({});
    
    if (organizations.length === 0) {
      console.log("No organizations found. Please create an organization first.");
      return;
    }

    console.log(`Found ${organizations.length} organization(s)`);

    // Seed currencies for each organization
    for (const org of organizations) {
      console.log(`Seeding currencies for organization: ${org.name}`);
      
      // Check if currencies already exist for this organization
      const existingCurrencies = await Currency.find({ organization: org._id });
      
      if (existingCurrencies.length > 0) {
        console.log(`Currencies already exist for organization ${org.name}. Skipping...`);
        continue;
      }

      // Insert default currencies
      const currenciesToInsert = defaultCurrencies.map(currency => ({
        ...currency,
        organization: org._id,
      }));

      await Currency.insertMany(currenciesToInsert);
      console.log(`Inserted ${currenciesToInsert.length} currencies for organization ${org.name}`);
    }

    console.log("Currency seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding currencies:", error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the seed function
seedCurrencies();
