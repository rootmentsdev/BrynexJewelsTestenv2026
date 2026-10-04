import ShoeItem from "../model/ShoeItem.js";
import ItemGroup from "../model/ItemGroup.js";
import SalesInvoice from "../model/SalesInvoice.js";
import TransferOrder from "../model/TransferOrder.js";
import PurchaseReceive from "../model/PurchaseReceive.js";
import InventoryAdjustment from "../model/InventoryAdjustment.js";
import Bill from "../model/Bill.js";

// Helper function to get inventory adjustments from MongoDB
const getInventoryAdjustments = async (conditions) => {
  try {
    const mongoConditions = { ...conditions };
    if (conditions.itemId) {
      mongoConditions['items.itemId'] = conditions.itemId;
      delete mongoConditions.itemId;
    }

    const adjustments = await InventoryAdjustment.find(mongoConditions);
    return adjustments.map(doc => {
      const obj = doc.toObject ? doc.toObject() : { ...doc };
      obj.id = obj._id.toString();
      return obj;
    });
  } catch (error) {
    console.error("Error fetching inventory adjustments for report:", error);
    return [];
  }
};

// Helper function to get items from sales invoice (handles both 'items' and 'lineItems' structures)
const getInvoiceItems = (salesInvoice) => {
  if (salesInvoice.items && Array.isArray(salesInvoice.items)) {
    return salesInvoice.items;
  }
  if (salesInvoice.lineItems && Array.isArray(salesInvoice.lineItems)) {
    // Convert lineItems to items format
    return salesInvoice.lineItems.map(lineItem => ({
      itemId: lineItem.itemData?._id || lineItem.itemId,
      quantity: lineItem.quantity,
      rate: lineItem.rate,
      amount: lineItem.amount
    }));
  }
  return [];
};

// Warehouse name normalization mapping (same as ShoeItemController)
const WAREHOUSE_NAME_MAPPING = {
  "Grooms Trivandum": "Grooms Trivandrum",
  "Grooms Trivandrum": "Grooms Trivandrum",
  "SG-Trivandrum": "Grooms Trivandrum",
  "G.Palakkad": "Palakkad Branch",
  "G.Palakkad ": "Palakkad Branch",
  "GPalakkad": "Palakkad Branch",
  "Palakkad Branch": "Palakkad Branch",
  "Warehouse": "Warehouse",
  "warehouse": "Warehouse",
  "WAREHOUSE": "Warehouse",
  "G.Calicut": "Calicut",
  "G.Calicut ": "Calicut",
  "GCalicut": "Calicut",
  "Calicut": "Calicut",
  "G.Manjeri": "Manjery Branch",
  "G.Manjery": "Manjery Branch",
  "GManjeri": "Manjery Branch",
  "GManjery": "Manjery Branch",
  "Manjery Branch": "Manjery Branch",
  "G.Kannur": "Kannur Branch",
  "GKannur": "Kannur Branch",
  "Kannur Branch": "Kannur Branch",
  "G.Edappal": "Edappal Branch",
  "GEdappal": "Edappal Branch",
  "Edappal Branch": "Edappal Branch",
  "G.Edappally": "Edapally Branch",
  "G-Edappally": "Edapally Branch",
  "GEdappally": "Edapally Branch",
  "Edapally Branch": "Edapally Branch",
  "G.Kalpetta": "Kalpetta Branch",
  "GKalpetta": "Kalpetta Branch",
  "Kalpetta Branch": "Kalpetta Branch",
  "G.Kottakkal": "Kottakkal Branch",
  "GKottakkal": "Kottakkal Branch",
  "Kottakkal Branch": "Kottakkal Branch",
  "Z.Kottakkal": "Kottakkal Branch",
  "G.Perinthalmanna": "Perinthalmanna Branch",
  "GPerinthalmanna": "Perinthalmanna Branch",
  "Perinthalmanna Branch": "Perinthalmanna Branch",
  "Z.Perinthalmanna": "Perinthalmanna Branch",
  "G.Chavakkad": "Chavakkad Branch",
  "GChavakkad": "Chavakkad Branch",
  "Chavakkad Branch": "Chavakkad Branch",
  "G.Thrissur": "Thrissur Branch",
  "GThrissur": "Thrissur Branch",
  "Thrissur Branch": "Thrissur Branch",
  "G.Perumbavoor": "Perumbavoor Branch",
  "GPerumbavoor": "Perumbavoor Branch",
  "Perumbavoor Branch": "Perumbavoor Branch",
  "G.Kottayam": "Kottayam Branch",
  "GKottayam": "Kottayam Branch",
  "Kottayam Branch": "Kottayam Branch",
  "G.Kottayam Branch": "Kottayam Branch", // Map the duplicate to the correct name
  "G.MG Road": "MG Road Branch",
  "G.Mg Road": "MG Road Branch",
  "GMG Road": "MG Road Branch",
  "GMg Road": "MG Road Branch",
  "MG Road": "MG Road Branch",
  "Mg Road": "MG Road Branch",
  "SuitorGuy MG Road": "MG Road Branch", // Normalize the old name to the correct one
  "MG Road Branch": "MG Road Branch",
  "Mg Road Branch": "MG Road Branch",
  "G Road Branch": "MG Road Branch",
  "HEAD OFFICE01": "Head Office",
  "Head Office": "Head Office",
  "Z-Edapally1": "Warehouse",
  "Z- Edappal": "Warehouse",
  "Production": "Warehouse",
  "Office": "Warehouse",
  "G.Vadakara": "Vadakara Branch", // Fixed: was incorrectly mapped to Warehouse
  "GVadakara": "Vadakara Branch",
  "Vadakara Branch": "Vadakara Branch",
  // Fix corrupted warehouse names
  "arehouse Branch": "Warehouse", // Missing 'W' at the beginning
  "-Kalpetta Branch": "Kalpetta Branch", // Remove leading dash
  "-Kannur Branch": "Kannur Branch", // Remove leading dash
};

const normalizeWarehouseName = (warehouseName) => {
  if (!warehouseName) return null;
  const trimmed = warehouseName.toString().trim();
  if (WAREHOUSE_NAME_MAPPING[trimmed]) {
    return WAREHOUSE_NAME_MAPPING[trimmed];
  }
  const lowerName = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(WAREHOUSE_NAME_MAPPING)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  return trimmed;
};

// Get all possible warehouse name variations for a given warehouse
const getWarehouseNameVariations = (warehouseName) => {
  if (!warehouseName) return [];
  const normalized = normalizeWarehouseName(warehouseName);
  const variations = [normalized, warehouseName];
  
  // Add all keys from mapping that map to the normalized name
  for (const [key, value] of Object.entries(WAREHOUSE_NAME_MAPPING)) {
    if (value === normalized && !variations.includes(key)) {
      variations.push(key);
    }
  }
  
  // Also add case-insensitive variations
  const lowerNormalized = normalized.toLowerCase();
  for (const [key, value] of Object.entries(WAREHOUSE_NAME_MAPPING)) {
    if (value.toLowerCase() === lowerNormalized && !variations.includes(key)) {
      variations.push(key);
    }
  }
  
  // Special handling for MG Road - include "SuitorGuy MG Road" as it's used in other controllers
  if (normalized === "MG Road Branch" || warehouseName.toLowerCase().includes("mg road")) {
    if (!variations.includes("SuitorGuy MG Road")) {
      variations.push("SuitorGuy MG Road");
    }
    if (!variations.includes("MG Road")) {
      variations.push("MG Road");
    }
    if (!variations.includes("G.MG Road")) {
      variations.push("G.MG Road");
    }
    if (!variations.includes("G.Mg Road")) {
      variations.push("G.Mg Road");
    }
  }
  
  return [...new Set(variations)]; // Remove duplicates
};

