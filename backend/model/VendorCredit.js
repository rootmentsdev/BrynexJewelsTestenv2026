import mongoose from "mongoose";

const vendorCreditSchema = new mongoose.Schema(
  {
    // Vendor Information
    vendorId: { type: String, default: null }, // UUID string from PostgreSQL Vendor
    vendorName: { type: String, required: true },
    branch: { type: String, default: "Head Office" },
    
    // Credit Details
    creditNoteNumber: { type: String, required: true },
    orderNumber: { type: String, default: "" },
    creditDate: { type: Date, required: true },
    subject: { type: String, default: "" },
    
    // Tax Settings
    reverseCharge: { type: Boolean, default: false },
    warehouse: { type: String, default: "" },
    atTransactionLevel: { type: String, default: "At Transaction Level" },
    
    // Items
    items: [{
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: "ShoeItem" },
      itemName: String,
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
    discount: {
      value: { type: String, default: "0" },
      type: { type: String, default: "%" }, // "%" or "₹"
    },
    applyDiscountAfterTax: { type: Boolean, default: false },
    totalTaxAmount: { type: Number, default: 0 },
    tdsTcsType: { type: String, default: "TDS" }, // "TDS" or "TCS"
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
    status: { type: String, default: "draft" }, // "draft", "open", "cancelled"
  },
  { timestamps: true }
);

const VendorCredit = mongoose.model("VendorCredit", vendorCreditSchema);
export default VendorCredit;

