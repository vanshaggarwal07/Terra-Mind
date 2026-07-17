"""Persistence for the doc-intel pipeline.

A ``Persister`` protocol keeps the pipeline unit-testable (fake in tests); the
``DBPersister`` wires it to the warehouse repositories.
"""

from __future__ import annotations

from typing import Protocol

from ingestion.docintel.geocoder import GeoPoint
from ingestion.docintel.schema import ExtractedInfraEvent
from warehouse.enums import ReviewEntityType, ReviewReason, SourceTier
from warehouse.repositories import DocChunkRepo, InfraEventRepo, ReviewQueueRepo


class Persister(Protocol):
    def add_chunk(
        self,
        *,
        source_id: str | None,
        raw_cache_id: str | None,
        index: int,
        section_title: str | None,
        text: str,
        embedding: list[float] | None,
    ) -> str: ...

    def create_infra_event(
        self,
        *,
        event: ExtractedInfraEvent,
        geo: GeoPoint | None,
        source_id: str | None,
        source_tier: SourceTier,
        verified: bool,
    ) -> str: ...

    def enqueue_review(
        self,
        *,
        event: ExtractedInfraEvent,
        reason: ReviewReason,
        source_id: str | None,
    ) -> str: ...


class DBPersister:
    def __init__(self, session) -> None:  # noqa: ANN001
        self.chunks = DocChunkRepo(session)
        self.events = InfraEventRepo(session)
        self.review = ReviewQueueRepo(session)

    def add_chunk(self, *, source_id, raw_cache_id, index, section_title, text, embedding) -> str:
        row = self.chunks.add(
            source_id=source_id,
            raw_cache_id=raw_cache_id,
            chunk_index=index,
            section_title=section_title,
            text=text,
            embedding=embedding,
        )
        return row.id

    def create_infra_event(self, *, event, geo, source_id, source_tier, verified) -> str:
        row = self.events.create(
            type=event.to_infra_type(),
            status=event.to_status(),
            confidence=event.extraction_confidence,
            expected_year=event.expected_completion_year,
            budget_inr_cr=event.budget_inr_cr,
            source_id=source_id,
            source_document=event.source_document,
            source_tier=source_tier,
            lat=geo.lat if geo else event.location.lat,
            lng=geo.lng if geo else event.location.lng,
            verified=verified,
            extraction=event.model_dump(),
        )
        return row.id

    def enqueue_review(self, *, event, reason, source_id) -> str:
        row = self.review.enqueue(
            entity_type=ReviewEntityType.infra_event,
            entity_ref=event.model_dump(),
            reason=reason,
            source_id=source_id,
            confidence=event.extraction_confidence,
        )
        return row.id
