// Transfer Order Controller - Manages stock transfers between warehouses
import TransferOrder from "../model/TransferOrder.js"; // MongoDB model
import ShoeItem from "../model/ShoeItem.js";
import ItemGroup from "../model/ItemGroup.js";
import { updateMonthlyStockForTransfer } from "../utils/monthlyStockTracking.js";

// Helper function for flexible warehouse matching
// Warehouse name normalization mapping (same as frontend)
const WAREHOUSE_NAME_MAPPING = {
  // Trivandrum variations
  "Grooms Trivandum": "Grooms Trivandrum",
  "Grooms Trivandrum": "Grooms Trivandrum",
  "SG-Trivandrum": "Grooms Trivandrum",
  
  // Palakkad variations
  "G.Palakkad": "Palakkad Branch",
  "G.Palakkad ": "Palakkad Branch",
  "GPalakkad": "Palakkad Branch",
  "Palakkad Branch": "Palakkad Branch",
  
  // Warehouse variations
  "Warehouse": "Warehouse",
  "warehouse": "Warehouse",
  "WAREHOUSE": "Warehouse",
  
  // Calicut variations
  "G.Calicut": "Calicut",
  "G.Calicut ": "Calicut",
  "GCalicut": "Calicut",
  "Calicut": "Calicut",
  
  // Manjeri/Manjery variations
  "G.Manjeri": "Manjery Branch",
  "G.Manjery": "Manjery Branch",
  "GManjeri": "Manjery Branch",
  "GManjery": "Manjery Branch",
  "Manjery Branch": "Manjery Branch",
  
  // Kannur variations
  "G.Kannur": "Kannur Branch",
  "GKannur": "Kannur Branch",
  "Kannur Branch": "Kannur Branch",
  
  // Edappal variations
  "G.Edappal": "Edappal Branch",
  "GEdappal": "Edappal Branch",
  "Edappal Branch": "Edappal Branch",
  
  // Edapally variations
  "G.Edappally": "Edapally Branch",
  "G-Edappally": "Edapally Branch",
  "GEdappally": "Edapally Branch",
  "Edapally Branch": "Edapally Branch",
  
  // Kalpetta variations
  "G.Kalpetta": "Kalpetta Branch",
  "GKalpetta": "Kalpetta Branch",
  "Kalpetta Branch": "Kalpetta Branch",
  
  // Kottakkal variations
  "G.Kottakkal": "Kottakkal Branch",
  "GKottakkal": "Kottakkal Branch",
  "Kottakkal Branch": "Kottakkal Branch",
  "Z.Kottakkal": "Kottakkal Branch",
  
  // Perinthalmanna variations
  "G.Perinthalmanna": "Perinthalmanna Branch",
  "GPerinthalmanna": "Perinthalmanna Branch",
  "Perinthalmanna Branch": "Perinthalmanna Branch",
  "Z.Perinthalmanna": "Perinthalmanna Branch",
  
  // Chavakkad variations
  "G.Chavakkad": "Chavakkad Branch",
  "GChavakkad": "Chavakkad Branch",
  "Chavakkad Branch": "Chavakkad Branch",
  
  // Thrissur variations
  "G.Thrissur": "Thrissur Branch",
  "GThrissur": "Thrissur Branch",
  "Thrissur Branch": "Thrissur Branch",
  
  // Perumbavoor variations
  "G.Perumbavoor": "Perumbavoor Branch",
  "GPerumbavoor": "Perumbavoor Branch",
  "Perumbavoor Branch": "Perumbavoor Branch",
  
  // Kottayam variations
  "G.Kottayam": "Kottayam Branch",
  "GKottayam": "Kottayam Branch",
  "Kottayam Branch": "Kottayam Branch",
  
  // MG Road variations
  "G.MG Road": "SuitorGuy MG Road",
  "G.Mg Road": "SuitorGuy MG Road",
  "GMG Road": "SuitorGuy MG Road",
  "GMg Road": "SuitorGuy MG Road",
  "MG Road": "SuitorGuy MG Road",
  "Mg Road": "SuitorGuy MG Road",
  "MG Road Branch": "SuitorGuy MG Road",
  "Mg Road Branch": "SuitorGuy MG Road",
  "G Road Branch": "SuitorGuy MG Road",
  "SuitorGuy MG Road": "SuitorGuy MG Road",
  
  // Head Office variations
  "HEAD OFFICE01": "Head Office",
  "Head Office": "Head Office",
  
  // Other locations (default to Warehouse)
  "Z-Edapally1": "Warehouse",
  "Z- Edappal": "Warehouse",
  "Production": "Warehouse",
  "Office": "Warehouse",
  "G.Vadakara": "Warehouse",
};

// Normalize warehouse name to standard format
const normalizeWarehouseName = (warehouseName) => {
  if (!warehouseName) return null;
  
  const trimmed = warehouseName.toString().trim();
  
  // Check direct mapping
  if (WAREHOUSE_NAME_MAPPING[trimmed]) {
    return WAREHOUSE_NAME_MAPPING[trimmed];
  }
  
  // Check case-insensitive mapping
  const lowerName = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(WAREHOUSE_NAME_MAPPING)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // If no mapping found, return original (trimmed)
  return trimmed;
};

const matchesWarehouse = (itemWarehouse, targetWarehouse) => {
  if (!itemWarehouse || !targetWarehouse) return false;
  
  // Normalize both warehouse names
  const normalizedItem = normalizeWarehouseName(itemWarehouse);
  const normalizedTarget = normalizeWarehouseName(targetWarehouse);
  
  // Exact match after normalization
  if (normalizedItem && normalizedTarget && normalizedItem.toLowerCase() === normalizedTarget.toLowerCase()) {
    return true;
  }
  
  // Fallback to original flexible matching
  const itemWarehouseLower = itemWarehouse.toString().toLowerCase().trim();
  const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
  
  // Exact match
  if (itemWarehouseLower === targetWarehouseLower) {
    return true;
  }
  
  // Base name match (e.g., "warehouse" matches "Warehouse", "kannur" matches "Kannur Branch")
  const itemBase = itemWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
  const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
  
  if (itemBase && targetBase && itemBase === targetBase) {
    return true;
  }
  
  // Partial match (e.g., "kannur branch" contains "kannur")
  if (itemWarehouseLower.includes(targetWarehouseLower) || targetWarehouseLower.includes(itemWarehouseLower)) {
    return true;
  }
  
  return false;
};

// Helper function to update warehouse stock for transfer
const updateWarehouseStock = (warehouseStocks, quantityChange, targetWarehouse, operation = 'subtract') => {
  if (!warehouseStocks || warehouseStocks.length === 0) {
    // Create new warehouse entry if subtracting (shouldn't happen, but handle it)
    if (operation === 'add') {
      return [{
        warehouse: targetWarehouse,
        openingStock: 0,
        openingStockValue: 0,
        stockOnHand: quantityChange,
        committedStock: 0,
        availableForSale: quantityChange,
        physicalOpeningStock: 0,
        physicalStockOnHand: quantityChange,
        physicalCommittedStock: 0,
        physicalAvailableForSale: quantityChange,
      }];
    }
    return [];
  }
  
  // Find the specific warehouse using flexible matching (same as getCurrentStock)
  let warehouseStock = null;
  for (const ws of warehouseStocks) {
    if (ws.warehouse && matchesWarehouse(ws.warehouse, targetWarehouse)) {
      warehouseStock = ws;
      console.log(`  ✅ Found matching warehouse stock: "${ws.warehouse}" matches "${targetWarehouse}"`);
      break;
    }
  }
  
  if (!warehouseStock) {
    // Create new warehouse entry if adding
    if (operation === 'add') {
      console.log(`  📦 Creating new warehouse stock entry for "${targetWarehouse}"`);
      warehouseStock = {
        warehouse: targetWarehouse,
        openingStock: 0,
        openingStockValue: 0,
        stockOnHand: quantityChange,
        committedStock: 0,
        availableForSale: quantityChange,
        physicalOpeningStock: 0,
        physicalStockOnHand: quantityChange,
        physicalCommittedStock: 0,
        physicalAvailableForSale: quantityChange,
      };
      warehouseStocks.push(warehouseStock);
      return warehouseStocks;
    }
    console.log(`  ⚠️ Warehouse "${targetWarehouse}" not found in existing stocks, cannot subtract`);
    return warehouseStocks; // Can't subtract from non-existent warehouse
  }
  
  // Normalize warehouse name to target warehouse name to avoid duplicates
  warehouseStock.warehouse = targetWarehouse;
  
  const currentStockOnHand = parseFloat(warehouseStock.stockOnHand) || 0;
  const currentAvailableForSale = parseFloat(warehouseStock.availableForSale) || 0;
  const currentPhysicalStockOnHand = parseFloat(warehouseStock.physicalStockOnHand) || 0;
  const currentPhysicalAvailableForSale = parseFloat(warehouseStock.physicalAvailableForSale) || 0;
  
  if (operation === 'subtract') {
    const newStockOnHand = Math.max(0, currentStockOnHand - quantityChange);
    const newAvailableForSale = Math.max(0, currentAvailableForSale - quantityChange);
    const newPhysicalStockOnHand = Math.max(0, currentPhysicalStockOnHand - quantityChange);
    const newPhysicalAvailableForSale = Math.max(0, currentPhysicalAvailableForSale - quantityChange);
    
    console.log(`  📉 ${targetWarehouse}: ${currentStockOnHand} - ${quantityChange} = ${newStockOnHand} (Stock On Hand)`);
    
    warehouseStock.stockOnHand = newStockOnHand;
    warehouseStock.availableForSale = newAvailableForSale;
    warehouseStock.physicalStockOnHand = newPhysicalStockOnHand;
    warehouseStock.physicalAvailableForSale = newPhysicalAvailableForSale;
  } else {
    const newStockOnHand = currentStockOnHand + quantityChange;
    const newAvailableForSale = currentAvailableForSale + quantityChange;
    const newPhysicalStockOnHand = currentPhysicalStockOnHand + quantityChange;
    const newPhysicalAvailableForSale = currentPhysicalAvailableForSale + quantityChange;
    
    console.log(`  📈 ${targetWarehouse}: ${currentStockOnHand} + ${quantityChange} = ${newStockOnHand} (Stock On Hand)`);
    
    warehouseStock.stockOnHand = newStockOnHand;
    warehouseStock.availableForSale = newAvailableForSale;
    warehouseStock.physicalStockOnHand = newPhysicalStockOnHand;
    warehouseStock.physicalAvailableForSale = newPhysicalAvailableForSale;
  }
  
  return warehouseStocks;
};

