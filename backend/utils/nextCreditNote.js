// backend/utils/nextCreditNote.js
import Counter from "../model/Counter.js";

export async function nextCreditNote(prefix = "CN-") {
  // Use prefix as part of counter ID, default to "CN" for backward compatibility
  const counterId = prefix.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "CN";
  const doc = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  // Format with custom prefix: prefix-00001, prefix-00002, etc.
  const paddedSeq = String(doc.seq).padStart(5, "0");
  // Remove trailing dash if prefix already has one
  const cleanPrefix = prefix.endsWith("-") ? prefix.slice(0, -1) : prefix;
  return `${cleanPrefix}-${paddedSeq}`;
}

