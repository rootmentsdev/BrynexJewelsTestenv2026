

import Transaction from "../model/Transaction.js";
import TransactionHistory from "../model/Transactionhistory.js";
import CloseTransaction from "../model/Closing.js";
import { propagateCashDiff, calculateTotalCashForDate } from "../utils/cashPropagation.js";






// export const editTransaction = async (req, res) => {
//   try {
//     /* ─── TEMP auth stub (replace with real auth middleware) ─── */
//     req.user = {
//       _id: "000000000000000000000000",
//       power: "super_admin",
//       locCode: "Zorucci-Kochi",
//     };

//     const { id: transactionId } = req.params;
//     const updates = req.body || {};
//     const reason = updates.editReason || "No reason provided";
//     const user = req.user;

//     /* ── 1. permission checks ───────────────────────────────── */
//     if (!["admin", "super_admin"].includes((user.power || "").toLowerCase())) {
//       return res
//         .status(403)
//         .json({ message: "Access denied: only admins can edit transactions." });
//     }

//     const originalTransaction = await Transaction.findById(transactionId);
//     if (!originalTransaction) {
//       return res.status(404).json({ message: "Transaction not found." });
//     }

//     if (
//       user.power === "admin" &&
//       user.locCode !== originalTransaction.locCode
//     ) {
//       return res.status(403).json({
//         message: "Admins can only edit transactions from their own branch.",
//       });
//     }

//     /* ── 2. derive new totals while keeping billValue frozen ── */
//     const {
//       cash = 0,
//       bank = 0,
//       upi = 0,
//       securityAmount = 0,
//       Balance = 0,
//     } = updates;

//     const rowType = (originalTransaction.type || "").toLowerCase();
//     const isRentOut = rowType === "rentout";
//     const isRefund = rowType === "return" || rowType === "cancel";

//     const splitTotal = Number(securityAmount) + Number(Balance);
//     const payTotal = Number(cash) + Number(bank) + Number(upi);

//     let amount = isRentOut ? splitTotal : payTotal;
//     if (isRefund) amount = -Math.abs(amount); // keep refund rows negative

//     /* freeze bill value (never overwritten) */
//   updates.billValue =
//   originalTransaction.billValue ??
//   originalTransaction.invoiceAmount ??
//   0;


//     /* keep split columns only for Rent-out */
//     if (isRentOut) {
//       updates.securityAmount = Number(securityAmount) || 0;
//       updates.Balance = Number(Balance) || 0;
//       updates.subCategory1 = "Balance Payable";
//     } else {
//       updates.securityAmount = 0;
//       updates.Balance = 0;
//       delete updates.subCategory1;
//     }

//     updates.amount = amount;
//     updates.totalTransaction = amount;

//     /* always have an invoice number */
//     const invoice = updates.invoiceNo || originalTransaction.invoiceNo || "";
//     updates.invoiceNo = invoice;

//     /* ── 3. write to history collection ─────────────────────── */
//     await TransactionHistory.create({
//       originalTransactionId: originalTransaction._id,
//       invoiceNo: invoice,
//       historyType: "EDIT",
//       changedBy: user._id,
//       reason,
//       oldData: originalTransaction.toObject(),
//       newData: { ...originalTransaction.toObject(), ...updates },
//     });

//     /* ── 4. apply update and return the new record ──────────── */
//     const updatedTransaction = await Transaction.findByIdAndUpdate(
//       transactionId,
//       {
//         ...updates,
//         customerName:
//           updates.customerName || originalTransaction.customerName || "",
//         editedBy: user._id,
//         editedAt: new Date(),
//         editReason: reason,
//       },
//       { new: true }
//     );

//     return res.status(200).json({
//       message: "Transaction updated successfully",
//       data: updatedTransaction,
//     });
//   } catch (error) {
//     console.error("Edit transaction error:", error);
//     return res
//       .status(500)
//       .json({ message: "Server error", error: error.message });
//   }
// };


