import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    // Primary Contact
    salutation: { type: String, default: "" },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    companyName: { type: String, default: "" },
    displayName: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    mobile: { type: String, default: "" },
    vendorLanguage: { type: String, default: "" },

    // Other Details
    gstTreatment: { type: String, default: "" },
    sourceOfSupply: { type: String, default: "" },
    pan: { type: String, default: "" },
    gstin: { type: String, default: "" },
    currency: { type: String, default: "INR" },
    paymentTerms: { type: String, default: "" },
    tds: { type: String, default: "" },
    enablePortal: { type: Boolean, default: false },

    // Contacts
    contacts: [{
      salutation: String,
      firstName: String,
      lastName: String,
      email: String,
      workPhone: String,
      mobile: String,
    }],

    // Billing Address
    billingAttention: { type: String, default: "" },
    billingAddress: { type: String, default: "" },
    billingAddress2: { type: String, default: "" },
    billingCity: { type: String, default: "" },
    billingState: { type: String, default: "" },
    billingPinCode: { type: String, default: "" },
    billingCountry: { type: String, default: "" },
    billingPhone: { type: String, default: "" },
    billingFax: { type: String, default: "" },

    // Shipping Address
    shippingAttention: { type: String, default: "" },
    shippingAddress: { type: String, default: "" },
    shippingAddress2: { type: String, default: "" },
    shippingCity: { type: String, default: "" },
    shippingState: { type: String, default: "" },
    shippingPinCode: { type: String, default: "" },
    shippingCountry: { type: String, default: "" },
    shippingPhone: { type: String, default: "" },
    shippingFax: { type: String, default: "" },

    // Bank Details
    bankAccounts: [{
      accountHolderName: String,
      bankName: String,
      accountNumber: String,
      reAccountNumber: String,
      ifsc: String,
    }],

    // Financial
    payables: { type: Number, default: 0 },
    credits: { type: Number, default: 0 },
    itemsToReceive: { type: Number, default: 0 },
    totalItemsOrdered: { type: Number, default: 0 },

    // Remarks
    remarks: { type: String, default: "" },

    // User association
    userId: { type: String, required: true },
    locCode: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

const Vendor = mongoose.model("Vendor", vendorSchema);
export default Vendor;

