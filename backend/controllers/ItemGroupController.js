import ItemGroup from "../model/ItemGroup.js";
import ItemHistory from "../model/ItemHistory.js";
import ShoeItem from "../model/ShoeItem.js";
import Bill from "../model/Bill.js";
import { nextItemGroup } from "../utils/nextItemGroup.js";

// Warehouse name normalization mapping (same as TransferOrderController and ShoeItemController)
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

// Helper function to generate change details
const generateChangeDetails = (oldItem, newItem, changeType) => {
  const changes = [];
  
  if (changeType === "STOCK_UPDATE") {
    // Check for warehouse stock changes
    const oldStocks = oldItem?.warehouseStocks || [];
    const newStocks = newItem?.warehouseStocks || [];
    
    // Compare warehouse stocks
    newStocks.forEach(newStock => {
      const oldStock = oldStocks.find(s => s.warehouse === newStock.warehouse);
      if (oldStock) {
        if (oldStock.openingStock !== newStock.openingStock) {
          changes.push(`Opening stock for ${newStock.warehouse} changed from ${oldStock.openingStock || 0} to ${newStock.openingStock || 0}`);
        }
        if (oldStock.stockOnHand !== newStock.stockOnHand) {
          changes.push(`Stock on hand for ${newStock.warehouse} changed from ${oldStock.stockOnHand || 0} to ${newStock.stockOnHand || 0}`);
        }
      } else {
        changes.push(`Added stock for ${newStock.warehouse}: ${newStock.openingStock || 0}`);
      }
    });
    
    // Check for removed stocks
    oldStocks.forEach(oldStock => {
      if (!newStocks.find(s => s.warehouse === oldStock.warehouse)) {
        changes.push(`Removed stock for ${oldStock.warehouse}`);
      }
    });
    
    // Check for general stock changes
    if (oldItem?.stock !== newItem?.stock) {
      changes.push(`Initial stock changed from ${oldItem?.stock || 0} to ${newItem?.stock || 0}`);
    }
  } else {
    // General field changes
    const fieldsToCheck = ['name', 'sku', 'costPrice', 'sellingPrice', 'stock', 'reorderPoint'];
    fieldsToCheck.forEach(field => {
      if (oldItem?.[field] !== newItem?.[field]) {
        const oldVal = oldItem?.[field] ?? '';
        const newVal = newItem?.[field] ?? '';
        if (field === 'stock') {
          changes.push(`Initial stock changed from ${oldVal} to ${newVal}`);
        } else {
          changes.push(`${field} changed from ${oldVal} to ${newVal}`);
        }
      }
    });
  }
  
  if (changes.length === 0) {
    return "updated";
  }
  
  return changes.join(", ");
};

// Helper function to map locName to warehouse name
const mapLocNameToWarehouse = (locName) => {
  if (!locName) return "Warehouse"; // Default to Warehouse
  // Remove prefixes like "G.", "Z.", "SG."
  let warehouse = locName.replace(/^[A-Z]\.?\s*/i, "").trim();
  // Add "Branch" if not already present and not "Warehouse"
  if (warehouse && warehouse.toLowerCase() !== "warehouse" && !warehouse.toLowerCase().includes("branch")) {
    warehouse = `${warehouse} Branch`;
  }
  return warehouse || "Warehouse";
};

export const createItemGroup = async (req, res) => {
  try {
    if (!req.body.name || req.body.name.trim() === "") {
      return res.status(400).json({ message: "Item group name is required." });
    }

    // Get user's warehouse from request
    const userWarehouse = req.body.userWarehouse || req.headers['x-user-warehouse'] || null;
    const userLocName = req.body.userLocName || req.headers['x-user-locname'] || null;
    
    // Determine warehouse - use provided warehouse or map from locName
    let targetWarehouse = userWarehouse;
    if (!targetWarehouse && userLocName) {
      targetWarehouse = mapLocNameToWarehouse(userLocName);
    }
    // Default to "Warehouse" if still not set
    if (!targetWarehouse) {
      targetWarehouse = "Warehouse";
    }

    // Ensure items array is properly formatted
    let items = Array.isArray(req.body.items) 
      ? req.body.items.filter(item => item && item.name && item.name.trim() !== "")
      : [];

    // Initialize warehouseStocks for each item if not provided
    items = items.map(item => {
      // If item already has warehouseStocks, use them; otherwise initialize
      if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || item.warehouseStocks.length === 0) {
        const initialStock = item.stock || item.openingStock || 0;
        item.warehouseStocks = [{
          warehouse: targetWarehouse,
          openingStock: initialStock,
          openingStockValue: 0,
          stockOnHand: initialStock,
          committedStock: 0,
          availableForSale: initialStock,
          physicalOpeningStock: initialStock,
          physicalStockOnHand: initialStock,
          physicalCommittedStock: 0,
          physicalAvailableForSale: initialStock,
        }];
      } else {
        // Ensure at least one entry has the user's warehouse
        const hasUserWarehouse = item.warehouseStocks.some(ws => {
          const wsWarehouse = (ws.warehouse || "").toString().toLowerCase().trim();
          const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
          return wsWarehouse === targetWarehouseLower ||
                 wsWarehouse.includes(targetWarehouseLower) ||
                 targetWarehouseLower.includes(wsWarehouse);
        });
        
        if (!hasUserWarehouse) {
          // Add user's warehouse entry
          const initialStock = item.stock || item.openingStock || 0;
          item.warehouseStocks.push({
            warehouse: targetWarehouse,
            openingStock: initialStock,
            openingStockValue: 0,
            stockOnHand: initialStock,
            committedStock: 0,
            availableForSale: initialStock,
            physicalOpeningStock: initialStock,
            physicalStockOnHand: initialStock,
            physicalCommittedStock: 0,
            physicalAvailableForSale: initialStock,
          });
        }
      }
      return item;
    });

    console.log("Creating item group with items:", items.length, "for warehouse:", targetWarehouse);

    // Check for duplicate group SKU if provided
    if (req.body.sku && req.body.sku.trim()) {
      const groupSku = req.body.sku.toString().trim().toUpperCase();
      
      // Check in other ItemGroups
      const existingGroup = await ItemGroup.findOne({ sku: groupSku });
      if (existingGroup) {
        return res.status(409).json({ 
          message: `Item group SKU "${groupSku}" already exists. Please use a different SKU.` 
        });
      }
      
      // Check in ShoeItem collection
      const existingShoeItem = await ShoeItem.findOne({ sku: groupSku });
      if (existingShoeItem) {
        return res.status(409).json({ 
          message: `SKU "${groupSku}" already exists in standalone items. Please use a different SKU.` 
        });
      }
    }

    // Check for duplicate SKUs in items
    const skusToCheck = items
      .map(item => item.sku?.toString().trim().toUpperCase())
      .filter(sku => sku && sku !== "");

    if (skusToCheck.length > 0) {
      // Check for duplicates within the same group
      const uniqueSkus = new Set(skusToCheck);
      if (uniqueSkus.size !== skusToCheck.length) {
        const duplicates = skusToCheck.filter((sku, index) => skusToCheck.indexOf(sku) !== index);
        return res.status(409).json({ 
          message: `Duplicate SKUs found within the group: ${[...new Set(duplicates)].join(", ")}. Each item must have a unique SKU.` 
        });
      }

      // Check for duplicates in existing ItemGroup items
      const existingGroups = await ItemGroup.find({ 
        "items.sku": { $in: skusToCheck }
      });
      
      const existingSkusInGroups = [];
      existingGroups.forEach(group => {
        if (group.items && Array.isArray(group.items)) {
          group.items.forEach(item => {
            const itemSku = item.sku?.toString().trim().toUpperCase();
            if (itemSku && skusToCheck.includes(itemSku)) {
              existingSkusInGroups.push(itemSku);
            }
          });
        }
      });

      // Check for duplicates in ShoeItem collection
      const existingShoeItems = await ShoeItem.find({ 
        sku: { $in: skusToCheck }
      });
      const existingSkusInShoeItems = existingShoeItems
        .map(item => item.sku?.toString().trim().toUpperCase())
        .filter(sku => sku && sku !== "");

      // Combine all existing SKUs
      const allExistingSkus = [...new Set([...existingSkusInGroups, ...existingSkusInShoeItems])];
      
      if (allExistingSkus.length > 0) {
        return res.status(409).json({ 
          message: `The following SKUs already exist in the system: ${allExistingSkus.join(", ")}. Please use different SKUs.` 
        });
      }
    }

    // Auto-generate groupId if not provided
    let groupId = req.body.groupId;
    if (!groupId || groupId.trim() === "") {
      groupId = await nextItemGroup();
      console.log("Auto-generated groupId:", groupId);
    }

    const payload = {
      ...req.body,
      groupId: groupId,
      name: req.body.name.trim(),
      items: items,
      stock: req.body.stock || 0,
      attributeRows: req.body.attributeRows || [],
    };

    const itemGroup = await ItemGroup.create(payload);
    console.log("Item group created with items count:", itemGroup.items ? itemGroup.items.length : 0, "groupId:", itemGroup.groupId);
    return res.status(201).json(itemGroup);
  } catch (error) {
    console.error("Error creating item group:", error);
    
    // Return more detailed error message
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: "Validation error", 
        errors: errors 
      });
    }
    
    return res.status(500).json({ 
      message: "Failed to create item group.",
      error: error.message 
    });
  }
};