export const editTransaction = async (req, res) => {
  try {
    req.user = {
      _id: "000000000000000000000000",
      power: "super_admin",
      locCode: "Zorucci-Kochi",
    };

    const transactionId = req.params.id;
    const updates = req.body || {};
    const reason = updates.editReason || "No reason provided";
    const user = req.user;

    // 1. Permission check
    if (!["admin", "super_admin"].includes(user.power)) {
      return res.status(403).json({
        message: "Access denied: only admins can edit transactions.",
      });
    }

    const originalTransaction = await Transaction.findById(transactionId);
    if (!originalTransaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    if (
      user.power === "admin" &&
      user.locCode !== originalTransaction.locCode
    ) {
      return res.status(403).json({
        message: "Admins can only edit transactions from their own branch.",
      });
    }

    // 2. Compute amount
    const {
      cash = 0,
      rbl = 0,
      bank = 0,
      upi = 0,
      securityAmount = 0,
      Balance = 0,
    } = updates;

    const rowType = (originalTransaction.type || "").toLowerCase();
    const isRentOut = rowType === "rentout";
    const isRefund = rowType === "return" || rowType === "cancel";

    const splitTotal = Number(securityAmount) + Number(Balance);
    const payTotal = Number(cash) + Number(rbl) + Number(bank) + Number(upi);

    let amount = isRentOut ? splitTotal : payTotal;
    if (isRefund) amount = -Math.abs(amount);

    updates.amount = amount;
    updates.totalTransaction = amount;

    // ✅ Preserve original bill value — never change it
    updates.billValue =
      originalTransaction.billValue ??
      originalTransaction.invoiceAmount ??
      0;

    // ✅ Keep invoiceNo and customer name
    updates.invoiceNo =
      updates.invoiceNo || originalTransaction.invoiceNo || "";
    updates.customerName =
      updates.customerName || originalTransaction.customerName || "";

    // ✅ Explicitly set payment fields to ensure they are saved
    updates.cash = String(cash) || "0";
    updates.rbl = String(rbl) || "0"; // ✅ Explicitly save RBL
    updates.bank = String(bank) || "0";
    updates.upi = String(upi) || "0";

    // ✅ RentOut logic
    if (isRentOut) {
      updates.securityAmount = Number(securityAmount) || 0;
      updates.Balance = Number(Balance) || 0;
      updates.subCategory1 = updates.subCategory1 || "Balance Payable";
    } else {
      updates.securityAmount = 0;
      updates.Balance = 0;
      updates.subCategory1 = "";
    }

    // ✅ History log
    await TransactionHistory.create({
      originalTransactionId: originalTransaction._id,
      invoiceNo: updates.invoiceNo,
      historyType: "EDIT",
      changedBy: user._id,
      reason,
      oldData: originalTransaction.toObject(),
      newData: { ...originalTransaction.toObject(), ...updates },
    });

    // ✅ Final update
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      {
        ...updates,
        editedBy: user._id,
        editedAt: new Date(),
        editReason: reason,
      },
      { new: true }
    );

    // ✅ Propagate cash difference to all CloseTransaction documents on or after transaction date
    const oldCash = Number(originalTransaction.cash) || 0;
    const newCash = Number(updates.cash) || 0;
    const cashDiff = newCash - oldCash;

    if (cashDiff !== 0) {
      const targetLocCode = updates.locCode || originalTransaction.locCode;
      const txDateRaw = updates.date || originalTransaction.date;
      await propagateCashDiff(targetLocCode, txDateRaw, cashDiff, true);
    }

    return res.status(200).json({
      message: "Transaction updated successfully",
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("Edit transaction error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};




export const getEditedTransactions = async (req, res) => {
  const { fromDate, toDate, locCode } = req.query;

  try {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const edited = await Transaction.find({
      locCode,
      date: { $gte: from, $lte: to },
      editedBy: { $exists: true }
    });

    const formatted = edited.map(tx => {
      const cash = Number(tx.cash || 0);
      const rbl = Number(tx.rbl || 0);
      const bank = Number(tx.bank || 0);
      const upi = Number(tx.upi || 0);
      const securityAmount = Number(tx.securityAmount || 0);
      const balance = Number(tx.Balance || 0);
      const isRentOut = tx.type === "RentOut";

      const computedTotal = isRentOut
        ? securityAmount + balance
        : cash + rbl + bank + upi;

      return {
        ...tx._doc,

        invoiceNo: String(tx.invoiceNo || "").trim(),
        customerName: tx.customerName || "",

        cash,
        rbl,
        bank,
        upi,

        securityAmount,
        Balance: balance,

        // ✅ Safe fallback: Only show Balance Payable for RentOut
        subCategory1: isRentOut ? (tx.subCategory1 || "Balance Payable") : "",
        billValue: Number(tx.billValue ?? tx.invoiceAmount ?? 0),

        amount: typeof tx.amount !== "undefined" ? Number(tx.amount) : computedTotal,
        totalTransaction: typeof tx.totalTransaction !== "undefined" ? Number(tx.totalTransaction) : computedTotal,
      };
    });

    res.status(200).json({ data: formatted });

  } catch (err) {
    console.error("❌ getEditedTransactions error:", err.message);
    res.status(500).json({ message: "Error fetching edited transactions", error: err.message });
  }
};





export const getsaveCashBank = async (req, res) => {
  try {
    const { locCode, date } = req.query;

    if (!locCode || !date) {
      return res.status(400).json({ message: "locCode and date are required" });
    }

    const calc = await calculateTotalCashForDate(locCode, date);
    if (!calc) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    let result = await CloseTransaction.findOne({
      locCode,
      date: { $gte: calc.startOfDay, $lte: calc.endOfDay },
    });

    if (result) {
      // ✅ If stored cash differs from actual total calculated cash (due to edits/external TWS updates), update stored doc!
      if (Number(result.cash) !== calc.totalCalculatedCash) {
        const oldCashVal = Number(result.cash) || 0;
        const diff = calc.totalCalculatedCash - oldCashVal;
        console.log(`🔄 Updating stored CloseTransaction cash for ${locCode} on ${date}: old=${result.cash} ➔ new=${calc.totalCalculatedCash} (diff=${diff})`);
        result.cash = calc.totalCalculatedCash;
        await result.save();

        if (diff !== 0) {
          await propagateCashDiff(locCode, calc.startOfDay, diff, false);
        }
      }
    } else {
      // Fallback object if day was never explicitly closed
      result = {
        _id: `temp-${locCode}-${calc.dateStr}`,
        locCode,
        date: calc.startOfDay,
        cash: calc.totalCalculatedCash,
        Closecash: calc.totalCalculatedCash,
        bank: 0
      };
    }

    res.status(200).json({ data: result });
  } catch (err) {
    console.error("❌ getsaveCashBank Error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};


