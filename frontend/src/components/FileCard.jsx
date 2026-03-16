// ============================================================
// components/FileCard.jsx — Document Card Component
// ============================================================
// Displays a single document with info, preview, download, and delete.
// ============================================================

import { useState } from "react";

/**
 * getFileIcon()
 * Returns an SVG icon and color based on the file extension.
 */
const getFileIcon = (fileType) => {
  const type = fileType?.toLowerCase();
  switch (type) {
    case "pdf":
      return { color: "text-red-500 bg-red-50", label: "PDF" };
    case "doc":
    case "docx":
      return { color: "text-blue-500 bg-blue-50", label: "DOC" };
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return { color: "text-green-500 bg-green-50", label: "IMG" };
    case "txt":
      return { color: "text-gray-500 bg-gray-100", label: "TXT" };
    case "json":
    case "xml":
    case "csv":
      return { color: "text-amber-500 bg-amber-50", label: type.toUpperCase() };
    case "xls":
    case "xlsx":
      return { color: "text-emerald-600 bg-emerald-50", label: "XLS" };
    case "ppt":
    case "pptx":
      return { color: "text-orange-500 bg-orange-50", label: "PPT" };
    case "zip":
    case "rar":
      return { color: "text-yellow-600 bg-yellow-50", label: "ZIP" };
    default:
      return { color: "text-purple-500 bg-purple-50", label: "FILE" };
  }
};

/**
 * formatDate()
 * Converts a date string to a human-readable format.
 */
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const FileCard = ({ document, onDownload, onDelete, onPreview }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { color, label } = getFileIcon(document.fileType);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${document.fileName}"?`)) {
      setIsDeleting(true);
      await onDelete(document._id);
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="card p-5 flex items-center gap-4 group cursor-pointer"
      onClick={() => onPreview(document)}
    >
      {/* ── File Type Badge ──────────────────────────────── */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${color}`}>
        {label}
      </div>

      {/* ── File Info ────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-800 truncate">
          {document.fileName}
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDate(document.uploadDate)}
        </p>
      </div>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Preview Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview(document);
          }}
          className="p-2 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors"
          title="Preview"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>

        {/* Download Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload(document._id, document.fileName);
          }}
          className="p-2 rounded-lg text-primary-500 hover:bg-primary-50 transition-colors"
          title="Download"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={isDeleting}
          className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
          title="Delete"
        >
          {isDeleting ? (
            <div className="w-5 h-5 animate-spin rounded-full border-2 border-red-400 border-t-transparent"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default FileCard;