// Transfer stock for an item
const transferItemStock = async (itemIdValue, quantity, sourceWarehouse, destinationWarehouse, itemName = null, itemGroupId = null, itemSku = null) => {
  const sourceWarehouseName = sourceWarehouse?.trim() || "Warehouse";
  const destWarehouseName = destinationWarehouse?.trim() || "Warehouse";
  
  // Try standalone item first
  if (itemIdValue && itemIdValue !== null && itemIdValue !== "null") {
    const shoeItem = await ShoeItem.findById(itemIdValue);
    if (shoeItem) {
      // Convert to plain object, modify, then update using $set (same fix as PurchaseReceiveController)
      const itemPlain = shoeItem.toObject();
      
      if (!itemPlain.warehouseStocks || !Array.isArray(itemPlain.warehouseStocks)) {
        itemPlain.warehouseStocks = [];
      }
      
      // Helper to find or create warehouse stock entry
      const getOrCreateWarehouseStock = (warehouseName) => {
        let wsEntry = itemPlain.warehouseStocks.find(ws => 
          matchesWarehouse(ws.warehouse, warehouseName)
        );
        
        if (!wsEntry) {
          wsEntry = {
            warehouse: warehouseName,
            openingStock: 0,
            openingStockValue: 0,
            stockOnHand: 0,
            committedStock: 0,
            availableForSale: 0,
            physicalOpeningStock: 0,
            physicalStockOnHand: 0,
            physicalCommittedStock: 0,
            physicalAvailableForSale: 0,
          };
          itemPlain.warehouseStocks.push(wsEntry);
        }
        return wsEntry;
      };
      
      // Subtract from source warehouse
      const sourceWs = getOrCreateWarehouseStock(sourceWarehouseName);
      const sourceCurrentStock = parseFloat(sourceWs.stockOnHand) || 0;
      sourceWs.stockOnHand = Math.max(0, sourceCurrentStock - quantity);
      sourceWs.availableForSale = Math.max(0, (parseFloat(sourceWs.availableForSale) || 0) - quantity);
      sourceWs.physicalStockOnHand = Math.max(0, (parseFloat(sourceWs.physicalStockOnHand) || 0) - quantity);
      sourceWs.physicalAvailableForSale = Math.max(0, (parseFloat(sourceWs.physicalAvailableForSale) || 0) - quantity);
      sourceWs.warehouse = sourceWarehouseName;
      
      // Add to destination warehouse
      const destWs = getOrCreateWarehouseStock(destWarehouseName);
      const destCurrentStock = parseFloat(destWs.stockOnHand) || 0;
      destWs.stockOnHand = destCurrentStock + quantity;
      destWs.availableForSale = (parseFloat(destWs.availableForSale) || 0) + quantity;
      destWs.physicalStockOnHand = (parseFloat(destWs.physicalStockOnHand) || 0) + quantity;
      destWs.physicalAvailableForSale = (parseFloat(destWs.physicalAvailableForSale) || 0) + quantity;
      destWs.warehouse = destWarehouseName;
      
      // Update using $set
      await ShoeItem.findByIdAndUpdate(
        itemIdValue,
        {
          $set: {
            warehouseStocks: itemPlain.warehouseStocks
          }
        }
      );
      
      return { success: true, type: 'standalone' };
    }
  }
  
  // Try item groups
  if (itemGroupId || itemSku || itemName) {
    let group = null;
    if (itemGroupId) {
      group = await ItemGroup.findById(itemGroupId);
    }
    if (!group && itemSku) {
      group = await ItemGroup.findOne({ sku: new RegExp(`^${itemSku.trim()}$`, "i") });
    }
    if (!group && itemName) {
      group = await ItemGroup.findOne({ name: new RegExp(`^${itemName.trim()}$`, "i") });
    }
    if (!group && itemSku) {
      group = await ItemGroup.findOne({ "items.sku": new RegExp(`^${itemSku.trim()}$`, "i") });
    }
    if (!group && itemName) {
      group = await ItemGroup.findOne({ "items.name": new RegExp(`^${itemName.trim()}$`, "i") });
    }
    if (group) {
      const itemIndex = (group.items || []).findIndex(item => {
        if (itemSku && item.sku) {
          return item.sku.toLowerCase() === itemSku.toLowerCase();
        }
        return item.name && itemName && item.name.toLowerCase() === itemName.toLowerCase();
      });
      
      if (itemIndex !== -1) {
        // Convert to plain object, modify, then update using $set
        const groupPlain = group.toObject();
        const itemPlain = groupPlain.items[itemIndex];
        
        if (!itemPlain.warehouseStocks) {
          itemPlain.warehouseStocks = [];
        }
        
        // Helper to find or create warehouse stock entry
        const getOrCreateWarehouseStock = (warehouseName) => {
          let wsEntry = itemPlain.warehouseStocks.find(ws => 
            matchesWarehouse(ws.warehouse, warehouseName)
          );
          
          if (!wsEntry) {
            wsEntry = {
              warehouse: warehouseName,
              openingStock: 0,
              openingStockValue: 0,
              stockOnHand: 0,
              committedStock: 0,
              availableForSale: 0,
              physicalOpeningStock: 0,
              physicalStockOnHand: 0,
              physicalCommittedStock: 0,
              physicalAvailableForSale: 0,
            };
            itemPlain.warehouseStocks.push(wsEntry);
          }
          return wsEntry;
        };
        
        // Subtract from source warehouse
        const sourceWs = getOrCreateWarehouseStock(sourceWarehouseName);
        const sourceCurrentStock = parseFloat(sourceWs.stockOnHand) || 0;
        sourceWs.stockOnHand = Math.max(0, sourceCurrentStock - quantity);
        sourceWs.availableForSale = Math.max(0, (parseFloat(sourceWs.availableForSale) || 0) - quantity);
        sourceWs.physicalStockOnHand = Math.max(0, (parseFloat(sourceWs.physicalStockOnHand) || 0) - quantity);
        sourceWs.physicalAvailableForSale = Math.max(0, (parseFloat(sourceWs.physicalAvailableForSale) || 0) - quantity);
        sourceWs.warehouse = sourceWarehouseName;
        
        // Add to destination warehouse
        const destWs = getOrCreateWarehouseStock(destWarehouseName);
        const destCurrentStock = parseFloat(destWs.stockOnHand) || 0;
        destWs.stockOnHand = destCurrentStock + quantity;
        destWs.availableForSale = (parseFloat(destWs.availableForSale) || 0) + quantity;
        destWs.physicalStockOnHand = (parseFloat(destWs.physicalStockOnHand) || 0) + quantity;
        destWs.physicalAvailableForSale = (parseFloat(destWs.physicalAvailableForSale) || 0) + quantity;
        destWs.warehouse = destWarehouseName;
        
        // Update using $set
        await ItemGroup.findByIdAndUpdate(
          group._id,
          {
            $set: {
              [`items.${itemIndex}`]: itemPlain
            }
          }
        );
        
        // Update monthly opening stock for transfer
        try {
          const itemId = itemPlain._id?.toString() || itemPlain.id?.toString();
          if (itemId) {
            await updateMonthlyStockForTransfer(group._id, itemId, sourceWarehouseName, destWarehouseName, quantity, itemName);
          }
        } catch (monthlyError) {
          console.error(`   ⚠️ Error updating monthly stock (non-critical):`, monthlyError);
        }
        
        return { success: true, type: 'group' };
      } else if (group.items && group.items.length > 0) {
        // Entire Item Group: transfer quantity across variants
        const groupPlain = group.toObject();
        let remaining = quantity;
        for (let i = 0; i < groupPlain.items.length && remaining > 0; i++) {
          const varItem = groupPlain.items[i];
          if (!varItem.warehouseStocks) varItem.warehouseStocks = [];
          const sourceWs = varItem.warehouseStocks.find(w => matchesWarehouse(w.warehouse, sourceWarehouseName));
          if (sourceWs && (parseFloat(sourceWs.stockOnHand) || 0) > 0) {
            const deduct = Math.min(remaining, parseFloat(sourceWs.stockOnHand) || 0);
            sourceWs.stockOnHand = Math.max(0, (parseFloat(sourceWs.stockOnHand) || 0) - deduct);
            sourceWs.availableForSale = Math.max(0, (parseFloat(sourceWs.availableForSale) || 0) - deduct);
            sourceWs.physicalStockOnHand = Math.max(0, (parseFloat(sourceWs.physicalStockOnHand) || 0) - deduct);
            sourceWs.physicalAvailableForSale = Math.max(0, (parseFloat(sourceWs.physicalAvailableForSale) || 0) - deduct);
            
            let destWs = varItem.warehouseStocks.find(w => matchesWarehouse(w.warehouse, destWarehouseName));
            if (!destWs) {
              destWs = { warehouse: destWarehouseName, openingStock: 0, openingStockValue: 0, stockOnHand: 0, committedStock: 0, availableForSale: 0, physicalOpeningStock: 0, physicalStockOnHand: 0, physicalCommittedStock: 0, physicalAvailableForSale: 0 };
              varItem.warehouseStocks.push(destWs);
            }
            destWs.stockOnHand = (parseFloat(destWs.stockOnHand) || 0) + deduct;
            destWs.availableForSale = (parseFloat(destWs.availableForSale) || 0) + deduct;
            destWs.physicalStockOnHand = (parseFloat(destWs.physicalStockOnHand) || 0) + deduct;
            destWs.physicalAvailableForSale = (parseFloat(destWs.physicalAvailableForSale) || 0) + deduct;
            
            remaining -= deduct;
          }
        }
        if (remaining > 0 && groupPlain.items.length > 0) {
          const firstItem = groupPlain.items[0];
          if (!firstItem.warehouseStocks) firstItem.warehouseStocks = [];
          let sourceWs = firstItem.warehouseStocks.find(w => matchesWarehouse(w.warehouse, sourceWarehouseName));
          if (!sourceWs) {
            sourceWs = { warehouse: sourceWarehouseName, openingStock: 0, openingStockValue: 0, stockOnHand: 0, committedStock: 0, availableForSale: 0, physicalOpeningStock: 0, physicalStockOnHand: 0, physicalCommittedStock: 0, physicalAvailableForSale: 0 };
            firstItem.warehouseStocks.push(sourceWs);
          }
          sourceWs.stockOnHand = Math.max(0, (parseFloat(sourceWs.stockOnHand) || 0) - remaining);
          sourceWs.availableForSale = Math.max(0, (parseFloat(sourceWs.availableForSale) || 0) - remaining);
          sourceWs.physicalStockOnHand = Math.max(0, (parseFloat(sourceWs.physicalStockOnHand) || 0) - remaining);
          sourceWs.physicalAvailableForSale = Math.max(0, (parseFloat(sourceWs.physicalAvailableForSale) || 0) - remaining);
          
          let destWs = firstItem.warehouseStocks.find(w => matchesWarehouse(w.warehouse, destWarehouseName));
          if (!destWs) {
            destWs = { warehouse: destWarehouseName, openingStock: 0, openingStockValue: 0, stockOnHand: 0, committedStock: 0, availableForSale: 0, physicalOpeningStock: 0, physicalStockOnHand: 0, physicalCommittedStock: 0, physicalAvailableForSale: 0 };
            firstItem.warehouseStocks.push(destWs);
          }
          destWs.stockOnHand = (parseFloat(destWs.stockOnHand) || 0) + remaining;
          destWs.availableForSale = (parseFloat(destWs.availableForSale) || 0) + remaining;
          destWs.physicalStockOnHand = (parseFloat(destWs.physicalStockOnHand) || 0) + remaining;
          destWs.physicalAvailableForSale = (parseFloat(destWs.physicalAvailableForSale) || 0) + remaining;
        }
        await ItemGroup.findByIdAndUpdate(group._id, { $set: { items: groupPlain.items } });
        return { success: true, type: 'group' };
      }
    }
  }
  
  return { success: false, message: `Item "${itemName || itemIdValue}" not found` };
};

