/**
 * Database Configuration
 * MongoDB connection setup for Taban Books
 */

import mongoose from "mongoose";

let isConnected: boolean = false;

/**
 * Connect to MongoDB database
 */
export async function connectDB(mongoUri: string): Promise<void> {
  if (isConnected) {
    console.log("✅ MongoDB already connected");
    return;
  }

  try {
    const options = {
      dbName: "Taban_Book",
    };

    await mongoose.connect(mongoUri, options);
    
    isConnected = true;
    console.log("✅ MongoDB connected successfully");
    const db = mongoose.connection.db;
    if (db) {
      console.log(`📊 Database: ${db.databaseName}`);
    }
    console.log(`🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);

    // Handle connection events
    mongoose.connection.on("error", (err: Error) => {
      console.error("❌ MongoDB connection error:", err.message);
      isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
      isConnected = true;
    });

  } catch (err: any) {
    console.error("❌ MongoDB connection error:", err.message);
    isConnected = false;
    process.exit(1);
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log("✅ MongoDB disconnected");
  } catch (err: any) {
    console.error("❌ Error disconnecting MongoDB:", err.message);
  }
}

/**
 * Get connection status
 */
export function getConnectionStatus(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

export default { connectDB, disconnectDB, getConnectionStatus };

