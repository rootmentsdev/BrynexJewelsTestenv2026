import CloseTransaction from "../model/Closing.js";
import Transaction from "../model/Transaction.js";

/**
 * Automatically propagates a cash balance change to CloseTransaction records.
 * @param {string} locCode - Branch location code
 * @param {string|Date} dateInput - Transaction date or day close date
 * @param {number} cashDiff - Cash difference (newCash - oldCash)
 * @param {boolean} includeCurrentDay - If true, updates CloseTransaction for current date as well; if false, updates only next day and beyond.
 */
export const propagateCashDiff = async (locCode, dateInput, cashDiff, includeCurrentDay = true) => {
  if (!locCode || !dateInput || !cashDiff || isNaN(Number(cashDiff)) || Number(cashDiff) === 0) {
    return;
  }

  const diff = Number(cashDiff);

  // Robust universal date parser (handles DD-MM-YYYY, YYYY-MM-DD, ISO strings, Date objects)
  let targetDate;
  if (dateInput instanceof Date) {
    targetDate = dateInput;
  } else if (typeof dateInput === 'string') {
    const cleanStr = dateInput.trim().split('T')[0];
    if (cleanStr.includes('-')) {
      const parts = cleanStr.split('-');
      if (parts[0].length === 2 && parts[2]?.length === 4) {
        // DD-MM-YYYY format
        const [dd, mm, yyyy] = parts;
        targetDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
      } else {
        // YYYY-MM-DD format
        targetDate = new Date(`${cleanStr}T00:00:00.000Z`);
      }
    } else {
      targetDate = new Date(dateInput);
    }
  } else {
    targetDate = new Date(dateInput);
  }

  if (isNaN(targetDate.getTime())) {
    console.warn(`⚠️ Invalid date passed to propagateCashDiff: ${dateInput}`);
    return;
  }

  // Format as UTC YYYY-MM-DD string
  const year = targetDate.getUTCFullYear();
  const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  // Start query date at UTC midnight
  let startQueryDate = new Date(`${dateStr}T00:00:00.000Z`);

  if (!includeCurrentDay) {
    // For day close update on date D, current day is already saved, so propagate to date >= D+1
    startQueryDate.setUTCDate(startQueryDate.getUTCDate() + 1);
  }

  console.log(`🔄 Propagating cash diff (${diff}) for locCode=${locCode} from date >= ${startQueryDate.toISOString()}`);

  try {
    const updateResult = await CloseTransaction.updateMany(
      {
        locCode: String(locCode),
        date: { $gte: startQueryDate }
      },
      {
        $inc: { cash: diff }
      }
    );

    console.log(`✅ Cash diff propagation complete for locCode=${locCode}: matched ${updateResult.matchedCount}, modified ${updateResult.modifiedCount}`);
  } catch (err) {
    console.error(`❌ Error in propagateCashDiff for locCode=${locCode}:`, err);
  }
};

/**
 * Dynamically calculates the exact total closing cash for a location and date.
 * Ensures the previous day's closing cash always equals opening balance + net day cash.
 */
