/**
 * Test to verify warehouse filtering logic
 * Issue: Only 142 items showing instead of 256 when "Warehouse" is selected
 */

// Mock the mapWarehouse function
const mapWarehouse = (locName) => {
  if (!locName) return "";
  
  const locationToWarehouseMapping = {
    "Warehouse": "Warehouse",
    "warehouse": "Warehouse",
    "WAREHOUSE": "Warehouse",
  };
  
  if (locationToWarehouseMapping[locName]) {
    return locationToWarehouseMapping[locName];
  }
  
  const locNameLower = locName.toLowerCase().trim();
  for (const [key, value] of Object.entries(locationToWarehouseMapping)) {
    if (key.toLowerCase() === locNameLower) {
      return value;
    }
  }
  
  let warehouse = locName.replace(/^[A-Z]\.?\s*/i, "").trim();
  if (warehouse && warehouse.toLowerCase() !== "warehouse" && !warehouse.toLowerCase().includes("branch")) {
    warehouse = `${warehouse} Branch`;
  }
  return warehouse;
};

// The filtering function from TransferOrderCreate.jsx
const filterItemsByWarehouse = (itemsList, targetWarehouse, isStoreUser = false) => {
  if (!targetWarehouse) return itemsList;
  
  const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
  
  // If "Warehouse" is selected (main warehouse view), show ALL items - NO FILTERING
  if (targetWarehouseLower === "warehouse") {
    console.log("🏢 Warehouse selected - showing ALL items without filtering (combined stock)");
    console.log(`   Total items to show: ${itemsList.length}`);
    return itemsList; // Return all items without any filtering
  }
  
  // For specific branches/stores, show ALL items that exist in that warehouse
  const filtered = itemsList.filter(item => {
    if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || item.warehouseStocks.length === 0) {
      return false;
    }
    
    return item.warehouseStocks.some(ws => {
      if (!ws.warehouse) return false;
      const stockWarehouseRaw = (ws.warehouse || "").toString().trim();
      const stockWarehouse = stockWarehouseRaw.toLowerCase().trim();
      
      // For store users - NEVER show warehouse stock (confidential)
      if (isStoreUser && (stockWarehouse === "warehouse" || stockWarehouse.includes("warehouse"))) {
        return false;
      }
      
      // For specific branches, show ALL items from that branch (regardless of stock)
      // Check exact match first
      if (stockWarehouse === targetWarehouseLower) {
        return true;
      }
      
      // Check base name match (e.g., "kannur" matches "kannur branch")
      const stockBase = stockWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
      const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
      
      if (stockBase && targetBase && stockBase === targetBase) {
        return true;
      }
      
      // Partial match - check if warehouse name contains target or vice versa
      if (stockWarehouse.includes(targetWarehouseLower) || targetWarehouseLower.includes(stockWarehouse)) {
        return true;
      }
      
      return false;
    });
  });
  
  console.log(`🔍 Filtered items for "${targetWarehouse}": ${filtered.length} items`);
  if (filtered.length < 10) {
    console.log(`   Sample warehouse names in data:`, itemsList.slice(0, 5).map(i => i.warehouseStocks?.map(ws => ws.warehouse)));
  }
  
  return filtered;
};

// Test with mock data
console.log("\n=== WAREHOUSE FILTER TEST ===\n");

// Create 256 mock items with various warehouse configurations
const mockItems = Array.from({ length: 256 }, (_, i) => ({
  _id: `item-${i}`,
  itemName: `Item ${i}`,
  sku: `SKU-${i}`,
  isActive: true,
  warehouseStocks: [
    {
      warehouse: 'Warehouse',
      stockOnHand: 10,
      availableForSale: 5,
    },
    {
      warehouse: 'Kottayam Branch',
      stockOnHand: 5,
      availableForSale: 3,
    },
  ],
}));

console.log(`📦 Total mock items: ${mockItems.length}`);

// Test 1: Filter with "Warehouse" selected (should return ALL items)
console.log("\n--- Test 1: Warehouse selected ---");
const warehouseFiltered = filterItemsByWarehouse(mockItems, "Warehouse", false);
console.log(`Result: ${warehouseFiltered.length} items`);
console.log(`Expected: ${mockItems.length} items`);
console.log(`✅ PASS: ${warehouseFiltered.length === mockItems.length ? "YES" : "NO"}`);

