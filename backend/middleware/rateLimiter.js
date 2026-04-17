// ============================================================
// middleware/rateLimiter.js — Rate Limiting Middleware
// ============================================================
// Provides multiple rate limiter instances for different
// endpoint categories. Uses per-user tracking for authed
// requests and IP fallback for unauthenticated requests.
// ============================================================

const rateLimit = require("express-rate-limit");
const rateLimitConfig = require("../config/rateLimitConfig");
const logger = require("../config/logger");

/**
 * Creates a rate limiter with standardized options.
 * @param {string} name - Limiter name for logging
 * @param {Object} config - Config from rateLimitConfig
 * @param {Function} [keyGenerator] - Custom key generator
 * @returns {Function} Express middleware
 */
const createLimiter = (name, config, keyGenerator = null) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,   // Disable `X-RateLimit-*` headers

    // Use user ID for authed requests, IP for unauthenticated
    keyGenerator: keyGenerator || ((req) => {
      return req.user?._id?.toString() || req.ip;
    }),

    // Graceful 429 response with retry information
    handler: (req, res, next, options) => {
      const retryAfter = Math.ceil(config.windowMs / 1000);

      logger.warn("Rate limit exceeded", {
        limiter: name,
        ip: req.ip,
        userId: req.user?._id?.toString(),
        path: req.path,
        method: req.method,
        correlationId: req.correlationId,
      });

      res.status(429).json({
        success: false,
        message: config.message,
        retryAfter: retryAfter,
        limit: config.max,
        windowMs: config.windowMs,
      });
    },

    // Skip health check endpoints
    skip: (req) => {
      return req.path.startsWith("/api/health") || req.path === "/";
    },
  });
};

// ── General API rate limiter ───────────────────────────────
// Applies to all /api/* routes as a baseline protection
const generalLimiter = createLimiter("general", rateLimitConfig.general);

// ── Authentication rate limiter ────────────────────────────
// Stricter limit for login/register to prevent brute-force attacks
// Uses IP-based tracking since users aren't authenticated yet
const authLimiter = createLimiter(
  "auth",
  rateLimitConfig.auth,
  (req) => req.ip // Always use IP for auth routes (user not yet authenticated)
);

// ── File upload rate limiter ───────────────────────────────
// Prevents excessive uploads that could fill S3 storage
const uploadLimiter = createLimiter("upload", rateLimitConfig.upload);

// ── AI query rate limiter ──────────────────────────────────
// Controls Groq API costs by limiting per-user AI queries
const aiQueryLimiter = createLimiter("aiQuery", rateLimitConfig.aiQuery);

// ── AI processing rate limiter ─────────────────────────────
// Prevents excessive document processing requests
const aiProcessLimiter = createLimiter("aiProcess", rateLimitConfig.aiProcess);

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  aiQueryLimiter,
  aiProcessLimiter,
};
