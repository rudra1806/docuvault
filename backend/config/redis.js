// ============================================================
// config/redis.js — Redis Connection Configuration
// ============================================================
// Provides a shared Redis connection instance for BullMQ
// queues and workers. Configurable via REDIS_URL env var.
// ============================================================

const IORedis = require("ioredis");
const logger = require("./logger");

// Parse Redis URL from environment (default: local Redis)
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let connection = null;

/**
 * getRedisConnection()
 * Returns a shared IORedis connection instance.
 * Creates the connection on first call, reuses on subsequent calls.
 */
const getRedisConnection = () => {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,    // Required by BullMQ
      retryStrategy: (times) => {
        if (times > 10) {
          logger.error("Redis: Max reconnection attempts reached");
          return null; // Stop retrying
        }
        const delay = Math.min(times * 500, 5000);
        logger.warn(`Redis: Reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
      },
    });

    connection.on("connect", () => {
      logger.info("Redis: Connected successfully", { url: REDIS_URL.replace(/\/\/.*@/, "//***@") });
    });

    connection.on("error", (err) => {
      logger.error("Redis: Connection error", { error: err.message });
    });

    connection.on("close", () => {
      logger.warn("Redis: Connection closed");
    });
  }

  return connection;
};

/**
 * createNewConnection()
 * Creates a NEW IORedis connection (needed for BullMQ workers,
 * since each worker needs its own connection).
 */
const createNewConnection = () => {
  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

/**
 * closeRedisConnection()
 * Gracefully closes the shared Redis connection.
 */
const closeRedisConnection = async () => {
  if (connection) {
    await connection.quit();
    connection = null;
    logger.info("Redis: Connection closed gracefully");
  }
};

module.exports = {
  getRedisConnection,
  createNewConnection,
  closeRedisConnection,
  REDIS_URL,
};
