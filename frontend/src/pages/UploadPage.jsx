// ============================================================
// pages/UploadPage.jsx — Document Upload (Midnight Vault)
// ============================================================

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDocument } from "../services/api";
import Navbar from "../components/Navbar";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-rar-compressed",
  "application/json",
  "application/xml",
  "text/xml",
];

const FILE_CATEGORIES = [
  { 
    label: 'Documents', 
    exts: ['PDF', 'DOC', 'DOCX', 'TXT'],
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
  },
  { 
    label: 'Spreadsheets', 
    exts: ['XLS', 'XLSX', 'CSV'],
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  { 
    label: 'Presentations', 
    exts: ['PPT', 'PPTX'],
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  },
  { 
    label: 'Images', 
    exts: ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'],
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  },
  { 
    label: 'Data & Archives', 
    exts: ['JSON', 'XML', 'ZIP', 'RAR'],
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
];

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileSelect = (selectedFile) => {
    setError("");
    setSuccess(false);

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError("Unsupported file format. Please check the accepted types below.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10 MB");
      return;
    }

    setFile(selectedFile);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      await uploadDocument(formData, {
        onUploadProgress: (event) => {
          const percent = Math.round((event.loaded * 100) / event.total);
          setProgress(percent);
        },
      });

      setProgress(100);
      setSuccess(true);
      setFile(null);
      setTimeout(() => navigate("/documents"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileExt = (name) => name?.split('.').pop()?.toUpperCase() || 'FILE';

  return (
    <div className="min-h-screen bg-surface-500">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="opacity-0 animate-fade-up">
          <h1 className="text-2xl font-display font-bold text-white mb-2">Upload Document</h1>
          <p className="text-muted-400 mb-6">Drag & drop or click to add a file to your vault</p>
        </div>

        {/* ── Success Message ────────────────────────────── */}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-3 opacity-0 animate-scale-in">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            Document uploaded successfully! Redirecting...
          </div>
        )}

        {/* ── Error Message ──────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Drop Zone ──────────────────────────────────── */}
        <div
          id="drop-zone"
          className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden opacity-0 animate-fade-up stagger-1 ${
            dragActive
              ? "border-primary-500/60 bg-primary-500/5"
              : file
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-muted-500/30 hover:border-primary-500/30 hover:bg-primary-500/[0.02]"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {/* Drag active glow */}
          {dragActive && (
            <div className="absolute inset-0 animate-glow-pulse pointer-events-none" />
          )}

          <input
            ref={fileInputRef}
            id="file-input"
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv,.zip,.rar,.json,.xml"
            onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
          />

          <div className="text-center p-10 sm:p-12">
            {file ? (
              <>
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <span className="text-emerald-400 font-display font-bold text-sm">{getFileExt(file.name)}</span>
                </div>
                <p className="text-sm font-semibold text-white">{file.name}</p>
                <p className="text-xs text-muted-400 mt-1">{formatSize(file.size)}</p>
                <p className="text-xs text-primary-400 mt-3 hover:text-primary-300 transition-colors">Click to change file</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/20">
                  <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-muted-200">
                  Drag & drop your file here
                </p>
                <p className="text-xs text-muted-400 mt-1">
                  or click to browse • Max 10 MB
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── File Type Categories ─────────────────────────── */}
        {!file && (
          <div className="mt-6 space-y-3 opacity-0 animate-fade-up stagger-2">
            <p className="text-xs font-medium text-muted-400 uppercase tracking-wider">Accepted formats</p>
            <div className="flex flex-wrap gap-2">
              {FILE_CATEGORIES.map((cat) => (
                <div key={cat.label} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${cat.color}`}>
                  {cat.label}: {cat.exts.join(', ')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Upload Progress ────────────────────────────── */}
        {uploading && (
          <div className="mt-6 opacity-0 animate-fade-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-300">Uploading...</span>
              <span className="text-xs font-bold text-primary-400">{progress}%</span>
            </div>
            <div className="w-full bg-surface-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-400 h-2 rounded-full transition-all duration-300 relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Upload Button ──────────────────────────────── */}
        {file && !uploading && !success && (
          <button
            id="upload-submit"
            onClick={handleUpload}
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2 opacity-0 animate-fade-up"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload to Vault
          </button>
        )}
      </main>
    </div>
  );
};

export default UploadPage;
