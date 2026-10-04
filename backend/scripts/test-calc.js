import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../model/Transaction.js';

dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env' });

const dbURI = process.env.MONGODB_URI || process.env.MONGODB_URI_DEV || process.env.MONGODB_URI_PROD;
await mongoose.connect(dbURI);

const targetDate = new Date('2026-08-31');
const startOfDay = new Date(targetDate); startOfDay.setHours(0,0,0,0);
const endOfDay = new Date(targetDate); endOfDay.setHours(23,59,59,999);

const dateStr = '2026-08-31';
const locCode = '707';

let twsTransactions = [];
const twsBase = "https://rentalapi.rootments.live/api/GetBooking";

const [bookingRes, rentoutRes, returnRes, deleteRes] = await Promise.all([
  fetch(`${twsBase}/GetBookingList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`),
  fetch(`${twsBase}/GetRentoutList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`),
  fetch(`${twsBase}/GetReturnList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`),
  fetch(`${twsBase}/GetDeleteList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`)
]);

if (returnRes.ok) {
  const retData = await returnRes.json();
  (retData?.dataSet?.data || []).forEach(item => {
    twsTransactions.push({ invoiceNo: String(item.invoiceNo || '').trim(), customerName: item.customerName, category: 'return', cash: -Math.abs(Number(item.returnCashAmount || 0)) });
  });
}

const mongoTxs = await Transaction.find({ locCode, date: { $gte: startOfDay, $lte: endOfDay } });

console.log('TWS Returns:', twsTransactions);
console.log('Mongo Txs:', mongoTxs.map(t => ({ invoiceNo: t.invoiceNo, name: t.customerName, type: t.type, cash: t.cash })));

await mongoose.disconnect();
