"""CV -> pattern-signal integration tests (P4.5): never verified, always reviewed."""

from __future__ import annotations

import cv.signals as signals
from cv.change import ChangePolygon
from cv.signals import PATTERN_LABEL, persist_change_signals, polygon_to_extraction


class FakeEvent:
    def __init__(self, **kw):
        self.id = "ev-1"
        self.__dict__.update(kw)


class FakeInfraRepo:
    def __init__(self, session):
        self.created: list[dict] = []

    def create(self, **kw):
        self.created.append(kw)
        return FakeEvent(**kw)


class FakeReviewRepo:
    def __init__(self, session):
        self.enqueued: list[dict] = []

    def enqueue(self, **kw):
        self.enqueued.append(kw)
        return object()


def _poly(conf=0.7) -> ChangePolygon:
    return ChangePolygon(
        locality_id="loc-03",
        centroid_lat=28.5,
        centroid_lng=77.5,
        min_lat=28.49,
        min_lng=77.49,
        max_lat=28.51,
        max_lng=77.51,
        pixel_area=30,
        area_m2=3000.0,
        confidence=conf,
        older_date="2023-07-01",
        current_date="2024-01-01",
    )


def test_signal_is_never_verified_and_tagged_pattern(monkeypatch):
    monkeypatch.setattr(signals, "InfraEventRepo", FakeInfraRepo)
    monkeypatch.setattr(signals, "ReviewQueueRepo", FakeReviewRepo)
    created = persist_change_signals(session=None, polygons=[_poly(0.9)], source_id="sat-1")
    assert len(created) == 1
    kw = created[0].__dict__
    assert kw["verified"] is False  # CV alone can NEVER self-verify (§0/§3.5)
    assert str(kw["source_tier"]) == "pattern_cv"
    assert str(kw["type"]) == "construction_detected"


def test_signal_routed_to_review_queue(monkeypatch):
    fake_infra = FakeInfraRepo(None)
    fake_review = FakeReviewRepo(None)
    monkeypatch.setattr(signals, "InfraEventRepo", lambda s: fake_infra)
    monkeypatch.setattr(signals, "ReviewQueueRepo", lambda s: fake_review)
    persist_change_signals(session=None, polygons=[_poly(), _poly(0.5)], source_id="sat-1")
    assert len(fake_review.enqueued) == 2  # every pattern signal needs human review
    assert fake_review.enqueued[0]["entity_ref"]["source_tier"] == "pattern_cv"


def test_no_verdict_or_builder_field_in_signal(monkeypatch):
    fake_infra = FakeInfraRepo(None)
    monkeypatch.setattr(signals, "InfraEventRepo", lambda s: fake_infra)
    monkeypatch.setattr(signals, "ReviewQueueRepo", FakeReviewRepo)
    persist_change_signals(session=None, polygons=[_poly()])
    kw = fake_infra.created[0]
    forbidden = {"trust_score", "rating", "verdict", "builder_score", "recommendation"}
    assert not (forbidden & set(kw))


def test_extraction_carries_label_and_dates():
    ext = polygon_to_extraction(_poly())
    assert ext["label"] == PATTERN_LABEL
    assert ext["older_date"] == "2023-07-01"
    assert ext["current_date"] == "2024-01-01"
    assert "bbox" in ext
