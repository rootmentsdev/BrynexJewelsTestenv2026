import PurchaseOrder from "../model/PurchaseOrder.js";
import { nextPurchaseOrder } from "../utils/nextPurchaseOrder.js";
import { sendTestEmail } from "../utils/emailService.js";
import ShoeItem from "../model/ShoeItem.js";
import ItemGroup from "../model/ItemGroup.js";

const mapLocNameToWarehouse = (locName) => {
  if (!locName) return "Warehouse";

  const locNameLower = locName.toLowerCase().trim();
  if (
    locNameLower === "z-edapally1" ||
    locNameLower === "zedapallyadmin" ||
    locNameLower === "edapallyadmin" ||
    locNameLower === "-edapally1 branch" ||
    locNameLower.includes("edapally")
  ) {
    return "Edapally Branch";
  }

  let warehouse = locName.replace(/^[A-Z]\.?(\s*)/i, "").trim();

  if (warehouse.startsWith("-")) {
    warehouse = warehouse.substring(1).trim();
  }

  if (warehouse.toLowerCase().includes("edapallyadmin")) {
    warehouse = warehouse.replace(/edapallyadmin/gi, "Edapally").trim();
  }

  if (
    warehouse &&
    warehouse.toLowerCase() !== "warehouse" &&
    !warehouse.toLowerCase().includes("branch")
  ) {
    warehouse = `${warehouse} Branch`;
  }

  return warehouse || "Warehouse";
};

const matchesWarehouse = (itemWarehouse, targetWarehouse) => {
  if (!itemWarehouse || !targetWarehouse) return false;

  const itemWarehouseLower = itemWarehouse.toString().toLowerCase().trim();
  const targetWarehouseLower = targetWarehouse.toLowerCase().trim();

  const normalizeEdapally = (name) => {
    if (name.includes("edapally")) {
      return "edapally branch";
    }
    return name;
  };

  const normalizedItem = normalizeEdapally(itemWarehouseLower);
  const normalizedTarget = normalizeEdapally(targetWarehouseLower);

  if (normalizedItem === normalizedTarget) return true;
  if (itemWarehouseLower === targetWarehouseLower) return true;

  const itemBase = normalizedItem.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
  const targetBase = normalizedTarget.replace(/\s*(branch|warehouse)\s*$/i, "").trim();

  if (itemBase && targetBase && itemBase === targetBase) return true;
  if (normalizedItem.includes(normalizedTarget) || normalizedTarget.includes(normalizedItem)) return true;

  return false;
};