// Reverse transfer (when status changes from transferred back to draft/in_transit)
const reverseTransferStock = async (itemIdValue, quantity, sourceWarehouse, destinationWarehouse, itemName = null, itemGroupId = null, itemSku = null) => {
  // Reverse: add back to source, subtract from destination
  const sourceWarehouseName = sourceWarehouse?.trim() || "Warehouse";
  const destWarehouseName = destinationWarehouse?.trim() || "Warehouse";
  
  // Try standalone item first
  if (itemIdValue && itemIdValue !== null && itemIdValue !== "null") {
    const shoeItem = await ShoeItem.findById(itemIdValue);
    if (shoeItem) {
      // Convert to plain object, modify, then update using $set
      const itemPlain = shoeItem.toObject();
      
      if (!itemPlain.warehouseStocks || !Array.isArray(itemPlain.warehouseStocks)) {
        itemPlain.warehouseStocks = [];
      }
      
      // Helper to find or create warehouse stock entry
      const getOrCreateWarehouseStock = (warehouseName) => {
        let wsEntry = itemPlain.warehouseStocks.find(ws => 
          matchesWarehouse(ws.warehouse, warehouseName)
        );
        
        if (!wsEntry) {
          wsEntry = {
            warehouse: warehouseName,
            openingStock: 0,
            openingStockValue: 0,
            stockOnHand: 0,
            committedStock: 0,
            availableForSale: 0,
            physicalOpeningStock: 0,
            physicalStockOnHand: 0,
            physicalCommittedStock: 0,
            physicalAvailableForSale: 0,
          };
          itemPlain.warehouseStocks.push(wsEntry);
        }
        return wsEntry;
      };
      
      // Add back to source warehouse
      const sourceWs = getOrCreateWarehouseStock(sourceWarehouseName);
      const sourceCurrentStock = parseFloat(sourceWs.stockOnHand) || 0;
      sourceWs.stockOnHand = sourceCurrentStock + quantity;
      sourceWs.availableForSale = (parseFloat(sourceWs.availableForSale) || 0) + quantity;
      sourceWs.physicalStockOnHand = (parseFloat(sourceWs.physicalStockOnHand) || 0) + quantity;
      sourceWs.physicalAvailableForSale = (parseFloat(sourceWs.physicalAvailableForSale) || 0) + quantity;
      sourceWs.warehouse = sourceWarehouseName;
      
      // Subtract from destination warehouse
      const destWs = getOrCreateWarehouseStock(destWarehouseName);
      const destCurrentStock = parseFloat(destWs.stockOnHand) || 0;
      destWs.stockOnHand = Math.max(0, destCurrentStock - quantity);
      destWs.availableForSale = Math.max(0, (parseFloat(destWs.availableForSale) || 0) - quantity);
      destWs.physicalStockOnHand = Math.max(0, (parseFloat(destWs.physicalStockOnHand) || 0) - quantity);
      destWs.physicalAvailableForSale = Math.max(0, (parseFloat(destWs.physicalAvailableForSale) || 0) - quantity);
      destWs.warehouse = destWarehouseName;
      
      // Update using $set
      await ShoeItem.findByIdAndUpdate(
        itemIdValue,
        {
          $set: {
            warehouseStocks: itemPlain.warehouseStocks
          }
        }
      );
      
      return { success: true, type: 'standalone' };
    }
  }
  
  // Try item groups
  if (itemGroupId || itemSku || itemName) {
    let group = null;
    if (itemGroupId) {
      group = await ItemGroup.findById(itemGroupId);
    }
    if (!group && itemSku) {
      group = await ItemGroup.findOne({ sku: new RegExp(`^${itemSku.trim()}$`, "i") });
    }
    if (!group && itemName) {
      group = await ItemGroup.findOne({ name: new RegExp(`^${itemName.trim()}$`, "i") });
    }
    if (!group && itemSku) {
      group = await ItemGroup.findOne({ "items.sku": new RegExp(`^${itemSku.trim()}$`, "i") });
    }
    if (!group && itemName) {
      group = await ItemGroup.findOne({ "items.name": new RegExp(`^${itemName.trim()}$`, "i") });
    }
    if (group) {
      const itemIndex = (group.items || []).findIndex(item => {
        if (itemSku && item.sku) return item.sku.toLowerCase() === itemSku.toLowerCase();
        return item.name && itemName && item.name.toLowerCase() === itemName.toLowerCase();
      });
      
      if (itemIndex !== -1) {
        // Convert to plain object, modify, then update using $set
        const groupPlain = group.toObject();
        const itemPlain = groupPlain.items[itemIndex];
        
        if (!itemPlain.warehouseStocks) {
          itemPlain.warehouseStocks = [];
        }
        
        // Helper to find or create warehouse stock entry
        const getOrCreateWarehouseStock = (warehouseName) => {
          let wsEntry = itemPlain.warehouseStocks.find(ws => 
            matchesWarehouse(ws.warehouse, warehouseName)
          );
          
          if (!wsEntry) {
            wsEntry = {
              warehouse: warehouseName,
              openingStock: 0,
              openingStockValue: 0,
              stockOnHand: 0,
              committedStock: 0,
              availableForSale: 0,
              physicalOpeningStock: 0,
              physicalStockOnHand: 0,
              physicalCommittedStock: 0,
              physicalAvailableForSale: 0,
            };
            itemPlain.warehouseStocks.push(wsEntry);
          }
          return wsEntry;
        };
        
        // Add back to source warehouse
        const sourceWs = getOrCreateWarehouseStock(sourceWarehouseName);
        const sourceCurrentStock = parseFloat(sourceWs.stockOnHand) || 0;
        sourceWs.stockOnHand = sourceCurrentStock + quantity;
        sourceWs.availableForSale = (parseFloat(sourceWs.availableForSale) || 0) + quantity;
        sourceWs.physicalStockOnHand = (parseFloat(sourceWs.physicalStockOnHand) || 0) + quantity;
        sourceWs.physicalAvailableForSale = (parseFloat(sourceWs.physicalAvailableForSale) || 0) + quantity;
        sourceWs.warehouse = sourceWarehouseName;
        
        // Subtract from destination warehouse
        const destWs = getOrCreateWarehouseStock(destWarehouseName);
        const destCurrentStock = parseFloat(destWs.stockOnHand) || 0;
        destWs.stockOnHand = Math.max(0, destCurrentStock - quantity);
        destWs.availableForSale = Math.max(0, (parseFloat(destWs.availableForSale) || 0) - quantity);
        destWs.physicalStockOnHand = Math.max(0, (parseFloat(destWs.physicalStockOnHand) || 0) - quantity);
        destWs.physicalAvailableForSale = Math.max(0, (parseFloat(destWs.physicalAvailableForSale) || 0) - quantity);
        destWs.warehouse = destWarehouseName;
        
        // Update using $set
        await ItemGroup.findByIdAndUpdate(
          group._id,
          {
            $set: {
              [`items.${itemIndex}`]: itemPlain
            }
          }
        );
        
        return { success: true, type: 'group' };
      } else if (group.items && group.items.length > 0) {
        const groupPlain = group.toObject();
        const firstItem = groupPlain.items[0];
        if (!firstItem.warehouseStocks) firstItem.warehouseStocks = [];
        
        let sourceWs = firstItem.warehouseStocks.find(w => matchesWarehouse(w.warehouse, sourceWarehouseName));
        if (!sourceWs) {
          sourceWs = { warehouse: sourceWarehouseName, openingStock: 0, openingStockValue: 0, stockOnHand: 0, committedStock: 0, availableForSale: 0, physicalOpeningStock: 0, physicalStockOnHand: 0, physicalCommittedStock: 0, physicalAvailableForSale: 0 };
          firstItem.warehouseStocks.push(sourceWs);
        }
        sourceWs.stockOnHand = (parseFloat(sourceWs.stockOnHand) || 0) + quantity;
        sourceWs.availableForSale = (parseFloat(sourceWs.availableForSale) || 0) + quantity;
        sourceWs.physicalStockOnHand = (parseFloat(sourceWs.physicalStockOnHand) || 0) + quantity;
        sourceWs.physicalAvailableForSale = (parseFloat(sourceWs.physicalAvailableForSale) || 0) + quantity;
        
        let destWs = firstItem.warehouseStocks.find(w => matchesWarehouse(w.warehouse, destWarehouseName));
        if (destWs) {
          destWs.stockOnHand = Math.max(0, (parseFloat(destWs.stockOnHand) || 0) - quantity);
          destWs.availableForSale = Math.max(0, (parseFloat(destWs.availableForSale) || 0) - quantity);
          destWs.physicalStockOnHand = Math.max(0, (parseFloat(destWs.physicalStockOnHand) || 0) - quantity);
          destWs.physicalAvailableForSale = Math.max(0, (parseFloat(destWs.physicalAvailableForSale) || 0) - quantity);
        }
        await ItemGroup.findByIdAndUpdate(group._id, { $set: { items: groupPlain.items } });
        return { success: true, type: 'group' };
      }
    }
  }
  
  return { success: false, message: `Item "${itemName || itemIdValue}" not found` };
};

// Deduct stock from source warehouse only (used when draft/in_transit order is created)
const deductSourceStock = async (itemIdValue, quantity, sourceWarehouse, itemName = null, itemGroupId = null, itemSku = null) => {
  const sourceWarehouseName = sourceWarehouse?.trim() || "Warehouse";

  if (itemIdValue && itemIdValue !== null && itemIdValue !== "null") {
    const shoeItem = await ShoeItem.findById(itemIdValue);
    if (shoeItem) {
      const itemPlain = shoeItem.toObject();
      if (!itemPlain.warehouseStocks || !Array.isArray(itemPlain.warehouseStocks)) {
        itemPlain.warehouseStocks = [];
      }
      const sourceWs = itemPlain.warehouseStocks.find(ws => matchesWarehouse(ws.warehouse, sourceWarehouseName));
      if (!sourceWs) return { success: false, message: `Source warehouse "${sourceWarehouseName}" not found for item "${itemName || itemIdValue}"` };
      sourceWs.stockOnHand = Math.max(0, (parseFloat(sourceWs.stockOnHand) || 0) - quantity);
      sourceWs.availableForSale = Math.max(0, (parseFloat(sourceWs.availableForSale) || 0) - quantity);
      sourceWs.physicalStockOnHand = Math.max(0, (parseFloat(sourceWs.physicalStockOnHand) || 0) - quantity);
      sourceWs.physicalAvailableForSale = Math.max(0, (parseFloat(sourceWs.physicalAvailableForSale) || 0) - quantity);
      await ShoeItem.findByIdAndUpdate(itemIdValue, { $set: { warehouseStocks: itemPlain.warehouseStocks } });
      return { success: true, type: 'standalone' };
    }
  }

  if (itemGroupId || itemSku || itemName) {
    let group = null;
    if (itemGroupId) {
      group = await ItemGroup.findById(itemGroupId);
    }
    if (!group && itemSku) {
      group = await ItemGroup.findOne({ sku: new RegExp(`^${itemSku.trim()}$`, "i") });
    }
    if (!group && itemName) {
      group = await ItemGroup.findOne({ name: new RegExp(`^${itemName.trim()}$`, "i") });
    }
    if (!group && itemSku) {
      group = await ItemGroup.findOne({ "items.sku": new RegExp(`^${itemSku.trim()}$`, "i") });
    }
    if (!group && itemName) {
      group = await ItemGroup.findOne({ "items.name": new RegExp(`^${itemName.trim()}$`, "i") });
    }
    if (group) {
      const itemIndex = (group.items || []).findIndex(item => {
        if (itemSku && item.sku) return item.sku.toLowerCase() === itemSku.toLowerCase();
        return item.name && itemName && item.name.toLowerCase() === itemName.toLowerCase();
      });
      if (itemIndex !== -1) {
        const groupPlain = group.toObject();
        const itemPlain = groupPlain.items[itemIndex];
        if (!itemPlain.warehouseStocks) itemPlain.warehouseStocks = [];
        const sourceWs = itemPlain.warehouseStocks.find(ws => matchesWarehouse(ws.warehouse, sourceWarehouseName));
        if (!sourceWs) return { success: false, message: `Source warehouse "${sourceWarehouseName}" not found for item "${itemName}"` };
        sourceWs.stockOnHand = Math.max(0, (parseFloat(sourceWs.stockOnHand) || 0) - quantity);
        sourceWs.availableForSale = Math.max(0, (parseFloat(sourceWs.availableForSale) || 0) - quantity);
        sourceWs.physicalStockOnHand = Math.max(0, (parseFloat(sourceWs.physicalStockOnHand) || 0) - quantity);
        sourceWs.physicalAvailableForSale = Math.max(0, (parseFloat(sourceWs.physicalAvailableForSale) || 0) - quantity);
        await ItemGroup.findByIdAndUpdate(group._id, { $set: { [`items.${itemIndex}`]: itemPlain } });
        return { success: true, type: 'group' };
      } else if (group.items && group.items.length > 0) {
        // Entire Item Group: Deduct quantity across group variants
        const groupPlain = group.toObject();
        let remaining = quantity;
        for (let i = 0; i < groupPlain.items.length && remaining > 0; i++) {
          const varItem = groupPlain.items[i];
          if (!varItem.warehouseStocks) varItem.warehouseStocks = [];
          const ws = varItem.warehouseStocks.find(w => matchesWarehouse(w.warehouse, sourceWarehouseName));
          if (ws && (parseFloat(ws.stockOnHand) || 0) > 0) {
            const deduct = Math.min(remaining, parseFloat(ws.stockOnHand) || 0);
            ws.stockOnHand = Math.max(0, (parseFloat(ws.stockOnHand) || 0) - deduct);
            ws.availableForSale = Math.max(0, (parseFloat(ws.availableForSale) || 0) - deduct);
            ws.physicalStockOnHand = Math.max(0, (parseFloat(ws.physicalStockOnHand) || 0) - deduct);
            ws.physicalAvailableForSale = Math.max(0, (parseFloat(ws.physicalAvailableForSale) || 0) - deduct);
            remaining -= deduct;
          }
        }
        if (remaining > 0 && groupPlain.items.length > 0) {
          const firstItem = groupPlain.items[0];
          if (!firstItem.warehouseStocks) firstItem.warehouseStocks = [];
          let ws = firstItem.warehouseStocks.find(w => matchesWarehouse(w.warehouse, sourceWarehouseName));
          if (!ws) {
            ws = { warehouse: sourceWarehouseName, openingStock: 0, openingStockValue: 0, stockOnHand: 0, committedStock: 0, availableForSale: 0, physicalOpeningStock: 0, physicalStockOnHand: 0, physicalCommittedStock: 0, physicalAvailableForSale: 0 };
            firstItem.warehouseStocks.push(ws);
          }
          ws.stockOnHand = Math.max(0, (parseFloat(ws.stockOnHand) || 0) - remaining);
          ws.availableForSale = Math.max(0, (parseFloat(ws.availableForSale) || 0) - remaining);
          ws.physicalStockOnHand = Math.max(0, (parseFloat(ws.physicalStockOnHand) || 0) - remaining);
          ws.physicalAvailableForSale = Math.max(0, (parseFloat(ws.physicalAvailableForSale) || 0) - remaining);
        }
        await ItemGroup.findByIdAndUpdate(group._id, { $set: { items: groupPlain.items } });
        return { success: true, type: 'group' };
      }
    }
  }

  return { success: false, message: `Item "${itemName || itemIdValue}" not found` };
};

