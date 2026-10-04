import mongoose from "mongoose";

const reorderAlertSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    itemSku: {
      type: String,
      default: "",
    },
    itemGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    itemGroupName: {
      type: String,
      default: "",
    },
    currentStock: {
      type: Number,
      required: true,
    },
    reorderPoint: {
      type: Number,
      required: true,
    },
    warehouse: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["standalone_item", "group_item"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "notified", "resolved"],
      default: "active",
    },
    notifiedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for faster queries
reorderAlertSchema.index({ status: 1, warehouse: 1 });
reorderAlertSchema.index({ itemId: 1, warehouse: 1 });
reorderAlertSchema.index({ createdAt: -1 });

const ReorderAlert = mongoose.model("ReorderAlert", reorderAlertSchema);
export default ReorderAlert;
