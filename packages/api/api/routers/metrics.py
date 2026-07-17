"""Ingestion observability endpoint (blueprint §1.11)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from api.deps import DbSession
from warehouse.repositories import ReviewQueueRepo

router = APIRouter(prefix="/admin/metrics", tags=["metrics"])


@router.get("/ingestion")
def ingestion_metrics(db: DbSession) -> dict[str, Any]:
    from ingestion.observability import ingestion_snapshot

    snapshot = ingestion_snapshot()
    snapshot["review_queue"] = {"pending": ReviewQueueRepo(db).count_pending()}
    return snapshot
