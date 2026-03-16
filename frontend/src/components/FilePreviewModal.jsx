// ============================================================
// components/FilePreviewModal.jsx — File Preview (Midnight Vault)
// ============================================================

import { useState, useEffect, useCallback } from "react";

const TEXT_TYPES = ["txt", "csv", "json", "xml", "html", "css", "js", "md"];
const IMAGE_TYPES = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"];
const PDF_TYPES = ["pdf"];

const getPreviewSrc = (docId) => {
  const token = localStorage.getItem("token");
  return `http://localhost:5000/api/documents/preview/${docId}?token=${token}`;
};

function getTypeBadgeColor(type) {
  switch (type) {
    case "pdf":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    case "doc":
    case "docx":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return "text-sky-400 bg-sky-500/10 border-sky-500/20";
    case "txt":
    case "csv":
      return "text-muted-300 bg-muted-500/20 border-muted-500/30";
    case "json":
    case "xml":
    case "js":
    case "css":
    case "html":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    default:
      return "text-primary-400 bg-primary-500/10 border-primary-500/20";
  }
}

const FilePreviewModal = ({ document: doc, onClose, onDownload }) => {
  const [textContent, setTextContent] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState("");

  const fileType = doc?.fileType?.toLowerCase() || "";
  const isImage = IMAGE_TYPES.includes(fileType);
  const isPDF = PDF_TYPES.includes(fileType);
  const isText = TEXT_TYPES.includes(fileType);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
      style={{ animation: "modalFadeIn 0.2s ease-out" }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative bg-surface-300 rounded-2xl shadow-2xl w-[95vw] h-[90vh] max-w-5xl flex flex-col overflow-hidden border border-white/[0.06]"
        style={{ animation: "modalSlideUp 0.25s ease-out" }}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-surface-400/80">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-xs shrink-0 border ${getTypeBadgeColor(fileType)}`}
            >
              {fileType.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white truncate">
                {doc.fileName}
              </h2>
              <p className="text-xs text-muted-400">
                {isImage ? "Image Preview" : isPDF ? "PDF Preview" : isText ? "Text Preview" : "File Details"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onDownload(doc._id, doc.fileName)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary-400 hover:bg-primary-500/10 transition-colors duration-200"
              title="Download"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted-400 hover:text-white hover:bg-white/[0.06] transition-colors duration-200"
              title="Close (Esc)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Preview Body ────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-surface-500/50 flex items-center justify-center p-4">
          {isImage ? (
            <img
              src={getPreviewSrc(doc._id)}
              alt={doc.fileName}
              className="max-w-full max-h-full object-contain rounded-lg"
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
            <div className="w-full h-full overflow-auto bg-surface-600/50 rounded-xl p-6 border border-white/[0.04]">
              {textLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
                </div>
              ) : textError ? (
                <p className="text-red-400 text-sm text-center">{textError}</p>
              ) : (
                <pre className="text-sm text-emerald-400/80 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {textContent}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 bg-muted-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/[0.06]">
                <svg className="w-10 h-10 text-muted-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-display font-semibold text-muted-200 mb-1">
                Preview not available
              </h3>
              <p className="text-sm text-muted-400 mb-6">
                .{fileType.toUpperCase()} files can't be previewed in the browser.
              </p>
              <button
                onClick={() => onDownload(doc._id, doc.fileName)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Instead
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Animations ─────────────────────────────────────── */}
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default FilePreviewModal;
