// ============================================================
// routes/aiRoutes.js — AI Feature Routes
// ============================================================
// Routes for AI document processing, querying, and management.
// ============================================================

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  processDocument,
  processingWebhook,
  getProcessingStatus,
  queryDocuments,
  deleteVectors,
  getAIStats,
} = require("../controllers/aiController");

// POST   /api/ai/process/:documentId  — Trigger AI processing
router.post("/process/:documentId", protect, processDocument);

// POST   /api/ai/webhook              — Processing completion webhook (from Python service)
router.post("/webhook", processingWebhook);

// GET    /api/ai/status/:documentId   — Get processing status
router.get("/status/:documentId", protect, getProcessingStatus);

// POST   /api/ai/query                — Ask a question
router.post("/query", protect, queryDocuments);

// DELETE /api/ai/vectors/:documentId  — Delete vectors for a document
router.delete("/vectors/:documentId", protect, deleteVectors);

// GET    /api/ai/stats                — Get AI stats for current user
router.get("/stats", protect, getAIStats);

module.exports = router;
