import dotenv from "dotenv";
import connectMongoDB from "../db/database.js";
import ShoeItem from "../model/ShoeItem.js";
import ItemGroup from "../model/ItemGroup.js";

dotenv.config({ path: ".env.development" });
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  dotenv.config();
}

async function test() {
  await connectMongoDB();

  const groups = await ItemGroup.find({});
  console.log(`Found ${groups.length} ItemGroups`);
  groups.forEach((g, idx) => {
    console.log(`\nGroup [${idx}]: name="${g.name}", category="${g.category}", items count=${(g.items || []).length}`);
    (g.items || []).forEach((item, iIdx) => {
      console.log(`  Item [${iIdx}]: name="${item.name}", sku="${item.sku}", costPrice=${item.costPrice}, warehouseStocks:`, JSON.stringify(item.warehouseStocks));
    });
  });

  process.exit(0);
}

test().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
