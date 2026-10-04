import mongoose from "mongoose";

const salesInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: false,
    },
    customer: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      default: "",
    },
    branch: {
      type: String,
      default: "Head Office",
    },
    orderNumber: {
      type: String,
      default: "",
    },
    terms: {
      type: String,
      default: "Due on Receipt",
    },
    salesperson: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
      default: "",
    },
    warehouse: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "",
    },
    subCategory: {
      type: String,
      default: "",
    },
    paymentMethod: {
      type: String,
      default: "",
    },
    isSplitPayment: {
      type: Boolean,
      default: false,
    },
    splitPaymentAmounts: {
      cash: {
        type: String,
        default: "",
      },
      bank: {
        type: String,
        default: "",
      },
      upi: {
        type: String,
        default: "",
      },
      rbl: {
        type: String,
        default: "",
      },
    },
    lineItems: [
      {
        item: String,
        itemData: mongoose.Schema.Types.Mixed,
        itemGroupId: String,
        itemSku: String,
        size: String,
        quantity: Number,
        rate: Number,
        tax: String,
        amount: Number,
      },
    ],
    customerNotes: {
      type: String,
      default: "Thanks for your business.",
    },
    remark: {
      type: String,
      default: "",
    },
    termsAndConditions: {
      type: String,
      default: "",
    },
    discount: {
      value: { type: String, default: "0" },
      type: { type: String, default: "%" },
    },
    applyDiscountAfterTax: {
      type: Boolean,
      default: false,
    },
    tdsTcsType: {
      type: String,
      enum: ["TDS", "TCS"],
      default: "TDS",
    },
    tdsTcsTax: {
      type: String,
      default: "",
    },
    adjustment: {
      type: String,
      default: "0.00",
    },
    subTotal: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    tdsTcsAmount: {
      type: Number,
      default: 0,
    },
    adjustmentAmount: {
      type: Number,
      default: 0,
    },
    finalTotal: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "Draft", "Sent", "Paid", "Overdue", "closed", "Closed"],
      default: "draft",
    },
    returnStatus: {
      type: String,
      enum: ["none", "partial", "full", "None", "Partial", "Full"],
      default: "none",
    },
    originalInvoiceId: {
      type: String,
      default: "",
    },
    originalInvoiceNumber: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    userId: {
      type: String,
      required: true,
    },
    locCode: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Performance Indexes
salesInvoiceSchema.index({ userId: 1, createdAt: -1 });
salesInvoiceSchema.index({ invoiceNumber: 1 });
salesInvoiceSchema.index({ locCode: 1, invoiceDate: -1 });
salesInvoiceSchema.index({ status: 1, invoiceDate: -1 });
salesInvoiceSchema.index({ warehouse: 1, createdAt: -1 });
salesInvoiceSchema.index({ branch: 1, createdAt: -1 });
salesInvoiceSchema.index({ customer: 1 });
salesInvoiceSchema.index({ createdAt: -1 });
salesInvoiceSchema.index({ invoiceDate: -1 });

const SalesInvoice = mongoose.model("SalesInvoice", salesInvoiceSchema);
export default SalesInvoice;