// Get Inventory Summary Report
export const getInventorySummary = async (req, res) => {
  try {
    const { locCode, warehouse, allowedLocCodes } = req.query;
    const userId = req.query.userId || req.body.userId;

    // Check if user is admin
    const adminEmails = ['officerootments@gmail.com'];
    const isAdminEmail = userId && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail || (locCode && (locCode === '858' || locCode === '103'));
    const isMainAdmin = isAdmin;

    // Cluster manager: has allowedLocCodes and is not a main admin
    const clusterStoreLabels = allowedLocCodes ? allowedLocCodes.split(',').map(s => s.trim()) : [];
    const isClusterManager = !isMainAdmin && clusterStoreLabels.length > 0;
    const clusterNormalizedStores = clusterStoreLabels.map(label => normalizeWarehouseName(label)).filter(Boolean);
    // All warehouse name variations for cluster's allowed stores
    const clusterWarehouseVariations = clusterStoreLabels.flatMap(label => getWarehouseNameVariations(label));

    let query = {};

    // For store users (non-admin), filter by their locCode
    if (!isAdmin && locCode && locCode !== '858' && locCode !== '103') {
      query.$or = [
        { warehouse: locCode },
        { branch: locCode },
        { locCode: locCode }
      ];
    }
    // For admin users, filter by selected warehouse if specified and not "All Stores"
    else if (isAdmin && warehouse && warehouse !== "All Stores") {
      query.$or = [
        { warehouse: warehouse },
        { branch: warehouse },
        { locCode: warehouse }
      ];
    }

    // For store users, filter items that have stock in their warehouse
    // For admin users viewing all stores, get all items
    let items;
    
    // Normalize warehouse name
    const normalizedWarehouse = warehouse ? normalizeWarehouseName(warehouse) : null;
    const warehouseVariations = warehouse ? getWarehouseNameVariations(warehouse) : [];
    
    console.log("🔍 Original warehouse:", warehouse);
    console.log("🔍 Normalized warehouse:", normalizedWarehouse);
    console.log("🔍 Warehouse variations:", warehouseVariations);
    console.log("🔍 User locCode:", locCode);
    console.log("🔍 Is Admin:", isAdmin);
    console.log("🔍 Is Main Admin:", isMainAdmin);
    
    // Helper function to check if warehouse matches
    const warehouseMatches = (wsWarehouse) => {
      if (!wsWarehouse) return false;
      const wsWarehouseStr = wsWarehouse.toString().trim();
      const normalizedWs = normalizeWarehouseName(wsWarehouseStr);
      
      // Check if the warehouse matches any of the variations or the normalized name
      return warehouseVariations.includes(wsWarehouseStr) || 
             warehouseVariations.includes(normalizedWs) ||
             normalizedWs === normalizedWarehouse;
    };
    
    // Fetch standalone items - Use multiple strategies to find items
    let standaloneItems = [];
    if (isClusterManager && warehouse === "All Stores") {
      // Cluster manager viewing all their stores: fetch all items, filter by any of their allowed warehouses
      standaloneItems = await ShoeItem.find({});
      standaloneItems = standaloneItems.filter(item =>
        (item.warehouseStocks || []).some(ws => {
          if (!ws || !ws.warehouse) return false;
          const norm = normalizeWarehouseName(ws.warehouse.toString().trim());
          return clusterNormalizedStores.includes(norm);
        })
      );
      console.log(`🔒 Cluster manager: ${standaloneItems.length} items across allowed stores`);
    } else if (!isMainAdmin && locCode && locCode !== '858' && locCode !== '103') {
      // For store users, get ALL items first, then filter by warehouseStocks in memory
      // This ensures we only show items that have stock entries for their specific warehouse
      standaloneItems = await ShoeItem.find({});
      console.log(`📦 Fetched ALL ${standaloneItems.length} items for store user (will filter by warehouseStocks)`);
      
      // CRITICAL FIX: Filter to only include items that have warehouseStocks for this specific warehouse
      standaloneItems = standaloneItems.filter(item => {
        return (item.warehouseStocks || []).some(ws => {
          if (!ws || !ws.warehouse) return false;
          return warehouseMatches(ws.warehouse);
        });
      });
      console.log(`🔒 After filtering: ${standaloneItems.length} items have stock entries for this warehouse`);
    } else if (isAdmin && warehouse && warehouse !== "All Stores") {
      // For admin viewing specific warehouse, get ALL items first
      // We'll filter warehouseStocks in memory to show only selected warehouse stock
      standaloneItems = await ShoeItem.find({});
      console.log(`📦 Fetched ALL ${standaloneItems.length} items (will filter warehouseStocks in memory)`);
      
      // CRITICAL FIX: Filter to only include items that have warehouseStocks for the selected warehouse
      const beforeFilter = standaloneItems.length;
      standaloneItems = standaloneItems.filter(item => {
        const itemWarehouses = (item.warehouseStocks || []).map(ws => ws.warehouse).join(", ");
        const hasMatch = (item.warehouseStocks || []).some(ws => {
          if (!ws || !ws.warehouse) return false;
          const matches = warehouseMatches(ws.warehouse);
          return matches;
        });
        
        // Debug ALL items to see what's happening
        if (!hasMatch) {
          console.log(`      ❌ Filtering out "${item.itemName || item.name}" - warehouses: [${itemWarehouses}]`);
        } else {
          console.log(`      ✅ Keeping "${item.itemName || item.name}" - warehouses: [${itemWarehouses}]`);
        }
        
        return hasMatch;
      });
      console.log(`🔒 After filtering: ${standaloneItems.length} items have stock entries for ${warehouse} (was ${beforeFilter})`);
    } else {
      // For "All Stores" view, get all items
      standaloneItems = await ShoeItem.find({});
    }
    
    console.log(`📦 Found ${standaloneItems.length} standalone items`);
    
    // Debug: Log warehouse names found in the first 5 items
    if (standaloneItems.length > 0 && standaloneItems.length <= 10) {
      standaloneItems.forEach((item, idx) => {
        const warehouses = item.warehouseStocks?.map(ws => ws.warehouse).join(", ") || "none";
        console.log(`   Item ${idx + 1}: "${item.itemName || item.name}" - warehouses: [${warehouses}]`);
      });
    }
    
    // Fetch items from item groups
    const itemGroups = await ItemGroup.find({ isActive: { $ne: false } });
    let groupItems = [];
    let groupItemsChecked = 0;
    let groupItemsIncluded = 0;
    
    itemGroups.forEach(group => {
      if (group.items && Array.isArray(group.items)) {
        group.items.forEach((item, index) => {
          groupItemsChecked++;
          let shouldInclude = true;
          
          if (isClusterManager && warehouse === "All Stores") {
            // Cluster manager: include items that have stock in any of their allowed stores
            const hasStock = item.warehouseStocks && Array.isArray(item.warehouseStocks) &&
              item.warehouseStocks.some(ws => {
                if (!ws || !ws.warehouse) return false;
                const norm = normalizeWarehouseName(ws.warehouse.toString().trim());
                return clusterNormalizedStores.includes(norm);
              });
            shouldInclude = hasStock;
          } else if (!isMainAdmin && locCode && locCode !== '858' && locCode !== '103') {
            const hasStock = item.warehouseStocks && Array.isArray(item.warehouseStocks) &&
              item.warehouseStocks.some(ws => {
                if (!ws || !ws.warehouse) return false;
                return warehouseMatches(ws.warehouse);
              });
            shouldInclude = hasStock;
            
            // Debug logging for store users
            if (groupItemsChecked <= 3) {
              console.log(`   🔍 Group item "${item.name}": hasStock=${hasStock}, warehouses=[${(item.warehouseStocks || []).map(ws => ws.warehouse).join(", ")}]`);
            }
          } else if (isAdmin && warehouse && warehouse !== "All Stores") {
            const hasStock = item.warehouseStocks && Array.isArray(item.warehouseStocks) &&
              item.warehouseStocks.some(ws => {
                if (!ws || !ws.warehouse) return false;
                const matches = warehouseMatches(ws.warehouse);
                return matches;
              });
            shouldInclude = hasStock;
            
            // Debug logging for admin viewing specific warehouse
            if (groupItemsChecked <= 3) {
              const itemWarehouses = (item.warehouseStocks || []).map(ws => ws.warehouse).join(", ");
              console.log(`   🔍 Group item "${item.name}": hasStock=${hasStock}, warehouses=[${itemWarehouses}]`);
            }
          }
          
          if (shouldInclude) {
            groupItemsIncluded++;
            const standaloneItem = {
              _id: item._id || `${group._id}_${index}`,
              itemName: item.name || "",
              sku: item.sku || "",
              costPrice: item.costPrice || 0,
              category: group.category || "",
              warehouseStocks: item.warehouseStocks || [],
              itemGroupId: group._id,
              itemGroupName: group.name,
              isFromGroup: true,
              createdAt: group.createdAt,
            };
            groupItems.push(standaloneItem);
          }
        });
      }
    });
    
    console.log(`📦 Found ${groupItems.length} items from groups (checked ${groupItemsChecked}, included ${groupItemsIncluded})`);
    
    items = [...standaloneItems.map(item => ({ ...item.toObject ? item.toObject() : item, isFromGroup: false })), ...groupItems];
    
    console.log(`📦 Total items after combining standalone and group items: ${items.length}`);
    
    const inventorySummary = items.map(item => {
      let totalStock = 0;
      let totalValue = 0;
      
      // Determine which warehouse stocks to count based on user role and selection
      let warehouseStocksToShow = item.warehouseStocks || [];
      
      // If a specific warehouse is selected (not "All Stores"), only count that warehouse's stock
      if (warehouse && warehouse !== "All Stores") {
        warehouseStocksToShow = (item.warehouseStocks || []).filter(ws => {
          if (!ws || !ws.warehouse) return false;
          return warehouseMatches(ws.warehouse);
        });
      } else if (isClusterManager) {
        // Cluster manager viewing all their stores: only show stock for their allowed warehouses
        warehouseStocksToShow = (item.warehouseStocks || []).filter(ws => {
          if (!ws || !ws.warehouse) return false;
          const norm = normalizeWarehouseName(ws.warehouse.toString().trim());
          return clusterNormalizedStores.includes(norm);
        });
      } else if (!isMainAdmin && locCode && locCode !== '858' && locCode !== '103') {
        // Store user - only show their warehouse stock
        warehouseStocksToShow = (item.warehouseStocks || []).filter(ws => {
          if (!ws || !ws.warehouse) return false;
          return warehouseMatches(ws.warehouse);
        });
      }

      if (warehouseStocksToShow && Array.isArray(warehouseStocksToShow)) {
        warehouseStocksToShow.forEach(ws => {
          const stock = parseFloat(ws.stockOnHand) || parseFloat(ws.stock) || 0;
          const cost = parseFloat(item.costPrice) || 0;
          totalStock += stock;
          totalValue += stock * cost;
        });
      }

      return {
        itemId: item._id,
        itemName: item.itemName || item.name,
        sku: item.sku,
        category: item.category,
        cost: parseFloat(item.costPrice) || 0,
        totalStock,
        totalValue,
        warehouseStocks: warehouseStocksToShow,
        branch: item.branch || item.warehouse,
        _hasMatchingWarehouseStock: warehouseStocksToShow && warehouseStocksToShow.length > 0,
        // Include group information for sorting
        itemGroupId: item.itemGroupId || null,
        itemGroupName: item.itemGroupName || null,
        isFromGroup: item.isFromGroup || false
      };
    }).filter(item => {
      // For specific warehouse view, only include items that have warehouseStocks matching the warehouse
      // This ensures we only show items that actually have stock entries for MG Road
      if (warehouse && warehouse !== "All Stores") {
        // Only include items that have at least one matching warehouse stock entry for MG Road
        // (even if the stock is 0, as long as the entry exists)
        return item._hasMatchingWarehouseStock === true;
      }
      return true; // Include all items for "All Stores" view
    });

    const totalItems = inventorySummary.length;
    const totalStockValue = inventorySummary.reduce((sum, item) => sum + item.totalValue, 0);
    const totalQuantity = inventorySummary.reduce((sum, item) => sum + item.totalStock, 0);
    
    console.log(`📊 Final inventory summary: ${totalItems} items, ${totalQuantity} total quantity, ₹${totalStockValue} total value`);
    console.log(`📋 Item names: ${inventorySummary.map(i => i.itemName).join(", ")}`);

    // Helper function to extract size number from item name or SKU
    const extractSizeFromName = (itemName, sku) => {
      // Try to extract size from SKU first (e.g., BLF6-1010 -> 6)
      if (sku) {
        const skuSizeMatch = sku.match(/([A-Z]+)(\d+)-/);
        if (skuSizeMatch) {
          return parseInt(skuSizeMatch[2]);
        }
      }
      
      // Try to extract size from item name using multiple patterns
      if (itemName) {
        // Pattern 1: "Item Name - Size" (e.g., "TAN LOAFER 4018 - 10" -> 10)
        const dashSizeMatch = itemName.match(/\s-\s(\d+)$/);
        if (dashSizeMatch) {
          return parseInt(dashSizeMatch[1]);
        }
        
        // Pattern 2: "Item Name/Size" (e.g., "Shoes Formal-1010 - Black/6" -> 6)
        const slashSizeMatch = itemName.match(/\/(\d+)$/);
        if (slashSizeMatch) {
          return parseInt(slashSizeMatch[1]);
        }
        
        // Pattern 3: "Item Name Size" (e.g., "TAN LOAFER 4018 10" -> 10)
        const spaceSizeMatch = itemName.match(/\s(\d+)$/);
        if (spaceSizeMatch) {
          return parseInt(spaceSizeMatch[1]);
        }
        
        // Pattern 4: Extract from SKU-like patterns in name (e.g., "T-AL6-4018" -> 6)
        const skuInNameMatch = itemName.match(/[A-Z]+-[A-Z]*(\d+)-/);
        if (skuInNameMatch) {
          return parseInt(skuInNameMatch[1]);
        }
      }
      
      return 999; // Default for items without recognizable size
    };

    // Sort items to keep group items together with proper size ordering
    // 1. Items from the same group are grouped together (by itemGroupId)
    // 2. Within each group, sort by item name alphabetically, then by size numerically
    // 3. Standalone items come after grouped items, sorted alphabetically then by size
    const sortedItems = inventorySummary.sort((a, b) => {
      const aGroupId = a.itemGroupId || null;
      const bGroupId = b.itemGroupId || null;
      
      // If both items are from groups
      if (aGroupId && bGroupId) {
        // If same group, sort by item name first, then by size
        if (aGroupId === bGroupId) {
          // First sort by base item name (without size)
          const aBaseName = (a.itemName || '').replace(/\s-\s\d+$/, '').replace(/\/\d+$/, '').replace(/\s\d+$/, '').trim();
          const bBaseName = (b.itemName || '').replace(/\s-\s\d+$/, '').replace(/\/\d+$/, '').replace(/\s\d+$/, '').trim();
          
          if (aBaseName !== bBaseName) {
            return aBaseName.localeCompare(bBaseName);
          }
          
          // Same base name, sort by size numerically
          const aSize = extractSizeFromName(a.itemName, a.sku);
          const bSize = extractSizeFromName(b.itemName, b.sku);
          return aSize - bSize;
        }
        
        // Different groups - sort by group name first
        const aGroupName = a.itemGroupName || '';
        const bGroupName = b.itemGroupName || '';
        if (aGroupName !== bGroupName) {
          return aGroupName.localeCompare(bGroupName);
        }
        
        // Same group name but different IDs, sort by item name then size
        const aBaseName = (a.itemName || '').replace(/\s-\s\d+$/, '').replace(/\/\d+$/, '').replace(/\s\d+$/, '').trim();
        const bBaseName = (b.itemName || '').replace(/\s-\s\d+$/, '').replace(/\/\d+$/, '').replace(/\s\d+$/, '').trim();
        
        if (aBaseName !== bBaseName) {
          return aBaseName.localeCompare(bBaseName);
        }
        
        const aSize = extractSizeFromName(a.itemName, a.sku);
        const bSize = extractSizeFromName(b.itemName, b.sku);
        return aSize - bSize;
      }
      
      // If only one is from a group, group items come first
      if (aGroupId && !bGroupId) return -1;
      if (!aGroupId && bGroupId) return 1;
      
      // Both are standalone items - sort by item name alphabetically, then by size
      const aBaseName = (a.itemName || '').replace(/\s-\s\d+$/, '').replace(/\/\d+$/, '').replace(/\s\d+$/, '').trim();
      const bBaseName = (b.itemName || '').replace(/\s-\s\d+$/, '').replace(/\/\d+$/, '').replace(/\s\d+$/, '').trim();
      
      if (aBaseName !== bBaseName) {
        return aBaseName.localeCompare(bBaseName);
      }
      
      const aSize = extractSizeFromName(a.itemName, a.sku);
      const bSize = extractSizeFromName(b.itemName, b.sku);
      return aSize - bSize;
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalItems,
          totalQuantity,
          totalStockValue
        },
        items: sortedItems
      }
    });
  } catch (error) {
    console.error("Get inventory summary error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Stock Summary Report
export const getStockSummary = async (req, res) => {
  try {
    const { locCode, warehouse, category, allowedLocCodes } = req.query;
    const userId = req.query.userId || req.body.userId;

    // Check if user is admin
    const adminEmails = ['officerootments@gmail.com'];
    const isAdminEmail = userId && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail || (locCode && (locCode === '858' || locCode === '103'));
    const isMainAdmin = isAdmin;
    
    // Parse allowedLocCodes if provided (for cluster managers) — these are store labels
    const clusterAllowedLocCodes = allowedLocCodes ? allowedLocCodes.split(',').map(code => code.trim()) : [];
    // Normalize cluster store labels to canonical warehouse names
    const clusterNormalizedStores = clusterAllowedLocCodes
      .map(label => normalizeWarehouseName(label))
      .filter(Boolean);
    const isClusterManager = !isMainAdmin && clusterNormalizedStores.length > 0;

    // Normalize warehouse name
    const normalizedWarehouse = warehouse ? normalizeWarehouseName(warehouse) : null;
    const warehouseVariations = warehouse ? getWarehouseNameVariations(warehouse) : [];
    
    // Helper function to check if warehouse matches
    const warehouseMatches = (wsWarehouse) => {
      if (!wsWarehouse) return false;
      const wsWarehouseStr = wsWarehouse.toString().trim();
      const normalizedWs = normalizeWarehouseName(wsWarehouseStr);
      
      // Check if the warehouse matches any of the variations or the normalized name
      return warehouseVariations.includes(wsWarehouseStr) || 
             warehouseVariations.includes(normalizedWs) ||
             normalizedWs === normalizedWarehouse;
    };
    
    // Fetch standalone items
    let standaloneItems = [];
    if (isClusterManager && warehouse === "All Stores") {
      // Cluster manager: fetch all items, filter by their allowed stores
      standaloneItems = await ShoeItem.find({});
      standaloneItems = standaloneItems.filter(item =>
        (item.warehouseStocks || []).some(ws => {
          if (!ws || !ws.warehouse) return false;
          const norm = normalizeWarehouseName(ws.warehouse.toString().trim());
          return clusterNormalizedStores.includes(norm);
        })
      );
      console.log(`🔒 Cluster manager: ${standaloneItems.length} standalone items across allowed stores`);
    } else if (!isMainAdmin && locCode && locCode !== '858' && locCode !== '103') {
      if (normalizedWarehouse && warehouseVariations.length > 0) {
        standaloneItems = await ShoeItem.find({
          "warehouseStocks.warehouse": { $in: warehouseVariations }
        });
      } else {
        standaloneItems = await ShoeItem.find({
          "warehouseStocks.warehouse": normalizedWarehouse
        });
      }
    } else if (isAdmin && warehouse && warehouse !== "All Stores") {
      // For admin viewing specific warehouse, get ALL items first
      // We'll filter warehouseStocks in memory to show only MG Road stock
      // This ensures we catch items even if they don't have warehouseStocks entries yet
      standaloneItems = await ShoeItem.find({});
      console.log(`📦 Fetched ALL ${standaloneItems.length} items (will filter warehouseStocks in memory)`);
    } else {
      // For "All Stores" view, get all items
      standaloneItems = await ShoeItem.find({});
    }
    
    // Fetch items from item groups
    const itemGroups = await ItemGroup.find({ isActive: { $ne: false } });
    let groupItems = [];
    let groupItemsChecked = 0;
    let groupItemsIncluded = 0;
    
    itemGroups.forEach(group => {
      if (group.items && Array.isArray(group.items)) {
        group.items.forEach((item, index) => {
          groupItemsChecked++;
          let shouldInclude = true;
          
          if (isClusterManager && warehouse === "All Stores") {
            const hasStock = item.warehouseStocks && Array.isArray(item.warehouseStocks) &&
              item.warehouseStocks.some(ws => {
                if (!ws || !ws.warehouse) return false;
                const norm = normalizeWarehouseName(ws.warehouse.toString().trim());
                return clusterNormalizedStores.includes(norm);
              });
            shouldInclude = hasStock;
          } else if (!isMainAdmin && locCode && locCode !== '858' && locCode !== '103') {
            const hasStock = item.warehouseStocks && Array.isArray(item.warehouseStocks) &&
              item.warehouseStocks.some(ws => {
                if (!ws || !ws.warehouse) return false;
                const wsWarehouse = ws.warehouse.toString().trim();
                const normalizedWs = normalizeWarehouseName(wsWarehouse);
                return warehouseMatches(wsWarehouse);
              });
            shouldInclude = hasStock;
          } else if (isAdmin && warehouse && warehouse !== "All Stores") {
            const hasStock = item.warehouseStocks && Array.isArray(item.warehouseStocks) &&
              item.warehouseStocks.some(ws => {
                if (!ws || !ws.warehouse) return false;
                return warehouseMatches(ws.warehouse);
              });
            shouldInclude = hasStock;
          }
          
          if (shouldInclude) {
            groupItemsIncluded++;
            const standaloneItem = {
              _id: item._id || `${group._id}_${index}`,
              itemName: item.name || "",
              sku: item.sku || "",
              costPrice: item.costPrice || 0,
              category: group.category || "",
              warehouseStocks: item.warehouseStocks || [],
              itemGroupId: group._id,
              itemGroupName: group.name,
              isFromGroup: true,
              createdAt: group.createdAt,
            };
            groupItems.push(standaloneItem);
          }
        });
      }
    });
    
    console.log(`📦 Found ${groupItems.length} items from groups (checked ${groupItemsChecked}, included ${groupItemsIncluded})`);
    
    const items = [...standaloneItems.map(item => ({ ...item.toObject ? item.toObject() : item, isFromGroup: false })), ...groupItems];

    // Apply category filter if specified
    let filteredItems = items;
    console.log(`📦 Total items before filtering: ${items.length}`);
    console.log(`📦 Category filter requested: '${category}'`);
    
    if (category && category !== "all") {
      filteredItems = items.filter(item => {
        // First check if item has a proper category field
        const itemCategory = item.category;
        console.log(`📦 Item: ${item.itemName || item.name}, Category: '${itemCategory}'`);
        
        if (itemCategory && itemCategory === category) {
          console.log(`📦 ✅ Category match for '${item.itemName || item.name}': ${itemCategory} === ${category}`);
          return true;
        }
        
        // Fallback to name-based detection for items without category set
        const itemName = (item.itemName || item.name || "").toLowerCase();
        const itemSku = (item.sku || "").toLowerCase();
        
        if (category === "shirt") {
          // Filter for shirt-related items based on name/sku
          const isShirt = itemName.includes("shirt") || 
                         itemName.includes("t-shirt") ||
                         itemName.includes("polo") ||
                         itemSku.includes("shirt") ||
                         // Add more shirt patterns as needed
                         /\b(cotton|linen|silk)\s+(shirt|top)\b/i.test(itemName);
          console.log(`📦 Fallback shirt check for '${itemName}': ${isShirt}`);
          return isShirt;
        } else if (category === "shoe") {
          // Filter for shoe-related items based on name/sku
          const isShoe = itemName.includes("shoe") || 
                        itemName.includes("footwear") || 
                        itemName.includes("sandal") || 
                        itemName.includes("boot") ||
                        itemName.includes("loafer") ||
                        itemName.includes("sneaker") ||
                        itemSku.includes("shoe") ||
                        itemSku.includes("loafer") ||
                        // Check if item name contains common shoe indicators
                        /\b(black|brown|tan|leather)\s+(shoe|formal|loafer|boot)\b/i.test(itemName) ||
                        /\b(shoe|loafer|boot|sandal)\s+\w+\s+\d+/i.test(itemName) ||
                        // Match patterns like "TAN LOAFER 4018" or "Brown Formal 1003"
                        /\b(tan|brown|black|white)\s+(loafer|formal|shoe)\s+\d+/i.test(itemName);
          console.log(`📦 Fallback shoe check for '${itemName}': ${isShoe}`);
          return isShoe;
        }
        return false;
      });
      console.log(`📦 Filtered items by category '${category}': ${filteredItems.length} out of ${items.length} items`);
      
      // Log some examples of what was found
      if (filteredItems.length > 0) {
        console.log(`📦 Sample filtered items:`, filteredItems.slice(0, 5).map(item => item.itemName || item.name));
      }
    }

    // Define all stores that should appear in the report
    const allStoresList = [
      "Warehouse",
      "Grooms Trivandrum",
      "Palakkad Branch",
      "Calicut",
      "Manjery Branch",
      "Kannur Branch",
      "Edappal Branch",
      "Edapally Branch",
      "Kalpetta Branch",
      "Kottakkal Branch",
      "Perinthalmanna Branch",
      "Chavakkad Branch",
      "Thrissur Branch",
      "Perumbavoor Branch",
      "Kottayam Branch",
      "MG Road Branch",
      "Vadakara Branch",
      "Head Office"
    ];

    // If a specific warehouse is selected, only show that one.
    // If cluster manager is viewing "All My Stores", filter to their allowed stores only.
    let storesToShow;
    if (warehouse && warehouse !== "All Stores") {
      storesToShow = [normalizedWarehouse];
    } else if (clusterNormalizedStores.length > 0) {
      // Filter allStoresList to only include the cluster's allowed stores
      storesToShow = allStoresList.filter(storeName => clusterNormalizedStores.includes(storeName));
    } else {
      storesToShow = allStoresList;
    }

    // Initialize warehouseStockMap with selected stores at 0
    const warehouseStockMap = {};
    storesToShow.forEach(storeName => {
      warehouseStockMap[storeName] = {
        warehouse: storeName,
        totalQuantity: 0,
        totalValue: 0,
        itemCount: 0
      };
    });

    const restrictToWarehouse = (!isMainAdmin && !isClusterManager && locCode && locCode !== '858' && locCode !== '103')
      ? normalizedWarehouse
      : null;

    filteredItems.forEach(item => {
      if (item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
        item.warehouseStocks.forEach(ws => {
          if (restrictToWarehouse && ws.warehouse !== restrictToWarehouse) return;
          
          // Normalize the warehouse name from the item
          const normalizedWsName = normalizeWarehouseName(ws.warehouse) || ws.warehouse || "Unknown";
          
          // If a specific warehouse is selected, only count stock for that warehouse
          if (warehouse && warehouse !== "All Stores") {
            if (!warehouseMatches(ws.warehouse)) return;
          }
          
          const stock = parseFloat(ws.stockOnHand) || parseFloat(ws.stock) || 0;
          const cost = parseFloat(item.costPrice) || 0;

          // Only add to map if it's in our predefined list
          if (warehouseStockMap[normalizedWsName]) {
            warehouseStockMap[normalizedWsName].totalQuantity += stock;
            warehouseStockMap[normalizedWsName].totalValue += stock * cost;
            warehouseStockMap[normalizedWsName].itemCount++;
          }
        });
      }
    });

    const stockSummary = Object.values(warehouseStockMap);
    const grandTotal = stockSummary.reduce((sum, ws) => sum + ws.totalValue, 0);
    const grandQuantity = stockSummary.reduce((sum, ws) => sum + ws.totalQuantity, 0);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalWarehouses: stockSummary.length,
          grandTotalQuantity: grandQuantity,
          grandTotalValue: grandTotal
        },
        warehouses: stockSummary.sort((a, b) => b.totalValue - a.totalValue)
      }
    });
  } catch (error) {
    console.error("Get stock summary error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Inventory Valuation Report
export const getInventoryValuation = async (req, res) => {
  try {
    const { locCode, warehouse } = req.query;
    const userId = req.query.userId || req.body.userId;

    // Check if user is admin
    const adminEmails = ['officerootments@gmail.com'];
    const isAdminEmail = userId && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail || (locCode && (locCode === '858' || locCode === '103'));
    const isMainAdmin = isAdmin;

    // Normalize warehouse name
    const normalizedWarehouse = warehouse ? normalizeWarehouseName(warehouse) : null;
    
    // Fetch standalone items
    let standaloneItems = [];
    if (!isMainAdmin && locCode && locCode !== '858' && locCode !== '103') {
      standaloneItems = await ShoeItem.find({
        "warehouseStocks.warehouse": normalizedWarehouse
      });
    } else if (isAdmin && warehouse && warehouse !== "All Stores") {
      standaloneItems = await ShoeItem.find({
        "warehouseStocks.warehouse": normalizedWarehouse
      });
    } else {
      standaloneItems = await ShoeItem.find({});
    }
    
    // Fetch items from item groups
    const itemGroups = await ItemGroup.find({ isActive: { $ne: false } });
    let groupItems = [];
    
    itemGroups.forEach(group => {
      if (group.items && Array.isArray(group.items)) {
        group.items.forEach((item, index) => {
          let shouldInclude = true;
          
          if (!isMainAdmin && locCode && locCode !== '858' && locCode !== '103') {
            const hasStock = item.warehouseStocks && Array.isArray(item.warehouseStocks) &&
              item.warehouseStocks.some(ws => ws.warehouse === normalizedWarehouse);
            shouldInclude = hasStock;
          } else if (isAdmin && warehouse && warehouse !== "All Stores") {
            const hasStock = item.warehouseStocks && Array.isArray(item.warehouseStocks) &&
              item.warehouseStocks.some(ws => ws.warehouse === normalizedWarehouse);
            shouldInclude = hasStock;
          }
          
          if (shouldInclude) {
            const standaloneItem = {
              _id: item._id || `${group._id}_${index}`,
              itemName: item.name || "",
              sku: item.sku || "",
              costPrice: item.costPrice || 0,
              category: group.category || "",
              warehouseStocks: item.warehouseStocks || [],
              itemGroupId: group._id,
              itemGroupName: group.name,
              isFromGroup: true,
              createdAt: group.createdAt,
            };
            groupItems.push(standaloneItem);
          }
        });
      }
    });
    
    const items = [...standaloneItems.map(item => ({ ...item.toObject ? item.toObject() : item, isFromGroup: false })), ...groupItems];

    const valuationByCategory = {};
    let totalValuation = 0;

    items.forEach(item => {
      const category = item.category || "Uncategorized";
      let itemValue = 0;

      if (item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
        item.warehouseStocks.forEach(ws => {
          if (!isMainAdmin && locCode && locCode !== '858' && locCode !== '103' && ws.warehouse !== normalizedWarehouse) return;
          const stock = parseFloat(ws.stockOnHand) || parseFloat(ws.stock) || 0;
          const cost = parseFloat(item.costPrice) || 0;
          itemValue += stock * cost;
        });
      }

      if (!valuationByCategory[category]) {
        valuationByCategory[category] = {
          category,
          itemCount: 0,
          totalQuantity: 0,
          totalValue: 0
        };
      }

      valuationByCategory[category].itemCount++;
      valuationByCategory[category].totalValue += itemValue;

      if (item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
        item.warehouseStocks.forEach(ws => {
          if (!isMainAdmin && locCode && locCode !== '858' && locCode !== '103' && ws.warehouse !== normalizedWarehouse) return;
          valuationByCategory[category].totalQuantity += parseFloat(ws.stockOnHand) || parseFloat(ws.stock) || 0;
        });
      }

      totalValuation += itemValue;
    });

    const valuationList = Object.values(valuationByCategory)
      .sort((a, b) => b.totalValue - a.totalValue);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCategories: valuationList.length,
          totalValuation,
          averageValuePerCategory: valuationList.length > 0 ? totalValuation / valuationList.length : 0
        },
        categories: valuationList
      }
    });
  } catch (error) {
    console.error("Get inventory valuation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Get Opening Stock Report - Shows total opening stock added by month and store
export const getOpeningStockReport = async (req, res) => {
  try {
    const { locCode, warehouse, month } = req.query;
    
    console.log("📊 Opening Stock Report Request:", { locCode, warehouse, month });
    
    // Date range setup based on month
    let dateFilter = {};
    let displayPeriod = "All time";
    
    if (month) {
      // Month format: "2026-01" for January 2026
      const [year, monthNum] = month.split('-');
      if (year && monthNum && !isNaN(year) && !isNaN(monthNum)) {
        const startDate = new Date(year, monthNum - 1, 1); // First day of month
        const endDate = new Date(year, monthNum, 0); // Last day of month
        
        dateFilter = {
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        };
        
        displayPeriod = new Date(year, monthNum - 1).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
      } else {
        console.warn("Invalid month format:", month);
        displayPeriod = "Invalid month format";
      }
    } else {
      // Default to last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      dateFilter = {
        createdAt: { $gte: twelveMonthsAgo }
      };
      displayPeriod = "Last 12 months";
    }
    
    // Get standalone items with opening stock created in the date range
    const standaloneItems = await ShoeItem.find({
      'warehouseStocks.openingStock': { $gt: 0 },
      ...dateFilter
    }).select('itemName sku warehouseStocks createdAt');
    
    // Get item groups with opening stock created in the date range
    const itemGroups = await ItemGroup.find({
      'items.warehouseStocks.openingStock': { $gt: 0 },
      ...dateFilter
    }).select('groupName items.name items.warehouseStocks createdAt');
    
    // Process data by store (no monthly grouping)
    const storeData = {};
    const itemDetails = [];
    let totalOpeningStock = 0;
    let totalOpeningValue = 0;
    
    // Helper function to normalize warehouse names
    const normalizeWarehouseName = (name) => {
      if (!name) return "Warehouse";
      const normalized = WAREHOUSE_NAME_MAPPING[name.trim()] || name.trim();
      return normalized;
    };
    
    // Process standalone items
    standaloneItems.forEach(item => {
      item.warehouseStocks.forEach(stock => {
        if (stock.openingStock > 0) {
          const storeName = normalizeWarehouseName(stock.warehouse);
          const stockQty = stock.openingStock || 0;
          const stockValue = stock.openingStockValue || 0;
          
          // Store totals
          if (!storeData[storeName]) {
            storeData[storeName] = { totalStock: 0, totalValue: 0, itemCount: 0 };
          }
          storeData[storeName].totalStock += stockQty;
          storeData[storeName].totalValue += stockValue;
          storeData[storeName].itemCount += 1;
          
          // Item details
          itemDetails.push({
            itemName: item.itemName,
            sku: item.sku,
            store: storeName,
            openingStock: stockQty,
            openingValue: stockValue,
            createdAt: item.createdAt,
            type: 'standalone'
          });
          
          // Grand totals
          totalOpeningStock += stockQty;
          totalOpeningValue += stockValue;
        }
      });
    });
    
    // Process item groups
    itemGroups.forEach(group => {
      group.items.forEach(item => {
        if (item.warehouseStocks) {
          item.warehouseStocks.forEach(stock => {
            if (stock.openingStock > 0) {
              const storeName = normalizeWarehouseName(stock.warehouse);
              const stockQty = stock.openingStock || 0;
              const stockValue = stock.openingStockValue || 0;
              
              // Store totals
              if (!storeData[storeName]) {
                storeData[storeName] = { totalStock: 0, totalValue: 0, itemCount: 0 };
              }
              storeData[storeName].totalStock += stockQty;
              storeData[storeName].totalValue += stockValue;
              storeData[storeName].itemCount += 1;
              
              // Item details
              itemDetails.push({
                itemName: item.name,
                sku: item.sku,
                store: storeName,
                openingStock: stockQty,
                openingValue: stockValue,
                createdAt: group.createdAt,
                type: 'grouped',
                groupName: group.groupName
              });
              
              // Grand totals
              totalOpeningStock += stockQty;
              totalOpeningValue += stockValue;
            }
          });
        }
      });
    });
    
    // Convert to arrays and sort
    const storeReport = Object.entries(storeData).map(([store, data]) => ({
      store,
      totalStock: data.totalStock,
      totalValue: data.totalValue,
      itemCount: data.itemCount
    })).sort((a, b) => b.totalStock - a.totalStock);
    
    // Sort item details by creation date (newest first)
    itemDetails.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Filter by warehouse if specified
    let filteredStoreReport = storeReport;
    let filteredItemDetails = itemDetails;
    
    if (warehouse && warehouse !== 'all' && warehouse !== 'Warehouse') {
      const targetWarehouse = normalizeWarehouseName(warehouse);
      
      filteredStoreReport = storeReport.filter(store => store.store === targetWarehouse);
      filteredItemDetails = itemDetails.filter(item => item.store === targetWarehouse);
      
      // Recalculate totals for filtered data
      totalOpeningStock = filteredItemDetails.reduce((sum, item) => sum + item.openingStock, 0);
      totalOpeningValue = filteredItemDetails.reduce((sum, item) => sum + item.openingValue, 0);
    }
    
    console.log("📊 Opening Stock Report Generated:", {
      totalItems: filteredItemDetails.length,
      totalStores: filteredStoreReport.length,
      grandTotalStock: totalOpeningStock,
      grandTotalValue: totalOpeningValue,
      period: displayPeriod
    });
    
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOpeningStock,
          totalOpeningValue,
          totalItems: filteredItemDetails.length,
          totalStores: filteredStoreReport.length,
          period: displayPeriod
        },
        storeReport: filteredStoreReport,
        itemDetails: filteredItemDetails
      }
    });
    
  } catch (error) {
    console.error("❌ Get opening stock report error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get Stock On Hand Report - Shows available stock for a specific date range
export const getStockOnHandReport = async (req, res) => {
  try {
    const { locCode, warehouse, startDate, endDate } = req.query;
    const userId = req.query.userId || req.body.userId;

    console.log("📊 Stock On Hand Report Request:", { locCode, warehouse, startDate, endDate });

    // Check if user is admin
    const adminEmails = ['officerootments@gmail.com'];
    const isAdminEmail = userId && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail || (locCode && (locCode === '858' || locCode === '103'));
    const isMainAdmin = isAdmin;
    
    // Date range setup
    let endDateObj = new Date();
    let startDateObj = null;
    let displayPeriod = "Current Stock";
    
    if (endDate) {
      endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // End of day
      displayPeriod = `Stock as of ${endDateObj.toLocaleDateString('en-IN')}`;
    }
    
    if (startDate) {
      startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0); // Start of day
      displayPeriod = `Stock from ${startDateObj.toLocaleDateString('en-IN')} to ${endDateObj.toLocaleDateString('en-IN')}`;
    } else {
      // If no start date provided, use a date far in the past to capture all movements
      startDateObj = new Date('2020-01-01');
      startDateObj.setHours(0, 0, 0, 0);
    }
    
    // Normalize warehouse name
    const normalizedWarehouse = warehouse ? normalizeWarehouseName(warehouse) : null;
    const warehouseVariations = warehouse ? getWarehouseNameVariations(warehouse) : [];
    
    // Helper function to check if warehouse matches
    const warehouseMatches = (wsWarehouse) => {
      if (!wsWarehouse) return false;
      const wsWarehouseStr = wsWarehouse.toString().trim();
      const normalizedWs = normalizeWarehouseName(wsWarehouseStr);
      
      return warehouseVariations.includes(wsWarehouseStr) || 
             warehouseVariations.includes(normalizedWs) ||
             normalizedWs === normalizedWarehouse;
    };
    
    // Fetch standalone items
    let standaloneItems = [];
    if (!isMainAdmin && locCode && locCode !== '858' && locCode !== '103') {
      standaloneItems = await ShoeItem.find({});
      standaloneItems = standaloneItems.filter(item => {
        return (item.warehouseStocks || []).some(ws => {
          if (!ws || !ws.warehouse) return false;
          return warehouseMatches(ws.warehouse);
        });
      });
    } else if (isAdmin && warehouse && warehouse !== "All Stores") {
      standaloneItems = await ShoeItem.find({});
      standaloneItems = standaloneItems.filter(item => {
        return (item.warehouseStocks || []).some(ws => {
          if (!ws || !ws.warehouse) return false;
          return warehouseMatches(ws.warehouse);
        });
      });
    } else {
      standaloneItems = await ShoeItem.find({});
    }
    
    // Fetch items from item groups
    const itemGroups = await ItemGroup.find({ isActive: { $ne: false } });
    let groupItems = [];
    
    itemGroups.forEach(group => {
      if (group.items && Array.isArray(group.items)) {
        group.items.forEach((item, index) => {
          let shouldInclude = true;
          
          if (!isMainAdmin && locCode && locCode !== '858' && locCode !== '103') {
            const hasStock = item.warehouseStocks && Array.isArray(item.warehouseStocks) &&
              item.warehouseStocks.some(ws => {
                if (!ws || !ws.warehouse) return false;
                return warehouseMatches(ws.warehouse);
              });
            shouldInclude = hasStock;
          } else if (isAdmin && warehouse && warehouse !== "All Stores") {
            const hasStock = item.warehouseStocks && Array.isArray(item.warehouseStocks) &&
              item.warehouseStocks.some(ws => {
                if (!ws || !ws.warehouse) return false;
                return warehouseMatches(ws.warehouse);
              });
            shouldInclude = hasStock;
          }
          
          if (shouldInclude) {
            const standaloneItem = {
              _id: item._id || `${group._id}_${index}`,
              itemName: item.name || "",
              sku: item.sku || "",
              costPrice: item.costPrice || 0,
              category: group.category || "",
              warehouseStocks: item.warehouseStocks || [],
              itemGroupId: group._id,
              itemGroupName: group.name,
              isFromGroup: true,
              createdAt: group.createdAt,
            };
            groupItems.push(standaloneItem);
          }
        });
      }
    });
    
    const items = [...standaloneItems.map(item => ({ ...item.toObject ? item.toObject() : item, isFromGroup: false })), ...groupItems];
    console.log(`📊 Processing ${items.length} items — fetching all movements in bulk...`);

    // ── BULK FETCH: 3 queries total instead of ~1000 ──────────────────────
    const dayBeforeStart = new Date(startDateObj);
    dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
    dayBeforeStart.setHours(23, 59, 59, 999);

    const [allPurchaseReceives, allTransferOrders, allSalesInvoices] = await Promise.all([
      PurchaseReceive.find({ status: 'received', createdAt: { $lte: endDateObj } }).select('items toWarehouse createdAt').lean(),
      TransferOrder.find({ status: 'completed', createdAt: { $lte: endDateObj } }).select('items sourceWarehouse destinationWarehouse createdAt').lean(),
      SalesInvoice.find({ createdAt: { $gte: startDateObj, $lte: endDateObj } }).select('items lineItems warehouse createdAt').lean(),
    ]);

    // Index movements by itemId for O(1) lookup
    const prByItem = new Map();
    for (const pr of allPurchaseReceives) {
      for (const it of (pr.items || [])) {
        const id = it.itemId?.toString();
        if (!id) continue;
        if (!prByItem.has(id)) prByItem.set(id, []);
        prByItem.get(id).push({ qty: parseFloat(it.receivedQuantity || it.quantity || it.received) || 0, warehouse: pr.toWarehouse, date: new Date(pr.createdAt) });
      }
    }
    const toInByItem = new Map();
    const toOutByItem = new Map();
    for (const to of allTransferOrders) {
      for (const it of (to.items || [])) {
        const id = it.itemId?.toString();
        if (!id) continue;
        const qty = parseFloat(it.quantity) || 0;
        const date = new Date(to.createdAt);
        if (!toInByItem.has(id)) toInByItem.set(id, []);
        toInByItem.get(id).push({ qty, warehouse: to.destinationWarehouse, date });
        if (!toOutByItem.has(id)) toOutByItem.set(id, []);
        toOutByItem.get(id).push({ qty, warehouse: to.sourceWarehouse, date });
      }
    }
    const salesByItem = new Map();
    for (const si of allSalesInvoices) {
      const invoiceItems = getInvoiceItems(si);
      for (const it of invoiceItems) {
        const id = it.itemId?.toString();
        if (!id) continue;
        if (!salesByItem.has(id)) salesByItem.set(id, []);
        salesByItem.get(id).push({ qty: parseFloat(it.quantity) || 0, warehouse: si.warehouse, date: new Date(si.createdAt) });
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    // Calculate stock on hand for each item (pure in-memory, no more DB calls)
    const stockOnHandData = [];
    let totalStockOnHand = 0;
    let totalStockValue = 0;
    let totalStockIn = 0;
    let totalStockOut = 0;
    let totalOpeningStock = 0;

    for (const item of items) {
      const itemId = item._id?.toString();

      // Determine which warehouse stocks to process
      let warehouseStocksToProcess = item.warehouseStocks || [];
      if (warehouse && warehouse !== "All Stores") {
        warehouseStocksToProcess = warehouseStocksToProcess.filter(ws => ws?.warehouse && warehouseMatches(ws.warehouse));
      } else if (!isMainAdmin && locCode && locCode !== '858' && locCode !== '103') {
        warehouseStocksToProcess = warehouseStocksToProcess.filter(ws => ws?.warehouse && warehouseMatches(ws.warehouse));
      }
      
      for (const warehouseStock of warehouseStocksToProcess) {
        const warehouseName = normalizeWarehouseName(warehouseStock.warehouse);
        const wsVariations = getWarehouseNameVariations(warehouseName);
        const wsMatch = (wh) => wh && (wsVariations.includes(wh) || wsVariations.includes(normalizeWarehouseName(wh)) || normalizeWarehouseName(wh) === warehouseName);

        const originalOpeningStock = parseFloat(warehouseStock.openingStock) || 0;
        const itemCreationDate = new Date(item.createdAt || '2020-01-01');

        // Opening stock = stock before startDate
        let openingStock = itemCreationDate < startDateObj ? originalOpeningStock : 0;

        if (startDate && itemCreationDate < startDateObj) {
          for (const r of (prByItem.get(itemId) || [])) {
            if (wsMatch(r.warehouse) && r.date >= itemCreationDate && r.date <= dayBeforeStart) openingStock += r.qty;
          }
          for (const r of (toInByItem.get(itemId) || [])) {
            if (wsMatch(r.warehouse) && r.date >= itemCreationDate && r.date <= dayBeforeStart) openingStock += r.qty;
          }
          for (const r of (toOutByItem.get(itemId) || [])) {
            if (wsMatch(r.warehouse) && r.date >= itemCreationDate && r.date <= dayBeforeStart) openingStock -= r.qty;
          }
          for (const r of (salesByItem.get(itemId) || [])) {
            if (wsMatch(r.warehouse) && r.date >= itemCreationDate && r.date <= dayBeforeStart) openingStock -= r.qty;
          }
        }
        openingStock = Math.max(0, openingStock);

        // Movements within period
        let stockIn = 0;
        let stockOut = 0;

        if (itemCreationDate >= startDateObj && itemCreationDate <= endDateObj && originalOpeningStock > 0) {
          stockIn += originalOpeningStock;
        }
        for (const r of (prByItem.get(itemId) || [])) {
          if (wsMatch(r.warehouse) && r.date >= startDateObj && r.date <= endDateObj) stockIn += r.qty;
        }
        for (const r of (toInByItem.get(itemId) || [])) {
          if (wsMatch(r.warehouse) && r.date >= startDateObj && r.date <= endDateObj) stockIn += r.qty;
        }
        for (const r of (toOutByItem.get(itemId) || [])) {
          if (wsMatch(r.warehouse) && r.date >= startDateObj && r.date <= endDateObj) stockOut += r.qty;
        }
        for (const r of (salesByItem.get(itemId) || [])) {
          if (wsMatch(r.warehouse) && r.date >= startDateObj && r.date <= endDateObj) stockOut += r.qty;
        }

        const closingStock = Math.max(0, openingStock + stockIn - stockOut);
        const itemCost = parseFloat(item.costPrice) || 0;
        const stockValue = closingStock * itemCost;

        const hasWarehouseEntry = warehouseStocksToProcess.length > 0;
        const shouldInclude = closingStock > 0 || stockIn > 0 || stockOut > 0 || openingStock > 0 || hasWarehouseEntry;

        if (shouldInclude) {
          stockOnHandData.push({
            itemId: item._id,
            itemName: item.itemName || item.name,
            sku: item.sku,
            category: item.category,
            warehouse: warehouseName,
            openingStock,
            stockIn,
            stockOut,
            closingStock,
            costPrice: itemCost,
            stockValue: Math.max(0, stockValue),
            itemGroupId: item.itemGroupId || null,
            itemGroupName: item.itemGroupName || null,
            isFromGroup: item.isFromGroup || false
          });
          totalStockOnHand += closingStock;
          totalStockValue += Math.max(0, stockValue);
          totalStockIn += stockIn;
          totalStockOut += stockOut;
          totalOpeningStock += openingStock;
        }
      }
    }
    
    // Sort by warehouse, then by item name
    stockOnHandData.sort((a, b) => {
      if (a.warehouse !== b.warehouse) {
        return a.warehouse.localeCompare(b.warehouse);
      }
      return (a.itemName || '').localeCompare(b.itemName || '');
    });
    
    // Group by warehouse for summary
    const warehouseSummary = {};
    stockOnHandData.forEach(item => {
      if (!warehouseSummary[item.warehouse]) {
        warehouseSummary[item.warehouse] = {
          warehouse: item.warehouse,
          totalItems: 0,
          totalStock: 0,
          totalValue: 0
        };
      }
      
      warehouseSummary[item.warehouse].totalItems += 1;
      warehouseSummary[item.warehouse].totalStock += item.closingStock;
      warehouseSummary[item.warehouse].totalValue += item.stockValue;
    });
    
    const warehouseReport = Object.values(warehouseSummary).sort((a, b) => b.totalValue - a.totalValue);
    
    console.log("📊 Stock On Hand Report Generated:", {
      totalItems: stockOnHandData.length,
      totalWarehouses: warehouseReport.length,
      grandTotalStock: totalStockOnHand,
      grandTotalValue: totalStockValue,
      period: displayPeriod,
      itemsProcessed: items.length,
      itemsIncluded: stockOnHandData.length
    });
    
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalItems: stockOnHandData.length,
          totalOpeningStock,
          totalStockIn,
          totalStockOut,
          totalClosingStock: totalStockOnHand,
          totalStockValue,
          totalWarehouses: warehouseReport.length,
          period: displayPeriod
        },
        warehouseReport,
        itemDetails: stockOnHandData
      }
    });
    
  } catch (error) {
    console.error("❌ Get stock on hand report error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get Inventory Aging Report
export const getInventoryAging = async (req, res) => {
  try {
    const { locCode, warehouse, category, asOfDate, allowedLocCodes, search, bracket } = req.query;
    const userId = req.query.userId || req.body.userId;

    // Check admin / permissions
    const adminEmails = ['officerootments@gmail.com', 'brynex@gmail.com'];
    const isAdminEmail = userId && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail || (locCode && (locCode === '858' || locCode === '103')) || !locCode || locCode === 'admin';
    const isMainAdmin = isAdmin;

    const clusterStoreLabels = allowedLocCodes ? allowedLocCodes.split(',').map(s => s.trim()) : [];
    const isClusterManager = !isMainAdmin && clusterStoreLabels.length > 0;
    const clusterWarehouseVariations = clusterStoreLabels.flatMap(label => getWarehouseNameVariations(label));

    // Target evaluation date (default today)
    const targetDate = asOfDate ? new Date(asOfDate) : new Date();
    const evaluationTime = targetDate.getTime();

    // Normalizing warehouse filters
    const normalizedWarehouse = warehouse && warehouse !== "All Stores" ? normalizeWarehouseName(warehouse) : null;
    const warehouseVariations = warehouse && warehouse !== "All Stores" ? getWarehouseNameVariations(warehouse) : [];

    // Helper to check if warehouse matches query
    const warehouseMatches = (wsWarehouse) => {
      if (!wsWarehouse) return false;
      const wsWarehouseStr = wsWarehouse.toString().trim();
      const normalizedWs = normalizeWarehouseName(wsWarehouseStr);

      if (isClusterManager && warehouse === "All Stores") {
        return clusterWarehouseVariations.includes(wsWarehouseStr) ||
               clusterWarehouseVariations.includes(normalizedWs);
      }

      if (!isAdmin && locCode && locCode !== '858' && locCode !== '103') {
        const userWarehouse = normalizeWarehouseName(locCode);
        const userVariations = getWarehouseNameVariations(locCode);
        return userVariations.includes(wsWarehouseStr) || normalizedWs === userWarehouse;
      }

      if (!normalizedWarehouse || warehouse === "All Stores") {
        return true;
      }

      return warehouseVariations.includes(wsWarehouseStr) ||
             warehouseVariations.includes(normalizedWs) ||
             normalizedWs === normalizedWarehouse;
    };

    // 1. Fetch Inward Transactions to find stock addition dates (Bills, Receives, Transfers, Adjustments)
    const [bills, receives, transferOrders, adjustments, standaloneItems, itemGroups] = await Promise.all([
      Bill.find({}).select('billNumber billDate warehouse branch items createdAt').lean(),
      PurchaseReceive.find({ status: { $ne: 'cancelled' } }).select('receiveNumber receivedDate toWarehouse items createdAt').lean(),
      TransferOrder.find({ status: { $in: ['transferred', 'in_transit'] } }).select('transferOrderNumber date destinationWarehouse items createdAt').lean(),
      InventoryAdjustment.find({}).select('adjustmentNumber date warehouse branch items createdAt').lean(),
      ShoeItem.find({ isActive: { $ne: false } }).lean(),
      ItemGroup.find({ isActive: { $ne: false } }).lean(),
    ]);

    // Build lookup maps for inward dates
    // Key: `${itemId}_${normalizedWarehouse}` or `${itemId}` or `${sku}`
    const inwardHistoryMap = new Map();

    const recordInward = (key, date, source) => {
      if (!key || !date) return;
      const d = new Date(date);
      if (isNaN(d.getTime())) return;
      
      const existing = inwardHistoryMap.get(key);
      // Keep the most recent inward date for that item/warehouse, or the one closest to asOfDate
      if (!existing || d > existing.date) {
        inwardHistoryMap.set(key, { date: d, source });
      }
    };

    // Index Bills (Purchase Bills)
    bills.forEach(bill => {
      const bDate = bill.billDate || bill.createdAt;
      const bWh = normalizeWarehouseName(bill.warehouse || bill.branch || "Warehouse");
      (bill.items || []).forEach(item => {
        const itemId = (item.itemId || item._id || "").toString();
        const sku = (item.itemSku || item.sku || "").toString().toLowerCase().trim();
        const sourceLabel = `Purchase Bill #${bill.billNumber || "N/A"}`;

        if (itemId && bWh) {
          recordInward(`${itemId}_${bWh}`, bDate, sourceLabel);
        }
        if (sku && bWh) {
          recordInward(`${sku}_${bWh}`, bDate, sourceLabel);
        }
      });
    });

    // Index Purchase Receives
    receives.forEach(rcv => {
      const rDate = rcv.receivedDate || rcv.createdAt;
      const rWh = normalizeWarehouseName(rcv.toWarehouse || "Warehouse");
      (rcv.items || []).forEach(item => {
        const itemId = (item.itemId || item._id || "").toString();
        const sku = (item.itemSku || item.sku || "").toString().toLowerCase().trim();
        const sourceLabel = `Purchase Receive #${rcv.receiveNumber || "N/A"}`;

        if (itemId && rWh) {
          recordInward(`${itemId}_${rWh}`, rDate, sourceLabel);
        }
        if (sku && rWh) {
          recordInward(`${sku}_${rWh}`, rDate, sourceLabel);
        }
      });
    });

    // Index Transfer Orders (destination warehouse receives stock on transfer date)
    transferOrders.forEach(to => {
      const toDate = to.date || to.createdAt;
      const toWh = normalizeWarehouseName(to.destinationWarehouse);
      (to.items || []).forEach(item => {
        const itemId = (item.itemId || item._id || "").toString();
        const sku = (item.itemSku || item.sku || "").toString().toLowerCase().trim();
        const sourceLabel = `Transfer Order #${to.transferOrderNumber || "N/A"}`;

        if (itemId && toWh) {
          recordInward(`${itemId}_${toWh}`, toDate, sourceLabel);
        }
        if (sku && toWh) {
          recordInward(`${sku}_${toWh}`, toDate, sourceLabel);
        }
      });
    });

    // Index Inventory Adjustments (positive adjustments)
    adjustments.forEach(adj => {
      const adjDate = adj.date || adj.createdAt;
      const adjWh = normalizeWarehouseName(adj.warehouse || adj.branch);
      (adj.items || []).forEach(item => {
        const itemId = (item.itemId || item._id || "").toString();
        const sku = (item.itemSku || item.sku || "").toString().toLowerCase().trim();
        const sourceLabel = `Adjustment #${adj.adjustmentNumber || "N/A"}`;
        if (itemId && adjWh) {
          recordInward(`${itemId}_${adjWh}`, adjDate, sourceLabel);
        }
        if (sku && adjWh) {
          recordInward(`${sku}_${adjWh}`, adjDate, sourceLabel);
        }
      });
    });

    // 2. Process All Items and compute stock aging
    const agingRecords = [];

    // Target warehouses to consider
    const targetWarehouses = (warehouse && warehouse !== "All Stores")
      ? [warehouse]
      : ["Warehouse", "MG Road"];

    // Helper to process a single item/variant
    const processItemStock = (item, isGroupVariant = false, parentGroup = null) => {
      // Category filter check
      if (category && category !== "all" && item.category && item.category.toLowerCase() !== category.toLowerCase()) {
        return;
      }

      // Search filter check
      if (search && search.trim() !== "") {
        const s = search.toLowerCase().trim();
        const name = (item.itemName || item.name || "").toLowerCase();
        const sku = (item.sku || "").toLowerCase();
        const gName = (parentGroup?.name || parentGroup?.groupName || item.groupName || "").toLowerCase();
        if (!name.includes(s) && !sku.includes(s) && !gName.includes(s)) {
          return;
        }
      }

      const itemId = (item._id || item.id || "").toString();
      const itemSku = (item.sku || "").toString().toLowerCase().trim();
      const warehouseStocks = item.warehouseStocks || [];

      // For each target warehouse, find stock or record
      targetWarehouses.forEach(targetWh => {
        const normalizedTarget = normalizeWarehouseName(targetWh) || targetWh;
        const targetVariations = getWarehouseNameVariations(targetWh);

        // Find matching warehouse stock entries and sum quantities
        const matchingStocks = warehouseStocks.filter(ws => {
          if (!ws.warehouse) return false;
          const wsStr = ws.warehouse.toString().trim();
          const wsNorm = normalizeWarehouseName(wsStr);
          return targetVariations.includes(wsStr) || 
                 targetVariations.includes(wsNorm) ||
                 wsNorm === normalizedTarget ||
                 wsStr.toLowerCase().includes(targetWh.toLowerCase()) ||
                 targetWh.toLowerCase().includes(wsStr.toLowerCase());
        });

        const currentQty = matchingStocks.reduce((sum, ws) => {
          return sum + (parseFloat(ws.stockOnHand ?? ws.availableForSale ?? 0) || 0);
        }, 0);

        // Find inward date for this warehouse
        let inwardInfo = null;
        for (const variation of [normalizedTarget, ...targetVariations]) {
          inwardInfo = inwardHistoryMap.get(`${itemId}_${variation}`) ||
                       inwardHistoryMap.get(`${itemSku}_${variation}`);
          if (inwardInfo) break;
        }

        const fallbackDate = item.createdAt || parentGroup?.createdAt || targetDate;
        let inwardDate = inwardInfo?.date || fallbackDate;
        let inwardSource = inwardInfo?.source || "Initial / Opening Stock";

        // Calculate age in days
        const diffMs = evaluationTime - new Date(inwardDate).getTime();
        const ageInDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        // Determine bracket
        let ageBracket = "0_30";
        let bracketLabel = "0 - 30 Days";
        let bracketColor = "emerald";

        if (ageInDays <= 30) {
          ageBracket = "0_30";
          bracketLabel = "0 - 30 Days";
          bracketColor = "emerald";
        } else if (ageInDays <= 60) {
          ageBracket = "31_60";
          bracketLabel = "31 - 60 Days";
          bracketColor = "blue";
        } else if (ageInDays <= 90) {
          ageBracket = "61_90";
          bracketLabel = "61 - 90 Days";
          bracketColor = "amber";
        } else if (ageInDays <= 120) {
          ageBracket = "91_120";
          bracketLabel = "91 - 120 Days";
          bracketColor = "orange";
        } else {
          ageBracket = "120_plus";
          bracketLabel = "120+ Days";
          bracketColor = "red";
        }

        // Bracket filter if specified
        if (bracket && bracket !== "all" && ageBracket !== bracket) {
          return;
        }

        const costPrice = parseFloat(item.costPrice || parentGroup?.costPrice || 0) || 0;
        const sellingPrice = parseFloat(item.sellingPrice || parentGroup?.sellingPrice || 0) || 0;
        const mrp = parseFloat(item.mrp || parentGroup?.mrp || 0) || 0;
        const totalValue = currentQty * costPrice;

        agingRecords.push({
          itemId,
          itemName: item.itemName || item.name || (parentGroup ? `${parentGroup.name || parentGroup.groupName} - ${item.size || item.sku}` : "Unnamed Item"),
          sku: item.sku || "N/A",
          size: item.size || "-",
          category: item.category || parentGroup?.category || "other",
          groupName: parentGroup?.name || parentGroup?.groupName || item.groupName || null,
          isGroupVariant,
          warehouse: targetWh,
          stockOnHand: currentQty,
          costPrice,
          sellingPrice,
          mrp,
          stockValue: totalValue,
          inwardDate: new Date(inwardDate).toISOString().split('T')[0],
          inwardSource,
          ageInDays,
          ageBracket,
          bracketLabel,
          bracketColor
        });
      });
    };

    // Process Standalone Items
    standaloneItems.forEach(item => processItemStock(item, false, null));

    // Process Item Groups & Variants
    itemGroups.forEach(group => {
      const variants = Array.isArray(group.itemsList) && group.itemsList.length > 0 
        ? group.itemsList 
        : (Array.isArray(group.items) ? group.items : []);
      if (variants.length > 0) {
        variants.forEach(variant => processItemStock(variant, true, group));
      } else if (group.warehouseStocks && group.warehouseStocks.length > 0) {
        const gName = group.name || group.groupName;
        if (gName) {
          processItemStock({
            _id: group._id,
            itemName: gName,
            sku: group.sku || "GROUP",
            costPrice: group.costPrice,
            sellingPrice: group.sellingPrice,
            mrp: group.mrp,
            category: group.category,
            warehouseStocks: group.warehouseStocks || [],
            createdAt: group.createdAt
          }, true, group);
        }
      }
    });

    // Sort by age descending (oldest stock first)
    agingRecords.sort((a, b) => b.ageInDays - a.ageInDays);

    // 3. Compute Summary Metrics & Bracket Aggregations
    let grandTotalStock = 0;
    let grandTotalValue = 0;
    let totalAgeDaysWeighted = 0;

    const bracketsSummary = {
      "0_30": { bracket: "0_30", label: "0 - 30 Days", count: 0, stock: 0, value: 0, color: "emerald", badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      "31_60": { bracket: "31_60", label: "31 - 60 Days", count: 0, stock: 0, value: 0, color: "blue", badgeBg: "bg-blue-50 text-blue-700 border-blue-200" },
      "61_90": { bracket: "61_90", label: "61 - 90 Days", count: 0, stock: 0, value: 0, color: "amber", badgeBg: "bg-amber-50 text-amber-700 border-amber-200" },
      "91_120": { bracket: "91_120", label: "91 - 120 Days", count: 0, stock: 0, value: 0, color: "orange", badgeBg: "bg-orange-50 text-orange-700 border-orange-200" },
      "120_plus": { bracket: "120_plus", label: "120+ Days", count: 0, stock: 0, value: 0, color: "red", badgeBg: "bg-red-50 text-red-700 border-red-200" }
    };

    agingRecords.forEach(rec => {
      grandTotalStock += rec.stockOnHand;
      grandTotalValue += rec.stockValue;
      totalAgeDaysWeighted += (rec.ageInDays * rec.stockOnHand);

      if (bracketsSummary[rec.ageBracket]) {
        bracketsSummary[rec.ageBracket].count += 1;
        bracketsSummary[rec.ageBracket].stock += rec.stockOnHand;
        bracketsSummary[rec.ageBracket].value += rec.stockValue;
      }
    });

    const averageAgeDays = grandTotalStock > 0 ? Math.round(totalAgeDaysWeighted / grandTotalStock) : 0;
    const criticalAgedValue = bracketsSummary["91_120"].value + bracketsSummary["120_plus"].value;
    const criticalAgedStock = bracketsSummary["91_120"].stock + bracketsSummary["120_plus"].stock;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalItems: agingRecords.length,
          totalStock: grandTotalStock,
          totalValue: grandTotalValue,
          averageAgeDays,
          criticalAgedValue,
          criticalAgedStock,
          asOfDate: targetDate.toISOString().split('T')[0],
          warehouse: warehouse || "All Stores"
        },
        brackets: bracketsSummary,
        items: agingRecords
      }
    });

  } catch (error) {
    console.error("❌ Get inventory aging report error:", error);
    res.status(500).json({
      success: false,
      message: "Server error generating aging report",
      error: error.message
    });
  }
};
