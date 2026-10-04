// Improved Stock Management with Enhanced Debugging and Validation
import ShoeItem from "../model/ShoeItem.js";
import ItemGroup from "../model/ItemGroup.js";
import { checkAndCreateReorderAlerts } from "./reorderNotification.js";
import { updateMonthlyStockForSale } from "./monthlyStockTracking.js";

/**
 * Enhanced warehouse name mapping with comprehensive variations
 */
const WAREHOUSE_NAME_MAPPING = {
  "Grooms Trivandum": "Grooms Trivandrum",
  "Grooms Trivandrum": "Grooms Trivandrum", 
  "SG-Trivandrum": "Grooms Trivandrum",
  "SG.Trivandrum": "Grooms Trivandrum",
  "G.Perinthalmanna": "Perinthalmanna Branch",
  "GPerinthalmanna": "Perinthalmanna Branch", 
  "Perinthalmanna Branch": "Perinthalmanna Branch",
  "Z.Perinthalmanna": "Perinthalmanna Branch",
  "G.Palakkad": "Palakkad Branch",
  "GPalakkad": "Palakkad Branch",
  "Palakkad Branch": "Palakkad Branch",
  "Warehouse": "Warehouse",
  "warehouse": "Warehouse",
  "WAREHOUSE": "Warehouse"
};

/**
 * Normalize warehouse name with enhanced matching
 */
const normalizeWarehouseName = (name) => {
  if (!name) return null;
  const trimmed = name.toString().trim();
  
  // Direct mapping first
  if (WAREHOUSE_NAME_MAPPING[trimmed]) {
    return WAREHOUSE_NAME_MAPPING[trimmed];
  }
  
  // Case-insensitive mapping
  const lowerName = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(WAREHOUSE_NAME_MAPPING)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  return trimmed;
};

/**
 * Enhanced warehouse matching with multiple strategies
 */
const findWarehouseStockIndex = (warehouseStocks, targetWarehouse) => {
  if (!warehouseStocks || !Array.isArray(warehouseStocks) || !targetWarehouse) {
    return -1;
  }
  
  const targetLower = targetWarehouse.toLowerCase().trim();
  const normalizedTarget = normalizeWarehouseName(targetWarehouse);
  
  // Strategy 1: Exact normalized match
  let index = warehouseStocks.findIndex(ws => {
    if (!ws.warehouse) return false;
    const normalizedWs = normalizeWarehouseName(ws.warehouse);
    return normalizedWs === normalizedTarget;
  });
  
  if (index !== -1) return index;
  
  // Strategy 2: Case-insensitive exact match
  index = warehouseStocks.findIndex(ws => {
    if (!ws.warehouse) return false;
    return ws.warehouse.toLowerCase().trim() === targetLower;
  });
  
  if (index !== -1) return index;
  
  // Strategy 3: Partial match for Trivandrum variations
  if (targetLower.includes('trivandrum') || targetLower.includes('tvm') || targetLower.includes('sg')) {
    index = warehouseStocks.findIndex(ws => {
      if (!ws.warehouse) return false;
      const wsLower = ws.warehouse.toLowerCase().trim();
      return (wsLower.includes('trivandrum') || wsLower.includes('tvm') || 
              wsLower.includes('grooms') || wsLower.includes('sg'));
    });
  }
  
  if (index !== -1) return index;
  
  // Strategy 4: General partial match
  index = warehouseStocks.findIndex(ws => {
    if (!ws.warehouse) return false;
    const wsLower = ws.warehouse.toLowerCase().trim();
    return wsLower.includes(targetLower) || targetLower.includes(wsLower);
  });
  
  return index;
};

/**
 * Enhanced item matching in groups with multiple strategies
 */