// Add stock to destination warehouse only (used when receiving a draft/in_transit order)
const addDestinationStock = async (itemIdValue, quantity, destinationWarehouse, itemName = null, itemGroupId = null, itemSku = null) => {
  const destWarehouseName = destinationWarehouse?.trim() || "Warehouse";

  if (itemIdValue && itemIdValue !== null && itemIdValue !== "null") {
    const shoeItem = await ShoeItem.findById(itemIdValue);
    if (shoeItem) {
      const itemPlain = shoeItem.toObject();
      if (!itemPlain.warehouseStocks || !Array.isArray(itemPlain.warehouseStocks)) {
        itemPlain.warehouseStocks = [];
      }
      let destWs = itemPlain.warehouseStocks.find(ws => matchesWarehouse(ws.warehouse, destWarehouseName));
      if (!destWs) {
        destWs = { warehouse: destWarehouseName, openingStock: 0, openingStockValue: 0, stockOnHand: 0, committedStock: 0, availableForSale: 0, physicalOpeningStock: 0, physicalStockOnHand: 0, physicalCommittedStock: 0, physicalAvailableForSale: 0 };
        itemPlain.warehouseStocks.push(destWs);
      }
      destWs.stockOnHand = (parseFloat(destWs.stockOnHand) || 0) + quantity;
      destWs.availableForSale = (parseFloat(destWs.availableForSale) || 0) + quantity;
      destWs.physicalStockOnHand = (parseFloat(destWs.physicalStockOnHand) || 0) + quantity;
      destWs.physicalAvailableForSale = (parseFloat(destWs.physicalAvailableForSale) || 0) + quantity;
      await ShoeItem.findByIdAndUpdate(itemIdValue, { $set: { warehouseStocks: itemPlain.warehouseStocks } });
      return { success: true, type: 'standalone' };
    }
  }

  if (itemGroupId || itemSku || itemName) {
    let group = null;
    if (itemGroupId) {
      group = await ItemGroup.findById(itemGroupId);
    }
    if (!group && itemSku) {
      group = await ItemGroup.findOne({ sku: new RegExp(`^${itemSku.trim()}$`, "i") });
    }
    if (!group && itemName) {
      group = await ItemGroup.findOne({ name: new RegExp(`^${itemName.trim()}$`, "i") });
    }
    if (!group && itemSku) {
      group = await ItemGroup.findOne({ "items.sku": new RegExp(`^${itemSku.trim()}$`, "i") });
    }
    if (!group && itemName) {
      group = await ItemGroup.findOne({ "items.name": new RegExp(`^${itemName.trim()}$`, "i") });
    }
    if (group) {
      const itemIndex = (group.items || []).findIndex(item => {
        if (itemSku && item.sku) return item.sku.toLowerCase() === itemSku.toLowerCase();
        return item.name && itemName && item.name.toLowerCase() === itemName.toLowerCase();
      });
      if (itemIndex !== -1) {
        const groupPlain = group.toObject();
        const itemPlain = groupPlain.items[itemIndex];
        if (!itemPlain.warehouseStocks) itemPlain.warehouseStocks = [];
        let destWs = itemPlain.warehouseStocks.find(ws => matchesWarehouse(ws.warehouse, destWarehouseName));
        if (!destWs) {
          destWs = { warehouse: destWarehouseName, openingStock: 0, openingStockValue: 0, stockOnHand: 0, committedStock: 0, availableForSale: 0, physicalOpeningStock: 0, physicalStockOnHand: 0, physicalCommittedStock: 0, physicalAvailableForSale: 0 };
          itemPlain.warehouseStocks.push(destWs);
        }
        destWs.stockOnHand = (parseFloat(destWs.stockOnHand) || 0) + quantity;
        destWs.availableForSale = (parseFloat(destWs.availableForSale) || 0) + quantity;
        destWs.physicalStockOnHand = (parseFloat(destWs.physicalStockOnHand) || 0) + quantity;
        destWs.physicalAvailableForSale = (parseFloat(destWs.physicalAvailableForSale) || 0) + quantity;
        await ItemGroup.findByIdAndUpdate(group._id, { $set: { [`items.${itemIndex}`]: itemPlain } });
        return { success: true, type: 'group' };
      } else if (group.items && group.items.length > 0) {
        const groupPlain = group.toObject();
        const firstItem = groupPlain.items[0];
        if (!firstItem.warehouseStocks) firstItem.warehouseStocks = [];
        let destWs = firstItem.warehouseStocks.find(ws => matchesWarehouse(ws.warehouse, destWarehouseName));
        if (!destWs) {
          destWs = { warehouse: destWarehouseName, openingStock: 0, openingStockValue: 0, stockOnHand: 0, committedStock: 0, availableForSale: 0, physicalOpeningStock: 0, physicalStockOnHand: 0, physicalCommittedStock: 0, physicalAvailableForSale: 0 };
          firstItem.warehouseStocks.push(destWs);
        }
        destWs.stockOnHand = (parseFloat(destWs.stockOnHand) || 0) + quantity;
        destWs.availableForSale = (parseFloat(destWs.availableForSale) || 0) + quantity;
        destWs.physicalStockOnHand = (parseFloat(destWs.physicalStockOnHand) || 0) + quantity;
        destWs.physicalAvailableForSale = (parseFloat(destWs.physicalAvailableForSale) || 0) + quantity;
        await ItemGroup.findByIdAndUpdate(group._id, { $set: { items: groupPlain.items } });
        return { success: true, type: 'group' };
      }
    }
  }

  return { success: false, message: `Item "${itemName || itemIdValue}" not found` };
};

// Add stock back to source warehouse only (used when deleting a draft/in_transit order)
const restoreSourceStock = async (itemIdValue, quantity, sourceWarehouse, itemName = null, itemGroupId = null, itemSku = null) => {
  const sourceWarehouseName = sourceWarehouse?.trim() || "Warehouse";

  if (itemIdValue && itemIdValue !== null && itemIdValue !== "null") {
    const shoeItem = await ShoeItem.findById(itemIdValue);
    if (shoeItem) {
      const itemPlain = shoeItem.toObject();
      if (!itemPlain.warehouseStocks || !Array.isArray(itemPlain.warehouseStocks)) itemPlain.warehouseStocks = [];
      let sourceWs = itemPlain.warehouseStocks.find(ws => matchesWarehouse(ws.warehouse, sourceWarehouseName));
      if (!sourceWs) {
        sourceWs = { warehouse: sourceWarehouseName, openingStock: 0, openingStockValue: 0, stockOnHand: 0, committedStock: 0, availableForSale: 0, physicalOpeningStock: 0, physicalStockOnHand: 0, physicalCommittedStock: 0, physicalAvailableForSale: 0 };
        itemPlain.warehouseStocks.push(sourceWs);
      }
      sourceWs.stockOnHand = (parseFloat(sourceWs.stockOnHand) || 0) + quantity;
      sourceWs.availableForSale = (parseFloat(sourceWs.availableForSale) || 0) + quantity;
      sourceWs.physicalStockOnHand = (parseFloat(sourceWs.physicalStockOnHand) || 0) + quantity;
      sourceWs.physicalAvailableForSale = (parseFloat(sourceWs.physicalAvailableForSale) || 0) + quantity;
      await ShoeItem.findByIdAndUpdate(itemIdValue, { $set: { warehouseStocks: itemPlain.warehouseStocks } });
      return { success: true, type: 'standalone' };
    }
  }

  if (itemGroupId || itemSku || itemName) {
    let group = null;
    if (itemGroupId) {
      group = await ItemGroup.findById(itemGroupId);
    }
    if (!group && itemSku) {
      group = await ItemGroup.findOne({ sku: new RegExp(`^${itemSku.trim()}$`, "i") });
    }
    if (!group && itemName) {
      group = await ItemGroup.findOne({ name: new RegExp(`^${itemName.trim()}$`, "i") });
    }
    if (!group && itemSku) {
      group = await ItemGroup.findOne({ "items.sku": new RegExp(`^${itemSku.trim()}$`, "i") });
    }
    if (!group && itemName) {
      group = await ItemGroup.findOne({ "items.name": new RegExp(`^${itemName.trim()}$`, "i") });
    }
    if (group) {
      const itemIndex = (group.items || []).findIndex(item => {
        if (itemSku && item.sku) return item.sku.toLowerCase() === itemSku.toLowerCase();
        return item.name && itemName && item.name.toLowerCase() === itemName.toLowerCase();
      });
      if (itemIndex !== -1) {
        const groupPlain = group.toObject();
        const itemPlain = groupPlain.items[itemIndex];
        if (!itemPlain.warehouseStocks) itemPlain.warehouseStocks = [];
        let sourceWs = itemPlain.warehouseStocks.find(ws => matchesWarehouse(ws.warehouse, sourceWarehouseName));
        if (!sourceWs) {
          sourceWs = { warehouse: sourceWarehouseName, openingStock: 0, openingStockValue: 0, stockOnHand: 0, committedStock: 0, availableForSale: 0, physicalOpeningStock: 0, physicalStockOnHand: 0, physicalCommittedStock: 0, physicalAvailableForSale: 0 };
          itemPlain.warehouseStocks.push(sourceWs);
        }
        sourceWs.stockOnHand = (parseFloat(sourceWs.stockOnHand) || 0) + quantity;
        sourceWs.availableForSale = (parseFloat(sourceWs.availableForSale) || 0) + quantity;
        sourceWs.physicalStockOnHand = (parseFloat(sourceWs.physicalStockOnHand) || 0) + quantity;
        sourceWs.physicalAvailableForSale = (parseFloat(sourceWs.physicalAvailableForSale) || 0) + quantity;
        await ItemGroup.findByIdAndUpdate(group._id, { $set: { [`items.${itemIndex}`]: itemPlain } });
        return { success: true, type: 'group' };
      } else if (group.items && group.items.length > 0) {
        const groupPlain = group.toObject();
        const firstItem = groupPlain.items[0];
        if (!firstItem.warehouseStocks) firstItem.warehouseStocks = [];
        let sourceWs = firstItem.warehouseStocks.find(ws => matchesWarehouse(ws.warehouse, sourceWarehouseName));
        if (!sourceWs) {
          sourceWs = { warehouse: sourceWarehouseName, openingStock: 0, openingStockValue: 0, stockOnHand: 0, committedStock: 0, availableForSale: 0, physicalOpeningStock: 0, physicalStockOnHand: 0, physicalCommittedStock: 0, physicalAvailableForSale: 0 };
          firstItem.warehouseStocks.push(sourceWs);
        }
        sourceWs.stockOnHand = (parseFloat(sourceWs.stockOnHand) || 0) + quantity;
        sourceWs.availableForSale = (parseFloat(sourceWs.availableForSale) || 0) + quantity;
        sourceWs.physicalStockOnHand = (parseFloat(sourceWs.physicalStockOnHand) || 0) + quantity;
        sourceWs.physicalAvailableForSale = (parseFloat(sourceWs.physicalAvailableForSale) || 0) + quantity;
        await ItemGroup.findByIdAndUpdate(group._id, { $set: { items: groupPlain.items } });
        return { success: true, type: 'group' };
      }
    }
  }

  return { success: false, message: `Item "${itemName || itemIdValue}" not found` };
};

// Get current stock for an item in a warehouse
// Get in-transit quantity for an item from a specific warehouse
// excludeOrderId: optional ID of transfer order to exclude (e.g., when updating that order)
const getInTransitQuantity = async (itemIdValue, sourceWarehouse, itemName = null, itemGroupId = null, itemSku = null, excludeOrderId = null) => {
  try {
    // Build query to find all transfer orders with status "in_transit" from this source warehouse
    const query = {
      sourceWarehouse: sourceWarehouse,
      status: "in_transit"
    };
    
    // Exclude a specific order if provided (useful when updating an order)
    if (excludeOrderId) {
      query._id = { $ne: excludeOrderId };
    }
    
    const inTransitOrders = await TransferOrder.find(query);
    
    let inTransitQty = 0;
    
    for (const order of inTransitOrders) {
      for (const item of order.items || []) {
        // Match by itemId (standalone items)
        if (itemIdValue && item.itemId && item.itemId === itemIdValue) {
          inTransitQty += parseFloat(item.quantity) || 0;
        }
        // Match by itemGroupId + itemName/SKU (group items)
        else if (itemGroupId && item.itemGroupId === itemGroupId) {
          if (itemSku && item.itemSku && item.itemSku.toLowerCase() === itemSku.toLowerCase()) {
            inTransitQty += parseFloat(item.quantity) || 0;
          } else if (itemName && item.itemName && item.itemName.toLowerCase() === itemName.toLowerCase()) {
            inTransitQty += parseFloat(item.quantity) || 0;
          }
        }
      }
    }
    
    return inTransitQty;
  } catch (error) {
    console.error("Error calculating in-transit quantity:", error);
    return 0;
  }
};

// Get draft quantity for an item from a specific warehouse
// excludeOrderId: optional ID of transfer order to exclude (e.g., when updating that order)
const getDraftQuantity = async (itemIdValue, sourceWarehouse, itemName = null, itemGroupId = null, itemSku = null, excludeOrderId = null) => {
  try {
    // Build query to find all transfer orders with status "draft" from this source warehouse
    const query = {
      sourceWarehouse: sourceWarehouse,
      status: "draft"
    };
    
    // Exclude a specific order if provided (useful when updating an order)
    if (excludeOrderId) {
      query._id = { $ne: excludeOrderId };
    }
    
    const draftOrders = await TransferOrder.find(query);
    
    let draftQty = 0;
    
    for (const order of draftOrders) {
      for (const item of order.items || []) {
        // Match by itemId (standalone items)
        if (itemIdValue && item.itemId && item.itemId === itemIdValue) {
          draftQty += parseFloat(item.quantity) || 0;
        }
        // Match by itemGroupId + itemName/SKU (group items)
        else if (itemGroupId && item.itemGroupId === itemGroupId) {
          if (itemSku && item.itemSku && item.itemSku.toLowerCase() === itemSku.toLowerCase()) {
            draftQty += parseFloat(item.quantity) || 0;
          } else if (itemName && item.itemName && item.itemName.toLowerCase() === itemName.toLowerCase()) {
            draftQty += parseFloat(item.quantity) || 0;
          }
        }
      }
    }
    
    return draftQty;
  } catch (error) {
    console.error("Error calculating draft quantity:", error);
    return 0;
  }
};

