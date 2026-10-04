// backend/utils/nextStoreOrder.js
import Counter from "../model/Counter.js";

export async function nextStoreOrder() {
  // Use "SO" as the counter ID for store orders
  const doc = await Counter.findOneAndUpdate(
    { _id: "SO" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  // Format as SO-00001, SO-00002, etc.
  const paddedSeq = String(doc.seq).padStart(5, "0");
  return `SO-${paddedSeq}`;
}
