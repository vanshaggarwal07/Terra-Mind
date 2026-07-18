"""Repository for ``infra_events`` + geospatial queries (blueprint §4).

Public read methods expose ONLY ``verified=True`` rows. An ``include_unverified``
flag is reserved for internal/review use (blueprint §0/§3.4.4)."""

from __future__ import annotations

import datetime as dt
from typing import Any

from geoalchemy2.elements import WKTElement
from sqlalchemy import select
from sqlalchemy.orm import Session

from warehouse.enums import InfraEventStatus, InfraEventType, SourceTier
from warehouse.models import InfraEvent, InfraEventAffectsLocality, Source
from warehouse.repositories import geo
from warehouse.schemas import Citation, InfraEventRead


def _point(lat: float | None, lng: float | None) -> WKTElement | None:
    if lat is None or lng is None:
        return None
    return geo.point(lat, lng)


def _citation(source: Source | None, event: InfraEvent) -> Citation:
    return Citation(
        source_id=event.source_id,
        source_name=source.source_name if source else None,
        source_document=event.source_document or (source.base_url if source else None),
        as_of=event.last_verified_at,
    )


def to_read(
    event: InfraEvent,
    source: Source | None = None,
    *,
    lat: float | None = None,
    lng: float | None = None,
    distance_km: float | None = None,
) -> InfraEventRead:
    return InfraEventRead(
        id=event.id,
        type=str(event.type),
        status=str(event.status),
        expected_year=event.expected_year,
        budget_inr_cr=float(event.budget_inr_cr) if event.budget_inr_cr is not None else None,
        confidence=float(event.confidence),
        source_tier=str(event.source_tier),
        lat=lat,
        lng=lng,
        locality_id=event.locality_id,
        verified=event.verified,
        citation=_citation(source, event),
        distance_km=round(distance_km, 3) if distance_km is not None else None,
    )


class InfraEventRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    # -- writes --------------------------------------------------------------
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

    # -- public reads (verified only) ---------------------------------------
    def _base_select(self, *, include_unverified: bool):  # noqa: ANN202
        stmt = (
            select(
                InfraEvent,
                Source,
                geo.lat_of(InfraEvent.geom).label("lat"),
                geo.lng_of(InfraEvent.geom).label("lng"),
            )
            .join(Source, InfraEvent.source_id == Source.id, isouter=True)
        )
        if not include_unverified:
            stmt = stmt.where(InfraEvent.verified.is_(True))
        return stmt

    def list_read(
        self,
        *,
        type: InfraEventType | None = None,
        status: InfraEventStatus | None = None,
        include_unverified: bool = False,
        limit: int = 100,
        offset: int = 0,
    ) -> list[InfraEventRead]:
        stmt = self._base_select(include_unverified=include_unverified)
        if type is not None:
            stmt = stmt.where(InfraEvent.type == type)
        if status is not None:
            stmt = stmt.where(InfraEvent.status == status)
        stmt = stmt.order_by(InfraEvent.expected_year.nulls_last()).limit(limit).offset(offset)
        return [
            to_read(ev, src, lat=lat, lng=lng)
            for ev, src, lat, lng in self.session.execute(stmt).all()
        ]

    def within_km(
        self, lat: float, lng: float, km: float, *, type: InfraEventType | None = None
    ) -> list[InfraEventRead]:
        pt = geo.point(lat, lng)
        stmt = self._base_select(include_unverified=False).add_columns(
            geo.distance_km_expr(InfraEvent.geom, pt).label("dkm")
        )
        stmt = stmt.where(geo.dwithin(InfraEvent.geom, pt, km * 1000.0))
        if type is not None:
            stmt = stmt.where(InfraEvent.type == type)
        stmt = stmt.order_by("dkm")
        out: list[InfraEventRead] = []
        for ev, src, elat, elng, dkm in self.session.execute(stmt).all():
            out.append(to_read(ev, src, lat=elat, lng=elng, distance_km=dkm))
        return out

    def nearest_by_type(
        self, lat: float, lng: float, type: InfraEventType
    ) -> InfraEventRead | None:
        pt = geo.point(lat, lng)
        stmt = (
            self._base_select(include_unverified=False)
            .add_columns(geo.distance_km_expr(InfraEvent.geom, pt).label("dkm"))
            .where(InfraEvent.type == type, InfraEvent.geom.is_not(None))
            .order_by("dkm")
            .limit(1)
        )
        row = self.session.execute(stmt).first()
        if row is None:
            return None
        ev, src, elat, elng, dkm = row
        return to_read(ev, src, lat=elat, lng=elng, distance_km=dkm)

    def affecting_locality(
        self, locality_id: str, *, include_unverified: bool = False
    ) -> list[InfraEventRead]:
        """Verified events linked to a locality via the AFFECTS edge, with the
        edge distance, ordered for timeline rendering (by expected_year)."""
        stmt = (
            select(
                InfraEvent,
                Source,
                geo.lat_of(InfraEvent.geom).label("lat"),
                geo.lng_of(InfraEvent.geom).label("lng"),
                InfraEventAffectsLocality.distance_km,
            )
            .join(
                InfraEventAffectsLocality,
                InfraEventAffectsLocality.infra_event_id == InfraEvent.id,
            )
            .join(Source, InfraEvent.source_id == Source.id, isouter=True)
            .where(InfraEventAffectsLocality.locality_id == locality_id)
        )
        if not include_unverified:
            stmt = stmt.where(InfraEvent.verified.is_(True))
        stmt = stmt.order_by(
            InfraEvent.expected_year.nulls_last(), InfraEvent.status
        )
        return [
            to_read(ev, src, lat=lat, lng=lng, distance_km=dkm)
            for ev, src, lat, lng, dkm in self.session.execute(stmt).all()
        ]

    def list_verified(self, limit: int = 100) -> list[InfraEvent]:
        stmt = select(InfraEvent).where(InfraEvent.verified.is_(True)).limit(limit)
        return list(self.session.scalars(stmt).all())

    def list_pattern_signals(
        self, *, limit: int = 100, offset: int = 0
    ) -> list[InfraEventRead]:
        """Satellite-derived ``pattern_cv`` signals (blueprint §3.5, P4.5).

        Returned regardless of ``verified`` so the UI can surface them DISTINCTLY
        from official facts, but always tagged with their low trust tier."""
        stmt = (
            select(
                InfraEvent,
                Source,
                geo.lat_of(InfraEvent.geom).label("lat"),
                geo.lng_of(InfraEvent.geom).label("lng"),
            )
            .join(Source, InfraEvent.source_id == Source.id, isouter=True)
            .where(InfraEvent.source_tier == SourceTier.pattern_cv)
            .order_by(InfraEvent.first_seen_at.desc())
            .limit(limit)
            .offset(offset)
        )
        out: list[InfraEventRead] = []
        for ev, src, lat, lng in self.session.execute(stmt).all():
            read = to_read(ev, src, lat=lat, lng=lng)
            read.data_layer = "pattern_cv"  # never "factual" (§3.5)
            out.append(read)
        return out
