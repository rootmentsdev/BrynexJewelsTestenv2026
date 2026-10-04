import ItemGroup from "../model/ItemGroup.js";
import ShoeItem from "../model/ShoeItem.js";

/**
 * Get current month in YYYY-MM format
 */
const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Update monthly opening stock for sales (reduce stock)
 * This is called when an invoice is created
 */
export const updateMonthlyStockForSale = async (itemGroupId, itemId, warehouse, quantity, itemName = null) => {
  try {
    const month = getCurrentMonth();
    console.log(`📅 Updating monthly stock for sale: month=${month}, warehouse="${warehouse}", qty=${quantity}`);

    if (!itemGroupId || !itemId || !warehouse || !quantity || quantity <= 0) {
      console.log(`   ⏭️ Skipping monthly stock update - missing required data`);
      return;
    }

    const group = await ItemGroup.findById(itemGroupId);
    if (!group) {
      console.warn(`   ❌ Item group not found: ${itemGroupId}`);
      return;
    }

    // Find the item in the group
    const itemIndex = group.items.findIndex(item => {
      const id = item._id?.toString() || item.id?.toString();
      return id === itemId.toString();
    });

    if (itemIndex === -1) {
      console.warn(`   ❌ Item not found in group: ${itemId}`);
      return;
    }

    // Convert to plain object for modification
    const groupPlain = group.toObject();
    const itemPlain = groupPlain.items[itemIndex];

    if (!itemPlain.warehouseStocks || !Array.isArray(itemPlain.warehouseStocks)) {
      console.warn(`   ❌ Item has no warehouseStocks`);
      return;
    }

    // Find warehouse stock entry
    let wsEntry = itemPlain.warehouseStocks.find(ws => 
      ws.warehouse && ws.warehouse.toString().trim() === warehouse.toString().trim()
    );

    if (!wsEntry) {
      console.warn(`   ❌ Warehouse "${warehouse}" not found for item`);
      return;
    }

    // Initialize monthlyOpeningStock if not exists
    if (!wsEntry.monthlyOpeningStock) {
      wsEntry.monthlyOpeningStock = [];
    }

    // Find or create monthly entry
    let monthlyEntry = wsEntry.monthlyOpeningStock.find(m => m.month === month);
    
    if (!monthlyEntry) {
      // Get previous month's closing stock as opening stock
      const [year, monthNum] = month.split('-').map(Number);
      const prevMonth = monthNum === 1 
        ? `${year - 1}-12`
        : `${year}-${String(monthNum - 1).padStart(2, '0')}`;
      
      const prevMonthlyEntry = wsEntry.monthlyOpeningStock.find(m => m.month === prevMonth);
      // Use previous month's closing stock, or current stockOnHand (actual stock), or openingStock as last resort
      const openingStock = prevMonthlyEntry?.closingStock || wsEntry.stockOnHand || wsEntry.openingStock || 0;
      // Calculate value based on stockOnHand if available, otherwise use openingStockValue
      const avgValuePerUnit = wsEntry.stockOnHand > 0 && wsEntry.openingStockValue > 0 && wsEntry.openingStock > 0
        ? wsEntry.openingStockValue / wsEntry.openingStock
        : (wsEntry.openingStockValue > 0 && wsEntry.stockOnHand > 0 ? wsEntry.openingStockValue / wsEntry.stockOnHand : 0);
      const openingStockValue = prevMonthlyEntry?.closingStockValue || (openingStock * avgValuePerUnit) || wsEntry.openingStockValue || 0;

      monthlyEntry = {
        month,
        openingStock: openingStock,
        openingStockValue: openingStockValue,
        closingStock: openingStock,
        closingStockValue: openingStockValue,
        sales: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      wsEntry.monthlyOpeningStock.push(monthlyEntry);
    }

    // Update sales (add to existing sales)
    monthlyEntry.sales = (monthlyEntry.sales || 0) + quantity;
    
    // Recalculate closing stock
    monthlyEntry.closingStock = Math.max(0, (monthlyEntry.openingStock || 0) - monthlyEntry.sales);
    const avgValuePerUnit = monthlyEntry.openingStock > 0 
      ? monthlyEntry.openingStockValue / monthlyEntry.openingStock 
      : 0;
    monthlyEntry.closingStockValue = Math.max(0, monthlyEntry.closingStock * avgValuePerUnit);
    monthlyEntry.updatedAt = new Date();

    // Update the item group
    await ItemGroup.findByIdAndUpdate(
      itemGroupId,
      { $set: { [`items.${itemIndex}`]: itemPlain } },
      { new: true }
    );

    console.log(`   ✅ Monthly stock updated for sale: sales=${monthlyEntry.sales}, closingStock=${monthlyEntry.closingStock}`);
  } catch (error) {
    console.error(`   ❌ Error updating monthly stock for sale:`, error);
    // Don't throw - this is a tracking feature, shouldn't break the main flow
  }
};

/**
 * Update monthly opening stock for purchases (add stock)
 * This is called when a purchase/bill is received
 */
export const updateMonthlyStockForPurchase = async (itemGroupId, itemId, warehouse, quantity, itemName = null) => {
  try {
    const month = getCurrentMonth();
    console.log(`📅 Updating monthly stock for purchase: month=${month}, warehouse="${warehouse}", qty=${quantity}`);

    if (!itemGroupId || !itemId || !warehouse || !quantity || quantity <= 0) {
      console.log(`   ⏭️ Skipping monthly stock update - missing required data`);
      return;
    }

    const group = await ItemGroup.findById(itemGroupId);
    if (!group) {
      console.warn(`   ❌ Item group not found: ${itemGroupId}`);
      return;
    }

    // Find the item in the group
    const itemIndex = group.items.findIndex(item => {
      const id = item._id?.toString() || item.id?.toString();
      return id === itemId.toString();
    });

    if (itemIndex === -1) {
      console.warn(`   ❌ Item not found in group: ${itemId}`);
      return;
    }

    // Convert to plain object for modification
    const groupPlain = group.toObject();
    const itemPlain = groupPlain.items[itemIndex];

    if (!itemPlain.warehouseStocks || !Array.isArray(itemPlain.warehouseStocks)) {
      console.warn(`   ❌ Item has no warehouseStocks`);
      return;
    }

    // Find warehouse stock entry
    let wsEntry = itemPlain.warehouseStocks.find(ws => 
      ws.warehouse && ws.warehouse.toString().trim() === warehouse.toString().trim()
    );

    if (!wsEntry) {
      console.warn(`   ❌ Warehouse "${warehouse}" not found for item`);
      return;
    }

    // Initialize monthlyOpeningStock if not exists
    if (!wsEntry.monthlyOpeningStock) {
      wsEntry.monthlyOpeningStock = [];
    }

    // Find or create monthly entry
    let monthlyEntry = wsEntry.monthlyOpeningStock.find(m => m.month === month);
    
    if (!monthlyEntry) {
      // Get previous month's closing stock as opening stock
      const [year, monthNum] = month.split('-').map(Number);
      const prevMonth = monthNum === 1 
        ? `${year - 1}-12`
        : `${year}-${String(monthNum - 1).padStart(2, '0')}`;
      
      const prevMonthlyEntry = wsEntry.monthlyOpeningStock.find(m => m.month === prevMonth);
      // Use previous month's closing stock, or current stockOnHand (actual stock), or openingStock as last resort
      const openingStock = prevMonthlyEntry?.closingStock || wsEntry.stockOnHand || wsEntry.openingStock || 0;
      // Calculate value based on stockOnHand if available, otherwise use openingStockValue
      const avgValuePerUnit = wsEntry.stockOnHand > 0 && wsEntry.openingStockValue > 0 && wsEntry.openingStock > 0
        ? wsEntry.openingStockValue / wsEntry.openingStock
        : (wsEntry.openingStockValue > 0 && wsEntry.stockOnHand > 0 ? wsEntry.openingStockValue / wsEntry.stockOnHand : 0);
      const openingStockValue = prevMonthlyEntry?.closingStockValue || (openingStock * avgValuePerUnit) || wsEntry.openingStockValue || 0;

      monthlyEntry = {
        month,
        openingStock: openingStock,
        openingStockValue: openingStockValue,
        closingStock: openingStock,
        closingStockValue: openingStockValue,
        sales: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      wsEntry.monthlyOpeningStock.push(monthlyEntry);
    }

    // For purchases, we add to opening stock (this represents new stock added this month)
    // The opening stock should reflect the initial stock + purchases
    // But we track purchases separately and adjust closing stock
    const currentClosingStock = monthlyEntry.closingStock || monthlyEntry.openingStock || 0;
    monthlyEntry.closingStock = currentClosingStock + quantity;
    
    // Update closing stock value proportionally
    const avgValuePerUnit = monthlyEntry.openingStock > 0 
      ? monthlyEntry.openingStockValue / monthlyEntry.openingStock 
      : (wsEntry.openingStockValue || 0) / Math.max(1, wsEntry.openingStock || 1);
    monthlyEntry.closingStockValue = monthlyEntry.closingStock * avgValuePerUnit;
    monthlyEntry.updatedAt = new Date();

    // Update the item group
    await ItemGroup.findByIdAndUpdate(
      itemGroupId,
      { $set: { [`items.${itemIndex}`]: itemPlain } },
      { new: true }
    );

    console.log(`   ✅ Monthly stock updated for purchase: closingStock=${monthlyEntry.closingStock}`);
  } catch (error) {
    console.error(`   ❌ Error updating monthly stock for purchase:`, error);
    // Don't throw - this is a tracking feature, shouldn't break the main flow
  }
};

/**
 * Update monthly opening stock for transfers (move stock between warehouses)
 */
export const updateMonthlyStockForTransfer = async (itemGroupId, itemId, sourceWarehouse, destWarehouse, quantity, itemName = null) => {
  try {
    const month = getCurrentMonth();
    console.log(`📅 Updating monthly stock for transfer: month=${month}, from="${sourceWarehouse}" to="${destWarehouse}", qty=${quantity}`);

    if (!itemGroupId || !itemId || !sourceWarehouse || !destWarehouse || !quantity || quantity <= 0) {
      console.log(`   ⏭️ Skipping monthly stock update - missing required data`);
      return;
    }

    // Reduce from source warehouse (like a sale)
    await updateMonthlyStockForSale(itemGroupId, itemId, sourceWarehouse, quantity, itemName);
    
    // Add to destination warehouse (like a purchase)
    await updateMonthlyStockForPurchase(itemGroupId, itemId, destWarehouse, quantity, itemName);

    console.log(`   ✅ Monthly stock updated for transfer`);
  } catch (error) {
    console.error(`   ❌ Error updating monthly stock for transfer:`, error);
  }
};
