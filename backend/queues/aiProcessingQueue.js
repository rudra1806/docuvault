// ============================================================
// queues/aiProcessingQueue.js — AI Document Processing Queue
// ============================================================
// BullMQ queue for AI document processing. Replaces the
// fragile fire-and-forget triggerProcessing() with a
// persistent, retryable job queue.
// ============================================================

const { Queue } = require("bullmq");
const { getRedisConnection } = require("../config/redis");
const logger = require("../config/logger");

let queue = null;

/**
 * getAIProcessingQueue()
 * Returns the singleton AI processing queue instance.
 */
const getAIProcessingQueue = () => {
  if (!queue) {
    queue = new Queue("ai-processing", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 30000, // 30s → 2min → 8min
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 100,     // Keep last 100 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days (for debugging)
        },
      },
    });

    logger.info("AI Processing Queue initialized");
  }

  return queue;
};

/**
 * addAIProcessingJob()
 * Adds a document to the AI processing queue.
 *
 * @param {Object} data - Job data
 * @param {string} data.documentId - MongoDB document ID
 * @param {string} data.userId - User who owns the document
 * @param {string} data.fileName - Original file name
 * @param {string} data.s3Key - S3 object key
 * @param {string} [data.correlationId] - Request correlation ID for tracing
 * @returns {Promise<Job>} - The queued job
 */
const addAIProcessingJob = async (data) => {
  const queue = getAIProcessingQueue();

  const job = await queue.add("process-document", data, {
    jobId: `ai-${data.documentId}`, // Prevent duplicate processing
  });

  logger.logAI("job_queued", {
    jobId: job.id,
    documentId: data.documentId,
    fileName: data.fileName,
    correlationId: data.correlationId,
  });

  return job;
};

module.exports = {
  getAIProcessingQueue,
  addAIProcessingJob,
};
