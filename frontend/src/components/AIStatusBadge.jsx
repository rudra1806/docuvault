// ============================================================
// components/AIStatusBadge.jsx — AI Processing Status Badge
// ============================================================
// Small badge showing AI processing status on document cards.
// ============================================================

import { useState } from "react";
import { processDocument } from "../services/api";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    dotClass: "bg-muted-400",
    textClass: "text-muted-400",
    animate: false,
  },
  processing: {
    label: "Processing...",
    dotClass: "bg-primary-400",
    textClass: "text-primary-400",
    animate: true,
  },
  completed: {
    label: "AI Ready",
    dotClass: "bg-accent-emerald",
    textClass: "text-accent-emerald",
    animate: false,
  },
  failed: {
    label: "Failed",
    dotClass: "bg-accent-rose",
    textClass: "text-accent-rose",
    animate: false,
  },
  skipped: {
    label: "Skipped",
    dotClass: "bg-muted-500",
    textClass: "text-muted-500",
    animate: false,
  },
};

const AIStatusBadge = ({ status = "pending", documentId, chunkCount = 0 }) => {
  const [retrying, setRetrying] = useState(false);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const handleRetry = async (e) => {
    e.stopPropagation();
    if (!documentId || retrying) return;

    setRetrying(true);
    try {
      await processDocument(documentId);
    } catch (err) {
      console.error("Retry failed:", err);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Status dot */}
      <div
        className={`w-1.5 h-1.5 rounded-full ${config.dotClass} ${
          config.animate ? "animate-pulse" : ""
        }`}
      />

      {/* Status text */}
      <span className={`text-xs font-medium ${config.textClass}`}>
        {config.label}
      </span>

      {/* Chunk count for completed */}
      {status === "completed" && chunkCount > 0 && (
        <span className="text-xs text-muted-500">
          ({chunkCount} chunks)
        </span>
      )}

      {/* Retry button for failed */}
      {status === "failed" && documentId && (
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="text-xs text-primary-400 hover:text-primary-300 transition-colors ml-1 disabled:opacity-50"
          title="Retry AI processing"
        >
          {retrying ? "..." : "↻ Retry"}
        </button>
      )}
    </div>
  );
};

export default AIStatusBadge;
