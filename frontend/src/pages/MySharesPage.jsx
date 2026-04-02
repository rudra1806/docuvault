// ============================================================
// pages/MySharesPage.jsx — Manage All Share Links
// ============================================================
// View and manage all share links created by the user.
// ============================================================

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyShares, deleteShareLink, toggleShareLink } from "../services/api";
import Navbar from "../components/Navbar";

// Constants
const CLIPBOARD_TIMEOUT = 2000;

const MySharesPage = () => {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    fetchShares();
  }, []);

  const fetchShares = async () => {
    try {
      const response = await getMyShares();
      setShares(response.data.shares);
    } catch (err) {
      console.error("Error fetching shares:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (shareId) => {
    if (!window.confirm("Delete this share link? It will no longer be accessible.")) return;

    setDeletingId(shareId);
    try {
      await deleteShareLink(shareId);
      setShares(shares.filter((s) => s._id !== shareId));
    } catch (err) {
      alert("Failed to delete share link");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (shareId) => {
    setTogglingId(shareId);
    try {
      const response = await toggleShareLink(shareId);
      setShares(
        shares.map((s) =>
          s._id === shareId ? { ...s, isActive: response.data.isActive } : s
        )
      );
    } catch (err) {
      alert("Failed to toggle share link");
    } finally {
      setTogglingId(null);
    }
  };

  const copyToClipboard = (token) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), CLIPBOARD_TIMEOUT);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        return { color: "text-sky-400 bg-sky-500/10 border-sky-500/20", label: "IMG" };
      case "xls":
      case "xlsx":
        return { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "XLS" };
      default:
        return { color: "text-primary-400 bg-primary-500/10 border-primary-500/20", label: "FILE" };
    }
  };

  return (
    <div className="min-h-screen bg-surface-500">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 opacity-0 animate-fade-up">
          <h1 className="text-2xl font-display font-bold text-white">My Shared Links</h1>
          <p className="text-sm text-muted-400 mt-1">
            Manage all your shared document links in one place
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-4 opacity-0 animate-fade-up stagger-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center border border-primary-500/20">
                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-display font-bold text-white">{shares.length}</p>
                <p className="text-xs text-muted-400">Total Links</p>
              </div>
            </div>
          </div>

          <div className="card p-4 opacity-0 animate-fade-up stagger-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-display font-bold text-white">
                  {shares.reduce((sum, s) => sum + s.accessCount, 0)}
                </p>
                <p className="text-xs text-muted-400">Total Views</p>
              </div>
            </div>
          </div>

          <div className="card p-4 opacity-0 animate-fade-up stagger-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500/10 rounded-lg flex items-center justify-center border border-sky-500/20">
                <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-display font-bold text-white">
                  {shares.reduce((sum, s) => sum + s.downloadCount, 0)}
                </p>
                <p className="text-xs text-muted-400">Total Downloads</p>
              </div>
            </div>
          </div>
        </div>

        {/* Share Links List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
          </div>
        ) : shares.length === 0 ? (
          <div className="card p-12 text-center opacity-0 animate-scale-in">
            <div className="w-16 h-16 bg-muted-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h3 className="text-lg font-display font-semibold text-muted-200 mb-1">
              No shared links yet
            </h3>
            <p className="text-muted-400 text-sm mb-6">
              Share documents to see them here
            </p>
            <Link to="/documents" className="btn-primary inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Go to Documents
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {shares.map((share, i) => {
              const { color, label } = getFileIcon(share.document?.fileType);
              return (
                <div
                  key={share._id}
                  className="card p-5 opacity-0 animate-fade-up"
                  style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}
                >
                  <div className="flex items-start gap-4">
                    {/* File Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-xs border shrink-0 ${color}`}>
                      {label}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate mb-1">
                        {share.document?.fileName || "Unknown File"}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            share.permission === "download"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          }`}
                        >
                          {share.permission === "download" ? "Can Download" : "View Only"}
                        </span>
                        {share.hasPassword && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            🔒 Protected
                          </span>
                        )}
                        {!share.isValid && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            {share.isExpired ? "Expired" : "Inactive"}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {share.accessCount} views
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          {share.downloadCount} downloads
                        </span>
                        {share.expiresAt && (
                          <span>Expires: {formatDate(share.expiresAt)}</span>
                        )}
                      </div>

                      {copiedToken === share.token && (
                        <div className="mt-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                          ✓ Link copied to clipboard!
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(share.token);
                        }}
                        className="p-2 rounded-lg text-muted-400 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
                        title="Copy link"
                      >
                        {copiedToken === share.token ? (
                          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(share._id);
                        }}
                        disabled={togglingId === share._id}
                        className="p-2 rounded-lg text-muted-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                        title={share.isActive ? "Disable" : "Enable"}
                      >
                        {togglingId === share._id ? (
                          <div className="w-5 h-5 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {share.isActive ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            )}
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(share._id);
                        }}
                        disabled={deletingId === share._id}
                        className="p-2 rounded-lg text-muted-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === share._id ? (
                          <div className="w-5 h-5 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MySharesPage;
