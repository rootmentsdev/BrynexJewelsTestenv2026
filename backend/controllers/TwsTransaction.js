
import axios from "axios";
import TransactionHistory from "../model/Transactionhistory.js";

export const getMergedTransactions = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // 1. Fetch TWS transactions from external API
    const twsResponse = await axios.get("https://rentalapi.rootments.live/api/GetTransactionList", {
      params: { DateFrom: fromDate, DateTo: toDate }
    });

    const twsTransactions = twsResponse.data || [];

    // 2. Fetch latest MongoDB edits grouped by invoiceNo
    const history = await TransactionHistory.aggregate([
      { $match: { historyType: "EDIT" } },
      { $sort: { changedAt: -1 } },
      {
        $group: {
          _id: "$invoiceNo",
          latestEdit: { $first: "$newData" }
        }
      }
    ]);

    // 3. Create a map of invoiceNo → edited data (with fallback values)
    const editMap = new Map();
    history.forEach(item => {
      const invoiceNo = String(item._id).trim();
      const edit = item.latestEdit;

      editMap.set(invoiceNo, {
        ...edit,
        invoiceNo, // ✅ ensure it's available in merged response
          customerName: edit.customerName || edit.customer || "",
        cash: Number(edit.cash || 0),
        bank: Number(edit.bank || 0),
        upi: Number(edit.upi || 0),
        amount: Number(edit.cash || 0) + Number(edit.bank || 0) + Number(edit.upi || 0),
        totalTransaction: Number(edit.cash || 0) + Number(edit.bank || 0) + Number(edit.upi || 0),
      });
    });

    // 4. Replace TWS data with MongoDB edited data if exists
    const merged = twsTransactions.map(tx => {
      const invoiceKey = String(tx.invoiceNo).trim();
      const edited = editMap.get(invoiceKey);
      return edited
        ? { ...tx, ...edited, source: "edited" }  // edited overrides original
        : { ...tx, source: "tws" };
    });

    return res.status(200).json({ data: merged });
    // Sort merged by date ascending
    merged.sort((a, b) => new Date(a.date) - new Date(b.date));

  } catch (err) {
    console.error("getMergedTransactions error:", err.message);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
