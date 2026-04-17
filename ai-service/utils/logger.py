# ============================================================
# utils/logger.py — Structured JSON Logging for AI Service
# ============================================================
# Provides structured JSON logging with correlation ID
# extraction from incoming requests. Formats logs to match
# the Node.js backend's Winston output for unified parsing.
# ============================================================

import json
import logging
import time
from datetime import datetime, timezone
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class StructuredJsonFormatter(logging.Formatter):
    """
    Custom JSON formatter that outputs structured log entries
    matching the Node.js backend's Winston format.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "service": "docuvault-ai",
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add correlation ID if attached to log record
        if hasattr(record, "correlationId"):
            log_entry["correlationId"] = record.correlationId

        # Add exception info if present
        if record.exc_info and record.exc_info[0]:
            log_entry["error"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "stack": self.formatException(record.exc_info),
            }

        # Add any extra fields
        for key in ("method", "path", "statusCode", "responseTime",
                     "ip", "userId", "correlationId"):
            if hasattr(record, key):
                log_entry[key] = getattr(record, key)

        return json.dumps(log_entry)


def setup_structured_logging(level: str = "INFO") -> None:
    """
    Configure the root logger with structured JSON output.
    Call this once at application startup.
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers to prevent duplicate output
    root_logger.handlers.clear()

    # Add structured JSON handler
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredJsonFormatter())
    root_logger.addHandler(handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware that extracts the correlation ID from incoming
    request headers (x-correlation-id) and injects it into the
    response headers. Logs request start and completion with timing.
    """

    # Paths to skip logging (too noisy)
    SKIP_PATHS = {"/", "/health", "/health/live", "/health/ready"}

    async def dispatch(self, request: Request, call_next):
        # Extract or note absence of correlation ID
        correlation_id = request.headers.get("x-correlation-id", None)

        # Store on request state for access in route handlers
        request.state.correlation_id = correlation_id

        start_time = time.time()
        skip_logging = request.url.path in self.SKIP_PATHS

        if not skip_logging and correlation_id:
            logger = logging.getLogger("request")
            logger.info(
                f"Incoming: {request.method} {request.url.path}",
                extra={
                    "correlationId": correlation_id,
                    "method": request.method,
                    "path": str(request.url.path),
                    "ip": request.client.host if request.client else None,
                },
            )

        # Process request
        response = await call_next(request)

        # Inject correlation ID into response headers
        if correlation_id:
            response.headers["x-correlation-id"] = correlation_id

        # Log completion with timing
        if not skip_logging:
            elapsed = (time.time() - start_time) * 1000
            logger = logging.getLogger("request")
            log_level = (
                logging.ERROR if response.status_code >= 500
                else logging.WARNING if response.status_code >= 400
                else logging.INFO
            )
            logger.log(
                log_level,
                f"Completed: {request.method} {request.url.path} → {response.status_code} ({elapsed:.1f}ms)",
                extra={
                    "correlationId": correlation_id,
                    "method": request.method,
                    "path": str(request.url.path),
                    "statusCode": response.status_code,
                    "responseTime": f"{elapsed:.1f}ms",
                },
            )

        return response