const getCurrentStock = async (itemIdValue, warehouseName, itemName = null, itemGroupId = null, itemSku = null, excludeOrderId = null, isGroup = false) => {
  const targetWarehouse = warehouseName?.trim() || "Warehouse";
  const normalizedTarget = normalizeWarehouseName(targetWarehouse);
  
  console.log(`\n🔍 Getting stock for warehouse: "${targetWarehouse}" (normalized: "${normalizedTarget}")`);
  console.log(`   ItemId: ${itemIdValue}, ItemName: ${itemName}, ItemGroupId: ${itemGroupId}, ItemSku: ${itemSku}, IsGroup: ${isGroup}`);
  
  // Try standalone item first
  if (itemIdValue && itemIdValue !== null && itemIdValue !== "null") {
    const shoeItem = await ShoeItem.findById(itemIdValue);
      if (shoeItem) {
        console.log(`   Found standalone item: "${shoeItem.itemName}"`);
        const availableWarehouses = shoeItem.warehouseStocks?.map(ws => {
          const normalized = normalizeWarehouseName(ws.warehouse);
          return `${ws.warehouse} (normalized: "${normalized}", stock: ${ws.stockOnHand})`;
        }).join(", ") || "none";
        console.log(`   Available warehouses:`, availableWarehouses);
        
        // Try to find matching warehouse stock
        let warehouseStock = null;
        for (const ws of (shoeItem.warehouseStocks || [])) {
          const normalizedWs = normalizeWarehouseName(ws.warehouse);
          const matches = matchesWarehouse(ws.warehouse, targetWarehouse);
          console.log(`   Checking "${ws.warehouse}" (normalized: "${normalizedWs}") against "${targetWarehouse}" (normalized: "${normalizedTarget}"): ${matches ? "✅ MATCH" : "❌ NO MATCH"}`);
          
          if (matches) {
            warehouseStock = ws;
            console.log(`   ✅ Matched "${ws.warehouse}" with target "${targetWarehouse}"`);
            break;
          }
        }
      
      if (warehouseStock) {
        console.log(`   ✅ Found stock in "${warehouseStock.warehouse}": ${warehouseStock.stockOnHand}`);
        
        const totalStock = parseFloat(warehouseStock.stockOnHand) || 0;
        
        // Stock is already physically deducted when draft/in_transit orders are created,
        // so stockOnHand IS the available stock - no need to subtract draft/transit quantities.
        console.log(`   📊 Stock: ${totalStock}`);
        
        return {
          success: true,
          stockOnHand: totalStock,
          inTransit: 0,
          draft: 0,
          availableStock: totalStock,
          currentQuantity: totalStock,
          currentValue: totalStock * (shoeItem.costPrice || 0),
        };
      } else {
        console.log(`   ❌ No stock found in "${targetWarehouse}"`);
        console.log(`   💡 Tip: Check if warehouse name matches exactly (case-insensitive) or try base name matching`);
      }
    } else {
      console.log(`   ❌ Item not found with ID: ${itemIdValue}`);
    }
  }
  
  // Try item groups
  if (itemGroupId || itemName) {
    let group = null;
    if (itemGroupId) {
      group = await ItemGroup.findById(itemGroupId);
    }
    if (!group && itemName) {
      group = await ItemGroup.findOne({ name: new RegExp(`^${itemName.trim()}$`, "i") });
    }
    if (!group && itemSku) {
      group = await ItemGroup.findOne({ sku: new RegExp(`^${itemSku.trim()}$`, "i") });
    }
    if (!group && itemSku) {
      group = await ItemGroup.findOne({ "items.sku": new RegExp(`^${itemSku.trim()}$`, "i") });
    }
    if (!group && itemName) {
      group = await ItemGroup.findOne({ "items.name": new RegExp(`^${itemName.trim()}$`, "i") });
    }

    if (group) {
      const isGroupRequested = isGroup === true || isGroup === 'true' || isGroup === '1';
      const item = !isGroupRequested ? group.items?.find(item => {
        if (itemSku && item.sku) {
          return item.sku.toLowerCase() === itemSku.toLowerCase();
        }
        return item.name && itemName && item.name.toLowerCase() === itemName.toLowerCase();
      }) : null;
      
      if (item) {
        console.log(`   Found item in group: "${item.name}"`);
        const availableWarehouses = item.warehouseStocks?.map(ws => {
          const normalized = normalizeWarehouseName(ws.warehouse);
          return `${ws.warehouse} (normalized: "${normalized}", stock: ${ws.stockOnHand})`;
        }).join(", ") || "none";
        console.log(`   Available warehouses:`, availableWarehouses);
        
        // Try to find matching warehouse stock
        let warehouseStock = null;
        for (const ws of (item.warehouseStocks || [])) {
          const normalizedWs = normalizeWarehouseName(ws.warehouse);
          const matches = matchesWarehouse(ws.warehouse, targetWarehouse);
          console.log(`   Checking "${ws.warehouse}" (normalized: "${normalizedWs}") against "${targetWarehouse}" (normalized: "${normalizedTarget}"): ${matches ? "✅ MATCH" : "❌ NO MATCH"}`);
          
          if (matches) {
            warehouseStock = ws;
            console.log(`   ✅ Matched "${ws.warehouse}" with target "${targetWarehouse}"`);
            break;
          }
        }
        
        if (warehouseStock) {
          console.log(`   ✅ Found stock in "${warehouseStock.warehouse}": ${warehouseStock.stockOnHand}`);
          const totalStock = parseFloat(warehouseStock.stockOnHand) || 0;
          return {
            success: true,
            stockOnHand: totalStock,
            inTransit: 0,
            draft: 0,
            availableStock: totalStock,
            currentQuantity: totalStock,
            currentValue: totalStock * (item.costPrice || group.costPrice || 0),
          };
        } else {
          console.log(`   ❌ No stock found in "${targetWarehouse}" for variant "${item.name}"`);
          return {
            success: true,
            stockOnHand: 0,
            inTransit: 0,
            draft: 0,
            availableStock: 0,
            currentQuantity: 0,
            currentValue: 0,
          };
        }
      } else {
        // Entire Item Group selected (aggregate variants for this target warehouse)
        console.log(`   Item Group itself selected: "${group.name}" (aggregating variants for "${targetWarehouse}")`);
        let totalStock = 0;
        let totalCost = 0;
        
        if (group.items && Array.isArray(group.items) && group.items.length > 0) {
          for (const grpItem of group.items) {
            for (const ws of (grpItem.warehouseStocks || [])) {
              if (matchesWarehouse(ws.warehouse, targetWarehouse)) {
                const qty = parseFloat(ws.stockOnHand) || 0;
                totalStock += qty;
                totalCost += qty * (grpItem.costPrice || group.costPrice || 0);
              }
            }
          }
        }
        
        console.log(`   📊 Item Group "${group.name}" stock in "${targetWarehouse}": ${totalStock}`);
        return {
          success: true,
          stockOnHand: totalStock,
          inTransit: 0,
          draft: 0,
          availableStock: totalStock,
          currentQuantity: totalStock,
          currentValue: totalCost,
        };
      }
    }
  }
  
  console.log(`   ⚠️ Returning 0 stock\n`);
  return { success: false, currentQuantity: 0, currentValue: 0 };
};

