import VendorHistory from "../model/VendorHistory.js";

/**
 * Log vendor activity to history
 * @param {Object} params - History parameters
 * @param {String} params.vendorId - Vendor ID
 * @param {String} params.eventType - Type of event (BILL_ADDED, BILL_UPDATED, etc.)
 * @param {String} params.title - Event title
 * @param {String} params.description - Event description
 * @param {String} params.originator - Who performed the action (warehouse/branch name or user)
 * @param {String} params.relatedEntityId - Related entity ID (bill ID, etc.)
 * @param {String} params.relatedEntityType - Type of related entity (bill, contact_person, etc.)
 * @param {Object} params.metadata - Additional metadata
 * @param {String} params.changedBy - User who made the change
 */
export const logVendorActivity = async ({
  vendorId,
  eventType,
  title,
  description,
  originator = "System",
  relatedEntityId = null,
  relatedEntityType = null,
  metadata = {},
  changedBy = "",
}) => {
  try {
    if (!vendorId) {
      console.warn("Cannot log vendor activity: vendorId is required");
      return;
    }

    const historyEntry = {
      vendorId: vendorId.toString(),
      eventType,
      title,
      description,
      originator,
      relatedEntityId: relatedEntityId ? relatedEntityId.toString() : null,
      relatedEntityType,
      metadata,
      changedBy,
      changedAt: new Date(),
    };

    await VendorHistory.create(historyEntry);
    console.log(`✅ Logged vendor activity to MongoDB: ${eventType} for vendor ${vendorId}`);
  } catch (error) {
    console.error("Error logging vendor activity:", error);
    // Don't throw - history logging should not break the main operation
  }
};

/**
 * Format currency for display
 */
const formatCurrency = (value) => {
  if (!value && value !== 0) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace("₹", "₹")
    .replace(/\s/g, "");
};

/**
 * Helper to get originator name from bill or user
 */
export const getOriginatorName = (warehouse, branch, user) => {
  // Try warehouse first, then branch, then user location, then default
  if (warehouse && warehouse.trim()) {
    return warehouse.trim();
  }
  if (branch && branch.trim()) {
    return branch.trim();
  }
  if (user?.locName) {
    return user.locName;
  }
  return "Warehouse";
};
