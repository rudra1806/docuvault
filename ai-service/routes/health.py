# ============================================================
# routes/health.py — AI Service Health Check Endpoints
# ============================================================
# Provides deep health checks for AI service dependencies:
# Qdrant Cloud connectivity, memory usage, and processing
# queue status. Supports liveness/readiness probes.
# ============================================================

import logging
import time
from datetime import datetime, timezone
from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Health"])

# Track service start time for uptime calculation
_start_time = time.time()


def _check_qdrant() -> dict:
    """Check Qdrant Cloud connectivity."""
    try:
        from config.qdrant_client import get_qdrant_client
        from config.settings import get_settings

        settings = get_settings()
        client = get_qdrant_client()
        collections = client.get_collections()
        collection_names = [c.name for c in collections.collections]

        has_collection = settings.QDRANT_COLLECTION in collection_names

        return {
            "status": "healthy" if has_collection else "degraded",
            "collections": len(collection_names),
            "target_collection": settings.QDRANT_COLLECTION,
            "collection_exists": has_collection,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }


def _get_memory_info() -> dict:
    """Get memory usage information."""
    try:
        import psutil

        mem = psutil.virtual_memory()
        proc = psutil.Process()
        proc_mem = proc.memory_info()

        return {
            "system_total": f"{mem.total // (1024 * 1024)}MB",
            "system_available": f"{mem.available // (1024 * 1024)}MB",
            "system_percent": f"{mem.percent}%",
            "process_rss": f"{proc_mem.rss // (1024 * 1024)}MB",
            "process_vms": f"{proc_mem.vms // (1024 * 1024)}MB",
        }
    except ImportError:
        # psutil not installed — return basic info
        import os

        return {
            "note": "psutil not installed, limited metrics",
            "pid": os.getpid(),
        }
    except Exception as e:
        return {"error": str(e)}


def _get_processing_status() -> dict:
    """Get current processing queue status."""
    try:
        from routes.process import processing_status

        total = len(processing_status)
        active = sum(
            1
            for s in processing_status.values()
            if s.get("status") == "processing"
        )
        completed = sum(
            1
            for s in processing_status.values()
            if s.get("status") == "completed"
        )
        failed = sum(
            1
            for s in processing_status.values()
            if s.get("status") == "failed"
        )

        return {
            "total_tracked": total,
            "active": active,
            "completed": completed,
            "failed": failed,
        }
    except Exception as e:
        return {"error": str(e)}


# ── GET /health — Full dependency health ────────────────────
@router.get("")
async def full_health():
    """Full health check with all dependency statuses."""
    start = time.time()

    qdrant_health = _check_qdrant()
    memory_info = _get_memory_info()
    processing_info = _get_processing_status()

    is_healthy = qdrant_health["status"] == "healthy"
    overall_status = "healthy" if is_healthy else "degraded"

    response_time = f"{(time.time() - start) * 1000:.1f}ms"

    status_code = 200 if is_healthy else 503

    return {
        "status": overall_status,
        "service": "docuvault-ai",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime": int(time.time() - _start_time),
        "responseTime": response_time,
        "dependencies": {
            "qdrant": qdrant_health,
        },
        "processing": processing_info,
        "system": memory_info,
    }


# ── GET /health/live — Liveness probe ──────────────────────
@router.get("/live")
async def liveness():
    """Liveness probe — is the process alive?"""
    return {
        "status": "alive",
        "service": "docuvault-ai",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime": int(time.time() - _start_time),
    }


# ── GET /health/ready — Readiness probe ────────────────────
@router.get("/ready")
async def readiness():
    """Readiness probe — can the service accept traffic?"""
    qdrant_health = _check_qdrant()
    is_ready = qdrant_health["status"] in ("healthy", "degraded")

    status_code = 200 if is_ready else 503

    return {
        "status": "ready" if is_ready else "not_ready",
        "service": "docuvault-ai",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "qdrant": qdrant_health["status"],
        },
    }
