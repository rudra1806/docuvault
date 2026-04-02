// ============================================================
// services/api.js — Axios Instance & API Functions
// ============================================================
// Central API layer. Automatically injects the JWT token into
// every request via an Axios interceptor.
// ============================================================

import axios from "axios";

// Base URL for the backend API - use environment variable or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create an Axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Export the base URL for use in other components
export const getApiBaseUrl = () => API_BASE_URL.replace('/api', '');

// ── Request Interceptor: Attach JWT token ──────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Handle 401 (token expired) ───────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token is invalid/expired, clear storage and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════
// Auth API Functions
// ═══════════════════════════════════════════════════════════

export const registerUser = (userData) => api.post("/auth/register", userData);

export const loginUser = (credentials) => api.post("/auth/login", credentials);

// ═══════════════════════════════════════════════════════════
// Document API Functions
// ═══════════════════════════════════════════════════════════

/**
 * Upload a document – sends FormData (multipart/form-data)
 */
export const uploadDocument = (formData, config = {}) =>
  api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    ...config,
  });

/**
 * Get all documents for the logged-in user.
 * Optionally pass a search keyword.
 */
export const getDocuments = (search = "") =>
  api.get("/documents", { params: { search } });

/**
 * Download a document — returns the actual file as a blob.
 * The backend proxies the file from Cloudinary.
 */
export const downloadDocument = (id) =>
  api.get(`/documents/download/${id}`, { responseType: "blob" });

/**
 * Delete a document by its ID.
 */
export const deleteDocument = (id) => api.delete(`/documents/${id}`);

// ═══════════════════════════════════════════════════════════
// Share API Functions
// ═══════════════════════════════════════════════════════════

/**
 * Create a new share link for a document
 */
export const createShareLink = (data) => api.post("/share/create", data);

/**
 * Get all share links created by the current user
 */
export const getMyShares = () => api.get("/share/my-shares");

/**
 * Get all share links for a specific document
 */
export const getDocumentShares = (documentId) => api.get(`/share/document/${documentId}`);

/**
 * Delete a share link
 */
export const deleteShareLink = (shareId) => api.delete(`/share/${shareId}`);

/**
 * Toggle share link active status
 */
export const toggleShareLink = (shareId) => api.patch(`/share/${shareId}/toggle`);

/**
 * Verify access to a shared link (public, no auth required)
 */
export const verifyShareAccess = (token, password = "") =>
  axios.post(`${API_BASE_URL}/share/access/${token}`, { password });

export default api;
