// backend/utils/nextInventoryAdjustment.js
import Counter from "../model/Counter.js";

export async function nextInventoryAdjustment(prefix = "IA-") {
  // Use "IA" as the counter ID for inventory adjustments
  const doc = await Counter.findOneAndUpdate(
    { _id: "IA" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  // Format as IA-00001, IA-00002, etc.
  const paddedSeq = String(doc.seq).padStart(5, "0");
  return `${prefix}${paddedSeq}`;
}

