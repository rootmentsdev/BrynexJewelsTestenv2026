// backend/utils/nextInvoice.js
import Counter from "../model/Counter.js";

export async function nextInvoice(locCode) {
  const doc = await Counter.findOneAndUpdate(
    { _id: locCode },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${locCode}-${doc.seq}`;   // e.g. "144-57"
}
