// ============================================================
// routes/documentRoutes.js — Document Routes
// ============================================================
// All routes in this file are protected by JWT middleware.
// ============================================================

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { upload } = require("../config/s3");
const { uploadLimiter } = require("../middleware/rateLimiter");
const {
  uploadDocument,
  getDocuments,
  downloadDocument,
  previewDocument,
  deleteDocument,
} = require("../controllers/documentController");

// POST   /api/documents/upload       — Upload a document (rate limited)
router.post("/upload", protect, uploadLimiter, upload.single("file"), uploadDocument);

// GET    /api/documents              — List all documents (with optional ?search=)
router.get("/", protect, getDocuments);

// GET    /api/documents/download/:id — Download a document
router.get("/download/:id", protect, downloadDocument);

// GET    /api/documents/preview/:id  — Preview a document inline
router.get("/preview/:id", protect, previewDocument);

// DELETE /api/documents/:id          — Delete a document
router.delete("/:id", protect, deleteDocument);

module.exports = router;