// Match warehouse names flexibly and accurately
const matchesWarehouse = (itemWarehouse, targetWarehouse) => {
  if (!itemWarehouse || !targetWarehouse) return false;
  
  // Normalize both warehouse names
  const normalizedItem = normalizeWarehouseName(itemWarehouse);
  const normalizedTarget = normalizeWarehouseName(targetWarehouse);
  
  // Exact match after normalization
  if (normalizedItem && normalizedTarget && normalizedItem.toLowerCase() === normalizedTarget.toLowerCase()) {
    return true;
  }
  
  // Fallback to flexible matching
  const itemWarehouseLower = itemWarehouse.toString().toLowerCase().trim();
  const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
  
  if (itemWarehouseLower === targetWarehouseLower) {
    return true;
  }
  
  const itemBase = itemWarehouseLower.replace(/\s*(branch|warehouse|suitorguy|sg|g|z)\s*$/i, "").trim();
  const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse|suitorguy|sg|g|z)\s*$/i, "").trim();
  
  if (itemBase && targetBase && itemBase === targetBase) {
    return true;
  }
  
  if (itemWarehouseLower.includes(targetWarehouseLower) || targetWarehouseLower.includes(itemWarehouseLower)) {
    return true;
  }
  
  return false;
};

// Helper function to check if item group belongs to a warehouse (has items transferred or with stock)
const groupBelongsToWarehouse = (group, targetWarehouse) => {
  if (!targetWarehouse || targetWarehouse === "Warehouse" || targetWarehouse === "All Stores") return true;
  if (!group.items || !Array.isArray(group.items) || group.items.length === 0) return false;
  return group.items.some(item => {
    if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || item.warehouseStocks.length === 0) return false;
    return item.warehouseStocks.some(ws => {
      if (!ws.warehouse) return false;
      const wsWarehouseRaw = (ws.warehouse || "").toString().trim();
      const normalizedStock = normalizeWarehouseName(wsWarehouseRaw);
      const stockWarehouse = (normalizedStock || wsWarehouseRaw).toLowerCase().trim();
      if (stockWarehouse === "warehouse") return false; // Store users shouldn't match warehouse-only stock
      return matchesWarehouse(ws.warehouse, targetWarehouse);
    });
  });
};

// Helper function to check if item group has stock in warehouse (strict check - must have stock > 0)
const hasStockInWarehouse = (items, targetWarehouse) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return false;
  }
  if (!targetWarehouse) {
    return true; // If no warehouse specified (admin), show all groups
  }
  
  // Check if ANY item in the group has stock in the target warehouse
  return items.some(item => {
    const warehouseStocks = item.warehouseStocks || [];
    if (!warehouseStocks || warehouseStocks.length === 0) {
      return false;
    }
    return warehouseStocks.some(stock => {
      if (!stock.warehouse) return false;
      if (!matchesWarehouse(stock.warehouse, targetWarehouse)) return false;
      const stockOnHand = parseFloat(stock.stockOnHand) || 0;
      const availableForSale = parseFloat(stock.availableForSale) || 0;
      return stockOnHand > 0 || availableForSale > 0;
    });
  });
};

