// utils/parseBase64.js
export default function parseBase64(dataUrl) {
  if (!dataUrl) return null;

  // "data:image/png;base64,AAAA…" → ["image/png","AAAA…"]
  const m = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!m) throw new Error("Invalid base-64 string");

  const contentType = m[1];              // image/png
  const ext         = contentType.split("/")[1] || "bin";
  const buffer      = Buffer.from(m[2], "base64");

  const filename    = `attachment.${ext}`;   // you can improve this

  return { filename, contentType, data: buffer };
}
