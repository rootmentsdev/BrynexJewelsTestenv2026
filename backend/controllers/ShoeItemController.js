import ShoeItem from "../model/ShoeItem.js";
import ItemGroup from "../model/ItemGroup.js";
import ItemHistory from "../model/ItemHistory.js";
import Bill from "../model/Bill.js";

// Warehouse name normalization mapping (same as TransferOrderController)
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
  "GEdapally": "Edapally Branch",  // Single 'p' variation
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

const sanitizeWords = (text = "") =>
  text
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/[\s-_,]+/)
    .filter(Boolean);

const buildSkuBase = (name = "") => {
  const words = sanitizeWords(name);
  if (words.length === 0) {
    return "ITEM";
  }

  const alphaWords = words.filter((word) => /[A-Za-z]/.test(word));
  const numericWords = words.filter((word) => /^\d+$/.test(word));

  let letters = alphaWords.map((word) => word[0].toUpperCase()).join("");

  if (!letters && alphaWords.length > 0) {
    letters = alphaWords[0].slice(0, 3).toUpperCase();
  }

  if (!letters) {
    letters = words[0].slice(0, 3).toUpperCase();
  }

  let base = letters || "ITEM";
  const digits = numericWords.join("");
  if (digits) {
    base += `-${digits}`;
  }

  return base;
};

