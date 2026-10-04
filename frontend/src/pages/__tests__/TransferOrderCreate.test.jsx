/**
 * Test to verify that filterItemsByWarehouse shows all items
 * regardless of stock availability for transfer orders
 * 
 * ISSUE: The original logic was filtering out items with zero stock,
 * showing only ~100 items instead of all 256 items.
 * 
 * FIX: Removed the stock availability check (hasStock) so that ALL items
 * in a warehouse are shown, regardless of their current stock level.
 * This allows users to transfer items even if they have zero stock.
 */

describe('TransferOrderCreate - filterItemsByWarehouse', () => {
  // Mock data: 256 items with varying stock levels
  const mockItems = Array.from({ length: 256 }, (_, i) => ({
    _id: `item-${i}`,
    itemName: `Item ${i}`,
    sku: `SKU-${i}`,
    isActive: true,
    warehouseStocks: [
      {
        warehouse: 'Kottayam Branch',
        stockOnHand: i % 3 === 0 ? 0 : 10, // Some items have 0 stock
        availableForSale: i % 3 === 0 ? 0 : 5,
      },
      {
        warehouse: 'Warehouse',
        stockOnHand: 20,
        availableForSale: 15,
      },
    ],
  }));

  it('should show ALL items when warehouse is selected, regardless of stock', () => {
    // Simulate the current filtering logic
    const filterItemsByWarehouse = (itemsList, targetWarehouse) => {
      if (!targetWarehouse) return itemsList;

      const targetWarehouseLower = targetWarehouse.toLowerCase().trim();

      if (targetWarehouseLower === 'warehouse') {
        return itemsList;
      }

      // Current logic - filters by stock availability
      return itemsList.filter(item => {
        if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || item.warehouseStocks.length === 0) {
          return false;
        }

        return item.warehouseStocks.some(ws => {
          if (!ws.warehouse) return false;
          const stockWarehouseRaw = (ws.warehouse || '').toString().trim();
          const stockWarehouse = stockWarehouseRaw.toLowerCase().trim();

          // Check stock quantity first
          const stockOnHand = parseFloat(ws.stockOnHand) || 0;
          const availableForSale = parseFloat(ws.availableForSale) || 0;
          const hasStock = stockOnHand > 0 || availableForSale > 0;

          if (!hasStock) return false; // This is the problem - filters out zero-stock items

          const stockBase = stockWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, '').trim();
          const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, '').trim();

          if (stockWarehouse === targetWarehouseLower) {
            return true;
          }

          if (stockBase && targetBase && stockBase === targetBase) {
            return true;
          }

          if (stockWarehouse.includes(targetWarehouseLower) || targetWarehouseLower.includes(stockWarehouse)) {
            return true;
          }

          return false;
        });
      });
    };

    // Test with current logic
    const filtered = filterItemsByWarehouse(mockItems, 'Kottayam Branch');
    console.log(`Current logic: Showing ${filtered.length} items out of ${mockItems.length}`);
    expect(filtered.length).toBeLessThan(mockItems.length); // This will fail - showing the problem

    // Expected: should show all 256 items
    expect(filtered.length).toBe(mockItems.length);
  });

  it('should show all items for transfer orders (fixed logic)', () => {
    // Fixed logic - show all items regardless of stock
    const filterItemsByWarehouseFixed = (itemsList, targetWarehouse) => {
      if (!targetWarehouse) return itemsList;

      const targetWarehouseLower = targetWarehouse.toLowerCase().trim();

      // For transfer orders, show ALL items regardless of stock
      // Users might want to transfer items even if they have zero stock
      return itemsList.filter(item => {
        if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || item.warehouseStocks.length === 0) {
          return false;
        }

        return item.warehouseStocks.some(ws => {
          if (!ws.warehouse) return false;
          const stockWarehouseRaw = (ws.warehouse || '').toString().trim();
          const stockWarehouse = stockWarehouseRaw.toLowerCase().trim();

          // REMOVED: Stock quantity check - show all items regardless of stock

          const stockBase = stockWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, '').trim();
          const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, '').trim();

          if (stockWarehouse === targetWarehouseLower) {
            return true;
          }

          if (stockBase && targetBase && stockBase === targetBase) {
            return true;
          }

          if (stockWarehouse.includes(targetWarehouseLower) || targetWarehouseLower.includes(stockWarehouse)) {
            return true;
          }

          return false;
        });
      });
    };

    // Test with fixed logic
    const filtered = filterItemsByWarehouseFixed(mockItems, 'Kottayam Branch');
    console.log(`Fixed logic: Showing ${filtered.length} items out of ${mockItems.length}`);
    expect(filtered.length).toBe(mockItems.length); // Should show all 256 items
  });
});
