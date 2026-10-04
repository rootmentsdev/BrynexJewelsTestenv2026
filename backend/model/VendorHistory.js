import mongoose from "mongoose";

const vendorHistorySchema = new mongoose.Schema(
  {
    vendorId: {
      type: String, // UUID string from PostgreSQL Vendor
      required: true,
    },
    eventType: {
      type: String,
      enum: [
        "BILL_ADDED",
        "BILL_UPDATED",
        "BILL_DELETED",
        "CONTACT_ADDED",
        "CONTACT_PERSON_ADDED",
        "CONTACT_PERSON_UPDATED",
        "VENDOR_CREATED",
        "VENDOR_UPDATED",
        "PAYMENT_MADE",
        "VENDOR_CREDIT_ADDED",
        "VENDOR_CREDIT_UPDATED",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    originator: {
      type: String,
      required: true,
      default: "System",
    },
    relatedEntityId: {
      type: String, // Can be bill ID, contact person ID, etc.
      default: null,
    },
    relatedEntityType: {
      type: String, // "bill", "contact_person", "vendor_credit", etc.
      default: null,
    },
    metadata: {
      type: Object,
      default: {},
    },
    changedBy: {
      type: String,
      default: "",
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient querying
vendorHistorySchema.index({ vendorId: 1, changedAt: -1 });
vendorHistorySchema.index({ eventType: 1 });

const VendorHistory = mongoose.model("VendorHistory", vendorHistorySchema);

export default VendorHistory;
