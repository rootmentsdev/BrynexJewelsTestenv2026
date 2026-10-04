import SalesInvoice from "../model/SalesInvoice.js";
import { nextGlobalSalesInvoice } from "../utils/nextSalesInvoice.js";
import { updateStockOnInvoiceCreate, reverseStockOnInvoiceDelete } from "../utils/ultraEnhancedStockManagement.js";
import { validateStockBeforeInvoice, validateStockAfterInvoice } from "../utils/stockValidationSystem.js";
import Transaction from "../model/Transaction.js";
import User from "../model/UserModel.js";
import mongoose from "mongoose";

// ✅ Helper function to allocate payment amounts based on payment method
const allocatePaymentAmounts = (invoice) => {
  let cash = "0";
  let bank = "0";
  let upi = "0";
  let rbl = "0";
  let paymentMethodForTransaction = "split"; // Default
  
  // Check if this is a return/refund/cancel invoice (negative amounts)
  const categoryLower = (invoice.category || "").toLowerCase().trim();
  const isReturnRefundCancel = ["return", "refund", "cancel"].includes(categoryLower);
  const finalTotalValue = parseFloat(invoice.finalTotal || 0);
  const isNegativeAmount = finalTotalValue < 0;
  
  // For returns/refunds, use absolute value for payment allocation but keep transaction amounts negative
  const amountToAllocate = Math.abs(finalTotalValue).toString();
  
  // Handle split payment first
  if (invoice.isSplitPayment && invoice.splitPaymentAmounts) {
    const splitAmounts = invoice.splitPaymentAmounts;
    cash = isNegativeAmount ? (-Math.abs(parseFloat(splitAmounts.cash || 0))).toString() : (splitAmounts.cash || "0");
    bank = isNegativeAmount ? (-Math.abs(parseFloat(splitAmounts.bank || 0))).toString() : (splitAmounts.bank || "0");
    upi = isNegativeAmount ? (-Math.abs(parseFloat(splitAmounts.upi || 0))).toString() : (splitAmounts.upi || "0");
    rbl = isNegativeAmount ? (-Math.abs(parseFloat(splitAmounts.rbl || 0))).toString() : (splitAmounts.rbl || "0");
    paymentMethodForTransaction = "split";
    
    console.log(`💰 Split payment allocation for ${isReturnRefundCancel ? 'RETURN' : 'INVOICE'}:`, {
      cash, bank, upi, rbl,
      isNegative: isNegativeAmount
    });
  } else {
    // Set payment amounts and method based on selected payment method
    if (invoice.paymentMethod === "Cash") {
      cash = isNegativeAmount ? (-Math.abs(parseFloat(amountToAllocate))).toString() : amountToAllocate;
      paymentMethodForTransaction = "cash";
    } else if (invoice.paymentMethod === "Bank" || invoice.paymentMethod === "Card / Bank") {
      bank = isNegativeAmount ? (-Math.abs(parseFloat(amountToAllocate))).toString() : amountToAllocate;
      paymentMethodForTransaction = "bank";
    } else if (invoice.paymentMethod === "UPI") {
      upi = isNegativeAmount ? (-Math.abs(parseFloat(amountToAllocate))).toString() : amountToAllocate;
      paymentMethodForTransaction = "upi";
    } else if (invoice.paymentMethod === "RBL") {
      rbl = isNegativeAmount ? (-Math.abs(parseFloat(amountToAllocate))).toString() : amountToAllocate;
      paymentMethodForTransaction = "split";
    } else {
      // If no payment method selected, default to split with zero amounts
      paymentMethodForTransaction = "split";
    }
    
    console.log(`💰 Payment allocation for ${isReturnRefundCancel ? 'RETURN' : 'INVOICE'}:`, {
      paymentMethod: invoice.paymentMethod,
      finalTotal: finalTotalValue,
      isNegative: isNegativeAmount,
      cash, rbl, bank, upi
    });
  }
  
  return { cash, bank, upi, rbl, paymentMethodForTransaction };
};
 
