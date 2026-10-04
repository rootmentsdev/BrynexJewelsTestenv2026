// Recalculation Script: Fix and Sync Historical CloseTransaction Cash Balances
// Recalculates closing cash balance for each day sequentially and propagates opening balances.
//
// Usage:
//   node scripts/recalculate-close-balances.js [locCode]
//
// Options:
//   locCode : Optional - recalculate specific location code only (e.g., node scripts/recalculate-close-balances.js 702)

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import CloseTransaction from '../model/Closing.js';
import Transaction from '../model/Transaction.js';
import { calculateTotalCashForDate } from '../utils/cashPropagation.js';

// Load environment variables
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config({ path: '.env' });
}

const connectMongoDB = async () => {
  const dbURI =
    process.env.MONGODB_URI ||
    (env === 'production'
      ? process.env.MONGODB_URI_PROD
      : process.env.MONGODB_URI_DEV);

  if (!dbURI) {
    console.error('❌ MONGODB_URI is not defined in environment file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(dbURI);
    console.log(`✅ MongoDB connected successfully.`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Fetch external TWS transactions for a specific date and locCode
async function fetchTwsCashForDate(locCode, dateStr) {
  let twsCash = 0;
  const twsBase = "https://rentalapi.rootments.live/api/GetBooking";

  try {
    // 1. Bookings
    const bookingRes = await fetch(`${twsBase}/GetBookingList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`);
    if (bookingRes.ok) {
      const bData = await bookingRes.json();
      (bData?.dataSet?.data || []).forEach(item => {
        twsCash += Number(item.bookingCashAmount || 0);
      });
    }

    // 2. Rentouts
    const rentoutRes = await fetch(`${twsBase}/GetRentoutList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`);
    if (rentoutRes.ok) {
      const rData = await rentoutRes.json();
      (rData?.dataSet?.data || []).forEach(item => {
        twsCash += Number(item.rentoutCashAmount || 0);
      });
    }

    // 3. Returns (negative cash)
    const returnRes = await fetch(`${twsBase}/GetReturnList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`);
    if (returnRes.ok) {
      const retData = await returnRes.json();
      (retData?.dataSet?.data || []).forEach(item => {
        twsCash -= Math.abs(Number(item.returnCashAmount || 0));
      });
    }

    // 4. Cancels/Deletes (negative cash)
    const deleteRes = await fetch(`${twsBase}/GetDeleteList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`);
    if (deleteRes.ok) {
      const dData = await deleteRes.json();
      (dData?.dataSet?.data || []).forEach(item => {
        twsCash -= Math.abs(Number(item.deleteCashAmount || 0));
      });
    }
  } catch (err) {
    console.warn(`⚠️ Error fetching TWS transactions for ${locCode} on ${dateStr}:`, err.message);
  }

  return twsCash;
}

// Fetch MongoDB transactions for a specific date and locCode
async function fetchMongoCashForDate(locCode, startOfDay, endOfDay) {
  const mongoTxs = await Transaction.find({
    locCode,
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  let mongoCash = 0;
  mongoTxs.forEach(tx => {
    mongoCash += Number(tx.cash || 0);
  });

  return mongoCash;
}

async function recalculate() {
  const targetLocCode = process.argv[2];

  await connectMongoDB();

  const query = targetLocCode ? { locCode: targetLocCode } : {};

  // Find all distinct location codes in CloseTransaction
  const locCodes = targetLocCode
    ? [targetLocCode]
    : await CloseTransaction.distinct('locCode');

  console.log(`\n🔍 Found ${locCodes.length} location(s) to process: ${locCodes.join(', ')}\n`);

  for (const locCode of locCodes) {
    console.log(`==================================================`);
    console.log(`📍 Processing Location: ${locCode}`);
    console.log(`==================================================`);

    const closeDocs = await CloseTransaction.find({ locCode }).sort({ date: 1 });
    console.log(`  Found ${closeDocs.length} closed day record(s)`);

    if (closeDocs.length === 0) continue;

    let updatedCount = 0;
    let runningOpeningCash = null;

    for (let i = 0; i < closeDocs.length; i++) {
      const doc = closeDocs[i];
      const docDate = new Date(doc.date);
      const dateStr = docDate.toISOString().split('T')[0];

      const startOfDay = new Date(docDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(docDate);
      endOfDay.setHours(23, 59, 59, 999);

      // On the first closed day, use its existing opening cash baseline (or 0)
      if (runningOpeningCash === null) {
        // If previous day close exists before this doc, fetch it
        const prevDoc = await CloseTransaction.findOne({
          locCode,
          date: { $lt: startOfDay }
        }).sort({ date: -1 });

        runningOpeningCash = prevDoc ? Number(prevDoc.cash || 0) : 0;
      }

      // Calculate exact total cash for this date using override logic
      const calcResult = await calculateTotalCashForDate(locCode, dateStr);
      const newClosingCash = calcResult ? calcResult.totalCalculatedCash : (runningOpeningCash + (await fetchTwsCashForDate(locCode, dateStr)));
      const oldClosingCash = Number(doc.cash || 0);

      if (oldClosingCash !== newClosingCash) {
        console.log(`  📅 ${dateStr}: Old Closing Cash=${oldClosingCash} ➔ New Closing Cash=${newClosingCash}`);
        doc.cash = newClosingCash;
        await doc.save();
        updatedCount++;
      } else {
        console.log(`  ✅ ${dateStr}: Closing Cash intact=${newClosingCash}`);
      }

      // Today's closing cash becomes tomorrow's opening cash
      runningOpeningCash = newClosingCash;
    }

    console.log(`\n🎉 Location ${locCode} finished: ${updatedCount} record(s) updated.\n`);
  }

  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
}

recalculate().catch(err => {
  console.error('❌ Recalculation failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
