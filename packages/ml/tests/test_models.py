"""Model tests (P3.3-P3.7): banded envelopes, derived factors, gates, ceilings."""

from __future__ import annotations

import datetime as dt

from ml.envelope import HORIZON_DIRECTIONAL
from ml.features import build_price_features, build_traffic_features
from ml.models import MODEL_CLASSES
from ml.monitoring.guards import validate_envelope
from ml.serving import demo_features_for

DOMAINS = ("price", "traffic", "flood", "water", "aqi")


def test_all_models_train_and_register(trained):
    registry, reports = trained
    for domain in DOMAINS:
        assert registry.latest_version(domain) is not None
        assert reports[domain].n_train > 0


def test_every_prediction_is_banded_not_bare(trained):
    registry, _ = trained
    feats = demo_features_for("loc-03")
    for domain in DOMAINS:
        model, _meta = registry.load(domain)
        env = model.predict(feats, horizon_years=3)
        # advisory numbers must carry a real band + disclaimer (§5, §13)
        assert env.has_band()
        assert env.disclaimer
        assert env.prediction_low <= env.prediction <= env.prediction_high
        validate_envelope(env, domain=domain)


def test_factors_are_derived_from_importances(trained):
    registry, _ = trained
    model, _ = registry.load("price")
    env = model.predict(demo_features_for("loc-01"))
    assert env.contributing_factors
    weights = [f.weight for f in env.contributing_factors]
    assert sum(weights) > 0  # real importances, not zeros
    assert env.model_version.startswith("price-")


def test_price_band_reacts_to_metro_distance(trained):
    registry, _ = trained
    model, _ = registry.load("price")
    near = model.predict({**demo_features_for("loc-01"), "dist_metro_km": 0.4})
    far = model.predict({**demo_features_for("loc-01"), "dist_metro_km": 7.5})
    assert near.prediction != far.prediction  # model actually uses the feature


def test_long_horizon_is_directional(trained):
    registry, _ = trained
    model, _ = registry.load("price")
    env = model.predict(demo_features_for("loc-02"), horizon_years=15)
    assert env.horizon == HORIZON_DIRECTIONAL
    assert env.prediction_high > env.prediction_low  # still a range


def test_flood_confidence_ceiling(trained):
    registry, _ = trained
    model, _ = registry.load("flood")
    env = model.predict(demo_features_for("loc-05"))
    assert env.confidence <= 0.6 + 1e-9  # conservative by design (§5 liability)
    assert 0.0 <= env.prediction <= 1.0
    assert env.has_band()


def test_traffic_sufficiency_gate_refuses_on_thin_data():
    # Train on a short panel: 15 months of history means only a few usable periods
    # after the 12-month lag -> below the 18-month threshold -> model must refuse.
    short_as_of = dt.date(2020, 3, 1)  # 15 months from START
    fs = build_traffic_features(short_as_of)
    model = MODEL_CLASSES["traffic"]()
    model.train(fs)
    env = model.predict(demo_features_for("loc-00"))
    assert env.confidence == 0.0
    assert not env.has_band()
    assert "history" in env.contributing_factors[0].factor


def test_traffic_serves_with_sufficient_history(trained):
    registry, _ = trained
    model, _ = registry.load("traffic")
    env = model.predict(demo_features_for("loc-00"), horizon_years=2)
    assert env.has_band()


def test_predictions_reproducible(trained):
    registry, _ = trained
    model, _ = registry.load("aqi")
    feats = demo_features_for("loc-04")
    a = model.predict(feats)
    b = model.predict(feats)
    assert a.model_dump() == b.model_dump()


def test_price_features_have_expected_target():
    fs = build_price_features(dt.date(2024, 1, 1))
    assert fs.target == "price_sqft"
    assert "price_sqft_lag12" in fs.feature_names