// Create a new sales invoice
export const createSalesInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    const userId = invoiceData.userId;

    if (!invoiceData.customer || !userId) {
      return res.status(400).json({ message: "Customer name and userId are required" });
    }

    // Determine invoice prefix
    let invoicePrefix = "INV-";
    const categoryLower = (invoiceData.category || "").toLowerCase();
    if (invoiceData.invoiceNumber?.startsWith("RTN-") || categoryLower === "return") {
      invoicePrefix = "RTN-";
    } else if (invoiceData.invoiceNumber?.startsWith("RET-")) {
      invoicePrefix = "RET-";
    }

    if (invoiceData.status) {
      invoiceData.status = invoiceData.status.toLowerCase();
    }
    if (invoiceData.returnStatus) {
      invoiceData.returnStatus = invoiceData.returnStatus.toLowerCase();
    }

    // Resilient user query: case-insensitive email or username, and ObjectId if valid
    const trimmedUserId = (userId || "").toString().trim();
    const userConditions = [
      { email: { $regex: new RegExp(`^${trimmedUserId.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") } },
      { username: { $regex: new RegExp(`^${trimmedUserId.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") } },
    ];
    if (mongoose.Types.ObjectId.isValid(trimmedUserId)) {
      userConditions.push({ _id: trimmedUserId });
    }

    // Run user lookup and invoice number generation in parallel
    let [user, existingInvoice] = await Promise.all([
      User.findOne({ $or: userConditions }).lean(),
      invoiceData.invoiceNumber
        ? SalesInvoice.findOne({ invoiceNumber: invoiceData.invoiceNumber }).lean()
        : Promise.resolve(null)
    ]);

    if (!user) {
      user = (await User.findOne({ power: "admin" }).lean()) || (await User.findOne().lean());
    }

    if (!user) {
      user = {
        _id: new mongoose.Types.ObjectId(),
        username: userId || "Admin",
        email: userId || "admin@example.com",
        power: "admin",
        role: "admin",
        storeId: null,
      };
    }

    // Store-level access control
    if (user.role === "store_manager" || user.role === "store_user") {
      const userStore = user.storeName || user.username;
      if (invoiceData.branch !== userStore) {
        return res.status(403).json({
          message: "You can only create invoices for your store",
          userStore,
          requestedStore: invoiceData.branch
        });
      }
    }

    // Resolve final invoice number
    let finalInvoiceNumber = invoiceData.invoiceNumber;
    if (!finalInvoiceNumber || existingInvoice) {
      finalInvoiceNumber = await nextGlobalSalesInvoice(invoicePrefix);
    }

    invoiceData.invoiceNumber = finalInvoiceNumber;
    invoiceData.createdBy = userId;
    invoiceData.storeId = user.storeId;

    // Save invoice to MongoDB
    const invoice = await SalesInvoice.create(invoiceData);

    // Respond immediately — don't wait for stock/transaction updates
    res.status(201).json(invoice);

    // Run stock update + financial transaction in background (non-blocking)
    setImmediate(async () => {
      try {
        await createFinancialTransaction(invoice);
      } catch (err) {
        console.error("Background financial transaction error:", err.message);
      }

      if (invoice.lineItems?.length > 0) {
        const warehouse = invoice.warehouse || invoice.branch || "Warehouse";
        const shouldReverseStock = ["return", "refund", "cancel"].includes(
          (invoice.category || "").toLowerCase().trim()
        );
        try {
          if (shouldReverseStock) {
            await reverseStockOnInvoiceDelete(invoice.lineItems, warehouse);
          } else {
            await updateStockOnInvoiceCreate(invoice.lineItems, warehouse);
          }
        } catch (err) {
          console.error("Background stock update error:", err.message);
        }
      }
    });

  } catch (error) {
    console.error("Create sales invoice error:", error);

    if (error.code === 11000) {
      return res.status(409).json({ message: "Invoice number already exists" });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ message: "Validation error", error: errors });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to create financial transaction
const createFinancialTransaction = async (invoice) => {
  try {
    console.log("🔄 Creating financial transaction for invoice:", invoice.invoiceNumber);
    console.log("Invoice data for transaction:", {
      category: invoice.category,
      subCategory: invoice.subCategory,
      remark: invoice.remark,
      customerNotes: invoice.customerNotes,
      subject: invoice.subject
    });
    
    // Use the selected category as the transaction type, or default to "Receivable"
    const transactionType = invoice.category || "Receivable";
    
    // ✅ Use helper function to allocate payment amounts
    const { cash, bank, upi, rbl, paymentMethodForTransaction } = allocatePaymentAmounts(invoice);
    
    // Get location code from invoice or use default
    const locCode = invoice.locCode || "001"; // Default location code
    
    console.log(`📍 Creating transaction with locCode: "${locCode}" (from invoice.locCode: "${invoice.locCode}")`);
    console.log(`📅 Transaction date: ${invoice.invoiceDate}`);
    
    // Create financial transaction entry
    const transactionData = {
      type: transactionType, // Use selected category as transaction type
      invoiceNo: invoice.invoiceNumber,
      category: invoice.category || "Sales", // Use invoice category for transaction category
      subCategory: invoice.subCategory || "General", // Use invoice subCategory for transaction subCategory
      remark: invoice.remark || invoice.customerNotes || invoice.subject || `Invoice for ${invoice.customer}`, // Use actual remarks from invoice
      billValue: parseFloat(invoice.subTotal || invoice.finalTotal || 0), // subTotal = before discount (bill value)
      discountAmount: parseFloat(invoice.discountAmount || 0), // discount applied
      amount: invoice.finalTotal.toString(),
      cash: cash,
      rbl: rbl,
      bank: bank,
      upi: upi,
      paymentMethod: paymentMethodForTransaction,
      date: invoice.invoiceDate,
      locCode: locCode,
      quantity: invoice.lineItems?.length.toString() || "0",
      customerName: invoice.customer,
      totalTransaction: invoice.finalTotal
    };

    // Save transaction to MongoDB
    const transaction = await Transaction.create(transactionData);
    return transaction;
  } catch (error) {
    console.error("❌ Error creating financial transaction:", error);
    throw error;
  }
};

// Helper function to update financial transaction when invoice is updated
const updateFinancialTransaction = async (invoice) => {
  try {
    console.log("🔄 Updating financial transaction for invoice:", invoice.invoiceNumber);
    console.log("🔄 Invoice split payment data:", {
      isSplitPayment: invoice.isSplitPayment,
      splitPaymentAmounts: invoice.splitPaymentAmounts,
      paymentMethod: invoice.paymentMethod
    });
    
    // Find the existing transaction by invoice number
    const existingTransaction = await Transaction.findOne({ 
      invoiceNo: invoice.invoiceNumber 
    });
    
    if (!existingTransaction) {
      console.log("⚠️ No existing transaction found, creating new one");
      // If no transaction exists, create one
      return await createFinancialTransaction(invoice);
    }
    
    // Use the selected category as the transaction type, or default to "Receivable"
    const transactionType = invoice.category || "Receivable";
    
    // ✅ Use helper function to allocate payment amounts
    const { cash, bank, upi, rbl, paymentMethodForTransaction } = allocatePaymentAmounts(invoice);
    
    console.log("🔄 Payment allocation result:", { cash, bank, upi, rbl, paymentMethodForTransaction });
    
    // Get location code from invoice or use existing
    const locCode = invoice.locCode || existingTransaction.locCode || "001";
    
    // Update transaction data
    const updateData = {
      type: transactionType,
      category: invoice.category || "Sales",
      subCategory: invoice.subCategory || "General",
      remark: invoice.remark || invoice.customerNotes || invoice.subject || `Invoice for ${invoice.customer}`,
      billValue: parseFloat(invoice.subTotal || invoice.finalTotal || 0), // subTotal = pre-discount bill value
      discountAmount: parseFloat(invoice.discountAmount || 0),
      amount: invoice.finalTotal.toString(),
      cash: cash,
      rbl: rbl,
      bank: bank,
      upi: upi,
      paymentMethod: paymentMethodForTransaction,
      date: invoice.invoiceDate,
      locCode: locCode,
      quantity: invoice.lineItems?.length.toString() || "0",
      customerName: invoice.customer,
      totalTransaction: invoice.finalTotal
    };

    // Update transaction in MongoDB
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      existingTransaction._id,
      updateData,
      { new: true, runValidators: true }
    );
    
    console.log("✅ MongoDB transaction updated:", updatedTransaction.invoiceNo);

    // Update transaction in PostgreSQL if it exists
    try {
      const postgresTransaction = await TransactionPostgres.findOne({
        where: { invoiceNo: invoice.invoiceNumber }
      });
      
      if (postgresTransaction) {
        await postgresTransaction.update(updateData);
        console.log("✅ PostgreSQL transaction updated:", postgresTransaction.invoiceNo);
      }
    } catch (postgresError) {
      console.error("❌ Error updating transaction in PostgreSQL:", postgresError);
      // Don't fail if PostgreSQL fails
    }

    console.log("Updated transaction details:", {
      type: transactionType,
      category: invoice.category,
      subCategory: invoice.subCategory,
      paymentMethod: invoice.paymentMethod,
      selectedPaymentMethod: paymentMethodForTransaction,
      cash: cash,
      rbl: rbl,
      bank: bank,
      upi: upi,
      billValue: invoice.finalTotal
    });
    
    return updatedTransaction;
  } catch (error) {
    console.error("❌ Error updating financial transaction:", error);
    throw error;
  }
};

// Get next invoice number (FIXED - ADDED)
export const getNextInvoiceNumber = async (req, res) => {
  try {
    const prefix = req.body.prefix || "INV-";
    const nextNumber = await nextGlobalSalesInvoice(prefix);

    res.status(200).json({ invoiceNumber: nextNumber });
  } catch (error) {
    console.error("Get next invoice number error:", error);
    res.status(500).json({
      message: "Error generating next invoice number",
      error: error.message,
    });
  }
};

// Get all sales invoices for a user
export const getSalesInvoices = async (req, res) => {
  try {
    const { userId, userPower, status, locCode, warehouse, filterLocCode, fromDate, toDate, branch } = req.query;

    const query = {};

    // Add date range filtering
    if (fromDate || toDate) {
      query.invoiceDate = {};
      if (fromDate) {
        const from = new Date(fromDate);
        from.setUTCHours(0, 0, 0, 0);
        query.invoiceDate.$gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setUTCHours(23, 59, 59, 999);
        query.invoiceDate.$lte = to;
      }
      console.log(`📅 Date filtering applied: ${fromDate} to ${toDate}`);
    }

    const adminEmails = ["officerootments@gmail.com"];
    const isAdminEmail =
      userId &&
      typeof userId === "string" &&
      adminEmails.some(
        (email) => userId.toLowerCase() === email.toLowerCase()
      );

    const isAdmin =
      isAdminEmail ||
      (userPower &&
        (userPower.toLowerCase() === "admin" ||
          userPower.toLowerCase() === "super_admin")) ||
      (locCode && (locCode === "858" || locCode === "103"));

    // If admin has switched to a specific store (not Warehouse), filter by that store
    const isAdminViewingSpecificStore = isAdmin && warehouse && warehouse !== "All Stores";

    // Store-level access control: filter invoices by store for non-admin users OR admins viewing specific store
    if ((!isAdmin || isAdminViewingSpecificStore) && (warehouse || filterLocCode || branch)) {
      // Check warehouse, branch, or locCode fields for compatibility with old invoices
      const orConditions = [];
      if (warehouse) {
        orConditions.push({ warehouse: warehouse });
        orConditions.push({ branch: warehouse });
      }
      if (branch) {
        orConditions.push({ branch: branch });
        orConditions.push({ warehouse: branch });
      }
      if (filterLocCode) {
        orConditions.push({ locCode: filterLocCode });
      }
      if (orConditions.length > 0) {
        query.$or = orConditions;
      }
    } else if (!isAdmin && userId) {
      // Get user to check role and store
      const user = await User.findOne({ email: userId });
      
      if (user && (user.role === "store_manager" || user.role === "store_user")) {
        // Store user can only see invoices for their store
        const userStore = user.storeName || user.username;
        query.branch = userStore;
        console.log(`📋 Filtering invoices for store user: ${userId} → Store: ${userStore}`);
      } else {
        // Fallback to original logic for non-store users
        const userIdStr = userId.toString();

        if (userIdStr.includes("@")) {
          query.userId = {
            $regex: `^${userIdStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
            $options: "i",
          };
        } else {
          query.userId = userIdStr;
        }
      }
    }

    if (status) query.status = status;

    const invoices = await SalesInvoice.find(query).sort({
      createdAt: -1,
    }).lean();

    res.status(200).json(invoices);
  } catch (error) {
    console.error("Get sales invoices error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get invoice by ID
export const getSalesInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await SalesInvoice.findById(id).lean();

    if (!invoice) {
      return res
        .status(404)
        .json({ message: "Sales invoice not found" });
    }

    res.status(200).json(invoice);
  } catch (error) {
    console.error("Get sales invoice error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update invoice
export const updateSalesInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId;

    // Get user to check store access control
    if (userId) {
      const trimmedUserId = (userId || "").toString().trim();
      const userConditions = [
        { email: { $regex: new RegExp(`^${trimmedUserId.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") } },
        { username: { $regex: new RegExp(`^${trimmedUserId.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") } },
      ];
      if (mongoose.Types.ObjectId.isValid(trimmedUserId)) {
        userConditions.push({ _id: trimmedUserId });
      }

      let user = await User.findOne({ $or: userConditions });
      if (!user) {
        user = (await User.findOne({ power: "admin" })) || (await User.findOne());
      }
      if (!user) {
        user = {
          _id: new mongoose.Types.ObjectId(),
          username: userId || "Admin",
          email: userId || "admin@example.com",
          power: "admin",
          role: "admin",
          storeId: null,
        };
      }

      // Store-level access control: store users can only update their own store invoices
      if (user.role === "store_manager" || user.role === "store_user") {
        const userStore = user.storeName || user.username;
        if (req.body.branch && req.body.branch !== userStore) {
          return res.status(403).json({
            message: "You can only update invoices for your store",
            userStore: userStore,
            requestedStore: req.body.branch
          });
        }
      }
    }

    if (req.body.status) {
      req.body.status = req.body.status.toLowerCase();
    }
    if (req.body.returnStatus) {
      req.body.returnStatus = req.body.returnStatus.toLowerCase();
    }

    const invoice = await SalesInvoice.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return res
        .status(404)
        .json({ message: "Sales invoice not found" });
    }

    // ✅ UPDATE CORRESPONDING FINANCIAL TRANSACTION
    // Skip payment field updates when this is a return-triggered update (returnStatus set)
    // to preserve the original invoice's cash/bank/upi/amount in the day book
    const isReturnUpdate = req.body.returnStatus === "partial" || req.body.returnStatus === "full";
    try {
      if (isReturnUpdate) {
        // Do NOT update billValue on the original invoice's transaction when a return is processed.
        // The original transaction should always reflect the original sale amount collected.
        // The return transaction (RTN-) separately records the refund amount.
        console.log("✅ Return update detected - preserving original transaction billValue and payment amounts");
      } else {
        await updateFinancialTransaction(invoice);
        console.log("✅ Financial transaction updated successfully");
      }
    } catch (transactionError) {
      console.error("❌ Error updating financial transaction:", transactionError);
      // Don't fail the invoice update if transaction update fails
    }

    res.status(200).json(invoice);
  } catch (error) {
    console.error("Update sales invoice error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete invoice - MODIFIED TO PREVENT DELETION OF RETURN/REFUND/CANCEL INVOICES
export const deleteSalesInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body?.userId || req.query?.userId;

    // Get user to check store access control
    if (userId) {
      const trimmedUserId = (userId || "").toString().trim();
      const userConditions = [
        { email: { $regex: new RegExp(`^${trimmedUserId.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") } },
        { username: { $regex: new RegExp(`^${trimmedUserId.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") } },
      ];
      if (mongoose.Types.ObjectId.isValid(trimmedUserId)) {
        userConditions.push({ _id: trimmedUserId });
      }

      let user = await User.findOne({ $or: userConditions });
      if (!user) {
        user = (await User.findOne({ power: "admin" })) || (await User.findOne());
      }
      if (!user) {
        user = {
          _id: new mongoose.Types.ObjectId(),
          username: userId || "Admin",
          email: userId || "admin@example.com",
          power: "admin",
          role: "admin",
          storeId: null,
        };
      }

      // Store-level access control: store users can only delete their own store invoices
      if (user.role === "store_manager" || user.role === "store_user") {
        const invoice = await SalesInvoice.findById(id);
        if (invoice) {
          const userStore = user.storeName || user.username;
          if (invoice.branch !== userStore) {
            return res.status(403).json({
              message: "You can only delete invoices for your store",
              userStore: userStore,
              invoiceStore: invoice.branch
            });
          }
        }
      }
    }

    // Get invoice before deleting to access line items for stock reversal
    const invoiceToDelete = await SalesInvoice.findById(id);

    if (!invoiceToDelete) {
      return res
        .status(404)
        .json({ message: "Sales invoice not found" });
    }

    // ✅ PREVENT DELETION OF RETURN/REFUND/CANCEL INVOICES
    const categoryLower = (invoiceToDelete.category || "").toLowerCase().trim();
    const isReturnRefundCancel = ["return", "refund", "cancel"].includes(categoryLower);
    
    // Also check invoice number prefix (RTN-, RET-, REFUND-, CANCEL-)
    const invoiceNumber = (invoiceToDelete.invoiceNumber || "").toUpperCase();
    const hasReturnPrefix = invoiceNumber.startsWith("RTN-") || 
                           invoiceNumber.startsWith("RET-") || 
                           invoiceNumber.startsWith("REFUND-") || 
                           invoiceNumber.startsWith("CANCEL-");
    
    if (isReturnRefundCancel || hasReturnPrefix) {
      console.log(`⚠️ Cannot delete ${categoryLower || "return/refund/cancel"} invoice: ${invoiceToDelete.invoiceNumber}`);
      console.log(`💡 Return/Refund/Cancel invoices should remain in the system for audit trail`);
      return res.status(403).json({ 
        message: `Cannot delete return/refund/cancel invoices. They must remain in the system for financial records.`,
        suggestion: "Create a separate return invoice instead of deleting the original."
      });
    }

    // ✅ REVERSE STOCK FOR BOOKING INVOICES
    try {
      if (invoiceToDelete.category === "booking" && invoiceToDelete.lineItems && invoiceToDelete.lineItems.length > 0) {
        const warehouse = invoiceToDelete.warehouse || "Warehouse";
        await reverseStockOnInvoiceDelete(invoiceToDelete.lineItems, warehouse);
        console.log("✅ Stock reversed successfully for deleted booking invoice");
      }
    } catch (stockError) {
      console.error("❌ Error reversing stock:", stockError);
      // Don't fail the deletion if stock reversal fails
    }

    // ✅ DELETE ASSOCIATED TRANSACTION RECORD (only for non-return invoices)
    try {
      console.log(`🔍 Deleting transaction for invoice: "${invoiceToDelete.invoiceNumber}"`);
      const transactionResult = await Transaction.deleteOne({ invoiceNo: invoiceToDelete.invoiceNumber });
      console.log(`✅ Transaction deletion result:`, transactionResult);
      if (transactionResult.deletedCount > 0) {
        console.log(`✅ Transaction record deleted for invoice: ${invoiceToDelete.invoiceNumber}`);
      } else {
        console.log(`⚠️ No transaction found with invoiceNo: ${invoiceToDelete.invoiceNumber}`);
      }
    } catch (transactionError) {
      console.error("❌ Error deleting transaction:", transactionError);
      // Don't fail the deletion if transaction deletion fails
    }

    // ✅ DELETE FROM POSTGRESQL IF EXISTS
    try {
      await SalesInvoicePostgres.destroy({
        where: { invoiceNumber: invoiceToDelete.invoiceNumber }
      });
      console.log("✅ PostgreSQL invoice record deleted");
    } catch (postgresError) {
      console.error("❌ Error deleting from PostgreSQL:", postgresError);
      // Don't fail if PostgreSQL deletion fails
    }

    const deletedInvoice = await SalesInvoice.findByIdAndDelete(id);

    res
      .status(200)
      .json({ message: "Sales invoice deleted successfully" });
  } catch (error) {
    console.error("Delete sales invoice error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