const generateUniqueSku = async (name = "") => {
  const base = buildSkuBase(name);
  let sku = base;
  let counter = 1;

  // Ensure uniqueness
  while (await ShoeItem.exists({ sku })) {
    const suffix = String(counter).padStart(2, "0");
    sku = `${base}-${suffix}`;
    counter += 1;
  }

  return sku;
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
    const fieldsToCheck = ['itemName', 'sku', 'costPrice', 'sellingPrice', 'stock', 'reorderPoint'];
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
  
  return `updated. ${changes.join(", ")}`;
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

export const createShoeItem = async (req, res) => {
  try {
    if (!req.body.itemName || req.body.itemName.trim() === "") {
      return res.status(400).json({ message: "Item name is required." });
    }

    let incomingSku = req.body.sku?.toString().trim().toUpperCase();
    if (incomingSku) {
      const existing = await ShoeItem.exists({ sku: incomingSku });
      if (existing) {
        return res.status(400).json({ message: "SKU already exists. Please use a different SKU." });
      }
    } else {
      incomingSku = await generateUniqueSku(req.body.itemName);
    }

    // Get user information for createdBy and changedBy
    const changedBy = req.body.changedBy || req.body.createdBy || req.headers['x-user-name'] || "System";
    
    // Get user's warehouse from request (passed from frontend)
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
    
    // Initialize warehouseStocks with the user's warehouse
    // If warehouseStocks are provided, use them; otherwise initialize with user's warehouse
    let warehouseStocks = req.body.warehouseStocks || [];
    if (!warehouseStocks || warehouseStocks.length === 0) {
      // Initialize with user's warehouse and initial stock if provided
      const initialStock = req.body.stock || req.body.openingStock || 0;
      warehouseStocks = [{
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
      const hasUserWarehouse = warehouseStocks.some(ws => {
        const wsWarehouse = (ws.warehouse || "").toString().toLowerCase().trim();
        const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
        return wsWarehouse === targetWarehouseLower ||
               wsWarehouse.includes(targetWarehouseLower) ||
               targetWarehouseLower.includes(wsWarehouse);
      });
      
      if (!hasUserWarehouse) {
        // Add user's warehouse entry
        const initialStock = req.body.stock || req.body.openingStock || 0;
        warehouseStocks.push({
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
    
    const payload = {
      ...req.body,
      itemName: req.body.itemName.trim(),
      sku: incomingSku,
      sellingPrice: req.body.sellingPrice ? Number(req.body.sellingPrice) : 0,
      costPrice: req.body.costPrice ? Number(req.body.costPrice) : 0,
      createdBy: req.body.createdBy || changedBy,
      warehouseStocks: warehouseStocks, // Set the warehouse stocks
    };

    const item = await ShoeItem.create(payload);
    
    // Log history for item creation
    try {
      const historyEntry = {
        itemGroupId: null, // Standalone item
        itemId: item._id.toString(),
        changedBy: changedBy,
        changeType: "CREATE",
        details: `created`,
        oldData: null,
        newData: item.toObject(),
        changedAt: item.createdAt || new Date(), // Use item's createdAt or current date
      };
      await ItemHistory.create(historyEntry);
      console.log(`History created for item creation: ${item._id}, changedAt: ${historyEntry.changedAt}`);
    } catch (historyError) {
      console.error("Error creating history:", historyError);
    }
    
    return res.status(201).json(item);
  } catch (error) {
    console.error("Error creating shoe item:", error);
    return res.status(500).json({ message: "Failed to create shoe item." });
  }
};

// Helper function to match warehouse names accurately
const matchesWarehouse = (itemWarehouse, targetWarehouse) => {
  if (!itemWarehouse || !targetWarehouse) return false;
  
  // Normalize both warehouse names
  const normalizedItem = normalizeWarehouseName(itemWarehouse);
  const normalizedTarget = normalizeWarehouseName(targetWarehouse);
  
  // Exact match after normalization
  if (normalizedItem && normalizedTarget && normalizedItem.toLowerCase() === normalizedTarget.toLowerCase()) {
    return true;
  }
  
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
  
  // Special handling for Trivandrum variations
  const trivandrumVariations = ["trivandrum", "grooms trivandrum", "sg-trivandrum", "trivandrum branch"];
  const stockIsTrivandrum = trivandrumVariations.some(v => itemWarehouseLower.includes(v));
  const targetIsTrivandrum = trivandrumVariations.some(v => targetWarehouseLower.includes(v));
  if (stockIsTrivandrum && targetIsTrivandrum) {
    return true;
  }

  // Partial match (e.g., "kannur branch" contains "kannur")
  if (itemWarehouseLower.includes(targetWarehouseLower) || targetWarehouseLower.includes(itemWarehouseLower)) {
    return true;
  }
  
  return false;
};

// Helper function to check if item belongs to warehouse (show items even with 0 stock)
const itemBelongsToWarehouse = (warehouseStocks, targetWarehouse) => {
  if (!warehouseStocks || !Array.isArray(warehouseStocks) || warehouseStocks.length === 0) {
    return false;
  }
  if (!targetWarehouse) {
    return true; // If no warehouse specified (admin), show all items
  }
  
  // Normalize target warehouse name
  const normalizedTarget = normalizeWarehouseName(targetWarehouse);
  const targetWarehouseLower = (normalizedTarget || targetWarehouse).toLowerCase().trim();
  const isTargetWarehouse = targetWarehouseLower === "warehouse";
  
  return warehouseStocks.some(stock => {
    const stockWarehouseRaw = (stock.warehouse || "").toString().trim();
    // Normalize stock warehouse name
    const normalizedStock = normalizeWarehouseName(stockWarehouseRaw);
    const stockWarehouse = (normalizedStock || stockWarehouseRaw).toLowerCase().trim();
    
    // For "Warehouse" - only match exactly "warehouse"
    if (isTargetWarehouse) {
      if (stockWarehouse !== "warehouse") {
        return false;
      }
    } else {
      // For store branches - exclude "warehouse" and match the specific store
      if (stockWarehouse === "warehouse") {
        return false; // Store users should NOT see items with stock only in "Warehouse"
      }
      
      // Check exact match first (most strict) - after normalization
      if (stockWarehouse === targetWarehouseLower) {
        // Exact match - show item regardless of stock level
        return true;
      }
      
      // Check if warehouse name contains the store name (e.g., "kannur branch" contains "kannur")
      // Extract the base name (remove "branch", "warehouse", etc.)
      const stockBase = stockWarehouse.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
      const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
      
      if (stockBase && targetBase && stockBase === targetBase) {
        // Base names match - show item regardless of stock level
        return true;
      }
      
      // Special handling for Trivandrum variations
      const trivandrumVariations = ["trivandrum", "grooms trivandrum", "sg-trivandrum", "trivandrum branch"];
      const stockIsTrivandrum = trivandrumVariations.some(v => stockWarehouse.includes(v));
      const targetIsTrivandrum = trivandrumVariations.some(v => targetWarehouseLower.includes(v));
      if (stockIsTrivandrum && targetIsTrivandrum) {
        // Both are Trivandrum variations - show item regardless of stock level
        return true;
      }
      
      return false;
    }
    
    // For "Warehouse" - show item regardless of stock level
    return true;
  });
};

export const getShoeItems = async (req, res) => {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    // Allow high limits for fetching all items (default 20, max 10000)
    const requestedLimit = parseInt(req.query.limit) || 20;
    const limit = Math.min(requestedLimit, 10000); // Cap at 10000 for safety
    const skip = (page - 1) * limit;
    
    // Get warehouse filter from query (for store users)
    let userWarehouse = req.query.warehouse || null;
    const userPower = req.query.userPower || "";
    const userLocCode = req.query.locCode || "";
    
    // User is admin if: power === 'admin' OR locCode === '858' (Warehouse) OR email in adminEmails
    const userId = req.query.userId || "";
    const adminEmails = ['officerootments@gmail.com', 'brynex@gmail.com'];
    const isAdminEmail = userId && typeof userId === 'string' && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = req.query.isAdmin === "true" || req.query.isAdmin === true || 
                    isAdminEmail ||
                    (userPower && (userPower.toLowerCase() === 'admin' || userPower.toLowerCase() === 'super_admin')) ||
                    (userLocCode && (userLocCode === '858' || userLocCode === '103')); // 858 = Warehouse, 103 = WAREHOUSE
    
    // If admin has switched to a specific store (not Warehouse), filter by that store
    const isAdminViewingSpecificStore = isAdmin && userWarehouse && userWarehouse !== "Warehouse";
    const shouldFilterByWarehouse = !isAdmin || isAdminViewingSpecificStore;
    
    console.log(`\n=== GET SHOE ITEMS REQUEST ===`);
    console.log(`Query params:`, req.query);
    console.log(`User warehouse: "${userWarehouse}"`);
    console.log(`User power: "${userPower}"`);
    console.log(`User locCode: "${userLocCode}"`);
    console.log(`Is admin: ${isAdmin} (power: ${userPower}, locCode: ${userLocCode})`);
    console.log(`Is admin viewing specific store: ${isAdminViewingSpecificStore}`);
    console.log(`Should filter by warehouse: ${shouldFilterByWarehouse}`);
    console.log(`==============================\n`);
    
    // Fast lean queries excluding heavy image data
    const [standaloneItems, itemGroups] = await Promise.all([
      ShoeItem.find().select("-images").sort({ createdAt: -1 }).lean(),
      ItemGroup.find({ isActive: { $ne: false } }).select("-images").sort({ createdAt: -1 }).lean(),
    ]);
    
    // Flatten items from groups and convert to standalone item format
    const groupItems = [];
    const groupSkuSet = new Set();

    itemGroups.forEach(group => {
      if (group.items && Array.isArray(group.items)) {
        const sizeAttrIndex = (group.attributeRows || []).findIndex(
          row => row.attribute && row.attribute.toLowerCase() === "size"
        );

        group.items.forEach((item, index) => {
          let resolvedSize = item.size || "";
          if (!resolvedSize && item.attributeCombination && Array.isArray(item.attributeCombination)) {
            if (sizeAttrIndex !== -1 && item.attributeCombination[sizeAttrIndex]) {
              resolvedSize = item.attributeCombination[sizeAttrIndex];
            } else {
              const numericVal = [...item.attributeCombination].reverse().find(v => /^\d+(\.\d+)?$/.test(String(v).trim()));
              resolvedSize = numericVal || "";
            }
          }

          const itemSku = item.sku || "";
          if (itemSku) {
            groupSkuSet.add(itemSku.toUpperCase().trim());
          }

          let itemStockOnHand = 0;
          if (Array.isArray(item.warehouseStocks) && item.warehouseStocks.length > 0) {
            if (userWarehouse && userWarehouse !== "Warehouse") {
              const ws = item.warehouseStocks.find(w => matchesWarehouse(w.warehouse, userWarehouse));
              itemStockOnHand = ws ? (Number(ws.stockOnHand) || 0) : 0;
            } else {
              itemStockOnHand = item.warehouseStocks.reduce((sum, ws) => sum + (Number(ws.stockOnHand) || 0), 0);
            }
          } else if (typeof item.stock === "number") {
            itemStockOnHand = item.stock;
          }

          const standaloneItem = {
            _id: item._id || `${group._id}_${index}`,
            itemName: item.name || item.itemName || group.name || "Untitled Item",
            name: item.name || item.itemName || group.name || "Untitled Item",
            sku: itemSku,
            size: resolvedSize,
            costPrice: item.costPrice || 0,
            sellingPrice: item.sellingPrice || 0,
            upc: item.upc || "",
            hsnCode: item.hsnCode || "",
            isbn: item.isbn || "",
            reorderPoint: item.reorderPoint || "",
            stock: itemStockOnHand,
            stockOnHand: itemStockOnHand,
            warehouseStocks: item.warehouseStocks || [],
            image: item.image || (item.images && item.images[0]) || group.image || (group.images && group.images[0]) || "",
            itemGroupId: group._id,
            itemGroupName: group.name,
            isFromGroup: true,
            type: group.itemType || "goods",
            unit: group.unit || "",
            manufacturer: group.manufacturer || "",
            brand: group.brand || "",
            category: group.category || item.category || "",
            taxPreference: group.taxPreference || "taxable",
            taxRateIntra: group.intraStateTaxRate || "",
            taxRateInter: group.interStateTaxRate || "",
            inventoryValuation: group.inventoryValuationMethod || "",
            trackInventory: group.trackInventory !== undefined ? group.trackInventory : false,
            sellable: group.sellable !== undefined ? group.sellable : true,
            purchasable: group.purchasable !== undefined ? group.purchasable : true,
            isActive: item.isActive !== undefined ? item.isActive : (group.isActive !== undefined ? group.isActive : true),
            attributeCombination: item.attributeCombination || [],
            createdAt: group.createdAt,
            updatedAt: group.updatedAt || group.createdAt,
          };
          groupItems.push(standaloneItem);
        });
      }
    });
    
    // Deduplicate: exclude standalone items that duplicate any item inside a group (by SKU)
    const validStandaloneItems = standaloneItems
      .filter(item => {
        const sSku = (item.sku || "").toUpperCase().trim();
        return !sSku || !groupSkuSet.has(sSku);
      })
      .map(item => {
        let itemStockOnHand = 0;
        if (Array.isArray(item.warehouseStocks) && item.warehouseStocks.length > 0) {
          if (userWarehouse && userWarehouse !== "Warehouse") {
            const ws = item.warehouseStocks.find(w => matchesWarehouse(w.warehouse, userWarehouse));
            itemStockOnHand = ws ? (Number(ws.stockOnHand) || 0) : 0;
          } else {
            itemStockOnHand = item.warehouseStocks.reduce((sum, ws) => sum + (Number(ws.stockOnHand) || 0), 0);
          }
        } else if (typeof item.stock === "number") {
          itemStockOnHand = item.stock;
        }

        return {
          ...item,
          image: item.image || (item.images && item.images[0]?.data) || (item.images && item.images[0]) || "",
          stock: itemStockOnHand,
          stockOnHand: itemStockOnHand,
          isFromGroup: false
        };
      });

    // Combine standalone items and group items
    let allItems = [...validStandaloneItems, ...groupItems];
    
    // Filter by warehouse for non-admin users OR admins viewing a specific store
    if (shouldFilterByWarehouse && userWarehouse) {
      allItems = allItems.filter(item => {
        const warehouseStocks = item.warehouseStocks || [];
        if (warehouseStocks.length === 0) return false;
        return itemBelongsToWarehouse(warehouseStocks, userWarehouse);
      });
    }
    
    // Apply search filter if search term is provided
    const searchTerm = req.query.search || req.query.searchTerm || "";
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      allItems = allItems.filter(item => {
        const itemName = (item.itemName || item.name || "").toLowerCase();
        const sku = (item.sku || "").toLowerCase();
        return itemName.includes(searchLower) || sku.includes(searchLower);
      });
    }
    
    // Sort by creation date (newest first)
    allItems.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
    
    // Apply pagination to combined results
    const totalItems = allItems.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedItems = allItems.slice(skip, skip + limit);
    
    // Return paginated response
    return res.json({
      items: paginatedItems,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalItems,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching shoe items:", error);
    return res.status(500).json({ message: "Failed to fetch shoe items." });
  }
};

export const getShoeItemById = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required." });
    }

    // First try to find as standalone item
    const standaloneItem = await ShoeItem.findById(itemId);
    if (standaloneItem) {
      return res.json({ ...standaloneItem.toObject(), isFromGroup: false });
    }
    
    // If not found, check if it's an item from a group
    const ItemGroup = (await import("../model/ItemGroup.js")).default;
    const itemGroups = await ItemGroup.find({ isActive: { $ne: false } });
    
    for (const group of itemGroups) {
      if (group.items && Array.isArray(group.items)) {
        const groupItem = group.items.find(item => {
          const itemIdStr = item._id?.toString() || `${group._id}_${group.items.indexOf(item)}`;
          return itemIdStr === itemId || item._id?.toString() === itemId;
        });
        
        if (groupItem) {
          // Convert group item to standalone item format
          const standaloneItem = {
            _id: groupItem._id || itemId,
            itemName: groupItem.name || "",
            sku: groupItem.sku || "",
            costPrice: groupItem.costPrice || 0,
            sellingPrice: groupItem.sellingPrice || 0,
            upc: groupItem.upc || "",
            hsnCode: groupItem.hsnCode || "",
            isbn: groupItem.isbn || "",
            reorderPoint: groupItem.reorderPoint || "",
            stock: groupItem.stock || 0,
            warehouseStocks: groupItem.warehouseStocks || [],
            image: groupItem.image || (groupItem.images && groupItem.images[0]) || group.image || (group.images && group.images[0]) || "",
            // Include group information
            itemGroupId: group._id,
            itemGroupName: group.name,
            isFromGroup: true,
            // Copy group-level properties
            type: group.itemType || "goods",
            unit: group.unit || "",
            manufacturer: group.manufacturer || "",
            brand: group.brand || "",
            taxPreference: group.taxPreference || "taxable",
            taxRateIntra: group.intraStateTaxRate || "",
            taxRateInter: group.interStateTaxRate || "",
            inventoryValuation: group.inventoryValuationMethod || "",
            trackInventory: group.trackInventory !== undefined ? group.trackInventory : false,
            sellable: group.sellable !== undefined ? group.sellable : true,
            purchasable: group.purchasable !== undefined ? group.purchasable : true,
            isActive: groupItem.isActive !== undefined ? groupItem.isActive : (group.isActive !== undefined ? group.isActive : true),
            attributeCombination: groupItem.attributeCombination || [],
            createdAt: group.createdAt,
            updatedAt: group.updatedAt || group.createdAt,
          };
          return res.json(standaloneItem);
        }
      }
    }
    
    // Item not found in standalone items or groups
    return res.status(404).json({ message: "Item not found." });
  } catch (error) {
    console.error("Error fetching shoe item:", error);
    return res.status(500).json({ message: "Failed to fetch shoe item." });
  }
};

export const updateShoeItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const changedBy = req.body.changedBy || req.headers['x-user-name'] || "System";

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required." });
    }

    const oldItem = await ShoeItem.findById(itemId);
    if (!oldItem) {
      return res.status(404).json({ message: "Item not found." });
    }

    // Check SKU uniqueness if SKU is being updated
    // SKIP THIS CHECK - SKUs are already unique and this causes issues during edit
    // if (req.body.sku && req.body.sku.trim()) {
    //   const newSku = req.body.sku.toString().trim().toUpperCase();
    //   const existing = await ShoeItem.findOne({ 
    //     sku: newSku,
    //     _id: { $ne: itemId } // Exclude current item
    //   });
    //   if (existing) {
    //     return res.status(400).json({ message: "SKU already exists. Please use a different SKU." });
    //   }
    // }

    // Check for special operations
    const isMarkingInactive = req.body.isActive === false && oldItem.isActive !== false;
    const isMovingToGroup = req.body.movedToGroupId && req.body.movedToGroupId !== oldItem.movedToGroupId;
    const targetGroupId = req.body.movedToGroupId || req.body.targetGroupId;
    const targetGroupName = req.body.targetGroupName;

    // Update item fields
    const updateData = {
      ...req.body,
      itemName: req.body.itemName ? req.body.itemName.trim() : oldItem.itemName,
      sellingPrice: req.body.sellingPrice !== undefined ? Number(req.body.sellingPrice) : oldItem.sellingPrice,
      costPrice: req.body.costPrice !== undefined ? Number(req.body.costPrice) : oldItem.costPrice,
    };

    // Remove _id and __v from update data if present
    delete updateData._id;
    delete updateData.__v;
    delete updateData.movedToGroupId;
    delete updateData.targetGroupId;
    delete updateData.targetGroupName;

    // Preserve warehouseStocks if not being updated
    if (!updateData.warehouseStocks && oldItem.warehouseStocks) {
      updateData.warehouseStocks = oldItem.warehouseStocks;
    }

    const updatedItem = await ShoeItem.findByIdAndUpdate(
      itemId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Determine change type and details
    let changeType = "UPDATE";
    let details = "";

    if (isMovingToGroup && targetGroupName) {
      // Item moved to a group
      changeType = "UPDATE";
      details = `moved to group "${targetGroupName}"`;
    } else if (isMarkingInactive) {
      // Item marked as inactive
      changeType = "UPDATE";
      details = "marked as inactive";
    } else {
      // Check if it's a stock update
      const oldStocks = (oldItem.warehouseStocks || []).sort((a, b) => (a.warehouse || "").localeCompare(b.warehouse || ""));
      const newStocks = (updatedItem.warehouseStocks || []).sort((a, b) => (a.warehouse || "").localeCompare(b.warehouse || ""));
      const oldStocksStr = JSON.stringify(oldStocks);
      const newStocksStr = JSON.stringify(newStocks);
      const isStockUpdate = oldStocksStr !== newStocksStr;
      
      changeType = isStockUpdate ? "STOCK_UPDATE" : "UPDATE";
      details = generateChangeDetails(oldItem.toObject(), updatedItem.toObject(), changeType);
    }
    
    // Log history for item update
    try {
      const historyEntry = {
        itemGroupId: null, // Standalone item
        itemId: itemId.toString(),
        changedBy: changedBy,
        changeType: changeType,
        details: details,
        oldData: oldItem.toObject(),
        newData: updatedItem.toObject(),
        changedAt: new Date(), // Explicitly set current date
      };
      await ItemHistory.create(historyEntry);
      console.log(`History created for item update: ${itemId}, changedAt: ${historyEntry.changedAt}`);
    } catch (historyError) {
      console.error("Error creating history:", historyError);
    }

    // Sync updated standalone item SKU and details to bills
    try {
      if (updatedItem && updatedItem._id && updatedItem.sku) {
        const sItemId = updatedItem._id.toString();
        await Bill.updateMany(
          { "items.itemId": sItemId },
          {
            $set: {
              "items.$[elem].itemSku": updatedItem.sku,
              "items.$[elem].sku": updatedItem.sku,
              "items.$[elem].itemName": updatedItem.itemName,
              ...(updatedItem.hsnCode ? { "items.$[elem].hsnCode": updatedItem.hsnCode } : {}),
              ...(updatedItem.itemCode ? { "items.$[elem].itemCode": updatedItem.itemCode } : {}),
              ...(updatedItem.returnable !== undefined ? { "items.$[elem].returnable": updatedItem.returnable } : {})
            }
          },
          { arrayFilters: [{ "elem.itemId": sItemId }] }
        );
      }
    } catch (billSyncErr) {
      console.warn("Error syncing bill items on standalone item update:", billSyncErr.message);
    }

    return res.json(updatedItem);
  } catch (error) {
    console.error("Error updating shoe item:", error);
    return res.status(500).json({ message: "Failed to update shoe item." });
  }
};

export const deleteShoeItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const changedBy = req.body.changedBy || req.headers['x-user-name'] || "System";
    const itemGroupId = req.body.itemGroupId; // Optional: if provided, item is from a group

    console.log(`\n=== DELETE ITEM REQUEST ===`);
    console.log(`Item ID: ${itemId}`);
    console.log(`Item Group ID from body: ${itemGroupId}`);
    console.log(`Changed by: ${changedBy}`);

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required." });
    }

    // First, try to find as standalone item
    const standaloneItem = await ShoeItem.findById(itemId);
    
    if (standaloneItem) {
      console.log(`✅ Found as standalone item`);
      // It's a standalone item - delete it
      try {
        await ItemHistory.create({
          itemGroupId: null, // Standalone item
          itemId: itemId.toString(),
          changedBy: changedBy,
          changeType: "DELETE",
          details: `deleted`,
          oldData: standaloneItem.toObject(),
          newData: null,
        });
      } catch (historyError) {
        console.error("Error creating history:", historyError);
      }

      await ShoeItem.findByIdAndDelete(itemId);
      console.log(`✅ Deleted standalone item successfully`);
      return res.json({ message: "Item deleted successfully." });
    }

    console.log(`❌ Not found as standalone item, checking groups...`);

    // If not found as standalone, check if it's from a group
    const ItemGroup = (await import("../model/ItemGroup.js")).default;
    let itemGroups = [];
    
    if (itemGroupId) {
      // If itemGroupId is provided, check that specific group
      const groupIdStr = itemGroupId.toString();
      console.log(`Searching in specific group: ${groupIdStr}`);
      const group = await ItemGroup.findById(groupIdStr);
      if (group) {
        itemGroups = [group];
        console.log(`✅ Found group: ${group.name}`);
      } else {
        console.log(`❌ Group not found with ID: ${groupIdStr}`);
      }
    } else {
      // Otherwise, search all groups
      console.log(`Searching in all groups...`);
      itemGroups = await ItemGroup.find({ isActive: { $ne: false } });
      console.log(`Found ${itemGroups.length} active groups`);
    }

    let foundInGroup = false;
    let deletedItem = null;
    let groupName = null;

    for (const group of itemGroups) {
      if (!group.items || !Array.isArray(group.items)) {
        console.log(`Group "${group.name}" has no items array`);
        continue;
      }

      console.log(`Checking group "${group.name}" with ${group.items.length} items`);

      // Find the item in the group's items array
      let itemIndex = -1;
      let foundItem = null;
      
      for (let i = 0; i < group.items.length; i++) {
        const item = group.items[i];
        const groupItemId = item._id?.toString() || item.id?.toString();
        const groupIdStr = group._id?.toString();
        const compositeId = `${groupIdStr}_${i}`;
        const itemIdStr = itemId.toString();
        
        console.log(`  Item ${i}: groupItemId="${groupItemId}", compositeId="${compositeId}", searching for="${itemIdStr}"`);
        
        // Try multiple matching strategies
        // 1. Direct ID match
        const matchesById = groupItemId && (itemIdStr === groupItemId || groupItemId === itemIdStr);
        
        // 2. Composite ID exact match
        const matchesByComposite = itemIdStr === compositeId || compositeId === itemIdStr;
        
        // 3. Check if itemId is a composite ID pattern (groupId_index)
        let matchesCompositePattern = false;
        if (itemIdStr.includes('_')) {
          const parts = itemIdStr.split('_');
          const lastPart = parts[parts.length - 1];
          const groupPart = parts.slice(0, -1).join('_');
          // Check if the group part matches and index matches
          if ((groupPart === groupIdStr || groupIdStr.includes(groupPart) || groupPart.includes(groupIdStr)) && 
              (lastPart === String(i) || lastPart === `0${i}`)) {
            matchesCompositePattern = true;
          }
        }
        
        // 4. Check if itemId starts with groupId and ends with index
        const matchesCompositeStartEnd = itemIdStr.startsWith(groupIdStr) && itemIdStr.endsWith(`_${i}`);
        
        // 5. Partial match for cases where IDs might be truncated or partial
        const matchesByPartial = groupItemId && (
          itemIdStr.includes(groupItemId) || 
          groupItemId.includes(itemIdStr) ||
          itemIdStr.startsWith(groupItemId) ||
          groupItemId.startsWith(itemIdStr)
        );
        
        // 6. Match by first part of composite ID (in case full ID is truncated)
        const itemIdStartsWithGroupId = itemIdStr.startsWith(groupIdStr.substring(0, 8)) || groupIdStr.startsWith(itemIdStr.substring(0, 8));
        
        if (matchesById || matchesByComposite || matchesCompositePattern || matchesCompositeStartEnd || matchesByPartial || itemIdStartsWithGroupId) {
          console.log(`  ✅ MATCH FOUND! matchesById=${matchesById}, matchesByComposite=${matchesByComposite}, matchesCompositePattern=${matchesCompositePattern}, matchesCompositeStartEnd=${matchesCompositeStartEnd}, matchesByPartial=${matchesByPartial}, itemIdStartsWithGroupId=${itemIdStartsWithGroupId}`);
          itemIndex = i;
          foundItem = item;
          break;
        }
      }

      if (itemIndex !== -1 && foundItem) {
        // Found the item in this group
        deletedItem = foundItem;
        groupName = group.name;
        
        console.log(`✅ Found item in group "${groupName}" at index ${itemIndex}`);
        
        // Log history before deletion
        try {
          await ItemHistory.create({
            itemGroupId: group._id.toString(),
            itemId: itemId.toString(),
            changedBy: changedBy,
            changeType: "DELETE",
            details: `deleted from group`,
            oldData: deletedItem,
            newData: null,
          });
        } catch (historyError) {
          console.error("Error creating history:", historyError);
        }

        // Remove the item from the group's items array
        group.items.splice(itemIndex, 1);
        group.markModified('items');
        await group.save();
        
        foundInGroup = true;
        console.log(`✅ Successfully deleted item from group "${groupName}"`);
        break;
      } else {
        console.log(`  ❌ Item not found in group "${group.name}"`);
      }
    }

    if (foundInGroup) {
      console.log(`=== DELETE SUCCESS ===\n`);
      return res.json({ 
        message: "Item deleted successfully from group.", 
        groupName: groupName,
        isFromGroup: true 
      });
    }

    // Item not found anywhere
    console.log(`❌ Item not found in any group`);
    console.log(`=== DELETE FAILED ===\n`);
    return res.status(404).json({ message: "Item not found." });
  } catch (error) {
    console.error("Error deleting shoe item:", error);
    return res.status(500).json({ message: "Failed to delete shoe item." });
  }
};

export const getShoeItemHistory = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required." });
    }

    // Fetch history for standalone item (where itemGroupId is null or the itemId matches)
    // This includes history when item was standalone, and also when it was moved to/from groups
    const query = { 
      itemId: itemId.toString() 
    };

    console.log(`Fetching history for itemId: ${itemId}, query:`, query);
    const history = await ItemHistory.find(query)
      .sort({ changedAt: -1 })
      .limit(100);

    console.log(`Found ${history.length} history entries`);
    return res.json(history);
  } catch (error) {
    console.error("Error fetching shoe item history:", error);
    return res.status(500).json({ message: "Failed to fetch item history." });
  }
};