const findItemInGroup = (group, itemData, itemName, itemSku) => {
  if (!group.items || !Array.isArray(group.items)) {
    return -1;
  }
  
  const itemId = itemData?._id?.toString() || "";
  
  // Strategy 1: Match by _id (most reliable)
  if (itemId) {
    let index = group.items.findIndex(gi => {
      const giId = gi._id?.toString() || "";
      return giId === itemId;
    });
    if (index !== -1) return index;
    
    // Try composite ID match (groupId_index format)
    index = group.items.findIndex(gi => {
      const giId = gi._id?.toString() || "";
      return itemId.includes(giId) || giId.includes(itemId);
    });
    if (index !== -1) return index;
  }
  
  // Strategy 2: Match by SKU (very reliable)
  if (itemSku) {
    const index = group.items.findIndex(gi => 
      gi.sku && gi.sku.toLowerCase().trim() === itemSku.toLowerCase().trim()
    );
    if (index !== -1) return index;
  }
  
  // Strategy 3: Exact name match
  if (itemName) {
    const index = group.items.findIndex(gi => 
      gi.name && gi.name.toLowerCase().trim() === itemName.toLowerCase().trim()
    );
    if (index !== -1) return index;
  }
  
  // Strategy 4: Partial name match
  if (itemName) {
    const itemNameLower = itemName.toLowerCase().trim();
    const index = group.items.findIndex(gi => {
      if (!gi.name) return false;
      const giNameLower = gi.name.toLowerCase().trim();
      return itemNameLower.includes(giNameLower) || giNameLower.includes(itemNameLower);
    });
    if (index !== -1) return index;
  }
  
  // Strategy 5: Match by name without prefix (e.g., "Shoes Formal-1010 - Black/7" -> "Black/7")
  if (itemName) {
    const itemNameWithoutPrefix = itemName.replace(/^[^-]+-\s*/, "").trim();
    const index = group.items.findIndex(gi => 
      gi.name && gi.name.toLowerCase().trim() === itemNameWithoutPrefix.toLowerCase()
    );
    if (index !== -1) return index;
  }
  
  return -1;
};

/**
 * Validation system to track stock deduction success/failure
 */
class StockDeductionValidator {
  constructor() {
    this.results = [];
    this.totalItems = 0;
    this.successfulDeductions = 0;
    this.failedDeductions = 0;
  }
  
  addResult(itemCode, itemName, success, reason, quantityDeducted = 0) {
    this.results.push({
      itemCode,
      itemName,
      success,
      reason,
      quantityDeducted,
      timestamp: new Date()
    });
    
    this.totalItems++;
    if (success) {
      this.successfulDeductions++;
    } else {
      this.failedDeductions++;
    }
  }
  
  getReport() {
    const successRate = this.totalItems > 0 ? (this.successfulDeductions / this.totalItems * 100).toFixed(1) : 0;
    
    return {
      summary: {
        totalItems: this.totalItems,
        successful: this.successfulDeductions,
        failed: this.failedDeductions,
        successRate: `${successRate}%`
      },
      failures: this.results.filter(r => !r.success),
      successes: this.results.filter(r => r.success)
    };
  }
  
