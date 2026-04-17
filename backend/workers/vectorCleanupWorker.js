// ============================================================
// workers/vectorCleanupWorker.js — Vector Cleanup Worker
// ============================================================
// BullMQ worker that picks up vector cleanup jobs and
// deletes vectors from Qdrant when documents are removed.
// ============================================================

const { Worker } = require("bullmq");
const axios = require("axios");
const { createNewConnection } = require("../config/redis");
const logger = require("../config/logger");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * startVectorCleanupWorker()
 * Creates and starts the BullMQ worker for vector cleanup.
 *
 * @returns {Worker} - The BullMQ worker instance
 */
const startVectorCleanupWorker = () => {
  const worker = new Worker(
    "vector-cleanup",
    async (job) => {
      const { documentId, correlationId } = job.data;

      logger.info(`[Cleanup Worker] Deleting vectors for document ${documentId}`, {
        jobId: job.id,
        attempt: job.attemptsMade + 1,
        correlationId,
      });

      const response = await axios.post(
        `${AI_SERVICE_URL}/delete-vectors`,
        { file_id: documentId },
        {
          timeout: 15000,
          headers: {
            "x-correlation-id": correlationId || "",
          },
        }
      );

      const deletedCount = response.data.deleted_count || 0;

      logger.logAI("vectors_deleted", {
        documentId,
        deletedCount,
        jobId: job.id,
        correlationId,
      });

      return { documentId, deletedCount };
    },
    {
      connection: createNewConnection(),
      concurrency: 1, // Process one at a time (low priority)
    }
  );

  // ── Event Handlers ─────────────────────────────────────────

  worker.on("completed", (job, result) => {
    logger.info(`[Cleanup Worker] Completed: ${result.deletedCount} vectors deleted`, {
      documentId: result.documentId,
    });
  });

  worker.on("failed", (job, err) => {
    const willRetry = job.attemptsMade < (job.opts.attempts || 5);

    if (willRetry) {
      logger.warn(`[Cleanup Worker] Failed (will retry): ${job.id}`, {
        documentId: job.data.documentId,
        attempt: job.attemptsMade,
        error: err.message,
      });
    } else {
      logger.error(`[Cleanup Worker] Permanently failed: ${job.id}`, {
        documentId: job.data.documentId,
        attempts: job.attemptsMade,
        error: err.message,
      });
    }
  });

  worker.on("error", (err) => {
    logger.error("[Cleanup Worker] Worker error:", { error: err.message });
  });

  logger.info("[Cleanup Worker] Started — listening for vector cleanup jobs");

  return worker;
};

module.exports = { startVectorCleanupWorker };