// Create a new transfer order
export const createTransferOrder = async (req, res) => {
  try {
    const transferData = req.body;
    
    // Safely parse user info
    let userId = "";
    let createdBy = "";
    try {
      const userStr = req.headers['user'] || req.body.userId;
      if (userStr) {
        if (typeof userStr === 'object' && userStr !== null) {
          userId = userStr.email || userStr._id || userStr.id || transferData.userId || "";
          createdBy = userStr.name || userStr.displayName || userId;
        } else if (typeof userStr === 'string') {
          if (userStr.trim().startsWith('{') || userStr.trim().startsWith('[')) {
            try {
              const user = JSON.parse(userStr);
              userId = user?.email || user?._id || user?.id || transferData.userId || "";
              createdBy = user?.name || user?.displayName || userId;
            } catch (e) {
              userId = userStr || transferData.userId || "";
              createdBy = userId;
            }
          } else {
            userId = userStr || transferData.userId || "";
            createdBy = userId;
          }
        } else {
          userId = transferData.userId || "";
          createdBy = userId;
        }
      } else {
        userId = transferData.userId || "";
        createdBy = userId;
      }
    } catch (parseError) {
      console.warn("Error parsing user info, using fallback:", parseError);
      userId = transferData.userId || "";
      createdBy = userId;
    }
    
    // Validate required fields
    if (!transferData.date || !transferData.sourceWarehouse || !transferData.destinationWarehouse || !transferData.transferOrderNumber) {
      return res.status(400).json({ 
        message: "Missing required fields: date, sourceWarehouse, destinationWarehouse, and transferOrderNumber are required" 
      });
    }
    
    if (transferData.sourceWarehouse === transferData.destinationWarehouse) {
      return res.status(400).json({ 
        message: "Source and destination warehouses cannot be the same" 
      });
    }
    
    // Validate status
    if (transferData.status && !["draft", "in_transit", "transferred"].includes(transferData.status)) {
      return res.status(400).json({ 
        message: "Invalid status. Must be 'draft', 'in_transit', or 'transferred'" 
      });
    }
    
    // Validate userId
    if (!userId || userId === "") {
      return res.status(400).json({ 
        message: "User ID is required. Please ensure you are logged in." 
      });
    }
    
    // Parse date safely
    let transferDate;
    try {
      if (transferData.date instanceof Date) {
        transferDate = transferData.date;
      } else if (typeof transferData.date === 'string') {
        transferDate = new Date(transferData.date);
        if (isNaN(transferDate.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
      } else {
        return res.status(400).json({ message: "Date is required and must be a valid date" });
      }
    } catch (dateError) {
      console.error("Error parsing date:", dateError);
      return res.status(400).json({ message: "Invalid date format" });
    }
    
    // Process items and calculate totals
    let totalQuantityTransferred = 0;
    const processedItems = [];
    
    // Validate items array
    if (!Array.isArray(transferData.items) || transferData.items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }
    
    for (const item of transferData.items) {
      if (!item.itemName) continue;
      
      try {
        const quantity = parseFloat(item.quantity) || 0;
        if (quantity <= 0) continue;
        
        // Get current stock in source warehouse
        const sourceStockInfo = await getCurrentStock(
          item.itemId || null,
          transferData.sourceWarehouse,
          item.itemName,
          item.itemGroupId || null,
          item.itemSku || null
        );
        
        const sourceQuantity = sourceStockInfo.currentQuantity || 0;
        
        // Get current stock in destination warehouse
        const destStockInfo = await getCurrentStock(
          item.itemId || null,
          transferData.destinationWarehouse,
          item.itemName,
          item.itemGroupId || null,
          item.itemSku || null
        );
        
        const destQuantity = destStockInfo.currentQuantity || 0;
        
        totalQuantityTransferred += quantity;
        
        processedItems.push({
          itemId: item.itemId ? String(item.itemId) : null,
          itemGroupId: item.itemGroupId ? String(item.itemGroupId) : null,
          itemName: item.itemName,
          itemSku: item.itemSku || "",
          quantity,
          sourceQuantity,
          destQuantity,
        });
      } catch (itemError) {
        console.error(`Error processing item ${item.itemName}:`, itemError);
      }
    }
    
    if (processedItems.length === 0) {
      return res.status(400).json({ message: "No valid items to process" });
    }
    
    // Prepare transfer order data
    const transferOrderData = {
      transferOrderNumber: transferData.transferOrderNumber,
      date: transferDate,
      reason: transferData.reason || "",
      sourceWarehouse: transferData.sourceWarehouse,
      destinationWarehouse: transferData.destinationWarehouse,
      items: processedItems,
      totalQuantityTransferred,
      userId,
      createdBy: userId || createdBy,
      status: transferData.status || "draft",
      locCode: transferData.locCode || "",
      attachments: transferData.attachments || [],
    };
    
    let postgresOrder = null;
    let mongoOrder = null;
    
    try {
      // Save to PostgreSQL first
      postgresOrder = await TransferOrderPostgres.create(transferOrderData);
      console.log(`✅ PostgreSQL transfer order created: ${transferOrderData.transferOrderNumber} (ID: ${postgresOrder.id})`);
      
      // Save to MongoDB with PostgreSQL ID reference
      const mongoData = {
        ...transferOrderData,
        postgresId: postgresOrder.id.toString(),
      };
      mongoOrder = await TransferOrder.create(mongoData);
      console.log(`✅ MongoDB transfer order created: ${transferOrderData.transferOrderNumber} (ID: ${mongoOrder._id})`);
      
      // Stock transfer logic:
      // - draft / in_transit: Deduct from source immediately (stock is "in transit", not available)
      // - transferred: Full transfer (subtract source + add destination) for direct completion
      // - When receiving (in_transit -> transferred): Only add to destination (source already deducted)
      
      if (postgresOrder.status === "transferred") {
        // Direct completion: subtract source AND add destination
        console.log(`📦 Transfer order created with status "transferred" - Transferring stock immediately`);
        const items = postgresOrder.items || [];
        for (const item of items) {
          try {
            const result = await transferItemStock(
              item.itemId,
              item.quantity,
              transferData.sourceWarehouse,
              transferData.destinationWarehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
            if (!result.success) {
              console.warn(`Failed to transfer stock for item ${item.itemName}:`, result.message);
            } else {
              console.log(`✅ Stock transferred for item ${item.itemName}: ${item.quantity} units`);
            }
          } catch (stockError) {
            console.error(`Error transferring stock for item ${item.itemName}:`, stockError);
          }
        }
      } else {
        // draft or in_transit: deduct from source only
        console.log(`📦 Transfer order created with status "${postgresOrder.status}" - Deducting stock from source warehouse`);
        const items = postgresOrder.items || [];
        for (const item of items) {
          try {
            const result = await deductSourceStock(
              item.itemId,
              item.quantity,
              transferData.sourceWarehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
            if (!result.success) {
              console.warn(`Failed to deduct source stock for item ${item.itemName}:`, result.message);
            } else {
              console.log(`✅ Source stock deducted for item ${item.itemName}: ${item.quantity} units`);
            }
          } catch (stockError) {
            console.error(`Error deducting source stock for item ${item.itemName}:`, stockError);
          }
        }
      }
      
      // Return PostgreSQL order as primary (or merge both if needed)
      res.status(201).json({
        ...postgresOrder.toJSON(),
        mongoId: mongoOrder._id.toString(),
      });
    } catch (pgError) {
      console.error("❌ Error creating transfer order in PostgreSQL:", pgError);
      // If PostgreSQL fails, try MongoDB only
      try {
        if (!mongoOrder) {
          mongoOrder = await TransferOrder.create(transferOrderData);
          console.log(`⚠️ MongoDB transfer order created (PostgreSQL failed): ${transferOrderData.transferOrderNumber}`);
        }
        
        // IMPORTANT: Also handle stock transfer for MongoDB-only orders
        if (mongoOrder.status === "transferred") {
          console.log(`📦 MongoDB-only transfer order created with status "transferred" - Transferring stock immediately`);
          const items = mongoOrder.items || [];
          for (const item of items) {
            try {
              const result = await transferItemStock(
                item.itemId,
                item.quantity,
                transferData.sourceWarehouse,
                transferData.destinationWarehouse,
                item.itemName,
                item.itemGroupId,
                item.itemSku
              );
              if (!result.success) {
                console.warn(`Failed to transfer stock for item ${item.itemName}:`, result.message);
              } else {
                console.log(`✅ Stock transferred for item ${item.itemName}: ${item.quantity} units`);
              }
            } catch (stockError) {
              console.error(`Error transferring stock for item ${item.itemName}:`, stockError);
            }
          }
        } else {
          // draft or in_transit: deduct from source only
          console.log(`📦 MongoDB-only transfer order created with status "${mongoOrder.status}" - Deducting stock from source warehouse`);
          const items = mongoOrder.items || [];
          for (const item of items) {
            try {
              const result = await deductSourceStock(
                item.itemId,
                item.quantity,
                transferData.sourceWarehouse,
                item.itemName,
                item.itemGroupId,
                item.itemSku
              );
              if (!result.success) {
                console.warn(`Failed to deduct source stock for item ${item.itemName}:`, result.message);
              } else {
                console.log(`✅ Source stock deducted for item ${item.itemName}: ${item.quantity} units`);
              }
            } catch (stockError) {
              console.error(`Error deducting source stock for item ${item.itemName}:`, stockError);
            }
          }
        }
        
        res.status(201).json({
          ...mongoOrder.toJSON(),
          _id: mongoOrder._id.toString(),
          warning: "Saved to MongoDB only (PostgreSQL save failed)",
        });
      } catch (mongoError) {
        console.error("❌ Error creating transfer order in MongoDB:", mongoError);
        // If MongoDB also fails, try to clean up PostgreSQL if it was created
        if (postgresOrder) {
          try {
            await postgresOrder.destroy();
          } catch (cleanupError) {
            console.error("Error cleaning up PostgreSQL order:", cleanupError);
          }
        }
        throw new Error("Failed to save transfer order to both databases");
      }
    }
  } catch (error) {
    console.error("Error creating transfer order:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all transfer orders
export const getTransferOrders = async (req, res) => {
  try {
    const { userId, sourceWarehouse, destinationWarehouse, status, startDate, endDate, userPower, locCode } = req.query;
    
    // Validate and sanitize warehouse parameters - ignore if undefined/null
    const validSourceWarehouse = sourceWarehouse && sourceWarehouse !== 'undefined' && sourceWarehouse !== 'null' ? sourceWarehouse : null;
    const validDestinationWarehouse = destinationWarehouse && destinationWarehouse !== 'undefined' && destinationWarehouse !== 'null' ? destinationWarehouse : null;
    
    // Check if user is admin or warehouse user
    const isAdmin = userPower === 'admin' || (userId && userId.toLowerCase() === 'officerootments@gmail.com');
    const isWarehouseUser = userPower === 'warehouse' || locCode === '858' || locCode === '103';
    
    console.log(`\n=== GET TRANSFER ORDERS REQUEST ===`);
    console.log(`Query params:`, req.query);
    console.log(`User: ${userId}, Power: ${userPower}, LocCode: ${locCode}`);
    console.log(`Is Admin: ${isAdmin}, Is Warehouse User: ${isWarehouseUser}`);
    if (validDestinationWarehouse) {
      console.log(`Filtering by destinationWarehouse: "${validDestinationWarehouse}"`);
    }
    if (validSourceWarehouse) {
      console.log(`Filtering by sourceWarehouse: "${validSourceWarehouse}"`);
    }
    console.log(`==============================\n`);
    
    // Don't filter by sourceWarehouse or destinationWarehouse here - we'll filter after fetching
    // This allows for flexible matching (e.g., "Kannur" vs "Kannur Branch")
    
    const mongoQuery = {};
    
    // Filter by userId ONLY for non-admin, non-warehouse users (store users) 
    // BUT: If warehouse filters are provided, don't filter by userId - let warehouse filtering handle it
    // This allows store users to see transfer orders to/from their warehouse regardless of who created them
    if (userId && !isAdmin && !isWarehouseUser && !validSourceWarehouse && !validDestinationWarehouse) {
      mongoQuery.userId = userId;
      console.log(`Filtering by userId: "${userId}" (store user, no warehouse filter)`);
    } else if (isAdmin || isWarehouseUser) {
      console.log(`Admin/Warehouse user - showing ALL transfer orders`);
    } else if (validSourceWarehouse || validDestinationWarehouse) {
      console.log(`Store user with warehouse filter - showing orders for their warehouse (ignoring userId)`);
    }
    
    if (status) {
      mongoQuery.status = status;
    }
    
    if (startDate || endDate) {
      mongoQuery.date = {};
      if (startDate) mongoQuery.date.$gte = new Date(startDate);
      if (endDate) mongoQuery.date.$lte = new Date(endDate);
    }
    
    // Fetch all matching orders from MongoDB
    let transferOrders = await TransferOrder.find(mongoQuery)
      .sort({ date: -1, createdAt: -1 })
      .limit(1000)
      .lean();
    
    console.log(`Found ${transferOrders.length} transfer orders before warehouse filtering`);
    
    // Helper function to match warehouse names flexibly
    const matchesWarehouse = (orderWarehouse, targetWarehouse) => {
      if (!orderWarehouse || !targetWarehouse) return false;
      
      // Normalize both warehouse names using the normalization function
      const normalizedOrder = normalizeWarehouseName(orderWarehouse);
      const normalizedTarget = normalizeWarehouseName(targetWarehouse);
      
      // Exact match after normalization
      if (normalizedOrder && normalizedTarget && normalizedOrder.toLowerCase() === normalizedTarget.toLowerCase()) {
        return true;
      }
      
      // Fallback to original flexible matching
      const orderWarehouseLower = orderWarehouse.toString().toLowerCase().trim();
      const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
      const orderBase = orderWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
      const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
      
      // Exact match
      if (orderWarehouseLower === targetWarehouseLower) {
        return true;
      }
      
      // Base name match (e.g., "kannur" matches "kannur branch")
      if (orderBase && targetBase && orderBase === targetBase) {
        return true;
      }
      
      // Special handling for Trivandrum variations
      const trivandrumVariations = ["trivandrum", "grooms trivandrum", "sg-trivandrum"];
      const orderIsTrivandrum = trivandrumVariations.some(v => orderWarehouseLower.includes(v));
      const targetIsTrivandrum = trivandrumVariations.some(v => targetWarehouseLower.includes(v));
      if (orderIsTrivandrum && targetIsTrivandrum) {
        return true;
      }
      
      // Partial match
      if (orderWarehouseLower.includes(targetWarehouseLower) || targetWarehouseLower.includes(orderWarehouseLower)) {
        return true;
      }
      
      return false;
    };
    
    // Filter by destinationWarehouse OR sourceWarehouse (store users see orders where they are source OR destination)
    if (validDestinationWarehouse || validSourceWarehouse) {
      // If both are provided and they're the same, show orders where user's warehouse is source OR destination
      // This allows stores to see all their transfer orders (both incoming and outgoing)
      const targetWarehouse = validDestinationWarehouse || validSourceWarehouse;
      const isDestinationFilter = !!destinationWarehouse;
      const isSourceFilter = !!sourceWarehouse;
      const bothProvided = isDestinationFilter && isSourceFilter;
      
      console.log(`Filtering for warehouse: "${targetWarehouse}"`);
      if (bothProvided && destinationWarehouse === sourceWarehouse) {
        console.log(`  Showing orders where warehouse is source OR destination`);
      } else if (isDestinationFilter) {
        console.log(`  Showing orders where warehouse is destination`);
      } else if (isSourceFilter) {
        console.log(`  Showing orders where warehouse is source`);
      }
      
      // Log all warehouses for debugging
      if (transferOrders.length > 0) {
        const uniqueSources = [...new Set(transferOrders.map(o => o.sourceWarehouse))];
        const uniqueDestinations = [...new Set(transferOrders.map(o => o.destinationWarehouse))];
        console.log(`All source warehouses:`, uniqueSources);
        console.log(`All destination warehouses:`, uniqueDestinations);
      }
      
      transferOrders = transferOrders.filter(order => {
        const matchesDest = matchesWarehouse(order.destinationWarehouse, targetWarehouse);
        const matchesSource = matchesWarehouse(order.sourceWarehouse, targetWarehouse);
        
        // IMPORTANT: Draft orders should only show at source warehouse, not destination
        // This allows source to edit/send draft orders before destination sees them
        if (order.status === 'draft' && matchesDest && !matchesSource) {
          console.log(`❌ Excluding draft order from destination: ${order.transferOrderNumber}`);
          return false;
        }
        
        // If both filters provided and same warehouse, show if matches destination OR source
        // Otherwise, show based on which filter was provided
        if (bothProvided && destinationWarehouse === sourceWarehouse) {
          // Show if matches destination OR source (user wants to see all their orders)
          // But exclude drafts if user is destination only
          if (matchesDest || matchesSource) {
            // If user is destination and order is draft, exclude it
            if (order.status === 'draft' && matchesDest && !matchesSource) {
              return false;
            }
            console.log(`✅ Match: Order ${order.transferOrderNumber} - Source: "${order.sourceWarehouse}", Dest: "${order.destinationWarehouse}", Status: "${order.status}"`);
            return true;
          }
        } else if (isDestinationFilter) {
          // Show only if matches destination, BUT exclude draft orders
          if (matchesDest && order.status !== 'draft') {
            console.log(`✅ Match (destination): Order ${order.transferOrderNumber} - Dest: "${order.destinationWarehouse}", Status: "${order.status}"`);
            return true;
          }
        } else if (isSourceFilter) {
          // Show only if matches source (drafts are OK here)
          if (matchesSource) {
            console.log(`✅ Match (source): Order ${order.transferOrderNumber} - Source: "${order.sourceWarehouse}", Status: "${order.status}"`);
            return true;
          }
        }
        
        return false;
      });
      
      console.log(`Filtered to ${transferOrders.length} transfer orders`);
    }
    
    console.log(`Returning ${transferOrders.length} transfer orders`);
    
    res.status(200).json(transferOrders);
  } catch (error) {
    console.error("Error fetching transfer orders:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single transfer order by ID
export const getTransferOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      console.error('❌ Invalid transfer order ID:', id);
      return res.status(400).json({ 
        message: "Invalid transfer order ID. Please refresh the page and try again." 
      });
    }
    
    // Try MongoDB first (primary source for new orders)
    let transferOrder = await TransferOrder.findById(id);
    
    // If not found in MongoDB, try PostgreSQL (for legacy orders)
    if (!transferOrder) {
      transferOrder = await TransferOrderPostgres.findByPk(id);
    }
    
    if (!transferOrder) {
      return res.status(404).json({ message: "Transfer order not found" });
    }
    
    res.status(200).json(transferOrder);
  } catch (error) {
    console.error("Error fetching transfer order:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a transfer order
export const updateTransferOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const transferData = req.body;
    
    // Safely parse user info
    let userId = "";
    let modifiedBy = "";
    try {
      const userStr = req.headers['user'] || req.body.userId;
      if (userStr) {
        if (typeof userStr === 'object' && userStr !== null) {
          userId = userStr.email || userStr._id || userStr.id || transferData.userId || "";
          modifiedBy = userStr.name || userStr.displayName || userId;
        } else if (typeof userStr === 'string') {
          if (userStr.trim().startsWith('{') || userStr.trim().startsWith('[')) {
            try {
              const user = JSON.parse(userStr);
              userId = user?.email || user?._id || user?.id || transferData.userId || "";
              modifiedBy = user?.name || user?.displayName || userId;
            } catch (e) {
              userId = userStr || transferData.userId || "";
              modifiedBy = userId;
            }
          } else {
            userId = userStr || transferData.userId || "";
            modifiedBy = userId;
          }
        } else {
          userId = transferData.userId || "";
          modifiedBy = userId;
        }
      } else {
        userId = transferData.userId || "";
        modifiedBy = userId;
      }
    } catch (parseError) {
      console.warn("Error parsing user info, using fallback:", parseError);
      userId = transferData.userId || "";
      modifiedBy = userId;
    }
    
    // Check if ID is MongoDB ObjectId (24 hex chars) or PostgreSQL UUID
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
    
    let existingOrder = null;
    let mongoOrder = null;
    
    if (isMongoId) {
      // This is a MongoDB-only order
      console.log(`📝 Updating MongoDB transfer order: ${id}`);
      mongoOrder = await TransferOrder.findById(id);
      
      if (!mongoOrder) {
        return res.status(404).json({ message: "Transfer order not found" });
      }
      
      const oldStatus = mongoOrder.status;
      const newStatus = transferData.status || oldStatus;
      
      // If changing from draft/in_transit to transferred, only add to destination (source already deducted)
      if ((oldStatus === "draft" || oldStatus === "in_transit") && newStatus === "transferred") {
        const items = mongoOrder.items || [];
        for (const item of items) {
          try {
            const result = await addDestinationStock(
              item.itemId,
              item.quantity,
              mongoOrder.destinationWarehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
            if (!result.success) {
              console.warn(`Failed to add destination stock for item ${item.itemName}:`, result.message);
            }
          } catch (stockError) {
            console.error(`Error adding destination stock for item ${item.itemName}:`, stockError);
          }
        }
      }
      
      // If changing from transferred back to draft/in_transit, only remove from destination (source stays deducted)
      if (oldStatus === "transferred" && (newStatus === "draft" || newStatus === "in_transit")) {
        const items = mongoOrder.items || [];
        for (const item of items) {
          try {
            // Remove from destination only
            const result = await deductSourceStock(
              item.itemId,
              item.quantity,
              mongoOrder.destinationWarehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
            if (!result.success) {
              console.warn(`Failed to remove destination stock for item ${item.itemName}:`, result.message);
            }
          } catch (stockError) {
            console.error(`Error removing destination stock for item ${item.itemName}:`, stockError);
          }
        }
      }
      
      // Update MongoDB order
      mongoOrder.status = newStatus;
      mongoOrder.reason = transferData.reason || mongoOrder.reason;
      mongoOrder.modifiedBy = userId || modifiedBy;
      if (transferData.items) {
        mongoOrder.items = transferData.items;
        // Recalculate totalQuantityTransferred when items are updated
        mongoOrder.totalQuantityTransferred = transferData.items.reduce((sum, item) => {
          return sum + (parseFloat(item.quantity) || 0);
        }, 0);
      }
      if (transferData.attachments) mongoOrder.attachments = transferData.attachments;
      await mongoOrder.save();
      
      console.log(`✅ MongoDB transfer order updated: ${mongoOrder.transferOrderNumber}`);
      return res.status(200).json(mongoOrder);
      
    } else {
      // This is a PostgreSQL order
      console.log(`📝 Updating PostgreSQL transfer order: ${id}`);
      existingOrder = await TransferOrderPostgres.findByPk(id);
      
      if (!existingOrder) {
        return res.status(404).json({ message: "Transfer order not found" });
      }
      
      // Get MongoDB order for sync
      try {
        mongoOrder = await TransferOrder.findOne({ postgresId: id.toString() });
      } catch (mongoError) {
        console.warn("MongoDB order not found for sync:", mongoError);
      }
      
      const oldStatus = existingOrder.status;
      const newStatus = transferData.status || oldStatus;
    
    // If changing from draft/in_transit to transferred, only add to destination (source already deducted)
    if ((oldStatus === "draft" || oldStatus === "in_transit") && newStatus === "transferred") {
      const items = existingOrder.items || [];
      for (const item of items) {
        try {
          const result = await addDestinationStock(
            item.itemId,
            item.quantity,
            existingOrder.destinationWarehouse,
            item.itemName,
            item.itemGroupId,
            item.itemSku
          );
          if (!result.success) {
            console.warn(`Failed to add destination stock for item ${item.itemName}:`, result.message);
          }
        } catch (stockError) {
          console.error(`Error adding destination stock for item ${item.itemName}:`, stockError);
        }
      }
    }
    
    // If changing from transferred back to draft/in_transit, only remove from destination (source stays deducted)
    if (oldStatus === "transferred" && (newStatus === "draft" || newStatus === "in_transit")) {
      const items = existingOrder.items || [];
      for (const item of items) {
        try {
          // Remove from destination only
          const result = await deductSourceStock(
            item.itemId,
            item.quantity,
            existingOrder.destinationWarehouse,
            item.itemName,
            item.itemGroupId,
            item.itemSku
          );
          if (!result.success) {
            console.warn(`Failed to remove destination stock for item ${item.itemName}:`, result.message);
          }
        } catch (stockError) {
          console.error(`Error removing destination stock for item ${item.itemName}:`, stockError);
        }
      }
    }
    
    // Recalculate totalQuantityTransferred if items are being updated
    if (transferData.items && Array.isArray(transferData.items)) {
      transferData.totalQuantityTransferred = transferData.items.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) || 0);
      }, 0);
      console.log(`📊 Recalculated totalQuantityTransferred: ${transferData.totalQuantityTransferred}`);
    }
    
    // Update the transfer order in PostgreSQL
    transferData.modifiedBy = userId || modifiedBy;
    await existingOrder.update(transferData);
    console.log(`✅ PostgreSQL transfer order updated: ${existingOrder.transferOrderNumber} (ID: ${id})`);
    
    // Sync to MongoDB
    try {
      if (mongoOrder) {
        // Update existing MongoDB order
        mongoOrder.status = existingOrder.status;
        mongoOrder.reason = existingOrder.reason || "";
        mongoOrder.modifiedBy = existingOrder.modifiedBy || "";
        if (transferData.items) {
          mongoOrder.items = transferData.items;
          // Sync the recalculated totalQuantityTransferred
          mongoOrder.totalQuantityTransferred = existingOrder.totalQuantityTransferred;
        }
        if (transferData.attachments) mongoOrder.attachments = transferData.attachments;
        await mongoOrder.save();
        console.log(`✅ MongoDB transfer order updated: ${existingOrder.transferOrderNumber} (ID: ${mongoOrder._id})`);
      } else {
        // Create MongoDB order if it doesn't exist (sync scenario)
        const mongoData = {
          transferOrderNumber: existingOrder.transferOrderNumber,
          date: existingOrder.date,
          reason: existingOrder.reason || "",
          sourceWarehouse: existingOrder.sourceWarehouse,
          destinationWarehouse: existingOrder.destinationWarehouse,
          items: existingOrder.items || [],
          attachments: existingOrder.attachments || [],
          totalQuantityTransferred: parseFloat(existingOrder.totalQuantityTransferred) || 0,
          userId: existingOrder.userId,
          createdBy: existingOrder.createdBy || "",
          modifiedBy: existingOrder.modifiedBy || "",
          status: existingOrder.status,
          locCode: existingOrder.locCode || "",
          postgresId: existingOrder.id.toString(),
        };
        const newMongoOrder = await TransferOrder.create(mongoData);
        console.log(`✅ MongoDB transfer order created (sync): ${existingOrder.transferOrderNumber} (ID: ${newMongoOrder._id})`);
      }
    } catch (mongoError) {
      console.error("⚠️ Error syncing to MongoDB (non-critical):", mongoError);
      // Don't fail the request if MongoDB sync fails
    }
    
    // Reload to get updated data
    await existingOrder.reload();
    
    return res.status(200).json(existingOrder);
    } // Close else block
  } catch (error) {
    console.error("Error updating transfer order:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Receive a transfer order (change status from in_transit to transferred)
export const receiveTransferOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      console.error('❌ Invalid transfer order ID:', id);
      return res.status(400).json({ 
        message: "Invalid transfer order ID. Please refresh the page and try again." 
      });
    }
    
    // Safely parse user info
    let userId = "";
    let modifiedBy = "";
    try {
      const userStr = req.headers['user'] || req.body.userId;
      if (userStr) {
        if (typeof userStr === 'object' && userStr !== null) {
          userId = userStr.email || userStr._id || userStr.id || "";
          modifiedBy = userStr.name || userStr.displayName || userId;
        } else if (typeof userStr === 'string') {
          if (userStr.trim().startsWith('{') || userStr.trim().startsWith('[')) {
            try {
              const user = JSON.parse(userStr);
              userId = user?.email || user?._id || user?.id || "";
              modifiedBy = user?.name || user?.displayName || userId;
            } catch (e) {
              userId = userStr || "";
              modifiedBy = userId;
            }
          } else {
            userId = userStr || "";
            modifiedBy = userId;
          }
        } else {
          userId = "";
          modifiedBy = "";
        }
      }
    } catch (parseError) {
      console.warn("Error parsing user info, using fallback:", parseError);
      userId = "";
      modifiedBy = "";
    }
    
    // Try MongoDB first (primary source for new orders)
    let transferOrder = await TransferOrder.findById(id);
    let isMongoOrder = !!transferOrder;
    
    // If not found in MongoDB, try PostgreSQL (for legacy orders)
    if (!transferOrder) {
      transferOrder = await TransferOrderPostgres.findByPk(id);
      isMongoOrder = false;
    }
    
    if (!transferOrder) {
      return res.status(404).json({ message: "Transfer order not found" });
    }
    
    console.log(`📦 Receiving transfer order from ${isMongoOrder ? 'MongoDB' : 'PostgreSQL'}: ${id}`);
    
    // Only allow receiving if status is "in_transit"
    if (transferOrder.status !== "in_transit") {
      return res.status(400).json({ 
        message: `Cannot receive transfer order. Current status is "${transferOrder.status}". Only orders with status "in_transit" can be received.` 
      });
    }
    
    // Check if stock was already transferred when order was created
    // If the order was created with "in_transit" status, stock might have been transferred already
    // We need to check if stock was already transferred by comparing current stock with expected stock
    const items = transferOrder.items || [];
    const stockUpdates = [];
    
    console.log(`\n=== RECEIVING TRANSFER ORDER ${id} ===`);
    console.log(`Source: ${transferOrder.sourceWarehouse} -> Destination: ${transferOrder.destinationWarehouse}`);
    console.log(`Items to transfer: ${items.length}`);
    console.log(`⚠️ IMPORTANT: Checking if stock was already transferred...`);
    
    for (const item of items) {
      try {
        console.log(`\nProcessing item: ${item.itemName} (Qty: ${item.quantity})`);
        
        // Get current stock in destination warehouse BEFORE any transfer
        const stockBeforeReceive = await getCurrentStock(
          item.itemId,
          transferOrder.destinationWarehouse,
          item.itemName,
          item.itemGroupId,
          item.itemSku
        );
        console.log(`  📊 Current stock in ${transferOrder.destinationWarehouse}: ${stockBeforeReceive.stockOnHand || 0}`);
        
        // Get current stock in source warehouse
        const sourceStockBefore = await getCurrentStock(
          item.itemId,
          transferOrder.sourceWarehouse,
          item.itemName,
          item.itemGroupId,
          item.itemSku
        );
        console.log(`  📊 Current stock in ${transferOrder.sourceWarehouse}: ${sourceStockBefore.stockOnHand || 0}`);
        
        // Transfer stock: source was already deducted when order was created as draft/in_transit.
        // Now only add to destination warehouse.
        const result = await addDestinationStock(
          item.itemId,
          item.quantity,
          transferOrder.destinationWarehouse,
          item.itemName,
          item.itemGroupId,
          item.itemSku
        );
        
        if (result.success) {
          // Get current stock after transfer
          const stockAfter = await getCurrentStock(
            item.itemId,
            transferOrder.destinationWarehouse,
            item.itemName,
            item.itemGroupId,
            item.itemSku
          );
          console.log(`  📊 Stock AFTER transfer in ${transferOrder.destinationWarehouse}: ${stockAfter.stockOnHand || 0}`);
          console.log(`  ✅ Added ${item.quantity} units (${stockBeforeReceive.stockOnHand || 0} → ${stockAfter.stockOnHand || 0})`);
          
          stockUpdates.push({
            itemName: item.itemName,
            itemSku: item.itemSku || item.itemId,
            quantity: item.quantity,
            destinationWarehouse: transferOrder.destinationWarehouse,
            stockBefore: stockBeforeReceive.stockOnHand || 0,
            stockAfter: stockAfter.stockOnHand || 0,
            status: "success"
          });
        } else {
          stockUpdates.push({
            itemName: item.itemName,
            quantity: item.quantity,
            status: "failed",
            error: result.message
          });
          console.warn(`❌ Failed to transfer stock for item ${item.itemName}:`, result.message);
        }
      } catch (stockError) {
        stockUpdates.push({
          itemName: item.itemName,
          quantity: item.quantity,
          status: "error",
          error: stockError.message
        });
        console.error(`❌ Error transferring stock for item ${item.itemName}:`, stockError);
      }
    }
    
    console.log(`\nStock transfer summary:`);
    stockUpdates.forEach(update => {
      if (update.status === "success") {
        console.log(`  ✅ ${update.itemName}: ${update.quantity} units added to ${transferOrder.destinationWarehouse}`);
      } else {
        console.log(`  ❌ ${update.itemName}: Failed - ${update.error || "Unknown error"}`);
      }
    });
    console.log(`=== END RECEIVING TRANSFER ORDER ===\n`);
    
    // Update status to transferred
    if (isMongoOrder) {
      // Update MongoDB order
      transferOrder.status = "transferred";
      transferOrder.modifiedBy = modifiedBy || userId || "";
      await transferOrder.save();
      console.log(`✅ MongoDB transfer order received: ${transferOrder.transferOrderNumber} (ID: ${id})`);
      
      // Sync to PostgreSQL if postgresId exists
      if (transferOrder.postgresId) {
        try {
          const pgOrder = await TransferOrderPostgres.findByPk(transferOrder.postgresId);
          if (pgOrder) {
            await pgOrder.update({
              status: "transferred",
              modifiedBy: modifiedBy || userId,
            });
            console.log(`✅ PostgreSQL transfer order synced: ${transferOrder.transferOrderNumber}`);
          }
        } catch (pgError) {
          console.warn("⚠️ Error syncing to PostgreSQL (non-critical):", pgError);
        }
      }
    } else {
      // Update PostgreSQL order
      await transferOrder.update({
        status: "transferred",
        modifiedBy: modifiedBy || userId,
      });
      console.log(`✅ PostgreSQL transfer order received: ${transferOrder.transferOrderNumber} (ID: ${id})`);
      
      // Sync to MongoDB
      try {
        const mongoOrder = await TransferOrder.findOne({ postgresId: id.toString() });
        if (mongoOrder) {
          mongoOrder.status = "transferred";
          mongoOrder.modifiedBy = modifiedBy || userId || "";
          await mongoOrder.save();
          console.log(`✅ MongoDB transfer order synced: ${transferOrder.transferOrderNumber}`);
        } else {
          // Create MongoDB order if it doesn't exist (sync scenario)
          const mongoData = {
            transferOrderNumber: transferOrder.transferOrderNumber,
            date: transferOrder.date,
            reason: transferOrder.reason || "",
            sourceWarehouse: transferOrder.sourceWarehouse,
            destinationWarehouse: transferOrder.destinationWarehouse,
            items: transferOrder.items || [],
            attachments: transferOrder.attachments || [],
            totalQuantityTransferred: parseFloat(transferOrder.totalQuantityTransferred) || 0,
            userId: transferOrder.userId,
            createdBy: transferOrder.createdBy || "",
            modifiedBy: modifiedBy || userId || "",
            status: "transferred",
            locCode: transferOrder.locCode || "",
            postgresId: transferOrder.id.toString(),
          };
          const newMongoOrder = await TransferOrder.create(mongoData);
          console.log(`✅ MongoDB transfer order created (sync): ${transferOrder.transferOrderNumber} (ID: ${newMongoOrder._id})`);
        }
      } catch (mongoError) {
        console.error("⚠️ Error syncing to MongoDB (non-critical):", mongoError);
        // Don't fail the request if MongoDB sync fails
      }
      
      // Reload to get updated data
      await transferOrder.reload();
    }
    
    res.status(200).json({
      message: "Transfer order received successfully",
      transferOrder,
      stockUpdates: stockUpdates // Include stock update details in response
    });
  } catch (error) {
    console.error("Error receiving transfer order:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a transfer order
export const deleteTransferOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`\n🗑️ DELETE TRANSFER ORDER REQUEST:`);
    console.log(`   ID: ${id}`);
    
    // Check if ID is MongoDB ObjectId format (24 hex characters)
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
    console.log(`   ID Format: ${isMongoId ? 'MongoDB ObjectId' : 'PostgreSQL UUID'}`);
    
    let transferOrder = null;
    
    // If it's a MongoDB ID, skip PostgreSQL and go directly to MongoDB
    if (isMongoId) {
      console.log(`   ⚠️ MongoDB ID detected, skipping PostgreSQL query...`);
      
      try {
        const mongoOrder = await TransferOrder.findById(id);
        if (mongoOrder) {
          console.log(`   ✅ Found in MongoDB: ${mongoOrder.transferOrderNumber}`);
          console.log(`   Status: ${mongoOrder.status}`);
          
          // If status is "transferred", reverse full stock transfer (both source and destination)
          // If status is "draft" or "in_transit", only restore source stock (destination was never updated)
          if (mongoOrder.status === "transferred") {
            console.log(`   ⚠️ Status is "transferred", reversing full stock transfer...`);
            const items = mongoOrder.items || [];
            for (const item of items) {
              try {
                const result = await reverseTransferStock(
                  item.itemId,
                  item.quantity,
                  mongoOrder.sourceWarehouse,
                  mongoOrder.destinationWarehouse,
                  item.itemName,
                  item.itemGroupId,
                  item.itemSku
                );
                if (!result.success) {
                  console.warn(`   ⚠️ Failed to reverse transfer stock for item ${item.itemName}:`, result.message);
                } else {
                  console.log(`   ✅ Reversed stock for item ${item.itemName}`);
                }
              } catch (stockError) {
                console.error(`   ❌ Error reversing transfer stock for item ${item.itemName}:`, stockError);
              }
            }
          } else if (mongoOrder.status === "draft" || mongoOrder.status === "in_transit") {
            console.log(`   ⚠️ Status is "${mongoOrder.status}", restoring source stock...`);
            const items = mongoOrder.items || [];
            for (const item of items) {
              try {
                const result = await restoreSourceStock(
                  item.itemId,
                  item.quantity,
                  mongoOrder.sourceWarehouse,
                  item.itemName,
                  item.itemGroupId,
                  item.itemSku
                );
                if (!result.success) {
                  console.warn(`   ⚠️ Failed to restore source stock for item ${item.itemName}:`, result.message);
                } else {
                  console.log(`   ✅ Restored source stock for item ${item.itemName}`);
                }
              } catch (stockError) {
                console.error(`   ❌ Error restoring source stock for item ${item.itemName}:`, stockError);
              }
            }
          }
          
          // Delete from MongoDB
          await TransferOrder.findByIdAndDelete(id);
          console.log(`   ✅ MongoDB transfer order deleted: ${mongoOrder.transferOrderNumber} (ID: ${id})`);
          console.log(`   ✅ Transfer order deletion completed successfully`);
          return res.status(200).json({ message: "Transfer order deleted successfully (MongoDB)" });
        } else {
          console.log(`   ❌ Not found in MongoDB`);
          return res.status(404).json({ message: "Transfer order not found" });
        }
      } catch (mongoError) {
        console.error("   ❌ Error deleting from MongoDB:", mongoError);
        return res.status(500).json({ message: "Server error", error: mongoError.message });
      }
    }
    
    // Otherwise, try PostgreSQL first (for UUID format IDs)
    try {
      transferOrder = await TransferOrderPostgres.findByPk(id);
    } catch (pgError) {
      console.log(`   ⚠️ PostgreSQL query failed (invalid UUID format), trying MongoDB...`);
      
      // If PostgreSQL query fails (invalid UUID), try MongoDB
      try {
        const mongoOrder = await TransferOrder.findByIdAndDelete(id);
        if (mongoOrder) {
          console.log(`   ✅ MongoDB transfer order deleted: ${mongoOrder.transferOrderNumber} (ID: ${id})`);
          return res.status(200).json({ message: "Transfer order deleted successfully (MongoDB)" });
        }
      } catch (mongoError) {
        console.error("   ❌ Error deleting from MongoDB:", mongoError);
      }
      
      return res.status(404).json({ message: "Transfer order not found in PostgreSQL or MongoDB" });
    }
    
    if (!transferOrder) {
      console.log(`   ⚠️ Not found in PostgreSQL, trying MongoDB...`);
      
      // If not in PostgreSQL, try MongoDB (for old records)
      try {
        const mongoOrder = await TransferOrder.findByIdAndDelete(id);
        if (mongoOrder) {
          console.log(`   ✅ MongoDB transfer order deleted: ${mongoOrder.transferOrderNumber} (ID: ${id})`);
          return res.status(200).json({ message: "Transfer order deleted successfully (MongoDB)" });
        }
      } catch (mongoError) {
        console.error("   ❌ Error deleting from MongoDB:", mongoError);
      }
      
      return res.status(404).json({ message: "Transfer order not found in PostgreSQL or MongoDB" });
    }
    
    console.log(`   Found in PostgreSQL: ${transferOrder.transferOrderNumber}`);
    console.log(`   Status: ${transferOrder.status}`);
    
    // If status is "transferred", reverse full stock transfer
    // If status is "draft" or "in_transit", only restore source stock
    if (transferOrder.status === "transferred") {
      console.log(`   ⚠️ Status is "transferred", reversing full stock transfer...`);
      const items = transferOrder.items || [];
      for (const item of items) {
        try {
          const result = await reverseTransferStock(
            item.itemId,
            item.quantity,
            transferOrder.sourceWarehouse,
            transferOrder.destinationWarehouse,
            item.itemName,
            item.itemGroupId,
            item.itemSku
          );
          if (!result.success) {
            console.warn(`   ⚠️ Failed to reverse transfer stock for item ${item.itemName}:`, result.message);
          } else {
            console.log(`   ✅ Reversed stock for item ${item.itemName}`);
          }
        } catch (stockError) {
          console.error(`   ❌ Error reversing transfer stock for item ${item.itemName}:`, stockError);
        }
      }
    } else if (transferOrder.status === "draft" || transferOrder.status === "in_transit") {
      console.log(`   ⚠️ Status is "${transferOrder.status}", restoring source stock...`);
      const items = transferOrder.items || [];
      for (const item of items) {
        try {
          const result = await restoreSourceStock(
            item.itemId,
            item.quantity,
            transferOrder.sourceWarehouse,
            item.itemName,
            item.itemGroupId,
            item.itemSku
          );
          if (!result.success) {
            console.warn(`   ⚠️ Failed to restore source stock for item ${item.itemName}:`, result.message);
          } else {
            console.log(`   ✅ Restored source stock for item ${item.itemName}`);
          }
        } catch (stockError) {
          console.error(`   ❌ Error restoring source stock for item ${item.itemName}:`, stockError);
        }
      }
    }
    
    // Delete from PostgreSQL
    await transferOrder.destroy();
    console.log(`   ✅ PostgreSQL transfer order deleted: ${transferOrder.transferOrderNumber} (ID: ${id})`);
    
    // Delete from MongoDB (if exists)
    try {
      const mongoOrder = await TransferOrder.findOneAndDelete({ postgresId: id.toString() });
      if (mongoOrder) {
        console.log(`   ✅ MongoDB transfer order deleted: ${transferOrder.transferOrderNumber} (ID: ${mongoOrder._id})`);
      } else {
        console.log(`   ℹ️ No corresponding MongoDB record found (this is normal)`);
      }
    } catch (mongoError) {
      console.error("   ⚠️ Error deleting from MongoDB (non-critical):", mongoError);
      // Don't fail the request if MongoDB deletion fails
    }
    
    console.log(`   ✅ Transfer order deletion completed successfully`);
    res.status(200).json({ message: "Transfer order deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting transfer order:", error);
    console.error("   Error stack:", error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get current stock for an item in a warehouse (helper endpoint)
export const getItemStock = async (req, res) => {
  try {
    const { itemId, itemGroupId, itemName, itemSku, warehouse, excludeOrderId, isGroup } = req.query;
    
    if (!warehouse) {
      return res.status(400).json({ message: "Warehouse is required" });
    }
    
    const stockInfo = await getCurrentStock(itemId, warehouse, itemName, itemGroupId, itemSku, excludeOrderId, isGroup);
    
    res.status(200).json(stockInfo);
  } catch (error) {
    console.error("Error fetching item stock:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



