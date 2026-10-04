import PurchaseReceive from "../model/PurchaseReceive.js";
import PurchaseOrder from "../model/PurchaseOrder.js";
import ShoeItem from "../model/ShoeItem.js";
import ItemGroup from "../model/ItemGroup.js";
import { nextPurchaseReceive } from "../utils/nextPurchaseReceive.js";
import { updateMonthlyStockForPurchase } from "../utils/monthlyStockTracking.js";

// Helper function to map locName to warehouse name (same as other controllers)
const mapLocNameToWarehouse = (locName) => {
  if (!locName) return "Warehouse";
  
  // Handle special cases first - normalize all Edapally variations to "Edapally Branch"
  const locNameLower = locName.toLowerCase().trim();
  if (locNameLower === "z-edapally1" || 
      locNameLower === "zedapallyadmin" || 
      locNameLower === "edapallyadmin" ||
      locNameLower === "-edapally1 branch" ||
      locNameLower.includes("edapally")) {
    return "Edapally Branch";
  }
  
  // Remove prefixes like "G.", "Z.", "SG."
  let warehouse = locName.replace(/^[A-Z]\.?\s*/i, "").trim();
  
  // Handle "Z-Edapally1" format (with dash)
  if (warehouse.startsWith("-")) {
    warehouse = warehouse.substring(1).trim();
  }
  
  // Handle "Edapallyadmin" -> "Edapally"
  if (warehouse.toLowerCase().includes("edapallyadmin")) {
    warehouse = warehouse.replace(/edapallyadmin/gi, "Edapally").trim();
  }
  
  // Add "Branch" if not already present and not "Warehouse"
  if (warehouse && warehouse.toLowerCase() !== "warehouse" && !warehouse.toLowerCase().includes("branch")) {
    warehouse = `${warehouse} Branch`;
  }
  
  return warehouse || "Warehouse";
};

// Helper function to match warehouse names flexibly (same as transfer orders)
const matchesWarehouse = (itemWarehouse, targetWarehouse) => {
  if (!itemWarehouse || !targetWarehouse) return false;
  
  const itemWarehouseLower = itemWarehouse.toString().toLowerCase().trim();
  const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
  
  // Normalize Edapally variations - all should match "Edapally Branch"
  const normalizeEdapally = (name) => {
    if (name.includes("edapally")) {
      return "edapally branch";
    }
    return name;
  };
  
  const normalizedItem = normalizeEdapally(itemWarehouseLower);
  const normalizedTarget = normalizeEdapally(targetWarehouseLower);
  
  // Exact match (after normalization)
  if (normalizedItem === normalizedTarget) {
    return true;
  }
  
  // Original exact match
  if (itemWarehouseLower === targetWarehouseLower) {
    return true;
  }
  
  // Base name match (e.g., "warehouse" matches "Warehouse", "kannur" matches "Kannur Branch")
  const itemBase = normalizedItem.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
  const targetBase = normalizedTarget.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
  
  if (itemBase && targetBase && itemBase === targetBase) {
    return true;
  }
  
  // Partial match (e.g., "kannur branch" contains "kannur")
  if (normalizedItem.includes(normalizedTarget) || normalizedTarget.includes(normalizedItem)) {
    return true;
  }
  
  return false;
};

