import mongoose from "mongoose";

const transferOrderSchema = new mongoose.Schema(
  {
    // Basic Information
    transferOrderNumber: {
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
      enum: ["draft", "in_transit", "transferred"],
      default: "draft",
    },
    
    // Warehouse Information
    sourceWarehouse: {
      type: String,
      required: true,
    },
    destinationWarehouse: {
      type: String,
      required: true,
    },
    
    // Items being transferred (stored as array)
    items: [
      {
        itemId: String,
        itemGroupId: String,
        itemName: String,
        itemSku: String,
        quantity: Number,
        sourceQuantity: Number,
        destQuantity: Number,
      },
    ],
    
    // Attachments (stored as array)
    attachments: [
      {
        name: String,
        type: String,
        data: String, // Base64 encoded data
      },
    ],
    
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
    modifiedBy: {
      type: String,
      default: "",
    },
    locCode: {
      type: String,
      default: "",
    },
    
    // Totals
    totalQuantityTransferred: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
transferOrderSchema.index({ userId: 1, date: -1 });
transferOrderSchema.index({ sourceWarehouse: 1, status: 1 });
transferOrderSchema.index({ destinationWarehouse: 1, status: 1 });
transferOrderSchema.index({ status: 1 });
transferOrderSchema.index({ postgresId: 1 });

const TransferOrder = mongoose.model("TransferOrder", transferOrderSchema);
export default TransferOrder;
