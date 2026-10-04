import mongoose from "mongoose";

const purchaseReceiveSchema = new mongoose.Schema(
  {
    // Purchase Order Reference
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
    purchaseOrderNumber: { type: String, required: true },
    
    // Vendor Information
    vendorId: { type: String, default: null }, // UUID string from PostgreSQL Vendor
    vendorName: { type: String, default: "" },
    
    // Receive Details
    receiveNumber: { type: String, required: true, unique: true },
    receivedDate: { type: Date, required: true },
    toWarehouse: { type: String, default: "" }, // Warehouse where items are received
    
    // Items Received
    items: [{
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: "ShoeItem" },
      itemName: String,
      itemSku: String, // SKU for better item matching
      itemDescription: String,
      ordered: { type: Number, default: 0 }, // Quantity from purchase order
      received: { type: Number, default: 0 }, // Quantity received
      inTransit: { type: Number, default: 0 }, // Quantity in transit
      quantityToReceive: { type: Number, default: 0 }, // Remaining quantity to receive
      itemGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "ItemGroup", default: null }, // For items from groups
    }],
    
    // Notes
    notes: { type: String, default: "" },
    
    // Attachments
    attachments: [{
      filename: String,
      contentType: String,
      data: String,  // Store as base64 string instead of Buffer
    }],
    
    // User association
    userId: { type: String, required: true },
    locCode: { type: String, default: "" },
    
    // Status
    status: { type: String, default: "received" }, // "draft", "in_transit", "partially_received", "received"
  },
  { timestamps: true }
);

// Indexes for faster queries
purchaseReceiveSchema.index({ userId: 1, receivedDate: -1 });
purchaseReceiveSchema.index({ purchaseOrderId: 1 });
purchaseReceiveSchema.index({ locCode: 1, receivedDate: -1 });
purchaseReceiveSchema.index({ status: 1 });

const PurchaseReceive = mongoose.model("PurchaseReceive", purchaseReceiveSchema);
export default PurchaseReceive;