// Helper function to update stock for an item (handles both standalone and group items)
const updateItemStock = async (itemIdValue, receivedQty, operation = 'add', itemName = null, itemGroupId = null, targetWarehouse = null) => {
  // Determine target warehouse - use provided or default to "Warehouse"
  const defaultWarehouseName = targetWarehouse || "Warehouse";
  console.log(`📦 updateItemStock: targetWarehouse="${defaultWarehouseName}", operation="${operation}", qty=${receivedQty}`);
  
  // Helper function to update warehouse stock
  const updateWarehouseStock = (warehouseStocks, qty) => {
    if (!warehouseStocks || warehouseStocks.length === 0) {
      console.log(`   Creating new warehouse stock entry for "${defaultWarehouseName}"`);
      return [{
        warehouse: defaultWarehouseName,
        openingStock: 0,
        openingStockValue: 0,
        stockOnHand: qty,
        committedStock: 0,
        availableForSale: qty,
        physicalOpeningStock: 0,
        physicalStockOnHand: qty,
        physicalCommittedStock: 0,
        physicalAvailableForSale: qty,
      }];
    }
    
    // Use flexible matching to find warehouse stock
    let warehouseStock = warehouseStocks.find(ws => 
      matchesWarehouse(ws.warehouse, defaultWarehouseName)
    );
    
    if (!warehouseStock) {
      console.log(`   Warehouse "${defaultWarehouseName}" not found, creating new entry`);
      warehouseStock = {
        warehouse: defaultWarehouseName,
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
      warehouseStocks.push(warehouseStock);
    } else {
      console.log(`   ✅ Found existing warehouse stock for "${warehouseStock.warehouse}" (matched with "${defaultWarehouseName}")`);
    }
    
    const currentStockOnHand = parseFloat(warehouseStock.stockOnHand) || 0;
    const currentAvailableForSale = parseFloat(warehouseStock.availableForSale) || 0;
    const currentPhysicalStockOnHand = parseFloat(warehouseStock.physicalStockOnHand) || 0;
    const currentPhysicalAvailableForSale = parseFloat(warehouseStock.physicalAvailableForSale) || 0;
    
    console.log(`   📊 Current stock values: stockOnHand=${currentStockOnHand}, availableForSale=${currentAvailableForSale}, qty to add=${qty}`);
    
    warehouseStock.warehouse = defaultWarehouseName; // Normalize to target warehouse name
    
    if (operation === 'add') {
      const newStockOnHand = currentStockOnHand + qty;
      const newAvailableForSale = currentAvailableForSale + qty;
      const newPhysicalStockOnHand = currentPhysicalStockOnHand + qty;
      const newPhysicalAvailableForSale = currentPhysicalAvailableForSale + qty;
      
      warehouseStock.stockOnHand = newStockOnHand;
      warehouseStock.availableForSale = newAvailableForSale;
      warehouseStock.physicalStockOnHand = newPhysicalStockOnHand;
      warehouseStock.physicalAvailableForSale = newPhysicalAvailableForSale;
      
      console.log(`   ✅ Added ${qty} to stock: ${currentStockOnHand} -> ${newStockOnHand}`);
      console.log(`   📊 Updated warehouseStock object:`, JSON.stringify(warehouseStock, null, 2));
    } else if (operation === 'subtract') {
      warehouseStock.stockOnHand = Math.max(0, currentStockOnHand - qty);
      warehouseStock.availableForSale = Math.max(0, currentAvailableForSale - qty);
      warehouseStock.physicalStockOnHand = Math.max(0, currentPhysicalStockOnHand - qty);
      warehouseStock.physicalAvailableForSale = Math.max(0, currentPhysicalAvailableForSale - qty);
      console.log(`   ✅ Subtracted ${qty} from stock: ${currentStockOnHand} -> ${warehouseStock.stockOnHand}`);
    } else if (operation === 'adjust') {
      // For adjust, qty is the difference
      warehouseStock.stockOnHand = currentStockOnHand + qty;
      warehouseStock.availableForSale = currentAvailableForSale + qty;
      warehouseStock.physicalStockOnHand = currentPhysicalStockOnHand + qty;
      warehouseStock.physicalAvailableForSale = currentPhysicalAvailableForSale + qty;
      console.log(`   ✅ Adjusted stock by ${qty}: ${currentStockOnHand} -> ${warehouseStock.stockOnHand}`);
    }
    
    return warehouseStocks;
  };
  
  // First, try to find as standalone item
  let shoeItem = await ShoeItem.findById(itemIdValue);
  if (shoeItem) {
    console.log(`   Found standalone item: "${shoeItem.itemName}"`);
    const oldStock = shoeItem.warehouseStocks?.find(ws => matchesWarehouse(ws.warehouse, defaultWarehouseName))?.stockOnHand || 0;
    
    // Convert to plain object, modify, then update using $set
    const itemPlain = shoeItem.toObject();
    
    if (!itemPlain.warehouseStocks || !Array.isArray(itemPlain.warehouseStocks)) {
      itemPlain.warehouseStocks = [];
    }
    
    // Find or create warehouse stock entry
    let wsEntry = itemPlain.warehouseStocks.find(ws => 
      matchesWarehouse(ws.warehouse, defaultWarehouseName)
    );
    
    if (!wsEntry) {
      wsEntry = {
        warehouse: defaultWarehouseName,
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
    
    // Update stock values
    const currentStock = parseFloat(wsEntry.stockOnHand) || 0;
    wsEntry.stockOnHand = currentStock + receivedQty;
    wsEntry.availableForSale = (parseFloat(wsEntry.availableForSale) || 0) + receivedQty;
    wsEntry.physicalStockOnHand = (parseFloat(wsEntry.physicalStockOnHand) || 0) + receivedQty;
    wsEntry.physicalAvailableForSale = (parseFloat(wsEntry.physicalAvailableForSale) || 0) + receivedQty;
    wsEntry.warehouse = defaultWarehouseName;
    
    console.log(`   📊 Stock update: ${currentStock} + ${receivedQty} = ${wsEntry.stockOnHand}`);
    
    // Update using $set to replace entire warehouseStocks array
    const updatedItem = await ShoeItem.findByIdAndUpdate(
      itemIdValue,
      {
        $set: {
          warehouseStocks: itemPlain.warehouseStocks
        }
      },
      { new: true }
    );
    
    if (!updatedItem) {
      console.error(`❌ Failed to update standalone item stock`);
      return { success: false, message: "Failed to update stock" };
    }
    
    const updatedStock = updatedItem.warehouseStocks.find(ws => matchesWarehouse(ws.warehouse, defaultWarehouseName)) || updatedItem.warehouseStocks[0];
    console.log(`   ✅ Updated stock for standalone item: ${oldStock} + ${receivedQty} = ${updatedStock?.stockOnHand || 0} in "${updatedStock?.warehouse || defaultWarehouseName}"`);
    return { success: true, type: 'standalone', stock: updatedStock };
  }
  
  // Item not found in standalone items, try to find in item groups
  console.log(`🔍 Searching for item ${itemIdValue} in item groups...`);
  console.log(`   Item name: ${itemName || 'not provided'}, ItemGroupId: ${itemGroupId || 'not provided'}`);
  
  // If we have itemGroupId, search only that group first (more efficient)
  let itemGroups = [];
  if (itemGroupId) {
    const specificGroup = await ItemGroup.findById(itemGroupId);
    if (specificGroup && specificGroup.isActive !== false) {
      itemGroups = [specificGroup];
      console.log(`   Searching in specific group: ${specificGroup.name}`);
    }
  }
  
  // If not found in specific group or no itemGroupId provided, search all groups
  if (itemGroups.length === 0) {
    itemGroups = await ItemGroup.find({ isActive: { $ne: false } });
    console.log(`   Found ${itemGroups.length} active item groups to search`);
  }
  
  const itemIdStr = itemIdValue?.toString();
  
  for (const group of itemGroups) {
    if (group.items && Array.isArray(group.items)) {
      for (let i = 0; i < group.items.length; i++) {
        const groupItem = group.items[i];
        
        // Try multiple ID matching strategies
        const groupItemId = groupItem._id?.toString();
        const compositeId = `${group._id}_${i}`;
        const groupIdStr = group._id?.toString();
        
        // Check various ID formats
        let idMatches = false;
        
        // Normalize both IDs to strings for comparison
        const normalizedGroupItemId = groupItemId ? String(groupItemId) : null;
        const normalizedItemId = itemIdStr ? String(itemIdStr) : null;
        const normalizedCompositeId = String(compositeId);
        
        // Direct ID match (exact match)
        if (normalizedGroupItemId && normalizedItemId && normalizedGroupItemId === normalizedItemId) {
          idMatches = true;
          console.log(`   ✅ Direct ID match: ${normalizedGroupItemId} === ${normalizedItemId}`);
        }
        // Composite ID match
        else if (normalizedCompositeId === normalizedItemId) {
          idMatches = true;
          console.log(`   ✅ Composite ID match: ${normalizedCompositeId} === ${normalizedItemId}`);
        }
        // Check if itemIdStr contains group ID and index (for composite IDs with different formats)
        else if (normalizedItemId && groupIdStr && normalizedItemId.includes(String(groupIdStr)) && normalizedItemId.includes(`_${i}`)) {
          idMatches = true;
          console.log(`   ✅ Partial composite ID match: ${normalizedItemId} contains ${groupIdStr} and _${i}`);
        }
        // Try matching just the ObjectId part (in case only the ObjectId is stored)
        else if (normalizedItemId && normalizedGroupItemId) {
          // Check if the itemId is just the ObjectId (first 24 chars of composite)
          if (normalizedItemId === normalizedGroupItemId || normalizedItemId.startsWith(normalizedGroupItemId)) {
            idMatches = true;
            console.log(`   ✅ ObjectId prefix match: ${normalizedItemId} starts with ${normalizedGroupItemId}`);
          }
          // Also check reverse - if groupItemId contains the itemId
          else if (normalizedGroupItemId.includes(normalizedItemId)) {
            idMatches = true;
            console.log(`   ✅ ObjectId contains match: ${normalizedGroupItemId} contains ${normalizedItemId}`);
          }
        }
        
        // If still no match, try comparing just the ObjectId hex strings (remove any prefixes/suffixes)
        if (!idMatches && normalizedItemId && normalizedGroupItemId) {
          // Extract just the hex part (MongoDB ObjectIds are 24 hex characters)
          const itemIdHex = normalizedItemId.replace(/[^0-9a-fA-F]/g, '').substring(0, 24);
          const groupItemIdHex = normalizedGroupItemId.replace(/[^0-9a-fA-F]/g, '').substring(0, 24);
          if (itemIdHex && groupItemIdHex && itemIdHex === groupItemIdHex && itemIdHex.length === 24) {
            idMatches = true;
            console.log(`   ✅ Hex ID match: ${itemIdHex} === ${groupItemIdHex}`);
          }
        }
        
        // Also try matching by item name if provided (as fallback)
        let nameMatches = false;
        if (itemName && groupItem.name && groupItem.name.trim() === itemName.trim()) {
          nameMatches = true;
          console.log(`   ✅ Name match: "${groupItem.name}" === "${itemName}"`);
        }
        
        if (idMatches || nameMatches) {
          console.log(`✅ Found item in group "${group.name}" at index ${i}`);
          console.log(`   Item name: ${groupItem.name}`);
          console.log(`   Group item ID: ${groupItemId || 'none'}, Composite ID: ${compositeId}`);
          console.log(`   Searching for: ${itemIdStr}`);
          console.log(`   Matched by: ${idMatches ? 'ID' : 'Name'}`);
          
          // Update warehouse stocks for this item
          groupItem.warehouseStocks = updateWarehouseStock(groupItem.warehouseStocks || [], receivedQty);
          
          // Mark item as modified
          group.items[i] = groupItem;
          group.markModified('items');
          
          await group.save();
          
          // Update monthly opening stock for purchase
          try {
            const itemId = groupItem._id?.toString() || groupItem.id?.toString();
            if (itemId && operation === 'add') {
              await updateMonthlyStockForPurchase(group._id.toString(), itemId, defaultWarehouseName, receivedQty, groupItem.name);
            }
          } catch (monthlyError) {
            console.error(`   ⚠️ Error updating monthly stock (non-critical):`, monthlyError);
          }
          
          const updatedStock = groupItem.warehouseStocks.find(ws => matchesWarehouse(ws.warehouse, defaultWarehouseName)) || groupItem.warehouseStocks[0];
          console.log(`✅ Successfully updated stock for item "${groupItem.name}" in group "${group.name}": ${updatedStock?.stockOnHand || 0} in "${updatedStock?.warehouse || defaultWarehouseName}"`);
          return { success: true, type: 'group', stock: updatedStock, groupName: group.name, itemName: groupItem.name };
        }
      }
    }
  }
  
  console.warn(`⚠️ Item with ID ${itemIdValue} not found in any item groups`);
  console.warn(`   Searched ${itemGroups.length} groups`);
  return { success: false, message: `Item with ID ${itemIdValue} not found` };
};

// Helper function to update stock for an item by name and SKU within a group (when itemId is null)
const updateItemStockByName = async (itemGroupId, itemName, receivedQty, operation = 'add', itemSku = null, targetWarehouse = null) => {
  // Determine target warehouse - use provided or default to "Warehouse"
  const defaultWarehouseName = targetWarehouse || "Warehouse";
  console.log(`📦 updateItemStockByName: targetWarehouse="${defaultWarehouseName}", operation="${operation}", qty=${receivedQty}, itemName="${itemName}"`);
  
  if (!itemGroupId || !itemName) {
    return { success: false, message: "itemGroupId and itemName are required when itemId is null" };
  }
  
  console.log(`🔍 Searching for item by name "${itemName}"${itemSku ? ` and SKU "${itemSku}"` : ''} in group ${itemGroupId}...`);
  
  const group = await ItemGroup.findById(itemGroupId);
  if (!group || group.isActive === false) {
    return { success: false, message: `Item group ${itemGroupId} not found or inactive` };
  }
  
  if (!group.items || !Array.isArray(group.items)) {
    return { success: false, message: `Item group ${itemGroupId} has no items` };
  }
  
  // Find item by name and SKU (if SKU is provided, match both; otherwise match by name only)
  let itemIndex = -1;
  if (itemSku) {
    // Match by both name AND SKU for better accuracy
    itemIndex = group.items.findIndex(gi => {
      const nameMatch = gi.name && gi.name.trim() === itemName.trim();
      const skuMatch = gi.sku && gi.sku.trim() === itemSku.trim();
      return nameMatch && skuMatch;
    });
    
    if (itemIndex === -1) {
      console.warn(`⚠️ Item with name "${itemName}" and SKU "${itemSku}" not found, trying name only...`);
      // Fallback to name only if SKU match fails
      itemIndex = group.items.findIndex(gi => gi.name && gi.name.trim() === itemName.trim());
    }
  } else {
    // Match by name only if SKU is not provided
    itemIndex = group.items.findIndex(gi => gi.name && gi.name.trim() === itemName.trim());
  }
  
  if (itemIndex === -1) {
    console.warn(`⚠️ Item with name "${itemName}"${itemSku ? ` and SKU "${itemSku}"` : ''} not found in group "${group.name}"`);
    return { success: false, message: `Item with name "${itemName}"${itemSku ? ` and SKU "${itemSku}"` : ''} not found in group` };
  }
  
  const groupItem = group.items[itemIndex];
  console.log(`✅ Found item "${groupItem.name}" in group "${group.name}" at index ${itemIndex}`);
  
  // Helper function to update warehouse stock (same as in updateItemStock)
  const updateWarehouseStock = (warehouseStocks, qty) => {
    if (!warehouseStocks || warehouseStocks.length === 0) {
      return [{
        warehouse: defaultWarehouseName,
        openingStock: 0,
        openingStockValue: 0,
        stockOnHand: qty,
        committedStock: 0,
        availableForSale: qty,
        physicalOpeningStock: 0,
        physicalStockOnHand: qty,
        physicalCommittedStock: 0,
        physicalAvailableForSale: qty,
      }];
    }
    
    // Use flexible matching to find warehouse stock
    let warehouseStock = warehouseStocks.find(ws => 
      matchesWarehouse(ws.warehouse, defaultWarehouseName)
    );
    
    if (!warehouseStock) {
      warehouseStock = {
        warehouse: defaultWarehouseName,
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
      warehouseStocks.push(warehouseStock);
    }
    
    const currentStockOnHand = parseFloat(warehouseStock.stockOnHand) || 0;
    const currentAvailableForSale = parseFloat(warehouseStock.availableForSale) || 0;
    const currentPhysicalStockOnHand = parseFloat(warehouseStock.physicalStockOnHand) || 0;
    const currentPhysicalAvailableForSale = parseFloat(warehouseStock.physicalAvailableForSale) || 0;
    
    warehouseStock.warehouse = defaultWarehouseName;
    
    if (operation === 'add') {
      warehouseStock.stockOnHand = currentStockOnHand + qty;
      warehouseStock.availableForSale = currentAvailableForSale + qty;
      warehouseStock.physicalStockOnHand = currentPhysicalStockOnHand + qty;
      warehouseStock.physicalAvailableForSale = currentPhysicalAvailableForSale + qty;
    } else if (operation === 'subtract') {
      warehouseStock.stockOnHand = Math.max(0, currentStockOnHand - qty);
      warehouseStock.availableForSale = Math.max(0, currentAvailableForSale - qty);
      warehouseStock.physicalStockOnHand = Math.max(0, currentPhysicalStockOnHand - qty);
      warehouseStock.physicalAvailableForSale = Math.max(0, currentPhysicalAvailableForSale - qty);
    } else if (operation === 'adjust') {
      warehouseStock.stockOnHand = currentStockOnHand + qty;
      warehouseStock.availableForSale = currentAvailableForSale + qty;
      warehouseStock.physicalStockOnHand = currentPhysicalStockOnHand + qty;
      warehouseStock.physicalAvailableForSale = currentPhysicalAvailableForSale + qty;
    }
    
    return warehouseStocks;
  };
  
  // Get current stock before update
  const oldStock = groupItem.warehouseStocks?.find(ws => matchesWarehouse(ws.warehouse, defaultWarehouseName))?.stockOnHand || 0;
  console.log(`   📊 Current stock: ${oldStock}, adding: ${receivedQty}`);
  
  // Convert group to plain object, modify, then update using $set
  // This ensures Mongoose properly saves nested changes
  const groupPlain = group.toObject();
  const itemPlain = groupPlain.items[itemIndex];
  
  // Find or create warehouse stock entry
  if (!itemPlain.warehouseStocks) {
    itemPlain.warehouseStocks = [];
  }
  
  let wsEntry = itemPlain.warehouseStocks.find(ws => 
    matchesWarehouse(ws.warehouse, defaultWarehouseName)
  );
  
  if (!wsEntry) {
    wsEntry = {
      warehouse: defaultWarehouseName,
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
  
  // Update stock values
  const currentStock = parseFloat(wsEntry.stockOnHand) || 0;
  wsEntry.stockOnHand = currentStock + receivedQty;
  wsEntry.availableForSale = (parseFloat(wsEntry.availableForSale) || 0) + receivedQty;
  wsEntry.physicalStockOnHand = (parseFloat(wsEntry.physicalStockOnHand) || 0) + receivedQty;
  wsEntry.physicalAvailableForSale = (parseFloat(wsEntry.physicalAvailableForSale) || 0) + receivedQty;
  wsEntry.warehouse = defaultWarehouseName;
  
  console.log(`   📊 Stock update: ${currentStock} + ${receivedQty} = ${wsEntry.stockOnHand}`);
  
  // Update the entire items array using $set
  // This is more reliable than trying to update nested paths
  const updateResult = await ItemGroup.findByIdAndUpdate(
    itemGroupId,
    {
      $set: {
        [`items.${itemIndex}`]: itemPlain
      }
    },
    { new: true }
  );
  
  if (!updateResult) {
    console.error(`❌ Failed to update stock using findByIdAndUpdate`);
    return { success: false, message: "Failed to update stock" };
  }
  
  console.log(`   ✅ Stock updated using findByIdAndUpdate with $set`);
  
  // Reload the group to get the actual saved values
  const savedGroup = await ItemGroup.findById(itemGroupId);
  if (!savedGroup) {
    console.error(`❌ Failed to reload group ${itemGroupId} after save`);
    return { success: false, message: "Failed to reload group after save" };
  }
  
  // Find the item again (in case index changed, though it shouldn't)
  const savedItemIndex = savedGroup.items.findIndex(gi => {
    if (itemSku && gi.sku) {
      return gi.name && gi.name.trim() === itemName.trim() && gi.sku.trim() === itemSku.trim();
    }
    return gi.name && gi.name.trim() === itemName.trim();
  });
  
  if (savedItemIndex === -1) {
    console.error(`❌ Item "${itemName}" not found in saved group`);
    return { success: false, message: "Item not found in saved group" };
  }
  
  const savedItem = savedGroup.items[savedItemIndex];
  const savedStock = savedItem.warehouseStocks.find(ws => matchesWarehouse(ws.warehouse, defaultWarehouseName)) || savedItem.warehouseStocks[0];
  
  // Update monthly opening stock for purchase
  try {
    const itemId = savedItem._id?.toString() || savedItem.id?.toString();
    if (itemId && operation === 'add') {
      await updateMonthlyStockForPurchase(itemGroupId, itemId, defaultWarehouseName, receivedQty, savedItem.name);
    }
  } catch (monthlyError) {
    console.error(`   ⚠️ Error updating monthly stock (non-critical):`, monthlyError);
  }
  
  console.log(`✅ Successfully updated stock for item "${groupItem.name}" in group "${group.name}": ${savedStock?.stockOnHand || 0} in "${savedStock?.warehouse || defaultWarehouseName}"`);
  console.log(`   📊 Verification - Saved stock values:`, JSON.stringify(savedStock, null, 2));
  
  return { success: true, type: 'group', stock: savedStock, groupName: group.name, itemName: groupItem.name };
};

// Helper function to update Purchase Order status based on received quantities
const updatePurchaseOrderStatus = async (purchaseOrderId, receiveItems) => {
  try {
    console.log(`\n📋 Updating Purchase Order status for: ${purchaseOrderId}`);
    
    const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
    if (!purchaseOrder) {
      console.warn(`⚠️ Purchase Order ${purchaseOrderId} not found`);
      return { success: false, message: "Purchase Order not found" };
    }
    
    console.log(`   Current PO status: "${purchaseOrder.status}"`);
    console.log(`   PO items count: ${purchaseOrder.items?.length || 0}`);
    
    // Get all purchase receives for this order to calculate total received/in-transit
    const allReceives = await PurchaseReceive.find({ purchaseOrderId: purchaseOrderId });
    console.log(`   Found ${allReceives.length} purchase receive(s) for this order`);
    
    // Calculate totals for each item
    const itemTotals = new Map();
    
    // Initialize with ordered quantities from purchase order
    purchaseOrder.items.forEach(poItem => {
      const itemKey = poItem.itemId?.toString() || poItem.itemName;
      itemTotals.set(itemKey, {
        itemId: poItem.itemId,
        itemName: poItem.itemName,
        ordered: parseFloat(poItem.quantity) || 0,
        received: 0,
        inTransit: 0,
        remaining: parseFloat(poItem.quantity) || 0,
      });
    });
    
    // Sum up received and in-transit quantities from all receives
    allReceives.forEach(receive => {
      receive.items.forEach(receiveItem => {
        const itemKey = receiveItem.itemId?.toString() || receiveItem.itemName;
        const totals = itemTotals.get(itemKey);
        
        if (totals) {
          totals.received += parseFloat(receiveItem.received) || 0;
          totals.inTransit += parseFloat(receiveItem.inTransit) || 0;
          totals.remaining = Math.max(0, totals.ordered - totals.received - totals.inTransit);
        }
      });
    });
    
    // Log item totals
    console.log(`   Item totals:`);
    itemTotals.forEach((totals, itemKey) => {
      console.log(`     ${totals.itemName}: ordered=${totals.ordered}, received=${totals.received}, inTransit=${totals.inTransit}, remaining=${totals.remaining}`);
    });
    
    // Determine new status based on totals
    let newStatus = purchaseOrder.status;
    let allFullyReceived = true;  // All items received with nothing in transit or remaining
    let anyReceived = false;
    let anyInTransit = false;
    let anyRemaining = false;
    
    itemTotals.forEach((totals) => {
      if (totals.received > 0) anyReceived = true;
      if (totals.inTransit > 0) anyInTransit = true;
      if (totals.remaining > 0) anyRemaining = true;
      
      // For "received" status, ALL items must be fully received (no in-transit, no remaining)
      if (totals.inTransit > 0 || totals.remaining > 0 || totals.received < totals.ordered) {
        allFullyReceived = false;
      }
    });
    
    // Determine status:
    // - "received": ALL items fully received (received = ordered, no in-transit, no remaining)
    // - "partially_received": Some items received OR in-transit (but not all fully received)
    // - "sent" or "draft": No items received or in-transit yet (keep existing status)
    
    if (allFullyReceived && anyReceived) {
      newStatus = "received";
      console.log(`   ✅ All items fully received - setting status to "received"`);
    } else if (anyReceived || anyInTransit) {
      newStatus = "partially_received";
      console.log(`   📦 Some items received/in-transit (not all complete) - setting status to "partially_received"`);
    } else {
      // No items received or in-transit yet - keep existing status (draft or sent)
      console.log(`   ⏳ No items received or in-transit yet - keeping status as "${newStatus}"`);
    }
    
    // Update purchase order
    purchaseOrder.status = newStatus;
    purchaseOrder.receivedQuantities = Array.from(itemTotals.values());
    
    await purchaseOrder.save();
    
    console.log(`   ✅ Purchase Order status updated to: "${newStatus}"`);
    console.log(`   📊 Received quantities saved: ${purchaseOrder.receivedQuantities.length} items`);
    
    return { 
      success: true, 
      oldStatus: purchaseOrder.status, 
      newStatus: newStatus,
      receivedQuantities: purchaseOrder.receivedQuantities 
    };
  } catch (error) {
    console.error(`❌ Error updating Purchase Order status:`, error);
    return { success: false, message: error.message };
  }
};

// Get next purchase receive number
export const getNextReceiveNumber = async (req, res) => {
  try {
    const nextNumber = await nextPurchaseReceive();
    res.status(200).json({ receiveNumber: nextNumber });
  } catch (error) {
    console.error("Get next receive number error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new purchase receive
export const createPurchaseReceive = async (req, res) => {
  try {
    const receiveData = req.body;
    
    console.log(`\n=== CREATE PURCHASE RECEIVE REQUEST ===`);
    console.log(`Status: "${receiveData.status}"`);
    console.log(`UserId: "${receiveData.userId}"`);
    console.log(`LocCode: "${receiveData.locCode}"`);
    console.log(`Items count: ${receiveData.items?.length || 0}`);
    console.log(`Items:`, receiveData.items?.map(i => ({ 
      itemId: i.itemId, 
      itemName: i.itemName, 
      itemGroupId: i.itemGroupId, 
      itemSku: i.itemSku,
      received: i.received 
    })) || []);
    console.log(`========================================\n`);
    
    // Auto-generate receive number if not provided
    if (!receiveData.receiveNumber) {
      receiveData.receiveNumber = await nextPurchaseReceive();
    }
    
    // Validate required fields
    if (!receiveData.userId || !receiveData.purchaseOrderId) {
      return res.status(400).json({ message: "UserId and purchase order ID are required" });
    }
    
    // Automatically determine status based on items
    // If user provided status, use it; otherwise calculate it
    if (!receiveData.status || receiveData.status === "received") {
      let hasReceived = false;
      let hasInTransit = false;
      let allFullyReceived = true;
      
      if (receiveData.items && receiveData.items.length > 0) {
        receiveData.items.forEach(item => {
          const received = parseFloat(item.received) || 0;
          const inTransit = parseFloat(item.inTransit) || 0;
          const ordered = parseFloat(item.ordered) || 0;
          
          if (received > 0) hasReceived = true;
          if (inTransit > 0) hasInTransit = true;
          
          // Check if this item is fully received
          if (inTransit > 0 || received < ordered) {
            allFullyReceived = false;
          }
        });
      }
      
      // Determine status:
      // - "received": All items fully received (no in-transit)
      // - "partially_received": Some items received but some in-transit
      // - "in_transit": All items in-transit (none received yet)
      // - "draft": Nothing received or in-transit
      
      if (allFullyReceived && hasReceived) {
        receiveData.status = "received";
        console.log(`   📦 Auto-determined status: "received" (all items fully received)`);
      } else if (hasReceived && hasInTransit) {
        receiveData.status = "partially_received";
        console.log(`   📦 Auto-determined status: "partially_received" (some received, some in-transit)`);
      } else if (hasInTransit && !hasReceived) {
        receiveData.status = "in_transit";
        console.log(`   📦 Auto-determined status: "in_transit" (all items in-transit)`);
      } else if (hasReceived && !hasInTransit) {
        receiveData.status = "received";
        console.log(`   📦 Auto-determined status: "received" (all received, none in-transit)`);
      } else {
        receiveData.status = "draft";
        console.log(`   📦 Auto-determined status: "draft" (nothing received or in-transit)`);
      }
    }
    
    console.log(`   ✅ Final status: "${receiveData.status}"`);
    
    // Check if receive with this receiveNumber already exists
    const existingReceive = await PurchaseReceive.findOne({ receiveNumber: receiveData.receiveNumber });
    if (existingReceive) {
      // Return the existing receive so frontend can navigate to it
      return res.status(409).json({ 
        message: "Receive number already exists",
        existingReceive: existingReceive 
      });
    }
    
    // Determine target warehouse from user's email or locCode
    // Admin email (officerootments@gmail.com) always uses "Warehouse" regardless of locCode
    const adminEmails = ['officerootments@gmail.com'];
    const userId = receiveData.userId || "";
    const isAdminEmail = userId && typeof userId === 'string' && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    
    let targetWarehouse = "Warehouse"; // Default
    
    if (isAdminEmail) {
      // Admin email always uses "Warehouse" - has access to all stores
      targetWarehouse = "Warehouse";
      console.log(`📍 Admin email detected (${userId}), using warehouse: "Warehouse" (ignoring locCode)`);
    } else {
      // For other users, determine warehouse from locCode
       const fallbackLocations = [
       
        { "locName": "Warehouse", "locCode": "858" },
        { "locName": "G-Edappally", "locCode": "702" },
        { "locName": "HEAD OFFICE01", "locCode": "759" },
        { "locName": "SG-Trivandrum", "locCode": "700" },
         { "locName": "Z-Edapally", "locCode": "144" },
        { "locName": "Z-Edappal", "locCode": "100" },
        { "locName": "Z-Perinthalmanna", "locCode": "133" },
        { "locName": "Z-Kottakkal", "locCode": "122" },
        { "locName": "G-Kottayam", "locCode": "701" },
        { "locName": "G-Perumbavoor", "locCode": "703" },
        { "locName": "G-Thrissur", "locCode": "704" },
        { "locName": "G-Chavakkad", "locCode": "706" },
        { "locName": "G-Calicut", "locCode": "712" },
        { "locName": "G-Vadakara", "locCode": "708" },
        { "locName": "G-Edappal", "locCode": "707" },
        { "locName": "G-Perinthalmanna", "locCode": "709" },
        { "locName": "G-Kottakkal", "locCode": "711" },
        { "locName": "G-Manjeri", "locCode": "710" },
        { "locName": "G-Palakkad", "locCode": "705" },
        { "locName": "G-Kalpetta", "locCode": "717" },
        { "locName": "G-Kannur", "locCode": "716" },
        { "locName": "G-Mg Road", "locCode": "718" },
        { "locName": "Production", "locCode": "101" },
        { "locName": "Office", "locCode": "102" }
    ];
      
      const userLocCode = receiveData.locCode || "";
      
      if (userLocCode) {
        const location = fallbackLocations.find(loc => loc.locCode === userLocCode);
        if (location) {
          targetWarehouse = mapLocNameToWarehouse(location.locName);
          console.log(`📍 Determined warehouse from locCode ${userLocCode}: "${location.locName}" -> "${targetWarehouse}"`);
        } else {
          console.log(`⚠️ locCode ${userLocCode} not found in fallback locations, using default "Warehouse"`);
        }
      } else {
        console.log(`⚠️ No locCode provided, using default "Warehouse"`);
      }
    }
    
    console.log(`📍 Final target warehouse: "${targetWarehouse}"`);
    
    // Add warehouse to receiveData before saving
    receiveData.toWarehouse = targetWarehouse;
    
    // Save all data to MongoDB
    const purchaseReceive = await PurchaseReceive.create(receiveData);
    console.log(`Purchase receive ${receiveData.receiveNumber} saved to MongoDB with ID: ${purchaseReceive._id}`);
    console.log(`Items saved: ${receiveData.items?.length || 0} item(s)`);
    
    // If status is "received" or "partially_received", automatically increase stock for received items
    // Check status case-insensitively to handle variations
    const statusLower = (receiveData.status || "").toLowerCase().trim();
    const shouldUpdateStock = statusLower === "received" || statusLower === "partially_received";
    
    console.log(`📦 Purchase Receive Status Check: "${receiveData.status}" (normalized: "${statusLower}")`);
    console.log(`   Should update stock: ${shouldUpdateStock}`);
    console.log(`   Items count: ${receiveData.items?.length || 0}`);
    
    if (shouldUpdateStock && receiveData.items && receiveData.items.length > 0) {
      console.log(`📦 Status is '${receiveData.status}', updating item stock in warehouse: "${targetWarehouse}"...`);
      console.log(`📦 Total items to process: ${receiveData.items.length}`);
      
      let processedCount = 0;
      let skippedCount = 0;
      
      for (const item of receiveData.items) {
        // Handle itemId - could be ObjectId string or populated object
        let itemIdValue = item.itemId?._id || item.itemId || null;
        
        // Convert to string if it's an ObjectId object
        if (itemIdValue && typeof itemIdValue === 'object' && itemIdValue.toString) {
          itemIdValue = itemIdValue.toString();
        }
        
        // If itemId is null but itemGroupId is present, this is an item from a group
        // We'll need to find it by name and SKU within the group
        const itemGroupId = item.itemGroupId || null;
        const itemName = item.itemName || "";
        const itemSku = item.itemSku || item.sku || "";
        
        console.log(`Processing item - itemId: ${itemIdValue}, itemName: ${itemName}, itemSku: ${itemSku}, itemGroupId: ${itemGroupId}, received: ${item.received}`);
        console.log(`   Full item object:`, JSON.stringify({ itemId: item.itemId, itemName: item.itemName, itemSku: itemSku, itemGroupId: itemGroupId, received: item.received }, null, 2));
        
        // If itemId is null but we have itemGroupId and itemName, we can still update stock
        // Ensure received is a valid number (not null, undefined, or empty string)
        let receivedQty = 0;
        if (item.received !== null && item.received !== undefined && item.received !== "") {
          receivedQty = parseFloat(item.received);
          if (isNaN(receivedQty)) {
            receivedQty = 0;
          }
        }
        console.log(`   Checking item eligibility - itemId: ${itemIdValue}, itemGroupId: ${itemGroupId}, itemName: ${itemName}, receivedQty: ${receivedQty}, original received: ${item.received}`);
        
        if ((itemIdValue || (itemGroupId && itemName) || itemName) && receivedQty > 0) {
          try {
            if (receivedQty <= 0) {
              console.log(`   ⚠️ Skipping item ${itemIdValue || itemName} - received quantity is 0 or invalid`);
              continue;
            }
            
            console.log(`📦 Processing stock update for itemId: ${itemIdValue}, Item Name: ${item.itemName}, Item SKU: ${itemSku}, Received Qty: ${receivedQty}`);
            console.log(`   ItemId type: ${typeof itemIdValue}, value: ${itemIdValue}`);
            
            // Get itemGroupId if available (for items from groups)
            // If itemId is null, we'll use itemGroupId + itemName + itemSku to find the item
            let result;
            if (itemIdValue) {
              result = await updateItemStock(itemIdValue, receivedQty, 'add', itemName, itemGroupId, targetWarehouse);
            } else if (itemGroupId && itemName) {
              result = await updateItemStockByName(itemGroupId, itemName, receivedQty, 'add', itemSku, targetWarehouse);
            } else if (itemName) {
              // Search all groups by name and SKU
              const allGroups = await ItemGroup.find({ isActive: { $ne: false } });
              let found = false;
              
              for (const group of allGroups) {
                if (group.items && Array.isArray(group.items)) {
                  // Match by name and SKU if SKU is provided, otherwise match by name only
                  const matchingItem = itemSku
                    ? group.items.find(gi => {
                        const nameMatch = gi.name && gi.name.trim() === itemName.trim();
                        const skuMatch = gi.sku && gi.sku.trim() === itemSku.trim();
                        return nameMatch && skuMatch;
                      })
                    : group.items.find(gi => gi.name && gi.name.trim() === itemName.trim());
                  
                  if (matchingItem) {
                    console.log(`   ✅ Found item "${itemName}"${itemSku ? ` with SKU "${itemSku}"` : ''} in group "${group.name}", updating stock...`);
                    result = await updateItemStockByName(group._id, itemName, receivedQty, 'add', itemSku, targetWarehouse);
                    found = true;
                    break;
                  }
                }
              }
              
              if (!found) {
                result = { success: false, message: `Item "${itemName}"${itemSku ? ` with SKU "${itemSku}"` : ''} not found in any item group` };
              }
            } else {
              result = { success: false, message: "Cannot update stock: itemId is null and itemGroupId/itemName not provided" };
            }
            if (result.success) {
              processedCount++;
              if (result.type === 'standalone') {
                console.log(`✅ Successfully updated stock for standalone item ${item.itemName || itemIdValue}: +${receivedQty} units. New stock: Stock On Hand: ${result.stock?.stockOnHand || 0}, Available: ${result.stock?.availableForSale || 0}`);
              } else {
                console.log(`✅ Successfully updated stock for item "${result.itemName}" in group "${result.groupName}": +${receivedQty} units. New stock: Stock On Hand: ${result.stock?.stockOnHand || 0}, Available: ${result.stock?.availableForSale || 0}`);
              }
            } else {
              console.warn(`⚠️ ${result.message}, skipping stock update`);
              console.warn(`   This might be an item from a group. ItemId was: ${itemIdValue}, ItemName: ${item.itemName}, ItemGroupId: ${itemGroupId}`);
              
              // Fallback: If itemGroupId is provided but updateItemStockByName failed, or if itemGroupId is missing, search all groups by name
              if (item.itemName) {
                console.warn(`   Trying to find by item name "${item.itemName}" in all groups as fallback...`);
                const itemGroups = await ItemGroup.find({ isActive: { $ne: false } });
                let found = false;
                
                for (const group of itemGroups) {
                  if (group.items && Array.isArray(group.items)) {
                    const matchingItem = group.items.find(gi => gi.name && gi.name.trim() === item.itemName.trim());
                    if (matchingItem) {
                      console.log(`✅ Found item by name "${item.itemName}" in group "${group.name}"`);
                      found = true;
                      
                      // Use the updateItemStockByName function
                      const nameResult = await updateItemStockByName(group._id, item.itemName, receivedQty, 'add');
                      if (nameResult.success) {
                        console.log(`✅ Successfully updated stock for item "${nameResult.itemName}" in group "${nameResult.groupName}" by name match`);
                      }
                      break;
                    }
                  }
                }
                
                if (!found) {
                  console.error(`❌ Could not find item "${item.itemName}" in any item group`);
                }
              }
            }
          } catch (itemError) {
            skippedCount++;
            console.error(`❌ Error updating stock for item ${itemIdValue || itemName}:`, itemError);
            // Continue with other items even if one fails
          }
        } else {
          skippedCount++;
          console.log(`⚠️ Skipping item - itemId: ${item.itemId}, itemName: ${item.itemName}, received: ${item.received}, receivedQty: ${receivedQty}`);
          console.log(`   Reason: ${!itemIdValue && !itemGroupId && !itemName ? 'No itemId, itemGroupId, or itemName' : receivedQty <= 0 ? 'Received quantity is 0 or invalid' : 'Unknown'}`);
        }
      }
      
      console.log(`✅ Stock update completed: ${processedCount} items processed, ${skippedCount} items skipped out of ${receiveData.items.length} total items`);
      
      // Add stock update summary to response
      purchaseReceive.stockUpdateSummary = {
        processed: processedCount,
        skipped: skippedCount,
        total: receiveData.items.length,
        warehouse: targetWarehouse,
        status: 'completed'
      };
    } else {
      console.log(`⚠️ Stock update skipped - Status: "${receiveData.status}", Items count: ${receiveData.items?.length || 0}`);
      purchaseReceive.stockUpdateSummary = {
        processed: 0,
        skipped: 0,
        total: receiveData.items?.length || 0,
        warehouse: targetWarehouse,
        status: 'skipped',
        reason: `Status is "${receiveData.status}" (expected "received" or "partially_received")`
      };
    }
    
    console.log(`\n=== PURCHASE RECEIVE CREATED ===`);
    console.log(`Receive Number: ${purchaseReceive.receiveNumber}`);
    console.log(`Status: ${purchaseReceive.status}`);
    console.log(`Stock Update: ${purchaseReceive.stockUpdateSummary?.status || 'unknown'}`);
    console.log(`===============================\n`);
    
    // Note: We do NOT update Purchase Order status here
    // Purchase Order status remains as "sent" or its current status
    // Only the Purchase Receive shows "partially_received" status
    
    // Convert to plain object and add stockUpdateSummary
    const responseData = purchaseReceive.toObject ? purchaseReceive.toObject() : purchaseReceive;
    if (purchaseReceive.stockUpdateSummary) {
      responseData.stockUpdateSummary = purchaseReceive.stockUpdateSummary;
    }
    
    res.status(201).json(responseData);
  } catch (error) {
    console.error("Create purchase receive error:", error);
    if (error.code === 11000) {
      // Double check in case of race condition
      const existingReceive = await PurchaseReceive.findOne({ receiveNumber: receiveData.receiveNumber });
      if (existingReceive) {
        return res.status(409).json({ 
          message: "Receive number already exists",
          existingReceive: existingReceive 
        });
      }
      return res.status(409).json({ message: "Receive number already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all purchase receives for a user
export const getPurchaseReceives = async (req, res) => {
  try {
    const { userId, userPower, status, locCode, warehouse } = req.query;
    
    const query = {};
    
    // User is admin if: power === 'admin' OR locCode === '858' (Warehouse) OR email === 'officerootments@gmail.com'
    const adminEmails = ['officerootments@gmail.com'];
    const isAdminEmail = userId && typeof userId === 'string' && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail ||
                    (userPower && (userPower.toLowerCase() === 'admin' || userPower.toLowerCase() === 'super_admin')) ||
                    (locCode && (locCode === '858' || locCode === '103')); // 858 = Warehouse, 103 = WAREHOUSE
    
    // Admin viewing a specific branch store (not Warehouse/admin home)
    const isAdminViewingSpecificStore = isAdmin && warehouse && warehouse !== "All Stores" && warehouse !== "Warehouse";
    
    if ((!isAdmin || isAdminViewingSpecificStore) && warehouse) {
      // toWarehouse stores the warehouse name; also check locCode for older records
      query.$or = [
        { toWarehouse: warehouse },
        { warehouse: warehouse },
        { branch: warehouse },
        ...(locCode ? [{ locCode: locCode }] : [])
      ];
      console.log(`📦 Filtering purchase receives for warehouse: ${warehouse}`);
    } else if (!isAdmin && userId) {
      const userIdStr = userId.toString();
      // Use email as primary identifier - case insensitive match
      if (userIdStr.includes('@')) {
        query.userId = { $regex: `^${userIdStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
      } else {
        query.userId = userIdStr;
      }
    }
    // If admin, no userId filter - show all receives
    
    if (status) query.status = status;
    
    const purchaseReceives = await PurchaseReceive.find(query)
      .populate("purchaseOrderId", "orderNumber date")
      .sort({ createdAt: -1 });
    
    console.log(`Found ${purchaseReceives.length} purchase receives`);
    res.status(200).json(purchaseReceives);
  } catch (error) {
    console.error("Get purchase receives error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single purchase receive by ID
export const getPurchaseReceiveById = async (req, res) => {
  try {
    const { id } = req.params;
    const purchaseReceive = await PurchaseReceive.findById(id)
      .populate("purchaseOrderId");
    
    if (!purchaseReceive) {
      return res.status(404).json({ message: "Purchase receive not found" });
    }
    
    res.status(200).json(purchaseReceive);
  } catch (error) {
    console.error("Get purchase receive error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a purchase receive
export const updatePurchaseReceive = async (req, res) => {
  try {
    const { id } = req.params;
    const receiveData = req.body;
    
    console.log(`\n🔄 UPDATE PURCHASE RECEIVE REQUEST:`);
    console.log(`   Receive ID: ${id}`);
    console.log(`   Receive Number: ${receiveData.receiveNumber || 'N/A'}`);
    console.log(`   Status: ${receiveData.status || 'N/A'}`);
    console.log(`   Items count: ${receiveData.items?.length || 0}`);
    
    // Get the old purchase receive before updating
    const oldPurchaseReceive = await PurchaseReceive.findById(id);
    if (!oldPurchaseReceive) {
      console.log(`❌ Purchase receive not found: ${id}`);
      return res.status(404).json({ message: "Purchase receive not found" });
    }
    
    const oldStatus = oldPurchaseReceive.status;
    const newStatus = receiveData.status || oldStatus;
    const oldItems = oldPurchaseReceive.items || [];
    const newItems = receiveData.items || [];
    
    console.log(`   Old status: ${oldStatus}, New status: ${newStatus}`);
    console.log(`   Old items: ${oldItems.length}, New items: ${newItems.length}`);
    
    // Update the purchase receive
    const purchaseReceive = await PurchaseReceive.findByIdAndUpdate(
      id,
      receiveData,
      { new: true, runValidators: true }
    );
    
    if (!purchaseReceive) {
      console.log(`❌ Failed to update purchase receive: ${id}`);
      return res.status(404).json({ message: "Purchase receive not found" });
    }
    
    console.log(`✅ Purchase receive updated successfully`);
    
    // Automatically determine status based on items (same logic as create)
    let hasReceived = false;
    let hasInTransit = false;
    let allFullyReceived = true;
    
    if (receiveData.items && receiveData.items.length > 0) {
      receiveData.items.forEach(item => {
        const received = parseFloat(item.received) || 0;
        const inTransit = parseFloat(item.inTransit) || 0;
        const ordered = parseFloat(item.ordered) || 0;
        
        if (received > 0) hasReceived = true;
        if (inTransit > 0) hasInTransit = true;
        
        // Check if this item is fully received
        if (inTransit > 0 || received < ordered) {
          allFullyReceived = false;
        }
      });
    }
    
    // Determine new status based on items
    let autoDetectedStatus = receiveData.status || oldStatus;
    if (allFullyReceived && hasReceived) {
      autoDetectedStatus = "received";
      console.log(`   📦 Auto-determined status: "received" (all items fully received)`);
    } else if (hasReceived && hasInTransit) {
      autoDetectedStatus = "partially_received";
      console.log(`   📦 Auto-determined status: "partially_received" (some received, some in-transit)`);
    } else if (hasInTransit && !hasReceived) {
      autoDetectedStatus = "in_transit";
      console.log(`   📦 Auto-determined status: "in_transit" (all items in-transit)`);
    } else if (hasReceived && !hasInTransit) {
      autoDetectedStatus = "received";
      console.log(`   📦 Auto-determined status: "received" (all received, none in-transit)`);
    } else {
      autoDetectedStatus = "draft";
      console.log(`   📦 Auto-determined status: "draft" (nothing received or in-transit)`);
    }
    
    // Update status if it changed
    if (autoDetectedStatus !== receiveData.status) {
      console.log(`   🔄 Updating status from "${receiveData.status}" to "${autoDetectedStatus}"`);
      purchaseReceive.status = autoDetectedStatus;
      await purchaseReceive.save();
    }
    
    // Use the auto-detected status for stock updates
    const finalNewStatus = autoDetectedStatus;
    
    console.log(`   Old status: ${oldStatus}, Final new status: ${finalNewStatus}`);
    console.log(`   Old items: ${oldItems.length}, New items: ${newItems.length}`);
    
    // Determine target warehouse from user's email or locCode (same as createPurchaseReceive)
    // Admin email (officerootments@gmail.com) always uses "Warehouse" regardless of locCode
    const adminEmails = ['officerootments@gmail.com'];
    const userId = receiveData.userId || purchaseReceive.userId || "";
    const isAdminEmail = userId && typeof userId === 'string' && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    
    let targetWarehouse = "Warehouse"; // Default
    
    if (isAdminEmail) {
      // Admin email always uses "Warehouse" - has access to all stores
      targetWarehouse = "Warehouse";
      console.log(`📍 Admin email detected (${userId}), using warehouse: "Warehouse" (ignoring locCode)`);
    } else {
      // For other users, determine warehouse from locCode
      
      const userLocCode = receiveData.locCode || purchaseReceive.locCode || "";
      
      if (userLocCode) {
        const location = fallbackLocations.find(loc => loc.locCode === userLocCode);
        if (location) {
          targetWarehouse = mapLocNameToWarehouse(location.locName);
          console.log(`📍 Determined warehouse from locCode ${userLocCode}: "${location.locName}" -> "${targetWarehouse}"`);
        } else {
          console.log(`⚠️ locCode ${userLocCode} not found in fallback locations, using default "Warehouse"`);
        }
      } else {
        console.log(`⚠️ No locCode provided, using default "Warehouse"`);
      }
    }
    
    // Handle stock updates if status is "received" or "partially_received"
    if ((finalNewStatus === "received" || finalNewStatus === "partially_received") && newItems && newItems.length > 0) {
      console.log(`\n📦 STOCK UPDATE CHECK:`);
      console.log(`   New status is "received" or "partially_received": ${finalNewStatus === "received" || finalNewStatus === "partially_received"}`);
      console.log(`   New items exist: ${newItems && newItems.length > 0}`);
      console.log(`   Target warehouse: "${targetWarehouse}"`);
      console.log(`   Proceeding with stock update...\n`);
      console.log("🔄 Updating stock for edited purchase receive...");
      console.log("   Old status:", oldStatus, "New status:", newStatus);
      console.log("   Old items count:", oldItems.length, "New items count:", newItems.length);
      console.log("   Old items:", JSON.stringify(oldItems.map(oi => ({ itemId: oi.itemId?.toString(), received: oi.received })), null, 2));
      console.log("   New items:", JSON.stringify(newItems.map(ni => ({ itemId: ni.itemId?.toString(), received: ni.received })), null, 2));
      
      for (const newItem of newItems) {
        // Handle itemId - could be ObjectId string or populated object
        let itemIdValue = newItem.itemId?._id || newItem.itemId || null;
        
        // Convert to string if it's an ObjectId object
        if (itemIdValue && typeof itemIdValue === 'object' && itemIdValue.toString) {
          itemIdValue = itemIdValue.toString();
        }
        
        // If itemId is null but itemGroupId is present, this is an item from a group
        // We'll need to find it by name and SKU within the group
        const itemGroupId = newItem.itemGroupId || null;
        const itemName = newItem.itemName || "";
        const itemSku = newItem.itemSku || newItem.sku || "";
        
        // Don't skip if itemId is null - we can still update using itemGroupId + itemName
        if (!itemIdValue && !(itemGroupId && itemName) && !itemName) {
          console.log(`⚠️ Skipping item - no itemId, itemGroupId, or itemName:`, newItem);
          continue;
        }
        
        // Find the old item to calculate difference
        // For items with null itemId, match by itemName and SKU instead
        let oldItem = null;
        const newItemIdStr = itemIdValue?.toString();
        
        for (const oi of oldItems) {
          let oldItemId = null;
          if (oi.itemId) {
            // Handle ObjectId (Mongoose document)
            if (oi.itemId._id) {
              oldItemId = oi.itemId._id.toString();
            } else if (typeof oi.itemId === 'object' && oi.itemId.toString) {
              oldItemId = oi.itemId.toString();
            } else {
              oldItemId = String(oi.itemId);
            }
          }
          
          // Match by itemId if both have itemIds
          if (itemIdValue && oldItemId && oldItemId === newItemIdStr) {
            oldItem = oi;
            break;
          } else if (!itemIdValue && !oldItemId) {
            // Both have null itemIds - match by name and SKU (if SKU is available)
            const oldItemName = oi.itemName || "";
            const oldItemSku = oi.itemSku || oi.sku || "";
            
            if (itemSku && oldItemSku) {
              // Match by both name AND SKU
              if (oldItemName.trim() === itemName.trim() && oldItemSku.trim() === itemSku.trim()) {
                oldItem = oi;
                break;
              }
            } else {
              // Match by name only if SKU is not available
              if (oldItemName.trim() === itemName.trim()) {
                oldItem = oi;
                break;
              }
            }
          }
        }
        
        const oldReceivedQty = (oldStatus === "received" || oldStatus === "partially_received") ? (parseFloat(oldItem?.received) || 0) : 0;
        const newReceivedQty = parseFloat(newItem.received) || 0;
        const qtyDifference = newReceivedQty - oldReceivedQty;
        
        console.log(`📦 Stock Update - Item ${itemIdValue || `(null, name: "${itemName}")`} (${itemName || 'Unknown'})${itemSku ? `, SKU: "${itemSku}"` : ''}:`);
        console.log(`   Old item found: ${oldItem ? 'Yes' : 'No'}`);
        console.log(`   Old received qty: ${oldReceivedQty}, New received qty: ${newReceivedQty}`);
        console.log(`   Quantity difference: ${qtyDifference}`);
        console.log(`   Old status: ${oldStatus}, New status: ${newStatus}`);
        console.log(`   ItemGroupId: ${itemGroupId || 'null'}`);
        
        // Always update stock if status is "received" or "partially_received" (even if quantities are the same, to ensure consistency)
        // This ensures stock is updated even if old item matching fails
        if ((finalNewStatus === "received" || finalNewStatus === "partially_received") && newReceivedQty > 0) {
          try {
            let operation = 'add';
            let qtyToUpdate = newReceivedQty;
            
            // Determine operation and quantity based on status changes
            const oldWasReceived = oldStatus === "received" || oldStatus === "partially_received";
            const newIsReceived = finalNewStatus === "received" || finalNewStatus === "partially_received";
            
            if (!oldWasReceived && newIsReceived) {
              // Was draft/in_transit, now received/partially_received - add new quantity
              operation = 'add';
              qtyToUpdate = newReceivedQty;
            } else if (oldWasReceived && !newIsReceived) {
              // Was received/partially_received, now draft/in_transit - subtract old quantity
              operation = 'subtract';
              qtyToUpdate = oldReceivedQty;
            } else if (oldWasReceived && newIsReceived) {
              // Both received/partially_received - adjust by difference
              if (!oldItem) {
                // Old item not found, treat as new item and add full quantity
                console.log(`   ⚠️ Old item not found - treating as new item, adding full quantity: ${newReceivedQty}`);
                operation = 'add';
                qtyToUpdate = newReceivedQty;
              } else {
                // Adjust by difference
                console.log(`   ✅ Adjusting stock by difference: ${qtyDifference}`);
                operation = 'adjust';
                qtyToUpdate = qtyDifference;
              }
            }
            
            // Get itemGroupId if available (for items from groups)
            // If itemId is null, we'll use itemGroupId + itemName to find the item
            let result;
            if (itemIdValue) {
              // Item has an ID, use normal update
              console.log(`   Using itemId to update stock: ${itemIdValue}`);
              result = await updateItemStock(itemIdValue, qtyToUpdate, operation, itemName, itemGroupId, targetWarehouse);
            } else if (itemGroupId && itemName) {
              // ItemId is null but we have itemGroupId and itemName, find by name and SKU
              console.log(`   ItemId is null, searching by name "${itemName}"${itemSku ? ` and SKU "${itemSku}"` : ''} in group ${itemGroupId}`);
              result = await updateItemStockByName(itemGroupId, itemName, qtyToUpdate, operation, itemSku, targetWarehouse);
            } else if (itemName) {
              // ItemId is null and itemGroupId is also null, but we have itemName - search all groups
              console.log(`   ItemId and itemGroupId are both null, searching all groups by name "${itemName}"${itemSku ? ` and SKU "${itemSku}"` : ''}`);
              const allGroups = await ItemGroup.find({ isActive: { $ne: false } });
              let found = false;
              
              for (const group of allGroups) {
                if (group.items && Array.isArray(group.items)) {
                  // Match by name and SKU if SKU is provided, otherwise match by name only
                  const matchingItem = itemSku
                    ? group.items.find(gi => {
                        const nameMatch = gi.name && gi.name.trim() === itemName.trim();
                        const skuMatch = gi.sku && gi.sku.trim() === itemSku.trim();
                        return nameMatch && skuMatch;
                      })
                    : group.items.find(gi => gi.name && gi.name.trim() === itemName.trim());
                  
                  if (matchingItem) {
                    console.log(`   ✅ Found item "${itemName}"${itemSku ? ` with SKU "${itemSku}"` : ''} in group "${group.name}", updating stock...`);
                    result = await updateItemStockByName(group._id, itemName, qtyToUpdate, operation, itemSku, targetWarehouse);
                    found = true;
                    break;
                  }
                }
              }
              
              if (!found) {
                result = { success: false, message: `Item "${itemName}"${itemSku ? ` with SKU "${itemSku}"` : ''} not found in any item group` };
              }
            } else {
              result = { success: false, message: "Cannot update stock: itemId is null and itemGroupId/itemName not provided" };
            }
            if (result.success) {
              if (result.type === 'standalone') {
                console.log(`✅ Successfully updated stock for standalone item ${newItem.itemName || itemIdValue}:`);
                console.log(`   Stock On Hand: ${result.stock?.stockOnHand || 0}`);
                console.log(`   Available for Sale: ${result.stock?.availableForSale || 0}`);
              } else {
                console.log(`✅ Successfully updated stock for item "${result.itemName}" in group "${result.groupName}":`);
                console.log(`   Stock On Hand: ${result.stock?.stockOnHand || 0}`);
                console.log(`   Available for Sale: ${result.stock?.availableForSale || 0}`);
              }
            } else {
              console.warn(`⚠️ ${result.message}, skipping stock update`);
            }
          } catch (itemError) {
            console.error(`❌ Error updating stock for item ${itemIdValue}:`, itemError);
            // Continue with other items even if one fails
          }
        }
      }
      
      console.log("✅ Stock update completed for edited purchase receive");
    } else if ((oldStatus === "received" || oldStatus === "partially_received") && (finalNewStatus !== "received" && finalNewStatus !== "partially_received")) {
      // Status changed from received/partially_received to draft/in_transit - need to reverse stock updates
      console.log("Reverting stock updates - status changed from received/partially_received to draft/in_transit");
      
      for (const oldItem of oldItems) {
        // Handle itemId - could be ObjectId string or populated object
        let itemIdValue = oldItem.itemId?._id?.toString() || oldItem.itemId?.toString() || null;
        const itemGroupId = oldItem.itemGroupId || null;
        const itemName = oldItem.itemName || "";
        const itemSku = oldItem.itemSku || oldItem.sku || "";
        const oldReceivedQty = parseFloat(oldItem.received) || 0;
        
        if ((itemIdValue || (itemGroupId && itemName) || itemName) && oldReceivedQty > 0) {
          try {
            // Get itemGroupId if available (for items from groups)
            let result;
            if (itemIdValue) {
              result = await updateItemStock(itemIdValue, oldReceivedQty, 'subtract', itemName, itemGroupId, targetWarehouse);
            } else if (itemGroupId && itemName) {
              result = await updateItemStockByName(itemGroupId, itemName, oldReceivedQty, 'subtract', itemSku, targetWarehouse);
            } else if (itemName) {
              // Search all groups by name and SKU
              const allGroups = await ItemGroup.find({ isActive: { $ne: false } });
              let found = false;
              
              for (const group of allGroups) {
                if (group.items && Array.isArray(group.items)) {
                  // Match by name and SKU if SKU is provided, otherwise match by name only
                  const matchingItem = itemSku
                    ? group.items.find(gi => {
                        const nameMatch = gi.name && gi.name.trim() === itemName.trim();
                        const skuMatch = gi.sku && gi.sku.trim() === itemSku.trim();
                        return nameMatch && skuMatch;
                      })
                    : group.items.find(gi => gi.name && gi.name.trim() === itemName.trim());
                  
                  if (matchingItem) {
                    result = await updateItemStockByName(group._id, itemName, oldReceivedQty, 'subtract', itemSku, targetWarehouse);
                    found = true;
                    break;
                  }
                }
              }
              
              if (!found) {
                result = { success: false, message: `Item "${itemName}"${itemSku ? ` with SKU "${itemSku}"` : ''} not found in any item group` };
              }
            } else {
              result = { success: false, message: "Cannot revert stock: itemId is null and itemGroupId/itemName not provided" };
            }
            
            if (result.success) {
              if (result.type === 'standalone') {
                console.log(`✅ Reverted stock for standalone item ${itemName || itemIdValue}: -${oldReceivedQty} units.`);
              } else {
                console.log(`✅ Reverted stock for item "${result.itemName}" in group "${result.groupName}": -${oldReceivedQty} units.`);
              }
            } else {
              console.warn(`⚠️ ${result.message}, skipping stock reversal`);
            }
          } catch (itemError) {
            console.error(`❌ Error reverting stock for item ${itemIdValue || itemName}:`, itemError);
          }
        }
      }
    }
    
    // Note: We do NOT update Purchase Order status here
    // Purchase Order status remains unchanged
    // Only the Purchase Receive shows "partially_received" status
    
    res.status(200).json(purchaseReceive);
  } catch (error) {
    console.error("Update purchase receive error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a purchase receive
export const deletePurchaseReceive = async (req, res) => {
  try {
    const { id } = req.params;
    const purchaseReceive = await PurchaseReceive.findByIdAndDelete(id);
    
    if (!purchaseReceive) {
      return res.status(404).json({ message: "Purchase receive not found" });
    }
    
    res.status(200).json({ message: "Purchase receive deleted successfully" });
  } catch (error) {
    console.error("Delete purchase receive error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send purchase receive (change status from draft to received)
export const sendPurchaseReceive = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the purchase receive
    const purchaseReceive = await PurchaseReceive.findById(id);
    
    if (!purchaseReceive) {
      return res.status(404).json({ message: "Purchase receive not found" });
    }
    
    // Check if receive is in draft status
    if (purchaseReceive.status !== "draft") {
      return res.status(400).json({ message: "Only draft receives can be sent" });
    }

    // Update status to received
    purchaseReceive.status = "received";
    await purchaseReceive.save();

    // Update stock (same behavior as when a purchase receive is saved as "received")
    const adminEmails = ["officerootments@gmail.com"];
    const userId = purchaseReceive.userId || "";
    const isAdminEmail =
      userId &&
      typeof userId === "string" &&
      adminEmails.some((email) => userId.toLowerCase() === email.toLowerCase());

    let targetWarehouse = "Warehouse";

    if (isAdminEmail) {
      targetWarehouse = "Warehouse";
      console.log(`📍 Admin email detected (${userId}), using warehouse: "Warehouse" (ignoring locCode)`);
    } else {
       const fallbackLocations = [
       
        { "locName": "Warehouse", "locCode": "858" },
        { "locName": "G-Edappally", "locCode": "702" },
        { "locName": "HEAD OFFICE01", "locCode": "759" },
        { "locName": "SG-Trivandrum", "locCode": "700" },
         { "locName": "Z-Edapally", "locCode": "144" },
        { "locName": "Z-Edappal", "locCode": "100" },
        { "locName": "Z-Perinthalmanna", "locCode": "133" },
        { "locName": "Z-Kottakkal", "locCode": "122" },
        { "locName": "G-Kottayam", "locCode": "701" },
        { "locName": "G-Perumbavoor", "locCode": "703" },
        { "locName": "G-Thrissur", "locCode": "704" },
        { "locName": "G-Chavakkad", "locCode": "706" },
        { "locName": "G-Calicut", "locCode": "712" },
        { "locName": "G-Vadakara", "locCode": "708" },
        { "locName": "G-Edappal", "locCode": "707" },
        { "locName": "G-Perinthalmanna", "locCode": "709" },
        { "locName": "G-Kottakkal", "locCode": "711" },
        { "locName": "G-Manjeri", "locCode": "710" },
        { "locName": "G-Palakkad", "locCode": "705" },
        { "locName": "G-Kalpetta", "locCode": "717" },
        { "locName": "G-Kannur", "locCode": "716" },
        { "locName": "G-Mg Road", "locCode": "718" },
        { "locName": "Production", "locCode": "101" },
        { "locName": "Office", "locCode": "102" }
    ];

      const userLocCode = purchaseReceive.locCode || "";

      if (userLocCode) {
        const location = fallbackLocations.find((loc) => loc.locCode === userLocCode);
        if (location) {
          targetWarehouse = mapLocNameToWarehouse(location.locName);
          console.log(`📍 Determined warehouse from locCode ${userLocCode}: "${location.locName}" -> "${targetWarehouse}"`);
        } else {
          console.log(`⚠️ locCode ${userLocCode} not found in fallback locations, using default "Warehouse"`);
        }
      } else {
        console.log(`⚠️ No locCode provided, using default "Warehouse"`);
      }
    }

    const items = purchaseReceive.items || [];
    if (items.length > 0) {
      console.log(`📦 Send Receive -> Stock update: ${items.length} item(s), warehouse="${targetWarehouse}"`);
      const stockUpdateSummary = [];
      for (const item of items) {
        let itemIdValue = item.itemId?._id || item.itemId || null;

        if (itemIdValue && typeof itemIdValue === "object" && itemIdValue.toString) {
          itemIdValue = itemIdValue.toString();
        }

        const itemGroupId = item.itemGroupId || null;
        const itemName = item.itemName || "";
        const itemSku = item.itemSku || item.sku || "";

        let receivedQty = 0;
        if (item.received !== null && item.received !== undefined && item.received !== "") {
          receivedQty = parseFloat(item.received);
          if (isNaN(receivedQty)) receivedQty = 0;
        }

        if (!(itemIdValue || (itemGroupId && itemName) || itemName) || receivedQty <= 0) {
          continue;
        }

        try {
          if (itemIdValue) {
            const result = await updateItemStock(itemIdValue, receivedQty, "add", itemName, itemGroupId, targetWarehouse);
            stockUpdateSummary.push({
              itemId: itemIdValue,
              itemName,
              itemSku,
              qty: receivedQty,
              ok: !!result?.success,
              message: result?.message,
            });
          } else if (itemGroupId && itemName) {
            const result = await updateItemStockByName(itemGroupId, itemName, receivedQty, "add", itemSku, targetWarehouse);
            stockUpdateSummary.push({
              itemGroupId: itemGroupId?.toString?.() || String(itemGroupId),
              itemName,
              itemSku,
              qty: receivedQty,
              ok: !!result?.success,
              message: result?.message,
            });
          } else {
            // No itemId + no itemGroupId - fallback: search all active groups by name (and SKU if present)
            const allGroups = await ItemGroup.find({ isActive: { $ne: false } });
            let found = false;

            for (const group of allGroups) {
              if (group.items && Array.isArray(group.items)) {
                const matchingItem = itemSku
                  ? group.items.find((gi) => {
                      const nameMatch = gi.name && gi.name.trim() === itemName.trim();
                      const skuMatch = gi.sku && gi.sku.trim() === itemSku.trim();
                      return nameMatch && skuMatch;
                    })
                  : group.items.find((gi) => gi.name && gi.name.trim() === itemName.trim());

                if (matchingItem) {
                  const result = await updateItemStockByName(group._id, itemName, receivedQty, "add", itemSku, targetWarehouse);
                  stockUpdateSummary.push({
                    itemGroupId: group._id?.toString?.() || String(group._id),
                    itemName,
                    itemSku,
                    qty: receivedQty,
                    ok: !!result?.success,
                    message: result?.message,
                  });
                  found = true;
                  break;
                }
              }
            }

            if (!found) {
              console.warn(
                `⚠️ Stock update skipped: cannot match item (no itemId/groupId). itemName="${itemName}", itemSku="${itemSku}"`
              );
              stockUpdateSummary.push({
                itemName,
                itemSku,
                qty: receivedQty,
                ok: false,
                message: "Item not found in any active group",
              });
            }
          }
        } catch (itemError) {
          console.error(`❌ Error updating stock for receive item ${itemIdValue || itemName}:`, itemError);
          stockUpdateSummary.push({
            itemId: itemIdValue,
            itemGroupId: itemGroupId?.toString?.() || itemGroupId,
            itemName,
            itemSku,
            qty: receivedQty,
            ok: false,
            message: itemError?.message || "Unknown error",
          });
        }
      }

      console.log("📦 Send Receive -> Stock update summary:", JSON.stringify(stockUpdateSummary, null, 2));
    }

    console.log(`Purchase receive ${purchaseReceive.receiveNumber} status updated to 'received'`);
    console.log(`Purchase receive ${purchaseReceive.receiveNumber} should be sent to location/transport`);
    
    res.status(200).json({ 
      message: "Purchase receive sent successfully", 
      receive: purchaseReceive 
    });
  } catch (error) {
    console.error("Send purchase receive error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

