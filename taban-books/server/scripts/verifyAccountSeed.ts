import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ChartOfAccount from '../models/ChartOfAccount.js';

dotenv.config();

const verifySeeding = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/taban_books";
        await mongoose.connect(mongoUri, { dbName: 'taban_books' });

        const count = await ChartOfAccount.countDocuments({ isSystemAccount: true });
        const accounts = await ChartOfAccount.find({ isSystemAccount: true }).limit(5).select('accountName accountType');

        console.log(`Verification Results:`);
        console.log(`Total System Accounts in DB: ${count}`);
        console.log(`Sample Accounts:`, JSON.stringify(accounts, null, 2));

        process.exit(0);
    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
};

verifySeeding();
