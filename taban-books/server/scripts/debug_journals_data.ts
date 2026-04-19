
import mongoose from "mongoose";
import dotenv from "dotenv";
import JournalEntry from "../models/JournalEntry.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taban_books";

const run = async () => {
    try {
        console.log("Connecting to DB...", MONGO_URI);
        await mongoose.connect(MONGO_URI);
        console.log("Connected.");

        // Check Users
        const users = await User.find({}).select("name email organization").lean();
        console.log(`\n--- Found ${users.length} Users ---`);
        users.forEach(u => {
            console.log(`User: ${u.name} (${u.email}) | OrgID: ${u.organization}`);
        });

        // Check Organizations
        const orgs = await Organization.find({}).select("name").lean();
        console.log(`\n--- Found ${orgs.length} Organizations ---`);
        orgs.forEach(o => {
            console.log(`Org: ${o.name} | ID: ${o._id}`);
        });

        // Check Journals
        const journals = await JournalEntry.find({}).select("entryNumber date organization").lean();
        console.log(`\n--- Found ${journals.length} Journal Entries ---`);
        if (journals.length === 0) {
            console.log("No journals found!");
        } else {
            // Group by Org
            const journalsByOrg: { [key: string]: number } = {};
            journals.forEach(j => {
                const orgId = j.organization ? j.organization.toString() : "undefined";
                journalsByOrg[orgId] = (journalsByOrg[orgId] || 0) + 1;
            });

            console.log("Journals by Organization:");
            Object.entries(journalsByOrg).forEach(([orgId, count]) => {
                console.log(`  OrgID: ${orgId}: ${count} entries`);
            });

            console.log("\nSample Journals:");
            journals.slice(0, 5).forEach(j => {
                console.log(`  ${j.entryNumber} | Date: ${j.date} | OrgID: ${j.organization}`);
            });
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("\nDone.");
    }
};

run();