// Test 2: Filter with "Kottayam Branch" selected
console.log("\n--- Test 2: Kottayam Branch selected ---");
const kottayamFiltered = filterItemsByWarehouse(mockItems, "Kottayam Branch", false);
console.log(`Result: ${kottayamFiltered.length} items`);
console.log(`Expected: ${mockItems.length} items (all have Kottayam stock)`);
console.log(`✅ PASS: ${kottayamFiltered.length === mockItems.length ? "YES" : "NO"}`);

// Test 3: Check if items without warehouseStocks are filtered out
console.log("\n--- Test 3: Items without warehouseStocks ---");
const itemsWithoutStocks = [
  ...mockItems,
  { _id: 'no-stock-1', itemName: 'No Stock Item 1', warehouseStocks: [] },
  { _id: 'no-stock-2', itemName: 'No Stock Item 2', warehouseStocks: null },
  { _id: 'no-stock-3', itemName: 'No Stock Item 3' }, // No warehouseStocks property
];
const filteredWithoutStocks = filterItemsByWarehouse(itemsWithoutStocks, "Warehouse", false);
console.log(`Total items with some without stocks: ${itemsWithoutStocks.length}`);
console.log(`Filtered result: ${filteredWithoutStocks.length} items`);
console.log(`Items filtered out: ${itemsWithoutStocks.length - filteredWithoutStocks.length}`);

// Test 4: Real-world scenario - check what's happening with actual data structure
console.log("\n--- Test 4: Debugging actual issue ---");
console.log("Possible reasons for 142 items instead of 256:");
console.log("1. Some items don't have warehouseStocks property");
console.log("2. Some items have empty warehouseStocks array");
console.log("3. Some items have warehouseStocks but no 'Warehouse' entry");
console.log("4. The API is only returning 142 items (not 256)");

// Create a more realistic test with mixed data
const realisticItems = [
  // 100 items with Warehouse stock
  ...Array.from({ length: 100 }, (_, i) => ({
    _id: `item-${i}`,
    itemName: `Item ${i}`,
    warehouseStocks: [{ warehouse: 'Warehouse', stockOnHand: 10 }],
  })),
  // 50 items with only branch stock (no Warehouse)
  ...Array.from({ length: 50 }, (_, i) => ({
    _id: `item-${i + 100}`,
    itemName: `Item ${i + 100}`,
    warehouseStocks: [{ warehouse: 'Kottayam Branch', stockOnHand: 5 }],
  })),
  // 50 items with both Warehouse and branch stock
  ...Array.from({ length: 50 }, (_, i) => ({
    _id: `item-${i + 150}`,
    itemName: `Item ${i + 150}`,
    warehouseStocks: [
      { warehouse: 'Warehouse', stockOnHand: 10 },
      { warehouse: 'Kottayam Branch', stockOnHand: 5 },
    ],
  })),
  // 56 items with no warehouseStocks
  ...Array.from({ length: 56 }, (_, i) => ({
    _id: `item-${i + 200}`,
    itemName: `Item ${i + 200}`,
    warehouseStocks: [],
  })),
];

console.log(`\nRealistic test with ${realisticItems.length} items:`);
const realisticFiltered = filterItemsByWarehouse(realisticItems, "Warehouse", false);
console.log(`Filtered result: ${realisticFiltered.length} items`);
console.log(`Expected: 200 items (100 + 50 + 50 with warehouse stocks)`);
console.log(`Items without warehouseStocks: 56 (filtered out)`);

console.log("\n=== CONCLUSION ===");
console.log("If you're seeing 142 items instead of 256:");
console.log("- Check browser console for: '📦 Fetched X items from API'");
console.log("- Check: '✅ Active items: X'");
console.log("- Check: '🏢 Items after warehouse filter (Warehouse): X'");
console.log("- The issue is likely that 114 items (256 - 142) don't have warehouseStocks");
console.log("- OR the API is only returning 142 items, not 256");
