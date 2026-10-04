import mongoose from "mongoose";

const storeOrderSchema = new mongoose.Schema(
  {
    // Basic Information
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    date: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "transferred"],
      default: "pending",
    },
    
    // Warehouse Information
    storeWarehouse: {
      type: String,
      required: true,
    },
    destinationWarehouse: {
      type: String,
      required: true,
      default: "Warehouse",
    },
    
    // Items being requested (stored as array)
    items: [
      {
        itemId: String,
        itemGroupId: String,
        itemName: String,
        itemSku: String,
        quantity: Number,
        currentStock: Number,
      },
    ],
    
    // Reference to the transfer order created when approved (if any)
    transferOrderId: {
      type: String,
      default: null,
      comment: "ID of the transfer order created when this store order is approved (PostgreSQL UUID)",
    },
    
    // PostgreSQL UUID for cross-reference
    postgresId: {
      type: String,
      default: null,
      comment: "PostgreSQL UUID for cross-reference",
    },
    
    // Audit Trail
    userId: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String,
      default: "",
    },
    approvedBy: {
      type: String,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: String,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    locCode: {
      type: String,
      default: "",
    },
    
    // Totals
    totalQuantityRequested: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
storeOrderSchema.index({ userId: 1, date: -1 });
storeOrderSchema.index({ storeWarehouse: 1, status: 1 });
storeOrderSchema.index({ status: 1 });
storeOrderSchema.index({ transferOrderId: 1 });
storeOrderSchema.index({ postgresId: 1 });

const StoreOrder = mongoose.model("StoreOrder", storeOrderSchema);
export default StoreOrder;
