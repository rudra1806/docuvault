// ============================================================
// pages/DocumentsPage.jsx — Document List (Midnight Vault)
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { getDocuments, downloadDocument, deleteDocument } from "../services/api";
import Navbar from "../components/Navbar";
import FileCard from "../components/FileCard";
import SearchBar from "../components/SearchBar";
import FilePreviewModal from "../components/FilePreviewModal";
import ShareModal from "../components/ShareModal";

const POLL_INTERVAL = 5000; // Poll every 5 seconds when documents are processing

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [shareDoc, setShareDoc] = useState(null);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    fetchDocuments(searchTerm);
  }, [searchTerm]);

  // Poll for status updates when any document is processing
  useEffect(() => {
    const hasProcessing = documents.some((doc) => doc.aiStatus === "processing");

    // Clear any existing timer
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (hasProcessing) {
      pollTimerRef.current = setInterval(async () => {
        try {
          const response = await getDocuments(searchTerm);
          setDocuments(response.data.documents);
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, POLL_INTERVAL);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [documents, searchTerm]);

  const fetchDocuments = async (search = "") => {
    setLoading(true);
    try {
      const response = await getDocuments(search);
      setDocuments(response.data.documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((query) => {
    setSearchTerm(query);
  }, []);

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

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((doc) => doc._id !== id));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete the document.");
    }
  };

  const handlePreview = (doc) => {
    setPreviewDoc(doc);
  };

  const handleShare = (doc) => {
    setShareDoc(doc);
  };

  return (
    <div className="min-h-screen bg-surface-500">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 opacity-0 animate-fade-up">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">My Documents</h1>
            <p className="text-sm text-muted-400 mt-1">
              {documents.length} document{documents.length !== 1 ? "s" : ""} in your vault
            </p>
          </div>
          <Link to="/upload" className="btn-primary inline-flex items-center gap-2 self-start">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload
          </Link>
        </div>

        {/* ── Search Bar ─────────────────────────────────── */}
        <div className="mb-6 opacity-0 animate-fade-up stagger-1">
          <SearchBar onSearch={handleSearch} placeholder="Search by filename..." />
        </div>

        {/* ── Document List ──────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="card p-12 text-center opacity-0 animate-scale-in">
            <div className="w-16 h-16 bg-muted-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {searchTerm ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                )}
              </svg>
            </div>
            <h3 className="text-lg font-display font-semibold text-muted-200 mb-1">
              {searchTerm ? "No matching documents" : "No documents yet"}
            </h3>
            <p className="text-muted-400 text-sm">
              {searchTerm
                ? `Nothing matches "${searchTerm}". Try a different search.`
                : "Upload your first document to see it here."}
            </p>
            {!searchTerm && (
              <Link to="/upload" className="btn-primary inline-flex items-center gap-2 mt-6">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Document
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc, i) => (
              <div key={doc._id} className={`opacity-0 animate-fade-up`} style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}>
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

export default DocumentsPage;
