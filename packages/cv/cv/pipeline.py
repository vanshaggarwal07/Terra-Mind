"""End-to-end CV batch: tile pairs -> change polygons -> pattern signals (P4.4/P4.5).

Designed to run as a scheduled GPU-spot batch (§9): load the trained segmenter
by version, detect change on each locality's tile pair, and persist the results
as unverified ``pattern_cv`` signals routed to human review.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from cv.change import detect_change
from cv.segmentation import SegmentationModel
from cv.signals import persist_change_signals
from cv.tiles import TilePair
from warehouse.models import InfraEvent


@dataclass
class CVRunSummary:
    pairs_processed: int = 0
    polygons_detected: int = 0
    signals_created: int = 0
    created_event_ids: list[str] = field(default_factory=list)


def run_cv_pipeline(
    session: Session,
    model: SegmentationModel,
    pairs: list[TilePair],
    *,
    source_id: str | None = None,
    min_pixels: int = 6,
) -> CVRunSummary:
    summary = CVRunSummary()
    for pair in pairs:
        polygons = detect_change(model, pair, min_pixels=min_pixels)
        summary.pairs_processed += 1
        summary.polygons_detected += len(polygons)
        created: list[InfraEvent] = persist_change_signals(
            session, polygons, source_id=source_id, locality_id=pair.locality_id
        )
        summary.signals_created += len(created)
        summary.created_event_ids.extend(e.id for e in created)
    return summary