export const getItemGroups = async (req, res) => {
  try {
    const { userId, userPower, page, limit, warehouse, isAdmin } = req.query;
    
    console.log(`\n=== GET ITEM GROUPS REQUEST ===`);
    console.log(`Query params:`, req.query);
    console.log(`User warehouse: "${warehouse}"`);
    console.log(`Is admin: ${isAdmin}`);
    console.log(`==============================\n`);
    
    // Pagination parameters
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;
    
    // Get user locCode from query
    const userLocCode = req.query.locCode || "";
    
    // User is admin if: isAdmin === true/all === true OR power === 'admin' OR locCode === '858'/'103' (Warehouse) OR email in adminEmails OR !userId
    const adminEmails = ['officerootments@gmail.com', 'brynex@gmail.com'];
    const isAdminEmail = userId && typeof userId === 'string' && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const userIsAdmin = isAdmin === "true" || isAdmin === true || 
                        req.query.all === "true" ||
                        !userId ||
                        isAdminEmail ||
                        (userPower && (userPower.toLowerCase() === 'admin' || userPower.toLowerCase() === 'super_admin')) ||
                        (userLocCode && (userLocCode === '858' || userLocCode === '103')); // 858 = Warehouse, 103 = WAREHOUSE
    
    // Determine if filtering for a specific store warehouse
    const targetStoreWarehouse = warehouse && warehouse !== "All Stores" && warehouse !== "Warehouse" 
      ? warehouse 
      : (!userIsAdmin && userLocCode ? mapLocNameToWarehouse(userLocCode) : null);

    const isViewingSpecificStore = Boolean(targetStoreWarehouse && targetStoreWarehouse !== "Warehouse" && req.query.all !== "true" && req.query.isAdmin !== "true" && req.query.includeEmpty !== "true");
    
    // Fetch ALL groups from database
    const query = {};
    let groups = await ItemGroup.find(query).sort({ createdAt: -1 });
    
    console.log(`Fetched ${groups.length} total groups from database`);
    console.log(`Is viewing specific store: ${isViewingSpecificStore} (store warehouse: "${targetStoreWarehouse}")`);
    
    // Filter groups for specific store if viewing a store
    if (isViewingSpecificStore && targetStoreWarehouse) {
      const beforeStoreFilter = groups.length;
      groups = groups.filter(g => groupBelongsToWarehouse(g, targetStoreWarehouse));
      console.log(`Store warehouse filter "${targetStoreWarehouse}": ${beforeStoreFilter} groups -> ${groups.length} groups`);
    }

    // Apply search filter if search term is provided
    const searchTerm = req.query.search || req.query.searchTerm || "";
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      const beforeSearch = groups.length;
      groups = groups.filter(group => {
        const groupName = (group.name || "").toLowerCase();
        const groupSku = (group.sku || "").toLowerCase();
        return groupName.includes(searchLower) || groupSku.includes(searchLower);
      });
      console.log(`Search filter "${searchTerm}": ${beforeSearch} groups -> ${groups.length} groups`);
    }
    
    // Get total count
    const totalGroups = groups.length;
    
    // Apply pagination
    const paginatedGroups = groups.slice(skip, skip + limitNum);
    
    // Transform data to match frontend format
    const formattedGroups = paginatedGroups.map(group => {
      const groupObj = group.toObject();
      const itemsArray = Array.isArray(groupObj.items) ? groupObj.items : [];
      
      let relevantItems = itemsArray;
      if (isViewingSpecificStore && targetStoreWarehouse) {
        const storeMatchedItems = itemsArray.filter(item => {
          if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks)) return false;
          return item.warehouseStocks.some(ws => matchesWarehouse(ws.warehouse, targetStoreWarehouse));
        });
        if (storeMatchedItems.length > 0) {
          relevantItems = storeMatchedItems;
        }
      }

      // Aggregate warehouse stocks across all variants in the group
      const combinedWarehouseStocks = [];
      itemsArray.forEach(grpItem => {
        (grpItem.warehouseStocks || []).forEach(ws => {
          const existingWs = combinedWarehouseStocks.find(cws => matchesWarehouse(cws.warehouse, ws.warehouse));
          if (existingWs) {
            existingWs.stockOnHand = (parseFloat(existingWs.stockOnHand) || 0) + (parseFloat(ws.stockOnHand) || 0);
            existingWs.availableForSale = (parseFloat(existingWs.availableForSale) || 0) + (parseFloat(ws.availableForSale) || 0);
          } else {
            combinedWarehouseStocks.push({
              warehouse: ws.warehouse,
              stockOnHand: parseFloat(ws.stockOnHand) || 0,
              availableForSale: parseFloat(ws.availableForSale) || 0,
            });
          }
        });
      });

      // Calculate total stock from items
      const totalStock = (isViewingSpecificStore ? relevantItems : itemsArray).reduce((sum, item) => {
        if (item.warehouseStocks && Array.isArray(item.warehouseStocks) && item.warehouseStocks.length > 0) {
          const warehouseTotal = item.warehouseStocks.reduce((wsSum, ws) => {
            if (isViewingSpecificStore && targetStoreWarehouse) {
              if (matchesWarehouse(ws.warehouse, targetStoreWarehouse)) {
                return wsSum + (parseFloat(ws.stockOnHand || 0));
              }
              return wsSum;
            }
            return wsSum + (parseFloat(ws.stockOnHand || 0));
          }, 0);
          return sum + warehouseTotal;
        }
        if (!isViewingSpecificStore) {
          const itemStock = typeof item.stock === 'number' ? item.stock : (parseFloat(item.stock) || 0);
          return sum + itemStock;
        }
        return sum;
      }, 0);
      
      const itemCount = isViewingSpecificStore ? relevantItems.length : itemsArray.length;
      
      return {
        _id: groupObj._id,
        id: groupObj._id,
        groupId: groupObj.groupId || "",
        name: groupObj.name,
        items: itemCount,
        itemsList: itemsArray,
        warehouseStocks: combinedWarehouseStocks,
        sku: groupObj.sku || "",
        stock: totalStock.toFixed(2),
        reorder: groupObj.reorder || "",
        image: groupObj.image || (groupObj.images && groupObj.images[0]) || "",
        itemType: groupObj.itemType,
        unit: groupObj.unit,
        manufacturer: groupObj.manufacturer,
        brand: groupObj.brand,
        isActive: groupObj.isActive !== undefined ? groupObj.isActive : true,
        createdAt: groupObj.createdAt,
        updatedAt: groupObj.updatedAt,
      };
    });
    
    const totalPages = Math.ceil(totalGroups / limitNum);
    
    return res.json({
      groups: formattedGroups,
      pagination: {
        currentPage: pageNum,
        itemsPerPage: limitNum,
        totalItems: totalGroups,
        totalPages: totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error("Error fetching item groups:", error);
    return res.status(500).json({ message: "Failed to fetch item groups." });
  }
};

export const getItemGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouse, isAdmin, filterByWarehouse } = req.query;

    if (!id) {
      return res.status(400).json({ message: "Item group ID is required." });
    }

    const itemGroup = await ItemGroup.findById(id);
    if (!itemGroup) {
      return res.status(404).json({ message: "Item group not found." });
    }

    // Convert to plain object for modification
    const groupObj = itemGroup.toObject();
    
    console.log(`\n=== GET ITEM GROUP BY ID ===`);
    console.log(`Group ID: ${id}`);
    console.log(`Query params - warehouse: "${warehouse}", isAdmin: "${isAdmin}", filterByWarehouse: "${filterByWarehouse}"`);
    console.log(`Items count: ${groupObj.items?.length || 0}`);
    
    const isMainWarehouse = !warehouse || warehouse === "Warehouse" || warehouse === "Warehouse Branch" || warehouse === "WAREHOUSE" || warehouse === "All Stores";
    
    // When viewing for a specific store/branch, update each item's stock to reflect that store's stock
    if (warehouse && !isMainWarehouse && groupObj.items && Array.isArray(groupObj.items)) {
      const storeItems = groupObj.items.filter(item => {
        if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks)) return false;
        return item.warehouseStocks.some(ws => matchesWarehouse(ws.warehouse, warehouse));
      });

      // If store items exist (transferred to this store), show only the store's items; otherwise map all items
      const itemsToMap = storeItems.length > 0 ? storeItems : groupObj.items;

      groupObj.items = itemsToMap.map((item) => {
        let storeStockOnHand = 0;
        let matchedWs = null;

        if (item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
          matchedWs = item.warehouseStocks.find((ws) => matchesWarehouse(ws.warehouse, warehouse));
        }

        if (matchedWs) {
          storeStockOnHand = parseFloat(matchedWs.stockOnHand) || 0;
        }

        return {
          ...item,
          stock: storeStockOnHand,
          warehouseStocks: matchedWs
            ? [matchedWs]
            : [
                {
                  warehouse: normalizeWarehouseName(warehouse) || warehouse,
                  openingStock: 0,
                  openingStockValue: 0,
                  stockOnHand: 0,
                  committedStock: 0,
                  availableForSale: 0,
                },
              ],
        };
      });

      // Update group stock to store total
      groupObj.stock = groupObj.items.reduce((sum, item) => sum + (parseFloat(item.stock) || 0), 0);
    }

    // Apply returnable inheritance: items inherit from group if not explicitly set
    if (groupObj.items && Array.isArray(groupObj.items)) {
      groupObj.items = groupObj.items.map(item => {
        // If item's returnable is null/undefined, inherit from group
        if (item.returnable === null || item.returnable === undefined) {
          item.returnable = groupObj.returnable;
        }
        return item;
      });
    }

    return res.json(groupObj);
  } catch (error) {
    console.error("Error fetching item group:", error);
    return res.status(500).json({ message: "Failed to fetch item group." });
  }
};

