// ============================================================
// middleware/requestLogger.js — Request Tracing & Logging
// ============================================================
// Generates a unique correlation ID for each request, injects
// it into response headers, and logs request/response with
// timing information for cross-service debugging.
// ============================================================

const { v4: uuidv4 } = require("uuid");
const logger = require("../config/logger");

/**
 * requestLogger()
 * Express middleware that:
 * 1. Generates a correlation ID (UUID v4) per request
 * 2. Attaches it to req.correlationId for downstream use
 * 3. Injects x-correlation-id into response headers
 * 4. Logs request start and completion with timing
 */
const requestLogger = (req, res, next) => {
  // Use existing correlation ID from upstream service or generate new one
  const correlationId =
    req.headers["x-correlation-id"] || uuidv4();

  // Attach to request for downstream middleware/controllers
  req.correlationId = correlationId;

  // Inject into response headers for client-side tracing
  res.setHeader("x-correlation-id", correlationId);

  // Record start time
  const startTime = process.hrtime.bigint();

  // Skip logging for health check endpoints (too noisy)
  const isHealthCheck = req.path.startsWith("/api/health") || req.path === "/";
  if (isHealthCheck) {
    return next();
  }

  // Log request start
  logger.info("Incoming request", {
    correlationId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    contentLength: req.headers["content-length"],
    userId: req.user?._id?.toString(),
  });

  // Hook into response finish to log completion
  const originalEnd = res.end;
  res.end = function (...args) {
    // Calculate response time in milliseconds
    const elapsed = Number(process.hrtime.bigint() - startTime) / 1e6;
    const responseTime = elapsed.toFixed(2);

    // Determine log level based on status code
    const statusCode = res.statusCode;
    const logLevel =
      statusCode >= 500
        ? "error"
        : statusCode >= 400
        ? "warn"
        : "info";

    logger[logLevel]("Request completed", {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.getHeader("content-length"),
      userId: req.user?._id?.toString(),
    });

    // Call the original end method
    originalEnd.apply(res, args);
  };

  next();
};

module.exports = requestLogger;
