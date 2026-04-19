import mongoose from 'mongoose';

/**
 * Fixes the Journal Entry index to allow duplicate entryNumbers across different organizations.
 * Removes the global unique index 'entryNumber_1' if it exists.
 */
export async function fixJournalEntryIndex() {
    try {
        const db = mongoose.connection.db;
        if (!db) {
            console.warn('⚠️ fixJournalEntryIndex: Database connection not established.');
            return;
        }

        const collection = db.collection('journalentries');

        // Check if collection exists
        const collections = await db.listCollections({ name: 'journalentries' }).toArray();
        if (collections.length === 0) {
            // Collection doesn't exist yet, nothing to fix
            return;
        }

        const indexes = await collection.indexes();

        // Look for index on 'entryNumber' ONLY (not the compound one)
        // The problematic index is usually named 'entryNumber_1' and has key { entryNumber: 1 }
        const badIndex = indexes.find(idx => idx.name === 'entryNumber_1');

        if (badIndex) {
            console.log('⚠️ Found problematic global unique index "entryNumber_1" on journalentries. Dropping it...');
            await collection.dropIndex('entryNumber_1');
            console.log('✅ Index "entryNumber_1" dropped successfully. Uniqueness is now per-organization via compound index.');
        } else {
            console.log('✅ JournalEntry indexes check passed (no global "entryNumber_1").');
        }

    } catch (error) {
        console.error('❌ Error fixing JournalEntry index:', error);
    }
}
