import ShoeItem from "../model/ShoeItem.js";
import ItemGroup from "../model/ItemGroup.js";
import ReorderAlert from "../model/ReorderAlert.js";
import User from "../model/UserModel.js";
import { sendReorderAlertEmail } from "./emailService.js";

/**
 * Check if items have reached reorder point and create alerts
 */
export const checkAndCreateReorderAlerts = async (lineItems, warehouse) => {
  try {
    console.log(`🔔 Checking reorder points for warehouse: ${warehouse}`);
    
    if (!lineItems || lineItems.length === 0) {
      console.log("No line items to check");
      return [];
    }

    // Warehouse is the main warehouse - no mapping needed
    let warehouseForCheck = warehouse;

    const alerts = [];

    for (const item of lineItems) {
      const itemGroupId = item.itemData?.itemGroupId || item.itemGroupId;
      const itemName = item.itemData?.itemName || item.itemData?.name || item.item;
      const itemSku = item.itemData?.sku || item.itemSku;

      try {
        if (itemGroupId) {
          // Check group item
          const group = await ItemGroup.findById(itemGroupId);
          if (!group) continue;

          const groupItem = group.items.find(gi => 
            gi.sku?.toLowerCase() === itemSku?.toLowerCase() ||
            gi.name?.toLowerCase() === itemName?.toLowerCase()
          );

          if (!groupItem) continue;

          const warehouseStock = groupItem.warehouseStocks?.find(ws =>
            ws.warehouse?.toLowerCase().includes(warehouseForCheck.toLowerCase()) ||
            warehouseForCheck.toLowerCase().includes(ws.warehouse?.toLowerCase())
          );

          if (!warehouseStock) continue;

          const currentStock = parseFloat(warehouseStock.availableForSale) || 0;
          const reorderPoint = parseFloat(groupItem.reorderPoint) || 0;

          if (reorderPoint > 0 && currentStock <= reorderPoint) {
            const alert = await createReorderAlert({
              itemId: groupItem._id,
              itemName: groupItem.name,
              itemSku: groupItem.sku,
              itemGroupId: group._id,
              itemGroupName: group.name,
              currentStock,
              reorderPoint,
              warehouse: warehouseForCheck,
              type: "group_item"
            });
            alerts.push(alert);
          }
        } else {
          // Check standalone item
          if (!item.itemData || !item.itemData._id) continue;

          const shoeItem = await ShoeItem.findById(item.itemData._id);
          if (!shoeItem) continue;

          const warehouseStock = shoeItem.warehouseStocks?.find(ws =>
            ws.warehouse?.toLowerCase().includes(warehouseForCheck.toLowerCase()) ||
            warehouseForCheck.toLowerCase().includes(ws.warehouse?.toLowerCase())
          );

          if (!warehouseStock) continue;

          const currentStock = parseFloat(warehouseStock.availableForSale) || 0;
          const reorderPoint = parseFloat(shoeItem.reorderPoint) || 0;

          if (reorderPoint > 0 && currentStock <= reorderPoint) {
            const alert = await createReorderAlert({
              itemId: shoeItem._id,
              itemName: shoeItem.itemName,
              itemSku: shoeItem.sku,
              currentStock,
              reorderPoint,
              warehouse: warehouseForCheck,
              type: "standalone_item"
            });
            alerts.push(alert);
          }
        }
      } catch (itemError) {
        console.error(`Error checking reorder point for item ${itemName}:`, itemError);
      }
    }

    if (alerts.length > 0) {
      console.log(`🔔 Created ${alerts.length} reorder alert(s)`);
    }

    return alerts;
  } catch (error) {
    console.error("Error checking reorder points:", error);
    return [];
  }
};

/**
 * Create a reorder alert in the database and send email notification
 */
const createReorderAlert = async (alertData) => {
  try {
    // Check if alert already exists for this item and warehouse
    const existingAlert = await ReorderAlert.findOne({
      itemId: alertData.itemId,
      warehouse: alertData.warehouse,
      status: "active"
    });

    if (existingAlert) {
      console.log(`Alert already exists for ${alertData.itemName} in ${alertData.warehouse}`);
      return existingAlert;
    }

    const alert = await ReorderAlert.create({
      ...alertData,
      status: "active",
      createdAt: new Date(),
      notifiedAt: null
    });

    console.log(`✅ Reorder alert created for ${alertData.itemName}: ${alertData.currentStock} <= ${alertData.reorderPoint}`);

    // Send email notification automatically
    try {
      await sendReorderAlertEmailToAdmins(alert);
    } catch (emailError) {
      console.error("Error sending reorder alert email:", emailError);
      // Don't fail the alert creation if email fails
    }

    return alert;
  } catch (error) {
    console.error("Error creating reorder alert:", error);
    throw error;
  }
};

/**
 * Send reorder alert email to all admins and warehouse users
 */
const sendReorderAlertEmailToAdmins = async (alert) => {
  try {
    // Get all admin and warehouse users
    const admins = await User.find({
      $or: [
        { power: "admin" },
        { role: { $in: ["admin", "superadmin"] } }
      ]
    });

    const warehouseUsers = await User.find({
      role: "store_manager"
    });

    const allRecipients = [...admins, ...warehouseUsers];

    let emailList = allRecipients
      .map(user => user.email)
      .filter(email => email && email.includes("@"));

    // Add warehouse email from environment variable
    const warehouseEmail = process.env.WAREHOUSE_EMAIL;
    if (warehouseEmail && warehouseEmail.includes("@")) {
      if (!emailList.includes(warehouseEmail)) {
        emailList.push(warehouseEmail);
      }
    }

    if (emailList.length === 0) {
      console.warn("⚠️ No valid email addresses found for notification");
      return;
    }

    console.log(`📧 Sending reorder alert email to ${emailList.length} recipient(s): ${emailList.join(", ")}`);
    const emailSent = await sendReorderAlertEmail(alert, emailList);

    if (emailSent) {
      // Update alert to mark as notified
      await ReorderAlert.findByIdAndUpdate(
        alert._id,
        { notifiedAt: new Date() },
        { new: true }
      );
      console.log(`✅ Reorder alert email sent and marked as notified`);
    }
  } catch (error) {
    console.error("Error sending reorder alert email to admins:", error);
    // Don't throw - this is a non-critical operation
  }
};

/**
 * Get all active reorder alerts
 */
export const getActiveReorderAlerts = async (warehouse = null) => {
  try {
    const query = { status: "active" };
    if (warehouse) {
      query.warehouse = warehouse;
    }

    const alerts = await ReorderAlert.find(query).sort({ createdAt: -1 });
    return alerts;
  } catch (error) {
    console.error("Error fetching reorder alerts:", error);
    return [];
  }
};

/**
 * Mark alert as notified
 */
export const markAlertAsNotified = async (alertId) => {
  try {
    const alert = await ReorderAlert.findByIdAndUpdate(
      alertId,
      { notifiedAt: new Date() },
      { new: true }
    );
    return alert;
  } catch (error) {
    console.error("Error marking alert as notified:", error);
    throw error;
  }
};

/**
 * Resolve alert (when stock is replenished)
 */
export const resolveReorderAlert = async (alertId) => {
  try {
    const alert = await ReorderAlert.findByIdAndUpdate(
      alertId,
      { status: "resolved", resolvedAt: new Date() },
      { new: true }
    );
    return alert;
  } catch (error) {
    console.error("Error resolving alert:", error);
    throw error;
  }
};
