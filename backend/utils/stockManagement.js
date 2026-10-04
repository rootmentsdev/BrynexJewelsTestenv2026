import ShoeItem from "../model/ShoeItem.js";
import ItemGroup from "../model/ItemGroup.js";
import { checkAndCreateReorderAlerts } from "./reorderNotification.js";
import { updateMonthlyStockForSale } from "./monthlyStockTracking.js";

/**
 * Helper function to find warehouse stock index with proper name matching
 * Handles all branch variations and normalizes warehouse names
 */
const findWarehouseStockIndex = (warehouseStocks, targetWarehouse) => {
  if (!warehouseStocks || !Array.isArray(warehouseStocks) || !targetWarehouse) {
    return -1;
  }
  
  const warehouseLower = targetWarehouse.toLowerCase().trim();
  
  // Use the SAME warehouse mapping as InventoryReportController.js
  const WAREHOUSE_NAME_MAPPING = {
    "Grooms Trivandum": "Grooms Trivandrum",
    "Grooms Trivandrum": "Grooms Trivandrum",
    "SG-Trivandrum": "Grooms Trivandrum",
    "G.Perinthalmanna": "Perinthalmanna Branch",
    "GPerinthalmanna": "Perinthalmanna Branch", 
    "Perinthalmanna Branch": "Perinthalmanna Branch",
    "Z.Perinthalmanna": "Perinthalmanna Branch"
  };
  
  // Normalize warehouse name first
  const normalizeWarehouseName = (name) => {
    if (!name) return null;
    return WAREHOUSE_NAME_MAPPING[name.trim()] || name.trim();
  };
  
  const normalizedTarget = normalizeWarehouseName(targetWarehouse);
  
  // Define all warehouse variations for each location  
  const warehouseVariations = {
    // Trivandrum
    trivandrum: ["grooms trivandrum", "grooms trivandum", "trivandrum branch", "sg-trivandrum", "sg.trivandrum"],
    // Perinthalmanna
    perinthalmanna: ["perinthalmanna branch", "g.perinthalmanna", "g-perinthalmanna", "gperinthalmanna", "z.perinthalmanna", "z-perinthalmanna"],
    // Palakkad
    palakkad: ["palakkad branch", "g.palakkad", "g-palakkad", "gpalakkad"],
    // Calicut
    calicut: ["calicut", "g.calicut", "g-calicut", "gcalicut"],
    // Manjeri
    manjeri: ["manjery branch", "g.manjeri", "g.manjery", "gmanjeri", "gmanjery"],
    // Kannur
    kannur: ["kannur branch", "g.kannur", "gkannur"],
    // Edappal
    edappal: ["edappal branch", "g.edappal", "g-edappal", "gedappal"],
    // Edapally
    edapally: ["edapally branch", "g.edappally", "g-edappally", "gedappally"],
    // Kalpetta
    kalpetta: ["kalpetta branch", "g.kalpetta", "gkalpetta"],
    // Kottakkal
    kottakkal: ["kottakkal branch", "g.kottakkal", "gkottakkal", "z.kottakkal"],
    // Chavakkad
    chavakkad: ["chavakkad branch", "g.chavakkad", "gchavakkad"],
    // Thrissur
    thrissur: ["thrissur branch", "g.thrissur", "gthrissur"],
    // Perumbavoor
    perumbavoor: ["perumbavoor branch", "g.perumbavoor", "gperumbavoor"],
    // Kottayam
    kottayam: ["kottayam branch", "g.kottayam", "gkottayam"],
    // Vadakara
    vadakara: ["vadakara branch", "g.vadakara", "gvadakara"],
    // MG Road
    mgroad: ["mg road", "suitorguy mg road", "g.mg road", "g.mg", "g-mg road", "gmg road", "gmg"],
    // Z-Edapally
    zedapally: ["z-edapally branch", "z-edapally", "z-edapally1"],
    // Z-Edappal
    zedappal: ["z-edappal branch", "z-edappal", "z- edappal"],
  };
  
  // Find which category this warehouse belongs to
  let matchedCategory = null;
  for (const [category, variations] of Object.entries(warehouseVariations)) {
    if (variations.includes(warehouseLower)) {
      matchedCategory = category;
      break;
    }
  }
  
  return warehouseStocks.findIndex(ws => {
    if (!ws.warehouse) return false;
    const wsLower = ws.warehouse.toLowerCase().trim();
    
    // If we found a category match, check against all variations in that category
    if (matchedCategory) {
      return warehouseVariations[matchedCategory].includes(wsLower);
    }
    
    // Fallback: exact match or partial match
    return wsLower === warehouseLower || wsLower.includes(warehouseLower) || warehouseLower.includes(wsLower);
  });
};

