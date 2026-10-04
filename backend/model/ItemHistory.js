import mongoose from "mongoose";

const ItemHistorySchema = new mongoose.Schema(
  {
    itemGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ItemGroup",
      required: false, // Make optional for standalone items
      default: null,
    },
    itemId: {
      type: String,
      required: true,
    },
    changedBy: {
      type: String,
      required: true,
      trim: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changeType: {
      type: String,
      enum: ["UPDATE", "STOCK_UPDATE", "CREATE", "DELETE"],
      default: "UPDATE",
    },
    details: {
      type: String,
      required: true,
    },
    oldData: {
      type: Object,
      default: null,
    },
    newData: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ItemHistory = mongoose.model("ItemHistory", ItemHistorySchema);

export default ItemHistory;

