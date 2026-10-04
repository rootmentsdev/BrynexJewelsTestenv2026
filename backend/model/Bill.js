import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    // Vendor Information
    vendorId: { type: String, default: null }, // UUID string from PostgreSQL Vendor
    vendorName: { type: String, required: true },
    branch: { type: String, default: "Head Office" },
    
    // Bill Details
    billNumber: { type: String, required: true },
    orderNumber: { type: String, default: "" },
    billDate: { type: Date, required: true },
    
    // Source tracking (for bills created from PO or Receive)
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", default: null },
    purchaseReceiveId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseReceive", default: null },
    sourceType: { type: String, default: "direct" }, // "direct", "from_po", "from_receive"
    dueDate: { type: Date },
    paymentTerms: { type: String, default: "Net 60" },
    subject: { type: String, default: "" },
    
    // Tax Settings
    reverseCharge: { type: Boolean, default: false },
    taxExclusive: { type: Boolean, default: true },
    atTransactionLevel: { type: Boolean, default: true },
    
    // Source and Destination
    sourceOfSupply: { type: String, default: "" },
    destinationOfSupply: { type: String, default: "" },
    
    // Warehouse
    warehouse: { type: String, default: "" },
    
    // Items
    items: [{
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: "ShoeItem" },
      itemName: String,
      itemDescription: String,
      image: { type: String, default: "" },
      account: String,
      size: String,
      hsnCode: { type: String, default: "" },
      itemSku: { type: String, default: "" },
      sku: { type: String, default: "" },
      itemCode: { type: String, default: "" },
      itemGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "ItemGroup", default: null },
      quantity: { type: Number, default: 0 },
      rate: { type: Number, default: 0 },
      sellingPrice: { type: Number, default: 0 },
      mrp: { type: Number, default: 0 },
      percentage: { type: String, default: "" },
      tax: String,
      amount: { type: Number, default: 0 },
      baseAmount: { type: Number, default: 0 },
      discountedAmount: { type: Number, default: 0 },
      cgstAmount: { type: Number, default: 0 },
      sgstAmount: { type: Number, default: 0 },
      igstAmount: { type: Number, default: 0 },
      lineTaxTotal: { type: Number, default: 0 },
      lineTotal: { type: Number, default: 0 },
      taxCode: String,
      taxPercent: { type: Number, default: 0 },
      cgstPercent: { type: Number, default: 0 },
      sgstPercent: { type: Number, default: 0 },
      igstPercent: { type: Number, default: 0 },
      isInterState: { type: Boolean, default: false },
      returnable: { type: Boolean, default: false },
    }],
    
    // Summary
    discount: {
      value: { type: String, default: "0" },
      type: { type: String, default: "%" }, // "%" or "₹"
    },
    applyDiscountAfterTax: { type: Boolean, default: false },
    totalTaxAmount: { type: Number, default: 0 },
    tdsTcsType: { type: String, default: "" }, // "TDS" or "TCS"
    tdsTcsTax: { type: String, default: "" },
    tdsTcsAmount: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    
    // Totals
    subTotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    finalTotal: { type: Number, default: 0 },
    
    // Notes
    notes: { type: String, default: "" },
    
    // User association
    userId: { type: String, required: true },
    locCode: { type: String, default: "" },
    
    // Status
    status: { type: String, default: "draft" }, // "draft", "sent", "paid", "cancelled"
  },
  { timestamps: true }
);

// Indexes for faster queries
billSchema.index({ userId: 1, billDate: -1 });
billSchema.index({ locCode: 1, billDate: -1 });
billSchema.index({ status: 1, billDate: -1 });

const Bill = mongoose.model("Bill", billSchema);
export default Bill;

