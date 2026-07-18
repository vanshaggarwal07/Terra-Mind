"""Demo knowledge-graph seed (localities + verified infra events + edges).

Populates a small, coherent corridor dataset so the DB-backed endpoints
(facts/timeline, score, proximity, simulate, copilot) return real content out of
the box, using the same ``loc-NN`` locality ids the Phase-3 models use so
predictions and facts line up. Idempotent: re-running does not duplicate.

Run:  python -m warehouse.seed_demo
"""

from __future__ import annotations

import datetime as dt

from geoalchemy2.elements import WKTElement

from common.db import session_scope
from common.logging import get_logger
from warehouse.enums import InfraEventStatus, InfraEventType, SourceTier
from warehouse.models import InfraEvent, Locality, Source
from warehouse.repositories.edges_repo import EdgesRepo

log = get_logger(__name__)

N_LOCALITIES = 14
SRID = 4326


def _point(lat: float, lng: float) -> WKTElement:
    return WKTElement(f"POINT({lng} {lat})", srid=SRID)


def _box(lat: float, lng: float, d: float = 0.006) -> WKTElement:
    ring = (
        f"{lng - d} {lat - d}, {lng + d} {lat - d}, {lng + d} {lat + d}, "
        f"{lng - d} {lat + d}, {lng - d} {lat - d}"
    )
    return WKTElement(f"POLYGON(({ring}))", srid=SRID)


def _locality_coords(i: int) -> tuple[float, float]:
    # Spread along the Noida -> Greater Noida -> Yamuna Expressway -> Jewar band.
    return 28.32 + i * 0.018, 77.32 + i * 0.030


# Verified corridor infra events (lat, lng, type, status, year, confidence, doc).
_EVENTS = [
    (28.35, 77.61, InfraEventType.airport, InfraEventStatus.under_construction, 2025, 0.97,
     "Noida International Airport (Jewar) — Phase 1"),
    (28.41, 77.42, InfraEventType.metro, InfraEventStatus.approved, 2028, 0.9,
     "Aqua Line metro extension (NMRC)"),
    (28.46, 77.47, InfraEventType.rrts, InfraEventStatus.approved, 2031, 0.85,
     "Delhi–SNB RRTS spur (NCRTC)"),
    (28.38, 77.50, InfraEventType.road, InfraEventStatus.operational, 2022, 0.95,
     "Yamuna Expressway interchange upgrade (NHAI)"),
    (28.44, 77.45, InfraEventType.hospital, InfraEventStatus.under_construction, 2026, 0.8,
     "Multi-specialty hospital, Sector 32"),
    (28.50, 77.52, InfraEventType.industrial, InfraEventStatus.approved, 2027, 0.82,
     "Integrated Industrial Township (YEIDA)"),
    (28.40, 77.40, InfraEventType.mall, InfraEventStatus.proposed, 2029, 0.6,
     "Retail + commercial hub (proposed)"),
    (28.55, 77.58, InfraEventType.school, InfraEventStatus.operational, 2021, 0.9,
     "CBSE school campus, Sector 44"),
]


def seed_demo() -> dict[str, int]:
    with session_scope() as session:
        if session.get(Locality, "loc-00") is not None:
            log.info("demo_seed_skipped", note="already seeded")
            return {"localities": 0, "infra_events": 0, "edges": 0, "skipped": 1}

        # Prefer a real seeded source for citations (YEIDA), else any source.
        source = (
            session.query(Source).filter(Source.crawler_key == "yeida").first()
            or session.query(Source).first()
        )
        source_id = source.id if source else None
        base_url = source.base_url if source else None

        for i in range(N_LOCALITIES):
            lat, lng = _locality_coords(i)
            session.add(
                Locality(
                    id=f"loc-{i:02d}",
                    name=f"Sector {22 + i}",
                    centroid=_point(lat, lng),
                    geom=_box(lat, lng),
                    meta={"demo": True, "corridor": "noida-jewar"},
                )
            )
        session.flush()

        events: list[InfraEvent] = []
        for lat, lng, type_, status, year, conf, doc in _EVENTS:
            ev = InfraEvent(
                type=type_,
                status=status,
                expected_year=year,
                confidence=conf,
                source_id=source_id,
                source_document=base_url,
                source_tier=SourceTier.official,
                geom=_point(lat, lng),
                verified=True,  # demo facts are review-approved
                first_seen_at=dt.datetime.now(dt.UTC),
                last_verified_at=dt.datetime.now(dt.UTC),
                extraction={"demo": True, "title": doc},
            )
            session.add(ev)
            events.append(ev)
        session.flush()

        # Link events to nearby localities so timeline/score/proximity work.
        edges = EdgesRepo(session).materialize_affects(radius_km=12.0)

        result = {"localities": N_LOCALITIES, "infra_events": len(events), "edges": edges}
        log.info("demo_seeded", **result)
        return result


def main() -> None:
    print("Demo seed:", seed_demo())


if __name__ == "__main__":
    main()