export const calculateTotalCashForDate = async (locCode, dateInput) => {
  if (!locCode || !dateInput) return null;

  let targetDate;
  if (dateInput instanceof Date) {
    targetDate = dateInput;
  } else if (typeof dateInput === 'string') {
    const cleanStr = dateInput.trim().split('T')[0];
    if (cleanStr.includes('-')) {
      const parts = cleanStr.split('-');
      if (parts[0].length === 2 && parts[2]?.length === 4) {
        const [dd, mm, yyyy] = parts;
        targetDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
      } else {
        targetDate = new Date(`${cleanStr}T00:00:00.000Z`);
      }
    } else {
      targetDate = new Date(dateInput);
    }
  } else {
    targetDate = new Date(dateInput);
  }

  if (isNaN(targetDate.getTime())) return null;

  const year = targetDate.getUTCFullYear();
  const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  // 1. Fetch TWS External Transactions
  let twsTransactions = [];
  const twsBase = "https://rentalapi.rootments.live/api/GetBooking";

  try {
    const [bookingRes, rentoutRes, returnRes, deleteRes] = await Promise.all([
      fetch(`${twsBase}/GetBookingList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`),
      fetch(`${twsBase}/GetRentoutList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`),
      fetch(`${twsBase}/GetReturnList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`),
      fetch(`${twsBase}/GetDeleteList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`)
    ]);

    if (bookingRes.ok) {
      const bData = await bookingRes.json();
      (bData?.dataSet?.data || []).forEach(item => {
        const cash = Number(item.bookingCashAmount || 0);
        twsTransactions.push({ invoiceNo: String(item.invoiceNo || '').trim(), category: 'booking', cash });
      });
    }
    if (rentoutRes.ok) {
      const rData = await rentoutRes.json();
      (rData?.dataSet?.data || []).forEach(item => {
        const cash = Number(item.rentoutCashAmount || 0);
        twsTransactions.push({ invoiceNo: String(item.invoiceNo || '').trim(), category: 'rentout', cash });
      });
    }
    if (returnRes.ok) {
      const retData = await returnRes.json();
      (retData?.dataSet?.data || []).forEach(item => {
        const cash = -Math.abs(Number(item.returnCashAmount || 0));
        twsTransactions.push({ invoiceNo: String(item.invoiceNo || '').trim(), category: 'return', cash });
      });
    }
    if (deleteRes.ok) {
      const dData = await deleteRes.json();
      (dData?.dataSet?.data || []).forEach(item => {
        const cash = -Math.abs(Number(item.deleteCashAmount || 0));
        twsTransactions.push({ invoiceNo: String(item.invoiceNo || '').trim(), category: 'cancel', cash });
      });
    }
  } catch (err) {
    console.warn(`⚠️ Error fetching TWS transactions for ${locCode} on ${dateStr}:`, err.message);
  }

  // 2. Fetch Mongo Transactions (includes edits and overrides)
  const mongoTxs = await Transaction.find({
    locCode,
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  // Map Mongo transactions by invoiceNo and invoiceNo-category
  const mongoMap = new Map();
  const mongoOnlyTxs = [];

  mongoTxs.forEach(tx => {
    const invKey = String(tx.invoiceNo || "").trim();
    const catKey = String(tx.type || tx.category || "").toLowerCase();
    if (invKey) {
      mongoMap.set(`${invKey}-${catKey}`, tx);
      mongoMap.set(invKey, tx);
    }
    mongoOnlyTxs.push(tx);
  });

  // 3. Combine TWS + Mongo using override logic
  let netDayCash = 0;
  const processedKeys = new Set();

  twsTransactions.forEach(tws => {
    const invKey = tws.invoiceNo;
    const compositeKey = `${invKey}-${tws.category}`;
    const override = (invKey && mongoMap.get(compositeKey)) || (invKey && mongoMap.get(invKey));

    if (override) {
      netDayCash += Number(override.cash || 0);
      processedKeys.add(override._id.toString());
    } else {
      netDayCash += Number(tws.cash || 0);
    }
  });

  // Add remaining Mongo transactions that were NOT overrides for TWS items (e.g. standalone Income/Expense/Booking)
  mongoOnlyTxs.forEach(tx => {
    if (!processedKeys.has(tx._id.toString())) {
      netDayCash += Number(tx.cash || 0);
    }
  });

  // 4. Fetch Previous Day Opening Cash
  const prevDate = new Date(startOfDay);
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);

  const prevStart = new Date(prevDate); prevStart.setUTCHours(0, 0, 0, 0);
  const prevEnd = new Date(prevDate); prevEnd.setUTCHours(23, 59, 59, 999);

  const prevDoc = await CloseTransaction.findOne({
    locCode,
    date: { $gte: prevStart, $lte: prevEnd }
  });

  const openingCash = prevDoc ? Number(prevDoc.cash || 0) : 0;
  const totalCalculatedCash = openingCash + netDayCash;

  return {
    dateStr,
    startOfDay,
    endOfDay,
    openingCash,
    netDayCash,
    totalCalculatedCash
  };
};
