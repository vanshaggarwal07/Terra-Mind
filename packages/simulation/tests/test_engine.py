"""Engine tests (P4.1): recompute + diff, determinism, feature-delta effect."""

from __future__ import annotations

from simulation.engine import SimulationEngine
from simulation.schemas import EventOverride, HypotheticalEvent, Scenario
from warehouse.schemas import ContributingFactor, InfraEventRead, PredictionEnvelope


def _event(eid, type_, status, *, year=None, dist=None) -> InfraEventRead:
    return InfraEventRead(
        id=eid,
        type=type_,
        status=status,
        expected_year=year,
        confidence=0.8,
        source_tier="official",
        verified=True,
        distance_km=dist,
    )


def _score_fn(events: list[InfraEventRead]) -> PredictionEnvelope:
    # rises with count + how "advanced"/near the events are
    weight = {"operational": 1.0, "under_construction": 0.7, "approved": 0.5, "proposed": 0.25}
    val = sum(
        weight.get(e.status, 0.2) * (2.0 if (e.distance_km or 9) < 2 else 1.0) for e in events
    )
    return PredictionEnvelope(
        prediction=round(10.0 * val, 3),
        confidence=0.6,
        contributing_factors=[
            ContributingFactor(factor=f"{e.status} {e.type}", weight=1.0) for e in events
        ],
        model_version="score-test",
    )


def _predict_fn(domain: str, features: dict, horizon: int) -> PredictionEnvelope:
    progress = features.get("infra_progress", 0.0)
    dist = max(0.1, features.get("dist_metro_km", 5.0))
    point = 5000.0 * (1.0 + 0.3 * progress) + 400.0 / dist
    return PredictionEnvelope(
        prediction=round(point, 2),
        prediction_low=round(point - 300, 2),
        prediction_high=round(point + 300, 2),
        confidence=0.6,
        contributing_factors=[
            ContributingFactor(factor="infrastructure progress nearby", weight=round(progress, 3)),
            ContributingFactor(factor="distance to metro", weight=round(1.0 / dist, 3)),
        ],
        model_version=f"{domain}-test",
        unit="INR/sqft",
        horizon="1-5yr",
        disclaimer="test",
    )


def _engine() -> SimulationEngine:
    return SimulationEngine(score_fn=_score_fn, predict_fn=_predict_fn)


BASE_EVENTS = [_event("e1", "metro", "proposed", year=2032, dist=3.0)]
BASE_FEATURES = {"infra_progress": 0.2, "dist_metro_km": 3.0}


def test_deterministic_identical_scenario():
    scenario = Scenario(
        add_events=[HypotheticalEvent(type="metro", status="approved", distance_km=0.5)],
        domains=["price"],
    )
    a = _engine().run(baseline_events=BASE_EVENTS, base_features=BASE_FEATURES, scenario=scenario)
    b = _engine().run(baseline_events=BASE_EVENTS, base_features=BASE_FEATURES, scenario=scenario)
    assert a.model_dump() == b.model_dump()


def test_adding_near_metro_raises_price_and_score():
    scenario = Scenario(
        add_events=[
            HypotheticalEvent(
                type="metro", status="operational", expected_year=2026, distance_km=0.4
            )
        ],
        domains=["price"],
    )
    result = _engine().run(
        baseline_events=BASE_EVENTS, base_features=BASE_FEATURES, scenario=scenario
    )
    price = result.predictions["price"]
    assert price.prediction_delta > 0  # nearer metro + more progress -> higher price
    assert result.score.prediction_delta > 0  # more/advanced events -> higher score


def test_removing_event_lowers_score():
    scenario = Scenario(overrides=[EventOverride(event_id="e1", remove=True)], domains=["price"])
    result = _engine().run(
        baseline_events=BASE_EVENTS, base_features=BASE_FEATURES, scenario=scenario
    )
    assert result.score.prediction_delta <= 0


def test_factor_deltas_present_and_sorted():
    scenario = Scenario(
        overrides=[EventOverride(event_id="e1", status="operational", expected_year=2026)],
        domains=["price"],
    )
    result = _engine().run(
        baseline_events=BASE_EVENTS, base_features=BASE_FEATURES, scenario=scenario
    )
    deltas = result.predictions["price"].factor_deltas
    assert deltas
    mags = [abs(d.delta) for d in deltas]
    assert mags == sorted(mags, reverse=True)  # largest change first


def test_no_persistence_engine_needs_no_session():
    # The engine's only collaborators are two pure callables — it cannot touch a DB.
    import inspect

    params = set(inspect.signature(SimulationEngine.run).parameters)
    assert "session" not in params and "db" not in params
