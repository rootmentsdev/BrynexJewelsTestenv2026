// models/TransactionHistory.js

import mongoose from "mongoose";

const transactionHistorySchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true },
  originalTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
  },
  historyType: {
    type: String,
    enum: ['EDIT', 'DELETE'],
    required: true,
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  changedAt: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    default: ''
  },
  
  oldData: {
    type: Object,
    required: true,
  },
  newData: {
    type: Object, // Optional for DELETE
    default: null,
  }
}, { timestamps: true });

transactionHistorySchema.index({ invoiceNo: 1 });
transactionHistorySchema.index({ originalTransactionId: 1 });
transactionHistorySchema.index({ changedAt: -1 });

const TransactionHistory = mongoose.model('TransactionHistory', transactionHistorySchema);
export default TransactionHistory;
