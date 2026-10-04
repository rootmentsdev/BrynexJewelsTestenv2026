/**
 * Run this script ONCE to drop the old unique index on invoiceNo
 * and let Mongoose create the new compound index (invoiceNo + locCode + type).
 *
 * Usage: node backend/scripts/drop-invoiceno-unique-index.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend folder
dotenv.config({ path: join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ No MongoDB URI found in environment variables.");
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const db = mongoose.connection.db;
  const collection = db.collection("transactions");

  // List current indexes
  const indexes = await collection.indexes();
  console.log("Current indexes:", indexes.map(i => i.name));

  // Drop the old single-field unique index on invoiceNo if it exists
  const hasOldIndex = indexes.some(i => i.name === "invoiceNo_1");
  if (hasOldIndex) {
    await collection.dropIndex("invoiceNo_1");
    console.log("✅ Dropped old unique index: invoiceNo_1");
  } else {
    console.log("ℹ️  Index invoiceNo_1 not found — nothing to drop.");
  }

  // The new compound index (invoiceNo + locCode + type) will be created
  // automatically by Mongoose when the server restarts.
  console.log("✅ Done. Restart the backend server to apply the new compound index.");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
