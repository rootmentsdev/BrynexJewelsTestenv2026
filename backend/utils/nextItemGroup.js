// backend/utils/nextItemGroup.js
import Counter from "../model/Counter.js";

export async function nextItemGroup() {
  // Use "GRP" as the counter ID for item groups
  const doc = await Counter.findOneAndUpdate(
    { _id: "GRP" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  // Format as GRP-00001, GRP-00002, etc.
  const paddedSeq = String(doc.seq).padStart(5, "0");
  return `GRP-${paddedSeq}`;
}

