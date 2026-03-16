// ============================================================
// pages/DocumentsPage.jsx — Document List with Search
// ============================================================
// Displays all documents in a searchable, sortable list.
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { getDocuments, downloadDocument, deleteDocument } from "../services/api";
import Navbar from "../components/Navbar";
import FileCard from "../components/FileCard";
import SearchBar from "../components/SearchBar";
import FilePreviewModal from "../components/FilePreviewModal";

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);

  // Fetch documents on mount and when searchTerm changes
  useEffect(() => {
    fetchDocuments(searchTerm);
  }, [searchTerm]);

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

  // Memoized search handler (used by SearchBar's debounce)
  const handleSearch = useCallback((query) => {
    setSearchTerm(query);
  }, []);

  // Handle document download
  const handleDownload = async (id, fileName) => {
    try {
      const response = await downloadDocument(id);

      // The backend now returns the file as a blob directly
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName); // Force download with original name
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

  // Handle document deletion
  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      // Remove the deleted document from local state
      setDocuments((prev) => prev.filter((doc) => doc._id !== id));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete the document.");
    }
  };

  // Handle preview open
  const handlePreview = (doc) => {
    setPreviewDoc(doc);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
            <p className="text-sm text-gray-500 mt-1">
              {documents.length} document{documents.length !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>

        {/* ── Search Bar ─────────────────────────────────── */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} placeholder="Search by filename..." />
        </div>

        {/* ── Document List ──────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-600 mb-1">
              {searchTerm ? "No matching documents" : "No documents yet"}
            </h3>
            <p className="text-gray-400">
              {searchTerm
                ? `No documents match "${searchTerm}". Try a different search.`
                : "Upload your first document to see it here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
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

export default DocumentsPage;
