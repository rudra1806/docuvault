// ============================================================
// routes/healthRoutes.js — Health Check Endpoints
// ============================================================
// Provides deep health checks for all dependencies:
// MongoDB, S3, and AI Service. Supports liveness/readiness
// probes for ELB and Kubernetes deployments.
// ============================================================

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { S3Client, HeadBucketCommand } = require("@aws-sdk/client-s3");
const logger = require("../config/logger");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// S3 client reference (reuse from config)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ── Helper: Check MongoDB health ───────────────────────────
const checkMongoDB = () => {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const state = mongoose.connection.readyState;
  const stateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    status: state === 1 ? "healthy" : "unhealthy",
    state: stateMap[state] || "unknown",
    host: mongoose.connection.host || null,
    database: mongoose.connection.name || null,
  };
};

// ── Helper: Check S3 health ────────────────────────────────
const checkS3 = async () => {
  try {
    if (!BUCKET_NAME || !process.env.AWS_REGION) {
      return { status: "unhealthy", error: "S3 not configured" };
    }

    const command = new HeadBucketCommand({ Bucket: BUCKET_NAME });
    await s3Client.send(command);

    return { status: "healthy", bucket: BUCKET_NAME };
  } catch (error) {
    return {
      status: "unhealthy",
      bucket: BUCKET_NAME,
      error: error.message,
    };
  }
};

// ── Helper: Check AI Service health ────────────────────────
const checkAIService = async () => {
  try {
    if (!AI_SERVICE_URL) {
      return { status: "unhealthy", error: "AI_SERVICE_URL not configured" };
    }

    const axios = require("axios");
    const response = await axios.get(`${AI_SERVICE_URL}/health/ready`, {
      timeout: 5000,
    });

    return {
      status: response.data.status === "ready" ? "healthy" : "degraded",
      url: AI_SERVICE_URL,
      details: response.data,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      url: AI_SERVICE_URL,
      error: error.message,
    };
  }
};

// ── GET /api/health — Full system health ───────────────────
router.get("/", async (req, res) => {
  const startTime = Date.now();

  try {
    // Run all dependency checks in parallel
    const [mongoHealth, s3Health, aiHealth] = await Promise.all([
      checkMongoDB(),
      checkS3(),
      checkAIService(),
    ]);

    const isHealthy =
      mongoHealth.status === "healthy" &&
      s3Health.status === "healthy";

    // AI service being down degrades the system but doesn't make it unhealthy
    const overallStatus = !isHealthy
      ? "unhealthy"
      : aiHealth.status !== "healthy"
      ? "degraded"
      : "healthy";

    const healthReport = {
      status: overallStatus,
      service: "docuvault-backend",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      responseTime: `${Date.now() - startTime}ms`,
      dependencies: {
        mongodb: mongoHealth,
        s3: s3Health,
        aiService: aiHealth,
      },
      system: {
        memoryUsage: {
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        },
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
      },
    };

    const statusCode = overallStatus === "unhealthy" ? 503 : 200;

    res.status(statusCode).json(healthReport);
  } catch (error) {
    logger.logError(error);
    res.status(503).json({
      status: "unhealthy",
      service: "docuvault-backend",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// ── GET /api/health/live — Liveness probe ──────────────────
// If Express is responding, the process is alive.
// Used by ELB/Kubernetes to decide if a container needs restart.
router.get("/live", (req, res) => {
  res.status(200).json({
    status: "alive",
    service: "docuvault-backend",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// ── GET /api/health/ready — Readiness probe ────────────────
// Returns 200 only if the backend can serve traffic (DB connected).
// Used by load balancers to remove unhealthy instances from rotation.
router.get("/ready", (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const isReady = mongoState === 1;

  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    status: isReady ? "ready" : "not_ready",
    service: "docuvault-backend",
    timestamp: new Date().toISOString(),
    checks: {
      mongodb: mongoState === 1 ? "connected" : "disconnected",
    },
  });
});

module.exports = router;