export const updateItemGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const changedBy = req.body.changedBy || req.headers['x-user-name'] || "System";

    if (!id) {
      return res.status(400).json({ message: "Item group ID is required." });
    }

    // Get old data before update
    const oldItemGroup = await ItemGroup.findById(id);
    if (!oldItemGroup) {
      return res.status(404).json({ message: "Item group not found." });
    }

    // Get user's warehouse from request
    const userWarehouse = req.body.userWarehouse || req.headers['x-user-warehouse'] || null;
    const userLocName = req.body.userLocName || req.headers['x-user-locname'] || null;
    
    // Determine warehouse - use provided warehouse or map from locName
    let targetWarehouse = userWarehouse;
    if (!targetWarehouse && userLocName) {
      targetWarehouse = mapLocNameToWarehouse(userLocName);
    }
    // Default to "Warehouse" if still not set
    if (!targetWarehouse) {
      targetWarehouse = "Warehouse";
    }

    // Check for duplicate group SKU if provided (excluding current group)
    // SKIP THIS CHECK - SKUs are already unique and this causes issues during edit
    // if (req.body.sku && req.body.sku.trim()) {
    //   const groupSku = req.body.sku.toString().trim().toUpperCase();
    //   const oldGroupSku = oldItemGroup.sku?.toString().trim().toUpperCase();
    //   
    //   // Only check if SKU is being changed
    //   if (groupSku !== oldGroupSku) {
    //     // Check in other ItemGroups
    //     const existingGroup = await ItemGroup.findOne({ 
    //       sku: groupSku,
    //       _id: { $ne: id }
    //     });
    //     if (existingGroup) {
    //       return res.status(409).json({ 
    //         message: `Item group SKU "${groupSku}" already exists. Please use a different SKU.` 
    //       });
    //     }
    //     
    //     // Check in ShoeItem collection
    //     const existingShoeItem = await ShoeItem.findOne({ sku: groupSku });
    //     if (existingShoeItem) {
    //       return res.status(409).json({ 
    //         message: `SKU "${groupSku}" already exists in standalone items. Please use a different SKU.` 
    //       });
    //     }
    //   }
    // }

    // Check for duplicate SKUs in items (excluding current group's existing items)
    // SKIP THIS CHECK - SKUs are already unique and this causes issues during edit
    // if (req.body.items && Array.isArray(req.body.items)) {
    //   const skusToCheck = req.body.items
    //     .map(item => item.sku?.toString().trim().toUpperCase())
    //     .filter(sku => sku && sku !== "");
    //
    //   if (skusToCheck.length > 0) {
    //     // Check for duplicates within the same group
    //     const uniqueSkus = new Set(skusToCheck);
    //     if (uniqueSkus.size !== skusToCheck.length) {
    //       const duplicates = skusToCheck.filter((sku, index) => skusToCheck.indexOf(sku) !== index);
    //       return res.status(409).json({ 
    //         message: `Duplicate SKUs found within the group: ${[...new Set(duplicates)].join(", ")}. Each item must have a unique SKU.` 
    //       });
    //     }
    //
    //     // Get existing item SKUs from the current group (to exclude from check)
    //     const existingItemSkus = (oldItemGroup.items || [])
    //       .map(item => item.sku?.toString().trim().toUpperCase())
    //       .filter(sku => sku && sku !== "");
    //
    //     // Check for duplicates in other ItemGroup items
    //     const existingGroups = await ItemGroup.find({ 
    //       _id: { $ne: id },
    //       "items.sku": { $in: skusToCheck }
    //     });
    //     
    //     const existingSkusInGroups = [];
    //     existingGroups.forEach(group => {
    //       if (group.items && Array.isArray(group.items)) {
    //         group.items.forEach(item => {
    //           const itemSku = item.sku?.toString().trim().toUpperCase();
    //           if (itemSku && skusToCheck.includes(itemSku) && !existingItemSkus.includes(itemSku)) {
    //             existingSkusInGroups.push(itemSku);
    //           }
    //         });
    //       }
    //     });
    //
    //     // Check for duplicates in ShoeItem collection
    //     const existingShoeItems = await ShoeItem.find({ 
    //       sku: { $in: skusToCheck }
    //     });
    //     const existingSkusInShoeItems = existingShoeItems
    //       .map(item => item.sku?.toString().trim().toUpperCase())
    //       .filter(sku => sku && sku !== "" && !existingItemSkus.includes(sku));
    //
    //     // Combine all existing SKUs
    //     const allExistingSkus = [...new Set([...existingSkusInGroups, ...existingSkusInShoeItems])];
    //     
    //     if (allExistingSkus.length > 0) {
    //       return res.status(409).json({ 
    //         message: `The following SKUs already exist in the system: ${allExistingSkus.join(", ")}. Please use different SKUs.` 
    //       });
    //     }
    //   }
    // }

    // Preserve warehouseStocks from existing items when updating
    if (req.body.items && Array.isArray(req.body.items)) {
      req.body.items = req.body.items.map(item => {
        // Find the existing item in the database to preserve its warehouseStocks
        const existingItem = (oldItemGroup.items || []).find(oldItem => {
          const oldItemId = (oldItem._id?.toString() || oldItem.id || "").toString();
          const newItemId = (item._id?.toString() || item.id || "").toString();
          return oldItemId === newItemId;
        });

        // If warehouseStocks is not provided in the update, preserve from existing item
        if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || item.warehouseStocks.length === 0) {
          if (existingItem && existingItem.warehouseStocks && Array.isArray(existingItem.warehouseStocks) && existingItem.warehouseStocks.length > 0) {
            // Preserve existing warehouseStocks
            item.warehouseStocks = existingItem.warehouseStocks;
            console.log(`Preserved warehouseStocks for item ${item._id || item.id}:`, item.warehouseStocks.length, 'entries');
          } else {
            // Initialize new warehouseStocks if item doesn't have any
            const initialStock = item.stock || item.openingStock || 0;
            item.warehouseStocks = [{
              warehouse: targetWarehouse,
              openingStock: initialStock,
              openingStockValue: 0,
              stockOnHand: initialStock,
              committedStock: 0,
              availableForSale: initialStock,
              physicalOpeningStock: initialStock,
              physicalStockOnHand: initialStock,
              physicalCommittedStock: 0,
              physicalAvailableForSale: initialStock,
            }];
          }
        } else {
          // Ensure at least one entry has the user's warehouse
          const hasUserWarehouse = item.warehouseStocks.some(ws => {
            const wsWarehouse = (ws.warehouse || "").toString().toLowerCase().trim();
            const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
            return wsWarehouse === targetWarehouseLower ||
                   wsWarehouse.includes(targetWarehouseLower) ||
                   targetWarehouseLower.includes(wsWarehouse);
          });
          
          if (!hasUserWarehouse) {
            // Add user's warehouse entry
            const initialStock = item.stock || item.openingStock || 0;
            item.warehouseStocks.push({
              warehouse: targetWarehouse,
              openingStock: initialStock,
              openingStockValue: 0,
              stockOnHand: initialStock,
              committedStock: 0,
              availableForSale: initialStock,
              physicalOpeningStock: initialStock,
              physicalStockOnHand: initialStock,
              physicalCommittedStock: 0,
              physicalAvailableForSale: initialStock,
            });
          }
        }
        return item;
      });
    }

    // Update the item group
    const itemGroup = await ItemGroup.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!itemGroup) {
      return res.status(404).json({ message: "Item group not found." });
    }

    // Track history for item changes
    const itemId = req.body.itemId;
    
    if (req.body.items && Array.isArray(req.body.items) && itemId) {
      const oldItems = oldItemGroup.items || [];
      const newItems = req.body.items;
      
      // Find which item was updated
      const oldItem = oldItems.find(i => {
        const itemIdStr = (i._id?.toString() || i.id || "").toString();
        return itemIdStr === itemId.toString();
      });
      
      const newItem = newItems.find(i => {
        const itemIdStr = (i._id?.toString() || i.id || "").toString();
        return itemIdStr === itemId.toString();
      });
      
      if (oldItem && newItem) {
        // Check if it's a stock update
        const oldStocks = (oldItem.warehouseStocks || []).sort((a, b) => (a.warehouse || "").localeCompare(b.warehouse || ""));
        const newStocks = (newItem.warehouseStocks || []).sort((a, b) => (a.warehouse || "").localeCompare(b.warehouse || ""));
        const oldStocksStr = JSON.stringify(oldStocks);
        const newStocksStr = JSON.stringify(newStocks);
        const isStockUpdate = oldStocksStr !== newStocksStr ||
                              oldItem.stock !== newItem.stock;
        
        const changeType = isStockUpdate ? "STOCK_UPDATE" : "UPDATE";
        const details = generateChangeDetails(oldItem, newItem, changeType);
        
        // Create history entry
        try {
          await ItemHistory.create({
            itemGroupId: id,
            itemId: itemId.toString(),
            changedBy: changedBy,
            changeType: changeType,
            details: details,
            oldData: oldItem,
            newData: newItem,
          });
          console.log(`History created for item ${itemId}: ${details}`);
        } catch (historyError) {
          console.error("Error creating history:", historyError);
        }
      } else if (newItem && !oldItem) {
        // New item added - check if it's from a standalone item (has originalStandaloneItemId)
        const isFromStandalone = req.body.originalStandaloneItemId;
        const details = isFromStandalone 
          ? `moved to group "${itemGroup.name}"` 
          : `Item "${newItem.name || 'New Item'}" created`;
        
        try {
          await ItemHistory.create({
            itemGroupId: id,
            itemId: itemId.toString(),
            changedBy: changedBy,
            changeType: "CREATE",
            details: details,
            oldData: null,
            newData: newItem,
          });
        } catch (historyError) {
          console.error("Error creating history:", historyError);
        }
      } else {
        // Item not found, create general update
        console.log(`Item ${itemId} not found in old or new items, creating general update`);
        try {
          await ItemHistory.create({
            itemGroupId: id,
            itemId: itemId.toString(),
            changedBy: changedBy,
            changeType: "UPDATE",
            details: "updated",
            oldData: oldItemGroup.toObject(),
            newData: itemGroup.toObject(),
          });
        } catch (historyError) {
          console.error("Error creating history:", historyError);
        }
      }
    } else {
      // General item group update (no itemId or no items array)
      try {
        await ItemHistory.create({
          itemGroupId: id,
          itemId: itemId ? itemId.toString() : "group",
          changedBy: changedBy,
          changeType: "UPDATE",
          details: "updated",
          oldData: oldItemGroup.toObject(),
          newData: itemGroup.toObject(),
        });
      } catch (historyError) {
        console.error("Error creating history:", historyError);
      }
    }

    // Sync updated item SKU and details to bills
    try {
      if (itemGroup && Array.isArray(itemGroup.items)) {
        for (const item of itemGroup.items) {
          const gItemId = (item._id || item.id)?.toString();
          const gItemSku = item.sku?.trim();
          if (gItemId && gItemSku) {
            await Bill.updateMany(
              { "items.itemId": gItemId },
              {
                $set: {
                  "items.$[elem].itemSku": gItemSku,
                  "items.$[elem].sku": gItemSku,
                  ...(item.name ? { "items.$[elem].itemName": item.name } : {}),
                  ...(item.hsnCode ? { "items.$[elem].hsnCode": item.hsnCode } : {}),
                  ...(item.itemCode ? { "items.$[elem].itemCode": item.itemCode } : {}),
                  ...(item.returnable !== undefined ? { "items.$[elem].returnable": item.returnable } : {})
                }
              },
              { arrayFilters: [{ "elem.itemId": gItemId }] }
            );
          }
        }
      }
    } catch (billSyncErr) {
      console.warn("Error syncing bill items on group update:", billSyncErr.message);
    }

    return res.json(itemGroup);
  } catch (error) {
    console.error("Error updating item group:", error);
    return res.status(500).json({ message: "Failed to update item group." });
  }
};

