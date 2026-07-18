"""Simulation API tests (P4.1): recompute + diff via the real serving path."""

from __future__ import annotations

import datetime as dt

import pytest
from fastapi.testclient import TestClient

from simulation.schemas import HypotheticalEvent, Scenario
from warehouse.schemas import InfraEventRead


def _event(eid, type_, status, *, year=None, dist=None) -> InfraEventRead:
    return InfraEventRead(
        id=eid, type=type_, status=status, expected_year=year,
        confidence=0.8, source_tier="official", verified=True, distance_km=dist,
    )


@pytest.fixture(scope="module")
def trained_env(tmp_path_factory):
    import os

    root = tmp_path_factory.mktemp("sim_model_registry")
    os.environ["MODEL_REGISTRY_DIR"] = str(root)
    from ml.registry import ModelRegistry
    from ml.training.train import train_all

    train_all(dt.date(2024, 1, 1), ModelRegistry(root))
    from api import predictions as pred

    pred.get_service.cache_clear()
    from ml import serving

    serving._demo_panel_today.cache_clear()
    return root


def test_run_simulation_core_recomputes_and_diffs(trained_env):
    from api.routers.simulate import run_simulation
    from ml.serving import demo_features_for

    baseline = [_event("e1", "mall", "proposed", year=2030, dist=4.0)]
    features = demo_features_for("loc-03")
    scenario = Scenario(
        add_events=[HypotheticalEvent(type="metro", status="operational", expected_year=2026, distance_km=0.4)],
        domains=["price", "aqi"],
    )
    result = run_simulation(
        baseline_events=baseline, base_features=features, scenario=scenario, locality_id="loc-03"
    )
    # score reliably rises when adding an operational metro
    assert result.score.prediction_delta > 0
    # predictions recomputed for each requested domain, banded both sides
    for domain in ("price", "aqi"):
        diff = result.predictions[domain]
        assert diff.baseline.has_band()
        assert diff.scenario.has_band()
    assert result.disclaimer


def test_simulate_endpoint(trained_env, monkeypatch):
    import api.routers.simulate as sim
    from api.deps import get_db
    from api.main import app

    class FakeLoc:
        def get(self, _id):
            return object()  # locality exists

    class FakeInfra:
        def affecting_locality(self, _id):
            return [_event("e1", "metro", "proposed", year=2032, dist=3.0)]

    monkeypatch.setattr(sim, "LocalityRepo", lambda db: FakeLoc())
    monkeypatch.setattr(sim, "InfraEventRepo", lambda db: FakeInfra())

    def _fake_db():
        yield None

    app.dependency_overrides[get_db] = _fake_db
    try:
        client = TestClient(app)
        body = {
            "locality_id": "loc-03",
            "scenario": {
                "add_events": [
                    {"type": "metro", "status": "operational", "expected_year": 2026, "distance_km": 0.4}
                ],
                "domains": ["price"],
            },
        }
        resp = client.post("/simulate", json=body)
        assert resp.status_code == 200
        data = resp.json()
        assert data["score"]["prediction_delta"] > 0
        assert "price" in data["predictions"]
        assert data["predictions"]["price"]["scenario"]["prediction_low"] is not None
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_simulate_unknown_locality_404(trained_env, monkeypatch):
    import api.routers.simulate as sim
    from api.deps import get_db
    from api.main import app

    class FakeLocNone:
        def get(self, _id):
            return None

    monkeypatch.setattr(sim, "LocalityRepo", lambda db: FakeLocNone())

    def _fake_db():
        yield None

    app.dependency_overrides[get_db] = _fake_db
    try:
        client = TestClient(app)
        resp = client.post("/simulate", json={"locality_id": "nope", "scenario": {}})
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db, None)
