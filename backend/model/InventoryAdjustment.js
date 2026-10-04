import mongoose from "mongoose";

const inventoryAdjustmentSchema = new mongoose.Schema(
  {
    // Basic Information
    referenceNumber: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    adjustmentType: {
      type: String,
      enum: ["quantity", "value"],
      required: true,
      default: "quantity",
    },
    status: {
      type: String,
      enum: ["draft", "adjusted"],
      default: "draft",
    },
    
    // Location Information
    branch: {
      type: String,
      default: "Head Office",
    },
    warehouse: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Financial Information
    account: {
      type: String,
      required: true,
      trim: true,
      default: "Cost of Goods Sold",
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    
    // Items being adjusted
    items: [{
      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ShoeItem",
        default: null,
      },
      itemGroupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ItemGroup",
        default: null,
      },
      itemName: {
        type: String,
        required: true,
      },
      itemSku: {
        type: String,
        trim: true,
      },
      // Current stock before adjustment
      currentQuantity: {
        type: Number,
        default: 0,
      },
      currentValue: {
        type: Number,
        default: 0,
      },
      // Adjustment values
      quantityAdjusted: {
        type: Number,
        default: 0,
      },
      newQuantity: {
        type: Number,
        default: 0,
      },
      // For value adjustments
      unitCost: {
        type: Number,
        default: 0,
      },
      valueAdjusted: {
        type: Number,
        default: 0,
      },
      newValue: {
        type: Number,
        default: 0,
      },
    }],
    
    // Attachments
    attachments: [{
      filename: String,
      contentType: String,
      data: Buffer,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // Audit Trail
    userId: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String,
      trim: true,
    },
    modifiedBy: {
      type: String,
      trim: true,
    },
    locCode: {
      type: String,
      default: "",
    },
    
    // Totals
    totalQuantityAdjusted: {
      type: Number,
      default: 0,
    },
    totalValueAdjusted: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
inventoryAdjustmentSchema.index({ userId: 1, date: -1 });
inventoryAdjustmentSchema.index({ warehouse: 1, status: 1 });
inventoryAdjustmentSchema.index({ referenceNumber: 1 });

const InventoryAdjustment = mongoose.model("InventoryAdjustment", inventoryAdjustmentSchema);

export default InventoryAdjustment;

