"""Human review queue API (blueprint §3.4.4).

Reviewers see low-confidence / high-stakes extractions, then approve (optionally
with edits) or reject. Approving an infra-event extraction promotes it into a
VERIFIED ``infra_events`` row — the only way facts become user-visible."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from api.deps import DbSession
from warehouse.enums import (
    InfraEventStatus,
    InfraEventType,
    ReviewEntityType,
    ReviewStatus,
)
from warehouse.repositories import InfraEventRepo, ReviewQueueRepo
from warehouse.schemas import ReviewDecision, ReviewItemRead

router = APIRouter(prefix="/admin/review", tags=["review"])


@router.get("", response_model=list[ReviewItemRead])
def list_review(
    db: DbSession,
    status: ReviewStatus = ReviewStatus.pending,
    entity_type: ReviewEntityType | None = None,
    limit: int = 100,
) -> list[ReviewItemRead]:
    items = ReviewQueueRepo(db).list(status=status, entity_type=entity_type, limit=limit)
    return [ReviewItemRead.model_validate(i) for i in items]


@router.get("/count")
def pending_count(db: DbSession) -> dict[str, int]:
    return {"pending": ReviewQueueRepo(db).count_pending()}


@router.get("/{item_id}", response_model=ReviewItemRead)
def get_review(item_id: str, db: DbSession) -> ReviewItemRead:
    item = ReviewQueueRepo(db).get(item_id)
    if item is None:
        raise HTTPException(404, "review item not found")
    return ReviewItemRead.model_validate(item)


@router.post("/{item_id}/approve", response_model=ReviewItemRead)
def approve(item_id: str, decision: ReviewDecision, db: DbSession) -> ReviewItemRead:
    repo = ReviewQueueRepo(db)
    item = repo.get(item_id)
    if item is None:
        raise HTTPException(404, "review item not found")
    if item.status != ReviewStatus.pending:
        raise HTTPException(409, f"already {item.status}")

    entity_ref: dict[str, Any] = dict(item.entity_ref or {})
    if decision.edited:
        entity_ref = _merge(entity_ref, decision.edited)

    if item.entity_type == ReviewEntityType.infra_event:
        _promote_infra_event(db, entity_ref, source_id=item.source_id)

    updated = repo.decide(
        item_id, status=ReviewStatus.approved, reviewer=decision.reviewer, entity_ref=entity_ref
    )
    return ReviewItemRead.model_validate(updated)


@router.post("/{item_id}/reject", response_model=ReviewItemRead)
def reject(item_id: str, decision: ReviewDecision, db: DbSession) -> ReviewItemRead:
    repo = ReviewQueueRepo(db)
    item = repo.get(item_id)
    if item is None:
        raise HTTPException(404, "review item not found")
    if item.status != ReviewStatus.pending:
        raise HTTPException(409, f"already {item.status}")
    updated = repo.decide(item_id, status=ReviewStatus.rejected, reviewer=decision.reviewer)
    return ReviewItemRead.model_validate(updated)


def extraction_to_event_kwargs(ref: dict[str, Any], *, source_id: str | None) -> dict[str, Any]:
    """Pure mapping from a reviewed extraction dict to InfraEventRepo.create kwargs."""
    location = ref.get("location") or {}
    try:
        etype = InfraEventType(ref.get("project_type", "other"))
    except ValueError:
        etype = InfraEventType.other
    try:
        estatus = InfraEventStatus(ref.get("status", "proposed"))
    except ValueError:
        estatus = InfraEventStatus.proposed
    return {
        "type": etype,
        "status": estatus,
        "confidence": float(ref.get("extraction_confidence", 0.0)),
        "expected_year": ref.get("expected_completion_year"),
        "budget_inr_cr": ref.get("budget_inr_cr"),
        "source_id": source_id,
        "source_document": ref.get("source_document"),
        "lat": location.get("lat"),
        "lng": location.get("lng"),
        "verified": True,  # human-confirmed -> user-visible
        "extraction": ref,
    }


def _promote_infra_event(db: Session, ref: dict[str, Any], *, source_id: str | None) -> None:
    kwargs = extraction_to_event_kwargs(ref, source_id=source_id)
    InfraEventRepo(db).create(**kwargs)


def _merge(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    out = dict(base)
    for k, v in patch.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out
