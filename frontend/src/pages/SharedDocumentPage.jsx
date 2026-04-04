// ============================================================
// pages/SharedDocumentPage.jsx — Public Shared Document View
// ============================================================
// Public page for viewing shared documents (no auth required).
// ============================================================

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { verifyShareAccess, getApiBaseUrl } from "../services/api";

const TEXT_TYPES = ["txt", "csv", "json", "xml", "html", "css", "js", "md"];
const IMAGE_TYPES = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
const PDF_TYPES = ["pdf"];

const SharedDocumentPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [share, setShare] = useState(null);
  const [textContent, setTextContent] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    verifyAccess();
  }, [token]);

  const verifyAccess = async (pwd = "") => {
    setLoading(true);
    setError("");

    try {
      const response = await verifyShareAccess(token, pwd);
      setShare(response.data.share);
      setRequiresPassword(false);

      // Load text content if applicable
      const fileType = response.data.share.document.fileType?.toLowerCase();
      if (TEXT_TYPES.includes(fileType)) {
        loadTextContent();
      }
    } catch (err) {
      if (err.response?.data?.requiresPassword) {
        setRequiresPassword(true);
        setError(err.response.data.message);
      } else {
        setError(err.response?.data?.message || "Failed to access shared document");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    verifyAccess(password);
  };

  const loadTextContent = async () => {
    setTextLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/share/preview/${token}`);
      if (response.ok) {
        const text = await response.text();
        setTextContent(text);
      } else {
        setTextContent("Error: Unable to load file content");
      }
    } catch (err) {
      console.error("Error loading text content:", err);
      setTextContent("Error: Failed to load file content. Please try again.");
    } finally {
      setTextLoading(false);
    }
  };

  const handleDownload = () => {
    const baseUrl = getApiBaseUrl();
    window.open(`${baseUrl}/api/share/download/${token}`, "_blank");
  };

  const getPreviewSrc = () => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/api/share/preview/${token}`;
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-500 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-muted-300">Loading shared document...</p>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-surface-500 flex items-center justify-center p-4">
        <div className="card max-w-md w-full p-8">
          <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/20">
            <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-display font-bold text-white text-center mb-2">
            Password Required
          </h1>
          <p className="text-sm text-muted-400 text-center mb-6">
            This document is password protected
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 bg-surface-400 border border-white/[0.06] rounded-lg text-white placeholder-muted-500 focus:outline-none focus:border-primary-500/30 mb-4"
              autoFocus
            />
            <button type="submit" className="w-full btn-primary">
              Access Document
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-500 flex items-center justify-center p-4">
        <div className="card max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-display font-bold text-white mb-2">
            Access Denied
          </h1>
          <p className="text-sm text-muted-400 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="btn-primary inline-flex items-center gap-2"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!share) return null;

  const doc = share.document;
  const fileType = doc.fileType?.toLowerCase() || "";
  const isImage = IMAGE_TYPES.includes(fileType);
  const isPDF = PDF_TYPES.includes(fileType);
  const isText = TEXT_TYPES.includes(fileType);
  const canDownload = share.permission === "download";

  return (
    <div className="min-h-screen bg-surface-500">
      {/* Header */}
      <div className="bg-surface-400 border-b border-white/[0.06]">
        <div className={`${isFullscreen ? 'max-w-full' : 'max-w-5xl'} mx-auto px-4 sm:px-6 lg:px-8 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center border border-primary-500/20">
                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-white truncate">{doc.fileName}</h1>
                <p className="text-xs text-muted-400">
                  {formatSize(doc.fileSize)} • {formatDate(doc.uploadDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="btn-secondary flex items-center gap-2"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                    Exit Fullscreen
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                    Fullscreen
                  </>
                )}
              </button>
              {canDownload && (
                <button
                  onClick={handleDownload}
                  className="btn-primary flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className={`${isFullscreen ? 'max-w-full' : 'max-w-5xl'} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
        <div className="bg-surface-400 rounded-2xl border border-white/[0.06] overflow-hidden" style={{ minHeight: isFullscreen ? "85vh" : "70vh" }}>
          {isImage ? (
            <div className="flex items-center justify-center p-8">
              <img
                src={getPreviewSrc()}
                alt={doc.fileName}
                className="max-w-full object-contain rounded-lg"
                style={{ maxHeight: isFullscreen ? "85vh" : "70vh" }}
              />
            </div>
          ) : isPDF ? (
            <iframe
              src={getPreviewSrc()}
              title={doc.fileName}
              className="w-full border-0 bg-white"
              style={{ height: isFullscreen ? "85vh" : "70vh" }}
            />
          ) : isText ? (
            <div className="p-6">
              {textLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
                </div>
              ) : (
                <pre className="text-sm text-emerald-400/80 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {textContent}
                </pre>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center p-12">
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
                {canDownload && (
                  <button onClick={handleDownload} className="btn-primary inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Instead
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-400">
            Shared via <span className="text-primary-400 font-semibold">DocuVault</span>
          </p>
          {!canDownload && (
            <p className="text-xs text-muted-500 mt-1">
              View-only access • Downloads are disabled
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedDocumentPage;
