// ============================================================
// config/logger.js — CloudWatch Logger Configuration
// ============================================================
// Sets up Winston logger with CloudWatch integration for
// centralized logging and monitoring.
// ============================================================

const winston = require("winston");
const WinstonCloudWatch = require("winston-cloudwatch");

// Create base logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: "docuvault-api",
    environment: process.env.NODE_ENV || "development",
  },
  transports: [
    // Console logging (always enabled)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Add CloudWatch transport only if AWS credentials are configured
if (
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
) {
  const cloudwatchConfig = {
    logGroupName: process.env.CLOUDWATCH_GROUP_NAME || "/docuvault/api",
    logStreamName: `${process.env.NODE_ENV || "production"}-${new Date().toISOString().split("T")[0]}`,
    awsRegion: process.env.AWS_REGION,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
    messageFormatter: ({ level, message, ...meta }) => {
      return JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      });
    },
  };

  logger.add(new WinstonCloudWatch(cloudwatchConfig));
  logger.info("CloudWatch logging enabled", {
    logGroup: cloudwatchConfig.logGroupName,
    region: process.env.AWS_REGION,
  });
} else {
  logger.info("CloudWatch logging disabled", {
    reason: !process.env.AWS_REGION ? "Missing AWS_REGION" :
            !process.env.AWS_ACCESS_KEY_ID ? "Missing AWS_ACCESS_KEY_ID" :
            !process.env.AWS_SECRET_ACCESS_KEY ? "Missing AWS_SECRET_ACCESS_KEY" :
            "Unknown",
  });
}

// Helper methods for structured logging
logger.logRequest = (req, message = "API Request") => {
  logger.info(message, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    userId: req.user?._id,
  });
};

logger.logError = (error, req = null) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    name: error.name,
  };

  if (req) {
    errorLog.method = req.method;
    errorLog.path = req.path;
    errorLog.ip = req.ip;
    errorLog.userId = req.user?._id;
  }

  logger.error("Error occurred", errorLog);
};

logger.logS3Operation = (operation, key, success = true, error = null) => {
  const log = {
    operation,
    s3Key: key,
    success,
  };

  if (error) {
    log.error = error.message;
  }

  logger.info("S3 Operation", log);
};

logger.logAuth = (action, email, success = true, reason = null) => {
  const log = {
    action,
    email,
    success,
  };

  if (reason) {
    log.reason = reason;
  }

  logger.info("Authentication Event", log);
};

module.exports = logger;
