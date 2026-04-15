// ============================================================
// components/FileCard.jsx — Document Card (Midnight Vault)
// ============================================================

import { useState } from "react";
import AIStatusBadge from "./AIStatusBadge";

const getFileIcon = (fileType) => {
  const type = fileType?.toLowerCase();
  switch (type) {
    case "pdf":
      return { color: "text-red-400 bg-red-500/10 border-red-500/20", label: "PDF" };
    case "doc":
    case "docx":
      return { color: "text-blue-400 bg-blue-500/10 border-blue-500/20", label: "DOC" };
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return { color: "text-sky-400 bg-sky-500/10 border-sky-500/20", label: "IMG" };
    case "txt":
      return { color: "text-muted-300 bg-muted-500/20 border-muted-500/30", label: "TXT" };
    case "json":
    case "xml":
    case "csv":
      return { color: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: type.toUpperCase() };
    case "xls":
    case "xlsx":
      return { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "XLS" };
    case "ppt":
    case "pptx":
      return { color: "text-orange-400 bg-orange-500/10 border-orange-500/20", label: "PPT" };
    case "zip":
    case "rar":
      return { color: "text-violet-400 bg-violet-500/10 border-violet-500/20", label: "ZIP" };
    default:
      return { color: "text-primary-400 bg-primary-500/10 border-primary-500/20", label: "FILE" };
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const FileCard = ({ document, onDownload, onDelete, onPreview, onShare }) => {
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
      className="card p-4 sm:p-5 flex items-center gap-4 group cursor-pointer hover:bg-white/[0.05] hover:border-primary-500/15 transition-all duration-300"
      onClick={() => onPreview(document)}
    >
      {/* ── File Type Badge ─────────────────────────────── */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-xs border shrink-0 ${color}`}>
        {label}
      </div>

      {/* ── File Info ────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-muted-100 truncate group-hover:text-white transition-colors duration-300">
          {document.fileName}
        </h3>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-xs text-muted-400">
            {formatDate(document.uploadDate)}
          </p>
          <AIStatusBadge
            status={document.aiStatus}
            documentId={document._id}
            chunkCount={document.chunkCount}
          />
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 transition-all duration-300 shrink-0">
        {/* Share Button */}
        {onShare && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(document);
            }}
            className="p-2 rounded-lg text-muted-400 hover:text-primary-400 hover:bg-primary-500/10 transition-all duration-200"
            title="Share"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        )}

        {/* Preview Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview(document);
          }}
          className="p-2 rounded-lg text-muted-400 hover:text-accent-sky hover:bg-accent-sky/10 transition-all duration-200"
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
          className="p-2 rounded-lg text-muted-400 hover:text-primary-400 hover:bg-primary-500/10 transition-all duration-200"
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
          className="p-2 rounded-lg text-muted-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50"
          title="Delete"
        >
          {isDeleting ? (
            <div className="w-5 h-5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
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
