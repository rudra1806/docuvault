// ============================================================
// config/rateLimitConfig.js — Rate Limit Configuration
// ============================================================
// Centralized configuration for all rate limit values.
// All values can be overridden via environment variables.
// ============================================================

const rateLimitConfig = {
  // General API rate limit — applies to all /api/* routes
  general: {
    windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX) || 100,
    message: "Too many requests. Please try again later.",
  },

  // Authentication rate limit — login/register (brute-force protection)
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 10,
    message: "Too many authentication attempts. Please wait 15 minutes before trying again.",
  },

  // File upload rate limit
  upload: {
    windowMs: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX) || 20,
    message: "Upload limit reached. Please wait before uploading more files.",
  },

  // AI query rate limit (controls Groq API costs)
  aiQuery: {
    windowMs: parseInt(process.env.RATE_LIMIT_AI_QUERY_WINDOW_MS) || 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.RATE_LIMIT_AI_QUERY_MAX) || 30,
    message: "AI query limit reached. You can ask up to 30 questions per hour.",
  },

  // AI document processing rate limit
  aiProcess: {
    windowMs: parseInt(process.env.RATE_LIMIT_AI_PROCESS_WINDOW_MS) || 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.RATE_LIMIT_AI_PROCESS_MAX) || 50,
    message: "AI processing limit reached. Please wait before processing more documents.",
  },
};

module.exports = rateLimitConfig;
