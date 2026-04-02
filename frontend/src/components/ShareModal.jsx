// ============================================================
// components/ShareModal.jsx — Share Document Modal
// ============================================================
// Modal for creating and managing share links for a document.
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { createShareLink, getDocumentShares, deleteShareLink, toggleShareLink } from "../services/api";

// Constants
const CLIPBOARD_TIMEOUT = 2000;
const MIN_PASSWORD_LENGTH = 6;

// Utility function to sanitize text for display
const sanitizeText = (text) => {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

const ShareModal = ({ document, onClose }) => {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  
  // Form state
  const [permission, setPermission] = useState("view");
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState("");
  const [error, setError] = useState("");
  const [copiedToken, setCopiedToken] = useState(null);

  useEffect(() => {
    fetchShares();
  }, [document._id]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const fetchShares = async () => {
    try {
      const response = await getDocumentShares(document._id);
      setShares(response.data.shares);
    } catch (err) {
      console.error("Error fetching shares:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShare = async (e) => {
    e.preventDefault();
    setError("");

    // Validate password length if provided
    if (password && password.trim().length > 0 && password.trim().length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
      return;
    }

    setCreating(true);

    try {
      const response = await createShareLink({
        documentId: document._id,
        permission,
        password: password || undefined,
        expiresIn: expiresIn || undefined,
      });

      setShares([response.data.sharedLink, ...shares]);
      setShowCreateForm(false);
      setPassword("");
      setExpiresIn("");
      setPermission("view");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create share link");
    } finally {
      setCreating(false);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ animation: "modalFadeIn 0.2s ease-out" }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <div
        className="relative bg-surface-300 rounded-2xl shadow-2xl w-[95vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-white/[0.06]"
        style={{ animation: "modalSlideUp 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-surface-400/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center border border-primary-500/20">
              <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white">Share Document</h2>
              <p className="text-xs text-muted-400 truncate" dangerouslySetInnerHTML={{ __html: sanitizeText(document.fileName) }} />
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {/* Create New Share Button */}
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full btn-primary flex items-center justify-center gap-2 mb-6"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Share Link
            </button>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <form onSubmit={handleCreateShare} className="card p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">New Share Link</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setError("");
                  }}
                  className="text-xs text-muted-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Permission */}
                <div>
                  <label className="block text-xs font-medium text-muted-300 mb-2">Permission</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPermission("view")}
                      className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                        permission === "view"
                          ? "bg-primary-500/10 border-primary-500/30 text-primary-400"
                          : "bg-surface-400 border-white/[0.06] text-muted-300 hover:border-primary-500/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Only
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPermission("download")}
                      className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                        permission === "download"
                          ? "bg-primary-500/10 border-primary-500/30 text-primary-400"
                          : "bg-surface-400 border-white/[0.06] text-muted-300 hover:border-primary-500/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Can Download
                      </div>
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-muted-300 mb-2">
                    Password (optional)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave empty for no password"
                    className="w-full px-3 py-2 bg-surface-400 border border-white/[0.06] rounded-lg text-sm text-white placeholder-muted-500 focus:outline-none focus:border-primary-500/30"
                  />
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-xs font-medium text-muted-300 mb-2">
                    Expires In (optional)
                  </label>
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-400 border border-white/[0.06] rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/30"
                  >
                    <option value="">Never</option>
                    <option value="1">1 hour</option>
                    <option value="24">24 hours</option>
                    <option value="168">7 days</option>
                    <option value="720">30 days</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full mt-4 btn-primary disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Share Link"}
              </button>
            </form>
          )}

          {/* Existing Shares */}
          <div>
            <h3 className="text-xs font-medium text-muted-400 uppercase tracking-wider mb-3">
              Active Links ({shares.length})
            </h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
              </div>
            ) : shares.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="w-12 h-12 bg-muted-600/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-muted-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-300">No share links yet</p>
                <p className="text-xs text-muted-400 mt-1">Create one to share this document</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shares.map((share) => (
                  <div key={share._id} className="card p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
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
                        <p className="text-xs text-muted-400">
                          {share.accessCount} views • {share.downloadCount} downloads
                        </p>
                        {share.expiresAt && (
                          <p className="text-xs text-muted-500 mt-1">
                            Expires: {formatDate(share.expiresAt)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(share.token);
                          }}
                          className="p-2 rounded-lg text-muted-400 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
                          title="Copy link"
                        >
                          {copiedToken === share.token ? (
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                            <div className="w-4 h-4 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                            <div className="w-4 h-4 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {copiedToken === share.token && (
                      <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                        ✓ Link copied to clipboard!
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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

export default ShareModal;
