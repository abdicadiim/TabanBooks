
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ChartOfAccount from '../models/ChartOfAccount.js';
import Organization from '../models/Organization.js';

dotenv.config();

const accountsToSeed = [
    // Other Current Assets
    { name: "Sales to Customers (Cash)", type: "Other Current Asset" },
    { name: "Prepaid Expenses", type: "Other Current Asset" },
    { name: "Advance Tax", type: "Other Current Asset" },
    { name: "Employee Advance", type: "Other Current Asset" },

    // Cash Accounts
    { name: "Undeposited Funds", type: "Cash" },
    { name: "Petty Cash", type: "Cash" },

    // Accounts Receivable
    { name: "Accounts Receivable", type: "Accounts Receivable" },

    // Fixed Assets
    { name: "Furniture and Equipment", type: "Fixed Asset" },

    // Other Current Liabilities
    { name: "Tax Payable", type: "Other Current Liability" },
    { name: "Unearned Revenue", type: "Other Current Liability" },
    { name: "Opening Balance Adjustments", type: "Other Current Liability" },
    { name: "Employee Reimbursements", type: "Other Current Liability" },

    // Accounts Payable
    { name: "Accounts Payable", type: "Accounts Payable" },

    // Other Liabilities
    { name: "Dimension Adjustments", type: "Other Liability" },

    // Equity
    { name: "Retained Earnings", type: "Equity" },
    { name: "Owner's Equity", type: "Equity" },
    { name: "Opening Balance Offset", type: "Equity" },
    { name: "Drawings", type: "Equity" },

    // Income
    { name: "Other Charges", type: "Income" },
    { name: "Sales", type: "Income" },
    { name: "General Income", type: "Income" },
    { name: "Interest Income", type: "Income" },
    { name: "Late Fee Income", type: "Income" },
    { name: "Discount", type: "Income" },
    { name: "Shipping Charge", type: "Income" },

    // Expenses
    { name: "Lodging", type: "Expense" },
    { name: "Purchase Discounts", type: "Expense" },
    { name: "Office Supplies", type: "Expense" },
    { name: "Advertising And Marketing", type: "Expense" },
    { name: "Bank Fees and Charges", type: "Expense" },
    { name: "Credit Card Charges", type: "Expense" },
    { name: "Travel Expense", type: "Expense" },
    { name: "Telephone Expense", type: "Expense" },
    { name: "Automobile Expense", type: "Expense" },
    { name: "IT and Internet Expenses", type: "Expense" },
    { name: "Rent Expense", type: "Expense" },
    { name: "Janitorial Expense", type: "Expense" },
    { name: "Postage", type: "Expense" },
    { name: "Bad Debt", type: "Expense" },
    { name: "Printing and Stationery", type: "Expense" },
    { name: "Uncategorized", type: "Expense" },
    { name: "Salaries and Employee Wages", type: "Expense" },
    { name: "Meals and Entertainment", type: "Expense" },
    { name: "Depreciation Expense", type: "Expense" },
    { name: "Consultant Expense", type: "Expense" },
    { name: "Repairs and Maintenance", type: "Expense" },
    { name: "Other Expenses", type: "Expense" },
    { name: "Fuel/Mileage Expenses", type: "Expense" },

    // Cost of Goods Sold
    { name: "Cost of Goods Sold", type: "Cost Of Goods Sold" },

    // Other Expense
    { name: "Exchange Gain or Loss", type: "Other Expense" },

    // Stock/Inventory
    { name: "Inventory Asset", type: "Stock" }
];

const typeMapping: { [key: string]: string } = {
    "Other Current Asset": "other_current_asset",
    "Cash": "cash",
    "Accounts Receivable": "accounts_receivable",
    "Fixed Asset": "fixed_asset",
    "Other Current Liability": "other_current_liability",
    "Accounts Payable": "accounts_payable",
    "Other Liability": "other_liability",
    "Equity": "equity",
    "Income": "income",
    "Expense": "expense",
    "Cost Of Goods Sold": "cost_of_goods_sold",
    "Other Expense": "other_expense",
    "Stock": "stock"
};

const slugify = (text: string) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '_')           // Replace spaces with _
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '_')         // Replace multiple _ with single _
        .replace(/^-+/, '')             // Trim _ from start of text
        .replace(/-+$/, '');            // Trim _ from end of text
};

const seedAccounts = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/taban_books";
        console.log(`Connecting to MongoDB at ${mongoUri}...`);
        await mongoose.connect(mongoUri, { dbName: 'taban_books' });
        console.log("Connected to MongoDB.");

        const organizations = await Organization.find();
        if (organizations.length === 0) {
            console.log("No organizations found. Please seed organizations first (or run the app to create defaults).");
            process.exit(0);
        }

        console.log(`Found ${organizations.length} organization(s).`);

        for (const org of organizations) {
            console.log(`\nProcessing organization: ${org.name} (${org._id})`);

            // Cleanup duplicates before seeding (if any)
            console.log(`  Checking for existing accounts...`);

            let createdCount = 0;
            let updatedCount = 0;

            for (const account of accountsToSeed) {
                const mappedType = typeMapping[account.type];
                if (!mappedType) {
                    console.warn(`  Warning: Unknown type '${account.type}' for account '${account.name}'. Skipping.`);
                    continue;
                }

                const accountCode = slugify(account.name).substring(0, 50);

                const result = await ChartOfAccount.findOneAndUpdate(
                    {
                        organization: org._id,
                        accountName: account.name
                    },
                    {
                        $set: {
                            accountCode: accountCode,
                            accountType: mappedType,
                            isActive: true,
                            isSystemAccount: true,
                            currency: org.currency || "USD"
                        },
                        $setOnInsert: {
                            description: `Seeded account: ${account.name}`,
                            balance: 0
                        }
                    },
                    {
                        upsert: true,
                        new: true,
                        runValidators: true
                    }
                );

                if (result) createdCount++;
            }
            console.log(`  Done. Processed ${createdCount} accounts for ${org.name}.`);
        }

        console.log("\nSeeding complete successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Error during seeding:", error);
        process.exit(1);
    }
};

seedAccounts();