/**
 * Update stock when invoice is created
 * Reduces availableForSale and increases committedStock
 */
export const updateStockOnInvoiceCreate = async (lineItems, warehouse) => {
  try {
    console.log(`🔄 Starting stock update for warehouse: ${warehouse}`);
    console.log(`📦 Processing ${lineItems?.length || 0} items`);

    if (!lineItems || lineItems.length === 0) {
      console.warn("No line items to process");
      return;
    }

    for (const item of lineItems) {
      console.log(`Processing item: ${item.item}, itemData: ${JSON.stringify(item.itemData)}`);
      
      const quantity = parseFloat(item.quantity) || 0;
      if (quantity <= 0) {
        console.warn(`Skipping item ${item.item} - quantity is 0 or invalid`);
        continue;
      }

      // Check if item is from a group
      const itemGroupId = item.itemData?.itemGroupId || item.itemGroupId;
      const itemName = item.itemData?.itemName || item.itemData?.name || item.item;
      const itemSku = item.itemData?.sku || item.itemSku;
      
      if (itemGroupId) {
        // Item is from a group - update stock in the group
        console.log(`  Item is from group: ${itemGroupId}, name: "${itemName}", sku: "${itemSku}"`);
        
        const group = await ItemGroup.findById(itemGroupId);
        if (!group) {
          console.warn(`❌ Item group not found: ${itemGroupId}`);
          continue;
        }
        
        console.log(`  Group found: "${group.name}", items count: ${group.items?.length || 0}`);
        console.log(`  Group items: ${JSON.stringify(group.items?.map(gi => ({ _id: gi._id?.toString(), name: gi.name, sku: gi.sku })))}`);
        
        // Get item ID from itemData
        const itemId = item.itemData?._id?.toString() || "";
        
        // Find the item in the group - try multiple matching strategies
        let groupItemIndex = -1;
        
        // Strategy 0: Match by item _id if available
        if (itemId && groupItemIndex === -1) {
          groupItemIndex = group.items.findIndex(gi => {
            const giId = gi._id?.toString() || "";
            // Check exact match or composite ID match (groupId_index format)
            return giId === itemId || itemId.includes(giId) || giId.includes(itemId);
          });
          if (groupItemIndex !== -1) console.log(`  ✅ Found by _id: "${itemId}"`);
        }
        
        // Strategy 1: Match by SKU if available
        if (itemSku && groupItemIndex === -1) {
          groupItemIndex = group.items.findIndex(gi => 
            gi.sku && gi.sku.toLowerCase().trim() === itemSku.toLowerCase().trim()
          );
          if (groupItemIndex !== -1) console.log(`  ✅ Found by SKU: "${itemSku}"`);
        }
        
        // Strategy 2: Exact name match
        if (groupItemIndex === -1 && itemName) {
          groupItemIndex = group.items.findIndex(gi => 
            gi.name && gi.name.toLowerCase().trim() === itemName.toLowerCase().trim()
          );
          if (groupItemIndex !== -1) console.log(`  ✅ Found by exact name: "${itemName}"`);
        }
        
        // Strategy 3: Partial name match
        if (groupItemIndex === -1 && itemName) {
          const itemNameLower = itemName.toLowerCase().trim();
          groupItemIndex = group.items.findIndex(gi => {
            if (!gi.name) return false;
            const giNameLower = gi.name.toLowerCase().trim();
            return itemNameLower.includes(giNameLower) || giNameLower.includes(itemNameLower);
          });
          if (groupItemIndex !== -1) console.log(`  ✅ Found by partial match: "${group.items[groupItemIndex].name}"`);
        }
        
        // Strategy 4: Match by name without group prefix
        if (groupItemIndex === -1 && itemName) {
          const itemNameWithoutPrefix = itemName.replace(/^[^-]+-\s*/, "").trim();
          groupItemIndex = group.items.findIndex(gi => 
            gi.name && gi.name.toLowerCase().trim() === itemNameWithoutPrefix.toLowerCase()
          );
          if (groupItemIndex !== -1) console.log(`  ✅ Found by name without prefix: "${itemNameWithoutPrefix}"`);
        }
        
        if (groupItemIndex === -1) {
          console.warn(`❌ Item "${itemName}" not found in group "${group.name}"`);
          console.log(`   Item ID: "${itemId}"`);
          console.log(`   Available items: ${group.items.map(gi => `"${gi.name}" (SKU: ${gi.sku || 'N/A'}, _id: ${gi._id?.toString() || 'N/A'})`).join(", ")}`);
          continue;
        }
        
        const groupItem = group.items[groupItemIndex];
        console.log(`  Found item in group: ${groupItem.name}`);
        console.log(`  Available warehouses: ${groupItem.warehouseStocks?.map(ws => ws.warehouse).join(", ") || "none"}`);
        
        if (!groupItem.warehouseStocks || !Array.isArray(groupItem.warehouseStocks)) {
          console.warn(`❌ Item "${itemName}" has no warehouseStocks`);
          continue;
        }
        
        // Find the warehouse stock using helper function
        let warehouseStockIndex = findWarehouseStockIndex(groupItem.warehouseStocks, warehouse);
        
        if (warehouseStockIndex === -1) {
          console.warn(`❌ Warehouse "${warehouse}" not found for item "${itemName}"`);
          console.log(`   Available: ${groupItem.warehouseStocks.map(ws => `"${ws.warehouse}"`).join(", ")}`);
          continue;
        }
        
        const warehouseStock = groupItem.warehouseStocks[warehouseStockIndex];
        const currentStock = parseFloat(warehouseStock.stockOnHand) || 0;
        const quantityToReduce = parseFloat(quantity);
        
        console.log(`  Before: StockOnHand=${currentStock}, Available=${warehouseStock.availableForSale}, Committed=${warehouseStock.committedStock}`);
        console.log(`  Reducing by: ${quantityToReduce}`);
        
        // Update stock: reduce stockOnHand directly (no committed stock)
        const newStock = Math.max(0, currentStock - quantityToReduce);
        warehouseStock.stockOnHand = newStock;
        warehouseStock.availableForSale = newStock;
        
        // ✅ ALSO UPDATE PHYSICAL STOCK FIELDS
        const currentPhysicalStock = parseFloat(warehouseStock.physicalStockOnHand) || 0;
        const newPhysicalStock = Math.max(0, currentPhysicalStock - quantityToReduce);
        warehouseStock.physicalStockOnHand = newPhysicalStock;
        warehouseStock.physicalAvailableForSale = newPhysicalStock;
        
        console.log(`  After: StockOnHand=${warehouseStock.stockOnHand}, Available=${warehouseStock.availableForSale}, Physical=${warehouseStock.physicalStockOnHand}, Committed=${warehouseStock.committedStock}`);
        
        // Mark the nested array as modified so Mongoose saves the changes
        group.markModified('items');
        
        // Save the group
        await group.save();
        
        // Verify the save worked
        const verifyGroup = await ItemGroup.findById(itemGroupId);
        const verifyGroupItem = verifyGroup.items[groupItemIndex];
        const verifyWarehouseStock = verifyGroupItem.warehouseStocks[warehouseStockIndex];
        console.log(`✅ Stock updated for group item "${itemName}": -${quantityToReduce} (New stock: ${verifyWarehouseStock.stockOnHand})`);
        
        if (verifyWarehouseStock.stockOnHand !== newStock) {
          console.error(`❌ VERIFICATION FAILED! Expected ${newStock}, but got ${verifyWarehouseStock.stockOnHand}`);
        }
        
        // Update monthly opening stock for sales
        try {
          const itemId = groupItem._id?.toString() || groupItem.id?.toString();
          await updateMonthlyStockForSale(itemGroupId, itemId, warehouse, quantity, itemName);
        } catch (monthlyError) {
          console.error(`   ⚠️ Error updating monthly stock (non-critical):`, monthlyError);
        }
        
        continue;
      }
      
      // Standalone item
      if (!item.itemData || !item.itemData._id) {
        console.warn(`Skipping item ${item.item} - no itemData._id and not from group`);
        continue;
      }

      const itemId = item.itemData._id;
      console.log(`  Item ID: ${itemId}, Quantity: ${quantity}`);

      // Find the standalone item
      const shoeItem = await ShoeItem.findById(itemId);
      if (!shoeItem) {
        console.warn(`❌ Standalone item not found: ${itemId}`);
        continue;
      }

      console.log(`  Found standalone item: ${shoeItem.itemName}`);
      console.log(`  Available warehouses: ${shoeItem.warehouseStocks?.map(ws => ws.warehouse).join(", ") || "none"}`);

      if (!shoeItem.warehouseStocks || !Array.isArray(shoeItem.warehouseStocks)) {
        console.warn(`❌ Item "${shoeItem.itemName}" has no warehouseStocks`);
        continue;
      }

      // Find the warehouse stock using helper function
      let warehouseStockIndex = findWarehouseStockIndex(shoeItem.warehouseStocks, warehouse);

      // If exact match not found, try partial matching
      if (warehouseStockIndex === -1) {
        const warehouseLower = warehouse.toLowerCase().trim();
        warehouseStockIndex = shoeItem.warehouseStocks.findIndex((ws) => {
          if (!ws.warehouse) return false;
          const wsLower = ws.warehouse.toLowerCase().trim();
          return wsLower.includes(warehouseLower) || warehouseLower.includes(wsLower);
        });
      }

      if (warehouseStockIndex === -1) {
        console.warn(`❌ Warehouse "${warehouse}" not found for item ${itemId}`);
        console.log(`   Available: ${shoeItem.warehouseStocks.map(ws => `"${ws.warehouse}"`).join(", ")}`);
        continue;
      }

      const warehouseStock = shoeItem.warehouseStocks[warehouseStockIndex];
      const currentStock = parseFloat(warehouseStock.stockOnHand) || 0;
      const quantityToReduce = parseFloat(quantity);

      console.log(`  Before: StockOnHand=${currentStock}, Available=${warehouseStock.availableForSale}, Committed=${warehouseStock.committedStock}`);
      console.log(`  Reducing by: ${quantityToReduce}`);

      // Update stock: reduce stockOnHand directly (no committed stock)
      const newStock = Math.max(0, currentStock - quantityToReduce);
      warehouseStock.stockOnHand = newStock;
      warehouseStock.availableForSale = newStock;

      // ✅ ALSO UPDATE PHYSICAL STOCK FIELDS
      const currentPhysicalStock = parseFloat(warehouseStock.physicalStockOnHand) || 0;
      const newPhysicalStock = Math.max(0, currentPhysicalStock - quantityToReduce);
      warehouseStock.physicalStockOnHand = newPhysicalStock;
      warehouseStock.physicalAvailableForSale = newPhysicalStock;

      console.log(`  After: StockOnHand=${warehouseStock.stockOnHand}, Available=${warehouseStock.availableForSale}, Physical=${warehouseStock.physicalStockOnHand}, Committed=${warehouseStock.committedStock}`);

      // Mark the nested array as modified so Mongoose saves the changes
      shoeItem.markModified('warehouseStocks');
      
      // Save the updated item
      await shoeItem.save();
      
      // Verify the save worked
      const verifyItem = await ShoeItem.findById(itemId);
      const verifyWarehouseStock = verifyItem.warehouseStocks[warehouseStockIndex];
      console.log(`✅ Stock updated for standalone item ${item.item}: -${quantityToReduce} (New stock: ${verifyWarehouseStock.stockOnHand})`);
      
      if (verifyWarehouseStock.stockOnHand !== newStock) {
        console.error(`❌ VERIFICATION FAILED! Expected ${newStock}, but got ${verifyWarehouseStock.stockOnHand}`);
      }
    }

    // Check reorder points after stock update
    try {
      await checkAndCreateReorderAlerts(lineItems, warehouse);
    } catch (reorderError) {
      console.error("Error checking reorder points:", reorderError);
      // Don't fail the stock update if reorder check fails
    }
  } catch (error) {
    console.error("Error updating stock on invoice create:", error);
    throw error;
  }
};

