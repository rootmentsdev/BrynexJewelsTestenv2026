import mongoose from "mongoose";
import SalesInvoice from "../model/SalesInvoice.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, "../.env") });

const mongoUri = process.env.MONGODB_URI;

const fixReturnLocationCodes = async () => {
  try {
    console.log("🔄 Connecting to database...");
    
    if (!mongoUri) {
      throw new Error("MONGODB_URI not found in environment variables");
    }
    
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Find all return invoices
    const returns = await SalesInvoice.find({ category: "Return" });
    console.log(`Found ${returns.length} return invoices`);

    let updated = 0;
    let skipped = 0;

    for (const returnInvoice of returns) {
      // If locCode is already set, skip
      if (returnInvoice.locCode) {
        console.log(`⏭️  Skipping ${returnInvoice.invoiceNumber} - locCode already set to ${returnInvoice.locCode}`);
        skipped++;
        continue;
      }

      // Try to get locCode from warehouse or branch
      let locCode = returnInvoice.warehouse || returnInvoice.branch;

      if (!locCode) {
        console.log(`⚠️  ${returnInvoice.invoiceNumber} - No warehouse or branch found, using default`);
        locCode = "001";
      }

      // Update the return invoice
      await SalesInvoice.updateOne(
        { _id: returnInvoice._id },
        { $set: { locCode: locCode } }
      );

      console.log(`✅ Updated ${returnInvoice.invoiceNumber} with locCode: ${locCode}`);
      updated++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${returns.length}`);

    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

fixReturnLocationCodes();
