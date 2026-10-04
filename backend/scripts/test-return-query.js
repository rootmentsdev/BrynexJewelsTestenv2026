import mongoose from "mongoose";
import SalesInvoice from "../model/SalesInvoice.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const mongoUri = process.env.MONGODB_URI;

const testReturnQuery = async () => {
  try {
    console.log("🔄 Connecting to database...");
    
    if (!mongoUri) {
      throw new Error("MONGODB_URI not found in environment variables");
    }
    
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const fromDate = new Date("2026-04-01");
    const toDate = new Date("2026-04-18");
    fromDate.setUTCHours(0, 0, 0, 0);
    toDate.setUTCHours(23, 59, 59, 999);

    // Get all returns
    console.log("\n📊 ALL RETURNS:");
    const allReturns = await SalesInvoice.find({
      invoiceDate: { $gte: fromDate, $lte: toDate },
      category: "Return"
    }).sort({ invoiceDate: -1 });
    
    console.log(`Found ${allReturns.length} total returns`);
    allReturns.forEach(ret => {
      console.log(`  - ${ret.invoiceNumber}: warehouse="${ret.warehouse}", branch="${ret.branch}", locCode="${ret.locCode}"`);
    });

    // Test filtering by locCode 858
    console.log("\n🏪 RETURNS FOR STORE 858:");
    const query858 = {
      invoiceDate: { $gte: fromDate, $lte: toDate },
      category: "Return",
      $or: [
        { warehouse: "858" },
        { branch: "858" },
        { locCode: "858" }
      ]
    };
    
    const returns858 = await SalesInvoice.find(query858).sort({ invoiceDate: -1 });
    console.log(`Found ${returns858.length} returns for store 858`);
    returns858.forEach(ret => {
      console.log(`  - ${ret.invoiceNumber}: warehouse="${ret.warehouse}", branch="${ret.branch}", locCode="${ret.locCode}"`);
    });

    // Test filtering by locCode 700
    console.log("\n🏪 RETURNS FOR STORE 700:");
    const query700 = {
      invoiceDate: { $gte: fromDate, $lte: toDate },
      category: "Return",
      $or: [
        { warehouse: "700" },
        { branch: "700" },
        { locCode: "700" }
      ]
    };
    
    const returns700 = await SalesInvoice.find(query700).sort({ invoiceDate: -1 });
    console.log(`Found ${returns700.length} returns for store 700`);
    returns700.forEach(ret => {
      console.log(`  - ${ret.invoiceNumber}: warehouse="${ret.warehouse}", branch="${ret.branch}", locCode="${ret.locCode}"`);
    });

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

testReturnQuery();
