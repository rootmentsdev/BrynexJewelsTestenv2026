import { Download, FileText, X } from "lucide-react";

/**
 * Component to display attachments/images
 * Can show images as thumbnails or files as downloadable links
 */
const AttachmentDisplay = ({ attachments = [] }) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  // Separate images and documents
  const images = attachments.filter(att => att.contentType?.startsWith("image/"));
  const documents = attachments.filter(att => !att.contentType?.startsWith("image/"));

  const downloadAttachment = (attachment) => {
    if (!attachment.data) return;

    // If data is already a data URL, download directly
    if (typeof attachment.data === "string" && attachment.data.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = attachment.data;
      link.download = attachment.filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Try to convert base64 to blob for download
    try {
      const byteCharacters = atob(attachment.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: attachment.contentType || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Error downloading file");
    }
  };

  return (
    <div className="space-y-6">
      {/* Images Section */}
      {images.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#1f2937] mb-4 uppercase tracking-[0.18em]">
            Attached Images ({images.length})
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {images.map((image, idx) => {
              // Get image src - prefer data URL format
              let imageSrc = "";
              if (image.data) {
                if (typeof image.data === "string" && image.data.startsWith("data:")) {
                  imageSrc = image.data;
                } else if (typeof image.data === "string" && image.data.length > 0) {
                  // Add data URL prefix if it's base64 without prefix
                  imageSrc = `data:${image.contentType || "image/jpeg"};base64,${image.data}`;
                }
              }

              // Only render img if we have a valid src
              return (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-lg border border-[#e6eafb] bg-[#f8f9ff] hover:shadow-md transition-shadow"
                >
                  {imageSrc && (
                    <>
                      <img
                        src={imageSrc}
                        alt={image.filename || `Image ${idx + 1}`}
                        className="h-32 w-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => downloadAttachment(image)}
                          className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg hover:bg-gray-100"
                          title="Download image"
                        >
                          <Download size={16} className="text-[#2563eb]" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                        <p className="text-xs text-white truncate">{image.filename || `Image ${idx + 1}`}</p>
                      </div>
                    </>
                  )}
                  {!imageSrc && (
                    <div className="h-32 w-full flex items-center justify-center bg-gray-100">
                      <span className="text-xs text-gray-500">Image unavailable</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documents Section */}
      {documents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#1f2937] mb-4 uppercase tracking-[0.18em]">
            Attached Documents ({documents.length})
          </h3>
          <div className="space-y-2">
            {documents.map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-[#e6eafb] bg-[#f8f9ff] hover:bg-[#eef2ff] transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText size={20} className="text-[#2563eb] flex-shrink-0" />
                  <span className="text-sm text-[#1f2937] truncate">{doc.filename || `Document ${idx + 1}`}</span>
                </div>
                <button
                  onClick={() => downloadAttachment(doc)}
                  className="ml-2 p-2 hover:bg-[#d7dcf5] rounded-md transition-colors flex-shrink-0"
                  title="Download document"
                >
                  <Download size={16} className="text-[#2563eb]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentDisplay;