/**
 * Reverse stock update when invoice is deleted or returned
 * Increases availableForSale and decreases committedStock
 */
export const reverseStockOnInvoiceDelete = async (lineItems, warehouse) => {
  try {
    console.log(`🔄 Starting stock reversal for warehouse: ${warehouse}`);
    console.log(`📦 Processing ${lineItems?.length || 0} items`);

    if (!lineItems || lineItems.length === 0) {
      console.warn("No line items to process");
      return;
    }

    for (const item of lineItems) {
      console.log(`Processing item: ${item.item}, itemData: ${JSON.stringify(item.itemData)}`);
      
      const quantity = parseFloat(item.quantity) || 0;
      if (quantity <= 0) {
        console.warn(`Skipping item ${item.item} - quantity is 0 or invalid`);
        continue;
      }

      // Check if item is from a group
      const itemGroupId = item.itemData?.itemGroupId || item.itemGroupId;
      const itemName = item.itemData?.itemName || item.itemData?.name || item.item;
      const itemSku = item.itemData?.sku || item.itemSku;
      
      if (itemGroupId) {
        // Item is from a group - reverse stock in the group
        console.log(`  Item is from group: ${itemGroupId}, name: ${itemName}`);
        
        const group = await ItemGroup.findById(itemGroupId);
        if (!group) {
          console.warn(`❌ Item group not found: ${itemGroupId}`);
          continue;
        }
        
        // Find the item in the group
        const groupItemIndex = group.items.findIndex(gi => {
          if (itemSku && gi.sku) {
            return gi.sku.toLowerCase() === itemSku.toLowerCase();
          }
          return gi.name && gi.name.toLowerCase() === itemName.toLowerCase();
        });
        
        if (groupItemIndex === -1) {
          console.warn(`❌ Item "${itemName}" not found in group "${group.name}"`);
          continue;
        }
        
        const groupItem = group.items[groupItemIndex];
        
        if (!groupItem.warehouseStocks || !Array.isArray(groupItem.warehouseStocks)) {
          console.warn(`❌ Item "${itemName}" has no warehouseStocks`);
          continue;
        }
        
        // Find the warehouse stock using helper function
        let warehouseStockIndex = findWarehouseStockIndex(groupItem.warehouseStocks, warehouse);
        
        if (warehouseStockIndex === -1) {
          console.warn(`❌ Warehouse "${warehouse}" not found for item "${itemName}"`);
          continue;
        }
        
        const warehouseStock = groupItem.warehouseStocks[warehouseStockIndex];
        const currentStock = parseFloat(warehouseStock.stockOnHand) || 0;
        const quantityToAdd = parseFloat(quantity);
        
        console.log(`  Before: StockOnHand=${currentStock}, Available=${warehouseStock.availableForSale}, Committed=${warehouseStock.committedStock}`);
        console.log(`  Adding back: ${quantityToAdd}`);
        
        // Reverse stock: increase stockOnHand directly (no committed stock)
        const newStock = currentStock + quantityToAdd;
        warehouseStock.stockOnHand = newStock;
        warehouseStock.availableForSale = newStock;
        
        // ✅ ALSO UPDATE PHYSICAL STOCK FIELDS
        const currentPhysicalStock = parseFloat(warehouseStock.physicalStockOnHand) || 0;
        const newPhysicalStock = currentPhysicalStock + quantityToAdd;
        warehouseStock.physicalStockOnHand = newPhysicalStock;
        warehouseStock.physicalAvailableForSale = newPhysicalStock;
        
        console.log(`  After: StockOnHand=${warehouseStock.stockOnHand}, Available=${warehouseStock.availableForSale}, Physical=${warehouseStock.physicalStockOnHand}, Committed=${warehouseStock.committedStock}`);
        
        // Mark the nested array as modified so Mongoose saves the changes
        group.markModified('items');
        
        // Save the group
        await group.save();
        console.log(`✅ Stock reversed for group item "${itemName}": +${quantity} available, -${quantity} committed`);
        continue;
      }
      
      // Standalone item
      if (!item.itemData || !item.itemData._id) {
        console.warn(`Skipping item ${item.item} - no itemData._id and not from group`);
        continue;
      }

      const itemId = item.itemData._id;
      console.log(`  Item ID: ${itemId}, Quantity: ${quantity}`);

      // Find the standalone item
      const shoeItem = await ShoeItem.findById(itemId);
      if (!shoeItem) {
        console.warn(`❌ Standalone item not found: ${itemId}`);
        continue;
      }

      console.log(`  Found standalone item: ${shoeItem.itemName}`);

      if (!shoeItem.warehouseStocks || !Array.isArray(shoeItem.warehouseStocks)) {
        console.warn(`❌ Item "${shoeItem.itemName}" has no warehouseStocks`);
        continue;
      }

      // Find the warehouse stock using helper function
      let warehouseStockIndex = findWarehouseStockIndex(shoeItem.warehouseStocks, warehouse);

      if (warehouseStockIndex === -1) {
        console.warn(`❌ Warehouse "${warehouse}" not found for item ${itemId}`);
        continue;
      }

      const warehouseStock = shoeItem.warehouseStocks[warehouseStockIndex];
      const currentStock = parseFloat(warehouseStock.stockOnHand) || 0;
      const quantityToAdd = parseFloat(quantity);

      console.log(`  Before: StockOnHand=${currentStock}, Available=${warehouseStock.availableForSale}, Committed=${warehouseStock.committedStock}`);
      console.log(`  Adding back: ${quantityToAdd}`);

      // Reverse stock: increase stockOnHand directly (no committed stock)
      const newStock = currentStock + quantityToAdd;
      warehouseStock.stockOnHand = newStock;
      warehouseStock.availableForSale = newStock;

      // ✅ ALSO UPDATE PHYSICAL STOCK FIELDS
      const currentPhysicalStock = parseFloat(warehouseStock.physicalStockOnHand) || 0;
      const newPhysicalStock = currentPhysicalStock + quantityToAdd;
      warehouseStock.physicalStockOnHand = newPhysicalStock;
      warehouseStock.physicalAvailableForSale = newPhysicalStock;

      console.log(`  After: StockOnHand=${warehouseStock.stockOnHand}, Available=${warehouseStock.availableForSale}, Physical=${warehouseStock.physicalStockOnHand}, Committed=${warehouseStock.committedStock}`);

      // Mark the nested array as modified so Mongoose saves the changes
      shoeItem.markModified('warehouseStocks');
      
      // Save the updated item
      await shoeItem.save();
      console.log(`✅ Stock reversed for standalone item ${item.item}: +${quantity} available, -${quantity} committed`);
    }
  } catch (error) {
    console.error("Error reversing stock on invoice delete:", error);
    throw error;
  }
};
