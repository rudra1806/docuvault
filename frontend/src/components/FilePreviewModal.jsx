// ============================================================
// components/FilePreviewModal.jsx — File Preview Modal
// ============================================================
// Full-screen modal that renders files inline based on type:
// images, PDFs, text/code, or a fallback for unsupported types.
// ============================================================

import { useState, useEffect, useCallback } from "react";

// File types that can be previewed as text
const TEXT_TYPES = ["txt", "csv", "json", "xml", "html", "css", "js", "md"];

// File types that can be previewed as images
const IMAGE_TYPES = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"];

// File types that can be previewed as PDF
const PDF_TYPES = ["pdf"];

/**
 * Build the authenticated preview URL for iframes/images
 */
const getPreviewSrc = (docId) => {
  const token = localStorage.getItem("token");
  return `http://localhost:5000/api/documents/preview/${docId}?token=${token}`;
};

const FilePreviewModal = ({ document: doc, onClose, onDownload }) => {
  const [textContent, setTextContent] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState("");

  const fileType = doc?.fileType?.toLowerCase() || "";
  const isImage = IMAGE_TYPES.includes(fileType);
  const isPDF = PDF_TYPES.includes(fileType);
  const isText = TEXT_TYPES.includes(fileType);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Fetch text content for text-based files
  useEffect(() => {
    if (!isText || !doc) return;

    const fetchTextContent = async () => {
      setTextLoading(true);
      setTextError("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:5000/api/documents/preview/${doc._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) throw new Error("Failed to load preview");
        const text = await response.text();
        setTextContent(text);
      } catch (err) {
        console.error("Text preview error:", err);
        setTextError("Could not load file content.");
      } finally {
        setTextLoading(false);
      }
    };

    fetchTextContent();
  }, [doc, isText]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!doc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
      style={{ animation: "fadeIn 0.2s ease-out" }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] max-w-5xl flex flex-col overflow-hidden"
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${getTypeBadgeColor(
                fileType
              )}`}
            >
              {fileType.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-800 truncate">
                {doc.fileName}
              </h2>
              <p className="text-xs text-gray-400">
                {isImage
                  ? "Image Preview"
                  : isPDF
                  ? "PDF Preview"
                  : isText
                  ? "Text Preview"
                  : "File Details"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download button */}
            <button
              onClick={() => onDownload(doc._id, doc.fileName)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
              title="Download"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Close (Esc)"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Preview Body ────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
          {isImage ? (
            <img
              src={getPreviewSrc(doc._id)}
              alt={doc.fileName}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : isPDF ? (
            <iframe
              src={getPreviewSrc(doc._id)}
              title={doc.fileName}
              className="w-full h-full rounded-lg border-0 bg-white"
            />
          ) : isText ? (
            <div className="w-full h-full overflow-auto bg-gray-900 rounded-xl p-6 shadow-inner">
              {textLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-400 border-t-transparent" />
                </div>
              ) : textError ? (
                <p className="text-red-400 text-sm text-center">{textError}</p>
              ) : (
                <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {textContent}
                </pre>
              )}
            </div>
          ) : (
            /* ── Unsupported type fallback ──────────────── */
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-1">
                Preview not available
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                .{fileType.toUpperCase()} files can't be previewed in the
                browser.
              </p>
              <button
                onClick={() => onDownload(doc._id, doc.fileName)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Instead
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Animations ─────────────────────────────────────── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

/**
 * Returns badge color classes based on file type
 */
function getTypeBadgeColor(type) {
  switch (type) {
    case "pdf":
      return "text-red-500 bg-red-50";
    case "doc":
    case "docx":
      return "text-blue-500 bg-blue-50";
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return "text-green-500 bg-green-50";
    case "txt":
    case "csv":
      return "text-gray-600 bg-gray-100";
    case "json":
    case "xml":
    case "js":
    case "css":
    case "html":
      return "text-amber-600 bg-amber-50";
    default:
      return "text-purple-500 bg-purple-50";
  }
}

export default FilePreviewModal;
