// ============================================================
// server.js — Express Application Entry Point
// ============================================================
// Sets up Express, connects to MongoDB, mounts routes,
// starts workers, and handles graceful shutdown.
// ============================================================

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables FIRST before any other imports
dotenv.config();

const connectDB = require("./config/db");
const logger = require("./config/logger");
const requestLogger = require("./middleware/requestLogger");
const { generalLimiter } = require("./middleware/rateLimiter");

// Import route files
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const shareRoutes = require("./routes/shareRoutes");
const aiRoutes = require("./routes/aiRoutes");
const healthRoutes = require("./routes/healthRoutes");
const queueRoutes = require("./routes/queueRoutes");

// Import workers
const { startAIProcessingWorker } = require("./workers/aiProcessingWorker");
const { startVectorCleanupWorker } = require("./workers/vectorCleanupWorker");

// Import Redis for graceful shutdown
const { closeRedisConnection } = require("./config/redis");

// Initialize Express app
const app = express();

// ── Trust Proxy ────────────────────────────────────────────
// Required for correct IP detection behind CloudFront/ELB
app.set("trust proxy", 1);

// ── Middleware ──────────────────────────────────────────────
// Configure CORS - allow frontend origin
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions)); // Enable CORS with whitelist
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request tracing — correlation IDs + timing (must be before routes)
app.use(requestLogger);

// General rate limiter — baseline protection for all API routes
app.use("/api", generalLimiter);

// ── API Routes ─────────────────────────────────────────────
app.use("/api/health", healthRoutes);
app.use("/api/admin", queueRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/ai", aiRoutes);

// ── Health Check Route ─────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Cloud DMS API is running 🚀",
  });
});

// ── Global Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  logger.logError(err, req);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
let aiWorker = null;
let cleanupWorker = null;

connectDB().then(() => {
  // Start BullMQ workers after DB connection
  try {
    aiWorker = startAIProcessingWorker();
    cleanupWorker = startVectorCleanupWorker();
    logger.info("BullMQ workers started successfully");
  } catch (err) {
    logger.error("Failed to start BullMQ workers:", { error: err.message });
    logger.warn("Server will run but queue processing will be disabled");
  }

  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
});

// ── Graceful Shutdown ──────────────────────────────────────
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully...`);

  // Close workers first (stop picking up new jobs)
  if (aiWorker) {
    await aiWorker.close();
    logger.info("AI Processing Worker closed");
  }
  if (cleanupWorker) {
    await cleanupWorker.close();
    logger.info("Vector Cleanup Worker closed");
  }

  // Close Redis connection
  await closeRedisConnection();

  logger.info("Graceful shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
