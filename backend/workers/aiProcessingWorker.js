// ============================================================
// workers/aiProcessingWorker.js — AI Processing Worker
// ============================================================
// BullMQ worker that picks up AI processing jobs from the
// queue, downloads files from S3, and sends them to the
// Python AI service. Replaces the old triggerProcessing().
// ============================================================

const { Worker } = require("bullmq");
const axios = require("axios");
const FormData = require("form-data");
const { createNewConnection } = require("../config/redis");
const { streamFromS3 } = require("../config/s3");
const Document = require("../models/Document");
const logger = require("../config/logger");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * startAIProcessingWorker()
 * Creates and starts the BullMQ worker for AI document processing.
 * Each job: S3 download → FormData → POST to AI service.
 *
 * @returns {Worker} - The BullMQ worker instance
 */
const startAIProcessingWorker = () => {
  const worker = new Worker(
    "ai-processing",
    async (job) => {
      const { documentId, userId, fileName, s3Key, correlationId } = job.data;

      logger.info(`[AI Worker] Processing job ${job.id}`, {
        documentId,
        fileName,
        attempt: job.attemptsMade + 1,
        correlationId,
      });

      // Step 1: Download file from S3
      const { stream, contentType } = await streamFromS3(s3Key);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      logger.info(`[AI Worker] Downloaded ${fileName} from S3 (${fileBuffer.length} bytes)`, {
        documentId,
        correlationId,
      });

      // Step 2: Create FormData
      const formData = new FormData();
      formData.append("file", fileBuffer, {
        filename: fileName,
        contentType: contentType || "application/octet-stream",
      });
      formData.append("file_id", documentId);
      formData.append("user_id", userId);
      formData.append("file_name", fileName);

      // Step 3: Send to Python AI service
      await axios.post(`${AI_SERVICE_URL}/process`, formData, {
        headers: {
          ...formData.getHeaders(),
          "x-correlation-id": correlationId || "",
        },
        timeout: 30000,
      });

      logger.logAI("job_sent_to_ai_service", {
        documentId,
        fileName,
        jobId: job.id,
        correlationId,
      });

      return { documentId, fileName, status: "sent_to_ai_service" };
    },
    {
      connection: createNewConnection(),
      concurrency: 2, // Process 2 documents at a time
      limiter: {
        max: 5,
        duration: 60000, // Max 5 jobs per minute (prevent AI service overload)
      },
    }
  );

  // ── Event Handlers ─────────────────────────────────────────

  worker.on("completed", (job, result) => {
    logger.info(`[AI Worker] Job completed: ${job.id}`, {
      documentId: result.documentId,
      fileName: result.fileName,
    });
  });

  worker.on("failed", (job, err) => {
    const willRetry = job.attemptsMade < (job.opts.attempts || 3);

    if (willRetry) {
      logger.warn(`[AI Worker] Job failed (will retry): ${job.id}`, {
        documentId: job.data.documentId,
        attempt: job.attemptsMade,
        maxAttempts: job.opts.attempts || 3,
        error: err.message,
        correlationId: job.data.correlationId,
      });
    } else {
      // All retries exhausted — mark document as failed in MongoDB
      logger.error(`[AI Worker] Job permanently failed: ${job.id}`, {
        documentId: job.data.documentId,
        attempts: job.attemptsMade,
        error: err.message,
        correlationId: job.data.correlationId,
      });

      // Update document status to failed
      Document.findByIdAndUpdate(job.data.documentId, {
        aiStatus: "failed",
        aiError: `Processing failed after ${job.attemptsMade} attempts: ${err.message}`,
      }).catch((updateErr) => {
        logger.error("[AI Worker] Failed to update document status:", {
          error: updateErr.message,
          documentId: job.data.documentId,
        });
      });
    }
  });

  worker.on("error", (err) => {
    logger.error("[AI Worker] Worker error:", { error: err.message });
  });

  logger.info("[AI Worker] Started — listening for AI processing jobs");

  return worker;
};

module.exports = { startAIProcessingWorker };
