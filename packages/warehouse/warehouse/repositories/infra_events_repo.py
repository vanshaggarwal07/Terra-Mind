"""Repository for ``infra_events``.

Public reads expose only ``verified=True`` rows; writers may create unverified
rows that must pass the review gate before display (blueprint §3.4.4)."""

from __future__ import annotations

import datetime as dt
from typing import Any

from geoalchemy2.elements import WKTElement
from sqlalchemy import select
from sqlalchemy.orm import Session

from warehouse.enums import InfraEventStatus, InfraEventType, SourceTier
from warehouse.models import InfraEvent


def _point(lat: float | None, lng: float | None) -> WKTElement | None:
    if lat is None or lng is None:
        return None
    return WKTElement(f"POINT({lng} {lat})", srid=4326)


class InfraEventRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, event_id: str) -> InfraEvent | None:
        return self.session.get(InfraEvent, event_id)

    def create(
        self,
        *,
        type: InfraEventType,
        status: InfraEventStatus,
        confidence: float,
        expected_year: int | None = None,
        budget_inr_cr: float | None = None,
        source_id: str | None = None,
        source_document: str | None = None,
        source_tier: SourceTier = SourceTier.official,
        lat: float | None = None,
        lng: float | None = None,
        locality_id: str | None = None,
        verified: bool = False,
        extraction: dict[str, Any] | None = None,
    ) -> InfraEvent:
        event = InfraEvent(
            type=type,
            status=status,
            confidence=confidence,
            expected_year=expected_year,
            budget_inr_cr=budget_inr_cr,
            source_id=source_id,
            source_document=source_document,
            source_tier=source_tier,
            geom=_point(lat, lng),
            locality_id=locality_id,
            verified=verified,
            extraction=extraction or {},
        )
        self.session.add(event)
        self.session.flush()
        return event

    def set_verified(self, event_id: str, verified: bool = True) -> InfraEvent | None:
        event = self.get(event_id)
        if event is None:
            return None
        event.verified = verified
        event.last_verified_at = dt.datetime.now(dt.UTC)
        self.session.flush()
        return event

    def list_verified(self, limit: int = 100) -> list[InfraEvent]:
        stmt = select(InfraEvent).where(InfraEvent.verified.is_(True)).limit(limit)
        return list(self.session.scalars(stmt).all())
