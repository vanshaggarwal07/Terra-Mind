"""Unified operational surface (blueprint §9; Phase 5 P5.3/P5.4).

One place that consolidates ingestion health (crawl success + cache hit-rate +
extraction confidence, P1.11), review-queue depth (P1.9), ML model status +
accuracy (P3.10), per-service health checks, and the cost/budget dashboard (P5.4).
Degrades gracefully if the DB is unavailable so observability still works.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from fastapi import APIRouter
from sqlalchemy import text

from common.budget import get_budget_guard
from common.logging import get_logger

router = APIRouter(prefix="/ops", tags=["ops"])
log = get_logger(__name__)

_ML_DOMAINS = ("price", "traffic", "flood", "water", "aqi")
_CV_DOMAIN = "cv_segmentation"


@lru_cache(maxsize=1)
def _probe_engine():  # noqa: ANN202
    """A short-timeout engine so a down DB fails the health probe FAST (never hangs)."""
    from sqlalchemy import create_engine

    from common.config import get_settings

    return create_engine(
        get_settings().database_url,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 2},
    )


def _db_ok() -> bool:
    try:
        with _probe_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:  # noqa: BLE001 - health probe must never raise
        log.warning("ops_db_probe_failed", error=str(exc))
        return False


def _review_depth() -> int | None:
    try:
        from sqlalchemy.orm import Session

        from warehouse.repositories import ReviewQueueRepo

        with Session(_probe_engine()) as session:
            return ReviewQueueRepo(session).count_pending()
    except Exception:  # noqa: BLE001
        return None


def _model_status() -> dict[str, Any]:
    from ml.registry import ModelRegistry

    reg = ModelRegistry()
    out: dict[str, Any] = {}
    for domain in (*_ML_DOMAINS, _CV_DOMAIN):
        meta = None
        try:
            meta = reg.metadata(domain)
        except Exception:  # noqa: BLE001
            meta = None
        out[domain] = (
            None
            if meta is None
            else {
                "model_version": meta.model_version,
                "trained_at": meta.trained_at,
                "metrics": meta.metrics,
                "synthetic": meta.synthetic,
            }
        )
    return out


@router.get("/health")
def health() -> dict[str, Any]:
    """Per-service status for uptime checks (§9)."""
    db = _db_ok()
    models = _model_status()
    trained = [d for d, m in models.items() if m is not None]
    services = {
        "api": "ok",
        "database": "ok" if db else "degraded",
        "models": "ok" if trained else "not_trained",
    }
    overall = "ok" if db else "degraded"
    return {"status": overall, "services": services, "models_trained": trained}


@router.get("/metrics")
def metrics() -> dict[str, Any]:
    """Consolidated ingestion + review + ML + cost view (one operational surface)."""
    from ingestion.observability import ingestion_snapshot

    snapshot = ingestion_snapshot()
    snapshot["review_queue"] = {"pending": _review_depth()}
    snapshot["models"] = _model_status()
    snapshot["costs"] = [s.__dict__ for s in get_budget_guard().snapshot()]
    return snapshot


@router.get("/costs")
def costs() -> dict[str, Any]:
    """Per-line-item spend vs budget for the expensive/optional features (P5.4)."""
    guard = get_budget_guard()
    return {
        "line_items": [s.__dict__ for s in guard.snapshot()],
        "note": (
            "X/social, satellite, and GPU batch are optional and gated/off by "
            "default. Hitting a cap disables the feature (fails safe) and alerts."
        ),
    }
