"""Repository tests against a seeded test DB (blueprint §4).

Verifies geospatial correctness on known distances, the verified-only guarantee,
citation presence, and edge materialization. Marked ``db``."""

from __future__ import annotations

import pytest

from warehouse.enums import InfraEventStatus, InfraEventType, SourceCategory
from warehouse.models import Locality
from warehouse.repositories import (
    EdgesRepo,
    InfraEventRepo,
    LocalityRepo,
    SourcesRepo,
)
from warehouse.repositories.geo import point
from warehouse.schemas import SourceCreate

pytestmark = pytest.mark.db

# Sector 22D-ish centroid used across tests.
LAT, LNG = 28.5410, 77.3300


def _seed(session):
    src = SourcesRepo(session).create(
        SourceCreate(source_name=f"YEIDA test {id(session)}", category=SourceCategory.planning,
                     base_url="https://yeida.example/plan")
    )
    loc = Locality(name="Sector 22D", centroid=point(LAT, LNG), geom=None)
    session.add(loc)
    session.flush()

    repo = InfraEventRepo(session)
    # ~1 km east (0.01 deg lng ≈ 0.98 km at this latitude)
    near = repo.create(
        type=InfraEventType.metro, status=InfraEventStatus.approved, confidence=0.9,
        expected_year=2027, source_id=src.id, source_document="https://yeida.example/metro.pdf",
        lat=LAT, lng=LNG + 0.01, verified=True,
    )
    # ~40+ km away
    far = repo.create(
        type=InfraEventType.metro, status=InfraEventStatus.proposed, confidence=0.8,
        expected_year=2030, source_id=src.id, lat=28.90, lng=77.80, verified=True,
    )
    # unverified near event — must never surface publicly
    repo.create(
        type=InfraEventType.mall, status=InfraEventStatus.proposed, confidence=0.6,
        source_id=src.id, lat=LAT, lng=LNG + 0.005, verified=False,
    )
    session.flush()
    return loc, near, far


def test_within_km_returns_near_not_far_with_distance(session):
    loc, near, far = _seed(session)
    results = InfraEventRepo(session).within_km(LAT, LNG, 5.0)
    ids = {r.id for r in results}
    assert near.id in ids
    assert far.id not in ids
    r = next(r for r in results if r.id == near.id)
    assert 0.8 < r.distance_km < 1.2  # known ~0.98 km


def test_public_reads_exclude_unverified(session):
    _seed(session)
    all_read = InfraEventRepo(session).list_read(limit=100)
    assert all(r.verified for r in all_read)
    assert all(r.type != "mall" for r in all_read)  # unverified mall hidden


def test_nearest_by_type(session):
    loc, near, far = _seed(session)
    nearest = InfraEventRepo(session).nearest_by_type(LAT, LNG, InfraEventType.metro)
    assert nearest is not None and nearest.id == near.id


def test_citation_present_on_every_fact(session):
    _seed(session)
    for r in InfraEventRepo(session).list_read(limit=100):
        assert r.citation.source_id is not None
        assert r.data_layer == "factual"


def test_materialize_affects_and_timeline(session):
    loc, near, far = _seed(session)
    n = EdgesRepo(session).materialize_affects(radius_km=5.0)
    assert n >= 1
    affecting = InfraEventRepo(session).affecting_locality(loc.id)
    ids = {r.id for r in affecting}
    assert near.id in ids  # within 5 km
    assert far.id not in ids  # beyond radius


def test_locality_read_has_centroid(session):
    loc, _, _ = _seed(session)
    read = LocalityRepo(session).get_read(loc.id)
    assert read is not None
    assert read.centroid_lat is not None and abs(read.centroid_lat - LAT) < 0.001
