// Store Order Controller - Manages store orders from stores to warehouse
import StoreOrder from "../model/StoreOrder.js"; // MongoDB model
import ShoeItem from "../model/ShoeItem.js";
import ItemGroup from "../model/ItemGroup.js";
import { nextStoreOrder } from "../utils/nextStoreOrder.js";

// Get next store order number
export const getNextOrderNumber = async (req, res) => {
  try {
    const nextNumber = await nextStoreOrder();
    res.status(200).json({ orderNumber: nextNumber });
  } catch (error) {
    console.error("Get next store order number error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function for flexible warehouse matching (same as TransferOrderController)
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
  "HEAD OFFICE01": "Head Office",
  "Head Office": "Head Office",
  "Z-Edapally1": "Warehouse",
  "Z- Edappal": "Warehouse",
  "Production": "Warehouse",
  "Office": "Warehouse",
  "G.Vadakara": "Warehouse",
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

const matchesWarehouse = (itemWarehouse, targetWarehouse) => {
  if (!itemWarehouse || !targetWarehouse) return false;
  const normalizedItem = normalizeWarehouseName(itemWarehouse);
  const normalizedTarget = normalizeWarehouseName(targetWarehouse);
  if (normalizedItem && normalizedTarget && normalizedItem.toLowerCase() === normalizedTarget.toLowerCase()) {
    return true;
  }
  const itemWarehouseLower = itemWarehouse.toString().toLowerCase().trim();
  const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
  const itemBase = itemWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
  const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
  if (itemWarehouseLower === targetWarehouseLower) return true;
  if (itemBase && targetBase && itemBase === targetBase) return true;
  if (itemWarehouseLower.includes(targetWarehouseLower) || targetWarehouseLower.includes(itemWarehouseLower)) {
    return true;
  }
  return false;
};

// Get current stock for an item in a warehouse
const getCurrentStock = async (itemIdValue, warehouseName, itemName = null, itemGroupId = null, itemSku = null) => {
  const targetWarehouse = warehouseName?.trim() || "Warehouse";
  const normalizedTarget = normalizeWarehouseName(targetWarehouse);
  
  // Try standalone item first
  if (itemIdValue && itemIdValue !== null && itemIdValue !== "null") {
    const shoeItem = await ShoeItem.findById(itemIdValue);
    if (shoeItem) {
      const warehouseStocks = shoeItem.warehouseStocks || [];
      for (const ws of warehouseStocks) {
        if (matchesWarehouse(ws.warehouse, normalizedTarget)) {
          return {
            currentQuantity: parseFloat(ws.stockOnHand) || 0,
            availableForSale: parseFloat(ws.availableForSale) || 0,
            type: 'standalone'
          };
        }
      }
      return { currentQuantity: 0, availableForSale: 0, type: 'standalone' };
    }
  }
  
  // Try item groups
  if (itemGroupId || itemSku || itemName) {
    let group = null;
    if (itemGroupId) {
      group = await ItemGroup.findById(itemGroupId);
    }
    if (!group && itemSku) {
      group = await ItemGroup.findOne({ "items.sku": new RegExp(`^${itemSku.trim()}$`, "i") }) || await ItemGroup.findOne({ sku: new RegExp(`^${itemSku.trim()}$`, "i") });
    }
    if (!group && itemName) {
      group = await ItemGroup.findOne({ name: new RegExp(`^${itemName.trim()}$`, "i") }) || await ItemGroup.findOne({ "items.name": new RegExp(`^${itemName.trim()}$`, "i") });
    }
    
    if (group) {
      // Check if a specific variant matches
      const item = group.items.find(i => {
        if (itemSku && i.sku && i.sku.toLowerCase() === itemSku.toLowerCase()) {
          return true;
        }
        return i.name && itemName && i.name.toLowerCase() === itemName.toLowerCase();
      });
      
      if (item) {
        const warehouseStocks = item.warehouseStocks || [];
        for (const ws of warehouseStocks) {
          if (matchesWarehouse(ws.warehouse, normalizedTarget)) {
            return {
              currentQuantity: parseFloat(ws.stockOnHand) || 0,
              availableForSale: parseFloat(ws.availableForSale) || 0,
              type: 'group'
            };
          }
        }
        return { currentQuantity: 0, availableForSale: 0, type: 'group' };
      } else {
        // Return total group stock in target warehouse
        let totalGroupStock = 0;
        let totalAvailableForSale = 0;
        (group.items || []).forEach(grpItem => {
          (grpItem.warehouseStocks || []).forEach(ws => {
            if (matchesWarehouse(ws.warehouse, normalizedTarget)) {
              totalGroupStock += (parseFloat(ws.stockOnHand) || 0);
              totalAvailableForSale += (parseFloat(ws.availableForSale) || 0);
            }
          });
        });
        return {
          currentQuantity: totalGroupStock,
          availableForSale: totalAvailableForSale,
          type: 'group'
        };
      }
    }
  }
  
  return { currentQuantity: 0, availableForSale: 0, type: 'unknown' };
};

// Create a store order
export const createStoreOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    // Parse user info
    let userId = "";
    let createdBy = "";
    try {
      const userStr = req.headers['user'] || req.body.userId;
      if (userStr) {
        if (typeof userStr === 'object' && userStr !== null) {
          userId = userStr.email || userStr._id || userStr.id || orderData.userId || "";
          createdBy = userStr.name || userStr.displayName || userId;
        } else if (typeof userStr === 'string') {
          if (userStr.trim().startsWith('{') || userStr.trim().startsWith('[')) {
            try {
              const user = JSON.parse(userStr);
              userId = user?.email || user?._id || user?.id || orderData.userId || "";
              createdBy = user?.name || user?.displayName || userId;
            } catch (e) {
              userId = userStr || orderData.userId || "";
              createdBy = userId;
            }
          } else {
            userId = userStr || orderData.userId || "";
            createdBy = userId;
          }
        } else {
          userId = orderData.userId || "";
          createdBy = userId;
        }
      } else {
        userId = orderData.userId || "";
        createdBy = userId;
      }
    } catch (parseError) {
      console.warn("Error parsing user info, using fallback:", parseError);
      userId = orderData.userId || "";
      createdBy = userId;
    }
    
    // Validate required fields
    if (!orderData.date || !orderData.storeWarehouse) {
      return res.status(400).json({ 
        message: "Missing required fields: date and storeWarehouse are required" 
      });
    }
    
    if (!userId || userId === "") {
      return res.status(400).json({ 
        message: "User ID is required. Please ensure you are logged in." 
      });
    }
    
    // Validate items array
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }
    
    // Generate order number if not provided
    let orderNumber = orderData.orderNumber;
    if (!orderNumber) {
      orderNumber = await nextStoreOrder();
    }
    
    // Parse date
    let orderDate;
    try {
      if (orderData.date instanceof Date) {
        orderDate = orderData.date;
      } else if (typeof orderData.date === 'string') {
        orderDate = new Date(orderData.date);
        if (isNaN(orderDate.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
      } else {
        return res.status(400).json({ message: "Date is required and must be a valid date" });
      }
    } catch (dateError) {
      console.error("Error parsing date:", dateError);
      return res.status(400).json({ message: "Invalid date format" });
    }
    
    // Process items and get current stock for each
    let totalQuantityRequested = 0;
    const processedItems = [];
    
    for (const item of orderData.items) {
      if (!item.itemName) continue;
      
      try {
        const quantity = parseFloat(item.quantity) || 0;
        if (quantity <= 0) continue;
        
        // Get current stock in store warehouse
        const stockInfo = await getCurrentStock(
          item.itemId || null,
          orderData.storeWarehouse,
          item.itemName,
          item.itemGroupId || null,
          item.itemSku || null
        );
        
        totalQuantityRequested += quantity;
        
        processedItems.push({
          itemId: item.itemId ? String(item.itemId) : null,
          itemGroupId: item.itemGroupId ? String(item.itemGroupId) : null,
          itemName: item.itemName,
          itemSku: item.itemSku || "",
          quantity: quantity,
          currentStock: stockInfo.currentQuantity || 0,
        });
      } catch (itemError) {
        console.error(`Error processing item ${item.itemName}:`, itemError);
      }
    }
    
    if (processedItems.length === 0) {
      return res.status(400).json({ message: "No valid items to process" });
    }
    
    // Prepare store order data
    const storeOrderData = {
      orderNumber,
      date: orderDate,
      reason: orderData.reason || "",
      storeWarehouse: orderData.storeWarehouse,
      destinationWarehouse: "Warehouse", // Always warehouse
      items: processedItems,
      totalQuantityRequested,
      userId,
      createdBy,
      status: orderData.status || "pending",
      locCode: orderData.locCode || "",
    };
    
    // Save to MongoDB
    try {
      const mongoOrder = await StoreOrder.create(storeOrderData);
      console.log(`✅ MongoDB store order created: ${orderNumber} (ID: ${mongoOrder._id})`);
      
      res.status(201).json(mongoOrder);
    } catch (error) {
      console.error("❌ Error creating store order in MongoDB:", error);
      throw new Error("Failed to save store order");
    }
  } catch (error) {
    console.error("Error creating store order:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all store orders
export const getStoreOrders = async (req, res) => {
  try {
    const { userId, storeWarehouse, status, startDate, endDate, userPower } = req.query;
    
    const query = {};
    
    // Filter by store warehouse for store users
    if (storeWarehouse && userPower !== 'admin' && userPower !== 'warehouse') {
      query.storeWarehouse = storeWarehouse;
    }
    
    // Admin/warehouse users see all orders, but can filter by storeWarehouse if provided
    if (storeWarehouse && (userPower === 'admin' || userPower === 'warehouse')) {
      // Use flexible matching for admin/warehouse users
      const normalizedTarget = normalizeWarehouseName(storeWarehouse);
      // We'll filter after fetching or use regex
      query.storeWarehouse = { $regex: new RegExp(normalizedTarget, 'i') };
    }
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Fetch all matching orders from MongoDB
    let storeOrders = await StoreOrder.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(1000)
      .lean();
    
    // Apply flexible warehouse matching for admin/warehouse users
    if (storeWarehouse && (userPower === 'admin' || userPower === 'warehouse')) {
      const normalizedTarget = normalizeWarehouseName(storeWarehouse);
      storeOrders = storeOrders.filter(order => {
        return matchesWarehouse(order.storeWarehouse, normalizedTarget);
      });
    }
    
    res.status(200).json(storeOrders);
  } catch (error) {
    console.error("Error fetching store orders:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single store order by ID
export const getStoreOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find in MongoDB
    const storeOrder = await StoreOrder.findById(id);
    
    if (!storeOrder) {
      return res.status(404).json({ message: "Store order not found" });
    }
    
    res.status(200).json(storeOrder);
  } catch (error) {
    console.error("Error fetching store order:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update store order (approve/reject/draft/pending/transferred)
export const updateStoreOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Validate ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      console.error('❌ Invalid store order ID:', id);
      return res.status(400).json({ 
        message: "Invalid store order ID. Please refresh the page and try again." 
      });
    }
    
    // Parse user info for approval/rejection
    let userId = "";
    let userName = "";
    try {
      const userStr = req.headers['user'] || req.body.userId;
      if (userStr) {
        if (typeof userStr === 'object' && userStr !== null) {
          userId = userStr.email || userStr._id || userStr.id || "";
          userName = userStr.name || userStr.displayName || userId;
        } else if (typeof userStr === 'string') {
          if (userStr.trim().startsWith('{') || userStr.trim().startsWith('[')) {
            try {
              const user = JSON.parse(userStr);
              userId = user?.email || user?._id || user?.id || "";
              userName = user?.name || user?.displayName || userId;
            } catch (e) {
              userId = userStr || "";
              userName = userId;
            }
          } else {
            userId = userStr || "";
            userName = userId;
          }
        }
      }
    } catch (parseError) {
      console.warn("Error parsing user info:", parseError);
    }
    
    // Get store order from MongoDB
    const storeOrder = await StoreOrder.findById(id);
    
    if (!storeOrder) {
      return res.status(404).json({ message: "Store order not found" });
    }
    
    // Update status
    if (updateData.status) {
      const targetStatus = updateData.status.toLowerCase().trim();
      
      if (targetStatus === 'approved') {
        storeOrder.status = 'approved';
        storeOrder.approvedBy = userId;
        storeOrder.approvedAt = new Date();
      } else if (targetStatus === 'rejected') {
        storeOrder.status = 'rejected';
        storeOrder.rejectedBy = userId;
        storeOrder.rejectedAt = new Date();
        storeOrder.rejectionReason = updateData.rejectionReason || "";
      } else if (targetStatus === 'draft') {
        storeOrder.status = 'draft';
      } else if (targetStatus === 'pending') {
        storeOrder.status = 'pending';
      } else if (targetStatus === 'transferred') {
        storeOrder.status = 'transferred';
      } else {
        storeOrder.status = targetStatus;
      }
    }
    
    // Update other fields if provided
    if (updateData.reason !== undefined) {
      storeOrder.reason = updateData.reason;
    }
    if (updateData.date !== undefined) {
      storeOrder.date = new Date(updateData.date);
    }
    if (updateData.storeWarehouse !== undefined) {
      storeOrder.storeWarehouse = updateData.storeWarehouse;
    }
    if (updateData.items !== undefined && Array.isArray(updateData.items)) {
      storeOrder.items = updateData.items;
      storeOrder.totalQuantityRequested = updateData.items.reduce(
        (sum, it) => sum + (parseFloat(it.quantity) || 0), 0
      );
    }
    
    // Save to MongoDB
    await storeOrder.save();
    console.log(`✅ MongoDB store order updated: ${storeOrder.orderNumber} (ID: ${storeOrder._id})`);
    
    res.status(200).json(storeOrder);
  } catch (error) {
    console.error("Error updating store order:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete store order
export const deleteStoreOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const storeOrder = await StoreOrder.findById(id);
    
    if (!storeOrder) {
      return res.status(404).json({ message: "Store order not found" });
    }
    
    // Only allow deletion of pending or rejected orders
    if (storeOrder.status === 'approved' || storeOrder.status === 'transferred') {
      return res.status(400).json({ 
        message: "Cannot delete approved or transferred orders" 
      });
    }
    
    // Delete from MongoDB
    await StoreOrder.findByIdAndDelete(id);
    console.log(`✅ MongoDB store order deleted: ${storeOrder.orderNumber} (ID: ${id})`);
    
    res.status(200).json({ message: "Store order deleted successfully" });
  } catch (error) {
    console.error("Error deleting store order:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get item stock for store order creation (helper endpoint)
export const getItemStockForStore = async (req, res) => {
  try {
    const { itemId, itemGroupId, itemName, itemSku, warehouse } = req.query;
    
    if (!warehouse) {
      return res.status(400).json({ message: "Warehouse is required" });
    }
    
    const stockInfo = await getCurrentStock(
      itemId || null,
      warehouse,
      itemName || null,
      itemGroupId || null,
      itemSku || null
    );
    
    res.status(200).json(stockInfo);
  } catch (error) {
    console.error("Error getting item stock:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
