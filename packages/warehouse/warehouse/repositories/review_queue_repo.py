"""Repository for ``review_queue`` (blueprint §3.4.4)."""

from __future__ import annotations

import datetime as dt
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from warehouse.enums import ReviewEntityType, ReviewReason, ReviewStatus
from warehouse.models import ReviewQueue


class ReviewQueueRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def enqueue(
        self,
        *,
        entity_type: ReviewEntityType,
        entity_ref: dict[str, Any],
        reason: ReviewReason,
        source_id: str | None = None,
        confidence: float | None = None,
    ) -> ReviewQueue:
        item = ReviewQueue(
            entity_type=entity_type,
            entity_ref=entity_ref,
            reason=reason,
            source_id=source_id,
            confidence=confidence,
            status=ReviewStatus.pending,
        )
        self.session.add(item)
        self.session.flush()
        return item

    def get(self, item_id: str) -> ReviewQueue | None:
        return self.session.get(ReviewQueue, item_id)

    def list(
        self,
        *,
        status: ReviewStatus | None = ReviewStatus.pending,
        entity_type: ReviewEntityType | None = None,
        limit: int = 100,
    ) -> list[ReviewQueue]:
        stmt = select(ReviewQueue)
        if status is not None:
            stmt = stmt.where(ReviewQueue.status == status)
        if entity_type is not None:
            stmt = stmt.where(ReviewQueue.entity_type == entity_type)
        stmt = stmt.order_by(ReviewQueue.created_at.asc()).limit(limit)
        return list(self.session.scalars(stmt).all())

    def count_pending(self) -> int:
        return len(self.list(status=ReviewStatus.pending, limit=10_000))

    def decide(
        self, item_id: str, *, status: ReviewStatus, reviewer: str, entity_ref: dict | None = None
    ) -> ReviewQueue | None:
        item = self.get(item_id)
        if item is None:
            return None
        item.status = status
        item.reviewer = reviewer
        item.decided_at = dt.datetime.now(dt.UTC)
        if entity_ref is not None:
            item.entity_ref = entity_ref
        self.session.flush()
        return item
