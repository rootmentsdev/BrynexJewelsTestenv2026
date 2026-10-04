// backend/utils/nextPurchaseOrder.js
import Counter from "../model/Counter.js";

export async function nextPurchaseOrder() {
  // Use "PO" as the counter ID for purchase orders
  const doc = await Counter.findOneAndUpdate(
    { _id: "PO" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  // Format as PO-00001, PO-00002, etc.
  const paddedSeq = String(doc.seq).padStart(5, "0");
  return `PO-${paddedSeq}`;
}

