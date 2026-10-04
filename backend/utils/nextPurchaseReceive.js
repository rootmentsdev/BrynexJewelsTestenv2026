// backend/utils/nextPurchaseReceive.js
import Counter from "../model/Counter.js";

export async function nextPurchaseReceive() {
  // Use "PR" as the counter ID for purchase receives
  const doc = await Counter.findOneAndUpdate(
    { _id: "PR" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  // Format as PR-00001, PR-00002, etc.
  const paddedSeq = String(doc.seq).padStart(5, "0");
  return `PR-${paddedSeq}`;
}












