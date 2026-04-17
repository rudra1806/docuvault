// ============================================================
// routes/queueRoutes.js — Queue Monitoring & Admin Routes
// ============================================================
// Provides a visual dashboard via @bull-board and a JSON
// stats API for monitoring queue health and job status.
// ============================================================

const express = require("express");
const router = express.Router();
const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const { protect } = require("../middleware/auth");
const { getAIProcessingQueue } = require("../queues/aiProcessingQueue");
const { getVectorCleanupQueue } = require("../queues/vectorCleanupQueue");
const logger = require("../config/logger");

// ── Bull Board Dashboard Setup ─────────────────────────────
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/api/admin/queues");

createBullBoard({
  queues: [
    new BullMQAdapter(getAIProcessingQueue()),
    new BullMQAdapter(getVectorCleanupQueue()),
  ],
  serverAdapter,
});

// Mount the dashboard UI (protected by JWT auth)
router.use("/queues", protect, serverAdapter.getRouter());

// ── GET /api/admin/queues/stats — JSON Queue Stats ─────────
router.get("/queues/stats", protect, async (req, res) => {
  try {
    const aiQueue = getAIProcessingQueue();
    const cleanupQueue = getVectorCleanupQueue();

    // Get job counts for both queues
    const [aiCounts, cleanupCounts] = await Promise.all([
      aiQueue.getJobCounts("active", "waiting", "completed", "failed", "delayed"),
      cleanupQueue.getJobCounts("active", "waiting", "completed", "failed", "delayed"),
    ]);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      queues: {
        aiProcessing: {
          name: "ai-processing",
          ...aiCounts,
        },
        vectorCleanup: {
          name: "vector-cleanup",
          ...cleanupCounts,
        },
      },
    });
  } catch (error) {
    logger.logError(error);
    res.status(500).json({
      success: false,
      message: "Failed to get queue stats",
      error: error.message,
    });
  }
});

module.exports = router;