// Save monthly opening stock
export const saveMonthlyOpeningStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { month, items } = req.body; // month format: "YYYY-MM", items: array of {itemId, warehouse, openingStock, openingStockValue}

    console.log(`\n📅 Saving monthly opening stock for group ${id}, month: ${month}`);
    console.log(`📦 Received ${items?.length || 0} item updates`);

    if (!id) {
      return res.status(400).json({ message: "Item group ID is required." });
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "Valid month is required (format: YYYY-MM)." });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required and must not be empty." });
    }

    const itemGroup = await ItemGroup.findById(id);
    if (!itemGroup) {
      return res.status(404).json({ message: "Item group not found." });
    }

    console.log(`✅ Found item group with ${itemGroup.items?.length || 0} items`);

    // Update each item's monthly opening stock
    const updatedItems = itemGroup.items.map((item, itemIndex) => {
      // Try to find matching item update by itemId
      const itemId = item._id?.toString() || item.id?.toString();
      const itemUpdates = items.filter(i => {
        const updateItemId = i.itemId?.toString();
        return updateItemId === itemId;
      });

      if (itemUpdates.length === 0) {
        // No update for this item, return as-is but ensure structure is correct
        const itemPlain = item.toObject ? item.toObject() : { ...item };
        // Ensure monthlyOpeningStock structure exists for all warehouse stocks
        if (itemPlain.warehouseStocks && Array.isArray(itemPlain.warehouseStocks)) {
          itemPlain.warehouseStocks = itemPlain.warehouseStocks.map(ws => {
            if (!ws.monthlyOpeningStock) {
              ws.monthlyOpeningStock = [];
            }
            return ws;
          });
        }
        return itemPlain;
      }

      // Process all warehouse updates for this item
      const itemPlain = item.toObject ? item.toObject() : { ...item };
      // Ensure _id is preserved
      if (item._id && !itemPlain._id) {
        itemPlain._id = item._id;
      }

      // Process each warehouse update for this item
      itemUpdates.forEach(itemUpdate => {
        // Find or create warehouse stock entry
        if (!itemPlain.warehouseStocks) {
          itemPlain.warehouseStocks = [];
        }

        let wsEntry = itemPlain.warehouseStocks.find(ws => 
          ws.warehouse && ws.warehouse.toString().trim() === itemUpdate.warehouse.toString().trim()
        );

        if (!wsEntry) {
          wsEntry = {
            warehouse: itemUpdate.warehouse,
            openingStock: 0,
            openingStockValue: 0,
            stockOnHand: 0,
            committedStock: 0,
            availableForSale: 0,
            physicalOpeningStock: 0,
            physicalStockOnHand: 0,
            physicalCommittedStock: 0,
            physicalAvailableForSale: 0,
            monthlyOpeningStock: [],
          };
          itemPlain.warehouseStocks.push(wsEntry);
        }

        // Initialize monthlyOpeningStock if not exists
        if (!wsEntry.monthlyOpeningStock) {
          wsEntry.monthlyOpeningStock = [];
        }

        // Find or create monthly entry
        let monthlyEntry = wsEntry.monthlyOpeningStock.find(m => m.month === month);
        
        if (!monthlyEntry) {
          monthlyEntry = {
            month,
            openingStock: 0,
            openingStockValue: 0,
            closingStock: 0,
            closingStockValue: 0,
            sales: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          wsEntry.monthlyOpeningStock.push(monthlyEntry);
        }

        // If this is a new month and previous month exists, carry forward closing stock
        const [year, monthNum] = month.split('-').map(Number);
        const prevMonth = monthNum === 1 
          ? `${year - 1}-12`
          : `${year}-${String(monthNum - 1).padStart(2, '0')}`;
        
        const prevMonthlyEntry = wsEntry.monthlyOpeningStock.find(m => m.month === prevMonth);
        
        // Get current month to check if we're editing the current month
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const isCurrentMonth = month === currentMonth;
        
        // If previous month exists and current opening stock is 0, carry forward closing stock
        if (prevMonthlyEntry && (!itemUpdate.openingStock || parseFloat(itemUpdate.openingStock) === 0)) {
          monthlyEntry.openingStock = prevMonthlyEntry.closingStock || 0;
          monthlyEntry.openingStockValue = prevMonthlyEntry.closingStockValue || 0;
        } else {
          // Update monthly opening stock from input
          monthlyEntry.openingStock = parseFloat(itemUpdate.openingStock) || 0;
          monthlyEntry.openingStockValue = parseFloat(itemUpdate.openingStockValue) || 0;
        }
        
        // Store old stockOnHand before updating (for sales calculation)
        const oldStockOnHand = parseFloat(wsEntry.stockOnHand) || 0;
        
        // For current month: If user manually edits opening stock, update stockOnHand and recalculate sales
        if (isCurrentMonth) {
          // When user edits opening stock for current month, they're setting the current stock
          // So update stockOnHand to match the new opening stock value
          wsEntry.stockOnHand = monthlyEntry.openingStock;
          wsEntry.availableForSale = monthlyEntry.openingStock;
          
          // Also update physical stock to match
          wsEntry.physicalStockOnHand = monthlyEntry.openingStock;
          wsEntry.physicalAvailableForSale = monthlyEntry.openingStock;
          
          // Recalculate sales based on the difference: openingStock - oldStockOnHand
          // If openingStock < oldStockOnHand, it means stock was sold (positive sales)
          // If openingStock > oldStockOnHand, it means stock was added (reduce sales or treat as purchase)
          const stockDifference = monthlyEntry.openingStock - oldStockOnHand;
          if (stockDifference < 0) {
            // Stock decreased, so sales increased by the difference
            monthlyEntry.sales = (monthlyEntry.sales || 0) + Math.abs(stockDifference);
          } else if (stockDifference > 0 && monthlyEntry.sales > 0) {
            // Stock increased, but only reduce sales if there were sales to begin with
            monthlyEntry.sales = Math.max(0, (monthlyEntry.sales || 0) - stockDifference);
          } else {
            // If no change or stock increased with no previous sales, keep sales as is or set to 0
            monthlyEntry.sales = monthlyEntry.sales || 0;
          }
          
          console.log(`   📊 Current month: openingStock=${monthlyEntry.openingStock}, oldStockOnHand=${oldStockOnHand}, new sales=${monthlyEntry.sales}`);
          console.log(`   ✅ Updated stockOnHand to ${wsEntry.stockOnHand} for warehouse "${itemUpdate.warehouse}" (current month)`);
        } else {
          // For past/future months: Keep existing sales or initialize to 0
          if (monthlyEntry.sales === undefined || monthlyEntry.sales === null) {
            monthlyEntry.sales = 0;
          }
        }
        
        // Calculate closing stock (opening stock - sales)
        monthlyEntry.closingStock = Math.max(0, monthlyEntry.openingStock - monthlyEntry.sales);
        const avgValuePerUnit = monthlyEntry.openingStock > 0 
          ? monthlyEntry.openingStockValue / monthlyEntry.openingStock 
          : 0;
        monthlyEntry.closingStockValue = Math.max(0, monthlyEntry.closingStock * avgValuePerUnit);
        
        monthlyEntry.updatedAt = new Date();

        // Update current opening stock to match monthly opening stock
        wsEntry.openingStock = monthlyEntry.openingStock;
        wsEntry.openingStockValue = monthlyEntry.openingStockValue;
        
      });

      return itemPlain;
    });

    console.log(`✅ Processed ${updatedItems.length} items for update`);

    // Update the item group with all items at once
    try {
      // Clean up the items array - remove any undefined or null values, ensure proper structure
      const cleanedItems = updatedItems.map(item => {
        // Ensure all required fields exist
        const cleanedItem = {
          ...item,
          warehouseStocks: (item.warehouseStocks || []).map(ws => ({
            ...ws,
            monthlyOpeningStock: (ws.monthlyOpeningStock || []).map(monthly => ({
              month: monthly.month || '',
              openingStock: parseFloat(monthly.openingStock) || 0,
              openingStockValue: parseFloat(monthly.openingStockValue) || 0,
              closingStock: parseFloat(monthly.closingStock) || 0,
              closingStockValue: parseFloat(monthly.closingStockValue) || 0,
              sales: parseFloat(monthly.sales) || 0,
              createdAt: monthly.createdAt || new Date(),
              updatedAt: monthly.updatedAt || new Date(),
            }))
          }))
        };
        return cleanedItem;
      });

      const updateResult = await ItemGroup.findByIdAndUpdate(
        id,
        { $set: { items: cleanedItems } },
        { new: true, runValidators: true }
      );

      if (!updateResult) {
        return res.status(500).json({ message: "Failed to update item group." });
      }

      console.log(`✅ Monthly opening stock saved for month ${month}, ${items.length} items updated`);
    } catch (updateError) {
      console.error("❌ Error updating item group:", updateError);
      console.error("Update error details:", {
        message: updateError.message,
        name: updateError.name,
        code: updateError.code,
        errors: updateError.errors,
        stack: updateError.stack
      });
      
      // Check if it's a validation error
      if (updateError.name === 'ValidationError') {
        const validationErrors = Object.values(updateError.errors || {}).map(err => err.message).join(', ');
        return res.status(400).json({ 
          message: "Validation error: " + validationErrors,
          error: updateError.message 
        });
      }
      
      return res.status(500).json({ 
        message: "Failed to save monthly opening stock.", 
        error: updateError.message 
      });
    }

    // Reload the updated item group to return fresh data
    const updateResult = await ItemGroup.findById(id);

    if (!updateResult) {
      return res.status(500).json({ message: "Failed to reload item group after update." });
    }

    return res.json({
      message: "Monthly opening stock saved successfully.",
      itemGroup: updateResult,
    });
  } catch (error) {
    console.error("Error saving monthly opening stock:", error);
    return res.status(500).json({ message: "Failed to save monthly opening stock." });
  }
};