const updateItemStock = async (
  itemIdValue,
  qty,
  operation = "add",
  itemName = null,
  itemGroupId = null,
  targetWarehouse = null
) => {
  const defaultWarehouseName = targetWarehouse || "Warehouse";

  let shoeItem = await ShoeItem.findById(itemIdValue);
  if (shoeItem) {
    const itemPlain = shoeItem.toObject();
    if (!itemPlain.warehouseStocks || !Array.isArray(itemPlain.warehouseStocks)) {
      itemPlain.warehouseStocks = [];
    }

    let wsEntry = itemPlain.warehouseStocks.find((ws) =>
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

    const currentStock = parseFloat(wsEntry.stockOnHand) || 0;
    const currentAfs = parseFloat(wsEntry.availableForSale) || 0;
    const currentPhysical = parseFloat(wsEntry.physicalStockOnHand) || 0;
    const currentPhysicalAfs = parseFloat(wsEntry.physicalAvailableForSale) || 0;

    if (operation === "add") {
      wsEntry.stockOnHand = currentStock + qty;
      wsEntry.availableForSale = currentAfs + qty;
      wsEntry.physicalStockOnHand = currentPhysical + qty;
      wsEntry.physicalAvailableForSale = currentPhysicalAfs + qty;
    } else if (operation === "subtract") {
      wsEntry.stockOnHand = Math.max(0, currentStock - qty);
      wsEntry.availableForSale = Math.max(0, currentAfs - qty);
      wsEntry.physicalStockOnHand = Math.max(0, currentPhysical - qty);
      wsEntry.physicalAvailableForSale = Math.max(0, currentPhysicalAfs - qty);
    } else if (operation === "adjust") {
      wsEntry.stockOnHand = currentStock + qty;
      wsEntry.availableForSale = currentAfs + qty;
      wsEntry.physicalStockOnHand = currentPhysical + qty;
      wsEntry.physicalAvailableForSale = currentPhysicalAfs + qty;
    }

    wsEntry.warehouse = defaultWarehouseName;

    const updatedItem = await ShoeItem.findByIdAndUpdate(
      itemIdValue,
      { $set: { warehouseStocks: itemPlain.warehouseStocks } },
      { new: true }
    );

    if (!updatedItem) {
      return { success: false, message: "Failed to update stock" };
    }

    const updatedStock =
      updatedItem.warehouseStocks.find((ws) => matchesWarehouse(ws.warehouse, defaultWarehouseName)) ||
      updatedItem.warehouseStocks[0];
    return { success: true, type: "standalone", stock: updatedStock };
  }

  const updateWarehouseStock = (warehouseStocks, deltaQty) => {
    if (!warehouseStocks || warehouseStocks.length === 0) {
      return [
        {
          warehouse: defaultWarehouseName,
          openingStock: 0,
          openingStockValue: 0,
          stockOnHand: operation === "subtract" ? 0 : deltaQty,
          committedStock: 0,
          availableForSale: operation === "subtract" ? 0 : deltaQty,
          physicalOpeningStock: 0,
          physicalStockOnHand: operation === "subtract" ? 0 : deltaQty,
          physicalCommittedStock: 0,
          physicalAvailableForSale: operation === "subtract" ? 0 : deltaQty,
        },
      ];
    }

    let warehouseStock = warehouseStocks.find((ws) => matchesWarehouse(ws.warehouse, defaultWarehouseName));
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

    const cur = parseFloat(warehouseStock.stockOnHand) || 0;
    const curAfs = parseFloat(warehouseStock.availableForSale) || 0;
    const curP = parseFloat(warehouseStock.physicalStockOnHand) || 0;
    const curPAfs = parseFloat(warehouseStock.physicalAvailableForSale) || 0;

    if (operation === "add") {
      warehouseStock.stockOnHand = cur + deltaQty;
      warehouseStock.availableForSale = curAfs + deltaQty;
      warehouseStock.physicalStockOnHand = curP + deltaQty;
      warehouseStock.physicalAvailableForSale = curPAfs + deltaQty;
    } else if (operation === "subtract") {
      warehouseStock.stockOnHand = Math.max(0, cur - deltaQty);
      warehouseStock.availableForSale = Math.max(0, curAfs - deltaQty);
      warehouseStock.physicalStockOnHand = Math.max(0, curP - deltaQty);
      warehouseStock.physicalAvailableForSale = Math.max(0, curPAfs - deltaQty);
    } else if (operation === "adjust") {
      warehouseStock.stockOnHand = cur + deltaQty;
      warehouseStock.availableForSale = curAfs + deltaQty;
      warehouseStock.physicalStockOnHand = curP + deltaQty;
      warehouseStock.physicalAvailableForSale = curPAfs + deltaQty;
    }

    warehouseStock.warehouse = defaultWarehouseName;
    return warehouseStocks;
  };

  if (itemGroupId) {
    const group = await ItemGroup.findById(itemGroupId);
    if (group && group.items && Array.isArray(group.items)) {
      const itemIdStr = itemIdValue?.toString();
      for (let i = 0; i < group.items.length; i++) {
        const groupItem = group.items[i];
        const groupItemId = groupItem._id?.toString();

        if (groupItemId && itemIdStr && groupItemId === itemIdStr) {
          groupItem.warehouseStocks = updateWarehouseStock(groupItem.warehouseStocks || [], qty);
          group.items[i] = groupItem;
          group.markModified("items");
          await group.save();
          const updatedStock =
            groupItem.warehouseStocks.find((ws) => matchesWarehouse(ws.warehouse, defaultWarehouseName)) ||
            groupItem.warehouseStocks[0];
          return { success: true, type: "group", stock: updatedStock, groupName: group.name, itemName: groupItem.name };
        }
      }
    }
  }

  return { success: false, message: `Item with ID ${itemIdValue} not found` };
};

const updateItemStockByName = async (
  itemGroupId,
  itemName,
  qty,
  operation = "add",
  itemSku = null,
  targetWarehouse = null
) => {
  const defaultWarehouseName = targetWarehouse || "Warehouse";

  if (!itemGroupId || !itemName) {
    return { success: false, message: "itemGroupId and itemName are required when itemId is null" };
  }

  const group = await ItemGroup.findById(itemGroupId);
  if (!group || group.isActive === false) {
    return { success: false, message: `Item group ${itemGroupId} not found or inactive` };
  }

  if (!group.items || !Array.isArray(group.items)) {
    return { success: false, message: `Item group ${itemGroupId} has no items` };
  }

  const itemIndex = group.items.findIndex((gi) => {
    const nameMatch = gi.name && gi.name.trim() === itemName.trim();
    if (!nameMatch) return false;
    if (itemSku && gi.sku) {
      return gi.sku.trim() === itemSku.trim();
    }
    return true;
  });

  if (itemIndex === -1) {
    return { success: false, message: `Item with name "${itemName}"${itemSku ? ` and SKU "${itemSku}"` : ""} not found in group` };
  }

  const updateWarehouseStock = (warehouseStocks, deltaQty) => {
    if (!warehouseStocks || warehouseStocks.length === 0) {
      return [
        {
          warehouse: defaultWarehouseName,
          openingStock: 0,
          openingStockValue: 0,
          stockOnHand: operation === "subtract" ? 0 : deltaQty,
          committedStock: 0,
          availableForSale: operation === "subtract" ? 0 : deltaQty,
          physicalOpeningStock: 0,
          physicalStockOnHand: operation === "subtract" ? 0 : deltaQty,
          physicalCommittedStock: 0,
          physicalAvailableForSale: operation === "subtract" ? 0 : deltaQty,
        },
      ];
    }

    let warehouseStock = warehouseStocks.find((ws) => matchesWarehouse(ws.warehouse, defaultWarehouseName));
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

    const cur = parseFloat(warehouseStock.stockOnHand) || 0;
    const curAfs = parseFloat(warehouseStock.availableForSale) || 0;
    const curP = parseFloat(warehouseStock.physicalStockOnHand) || 0;
    const curPAfs = parseFloat(warehouseStock.physicalAvailableForSale) || 0;

    if (operation === "add") {
      warehouseStock.stockOnHand = cur + deltaQty;
      warehouseStock.availableForSale = curAfs + deltaQty;
      warehouseStock.physicalStockOnHand = curP + deltaQty;
      warehouseStock.physicalAvailableForSale = curPAfs + deltaQty;
    } else if (operation === "subtract") {
      warehouseStock.stockOnHand = Math.max(0, cur - deltaQty);
      warehouseStock.availableForSale = Math.max(0, curAfs - deltaQty);
      warehouseStock.physicalStockOnHand = Math.max(0, curP - deltaQty);
      warehouseStock.physicalAvailableForSale = Math.max(0, curPAfs - deltaQty);
    } else if (operation === "adjust") {
      warehouseStock.stockOnHand = cur + deltaQty;
      warehouseStock.availableForSale = curAfs + deltaQty;
      warehouseStock.physicalStockOnHand = curP + deltaQty;
      warehouseStock.physicalAvailableForSale = curPAfs + deltaQty;
    }

    warehouseStock.warehouse = defaultWarehouseName;
    return warehouseStocks;
  };

  const groupPlain = group.toObject();
  const itemPlain = groupPlain.items[itemIndex];
  itemPlain.warehouseStocks = updateWarehouseStock(itemPlain.warehouseStocks || [], qty);

  const updatedGroup = await ItemGroup.findByIdAndUpdate(
    itemGroupId,
    { $set: { [`items.${itemIndex}`]: itemPlain } },
    { new: true }
  );

  if (!updatedGroup) {
    return { success: false, message: "Failed to update stock" };
  }

  const updatedItem = updatedGroup.items[itemIndex];
  const updatedStock =
    updatedItem.warehouseStocks.find((ws) => matchesWarehouse(ws.warehouse, defaultWarehouseName)) ||
    updatedItem.warehouseStocks[0];
  return { success: true, type: "group", stock: updatedStock, groupName: updatedGroup.name, itemName: updatedItem.name };
};

// Get next purchase order number
export const getNextOrderNumber = async (req, res) => {
  try {
    const nextNumber = await nextPurchaseOrder();
    res.status(200).json({ orderNumber: nextNumber });
  } catch (error) {
    console.error("Get next order number error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new purchase order
export const createPurchaseOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    // Auto-generate order number if not provided
    if (!orderData.orderNumber) {
      orderData.orderNumber = await nextPurchaseOrder();
    }
    
    // Validate required fields
    if (!orderData.userId) {
      return res.status(400).json({ message: "UserId is required" });
    }
    
    // Check if order with this orderNumber already exists
    const existingOrder = await PurchaseOrder.findOne({ orderNumber: orderData.orderNumber });
    if (existingOrder) {
      // Return the existing order so frontend can navigate to it
      return res.status(409).json({ 
        message: "Order number already exists",
        existingOrder: existingOrder 
      });
    }
    
    // Save all data to MongoDB
    const purchaseOrder = await PurchaseOrder.create(orderData);
    console.log(`Purchase order ${orderData.orderNumber} saved to MongoDB with ID: ${purchaseOrder._id}`);
    res.status(201).json(purchaseOrder);
  } catch (error) {
    console.error("Create purchase order error:", error);
    if (error.code === 11000) {
      // Double check in case of race condition
      const existingOrder = await PurchaseOrder.findOne({ orderNumber: req.body.orderNumber });
      if (existingOrder) {
        return res.status(409).json({ 
          message: "Order number already exists",
          existingOrder: existingOrder 
        });
      }
      return res.status(409).json({ message: "Order number already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all purchase orders for a user
export const getPurchaseOrders = async (req, res) => {
  try {
    const { userId, userPower, status, orderNumber, warehouse, locCode } = req.query;
    
    const query = {};
    
    // If orderNumber is provided, find by orderNumber (for searching)
    if (orderNumber) {
      query.orderNumber = orderNumber;
      console.log(`Searching by orderNumber: ${orderNumber}`);
    } else {
      // Filter by user email only - admin users see all data
      const adminEmails = ['officerootments@gmail.com'];
      const isAdminEmail = userId && typeof userId === 'string' && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
      const isAdmin = isAdminEmail ||
                      (userPower && (userPower.toLowerCase() === 'admin' || userPower.toLowerCase() === 'super_admin')) ||
                      (locCode && (locCode === '858' || locCode === '103'));
      
      // If admin has switched to a specific store (not Warehouse), filter by that store
      const isAdminViewingSpecificStore = isAdmin && warehouse && warehouse !== "All Stores";
      
      if ((!isAdmin || isAdminViewingSpecificStore) && warehouse) {
        // Check warehouse, branch, or locCode fields for compatibility with old orders
        query.$or = [
          { warehouse: warehouse },
          { branch: warehouse },
          { locCode: warehouse }
        ];
        console.log(`📦 Filtering purchase orders for warehouse: ${warehouse}`);
      } else if (!isAdmin && userId) {
        const userIdStr = userId.toString();
        // Use email as primary identifier - case insensitive match
        if (userIdStr.includes('@')) {
          query.userId = { $regex: `^${userIdStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
        } else {
          query.userId = userIdStr;
        }
      }
      // If admin, no userId filter - show all orders
    }
    
    if (status) query.status = status;
    
    console.log(`Query for purchase orders:`, JSON.stringify(query, null, 2));
    console.log(`Query params - userId: ${userId}, userPower: ${userPower}, status: ${status}`);
    
    const purchaseOrders = await PurchaseOrder.find(query)
      .sort({ createdAt: -1 });
    
    console.log(`Found ${purchaseOrders.length} purchase orders`);
    
    res.status(200).json(purchaseOrders);
  } catch (error) {
    console.error("Get purchase orders error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get purchase order by orderNumber
export const getPurchaseOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const purchaseOrder = await PurchaseOrder.findOne({ orderNumber });
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    res.status(200).json(purchaseOrder);
  } catch (error) {
    console.error("Get purchase order by number error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single purchase order by ID
export const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate("items.itemId"); // Populate itemId in items array
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    
    console.log(`Fetched purchase order ${purchaseOrder.orderNumber} with ${purchaseOrder.items?.length || 0} items`);
    res.status(200).json(purchaseOrder);
  } catch (error) {
    console.error("Get purchase order error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a purchase order
export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderData = req.body;

    const oldPurchaseOrder = await PurchaseOrder.findById(id);
    if (!oldPurchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const oldStatus = oldPurchaseOrder.status;
    const newStatus = orderData.status || oldStatus;
    
    // Check if orderNumber is being changed and if it already exists
    if (orderData.orderNumber) {
      const existingOrder = await PurchaseOrder.findOne({ 
        orderNumber: orderData.orderNumber,
        _id: { $ne: id } // Exclude current order
      });
      
      if (existingOrder) {
        return res.status(409).json({ 
          message: "Order number already exists",
          existingOrder: existingOrder 
        });
      }
    }
    
    // Update the order - all data is saved to MongoDB
    const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(
      id,
      orderData,
      { new: true, runValidators: true }
    );
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    // If status changed to "received", update stock quantities (similar to purchase receive)
    if (oldStatus !== "received" && newStatus === "received") {
      const adminEmails = ["officerootments@gmail.com"];
      const userId = orderData.userId || purchaseOrder.userId || "";
      const isAdminEmail =
        userId &&
        typeof userId === "string" &&
        adminEmails.some((email) => userId.toLowerCase() === email.toLowerCase());

      let targetWarehouse = "Warehouse";

      if (isAdminEmail) {
        targetWarehouse = "Warehouse";
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

        const userLocCode = orderData.locCode || purchaseOrder.locCode || "";
        if (userLocCode) {
          const found = fallbackLocations.find((loc) => loc.locCode === String(userLocCode));
          if (found) {
            targetWarehouse = mapLocNameToWarehouse(found.locName);
          }
        }
      }

      const items = purchaseOrder.items || [];
      for (const item of items) {
        let itemIdValue = item.itemId?._id || item.itemId || null;
        if (itemIdValue && typeof itemIdValue === "object" && itemIdValue.toString) {
          itemIdValue = itemIdValue.toString();
        }

        const itemGroupId = item.itemGroupId || null;
        const itemName = item.itemName || "";
        const itemSku = item.itemSku || item.sku || "";
        const qty = parseFloat(item.quantity) || 0;

        if (!(itemIdValue || (itemGroupId && itemName) || itemName) || qty <= 0) {
          continue;
        }

        try {
          if (itemIdValue) {
            await updateItemStock(itemIdValue, qty, "add", itemName, itemGroupId, targetWarehouse);
          } else if (itemGroupId && itemName) {
            await updateItemStockByName(itemGroupId, itemName, qty, "add", itemSku, targetWarehouse);
          }
        } catch (itemError) {
          console.error(`❌ Error updating stock for PO item ${itemIdValue || itemName}:`, itemError);
        }
      }
    }
    
    console.log(`Purchase order ${purchaseOrder.orderNumber} updated in MongoDB with ID: ${purchaseOrder._id}`);
    res.status(200).json(purchaseOrder);
  } catch (error) {
    console.error("Update purchase order error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Order number already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a purchase order
export const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const purchaseOrder = await PurchaseOrder.findByIdAndDelete(id);
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    
    res.status(200).json({ message: "Purchase order deleted successfully" });
  } catch (error) {
    console.error("Delete purchase order error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send purchase order (change status from draft to sent)
export const sendPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the purchase order
    const purchaseOrder = await PurchaseOrder.findById(id);
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    
    // Check if order is in draft status
    if (purchaseOrder.status !== "draft") {
      return res.status(400).json({ message: "Only draft orders can be sent" });
    }
    
    // Update status to sent
    purchaseOrder.status = "sent";
    await purchaseOrder.save();
    
    console.log(`Purchase order ${purchaseOrder.orderNumber} status updated to 'sent'`);
    
    // TODO: Implement actual sending logic (email, API call, etc.)
    // For now, we'll just log that the order should be sent
    console.log(`Purchase order ${purchaseOrder.orderNumber} should be sent to vendor/location`);
    
    res.status(200).json({ 
      message: "Purchase order sent successfully", 
      order: purchaseOrder 
    });
  } catch (error) {
    console.error("Send purchase order error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

