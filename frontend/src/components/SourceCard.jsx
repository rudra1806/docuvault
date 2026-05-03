// ============================================================
// components/SourceCard.jsx — Source Citation Card
// ============================================================
// Displays a source document reference with human-readable
// location info (Page, Slide, Sheet) instead of raw scores.
// ============================================================

import { useState } from "react";

// File type icon colors
const TYPE_COLORS = {
  pdf: "text-red-400 bg-red-500/10 border-red-500/20",
  docx: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  doc: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  txt: "text-muted-300 bg-muted-500/10 border-muted-500/20",
  xlsx: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  xls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  csv: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  pptx: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  ppt: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  jpg: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  jpeg: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  png: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  gif: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  webp: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  json: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  xml: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  zip: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  rar: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

// Location icon based on file type
const getLocationIcon = (fileType) => {
  const type = (fileType || "").toLowerCase();
  if (type === "pdf" || type === "docx" || type === "doc" || type === "txt") {
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  if (type === "pptx" || type === "ppt") {
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  }
  if (type === "xlsx" || type === "xls" || type === "csv") {
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  // Default: generic location icon
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
};

const SourceCard = ({ source, onPreview }) => {
  const [expanded, setExpanded] = useState(false);
  const ext = source.file_type || source.file?.split(".").pop()?.toLowerCase() || "";
  const colorClass = TYPE_COLORS[ext] || "text-muted-300 bg-muted-500/10 border-muted-500/20";

  // Use the location field from backend, or generate a fallback
  const location = source.location || `Section ${(source.chunk_index || 0) + 1}`;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-all duration-300 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        {/* File type badge */}
        <div
          className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${colorClass}`}
        >
          <span className="text-xs font-bold uppercase">
            {ext.slice(0, 4) || "?"}
          </span>
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-200 truncate">
            {source.file || "Unknown file"}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-400 mt-0.5">
            {getLocationIcon(ext)}
            <span>{location}</span>
          </div>
        </div>

        {/* Expand/collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-500 hover:text-muted-300 transition-colors p-1"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded snippet */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-white/[0.04]">
          <p className="text-xs text-muted-400 mt-2 leading-relaxed whitespace-pre-wrap">
            {source.snippet || "No preview available"}
          </p>
        </div>
      )}
    </div>
  );
};

export default SourceCard;
