"""Prediction serving API tests (P3.8): bands + disclaimers enforced at boundary."""

from __future__ import annotations

import datetime as dt

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    import os

    root = tmp_path_factory.mktemp("api_model_registry")
    os.environ["MODEL_REGISTRY_DIR"] = str(root)

    from ml.registry import ModelRegistry
    from ml.training.train import train_all

    train_all(dt.date(2024, 1, 1), ModelRegistry(root))

    # reset cached service + demo panel so they read the freshly-trained registry
    from api import predictions as pred

    pred.get_service.cache_clear()
    from ml import serving

    serving._demo_panel_today.cache_clear()

    from api.main import app

    return TestClient(app)


@pytest.mark.parametrize("domain", ["price", "traffic", "flood", "water", "aqi"])
def test_every_endpoint_returns_banded_with_disclaimer(client, domain):
    r = client.get(f"/predictions/{domain}?locality_id=loc-03")
    assert r.status_code == 200
    body = r.json()
    assert body["prediction_low"] is not None
    assert body["prediction_high"] is not None
    assert body["prediction_low"] <= body["prediction"] <= body["prediction_high"]
    assert body["disclaimer"]
    assert body["model_version"].startswith(f"{domain}-")


def test_flood_confidence_capped(client):
    body = client.get("/predictions/flood?locality_id=loc-05").json()
    assert body["confidence"] <= 0.6 + 1e-9


def test_long_horizon_is_directional(client):
    body = client.get("/predictions/price?locality_id=loc-02&horizon_years=15").json()
    assert body["horizon"] == "10yr+"
    assert body["prediction_high"] > body["prediction_low"]


def test_unavailable_model_returns_low_confidence_envelope(tmp_path):
    import os

    os.environ["MODEL_REGISTRY_DIR"] = str(tmp_path / "empty")
    from api import predictions as pred

    pred.get_service.cache_clear()
    from api.main import app

    c = TestClient(app)
    body = c.get("/predictions/price?locality_id=loc-03").json()
    # explicit low-confidence envelope, never a 500 the UI might mishandle (§13)
    assert body["confidence"] == 0.0
    assert body["prediction_low"] is None
    # restore for any later tests in the session
    pred.get_service.cache_clear()
