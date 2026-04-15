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

// GET    /api/ai/health               — Health check (no auth required)
router.get("/health", async (req, res) => {
  try {
    const axios = require("axios");
    const aiServiceUrl = process.env.AI_SERVICE_URL;
    
    if (!aiServiceUrl) {
      return res.status(500).json({
        status: "error",
        message: "AI_SERVICE_URL not configured",
      });
    }

    // Try to reach AI service (health endpoint is at root "/")
    const response = await axios.get(`${aiServiceUrl}/`, { timeout: 5000 });
    
    res.json({
      status: "healthy",
      backend: "ok",
      aiService: response.data,
      aiServiceUrl: aiServiceUrl,
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      backend: "ok",
      aiService: "unreachable",
      error: error.message,
      aiServiceUrl: process.env.AI_SERVICE_URL,
    });
  }
});

module.exports = router;