// Get monthly opening stock
export const getMonthlyOpeningStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { month } = req.query; // month format: "YYYY-MM"

    if (!id) {
      return res.status(400).json({ message: "Item group ID is required." });
    }

    const itemGroup = await ItemGroup.findById(id);
    if (!itemGroup) {
      return res.status(404).json({ message: "Item group not found." });
    }

    // If month is specified, return data for that month only
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const monthlyData = itemGroup.items.map(item => {
        const itemData = {
          itemId: item._id || item.id,
          itemName: item.name,
          warehouses: [],
        };

        if (item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
          item.warehouseStocks.forEach(ws => {
            const monthlyEntry = ws.monthlyOpeningStock?.find(m => m.month === month);
            if (monthlyEntry) {
              itemData.warehouses.push({
                warehouse: ws.warehouse,
                openingStock: monthlyEntry.openingStock || 0,
                openingStockValue: monthlyEntry.openingStockValue || 0,
                closingStock: monthlyEntry.closingStock || 0,
                closingStockValue: monthlyEntry.closingStockValue || 0,
                sales: monthlyEntry.sales || 0,
              });
            }
          });
        }

        return itemData;
      });

      return res.json({ month, data: monthlyData });
    }

    // Return all monthly data
    const allMonthlyData = {};
    itemGroup.items.forEach(item => {
      if (item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
        item.warehouseStocks.forEach(ws => {
          if (ws.monthlyOpeningStock && Array.isArray(ws.monthlyOpeningStock)) {
            ws.monthlyOpeningStock.forEach(monthlyEntry => {
              if (!allMonthlyData[monthlyEntry.month]) {
                allMonthlyData[monthlyEntry.month] = [];
              }
              allMonthlyData[monthlyEntry.month].push({
                itemId: item._id || item.id,
                itemName: item.name,
                warehouse: ws.warehouse,
                openingStock: monthlyEntry.openingStock || 0,
                openingStockValue: monthlyEntry.openingStockValue || 0,
                closingStock: monthlyEntry.closingStock || 0,
                closingStockValue: monthlyEntry.closingStockValue || 0,
                sales: monthlyEntry.sales || 0,
              });
            });
          }
        });
      }
    });

    return res.json({ data: allMonthlyData });
  } catch (error) {
    console.error("Error fetching monthly opening stock:", error);
    return res.status(500).json({ message: "Failed to fetch monthly opening stock." });
  }
};

