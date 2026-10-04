import mongoose from "mongoose";

const purchaseOrderSchema = new mongoose.Schema(
  {
    // Vendor Information
    vendorId: { type: String, default: null }, // UUID string from PostgreSQL Vendor
    vendorName: { type: String, default: "" },
    branch: { type: String, default: "Head Office" },
    
    // Order Details
    orderNumber: { type: String, required: true, unique: true },
    referenceNumber: { type: String, default: "" },
    date: { type: Date, required: true },
    deliveryDate: { type: Date },
    paymentTerms: { type: String, default: "Due on Receipt" },
    shipmentPreference: { type: String, default: "" },
    
    // Delivery Address
    deliveryAddress: {
      attention: String,
      street1: String,
      street2: String,
      city: String,
      state: String,
      zip: String,
      country: String,
      phone: String,
    },
    
    // Items
    items: [{
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: "ShoeItem" },
      itemName: String,
      itemSku: String, // SKU for better item matching
      itemDescription: String,
      account: String,
      size: String,
      quantity: { type: Number, default: 0 },
      rate: { type: Number, default: 0 },
      tax: String,
      amount: { type: Number, default: 0 },
      baseAmount: { type: Number, default: 0 },
      discountedAmount: { type: Number, default: 0 },
      cgstAmount: { type: Number, default: 0 },
      sgstAmount: { type: Number, default: 0 },
      igstAmount: { type: Number, default: 0 },
      itemGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "ItemGroup", default: null }, // For items from groups
      lineTaxTotal: { type: Number, default: 0 },
      lineTotal: { type: Number, default: 0 },
      taxCode: String,
      taxPercent: { type: Number, default: 0 },
      cgstPercent: { type: Number, default: 0 },
      sgstPercent: { type: Number, default: 0 },
      igstPercent: { type: Number, default: 0 },
      isInterState: { type: Boolean, default: false },
    }],
    
    // Summary
    discountType: { type: String, default: "At Transaction Level" },
    discount: {
      value: { type: String, default: "0" },
      type: { type: String, default: "%" },
    },
    applyDiscountAfterTax: { type: Boolean, default: false },
    totalTaxAmount: { type: Number, default: 0 },
    tdsTcsType: { type: String, default: "TDS" },
    tdsTcsTax: { type: String, default: "" },
    tdsTcsAmount: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    
    // Totals
    subTotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    finalTotal: { type: Number, default: 0 },
    
    // Notes
    customerNotes: { type: String, default: "" },
    termsAndConditions: { type: String, default: "" },
    
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
    status: { type: String, default: "draft" }, // "draft", "sent", "received", "cancelled"
  },
  { timestamps: true }
);

// Indexes for faster queries
purchaseOrderSchema.index({ userId: 1, date: -1 });
purchaseOrderSchema.index({ locCode: 1, date: -1 });
purchaseOrderSchema.index({ status: 1, date: -1 });

const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);
export default PurchaseOrder;

