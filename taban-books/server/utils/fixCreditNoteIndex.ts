import mongoose from "mongoose";

/**
 * Fixes CreditNote indexes to enforce uniqueness per organization
 * instead of global uniqueness on creditNoteNumber.
 */
export async function fixCreditNoteIndex() {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.warn("[fixCreditNoteIndex] Database connection not established.");
      return;
    }

    const collectionName = "creditnotes";
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) return;

    const collection = db.collection(collectionName);
    const indexes = await collection.indexes();

    const globalIndex = indexes.find((idx) => idx.name === "creditNoteNumber_1");
    if (globalIndex) {
      console.log('[fixCreditNoteIndex] Dropping global index "creditNoteNumber_1"...');
      await collection.dropIndex("creditNoteNumber_1");
    }

    const compoundName = "organization_1_creditNoteNumber_1";
    const compoundIndex = indexes.find((idx) => idx.name === compoundName);
    if (compoundIndex && !compoundIndex.unique) {
      console.log(`[fixCreditNoteIndex] Rebuilding non-unique index "${compoundName}" as unique...`);
      await collection.dropIndex(compoundName);
    }

    await collection.createIndex(
      { organization: 1, creditNoteNumber: 1 },
      { unique: true, name: compoundName }
    );
  } catch (error) {
    console.error("[fixCreditNoteIndex] Failed to fix indexes:", error);
  }
}

