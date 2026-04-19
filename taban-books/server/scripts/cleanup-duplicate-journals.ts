/**
 * Database Cleanup Script
 * Removes duplicate journal entries with entryNumber "1"
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import JournalEntry from "../models/JournalEntry.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/taban_books";

async function cleanup() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB\n");

        // Find all duplicate entries with entryNumber "1"
        const duplicates = await JournalEntry.find({ entryNumber: "1" });
        console.log(`Found ${duplicates.length} journal entries with entryNumber "1"`);

        if (duplicates.length > 0) {
            // Delete all but keep the first one
            const idsToDelete = duplicates.slice(1).map(d => d._id);

            if (idsToDelete.length > 0) {
                const result = await JournalEntry.deleteMany({ _id: { $in: idsToDelete } });
                console.log(`✅ Deleted ${result.deletedCount} duplicate entries`);
            }

            // If all are duplicates, delete all
            if (duplicates.length > 1 && idsToDelete.length === 0) {
                const result = await JournalEntry.deleteMany({ entryNumber: "1" });
                console.log(`✅ Deleted all ${result.deletedCount} entries with entryNumber "1"`);
            }
        }

        console.log("\n✅ Cleanup complete!");
    } catch (error) {
        console.error("❌ Error during cleanup:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\n👋 Disconnected from MongoDB");
    }
}

cleanup();
