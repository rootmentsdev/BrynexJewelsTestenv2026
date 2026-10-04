// controllers/TransactionController.js
import Transaction from "../model/Transaction.js";

export  const getEditedOverrides = async (req, res) => {
  const { fromDate, toDate, locCode } = req.query;

  const from = new Date(fromDate);
  const to = new Date(toDate);

  const edited = await Transaction.find({
    locCode,
    date: { $gte: from, $lte: to },
    editedBy: { $exists: true }
  });

  const formatted = edited.map(tx => ({
    ...tx._doc,
    invoiceNo: String(tx.invoiceNo).trim(),
    cash: Number(tx.cash || 0),
    bank: Number(tx.bank || 0),
    upi: Number(tx.upi || 0),
    amount: Number(tx.cash || 0) + Number(tx.bank || 0) + Number(tx.upi || 0),
    totalTransaction: Number(tx.cash || 0) + Number(tx.bank || 0) + Number(tx.upi || 0),
  }));

  res.status(200).json({ data: formatted });
};


