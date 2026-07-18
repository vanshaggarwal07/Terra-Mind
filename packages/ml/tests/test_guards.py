"""Accuracy-framing guard tests (P3.8/P3.10) — CI enforces these rules."""

from __future__ import annotations

import pytest

from ml.envelope import HORIZON_DIRECTIONAL, HORIZON_SHORT, banded_envelope
from ml.monitoring.guards import (
    GuardViolation,
    enforce_serving_envelope,
    is_advisory,
    validate_envelope,
)
from warehouse.schemas import ContributingFactor, PredictionEnvelope

FACTORS = [ContributingFactor(factor="x", weight=1.0)]


def _banded(**kw):
    base = {
        "point": 8000,
        "low": 7000,
        "high": 9000,
        "confidence": 0.6,
        "factors": FACTORS,
        "model_version": "price-vX",
        "unit": "INR/sqft",
        "horizon": HORIZON_SHORT,
    }
    base.update(kw)
    return banded_envelope(**base)


def test_valid_banded_envelope_passes():
    validate_envelope(_banded(), domain="price")


def test_bare_number_is_rejected():
    bare = PredictionEnvelope(
        prediction=8000.0,
        confidence=0.7,
        contributing_factors=FACTORS,
        model_version="price-vX",
        unit="INR/sqft",
        disclaimer="x",
    )
    with pytest.raises(GuardViolation):
        validate_envelope(bare, domain="price")


def test_missing_disclaimer_rejected():
    env = _banded()
    env = env.model_copy(update={"disclaimer": None})
    with pytest.raises(GuardViolation):
        validate_envelope(env, domain="price")


def test_flood_confidence_ceiling_enforced():
    # confidence above the flood ceiling is clamped by enforce_serving_envelope
    env = _banded(point=0.4, low=0.1, high=0.7, unit="risk 0-1", confidence=0.9)
    fixed = enforce_serving_envelope(env, domain="flood")
    assert fixed.confidence <= 0.6 + 1e-9


def test_directional_horizon_must_stay_a_range():
    env = _banded(horizon=HORIZON_DIRECTIONAL)
    validate_envelope(env, domain="price")  # has width -> ok
    collapsed = env.model_copy(update={"prediction_low": 8000.0, "prediction_high": 8000.0})
    with pytest.raises(GuardViolation):
        validate_envelope(collapsed, domain="price")


def test_score_envelope_is_exempt():
    # The Phase-2 rule score (no band, no unit) is not an advisory number.
    score = PredictionEnvelope(
        prediction=42.0,
        confidence=0.7,
        contributing_factors=FACTORS,
        model_version="future-intelligence-score-v1-rules",
    )
    assert is_advisory(score) is False
    validate_envelope(score)  # no raise


def test_insufficient_envelope_is_exempt():
    from ml.envelope import insufficient_data_envelope

    env = insufficient_data_envelope(model_version="traffic-x", unit="vehicles/hour", reason="thin")
    assert is_advisory(env) is False
    validate_envelope(env, domain="traffic")  # no raise