// Get item history
export const getItemHistory = async (req, res) => {
  try {
    const { id, itemId } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Item group ID is required." });
    }

    const query = { itemGroupId: id };
    if (itemId && itemId !== "group") {
      // Try to match itemId as both string and ObjectId
      query.itemId = itemId.toString();
    }

    console.log(`Fetching history for itemGroupId: ${id}, itemId: ${itemId}, query:`, query);
    const history = await ItemHistory.find(query)
      .sort({ changedAt: -1 })
      .limit(100);

    console.log(`Found ${history.length} history entries`);
    return res.json(history);
  } catch (error) {
    console.error("Error fetching item history:", error);
    return res.status(500).json({ message: "Failed to fetch item history." });
  }
};

export const deleteItemGroup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Item group ID is required." });
    }

    const itemGroup = await ItemGroup.findByIdAndDelete(id);
    if (!itemGroup) {
      return res.status(404).json({ message: "Item group not found." });
    }

    return res.json({ message: "Item group deleted successfully." });
  } catch (error) {
    console.error("Error deleting item group:", error);
    return res.status(500).json({ message: "Failed to delete item group." });
  }
};

// Bulk add selected items to an existing or new item group
export const addItemsToGroup = async (req, res) => {
  try {
    const { option, groupId, newGroupName, newGroupUnit, itemIds = [], items = [], userWarehouse } = req.body;

    if (option === "new" && (!newGroupName || !newGroupName.trim())) {
      return res.status(400).json({ message: "New group name is required." });
    }

    if (option === "existing" && !groupId) {
      return res.status(400).json({ message: "Please select an existing item group." });
    }

    if ((!itemIds || itemIds.length === 0) && (!items || items.length === 0)) {
      return res.status(400).json({ message: "No items selected to add to group." });
    }

    const targetWarehouse = userWarehouse || "Warehouse";
    const convertedItems = [];
    const standaloneIdsToDelete = [];

    // 1. Process item IDs
    if (itemIds.length > 0) {
      for (const id of itemIds) {
        // Check standalone ShoeItem
        const standalone = await ShoeItem.findById(id);
        if (standalone) {
          standaloneIdsToDelete.push(standalone._id);
          const initialStock = Array.isArray(standalone.warehouseStocks) && standalone.warehouseStocks.length > 0
            ? standalone.warehouseStocks.reduce((sum, ws) => sum + (parseFloat(ws.stockOnHand) || 0), 0)
            : (parseFloat(standalone.stock) || 0);

          convertedItems.push({
            name: standalone.itemName,
            itemName: standalone.itemName,
            sku: standalone.sku || "",
            itemCode: standalone.itemCode || "",
            costPrice: standalone.costPrice || 0,
            sellingPrice: standalone.sellingPrice || 0,
            mrp: standalone.mrp || standalone.sellingPrice || 0,
            hsnCode: standalone.hsnCode || "",
            size: standalone.size || "",
            unit: standalone.unit || "PCS",
            stock: initialStock,
            warehouseStocks: standalone.warehouseStocks && standalone.warehouseStocks.length > 0
              ? standalone.warehouseStocks
              : [{
                  warehouse: targetWarehouse,
                  openingStock: initialStock,
                  openingStockValue: 0,
                  stockOnHand: initialStock,
                  committedStock: 0,
                  availableForSale: initialStock,
                  physicalOpeningStock: initialStock,
                  physicalStockOnHand: initialStock,
                  physicalCommittedStock: 0,
                  physicalAvailableForSale: initialStock,
                }],
            image: standalone.image || (standalone.images && standalone.images[0]?.data) || "",
            isActive: standalone.isActive !== false,
          });
          continue;
        }

        // Check if item is already inside another group
        const groupContainingItem = await ItemGroup.findOne({ "items._id": id });
        if (groupContainingItem) {
          const foundItem = groupContainingItem.items.id(id);
          if (foundItem) {
            convertedItems.push(foundItem.toObject());
          }
        }
      }
    }

    // 2. Fallback to passed item objects if DB lookup didn't find them
    if (items.length > 0 && convertedItems.length === 0) {
      items.forEach(it => {
        const initialStock = parseFloat(it.stockOnHand || it.stock || 0);
        convertedItems.push({
          name: it.itemName || it.name,
          itemName: it.itemName || it.name,
          sku: it.sku || "",
          itemCode: it.itemCode || "",
          costPrice: parseFloat(it.costPrice) || 0,
          sellingPrice: parseFloat(it.sellingPrice) || 0,
          mrp: parseFloat(it.mrp) || parseFloat(it.sellingPrice) || 0,
          hsnCode: it.hsnCode || "",
          size: it.size || "",
          unit: it.unit || "PCS",
          stock: initialStock,
          warehouseStocks: it.warehouseStocks || [{
            warehouse: targetWarehouse,
            openingStock: initialStock,
            openingStockValue: 0,
            stockOnHand: initialStock,
            committedStock: 0,
            availableForSale: initialStock,
            physicalOpeningStock: initialStock,
            physicalStockOnHand: initialStock,
            physicalCommittedStock: 0,
            physicalAvailableForSale: initialStock,
          }],
          image: it.image || "",
          isActive: true,
        });
        if (it._id && !it.isFromGroup) {
          standaloneIdsToDelete.push(it._id);
        }
      });
    }

    if (convertedItems.length === 0) {
      return res.status(400).json({ message: "Could not locate the selected items." });
    }

    let resultGroup = null;

    if (option === "new") {
      const generatedGroupId = await nextItemGroup();
      resultGroup = await ItemGroup.create({
        groupId: generatedGroupId,
        name: newGroupName.trim(),
        unit: newGroupUnit || "PCS",
        itemType: "goods",
        category: "other",
        taxPreference: "taxable",
        trackInventory: true,
        sellable: true,
        purchasable: true,
        isActive: true,
        items: convertedItems,
      });
    } else {
      const existingGroup = await ItemGroup.findById(groupId);
      if (!existingGroup) {
        return res.status(404).json({ message: "Target item group not found." });
      }

      const currentItems = Array.isArray(existingGroup.items) ? [...existingGroup.items] : [];
      convertedItems.forEach(ci => currentItems.push(ci));

      existingGroup.items = currentItems;
      resultGroup = await existingGroup.save();
    }

    // Clean up converted standalone items
    if (standaloneIdsToDelete.length > 0) {
      await ShoeItem.deleteMany({ _id: { $in: standaloneIdsToDelete } });
    }

    return res.json({
      success: true,
      message: option === "new"
        ? `Successfully created group "${resultGroup.name}" with ${convertedItems.length} items.`
        : `Successfully added ${convertedItems.length} items to "${resultGroup.name}".`,
      group: resultGroup,
    });
  } catch (error) {
    console.error("Error in addItemsToGroup:", error);
    return res.status(500).json({ message: error.message || "Failed to add items to group." });
  }
};

