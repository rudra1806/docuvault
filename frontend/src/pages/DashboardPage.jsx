// ============================================================
// pages/DashboardPage.jsx — User Dashboard (Midnight Vault)
// ============================================================

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDocuments, downloadDocument, deleteDocument } from "../services/api";
import Navbar from "../components/Navbar";
import FileCard from "../components/FileCard";
import FilePreviewModal from "../components/FilePreviewModal";
import ShareModal from "../components/ShareModal";

const DashboardPage = () => {
  const { user } = useAuth();
  const [recentDocs, setRecentDocs] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [shareDoc, setShareDoc] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await getDocuments();
      const docs = response.data.documents;
      setTotalDocs(docs.length);
      setRecentDocs(docs.slice(0, 5));
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id, fileName) => {
    try {
      const response = await downloadDocument(id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download the document.");
    }
  };

  const handlePreview = (doc) => {
    setPreviewDoc(doc);
  };

  const handleShare = (doc) => {
    setShareDoc(doc);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      fetchDocuments();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete the document.");
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-surface-500">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Hero Banner ──────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl p-8 sm:p-10 mb-8 opacity-0 animate-fade-up">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-surface-200 via-surface-300 to-surface-400" />
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(245,158,11,0.06) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary-500/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-accent-emerald/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
              <span className="text-xs font-medium text-accent-emerald uppercase tracking-wider">Online</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
              {getGreeting()}, <span className="text-gradient-warm">{user?.name}</span>
            </h1>
            <p className="text-muted-300 mt-2 text-sm sm:text-base max-w-lg">
              Your vault is secure. Manage, upload, and access your documents from anywhere.
            </p>
          </div>
        </div>

        {/* ── Stats + Quick Actions ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Total Documents */}
          <div className="card p-6 opacity-0 animate-fade-up stagger-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-white">{totalDocs}</p>
                <p className="text-sm text-muted-400">Total Documents</p>
              </div>
            </div>
          </div>

          {/* Upload Shortcut */}
          <Link to="/upload" className="card p-6 group opacity-0 animate-fade-up stagger-2 hover:border-primary-500/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent-emerald/10 rounded-xl flex items-center justify-center group-hover:bg-accent-emerald/15 transition-colors duration-300">
                <svg className="w-6 h-6 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-display font-bold text-white group-hover:text-primary-400 transition-colors duration-300">Upload</p>
                <p className="text-sm text-muted-400">Add new document</p>
              </div>
            </div>
          </Link>

          {/* View All */}
          <Link to="/documents" className="card p-6 group opacity-0 animate-fade-up stagger-3 hover:border-primary-500/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent-violet/10 rounded-xl flex items-center justify-center group-hover:bg-accent-violet/15 transition-colors duration-300">
                <svg className="w-6 h-6 text-accent-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-display font-bold text-white group-hover:text-primary-400 transition-colors duration-300">Browse</p>
                <p className="text-sm text-muted-400">View all documents</p>
              </div>
            </div>
          </Link>
        </div>

        {/* ── Recent Documents ───────────────────────────────── */}
        <div className="opacity-0 animate-fade-up stagger-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-white">Recent Documents</h2>
            {totalDocs > 5 && (
              <Link to="/documents" className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1">
                View all
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
            </div>
          ) : recentDocs.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-muted-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-display font-semibold text-muted-200 mb-1">No documents yet</h3>
              <p className="text-muted-400 mb-6">Upload your first document to get started.</p>
              <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Document
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDocs.map((doc, i) => (
                <div key={doc._id} className={`opacity-0 animate-fade-up stagger-${Math.min(i + 1, 6)}`}>
                  <FileCard
                    document={doc}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    onPreview={handlePreview}
                    onShare={handleShare}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {previewDoc && (
        <FilePreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDownload={handleDownload}
        />
      )}

      {shareDoc && (
        <ShareModal
          document={shareDoc}
          onClose={() => setShareDoc(null)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
