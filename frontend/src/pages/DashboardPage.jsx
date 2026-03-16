// ============================================================
// pages/DashboardPage.jsx — User Dashboard
// ============================================================
// Welcome banner, quick stats, quick upload shortcut,
// and recent documents.
// ============================================================

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDocuments, downloadDocument, deleteDocument } from "../services/api";
import Navbar from "../components/Navbar";
import FileCard from "../components/FileCard";
import FilePreviewModal from "../components/FilePreviewModal";

const DashboardPage = () => {
  const { user } = useAuth();
  const [recentDocs, setRecentDocs] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Fetch recent documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await getDocuments();
      const docs = response.data.documents;
      setTotalDocs(docs.length);
      setRecentDocs(docs.slice(0, 5)); // Show only 5 most recent
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle document download
  const handleDownload = async (id, fileName) => {
    try {
      const response = await downloadDocument(id);

      // The backend returns the file as a blob directly
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download the document.");
    }
  };

  // Handle preview
  const handlePreview = (doc) => {
    setPreviewDoc(doc);
  };

  // Handle document deletion
  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      fetchDocuments(); // Refresh the list
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete the document.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Welcome Banner ────────────────────────────── */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 text-white mb-8 shadow-xl shadow-primary-500/20">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-primary-100 mt-2 text-sm sm:text-base">
            Manage your documents securely in the cloud.
          </p>
        </div>

        {/* ── Stats + Quick Actions ─────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Total Documents */}
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalDocs}</p>
                <p className="text-sm text-gray-500">Total Documents</p>
              </div>
            </div>
          </div>

          {/* Upload Shortcut */}
          <Link to="/upload" className="card p-6 group hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">Upload</p>
                <p className="text-sm text-gray-500">Add new document</p>
              </div>
            </div>
          </Link>

          {/* View All */}
          <Link to="/documents" className="card p-6 group hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">Browse</p>
                <p className="text-sm text-gray-500">View all documents</p>
              </div>
            </div>
          </Link>
        </div>

        {/* ── Recent Documents ───────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Documents</h2>
            {totalDocs > 5 && (
              <Link to="/documents" className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
                View all →
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
            </div>
          ) : recentDocs.length === 0 ? (
            <div className="card p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-600 mb-1">No documents yet</h3>
              <p className="text-gray-400 mb-4">Upload your first document to get started.</p>
              <Link to="/upload" className="btn-primary inline-flex">
                Upload Document
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDocs.map((doc) => (
                <FileCard
                  key={doc._id}
                  document={doc}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  onPreview={handlePreview}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Preview Modal ──────────────────────────────── */}
      {previewDoc && (
        <FilePreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

export default DashboardPage;
