// ============================================================
// queues/vectorCleanupQueue.js — Qdrant Vector Cleanup Queue
// ============================================================
// BullMQ queue for reliably cleaning up Qdrant vectors when
// documents are deleted. Prevents orphaned vectors.
// ============================================================

const { Queue } = require("bullmq");
const { getRedisConnection } = require("../config/redis");
const logger = require("../config/logger");

let queue = null;

/**
 * getVectorCleanupQueue()
 * Returns the singleton vector cleanup queue instance.
 */
const getVectorCleanupQueue = () => {
  if (!queue) {
    queue = new Queue("vector-cleanup", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 10000, // 10s → 40s → 2.5min → 10min → 40min
        },
        removeOnComplete: {
          age: 12 * 3600, // Keep completed jobs for 12 hours
          count: 50,
        },
        removeOnFail: {
          age: 3 * 24 * 3600, // Keep failed jobs for 3 days
        },
      },
    });

    logger.info("Vector Cleanup Queue initialized");
  }

  return queue;
};

/**
 * addVectorCleanupJob()
 * Adds a vector cleanup job to the queue.
 *
 * @param {Object} data - Job data
 * @param {string} data.documentId - Document whose vectors to delete
 * @param {string} [data.correlationId] - Request correlation ID for tracing
 * @returns {Promise<Job>} - The queued job
 */
const addVectorCleanupJob = async (data) => {
  const queue = getVectorCleanupQueue();

  const job = await queue.add("cleanup-vectors", data, {
    jobId: `cleanup-${data.documentId}`,
  });

  logger.logAI("vector_cleanup_queued", {
    jobId: job.id,
    documentId: data.documentId,
    correlationId: data.correlationId,
  });

  return job;
};

module.exports = {
  getVectorCleanupQueue,
  addVectorCleanupJob,
};
