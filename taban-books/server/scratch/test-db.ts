import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testConnection() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/Taban_Book";
  console.log('Testing connection to:', uri);
  try {
    await mongoose.connect(uri);
    console.log('✅ Connected successfully');
    const db = mongoose.connection.db;
    if (db) {
        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
}

testConnection();
