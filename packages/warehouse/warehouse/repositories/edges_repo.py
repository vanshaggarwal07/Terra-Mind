"""Repository for graph edges + edge materialization (blueprint §4).

Edges (`AFFECTS`, `DEVELOPS`, `APPROVED_BY`) are plain join tables in PostGIS.
``materialize_affects`` computes the distance-based infra->locality edges via a
single spatial join (events within a configurable radius of a locality centroid).
"""

from __future__ import annotations

from geoalchemy2 import Geography
from sqlalchemy import Float, cast, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from warehouse.models import (
    BuilderDevelopsProperty,
    InfraEvent,
    InfraEventAffectsLocality,
    InfraEventApprovedBy,
    Locality,
)

DEFAULT_AFFECT_RADIUS_KM = 5.0


class EdgesRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    # -- explicit edge writers ----------------------------------------------
    def add_affects(self, infra_event_id: str, locality_id: str, distance_km: float | None) -> None:
        stmt = insert(InfraEventAffectsLocality).values(
            infra_event_id=infra_event_id, locality_id=locality_id, distance_km=distance_km
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["infra_event_id", "locality_id"],
            set_={"distance_km": distance_km},
        )
        self.session.execute(stmt)

    def add_develops(self, builder_id: str, property_id: str) -> None:
        stmt = insert(BuilderDevelopsProperty).values(
            builder_id=builder_id, property_id=property_id
        )
        self.session.execute(stmt.on_conflict_do_nothing())

    def add_approved_by(self, infra_event_id: str, gov_body_id: str) -> None:
        stmt = insert(InfraEventApprovedBy).values(
            infra_event_id=infra_event_id, gov_body_id=gov_body_id
        )
        self.session.execute(stmt.on_conflict_do_nothing())

    # -- materialization -----------------------------------------------------
    def materialize_affects(
        self,
        *,
        radius_km: float = DEFAULT_AFFECT_RADIUS_KM,
        include_unverified: bool = False,
    ) -> int:
        """(Re)build infra_event_affects_locality edges by proximity.

        A single spatial join finds every (event, locality) pair whose event geom
        is within ``radius_km`` of the locality centroid, recording the distance.
        Returns the number of edges upserted."""
        dist_km = cast(
            func.ST_Distance(InfraEvent.geom, Locality.centroid) / 1000.0, Float
        )
        join_cond = func.ST_DWithin(
            InfraEvent.geom, cast(Locality.centroid, Geography), radius_km * 1000.0
        )
        stmt = (
            select(InfraEvent.id, Locality.id, dist_km)
            .select_from(InfraEvent)
            .join(Locality, join_cond)
            .where(InfraEvent.geom.is_not(None), Locality.centroid.is_not(None))
        )
        if not include_unverified:
            stmt = stmt.where(InfraEvent.verified.is_(True))

        count = 0
        for event_id, locality_id, distance in self.session.execute(stmt).all():
            self.add_affects(event_id, locality_id, float(distance) if distance is not None else None)
            count += 1
        self.session.flush()
        return count
