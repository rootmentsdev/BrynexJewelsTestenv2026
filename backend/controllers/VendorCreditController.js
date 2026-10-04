import VendorCredit from "../model/VendorCredit.js";
import Vendor from "../model/Vendor.js";
import Bill from "../model/Bill.js";
import { nextCreditNote } from "../utils/nextCreditNote.js";
import Counter from "../model/Counter.js";
import ShoeItem from "../model/ShoeItem.js";
import ItemGroup from "../model/ItemGroup.js";

// Helper function to format vendor credit for frontend compatibility
const formatVendorCredit = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id.toString();
  return obj;
};

// Helper function to add stock (for reversing vendor credits) - adds back to specific warehouse
const addItemStock = async (itemIdValue, quantity, warehouseName, itemName = null, itemGroupId = null, itemSku = null) => {
  const updateWarehouseStock = (warehouseStocks, qty, targetWarehouse) => {
    if (!warehouseStocks || warehouseStocks.length === 0) {
      return [{
        warehouse: targetWarehouse,
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
    
    let warehouseStock = warehouseStocks.find(ws => 
      ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
    );
    
    if (!warehouseStock) {
      warehouseStock = {
        warehouse: targetWarehouse,
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
    
    warehouseStock.warehouse = targetWarehouse;
    warehouseStock.stockOnHand = currentStockOnHand + qty;
    warehouseStock.availableForSale = currentAvailableForSale + qty;
    warehouseStock.physicalStockOnHand = currentPhysicalStockOnHand + qty;
    warehouseStock.physicalAvailableForSale = currentPhysicalAvailableForSale + qty;
    
    return { success: true, warehouseStocks };
  };
  
  // First, try to find as standalone item
  let shoeItem = null;
  if (itemIdValue && itemIdValue !== "null") {
    shoeItem = await ShoeItem.findById(itemIdValue);
  }
  if (shoeItem) {
    const result = updateWarehouseStock(shoeItem.warehouseStocks, quantity, warehouseName);
    if (!result.success) {
      return result;
    }
    shoeItem.warehouseStocks = result.warehouseStocks;
    await shoeItem.save();
    console.log(`✅ Added stock back for standalone item: ${itemName || itemIdValue}, Quantity: ${quantity}, Warehouse: ${warehouseName}`);
    return { success: true, type: 'standalone', warehouse: warehouseName };
  }
  
  // Item not found in standalone items, try to find in item groups
  let itemGroups = [];
  if (itemGroupId) {
    const specificGroup = await ItemGroup.findById(itemGroupId);
    if (specificGroup && specificGroup.isActive !== false) {
      itemGroups = [specificGroup];
    }
  }
  
  if (itemGroups.length === 0) {
    itemGroups = await ItemGroup.find({ isActive: { $ne: false } });
  }
  
  for (const group of itemGroups) {
    for (let i = 0; i < group.items.length; i++) {
      const groupItem = group.items[i];
      const groupItemId = groupItem._id?.toString() || groupItem.id?.toString();
      const compositeId = `${group._id}_${i}`;
      
      const itemIdStr = itemIdValue?.toString() || "";
      const idMatches = 
        itemIdStr === groupItemId ||
        itemIdStr === compositeId ||
        itemIdStr.includes(groupItemId) ||
        groupItemId?.includes(itemIdStr) ||
        (itemIdStr.length >= 8 && groupItemId?.includes(itemIdStr.substring(0, 8))) ||
        (groupItemId && itemIdStr.includes(groupItemId.substring(0, 8)));
      
      const nameMatches = itemName && groupItem.name && 
        groupItem.name.toLowerCase().trim() === itemName.toLowerCase().trim();
      
      const skuMatches = itemSku && groupItem.sku && 
        groupItem.sku.toLowerCase().trim() === itemSku.toLowerCase().trim();
      
      if (idMatches || nameMatches || skuMatches) {
        const result = updateWarehouseStock(groupItem.warehouseStocks || [], quantity, warehouseName);
        if (!result.success) {
          return result;
        }
        groupItem.warehouseStocks = result.warehouseStocks;
        group.items[i] = groupItem;
        group.markModified('items');
        await group.save();
        console.log(`✅ Added stock back for item in group: ${groupItem.name} (Group: ${group.name}), Quantity: ${quantity}, Warehouse: ${warehouseName}`);
        return { success: true, type: 'group', groupName: group.name, itemName: groupItem.name, warehouse: warehouseName };
      }
    }
  }
  
  console.warn(`⚠️ Item with ID ${itemIdValue} not found for stock addition`);
  return { success: false, message: `Item with ID ${itemIdValue} not found` };
};

// Helper function to reduce stock for items in vendor credit by name and SKU
const reduceItemStockByName = async (itemGroupId, itemName, quantity, warehouseName, itemSku = null) => {
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
  
  let itemIndex = -1;
  if (itemSku) {
    itemIndex = group.items.findIndex(gi => {
      const nameMatch = gi.name && gi.name.trim() === itemName.trim();
      const skuMatch = gi.sku && gi.sku.trim() === itemSku.trim();
      return nameMatch && skuMatch;
    });
    
    if (itemIndex === -1) {
      itemIndex = group.items.findIndex(gi => gi.name && gi.name.trim() === itemName.trim());
    }
  } else {
    itemIndex = group.items.findIndex(gi => gi.name && gi.name.trim() === itemName.trim());
  }
  
  if (itemIndex === -1) {
    return { success: false, message: `Item with name "${itemName}" not found in group` };
  }
  
  const groupItem = group.items[itemIndex];
  
  const updateWarehouseStock = (warehouseStocks, qty, targetWarehouse) => {
    if (!warehouseStocks || warehouseStocks.length === 0) {
      return { success: false, message: `No stock found in warehouse "${targetWarehouse}"` };
    }
    
    let warehouseStock = warehouseStocks.find(ws => 
      ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
    );
    
    if (!warehouseStock) {
      return { success: false, message: `Warehouse "${targetWarehouse}" not found for this item` };
    }
    
    const currentStockOnHand = parseFloat(warehouseStock.stockOnHand) || 0;
    const currentAvailableForSale = parseFloat(warehouseStock.availableForSale) || 0;
    const currentPhysicalStockOnHand = parseFloat(warehouseStock.physicalStockOnHand) || 0;
    const currentPhysicalAvailableForSale = parseFloat(warehouseStock.physicalAvailableForSale) || 0;
    
    if (currentStockOnHand < qty) {
      return { 
        success: false, 
        message: `Insufficient stock in warehouse "${targetWarehouse}". Available: ${currentStockOnHand}, Required: ${qty}` 
      };
    }
    
    warehouseStock.stockOnHand = Math.max(0, currentStockOnHand - qty);
    warehouseStock.availableForSale = Math.max(0, currentAvailableForSale - qty);
    warehouseStock.physicalStockOnHand = Math.max(0, currentPhysicalStockOnHand - qty);
    warehouseStock.physicalAvailableForSale = Math.max(0, currentPhysicalAvailableForSale - qty);
    
    return { success: true, warehouseStocks };
  };
  
  const result = updateWarehouseStock(groupItem.warehouseStocks || [], quantity, warehouseName);
  if (!result.success) {
    return result;
  }
  
  groupItem.warehouseStocks = result.warehouseStocks;
  group.items[itemIndex] = groupItem;
  group.markModified('items');
  await group.save();
  
  return { success: true, type: 'group', stock: groupItem.warehouseStocks, groupName: group.name, itemName: groupItem.name, warehouse: warehouseName };
};

// Helper function to reduce stock for items in vendor credit
const reduceItemStock = async (itemIdValue, quantity, warehouseName, itemName = null, itemGroupId = null, itemSku = null) => {
  if (!warehouseName || warehouseName.trim() === "") {
    return { success: false, message: "Warehouse name is required for vendor credit" };
  }
  
  const updateWarehouseStock = (warehouseStocks, qty, targetWarehouse) => {
    if (!warehouseStocks || warehouseStocks.length === 0) {
      return { success: false, message: `No stock found in warehouse "${targetWarehouse}"` };
    }
    
    let warehouseStock = warehouseStocks.find(ws => 
      ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
    );
    
    if (!warehouseStock) {
      return { success: false, message: `Warehouse "${targetWarehouse}" not found for this item` };
    }
    
    const currentStockOnHand = parseFloat(warehouseStock.stockOnHand) || 0;
    const currentAvailableForSale = parseFloat(warehouseStock.availableForSale) || 0;
    const currentPhysicalStockOnHand = parseFloat(warehouseStock.physicalStockOnHand) || 0;
    const currentPhysicalAvailableForSale = parseFloat(warehouseStock.physicalAvailableForSale) || 0;
    
    if (currentStockOnHand < qty) {
      return { 
        success: false, 
        message: `Insufficient stock in warehouse "${targetWarehouse}". Available: ${currentStockOnHand}, Required: ${qty}` 
      };
    }
    
    warehouseStock.stockOnHand = Math.max(0, currentStockOnHand - qty);
    warehouseStock.availableForSale = Math.max(0, currentAvailableForSale - qty);
    warehouseStock.physicalStockOnHand = Math.max(0, currentPhysicalStockOnHand - qty);
    warehouseStock.physicalAvailableForSale = Math.max(0, currentPhysicalAvailableForSale - qty);
    
    return { success: true, warehouseStocks };
  };
  
  if ((!itemIdValue || itemIdValue === null || itemIdValue === "null") && itemGroupId && itemName) {
    return await reduceItemStockByName(itemGroupId, itemName, quantity, warehouseName, itemSku);
  }
  
  let shoeItem = null;
  if (itemIdValue && itemIdValue !== null && itemIdValue !== "null") {
    shoeItem = await ShoeItem.findById(itemIdValue);
  }
  
  if (shoeItem) {
    const result = updateWarehouseStock(shoeItem.warehouseStocks, quantity, warehouseName);
    if (!result.success) {
      return result;
    }
    shoeItem.warehouseStocks = result.warehouseStocks;
    await shoeItem.save();
    console.log(`✅ Reduced stock for standalone item: ${itemName || itemIdValue}, Quantity: ${quantity}, Warehouse: ${warehouseName}`);
    return { success: true, type: 'standalone', warehouse: warehouseName };
  }
  
  if (itemGroupId && itemName) {
    const nameBasedResult = await reduceItemStockByName(itemGroupId, itemName, quantity, warehouseName, itemSku);
    if (nameBasedResult.success) {
      return nameBasedResult;
    }
  }
  
  let itemGroups = [];
  if (itemGroupId) {
    const specificGroup = await ItemGroup.findById(itemGroupId);
    if (specificGroup && specificGroup.isActive !== false) {
      itemGroups = [specificGroup];
    }
  }
  
  if (itemGroups.length === 0) {
    itemGroups = await ItemGroup.find({ isActive: { $ne: false } });
  }
  
  for (const group of itemGroups) {
    if (!group.items || !Array.isArray(group.items)) continue;
    
    for (let i = 0; i < group.items.length; i++) {
      const groupItem = group.items[i];
      const groupItemId = groupItem._id?.toString() || groupItem.id?.toString();
      const compositeId = `${group._id}_${i}`;
      
      const itemIdStr = itemIdValue?.toString() || "";
      const idMatches = 
        itemIdStr === groupItemId ||
        itemIdStr === compositeId ||
        itemIdStr.includes(groupItemId) ||
        groupItemId?.includes(itemIdStr) ||
        (itemIdStr.length >= 8 && groupItemId?.includes(itemIdStr.substring(0, 8))) ||
        (groupItemId && itemIdStr.includes(groupItemId.substring(0, 8)));
      
      const nameMatches = itemName && groupItem.name && 
        groupItem.name.toLowerCase().trim() === itemName.toLowerCase().trim();
      
      const skuMatches = itemSku && groupItem.sku && 
        groupItem.sku.toLowerCase().trim() === itemSku.toLowerCase().trim();
      
      if (idMatches || nameMatches || skuMatches) {
        const result = updateWarehouseStock(groupItem.warehouseStocks || [], quantity, warehouseName);
        if (!result.success) {
          return result;
        }
        groupItem.warehouseStocks = result.warehouseStocks;
        group.items[i] = groupItem;
        group.markModified('items');
        await group.save();
        return { success: true, type: 'group', groupName: group.name, itemName: groupItem.name, warehouse: warehouseName };
      }
    }
  }
  
  return { success: false, message: `Item with ID ${itemIdValue} not found in any item groups` };
};

// Helper function to update vendor balance (reduce payables, increase unused credits)
const updateVendorBalance = async (vendorId, creditAmount, operation = 'add') => {
  try {
    if (!vendorId) return { success: false, message: "Vendor ID is required" };
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return { success: false, message: "Vendor not found" };
    }
    
    const currentPayables = parseFloat(vendor.payables) || 0;
    const currentCredits = parseFloat(vendor.credits) || 0;
    
    if (operation === 'add') {
      vendor.payables = Math.max(0, currentPayables - creditAmount);
      vendor.credits = currentCredits + creditAmount;
    } else if (operation === 'subtract') {
      vendor.payables = currentPayables + creditAmount;
      vendor.credits = Math.max(0, currentCredits - creditAmount);
    }
    
    await vendor.save();
    return { success: true };
  } catch (error) {
    console.error("Error updating vendor balance:", error);
    return { success: false, message: error.message };
  }
};

// Get next credit note number
export const getNextCreditNoteNumber = async (req, res) => {
  try {
    const prefix = req.query.prefix || "CN-";
    const counterId = prefix.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "CN";
    
    const currentDoc = await Counter.findOne({ _id: counterId });
    const currentSeq = currentDoc ? currentDoc.seq : 0;
    const nextSeq = currentSeq + 1;
    
    const nextNumber = await nextCreditNote(prefix);
    
    res.status(200).json({ 
      creditNoteNumber: nextNumber,
      currentNumber: String(currentSeq).padStart(5, "0"),
      nextNumber: String(nextSeq).padStart(5, "0")
    });
  } catch (error) {
    console.error("Get next credit note number error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new vendor credit
export const createVendorCredit = async (req, res) => {
  try {
    const creditData = req.body;
    
    if (!creditData.creditNoteNumber) {
      const prefix = creditData.prefix || "CN-";
      creditData.creditNoteNumber = await nextCreditNote(prefix);
    }
    
    if (!creditData.vendorName || !creditData.userId) {
      return res.status(400).json({ message: "Vendor name and userId are required" });
    }
    
    if (!creditData.vendorId) {
      creditData.vendorId = null;
    }
    
    if (creditData.items && !Array.isArray(creditData.items)) {
      creditData.items = [];
    }
    
    if (creditData.discount && typeof creditData.discount !== 'object') {
      creditData.discount = { value: '0', type: '%' };
    }
    
    const existingCredit = await VendorCredit.findOne({ 
      creditNoteNumber: creditData.creditNoteNumber,
      userId: creditData.userId
    });
    
    if (existingCredit) {
      return res.status(409).json({ message: "Credit note number already exists for this user" });
    }
    
    const finalTotal = parseFloat(creditData.finalTotal) || 0;
    creditData.unusedCredit = finalTotal;
    creditData.appliedCredit = 0;
    creditData.appliedToBills = [];
    
    const vendorCredit = await VendorCredit.create(creditData);
    
    const hasItemsWithQuantity = (items) => {
      if (!items || !Array.isArray(items) || items.length === 0) return false;
      return items.some(item => item.quantity && parseFloat(item.quantity) > 0);
    };
    
    if (creditData.status === "open") {
      const warehouseName = creditData.warehouse?.trim() || "Warehouse";
      
      if (hasItemsWithQuantity(creditData.items)) {
        for (const item of creditData.items) {
          if (item.quantity && parseFloat(item.quantity) > 0) {
            try {
              await reduceItemStock(
                item.itemId,
                parseFloat(item.quantity),
                warehouseName,
                item.itemName,
                item.itemGroupId,
                item.itemSku
              );
            } catch (error) {
              console.error(`Error reducing stock for item ${item.itemName}:`, error.message);
            }
          }
        }
      }
      
      if (creditData.vendorId && finalTotal > 0) {
        await updateVendorBalance(creditData.vendorId, finalTotal, 'add');
      }
    }
    
    res.status(201).json(formatVendorCredit(vendorCredit));
  } catch (error) {
    console.error("Create vendor credit error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Credit note number already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all vendor credits for a user
export const getVendorCredits = async (req, res) => {
  try {
    const { userId, userPower, status, warehouse, locCode } = req.query;
    const query = {};
    
    const adminEmails = ['officerootments@gmail.com'];
    const isAdminEmail = userId && typeof userId === 'string' && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail ||
                    (userPower && (userPower.toLowerCase() === 'admin' || userPower.toLowerCase() === 'super_admin')) ||
                    (locCode && (locCode === '858' || locCode === '103'));
    
    const isAdminViewingSpecificStore = isAdmin && warehouse && warehouse !== "All Stores";
    
    if ((!isAdmin || isAdminViewingSpecificStore) && warehouse) {
      query.$or = [
        { warehouse: warehouse },
        { warehouse: null },
        { warehouse: '' },
      ];
    } else if (!isAdmin && userId) {
      query.userId = userId;
    }
    
    if (status) query.status = status;
    
    const vendorCredits = await VendorCredit.find(query).sort({ createdAt: -1 });
    res.status(200).json(vendorCredits.map(formatVendorCredit));
  } catch (error) {
    console.error("Get vendor credits error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single vendor credit by ID
export const getVendorCreditById = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorCredit = await VendorCredit.findById(id);
    
    if (!vendorCredit) {
      return res.status(404).json({ message: "Vendor credit not found" });
    }
    res.status(200).json(formatVendorCredit(vendorCredit));
  } catch (error) {
    console.error("Get vendor credit error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a vendor credit
export const updateVendorCredit = async (req, res) => {
  try {
    const { id } = req.params;
    const creditData = req.body;
    
    const existingCredit = await VendorCredit.findById(id);
    if (!existingCredit) {
      return res.status(404).json({ message: "Vendor credit not found" });
    }
    
    const oldStatus = existingCredit.status;
    const newStatus = creditData.status || oldStatus;
    const oldFinalTotal = parseFloat(existingCredit.finalTotal) || 0;
    const newFinalTotal = parseFloat(creditData.finalTotal) || oldFinalTotal;
    
    if (creditData.items && !Array.isArray(creditData.items)) {
      creditData.items = [];
    }
    
    if (creditData.discount && typeof creditData.discount !== 'object') {
      creditData.discount = { value: '0', type: '%' };
    }
    
    if (creditData.creditNoteNumber) {
      const existingCreditByNumber = await VendorCredit.findOne({ 
        creditNoteNumber: creditData.creditNoteNumber,
        userId: creditData.userId || existingCredit.userId,
        _id: { $ne: id }
      });
      
      if (existingCreditByNumber) {
        return res.status(409).json({ 
          message: "Credit note number already exists",
          existingCredit: formatVendorCredit(existingCreditByNumber)
        });
      }
    }
    
    // Status transitions
    if (oldStatus === "open" && newStatus === "draft") {
      const warehouseName = existingCredit.warehouse || "";
      if (existingCredit.items && Array.isArray(existingCredit.items)) {
        for (const item of existingCredit.items) {
          if (item.quantity && parseFloat(item.quantity) > 0) {
            try {
              await addItemStock(
                item.itemId,
                parseFloat(item.quantity),
                warehouseName,
                item.itemName,
                item.itemGroupId,
                item.itemSku
              );
            } catch (error) {
              console.error(`Error reversing stock for item ${item.itemName}:`, error);
            }
          }
        }
      }
      
      if (existingCredit.vendorId) {
        await updateVendorBalance(existingCredit.vendorId, oldFinalTotal, 'subtract');
      }
    }
    
    const hasItemsWithQuantity = (items) => {
      if (!items || !Array.isArray(items) || items.length === 0) return false;
      return items.some(item => item.quantity && parseFloat(item.quantity) > 0);
    };
    
    if (oldStatus === "draft" && newStatus === "open") {
      const warehouseName = creditData.warehouse?.trim() || existingCredit.warehouse?.trim() || "Warehouse";
      const itemsToProcess = creditData.items || existingCredit.items || [];
      if (hasItemsWithQuantity(itemsToProcess)) {
        for (const item of itemsToProcess) {
          if (item.quantity && parseFloat(item.quantity) > 0) {
            try {
              await reduceItemStock(
                item.itemId,
                parseFloat(item.quantity),
                warehouseName,
                item.itemName,
                item.itemGroupId,
                item.itemSku
              );
            } catch (error) {
              console.error(`Error reducing stock for item ${item.itemName}:`, error);
            }
          }
        }
      }
      
      const vendorId = creditData.vendorId || existingCredit.vendorId;
      if (vendorId && newFinalTotal > 0) {
        await updateVendorBalance(vendorId, newFinalTotal, 'add');
      }
      
      if (!creditData.unusedCredit && !existingCredit.unusedCredit) {
        creditData.unusedCredit = newFinalTotal;
        creditData.appliedCredit = 0;
      }
    }
    
    if (oldStatus === "open" && newStatus === "open" && oldFinalTotal !== newFinalTotal) {
      const difference = newFinalTotal - oldFinalTotal;
      const vendorId = creditData.vendorId || existingCredit.vendorId;
      if (vendorId) {
        if (difference > 0) {
          await updateVendorBalance(vendorId, difference, 'add');
        } else {
          await updateVendorBalance(vendorId, Math.abs(difference), 'subtract');
        }
      }
      
      const oldUnused = parseFloat(existingCredit.unusedCredit) || 0;
      if (oldUnused > 0) {
        const ratio = newFinalTotal / oldFinalTotal;
        creditData.unusedCredit = oldUnused * ratio;
        creditData.appliedCredit = newFinalTotal - (oldUnused * ratio);
      }
    }
    
    const updatedCredit = await VendorCredit.findByIdAndUpdate(id, { $set: creditData }, { new: true });
    if (!updatedCredit) {
      return res.status(404).json({ message: "Vendor credit not found" });
    }
    
    res.status(200).json(formatVendorCredit(updatedCredit));
  } catch (error) {
    console.error("Update vendor credit error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a vendor credit
export const deleteVendorCredit = async (req, res) => {
  try {
    const { id } = req.params;
    
    const vendorCredit = await VendorCredit.findById(id);
    if (!vendorCredit) {
      return res.status(404).json({ message: "Vendor credit not found" });
    }
    
    if (vendorCredit.status === "open") {
      const finalTotal = parseFloat(vendorCredit.finalTotal) || 0;
      const warehouseName = vendorCredit.warehouse || "";
      
      if (vendorCredit.items && Array.isArray(vendorCredit.items)) {
        for (const item of vendorCredit.items) {
          if (item.quantity && parseFloat(item.quantity) > 0) {
            try {
              await addItemStock(
                item.itemId,
                parseFloat(item.quantity),
                warehouseName,
                item.itemName,
                item.itemGroupId,
                item.itemSku
              );
            } catch (error) {
              console.error(`Error reversing stock for item ${item.itemName}:`, error);
            }
          }
        }
      }
      
      if (vendorCredit.vendorId) {
        await updateVendorBalance(vendorCredit.vendorId, finalTotal, 'subtract');
      }
    }
    
    await VendorCredit.findByIdAndDelete(id);
    res.status(200).json({ message: "Vendor credit deleted successfully" });
  } catch (error) {
    console.error("Delete vendor credit error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get available unused vendor credits for a vendor
export const getAvailableVendorCredits = async (req, res) => {
  try {
    const { vendorId, userId } = req.query;
    
    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }
    
    const query = {
      $or: [{ vendorId: vendorId }, { vendorId: vendorId.toString() }],
      status: "open",
    };
    
    if (userId) {
      query.userId = userId;
    }
    
    const credits = await VendorCredit.find(query).sort({ creditDate: 1 });
    
    const availableCredits = credits
      .map(formatVendorCredit)
      .filter(credit => {
        const unused = parseFloat(credit.unusedCredit) || 0;
        return unused > 0;
      })
      .map(credit => ({
        id: credit.id,
        _id: credit._id,
        creditNoteNumber: credit.creditNoteNumber,
        creditDate: credit.creditDate,
        finalTotal: parseFloat(credit.finalTotal) || 0,
        unusedCredit: parseFloat(credit.unusedCredit) || 0,
        appliedCredit: parseFloat(credit.appliedCredit) || 0,
      }));
    
    res.status(200).json(availableCredits);
  } catch (error) {
    console.error("Get available vendor credits error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Apply vendor credit to a bill
export const applyCreditToBill = async (req, res) => {
  try {
    const { creditId, billId, appliedAmount } = req.body;
    
    if (!creditId || !billId || !appliedAmount) {
      return res.status(400).json({ message: "Credit ID, Bill ID, and applied amount are required" });
    }
    
    const amount = parseFloat(appliedAmount);
    if (amount <= 0) {
      return res.status(400).json({ message: "Applied amount must be greater than 0" });
    }
    
    const vendorCredit = await VendorCredit.findById(creditId);
    if (!vendorCredit) {
      return res.status(404).json({ message: "Vendor credit not found" });
    }
    
    if (vendorCredit.status !== "open") {
      return res.status(400).json({ message: "Only open vendor credits can be applied to bills" });
    }
    
    const unusedCredit = parseFloat(vendorCredit.unusedCredit) || 0;
    if (amount > unusedCredit) {
      return res.status(400).json({ 
        message: `Applied amount (${amount}) exceeds unused credit (${unusedCredit})` 
      });
    }
    
    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    
    const newUnusedCredit = unusedCredit - amount;
    const newAppliedCredit = (parseFloat(vendorCredit.appliedCredit) || 0) + amount;
    
    if (!vendorCredit.appliedToBills) {
      vendorCredit.appliedToBills = [];
    }
    vendorCredit.appliedToBills.push({
      billId: billId,
      billNumber: bill.billNumber,
      appliedAmount: amount,
      appliedDate: new Date(),
    });
    vendorCredit.unusedCredit = newUnusedCredit;
    vendorCredit.appliedCredit = newAppliedCredit;
    await vendorCredit.save();
    
    const billFinalTotal = parseFloat(bill.finalTotal) || 0;
    bill.finalTotal = Math.max(0, billFinalTotal - amount);
    
    if (!bill.appliedCredits) {
      bill.appliedCredits = [];
    }
    bill.appliedCredits.push({
      creditId: creditId,
      creditNoteNumber: vendorCredit.creditNoteNumber,
      appliedAmount: amount,
      appliedDate: new Date(),
    });
    
    await bill.save();
    
    if (vendorCredit.vendorId) {
      await updateVendorBalance(vendorCredit.vendorId, amount, 'subtract');
    }
    
    res.status(200).json({
      message: "Credit applied to bill successfully",
      vendorCredit: formatVendorCredit(vendorCredit),
      bill: bill,
    });
  } catch (error) {
    console.error("Apply credit to bill error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
