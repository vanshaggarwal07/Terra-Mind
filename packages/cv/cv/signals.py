"""CV change polygons -> ``construction_detected`` pattern signals (P4.5).

Blueprint §3.5/§0: satellite-derived change is a PATTERN signal, strictly
lower-trust than official records. It is written as an unverified
``construction_detected`` infra event tagged ``source_tier="pattern_cv"``, and it
can NEVER alone flip a fact to verified or produce a builder verdict — every one
is routed to the human review queue (P1.9) before any high-stakes use.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from cv.change import ChangePolygon
from warehouse.enums import (
    InfraEventStatus,
    InfraEventType,
    ReviewEntityType,
    ReviewReason,
    SourceTier,
)
from warehouse.models import InfraEvent
from warehouse.repositories import InfraEventRepo, ReviewQueueRepo

# Label surfaced to users so the trust tier is unmistakable (§3.5).
PATTERN_LABEL = "Detected from satellite imagery — pattern signal, not an official record."


def polygon_to_extraction(poly: ChangePolygon) -> dict[str, Any]:
    return {
        "signal": "construction_detected",
        "label": PATTERN_LABEL,
        "older_date": poly.older_date,
        "current_date": poly.current_date,
        "pixel_area": poly.pixel_area,
        "area_m2": poly.area_m2,
        "bbox": {
            "min_lat": poly.min_lat,
            "min_lng": poly.min_lng,
            "max_lat": poly.max_lat,
            "max_lng": poly.max_lng,
        },
    }


def persist_change_signals(
    session: Session,
    polygons: list[ChangePolygon],
    *,
    source_id: str | None = None,
    locality_id: str | None = None,
) -> list[InfraEvent]:
    """Create unverified ``construction_detected`` events + queue them for review.

    Returns the created events. ``verified`` is ALWAYS False here — a CV signal
    cannot self-verify (test-enforced)."""
    infra = InfraEventRepo(session)
    review = ReviewQueueRepo(session)
    created: list[InfraEvent] = []

    for poly in polygons:
        event = infra.create(
            type=InfraEventType.construction_detected,
            status=InfraEventStatus.under_construction,
            confidence=poly.confidence,
            source_id=source_id,
            source_document=None,
            source_tier=SourceTier.pattern_cv,  # lowest trust tier
            lat=poly.centroid_lat,
            lng=poly.centroid_lng,
            locality_id=poly.locality_id or locality_id,
            verified=False,  # NEVER auto-verified — human gate required (§0/§3.5)
            extraction=polygon_to_extraction(poly),
        )
        created.append(event)
        review.enqueue(
            entity_type=ReviewEntityType.infra_event,
            entity_ref={
                "infra_event_id": event.id,
                "signal": "construction_detected",
                "source_tier": "pattern_cv",
                "label": PATTERN_LABEL,
                **polygon_to_extraction(poly),
            },
            reason=ReviewReason.unverifiable_source,  # pattern signal needs corroboration
            source_id=source_id,
            confidence=poly.confidence,
        )
    return created