  logReport() {
    const report = this.getReport();
    console.log('\n📊 STOCK DEDUCTION VALIDATION REPORT');
    console.log('===================================');
    console.log(`Total Items: ${report.summary.totalItems}`);
    console.log(`Successful: ${report.summary.successful}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    
    if (report.failures.length > 0) {
      console.log('\n❌ FAILED DEDUCTIONS:');
      report.failures.forEach(failure => {
        console.log(`- ${failure.itemCode}: ${failure.reason}`);
      });
    }
    
    if (report.successes.length > 0) {
      console.log('\n✅ SUCCESSFUL DEDUCTIONS:');
      report.successes.forEach(success => {
        console.log(`- ${success.itemCode}: -${success.quantityDeducted} pieces`);
      });
    }
    
    return report;
  }
}

/**
 * Enhanced stock update function with comprehensive validation
 */
export const updateStockOnInvoiceCreateEnhanced = async (lineItems, warehouse) => {
  const validator = new StockDeductionValidator();
  
  try {
    console.log(`🔄 ENHANCED STOCK UPDATE for warehouse: ${warehouse}`);
    console.log(`📦 Processing ${lineItems?.length || 0} items`);

    if (!lineItems || lineItems.length === 0) {
      console.warn("No line items to process");
      return validator.getReport();
    }

    for (const item of lineItems) {
      const itemCode = item.itemCode || item.item || 'Unknown';
      const quantity = parseFloat(item.quantity) || 0;
      
      console.log(`\n🔍 Processing: ${itemCode} (Quantity: ${quantity})`);
      
      if (quantity <= 0) {
        validator.addResult(itemCode, item.itemName, false, 'Invalid quantity (0 or negative)');
        console.warn(`❌ Skipping ${itemCode} - invalid quantity: ${quantity}`);
        continue;
      }

      // Extract item information with enhanced validation
      const itemGroupId = item.itemData?.itemGroupId || item.itemGroupId;
      const itemName = item.itemData?.itemName || item.itemData?.name || item.item || itemCode;
      const itemSku = item.itemData?.sku || item.itemSku || itemCode;
      
      console.log(`   Item Group ID: ${itemGroupId || 'None'}`);
      console.log(`   Item Name: ${itemName}`);
      console.log(`   Item SKU: ${itemSku}`);
      
      if (itemGroupId) {
        // Handle group items
        try {
          const success = await processGroupItem(itemGroupId, item, itemName, itemSku, warehouse, quantity, validator);
          if (!success) {
            validator.addResult(itemCode, itemName, false, 'Group item processing failed');
          }
        } catch (error) {
          console.error(`❌ Error processing group item ${itemCode}:`, error);
          validator.addResult(itemCode, itemName, false, `Group processing error: ${error.message}`);
        }
      } else {
        // Handle standalone items
        try {
          const success = await processStandaloneItem(item, itemName, warehouse, quantity, validator);
          if (!success) {
            validator.addResult(itemCode, itemName, false, 'Standalone item processing failed');
          }
        } catch (error) {
          console.error(`❌ Error processing standalone item ${itemCode}:`, error);
          validator.addResult(itemCode, itemName, false, `Standalone processing error: ${error.message}`);
        }
      }
    }

    // Generate and log validation report
    const report = validator.logReport();
    
    // Check reorder points after stock update
    try {
      await checkAndCreateReorderAlerts(lineItems, warehouse);
    } catch (reorderError) {
      console.error("Error checking reorder points:", reorderError);
    }
    
    return report;
    
  } catch (error) {
    console.error("❌ Error in enhanced stock update:", error);
    throw error;
  }
};

/**
 * Process group item with enhanced validation
 */
const processGroupItem = async (itemGroupId, item, itemName, itemSku, warehouse, quantity, validator) => {
  const itemCode = item.itemCode || item.item || itemSku;
  
  console.log(`   📦 Processing GROUP item: ${itemCode}`);
  
  // Find the group
  const group = await ItemGroup.findById(itemGroupId);
  if (!group) {
    console.warn(`❌ Item group not found: ${itemGroupId}`);
    validator.addResult(itemCode, itemName, false, `Group not found: ${itemGroupId}`);
    return false;
  }
  
  console.log(`   ✅ Group found: "${group.name}" (${group.items?.length || 0} items)`);
  
  // Find the item in the group
  const groupItemIndex = findItemInGroup(group, item.itemData, itemName, itemSku);
  
  if (groupItemIndex === -1) {
    console.warn(`❌ Item "${itemName}" not found in group "${group.name}"`);
    console.log(`   Available items: ${group.items?.map(gi => `"${gi.name}" (SKU: ${gi.sku || 'N/A'})`).join(", ")}`);
    validator.addResult(itemCode, itemName, false, `Item not found in group "${group.name}"`);
    return false;
  }
  
  const groupItem = group.items[groupItemIndex];
  console.log(`   ✅ Item found: "${groupItem.name}" (SKU: ${groupItem.sku})`);
  
  // Check warehouse stocks
  if (!groupItem.warehouseStocks || !Array.isArray(groupItem.warehouseStocks)) {
    console.warn(`❌ Item "${itemName}" has no warehouseStocks`);
    validator.addResult(itemCode, itemName, false, 'No warehouse stocks found');
    return false;
  }
  
  console.log(`   Available warehouses: ${groupItem.warehouseStocks.map(ws => `"${ws.warehouse}"`).join(", ")}`);
  
  // Find the warehouse stock
  const warehouseStockIndex = findWarehouseStockIndex(groupItem.warehouseStocks, warehouse);
  
  if (warehouseStockIndex === -1) {
    console.warn(`❌ Warehouse "${warehouse}" not found for item "${itemName}"`);
    validator.addResult(itemCode, itemName, false, `Warehouse "${warehouse}" not found`);
    return false;
  }
  
  const warehouseStock = groupItem.warehouseStocks[warehouseStockIndex];
  const currentStock = parseFloat(warehouseStock.stockOnHand) || 0;
  
  console.log(`   📊 Current stock: ${currentStock} pieces`);
  console.log(`   📉 Reducing by: ${quantity} pieces`);
  
  if (currentStock < quantity) {
    console.warn(`⚠️  Insufficient stock: ${currentStock} < ${quantity}`);
    // Continue anyway but log the warning
  }
  
  // Update stock
  const newStock = Math.max(0, currentStock - quantity);
  warehouseStock.stockOnHand = newStock;
  warehouseStock.availableForSale = newStock;
  
  // Update physical stock fields
  const currentPhysicalStock = parseFloat(warehouseStock.physicalStockOnHand) || 0;
  const newPhysicalStock = Math.max(0, currentPhysicalStock - quantity);
  warehouseStock.physicalStockOnHand = newPhysicalStock;
  warehouseStock.physicalAvailableForSale = newPhysicalStock;
  
  console.log(`   📊 New stock: ${newStock} pieces (Physical: ${newPhysicalStock})`);
  
  // Save changes
  group.markModified('items');
  await group.save();
  
  // Verify the save
  const verifyGroup = await ItemGroup.findById(itemGroupId);
  const verifyStock = verifyGroup.items[groupItemIndex].warehouseStocks[warehouseStockIndex];
  
  if (verifyStock.stockOnHand === newStock) {
    console.log(`   ✅ Stock successfully updated and verified`);
    validator.addResult(itemCode, itemName, true, 'Successfully deducted from group item', quantity);
    
    // Update monthly tracking
    try {
      const itemId = groupItem._id?.toString() || groupItem.id?.toString();
      await updateMonthlyStockForSale(itemGroupId, itemId, warehouse, quantity, itemName);
    } catch (monthlyError) {
      console.error(`   ⚠️ Monthly tracking error (non-critical):`, monthlyError);
    }
    
    return true;
  } else {
    console.error(`   ❌ Verification failed! Expected ${newStock}, got ${verifyStock.stockOnHand}`);
    validator.addResult(itemCode, itemName, false, 'Stock update verification failed');
    return false;
  }
};

/**
 * Process standalone item with enhanced validation
 */
const processStandaloneItem = async (item, itemName, warehouse, quantity, validator) => {
  const itemCode = item.itemCode || item.item || 'Unknown';
  
  console.log(`   📦 Processing STANDALONE item: ${itemCode}`);
  
  if (!item.itemData || !item.itemData._id) {
    console.warn(`❌ No itemData._id for standalone item ${itemCode}`);
    validator.addResult(itemCode, itemName, false, 'No itemData._id for standalone item');
    return false;
  }

  const itemId = item.itemData._id;
  
  // Find the standalone item
  const shoeItem = await ShoeItem.findById(itemId);
  if (!shoeItem) {
    console.warn(`❌ Standalone item not found: ${itemId}`);
    validator.addResult(itemCode, itemName, false, `Standalone item not found: ${itemId}`);
    return false;
  }

  console.log(`   ✅ Standalone item found: "${shoeItem.itemName}"`);

  // Check warehouse stocks
  if (!shoeItem.warehouseStocks || !Array.isArray(shoeItem.warehouseStocks)) {
    console.warn(`❌ Item "${shoeItem.itemName}" has no warehouseStocks`);
    validator.addResult(itemCode, itemName, false, 'No warehouse stocks found');
    return false;
  }

  console.log(`   Available warehouses: ${shoeItem.warehouseStocks.map(ws => `"${ws.warehouse}"`).join(", ")}`);

  // Find the warehouse stock
  const warehouseStockIndex = findWarehouseStockIndex(shoeItem.warehouseStocks, warehouse);

  if (warehouseStockIndex === -1) {
    console.warn(`❌ Warehouse "${warehouse}" not found for item ${itemId}`);
    validator.addResult(itemCode, itemName, false, `Warehouse "${warehouse}" not found`);
    return false;
  }

  const warehouseStock = shoeItem.warehouseStocks[warehouseStockIndex];
  const currentStock = parseFloat(warehouseStock.stockOnHand) || 0;

  console.log(`   📊 Current stock: ${currentStock} pieces`);
  console.log(`   📉 Reducing by: ${quantity} pieces`);

  if (currentStock < quantity) {
    console.warn(`⚠️  Insufficient stock: ${currentStock} < ${quantity}`);
  }

  // Update stock
  const newStock = Math.max(0, currentStock - quantity);
  warehouseStock.stockOnHand = newStock;
  warehouseStock.availableForSale = newStock;

  // Update physical stock fields
  const currentPhysicalStock = parseFloat(warehouseStock.physicalStockOnHand) || 0;
  const newPhysicalStock = Math.max(0, currentPhysicalStock - quantity);
  warehouseStock.physicalStockOnHand = newPhysicalStock;
  warehouseStock.physicalAvailableForSale = newPhysicalStock;

  console.log(`   📊 New stock: ${newStock} pieces (Physical: ${newPhysicalStock})`);

  // Save changes
  shoeItem.markModified('warehouseStocks');
  await shoeItem.save();

  // Verify the save
  const verifyItem = await ShoeItem.findById(itemId);
  const verifyStock = verifyItem.warehouseStocks[warehouseStockIndex];

  if (verifyStock.stockOnHand === newStock) {
    console.log(`   ✅ Stock successfully updated and verified`);
    validator.addResult(itemCode, itemName, true, 'Successfully deducted from standalone item', quantity);
    return true;
  } else {
    console.error(`   ❌ Verification failed! Expected ${newStock}, got ${verifyStock.stockOnHand}`);
    validator.addResult(itemCode, itemName, false, 'Stock update verification failed');
    return false;
  }
};

// Export the original function name for compatibility
export const updateStockOnInvoiceCreate = updateStockOnInvoiceCreateEnhanced;