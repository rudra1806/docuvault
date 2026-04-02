// ============================================================
// routes/shareRoutes.js — Share Link Routes
// ============================================================
// Defines API endpoints for creating and managing share links.
// ============================================================

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createShareLink,
  getMyShares,
  getDocumentShares,
  deleteShareLink,
  toggleShareLink,
  verifyShareAccess,
  previewSharedDocument,
  downloadSharedDocument,
} = require("../controllers/shareController");

// ── Protected Routes (require authentication) ──────────────
router.post("/create", protect, createShareLink);
router.get("/my-shares", protect, getMyShares);
router.get("/document/:documentId", protect, getDocumentShares);
router.delete("/:shareId", protect, deleteShareLink);
router.patch("/:shareId/toggle", protect, toggleShareLink);

// ── Public Routes (no authentication required) ─────────────
router.post("/access/:token", verifyShareAccess);
router.get("/preview/:token", previewSharedDocument);
router.get("/download/:token", downloadSharedDocument);

module.exports = router;
