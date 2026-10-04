// backend/controllers/DayBookController.js
import Transaction from "../model/Transaction.js";

// Get Day Book - All transactions for a specific date and location
export const getDayBook = async (req, res) => {
  try {
    const { locCode, date } = req.query;

    if (!locCode || !date) {
      return res.status(400).json({
        message: "LocCode and date are required"
      });
    }

    // Parse date to get start and end of day
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    // Get all transactions for the day
    // Check locCode field - transactions are stored with locCode
    const transactions = await Transaction.find({
      locCode: locCode,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ date: -1, createdAt: -1 });
    
    console.log(`📋 DayBook: Found ${transactions.length} transactions for locCode: ${locCode}, date: ${date}`);

    // Calculate totals
    let totalCash = 0;
    let totalRBL = 0;
    let totalBank = 0;
    let totalUPI = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(transaction => {
      const cash = parseInt(transaction.cash) || 0;
      const rbl = parseInt(transaction.rbl) || 0;
      const bank = parseInt(transaction.bank) || 0;
      const upi = parseInt(transaction.upi) || 0;
      const amount = parseInt(transaction.amount) || 0;

      totalCash += cash;
      totalRBL += rbl;
      totalBank += bank;
      totalUPI += upi;

      if (transaction.type === "Income") {
        totalIncome += amount;
      } else if (transaction.type === "Expense") {
        totalExpense += amount;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        transactions,
        summary: {
          totalCash,
          totalRBL,
          totalBank,
          totalUPI,
          totalIncome,
          totalExpense,
          netAmount: totalIncome - totalExpense,
          totalTransactions: transactions.length
        }
      }
    });

  } catch (error) {
    console.error("Get Day Book error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Get Day Book for multiple dates (date range)
export const getDayBookRange = async (req, res) => {
  try {
    const { locCode, dateFrom, dateTo } = req.query;

    if (!locCode || !dateFrom || !dateTo) {
      return res.status(400).json({
        message: "LocCode, dateFrom, and dateTo are required"
      });
    }

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    fromDate.setUTCHours(0, 0, 0, 0);
    toDate.setUTCHours(23, 59, 59, 999);

    const transactions = await Transaction.find({
      locCode: locCode,
      date: { $gte: fromDate, $lte: toDate }
    }).sort({ date: -1, createdAt: -1 });

    // Group transactions by date
    const groupedTransactions = {};
    let totalCash = 0;
    let totalRBL = 0;
    let totalBank = 0;
    let totalUPI = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(transaction => {
      const dateKey = transaction.date.toISOString().split('T')[0];
      
      if (!groupedTransactions[dateKey]) {
        groupedTransactions[dateKey] = {
          date: dateKey,
          transactions: [],
          dailySummary: {
            cash: 0,
            rbl: 0,
            bank: 0,
            upi: 0,
            income: 0,
            expense: 0
          }
        };
      }

      groupedTransactions[dateKey].transactions.push(transaction);

      const cash = parseInt(transaction.cash) || 0;
      const rbl = parseInt(transaction.rbl) || 0;
      const bank = parseInt(transaction.bank) || 0;
      const upi = parseInt(transaction.upi) || 0;
      const amount = parseInt(transaction.amount) || 0;

      groupedTransactions[dateKey].dailySummary.cash += cash;
      groupedTransactions[dateKey].dailySummary.rbl += rbl;
      groupedTransactions[dateKey].dailySummary.bank += bank;
      groupedTransactions[dateKey].dailySummary.upi += upi;

      totalCash += cash;
      totalRBL += rbl;
      totalBank += bank;
      totalUPI += upi;

      if (transaction.type === "Income") {
        groupedTransactions[dateKey].dailySummary.income += amount;
        totalIncome += amount;
      } else if (transaction.type === "Expense") {
        groupedTransactions[dateKey].dailySummary.expense += amount;
        totalExpense += amount;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        groupedTransactions: Object.values(groupedTransactions),
        overallSummary: {
          totalCash,
          totalRBL,
          totalBank,
          totalUPI,
          totalIncome,
          totalExpense,
          netAmount: totalIncome - totalExpense,
          totalTransactions: transactions.length
        }
      }
    });

  } catch (error) {
    console.error("Get Day Book Range error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};