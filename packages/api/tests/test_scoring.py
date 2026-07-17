"""Future Intelligence Score v1 tests (blueprint §1 feature 2, §5)."""

from __future__ import annotations

import pytest

from api.scoring import MODEL_VERSION, ScoreConfig, compute_score
from warehouse.schemas import InfraEventRead


def _event(type, status, *, distance_km=None, year=None, confidence=0.9):
    return InfraEventRead(
        id=f"{type}-{status}-{distance_km}",
        type=type,
        status=status,
        expected_year=year,
        confidence=confidence,
        source_tier="official",
        verified=True,
        distance_km=distance_km,
    )


CFG = ScoreConfig(current_year=2026)


def test_empty_inputs_score_zero_zero_confidence():
    env = compute_score([], CFG)
    assert env.prediction == 0.0
    assert env.confidence == 0.0
    assert env.contributing_factors == []
    assert env.model_version == MODEL_VERSION


def test_deterministic_and_reproducible():
    events = [
        _event("metro", "approved", distance_km=1.0, year=2027),
        _event("mall", "proposed", distance_km=4.0, year=2030),
    ]
    a = compute_score(events, CFG)
    b = compute_score(events, CFG)
    assert a.model_dump() == b.model_dump()


def test_golden_fixture_score():
    events = [
        _event("metro", "approved", distance_km=1.0, year=2027),
        _event("mall", "proposed", distance_km=4.0, year=2030),
    ]
    env = compute_score(events, CFG)
    # Pinned golden value for this fixture (see scoring weights).
    assert env.prediction == pytest.approx(16.6, abs=0.5)
    assert env.contributing_factors  # derived from data
    # The metro (bigger contribution) ranks first.
    assert "metro" in env.contributing_factors[0].factor


def test_factors_are_derived_not_hardcoded():
    events = [_event("metro", "operational", distance_km=0.5, year=2025)]
    env = compute_score(events, CFG)
    labels = [f.factor for f in env.contributing_factors]
    assert any("metro" in label and "operational" in label for label in labels)


def test_stronger_signal_scores_higher():
    weak = compute_score([_event("mall", "proposed", distance_km=4.5, year=2035)], CFG)
    strong = compute_score([_event("metro", "operational", distance_km=0.3, year=2025)], CFG)
    assert strong.prediction > weak.prediction


def test_removing_event_lowers_score_and_factors():
    two = compute_score(
        [
            _event("metro", "approved", distance_km=1.0, year=2027),
            _event("airport", "under_construction", distance_km=3.0, year=2026),
        ],
        CFG,
    )
    one = compute_score([_event("metro", "approved", distance_km=1.0, year=2027)], CFG)
    assert two.prediction > one.prediction
    assert len(two.contributing_factors) > len(one.contributing_factors)


def test_beyond_radius_does_not_contribute():
    env = compute_score([_event("metro", "operational", distance_km=6.0, year=2025)], CFG)
    assert env.prediction == 0.0  # outside 5km radius -> zero contribution
